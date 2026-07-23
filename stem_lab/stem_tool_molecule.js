// ═══════════════════════════════════════════
// stem_tool_molecule.js - Molecule Lab (Enhanced Standalone)
// Full 118-element periodic table, compound creator (32 recipes),
// molecule builder, Bohr model, reaction simulator, challenges & RP
// ═══════════════════════════════════════════

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
  // ── Reduced motion CSS (WCAG 2.3.3) - shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-molecule')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-molecule';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  // ── Audio (auto-injected) ──
  var _molAC = null;
  function getMolAC() { if (!_molAC) { try { _molAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_molAC && _molAC.state === "suspended") { try { _molAC.resume(); } catch(e) {} } return _molAC; }
  function molTone(f,d,tp,v) { var ac = getMolAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxMolClick() { molTone(600, 0.03, "sine", 0.04); }
  function sfxMolSuccess() { molTone(523, 0.08, "sine", 0.07); setTimeout(function() { molTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { molTone(784, 0.1, "sine", 0.08); }, 140); }

  // ── Hydrogen-like atomic orbitals (Z=1, a₀=1) — the REAL quantum picture ─────────
  // PURE + testable. An orbital is NOT an orbit: ψ is a wavefunction and |ψ|² is the
  // probability DENSITY of finding the electron (Born rule) — a cloud, not a path.
  // R_nl(r) are the standard hydrogen radial functions; the angular factor gives the
  // shape (s sphere, p dumbbell, d cloverleaf). The SIGN of ψ is the phase (the two
  // colours in the cloud); where ψ=0 is a NODE — a place the electron is never found.
  var ORBITALS = {
    '1s': { n: 1, l: 0, sub: 's', label: '1s', shape: 'sphere',               box: 6 },
    '2s': { n: 2, l: 0, sub: 's', label: '2s', shape: 'sphere + inner shell', box: 16 },
    '2p': { n: 2, l: 1, sub: 'p', label: '2p', shape: 'dumbbell',             box: 15 },
    '3s': { n: 3, l: 0, sub: 's', label: '3s', shape: 'sphere + 2 shells',    box: 30 },
    '3p': { n: 3, l: 1, sub: 'p', label: '3p', shape: 'dumbbell + shell',     box: 30 },
    '3d': { n: 3, l: 2, sub: 'd', label: '3d', shape: 'cloverleaf (4 lobes)',  box: 28 }
  };
  var ORBITAL_ORDER = ['1s', '2s', '2p', '3s', '3p', '3d'];
  function orbRadial(key, r) {                       // R_nl(r), Z=1, a₀=1 (Bohr radii)
    switch (key) {
      case '1s': return 2 * Math.exp(-r);
      case '2s': return (1 / (2 * Math.SQRT2)) * (2 - r) * Math.exp(-r / 2);
      case '2p': return (1 / (2 * Math.sqrt(6))) * r * Math.exp(-r / 2);
      case '3s': return (2 / (81 * Math.sqrt(3))) * (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3);
      case '3p': return (4 / (81 * Math.sqrt(6))) * (6 * r - r * r) * Math.exp(-r / 3);
      case '3d': return (4 / (81 * Math.sqrt(30))) * r * r * Math.exp(-r / 3);
      default: return 0;
    }
  }
  function orbAngular(key, x, y, z, r) {              // representative real orientation: p_z, d_xy
    var o = ORBITALS[key]; if (!o) return 1;
    if (o.l === 0) return 1;                          // s — isotropic (spherical)
    if (r === 0) return 0;                            // p/d vanish at the nucleus
    if (o.l === 1) return z / r;                      // p_z  (cosθ) — dumbbell along z
    return (x * y) / (r * r);                          // d_xy — the classic cloverleaf (4 lobes; nodal planes x=0 & y=0)
  }
  function orbPsi(key, x, y, z) {                     // signed wavefunction ψ (sign = phase)
    var r = Math.sqrt(x * x + y * y + z * z);
    return orbRadial(key, r) * orbAngular(key, x, y, z, r);
  }
  function orbDensity(key, x, y, z) { var p = orbPsi(key, x, y, z); return p * p; }   // |ψ|² (Born rule)
  function orbRadialDistribution(key, r) { var R = orbRadial(key, r); return r * r * R * R; }   // P(r)=r²R² — "where is the electron?"
  function orbNodes(key) {                            // node counts: total = n−1, angular = ℓ, radial = n−ℓ−1
    var o = ORBITALS[key]; if (!o) return null;
    return { radial: o.n - o.l - 1, angular: o.l, total: o.n - 1 };
  }
  function orbPeakRadius(key) {                       // most-probable radius (argmax of P(r)); 1s → 1 a₀ (the Bohr radius!)
    var best = -1, bestR = 0, box = (ORBITALS[key] || { box: 30 }).box;
    for (var r = 0.002; r <= box * 1.6; r += 0.01) { var p = orbRadialDistribution(key, r); if (p > best) { best = p; bestR = r; } }
    return bestR;
  }
  try {
    window.__alloMoleculePure = {
      ORBITALS: ORBITALS, ORBITAL_ORDER: ORBITAL_ORDER, orbRadial: orbRadial, orbAngular: orbAngular,
      orbPsi: orbPsi, orbDensity: orbDensity, orbRadialDistribution: orbRadialDistribution, orbNodes: orbNodes, orbPeakRadius: orbPeakRadius
    };
  } catch (e) {}

  if (window.StemLab && window.StemLab.isRegistered && window.StemLab.isRegistered('molecule')) return;


  function MoleculeTutorialDialog(props) {
    var React = props.React;
    var h = React.createElement;
    var dialogRef = React.useRef(null);
    var dismissRef = React.useRef(null);
    var dismissHandlerRef = React.useRef(props.onDismiss);
    dismissHandlerRef.current = props.onDismiss;

    React.useEffect(function() {
      var dialog = dialogRef.current;
      if (!dialog || typeof document === 'undefined') return undefined;
      var previousFocus = document.activeElement;
      var overlay = dialog.parentElement;
      var root = dialog.closest('[data-molecule-tool="true"]');
      var blocked = [];

      if (root && overlay) {
        Array.prototype.forEach.call(root.children, function(element) {
          if (element === overlay) return;
          blocked.push({
            element: element,
            hadInert: element.hasAttribute('inert'),
            inertValue: element.getAttribute('inert'),
            hadAriaHidden: element.hasAttribute('aria-hidden'),
            ariaHiddenValue: element.getAttribute('aria-hidden')
          });
          element.setAttribute('inert', '');
          element.setAttribute('aria-hidden', 'true');
        });
      }

      var getFocusable = function() {
        return Array.prototype.slice.call(dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
      };
      var focusInitial = function() {
        (dismissRef.current || dialog).focus();
      };
      var onKeyDown = function(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          dismissHandlerRef.current();
          return;
        }
        if (event.key !== 'Tab') return;
        var focusable = getFocusable();
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      var onFocusIn = function(event) {
        if (!dialog.contains(event.target)) focusInitial();
      };

      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('focusin', onFocusIn, true);
      setTimeout(focusInitial, 0);

      return function() {
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('focusin', onFocusIn, true);
        blocked.forEach(function(entry) {
          if (entry.hadInert) entry.element.setAttribute('inert', entry.inertValue || '');
          else entry.element.removeAttribute('inert');
          if (entry.hadAriaHidden) entry.element.setAttribute('aria-hidden', entry.ariaHiddenValue || '');
          else entry.element.removeAttribute('aria-hidden');
        });
        setTimeout(function() {
          var target = previousFocus && previousFocus.isConnected &&
            previousFocus !== document.body && previousFocus !== document.documentElement
            ? previousFocus
            : root && root.querySelector(
                'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );
          if (target && typeof target.focus === 'function') target.focus();
        }, 0);
      };
    }, []);

    var title = props.titles[props.step];
    return h('div', {
      role: 'presentation',
      className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4',
      style: { backdropFilter: 'blur(2px)' },
      onClick: function(event) {
        if (event.target === event.currentTarget) dismissHandlerRef.current();
      }
    },
      h('div', {
        ref: dialogRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'molecule-tutorial-title',
        'aria-describedby': 'molecule-tutorial-description',
        tabIndex: -1,
        className: 'relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl'
      },
        h('button', {
          ref: dismissRef,
          type: 'button',
          'aria-label': props.dismissLabel,
          onClick: function() { dismissHandlerRef.current(); },
          className: 'absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-[0.97]'
        }, '✕'),
        h('p', { className: 'mb-1 text-2xl', 'aria-hidden': 'true' }, props.icons[props.step]),
        h('h2', {
          id: 'molecule-tutorial-title',
          'aria-live': 'polite',
          className: 'mb-2 pr-10 text-lg font-bold tracking-tight text-slate-800'
        }, props.stepLabel + ' ' + (props.step + 1) + ' ' + props.ofLabel + ' 5: ' + title),
        h('p', {
          id: 'molecule-tutorial-description',
          className: 'mb-4 text-sm leading-relaxed text-slate-700'
        }, props.descriptions[props.step]),
        h('div', { className: 'flex items-center justify-between gap-4' },
          h('div', { className: 'flex gap-1', 'aria-hidden': 'true' },
            [0, 1, 2, 3, 4].map(function(index) {
              return h('span', {
                key: index,
                className: 'h-2 w-2 rounded-full ' + (index === props.step ? 'bg-indigo-500' : 'bg-slate-200')
              });
            })
          ),
          h('div', { className: 'flex gap-2' },
            props.step > 0 && h('button', {
              type: 'button',
              'aria-label': props.backLabel,
              onClick: props.onBack,
              className: 'min-h-11 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-[0.97]'
            }, '← ' + props.backLabel),
            props.step < 4
              ? h('button', {
                  type: 'button',
                  'aria-label': props.nextLabel,
                  onClick: props.onNext,
                  className: 'min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-[0.97]'
                }, props.nextLabel + ' →')
              : h('button', {
                  type: 'button',
                  'aria-label': props.startLabel,
                  onClick: function() { dismissHandlerRef.current(); },
                  className: 'min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 active:scale-[0.97]'
                }, '✓ ' + props.startLabel)
          )
        )
      )
    );
  }

  window.StemLab.registerTool('molecule', {
    icon: "⚛️",
    label: "Molecule Lab",
    desc: "Explore chemistry with a 3D molecule viewer, compound creator, bond builder, 118-element periodic table, reaction simulator, and orbital clouds.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'discover_compound', label: 'Discover a chemical compound', icon: '\uD83E\uDDEA', check: function(d) { return (d.discoveredCompounds || []).length >= 1; }, progress: function(d) { return (d.discoveredCompounds || []).length >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'discover_5_compounds', label: 'Discover 5 different compounds', icon: '\uD83D\uDD2C', check: function(d) { return (d.discoveredCompounds || []).length >= 5; }, progress: function(d) { return (d.discoveredCompounds || []).length + '/5'; } },
      { id: 'balance_3_reactions', label: 'Balance 3 chemical reactions', icon: '\u2696\uFE0F', check: function(d) { return (d.reactionsBalanced || 0) >= 3; }, progress: function(d) { return (d.reactionsBalanced || 0) + '/3'; } },
      { id: 'earn_50_rp', label: 'Earn 50 research points', icon: '\u2B50', check: function(d) { return (d.totalRP || 0) >= 50; }, progress: function(d) { return (d.totalRP || 0) + '/50 RP'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 chemistry challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d.completedChallenges || []).length >= 3; }, progress: function(d) { return (d.completedChallenges || []).length + '/3'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      var useRef = React.useRef;
      var useState = React.useState;
      var useEffect = React.useEffect;

      // ── Tool body (molecule) ──
      var __moleculeMainView = (function() {

          // ── State + three.js refs ──
          // Restored: these were referenced throughout the tool body but their
          // declarations were lost to a bulk edit (commit 49aa0e5f dropped
          // `const d`/`upd`; the 3D feature referenced threeLoaded + *Ref without
          // ever declaring them) — molecule crashed on render with everything
          // undefined. d/upd match the last-good version (7b02d155).
          const d = labToolData.molecule || {};
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, [key]: val } }));
          const [threeLoaded, setThreeLoaded] = useState(false);
          const webglCanvasRef = useRef(null);
          const threeSceneRef = useRef(null);
          const threeCameraRef = useRef(null);
          const threeRendererRef = useRef(null);
          const threeControlsRef = useRef(null);
          const threeResourcesRef = useRef(null);
          const animationFrameIdRef = useRef(null);
          const vrRef = useRef(null);
          // WebXR: the "Enter VR" button shows ONLY while a headset is present, and
          // reacts to connect/unplug live (devicechange) — no clutter without one.
          const _xrSup = useState(false); const xrSupported = _xrSup[0]; const setXrSupported = _xrSup[1];
          React.useEffect(function() {
            var alive = true;
            var check = function() { try { if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(function(ok){ if (alive) setXrSupported(!!ok); }).catch(function(){}); } catch(e){} };
            check();
            var dc = function() { check(); };
            try { if (navigator.xr && navigator.xr.addEventListener) navigator.xr.addEventListener('devicechange', dc); } catch(e){}
            return function() { alive = false; try { if (navigator.xr && navigator.xr.removeEventListener) navigator.xr.removeEventListener('devicechange', dc); } catch(e){} };
          }, []);
          // INCOMPLETE FEATURE (stubbed to prevent a render crash): commit 49aa0e5f
          // added drawVisualShelf(...) calls for the reactions-mode "Visual Molecule
          // Shelf" but never a definition. Stubbed to null so the tool renders; the
          // per-reaction-side molecule visual still needs to be implemented.
          const drawVisualShelf = (terms, isLeft) => {
            // Render each reactant/product as a small colored atom cluster.
            // Honest representation: atoms shown as element-colored circles sized
            // by count, with the formula label as the source of truth. We do NOT
            // invent bond geometry we don't have for arbitrary compounds.
            if (!Array.isArray(terms)) return null;
            const elColor = (sym) => {
              const e = ELEMENTS.find(x => x.s === sym);
              return (e && e.c) || (isDark ? '#94a3b8' : '#64748b');
            };
            return React.createElement("div", { className: "flex gap-2 items-end flex-wrap justify-center" },
              terms.map((term, ti) => React.createElement("div", {
                key: 'shelf-' + (isLeft ? 'L' : 'R') + '-' + ti + '-' + (term.formula || ti),
                className: "flex flex-col items-center gap-1"
              },
                React.createElement("div", { className: "flex items-center justify-center gap-0.5 flex-wrap", style: { maxWidth: '88px' } },
                  Object.keys(term.atoms || {}).map((sym) => {
                    const count = term.atoms[sym];
                    return Array.apply(null, Array(Math.min(count, 6))).map((_, ai) =>
                      React.createElement("span", {
                        key: 'atom-' + sym + '-' + ai,
                        title: sym,
                        style: {
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: elColor(sym), color: '#fff',
                          fontSize: '9px', fontWeight: 'bold',
                          border: '1.5px solid ' + (isDark ? '#0f172a' : '#fff'),
                          boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
                        }
                      }, sym)
                    );
                  })
                ),
                React.createElement("span", {
                  className: "text-[11px] font-bold " + (isDark ? "text-slate-200" : "text-slate-700")
                }, term.formula || '')
              ))
            );
          };


          const W = 400, H = 300;

          const mode = d.moleculeMode || 'viewer';

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('molecule', 'init', {
              first: 'Molecule Lab loaded. ' + (mode === 'viewer' ? 'Viewer mode active. Choose a molecule preset to view its 3D model.' : 'Current mode: ' + mode + '.'),
              repeat: 'Molecule Lab, mode: ' + mode + '.',
              terse: 'Molecule Lab.'
            }, { debounce: 800 });
          }

          // ═══ Enhanced state ═══
          const researchPoints = d.researchPoints || 0;
          const totalRP = d.totalRP || 0;
          const completedChallenges = d.completedChallenges || [];
          const tutorialStep = d.tutorialStep || 0;
          const tutorialDismissed = d.tutorialDismissed || false;
          const reactionsBalanced = d.reactionsBalanced || 0;
          const currentReactionIdx = d.currentReactionIdx || 0;
          const reactionCoeffs = d.reactionCoeffs || null;
          const reactionResult = d.reactionResult || null;
          const updMulti = (obj) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, ...obj } }));
          const isDark = !!(props && props.darkMode);

          // ═══ Keyboard Shortcuts ═══
          // Note: these execute on every render but are lightweight
          const SHORTCUTS = { '1': 'viewer', '2': 'creator', '3': 'build', '4': 'table', '5': 'reactions' };
          // Bound via useEffect (was a render-body global listener guarded by window._molKbBound that was
          // NEVER removed — so Alt+1..5 kept mutating molecule state even after navigating to another tool).
          useEffect(function() {
            function onKey(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              if (e.altKey && SHORTCUTS[e.key]) { e.preventDefault(); upd('moleculeMode', SHORTCUTS[e.key]); }
            }
            document.addEventListener('keydown', onKey);
            return function() { document.removeEventListener('keydown', onKey); };
          }, []);
          const aiQuestion = d.aiQuestion || '';
          const aiAnswer = d.aiAnswer || '';
          const aiLoading = d.aiLoading || false;

          // ── Three.js Sequenced Loader ──
          useEffect(function() {
            if (window.THREE && window.THREE.OrbitControls) {
              setThreeLoaded(true);
              return;
            }
            
            function loadOrbitControls() {
              if (window.THREE && window.THREE.OrbitControls) {
                setThreeLoaded(true);
                return;
              }
              window.StemLab.ensureThree({ orbit: true, orbitRequired: true }).then(function () {
                setThreeLoaded(true);
              }).catch(function (err) {
                console.error("Failed to load OrbitControls", err);
              });
            }

            if (window.THREE) {
              loadOrbitControls();
              return;
            }

            window.StemLab.ensureThree({ orbit: false }).then(function () {
              loadOrbitControls();
            }).catch(function (err) {
              console.error("Failed to load Three.js", err);
            });
          }, []);

          // ── Three.js Lifecycle Hooks ──
          useEffect(function() {
            if (mode === 'viewer') {
              if (threeLoaded && webglCanvasRef.current) {
                if (!threeSceneRef.current) {
                  initThree(webglCanvasRef.current);
                }
                update3DModel();
              }
            } else {
              disposeThree();
            }
          }, [mode, threeLoaded, d.atoms, d.bonds]);

          useEffect(function() {
            return function() {
              disposeThree();
            };
          }, []);

          // Lazy-load the shared AlloVR layer from this tool's CDN base (only when a
          // headset is present, so non-VR users never download it).
          const ensureAlloVR = function(cb) {
            if (window.AlloModules && window.AlloModules.AlloVR) { cb(window.AlloModules.AlloVR); return; }
            var base = 'https://alloflow-cdn.pages.dev/', q = '';
            try {
              var scr = document.querySelectorAll('script[src]');
              for (var i = 0; i < scr.length; i++) {
                var m = (scr[i].getAttribute('src') || '').match(/^(.*\/)(?:allo_vr_module|prim3d_module|stem_lab\/stem_tool_[a-z0-9]+)\.js(\?.*)?$/);
                if (m) { base = m[1]; q = m[2] || ''; break; }
              }
            } catch (e) {}
            try {
              var s = document.createElement('script'); s.src = base + 'allo_vr_module.js' + q; s.async = true;
              s.onload = function(){ cb(window.AlloModules && window.AlloModules.AlloVR); };
              s.onerror = function(){ cb(null); };
              document.head.appendChild(s);
            } catch (e) { cb(null); }
          };

          const initThree = function(canvas) {
            if (!window.THREE || !window.THREE.OrbitControls) return;
            try {
              var THREE = window.THREE;
              var W = canvas.clientWidth || 400;
              var H = canvas.clientHeight || 300;

              var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
              renderer.setSize(W, H, false);
              renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
              if (THREE.ACESFilmicToneMapping) {
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.12;
              }
              if (renderer.setClearColor) renderer.setClearColor(0x020617, 0);
              threeRendererRef.current = renderer;

              var scene = new THREE.Scene();
              threeSceneRef.current = scene;

              var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);

              // ── Bloom post-processing (guarded, auto-fallback) — AlloFlow FX rollout ──
              // Gentle bloom on bright atom spheres; high threshold keeps element colors
              // legible. Composer rides renderer (= threeRendererRef.current); plain render
              // until the r128 addons load; any failure falls back to the ref render.
              renderer._alloComposer = null;
              (function(){
                if (window.AlloPostFXEnabled === false) return;
                var _ens = function(cb){
                  if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
                  var u = ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js','https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'];
                  var i=0; (function n(){ if(i>=u.length){cb();return;} var s=document.createElement("script"); s.src=u[i]; s.onload=function(){i++;n();}; s.onerror=function(){i++;n();}; document.head.appendChild(s); })();
                };
                _ens(function(){
                  try {
                    var T=window.THREE; if(!T||!T.EffectComposer||!T.RenderPass||!T.UnrealBloomPass) return;
                    var rm=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                    var lp=rm||(!!navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4); var rs=lp?0.5:1;
                    var cc=new T.EffectComposer(renderer);
                    cc.addPass(new T.RenderPass(scene, camera));
                    cc.addPass(new T.UnrealBloomPass(new T.Vector2(Math.max(1,Math.round((W)*rs)),Math.max(1,Math.round((H)*rs))), lp?0.49:0.7, 0.35, 0.85));
                    renderer._alloComposer=cc;
                  } catch(e){ try{ renderer._alloComposer=null; }catch(_){} }
                });
              })();
              camera.position.set(0, 0, 15);
              threeCameraRef.current = camera;

              var ambientLight = new THREE.AmbientLight(0xffffff, 0.48); // deeper sphere shading (CPK hues untouched — intensity only)
              scene.add(ambientLight);

              var hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.45);
              scene.add(hemiLight);

              var dirLight = new THREE.DirectionalLight(0xffffff, 1.05);
              dirLight.position.set(5, 10, 7);
              scene.add(dirLight);
              
              var fillLight = new THREE.DirectionalLight(0x90b0ff, 0.45);
              fillLight.position.set(-5, -5, -2);
              scene.add(fillLight);

              var rimLight = new THREE.DirectionalLight(0x67e8f9, 0.55);
              rimLight.position.set(-4, 3, 9);
              scene.add(rimLight);

              var controls = new THREE.OrbitControls(camera, renderer.domElement);
              controls.enableDamping = true;
              controls.dampingFactor = 0.05;
              controls.maxDistance = 50;
              controls.minDistance = 2;
              threeControlsRef.current = controls;

              threeResourcesRef.current = {
                ambientLight: ambientLight,
                hemiLight: hemiLight,
                dirLight: dirLight,
                fillLight: fillLight,
                rimLight: rimLight,
                atomGroup: new THREE.Group()
              };
              scene.add(threeResourcesRef.current.atomGroup);

              startLoop();

              // ── WebXR (optional): stand next to the molecule at life size, walk
              //    around it, and grip-grab it to rotate/scale. Loads AlloVR only
              //    when a headset is present; presenting-only, so 2D is untouched. ──
              try {
                if (navigator.xr && navigator.xr.isSessionSupported) {
                  navigator.xr.isSessionSupported('immersive-vr').then(function(ok) {
                    if (!ok) return;
                    ensureAlloVR(function(V) {
                      if (!V || !threeRendererRef.current || !threeSceneRef.current) return;
                      try { if (vrRef.current && vrRef.current.destroy) vrRef.current.destroy(); } catch(e){}
                      try {
                        vrRef.current = V.enable({
                          THREE: THREE, renderer: threeRendererRef.current, scene: threeSceneRef.current, camera: threeCameraRef.current,
                          seat: { position: [0, 0, 10], scale: 1 },
                          bounds: { minX: -15, maxX: 15, minZ: -15, maxZ: 15 },
                          grab: function() { return threeResourcesRef.current && threeResourcesRef.current.atomGroup; },
                          render: function() { var r = threeRendererRef.current, s = threeSceneRef.current, c = threeCameraRef.current; if (!r || !s || !c) return; var ac = r._alloComposer; if (ac) { try { ac.render(); return; } catch(e) { r._alloComposer = null; } } r.render(s, c); },
                          pauseLoop: function() { if (animationFrameIdRef.current) { cancelAnimationFrame(animationFrameIdRef.current); animationFrameIdRef.current = null; } },
                          resumeLoop: function() { startLoop(); }
                        });
                      } catch(e){}
                    });
                  }).catch(function(){});
                }
              } catch(e){}
            } catch(e) {
              console.error("Error in initThree", e);
            }
          };

          const startLoop = function() {
            var THREE = window.THREE;
            var animate = function() {
              animationFrameIdRef.current = requestAnimationFrame(animate);
              
              var controls = threeControlsRef.current;
              var resources = threeResourcesRef.current;
              if (resources && resources.atomGroup) {
                if (controls && controls.state === -1) {
                  resources.atomGroup.rotation.y += 0.005;
                }
              }
              
              if (controls) {
                controls.update();
              }
              
              if (threeRendererRef.current && threeSceneRef.current && threeCameraRef.current) {
                var canvas = webglCanvasRef.current;
                if (canvas) {
                  var W = canvas.clientWidth || 400;
                  var H = canvas.clientHeight || 300;
                  if (canvas.width !== W || canvas.height !== H) {
                    threeRendererRef.current.setSize(W, H, false);
                    try{ if(threeRendererRef.current._alloComposer){ threeRendererRef.current._alloComposer.setSize(W, H); } }catch(e){}
                    threeCameraRef.current.aspect = W / H;
                    threeCameraRef.current.updateProjectionMatrix();
                  }
                }
                var _ac=threeRendererRef.current._alloComposer; if(_ac){ try{ _ac.render(); }catch(e){ threeRendererRef.current._alloComposer=null; threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current); } } else { threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current); }
              }
            };
            
            if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
            }
            animate();
          };

          const update3DModel = function() {
            var THREE = window.THREE;
            var scene = threeSceneRef.current;
            var resources = threeResourcesRef.current;
            if (!THREE || !scene || !resources || !resources.atomGroup) return;

            var atomGroup = resources.atomGroup;
            while(atomGroup.children.length > 0) {
              var child = atomGroup.children[0];
              atomGroup.remove(child);
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(function(m) { m.dispose(); });
                } else {
                  child.material.dispose();
                }
              }
            }
            
            atomGroup.rotation.set(0, 0, 0);

            var atoms = d.atoms || [];
            var bonds = d.bonds || [];
            if (atoms.length === 0) return;

            var sumX = 0, sumY = 0;
            atoms.forEach(function(a) {
              sumX += a.x;
              sumY += a.y;
            });
            var avgX = sumX / atoms.length;
            var avgY = sumY / atoms.length;
            var scale = 0.045;

            var getRadius = function(el) {
              switch(el) {
                case 'H': return 0.55;
                case 'C': return 0.95;
                case 'N': return 0.9;
                case 'O': return 0.85;
                case 'F': return 0.8;
                case 'Cl': return 1.0;
                case 'Br': return 1.15;
                case 'I': return 1.3;
                case 'S': return 1.0;
                case 'P': return 1.05;
                case 'Na': return 1.1;
                case 'K': return 1.35;
                case 'Ca': return 1.25;
                case 'Fe': return 1.2;
                case 'Cu': return 1.15;
                case 'Zn': return 1.15;
                case 'Ag': return 1.25;
                case 'Au': return 1.3;
                default: return 0.9;
              }
            };

            var getColor = function(a) {
              if (a.color) {
                if (a.color.indexOf('var(') === 0) {
                  return 0x94a3b8;
                }
                return new THREE.Color(a.color);
              }
              return 0x94a3b8;
            };

            var teachingModel = getMoleculeTeachingModel(d.formula);
            var modelCoordinates = teachingModel && teachingModel.coordinates;
            var positions = atoms.map(function(a, idx) {
              if (modelCoordinates && modelCoordinates.length === atoms.length && modelCoordinates[idx]) {
                return new THREE.Vector3(modelCoordinates[idx][0], modelCoordinates[idx][1], modelCoordinates[idx][2]);
              }
              // User-arranged and complex presets remain planar; depth should never be
              // invented from element type because that implies unsupported geometry.
              return new THREE.Vector3((a.x - avgX) * scale, -(a.y - avgY) * scale, Number(a.z) || 0);
            });

            var createTextSprite = function(text) {
              var canvas = document.createElement('canvas');
              // Internal WebGL text texture; the visible viewport owns the alternative.
              canvas.setAttribute('aria-hidden', 'true');
              canvas.width = 96;
              canvas.height = 96;
              var ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, 96, 96);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 40px system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 7;
              ctx.lineJoin = 'round';
              ctx.strokeStyle = 'rgba(2,6,23,0.86)';
              ctx.shadowColor = 'rgba(15,23,42,0.55)';
              ctx.shadowBlur = 8;
              ctx.strokeText(text, 48, 50);
              ctx.fillText(text, 48, 50);
              
              var texture = new THREE.CanvasTexture(canvas);
              var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
              var sprite = new THREE.Sprite(spriteMat);
              sprite.renderOrder = 10;
              sprite.scale.set(0.82, 0.82, 1);
              return sprite;
            };

            // Render Atom Spheres and Labels
            atoms.forEach(function(a, i) {
              var pos = positions[i];
              var r = getRadius(a.el);
              var color = getColor(a);

              var sphereGeo = new THREE.SphereGeometry(r, 32, 32);
              var atomColor = new THREE.Color(color);
              var atomMat = new THREE.MeshStandardMaterial({
                color: atomColor,
                emissive: atomColor,
                emissiveIntensity: 0.06,
                roughness: 0.15,
                metalness: 0.1
              });
              var sphereMesh = new THREE.Mesh(sphereGeo, atomMat);
              sphereMesh.position.copy(pos);
              atomGroup.add(sphereMesh);

              var sprite = createTextSprite(a.el);
              sprite.position.copy(pos);
              atomGroup.add(sprite);
            });

            // Render Covalent Bonds (Supports single, double, and triple parallel rods)
            var renderBond = function(mid, len, quat, radius) {
              var cylinderGeo = new THREE.CylinderGeometry(radius, radius, len, 12);
              var bondMat = new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.35,
                metalness: 0.2
              });
              var cylinderMesh = new THREE.Mesh(cylinderGeo, bondMat);
              cylinderMesh.position.copy(mid);
              cylinderMesh.quaternion.copy(quat);
              atomGroup.add(cylinderMesh);
            };

            bonds.forEach(function(b) {
              var posA = positions[b[0]];
              var posB = positions[b[1]];
              if (!posA || !posB) return;
              var dist = posA.distanceTo(posB);
              if (dist < 0.01) return;

              var midpoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
              var direction = new THREE.Vector3().subVectors(posB, posA).normalize();
              var alignAxis = new THREE.Vector3(0, 1, 0);
              var quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, direction);

              var bondType = b[2] || 1;
              if (bondType === 1) {
                renderBond(midpoint, dist, quaternion, 0.12);
              } else {
                // Find a perpendicular direction for parallel offset cylinders
                var offsetDir = new THREE.Vector3(0, 0, 1);
                if (Math.abs(direction.dot(offsetDir)) > 0.95) {
                  offsetDir.set(1, 0, 0);
                }
                var perp1 = new THREE.Vector3().crossVectors(direction, offsetDir).normalize();
                
                if (bondType === 2) {
                  var off = 0.18;
                  var mid1 = new THREE.Vector3().copy(midpoint).addScaledVector(perp1, off);
                  var mid2 = new THREE.Vector3().copy(midpoint).addScaledVector(perp1, -off);
                  renderBond(mid1, dist, quaternion, 0.08);
                  renderBond(mid2, dist, quaternion, 0.08);
                } else if (bondType === 3) {
                  var perp2 = new THREE.Vector3().crossVectors(direction, perp1).normalize();
                  var off = 0.22;
                  var mid1 = new THREE.Vector3().copy(midpoint);
                  var mid2 = new THREE.Vector3().copy(midpoint).addScaledVector(perp2, off);
                  var mid3 = new THREE.Vector3().copy(midpoint).addScaledVector(perp2, -off);
                  renderBond(mid1, dist, quaternion, 0.07);
                  renderBond(mid2, dist, quaternion, 0.07);
                  renderBond(mid3, dist, quaternion, 0.07);
                }
              }
            });
          };

          const disposeThree = function() {
            try {
              try { if (vrRef.current && vrRef.current.destroy) vrRef.current.destroy(); vrRef.current = null; } catch(e){}
              if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
              }
              if (threeControlsRef.current) {
                threeControlsRef.current.dispose();
                threeControlsRef.current = null;
              }
              if (threeRendererRef.current) {
                var renderer = threeRendererRef.current;
                try{ if(renderer._alloComposer){ (renderer._alloComposer.passes||[]).forEach(function(p){if(p&&p.dispose)p.dispose();}); renderer._alloComposer=null; } }catch(e){}
                renderer.dispose();
                threeRendererRef.current = null;
              }
              if (threeSceneRef.current) {
                var scene = threeSceneRef.current;
                scene.traverse(function(obj) {
                  if (obj.geometry) obj.geometry.dispose();
                  if (obj.material) {
                    if (Array.isArray(obj.material)) {
                      obj.material.forEach(function(m) { m.dispose(); });
                    } else {
                      obj.material.dispose();
                    }
                  }
                });
                threeSceneRef.current = null;
              }
              threeCameraRef.current = null;
              threeResourcesRef.current = null;
            } catch(e) {
              console.error("Error in disposeThree", e);
            }
          };

          // â”€â”€ Periodic Table Data (118 elements) â”€â”€

          const ELEMENTS = [

            { n: 1, s: 'H', name: t('stem.periodic.hydrogen'), cat: 'nonmetal', c: '#60a5fa' }, { n: 2, s: 'He', name: t('stem.periodic.helium'), cat: 'noble', c: '#c084fc' },

            { n: 3, s: 'Li', name: t('stem.periodic.lithium'), cat: 'alkali', c: '#f87171' }, { n: 4, s: 'Be', name: t('stem.periodic.beryllium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 5, s: 'B', name: t('stem.periodic.boron'), cat: 'metalloid', c: '#34d399' }, { n: 6, s: 'C', name: t('stem.periodic.carbon'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 7, s: 'N', name: t('stem.periodic.nitrogen'), cat: 'nonmetal', c: '#60a5fa' }, { n: 8, s: 'O', name: t('stem.periodic.oxygen'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 9, s: 'F', name: t('stem.periodic.fluorine'), cat: 'halogen', c: '#2dd4bf' }, { n: 10, s: 'Ne', name: t('stem.periodic.neon'), cat: 'noble', c: '#c084fc' },

            { n: 11, s: 'Na', name: t('stem.periodic.sodium'), cat: 'alkali', c: '#f87171' }, { n: 12, s: 'Mg', name: t('stem.periodic.magnesium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 13, s: 'Al', name: t('stem.periodic.aluminum'), cat: 'metal', c: '#94a3b8' }, { n: 14, s: 'Si', name: t('stem.periodic.silicon'), cat: 'metalloid', c: '#34d399' },

            { n: 15, s: 'P', name: t('stem.periodic.phosphorus'), cat: 'nonmetal', c: '#60a5fa' }, { n: 16, s: 'S', name: t('stem.periodic.sulfur'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 17, s: 'Cl', name: t('stem.periodic.chlorine'), cat: 'halogen', c: '#2dd4bf' }, { n: 18, s: 'Ar', name: t('stem.periodic.argon'), cat: 'noble', c: '#c084fc' },

            { n: 19, s: 'K', name: t('stem.periodic.potassium'), cat: 'alkali', c: '#f87171' }, { n: 20, s: 'Ca', name: t('stem.periodic.calcium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 21, s: 'Sc', name: t('stem.periodic.scandium'), cat: 'transition', c: '#fb923c' }, { n: 22, s: 'Ti', name: t('stem.periodic.titanium'), cat: 'transition', c: '#fb923c' },

            { n: 23, s: 'V', name: t('stem.periodic.vanadium'), cat: 'transition', c: '#fb923c' }, { n: 24, s: 'Cr', name: t('stem.periodic.chromium'), cat: 'transition', c: '#fb923c' },

            { n: 25, s: 'Mn', name: t('stem.periodic.manganese'), cat: 'transition', c: '#fb923c' }, { n: 26, s: 'Fe', name: t('stem.periodic.iron'), cat: 'transition', c: '#fb923c' },

            { n: 27, s: 'Co', name: t('stem.periodic.cobalt'), cat: 'transition', c: '#fb923c' }, { n: 28, s: 'Ni', name: t('stem.periodic.nickel'), cat: 'transition', c: '#fb923c' },

            { n: 29, s: 'Cu', name: t('stem.periodic.copper'), cat: 'transition', c: '#fb923c' }, { n: 30, s: 'Zn', name: t('stem.periodic.zinc'), cat: 'transition', c: '#fb923c' },

            { n: 31, s: 'Ga', name: t('stem.periodic.gallium'), cat: 'metal', c: '#94a3b8' }, { n: 32, s: 'Ge', name: t('stem.periodic.germanium'), cat: 'metalloid', c: '#34d399' },

            { n: 33, s: 'As', name: t('stem.periodic.arsenic'), cat: 'metalloid', c: '#34d399' }, { n: 34, s: 'Se', name: t('stem.periodic.selenium'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 35, s: 'Br', name: t('stem.periodic.bromine'), cat: 'halogen', c: '#2dd4bf' }, { n: 36, s: 'Kr', name: t('stem.periodic.krypton'), cat: 'noble', c: '#c084fc' },

            { n: 37, s: 'Rb', name: t('stem.periodic.rubidium'), cat: 'alkali', c: '#f87171' }, { n: 38, s: 'Sr', name: t('stem.periodic.strontium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 39, s: 'Y', name: t('stem.periodic.yttrium'), cat: 'transition', c: '#fb923c' }, { n: 40, s: 'Zr', name: t('stem.periodic.zirconium'), cat: 'transition', c: '#fb923c' },

            { n: 41, s: 'Nb', name: t('stem.periodic.niobium'), cat: 'transition', c: '#fb923c' }, { n: 42, s: 'Mo', name: t('stem.periodic.molybdenum'), cat: 'transition', c: '#fb923c' },

            { n: 43, s: 'Tc', name: t('stem.periodic.technetium'), cat: 'transition', c: '#fb923c' }, { n: 44, s: 'Ru', name: t('stem.periodic.ruthenium'), cat: 'transition', c: '#fb923c' },

            { n: 45, s: 'Rh', name: t('stem.periodic.rhodium'), cat: 'transition', c: '#fb923c' }, { n: 46, s: 'Pd', name: t('stem.periodic.palladium'), cat: 'transition', c: '#fb923c' },

            { n: 47, s: 'Ag', name: t('stem.periodic.silver'), cat: 'transition', c: '#fb923c' }, { n: 48, s: 'Cd', name: t('stem.periodic.cadmium'), cat: 'transition', c: '#fb923c' },

            { n: 49, s: 'In', name: t('stem.periodic.indium'), cat: 'metal', c: '#94a3b8' }, { n: 50, s: 'Sn', name: 'Tin', cat: 'metal', c: '#94a3b8' },

            { n: 51, s: 'Sb', name: t('stem.periodic.antimony'), cat: 'metalloid', c: '#34d399' }, { n: 52, s: 'Te', name: t('stem.periodic.tellurium'), cat: 'metalloid', c: '#34d399' },

            { n: 53, s: 'I', name: t('stem.periodic.iodine'), cat: 'halogen', c: '#2dd4bf' }, { n: 54, s: 'Xe', name: t('stem.periodic.xenon'), cat: 'noble', c: '#c084fc' },

            { n: 55, s: 'Cs', name: t('stem.periodic.cesium'), cat: 'alkali', c: '#f87171' }, { n: 56, s: 'Ba', name: t('stem.periodic.barium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 57, s: 'La', name: t('stem.periodic.lanthanide'), cat: 'lanthanide', c: '#a78bfa' }, { n: 58, s: 'Ce', name: t('stem.periodic.cerium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 59, s: 'Pr', name: t('stem.periodic.praseodymium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 60, s: 'Nd', name: t('stem.periodic.neodymium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 61, s: 'Pm', name: t('stem.periodic.promethium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 62, s: 'Sm', name: t('stem.periodic.samarium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 63, s: 'Eu', name: t('stem.periodic.europium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 64, s: 'Gd', name: t('stem.periodic.gadolinium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 65, s: 'Tb', name: t('stem.periodic.terbium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 66, s: 'Dy', name: t('stem.periodic.dysprosium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 67, s: 'Ho', name: t('stem.periodic.holmium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 68, s: 'Er', name: t('stem.periodic.erbium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 69, s: 'Tm', name: t('stem.periodic.thulium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 70, s: 'Yb', name: t('stem.periodic.ytterbium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 71, s: 'Lu', name: t('stem.periodic.lutetium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 72, s: 'Hf', name: t('stem.periodic.hafnium'), cat: 'transition', c: '#fb923c' }, { n: 73, s: 'Ta', name: t('stem.periodic.tantalum'), cat: 'transition', c: '#fb923c' },

            { n: 74, s: 'W', name: t('stem.periodic.tungsten'), cat: 'transition', c: '#fb923c' }, { n: 75, s: 'Re', name: t('stem.periodic.rhenium'), cat: 'transition', c: '#fb923c' },

            { n: 76, s: 'Os', name: t('stem.periodic.osmium'), cat: 'transition', c: '#fb923c' }, { n: 77, s: 'Ir', name: t('stem.periodic.iridium'), cat: 'transition', c: '#fb923c' },

            { n: 78, s: 'Pt', name: t('stem.periodic.platinum'), cat: 'transition', c: '#fb923c' }, { n: 79, s: 'Au', name: t('stem.periodic.gold'), cat: 'transition', c: '#fb923c' },

            { n: 80, s: 'Hg', name: t('stem.periodic.mercury'), cat: 'transition', c: '#fb923c' }, { n: 81, s: 'Tl', name: t('stem.periodic.thallium'), cat: 'metal', c: '#94a3b8', gravity: '0.38g', atmosphere: 'None - no significant atmosphere', surface: 'Heavily cratered, resembling the Moon', notableFeatures: ['Caloris Basin (1,550 km crater)', 'Ice in permanently shadowed craters', 'Fastest orbital speed: 47 km/s'], skyColor: '#000000', terrainColor: '#7a7a7a', terrainType: 'cratered', surfaceDesc: 'Grey cratered wasteland under a black sky. The Sun appears 3x larger than on Earth.' },

            { n: 82, s: 'Pb', name: t('stem.periodic.lead'), cat: 'metal', c: '#94a3b8' }, { n: 83, s: 'Bi', name: t('stem.periodic.bismuth'), cat: 'metal', c: '#94a3b8' },

            { n: 84, s: 'Po', name: t('stem.periodic.polonium'), cat: 'metalloid', c: '#34d399' }, { n: 85, s: 'At', name: t('stem.periodic.astatine'), cat: 'halogen', c: '#2dd4bf' },

            { n: 86, s: 'Rn', name: t('stem.periodic.radon'), cat: 'noble', c: '#c084fc' },

            { n: 87, s: 'Fr', name: t('stem.periodic.francium'), cat: 'alkali', c: '#f87171' }, { n: 88, s: 'Ra', name: t('stem.periodic.radium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 89, s: 'Ac', name: t('stem.periodic.actinide'), cat: 'actinide', c: '#f472b6' }, { n: 90, s: 'Th', name: t('stem.periodic.thorium'), cat: 'actinide', c: '#f472b6' },

            { n: 91, s: 'Pa', name: t('stem.periodic.protactinium'), cat: 'actinide', c: '#f472b6' }, { n: 92, s: 'U', name: t('stem.periodic.uranium'), cat: 'actinide', c: '#f472b6' },

            { n: 93, s: 'Np', name: t('stem.periodic.neptunium'), cat: 'actinide', c: '#f472b6' }, { n: 94, s: 'Pu', name: t('stem.periodic.plutonium'), cat: 'actinide', c: '#f472b6' },

            { n: 95, s: 'Am', name: t('stem.periodic.americium'), cat: 'actinide', c: '#f472b6' }, { n: 96, s: 'Cm', name: t('stem.periodic.curium'), cat: 'actinide', c: '#f472b6' },

            { n: 97, s: 'Bk', name: t('stem.periodic.berkelium'), cat: 'actinide', c: '#f472b6' }, { n: 98, s: 'Cf', name: t('stem.periodic.californium'), cat: 'actinide', c: '#f472b6' },

            { n: 99, s: 'Es', name: t('stem.periodic.einsteinium'), cat: 'actinide', c: '#f472b6' }, { n: 100, s: 'Fm', name: t('stem.periodic.fermium'), cat: 'actinide', c: '#f472b6' },

            { n: 101, s: 'Md', name: t('stem.periodic.mendelevium'), cat: 'actinide', c: '#f472b6' }, { n: 102, s: 'No', name: t('stem.periodic.nobelium'), cat: 'actinide', c: '#f472b6' },

            { n: 103, s: 'Lr', name: t('stem.periodic.lawrencium'), cat: 'actinide', c: '#f472b6' },

            { n: 104, s: 'Rf', name: t('stem.periodic.rutherfordium'), cat: 'transition', c: '#fb923c' }, { n: 105, s: 'Db', name: t('stem.periodic.dubnium'), cat: 'transition', c: '#fb923c' },

            { n: 106, s: 'Sg', name: t('stem.periodic.seaborgium'), cat: 'transition', c: '#fb923c' }, { n: 107, s: 'Bh', name: t('stem.periodic.bohrium'), cat: 'transition', c: '#fb923c' },

            { n: 108, s: 'Hs', name: t('stem.periodic.hassium'), cat: 'transition', c: '#fb923c' }, { n: 109, s: 'Mt', name: t('stem.periodic.meitnerium'), cat: 'transition', c: '#fb923c' },

            { n: 110, s: 'Ds', name: t('stem.periodic.darmstadtium'), cat: 'transition', c: '#fb923c' }, { n: 111, s: 'Rg', name: t('stem.periodic.roentgenium'), cat: 'transition', c: '#fb923c' },

            { n: 112, s: 'Cn', name: t('stem.periodic.copernicium'), cat: 'transition', c: '#fb923c' }, { n: 113, s: 'Nh', name: t('stem.periodic.nihonium'), cat: 'metal', c: '#94a3b8' },

            { n: 114, s: 'Fl', name: t('stem.periodic.flerovium'), cat: 'metal', c: '#94a3b8' }, { n: 115, s: 'Mc', name: t('stem.periodic.moscovium'), cat: 'metal', c: '#94a3b8' },

            { n: 116, s: 'Lv', name: t('stem.periodic.livermorium'), cat: 'metal', c: '#94a3b8' }, { n: 117, s: 'Ts', name: t('stem.periodic.tennessine'), cat: 'halogen', c: '#2dd4bf' },

            { n: 118, s: 'Og', name: t('stem.periodic.oganesson'), cat: 'noble', c: '#c084fc' }

          ];



          // â”€â”€ Element Details (descriptions, uses, compounds) â”€â”€

          const ELEMENT_DETAILS = {

            H: { desc: t('stem.periodic.lightest_element_fuels_stars_via'), uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H₂O (Water)', 'HCl (Hydrochloric Acid)', 'NH₃ (Ammonia)', 'CH₄ (Methane)'] },

            He: { desc: t('stem.periodic.inert_noble_gas_2nd_most'), uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas â€” does not form compounds)'] },

            Li: { desc: t('stem.periodic.lightest_metal_soft_enough_to'), uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li₂CO₃ (Lithium Carbonate)'] },

            Be: { desc: t('stem.periodic.rare_toxic_metal_that_is'), uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },

            B: { desc: t('stem.periodic.metalloid_essential_for_plant_growth'), uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B₂O₃ (Boron Trioxide)', 'H₃BO₃ (Boric Acid)'] },

            C: { desc: t('stem.periodic.basis_of_all_known_life'), uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO₂ (Carbon Dioxide)', 'CH₄ (Methane)', 'C₆H₁₂O₆ (Glucose)', 'CaCO₃ (Limestone)'] },

            N: { desc: t('stem.periodic.makes_up_78_of_earth') + "'s atmosphere", uses: ['Fertilizers', 'Explosives(TNT)', 'Food preservation'], compounds: ['NH₃ (Ammonia)', 'NO₂ (Nitrogen Dioxide)', 'N₂O(Laughing Gas)', 'HNO₃ (Nitric Acid)'] },

            O: { desc: t('stem.periodic.essential_for_respiration_most_abundant') + "'s crust", uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H₂O(Water)', 'CO₂ (Carbon Dioxide)', 'Fe₂O₃(Rust)', 'O₃(Ozone)'] },

            F: { desc: t('stem.periodic.most_reactive_and_electronegative_element'), uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF₄ (Carbon Tetrafluoride)'] },

            Ne: { desc: t('stem.periodic.produces_iconic_reddishorange_glow_in'), uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },

            Na: { desc: t('stem.periodic.soft_silvery_metal_that_reacts'), uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO₃ (Baking Soda)', 'Na₂CO₃ (Washing Soda)'] },

            Mg: { desc: t('stem.periodic.lightweight_metal_that_burns_with'), uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO₄ (Epsom Salt)', 'Mg(OH)₂ (Milk of Magnesia)'] },

            Al: { desc: t('stem.periodic.most_abundant_metal_in_earth') + "'s crust", uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al₂O₃ (Alumina)', 'AlCl₃(Aluminum Chloride)'] },

            Si: { desc: t('stem.periodic.semiconductor_that_powers_the_digital'), uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO₂ (Sand/Quartz)', 'SiC (Silicon Carbide)'] },

            P: { desc: t('stem.periodic.essential_for_dna_and_bones'), uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H₃PO₄ (Phosphoric Acid)', 'Ca₃(PO₄)₂ (Bone mineral)'] },

            S: { desc: t('stem.periodic.yellow_element_with_distinctive_rottenegg'), uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H₂SO₄ (Sulfuric Acid)', 'SO₂ (Sulfur Dioxide)', 'H₂S (Hydrogen Sulfide)'] },

            Cl: { desc: t('stem.periodic.greenishyellow_gas_used_to_purify'), uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },

            Ar: { desc: t('stem.periodic.third_most_abundant_gas_in'), uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },

            K: { desc: t('stem.periodic.essential_nutrient_found_in_bananas'), uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO₃ (Saltpeter)'] },

            Ca: { desc: t('stem.periodic.builds_bones_and_teeth_5th'), uses: ['Cement & concrete', 'Chalk & plaster', 'Dietary supplement'], compounds: ['CaCO₃ (Limestone/Chalk)', 'CaO (Quicklime)', 'Ca(OH)₂ (Slaked Lime)', 'CaSO₄ (Gypsum)'] },

            Fe: { desc: t('stem.periodic.most_used_metal_core_of'), uses: ['Steel construction', 'Cast iron cookware', 'Magnetic devices'], compounds: ['Fe₂O₃ (Rust)', 'FeSO₄ (Iron Supplement)', 'Fe₃O₄ (Magnetite)'] },

            Cu: { desc: t('stem.periodic.reddish_metal_used_since_the'), uses: ['Electrical wiring', 'Plumbing pipes', 'Coins'], compounds: ['CuSO₄ (Blue Vitriol)', 'CuO (Copper Oxide)', 'Cu₂O (Cuprous Oxide)'] },

            Zn: { desc: t('stem.periodic.bluishwhite_metal_that_prevents_rust'), uses: ['Galvanizing steel', 'Batteries', 'Sunscreen (zinc oxide)'], compounds: ['ZnO (Zinc Oxide)', 'ZnS (Zinc Sulfide)', 'ZnCl₂ (Zinc Chloride)'] },

            Ag: { desc: t('stem.periodic.best_conductor_of_electricity_among'), uses: ['Jewelry & silverware', 'Photography', 'Electronics'], compounds: ['AgNO₃ (Silver Nitrate)', 'AgCl (Silver Chloride)', 'Ag₂O (Silver Oxide)'] },

            Au: { desc: t('stem.periodic.dense_soft_shiny_precious_metal'), uses: ['Jewelry', 'Electronics (connectors)', 'Currency reserves'], compounds: ['AuCl₃ (Gold Chloride) â€” gold rarely forms compounds'] },

            Ti: { desc: t('stem.periodic.strong_as_steel_but_45'), uses: ['Aircraft & spacecraft', 'Joint replacements', 'Titanium white paint'], compounds: ['TiO₂ (Titanium Dioxide)', 'TiCl₄ (Titanium Tetrachloride)'] },

            Cr: { desc: t('stem.periodic.shiny_metal_that_gives_rubies'), uses: ['Chrome plating', 'Stainless steel', 'Leather tanning'], compounds: ['Cr₂O₃ (Chromium Oxide)', 'K₂Cr₂O₇ (Potassium Dichromate)'] },

            Mn: { desc: t('stem.periodic.essential_for_steel_production_and'), uses: ['Steel alloys', 'Alkaline batteries', 'Glass decolorizer'], compounds: ['MnO₂ (Manganese Dioxide)', 'KMnO₄ (Potassium Permanganate)'] },

            Ni: { desc: t('stem.periodic.corrosionresistant_metal_used_in_coins'), uses: ['Stainless steel', 'Rechargeable batteries', 'Coins'], compounds: ['NiO (Nickel Oxide)', 'NiSO₄ (Nickel Sulfate)'] },

            Br: { desc: t('stem.periodic.only_nonmetal_liquid_at_room'), uses: ['Flame retardants', 'Photography', 'Water purification'], compounds: ['NaBr (Sodium Bromide)', 'HBr (Hydrobromic Acid)'] },

            I: { desc: t('stem.periodic.essential_trace_element_for_thyroid'), uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },

            Pt: { desc: t('stem.periodic.precious_metal_rarer_than_gold'), uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl₂ (Platinum Chloride)', 'H₂PtCl₆ (Chloroplatinic Acid)'] },

            U: { desc: t('stem.periodic.dense_radioactive_metal_that_powers'), uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO₂ (Uranium Dioxide)', 'UF₆ (Uranium Hexafluoride)'] },

            Hg: { desc: t('stem.periodic.only_metal_liquid_at_room'), uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl₂ (Mercury Chloride)', 'HgO (Mercury Oxide)'] },

            Pb: { desc: t('stem.periodic.dense_soft_metal_once_used'), uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO₄ (Lead Sulfate)'] },

            Sn: { desc: t('stem.periodic.soft_silvery_metal_used_since'), uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO₂ (Tin Oxide)', 'SnCl₂ (Tin Chloride)'] },

            W: { desc: t('stem.periodic.has_the_highest_melting_point'), uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO₃ (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] },

          };

          const getElementDetail = (sym) => ELEMENT_DETAILS[sym] || null;

          const getElementCompounds = (sym) => COMPOUNDS.filter(c => Object.keys(c.recipe).includes(sym));



          const getEl = (sym) => ELEMENTS.find(e => e.s === sym);

          // â”€â”€ Periodic Table layout (row, col) â”€â”€

          const PT_LAYOUT = [

            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],

            [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],

            [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],

            [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],

            [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],

            [55, 56, 0, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],

            [87, 88, 0, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],

            [],

            [0, 0, 0, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],

            [0, 0, 0, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103]
          ];

          // NOTE: the 15 compounds below were mistakenly pasted INTO PT_LAYOUT (after a
          // stray comma), so Table mode's `PT_LAYOUT.flatMap(row => ... row.map(...))`
          // hit plain objects → "row.map is not a function" → Table mode white-screened.
          // They are real compounds, so keep them in their own array and fold into COMPOUNDS.
          const PT_EXTRA_COMPOUNDS = [
            { name: __alloT('stem.molecule.aspirin', 'Aspirin'), formula: 'C₉H₈O₄', recipe: { C: 9, H: 8, O: 4 }, desc: __alloT('stem.molecule.pain_reliever_anti_inflammatory', 'Pain reliever & anti-inflammatory'), emoji: '💊' },
            { name: __alloT('stem.molecule.caffeine', 'Caffeine'), formula: 'C₈H₁₀N₄O₂', recipe: { C: 8, H: 10, N: 4, O: 2 }, desc: __alloT('stem.molecule.the_world_s_most_popular_stimulant', 'The world\'s most popular stimulant'), emoji: '☕' },
            { name: __alloT('stem.molecule.citric_acid', 'Citric Acid'), formula: 'C₆H₈O₇', recipe: { C: 6, H: 8, O: 7 }, desc: __alloT('stem.molecule.found_in_citrus_fruits', 'Found in citrus fruits'), emoji: '🍋' },
            { name: __alloT('stem.molecule.urea', 'Urea'), formula: 'CH₄N₂O', recipe: { C: 1, H: 4, N: 2, O: 1 }, desc: __alloT('stem.molecule.first_organic_compound_synthesized', 'First organic compound synthesized'), emoji: '🧪' },
            { name: __alloT('stem.molecule.calcium_chloride', 'Calcium Chloride'), formula: 'CaCl₂', recipe: { Ca: 1, Cl: 2 }, desc: __alloT('stem.molecule.road_de_icer_cheese_making', 'Road de-icer & cheese making'), emoji: '❄️' },
            { name: __alloT('stem.molecule.sodium_sulfate', 'Sodium Sulfate'), formula: 'Na₂SO₄', recipe: { Na: 2, S: 1, O: 4 }, desc: __alloT('stem.molecule.detergent_additive', 'Detergent additive'), emoji: '🧴' },
            { name: __alloT('stem.molecule.magnesium_hydroxide', 'Magnesium Hydroxide'), formula: 'Mg(OH)₂', recipe: { Mg: 1, O: 2, H: 2 }, desc: __alloT('stem.molecule.milk_of_magnesia_antacid', 'Milk of magnesia (antacid)'), emoji: '🥛' },
            { name: __alloT('stem.molecule.aluminum_oxide', 'Aluminum Oxide'), formula: 'Al₂O₃', recipe: { Al: 2, O: 3 }, desc: __alloT('stem.molecule.corundum_ruby_sapphire', 'Corundum - ruby & sapphire'), emoji: '💎' },
            { name: __alloT('stem.molecule.silver_nitrate', 'Silver Nitrate'), formula: 'AgNO₃', recipe: { Ag: 1, N: 1, O: 3 }, desc: __alloT('stem.molecule.photography_wound_treatment', 'Photography & wound treatment'), emoji: '📷' },
            { name: __alloT('stem.molecule.potassium_permanganate', 'Potassium Permanganate'), formula: 'KMnO₄', recipe: { K: 1, Mn: 1, O: 4 }, desc: __alloT('stem.molecule.purple_water_purifier', 'Purple water purifier'), emoji: '🟣' },
            { name: __alloT('stem.molecule.zinc_oxide', 'Zinc Oxide'), formula: 'ZnO', recipe: { Zn: 1, O: 1 }, desc: __alloT('stem.molecule.sunscreen_diaper_cream', 'Sunscreen & diaper cream'), emoji: '☀️' },
            { name: __alloT('stem.molecule.copper_oxide', 'Copper Oxide'), formula: 'CuO', recipe: { Cu: 1, O: 1 }, desc: __alloT('stem.molecule.black_pigment_in_ceramics', 'Black pigment in ceramics'), emoji: '🎨' },
            { name: __alloT('stem.molecule.iron_sulfate', 'Iron Sulfate'), formula: 'FeSO₄', recipe: { Fe: 1, S: 1, O: 4 }, desc: __alloT('stem.molecule.iron_supplement_for_anemia', 'Iron supplement for anemia'), emoji: '💊' },
            { name: __alloT('stem.molecule.ammonium_chloride', 'Ammonium Chloride'), formula: 'NH₄Cl', recipe: { N: 1, H: 4, Cl: 1 }, desc: __alloT('stem.molecule.solder_flux_cough_drops', 'Solder flux & cough drops'), emoji: '🧪' },
            { name: __alloT('stem.molecule.calcium_hydroxide', 'Calcium Hydroxide'), formula: 'Ca(OH)₂', recipe: { Ca: 1, O: 2, H: 2 }, desc: __alloT('stem.molecule.slaked_lime_for_mortar', 'Slaked lime for mortar'), emoji: '🪨' }];

          // â”€â”€ Compound Recipes â”€â”€

          const COMPOUNDS = [

            { name: t('stem.chem_balance.water'), formula: t('stem.periodic.hu2082o'), recipe: { H: 2, O: 1 }, desc: t('stem.periodic.essential_for_life'), emoji: '\uD83D\uDCA7' },

            { name: t('stem.periodic.carbon_dioxide'), formula: t('stem.periodic.cou2082'), recipe: { C: 1, O: 2 }, desc: t('stem.periodic.greenhouse_gas'), emoji: '\uD83C\uDF2B\uFE0F' },

            { name: t('stem.chem_balance.table_salt'), formula: t('stem.periodic.nacl'), recipe: { Na: 1, Cl: 1 }, desc: t('stem.periodic.sodium_chloride'), emoji: '\uD83E\uDDC2' },

            { name: t('stem.chem_balance.ammonia'), formula: t('stem.periodic.nhu2083'), recipe: { N: 1, H: 3 }, desc: t('stem.periodic.cleaning_agent'), emoji: '\uD83E\uDDEA' },

            { name: t('stem.periodic.methane'), formula: t('stem.periodic.chu2084'), recipe: { C: 1, H: 4 }, desc: t('stem.periodic.natural_gas'), emoji: '\uD83D\uDD25' },

            { name: t('stem.periodic.hydrogen_peroxide'), formula: 'H\u2082O\u2082', recipe: { H: 2, O: 2 }, desc: t('stem.periodic.disinfectant'), emoji: '\uD83E\uDE79' },

            { name: t('stem.periodic.ethanol'), formula: 'C\u2082H\u2085OH', recipe: { C: 2, H: 6, O: 1 }, desc: t('stem.periodic.alcohol'), emoji: '\uD83C\uDF7A' },

            { name: t('stem.periodic.sulfuric_acid'), formula: 'H\u2082SO\u2084', recipe: { H: 2, S: 1, O: 4 }, desc: t('stem.periodic.battery_acid'), emoji: '\u26A0\uFE0F' },

            { name: t('stem.periodic.glucose'), formula: 'C\u2086H\u2081\u2082O\u2086', recipe: { C: 6, H: 12, O: 6 }, desc: t('stem.periodic.blood_sugar'), emoji: '\uD83C\uDF6C' },

            { name: t('stem.periodic.baking_soda'), formula: 'NaHCO\u2083', recipe: { Na: 1, H: 1, C: 1, O: 3 }, desc: t('stem.periodic.sodium_bicarbonate'), emoji: '\uD83E\uDDC1' },

            { name: t('stem.chem_balance.calcium_carbonate'), formula: 'CaCO\u2083', recipe: { Ca: 1, C: 1, O: 3 }, desc: t('stem.periodic.chalk_marble'), emoji: '\uD83E\uDEA8' },

            { name: t('stem.chem_balance.iron_oxide'), formula: 'Fe\u2082O\u2083', recipe: { Fe: 2, O: 3 }, desc: t('stem.periodic.rust'), emoji: '\uD83D\uDFE5' },

            { name: t('stem.periodic.sodium_hydroxide'), formula: 'NaOH', recipe: { Na: 1, O: 1, H: 1 }, desc: t('stem.periodic.lye_caustic_soda'), emoji: '\uD83E\uDDEA' },

            { name: t('stem.periodic.hydrochloric_acid'), formula: 'HCl', recipe: { H: 1, Cl: 1 }, desc: t('stem.periodic.stomach_acid'), emoji: '\uD83E\uDE79' },

            { name: t('stem.periodic.acetic_acid'), formula: 'CH\u2083COOH', recipe: { C: 2, H: 4, O: 2 }, desc: t('stem.periodic.vinegar'), emoji: '\uD83E\uDD4B' },

            { name: t('stem.periodic.nitrogen_dioxide'), formula: 'NO\u2082', recipe: { N: 1, O: 2 }, desc: t('stem.periodic.brown_smog_gas'), emoji: '\uD83C\uDF2B\uFE0F' },

            { name: t('stem.periodic.sulfur_dioxide'), formula: 'SO\u2082', recipe: { S: 1, O: 2 }, desc: t('stem.periodic.acid_rain_precursor'), emoji: '\uD83C\uDF27\uFE0F' },

            { name: t('stem.periodic.ozone'), formula: 'O\u2083', recipe: { O: 3 }, desc: t('stem.periodic.uv_shield'), emoji: '\uD83D\uDEE1\uFE0F' },

            { name: t('stem.periodic.laughing_gas'), formula: 'N\u2082O', recipe: { N: 2, O: 1 }, desc: t('stem.periodic.nitrous_oxide'), emoji: '\uD83D\uDE02' },

            { name: t('stem.periodic.silicon_dioxide'), formula: 'SiO\u2082', recipe: { Si: 1, O: 2 }, desc: t('stem.periodic.sand_glass'), emoji: '\uD83C\uDFD6\uFE0F' },

          ].concat(PT_EXTRA_COMPOUNDS);

          const selectedEls = d.selectedElements || {};

          // ═══ Chemical Reactions Database (10 reactions) ═══
          const REACTIONS = [
            { id: 'water_synth', name: __alloT('stem.molecule.water_synthesis', 'Water Synthesis'), emoji: '💧', type: 'Synthesis', difficulty: 1,
              desc: __alloT('stem.molecule.hydrogen_combines_with_oxygen_to_form_', 'Hydrogen combines with oxygen to form water.'),
              left: [{ formula: 'H₂', atoms: { H: 2 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [2, 1, 2] },
            { id: 'haber', name: __alloT('stem.molecule.haber_process', 'Haber Process'), emoji: '🌾', type: 'Synthesis', difficulty: 2,
              desc: __alloT('stem.molecule.nitrogen_and_hydrogen_form_ammonia_fee', 'Nitrogen and hydrogen form ammonia - feeds half the world!'),
              left: [{ formula: 'N₂', atoms: { N: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
              right: [{ formula: 'NH₃', atoms: { N: 1, H: 3 } }],
              answer: [1, 3, 2] },
            { id: 'methane_combust', name: __alloT('stem.molecule.methane_combustion', 'Methane Combustion'), emoji: '🔥', type: 'Combustion', difficulty: 1,
              desc: __alloT('stem.molecule.natural_gas_burns_to_produce_co_and_wa', 'Natural gas burns to produce CO₂ and water.'),
              left: [{ formula: 'CH₄', atoms: { C: 1, H: 4 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 2, 1, 2] },
            { id: 'iron_rust', name: __alloT('stem.molecule.rusting_of_iron', 'Rusting of Iron'), emoji: '🟥', type: 'Synthesis', difficulty: 3,
              desc: __alloT('stem.molecule.iron_reacts_with_oxygen_to_form_iron_o', 'Iron reacts with oxygen to form iron oxide (rust).'),
              left: [{ formula: 'Fe', atoms: { Fe: 1 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'Fe₂O₃', atoms: { Fe: 2, O: 3 } }],
              answer: [4, 3, 2] },
            { id: 'salt_formation', name: __alloT('stem.molecule.salt_formation', 'Salt Formation'), emoji: '🧂', type: 'Synthesis', difficulty: 1,
              desc: __alloT('stem.molecule.sodium_metal_reacts_with_chlorine_gas_', 'Sodium metal reacts with chlorine gas to make table salt.'),
              left: [{ formula: 'Na', atoms: { Na: 1 } }, { formula: 'Cl₂', atoms: { Cl: 2 } }],
              right: [{ formula: 'NaCl', atoms: { Na: 1, Cl: 1 } }],
              answer: [2, 1, 2] },
            { id: 'propane_combust', name: __alloT('stem.molecule.propane_combustion', 'Propane Combustion'), emoji: '🔥', type: 'Combustion', difficulty: 3,
              desc: __alloT('stem.molecule.propane_burns_the_bbq_grill_reaction', 'Propane burns - the BBQ grill reaction!'),
              left: [{ formula: 'C₃H₈', atoms: { C: 3, H: 8 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 5, 3, 4] },
            { id: 'zinc_acid', name: __alloT('stem.molecule.zinc_in_acid', 'Zinc in Acid'), emoji: '⚗️', type: 'Single Replacement', difficulty: 2,
              desc: __alloT('stem.molecule.zinc_dissolves_in_hydrochloric_acid_re', 'Zinc dissolves in hydrochloric acid, releasing hydrogen gas.'),
              left: [{ formula: 'Zn', atoms: { Zn: 1 } }, { formula: 'HCl', atoms: { H: 1, Cl: 1 } }],
              right: [{ formula: 'ZnCl₂', atoms: { Zn: 1, Cl: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
              answer: [1, 2, 1, 1] },
            { id: 'neutralization', name: __alloT('stem.molecule.neutralization', 'Neutralization'), emoji: '⚖️', type: 'Double Replacement', difficulty: 1,
              desc: __alloT('stem.molecule.naoh_neutralizes_hcl_to_form_salt_and_', 'NaOH neutralizes HCl to form salt and water.'),
              left: [{ formula: 'NaOH', atoms: { Na: 1, O: 1, H: 1 } }, { formula: 'HCl', atoms: { H: 1, Cl: 1 } }],
              right: [{ formula: 'NaCl', atoms: { Na: 1, Cl: 1 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 1, 1, 1] },
            { id: 'aluminum_oxide', name: __alloT('stem.molecule.aluminum_oxidation', 'Aluminum Oxidation'), emoji: '✨', type: 'Synthesis', difficulty: 3,
              desc: __alloT('stem.molecule.aluminum_reacts_with_oxygen_to_form_al', 'Aluminum reacts with oxygen to form aluminum oxide.'),
              left: [{ formula: 'Al', atoms: { Al: 1 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'Al₂O₃', atoms: { Al: 2, O: 3 } }],
              answer: [4, 3, 2] },
            { id: 'photosynthesis', name: __alloT('stem.molecule.photosynthesis', 'Photosynthesis'), emoji: '🌿', type: 'Synthesis', difficulty: 3,
              desc: __alloT('stem.molecule.plants_convert_co_and_water_into_gluco', 'Plants convert CO₂ and water into glucose and oxygen.'),
              left: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              right: [{ formula: 'C₆H₁₂O₆', atoms: { C: 6, H: 12, O: 6 } }, { formula: 'O₂', atoms: { O: 2 } }],
              answer: [6, 6, 1, 6] }
          ];

          // ═══ Lab Challenges ═══
          const MOLECULE_CHALLENGES = [
            { id: 'first_discovery', emoji: '🧪', name: __alloT('stem.molecule.first_discovery', 'First Discovery'), desc: __alloT('stem.molecule.discover_any_compound', 'Discover any compound'), reward: 10,
              check: function() { return (d.discoveredCompounds || []).length >= 1; } },
            { id: 'chemist_10', emoji: '🧑‍🔬', name: __alloT('stem.molecule.lab_chemist', 'Lab Chemist'), desc: __alloT('stem.molecule.discover_10_compounds', 'Discover 10 compounds'), reward: 25,
              check: function() { return (d.discoveredCompounds || []).length >= 10; } },
            { id: 'master_chemist', emoji: '🏆', name: __alloT('stem.molecule.master_chemist', 'Master Chemist'), desc: __alloT('stem.molecule.discover_all_compounds', 'Discover all compounds'), reward: 50,
              check: function() { return (d.discoveredCompounds || []).length >= COMPOUNDS.length; } },
            { id: 'quiz_streak', emoji: '🔥', name: __alloT('stem.molecule.quiz_streak', 'Quiz Streak'), desc: __alloT('stem.molecule.5_correct_in_a_row', '5 correct in a row'), reward: 20,
              check: function() { return (d.elStreak || 0) >= 5; } },
            { id: 'balance_3', emoji: '⚖️', name: __alloT('stem.molecule.equation_balancer', 'Equation Balancer'), desc: __alloT('stem.molecule.balance_3_reactions', 'Balance 3 reactions'), reward: 30,
              check: function() { return reactionsBalanced >= 3; } }
          ];

          // ═══ Reaction helpers ═══
          const checkBalance = (reaction, coeffs) => {
            const leftAtoms = {};
            const rightAtoms = {};
            reaction.left.forEach((term, i) => {
              const c = coeffs[i] || 1;
              Object.entries(term.atoms).forEach(([el, n]) => { leftAtoms[el] = (leftAtoms[el] || 0) + c * n; });
            });
            reaction.right.forEach((term, i) => {
              const c = coeffs[reaction.left.length + i] || 1;
              Object.entries(term.atoms).forEach(([el, n]) => { rightAtoms[el] = (rightAtoms[el] || 0) + c * n; });
            });
            const allEls = [...new Set([...Object.keys(leftAtoms), ...Object.keys(rightAtoms)])];
            return { balanced: allEls.every(el => (leftAtoms[el] || 0) === (rightAtoms[el] || 0)), leftAtoms, rightAtoms };
          };

          const getAtomBalance = (reaction, coeffs) => {
            const result = checkBalance(reaction, coeffs);
            const allEls = [...new Set([...Object.keys(result.leftAtoms), ...Object.keys(result.rightAtoms)])];
            return allEls.map(el => ({
              element: el, left: result.leftAtoms[el] || 0, right: result.rightAtoms[el] || 0,
              balanced: (result.leftAtoms[el] || 0) === (result.rightAtoms[el] || 0)
            }));
          };

          const initReaction = (idx) => {
            const r = REACTIONS[idx];
            const total = r.left.length + r.right.length;
            updMulti({ currentReactionIdx: idx, reactionCoeffs: Array(total).fill(1), reactionResult: null });
          };

          const setCoeff = (termIdx, delta) => {
            const coeffs = [...(reactionCoeffs || [])];
            coeffs[termIdx] = Math.max(1, Math.min(9, (coeffs[termIdx] || 1) + delta));
            updMulti({ reactionCoeffs: coeffs, reactionResult: null });
          };

          const submitReaction = () => {
            const r = REACTIONS[currentReactionIdx];
            const result = checkBalance(r, reactionCoeffs || []);
            if (result.balanced) {
              const newBal = reactionsBalanced + 1;
              const rpGain = r.difficulty * 10;
              updMulti({ reactionResult: 'correct', reactionsBalanced: newBal, researchPoints: researchPoints + rpGain, totalRP: totalRP + rpGain });
              addToast('✅ Balanced! +' + rpGain + ' RP', 'success');
              if (typeof awardStemXP === 'function') awardStemXP('molecule', 20, 'Balanced: ' + r.name);
              if (typeof stemCelebrate === 'function') stemCelebrate();
              checkMoleculeChallenges();
            } else {
              updMulti({ reactionResult: 'incorrect' });
              addToast('❌ Not balanced yet - check the atom counts!', 'warning');
            }
          };

          // ═══ Challenge checker ═══
          const checkMoleculeChallenges = () => {
            let newCompleted = [...completedChallenges];
            let rpGained = 0;
            MOLECULE_CHALLENGES.forEach(ch => {
              if (!newCompleted.includes(ch.id) && ch.check()) {
                newCompleted.push(ch.id);
                rpGained += ch.reward;
                addToast('🏆 ' + ch.name + '! +' + ch.reward + ' RP', 'success');
                if (typeof stemCelebrate === 'function') stemCelebrate();
              }
            });
            if (rpGained > 0) updMulti({ completedChallenges: newCompleted, researchPoints: researchPoints + rpGained, totalRP: totalRP + rpGained });
          };

          const advanceTutorial = () => upd('tutorialStep', Math.min(tutorialStep + 1, 4));
          const dismissTutorial = () => updMulti({ tutorialDismissed: true, tutorialStep: 0 });
          const cycleBuildBondType = (index) => {
            const atoms = d.buildAtoms || [];
            const bonds = d.buildBonds || [];
            const bond = bonds[index];
            if (!bond || !atoms[bond[0]] || !atoms[bond[1]]) return;
            const nextType = ((bond[2] || 1) % 3) + 1;
            const names = ['single', 'double', 'triple'];
            upd('buildBonds', bonds.map((item, itemIndex) =>
              itemIndex === index ? [item[0], item[1], nextType] : item
            ));
            upd('buildCheckResult', null);
            if (typeof announceToSR === 'function') {
              announceToSR(
                'Changed the bond between ' + atoms[bond[0]].el + ' and ' + atoms[bond[1]].el +
                ' to a ' + names[nextType - 1] + ' bond.'
              );
            }
          };

          const removeBuildAtom = (index) => {
            const atoms = d.buildAtoms || [];
            const atom = atoms[index];
            if (!atom) return;
            const newAtoms = atoms.filter((_, atomIndex) => atomIndex !== index);
            const newBonds = (d.buildBonds || [])
              .filter(bond => bond[0] !== index && bond[1] !== index)
              .map(bond => [
                bond[0] > index ? bond[0] - 1 : bond[0],
                bond[1] > index ? bond[1] - 1 : bond[1],
                bond[2] || 1
              ]);
            upd('buildAtoms', newAtoms);
            upd('buildBonds', newBonds);
            if (d.buildBondFrom === index) upd('buildBondFrom', null);
            else if (d.buildBondFrom > index) upd('buildBondFrom', d.buildBondFrom - 1);
            if (!newAtoms.length) upd('buildBondMode', false);
            upd('buildCheckResult', null);
            if (typeof announceToSR === 'function') announceToSR('Removed atom ' + atom.el + '.');
          };

          const setMoleculeCameraView = (action) => {
            const camera = threeCameraRef.current;
            const controls = threeControlsRef.current;
            if (!camera || !controls) {
              if (typeof announceToSR === 'function') announceToSR('The 3D molecule view is still loading.');
              return;
            }
            const target = controls.target || { x: 0, y: 0, z: 0 };
            if (action === 'reset') {
              if (camera.up && camera.up.set) camera.up.set(0, 1, 0);
              controls.reset();
              controls.update();
            } else if (action === 'zoom-in' || action === 'zoom-out') {
              const dx = camera.position.x - target.x;
              const dy = camera.position.y - target.y;
              const dz = camera.position.z - target.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
              const factor = action === 'zoom-in' ? 0.75 : 1.25;
              const minDistance = controls.minDistance || 2;
              const maxDistance = controls.maxDistance || 50;
              const nextDistance = Math.max(minDistance, Math.min(maxDistance, distance * factor));
              camera.position.set(
                target.x + (dx / distance) * nextDistance,
                target.y + (dy / distance) * nextDistance,
                target.z + (dz / distance) * nextDistance
              );
              controls.update();
            } else {
              const positions = {
                front: [0, 0, 15],
                side: [15, 0, 0],
                top: [0, 15, 0]
              };
              const position = positions[action];
              if (!position) return;
              if (camera.up && camera.up.set) {
                if (action === 'top') camera.up.set(0, 0, -1);
                else camera.up.set(0, 1, 0);
              }
              camera.position.set(target.x + position[0], target.y + position[1], target.z + position[2]);
              if (camera.lookAt) camera.lookAt(target.x, target.y, target.z);
              controls.update();
            }
            if (typeof announceToSR === 'function') {
              const labels = {
                front: 'Front molecule view.',
                side: 'Side molecule view.',
                top: 'Top molecule view.',
                'zoom-in': 'Molecule view zoomed in.',
                'zoom-out': 'Molecule view zoomed out.',
                reset: 'Molecule camera reset.'
              };
              announceToSR(labels[action] || 'Molecule camera updated.');
            }
          };

          // ═══ Electron Configuration ═══
          const getElectronConfig = (atomicNum) => {
            const orbitals = ['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s','5f','6d','7p'];
            const maxE = [2,2,6,2,6,2,10,6,2,10,6,2,14,10,6,2,14,10,6];
            let rem = atomicNum;
            const parts = [];
            for (let i = 0; i < orbitals.length && rem > 0; i++) {
              const e = Math.min(rem, maxE[i]);
              parts.push(orbitals[i] + e);
              rem -= e;
            }
            return parts.join(' ');
          };

          const getValenceElectrons = (atomicNum) => {
            const sc = [2, 8, 8, 18, 18, 32, 32];
            let rem = atomicNum;
            for (let i = 0; i < sc.length && rem > 0; i++) {
              if (rem <= sc[i]) return rem;
              rem -= sc[i];
            }
            return rem;
          };

          const ELECTRONEGATIVITY = { H:2.20,Li:0.98,Be:1.57,B:2.04,C:2.55,N:3.04,O:3.44,F:3.98,Na:0.93,Mg:1.31,Al:1.61,Si:1.90,P:2.19,S:2.58,Cl:3.16,K:0.82,Ca:1.00,Fe:1.83,Cu:1.90,Zn:1.65,Br:2.96,Ag:1.93,I:2.66,Au:2.54,Pt:2.28,Ti:1.54,Cr:1.66,Mn:1.55,Ni:1.91,Co:1.88 };

          // ═══ Atomic Masses (g/mol) ═══
          const ATOMIC_MASS = {
            H:1.008,He:4.003,Li:6.941,Be:9.012,B:10.81,C:12.011,N:14.007,O:15.999,F:18.998,Ne:20.180,
            Na:22.990,Mg:24.305,Al:26.982,Si:28.086,P:30.974,S:32.065,Cl:35.453,Ar:39.948,
            K:39.098,Ca:40.078,Sc:44.956,Ti:47.867,V:50.942,Cr:51.996,Mn:54.938,Fe:55.845,
            Co:58.933,Ni:58.693,Cu:63.546,Zn:65.38,Ga:69.723,Ge:72.630,As:74.922,Se:78.971,
            Br:79.904,Kr:83.798,Rb:85.468,Sr:87.62,Y:88.906,Zr:91.224,Nb:92.906,Mo:95.95,
            Tc:98,Ru:101.07,Rh:102.91,Pd:106.42,Ag:107.87,Cd:112.41,In:114.82,Sn:118.71,
            Sb:121.76,Te:127.60,I:126.90,Xe:131.29,Cs:132.91,Ba:137.33,La:138.91,Ce:140.12,
            Pr:140.91,Nd:144.24,Pm:145,Sm:150.36,Eu:151.96,Gd:157.25,Tb:158.93,Dy:162.50,
            Ho:164.93,Er:167.26,Tm:168.93,Yb:173.05,Lu:174.97,Hf:178.49,Ta:180.95,W:183.84,
            Re:186.21,Os:190.23,Ir:192.22,Pt:195.08,Au:196.97,Hg:200.59,Tl:204.38,Pb:207.2,
            Bi:208.98,Po:209,At:210,Rn:222,Fr:223,Ra:226,Ac:227,Th:232.04,Pa:231.04,U:238.03,
            Np:237,Pu:244,Am:243,Cm:247,Bk:247,Cf:251,Es:252,Fm:257,Md:258,No:259,Lr:266,
            Rf:267,Db:268,Sg:269,Bh:270,Hs:277,Mt:278,Ds:281,Rg:282,Cn:285,Nh:286,Fl:289,
            Mc:290,Lv:293,Ts:294,Og:294
          };

          // ═══ Molar Mass Calculator ═══
          const calcMolarMass = (atomCounts) => {
            let total = 0;
            Object.entries(atomCounts).forEach(([el, count]) => {
              total += (ATOMIC_MASS[el] || 0) * count;
            });
            return Math.round(total * 100) / 100;
          };

          // ═══ AI Chemistry Tutor ═══
          const askChemTutor = (question) => {
            if (!question || aiLoading) return;
            updMulti({ aiLoading: true, aiAnswer: '' });
            const gradeDesc = gradeLevel === 'K-2' ? 'a kindergarten to 2nd grade student' :
              gradeLevel === '3-5' ? 'a 3rd to 5th grade student' :
              gradeLevel === '6-8' ? 'a middle school student' : 'a high school student';
            const prompt = 'You are a friendly chemistry tutor for ' + gradeDesc + '. ' +
              'Answer this chemistry question concisely (2-3 sentences max): ' + question;
            if (typeof callGemini === 'function') {
              callGemini(prompt).then(function(answer) {
                updMulti({ aiAnswer: answer || 'I couldn\'t answer that. Try a different question!', aiLoading: false });
              }).catch(function() {
                updMulti({ aiAnswer: 'Oops! Something went wrong. Try again.', aiLoading: false });
              });
            } else {
              updMulti({ aiAnswer: 'AI tutor is not available right now.', aiLoading: false });
            }
          };

          // ═══ TTS Helper ═══
          const speakText = (text) => {
            if (typeof callTTS === 'function' && text) callTTS(text);
          };

          // ═══ Sound Helpers ═══
          const playBeep = () => { if (typeof stemBeep === 'function') stemBeep(); };
          const playCelebrate = () => { if (typeof stemCelebrate === 'function') stemCelebrate(); };

          const discovered = d.discoveredCompounds || [];

          const addElement = (sym) => { const cur = { ...selectedEls }; cur[sym] = (cur[sym] || 0) + 1; upd('selectedElements', cur); };

          const removeElement = (sym) => { const cur = { ...selectedEls }; if (cur[sym] > 1) cur[sym]--; else delete cur[sym]; upd('selectedElements', cur); };

          const clearElements = () => upd('selectedElements', {});

          const tryCraft = () => {

            const match = COMPOUNDS.find(c => {

              const rKeys = Object.keys(c.recipe); const sKeys = Object.keys(selectedEls);

              if (rKeys.length !== sKeys.length) return false;

              return rKeys.every(k => selectedEls[k] === c.recipe[k]);

            });

            if (match) {

              const isNew = !discovered.includes(match.formula);

              upd('craftResult', { success: true, compound: match, isNew });

              if (isNew) upd('discoveredCompounds', [...discovered, match.formula]);
              playBeep();
              checkMoleculeChallenges();

            } else {

              upd('craftResult', { success: false });

            }

          };

          const catColors = { nonmetal: 'bg-blue-100 text-blue-700 border-blue-200', noble: 'bg-purple-100 text-purple-700 border-purple-200', alkali: 'bg-red-100 text-red-700 border-red-200', alkaline: 'bg-yellow-100 text-yellow-700 border-yellow-200', transition: 'bg-orange-100 text-orange-700 border-orange-200', metal: 'bg-slate-200 text-slate-700 border-slate-300', metalloid: 'bg-emerald-100 text-emerald-700 border-emerald-200', halogen: 'bg-teal-100 text-teal-700 border-teal-200', lanthanide: 'bg-violet-100 text-violet-700 border-violet-200', actinide: 'bg-pink-100 text-pink-700 border-pink-200' };

          // â”€â”€ Molecule Viewer presets â”€â”€

          const viewerPresets = [

            { name: __alloT('stem.molecule.h_o_water', 'H₂O (Water)'), atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H₂O' },

            { name: __alloT('stem.molecule.co_carbon_dioxide', 'CO₂ (Carbon Dioxide)'), atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO₂' },

            { name: __alloT('stem.molecule.ch_methane', 'CH₄ (Methane)'), atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH₄' },

            { name: __alloT('stem.molecule.nacl_table_salt', 'NaCl (Table Salt)'), atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },

            { name: __alloT('stem.molecule.nh_ammonia', 'NH₃ (Ammonia)'), atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'H', x: 140, y: 185, color: 'var(--allo-stem-text-soft, #94a3b8)' }, { el: 'H', x: 200, y: 210, color: 'var(--allo-stem-text-soft, #94a3b8)' }, { el: 'H', x: 260, y: 185, color: 'var(--allo-stem-text-soft, #94a3b8)' }], bonds: [[0, 1], [0, 2], [0, 3]], formula: 'NH₃' },

            { name: __alloT('stem.molecule.o_oxygen_gas', 'O₂ (Oxygen Gas)'), atoms: [{ el: 'O', x: 160, y: 150, color: '#ef4444' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0, 1]], formula: 'O₂' },

            { name: __alloT('stem.molecule.n_nitrogen_gas', 'N₂ (Nitrogen Gas)'), atoms: [{ el: 'N', x: 155, y: 150, color: '#3b82f6' }, { el: 'N', x: 245, y: 150, color: '#3b82f6' }], bonds: [[0, 1]], formula: 'N₂' },

            { name: __alloT('stem.molecule.h_o_hydrogen_peroxide', 'H₂O₂ (Hydrogen Peroxide)'), atoms: [{ el: 'O', x: 160, y: 130, color: '#ef4444' }, { el: 'O', x: 240, y: 130, color: '#ef4444' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 290, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [1, 3]], formula: 'H₂O₂' },

            { name: __alloT('stem.molecule.hcl_hydrochloric_acid', 'HCl (Hydrochloric Acid)'), atoms: [{ el: 'H', x: 160, y: 150, color: '#60a5fa' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'HCl' },

            { name: __alloT('stem.molecule.h_so_sulfuric_acid', 'H₂SO₄ (Sulfuric Acid)'), atoms: [{ el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 130, y: 100, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[3,5],[4,6]], formula: 'H₂SO₄' },

            { name: __alloT('stem.molecule.c_h_oh_ethanol', 'C₂H₅OH (Ethanol)'), atoms: [{ el: 'C', x: 150, y: 140, color: '#1e293b' }, { el: 'C', x: 230, y: 140, color: '#1e293b' }, { el: 'O', x: 300, y: 140, color: '#ef4444' }, { el: 'H', x: 320, y: 200, color: '#60a5fa' }, { el: 'H', x: 110, y: 90, color: '#60a5fa' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 90, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6]], formula: 'C₂H₅OH' },

            { name: __alloT('stem.molecule.caco_calcium_carbonate', 'CaCO₃ (Calcium Carbonate)'), atoms: [{ el: 'Ca', x: 100, y: 150, color: '#fbbf24' }, { el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 200, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }], bonds: [[0,4],[1,2],[1,3],[1,4]], formula: 'CaCO₃' },

            { name: __alloT('stem.molecule.c_h_o_glucose', 'C₆H₁₂O₆ (Glucose)'), atoms: [{ el: 'C', x: 120, y: 110, color: '#1e293b' }, { el: 'C', x: 180, y: 110, color: '#1e293b' }, { el: 'C', x: 240, y: 110, color: '#1e293b' }, { el: 'O', x: 120, y: 180, color: '#ef4444' }, { el: 'O', x: 180, y: 180, color: '#ef4444' }, { el: 'O', x: 240, y: 180, color: '#ef4444' }, { el: 'H', x: 300, y: 110, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[1,4],[2,5],[2,6]], formula: 'C₆H₁₂O₆' },

            { name: __alloT('stem.molecule.naoh_sodium_hydroxide', 'NaOH (Sodium Hydroxide)'), atoms: [{ el: 'Na', x: 130, y: 150, color: '#a855f7' }, { el: 'O', x: 210, y: 150, color: '#ef4444' }, { el: 'H', x: 280, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2]], formula: 'NaOH' },

            { name: __alloT('stem.molecule.fe_o_iron_oxide', 'Fe₂O₃ (Iron Oxide)'), atoms: [{ el: 'Fe', x: 140, y: 120, color: '#fb923c' }, { el: 'Fe', x: 260, y: 120, color: '#fb923c' }, { el: 'O', x: 120, y: 200, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'O', x: 280, y: 200, color: '#ef4444' }], bonds: [[0,2],[0,3],[1,3],[1,4]], formula: 'Fe₂O₃' },

            { name: __alloT('stem.molecule.o_ozone', 'O₃ (Ozone)'), atoms: [{ el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 200, y: 110, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'O₃' },

            { name: __alloT('stem.molecule.co_carbon_monoxide', 'CO (Carbon Monoxide)'), atoms: [{ el: 'C', x: 160, y: 150, color: '#1e293b' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'CO' },

            { name: __alloT('stem.molecule.no_nitrogen_dioxide', 'NO₂ (Nitrogen Dioxide)'), atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'O', x: 140, y: 180, color: '#ef4444' }, { el: 'O', x: 260, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'NO₂' },

            { name: __alloT('stem.molecule.so_sulfur_dioxide', 'SO₂ (Sulfur Dioxide)'), atoms: [{ el: 'S', x: 200, y: 120, color: '#facc15' }, { el: 'O', x: 130, y: 180, color: '#ef4444' }, { el: 'O', x: 270, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SO₂' },

            { name: __alloT('stem.molecule.n_o_nitrous_oxide', 'N₂O (Nitrous Oxide)'), atoms: [{ el: 'N', x: 140, y: 150, color: '#3b82f6' }, { el: 'N', x: 200, y: 150, color: '#3b82f6' }, { el: 'O', x: 260, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'N₂O' },

            { name: __alloT('stem.molecule.ch_oh_methanol', 'CH₃OH (Methanol)'), atoms: [{ el: 'C', x: 160, y: 140, color: '#1e293b' }, { el: 'O', x: 240, y: 140, color: '#ef4444' }, { el: 'H', x: 300, y: 140, color: '#60a5fa' }, { el: 'H', x: 120, y: 90, color: '#60a5fa' }, { el: 'H', x: 120, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 80, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5]], formula: 'CH₃OH' },

            { name: __alloT('stem.molecule.hno_nitric_acid', 'HNO₃ (Nitric Acid)'), atoms: [{ el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'H', x: 260, y: 200, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[3,4]], formula: 'HNO₃' },

            { name: __alloT('stem.molecule.h_po_phosphoric_acid', 'H₃PO₄ (Phosphoric Acid)'), atoms: [{ el: 'P', x: 200, y: 140, color: '#f97316' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 90, color: '#ef4444' }, { el: 'O', x: 270, y: 195, color: '#ef4444' }, { el: 'O', x: 130, y: 195, color: '#ef4444' }, { el: 'H', x: 310, y: 60, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[2,5],[3,6],[4,7]], formula: 'H₃PO₄' },

            { name: __alloT('stem.molecule.c_h_propane', 'C₃H₈ (Propane)'), atoms: [{ el: 'C', x: 130, y: 140, color: '#1e293b' }, { el: 'C', x: 200, y: 140, color: '#1e293b' }, { el: 'C', x: 270, y: 140, color: '#1e293b' }, { el: 'H', x: 100, y: 90, color: '#60a5fa' }, { el: 'H', x: 100, y: 190, color: '#60a5fa' }, { el: 'H', x: 130, y: 210, color: '#60a5fa' }, { el: 'H', x: 200, y: 90, color: '#60a5fa' }, { el: 'H', x: 200, y: 190, color: '#60a5fa' }, { el: 'H', x: 300, y: 90, color: '#60a5fa' }, { el: 'H', x: 300, y: 190, color: '#60a5fa' }, { el: 'H', x: 270, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5],[1,6],[1,7],[2,8],[2,9],[2,10]], formula: 'C₃H₈' },

            { name: __alloT('stem.molecule.c_h_butane', 'C₄H₁₀ (Butane)'), atoms: [{ el: 'C', x: 100, y: 140, color: '#1e293b' }, { el: 'C', x: 170, y: 140, color: '#1e293b' }, { el: 'C', x: 240, y: 140, color: '#1e293b' }, { el: 'C', x: 310, y: 140, color: '#1e293b' }, { el: 'H', x: 70, y: 100, color: '#60a5fa' }, { el: 'H', x: 70, y: 180, color: '#60a5fa' }, { el: 'H', x: 100, y: 210, color: '#60a5fa' }, { el: 'H', x: 170, y: 100, color: '#60a5fa' }, { el: 'H', x: 170, y: 195, color: '#60a5fa' }, { el: 'H', x: 240, y: 100, color: '#60a5fa' }, { el: 'H', x: 240, y: 195, color: '#60a5fa' }, { el: 'H', x: 340, y: 100, color: '#60a5fa' }, { el: 'H', x: 340, y: 180, color: '#60a5fa' }, { el: 'H', x: 310, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6],[1,7],[1,8],[2,9],[2,10],[3,11],[3,12],[3,13]], formula: 'C₄H₁₀' },

            { name: __alloT('stem.molecule.sio_silicon_dioxide', 'SiO₂ (Silicon Dioxide)'), atoms: [{ el: 'Si', x: 200, y: 150, color: '#34d399' }, { el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SiO₂' },

            { name: __alloT('stem.molecule.kcl_potassium_chloride', 'KCl (Potassium Chloride)'), atoms: [{ el: 'K', x: 160, y: 150, color: '#f87171' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0,1]], formula: 'KCl' },

            { name: __alloT('stem.molecule.mgo_magnesium_oxide', 'MgO (Magnesium Oxide)'), atoms: [{ el: 'Mg', x: 160, y: 150, color: '#fbbf24' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'MgO' },

            { name: __alloT('stem.molecule.nahco_baking_soda', 'NaHCO₃ (Baking Soda)'), atoms: [{ el: 'Na', x: 80, y: 150, color: '#a855f7' }, { el: 'O', x: 150, y: 150, color: '#ef4444' }, { el: 'C', x: 220, y: 150, color: '#1e293b' }, { el: 'O', x: 220, y: 80, color: '#ef4444' }, { el: 'O', x: 290, y: 150, color: '#ef4444' }, { el: 'H', x: 340, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[2,4],[4,5]], formula: 'NaHCO₃' },

            { name: __alloT('stem.molecule.ch_cooh_acetic_acid', 'CH₃COOH (Acetic Acid)'), atoms: [{ el: 'C', x: 140, y: 140, color: '#1e293b' }, { el: 'C', x: 220, y: 140, color: '#1e293b' }, { el: 'O', x: 220, y: 70, color: '#ef4444' }, { el: 'O', x: 290, y: 160, color: '#ef4444' }, { el: 'H', x: 340, y: 160, color: '#60a5fa' }, { el: 'H', x: 100, y: 95, color: '#60a5fa' }, { el: 'H', x: 100, y: 185, color: '#60a5fa' }, { el: 'H', x: 140, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[1,3],[3,4],[0,5],[0,6],[0,7]], formula: 'CH₃COOH' },

            { name: __alloT('stem.molecule.kno_potassium_nitrate', 'KNO₃ (Potassium Nitrate)'), atoms: [{ el: 'K', x: 100, y: 150, color: '#f87171' }, { el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 160, y: 190, color: '#ef4444' }, { el: 'O', x: 240, y: 190, color: '#ef4444' }, { el: 'O', x: 200, y: 70, color: '#ef4444' }], bonds: [[0,2],[1,2],[1,3],[1,4]], formula: 'KNO₃' },

            { name: __alloT('stem.molecule.cuso_copper_sulfate', 'CuSO₄ (Copper Sulfate)'), atoms: [{ el: 'Cu', x: 100, y: 150, color: '#fb923c' }, { el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 160, y: 80, color: '#ef4444' }, { el: 'O', x: 260, y: 90, color: '#ef4444' }, { el: 'O', x: 260, y: 200, color: '#ef4444' }, { el: 'O', x: 140, y: 200, color: '#ef4444' }], bonds: [[0,5],[1,2],[1,3],[1,4],[1,5]], formula: 'CuSO₄' },

          ];
          const moleculeTeachingModels = {
            H2O: {
              shape: 'Bent', angle: '104.5°', domains: '4 electron domains; 2 lone pairs on O',
              polarity: 'Polar', dipoles: 'O-H bond dipoles reinforce instead of cancelling.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[0, 0.8, 0], [-2.2, -0.9, 0], [2.2, -0.9, 0]]
            },
            CO2: {
              shape: 'Linear', angle: '180°', domains: '2 electron domains; 0 lone pairs on C',
              polarity: 'Nonpolar molecule', dipoles: 'Two polar C=O bond dipoles are equal and opposite, so they cancel.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[0, 0, 0], [-3.2, 0, 0], [3.2, 0, 0]]
            },
            CH4: {
              shape: 'Tetrahedral', angle: '109.5°', domains: '4 electron domains; 0 lone pairs on C',
              polarity: 'Nonpolar molecule', dipoles: 'The four C-H bond dipoles cancel through tetrahedral symmetry.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[0, 0, 0], [1.8, 1.8, 1.8], [-1.8, -1.8, 1.8], [-1.8, 1.8, -1.8], [1.8, -1.8, -1.8]]
            },
            NH3: {
              shape: 'Trigonal pyramidal', angle: 'about 107°', domains: '4 electron domains; 1 lone pair on N',
              polarity: 'Polar', dipoles: 'The N-H bond dipoles do not cancel; their net direction is toward N.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[0, 0.8, 0], [2.2, -1.1, 0], [-1.1, -1.1, 1.9], [-1.1, -1.1, -1.9]]
            },
            O2: {
              shape: 'Linear diatomic', angle: 'Not applicable', domains: 'Two identical O atoms',
              polarity: 'Nonpolar', dipoles: 'Identical atoms share electrons equally, so there is no permanent bond dipole.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[-1.8, 0, 0], [1.8, 0, 0]]
            },
            N2: {
              shape: 'Linear diatomic', angle: 'Not applicable', domains: 'Two identical N atoms',
              polarity: 'Nonpolar', dipoles: 'Identical atoms share electrons equally, so there is no permanent bond dipole.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[-1.8, 0, 0], [1.8, 0, 0]]
            },
            HCl: {
              shape: 'Linear diatomic', angle: 'Not applicable', domains: 'One H-Cl bond',
              polarity: 'Polar', dipoles: 'Electron density is drawn toward Cl, producing a permanent bond dipole.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[-1.8, 0, 0], [1.8, 0, 0]]
            },
            O3: {
              shape: 'Bent', angle: 'about 117°', domains: '3 electron domains; 1 lone pair on central O',
              polarity: 'Polar', dipoles: 'Its bent shape prevents the O-O bond contributions from cancelling.',
              modelNote: 'Resonance makes the two O-O bonds equivalent overall',
              coordinates: [[-2.3, -0.7, 0], [0, 0.8, 0], [2.3, -0.7, 0]]
            },
            NO2: {
              shape: 'Bent', angle: 'about 134°', domains: 'Odd-electron molecule; VSEPR is approximate',
              polarity: 'Polar', dipoles: 'Its bent geometry leaves a net molecular dipole.',
              modelNote: 'Gas-phase radical; one electron is unpaired',
              coordinates: [[0, 0.8, 0], [-2.5, -0.8, 0], [2.5, -0.8, 0]]
            },
            SO2: {
              shape: 'Bent', angle: 'about 119°', domains: '3 electron domains; 1 lone pair on S',
              polarity: 'Polar', dipoles: 'Its bent geometry prevents the S-O bond dipoles from cancelling.',
              modelNote: 'Gas-phase molecular geometry',
              coordinates: [[0, 0.8, 0], [-2.4, -0.7, 0], [2.4, -0.7, 0]]
            },
            NaCl: {
              shape: 'Ion pair shown', angle: 'Not applicable', domains: 'Na+ and Cl- ions',
              polarity: 'Ionic compound', dipoles: 'Bulk table salt is a repeating 3D ionic lattice, not separate NaCl molecules.',
              modelNote: 'Formula-unit representation',
              coordinates: [[-2, 0, 0], [2, 0, 0]]
            },
            KCl: {
              shape: 'Ion pair shown', angle: 'Not applicable', domains: 'K+ and Cl- ions',
              polarity: 'Ionic compound', dipoles: 'Bulk potassium chloride is a repeating 3D ionic lattice, not separate KCl molecules.',
              modelNote: 'Formula-unit representation',
              coordinates: [[-2, 0, 0], [2, 0, 0]]
            },
            MgO: {
              shape: 'Ion pair shown', angle: 'Not applicable', domains: 'Mg2+ and O2- ions',
              polarity: 'Ionic compound', dipoles: 'Bulk magnesium oxide is a repeating 3D ionic lattice, not separate MgO molecules.',
              modelNote: 'Formula-unit representation',
              coordinates: [[-2, 0, 0], [2, 0, 0]]
            }
          };

          const normalizeMoleculeFormula = function(formula) {
            var subscripts = { '₀':'0', '₁':'1', '₂':'2', '₃':'3', '₄':'4', '₅':'5', '₆':'6', '₇':'7', '₈':'8', '₉':'9' };
            return String(formula || '').replace(/[₀-₉]/g, function(char) { return subscripts[char]; });
          };

          const getMoleculeTeachingModel = function(formula) {
            return moleculeTeachingModels[normalizeMoleculeFormula(formula)] || null;
          };

          if (typeof window !== 'undefined') {
            window.__alloMoleculeGeometryPure = {
              normalizeFormula: normalizeMoleculeFormula,
              getTeachingModel: getMoleculeTeachingModel
            };
          }



            

return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" + (isDark ? " dark-mode" : ""), 'data-molecule-tool': 'true' },
            React.createElement("div", { "aria-live": "polite", "aria-atomic": "true", style: { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" } }, d._srMsg || ""),

            // Header

            React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "transition-colors p-1.5 hover:bg-slate-100 rounded-lg active:scale-[0.97]", 'aria-label': __alloT('stem.molecule.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800 tracking-tight" }, __alloT('stem.molecule.molecule_lab', "\uD83D\uDD2C Molecule Lab")),

              discovered.length > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full" }, "\uD83E\uDDEA " + discovered.length + "/" + COMPOUNDS.length + " discovered"),

              totalRP > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full" }, "⭐ " + totalRP + " RP")

            ),

            React.createElement("section", { "data-molecule-command": "true", "aria-label": "Molecule Lab command deck", className: "mb-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50 to-indigo-50 p-3 shadow-sm" },
              React.createElement("div", { className: "grid gap-3 lg:grid-cols-[minmax(230px,0.9fr)_minmax(0,1.7fr)]" },
                React.createElement("div", { className: "rounded-xl border border-cyan-200 bg-white/80 p-3" },
                  React.createElement("div", { className: "text-[11px] font-black uppercase text-cyan-700", style: { letterSpacing: 0 } }, "Molecular workbench"),
                  React.createElement("div", { className: "mt-1 text-xl font-black leading-tight text-slate-900" }, "Pick the chemistry lens first."),
                  React.createElement("p", { className: "mt-2 text-xs leading-relaxed text-slate-600" }, "The lab is easier when students choose a mode by task: inspect, combine, build, research, or balance."),
                  React.createElement("div", { className: "mt-3 grid grid-cols-3 gap-2" },
                    [
                      ['Compounds', discovered.length + '/' + COMPOUNDS.length, '#059669'],
                      ['Research points', totalRP, '#d97706'],
                      ['Formula', d.formula || '-', '#2563eb']
                    ].map(function(stat) {
                      return React.createElement("div", { key: stat[0], className: "rounded-lg border border-slate-200 bg-white p-2" },
                        React.createElement("div", { className: "text-[10px] font-bold uppercase text-slate-500", style: { letterSpacing: 0 } }, stat[0]),
                        React.createElement("div", { className: "mt-1 text-sm font-black", style: { color: stat[2], wordBreak: 'break-word' } }, stat[1])
                      );
                    })
                  )
                ),
                React.createElement("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" },
                  [
                    { id: 'viewer', title: 'View', body: '3D model and formula readout.', tone: '#0f766e' },
                    { id: 'realStructures', title: 'Real Structures', body: 'Open Mol* protein and DNA viewer.', tone: '#0891b2', action: function() { if (typeof setLabToolData === 'function') setLabToolData(function(prev) { var cur = Object.assign({}, (prev && prev._moleculeShelf) || {}); cur.returnTool = 'molecule'; var next = Object.assign({}, prev); next._moleculeShelf = cur; return next; }); if (typeof setStemLabTab === 'function') setStemLabTab('explore'); if (typeof setStemLabTool === 'function') { setStemLabTool('moleculeShelf'); if (typeof announceToSR === 'function') announceToSR('Opening Molecule Shelf real structures viewer.'); } else if (typeof addToast === 'function') addToast('Real structures viewer is not available right now.', 'info'); } },
                    { id: 'creator', title: 'Create', body: 'Combine atoms and discover compounds.', tone: '#9333ea' },
                    { id: 'build', title: 'Build', body: 'Drag atoms and sketch bonds.', tone: '#d97706' },
                    { id: 'table', title: 'Research', body: 'Use the periodic table as reference.', tone: '#2563eb' },
                    { id: 'reactions', title: 'React', body: 'Balance equations and products.', tone: '#dc2626' }
                  ].map(function(route) {
                    var active = mode === route.id;
                    var launchesShelf = typeof route.action === 'function';
                    return React.createElement("button", { key: route.id,
                      onClick: function() { if (launchesShelf) { route.action(); return; } upd('moleculeMode', route.id); },
                      className: "min-h-[104px] rounded-xl border bg-white p-3 text-left transition-all hover:shadow-md active:scale-[0.98]",
                      style: { borderColor: active ? route.tone : '#cbd5e1', boxShadow: active ? '0 0 0 2px ' + route.tone + '33' : 'none' } },
                      React.createElement("div", { className: "text-sm font-black", style: { color: route.tone } }, route.title),
                      React.createElement("div", { className: "mt-1 text-[11px] leading-relaxed text-slate-600" }, route.body),
                      React.createElement("div", { className: "mt-2 text-[11px] font-black", style: { color: route.tone } }, launchesShelf ? "Launch" : (active ? "Open now" : "Open"))
                    );
                  })
                )
              )
            ),

            // Mode tabs

            React.createElement("div", { className: "flex flex-wrap gap-1 mb-4 bg-slate-100 p-1 rounded-xl" },

              [['viewer', '\uD83D\uDD2C Viewer'], ['creator', '\u2697\uFE0F Compound Creator'], ['build', '\uD83E\uDDF1 Build'], ['table', '\uD83D\uDDC2\uFE0F Periodic Table'], ['reactions', '⚗️ Reactions']].map(([m, label]) =>

                React.createElement("button", { "aria-label": "Switch to " + label + " mode", key: m, onClick: () => { upd('moleculeMode', m); if (typeof canvasNarrate === 'function') { canvasNarrate('molecule', 'mode_switch', { first: 'Switched to ' + label + ' mode.', repeat: label + ' mode.', terse: label + '.' }, { debounce: 500 }); } }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 " + (mode === m ? 'bg-white text-slate-800 shadow-sm' : 'transition-colors text-slate-600 hover:bg-white/70 hover:text-slate-800 active:scale-[0.97]') }, label)

              )

            ),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                viewer:    { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '\uD83D\uDD2C', title: __alloT('stem.molecule.viewer_ball_and_stick_space_filling', 'Viewer - ball-and-stick + space-filling'),         hint: __alloT('stem.molecule.each_atom_s_color_follows_cpk_carbon_b', 'Each atom\u2019s color follows CPK (carbon black, oxygen red, nitrogen blue, hydrogen white). Bond lengths are not arbitrary - covalent radii from quantum chemistry tables, ~70-150 picometers.') },
                creator:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\u2697',         title: __alloT('stem.molecule.compound_creator_valence_bonding_rules', 'Compound Creator - valence + bonding rules'),     hint: __alloT('stem.molecule.octet_rule_most_atoms_want_8_valence_e', 'Octet rule: most atoms want 8 valence electrons. C bonds 4 ways, N 3, O 2, H 1. Lewis dot structures (1916) still drive 90% of intro chemistry intuition.') },
                build:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83E\uDDF1', title: __alloT('stem.molecule.build_drag_atoms_draw_bonds', 'Build - drag atoms, draw bonds'),                  hint: __alloT('stem.molecule.single_double_triple_bonds_1_2_3_share', 'Single, double, triple bonds = 1, 2, 3 shared electron pairs. Triple bonds are shorter and stronger (N\u2261N at 110pm vs N-N at 145pm). Geometry follows VSEPR: pairs repel.') },
                table:     { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDDC2', title: __alloT('stem.molecule.periodic_table_mendeleev_s_1869_grid', 'Periodic Table - Mendeleev\u2019s 1869 grid'),     hint: __alloT('stem.molecule.periods_rows_electron_shells_groups_co', 'Periods (rows) = electron shells; groups (columns) = valence electrons. Mendeleev predicted gallium and germanium\u2019s properties before discovery - the table predicted reality.') },
                reactions: { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\u2697',         title: __alloT('stem.molecule.reactions_reactants_products_h', 'Reactions - reactants \u2192 products + ΔH'),      hint: __alloT('stem.molecule.conservation_of_mass_lavoisier_1789_at', 'Conservation of mass (Lavoisier 1789): atoms in = atoms out. Balance the equation, predict the product, classify (synthesis / decomposition / single-replace / double-replace / combustion).') }
              };
              var meta = MODE_META[mode] || MODE_META.viewer;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // â”€â”€ Viewer Mode â”€â”€

            mode === 'viewer' && React.createElement("div", null,

              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" }, viewerPresets.map(p => React.createElement("button", { "aria-label": "View molecule: " + p.name, key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({ ...a }))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: "px-2 py-1 rounded-lg text-xs font-bold " + (d.formula === p.formula ? 'bg-slate-700 text-white' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.97]') }, p.name))),

              threeLoaded
                ? React.createElement(React.Fragment, null,
                  React.createElement("div", { className: "relative w-full rounded-xl overflow-hidden border", style: { height: "320px", background: "radial-gradient(circle at 50% 42%, rgba(30,64,175,0.34), rgba(15,23,42,0.72) 38%, #020617 78%)", borderColor: "rgba(30,41,59,0.95)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -42px 80px rgba(2,6,23,0.72), 0 18px 38px rgba(15,23,42,0.22)" } },
                    React.createElement("canvas", {
                      ref: webglCanvasRef,
                      role: "img",
                      "aria-label": "3D molecular model of " + (d.formula || "the selected molecule") + ". Camera controls follow with front, side, top, zoom, and reset options.",
                      className: "w-full h-full",
                      style: { display: 'block', background: 'transparent' }
                    }),
                    React.createElement("div", {
                      "aria-hidden": "true",
                      style: { position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 46%, transparent 34%, rgba(2,6,23,0.5) 100%), linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)", backgroundSize: "100% 100%, 28px 28px, 28px 28px", mixBlendMode: "screen", opacity: 0.68 }
                    }),
                    React.createElement("div", {
                      style: { position: "absolute", top: 12, left: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 9px", borderRadius: 10, background: "rgba(2,6,23,0.68)", color: "#dbeafe", border: "1px solid rgba(147,197,253,0.22)", boxShadow: "0 10px 24px rgba(2,6,23,0.35)", backdropFilter: "blur(10px)", fontSize: 11, fontWeight: 800, letterSpacing: 0 }
                    },
                      React.createElement("span", { style: { color: "#67e8f9" } }, "3D molecular model"),
                      React.createElement("span", { style: { color: "#94a3b8", fontWeight: 700 } }, d.formula || "No formula")
                    ),
                    xrSupported && React.createElement("button", {
                      onClick: function() { if (vrRef.current && vrRef.current.enterVR) vrRef.current.enterVR(); },
                      className: "absolute bottom-3 left-3 px-2.5 py-1.5 rounded-md text-[10px] font-bold shadow border backdrop-blur-sm transition-colors active:scale-[0.97]",
                      style: { background: "#4f46e5", color: "#fff", borderColor: "rgba(79,70,229,0.8)" },
                      'aria-label': __alloT('vr.enter_title', 'Enter VR (needs a headset)'),
                      title: __alloT('vr.enter_title', 'Enter VR (needs a headset)')
                    }, '🥽 ' + __alloT('vr.enter', 'VR'))
                  ),
                  React.createElement('div', {
                    role: 'group',
                    'aria-label': __alloT('stem.molecule.camera_controls', '3D molecule camera controls. Single-click alternatives to dragging the model.'),
                    className: 'mt-2 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 p-2'
                  },
                    React.createElement('span', { className: 'px-1 text-xs font-black text-slate-800' },
                      __alloT('stem.molecule.camera', 'Camera')),
                    [
                      { id: 'front', label: __alloT('stem.molecule.front_view', 'Front view'), text: __alloT('stem.molecule.front', 'Front') },
                      { id: 'side', label: __alloT('stem.molecule.side_view', 'Side view'), text: __alloT('stem.molecule.side', 'Side') },
                      { id: 'top', label: __alloT('stem.molecule.top_view', 'Top view'), text: __alloT('stem.molecule.top', 'Top') },
                      { id: 'zoom-in', label: __alloT('stem.molecule.zoom_in', 'Zoom in'), text: '+' },
                      { id: 'zoom-out', label: __alloT('stem.molecule.zoom_out', 'Zoom out'), text: '\u2212' },
                      { id: 'reset', label: __alloT('stem.molecule.reset_view', 'Reset view'), text: __alloT('stem.molecule.reset', 'Reset') }
                    ].map(control => React.createElement('button', {
                      key: control.id,
                      type: 'button',
                      'data-molecule-camera-control': control.id,
                      'aria-label': control.label,
                      title: control.label,
                      onClick: () => setMoleculeCameraView(control.id),
                      className: 'min-h-11 min-w-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-[0.97]'
                    }, control.text))
                  )
                )
                : React.createElement("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "2D molecule structure with " + (d.atoms || []).length + " atom" + ((d.atoms || []).length === 1 ? "" : "s") + ". Drag an atom to reposition it; use the controls to add atoms and bonds.", className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" }, onMouseMove: e => { if (d.dragging !== null && d.dragging !== undefined) { const svg = e.currentTarget; const rect = svg.getBoundingClientRect(); const nx = (e.clientX - rect.left) / rect.width * W; const ny = (e.clientY - rect.top) / rect.height * H; const na = d.atoms.map((a, i) => i === d.dragging ? { ...a, x: Math.round(nx), y: Math.round(ny) } : a); upd("atoms", na); } }, onMouseUp: () => upd("dragging", null), onMouseLeave: () => upd("dragging", null) },
                    (d.bonds || []).map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", { key: 'b' + i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round" }) : null),
                    (d.atoms || []).map((a, i) => React.createElement("g", { key: i },
                      // A11y: role + tabIndex + aria-label + onKeyDown so keyboard /
                      // switch users (and Chromebook GPU-blacklist users on the
                      // WebGL-off 2D fallback) can move atoms with arrow keys.
                      // Drag still works for pointer users.
                      React.createElement("circle", {
                        cx: a.x, cy: a.y, r: 24,
                        fill: a.color || '#94a3b8', stroke: '#fff', strokeWidth: 3,
                        style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' },
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': (a.el || 'atom') + ' at x ' + Math.round(a.x) + ', y ' + Math.round(a.y) + '. Arrow keys to move.',
                        onMouseDown: e => { e.preventDefault(); upd('dragging', i); },
                        onKeyDown: e => {
                          var dx = 0, dy = 0;
                          if (e.key === 'ArrowLeft') dx = -10;
                          else if (e.key === 'ArrowRight') dx = 10;
                          else if (e.key === 'ArrowUp') dy = -10;
                          else if (e.key === 'ArrowDown') dy = 10;
                          else return;
                          e.preventDefault();
                          var na = d.atoms.map((at, ai) => ai === i ? { ...at, x: Math.round(at.x + dx), y: Math.round(at.y + dy) } : at);
                          upd('atoms', na);
                        }
                      }),
                      React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none' } }, a.el)
                    ))
                  ),

              React.createElement("div", { className: "mt-2 text-center" },
                React.createElement("span", { className: "text-sm font-bold text-slate-600" }, "Formula: "),
                React.createElement("span", { className: "text-lg font-bold text-slate-800 tracking-tight" }, d.formula || '-'),
                d.formula && d.atoms && React.createElement("span", { className: "ml-2 text-xs text-slate-600" },
                  calcMolarMass((() => { const c = {}; (d.atoms || []).forEach(a => { c[a.el] = (c[a.el] || 0) + 1; }); return c; })()) + " g/mol"
                )
              ),

              (() => {
                const teaching = getMoleculeTeachingModel(d.formula);
                return teaching && React.createElement("section", {
                  className: "mt-3 border border-cyan-200 bg-cyan-50/70 p-3 text-left",
                  style: { borderRadius: 8 },
                  "aria-labelledby": "molecule-shape-polarity-title"
                },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                    React.createElement("h4", { id: "molecule-shape-polarity-title", className: "text-sm font-black text-slate-800" }, "Shape & Polarity Lens"),
                    React.createElement("span", { className: "px-2 py-1 text-[11px] font-bold bg-white border border-cyan-200 text-cyan-800", style: { borderRadius: 6 } }, teaching.modelNote)
                  ),
                  React.createElement("dl", { className: "mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2" },
                    React.createElement("div", { className: "bg-white border border-slate-200 p-2", style: { borderRadius: 6 } },
                      React.createElement("dt", { className: "text-[11px] font-bold uppercase text-slate-500" }, "Molecular shape"),
                      React.createElement("dd", { className: "mt-1 text-sm font-black text-slate-800" }, teaching.shape),
                      React.createElement("dd", { className: "text-xs text-slate-600" }, "Bond angle: " + teaching.angle)
                    ),
                    React.createElement("div", { className: "bg-white border border-slate-200 p-2", style: { borderRadius: 6 } },
                      React.createElement("dt", { className: "text-[11px] font-bold uppercase text-slate-500" }, "Electron geometry evidence"),
                      React.createElement("dd", { className: "mt-1 text-xs font-semibold text-slate-700" }, teaching.domains)
                    ),
                    React.createElement("div", { className: "bg-white border border-slate-200 p-2", style: { borderRadius: 6 } },
                      React.createElement("dt", { className: "text-[11px] font-bold uppercase text-slate-500" }, "Whole-particle polarity"),
                      React.createElement("dd", { className: "mt-1 text-sm font-black text-slate-800" }, teaching.polarity)
                    )
                  ),
                  React.createElement("p", { className: "mt-2 text-xs leading-relaxed text-slate-700" },
                    React.createElement("strong", null, "Why: "), teaching.dipoles
                  ),
                  React.createElement("p", { className: "mt-2 text-[11px] leading-relaxed text-slate-600" },
                    "Ball-and-stick models show connectivity and approximate geometry. Atom sizes and bond lengths are not on one common scale, and electron density is continuous."
                  )
                );
              })()

            ),

            // â”€â”€ Compound Creator Mode â”€â”€

            mode === 'creator' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-3" }, __alloT('stem.molecule.select_elements_to_craft_compounds_dis', "Select elements to craft compounds - discover real-world chemistry by combining atoms!")),

              // Element selector grid (common elements)

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },

                ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I', 'Au'].map(sym => {

                  const el = getEl(sym);

                  return React.createElement("button", { "aria-label": __alloT('stem.molecule.add_element', "Add Element"), key: sym, onClick: () => addElement(sym), className: "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs border-2 transition-all hover:scale-110 hover:shadow-md active:scale-95 " + (catColors[el?.cat] || 'bg-slate-100 text-slate-600 border-slate-200'), title: el?.name || sym },

                    React.createElement("span", { className: "text-sm font-black" }, sym),

                    React.createElement("span", { className: "text-[11px] opacity-70" }, el?.n || '')

                  );

                })

              ),

              // Selected elements display

              React.createElement("div", { className: "bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-4 min-h-[80px] flex items-center justify-center gap-2 flex-wrap" },

                Object.keys(selectedEls).length === 0

                  ? React.createElement("p", { className: "text-slate-600 text-sm italic" }, __alloT('stem.molecule.tap_elements_above_to_add_them', "Tap elements above to add them..."))

                  : Object.entries(selectedEls).map(([sym, count]) => {

                    const el = getEl(sym);

                    return React.createElement("div", { key: sym, className: "flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border" },

                      React.createElement("span", { className: "w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm", style: { backgroundColor: el?.c || '#94a3b8' } }, sym),

                      React.createElement("span", { className: "text-lg font-black text-slate-700 tracking-tight" }, "\u00D7" + count),

                      React.createElement("button", { "aria-label": __alloT('stem.molecule.remove_element', "Remove Element"), onClick: () => removeElement(sym), className: "transition-colors ml-1 w-8 h-8 rounded-full bg-red-100 text-red-500 text-sm font-bold hover:bg-red-200 flex items-center justify-center active:scale-[0.97]" }, "\u2212")

                    );

                  })

              ),

              // Action buttons

              React.createElement("div", { className: "flex gap-2 mb-4" },

                React.createElement("button", { onClick: tryCraft, disabled: Object.keys(selectedEls).length === 0, className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" }, __alloT('stem.molecule.combine', "\u2697\uFE0F Combine!")),

                React.createElement("button", { "aria-label": __alloT('stem.molecule.clear', "Clear"), onClick: clearElements, className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors active:scale-[0.97]" }, __alloT('stem.molecule.clear_2', "\uD83D\uDD04 Clear"))

              ),

              // Craft result

              d.craftResult && (d.craftResult.success

                ? React.createElement("div", { className: "bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center animate-in zoom-in" },

                  React.createElement("p", { className: "text-3xl mb-1" }, d.craftResult.compound.emoji),

                  React.createElement("p", { className: "text-lg font-black text-emerald-700 tracking-tight" }, (d.craftResult.isNew ? '\uD83C\uDF89 NEW! ' : '\u2705 ') + d.craftResult.compound.name),

                  React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.craftResult.compound.formula),

                  React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, d.craftResult.compound.desc),

                )

                : React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center" },

                  React.createElement("p", { className: "text-sm font-bold text-amber-700" }, __alloT('stem.molecule.no_known_compound_matches_this_combina', "\uD83E\uDD14 No known compound matches this combination. Try different elements!")))

              ),

              // Discovery log

              discovered.length > 0 && React.createElement("div", { className: "mt-4 bg-slate-50 rounded-xl p-3 border" },

                React.createElement("p", { className: "text-xs font-bold text-slate-600 mb-2" }, "\uD83D\uDCDA Discovery Log (" + discovered.length + "/" + COMPOUNDS.length + ")"),

                React.createElement("div", { className: "flex flex-wrap gap-1" },

                  COMPOUNDS.map(c => React.createElement("span", { key: c.formula, className: "px-2 py-0.5 rounded text-xs font-bold " + (discovered.includes(c.formula) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600') }, discovered.includes(c.formula) ? c.emoji + ' ' + c.name : '\uD83D\uDD12 ???'))

                )

              )

            ),

            // â”€â”€ Build Mode â”€â”€

            mode === 'build' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, __alloT('stem.molecule.drag_atoms_onto_the_canvas_and_draw_bo', "Drag atoms or use arrow keys to move them. Select two atoms to connect them; keyboard bond and remove controls follow the workspace.")),

              // Atom palette

              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" },

                [

                  { sym: 'H', color: '#60a5fa', label: __alloT('stem.molecule.hydrogen', 'Hydrogen') },

                  { sym: 'C', color: '#1e293b', label: __alloT('stem.molecule.carbon', 'Carbon') },

                  { sym: 'N', color: '#3b82f6', label: __alloT('stem.molecule.nitrogen', 'Nitrogen') },

                  { sym: 'O', color: '#ef4444', label: __alloT('stem.molecule.oxygen', 'Oxygen') },

                  { sym: 'S', color: '#facc15', label: __alloT('stem.molecule.sulfur', 'Sulfur') },

                  { sym: 'P', color: '#f97316', label: __alloT('stem.molecule.phosphorus', 'Phosphorus') },

                  { sym: 'Cl', color: '#22c55e', label: __alloT('stem.molecule.chlorine', 'Chlorine') },

                  { sym: 'Na', color: '#a855f7', label: __alloT('stem.molecule.sodium', 'Sodium') },

                  { sym: 'Ca', color: '#fbbf24', label: __alloT('stem.molecule.calcium', 'Calcium') },

                  { sym: 'Fe', color: '#fb923c', label: __alloT('stem.molecule.iron', 'Iron') },

                  { sym: 'K', color: '#f87171', label: __alloT('stem.molecule.potassium', 'Potassium') },

                  { sym: 'Si', color: '#34d399', label: __alloT('stem.molecule.silicon', 'Silicon') },

                ].map(a => React.createElement("button", { "aria-label": "Add " + a.label + " atom to canvas",

                  key: a.sym,

                  onClick: () => {

                    const ba = d.buildAtoms || [];

                    // Place new atom at a random position in the canvas

                    const nx = 80 + Math.random() * (W - 160);

                    const ny = 60 + Math.random() * (H - 120);

                    upd('buildAtoms', [...ba, { el: a.sym, x: Math.round(nx), y: Math.round(ny), color: a.color }]);

                    upd('buildCheckResult', null);

                  },

                  className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition-all hover:scale-105 hover:shadow-md active:scale-95",

                  style: { borderColor: a.color, color: a.color, backgroundColor: a.color + '18' },

                  title: 'Add ' + a.label

                }, a.sym))

              ),

              // Canvas workspace

              React.createElement("svg", {
                role: "group",
                "aria-label": "Molecule builder workspace with " + (d.buildAtoms || []).length + " atoms and " + (d.buildBonds || []).length + " bonds. Tab to atoms and use arrow keys to move them. Bond and remove controls follow the workspace.",
                viewBox: "0 0 " + W + " " + H,

                className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-300 cursor-crosshair",

                style: { maxHeight: "320px", touchAction: 'none' },

                onMouseMove: e => {

                  if (d.buildDragging !== null && d.buildDragging !== undefined) {

                    const svg = e.currentTarget;

                    const rect = svg.getBoundingClientRect();

                    const nx = (e.clientX - rect.left) / rect.width * W;

                    const ny = (e.clientY - rect.top) / rect.height * H;

                    const na = (d.buildAtoms || []).map((a, i) => i === d.buildDragging ? { ...a, x: Math.max(20, Math.min(W - 20, Math.round(nx))), y: Math.max(20, Math.min(H - 20, Math.round(ny))) } : a);

                    upd('buildAtoms', na);

                  }

                },

                onMouseUp: () => upd('buildDragging', null),

                onMouseLeave: () => upd('buildDragging', null),

                // Touch parity for atom repositioning on the pilot's touchscreen
                // Chromebooks — mirrors onMouseMove with the single-touch point.
                onTouchMove: e => {

                  if ((d.buildDragging !== null && d.buildDragging !== undefined) && e.touches && e.touches[0]) {

                    e.preventDefault();

                    const svg = e.currentTarget;

                    const rect = svg.getBoundingClientRect();

                    const nx = (e.touches[0].clientX - rect.left) / rect.width * W;

                    const ny = (e.touches[0].clientY - rect.top) / rect.height * H;

                    const na = (d.buildAtoms || []).map((a, i) => i === d.buildDragging ? { ...a, x: Math.max(20, Math.min(W - 20, Math.round(nx))), y: Math.max(20, Math.min(H - 20, Math.round(ny))) } : a);

                    upd('buildAtoms', na);

                  }

                },

                onTouchEnd: () => upd('buildDragging', null),

                onTouchCancel: () => upd('buildDragging', null)

              },

                // Grid dots for visual guide

                Array.from({ length: 10 }, (_, r) => Array.from({ length: 13 }, (_, c) => React.createElement("circle", { key: 'g' + r + '-' + c, cx: 30 + c * 28, cy: 25 + r * 28, r: 1, fill: '#e2e8f0' }))).flat(),

                // Draw bonds

                (d.buildBonds || []).map((b, i) => {

                  const atoms = d.buildAtoms || [];

                  const a1 = atoms[b[0]], a2 = atoms[b[1]];

                  if (!a1 || !a2) return null;

                  const bondType = b[2] || 1; // 1=single, 2=double, 3=triple

                  const dx = a2.x - a1.x, dy = a2.y - a1.y;

                  const len = Math.sqrt(dx * dx + dy * dy) || 1;

                  const px = -dy / len, py = dx / len; // perpendicular

                  const bondLines = [];

                  if (bondType === 1) {

                    bondLines.push(React.createElement("line", { key: 'bl' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: "#64748b", strokeWidth: 3.5, strokeLinecap: "round" }));

                  } else if (bondType === 2) {

                    const off = 3;

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'a', x1: a1.x + px * off, y1: a1.y + py * off, x2: a2.x + px * off, y2: a2.y + py * off, stroke: "#64748b", strokeWidth: 2.5, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'b', x1: a1.x - px * off, y1: a1.y - py * off, x2: a2.x - px * off, y2: a2.y - py * off, stroke: "#64748b", strokeWidth: 2.5, strokeLinecap: "round" }));

                  } else {

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'a', x1: a1.x + px * 5, y1: a1.y + py * 5, x2: a2.x + px * 5, y2: a2.y + py * 5, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'b', x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'c', x1: a1.x - px * 5, y1: a1.y - py * 5, x2: a2.x - px * 5, y2: a2.y - py * 5, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                  }

                  // Clickable hit area to cycle bond type

                  bondLines.push(React.createElement("line", {

                    key: 'bh' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y,

                    stroke: "transparent", strokeWidth: 12, style: { cursor: 'pointer' },

                    onClick: (e) => {

                      e.stopPropagation();

                      cycleBuildBondType(i);

                    }

                  }));

                  return React.createElement("g", { key: 'bg' + i }, ...bondLines);

                }),

                // Draw atoms

                (d.buildAtoms || []).map((a, i) => {

                  const isSelected = d.buildBondFrom === i;
                  const isFocused = d.buildFocusedAtom === i;

                  return React.createElement("g", { key: 'ba' + i },

                    // Selection ring

                    isSelected && React.createElement("circle", { cx: a.x, cy: a.y, r: 28, fill: "none", stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "4 2", className: "animate-spin motion-reduce:animate-none" }),

                    // Atom circle

                    // A11y: role + tabIndex + aria-label + onKeyDown so keyboard /
                    // switch users can move atoms (arrow keys) and create bonds
                    // (Enter / Space, same logic as onMouseDown below). The 2D
                    // build view is the WebGL-off fallback used on Chromebook
                    // GPU-blacklists, so keyboard access here is load-bearing for
                    // SpEd assistive-tech users.
                    React.createElement("circle", {

                      cx: a.x, cy: a.y, r: 22, fill: a.color || '#94a3b8', stroke: isFocused ? '#0f172a' : (isSelected ? '#3b82f6' : '#fff'), strokeWidth: isFocused ? 5 : (isSelected ? 3 : 2.5),

                      style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' },

                      role: 'button',
                      tabIndex: 0,
                      'aria-label': (a.el || 'atom') + ' at x ' + Math.round(a.x) + ', y ' + Math.round(a.y) +
                        '. Arrow keys to move.' +
                        ((d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined))
                          ? ' Enter or Space to select for bond.'
                          : ' Bond and remove controls follow the workspace.'),
                      'aria-pressed': isSelected ? 'true' : 'false',
                      onFocus: () => upd('buildFocusedAtom', i),
                      onBlur: () => { if (d.buildFocusedAtom === i) upd('buildFocusedAtom', null); },
                      onKeyDown: e => {
                        var dx = 0, dy = 0;
                        if (e.key === 'ArrowLeft') dx = -10;
                        else if (e.key === 'ArrowRight') dx = 10;
                        else if (e.key === 'ArrowUp') dy = -10;
                        else if (e.key === 'ArrowDown') dy = 10;
                        else if (e.key === 'Enter' || e.key === ' ') {
                          // Mirror the onMouseDown bond-mode + select behavior below.
                          e.preventDefault();
                          if (d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) {
                            if (d.buildBondFrom === null || d.buildBondFrom === undefined) {
                              upd('buildBondFrom', i);
                            } else if (d.buildBondFrom === i) {
                              upd('buildBondFrom', null);
                            } else {
                              const existingBonds = d.buildBonds || [];
                              const already = existingBonds.find(b => (b[0] === d.buildBondFrom && b[1] === i) || (b[0] === i && b[1] === d.buildBondFrom));
                              if (!already) {
                                upd('buildBonds', [...existingBonds, [d.buildBondFrom, i, 1]]);
                                if (typeof announceToSR === 'function') announceToSR("Connected atom " + d.buildAtoms[d.buildBondFrom].el + " to " + a.el);
                              }
                              upd('buildBondFrom', null);
                              upd('buildCheckResult', null);
                            }
                          }
                          return;
                        } else {
                          return;
                        }
                        e.preventDefault();
                        var W2 = W, H2 = H;
                        var na = (d.buildAtoms || []).map((at, ai) => ai === i ? { ...at, x: Math.max(20, Math.min(W2 - 20, Math.round(at.x + dx))), y: Math.max(20, Math.min(H2 - 20, Math.round(at.y + dy))) } : at);
                        upd('buildAtoms', na);
                      },

                      onMouseDown: e => {

                        e.preventDefault();

                        e.stopPropagation();

                        // If in bond-drawing mode (either buildBondMode or selected from bottom)

                        if (d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) {
                          if (d.buildBondFrom === null || d.buildBondFrom === undefined) {
                            upd('buildBondFrom', i);
                          } else if (d.buildBondFrom === i) {
                            upd('buildBondFrom', null);
                          } else {
                            // Create bond
                            const existingBonds = d.buildBonds || [];
                            const already = existingBonds.find(b => (b[0] === d.buildBondFrom && b[1] === i) || (b[0] === i && b[1] === d.buildBondFrom));
                            if (!already) {
                              upd('buildBonds', [...existingBonds, [d.buildBondFrom, i, 1]]);
                              if (typeof announceToSR === 'function') announceToSR("Connected atom " + d.buildAtoms[d.buildBondFrom].el + " to " + a.el);
                            }
                            upd('buildBondFrom', null);
                            upd('buildCheckResult', null);
                          }
                        } else {
                          upd('buildDragging', i);
                        }

                      },

                      // Touch parity: a drag (touchAction:'none' + preventDefault below)
                      // suppresses the synthesized mousedown, so the press that begins a
                      // reposition/bond must be handled on touch too. Same body as onMouseDown.
                      onTouchStart: e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) {
                          if (d.buildBondFrom === null || d.buildBondFrom === undefined) {
                            upd('buildBondFrom', i);
                          } else if (d.buildBondFrom === i) {
                            upd('buildBondFrom', null);
                          } else {
                            const existingBonds = d.buildBonds || [];
                            const already = existingBonds.find(b => (b[0] === d.buildBondFrom && b[1] === i) || (b[0] === i && b[1] === d.buildBondFrom));
                            if (!already) {
                              upd('buildBonds', [...existingBonds, [d.buildBondFrom, i, 1]]);
                              if (typeof announceToSR === 'function') announceToSR("Connected atom " + d.buildAtoms[d.buildBondFrom].el + " to " + a.el);
                            }
                            upd('buildBondFrom', null);
                            upd('buildCheckResult', null);
                          }
                        } else {
                          upd('buildDragging', i);
                        }
                      }

                    }),

                    // Atom label

                    React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '13px', fontWeight: 'bold', pointerEvents: 'none' } }, a.el),

                    // Delete button (small x in corner)

                    React.createElement("g", {

                      onClick: e => {

                        e.stopPropagation();

                        removeBuildAtom(i);

                      },

                      style: { cursor: 'pointer' }

                    },

                      React.createElement("circle", { cx: a.x + 16, cy: a.y - 16, r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5 }),

                      React.createElement("text", { x: a.x + 16, y: a.y - 12.5, textAnchor: "middle", fill: "white", style: { fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' } }, "\u2715")

                    )

                  );

                }),

                // "Drawing bond from..." indicator line

                d.buildBondFrom !== null && d.buildBondFrom !== undefined && (d.buildAtoms || [])[d.buildBondFrom] && React.createElement("text", { x: W / 2, y: H - 10, textAnchor: "middle", fill: "#3b82f6", style: { fontSize: '10px', fontWeight: 'bold' } }, __alloT('stem.molecule.click_another_atom_to_connect', "\u{1F517} Select another atom to connect..."))

              ),

              (d.buildAtoms || []).length > 0 && React.createElement('section', {
                className: 'mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3',
                'aria-labelledby': 'molecule-builder-keyboard-controls-title'
              },
                React.createElement('h4', {
                  id: 'molecule-builder-keyboard-controls-title',
                  className: 'text-xs font-black text-slate-800'
                }, __alloT('stem.molecule.atom_and_bond_controls', 'Atom and bond controls')),
                React.createElement('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-600' },
                  __alloT('stem.molecule.controls_equivalent_help', 'These keyboard-accessible controls provide the same actions as the small controls inside the workspace.')),
                React.createElement('div', { className: 'mt-2 flex flex-wrap gap-2' },
                  (d.buildAtoms || []).map((atom, atomIndex) => React.createElement('button', {
                    key: 'remove-build-atom-' + atomIndex,
                    type: 'button',
                    'data-molecule-remove-atom': String(atomIndex),
                    'aria-label': 'Remove atom ' + (atomIndex + 1) + ': ' + atom.el,
                    onClick: () => removeBuildAtom(atomIndex),
                    className: 'min-h-11 rounded-lg border border-red-600 bg-white px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2'
                  }, '\u2715 Remove ' + (atomIndex + 1) + ': ' + atom.el))
                ),
                (d.buildBonds || []).length > 0 && React.createElement('div', { className: 'mt-2 flex flex-wrap gap-2' },
                  (d.buildBonds || []).map((bond, bondIndex) => {
                    const atoms = d.buildAtoms || [];
                    const first = atoms[bond[0]];
                    const second = atoms[bond[1]];
                    if (!first || !second) return null;
                    const names = ['single', 'double', 'triple'];
                    const currentType = bond[2] || 1;
                    const nextType = (currentType % 3) + 1;
                    return React.createElement('button', {
                      key: 'cycle-build-bond-' + bondIndex,
                      type: 'button',
                      'data-molecule-cycle-bond': String(bondIndex),
                      'aria-label': 'Bond ' + (bondIndex + 1) + ' between atom ' + (bond[0] + 1) + ' ' + first.el +
                        ' and atom ' + (bond[1] + 1) + ' ' + second.el + ' is a ' + names[currentType - 1] +
                        ' bond. Change to ' + names[nextType - 1] + '.',
                      onClick: () => cycleBuildBondType(bondIndex),
                      className: 'min-h-11 rounded-lg border border-indigo-600 bg-white px-3 py-2 text-xs font-bold text-indigo-800 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2'
                    }, first.el + '\u2013' + second.el + ': ' + names[currentType - 1] + ' \u2192 ' + names[nextType - 1]);
                  })
                )
              ),
              // Controls bar

              React.createElement("div", { className: "flex items-center gap-2 mt-3 flex-wrap" },

                // Bond draw button

                React.createElement("button", {
                  type: 'button',
                  "aria-label": (d.buildBondFrom !== null && d.buildBondFrom !== undefined)
                    ? "Cancel bond drawing"
                    : (d.buildBondMode ? "Exit bond drawing mode" : "Enter bond drawing mode"),
                  'aria-pressed': (d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) ? 'true' : 'false',
                  onClick: () => {
                    if (d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) {
                      upd('buildBondMode', false);
                      upd('buildBondFrom', null);
                      if (typeof announceToSR === 'function') announceToSR('Bond drawing mode off.');
                    } else {
                      upd('buildBondMode', true);
                      addToast('\uD83D\uDD17 Select one atom, then another atom, to create a bond.', 'info');
                      if (typeof announceToSR === 'function') announceToSR('Bond drawing mode on. Select one atom, then another atom.');
                    }
                  },
                  className: "min-h-11 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 " +
                    ((d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined))
                      ? 'bg-blue-100 text-blue-800 border-blue-600'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 active:scale-[0.97]')
                }, "\uD83D\uDD17 " + ((d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) ? 'Exit Bond Mode' : 'Draw Bond')),

                // Bond-from selector â€” click an atom first

                (d.buildAtoms || []).length >= 2 && d.buildBondFrom === null && React.createElement("div", { className: "flex gap-1" },

                  (d.buildAtoms || []).map((a, i) => React.createElement("button", { "aria-label": "Start bond from atom " + a.el,

                    key: 'bf' + i,

                    onClick: () => { upd('buildBondFrom', i); },

                    className: "w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold border-2 border-white hover:scale-110 transition-transform shadow-sm",

                    style: { backgroundColor: a.color },

                    title: 'Start bond from ' + a.el

                  }, a.el))

                ),

                // Clear all

                React.createElement("button", { "aria-label": __alloT('stem.molecule.clear_all', "Clear All"),

                  onClick: () => { upd('buildAtoms', []); upd('buildBonds', []); upd('buildBondFrom', null); upd('buildBondMode', false); upd('buildCheckResult', null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-600 hover:bg-red-100 transition-all ml-auto active:scale-[0.97]"

                }, __alloT('stem.molecule.clear_all_2', "\uD83D\uDDD1\uFE0F Clear All"))

              ),

              // Running formula display

              (d.buildAtoms || []).length > 0 && (() => {

                const counts = {};

                (d.buildAtoms || []).forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });

                // Standard chemistry ordering: C, H, then alphabetical

                const order = ['C', 'H'];

                const remaining = Object.keys(counts).filter(k => !order.includes(k)).sort();

                const sorted = [...order.filter(k => counts[k]), ...remaining];

                const formulaStr = sorted.map(k => k + (counts[k] > 1 ? counts[k] : '')).join('');

                return React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl p-3 border border-slate-400 flex items-center justify-between" },

                  React.createElement("div", null,

                    React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, "Formula: "),

                    React.createElement("span", { className: "text-lg font-black text-slate-800 font-mono tracking-tight" }, formulaStr)

                  ),

                  React.createElement("div", { className: "flex items-center gap-1 text-[11px] text-slate-600" },

                    React.createElement("span", null, (d.buildAtoms || []).length + " atoms"),

                    React.createElement("span", null, "•"),
                    React.createElement("span", null, calcMolarMass((() => { const c = {}; (d.buildAtoms || []).forEach(a => { c[a.el] = (c[a.el] || 0) + 1; }); return c; })()) + " g/mol"),

                    React.createElement("span", null, "\u2022"),

                    React.createElement("span", null, (d.buildBonds || []).length + " bonds")

                  )

                );

              })(),

              // Check molecule button + result

              (d.buildAtoms || []).length > 0 && React.createElement("div", { className: "mt-3 flex gap-2" },

                React.createElement("button", { "aria-label": __alloT('stem.molecule.check_built_molecule', "Check built molecule"),

                  onClick: () => {

                    const counts = {};

                    (d.buildAtoms || []).forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });

                    const match = COMPOUNDS.find(c => {

                      const rKeys = Object.keys(c.recipe); const bKeys = Object.keys(counts);

                      if (rKeys.length !== bKeys.length) return false;

                      return rKeys.every(k => counts[k] === c.recipe[k]);

                    });

                    if (match) {

                      upd('buildCheckResult', { success: true, compound: match });

                      addToast('\u2705 You built ' + match.name + '!', 'success');

                      if (typeof awardStemXP === 'function') awardStemXP('molecule', 15, 'Built ' + match.name);

                      // Add to discovered

                      const disc = d.discoveredCompounds || [];

                      if (!disc.includes(match.formula)) upd('discoveredCompounds', [...disc, match.formula]);
                      checkMoleculeChallenges();

                    } else {

                      upd('buildCheckResult', { success: false });

                      addToast('\u{1F914} No known compound matches this structure.', 'warning');

                    }

                  },

                  className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all"

                }, __alloT('stem.molecule.check_molecule', "\u{1F50D} Check Molecule")),

                React.createElement("button", { "aria-label": __alloT('stem.molecule.random_challenge', "Random Challenge"),

                  onClick: () => {

                    // Random challenge: pick a compound and show target

                    const target = COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];

                    upd('buildTarget', target);

                    upd('buildAtoms', []); upd('buildBonds', []); upd('buildBondFrom', null); upd('buildCheckResult', null);

                    addToast('\u{1F3AF} Build: ' + target.name + ' (' + target.formula + ')', 'info');

                  },

                  className: "px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 shadow-md transition-all"

                }, __alloT('stem.molecule.random_challenge_2', "\u{1F3AF} Random Challenge"))

              ),

              // Target compound display

              d.buildTarget && React.createElement("div", { className: "mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center gap-3" },

                React.createElement("span", { className: "text-2xl" }, d.buildTarget.emoji),

                React.createElement("div", null,

                  React.createElement("p", { className: "text-sm font-bold text-amber-800" }, "\u{1F3AF} Target: " + d.buildTarget.name),

                  React.createElement("p", { className: "text-xs text-amber-600" }, d.buildTarget.formula + " - " + d.buildTarget.desc),

                  React.createElement("p", { className: "text-[11px] text-amber-500 mt-0.5" }, "Recipe: " + Object.entries(d.buildTarget.recipe).map(([el, n]) => el + (n > 1 ? '\u00D7' + n : '')).join(' + '))

                )

              ),

              // Check result

              d.buildCheckResult && (d.buildCheckResult.success

                ? React.createElement("div", { className: "mt-2 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center animate-in zoom-in" },

                    React.createElement("p", { className: "text-3xl mb-1" }, d.buildCheckResult.compound.emoji),

                    React.createElement("p", { className: "text-lg font-black text-emerald-700 tracking-tight" }, "\u{1F389} " + d.buildCheckResult.compound.name),

                    React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.buildCheckResult.compound.formula + " - " + d.buildCheckResult.compound.desc),

                    React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, __alloT('stem.molecule.15_xp', "+15 XP \u{1F31F}"))

                  )

                : React.createElement("div", { className: "mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" },

                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, __alloT('stem.molecule.no_known_compound_matches_keep_experim', "\u{1F914} No known compound matches. Keep experimenting!")),

                    React.createElement("p", { className: "text-[11px] text-amber-500 mt-1" }, __alloT('stem.molecule.tip_click_bonds_to_cycle_between_singl', "Tip: Click bonds to cycle between single, double, and triple bonds"))

                  )

              ),

              // Build tips

              (d.buildAtoms || []).length === 0 && React.createElement("div", { className: "mt-4 bg-indigo-50 rounded-xl p-4 border border-indigo-200" },

                React.createElement("p", { className: "text-sm font-bold text-indigo-700 mb-2" }, __alloT('stem.molecule.how_to_build', "\u{1F4A1} How to Build")),

                React.createElement("div", { className: "grid grid-cols-1 gap-1.5 text-xs text-indigo-600" },

                  React.createElement("p", null, __alloT('stem.molecule.click_element_buttons_above_to_add_ato', "\u2460 Click element buttons above to add atoms to the canvas")),

                  React.createElement("p", null, __alloT('stem.molecule.drag_atoms_to_arrange_them', "\u2461 Drag atoms to arrange them")),

                  React.createElement("p", null, __alloT('stem.molecule.click_an_atom_in_the_bond_selector_the', "\u2462 Click an atom in the bond selector, then click another atom to draw a bond")),

                  React.createElement("p", null, __alloT('stem.molecule.click_a_bond_to_cycle_single_double_tr', "\u2463 Click a bond to cycle: single \u2192 double \u2192 triple")),

                  React.createElement("p", null, __alloT('stem.molecule.click_check_to_identify_your_molecule', "\u2464 Click \u{1F50D} Check to identify your molecule!")),

                  React.createElement("p", null, __alloT('stem.molecule.try_random_challenge_for_a_guided_buil', "\u{1F3AF} Try 'Random Challenge' for a guided build quest"))

                )

              )

            ),

            // â”€â”€ Periodic Table Mode â”€â”€

            mode === 'table' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, __alloT('stem.molecule.tap_any_element_to_learn_about_it_the_', "Tap any element to learn about it. The full 118-element periodic table.")),

              d.selectedElement && (() => {

                const detail = getElementDetail(d.selectedElement.s);

                const relatedCompounds = getElementCompounds(d.selectedElement.s);

                return React.createElement("div", { className: "mb-3 rounded-xl border-2 overflow-hidden " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },

                  React.createElement("div", { className: "p-3 flex items-center gap-3" },

                    React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md flex-shrink-0", style: { backgroundColor: d.selectedElement.c } },

                      React.createElement("span", { className: "text-[11px] opacity-80" }, d.selectedElement.n),

                      React.createElement("span", { className: "text-xl font-black tracking-tight" }, d.selectedElement.s)

                    ),

                    React.createElement("div", { className: "flex-1 min-w-0" },

                      React.createElement("p", { className: "text-lg font-bold text-slate-800 tracking-tight" }, d.selectedElement.name),

                      React.createElement("p", { className: "text-xs text-slate-600" }, "Atomic #" + d.selectedElement.n + " \u2022 " + (d.selectedElement.cat || 'element').replace(/^\w/, c => c.toUpperCase())),

                      detail && React.createElement("p", { className: "text-xs text-slate-600 mt-1 italic" }, detail.desc),

                      detail && React.createElement("button", { "aria-label": __alloT('stem.molecule.speak_text', "Speak Text"),
                        onClick: () => speakText(d.selectedElement.name + '. ' + detail.desc),
                        className: "transition-colors ml-1 px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center active:scale-[0.97]"
                      }, "🔊"),

                    ),

                    React.createElement("button", { onClick: () => upd('selectedElement', null), className: "p-1 text-slate-600 hover:text-slate-900 rounded-md transition-colors flex-shrink-0", "aria-label": __alloT('stem.molecule.close', "Close") }, "\u2715")

                  ),

                  detail && React.createElement("div", { className: "border-t border-slate-200/50 px-3 pb-3" },

                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-2" },

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, __alloT('stem.molecule.common_uses', "\uD83D\uDD27 Common Uses")),

                        React.createElement("div", { className: "flex flex-wrap gap-1" },

                          (detail.uses || []).map((use, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[11px] font-medium text-slate-700 border border-slate-400/80" }, use))

                        )

                      ),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, __alloT('stem.molecule.key_compounds', "\uD83E\uDDEA Key Compounds")),

                        React.createElement("div", { className: "flex flex-wrap gap-1" },

                          (detail.compounds || []).map((comp, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[11px] font-medium text-slate-700 border border-slate-400/80" }, comp))

                        )

                      )

                    ),

                    relatedCompounds.length > 0 && React.createElement("div", { className: "mt-2" },

                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\u2697\uFE0F Craftable in Compound Creator (" + relatedCompounds.length + ")"),

                      React.createElement("div", { className: "flex flex-wrap gap-1" },

                        relatedCompounds.map((comp, i) => React.createElement("button", { "aria-label": "Open " + comp.name + " in Compound Creator", key: i, onClick: () => { upd('moleculeMode', 'creator'); upd('selectedElements', { ...comp.recipe }); }, className: "px-2 py-0.5 bg-emerald-50 rounded-full text-[11px] font-bold text-emerald-700 border border-emerald-600 hover:bg-emerald-100 cursor-pointer transition-colors active:scale-[0.97]" }, comp.emoji + " " + comp.name + " (" + comp.formula + ")"))

                      )

                    ),

                    // â”€â”€â”€ BOHR MODEL ATOM VISUALIZATION â”€â”€â”€

                    React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200/50" },

                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, __alloT('stem.molecule.bohr_model', "\u269B\uFE0F Bohr Model")),

                      React.createElement("span", { className: "ml-2 text-[11px] text-slate-600 font-normal" },
                        "Config: " + getElectronConfig(d.selectedElement.n) +
                        " | Valence: " + getValenceElectrons(d.selectedElement.n) + "e⁻" +
                        (ELECTRONEGATIVITY[d.selectedElement.s] ? " | EN: " + ELECTRONEGATIVITY[d.selectedElement.s] : "")
                      ),

                      React.createElement("div", { className: "flex items-start gap-3" },

                        React.createElement("canvas", { width: 220, height: 220,

                          role: "img",

                          "aria-label": "Bohr model of " + (d.selectedElement.name || d.selectedElement.s || "the selected element") + ": nucleus with " + d.selectedElement.n + " protons and approximately " + Math.max(0, Math.round(d.selectedElement.mass || (d.selectedElement.n * 2.15)) - d.selectedElement.n) + " neutrons; " + d.selectedElement.n + " electrons arranged as " + getElectronConfig(d.selectedElement.n) + ".",

                          className: "rounded-xl border border-slate-400 bg-slate-900 flex-shrink-0",

                          key: 'bohr-' + d.selectedElement.n,

                          ref: function(canvas) {

                            if (!canvas) {
                              if (typeof window !== 'undefined' && window._moleculeBohrCleanup) window._moleculeBohrCleanup();
                              return;
                            }

                            if (canvas._bohrInit) {
                              if (canvas._bohrSchedule) canvas._bohrSchedule();
                              return;
                            }

                            if (typeof window !== 'undefined' && window._moleculeBohrCleanup) window._moleculeBohrCleanup();

                            var el = d.selectedElement;

                            var atomicNum = el.n;

                            var massNum = Math.round(el.mass || (atomicNum * 2.15));

                            var protons = atomicNum;

                            var neutrons = massNum - protons;

                            if (neutrons < 0) neutrons = 0;

                            var electrons = atomicNum;

                            // Shell configuration: 2, 8, 18, 32, 32, 18, 8

                            var shellCapacity = [2, 8, 18, 32, 32, 18, 8];

                            var shells = [];

                            var remaining = electrons;

                            for (var si = 0; si < shellCapacity.length && remaining > 0; si++) {

                              var count = Math.min(remaining, shellCapacity[si]);

                              shells.push(count);

                              remaining -= count;

                            }

                            // PL7 HiDPI: crisp rendering on retina displays.
                            if (window.StemLab && window.StemLab.setupHiDPI) {
                              window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
                            }
                            var ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);

                            var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;

                            var cx = W / 2, cy = H / 2;

                            var maxR = Math.min(W, H) / 2 - 8;

                            var nShells = shells.length;

                            var nucleusR = Math.max(8, Math.min(22, 6 + protons * 0.15));

                            var shellColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#38bdf8'];
                            var shellLabels = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

                            var angle = 0;

                            var animId = null;
                            var bohrAlive = true;
                            var bohrMotionReduced = false;
                            var observer = null;
                            try { bohrMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

                            function isBohrHidden() {
                              return typeof document !== 'undefined' && !!document.hidden;
                            }

                            function cancelBohrFrame() {
                              if (animId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(animId);
                              animId = null;
                            }

                            function scheduleBohrFrame() {
                              if (!bohrAlive || animId || bohrMotionReduced || isBohrHidden()) return;
                              if (typeof requestAnimationFrame !== 'function') return;
                              animId = requestAnimationFrame(draw);
                            }

                            function cleanupBohrCanvas() {
                              bohrAlive = false;
                              cancelBohrFrame();
                              if (observer) { observer.disconnect(); observer = null; }
                              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onBohrVisibilityChange);
                              canvas._bohrInit = false;
                              canvas._bohrCleanup = null;
                              canvas._bohrSchedule = null;
                              if (typeof window !== 'undefined' && window._moleculeBohrCleanup === cleanupBohrCanvas) window._moleculeBohrCleanup = null;
                            }

                            function onBohrVisibilityChange() {
                              if (!bohrAlive) return;
                              if (!canvas.isConnected) { cleanupBohrCanvas(); return; }
                              if (isBohrHidden()) cancelBohrFrame();
                              else { cancelBohrFrame(); draw(); }
                            }

                            canvas._bohrInit = true;
                            canvas._bohrCleanup = cleanupBohrCanvas;
                            canvas._bohrSchedule = scheduleBohrFrame;
                            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onBohrVisibilityChange);
                            if (typeof window !== 'undefined') window._moleculeBohrCleanup = cleanupBohrCanvas;

                            // State interpolation for expanding/contracting shells smoothly
                            var targetRadii = [];
                            for (var s = 0; s < nShells; s++) {
                              var r = nucleusR + 12 + (maxR - nucleusR - 12) * ((s + 1) / (nShells + 0.5));
                              targetRadii.push(r);
                            }

                            canvas._activeRadii = canvas._activeRadii || [];
                            if (canvas._activeRadii.length !== nShells) {
                              canvas._activeRadii = [];
                              for (var s = 0; s < nShells; s++) {
                                canvas._activeRadii.push(targetRadii[s]);
                              }
                            }

                            // Photon wave packet transitions
                            canvas._photons = canvas._photons || [];
                            if (canvas._prevN && canvas._prevN !== atomicNum) {
                              var isRelaxation = atomicNum < canvas._prevN;
                              for (var p = 0; p < 3; p++) {
                                var pAngle = Math.random() * Math.PI * 2;
                                canvas._photons.push({
                                  angle: pAngle,
                                  dist: isRelaxation ? nucleusR : maxR,
                                  speed: isRelaxation ? 4 : -4,
                                  color: isRelaxation ? '#a78bfa' : '#34d399', // relaxation (purple), excitation (green)
                                  life: 0,
                                  maxLife: 35
                                });
                              }
                            }
                            canvas._prevN = atomicNum;

                            function draw() {
                              if (!bohrAlive) return;
                              animId = null;
                              if (!canvas.isConnected) { cleanupBohrCanvas(); return; }
                              if (isBohrHidden()) { cancelBohrFrame(); return; }

                              ctx.clearRect(0, 0, W, H);

                              // Smoothly ease active radii towards target
                              for (var s = 0; s < nShells; s++) {
                                if (canvas._activeRadii[s] !== undefined) {
                                  canvas._activeRadii[s] += (targetRadii[s] - canvas._activeRadii[s]) * 0.08;
                                } else {
                                  canvas._activeRadii[s] = targetRadii[s];
                                }
                              }

                              // Draw concentric shells
                              for (var s = 0; s < nShells; s++) {

                                var r = canvas._activeRadii[s];

                                ctx.beginPath();

                                ctx.arc(cx, cy, r, 0, Math.PI * 2);

                                ctx.strokeStyle = 'rgba(148,163,184,0.18)';

                                ctx.lineWidth = 1;

                                ctx.stroke();

                                // Shell boundary energy labels
                                ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
                                ctx.font = '7px monospace';
                                ctx.textAlign = 'right';
                                ctx.fillText(shellLabels[s] + '(n=' + (s + 1) + ')', cx + r - 4, cy - 3);

                              }

                              // Draw nucleus

                              var nucGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, nucleusR);

                              nucGrad.addColorStop(0, '#ff6b6b');

                              nucGrad.addColorStop(0.6, '#e74c3c');

                              nucGrad.addColorStop(1, '#c0392b');

                              ctx.beginPath();

                              ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);

                              ctx.fillStyle = nucGrad;

                              ctx.fill();

                              // Nucleus spots (protons red, neutrons blue)

                              if (protons <= 20) {

                                var nucItems = [];

                                for (var pi = 0; pi < Math.min(protons, 10); pi++) nucItems.push('p');

                                for (var ni = 0; ni < Math.min(neutrons, 10); ni++) nucItems.push('n');

                                var golden = 2.399963;

                                for (var qi = 0; qi < nucItems.length; qi++) {

                                  var fr = Math.sqrt(qi / nucItems.length) * (nucleusR * 0.7);

                                  var fa = qi * golden;

                                  var fx = cx + Math.cos(fa) * fr;

                                  var fy = cy + Math.sin(fa) * fr;

                                  ctx.beginPath();

                                  ctx.arc(fx, fy, Math.max(1.5, nucleusR * 0.15), 0, Math.PI * 2);

                                  ctx.fillStyle = nucItems[qi] === 'p' ? '#ffaaaa' : '#aaaaff';

                                  ctx.fill();

                                }

                              }

                              // Nucleus label

                              ctx.fillStyle = '#ffffff';

                              ctx.font = 'bold ' + Math.max(7, Math.min(11, nucleusR * 0.7)) + 'px sans-serif';

                              ctx.textAlign = 'center';

                              ctx.textBaseline = 'middle';

                              if (protons <= 4) {

                                ctx.fillText(protons + 'p', cx, cy - 2);

                                ctx.fillText(neutrons + 'n', cx, cy + 7);

                              }

                              // Draw electrons orbiting (with trails)

                              for (var s2 = 0; s2 < nShells; s2++) {

                                var r2 = canvas._activeRadii[s2] || targetRadii[s2];

                                var eCount = shells[s2];

                                var speed = (0.22 + s2 * 0.08) * (s2 % 2 === 0 ? 1 : -1);

                                var eColor = shellColors[s2 % shellColors.length];

                                for (var ei = 0; ei < eCount; ei++) {

                                  var eAngle = angle * speed + (ei / eCount) * Math.PI * 2;

                                  var ex = cx + Math.cos(eAngle) * r2;

                                  var ey = cy + Math.sin(eAngle) * r2;

                                  // Glow ring
                                  ctx.beginPath();

                                  ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);

                                  ctx.fillStyle = eColor + '22';

                                  ctx.fill();

                                  // Orbit electron trails
                                  for (var tIdx = 1; tIdx <= 3; tIdx++) {
                                    var trailAngle = eAngle - tIdx * 0.045 * speed;
                                    var tx = cx + Math.cos(trailAngle) * r2;
                                    var ty = cy + Math.sin(trailAngle) * r2;
                                    ctx.beginPath();
                                    ctx.arc(tx, ty, 3.2 - tIdx * 0.6, 0, Math.PI * 2);
                                    ctx.fillStyle = eColor;
                                    ctx.globalAlpha = 0.5 - tIdx * 0.15;
                                    ctx.fill();
                                    ctx.globalAlpha = 1.0;
                                  }

                                  // Electron core dot
                                  ctx.beginPath();

                                  ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);

                                  ctx.fillStyle = eColor;

                                  ctx.fill();

                                }

                              }

                              // Render transition photons
                              canvas._photons.forEach(function(ph) {
                                ph.dist += ph.speed;
                                ph.life++;
                                
                                var pX = cx + Math.cos(ph.angle) * ph.dist;
                                var pY = cy + Math.sin(ph.angle) * ph.dist;
                                
                                // Wave oscillation offset
                                var perpAngle = ph.angle + Math.PI / 2;
                                var waveOffset = Math.sin(ph.life * 0.85) * 4.5;
                                pX += Math.cos(perpAngle) * waveOffset;
                                pY += Math.sin(perpAngle) * waveOffset;
                                
                                ctx.beginPath();
                                ctx.arc(pX, pY, 3, 0, Math.PI * 2);
                                ctx.fillStyle = ph.color;
                                ctx.shadowColor = ph.color;
                                ctx.shadowBlur = 6;
                                ctx.fill();
                                ctx.shadowBlur = 0;
                              });
                              canvas._photons = canvas._photons.filter(function(ph) { return ph.life < ph.maxLife; });

                              // Symbol label at top

                              ctx.fillStyle = 'rgba(255,255,255,0.75)';

                              ctx.font = 'bold 9px monospace';

                              ctx.textAlign = 'center';

                              ctx.fillText(el.s + ' (' + atomicNum + ')', cx, 14);

                              if (!bohrMotionReduced) angle += 0.015;

                              scheduleBohrFrame();

                            }

                            draw();

                            observer = new MutationObserver(function(mutations) {

                              mutations.forEach(function(m) {

                                m.removedNodes.forEach(function(node) {

                                  if (node === canvas || (node.contains && node.contains(canvas))) {

                                    cleanupBohrCanvas();

                                  }

                                });

                              });

                            });

                            if (canvas.parentNode && canvas.parentNode.parentNode) {

                              observer.observe(canvas.parentNode.parentNode, { childList: true, subtree: true });

                            }

                          }

                        }),

                        React.createElement("div", { className: "text-[11px] text-slate-600 space-y-1 leading-relaxed" },

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Protons: "), "" + d.selectedElement.n),

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Electrons: "), "" + d.selectedElement.n),

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Shells: "), (function() {

                            var e = d.selectedElement.n;

                            var sc = [2, 8, 18, 32, 32, 18, 8];

                            var sh = [];

                            var rem = e;

                            for (var i = 0; i < sc.length && rem > 0; i++) {

                              var c = Math.min(rem, sc[i]);

                              sh.push(c);

                              rem -= c;

                            }

                            return sh.join('-');

                          })()),

                          React.createElement("p", { className: "text-[11px] text-slate-600 italic mt-1" }, __alloT('stem.molecule.bohr_model_caption_honest', "\u26A1 The Bohr model draws electrons on tidy \u201Cshells\u201D that fill inside-out \u2014 a useful first picture, but electrons don\u2019t actually circle like planets. See the \u2630 Orbital clouds tab for where they really are (probability clouds, not orbits)."))

                        )

                      )

                    )

                  )

                );

              })(),

              // Table grid

              React.createElement("div", { className: "overflow-x-auto" },

                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '1px', minWidth: '600px' } },

                  PT_LAYOUT.flatMap((row, ri) => {

                    if (!Array.isArray(row)) return [];

                    if (row.length === 0) return [React.createElement("div", { key: 'gap-' + ri, style: { gridColumn: 'span 18', height: '4px' } })];

                    return row.map((num, ci) => {

                      if (num === 0) return React.createElement("div", { key: ri + '-' + ci });

                      const el = ELEMENTS[num - 1];

                      if (!el) return React.createElement("div", { key: ri + '-' + ci });

                      return React.createElement("button", { "aria-label": "Select element: " + el.name + " (" + el.s + ")", key: el.s, onClick: () => upd('selectedElement', el), className: "w-full aspect-square rounded flex flex-col items-center justify-center text-[11px] font-bold border transition-all hover:scale-125 hover:z-10 hover:shadow-lg " + (catColors[el.cat] || 'bg-slate-50 border-slate-200'), title: el.name, style: { minWidth: '28px' } },

                        React.createElement("span", { className: "font-black text-[11px] leading-none" }, el.s),

                        React.createElement("span", { className: "opacity-60 leading-none" }, el.n)

                      );

                    });

                  })

                )

              ),

              // Legend

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3 justify-center" },

                [['alkali', 'Alkali'], ['alkaline', 'Alkaline'], ['transition', 'Transition'], ['metal', 'Post-trans.'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'], ['halogen', 'Halogen'], ['noble', 'Noble Gas'], ['lanthanide', t('stem.periodic.lanthanide')], ['actinide', t('stem.periodic.actinide')]].map(([cat, label]) =>

                  React.createElement("span", { key: cat, className: "px-1.5 py-0.5 rounded text-[11px] font-bold border " + (catColors[cat] || '') }, label)

                )

              ),

              // â”€â”€ Quiz: Element Hunt â”€â”€

              (() => {

                var elQuiz = d.elQuiz || null;

                var elScore = d.elScore || 0;

                var elStreak = d.elStreak || 0;

                function makeElQuiz() {

                  var quizTypes = [

                    function () { var el = ELEMENTS[Math.floor(Math.random() * 36)]; return { text: 'Which element has the symbol "' + el.s + '"?', answer: el.name, opts: [el.name].concat(ELEMENTS.filter(function (e) { return e.name !== el.name; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3).map(function (e) { return e.name; })).sort(function () { return Math.random() - 0.5; }) }; },

                    function () { var el = ELEMENTS[Math.floor(Math.random() * 36)]; return { text: 'What is the atomic number of ' + el.name + '?', answer: String(el.n), opts: [String(el.n), String(el.n + 2), String(el.n > 3 ? el.n - 2 : el.n + 4), String(el.n + 7)].sort(function () { return Math.random() - 0.5; }) }; },

                    function () { var cats = ['alkali', 'noble', 'halogen', 'transition', 'nonmetal']; var catLabels = { alkali: 'Alkali Metal', noble: 'Noble Gas', halogen: 'Halogen', transition: 'Transition Metal', nonmetal: 'Nonmetal' }; var cat = cats[Math.floor(Math.random() * cats.length)]; var ex = ELEMENTS.filter(function (e) { return e.cat === cat; }); var el = ex[Math.floor(Math.random() * ex.length)]; return { text: 'What category does ' + el.name + ' (' + el.s + ') belong to?', answer: catLabels[cat], opts: Object.values(catLabels).sort(function () { return Math.random() - 0.5; }).slice(0, 4) }; },

                  ];

                  var gen = quizTypes[Math.floor(Math.random() * quizTypes.length)];

                  var q = gen(); q.answered = false;

                  if (q.opts.indexOf(q.answer) < 0) q.opts[0] = q.answer;

                  return q;

                }

                return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("button", { "aria-label": __alloT('stem.molecule.start_element_quiz_or_get_next_questio', "Start element quiz or get next question"), onClick: function () { upd('elQuiz', makeElQuiz()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (elQuiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-700 text-white') + " hover:opacity-90 transition-all" }, elQuiz ? 'ðŸ”„ Next Question' : 'ðŸ”¬ Element Quiz'),

                    elScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, 'â­ ' + elScore + ' | ðŸ”¥ ' + elStreak)

                  ),

                  elQuiz && !elQuiz.answered && React.createElement("div", { className: "bg-cyan-50 rounded-xl p-3 border border-cyan-200" },

                    React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, elQuiz.text),

                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                      elQuiz.opts.map(function (opt) {

                        return React.createElement("button", { "aria-label": "Select answer: " + opt,

                          key: opt, onClick: function () {

                            var correct = opt === elQuiz.answer;

                            upd('elQuiz', Object.assign({}, elQuiz, { answered: true, chosen: opt }));

                            upd('elScore', elScore + (correct ? 1 : 0)); upd('elStreak', correct ? elStreak + 1 : 0);
                            if (correct) checkMoleculeChallenges();

                            if (correct) addToast(t('stem.periodic.correct'), 'success'); else addToast(t('stem.periodic.answer') + elQuiz.answer, 'error');

                          }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all active:scale-[0.97]"

                        }, opt);

                      })

                    )

                  ),

                  elQuiz && elQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold " + (elQuiz.chosen === elQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') }, elQuiz.chosen === elQuiz.answer ? 'âœ… Correct!' : 'âŒ Answer: ' + elQuiz.answer)

                );

              })()

            )

,

            // ═══ Reactions Mode ═══
            mode === 'reactions' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-3" }, __alloT('stem.molecule.balance_chemical_equations_by_adjustin', "Balance chemical equations by adjusting coefficients. Make atoms equal on both sides!")),

              // Reaction selector
              React.createElement("div", { className: "flex gap-1 mb-4 flex-wrap" },
                REACTIONS.map((r, idx) => React.createElement("button", { "aria-label": "Select reaction: " + r.name,
                  key: r.id,
                  onClick: () => initReaction(idx),
                  className: "px-2 py-1 rounded-lg text-xs font-bold transition-all " +
                    (currentReactionIdx === idx && reactionCoeffs ? 'bg-indigo-600 text-white shadow-md' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.97]')
                }, r.emoji + " " + (idx + 1)))
              ),

              // Active reaction
              (() => {
                const r = REACTIONS[currentReactionIdx];
                const coeffs = reactionCoeffs || r.left.concat(r.right).map(() => 1);
                const balance = getAtomBalance(r, coeffs);

                return React.createElement("div", null,
                  // Reaction info
                  React.createElement("div", { className: "bg-indigo-50 rounded-xl p-3 border border-indigo-200 mb-3" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-xl" }, r.emoji),
                      React.createElement("span", { className: "text-sm font-bold text-indigo-800" }, r.name),
                      React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[11px] font-bold " +
                        (r.difficulty === 1 ? 'bg-green-100 text-green-700' : r.difficulty === 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') },
                        r.difficulty === 1 ? 'Easy' : r.difficulty === 2 ? 'Medium' : 'Hard'),
                      React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600" }, r.type)
                    ),
                    React.createElement("p", { className: "text-xs text-indigo-600" }, r.desc)
                  ),

                  // Equation balancer
                  React.createElement("div", { className: "bg-slate-900/60 rounded-xl border border-slate-800 p-4 mb-3" },
                    React.createElement("div", { className: "flex items-center justify-center gap-2 flex-wrap" },
                      // Left side (reactants)
                      r.left.map((term, i) => React.createElement("div", { key: 'l' + i, className: "flex items-center gap-1" },
                        i > 0 && React.createElement("span", { className: "text-lg font-bold text-slate-600 mx-1 tracking-tight" }, "+"),
                        React.createElement("div", { className: "flex flex-col items-center" },
                          React.createElement("div", {
                            "aria-label": "Coefficient for " + term.formula + ". Current value is " + coeffs[i] + ". Use Arrow Keys to adjust.",
                            tabIndex: 0,
                            onKeyDown: (e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                                e.preventDefault(); setCoeff(i, 1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient increased to " + Math.min(9, coeffs[i] + 1));
                              } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                                e.preventDefault(); setCoeff(i, -1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient decreased to " + Math.max(1, coeffs[i] - 1));
                              }
                            },
                            className: "flex items-center gap-0.5 focus:ring-2 focus:ring-yellow-500 focus:outline-none rounded-lg p-0.5"
                          },
                            React.createElement("button", { "aria-label": "Decrease coefficient for " + term.formula,
                              onClick: () => setCoeff(i, -1),
                              tabIndex: -1,
                              className: "transition-colors w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center active:scale-[0.97]"
                            }, "−"),
                            React.createElement("span", { className: "w-8 text-center text-lg font-black text-indigo-700 font-mono tracking-tight" }, coeffs[i]),
                            React.createElement("button", { "aria-label": "Increase coefficient for " + term.formula,
                              onClick: () => setCoeff(i, 1),
                              tabIndex: -1,
                              className: "transition-colors w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center active:scale-[0.97]"
                            }, "+")
                          ),
                          React.createElement("span", { className: "text-sm font-bold text-slate-700 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border" }, term.formula)
                        )
                      )),

                      // Arrow
                      React.createElement("span", { className: "text-2xl font-bold text-slate-600 mx-2 tracking-tight" }, "→"),

                      // Right side (products)
                      r.right.map((term, i) => React.createElement("div", { key: 'r' + i, className: "flex items-center gap-1" },
                        i > 0 && React.createElement("span", { className: "text-lg font-bold text-slate-600 mx-1 tracking-tight" }, "+"),
                        React.createElement("div", { className: "flex flex-col items-center" },
                          React.createElement("div", {
                            "aria-label": "Coefficient for " + term.formula + ". Current value is " + coeffs[r.left.length + i] + ". Use Arrow Keys to adjust.",
                            tabIndex: 0,
                            onKeyDown: (e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                                e.preventDefault(); setCoeff(r.left.length + i, 1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient increased to " + Math.min(9, coeffs[r.left.length + i] + 1));
                              } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                                e.preventDefault(); setCoeff(r.left.length + i, -1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient decreased to " + Math.max(1, coeffs[r.left.length + i] - 1));
                              }
                            },
                            className: "flex items-center gap-0.5 focus:ring-2 focus:ring-yellow-500 focus:outline-none rounded-lg p-0.5"
                          },
                            React.createElement("button", { "aria-label": "Decrease coefficient for " + term.formula,
                              onClick: () => setCoeff(r.left.length + i, -1),
                              tabIndex: -1,
                              className: "transition-colors w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center active:scale-[0.97]"
                            }, "−"),
                            React.createElement("span", { className: "w-8 text-center text-lg font-black text-indigo-700 font-mono tracking-tight" }, coeffs[r.left.length + i]),
                            React.createElement("button", { "aria-label": "Increase coefficient for " + term.formula,
                              onClick: () => setCoeff(r.left.length + i, 1),
                              tabIndex: -1,
                              className: "transition-colors w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center active:scale-[0.97]"
                            }, "+")
                          ),
                          React.createElement("span", { className: "text-sm font-bold text-slate-700 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border" }, term.formula)
                        )
                      ))
                    ),

                    // Visual Molecule Shelf
                    React.createElement("div", { className: "flex gap-3 justify-center items-center mt-4 border-t border-slate-800 pt-3 flex-wrap" },
                      drawVisualShelf(r.left, true),
                      React.createElement("span", { className: "text-lg font-bold text-slate-600 mt-4 tracking-tight" }, "→"),
                      drawVisualShelf(r.right, false)
                    )
                  ),

                  // Atom count table
                  React.createElement("div", { className: "bg-slate-50 rounded-xl p-3 border mb-3" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, __alloT('stem.molecule.atom_count', "Atom Count")),
                    React.createElement("div", { className: "grid grid-cols-3 gap-1 text-xs" },
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, __alloT('stem.molecule.element', "Element")),
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, __alloT('stem.molecule.left', "Left")),
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, __alloT('stem.molecule.right', "Right")),
                      balance.map(b => [
                        React.createElement("span", { key: b.element + 'n', className: "text-center font-bold text-slate-700" }, b.element),
                        React.createElement("span", { key: b.element + 'l', className: "text-center font-bold " + (b.balanced ? 'text-emerald-600' : 'text-red-500') }, b.left),
                        React.createElement("span", { key: b.element + 'r', className: "text-center font-bold " + (b.balanced ? 'text-emerald-600' : 'text-red-500') }, b.right)
                      ]).flat()
                    )
                  ),

                  // Submit button
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { "aria-label": __alloT('stem.molecule.check_balance', "Check Balance"),
                      onClick: submitReaction,
                      disabled: reactionResult === 'correct',
                      className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all disabled:opacity-40"
                    }, __alloT('stem.molecule.check_balance_2', "⚖️ Check Balance")),
                    React.createElement("button", { "aria-label": __alloT('stem.molecule.next', "Next"),
                      onClick: () => { const next = (currentReactionIdx + 1) % REACTIONS.length; initReaction(next); },
                      className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors active:scale-[0.97]"
                    }, __alloT('stem.molecule.next_2', "➡️ Next"))
                  ),

                  // Result feedback
                  reactionResult === 'correct' && React.createElement("div", { className: "mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-lg font-black text-emerald-700 tracking-tight" }, __alloT('stem.molecule.balanced', "🎉 Balanced!")),
                    React.createElement("p", { className: "text-xs text-emerald-600 mt-1" }, "+" + (r.difficulty * 10) + " RP earned")
                  ),
                  reactionResult === 'incorrect' && React.createElement("div", { className: "mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, __alloT('stem.molecule.hint_check_which_atoms_have_different_', "💡 Hint: check which atoms have different counts on each side."))
                  ),

                  // Progress
                  React.createElement("div", { className: "mt-3 flex items-center justify-between text-[11px] text-slate-600" },
                    React.createElement("span", null, "⚖️ " + reactionsBalanced + " balanced"),
                    React.createElement("span", null, "Reaction " + (currentReactionIdx + 1) + "/" + REACTIONS.length)
                  )
                );
              })()
            ),

            // ═══ Challenges Panel ═══
            React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },
              React.createElement("details", { open: completedChallenges.length > 0 && completedChallenges.length < MOLECULE_CHALLENGES.length },
                React.createElement("summary", { className: "transition-colors text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 select-none" },
                  "🏆 Challenges (" + completedChallenges.length + "/" + MOLECULE_CHALLENGES.length + ")"
                ),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" },
                  MOLECULE_CHALLENGES.map(ch => {
                    const done = completedChallenges.includes(ch.id);
                    return React.createElement("div", {
                      key: ch.id,
                      className: "flex items-center gap-2 p-2 rounded-lg border " + (done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200')
                    },
                      React.createElement("span", { className: "text-lg" }, done ? '✅' : ch.emoji),
                      React.createElement("div", { className: "flex-1 min-w-0" },
                        React.createElement("p", { className: "text-xs font-bold " + (done ? 'text-emerald-700 line-through' : 'text-slate-700') }, ch.name),
                        React.createElement("p", { className: "text-[11px] " + (done ? 'text-emerald-500' : 'text-slate-600') }, ch.desc)
                      ),
                      React.createElement("span", { className: "text-[11px] font-bold " + (done ? 'text-emerald-600' : 'text-slate-500') }, "+" + ch.reward + " RP")
                    );
                  })
                )
              )
            ),

            
            // ═══ AI Chemistry Tutor ═══
            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
              React.createElement("details", null,
                React.createElement("summary", { className: "transition-colors text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 select-none" },
                  __alloT('stem.molecule.ask_the_chemistry_tutor', "🧑‍🔬 Ask the Chemistry Tutor")
                ),
                React.createElement("div", { className: "mt-2" },
                  React.createElement("div", { className: "flex gap-2 mb-2" },
                    React.createElement("input", {
                      type: "text",
                      value: aiQuestion,
                      "aria-label": __alloT('stem.molecule.ask_the_chemistry_tutor_about_elements', "Ask the chemistry tutor about elements, compounds, or reactions"),
                      onChange: (e) => upd('aiQuestion', e.target.value),
                      onKeyDown: (e) => { if (e.key === 'Enter') askChemTutor(aiQuestion); },
                      placeholder: __alloT('stem.molecule.ask_about_any_element_compound_or_reac', "Ask about any element, compound, or reaction..."),
                      className: "flex-1 px-3 py-2 rounded-lg border border-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    }),
                    React.createElement("button", { "aria-label": __alloT('stem.molecule.ask_chem_tutor', "Ask Chem Tutor"),
                      onClick: () => askChemTutor(aiQuestion),
                      disabled: aiLoading || !aiQuestion,
                      className: "px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-all active:scale-[0.97]"
                    }, aiLoading ? "⏳" : "🔬 Ask")
                  ),
                  React.createElement("div", { className: "flex gap-1 mb-2 flex-wrap" },
                    ["What is an ionic bond?", "Why is water a polar molecule?", "How does rust form?", "What is pH?"].map(q =>
                      React.createElement("button", { "aria-label": "Ask: " + q,
                        key: q,
                        onClick: () => { upd('aiQuestion', q); askChemTutor(q); },
                        className: "px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors active:scale-[0.97]"
                      }, q)
                    )
                  ),
                  aiAnswer && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-3 border border-indigo-200" },
                    React.createElement("div", { className: "flex items-start gap-2" },
                      React.createElement("span", { className: "text-lg flex-shrink-0" }, "🧑‍🔬"),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-xs text-indigo-700 leading-relaxed" }, aiAnswer),
                        React.createElement("button", { "aria-label": __alloT('stem.molecule.read_aloud', "Read Aloud"),
                          onClick: () => speakText(aiAnswer),
                          className: "transition-colors mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-600 hover:bg-indigo-200 active:scale-[0.97]"
                        }, __alloT('stem.molecule.read_aloud_2', "🔊 Read Aloud"))
                      )
                    )
                  )
                )
              )
            ),
// ═══ Tutorial Overlay ═══
            !tutorialDismissed && React.createElement(MoleculeTutorialDialog, {
              React: React,
              step: tutorialStep,
              icons: ['🔬', '⚗️', '🧱', '🗂️', '🔥'],
              titles: ['Welcome to Molecule Lab!', 'Compound Creator', 'Build Mode', 'Periodic Table', 'Reaction Simulator'],
              descriptions: [
                'Explore chemistry through 5 interactive modes. View molecules, create compounds, build structures, study elements, and balance reactions!',
                'Select elements from the grid to craft real compounds. Discover all 32 recipes to earn the Master Chemist challenge!',
                'Place atoms on the canvas and draw bonds between them. Select a bond to cycle single, double, and triple bonds. Try the Random Challenge!',
                'Browse all 118 elements with animated Bohr models, electron configurations, and electronegativity values. Test yourself with the Element Quiz!',
                'Adjust coefficients to balance chemical equations. Match atom counts on both sides. Ten reactions range from easy to hard, with research points for each!'
              ],
              stepLabel: __alloT('stem.molecule.step', 'Step'),
              ofLabel: __alloT('stem.molecule.of', 'of'),
              dismissLabel: __alloT('stem.molecule.dismiss_tutorial', 'Dismiss Tutorial'),
              backLabel: __alloT('stem.molecule.back', 'Back'),
              nextLabel: __alloT('stem.molecule.next_3', 'Next'),
              startLabel: __alloT('stem.molecule.start_exploring', 'Start Exploring!'),
              onBack: function() { upd('tutorialStep', tutorialStep - 1); },
              onNext: advanceTutorial,
              onDismiss: dismissTutorial
            })
          )
      })();

      // ═══════════════════════════════════════════════════════════════════
      // EXPANSION SECTIONS — interactive reference library (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      // Appended below the main molecule view. Adds: VSEPR geometry gallery,
      // bond types reference, intermolecular forces, common reactions catalog,
      // molecule library, periodic table reference, acid-base reference,
      // polymers, lab safety, glossary, quick reference, practice problems,
      // stoichiometry/molarity calculators, phase diagrams, equilibrium,
      // kinetics, thermodynamics basics, quantum numbers reference.
      var d2 = (labToolData && labToolData.molecule) || {};
      var expSection = d2.expSection || null;  // null = collapsed, else section id
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.molecule) || {};
          return Object.assign({}, prev, { molecule: Object.assign({}, prior, patch) });
        });
      }

      // ── Reference data (large constants drive the views) ──
      var VSEPR_GEOMETRIES = [
        { id: 'linear', name: __alloT('stem.molecule.linear', 'Linear'), steric: 2, lone: 0, angle: '180°', examples: ['CO₂', 'BeCl₂', 'HCN'], color: '#0ea5e9', desc: __alloT('stem.molecule.two_bonded_pairs_no_lone_pairs_on_cent', 'Two bonded pairs, no lone pairs on central atom.') },
        { id: 'bent2', name: __alloT('stem.molecule.bent_2_lone_pairs', 'Bent (2 lone pairs)'), steric: 4, lone: 2, angle: '~104.5°', examples: ['H₂O', 'OF₂', 'OCl₂'], color: '#06b6d4', desc: __alloT('stem.molecule.tetrahedral_electron_geometry_but_two_', 'Tetrahedral electron geometry but two lone pairs push bonds closer.') },
        { id: 'trigonal', name: __alloT('stem.molecule.trigonal_planar', 'Trigonal planar'), steric: 3, lone: 0, angle: '120°', examples: ['BF₃', 'SO₃', 'NO₃⁻'], color: '#22c55e', desc: __alloT('stem.molecule.three_bonded_pairs_in_a_plane', 'Three bonded pairs in a plane.') },
        { id: 'bent3', name: __alloT('stem.molecule.bent_1_lone_pair', 'Bent (1 lone pair)'), steric: 3, lone: 1, angle: '~117°', examples: ['SO₂', 'O₃', 'NO₂⁻'], color: '#84cc16', desc: __alloT('stem.molecule.trigonal_planar_electron_geometry_with', 'Trigonal planar electron geometry with one lone pair.') },
        { id: 'tetrahedral', name: __alloT('stem.molecule.tetrahedral', 'Tetrahedral'), steric: 4, lone: 0, angle: '109.5°', examples: ['CH₄', 'CCl₄', 'NH₄⁺'], color: '#eab308', desc: __alloT('stem.molecule.four_bonded_pairs_in_tetrahedral_arran', 'Four bonded pairs in tetrahedral arrangement.') },
        { id: 'pyramidal', name: __alloT('stem.molecule.trigonal_pyramidal', 'Trigonal pyramidal'), steric: 4, lone: 1, angle: '~107°', examples: ['NH₃', 'PH₃', 'PCl₃'], color: '#f97316', desc: __alloT('stem.molecule.tetrahedral_electron_geometry_one_lone', 'Tetrahedral electron geometry, one lone pair pushes shape pyramidal.') },
        { id: 'tbp', name: __alloT('stem.molecule.trigonal_bipyramidal', 'Trigonal bipyramidal'), steric: 5, lone: 0, angle: '90° + 120°', examples: ['PCl₅', 'PF₅', 'AsF₅'], color: '#ef4444', desc: __alloT('stem.molecule.five_bonded_pairs_three_equatorial_at_', 'Five bonded pairs; three equatorial at 120°, two axial at 90°.') },
        { id: 'seesaw', name: __alloT('stem.molecule.seesaw', 'Seesaw'), steric: 5, lone: 1, angle: 'distorted', examples: ['SF₄', 'XeO₂F₂'], color: '#dc2626', desc: __alloT('stem.molecule.trigonal_bipyramidal_with_one_equatori', 'Trigonal bipyramidal with one equatorial lone pair.') },
        { id: 'tshape', name: 'T-shaped', steric: 5, lone: 2, angle: '~87.5°', examples: ['ClF₃', 'BrF₃'], color: '#a855f7', desc: __alloT('stem.molecule.two_equatorial_lone_pairs_leave_a_t_sh', 'Two equatorial lone pairs leave a T-shape.') },
        { id: 'linear5', name: __alloT('stem.molecule.linear_3_lone', 'Linear (3 lone)'), steric: 5, lone: 3, angle: '180°', examples: ['XeF₂', 'I₃⁻'], color: '#7e22ce', desc: __alloT('stem.molecule.three_equatorial_lone_pairs_leave_line', 'Three equatorial lone pairs leave linear axial bonds.') },
        { id: 'octahedral', name: __alloT('stem.molecule.octahedral', 'Octahedral'), steric: 6, lone: 0, angle: '90°', examples: ['SF₆', 'PF₆⁻'], color: '#0f172a', desc: __alloT('stem.molecule.six_bonded_pairs_in_octahedral_arrange', 'Six bonded pairs in octahedral arrangement.') },
        { id: 'sqpyramid', name: __alloT('stem.molecule.square_pyramidal', 'Square pyramidal'), steric: 6, lone: 1, angle: '~90°', examples: ['BrF₅', 'IF₅'], color: '#475569', desc: __alloT('stem.molecule.octahedral_with_one_axial_lone_pair', 'Octahedral with one axial lone pair.') },
        { id: 'sqplane', name: __alloT('stem.molecule.square_planar', 'Square planar'), steric: 6, lone: 2, angle: '90°', examples: ['XeF₄', 'PtCl₄²⁻'], color: '#64748b', desc: __alloT('stem.molecule.two_opposite_lone_pairs_leave_a_square', 'Two opposite lone pairs leave a square plane.') }
      ];

      var BOND_TYPES = [
        { name: __alloT('stem.molecule.covalent_nonpolar', 'Covalent (nonpolar)'), diff: '0 – 0.4', icon: '⚛︎', examples: ['H₂', 'O₂', 'CH₄'], desc: __alloT('stem.molecule.electrons_shared_roughly_equally_betwe', 'Electrons shared roughly equally between atoms with similar electronegativity.') },
        { name: __alloT('stem.molecule.covalent_polar', 'Covalent (polar)'), diff: '0.4 – 1.7', icon: '⇌', examples: ['H₂O', 'HCl', 'NH₃'], desc: __alloT('stem.molecule.electrons_shared_unevenly_one_atom_pul', 'Electrons shared unevenly — one atom pulls more strongly; creates partial charges (δ+ / δ−).') },
        { name: __alloT('stem.molecule.ionic', 'Ionic'), diff: '> 1.7', icon: '⊕⊖', examples: ['NaCl', 'KBr', 'MgO'], desc: __alloT('stem.molecule.electron_transferred_from_metal_low_en', 'Electron transferred from metal (low EN) to nonmetal (high EN); lattice held by electrostatic attraction.') },
        { name: __alloT('stem.molecule.metallic', 'Metallic'), diff: 'N/A', icon: '⚜︎', examples: ['Cu', 'Fe', 'Au'], desc: __alloT('stem.molecule.delocalized_sea_of_electrons_shared_ac', 'Delocalized "sea of electrons" shared across cations; conducts heat/electricity, malleable.') },
        { name: __alloT('stem.molecule.hydrogen_bond', 'Hydrogen bond'), diff: 'intermolecular', icon: '⤬', examples: ['H₂O···H₂O', 'DNA base pairs'], desc: __alloT('stem.molecule.strong_dipole_dipole_between_h_bonded_', 'Strong dipole-dipole between H bonded to N/O/F and another lone pair. Not a true bond — but ~5-30 kJ/mol.') },
        { name: __alloT('stem.molecule.coordinate_covalent', 'Coordinate covalent'), diff: 'special', icon: '➡︎', examples: ['NH₄⁺', '[Cu(H₂O)₆]²⁺'], desc: __alloT('stem.molecule.both_shared_electrons_come_from_one_at', 'Both shared electrons come from one atom. Common in transition-metal complexes.') },
        { name: __alloT('stem.molecule.triple_bond', 'Triple bond'), diff: '3 pairs', icon: '☰', examples: ['N₂', 'C₂H₂', 'CO'], desc: __alloT('stem.molecule.three_shared_electron_pairs_1_2_very_s', 'Three shared electron pairs (1 σ + 2 π). Very strong (~945 kJ/mol for N≡N).') },
        { name: __alloT('stem.molecule.double_bond', 'Double bond'), diff: '2 pairs', icon: '═', examples: ['O₂', 'C=O', 'C=C'], desc: __alloT('stem.molecule.two_shared_electron_pairs_1_1_restrict', 'Two shared electron pairs (1 σ + 1 π). Restricts rotation around the bond axis.') }
      ];

      var IMF_TYPES = [
        { name: __alloT('stem.molecule.london_dispersion', 'London dispersion'), strength: '0.05 – 40 kJ/mol', symbol: '∼', present: 'All molecules', desc: __alloT('stem.molecule.temporary_dipoles_from_electron_motion', 'Temporary dipoles from electron motion. Stronger for larger molecules / more polarizable atoms.'), examples: ['Noble gases', 'Alkanes', 'I₂ vs F₂'] },
        { name: 'Dipole-dipole', strength: '5 – 25 kJ/mol', symbol: '↔', present: 'Polar molecules', desc: __alloT('stem.molecule.permanent_dipoles_align_to_stronger_th', 'Permanent dipoles align δ+ to δ−. Stronger than dispersion at comparable size.'), examples: ['HCl', 'CH₂Cl₂', 'acetone'] },
        { name: __alloT('stem.molecule.hydrogen_bond_2', 'Hydrogen bond'), strength: '5 – 50 kJ/mol', symbol: '⤬', present: 'H bonded to N/O/F + nearby lone pair', desc: __alloT('stem.molecule.strongest_dipole_dipole_explains_anoma', 'Strongest dipole-dipole. Explains anomalous boiling points (H₂O vs H₂S).'), examples: ['H₂O', 'NH₃', 'HF', 'DNA, proteins'] },
        { name: 'Ion-dipole', strength: '40 – 600 kJ/mol', symbol: '⊕↔', present: 'Ions dissolved in polar solvent', desc: __alloT('stem.molecule.charge_dipole_attraction_drives_ionic_', 'Charge-dipole attraction. Drives ionic dissolution.'), examples: ['Na⁺ in water', 'K⁺ in DMSO'] },
        { name: __alloT('stem.molecule.ion_induced_dipole', 'Ion-induced dipole'), strength: '3 – 15 kJ/mol', symbol: '⊕→', present: 'Ion + nonpolar molecule', desc: __alloT('stem.molecule.ion_polarizes_nearby_nonpolar_molecule', 'Ion polarizes nearby nonpolar molecule.'), examples: ['I⁻ + I₂ → I₃⁻'] },
        { name: __alloT('stem.molecule.stacking', 'π-π stacking'), strength: '0 – 50 kJ/mol', symbol: '⇄', present: 'Aromatic rings', desc: __alloT('stem.molecule.stacking_attraction_between_aromatic_c', 'Stacking attraction between aromatic π-clouds.'), examples: ['benzene dimer', 'DNA base stacking'] }
      ];

      var COMMON_REACTIONS = [
        { type: 'Combustion', icon: '🔥', general: 'CₓHᵧ + O₂ → CO₂ + H₂O', example: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O', enthalpy: '−890 kJ/mol (methane)', desc: __alloT('stem.molecule.hydrocarbon_burns_in_oxygen_producing_', 'Hydrocarbon burns in oxygen producing CO₂ + water. Exothermic.') },
        { type: 'Synthesis (combination)', icon: '➕', general: 'A + B → AB', example: '2 H₂ + O₂ → 2 H₂O', enthalpy: 'Usually exothermic', desc: __alloT('stem.molecule.two_or_more_reactants_combine_into_one', 'Two or more reactants combine into one product.') },
        { type: 'Decomposition', icon: '➗', general: 'AB → A + B', example: '2 H₂O₂ → 2 H₂O + O₂', enthalpy: 'Often endothermic', desc: __alloT('stem.molecule.one_reactant_splits_into_multiple_prod', 'One reactant splits into multiple products.') },
        { type: 'Single replacement', icon: '⇄', general: 'A + BC → AC + B', example: 'Zn + CuSO₄ → ZnSO₄ + Cu', enthalpy: 'Varies', desc: __alloT('stem.molecule.more_reactive_element_displaces_a_less', 'More reactive element displaces a less reactive one from a compound.') },
        { type: 'Double replacement', icon: '↔', general: 'AB + CD → AD + CB', example: 'AgNO₃ + NaCl → AgCl + NaNO₃', enthalpy: 'Varies', desc: __alloT('stem.molecule.cations_and_anions_swap_partners_often', 'Cations and anions swap partners. Often produces precipitate, gas, or water.') },
        { type: 'Acid-base (neutralization)', icon: '⚖', general: 'HA + BOH → BA + H₂O', example: 'HCl + NaOH → NaCl + H₂O', enthalpy: '~ −56 kJ/mol', desc: __alloT('stem.molecule.acid_base_produces_salt_water_heat_of_', 'Acid + base produces salt + water. Heat of neutralization is nearly constant for strong A+B.') },
        { type: 'Precipitation', icon: '💎', general: 'soluble + soluble → insoluble + soluble', example: 'AgNO₃(aq) + KCl(aq) → AgCl(s) + KNO₃(aq)', enthalpy: 'Driven by ΔS', desc: __alloT('stem.molecule.two_soluble_ionic_compounds_form_one_i', 'Two soluble ionic compounds form one insoluble product.') },
        { type: 'Redox (oxidation-reduction)', icon: '🔄', general: 'electrons transferred', example: 'Cu + 2 AgNO₃ → Cu(NO₃)₂ + 2 Ag', enthalpy: 'Varies', desc: __alloT('stem.molecule.one_species_loses_electrons_oxidized_a', 'One species loses electrons (oxidized), another gains (reduced). Many "everyday" reactions are redox.') },
        { type: 'Esterification', icon: '🌸', general: 'R-COOH + R\'-OH → R-COO-R\' + H₂O', example: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O', enthalpy: '~ −20 kJ/mol', desc: __alloT('stem.molecule.carboxylic_acid_alcohol_ester_water_re', 'Carboxylic acid + alcohol → ester + water. Reversible; H₂SO₄ catalyst commonly used.') },
        { type: 'Saponification', icon: '🧼', general: 'fat + base → soap + glycerol', example: '(C₁₇H₃₅COO)₃C₃H₅ + 3 NaOH → 3 C₁₇H₃₅COONa + C₃H₅(OH)₃', enthalpy: 'Exothermic', desc: __alloT('stem.molecule.triglyceride_hydrolyzed_by_strong_base', 'Triglyceride hydrolyzed by strong base to make soap.') },
        { type: 'Polymerization', icon: '🧬', general: 'n monomer → polymer', example: 'n CH₂=CH₂ → (-CH₂-CH₂-)ₙ', enthalpy: 'Exothermic', desc: __alloT('stem.molecule.many_small_monomers_join_into_long_pol', 'Many small monomers join into long polymer chains. Addition or condensation type.') },
        { type: 'Hydrolysis', icon: '💧', general: 'AB + H₂O → AH + BOH', example: 'sucrose + H₂O → glucose + fructose (catalyzed)', enthalpy: 'Varies', desc: __alloT('stem.molecule.water_splits_a_bond_common_for_esters_', 'Water splits a bond. Common for esters, polymers, ATP.') }
      ];

      var MOLECULE_LIBRARY = [
        { f: 'H₂O', name: __alloT('stem.molecule.water', 'Water'), uses: 'Universal solvent. ~70% of body mass. Hydrogen bonding gives unique properties.', shape: 'bent', m: 18.02 },
        { f: 'CO₂', name: __alloT('stem.molecule.carbon_dioxide', 'Carbon dioxide'), uses: 'Photosynthesis input. Greenhouse gas. Carbonates dissolved in oceans.', shape: 'linear', m: 44.01 },
        { f: 'O₂', name: __alloT('stem.molecule.oxygen_2', 'Oxygen'), uses: '21% of atmosphere. Essential for aerobic respiration. Strong oxidizer.', shape: 'linear', m: 32.00 },
        { f: 'N₂', name: __alloT('stem.molecule.nitrogen_2', 'Nitrogen'), uses: '78% of atmosphere. Triple bond makes it very stable. Fixed by bacteria + Haber process.', shape: 'linear', m: 28.02 },
        { f: 'CH₄', name: __alloT('stem.molecule.methane', 'Methane'), uses: 'Natural gas. Major greenhouse gas (25× CO₂ over 100 yr). Microbial methanogenesis.', shape: 'tetrahedral', m: 16.04 },
        { f: 'NH₃', name: __alloT('stem.molecule.ammonia', 'Ammonia'), uses: 'Fertilizer feedstock (Haber process). Cleaning agent. Refrigerant.', shape: 'pyramidal', m: 17.03 },
        { f: 'HCl', name: __alloT('stem.molecule.hydrochloric_acid', 'Hydrochloric acid'), uses: 'Stomach acid (pH ~1.5). Industrial pickling. Strong monoprotic acid.', shape: 'linear', m: 36.46 },
        { f: 'NaCl', name: __alloT('stem.molecule.sodium_chloride', 'Sodium chloride'), uses: 'Table salt. Essential electrolyte. Ionic lattice.', shape: 'ionic', m: 58.44 },
        { f: 'CaCO₃', name: __alloT('stem.molecule.calcium_carbonate', 'Calcium carbonate'), uses: 'Limestone, chalk, eggshells. Antacid. Building material.', shape: 'ionic', m: 100.09 },
        { f: 'H₂SO₄', name: __alloT('stem.molecule.sulfuric_acid', 'Sulfuric acid'), uses: '#1 industrial chemical by mass. Fertilizers, batteries, refining.', shape: 'tetrahedral', m: 98.08 },
        { f: 'HNO₃', name: __alloT('stem.molecule.nitric_acid', 'Nitric acid'), uses: 'Fertilizers, explosives, oxidation. Strong monoprotic acid.', shape: 'trigonal', m: 63.01 },
        { f: 'CH₃OH', name: __alloT('stem.molecule.methanol', 'Methanol'), uses: 'Solvent. Fuel. Toxic to humans (causes blindness).', shape: 'tetrahedral', m: 32.04 },
        { f: 'C₂H₅OH', name: __alloT('stem.molecule.ethanol', 'Ethanol'), uses: 'Beverages, fuel additive, antiseptic. Hydrogen bonding raises BP.', shape: 'tetrahedral', m: 46.07 },
        { f: 'C₆H₁₂O₆', name: __alloT('stem.molecule.glucose', 'Glucose'), uses: 'Primary energy source for cells. Photosynthesis product.', shape: 'cyclic', m: 180.16 },
        { f: 'C₁₂H₂₂O₁₁', name: __alloT('stem.molecule.sucrose', 'Sucrose'), uses: 'Table sugar. Disaccharide (glucose + fructose).', shape: 'disaccharide', m: 342.30 },
        { f: 'C₈H₁₀N₄O₂', name: __alloT('stem.molecule.caffeine_2', 'Caffeine'), uses: 'Adenosine receptor antagonist. Most-used psychoactive drug. Plant defense.', shape: 'planar', m: 194.19 },
        { f: 'C₉H₈O₄', name: __alloT('stem.molecule.aspirin_2', 'Aspirin'), uses: 'NSAID. Inhibits COX enzymes. Daily cardioprotection in low doses.', shape: 'planar', m: 180.16 },
        { f: 'C₇H₆O₃', name: __alloT('stem.molecule.salicylic_acid', 'Salicylic acid'), uses: 'Topical acne treatment. Precursor to aspirin. Plant signaling.', shape: 'planar', m: 138.12 },
        { f: 'CHCl₃', name: __alloT('stem.molecule.chloroform', 'Chloroform'), uses: 'Solvent. Former anesthetic (now obsolete; toxic).', shape: 'tetrahedral', m: 119.38 },
        { f: 'CCl₄', name: __alloT('stem.molecule.carbon_tetrachloride', 'Carbon tetrachloride'), uses: 'Former cleaning solvent. Ozone-depleter; phased out.', shape: 'tetrahedral', m: 153.82 }
      ];

      var ACID_BASE_REF = [
        { name: __alloT('stem.molecule.hydrochloric_acid_2', 'Hydrochloric acid'), formula: 'HCl', ka: '~10⁷', strength: 'Very strong', notes: 'Stomach acid; pH ~1' },
        { name: __alloT('stem.molecule.sulfuric_acid_2', 'Sulfuric acid'), formula: 'H₂SO₄', ka: '~10³ (first H)', strength: 'Very strong', notes: 'Diprotic; battery acid' },
        { name: __alloT('stem.molecule.nitric_acid_2', 'Nitric acid'), formula: 'HNO₃', ka: '~20', strength: 'Strong', notes: 'Oxidizing acid' },
        { name: __alloT('stem.molecule.hydrofluoric_acid', 'Hydrofluoric acid'), formula: 'HF', ka: '6.6 × 10⁻⁴', strength: 'Weak (but dangerous)', notes: 'Etches glass; causes deep tissue burns' },
        { name: __alloT('stem.molecule.acetic_acid', 'Acetic acid'), formula: 'CH₃COOH', ka: '1.8 × 10⁻⁵', strength: 'Weak', notes: 'Vinegar; pKa 4.76' },
        { name: __alloT('stem.molecule.carbonic_acid', 'Carbonic acid'), formula: 'H₂CO₃', ka: '4.3 × 10⁻⁷', strength: 'Weak', notes: 'Soda water; CO₂ + H₂O' },
        { name: __alloT('stem.molecule.ammonia_2', 'Ammonia'), formula: 'NH₃', kb: '1.8 × 10⁻⁵', strength: 'Weak base', notes: 'Cleaning; conjugate of NH₄⁺' },
        { name: __alloT('stem.molecule.sodium_hydroxide', 'Sodium hydroxide'), formula: 'NaOH', kb: '~10²⁰', strength: 'Very strong base', notes: 'Lye; pH ~14 at 1M' },
        { name: __alloT('stem.molecule.potassium_hydroxide', 'Potassium hydroxide'), formula: 'KOH', kb: '~10²⁰', strength: 'Very strong base', notes: 'Caustic potash' },
        { name: __alloT('stem.molecule.calcium_hydroxide_2', 'Calcium hydroxide'), formula: 'Ca(OH)₂', kb: 'limited solubility', strength: 'Strong base', notes: 'Slaked lime' },
        { name: __alloT('stem.molecule.water_self', 'Water (self)'), formula: 'H₂O', kw: '1.0 × 10⁻¹⁴', strength: 'Amphoteric', notes: 'Kw at 25°C; both donates + accepts H⁺' },
        { name: __alloT('stem.molecule.citric_acid_2', 'Citric acid'), formula: 'H₃C₆H₅O₇', ka1: '7.4 × 10⁻⁴', strength: 'Weak (triprotic)', notes: 'Citrus fruits; cleaning' }
      ];

      var QUANTUM_REF = [
        { n: 'Principal (n)', range: '1, 2, 3, ...', means: 'Shell / energy level. Larger n = farther from nucleus + higher energy.' },
        { n: 'Azimuthal (ℓ)', range: '0 to n−1', means: 'Subshell shape. ℓ=0→s (sphere), 1→p (dumbbell), 2→d (cloverleaf), 3→f (complex).' },
        { n: 'Magnetic (mₗ)', range: '−ℓ to +ℓ', means: 'Orbital orientation in space. 2ℓ+1 orbitals per subshell.' },
        { n: 'Spin (mₛ)', range: '+½ or −½', means: 'Intrinsic angular momentum. Pauli: no two electrons in same atom can have identical 4 quantum numbers.' }
      ];

      // ── Section render helpers ──
      function expHeader() {
        return React.createElement('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-base font-black text-indigo-900' }, __alloT('stem.molecule.chemistry_reference_library', '🧪 Chemistry Reference Library')),
            React.createElement('div', { className: 'text-[11px] text-indigo-700 mt-0.5' }, __alloT('stem.molecule.interactive_references_pick_a_topic_be', 'Interactive references — pick a topic below to explore.'))
          ),
          expSection && React.createElement('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'transition-colors px-3 py-1 rounded-md text-xs font-bold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100 active:scale-[0.97]'
          }, __alloT('stem.molecule.close_section', '✕ Close section'))
        );
      }

      function expTabBar() {
        // 50 chemistry sections grouped by domain so the bar reads as a
        // navigable table-of-contents instead of an alphabet soup. All IDs
        // preserved. Groups: Structure & Bonding · Reactions & Equilibrium
        // · States & Energy · Organic & Polymers · Reference & Tables ·
        // Applications · Lab & Safety.
        var TAB_GROUPS = [
          { id: 'structure', label: __alloT('stem.molecule.structure_bonding', 'Structure & Bonding'), color: 'indigo', tabs: [
            { id: 'vsepr', label: __alloT('stem.molecule.vsepr_shapes', 'VSEPR shapes'), icon: '🔺' },
            { id: 'mol_geo', label: __alloT('stem.molecule.bond_geometry', 'Bond geometry'), icon: '∡' },
            { id: 'bonds', label: __alloT('stem.molecule.bond_types', 'Bond types'), icon: '⚛︎' },
            { id: 'imf', label: __alloT('stem.molecule.intermol_forces', 'Intermol. forces'), icon: '↔' },
            { id: 'quantum', label: __alloT('stem.molecule.quantum_numbers', 'Quantum numbers'), icon: '𝑛' },
            { id: 'orbitals', label: __alloT('stem.molecule.orbital_clouds', 'Orbital clouds'), icon: '☁️' },
            { id: 'periodic', label: __alloT('stem.molecule.periodic_trends', 'Periodic trends'), icon: '📊' },
            { id: 'isomers', label: __alloT('stem.molecule.isomers', 'Isomers'), icon: '⇄' }
          ] },
          { id: 'reactions', label: __alloT('stem.molecule.reactions_equilibrium', 'Reactions & Equilibrium'), color: 'rose', tabs: [
            { id: 'reactions', label: __alloT('stem.molecule.reaction_types', 'Reaction types'), icon: '🔄' },
            { id: 'acidbase', label: 'Acid/base', icon: '⚖' },
            { id: 'pH_scale', label: __alloT('stem.molecule.ph_scale', 'pH scale'), icon: 'H⁺' },
            { id: 'equilibrium', label: __alloT('stem.molecule.equilibrium', 'Equilibrium'), icon: '⇌' },
            { id: 'kinetics', label: __alloT('stem.molecule.kinetics', 'Kinetics'), icon: '⏱' },
            { id: 'redox', label: __alloT('stem.molecule.redox', 'Redox'), icon: '🔋' },
            { id: 'electrochem', label: __alloT('stem.molecule.electrochemistry', 'Electrochemistry'), icon: '⚡' },
            { id: 'stoich', label: __alloT('stem.molecule.stoichiometry', 'Stoichiometry'), icon: '⚖' },
            { id: 'molarity', label: __alloT('stem.molecule.molarity_calc', 'Molarity calc'), icon: '🧮' }
          ] },
          { id: 'states', label: __alloT('stem.molecule.states_energy', 'States & Energy'), color: 'sky', tabs: [
            { id: 'phase', label: __alloT('stem.molecule.phase_diagram', 'Phase diagram'), icon: '🧊' },
            { id: 'gaslaws', label: __alloT('stem.molecule.gas_laws', 'Gas laws'), icon: '💨' },
            { id: 'colligative', label: __alloT('stem.molecule.colligative', 'Colligative'), icon: '🧂' },
            { id: 'solubility', label: __alloT('stem.molecule.solubility', 'Solubility'), icon: '◐' },
            { id: 'meltboil', label: __alloT('stem.molecule.melt_boil_pts', 'Melt + boil pts'), icon: '🌡' },
            { id: 'thermo', label: __alloT('stem.molecule.thermodynamics', 'Thermodynamics'), icon: '🔥' },
            { id: 'nuclear', label: __alloT('stem.molecule.nuclear_chem', 'Nuclear chem'), icon: '☢' }
          ] },
          { id: 'organic', label: __alloT('stem.molecule.organic_polymers', 'Organic & Polymers'), color: 'emerald', tabs: [
            { id: 'organic', label: __alloT('stem.molecule.organic_groups', 'Organic groups'), icon: '🧪' },
            { id: 'polymers', label: __alloT('stem.molecule.polymers', 'Polymers'), icon: '🧬' },
            { id: 'biochem', label: __alloT('stem.molecule.biochemistry', 'Biochemistry'), icon: '🧬' }
          ] },
          { id: 'reference', label: __alloT('stem.molecule.reference_tables', 'Reference & Tables'), color: 'slate', tabs: [
            { id: 'library', label: __alloT('stem.molecule.molecule_library', 'Molecule library'), icon: '📚' },
            { id: 'compounds', label: __alloT('stem.molecule.common_compounds', 'Common compounds'), icon: '⌬' },
            { id: 'allelements', label: __alloT('stem.molecule.all_elements', 'All elements'), icon: '🅻' },
            { id: 'noble', label: __alloT('stem.molecule.noble_gases', 'Noble gases'), icon: 'He' },
            { id: 'inorganic', label: __alloT('stem.molecule.inorganic_chem', 'Inorganic chem'), icon: '⚛' },
            { id: 'minerals', label: __alloT('stem.molecule.minerals', 'Minerals'), icon: '💎' },
            { id: 'crystal', label: __alloT('stem.molecule.crystal_structures', 'Crystal structures'), icon: '💎' },
            { id: 'glossary', label: __alloT('stem.molecule.glossary', 'Glossary'), icon: '📖' },
            { id: 'famous', label: __alloT('stem.molecule.history', 'History'), icon: '🕰' }
          ] },
          { id: 'applications', label: __alloT('stem.molecule.applications', 'Applications'), color: 'amber', tabs: [
            { id: 'medchem', label: __alloT('stem.molecule.drug_discovery', 'Drug discovery'), icon: '💊' },
            { id: 'pharma', label: __alloT('stem.molecule.common_drugs', 'Common drugs'), icon: '💊' },
            { id: 'food', label: __alloT('stem.molecule.food_chemistry', 'Food chemistry'), icon: '🍳' },
            { id: 'foods', label: __alloT('stem.molecule.food_nutrition', 'Food + nutrition'), icon: '🥦' },
            { id: 'flavor_chem', label: __alloT('stem.molecule.flavor_scent', 'Flavor + scent'), icon: '👃' },
            { id: 'colors_chem', label: __alloT('stem.molecule.color_chemistry', 'Color chemistry'), icon: '🎨' },
            { id: 'materials', label: __alloT('stem.molecule.materials', 'Materials'), icon: '🪨' },
            { id: 'household', label: __alloT('stem.molecule.household_chem', 'Household chem'), icon: '🧴' },
            { id: 'industrial', label: __alloT('stem.molecule.industrial_scale', 'Industrial scale'), icon: '🏗' },
            { id: 'environment', label: __alloT('stem.molecule.atmospheric', 'Atmospheric'), icon: '🌫' },
            { id: 'enviro2', label: __alloT('stem.molecule.pollution', 'Pollution'), icon: '🏭' },
            { id: 'green', label: __alloT('stem.molecule.green_chemistry', 'Green chemistry'), icon: '🌱' }
          ] },
          { id: 'lab', label: __alloT('stem.molecule.lab_safety', 'Lab & Safety'), color: 'cyan', tabs: [
            { id: 'lab', label: __alloT('stem.molecule.lab_techniques', 'Lab techniques'), icon: '🔬' },
            { id: 'spectro', label: __alloT('stem.molecule.spectroscopy', 'Spectroscopy'), icon: '📡' },
            { id: 'safety', label: __alloT('stem.molecule.lab_safety_2', 'Lab safety'), icon: '🦺' }
, { id: 'bondMystery', label: __alloT('stem.molecule.bond_detective', 'Bond detective'), icon: '🔬' }
, { id: 'solventMystery', label: __alloT('stem.molecule.mystery_solvent', 'Mystery solvent'), icon: '🧪' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return React.createElement('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'transition-colors bg-white text-slate-700 border-slate-300 hover:bg- active:scale-[0.97]' + accent + 'transition-colors -50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return React.createElement('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            return React.createElement('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              React.createElement('span', { 'aria-hidden': 'true', className: 'text-[10px] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              g.tabs.map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      // ── Individual section renders ──
      function renderVseprSection() {
        var pickedId = d2.vseprPicked || VSEPR_GEOMETRIES[0].id;
        var picked = VSEPR_GEOMETRIES.filter(function(g) { return g.id === pickedId; })[0] || VSEPR_GEOMETRIES[0];

        // SVG diagram showing the central atom + bonds
        function svgGeometry(geo) {
          var size = 200;
          var cx = size/2, cy = size/2;
          var bondCount = geo.steric - geo.lone;
          var angles = [];
          // Angles are clockwise-from-up screen degrees; trailing entries beyond the bond count become
          // the lone pairs. The old map drew bent2 (water) at ~60° not 104.5°, had a no-op bent3 ternary
          // (both branches identical → drawn as full trigonal), and sized arrays so lone pairs never showed.
          if (geo.id === 'linear' || geo.id === 'linear5') angles = [0, 180];
          else if (geo.id === 'trigonal') angles = [0, 120, 240];
          else if (geo.id === 'bent3') angles = [121.5, 238.5, 0]; // 2 bonds ~117° apart, lone pair on top
          else if (geo.id === 'bent2') angles = [127.75, 232.25, 55, 305]; // 2 bonds ~104.5° apart, 2 lone pairs on top
          else if (geo.id === 'tetrahedral') angles = [45, 135, 225, 315];
          else if (geo.id === 'pyramidal') angles = [120, 180, 240, 0]; // 3-bond tripod + lone pair on top
          else if (geo.id === 'tbp' || geo.id === 'seesaw' || geo.id === 'tshape') angles = [0, 180, 90, 210, 330]; // axial up/down + equatorial (lone pairs go equatorial)
          else if (geo.id === 'octahedral' || geo.id === 'sqpyramid' || geo.id === 'sqplane') angles = [0, 60, 120, 180, 240, 300];
          var bondsToShow = bondCount;
          return React.createElement('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, role: 'img', 'aria-label': geo.name + ' geometry' },
            React.createElement('circle', { cx: cx, cy: cy, r: 80, fill: 'none', stroke: '#e2e8f0', strokeDasharray: '2,3' }),
            angles.slice(0, bondsToShow).map(function(a, i) {
              var rad = (a - 90) * Math.PI / 180;
              var bx = cx + 70 * Math.cos(rad);
              var by = cy + 70 * Math.sin(rad);
              return React.createElement('g', { key: 'b'+i },
                React.createElement('line', { x1: cx, y1: cy, x2: bx, y2: by, stroke: geo.color, strokeWidth: 2.5 }),
                React.createElement('circle', { cx: bx, cy: by, r: 14, fill: '#fff', stroke: geo.color, strokeWidth: 2 }),
                React.createElement('text', { x: bx, y: by + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#1e293b' }, 'X')
              );
            }),
            angles.slice(bondsToShow).map(function(a, i) {
              var rad = (a - 90) * Math.PI / 180;
              var bx = cx + 50 * Math.cos(rad);
              var by = cy + 50 * Math.sin(rad);
              return React.createElement('g', { key: 'l'+i, opacity: 0.6 },
                React.createElement('ellipse', { cx: bx, cy: by, rx: 16, ry: 8, fill: 'none', stroke: '#94a3b8', strokeDasharray: '3,2', transform: 'rotate(' + a + ' ' + bx + ' ' + by + ')' })
              );
            }),
            React.createElement('circle', { cx: cx, cy: cy, r: 18, fill: geo.color }),
            React.createElement('text', { x: cx, y: cy + 4, textAnchor: 'middle', fontSize: 13, fontWeight: 800, fill: '#fff' }, 'A')
          );
        }

        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.vsepr_molecular_geometry', '🔺 VSEPR — molecular geometry')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.valence_shell_electron_pair_repulsion_', 'Valence Shell Electron Pair Repulsion theory predicts molecular shape from steric number (bonded + lone pairs around central atom). Lone pairs repel more strongly than bonded pairs, so they push bonds closer.')),
          React.createElement('div', { className: 'grid gap-3 grid-cols-1 md:grid-cols-3 mb-3' },
            React.createElement('div', { className: 'flex flex-col gap-1 md:col-span-1' },
              VSEPR_GEOMETRIES.map(function(g) {
                var sel = g.id === pickedId;
                return React.createElement('button', {
                  key: g.id,
                  onClick: function() { setExp({ vseprPicked: g.id }); },
                  className: 'text-left px-2.5 py-1.5 rounded-md text-[11px] font-bold border ' + (sel ? 'bg-indigo-100 border-indigo-400 text-indigo-900' : 'transition-colors bg-white border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.97]'),
                  style: { borderLeftWidth: 4, borderLeftColor: g.color }
                }, g.name);
              })
            ),
            React.createElement('div', { className: 'md:col-span-2 flex flex-col items-center' },
              svgGeometry(picked),
              React.createElement('div', { className: 'mt-2 text-center' },
                React.createElement('div', { className: 'text-sm font-black text-slate-800' }, picked.name),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Steric ' + picked.steric + ' · ' + picked.lone + ' lone pair' + (picked.lone === 1 ? '' : 's') + ' · ' + picked.angle),
                React.createElement('div', { className: 'text-[12px] mt-2 text-slate-700' }, picked.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mt-1.5' }, 'Examples: ', picked.examples.join(', '))
              )
            )
          )
        );
      }

      function renderBondsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.bond_types_electronegativity_differenc', '⚛︎ Bond types — electronegativity difference')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.bond_character_ranges_from_purely_cova', 'Bond character ranges from purely covalent (equal sharing) to ionic (full electron transfer). The boundary is fuzzy — most real bonds have partial ionic character.')),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            BOND_TYPES.map(function(b, i) {
              return React.createElement('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-lg' }, b.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, b.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 ml-auto' }, 'ΔEN ' + b.diff)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed mb-1' }, b.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Examples: ', b.examples.join(', '))
              );
            })
          )
        );
      }

      function renderImfSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.intermolecular_forces_imf', '↔ Intermolecular forces (IMF)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.forces_between_molecules_determine_mel', 'Forces BETWEEN molecules determine melting/boiling points, viscosity, solubility, and surface tension. Stronger IMF = higher BP.')),
          React.createElement('div', { className: 'space-y-2' },
            IMF_TYPES.map(function(f, i) {
              return React.createElement('div', { key: 'i'+i, className: 'p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl text-indigo-600' }, f.symbol),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, f.name),
                  React.createElement('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-indigo-100 text-indigo-800' }, f.strength)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, __alloT('stem.molecule.present_in', 'Present in: '), f.present),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed mb-1' }, f.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Examples: ', f.examples.join(', '))
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            React.createElement('strong', null, __alloT('stem.molecule.tip', '💡 Tip: ')), __alloT('stem.molecule.for_polar_molecules_all_applicable_imf', 'For polar molecules, ALL applicable IMFs add up. Water has dispersion + dipole + H-bonding — that\'s why its BP is so high (100°C) compared to similar-mass H₂S (−60°C).')
          )
        );
      }

      function renderReactionsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.reaction_types_2', '🔄 Reaction types')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.reactions_fall_into_recognizable_patte', 'Reactions fall into recognizable patterns. Knowing the type helps predict products + balance equations.')),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            COMMON_REACTIONS.map(function(r, i) {
              return React.createElement('div', { key: 'r'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl' }, r.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, r.type)
                ),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2 py-1 rounded mb-1' }, r.general),
                React.createElement('div', { className: 'text-[11px] font-mono text-slate-700 bg-white px-2 py-1 rounded mb-1 border border-slate-200' }, r.example),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, 'ΔH: ', r.enthalpy),
                React.createElement('div', { className: 'text-[12px] text-slate-700' }, r.desc)
              );
            })
          )
        );
      }

      function renderLibrarySection() {
        var search = (d2.libSearch || '').toLowerCase();
        var filtered = MOLECULE_LIBRARY.filter(function(m) {
          if (!search) return true;
          return m.f.toLowerCase().indexOf(search) >= 0 ||
                 m.name.toLowerCase().indexOf(search) >= 0 ||
                 m.uses.toLowerCase().indexOf(search) >= 0;
        });
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.common_molecule_library', '📚 Common molecule library')),
          React.createElement('input', {
            type: 'text',
            'aria-label': __alloT('stem.molecule.search_molecule_library', 'Search molecule library'),
            value: d2.libSearch || '',
            onChange: function(e) { setExp({ libSearch: e.target.value }); },
            placeholder: __alloT('stem.molecule.search_formula_name_use', 'Search formula / name / use...'),
            className: 'w-full px-3 py-1.5 rounded-md border border-slate-300 text-[12px] mb-3'
          }),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
            filtered.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline justify-between mb-1' },
                  React.createElement('span', { className: 'text-base font-black text-indigo-800 font-mono' }, m.f),
                  React.createElement('span', { className: 'text-[10px] text-slate-500' }, m.m + ' g/mol')
                ),
                React.createElement('div', { className: 'text-[12px] font-bold text-slate-800 mb-1' }, m.name),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, 'Shape: ', m.shape),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-snug' }, m.uses)
              );
            })
          ),
          filtered.length === 0 && React.createElement('div', { className: 'text-center text-[11px] text-slate-500 py-4' }, __alloT('stem.molecule.no_molecules_match', 'No molecules match "'), search, '"')
        );
      }

      function renderAcidBaseSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.acid_base_reference', '⚖ Acid / base reference')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.strength_how_completely_an_acid_base_d', 'Strength = how completely an acid/base dissociates in water. Strong = ~100% (Ka >> 1). Weak = partial (Ka < 1). pH = −log[H⁺].')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  React.createElement('th', { scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, __alloT('stem.molecule.name', 'Name')),
                  React.createElement('th', { scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, __alloT('stem.molecule.formula', 'Formula')),
                  React.createElement('th', { scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, 'Ka/Kb'),
                  React.createElement('th', { scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, __alloT('stem.molecule.strength', 'Strength')),
                  React.createElement('th', { scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, __alloT('stem.molecule.notes', 'Notes'))
                )
              ),
              React.createElement('tbody', null,
                ACID_BASE_REF.map(function(a, i) {
                  return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 text-slate-800 font-bold' }, a.name),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 font-mono' }, a.formula),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 font-mono' }, a.ka || a.kb || a.kw || a.ka1 || '—'),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, a.strength),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600' }, a.notes)
                  );
                })
              )
            )
          ),
          React.createElement('div', { className: 'mt-3 p-2 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-900' },
            React.createElement('strong', null, __alloT('stem.molecule.ph_scale_2', '💡 pH scale: ')), __alloT('stem.molecule.ph_0_6_acidic_ph_7_neutral_ph_8_14_bas', 'pH 0-6 acidic · pH 7 neutral · pH 8-14 basic. Each unit = 10× change in [H⁺]. Stomach acid pH 1.5, blood pH 7.4, bleach pH 12.')
          )
        );
      }

      function renderQuantumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.quantum_numbers_orbital_identity', '⚛︎ Quantum numbers — orbital identity')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.each_electron_in_an_atom_is_described_', 'Each electron in an atom is described by 4 quantum numbers (n, ℓ, mₗ, mₛ). The Pauli exclusion principle: no two electrons in an atom share all 4.')),
          React.createElement('div', { className: 'grid gap-2' },
            QUANTUM_REF.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, q.n),
                  React.createElement('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 ml-auto font-mono' }, q.range)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed' }, q.means)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 grid grid-cols-4 gap-2 text-center' },
            ['s (ℓ=0)', 'p (ℓ=1)', 'd (ℓ=2)', 'f (ℓ=3)'].map(function(sub, i) {
              var orbitals = [1, 3, 5, 7][i];
              var electrons = orbitals * 2;
              return React.createElement('div', { key: 'o'+i, className: 'p-2 rounded-md bg-indigo-50 border border-indigo-200' },
                React.createElement('div', { className: 'text-xs font-black text-indigo-900' }, sub),
                React.createElement('div', { className: 'text-[10px] text-indigo-700 mt-0.5' }, orbitals + ' orbital' + (orbitals > 1 ? 's' : '')),
                React.createElement('div', { className: 'text-[10px] text-indigo-700' }, 'up to ' + electrons + ' e⁻')
              );
            })
          )
        );
      }

      function renderOrbitalsSection() {
        var h = React.createElement;
        var key = (d2 && d2.orbChoice && ORBITALS[d2.orbChoice]) ? d2.orbChoice : '2p';
        var o = ORBITALS[key];
        var nodes = orbNodes(key);
        var peak = orbPeakRadius(key);
        var subColor = o.sub === 's' ? '#0891b2' : (o.sub === 'p' ? '#7c3aed' : '#d97706');
        // radial-distribution plot P(r)=r²R² (the accessible, rigorous "where is the electron" view)
        var PW = 300, PH = 96, rmax = o.box, N = 140, pmax = 0, vals = [];
        for (var i = 0; i <= N; i++) { var rr = rmax * i / N; var v = orbRadialDistribution(key, rr); vals.push(v); if (v > pmax) pmax = v; }
        if (pmax <= 0) pmax = 1;
        var poly = vals.map(function (v, i) { return (4 + (PW - 8) * i / N).toFixed(1) + ',' + (PH - 6 - (PH - 12) * v / pmax).toFixed(1); }).join(' ');
        // radial nodes = sign changes of R(r) in (0, rmax)
        var radialNodes = [];
        var prev = orbRadial(key, 0.01);
        for (var j = 1; j <= 400; j++) { var r2 = rmax * j / 400; var cur = orbRadial(key, r2); if (prev !== 0 && cur !== 0 && (prev < 0) !== (cur < 0)) radialNodes.push(r2); prev = cur; }
        var BUSTS = [
          { t: 'Orbit → orbital', d: 'Electrons do NOT trace circles. An orbital is a probability CLOUD — a map of where the electron is likely to be, not a path it follows. The Bohr “orbits” are a useful first cartoon, not reality.' },
          { t: 'You can’t watch it go around', d: 'Heisenberg uncertainty: pin down an electron’s position and its momentum becomes undefined. There is no trajectory to film — only odds of finding it here vs. there.' },
          { t: 'Shells = energy levels, not rings', d: 'n is an energy level. The plot shows the electron smeared over a RANGE of distances with a most-probable radius (' + peak.toFixed(1) + ' a₀) — not parked on one fixed circle.' },
          { t: 'Nodes are forbidden zones', d: 'Where ψ = 0 (the colour boundary in the cloud) the electron is NEVER found — ' + nodes.radial + ' radial + ' + nodes.angular + ' angular node' + (nodes.total === 1 ? '' : 's') + ' here. Bizarre for a particle on a path; natural for a wave.' }
        ];
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, __alloT('stem.molecule.orbital_clouds_title', '☁️ Orbital clouds — where electrons really are')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.orbital_clouds_intro', 'An atom is not a tiny solar system. Electrons don’t orbit the nucleus on tracks — they exist as a fuzzy cloud of probability (|ψ|²). The two colours are the wavefunction’s + and − phases; where they meet, the electron is never found (a node).')),
          // orbital picker
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3', role: 'group', 'aria-label': 'Choose an orbital' },
            ORBITAL_ORDER.map(function (k) {
              var on = k === key, oo = ORBITALS[k];
              return h('button', { key: k, type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: function () { try { setExp({ orbChoice: k }); } catch (e) {} try { var lr = document.getElementById('allo-live-molecule'); if (lr) lr.textContent = oo.label + ' orbital: ' + oo.shape + ', ' + (oo.n - oo.l - 1) + ' radial and ' + oo.l + ' angular nodes.'; } catch (e) {} },
                className: 'px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ' + (on ? 'text-white' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'), style: on ? { background: subColor, borderColor: subColor } : {} }, oo.label);
            })),
          h('div', { className: 'text-[10.5px] text-slate-500 leading-snug mb-2 p-2 rounded-lg bg-slate-50 border border-slate-200' }, __alloT('stem.molecule.orbital_caveat', 'These are exact one-electron (hydrogen-like, Z = 1) orbitals. Real multi-electron atoms keep the same shapes but with shifted sizes and energies. Each subshell is a set (3 p’s, 5 d’s — including the differently-shaped d_z²); we show one representative orientation of each.')),
          h('div', { className: 'grid gap-3', style: { gridTemplateColumns: 'minmax(0,260px) minmax(0,1fr)' } },
            // the cloud (canvas) + nucleus
            h('div', null,
              h('canvas', { width: 260, height: 260, key: 'orb-' + key, className: 'rounded-xl border border-slate-700 w-full', style: { background: '#0b1220', display: 'block' },
                role: 'img', 'aria-label': 'Probability cloud of the ' + o.label + ' orbital — shape: ' + o.shape + '. ' + nodes.radial + ' radial nodes, ' + nodes.angular + ' angular nodes. The bar chart beside it gives the same data non-visually.',
                ref: function (canvas) {
                  if (!canvas) return;
                  var cx = canvas.getContext && canvas.getContext('2d'); if (!cx) return;
                  var W = canvas.width, Hh = canvas.height, box = o.box;
                  var maxD = 0, gi; for (gi = 0; gi < 1600; gi++) { var gx = (Math.random() * 2 - 1) * box, gy = (Math.random() * 2 - 1) * box, gz = (Math.random() * 2 - 1) * box; var dd = orbDensity(key, gx, gy, gz); if (dd > maxD) maxD = dd; }
                  if (maxD <= 0) maxD = 1;
                  var pts = [], att = 0; while (pts.length < 2600 && att < 120000) { att++; var ax = (Math.random() * 2 - 1) * box, ay = (Math.random() * 2 - 1) * box, az = (Math.random() * 2 - 1) * box; var ps = orbPsi(key, ax, ay, az); if (ps * ps > Math.random() * maxD) pts.push({ x: ax, y: ay, z: az, s: ps >= 0 ? 1 : -1 }); }
                  var scale = (Math.min(W, Hh) * 0.5) / box * 0.92;
                  var POS = subColor === '#0891b2' ? '#22d3ee' : (subColor === '#7c3aed' ? '#a78bfa' : '#fbbf24'), NEG = '#fb7185';
                  var reduced = false; try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
                  var ang = 0.6;
                  function frame() {
                    if (!canvas.isConnected) return;
                    if (!reduced) ang += 0.006;
                    cx.fillStyle = '#0b1220'; cx.fillRect(0, 0, W, Hh);
                    var ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(0.42), st = Math.sin(0.42), i2;
                    for (i2 = 0; i2 < pts.length; i2++) {
                      var p = pts[i2];
                      var rx = p.x * ca - p.z * sa, rz = p.x * sa + p.z * ca;
                      var ry = p.y * ct - rz * st, depth = p.y * st + rz * ct;
                      var tt = (depth / box + 1) / 2;
                      cx.globalAlpha = 0.16 + 0.5 * (1 - tt);
                      cx.fillStyle = p.s > 0 ? POS : NEG;
                      cx.beginPath(); cx.arc(W / 2 + rx * scale, Hh / 2 - ry * scale, 1.0 + 1.5 * (1 - tt), 0, 6.2832); cx.fill();
                    }
                    cx.globalAlpha = 1; cx.fillStyle = '#fde68a'; cx.beginPath(); cx.arc(W / 2, Hh / 2, 2.4, 0, 6.2832); cx.fill();
                    if (!reduced) requestAnimationFrame(frame);
                  }
                  frame();
                }
              }),
              h('div', { className: 'flex items-center justify-center gap-3 mt-1 text-[10px] text-slate-600' },
                h('span', null, h('span', { 'aria-hidden': 'true', style: { color: subColor } }, '● '), __alloT('stem.molecule.phase_plus', 'ψ > 0 (one phase)')),
                h('span', null, h('span', { 'aria-hidden': 'true', style: { color: '#fb7185' } }, '● '), __alloT('stem.molecule.phase_minus', 'ψ < 0 (other phase)')),
                h('span', null, h('span', { 'aria-hidden': 'true', style: { color: '#fbbf24' } }, '● '), __alloT('stem.molecule.nucleus', 'nucleus')))),
            // info + radial distribution
            h('div', null,
              h('div', { className: 'grid grid-cols-2 gap-1.5 text-[11px] mb-2' },
                h('div', { className: 'p-2 rounded-lg bg-slate-50 border border-slate-200' }, h('div', { className: 'text-slate-500' }, __alloT('stem.molecule.shape', 'Shape')), h('div', { className: 'font-bold text-slate-800' }, o.shape)),
                h('div', { className: 'p-2 rounded-lg bg-slate-50 border border-slate-200' }, h('div', { className: 'text-slate-500' }, __alloT('stem.molecule.most_likely_radius', 'Most-likely radius')), h('div', { className: 'font-bold text-slate-800' }, '≈ ' + peak.toFixed(1) + ' a₀')),
                h('div', { className: 'p-2 rounded-lg bg-slate-50 border border-slate-200' }, h('div', { className: 'text-slate-500' }, __alloT('stem.molecule.radial_nodes', 'Radial nodes')), h('div', { className: 'font-bold text-slate-800' }, String(nodes.radial))),
                h('div', { className: 'p-2 rounded-lg bg-slate-50 border border-slate-200' }, h('div', { className: 'text-slate-500' }, __alloT('stem.molecule.angular_nodes', 'Angular nodes')), h('div', { className: 'font-bold text-slate-800' }, String(nodes.angular)))),
              h('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.radial_distribution', 'Radial distribution P(r) = r²R²')),
              h('svg', { viewBox: '0 0 ' + PW + ' ' + PH, width: '100%', height: PH, role: 'img', 'aria-label': 'Radial probability for the ' + o.label + ' orbital: most likely near ' + peak.toFixed(1) + ' Bohr radii, with ' + nodes.radial + ' radial node' + (nodes.radial === 1 ? '' : 's') + '.', className: 'rounded-lg bg-slate-50 border border-slate-200' },
                radialNodes.map(function (rn, ri) { var xx = 4 + (PW - 8) * (rn / rmax); return h('line', { key: 'rn' + ri, x1: xx, y1: 4, x2: xx, y2: PH - 6, stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.7 }); }),
                h('line', { x1: 4 + (PW - 8) * (peak / rmax), y1: 4, x2: 4 + (PW - 8) * (peak / rmax), y2: PH - 6, stroke: '#10b981', strokeWidth: 1.5, opacity: 0.8 }),
                h('polyline', { points: poly, fill: 'none', stroke: subColor, strokeWidth: 2 })),
              h('div', { className: 'text-[10px] text-slate-500 mt-0.5' }, h('span', { style: { color: '#10b981' } }, '— ' + __alloT('stem.molecule.peak', 'most likely')), '   ', (radialNodes.length ? h('span', { style: { color: '#ef4444' } }, '┊ ' + __alloT('stem.molecule.node', 'node (P = 0)')) : null)))),
          // misconception busts
          h('div', { className: 'grid sm:grid-cols-2 gap-2 mt-3' },
            BUSTS.map(function (b, bi) {
              return h('div', { key: 'b' + bi, className: 'p-2.5 rounded-lg border border-amber-200 bg-amber-50' },
                h('div', { className: 'text-[11.5px] font-black text-amber-900 mb-0.5' }, '⚠ ' + b.t),
                h('div', { className: 'text-[11px] text-amber-900/90 leading-snug' }, b.d));
            }))
        );
      }

      // ── Full content for the remaining sections ──
      var PERIODIC_TRENDS = [
        { trend: 'Atomic radius', across: 'Decreases →', down: 'Increases ↓', why: 'Across: more protons, same shell, stronger pull → atoms shrink. Down: new shells, larger.', example: 'Li > Be > B > C > N > O > F (left to right shrink)' },
        { trend: 'Ionization energy (IE₁)', across: 'Increases →', down: 'Decreases ↓', why: 'Smaller atoms hold electrons tighter (closer to nucleus). Down: outer electrons farther + shielded.', example: 'He highest (2372 kJ/mol); Cs near lowest of stable atoms (376 kJ/mol)' },
        { trend: 'Electronegativity', across: 'Increases →', down: 'Decreases ↓', why: 'Pull on shared electrons. F most electronegative (3.98 Pauling).', example: 'F > O > N ≈ Cl > Br > I (pattern across periods 2-3)' },
        { trend: 'Electron affinity', across: 'Generally increases →', down: 'Generally decreases ↓', why: 'Energy released when atom gains an e⁻. Halogens very negative (eager to gain).', example: 'Cl most exothermic e⁻ gain (~ −349 kJ/mol)' },
        { trend: 'Metallic character', across: 'Decreases →', down: 'Increases ↓', why: 'Easy to lose electrons = metallic. Down a group, IE drops.', example: 'Group 1 all metals; Group 17 all nonmetals; metalloids on diagonal' },
        { trend: 'Atomic mass', across: 'Generally increases →', down: 'Increases ↓', why: 'Adding protons + neutrons. Exceptions where isotope ratios reverse (Te > I, Ar > K).', example: 'H (1.008) < He (4.003) < Li (6.94)... < U (238)' }
      ];

      var PHASE_POINTS = [
        { phase: 'Solid', shape: 'Fixed', volume: 'Fixed', density: 'High', particles: 'Vibrate in place; ordered (crystalline) or amorphous', examples: 'Ice, salt, diamond' },
        { phase: 'Liquid', shape: 'Container', volume: 'Fixed', density: 'High (~ solid)', particles: 'Move freely but stay close; short-range order', examples: 'Water, mercury, alcohol' },
        { phase: 'Gas', shape: 'Container', volume: 'Container', density: 'Very low', particles: 'Move freely + independently; mostly empty space', examples: 'O₂, CO₂, water vapor' },
        { phase: 'Plasma', shape: 'Container', volume: 'Container', density: 'Varies', particles: 'Ionized — electrons separated from nuclei', examples: 'Lightning, stars, fluorescent tubes' },
        { phase: 'BEC (Bose-Einstein)', shape: '—', volume: '—', density: 'Very low', particles: 'Atoms collapse into single quantum state near 0 K', examples: 'Cold atom physics labs (Rb, Na at nK)' }
      ];

      var EQUILIBRIUM_FACTORS = [
        { factor: 'Add reactant', shift: 'Forward (→)', why: 'Q < Keq; system uses extra reactant to make more product.' },
        { factor: 'Add product', shift: 'Reverse (←)', why: 'Q > Keq; system consumes extra product.' },
        { factor: 'Remove product', shift: 'Forward (→)', why: 'Q < Keq; system regenerates product.' },
        { factor: 'Increase T (exothermic rxn)', shift: 'Reverse (←)', why: 'Heat is a "product" of exothermic rxn; adding it shifts away.' },
        { factor: 'Increase T (endothermic rxn)', shift: 'Forward (→)', why: 'Heat is a "reactant" of endothermic rxn; adding it shifts forward.' },
        { factor: 'Decrease volume / ↑P (more gas mol on R)', shift: 'Reverse (←)', why: 'System shifts toward fewer gas moles to reduce pressure.' },
        { factor: 'Decrease volume / ↑P (more gas mol on L)', shift: 'Forward (→)', why: 'System shifts toward fewer gas moles to reduce pressure.' },
        { factor: 'Add catalyst', shift: 'No shift', why: 'Speeds both directions equally; reaches eq faster but doesn\'t change Keq.' },
        { factor: 'Add inert gas at constant V', shift: 'No shift', why: 'Partial pressures of reactants/products unchanged.' }
      ];

      var KINETICS_FACTORS = [
        { factor: 'Concentration', effect: 'Rate ∝ [reactants]^orders', detail: __alloT('stem.molecule.more_molecules_more_collisions_time_de', 'More molecules = more collisions / time. Determined experimentally, not from coefficients.') },
        { factor: 'Temperature', effect: 'Rate roughly doubles per 10°C', detail: __alloT('stem.molecule.higher_t_more_molecules_with_energy_ea', 'Higher T → more molecules with energy ≥ Ea (Maxwell-Boltzmann tail).') },
        { factor: 'Surface area', effect: 'More SA = faster', detail: __alloT('stem.molecule.grinding_solid_reactant_exposes_more_a', 'Grinding solid reactant exposes more atoms to collision. Powder vs chunk.') },
        { factor: 'Catalyst', effect: 'Lowers Ea, faster', detail: __alloT('stem.molecule.provides_alternate_pathway_not_consume', 'Provides alternate pathway. Not consumed. Enzymes are catalysts (often >10⁶× faster).') },
        { factor: 'Pressure (gas)', effect: 'Higher P = faster (gas)', detail: __alloT('stem.molecule.same_as_concentration_more_molecules_p', 'Same as concentration: more molecules per unit volume.') },
        { factor: 'Solvent / medium', effect: 'Polarity matches → faster', detail: __alloT('stem.molecule.like_dissolves_like_solvent_can_stabil', '"Like dissolves like." Solvent can stabilize transition state.') },
        { factor: 'Light (photochemistry)', effect: 'Adds energy', detail: __alloT('stem.molecule.some_rxns_need_photons_photosynthesis_', 'Some rxns need photons (photosynthesis, photographic film, UV-driven).') }
      ];

      var THERMO_KEY = [
        { sym: 'ΔH', name: __alloT('stem.molecule.enthalpy_change', 'Enthalpy change'), sign: 'Negative = exothermic (heat released to surroundings); positive = endothermic (heat absorbed)', units: 'kJ/mol' },
        { sym: 'ΔS', name: __alloT('stem.molecule.entropy_change', 'Entropy change'), sign: 'Positive = more disorder; negative = more order. Gas > liquid > solid.', units: 'J/(mol·K)' },
        { sym: 'ΔG', name: __alloT('stem.molecule.gibbs_free_energy', 'Gibbs free energy'), sign: 'Negative = spontaneous; positive = non-spontaneous; zero = at equilibrium.', units: 'kJ/mol' },
        { sym: 'T', name: __alloT('stem.molecule.temperature', 'Temperature'), sign: 'Absolute (Kelvin). Multiplies entropy term — high T amplifies ΔS importance.', units: 'K' },
        { sym: 'Ea', name: __alloT('stem.molecule.activation_energy', 'Activation energy'), sign: 'Always positive. Barrier between reactants and products. Lower = faster.', units: 'kJ/mol' },
        { sym: 'K', name: __alloT('stem.molecule.equilibrium_constant', 'Equilibrium constant'), sign: 'K >> 1: products favored. K << 1: reactants favored. K = exp(−ΔG°/RT).', units: 'unitless' }
      ];

      var POLYMER_TYPES = [
        { name: __alloT('stem.molecule.polyethylene_pe', 'Polyethylene (PE)'), monomer: 'CH₂=CH₂', type: 'Addition', uses: 'Plastic bags, bottles, packaging. ~150M tons/year.', notes: 'LDPE (low density, branched) vs HDPE (high density, linear).' },
        { name: __alloT('stem.molecule.polypropylene_pp', 'Polypropylene (PP)'), monomer: 'CH₂=CHCH₃', type: 'Addition', uses: 'Yogurt cups, carpet fibers, car parts. Higher melting (160°C) than PE.', notes: 'Isotactic / atactic / syndiotactic configurations.' },
        { name: 'PVC', monomer: 'CH₂=CHCl', type: 'Addition', uses: 'Pipes, vinyl flooring, insulation. Often plasticized.', notes: 'Burning releases HCl + dioxins — recycling concern.' },
        { name: __alloT('stem.molecule.polystyrene_ps', 'Polystyrene (PS)'), monomer: 'CH₂=CHC₆H₅', type: 'Addition', uses: 'Disposable cups, packaging foam (Styrofoam).', notes: 'Hard + brittle. Slow biodegradation.' },
        { name: 'PET', monomer: 'terephthalic acid + ethylene glycol', type: 'Condensation', uses: 'Beverage bottles, polyester fiber, food packaging.', notes: 'Recyclable (#1); most widely recycled plastic.' },
        { name: 'Nylon-6,6', monomer: 'adipic acid + hexamethylenediamine', type: 'Condensation', uses: 'Stockings, ropes, fishing line, parachutes.', notes: 'Wallace Carothers, DuPont, 1935.' },
        { name: __alloT('stem.molecule.kevlar', 'Kevlar'), monomer: 'p-phenylenediamine + terephthaloyl chloride', type: 'Condensation', uses: 'Body armor, bicycle tires, aerospace.', notes: 'Aromatic polyamide; ring stacking gives extreme strength.' },
        { name: __alloT('stem.molecule.polylactic_acid_pla', 'Polylactic acid (PLA)'), monomer: 'lactic acid', type: 'Condensation', uses: '3D printing filament, biodegradable packaging.', notes: 'Made from corn starch / sugarcane. Compostable in industrial facilities.' },
        { name: __alloT('stem.molecule.silicone', 'Silicone'), monomer: 'siloxane (Si-O backbone)', type: 'Condensation', uses: 'Medical implants, cookware, sealants, lubricants.', notes: 'Inorganic backbone — heat + UV resistant.' },
        { name: __alloT('stem.molecule.rubber_natural', 'Rubber (natural)'), monomer: 'isoprene', type: 'Addition', uses: 'Tires, gloves, elastic bands.', notes: 'Vulcanization with sulfur cross-links chains → harder, more elastic.' }
      ];

      var BIOPOLYMER_TYPES = [
        { name: __alloT('stem.molecule.proteins', 'Proteins'), monomer: '20 amino acids', bond: 'Peptide bond (CO-NH)', role: 'Structure (collagen), catalysis (enzymes), transport (hemoglobin), signaling (hormones), immunity (antibodies).' },
        { name: __alloT('stem.molecule.dna_rna', 'DNA / RNA'), monomer: 'nucleotides (base + sugar + phosphate)', bond: 'Phosphodiester', role: 'Genetic information storage + transfer. Double helix (DNA) / single strand (RNA).' },
        { name: __alloT('stem.molecule.polysaccharides', 'Polysaccharides'), monomer: 'monosaccharides (glucose, fructose)', bond: 'Glycosidic', role: 'Energy storage (starch, glycogen), structure (cellulose, chitin).' },
        { name: __alloT('stem.molecule.lipids_fats', 'Lipids (fats)'), monomer: 'glycerol + fatty acids (not strictly polymer)', bond: 'Ester', role: 'Energy storage, membranes (phospholipid bilayer), signaling, insulation.' }
      ];

      var LAB_SAFETY = [
        { cat: 'PPE (always)', items: ['Splash goggles (full coverage, not just safety glasses)', 'Lab coat or apron (closed front)', 'Closed-toe shoes (no sandals)', 'Long pants', 'Long hair tied back', 'Nitrile gloves for chemicals (latex for water-only work OK)'] },
        { cat: 'Acid + base handling', items: ['ALWAYS add acid TO water (never water TO acid)', 'Wash any spill immediately with copious water', 'Strong base spills feel slippery — that\'s saponification of your skin oils', 'Concentrated HF: special protocol — calcium gluconate gel nearby'] },
        { cat: 'Heat + flame', items: ['Bunsen burner: blue cone is hottest (~1500°C)', 'Never heat sealed container — explosion risk', 'Tongs / mitts for hot glassware', 'Allow glassware to cool before handling', 'Hot glass looks identical to cold glass'] },
        { cat: 'Glassware', items: ['Inspect for chips before use (broken edge = hand cut)', 'Don\'t force a stopper — use glycerin or twist gently', 'Pyrex / borosilicate handles thermal shock; common glass cracks', 'Broken glass goes in dedicated bin, not regular trash'] },
        { cat: 'Pipettes + volumetric', items: ['NEVER mouth-pipette (use bulb or pipette aid)', 'Read meniscus at eye level — bottom of curve for liquids that wet glass (water); top of curve for mercury', 'Volumetric flask: precise to "to contain" or "to deliver" marking'] },
        { cat: 'Fume hood', items: ['Use for: volatile organics, halogenated solvents, anything noxious', 'Sash low for protection', 'Don\'t store stuff inside — disrupts airflow', 'Check airflow indicator before starting'] },
        { cat: 'Reactive combinations', items: ['Strong oxidizer + organic = fire (chlorate + sugar, peroxide + alcohol)', 'Acid + bleach = chlorine gas (toxic)', 'Ammonia + bleach = chloramine gas (toxic)', 'Alkali metals (Na, K) + water = hydrogen gas + heat (can ignite)', 'Mercury + aluminum = aluminum amalgam (extreme corrosion of Al)'] },
        { cat: 'Emergency response', items: ['Eyewash within 10 seconds of any chemical station — 15 minutes of flushing for eye exposure', 'Safety shower nearby for chemical body spills', 'Fire blanket for clothing fires (drop + roll if no blanket)', 'Know location of nearest fire extinguisher + first-aid kit', 'Spill kits for acids / bases / organics — different absorbents'] },
        { cat: 'Documentation', items: ['Lab notebook in pen (no pencil)', 'Date every entry', 'Hazard codes on bottles (NFPA diamond)', 'MSDS / SDS for every chemical you use — read BEFORE using', 'Inventory current chemicals; segregate by hazard class'] }
      ];

      var GLOSSARY = [
        { term: 'Mole', def: 'Amount of substance containing 6.022 × 10²³ particles (Avogadro\'s number). Bridges atomic-scale to lab-scale.' },
        { term: 'Molar mass', def: 'Mass of one mole of a substance, in g/mol. Numerically equal to atomic/molecular mass in amu.' },
        { term: 'Avogadro\'s number', def: '6.022 × 10²³ — particles per mole. SI redefinition (2019) made it exact.' },
        { term: 'Atomic mass unit (amu / u)', def: 'Defined as 1/12 the mass of a ¹²C atom. ≈ 1.661 × 10⁻²⁴ g.' },
        { term: 'STP', def: 'Standard Temperature + Pressure. IUPAC: 0°C (273.15 K) + 100 kPa. Older: 0°C + 1 atm.' },
        { term: 'NTP', def: 'Normal Temperature + Pressure. 20°C + 1 atm. Used for room-temp gas calculations.' },
        { term: 'Ideal gas', def: 'PV = nRT. Approximation: no intermolecular forces, point particles. Good for low P, high T, non-polar molecules.' },
        { term: 'Real gas', def: 'Van der Waals: (P + a(n/V)²)(V − nb) = nRT. Accounts for IMF (a) and molecular volume (b).' },
        { term: 'Activation energy (Ea)', def: 'Minimum collision energy required for a reaction to proceed. Lower Ea = faster reaction.' },
        { term: 'Catalyst', def: 'Substance that speeds reaction without being consumed. Provides alternate lower-Ea pathway.' },
        { term: 'Allotrope', def: 'Different structural form of an element. O₂ vs O₃ vs O₄. Diamond vs graphite vs graphene vs C₆₀.' },
        { term: 'Isotope', def: 'Atoms of same element with different number of neutrons. Same chemistry, different mass + nuclear properties.' },
        { term: 'Ion', def: 'Atom or molecule with net charge from electron gain/loss. Cation (+), anion (−).' },
        { term: 'Electronegativity', def: 'Atom\'s ability to attract shared electrons in a bond. Pauling scale 0.7 (Cs) to 3.98 (F).' },
        { term: 'Hybrid orbital', def: 'Mixed atomic orbitals (sp, sp², sp³, sp³d, sp³d²) that explain observed bond angles.' },
        { term: 'Resonance structure', def: 'Two or more Lewis structures with same atom positions but different electron distributions. Actual structure is the average.' },
        { term: 'Functional group', def: 'Group of atoms responsible for characteristic reactivity (e.g., -OH alcohol, -COOH carboxylic acid, -NH₂ amine).' },
        { term: 'Chiral center', def: 'Atom (usually C) bonded to four different groups. Gives rise to optical isomers (enantiomers).' },
        { term: 'Stoichiometry', def: 'Quantitative relationships in chemical reactions, derived from balanced equation coefficients.' },
        { term: 'Limiting reactant', def: 'Reactant consumed first; determines maximum product. Calculate by dividing moles of each reactant by its coefficient — smallest wins.' },
        { term: 'Yield', def: 'Actual / theoretical × 100%. Real reactions never reach 100% due to side reactions, incomplete reactions, losses.' },
        { term: 'Buffer', def: 'Weak acid + conjugate base (or vice versa) that resists pH change when small amounts of acid/base added. Henderson-Hasselbalch: pH = pKa + log([A⁻]/[HA]).' }
      ];

      function renderPeriodicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.periodic_trends_2', '📊 Periodic trends')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.patterns_in_element_properties_that_fo', 'Patterns in element properties that follow position on the periodic table. Driven by effective nuclear charge (Zeff) — the net pull on outermost electrons after inner electrons shield them.')),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            PERIODIC_TRENDS.map(function(t, i) {
              return React.createElement('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-sm font-black text-slate-800 mb-1' }, t.trend),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-1' },
                  React.createElement('div', { className: 'text-[11px] px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900' },
                    React.createElement('strong', null, __alloT('stem.molecule.across_period', 'Across period: ')), t.across),
                  React.createElement('div', { className: 'text-[11px] px-2 py-1 rounded bg-purple-50 border border-purple-200 text-purple-900' },
                    React.createElement('strong', null, __alloT('stem.molecule.down_group', 'Down group: ')), t.down)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Why: '), t.why),
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic' }, 'Example: ', t.example)
              );
            })
          ),
          React.createElement('div', { className: 'p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            React.createElement('strong', null, __alloT('stem.molecule.diagonal_relationship', '💡 Diagonal relationship: ')), __alloT('stem.molecule.li_mg_be_al_b_si_pairs_across_a_diagon', 'Li-Mg, Be-Al, B-Si — pairs across a diagonal share similar properties because the increases in size + charge offset.')
          )
        );
      }

      function renderMolaritySection() {
        var c = d2.molM || '';
        var v = d2.molV || '';
        var mw = d2.molMW || '';
        var grams = (parseFloat(c) || 0) * (parseFloat(v) || 0) * (parseFloat(mw) || 0);
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.molarity_dilution_calculator', '🧮 Molarity + dilution calculator')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.molarity_m_moles_of_solute_per_liter_o', 'Molarity (M) = moles of solute per liter of solution. To prepare a target molarity: weigh out (M × V × MW) grams of solute, dissolve in less than the final volume, then dilute to the mark.')),
          React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.molarity_m_mol_l', 'Molarity (M, mol/L)')),
              React.createElement('input', { type: 'number', step: 0.01, value: c, onChange: function(e) { setExp({ molM: e.target.value }); }, className: 'w-full px-2 py-1 border border-slate-300 rounded text-[12px]', placeholder: '0.1' })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.volume_l', 'Volume (L)')),
              React.createElement('input', { type: 'number', step: 0.01, value: v, onChange: function(e) { setExp({ molV: e.target.value }); }, className: 'w-full px-2 py-1 border border-slate-300 rounded text-[12px]', placeholder: '1.0' })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.molecular_weight_g_mol', 'Molecular weight (g/mol)')),
              React.createElement('input', { type: 'number', step: 0.01, value: mw, onChange: function(e) { setExp({ molMW: e.target.value }); }, className: 'w-full px-2 py-1 border border-slate-300 rounded text-[12px]', placeholder: __alloT('stem.molecule.58_44_nacl', '58.44 (NaCl)') })
            )
          ),
          React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border-2 border-indigo-300 text-center mb-3' },
            React.createElement('div', { className: 'text-[10px] font-bold text-indigo-700 uppercase tracking-wide' }, __alloT('stem.molecule.grams_of_solute_needed', 'Grams of solute needed')),
            React.createElement('div', { className: 'text-2xl font-black text-indigo-900 mt-1 font-mono tracking-tight' }, grams.toFixed(4) + ' g')
          ),
          React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed space-y-1' },
            React.createElement('div', null, React.createElement('strong', null, 'Dilution: '), __alloT('stem.molecule.m_v_m_v_solve_for_whichever_is_unknown', 'M₁V₁ = M₂V₂. Solve for whichever is unknown.')),
            React.createElement('div', null, React.createElement('strong', null, __alloT('stem.molecule.serial_dilution', 'Serial dilution: ')), __alloT('stem.molecule.for_very_low_concentrations_dilute_1_1', 'For very low concentrations, dilute 1:10 (or 1:100) repeatedly. Each step is precise; cumulative error stays small.')),
            React.createElement('div', null, React.createElement('strong', null, __alloT('stem.molecule.watch_out', 'Watch out: ')), __alloT('stem.molecule.add_half_the_water_first_then_add_solu', 'Add ~half the water FIRST, then add solute + stir until dissolved, THEN top up to the mark. Adding solute to full-volume water often gives wrong final volume due to volume changes during dissolution.'))
          )
        );
      }

      function renderStoichSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.stoichiometry_recipe_math', '⚖ Stoichiometry — recipe math')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.balanced_equation_mole_ratio_like_a_co', 'Balanced equation → mole ratio. Like a cooking recipe, but for atoms. Coefficients tell you the ratio of reactant moles to product moles.')),
          React.createElement('div', { className: 'space-y-2' },
            [
              { step: '1. Balance the equation', detail: __alloT('stem.molecule.atoms_in_atoms_out_on_each_side_balanc', 'Atoms in = atoms out, on each side. Balance metals first, then non-O/H atoms, then O and H last. Charge balanced for ionic equations.') },
              { step: '2. Identify mole ratios', detail: __alloT('stem.molecule.from_coefficients_2_h_1_o_2_h_o_means_', 'From coefficients: 2 H₂ + 1 O₂ → 2 H₂O means 2 mol H₂ : 1 mol O₂ : 2 mol H₂O.') },
              { step: '3. Convert grams ↔ moles', detail: __alloT('stem.molecule.mol_g_molar_mass_always_work_in_moles_', 'mol = g / molar mass. Always work in moles when comparing across the equation.') },
              { step: '4. Find limiting reactant', detail: __alloT('stem.molecule.for_each_reactant_moles_available_coef', 'For each reactant: (moles available) / (coefficient). Smallest result = limiting reactant.') },
              { step: '5. Calculate theoretical yield', detail: __alloT('stem.molecule.use_limiting_reactant_s_moles_product_', 'Use limiting reactant\'s moles × (product coefficient / limiting coefficient) × product MW.') },
              { step: '6. Calculate % yield', detail: __alloT('stem.molecule.actual_theoretical_100_real_reactions_', 'Actual / Theoretical × 100. Real reactions rarely hit 100% — losses to side reactions, incomplete rxn, transfer losses.') }
            ].map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'flex gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-sm font-black text-indigo-700 min-w-[18px]' }, (i + 1)),
                React.createElement('div', null,
                  React.createElement('div', { className: 'text-[12px] font-bold text-slate-800' }, s.step),
                  React.createElement('div', { className: 'text-[11px] text-slate-700 mt-0.5' }, s.detail)
                )
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200' },
            React.createElement('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, __alloT('stem.molecule.worked_example', '🔢 Worked example')),
            React.createElement('div', { className: 'text-[12px] text-emerald-900 font-mono leading-relaxed' },
              __alloT('stem.molecule.n_3_h_2_nh', 'N₂ + 3 H₂ → 2 NH₃'), React.createElement('br'),
              __alloT('stem.molecule.28_g_n_6_g_h_g_nh', '28 g N₂ + 6 g H₂ → ? g NH₃'), React.createElement('br'),
              __alloT('stem.molecule.1_00_mol_n_3_00_mol_h', '1.00 mol N₂ + 3.00 mol H₂'), React.createElement('br'),
              __alloT('stem.molecule.ratio_n_1_1_00_h_3_1_00_tie_neither_li', 'Ratio: N₂/1 = 1.00; H₂/3 = 1.00 → tie, neither limits'), React.createElement('br'),
              __alloT('stem.molecule.2_00_mol_nh_17_03_g_mol_34_06_g_theore', '→ 2.00 mol NH₃ × 17.03 g/mol = 34.06 g (theoretical)')
            )
          )
        );
      }

      function renderPhaseSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.phases_of_matter_phase_diagrams', '🧊 Phases of matter + phase diagrams')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.a_phase_diagram_plots_phase_boundaries', 'A phase diagram plots phase boundaries on a P (pressure) vs T (temperature) graph. Lines = phase transitions. Triple point: all three phases coexist. Critical point: liquid + gas become indistinguishable (supercritical fluid).')),
          React.createElement('div', { className: 'overflow-x-auto mb-3' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Phase', 'Shape', 'Volume', 'Density', 'Particles', 'Examples'].map(function(h, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, h);
                  })
                )
              ),
              React.createElement('tbody', null,
                PHASE_POINTS.map(function(p, i) {
                  return React.createElement('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 text-slate-800 font-bold' }, p.phase),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.shape),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.volume),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.density),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.particles),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 italic' }, p.examples)
                  );
                })
              )
            )
          ),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'p-2.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-900' },
              React.createElement('strong', null, __alloT('stem.molecule.water_is_unusual', '💧 Water is unusual: ')), __alloT('stem.molecule.ice_is_less_dense_than_liquid_water_ic', 'Ice is LESS dense than liquid water (ice floats). Most substances: solid denser than liquid. Hydrogen bonding gives ice its open crystal structure.')
            ),
            React.createElement('div', { className: 'p-2.5 rounded-md bg-purple-50 border border-purple-200 text-[11px] text-purple-900' },
              React.createElement('strong', null, __alloT('stem.molecule.sublimation', '🌬 Sublimation: ')), __alloT('stem.molecule.solid_gas_without_going_through_liquid', 'Solid → gas without going through liquid (CO₂ dry ice; iodine at room temp). Reverse: deposition.')
            )
          )
        );
      }

      function renderEquilibriumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.chemical_equilibrium_le_chatelier', '⇌ Chemical equilibrium + Le Chatelier')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.reversible_reactions_reach_dynamic_equ', 'Reversible reactions reach dynamic equilibrium when forward rate = reverse rate. Concentrations stop changing (but reactions keep going both ways). Keq = product of [products]^coefficients / product of [reactants]^coefficients.')),
          React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-300 mb-3' },
            React.createElement('div', { className: 'text-[11px] font-bold text-indigo-800 mb-1' }, __alloT('stem.molecule.le_chatelier_s_principle', 'Le Chatelier\'s principle')),
            React.createElement('div', { className: 'text-[12px] text-indigo-900 leading-relaxed' }, __alloT('stem.molecule.if_a_stress_is_applied_to_a_system_at_', 'If a stress is applied to a system at equilibrium, the system shifts to relieve that stress. Predict the direction of shift to make sense of how rxns respond to changes.'))
          ),
          React.createElement('div', { className: 'space-y-1.5' },
            EQUILIBRIUM_FACTORS.map(function(f, i) {
              return React.createElement('div', { key: 'eq'+i, className: 'flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-bold text-slate-700 min-w-[200px]' }, f.factor),
                React.createElement('div', { className: 'text-[11px] font-black text-indigo-700 min-w-[110px] font-mono' }, f.shift),
                React.createElement('div', { className: 'text-[11px] text-slate-600 flex-1' }, f.why)
              );
            })
          )
        );
      }

      function renderKineticsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.reaction_kinetics_what_controls_speed', '⏱ Reaction kinetics — what controls speed')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.kinetics_how_fast_thermodynamics_wheth', 'Kinetics = how fast. Thermodynamics = whether possible. A reaction can be very favorable (large negative ΔG) but slow (high Ea). Catalysts and conditions tune kinetics.')),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            KINETICS_FACTORS.map(function(k, i) {
              return React.createElement('div', { key: 'k'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline justify-between mb-1' },
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, k.factor),
                  React.createElement('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800' }, k.effect)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, k.detail)
              );
            })
          ),
          React.createElement('div', { className: 'p-3 rounded-md bg-emerald-50 border border-emerald-200' },
            React.createElement('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, __alloT('stem.molecule.arrhenius_equation', '📐 Arrhenius equation')),
            React.createElement('div', { className: 'text-[12px] text-emerald-900 font-mono leading-relaxed mb-1' }, __alloT('stem.molecule.k_a_exp_ea_rt', 'k = A · exp(−Ea / RT)')),
            React.createElement('div', { className: 'text-[11px] text-emerald-800 leading-relaxed' },
              __alloT('stem.molecule.k_rate_constant_a_collision_frequency_', 'k = rate constant · A = collision frequency factor · Ea = activation energy · R = 8.314 J/(mol·K) · T = absolute temperature (K). Plot ln(k) vs 1/T; slope = −Ea/R.')
            )
          )
        );
      }

      function renderThermoSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.thermodynamics_what_s_spontaneous', '🔥 Thermodynamics — what\'s spontaneous')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.spontaneity_whether_a_reaction_proceed', 'Spontaneity = whether a reaction proceeds on its own (regardless of speed). Gibbs free energy ΔG tells us: negative = spontaneous; positive = not; zero = at equilibrium.')),
          React.createElement('div', { className: 'p-3 rounded-lg bg-orange-50 border-2 border-orange-300 mb-3 text-center' },
            React.createElement('div', { className: 'text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1' }, __alloT('stem.molecule.master_equation', 'Master equation')),
            React.createElement('div', { className: 'text-2xl font-black text-orange-900 font-mono tracking-tight' }, __alloT('stem.molecule.g_h_t_s', 'ΔG = ΔH − TΔS'))
          ),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            THERMO_KEY.map(function(t, i) {
              return React.createElement('div', { key: 'th'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-sm font-black text-slate-800 font-mono' }, t.sym),
                  React.createElement('span', { className: 'text-[12px] font-bold text-slate-700' }, t.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto' }, t.units)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.sign)
              );
            })
          ),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'p-2.5 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-900' },
              React.createElement('strong', null, __alloT('stem.molecule.exothermic_h_0', '🔥 Exothermic (ΔH < 0): ')), __alloT('stem.molecule.combustion_neutralization_condensation', 'Combustion, neutralization, condensation. Heat released to surroundings.')
            ),
            React.createElement('div', { className: 'p-2.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-900' },
              React.createElement('strong', null, __alloT('stem.molecule.endothermic_h_0', '🧊 Endothermic (ΔH > 0): ')), __alloT('stem.molecule.photosynthesis_melting_evaporation_col', 'Photosynthesis, melting, evaporation, cold packs. Heat absorbed from surroundings.')
            )
          )
        );
      }

      function renderPolymersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.polymers_biopolymers', '🧬 Polymers + biopolymers')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.long_chains_of_repeating_units_monomer', 'Long chains of repeating units (monomers). Addition polymers form by C=C double bonds opening up. Condensation polymers form by losing water (or other small molecule) at each link.')),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-800 mt-2 mb-1' }, __alloT('stem.molecule.synthetic_polymers', 'Synthetic polymers')),
          React.createElement('div', { className: 'space-y-1.5 mb-3' },
            POLYMER_TYPES.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-2 rounded-md bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, p.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800' }, p.type),
                  React.createElement('span', { className: 'text-[10px] font-mono text-slate-600 ml-auto' }, p.monomer)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-0.5' }, p.uses),
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic' }, p.notes)
              );
            })
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-800 mt-3 mb-1' }, __alloT('stem.molecule.biopolymers_biological_macromolecules', 'Biopolymers (biological macromolecules)')),
          React.createElement('div', { className: 'space-y-1.5' },
            BIOPOLYMER_TYPES.map(function(p, i) {
              return React.createElement('div', { key: 'b'+i, className: 'p-2 rounded-md bg-emerald-50 border border-emerald-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-[12px] font-black text-emerald-900' }, p.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800 ml-auto' }, p.bond)
                ),
                React.createElement('div', { className: 'text-[11px] text-emerald-800 mb-0.5' }, React.createElement('strong', null, 'Monomer: '), p.monomer),
                React.createElement('div', { className: 'text-[11px] text-emerald-900' }, p.role)
              );
            })
          )
        );
      }

      function renderSafetySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.lab_safety_basics', '🦺 Lab safety basics')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.most_lab_accidents_are_preventable_the', 'Most lab accidents are preventable. The biggest factors: PPE, attention, and not mixing things that shouldn\'t mix. Always read the SDS (Safety Data Sheet) for each chemical before using it.')),
          React.createElement('div', { className: 'space-y-2' },
            LAB_SAFETY.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-amber-50 border border-amber-300' },
                React.createElement('div', { className: 'text-[12px] font-black text-amber-900 mb-1.5' }, s.cat),
                React.createElement('ul', { className: 'text-[11px] text-amber-900 leading-relaxed space-y-0.5 list-disc pl-4' },
                  s.items.map(function(item, j) {
                    return React.createElement('li', { key: 'i'+j }, item);
                  })
                )
              );
            })
          )
        );
      }

      // ── Cycle 3 of the inquiry-learning study: Hypothesis Competition + FORCED commitment ──
      // Tests H5: enforcing "predict before reveal" makes MCQ-style inquiry score higher
      // than the same content with optional reveal. The reveal button is disabled until the
      // learner has both picked an answer AND ticked at least one supporting evidence chip.
      var BOND_CASES = [
        {
          id: 'c1',
          alias: 'Compound α',
          data: { mp: 801, conductMolten: 'high', conductSolid: 'none', solubility: 'high in water', appearance: 'white crystalline solid' },
          correct: 'ionic',
          principles: 'Very high melting point + conducts only when molten (free ions) + dissolves in polar solvent → classic ionic. This is sodium chloride (NaCl).',
          evidenceKeys: ['mp', 'conductMolten', 'conductSolid', 'solubility']
        },
        {
          id: 'c2',
          alias: 'Compound β',
          data: { mp: -114, conductMolten: 'none', conductSolid: 'none', solubility: 'miscible with water', appearance: 'colorless liquid' },
          correct: 'covalent_hbonded',
          principles: 'Low melting point + no conductivity in any phase + dissolves in water → polar covalent. The unusually high boiling point (vs other small molecules) hints at hydrogen bonding. This is ethanol (C₂H₅OH).',
          evidenceKeys: ['mp', 'conductMolten', 'conductSolid', 'solubility']
        },
        {
          id: 'c3',
          alias: 'Compound γ',
          data: { mp: 1085, conductMolten: 'high', conductSolid: 'high', solubility: 'insoluble in water', appearance: 'reddish-orange lustrous solid, malleable' },
          correct: 'metallic',
          principles: 'High melting point + conducts in BOTH solid and molten states + insoluble in water + lustrous and malleable → metallic bonding (delocalized electron sea). This is copper.',
          evidenceKeys: ['mp', 'conductMolten', 'conductSolid', 'appearance']
        }
      ];

      var BOND_OPTIONS = [
        { id: 'ionic', label: __alloT('stem.molecule.ionic_2', 'Ionic') },
        { id: 'covalent_hbonded', label: __alloT('stem.molecule.covalent_polar_h_bonded', 'Covalent (polar / H-bonded)') },
        { id: 'covalent_nonpolar', label: __alloT('stem.molecule.covalent_nonpolar_molecular', 'Covalent (nonpolar molecular)') },
        { id: 'metallic', label: __alloT('stem.molecule.metallic_2', 'Metallic') },
        { id: 'network_covalent', label: __alloT('stem.molecule.network_covalent', 'Network covalent') }
      ];

      var EVIDENCE_LABELS = {
        mp: 'Melting point',
        conductMolten: 'Conductivity (molten)',
        conductSolid: 'Conductivity (solid)',
        solubility: 'Water solubility',
        appearance: 'Appearance / malleability'
      };

      function renderBondMysterySection() {
        var state = d2.bondMystery || { cases: {}, score: 0 };
        function setBM(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.molecule) || {};
            var st = Object.assign({}, prior.bondMystery || state, patch);
            return Object.assign({}, prev, { molecule: Object.assign({}, prior, { bondMystery: st }) });
          });
        }
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, __alloT('stem.molecule.bond_detective_2', '🔬 Bond detective')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            __alloT('stem.molecule.three_unknown_compounds_study_the_data', 'Three unknown compounds. Study the data, pick the most likely bond type, AND check which pieces of evidence convinced you. The "Reveal" button only enables once you\'ve committed to both — no peeking, no hedging.')),
          BOND_CASES.map(function(c, idx) {
            var st = state.cases[c.id] || { pick: null, evidence: {}, revealed: false };
            var evidenceCount = Object.keys(st.evidence || {}).filter(function(k) { return st.evidence[k]; }).length;
            var canReveal = st.pick != null && evidenceCount >= 1 && !st.revealed;
            var isCorrect = st.revealed && st.pick === c.correct;
            return React.createElement('div', { key: c.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              React.createElement('div', { className: 'flex items-baseline gap-2 mb-2' },
                React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 font-bold' }, '#' + (idx + 1)),
                React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, c.alias)
              ),
              React.createElement('table', { className: 'text-[11px] w-full border-collapse mb-2' },
                React.createElement('tbody', null,
                  Object.keys(c.data).map(function(k) {
                    return React.createElement('tr', { key: k, className: 'border-b border-slate-200' },
                      React.createElement('td', { className: 'py-1 pr-2 font-bold text-slate-600 w-1/3' }, EVIDENCE_LABELS[k]),
                      React.createElement('td', { className: 'py-1 font-mono text-slate-800' }, String(c.data[k]))
                    );
                  })
                )
              ),
              // Bond-type picker
              React.createElement('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.your_hypothesis_bond_type', 'Your hypothesis (bond type):')),
              React.createElement('div', { className: 'flex flex-wrap gap-1 mb-2' },
                BOND_OPTIONS.map(function(opt) {
                  var picked = st.pick === opt.id;
                  var revealed = st.revealed;
                  var correct = opt.id === c.correct;
                  var bg = revealed
                    ? (correct ? 'bg-green-600 text-white border-green-700' : (picked ? 'bg-red-100 text-red-800 border-red-300 line-through' : 'bg-white text-slate-500 border-slate-200'))
                    : (picked ? 'bg-indigo-200 text-indigo-900 border-indigo-400' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 active:scale-[0.97]');
                  return React.createElement('button', {
                    key: opt.id,
                    disabled: revealed,
                    onClick: function() {
                      var newCases = Object.assign({}, state.cases);
                      newCases[c.id] = Object.assign({}, st, { pick: opt.id });
                      setBM({ cases: newCases });
                    },
                    'aria-pressed': picked ? 'true' : 'false',
                    className: 'px-2 py-1 rounded text-[11px] font-bold border transition-colors focus:ring-2 focus:ring-indigo-400 focus:outline-none ' + bg
                  }, opt.label);
                })
              ),
              // Evidence picker
              React.createElement('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.which_evidence_convinced_you_at_least_', 'Which evidence convinced you? (at least 1)')),
              React.createElement('div', { className: 'flex flex-wrap gap-1 mb-2' },
                c.evidenceKeys.map(function(ek) {
                  var checked = !!(st.evidence || {})[ek];
                  return React.createElement('label', {
                    key: ek,
                    className: 'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border cursor-pointer transition-colors ' +
                      (checked ? 'bg-amber-200 text-amber-900 border-amber-400' : 'transition-colors bg-white text-slate-600 border-slate-300 hover:bg-amber-50 active:scale-[0.97]')
                  },
                    React.createElement('input', {
                      type: 'checkbox',
                      'aria-label': EVIDENCE_LABELS[ek],
                      checked: checked,
                      disabled: st.revealed,
                      onChange: function(e) {
                        var newEv = Object.assign({}, st.evidence || {});
                        newEv[ek] = e.target.checked;
                        var newCases = Object.assign({}, state.cases);
                        newCases[c.id] = Object.assign({}, st, { evidence: newEv });
                        setBM({ cases: newCases });
                      },
                      className: 'w-3 h-3'
                    }),
                    EVIDENCE_LABELS[ek]
                  );
                })
              ),
              // Reveal button — DISABLED until commitment is complete (H5 mechanic)
              React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement('button', {
                  disabled: !canReveal,
                  onClick: function() {
                    var newCases = Object.assign({}, state.cases);
                    newCases[c.id] = Object.assign({}, st, { revealed: true });
                    var bonus = st.pick === c.correct ? 1 : 0;
                    setBM({ cases: newCases, score: (state.score || 0) + bonus });
                  },
                  className: 'transition-colors px-3 py-1 rounded text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-400 focus:outline-none active:scale-[0.97]'
                }, st.revealed ? '✓ Revealed' : 'Reveal answer'),
                !canReveal && !st.revealed && React.createElement('span', { className: 'text-[10px] text-slate-500 italic' },
                  st.pick == null ? 'Pick a bond type first' : 'Tick at least one evidence checkbox'
                ),
                st.revealed && React.createElement('span', { className: 'text-[11px] font-bold ' + (isCorrect ? 'text-green-700' : 'text-rose-700') },
                  isCorrect ? '✓ Correct!' : '✗ Re-read the principles below'
                )
              ),
              st.revealed && React.createElement('div', { className: 'mt-2 p-2 rounded bg-indigo-50 border-l-4 border-l-indigo-400 text-[11px] text-slate-700 leading-relaxed' },
                React.createElement('strong', { className: 'text-indigo-900' }, 'Principles: '), c.principles
              )
            );
          }),
          React.createElement('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2' },
            React.createElement('span', null, '🎯'),
            React.createElement('strong', null, 'Score: ' + (state.score || 0) + ' / ' + BOND_CASES.length),
            React.createElement('span', { className: 'text-slate-500 ml-2 italic' }, __alloT('stem.molecule.the_reveal_is_locked_behind_your_commi', 'The reveal is locked behind your commitment — it\'s the prediction, not the answer, that builds intuition.'))
          )
        );
      }

      // === Cycle-7 conjunctive-integration widget: mystery solvent ===
      // Combines: forced commitment, reasoning verification, SVG visualization,
      // multi-step Socratic reveal on wrong, cross-representation linking.
      var SOLVENT_CASES = [
        {
          id: 'nacl', solute: 'Table salt (NaCl)', soluteKind: 'ionic-polar',
          desc: __alloT('stem.molecule.white_crystalline_solid_held_together_', 'White crystalline solid. Held together by strong + / − ion attractions.'),
          correct: 'water',
          explanation: __alloT('stem.molecule.water_s_permanent_dipoles_surround_na_', 'Water’s permanent dipoles surround Na+ and Cl- ions (ion–dipole forces strong enough to break the ionic lattice).'),
          rationale: ['ion-dipole', 'like-dissolves-like', 'has-h-bonds']
        },
        {
          id: 'i2', solute: 'Iodine crystals (I₂)', soluteKind: 'nonpolar-molecular',
          desc: __alloT('stem.molecule.purple_black_solid_each_i_molecule_hel', 'Purple-black solid. Each I₂ molecule held loosely by London dispersion only.'),
          correct: 'hexane',
          explanation: __alloT('stem.molecule.i_is_nonpolar_only_london_dispersion_a', 'I₂ is nonpolar; only London dispersion attractions stabilize it in solution. Hexane is also nonpolar — like-dissolves-like via dispersion.'),
          rationale: ['like-dissolves-like', 'nonpolar-match', 'no-h-bonds-needed']
        },
        {
          id: 'suc', solute: 'Sucrose (table sugar)', soluteKind: 'polar-covalent',
          desc: __alloT('stem.molecule.many_oh_groups_on_a_covalent_ring_pola', 'Many –OH groups on a covalent ring. Polar, but not ionic.'),
          correct: 'water',
          explanation: __alloT('stem.molecule.sucrose_dissolves_because_its_oh_group', 'Sucrose dissolves because its –OH groups form hydrogen bonds with water. Not ionic, so the mechanism is H-bonding, not ion–dipole.'),
          rationale: ['has-h-bonds', 'like-dissolves-like', 'forms-hydrogen-bonds']
        }
      ];
      var SOLVENT_OPTS = [
        { id: 'water', label: __alloT('stem.molecule.water_h_o', 'Water (H₂O)'), polarity: 'polar', symbol: 'H–O–H', dipole: 1.85, note: __alloT('stem.molecule.strongly_polar_h_bond_donor_acceptor', 'strongly polar; H-bond donor + acceptor') },
        { id: 'hexane', label: __alloT('stem.molecule.hexane_c_h', 'Hexane (C₆H₁₄)'), polarity: 'nonpolar', symbol: 'CH₃(CH₂)₄CH₃', dipole: 0.08, note: __alloT('stem.molecule.nonpolar_london_dispersion_only', 'nonpolar; London dispersion only') },
        { id: 'ethanol', label: __alloT('stem.molecule.ethanol_c_h_oh', 'Ethanol (C₂H₅OH)'), polarity: 'intermediate', symbol: 'CH₃CH₂OH', dipole: 1.69, note: __alloT('stem.molecule.amphiphilic_polar_oh_end_nonpolar_tail', 'amphiphilic — polar OH end, nonpolar tail') }
      ];
      var RATIONALE_CHIPS = {
        'ion-dipole': 'Ion–dipole attraction can pull ions out of the lattice',
        'like-dissolves-like': 'Like dissolves like (polarity match)',
        'has-h-bonds': 'Solvent can donate or accept H-bonds',
        'forms-hydrogen-bonds': 'Solute’s OH groups will hydrogen-bond to solvent',
        'no-h-bonds-needed': 'No H-bonds needed — only weak dispersion forces',
        'nonpolar-match': 'Both solute and solvent are nonpolar (dispersion match)',
        'low-density': 'Solvent has the lowest density',
        'cheapest': 'Solvent is the least expensive',
        'highest-bp': 'Solvent has the highest boiling point'
      };

      function renderSolventMysterySection() {
        var state = d2.solventMystery || { cases: {}, score: 0 };
        function setSM(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.molecule) || {};
            var st = Object.assign({}, prior.solventMystery || state, patch);
            return Object.assign({}, prev, { molecule: Object.assign({}, prior, { solventMystery: st }) });
          });
        }
        function updateCase(id, patch) {
          var newCases = Object.assign({}, state.cases);
          newCases[id] = Object.assign({}, state.cases[id] || { pick: null, ranking: [], revealed: false, socraticStep: 0 }, patch);
          setSM({ cases: newCases });
        }
        // Cross-rep: live polarity diagram for the chosen solvent
        function solventDiagramSvg(optId) {
          var opt = SOLVENT_OPTS.find(function(o) { return o.id === optId; });
          if (!opt) {
            return React.createElement('div', { className: 'h-20 flex items-center justify-center text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded' }, __alloT('stem.molecule.pick_a_solvent_to_see_its_polarity_dia', '(pick a solvent to see its polarity diagram)'));
          }
          var isPolar = opt.polarity === 'polar';
          var isInt = opt.polarity === 'intermediate';
          // Simple cartoon: central atoms with delta+/delta- when polar; uniform when nonpolar
          return React.createElement('svg', { viewBox: '0 0 240 80', role: 'img', 'aria-label': opt.label + ' polarity diagram: ' + opt.polarity + ', dipole ' + opt.dipole + ' debye.', className: 'w-full h-20 bg-slate-50 rounded border border-slate-200' },
            React.createElement('circle', { cx: 80, cy: 40, r: 18, fill: isPolar ? '#fde68a' : (isInt ? '#fcd34d' : '#cbd5e1') }),
            React.createElement('circle', { cx: 160, cy: 40, r: 14, fill: isPolar ? '#bfdbfe' : (isInt ? '#bfdbfe' : '#cbd5e1') }),
            React.createElement('line', { x1: 95, y1: 40, x2: 147, y2: 40, stroke: '#475569', strokeWidth: 3 }),
            React.createElement('text', { x: 80, y: 45, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#1e293b' }, isPolar ? 'δ+' : (isInt ? 'δ+' : '—')),
            React.createElement('text', { x: 160, y: 45, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#1e293b' }, isPolar ? 'δ−' : (isInt ? 'δ−' : '—')),
            isPolar && React.createElement('path', { d: 'M 95 28 Q 122 18 147 28', stroke: '#dc2626', strokeWidth: 2, fill: 'none', markerEnd: 'url(#arrow)' }),
            React.createElement('defs', null,
              React.createElement('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' },
                React.createElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#dc2626' })
              )
            ),
            React.createElement('text', { x: 120, y: 70, textAnchor: 'middle', fontSize: 10, fill: '#475569' },
              opt.label + ' — dipole μ = ' + opt.dipole + ' D (' + opt.polarity + ')')
          );
        }
        // Cross-rep: IMF strength bar
        function imfStrengthBar(picked, kase) {
          var opt = SOLVENT_OPTS.find(function(o) { return o.id === picked; });
          if (!opt) return null;
          // Heuristic match score: polar+ionic = high, polar+polar = high, nonpolar+nonpolar = high, mismatched = low
          var score = 0;
          if (kase.soluteKind === 'ionic-polar' && opt.polarity === 'polar') score = 90;
          else if (kase.soluteKind === 'ionic-polar' && opt.polarity === 'intermediate') score = 35;
          else if (kase.soluteKind === 'ionic-polar' && opt.polarity === 'nonpolar') score = 5;
          else if (kase.soluteKind === 'polar-covalent' && opt.polarity === 'polar') score = 85;
          else if (kase.soluteKind === 'polar-covalent' && opt.polarity === 'intermediate') score = 55;
          else if (kase.soluteKind === 'polar-covalent' && opt.polarity === 'nonpolar') score = 10;
          else if (kase.soluteKind === 'nonpolar-molecular' && opt.polarity === 'nonpolar') score = 85;
          else if (kase.soluteKind === 'nonpolar-molecular' && opt.polarity === 'intermediate') score = 40;
          else if (kase.soluteKind === 'nonpolar-molecular' && opt.polarity === 'polar') score = 8;
          var color = score >= 70 ? 'bg-emerald-500' : (score >= 35 ? 'bg-amber-400' : 'bg-rose-400');
          return React.createElement('div', { className: 'mt-1' },
            React.createElement('div', { className: 'flex items-baseline gap-2 text-[10px] text-slate-600' },
              React.createElement('span', null, __alloT('stem.molecule.predicted_imf_match_strength', 'Predicted IMF match strength:')),
              React.createElement('span', { className: 'font-mono font-bold text-slate-800' }, score + '%')
            ),
            React.createElement('div', { className: 'h-2 bg-slate-200 rounded overflow-hidden', role: 'progressbar', 'aria-valuenow': score, 'aria-valuemin': 0, 'aria-valuemax': 100 },
              React.createElement('div', { className: 'h-full ' + color, style: { width: score + '%' } })
            )
          );
        }
        // Cross-rep: plain-language live prediction
        function livePrediction(picked, kase) {
          var opt = SOLVENT_OPTS.find(function(o) { return o.id === picked; });
          if (!opt) return null;
          var label = kase.soluteKind + ' solute + ' + opt.polarity + ' solvent';
          var verdict = (
            (kase.soluteKind === 'ionic-polar' && opt.polarity === 'polar') ||
            (kase.soluteKind === 'polar-covalent' && opt.polarity === 'polar') ||
            (kase.soluteKind === 'nonpolar-molecular' && opt.polarity === 'nonpolar')
          ) ? '→ dissolves readily' : ((opt.polarity === 'intermediate') ? '→ partially soluble' : '→ does NOT dissolve');
          return React.createElement('div', { className: 'text-[10px] italic text-slate-700 mt-1' }, label + ' ' + verdict);
        }
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, __alloT('stem.molecule.mystery_solvent_2', '🧪 Mystery solvent')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            __alloT('stem.molecule.three_unknown_solutes_for_each_1_pick_', 'Three unknown solutes. For each: (1) pick the best solvent, (2) rank the chemistry reasoning that justifies your pick, (3) live diagrams update with each click, and (4) wrong answers walk you through the polarity logic step by step — no answer dump.')),
          SOLVENT_CASES.map(function(kase, idx) {
            var st = state.cases[kase.id] || { pick: null, ranking: [], revealed: false, socraticStep: 0 };
            var hasRanked = (st.ranking || []).length >= 2;
            var canReveal = st.pick != null && hasRanked && !st.revealed;
            var isCorrect = st.revealed && st.pick === kase.correct;
            // Expert ranking = the correct-rationale ids in their listed order
            var expertOrder = kase.rationale;
            var rankCorrect = JSON.stringify((st.ranking || []).slice(0, expertOrder.length)) === JSON.stringify(expertOrder);
            // Build candidate chip pool: 3 correct + 3 distractors
            var distractors = ['low-density', 'cheapest', 'highest-bp'];
            var chipPool = expertOrder.concat(distractors);
            function toggleRank(chip) {
              var arr = (st.ranking || []).slice();
              var i = arr.indexOf(chip);
              if (i >= 0) arr.splice(i, 1); else arr.push(chip);
              updateCase(kase.id, { ranking: arr });
            }
            return React.createElement('div', { key: kase.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 font-bold' }, '#' + (idx + 1)),
                React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, kase.solute)
              ),
              React.createElement('p', { className: 'text-[11px] text-slate-600 mb-2' }, kase.desc),
              // (1) Solvent picker
              React.createElement('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.1_pick_a_solvent', '1. Pick a solvent:')),
              React.createElement('div', { className: 'flex flex-wrap gap-1 mb-2' },
                SOLVENT_OPTS.map(function(opt) {
                  var picked = st.pick === opt.id;
                  var revealed = st.revealed;
                  var correct = opt.id === kase.correct;
                  var bg = revealed
                    ? (correct ? 'bg-green-600 text-white border-green-700' : (picked ? 'bg-red-100 text-red-800 border-red-300 line-through' : 'bg-white text-slate-500 border-slate-200'))
                    : (picked ? 'bg-indigo-200 text-indigo-900 border-indigo-400' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 active:scale-[0.97]');
                  return React.createElement('button', {
                    key: opt.id,
                    disabled: revealed,
                    'aria-pressed': picked ? 'true' : 'false',
                    onClick: function() { updateCase(kase.id, { pick: opt.id, socraticStep: 0 }); },
                    className: 'px-2 py-1 rounded text-[11px] font-bold border transition-colors focus:ring-2 focus:ring-indigo-400 focus:outline-none ' + bg
                  }, opt.label);
                })
              ),
              // CROSS-REP: live polarity diagram + IMF bar + verdict sentence
              React.createElement('div', { className: 'mb-2' }, solventDiagramSvg(st.pick)),
              imfStrengthBar(st.pick, kase),
              livePrediction(st.pick, kase),
              // (2) Reasoning ranker
              React.createElement('div', { className: 'text-[11px] font-bold text-slate-700 mt-3 mb-1' },
                __alloT('stem.molecule.2_rank_the_reasoning_click_in_priority', '2. Rank the reasoning (click in priority order, top → bottom; need ≥2):')),
              React.createElement('div', { className: 'flex flex-wrap gap-1 mb-1' },
                chipPool.map(function(chip) {
                  var pos = (st.ranking || []).indexOf(chip);
                  var picked = pos >= 0;
                  return React.createElement('button', {
                    key: chip,
                    disabled: st.revealed,
                    onClick: function() { toggleRank(chip); },
                    className: 'px-2 py-1 rounded text-[10px] font-semibold border transition-colors ' +
                      (picked ? 'bg-amber-200 text-amber-900 border-amber-400' : 'transition-colors bg-white text-slate-600 border-slate-300 hover:bg-amber-50 active:scale-[0.97]')
                  }, (picked ? '#' + (pos + 1) + ' ' : '') + RATIONALE_CHIPS[chip]);
                })
              ),
              // (3) Reveal + multi-step Socratic on wrong
              React.createElement('div', { className: 'flex items-center gap-2 mt-2' },
                React.createElement('button', {
                  disabled: !canReveal,
                  onClick: function() { updateCase(kase.id, { revealed: true }); var bonus = (st.pick === kase.correct ? 1 : 0) + (rankCorrect ? 1 : 0); setSM({ score: (state.score || 0) + bonus }); },
                  className: 'transition-colors px-3 py-1 rounded text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-400 focus:outline-none active:scale-[0.97]'
                }, st.revealed ? '✓ Checked' : 'Check answer'),
                !canReveal && !st.revealed && React.createElement('span', { className: 'text-[10px] text-slate-500 italic' },
                  st.pick == null ? 'Pick a solvent first' : 'Rank at least 2 reasoning chips'),
                st.revealed && React.createElement('span', { className: 'text-[11px] font-bold ' + (isCorrect ? 'text-green-700' : 'text-rose-700') },
                  isCorrect ? (rankCorrect ? '✓✓ Solvent + reasoning both correct' : '✓ Solvent correct; reasoning order off') : '✗ Wrong solvent — walk through the questions below')
              ),
              // MULTI-STEP SOCRATIC: only when revealed AND wrong solvent picked
              (st.revealed && !isCorrect) && React.createElement('div', { className: 'mt-2 p-2 rounded bg-rose-50 border-l-4 border-l-rose-400 text-[11px] text-slate-700 space-y-1' },
                React.createElement('div', { className: 'font-bold text-rose-800' }, __alloT('stem.molecule.let_s_walk_through_it_step_by_step_no_', 'Let’s walk through it step by step (no answer dump):')),
                React.createElement('div', null,
                  React.createElement('strong', null, 'Q1. '), 'Is ' + kase.solute + ' polar or nonpolar?'),
                st.socraticStep >= 1 && React.createElement('div', { className: 'pl-3 text-indigo-800' },
                  '→ ' + (kase.soluteKind === 'nonpolar-molecular' ? 'Nonpolar' : (kase.soluteKind === 'ionic-polar' ? 'Ionic (very polar)' : 'Polar (covalent, with H-bonding groups)'))),
                st.socraticStep >= 1 && React.createElement('div', null,
                  React.createElement('strong', null, 'Q2. '), __alloT('stem.molecule.is_the_solvent_you_picked_polar_or_non', 'Is the solvent you picked polar or nonpolar?')),
                st.socraticStep >= 2 && React.createElement('div', { className: 'pl-3 text-indigo-800' },
                  '→ ' + (SOLVENT_OPTS.find(function(o) { return o.id === st.pick; }) || {}).polarity),
                st.socraticStep >= 2 && React.createElement('div', null,
                  React.createElement('strong', null, 'Q3. '), __alloT('stem.molecule.like_dissolves_like_do_polarities_matc', '"Like dissolves like." Do polarities match?')),
                st.socraticStep >= 3 && React.createElement('div', { className: 'pl-3 text-indigo-800 font-semibold' },
                  '→ No. The correct solvent is ' + (SOLVENT_OPTS.find(function(o) { return o.id === kase.correct; }) || {}).label + ' because: ' + kase.explanation),
                React.createElement('button', {
                  onClick: function() { updateCase(kase.id, { socraticStep: Math.min((st.socraticStep || 0) + 1, 3) }); },
                  disabled: (st.socraticStep || 0) >= 3,
                  className: 'transition-colors mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 active:scale-[0.97]'
                }, (st.socraticStep || 0) >= 3 ? 'Walkthrough complete' : 'Show next step →')
              ),
              // CORRECT-PATH explanation
              (st.revealed && isCorrect) && React.createElement('div', { className: 'mt-2 p-2 rounded bg-emerald-50 border-l-4 border-l-emerald-400 text-[11px] text-slate-700' },
                React.createElement('strong', { className: 'text-emerald-800' }, __alloT('stem.molecule.why_this_works', 'Why this works: ')), kase.explanation,
                !rankCorrect && React.createElement('div', { className: 'mt-1 text-amber-700' },
                  '☕ Expert reasoning order: ' + expertOrder.map(function(c) { return RATIONALE_CHIPS[c]; }).join(' → '))
              )
            );
          }),
          React.createElement('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2 flex-wrap' },
            React.createElement('span', null, '🎯'),
            React.createElement('strong', null, 'Score: ' + (state.score || 0) + ' / ' + (SOLVENT_CASES.length * 2)),
            React.createElement('span', { className: 'text-slate-500 italic' },
              __alloT('stem.molecule.1_for_correct_solvent_1_if_reasoning_o', '(+1 for correct solvent, +1 if reasoning order matches expert). Live diagrams + Socratic walkthrough are the point — not the score.'))
          )
        );
      }

      function renderGlossarySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.chemistry_glossary', '📖 Chemistry glossary')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.common_chemistry_terms_students_mix_up', 'Common chemistry terms students mix up. Bookmarkable reference for vocabulary.')),
          React.createElement('div', { className: 'space-y-1' },
            GLOSSARY.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-indigo-900' }, g.term),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — Additional reference sections (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var GAS_LAWS = [
        { name: __alloT('stem.molecule.boyle_s_law', 'Boyle\'s Law'), formula: 'P₁V₁ = P₂V₂', plain: 'Pressure and volume are inversely related at constant temperature.', example: 'Compress a syringe → pressure rises. Push 50 mL down to 25 mL at constant T → pressure doubles.', year: 1662 },
        { name: __alloT('stem.molecule.charles_s_law', 'Charles\'s Law'), formula: 'V₁/T₁ = V₂/T₂', plain: 'Volume and absolute temperature are directly proportional at constant pressure.', example: 'Heat a balloon → it expands. Heating from 273 K to 546 K doubles volume.', year: 1787 },
        { name: __alloT('stem.molecule.gay_lussac_s_law', 'Gay-Lussac\'s Law'), formula: 'P₁/T₁ = P₂/T₂', plain: 'Pressure and absolute temperature are directly proportional at constant volume.', example: 'Heat a sealed gas can → pressure rises (and may explode!).', year: 1802 },
        { name: __alloT('stem.molecule.avogadro_s_law', 'Avogadro\'s Law'), formula: 'V₁/n₁ = V₂/n₂', plain: 'Equal volumes of gas at same T and P contain equal numbers of molecules.', example: '22.4 L of any ideal gas at STP contains 1 mole (6.022×10²³ molecules).', year: 1811 },
        { name: __alloT('stem.molecule.combined_gas_law', 'Combined Gas Law'), formula: 'P₁V₁/T₁ = P₂V₂/T₂', plain: 'Combines Boyle\'s, Charles\'s, and Gay-Lussac\'s laws.', example: 'Tracking a weather balloon as it rises (T drops, P drops, V grows).', year: 1834 },
        { name: __alloT('stem.molecule.ideal_gas_law', 'Ideal Gas Law'), formula: 'PV = nRT', plain: 'Relates pressure, volume, moles, and temperature using the gas constant R.', example: 'R = 0.0821 L·atm/(mol·K). 1 mol gas at 1 atm, 273 K occupies 22.4 L.', year: 1834 },
        { name: __alloT('stem.molecule.dalton_s_law_of_partial_pressures', 'Dalton\'s Law of Partial Pressures'), formula: 'P_total = P₁ + P₂ + P₃ + ...', plain: 'Total pressure of a gas mixture = sum of partial pressures.', example: 'Atmosphere: ~78% N₂ (0.78 atm) + ~21% O₂ (0.21 atm) + trace gases = 1 atm.', year: 1801 },
        { name: __alloT('stem.molecule.graham_s_law_of_effusion', 'Graham\'s Law of Effusion'), formula: 'rate₁/rate₂ = √(M₂/M₁)', plain: 'Lighter gases effuse faster than heavier gases.', example: 'H₂ (M=2) effuses 4× faster than O₂ (M=32). √(32/2) = 4.', year: 1848 },
        { name: __alloT('stem.molecule.henry_s_law', 'Henry\'s Law'), formula: 'C = k·P', plain: 'Solubility of a gas in liquid is proportional to its partial pressure above the liquid.', example: 'Open a soda bottle → CO₂ partial pressure drops → CO₂ comes out of solution → fizz.', year: 1803 },
        { name: __alloT('stem.molecule.van_der_waals_equation', 'Van der Waals equation'), formula: '(P + a/V²)(V − b) = nRT', plain: 'Modifies ideal gas law to account for real gas behavior (intermolecular attractions + molecular volume).', example: 'Real gases deviate at high P and low T. CO₂ has a=3.6, b=0.043.', year: 1873 }
      ];

      var COLLIGATIVE_PROPS = [
        { prop: 'Vapor pressure lowering', formula: 'ΔP = X_solute · P°_solvent', plain: 'Adding a nonvolatile solute lowers vapor pressure of the solvent.', example: 'Salt water has lower vapor pressure than pure water.' },
        { prop: 'Boiling point elevation', formula: 'ΔTb = i·Kb·m', plain: 'Solute raises boiling point. Kb depends on solvent; m is molality; i is van\'t Hoff factor.', example: 'Salt in pasta water → slightly higher boiling point (~0.5°C for 1% NaCl).' },
        { prop: 'Freezing point depression', formula: 'ΔTf = i·Kf·m', plain: 'Solute lowers freezing point. Why we salt icy roads.', example: 'NaCl + water → freezing point drops to as low as −21°C (eutectic at 23% NaCl).' },
        { prop: 'Osmotic pressure', formula: 'π = iMRT', plain: 'Pressure needed to stop osmotic flow across semipermeable membrane. M = molarity.', example: 'Blood ≈ 7.7 atm osmotic pressure. IV fluids must be isotonic (~0.9% saline).' }
      ];

      var REDOX_PAIRS = [
        { half: 'F₂ + 2e⁻ → 2F⁻', e0: '+2.87 V', notes: 'Strongest oxidizer in this list. F₂ is extremely reactive.' },
        { half: 'O₃ + 2H⁺ + 2e⁻ → O₂ + H₂O', e0: '+2.07 V', notes: 'Ozone — strong oxidizer used in water treatment.' },
        { half: 'H₂O₂ + 2H⁺ + 2e⁻ → 2H₂O', e0: '+1.78 V', notes: 'Hydrogen peroxide as oxidizer.' },
        { half: 'MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O', e0: '+1.51 V', notes: 'Permanganate in acid — vivid purple to nearly colorless.' },
        { half: 'Cl₂ + 2e⁻ → 2Cl⁻', e0: '+1.36 V', notes: 'Chlorine as oxidizer — water treatment, bleaching.' },
        { half: 'O₂ + 4H⁺ + 4e⁻ → 2H₂O', e0: '+1.23 V', notes: 'Why oxygen is corrosive to metals over time.' },
        { half: 'Ag⁺ + e⁻ → Ag', e0: '+0.80 V', notes: 'Silver ion easily reduced. Silver mirror test.' },
        { half: 'Cu²⁺ + 2e⁻ → Cu', e0: '+0.34 V', notes: 'Reference for "noble" metals.' },
        { half: '2H⁺ + 2e⁻ → H₂', e0: '0.00 V', notes: 'Defined as zero — Standard Hydrogen Electrode (SHE).' },
        { half: 'Fe²⁺ + 2e⁻ → Fe', e0: '−0.44 V', notes: 'Iron is more easily oxidized than copper → rust.' },
        { half: 'Zn²⁺ + 2e⁻ → Zn', e0: '−0.76 V', notes: 'Zinc anode in batteries. Sacrificial anode for ships.' },
        { half: 'Al³⁺ + 3e⁻ → Al', e0: '−1.66 V', notes: 'Aluminum is very reactive; protected by Al₂O₃ surface layer.' },
        { half: 'Mg²⁺ + 2e⁻ → Mg', e0: '−2.37 V', notes: 'Used as sacrificial anode for buried steel pipes.' },
        { half: 'Na⁺ + e⁻ → Na', e0: '−2.71 V', notes: 'Sodium very easily oxidized → must store under oil.' },
        { half: 'Li⁺ + e⁻ → Li', e0: '−3.04 V', notes: 'Strongest reducer of metals shown. Li-ion batteries use this potential.' }
      ];

      var ORGANIC_GROUPS = [
        { name: __alloT('stem.molecule.alkane', 'Alkane'), formula: 'R–H (single bonds only)', example: 'Methane CH₄, Ethane C₂H₆', notes: 'Saturated. Unreactive baseline. Combust to CO₂ + H₂O.' },
        { name: __alloT('stem.molecule.alkene', 'Alkene'), formula: 'R–CH=CH–R', example: 'Ethene C₂H₄ (ethylene)', notes: 'C=C double bond. Reactive at the double bond. Plant ripening hormone.' },
        { name: __alloT('stem.molecule.alkyne', 'Alkyne'), formula: 'R–C≡C–R', example: 'Ethyne C₂H₂ (acetylene)', notes: 'Triple bond. Welding torches burn acetylene + O₂ → ~3,500°C.' },
        { name: __alloT('stem.molecule.alcohol', 'Alcohol'), formula: 'R–OH', example: 'Methanol CH₃OH, Ethanol C₂H₅OH', notes: 'Hydroxyl group. Polar, can H-bond. Beverages, fuels, antiseptics.' },
        { name: __alloT('stem.molecule.ether', 'Ether'), formula: 'R–O–R', example: 'Diethyl ether (C₂H₅)₂O', notes: 'Oxygen bridge. Historically used as anesthetic.' },
        { name: __alloT('stem.molecule.aldehyde', 'Aldehyde'), formula: 'R–CHO', example: 'Formaldehyde HCHO', notes: 'C=O at end of chain. Preservatives. Vanilla flavor (vanillin).' },
        { name: __alloT('stem.molecule.ketone', 'Ketone'), formula: 'R–CO–R', example: 'Acetone (CH₃)₂CO', notes: 'C=O in middle of chain. Nail polish remover.' },
        { name: __alloT('stem.molecule.carboxylic_acid', 'Carboxylic acid'), formula: 'R–COOH', example: 'Acetic acid CH₃COOH', notes: '–COOH. Acidic. Vinegar (acetic), citrus (citric), aspirin (salicylic).' },
        { name: __alloT('stem.molecule.ester', 'Ester'), formula: 'R–COO–R', example: 'Ethyl acetate CH₃COOC₂H₅', notes: 'Carboxylic acid + alcohol. Fruity smells (banana ester, pineapple ester).' },
        { name: __alloT('stem.molecule.amine', 'Amine'), formula: 'R–NH₂', example: 'Methylamine CH₃NH₂', notes: 'Nitrogen with lone pair. Basic. Fishy smells, neurotransmitters.' },
        { name: __alloT('stem.molecule.amide', 'Amide'), formula: 'R–CONH₂', example: 'Acetamide CH₃CONH₂', notes: 'C=O attached to N. Peptide bonds in proteins.' },
        { name: __alloT('stem.molecule.nitrile', 'Nitrile'), formula: 'R–C≡N', example: 'Acetonitrile CH₃CN', notes: 'Cyanide group. Some plant defenses (amygdalin in almonds).' },
        { name: __alloT('stem.molecule.thiol_mercaptan', 'Thiol (mercaptan)'), formula: 'R–SH', example: 'Methanethiol CH₃SH', notes: 'Sulfur analog of alcohol. STRONG smell — added to natural gas as warning.' },
        { name: __alloT('stem.molecule.aromatic_arene', 'Aromatic (arene)'), formula: 'Benzene ring C₆H₆', example: 'Benzene, toluene, naphthalene', notes: 'Delocalized π electrons. Stable. Coal tar, mothballs.' }
      ];

      var SPECTRO_METHODS = [
        { name: __alloT('stem.molecule.uv_vis_spectroscopy', 'UV-Vis spectroscopy'), range: '200–800 nm', detects: 'Electronic transitions; conjugated π systems, transition metal complexes', use: 'Concentration via Beer\'s law (A = εbc); color of compounds.' },
        { name: __alloT('stem.molecule.ir_infrared_spectroscopy', 'IR (infrared) spectroscopy'), range: '2.5–25 μm (4000–400 cm⁻¹)', detects: 'Molecular vibrations; functional groups', use: '–OH (~3300, broad), C=O (~1700), C≡N (~2250). Identifies functional groups.' },
        { name: __alloT('stem.molecule.h_nmr_proton_nmr', '¹H NMR (proton NMR)'), range: 'Radio (MHz)', detects: 'Hydrogen environments', use: 'Counts H atoms in different environments. Chemical shift + splitting → structure.' },
        { name: __alloT('stem.molecule.c_nmr', '¹³C NMR'), range: 'Radio (MHz)', detects: 'Carbon framework', use: 'Counts unique C environments. ¹³C is only 1.1% natural abundance.' },
        { name: __alloT('stem.molecule.mass_spectrometry_ms', 'Mass spectrometry (MS)'), range: 'm/z', detects: 'Mass-to-charge ratio of ions', use: 'Molecular weight + fragmentation pattern → structure. Drug testing, forensics.' },
        { name: __alloT('stem.molecule.x_ray_crystallography', 'X-ray crystallography'), range: 'X-ray (~1 Å)', detects: '3D atomic positions in crystal', use: 'Determines exact molecular geometry. Used to solve DNA structure (1953).' },
        { name: __alloT('stem.molecule.raman_spectroscopy', 'Raman spectroscopy'), range: 'Vis to NIR laser', detects: 'Vibrational modes (complementary to IR)', use: 'Detects symmetric vibrations that IR misses. Useful for inorganic compounds, water-containing samples.' },
        { name: __alloT('stem.molecule.atomic_absorption_aas', 'Atomic absorption (AAS)'), range: 'UV-Vis', detects: 'Specific metal elements', use: 'Each element absorbs at characteristic wavelength. Water quality, blood lead testing.' },
        { name: __alloT('stem.molecule.fluorescence_spectroscopy', 'Fluorescence spectroscopy'), range: 'UV → Vis', detects: 'Excited state emission', use: 'GFP (green fluorescent protein) tracking in biology. Forensics (luminol).' },
        { name: __alloT('stem.molecule.epr_electron_paramagnetic_resonance', 'EPR (electron paramagnetic resonance)'), range: 'Microwave', detects: 'Unpaired electrons (radicals)', use: 'Free radical research, transition metal complexes.' }
      ];

      var CRYSTAL_STRUCTURES = [
        { name: __alloT('stem.molecule.simple_cubic', 'Simple cubic'), coord: 6, packing: '52.4%', example: 'Polonium (rare)', notes: 'Atoms only at corners of cube. Inefficient packing.' },
        { name: __alloT('stem.molecule.body_centered_cubic_bcc', 'Body-centered cubic (BCC)'), coord: 8, packing: '68.0%', example: 'Iron (α), W, Mo, Cr', notes: 'Atom at corners + one in center.' },
        { name: __alloT('stem.molecule.face_centered_cubic_fcc_cubic_close_pa', 'Face-centered cubic (FCC) / Cubic close-packed'), coord: 12, packing: '74.0%', example: 'Cu, Ag, Au, Al, Pb, Ni', notes: 'Most efficient cubic packing. ABCABC layer sequence.' },
        { name: __alloT('stem.molecule.hexagonal_close_packed_hcp', 'Hexagonal close-packed (HCP)'), coord: 12, packing: '74.0%', example: 'Mg, Zn, Ti, Co', notes: 'Same efficiency as FCC but ABAB sequence. Different mechanical properties.' },
        { name: __alloT('stem.molecule.diamond_cubic', 'Diamond cubic'), coord: 4, packing: '34.0%', example: 'C (diamond), Si, Ge', notes: 'Each atom bonded to 4 neighbors tetrahedrally.' },
        { name: __alloT('stem.molecule.sodium_chloride_rock_salt', 'Sodium chloride (rock salt)'), coord: '6 (each ion)', packing: '~67% (ionic)', example: 'NaCl, KCl, MgO', notes: 'FCC of Cl⁻ with Na⁺ in octahedral holes.' },
        { name: __alloT('stem.molecule.cesium_chloride', 'Cesium chloride'), coord: '8 (each ion)', packing: '~73% (ionic)', example: 'CsCl, CsBr, CsI', notes: 'Simple cubic of Cl⁻ with Cs⁺ at body center.' },
        { name: __alloT('stem.molecule.zinc_blende_sphalerite', 'Zinc blende (sphalerite)'), coord: '4 (each ion)', packing: '~50% (ionic)', example: 'ZnS, GaAs, CdTe', notes: 'FCC of S²⁻ with Zn²⁺ in half the tetrahedral holes.' },
        { name: __alloT('stem.molecule.wurtzite', 'Wurtzite'), coord: '4 (each ion)', packing: '~50% (ionic)', example: 'ZnS (high-T form), ZnO, AlN', notes: 'HCP analog of zinc blende.' },
        { name: __alloT('stem.molecule.fluorite', 'Fluorite'), coord: 'Ca: 8, F: 4', packing: '~75%', example: 'CaF₂, UO₂, ZrO₂', notes: 'FCC of cations with anions in all tetrahedral holes.' },
        { name: __alloT('stem.molecule.perovskite', 'Perovskite'), coord: 'varies', packing: 'varies', example: 'CaTiO₃, BaTiO₃, organic-inorganic hybrids', notes: 'ABX₃ structure. Hot in solar cell research (perovskite solar cells).' },
        { name: __alloT('stem.molecule.graphite', 'Graphite'), coord: 3, packing: 'layered (sparse)', example: 'C (graphite)', notes: 'Hexagonal layers held by weak van der Waals → slippery, soft.' }
      ];

      var BIOCHEM_MOLECULES = [
        { class: 'Amino acid', example: 'Glycine, Alanine, Lysine', formula: 'H₂N–CHR–COOH', notes: '20 standard amino acids. Side chain (R) determines polarity, charge, special features.' },
        { class: 'Protein', example: 'Hemoglobin, insulin, collagen', formula: 'Polymer of amino acids via peptide bonds (–CONH–)', notes: 'Primary→secondary (α-helix, β-sheet)→tertiary→quaternary structure.' },
        { class: 'Carbohydrate (monosaccharide)', example: 'Glucose, fructose, ribose', formula: '(CH₂O)n typically', notes: 'Simple sugars. Glucose = main fuel; ribose = RNA backbone; deoxyribose = DNA.' },
        { class: 'Disaccharide', example: 'Sucrose, lactose, maltose', formula: 'Two monosaccharides linked', notes: 'Sucrose = glucose + fructose. Lactose = glucose + galactose.' },
        { class: 'Polysaccharide', example: 'Starch, glycogen, cellulose', formula: 'Many glucose units linked', notes: 'Starch (plant storage), glycogen (animal storage), cellulose (plant structure — α vs β linkage).' },
        { class: 'Lipid (fatty acid)', example: 'Palmitic, oleic, omega-3', formula: 'R–COOH (long chain)', notes: 'Saturated (no double bonds) or unsaturated. Cis double bonds = healthy; trans = harmful.' },
        { class: 'Triglyceride', example: 'Body fat, vegetable oil', formula: 'Glycerol + 3 fatty acids (ester bonds)', notes: 'Main energy storage. Solid (fat) vs liquid (oil) depends on saturation.' },
        { class: 'Phospholipid', example: 'Phosphatidylcholine (lecithin)', formula: 'Glycerol + 2 fatty acids + phosphate-head', notes: 'Bilayer forms cell membranes. Hydrophobic tails, hydrophilic heads.' },
        { class: 'Steroid', example: 'Cholesterol, testosterone, cortisol', formula: '4 fused rings (3 hexagonal, 1 pentagonal)', notes: 'Lipid class with rigid ring structure. Hormones, vitamin D, bile.' },
        { class: 'Nucleotide', example: 'ATP, GTP, cAMP', formula: 'Sugar + phosphate + nitrogenous base', notes: 'Building blocks of DNA/RNA. ATP = main cellular energy currency.' },
        { class: 'DNA', example: 'Human genome (~3 billion bp)', formula: 'Polymer of deoxyribonucleotides (A,T,G,C)', notes: 'Double helix. Stores genetic info. Replication is semi-conservative.' },
        { class: 'RNA', example: 'mRNA, tRNA, rRNA, miRNA', formula: 'Polymer of ribonucleotides (A,U,G,C)', notes: 'Usually single-stranded. mRNA carries gene info; tRNA delivers amino acids.' },
        { class: 'Enzyme', example: 'Amylase, lipase, ATP synthase', formula: 'Catalytic protein (usually)', notes: 'Lowers activation energy. Specific to substrate via active site. End in "-ase".' },
        { class: 'Vitamin', example: 'B12 (cobalamin), C (ascorbic), D₃ (cholecalciferol)', formula: 'Varies', notes: 'Organic micronutrients. Water-soluble (B, C) vs fat-soluble (A, D, E, K).' }
      ];

      var ATMOSPHERE_LAYERS = [
        { name: __alloT('stem.molecule.troposphere', 'Troposphere'), altitude: '0–12 km', temp: '15°C → −56°C', notes: 'Weather happens here. ~80% of atmospheric mass.' },
        { name: __alloT('stem.molecule.stratosphere', 'Stratosphere'), altitude: '12–50 km', temp: '−56°C → −2°C', notes: 'Ozone layer absorbs UV → temperature rises with altitude.' },
        { name: __alloT('stem.molecule.mesosphere', 'Mesosphere'), altitude: '50–85 km', temp: '−2°C → −90°C', notes: 'Coldest layer. Meteors burn up here.' },
        { name: __alloT('stem.molecule.thermosphere', 'Thermosphere'), altitude: '85–600 km', temp: '−90°C → 2000°C+', notes: 'ISS orbits here (~400 km). Auroras form here.' },
        { name: __alloT('stem.molecule.exosphere', 'Exosphere'), altitude: '600–10,000 km', temp: 'varies', notes: 'Outermost layer. Gradually fades into space.' }
      ];

      var ATMOSPHERIC_GASES = [
        { gas: 'N₂', pct: '78.084%', notes: 'Inert filler. Cycled by N-fixing bacteria + lightning.' },
        { gas: 'O₂', pct: '20.946%', notes: 'Reactive. Produced by photosynthesis; consumed by respiration + combustion.' },
        { gas: 'Ar', pct: '0.934%', notes: 'Noble gas. Inert. Produced by ⁴⁰K decay.' },
        { gas: 'CO₂', pct: '~0.042% (420+ ppm)', notes: 'Greenhouse gas. Was ~280 ppm pre-industrial; rising ~2 ppm/year.' },
        { gas: 'Ne', pct: '0.0018%', notes: 'Noble gas. Sign lighting.' },
        { gas: 'He', pct: '0.0005%', notes: 'Noble gas. Escapes Earth\'s gravity over time.' },
        { gas: 'CH₄', pct: '~0.00019% (~1.9 ppm)', notes: 'Methane — potent greenhouse gas (~28× CO₂ over 100 yr). Rising.' },
        { gas: 'Kr', pct: '0.0001%', notes: 'Noble gas. Specialty lighting.' },
        { gas: 'H₂', pct: '0.00005%', notes: 'Small molecules escape gravity over geological time.' },
        { gas: 'N₂O', pct: '~0.000033%', notes: 'Nitrous oxide. Greenhouse gas. Anesthetic, also from fertilizer.' },
        { gas: 'O₃', pct: '~0.000007% (varies)', notes: 'Ozone. Concentrated in stratosphere. Absorbs UV-B/C.' },
        { gas: 'H₂O', pct: '0–4% (variable)', notes: 'Water vapor. The biggest natural greenhouse gas; feedback amplifier.' }
      ];

      var NUCLEAR_PROCESSES = [
        { name: __alloT('stem.molecule.alpha_decay', 'Alpha decay (α)'), particle: 'He nucleus (⁴He)', notes: 'Heavy nuclei eject ⁴He. Atomic number drops 2, mass drops 4. Stopped by paper.' },
        { name: __alloT('stem.molecule.beta_minus_decay', 'Beta-minus decay (β⁻)'), particle: 'electron + antineutrino', notes: 'Neutron → proton + e⁻ + ν̄. Atomic number rises 1. Stopped by aluminum.' },
        { name: __alloT('stem.molecule.beta_plus_decay', 'Beta-plus decay (β⁺)'), particle: 'positron + neutrino', notes: 'Proton → neutron + e⁺ + ν. Atomic number drops 1. Used in PET scans.' },
        { name: __alloT('stem.molecule.electron_capture', 'Electron capture'), particle: 'absorbs inner electron', notes: 'Proton + e⁻ → neutron + ν. Mimics β⁺ effect on Z but no positron emitted.' },
        { name: __alloT('stem.molecule.gamma_decay', 'Gamma decay (γ)'), particle: 'high-energy photon', notes: 'Nucleus releases excess energy. No change in Z or A. Needs lead/concrete shielding.' },
        { name: __alloT('stem.molecule.neutron_emission', 'Neutron emission'), particle: 'free neutron', notes: 'Rare. Some fission products emit delayed neutrons (critical for reactor control).' },
        { name: __alloT('stem.molecule.fission', 'Fission'), particle: 'splits into 2+ nuclei', notes: 'Heavy nuclei (U-235, Pu-239) split when struck by neutron. Releases 2-3 more neutrons + energy.' },
        { name: __alloT('stem.molecule.fusion', 'Fusion'), particle: 'two light nuclei combine', notes: 'Powers stars. D + T → He + n + energy. Requires extreme T and P.' },
        { name: __alloT('stem.molecule.spontaneous_fission', 'Spontaneous fission'), particle: 'self-splitting', notes: 'Some heavy isotopes (Cf-252) split without provocation.' }
      ];

      var COMMON_ISOTOPES = [
        { iso: '¹H (protium)', halfLife: 'stable', use: '99.98% of all hydrogen.' },
        { iso: '²H (deuterium)', halfLife: 'stable', use: '0.015%. Used in heavy water, NMR solvents.' },
        { iso: '³H (tritium)', halfLife: '12.3 yr (β⁻)', use: 'Glow-in-the-dark watches, fusion fuel.' },
        { iso: '¹²C', halfLife: 'stable', use: '98.9%. Defines atomic mass unit (¹²C = exactly 12 amu).' },
        { iso: '¹⁴C', halfLife: '5,730 yr (β⁻)', use: 'Radiocarbon dating up to ~50,000 years.' },
        { iso: '¹⁵N', halfLife: 'stable', use: 'NMR tracking, isotope labeling experiments.' },
        { iso: '¹⁸O', halfLife: 'stable', use: 'Ice core climate reconstruction (paleoclimate).' },
        { iso: '³²P', halfLife: '14.3 days (β⁻)', use: 'Radiolabeling DNA/RNA for sequencing.' },
        { iso: '⁹⁹ᵐTc', halfLife: '6 hr (γ)', use: 'Most widely used medical imaging isotope.' },
        { iso: '¹³¹I', halfLife: '8 days (β⁻, γ)', use: 'Treats thyroid cancer; thyroid concentrates iodine.' },
        { iso: '²³⁵U', halfLife: '7.0×10⁸ yr (α)', use: '0.72% of natural U. Fissile — used in reactors and weapons.' },
        { iso: '²³⁸U', halfLife: '4.5×10⁹ yr (α)', use: '99.27% of natural U. Used in armor + ammunition.' },
        { iso: '²³⁹Pu', halfLife: '24,100 yr (α)', use: 'Fissile. Used in nuclear weapons + some reactors.' },
        { iso: '²⁴¹Am', halfLife: '432 yr (α)', use: 'Smoke detectors.' }
      ];

      var ELECTROCHEM_CELLS = [
        { type: 'Galvanic / Voltaic cell', operation: 'Spontaneous redox → electricity', example: 'Zn/Cu Daniell cell (1836)', notes: 'Anode = oxidation (−), cathode = reduction (+).' },
        { type: 'Electrolytic cell', operation: 'External electricity → drives non-spontaneous redox', example: 'Electroplating, aluminum refining (Hall-Héroult)', notes: 'Anode = oxidation (+), cathode = reduction (−). Sign convention flipped.' },
        { type: 'Concentration cell', operation: 'Same electrodes, different ion concentrations', example: 'Two Cu electrodes in CuSO₄ at different concentrations', notes: 'Drives ions to equalize concentration. Small voltage.' },
        { type: 'Fuel cell', operation: 'Continuous flow of fuel + oxidizer', example: 'Hydrogen fuel cell: 2H₂ + O₂ → 2H₂O + electricity', notes: 'No combustion. Higher efficiency than heat engines. Apollo missions.' },
        { type: 'Primary battery (non-rechargeable)', operation: 'One-time use', example: 'Alkaline AA (Zn + MnO₂), Li-thionyl chloride', notes: 'Discarded when discharged.' },
        { type: 'Secondary battery (rechargeable)', operation: 'Reversible', example: 'Lead-acid (cars), NiMH, Li-ion', notes: 'Recharging reverses the redox.' },
        { type: 'Li-ion battery', operation: 'Li⁺ shuttles between anode and cathode', example: 'Phones, EVs, laptops', notes: 'Anode = graphite (Li intercalation). Cathode = LiCoO₂ / LiFePO₄ / NMC.' },
        { type: 'Flow battery', operation: 'Liquid electrolyte pumped through cell', example: 'Vanadium redox flow battery (grid storage)', notes: 'Capacity scales with tank size. Long cycle life.' }
      ];

      var FAMOUS_CHEMISTS = [
        { name: __alloT('stem.molecule.antoine_lavoisier', 'Antoine Lavoisier'), year: '1780s', contrib: 'Law of conservation of mass; oxygen theory of combustion (overturned phlogiston).', notes: 'Executed in French Revolution (1794). "It took only an instant to cut off that head, and 100 years may not produce another like it."' },
        { name: __alloT('stem.molecule.john_dalton', 'John Dalton'), year: '1803', contrib: 'Atomic theory: matter is made of indivisible atoms; elements have unique atom types.', notes: 'Also studied color blindness (which he had).' },
        { name: __alloT('stem.molecule.amedeo_avogadro', 'Amedeo Avogadro'), year: '1811', contrib: 'Equal volumes of gas at same T,P contain equal numbers of molecules.', notes: 'Number named for him: 6.022×10²³ (number of particles in a mole).' },
        { name: __alloT('stem.molecule.dmitri_mendeleev', 'Dmitri Mendeleev'), year: '1869', contrib: 'Periodic table arranged by atomic mass; left gaps for undiscovered elements + predicted their properties.', notes: 'Predicted gallium, scandium, germanium — all later confirmed.' },
        { name: __alloT('stem.molecule.marie_curie', 'Marie Curie'), year: '1898–1911', contrib: 'Discovered polonium + radium; coined "radioactivity".', notes: 'Two Nobels (Physics 1903, Chemistry 1911). Only person to win Nobel in two distinct sciences.' },
        { name: __alloT('stem.molecule.fritz_haber', 'Fritz Haber'), year: '1909', contrib: 'Haber-Bosch process: N₂ + 3H₂ → 2NH₃. Made synthetic fertilizer possible.', notes: 'Nobel 1918. Also developed chemical weapons in WWI. Complex legacy.' },
        { name: __alloT('stem.molecule.linus_pauling', 'Linus Pauling'), year: '1930s–60s', contrib: 'Nature of the chemical bond; protein α-helix; electronegativity scale.', notes: 'Two Nobels (Chemistry 1954, Peace 1962). Promoted vitamin C megadosing — that part was wrong.' },
        { name: __alloT('stem.molecule.rosalind_franklin', 'Rosalind Franklin'), year: '1952', contrib: 'X-ray diffraction "Photo 51" — essential to determining DNA double helix.', notes: 'Died 1958 (ovarian cancer); Nobel awarded 1962 (posthumous Nobels not allowed). Watson & Crick + Wilkins shared it.' },
        { name: __alloT('stem.molecule.dorothy_hodgkin', 'Dorothy Hodgkin'), year: '1950s–60s', contrib: 'X-ray crystallography of penicillin, B12, insulin.', notes: 'Nobel 1964. Only British woman to win a science Nobel.' },
        { name: __alloT('stem.molecule.stephanie_kwolek', 'Stephanie Kwolek'), year: '1965', contrib: 'Invented Kevlar (poly-paraphenylene terephthalamide).', notes: 'Body armor, ballistic vests. Stiffer than steel by weight.' },
        { name: __alloT('stem.molecule.frances_arnold', 'Frances Arnold'), year: '1990s–2018', contrib: 'Directed evolution of enzymes.', notes: 'Nobel 2018. Engineered enzymes for sustainable manufacturing.' },
        { name: __alloT('stem.molecule.jennifer_doudna_emmanuelle_charpentier', 'Jennifer Doudna & Emmanuelle Charpentier'), year: '2012', contrib: 'CRISPR-Cas9 gene editing.', notes: 'Nobel 2020. Revolutionized genetic engineering.' }
      ];

      function renderGasLawsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.gas_laws_2', '💨 Gas laws')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.quantitative_relationships_between_p_v', 'Quantitative relationships between P, V, T, and n (moles) for gases. Use Kelvin for temperature.')),
          React.createElement('div', { className: 'space-y-2' },
            GAS_LAWS.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, g.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto' }, g.year)
                ),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-700 font-bold mb-1' }, g.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed mb-1' }, g.plain),
                React.createElement('div', { className: 'text-[10px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100' }, '🧪 ' + g.example)
              );
            })
          )
        );
      }

      function renderColligativeSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.colligative_properties', '🧂 Colligative properties')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.properties_that_depend_on_the_number_o', 'Properties that depend on the NUMBER of solute particles, not their identity. i = van\'t Hoff factor (1 for non-electrolyte, ~2 for NaCl, ~3 for CaCl₂).')),
          React.createElement('div', { className: 'space-y-2' },
            COLLIGATIVE_PROPS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, p.prop),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-700 font-bold mb-1' }, p.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed mb-1' }, p.plain),
                React.createElement('div', { className: 'text-[10px] text-slate-600 italic' }, '🌡 ' + p.example)
              );
            })
          )
        );
      }

      function renderRedoxSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.standard_reduction_potentials_e', '🔋 Standard reduction potentials (E°)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.higher_e_stronger_oxidizer_more_eager_', 'Higher E° = stronger oxidizer (more eager to GAIN electrons). To predict a redox reaction: cell potential = E°(cathode) − E°(anode). Positive → spontaneous.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Half-reaction', 'E° (V)', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                REDOX_PAIRS.map(function(r, i) {
                  return React.createElement('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, r.half),
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-bold text-indigo-700' }, r.e0),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, r.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderOrganicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.organic_functional_groups', '🧪 Organic functional groups')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.recognize_functional_groups_to_predict', 'Recognize functional groups to predict chemical behavior. R = "rest of molecule" (any carbon chain).')),
          React.createElement('div', { className: 'space-y-2' },
            ORGANIC_GROUPS.map(function(o, i) {
              return React.createElement('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, o.name),
                  React.createElement('span', { className: 'text-[11px] font-mono ml-auto px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold' }, o.formula)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Example: '), o.example),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.notes)
              );
            })
          )
        );
      }

      function renderSpectroSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.spectroscopy_methods', '📡 Spectroscopy methods')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.different_wavelengths_probe_different_', 'Different wavelengths probe different molecular properties. Chemists combine multiple methods to determine structure of unknown compounds.')),
          React.createElement('div', { className: 'space-y-2' },
            SPECTRO_METHODS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, s.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-600 font-mono ml-auto px-2 py-0.5 rounded bg-indigo-100 text-indigo-800' }, s.range)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Detects: '), s.detects),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Use: '), s.use)
              );
            })
          )
        );
      }

      function renderCrystalSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.crystal_structures_2', '💎 Crystal structures')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.how_atoms_ions_pack_in_solids_determin', 'How atoms/ions pack in solids determines material properties (hardness, conductivity, melting point, optical behavior).')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Structure', 'Coord #', 'Packing %', 'Example', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                CRYSTAL_STRUCTURES.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.coord),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.packing),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, c.example),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderBiochemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.biochemistry_classes_of_biomolecules', '🧬 Biochemistry — classes of biomolecules')),
          React.createElement('div', { className: 'space-y-2' },
            BIOCHEM_MOLECULES.map(function(b, i) {
              return React.createElement('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, b.class),
                  React.createElement('span', { className: 'text-[10px] text-slate-600 ml-auto italic' }, b.example)
                ),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-700 font-bold mb-1' }, b.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.notes)
              );
            })
          )
        );
      }

      function renderEnvironmentSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.atmospheric_chemistry', '🌫 Atmospheric chemistry')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.atmospheric_layers_bottom_to_top', 'Atmospheric layers (bottom to top)')),
            React.createElement('div', { className: 'space-y-1' },
              ATMOSPHERE_LAYERS.map(function(L, i) {
                return React.createElement('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, L.name),
                    React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700' }, L.altitude),
                    React.createElement('span', { className: 'text-[10px] font-mono text-slate-600' }, L.temp)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-600 italic' }, L.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.atmospheric_composition_dry_air_by_vol', 'Atmospheric composition (dry air, by volume)')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Gas', '%', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                ATMOSPHERIC_GASES.map(function(a, i) {
                  return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-bold text-indigo-700' }, a.gas),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, a.pct),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderNuclearSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.nuclear_chemistry', '☢ Nuclear chemistry')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.decay_and_nuclear_processes', 'Decay and nuclear processes')),
            React.createElement('div', { className: 'space-y-1' },
              NUCLEAR_PROCESSES.map(function(n, i) {
                return React.createElement('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, n.name),
                    React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 ml-auto' }, n.particle)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, n.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.notable_isotopes', 'Notable isotopes')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Isotope', 'Half-life (decay)', 'Use'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                COMMON_ISOTOPES.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-bold text-indigo-700' }, c.iso),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.halfLife),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px]' }, c.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderElectrochemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.electrochemistry_cell_types', '⚡ Electrochemistry — cell types')),
          React.createElement('div', { className: 'space-y-2' },
            ELECTROCHEM_CELLS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, c.type),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Operation: '), c.operation),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Example: '), c.example),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.chemistry_history_selected_figures', '🕰 Chemistry history — selected figures')),
          React.createElement('div', { className: 'space-y-2' },
            FAMOUS_CHEMISTS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-[12px] font-black text-indigo-900' }, c.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto font-mono' }, c.year)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-800 mb-1' }, c.contrib),
                React.createElement('div', { className: 'text-[10px] text-slate-600 italic' }, c.notes)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'vsepr') return renderVseprSection();
        if (expSection === 'bonds') return renderBondsSection();
        if (expSection === 'imf') return renderImfSection();
        if (expSection === 'reactions') return renderReactionsSection();
        if (expSection === 'library') return renderLibrarySection();
        if (expSection === 'acidbase') return renderAcidBaseSection();
        if (expSection === 'quantum') return renderQuantumSection();
        if (expSection === 'orbitals') return renderOrbitalsSection();
        if (expSection === 'periodic') return renderPeriodicSection();
        if (expSection === 'molarity') return renderMolaritySection();
        if (expSection === 'stoich') return renderStoichSection();
        if (expSection === 'phase') return renderPhaseSection();
        if (expSection === 'equilibrium') return renderEquilibriumSection();
        if (expSection === 'kinetics') return renderKineticsSection();
        if (expSection === 'thermo') return renderThermoSection();
        if (expSection === 'polymers') return renderPolymersSection();
        if (expSection === 'safety') return renderSafetySection();
        if (expSection === 'gaslaws') return renderGasLawsSection();
        if (expSection === 'colligative') return renderColligativeSection();
        if (expSection === 'redox') return renderRedoxSection();
        if (expSection === 'organic') return renderOrganicSection();
        if (expSection === 'spectro') return renderSpectroSection();
        if (expSection === 'crystal') return renderCrystalSection();
        if (expSection === 'biochem') return renderBiochemSection();
        if (expSection === 'environment') return renderEnvironmentSection();
        if (expSection === 'nuclear') return renderNuclearSection();
        if (expSection === 'electrochem') return renderElectrochemSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'lab') return renderLabSection();
        if (expSection === 'medchem') return renderMedchemSection();
        if (expSection === 'food') return renderFoodSection();
        if (expSection === 'materials') return renderMaterialsSection();
        if (expSection === 'inorganic') return renderInorganicSection();
        if (expSection === 'enviro2') return renderEnviro2Section();
        if (expSection === 'green') return renderGreenSection();
        if (expSection === 'mol_geo') return renderMolGeoSection();
        if (expSection === 'isomers') return renderIsomersSection();
        if (expSection === 'noble') return renderNobleSection();
        if (expSection === 'allelements') return renderAllElementsSection();
        if (expSection === 'minerals') return renderMineralsSection();
        if (expSection === 'pharma') return renderPharmaSection();
        if (expSection === 'household') return renderHouseholdSection();
        if (expSection === 'pH_scale') return renderPhScaleSection();
        if (expSection === 'foods') return renderFoodsSection();
        if (expSection === 'meltboil') return renderMeltboilSection();
        if (expSection === 'solubility') return renderSolubilitySection();
        if (expSection === 'compounds') return renderCompoundsSection();
        if (expSection === 'flavor_chem') return renderFlavorChemSection();
        if (expSection === 'colors_chem') return renderColorsChemSection();
        if (expSection === 'industrial') return renderIndustrialSection();
        if (expSection === 'bondMystery') return renderBondMysterySection();
        if (expSection === 'solventMystery') return renderSolventMysterySection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var INDUSTRIAL_CHEMS = [
        { product: 'Sulfuric acid (H₂SO₄)', volume: '~270 million tons/yr', use: 'Fertilizers (phosphate processing), oil refining, metal pickling, batteries', notes: 'Most produced industrial chemical. Indicator of economic activity.' },
        { product: 'Ammonia (NH₃)', volume: '~180 million tons/yr', use: 'Fertilizer (urea, nitrates), refrigerant, cleaning', notes: 'Haber-Bosch process. ~1-2% of global energy consumption.' },
        { product: 'Ethylene (C₂H₄)', volume: '~210 million tons/yr', use: 'Polyethylene plastic, antifreeze, fibers', notes: 'Most produced organic. Made from steam cracking of natural gas/naphtha.' },
        { product: 'Propylene (C₃H₆)', volume: '~130 million tons/yr', use: 'Polypropylene plastic, propylene oxide', notes: 'Second most produced organic.' },
        { product: 'Chlorine (Cl₂)', volume: '~75 million tons/yr', use: 'PVC plastic, water treatment, bleach, pharmaceuticals', notes: 'Co-product with NaOH from electrolysis of brine.' },
        { product: 'Sodium hydroxide (NaOH)', volume: '~80 million tons/yr', use: 'Paper, soap, drain cleaners, biodiesel', notes: 'Caustic soda. Co-produced with Cl₂.' },
        { product: 'Phosphoric acid (H₃PO₄)', volume: '~50 million tons/yr', use: 'Fertilizers, food additive, rust converter', notes: 'Mostly used for phosphate fertilizers.' },
        { product: 'Nitric acid (HNO₃)', volume: '~60 million tons/yr', use: 'Fertilizers, explosives, plastics', notes: 'Made from ammonia via Ostwald process.' },
        { product: 'Urea (CO(NH₂)₂)', volume: '~180 million tons/yr', use: 'Nitrogen fertilizer (most common worldwide)', notes: 'Highest N content of common fertilizers (~46%).' },
        { product: 'Hydrochloric acid (HCl)', volume: '~20 million tons/yr', use: 'Metal pickling, oil well stimulation, food processing', notes: 'Often a by-product of organic chlorination.' },
        { product: 'Methanol (CH₃OH)', volume: '~110 million tons/yr', use: 'Formaldehyde, fuel additive, antifreeze', notes: 'Future shipping fuel + chemical feedstock interest.' },
        { product: 'Polyethylene', volume: '~110 million tons/yr', use: 'Plastic bags, bottles, pipes, films', notes: 'Most produced plastic. HDPE + LDPE differ in branching → density + use.' },
        { product: 'PVC (polyvinyl chloride)', volume: '~50 million tons/yr', use: 'Pipes, window frames, flooring, medical devices', notes: 'Third most produced plastic.' },
        { product: 'Polypropylene', volume: '~80 million tons/yr', use: 'Plastic furniture, fibers (carpets), packaging', notes: 'Second most produced plastic.' },
        { product: 'Polystyrene', volume: '~30 million tons/yr', use: 'Foam packaging, disposable cups, insulation', notes: 'EPS (expanded) for cups, XPS for insulation.' },
        { product: 'PET (polyethylene terephthalate)', volume: '~30 million tons/yr', use: 'Beverage bottles, fibers (polyester)', notes: 'Most recycled plastic. Bottle-to-bottle recycling growing.' },
        { product: 'Cement', volume: '~4 billion tons/yr', use: 'Construction (with sand + gravel = concrete)', notes: '~8% of global CO₂ emissions. Heating limestone releases CO₂ (chemistry + fuel).' },
        { product: 'Steel', volume: '~1.8 billion tons/yr', use: 'Construction, transportation, packaging', notes: '~7% of global CO₂. Switching to hydrogen reduction in development.' }
      ];

      function renderIndustrialSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.industrial_scale_chemicals', '🏗 Industrial-scale chemicals')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.volumes_are_approximate_annual_world_p', 'Volumes are approximate annual world production. Chemistry at industrial scale underlies modern civilization.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Product', 'Annual volume', 'Use', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                INDUSTRIAL_CHEMS.map(function(I, i) {
                  return React.createElement('tr', { key: 'I'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, I.product),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, I.volume),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, I.use),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, I.notes)
                  );
                })
              )
            )
          )
        );
      }

      var COLOR_CHEMISTRY = [
        { color: 'Beet red (betanin)', compound: 'C₂₄H₂₆N₂O₁₃', source: 'Beets', notes: 'Water-soluble. Not heat-stable above ~70°C.' },
        { color: 'Carrot orange (β-carotene)', compound: 'C₄₀H₅₆', source: 'Carrots, sweet potato', notes: 'Fat-soluble. Vitamin A precursor.' },
        { color: 'Tomato red (lycopene)', compound: 'C₄₀H₅₆', source: 'Tomatoes, watermelon', notes: 'Becomes more bioavailable when cooked + with fat.' },
        { color: 'Spinach green (chlorophyll a)', compound: 'C₅₅H₇₂MgN₄O₅', source: 'All green plants', notes: 'Mg at center of porphyrin ring (like Fe in heme).' },
        { color: 'Blueberry blue (anthocyanin)', compound: 'C₁₅H₁₁O₆⁺ class', source: 'Blueberries, red cabbage', notes: 'pH indicator! Red in acid, blue/purple at neutral, green in base.' },
        { color: 'Egg yolk yellow (lutein + zeaxanthin)', compound: 'C₄₀H₅₆O₂', source: 'Egg yolk, leafy greens', notes: 'Concentrated in retinal macula. May protect against age-related macular degeneration.' },
        { color: 'Saffron yellow (crocin)', compound: 'C₄₄H₆₄O₂₄', source: 'Saffron threads', notes: 'Most expensive spice by weight (~$5-10/g). 150 flowers per gram.' },
        { color: 'Turmeric yellow (curcumin)', compound: 'C₂₁H₂₀O₆', source: 'Turmeric root', notes: 'Poor bioavailability — combine with black pepper (piperine) to increase absorption.' },
        { color: 'Indigo blue', compound: 'C₁₆H₁₀N₂O₂', source: 'Indigofera plants (originally); now mostly synthetic', notes: 'Original blue jeans dye. Insoluble — applied as soluble leuco form, oxidizes blue on air.' },
        { color: 'Tyrian purple', compound: '6,6\'-dibromoindigo', source: 'Murex snails (~12,000 snails per gram!)', notes: 'Ancient Roman royalty exclusive. Why "born to the purple".' },
        { color: 'Henna red', compound: 'lawsone C₁₀H₆O₃', source: 'Lawsonia inermis leaves', notes: 'Stains skin + hair red-brown. Traditional in many cultures.' },
        { color: 'Cochineal red (carmine)', compound: 'carminic acid C₂₂H₂₀O₁₃', source: 'Cochineal insects (Dactylopius coccus)', notes: 'Vivid red. Used in food, cosmetics. ~70,000 insects per pound.' },
        { color: 'Prussian blue', compound: 'Fe₇(CN)₁₈', source: 'Synthesized 1706', notes: 'First modern synthetic pigment. Color of architectural drawings ("blueprints").' },
        { color: 'Ultramarine blue', compound: 'Na₈Al₆Si₆O₂₄S₂', source: 'Originally crushed lapis lazuli', notes: 'More expensive than gold in Middle Ages. Used in Vermeer\'s "Girl with a Pearl Earring".' },
        { color: 'Vermilion red', compound: 'HgS (mercuric sulfide)', source: 'Cinnabar mineral', notes: 'Toxic — contains mercury. Used in red lacquer, paint, lipstick historically.' },
        { color: 'White lead', compound: 'Pb₃(CO₃)₂(OH)₂', source: 'Lead carbonate', notes: 'Brilliant white pigment. Toxic — banned in most countries. Replaced by titanium dioxide.' },
        { color: 'Chrome yellow', compound: 'PbCrO₄', source: 'Synthesis', notes: 'Van Gogh\'s sunflowers. Darkens over time due to chrome reduction. Lead toxicity.' },
        { color: 'Cobalt blue', compound: 'CoAl₂O₄', source: 'Synthesis (since 1802)', notes: 'Stable, intense blue. Used in glass, ceramics, paint.' },
        { color: 'Mauve (first synthetic dye)', compound: 'C₂₆H₂₃N₄·HCl', source: 'Synthesized by William Perkin (1856)', notes: 'Accidental discovery while trying to synthesize quinine. Launched synthetic dye industry.' },
        { color: 'Fluorescein green', compound: 'C₂₀H₁₂O₅', source: 'Synthesis', notes: 'Used in eye exams (visualize corneal damage), tracking water flow.' },
        { color: 'Phthalocyanine green/blue', compound: 'Cu-N₈ macrocycle', source: 'Synthesis', notes: 'Stable industrial pigments. Photodynamic therapy research.' },
        { color: 'Titanium white', compound: 'TiO₂', source: 'Synthesis (rutile or anatase)', notes: 'Replaced lead white. Most common white pigment in modern paint, food (E171), sunscreen.' }
      ];

      function renderColorsChemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.color_chemistry_pigments_dyes', '🎨 Color chemistry — pigments + dyes')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.color_in_chemistry_usually_comes_from_', 'Color in chemistry usually comes from absorption of specific visible wavelengths. Conjugated double-bond systems (like in chlorophyll, beta-carotene) absorb in the visible.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Color', 'Compound', 'Source', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                COLOR_CHEMISTRY.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.color),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, c.compound),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, c.source),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final molecules data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var FLAVOR_SCENT = [
        { compound: 'Vanillin', formula: 'C₈H₈O₃', source: 'Vanilla bean', notes: 'Most vanilla in food is synthetic vanillin from lignin or guaiacol.' },
        { compound: 'Capsaicin', formula: 'C₁₈H₂₇NO₃', source: 'Chili peppers', notes: 'Activates TRPV1 heat receptor. Fat-soluble — milk soothes mouth.' },
        { compound: 'Piperine', formula: 'C₁₇H₁₉NO₃', source: 'Black pepper', notes: 'Sharp + pungent. Different mechanism than capsaicin.' },
        { compound: 'Allyl isothiocyanate', formula: 'C₄H₅NS', source: 'Mustard, wasabi, horseradish', notes: 'Causes pain via TRPA1. Volatile — burns sinuses, not tongue.' },
        { compound: 'Menthol', formula: 'C₁₀H₂₀O', source: 'Mint', notes: 'Cooling sensation. Activates TRPM8 cold receptor.' },
        { compound: 'Limonene', formula: 'C₁₀H₁₆', source: 'Citrus peel', notes: 'Two enantiomers smell different! D-limonene = oranges; L = pine + turpentine.' },
        { compound: 'Caffeine', formula: 'C₈H₁₀N₄O₂', source: 'Coffee, tea, cocoa', notes: 'Bitter tasting. Adenosine receptor blocker.' },
        { compound: 'Theobromine', formula: 'C₇H₈N₄O₂', source: 'Cocoa', notes: 'Mild stimulant. Toxic to dogs (slow metabolism).' },
        { compound: 'Eugenol', formula: 'C₁₀H₁₂O₂', source: 'Cloves, basil, cinnamon', notes: 'Used in dentistry (mild anesthetic). Strong clove scent.' },
        { compound: 'Cinnamaldehyde', formula: 'C₉H₈O', source: 'Cinnamon bark', notes: 'Primary flavor of cinnamon. Anti-microbial.' },
        { compound: 'Diacetyl', formula: 'C₄H₆O₂', source: 'Butter (natural), microwave popcorn', notes: 'Butter flavor. "Popcorn lung" lung damage in workers from inhalation.' },
        { compound: 'Linalool', formula: 'C₁₀H₁₈O', source: 'Lavender, basil, citrus', notes: 'Floral scent. Used in soaps + lotions. Reportedly relaxing.' },
        { compound: 'Geraniol', formula: 'C₁₀H₁₈O', source: 'Geraniums, roses, citronella', notes: 'Rose scent. Mosquito repellent.' },
        { compound: 'Methyl salicylate', formula: 'C₈H₈O₃', source: 'Wintergreen, birch', notes: 'Topical pain relievers (icy-hot). Also gives sports drink "wintergreen" flavor.' },
        { compound: 'Allicin', formula: 'C₆H₁₀OS₂', source: 'Crushed garlic', notes: 'Forms when garlic is cut. Antimicrobial. Persists on breath via lungs.' },
        { compound: 'Citral', formula: 'C₁₀H₁₆O', source: 'Lemongrass, lemon zest', notes: 'Lemon-scented. Mixture of two isomers (geranial + neral).' },
        { compound: 'Anethole', formula: 'C₁₀H₁₂O', source: 'Anise, fennel, licorice', notes: 'Licorice flavor. Trans isomer 13× sweeter than sugar.' },
        { compound: 'Carvone', formula: 'C₁₀H₁₄O', source: 'Caraway / spearmint', notes: 'Two enantiomers — one is spearmint, other is caraway. Brain distinguishes them!' },
        { compound: '2,4,6-trichloroanisole', formula: 'C₇H₅Cl₃O', source: 'Cork taint', notes: 'Detectable at parts per trillion. Cause of "corked" wines.' },
        { compound: 'Isoamyl acetate', formula: 'C₇H₁₄O₂', source: 'Bananas, pears (esters)', notes: 'Classic banana scent. Bee alarm pheromone.' },
        { compound: 'Ethyl butyrate', formula: 'C₆H₁₂O₂', source: 'Pineapple', notes: 'Sweet fruity scent.' },
        { compound: 'Methylpyrazine + derivatives', formula: 'C₅H₆N₂ family', source: 'Roasted foods', notes: 'From Maillard reaction. Coffee, chocolate, bread crust aromas.' },
        { compound: '2-acetyl-1-pyrroline', formula: 'C₆H₉NO', source: 'Jasmine rice, basmati, popcorn', notes: 'Distinctive aroma. Threshold ~0.1 ppb in air.' },
        { compound: 'Sotolon', formula: 'C₆H₈O₃', source: 'Maple syrup, fenugreek', notes: 'Sweet maple/curry scent. Eating fenugreek can make sweat smell like maple syrup.' },
        { compound: 'Indole', formula: 'C₈H₇N', source: 'Feces (in high concentration) / jasmine flowers (dilute)', notes: 'High concentration = unpleasant. Dilute = floral. Same molecule!' },
        { compound: 'Skatole', formula: 'C₉H₉N', source: 'Feces, civet, beets', notes: 'Like indole — disgusting concentrated, attractive diluted. Used in perfumes.' },
        { compound: 'Mercaptan (methanethiol)', formula: 'CH₃SH', source: 'Skunk spray, added to natural gas', notes: 'Detectable at parts per billion. Added to gas as safety warning.' },
        { compound: '(R)-Linalool', formula: 'C₁₀H₁₈O', source: 'Coriander leaves', notes: 'Some people (genetic variant in olfactory receptor) perceive cilantro as soapy.' }
      ];

      function renderFlavorChemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.flavor_scent_molecules', '👃 Flavor + scent molecules')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.olfactory_receptors_detect_specific_mo', 'Olfactory receptors detect specific molecules. Humans have ~400 different olfactory receptors and can distinguish ~10,000 distinct smells (some claim trillions).')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Compound', 'Formula', 'Source', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                FLAVOR_SCENT.map(function(f, i) {
                  return React.createElement('tr', { key: 'f'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, f.compound),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, f.formula),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, f.source),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, f.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data tables (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var SOLUBILITY_RULES = [
        { rule: 'All Group 1 (alkali metal) salts', soluble: 'Yes', exceptions: 'None significant', notes: 'Li⁺, Na⁺, K⁺, Rb⁺, Cs⁺ — always soluble in water.' },
        { rule: 'All ammonium (NH₄⁺) salts', soluble: 'Yes', exceptions: 'None significant', notes: 'Like alkali metals — always soluble.' },
        { rule: 'All nitrates (NO₃⁻)', soluble: 'Yes', exceptions: 'None', notes: 'Universal solubility. AgNO₃, Cu(NO₃)₂, Pb(NO₃)₂ all soluble.' },
        { rule: 'All acetates (CH₃COO⁻)', soluble: 'Yes', exceptions: 'AgCH₃COO slightly soluble', notes: 'Most acetates dissolve.' },
        { rule: 'All chlorates + perchlorates', soluble: 'Yes', exceptions: 'None significant', notes: 'ClO₃⁻ and ClO₄⁻.' },
        { rule: 'Halides (Cl⁻, Br⁻, I⁻)', soluble: 'Mostly yes', exceptions: 'Ag⁺, Pb²⁺, Hg₂²⁺ insoluble', notes: 'AgCl famously insoluble (white precipitate test).' },
        { rule: 'Sulfates (SO₄²⁻)', soluble: 'Mostly yes', exceptions: 'Ba²⁺, Pb²⁺, Sr²⁺, Ca²⁺ (slight)', notes: 'BaSO₄ used for X-ray contrast because insoluble.' },
        { rule: 'Hydroxides (OH⁻)', soluble: 'Mostly no', exceptions: 'Group 1 + Ba²⁺ soluble', notes: 'NaOH, KOH dissolve well. Ca(OH)₂ slightly soluble.' },
        { rule: 'Carbonates (CO₃²⁻)', soluble: 'Mostly no', exceptions: 'Group 1 + NH₄⁺ soluble', notes: 'CaCO₃ insoluble (limestone, marble).' },
        { rule: 'Phosphates (PO₄³⁻)', soluble: 'Mostly no', exceptions: 'Group 1 + NH₄⁺ soluble', notes: 'Why phosphate fertilizer washes off into rivers slowly.' },
        { rule: 'Sulfides (S²⁻)', soluble: 'Mostly no', exceptions: 'Group 1, NH₄⁺, Group 2 soluble', notes: 'Many colored metal sulfides (CuS black, ZnS white, CdS yellow).' },
        { rule: 'Chromates (CrO₄²⁻)', soluble: 'Mostly no', exceptions: 'Group 1 + NH₄⁺ soluble', notes: 'PbCrO₄ is yellow pigment ("chrome yellow").' },
        { rule: 'Oxides (O²⁻)', soluble: 'Mostly no', exceptions: 'Group 1 react with water → hydroxides', notes: 'Na₂O + H₂O → 2 NaOH.' }
      ];

      var SOLUBILITY_DATA = [
        { compound: 'NaCl (table salt)', solubility: '360 g/L at 20°C', notes: 'Common reference. ~26% by mass at saturation.' },
        { compound: 'Sucrose (table sugar)', solubility: '2000 g/L at 20°C', notes: 'Very soluble. Hot tea dissolves more.' },
        { compound: 'KNO₃', solubility: '316 g/L at 20°C', notes: 'Huge temperature dependence (13 g/L at 0°C → 2470 g/L at 100°C).' },
        { compound: 'NaHCO₃ (baking soda)', solubility: '96 g/L at 20°C', notes: 'Moderate.' },
        { compound: 'CaCO₃ (limestone)', solubility: '0.013 g/L at 20°C', notes: 'Practically insoluble. Dissolves slowly in acid water.' },
        { compound: 'AgCl', solubility: '0.0019 g/L at 25°C', notes: 'Famous insoluble. White precipitate in Cl⁻ test.' },
        { compound: 'BaSO₄', solubility: '0.0024 g/L at 25°C', notes: 'Insoluble — safe for X-ray contrast even though Ba²⁺ is toxic.' },
        { compound: 'PbS', solubility: '~10⁻⁹ g/L at 25°C', notes: 'Galena (Pb ore). Extremely insoluble.' },
        { compound: 'AgNO₃', solubility: '2160 g/L at 20°C', notes: 'Very soluble. Used in many analytical tests.' },
        { compound: 'CuSO₄·5H₂O', solubility: '320 g/L at 20°C', notes: 'Blue crystals. Pesticide, fungicide.' },
        { compound: 'O₂ (gas) in water', solubility: '~8.3 mg/L at 25°C', notes: 'Decreases with temperature → why warm rivers struggle for fish.' },
        { compound: 'CO₂ (gas) in water', solubility: '~1.5 g/L at 25°C (1 atm)', notes: 'Increases with pressure → carbonation.' },
        { compound: 'N₂ (gas) in water', solubility: '~20 mg/L at 25°C', notes: 'Dissolved nitrogen — divers worry about it (the bends).' },
        { compound: 'CH₄ (methane) in water', solubility: '~22 mg/L at 25°C', notes: 'Low. Methane hydrates form at high P + low T (oceans, permafrost).' },
        { compound: 'I₂ in water', solubility: '0.33 g/L at 20°C', notes: 'Low — KI is added to increase iodine solubility (Lugol\'s solution).' },
        { compound: 'I₂ in ethanol', solubility: '~210 g/L', notes: 'Much more soluble in polar organic. Tincture of iodine.' },
        { compound: 'Hexane in water', solubility: '~0.01 g/L', notes: 'Essentially immiscible. Forms layer above water.' }
      ];

      var COMMON_COMPOUNDS = [
        { name: __alloT('stem.molecule.water_2', 'Water'), formula: 'H₂O', mw: 18.0, notes: 'Most familiar molecule. Universal solvent. 70% of body weight.' },
        { name: __alloT('stem.molecule.carbon_dioxide_2', 'Carbon dioxide'), formula: 'CO₂', mw: 44.0, notes: 'Greenhouse gas. Plant food via photosynthesis. ~420 ppm in atmosphere (2024).' },
        { name: __alloT('stem.molecule.methane_2', 'Methane'), formula: 'CH₄', mw: 16.0, notes: 'Natural gas. Powerful greenhouse gas. Cow burps, landfills.' },
        { name: __alloT('stem.molecule.ammonia_3', 'Ammonia'), formula: 'NH₃', mw: 17.0, notes: 'Fertilizer feedstock (Haber process). Pungent smell. Household cleaner.' },
        { name: __alloT('stem.molecule.hydrochloric_acid_3', 'Hydrochloric acid'), formula: 'HCl', mw: 36.5, notes: 'Stomach acid. Strong acid in lab.' },
        { name: __alloT('stem.molecule.sulfuric_acid_3', 'Sulfuric acid'), formula: 'H₂SO₄', mw: 98.1, notes: 'Most produced industrial chemical. Battery acid, fertilizer.' },
        { name: __alloT('stem.molecule.nitric_acid_3', 'Nitric acid'), formula: 'HNO₃', mw: 63.0, notes: 'Strong oxidizer. Explosives, fertilizers.' },
        { name: __alloT('stem.molecule.sodium_hydroxide_lye', 'Sodium hydroxide (lye)'), formula: 'NaOH', mw: 40.0, notes: 'Strong base. Soap-making, drain cleaner.' },
        { name: __alloT('stem.molecule.calcium_hydroxide_slaked_lime', 'Calcium hydroxide (slaked lime)'), formula: 'Ca(OH)₂', mw: 74.1, notes: 'Construction mortar, pH adjustment.' },
        { name: __alloT('stem.molecule.sodium_chloride_2', 'Sodium chloride'), formula: 'NaCl', mw: 58.4, notes: 'Table salt. Essential for life.' },
        { name: __alloT('stem.molecule.calcium_carbonate_2', 'Calcium carbonate'), formula: 'CaCO₃', mw: 100.1, notes: 'Limestone, marble, chalk, eggshells.' },
        { name: __alloT('stem.molecule.sodium_bicarbonate', 'Sodium bicarbonate'), formula: 'NaHCO₃', mw: 84.0, notes: 'Baking soda. Antacid. Fire extinguishers.' },
        { name: __alloT('stem.molecule.hydrogen_peroxide', 'Hydrogen peroxide'), formula: 'H₂O₂', mw: 34.0, notes: 'Disinfectant. Decomposes to water + O₂.' },
        { name: __alloT('stem.molecule.ozone', 'Ozone'), formula: 'O₃', mw: 48.0, notes: 'Protective in stratosphere; pollutant at ground level.' },
        { name: __alloT('stem.molecule.glucose_2', 'Glucose'), formula: 'C₆H₁₂O₆', mw: 180.2, notes: 'Body\'s primary fuel. Blood sugar.' },
        { name: __alloT('stem.molecule.sucrose_table_sugar', 'Sucrose (table sugar)'), formula: 'C₁₂H₂₂O₁₁', mw: 342.3, notes: 'Glucose + fructose disaccharide.' },
        { name: __alloT('stem.molecule.ethanol_2', 'Ethanol'), formula: 'C₂H₅OH', mw: 46.1, notes: 'Alcoholic beverages, fuel additive, hand sanitizer.' },
        { name: __alloT('stem.molecule.methanol_2', 'Methanol'), formula: 'CH₃OH', mw: 32.0, notes: 'Wood alcohol. Toxic — causes blindness, death.' },
        { name: __alloT('stem.molecule.acetone', 'Acetone'), formula: '(CH₃)₂CO', mw: 58.1, notes: 'Nail polish remover. Common organic solvent.' },
        { name: __alloT('stem.molecule.acetic_acid_2', 'Acetic acid'), formula: 'CH₃COOH', mw: 60.1, notes: 'Vinegar (~5% in water). Glacial form solid below 17°C.' },
        { name: __alloT('stem.molecule.formaldehyde', 'Formaldehyde'), formula: 'HCHO', mw: 30.0, notes: 'Preservative (formalin). Indoor air contaminant.' },
        { name: __alloT('stem.molecule.benzene', 'Benzene'), formula: 'C₆H₆', mw: 78.1, notes: 'Aromatic ring. Carcinogen. Industrial solvent (regulated).' },
        { name: __alloT('stem.molecule.caffeine_3', 'Caffeine'), formula: 'C₈H₁₀N₄O₂', mw: 194.2, notes: 'Stimulant. World\'s most consumed psychoactive drug.' },
        { name: __alloT('stem.molecule.aspirin_3', 'Aspirin'), formula: 'C₉H₈O₄', mw: 180.2, notes: 'Acetylsalicylic acid. Pain reliever, blood thinner.' },
        { name: __alloT('stem.molecule.penicillin_g', 'Penicillin G'), formula: 'C₁₆H₁₈N₂O₄S', mw: 334.4, notes: 'First mass antibiotic. β-lactam ring.' },
        { name: 'DDT', formula: 'C₁₄H₉Cl₅', mw: 354.5, notes: 'Pesticide. Banned in most countries due to environmental persistence.' },
        { name: 'TNT', formula: 'C₇H₅N₃O₆', mw: 227.1, notes: 'Trinitrotoluene. Explosive standard reference.' },
        { name: __alloT('stem.molecule.glycerin_glycerol', 'Glycerin (glycerol)'), formula: 'C₃H₈O₃', mw: 92.1, notes: 'Sweet, viscous. Moisturizer, food additive, explosive precursor (nitroglycerin).' },
        { name: __alloT('stem.molecule.urea_2', 'Urea'), formula: 'CO(NH₂)₂', mw: 60.1, notes: 'First organic compound synthesized from inorganic (Wöhler 1828). Fertilizer.' },
        { name: __alloT('stem.molecule.iron_iii_oxide_rust', 'Iron(III) oxide (rust)'), formula: 'Fe₂O₃', mw: 159.7, notes: 'Iron rust. Red pigment. Same as hematite mineral.' },
        { name: __alloT('stem.molecule.calcium_phosphate', 'Calcium phosphate'), formula: 'Ca₃(PO₄)₂', mw: 310.2, notes: 'Main bone + tooth mineral (as hydroxyapatite).' },
        { name: __alloT('stem.molecule.silicon_dioxide', 'Silicon dioxide'), formula: 'SiO₂', mw: 60.1, notes: 'Quartz, sand, glass. Most abundant mineral.' },
        { name: __alloT('stem.molecule.aluminum_oxide_2', 'Aluminum oxide'), formula: 'Al₂O₃', mw: 102.0, notes: 'Corundum, sapphire, ruby (with chromium). Abrasive.' },
        { name: __alloT('stem.molecule.titanium_dioxide', 'Titanium dioxide'), formula: 'TiO₂', mw: 79.9, notes: 'White pigment in paint, sunscreen, food. Highly reflective.' },
        { name: __alloT('stem.molecule.sodium_fluoride', 'Sodium fluoride'), formula: 'NaF', mw: 42.0, notes: 'Toothpaste additive. Strengthens enamel as fluorapatite.' }
      ];

      function renderSolubilitySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.solubility_rules_data', '◐ Solubility rules + data')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.rules_of_thumb_for_ionic_compound_solu', 'Rules of thumb for ionic compound solubility in water. Helpful for predicting precipitation reactions.')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.general_solubility_rules', 'General solubility rules')),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    ['Rule', 'Soluble?', 'Exceptions', 'Notes'].map(function(hh, i) {
                      return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                React.createElement('tbody', null,
                  SOLUBILITY_RULES.map(function(r, i) {
                    return React.createElement('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800 text-[10px]' }, r.rule),
                      React.createElement('td', { className: 'px-2 py-1 font-bold text-indigo-700' }, r.soluble),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, r.exceptions),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, r.notes)
                    );
                  })
                )
              )
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.solubility_of_specific_compounds_in_wa', 'Solubility of specific compounds in water')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Compound', 'Solubility', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                SOLUBILITY_DATA.map(function(s, i) {
                  return React.createElement('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.compound),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, s.solubility),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCompoundsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.common_chemical_compounds', '⌬ Common chemical compounds')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.molecular_weights_in_g_mol_listed_in_r', 'Molecular weights in g/mol. Listed in rough order of familiarity.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Compound', 'Formula', 'MW', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                COMMON_COMPOUNDS.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, c.formula),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, c.mw),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — More dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var PH_EXAMPLES = [
        { ph: 0, substance: 'Battery acid (H₂SO₄ ~37%)', notes: 'Extremely acidic. Will dissolve metals.' },
        { ph: 1, substance: 'Hydrochloric acid (1 M)', notes: 'Stomach acid is around pH 1.5-3.5.' },
        { ph: 2, substance: 'Lemon juice, vinegar (some)', notes: 'Citric + acetic acids. Sour taste.' },
        { ph: 3, substance: 'Orange juice, cola, wine', notes: 'Dissolves tooth enamel over time.' },
        { ph: 4, substance: 'Tomato juice, beer', notes: 'Mildly acidic.' },
        { ph: 5, substance: 'Black coffee, banana, acid rain', notes: 'Acid rain typically 4.0-5.5.' },
        { ph: 5.5, substance: 'Skin surface', notes: 'Slightly acidic — "acid mantle" protects against bacteria.' },
        { ph: 6, substance: 'Milk, saliva, urine (normal)', notes: 'Slightly acidic. Urine varies 4.5-8.0.' },
        { ph: 7, substance: 'Pure water', notes: 'Neutral. At 25°C.' },
        { ph: 7.4, substance: 'Human blood', notes: 'Tightly regulated 7.35-7.45. Outside range = serious illness.' },
        { ph: 8, substance: 'Seawater, baking soda solution', notes: 'Seawater 7.5-8.4 — has dropped ~0.1 since pre-industrial (ocean acidification).' },
        { ph: 9, substance: 'Milk of magnesia, borax', notes: 'Mildly basic.' },
        { ph: 10, substance: 'Antacid tablets', notes: 'Neutralize stomach acid.' },
        { ph: 11, substance: 'Ammonia (household)', notes: 'Strongly basic.' },
        { ph: 12, substance: 'Soapy water, bleach', notes: 'Bleach pH ~12-13.' },
        { ph: 13, substance: 'Oven cleaner, lye solution', notes: 'Caustic — handle with gloves.' },
        { ph: 14, substance: 'Sodium hydroxide (1 M)', notes: 'Drain cleaner. Severe burns.' }
      ];

      var FOODS_NUTRITION = [
        { food: 'Egg (large, ~50g)', cal: '~70', protein: '6g', notes: 'Complete protein. Yolk has cholesterol + nutrients (lutein, choline).' },
        { food: 'Milk (1 cup, whole)', cal: '~150', protein: '8g', notes: 'Lactose (sugar), casein + whey proteins, calcium.' },
        { food: 'Bread (1 slice, white)', cal: '~80', protein: '3g', notes: 'Mostly starch (gelatinized during baking). Gluten gives elastic texture.' },
        { food: 'Rice (1 cup cooked)', cal: '~200', protein: '4g', notes: 'Mostly carbohydrate. White rice = bran + germ removed.' },
        { food: 'Chicken breast (100g cooked)', cal: '~165', protein: '31g', notes: 'High protein, low fat. Lean.' },
        { food: 'Beef (100g, 80/20 ground)', cal: '~250', protein: '26g', notes: 'Higher fat than chicken. Iron, B12.' },
        { food: 'Salmon (100g)', cal: '~210', protein: '20g', notes: 'Omega-3 fatty acids (EPA + DHA).' },
        { food: 'Avocado (1 medium)', cal: '~240', protein: '3g', notes: 'Monounsaturated fat, fiber, potassium.' },
        { food: 'Almonds (1 oz, ~28g)', cal: '~160', protein: '6g', notes: 'Good fats, vitamin E, magnesium.' },
        { food: 'Apple (medium)', cal: '~95', protein: '0.5g', notes: 'Fiber (pectin), vitamin C, natural sugars (fructose).' },
        { food: 'Banana (medium)', cal: '~105', protein: '1g', notes: 'Potassium. Slightly higher in sugar as it ripens.' },
        { food: 'Broccoli (1 cup chopped)', cal: '~30', protein: '2.5g', notes: 'Vitamin C, K, fiber, sulforaphane.' },
        { food: 'Carrot (medium)', cal: '~25', protein: '0.5g', notes: 'Beta-carotene (precursor to vitamin A).' },
        { food: 'Potato (medium baked)', cal: '~160', protein: '4g', notes: 'Mostly starch. Vitamin C, potassium.' },
        { food: 'Sweet potato', cal: '~115', protein: '2g', notes: 'Beta-carotene-rich. Lower glycemic than white potato.' },
        { food: 'Beans (black, 1 cup cooked)', cal: '~225', protein: '15g', notes: 'Plant protein. Fiber. Iron, folate.' },
        { food: 'Lentils (1 cup cooked)', cal: '~230', protein: '18g', notes: 'Plant protein. Fast-cooking pulse.' },
        { food: 'Tofu (100g)', cal: '~75', protein: '8g', notes: 'Soybean curd. Complete plant protein.' },
        { food: 'Cheese (cheddar, 1 oz)', cal: '~115', protein: '7g', notes: 'Concentrated milk protein + fat. Calcium.' },
        { food: 'Yogurt (Greek, 6 oz)', cal: '~100', protein: '17g', notes: 'High protein. Live cultures (probiotics).' },
        { food: 'Olive oil (1 tbsp)', cal: '~120', protein: '0g', notes: 'Mediterranean diet staple. Monounsaturated.' },
        { food: 'Butter (1 tbsp)', cal: '~100', protein: '0g', notes: 'Saturated fat. Dairy.' },
        { food: 'Sugar (granulated, 1 tsp)', cal: '~16', protein: '0g', notes: 'Sucrose. Pure carbohydrate.' },
        { food: 'Honey (1 tbsp)', cal: '~64', protein: '0g', notes: 'Mostly fructose + glucose. Trace nutrients.' },
        { food: 'Dark chocolate (1 oz, 70%)', cal: '~170', protein: '2g', notes: 'Antioxidants. Caffeine + theobromine.' }
      ];

      var MELT_BOIL = [
        { substance: 'Helium', mp: '−272°C', bp: '−269°C', notes: 'Only substance that can\'t solidify at 1 atm (even at absolute zero).' },
        { substance: 'Hydrogen (H₂)', mp: '−259°C', bp: '−253°C', notes: 'Liquid H₂ is rocket fuel.' },
        { substance: 'Nitrogen (N₂)', mp: '−210°C', bp: '−196°C', notes: 'Liquid N₂ for cryogenics, food.' },
        { substance: 'Oxygen (O₂)', mp: '−218°C', bp: '−183°C', notes: 'Liquid O₂ for rockets, hospitals.' },
        { substance: 'Methane', mp: '−183°C', bp: '−162°C', notes: 'Natural gas. LNG = liquefied methane.' },
        { substance: 'Ethanol', mp: '−114°C', bp: '78°C', notes: 'Alcoholic drinks, fuel, hand sanitizer.' },
        { substance: 'Water', mp: '0°C', bp: '100°C', notes: 'At 1 atm. Density max at 4°C — why ice floats.' },
        { substance: 'Mercury (Hg)', mp: '−39°C', bp: '357°C', notes: 'Only metal liquid at RT.' },
        { substance: 'Iron (Fe)', mp: '1538°C', bp: '2862°C', notes: 'Smelting temperature must exceed mp.' },
        { substance: 'Copper (Cu)', mp: '1085°C', bp: '2562°C', notes: 'Casting + smelting.' },
        { substance: 'Aluminum (Al)', mp: '660°C', bp: '2470°C', notes: 'Low for metal — easy to recycle.' },
        { substance: 'Tin (Sn)', mp: '232°C', bp: '2602°C', notes: 'Low mp — used in solder.' },
        { substance: 'Lead (Pb)', mp: '327°C', bp: '1749°C', notes: 'Old plumbing (toxic). Bullet metal.' },
        { substance: 'Gold (Au)', mp: '1064°C', bp: '2856°C', notes: 'Pure gold is soft — alloyed for jewelry.' },
        { substance: 'Silver (Ag)', mp: '962°C', bp: '2162°C', notes: 'Sterling silver = 92.5% Ag + 7.5% Cu.' },
        { substance: 'Tungsten (W)', mp: '3422°C', bp: '5555°C', notes: 'Highest mp of metals. Light bulb filaments.' },
        { substance: 'Carbon (graphite)', mp: '~3825°C (sublimes)', bp: '~4827°C', notes: 'Highest mp of pure elements.' },
        { substance: 'Diamond', mp: '~3550°C', bp: '~4827°C', notes: 'Burns in oxygen at ~700°C before melting.' },
        { substance: 'Silicon dioxide (quartz)', mp: '1713°C', bp: '2950°C', notes: 'Glass made from silica.' },
        { substance: 'Sodium chloride (NaCl)', mp: '801°C', bp: '1413°C', notes: 'Table salt. High mp due to ionic bonding.' },
        { substance: 'Calcium carbonate (CaCO₃)', mp: 'decomposes ~825°C', bp: '—', notes: 'Limestone. Releases CO₂ when heated → quicklime.' },
        { substance: 'Sucrose (table sugar)', mp: 'decomposes ~186°C', bp: '—', notes: 'Caramelizes before melting cleanly.' },
        { substance: 'Glucose', mp: '146°C', bp: '—', notes: 'Decomposes around mp.' },
        { substance: 'Acetic acid', mp: '17°C', bp: '118°C', notes: 'Below 17°C: glacial acetic acid (solid).' },
        { substance: 'Liquid nitrogen freezing temp tissues', mp: '—', bp: '−196°C', notes: 'Quickly freezes tissues; used in cryopreservation, cryotherapy.' }
      ];

      function renderPhScaleSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.h_ph_scale_of_common_substances', 'H⁺ pH scale of common substances')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.ph_log_h_each_unit_10_change_in_h_ph_7', 'pH = −log[H⁺]. Each unit = 10× change in [H⁺]. pH 7 = neutral; <7 = acidic; >7 = basic. Scale theoretically goes beyond 0-14 but rarely encountered.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['pH', 'Substance', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                PH_EXAMPLES.map(function(p, i) {
                  return React.createElement('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-black text-indigo-700 text-center' }, p.ph),
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.substance),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderFoodsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.food_nutrition_chemistry_context', '🥦 Food + nutrition (chemistry context)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.macronutrients_carbs_fats_proteins_eac', 'Macronutrients: carbs, fats, proteins. Each gram: carbs ~4 cal, protein ~4 cal, fat ~9 cal, alcohol ~7 cal.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Food', 'Calories', 'Protein', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                FOODS_NUTRITION.map(function(f, i) {
                  return React.createElement('tr', { key: 'f'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, f.food),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, f.cal),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, f.protein),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, f.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMeltboilSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.melting_boiling_points', '🌡 Melting + boiling points')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.at_1_atm_materials_with_strong_intermo', 'At 1 atm. Materials with strong intermolecular forces (ionic, network covalent) have higher melting/boiling points than those with weak forces (London).')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Substance', 'Melting pt', 'Boiling pt', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                MELT_BOIL.map(function(m, i) {
                  return React.createElement('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.substance),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 text-[10px]' }, m.mp),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 text-[10px]' }, m.bp),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, m.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data tables (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ALL_ELEMENTS = [
        { z: 1, sym: 'H', name: __alloT('stem.molecule.hydrogen_2', 'Hydrogen'), mass: 1.008, cat: 'Nonmetal', notes: 'Most abundant in universe. Fuel of stars.' },
        { z: 2, sym: 'He', name: __alloT('stem.molecule.helium', 'Helium'), mass: 4.003, cat: 'Noble gas', notes: 'Second most abundant in universe.' },
        { z: 3, sym: 'Li', name: __alloT('stem.molecule.lithium', 'Lithium'), mass: 6.94, cat: 'Alkali metal', notes: 'Lightest metal. Batteries, mood stabilizer.' },
        { z: 4, sym: 'Be', name: __alloT('stem.molecule.beryllium', 'Beryllium'), mass: 9.012, cat: 'Alkaline earth', notes: 'Aerospace alloys. Toxic dust.' },
        { z: 5, sym: 'B', name: __alloT('stem.molecule.boron', 'Boron'), mass: 10.81, cat: 'Metalloid', notes: 'Borosilicate glass (Pyrex). Detergents.' },
        { z: 6, sym: 'C', name: __alloT('stem.molecule.carbon_2', 'Carbon'), mass: 12.011, cat: 'Nonmetal', notes: 'Backbone of organic chemistry + life.' },
        { z: 7, sym: 'N', name: __alloT('stem.molecule.nitrogen_3', 'Nitrogen'), mass: 14.007, cat: 'Nonmetal', notes: '78% of atmosphere. Essential for proteins, DNA.' },
        { z: 8, sym: 'O', name: __alloT('stem.molecule.oxygen_3', 'Oxygen'), mass: 15.999, cat: 'Nonmetal', notes: '21% of atmosphere. Essential for respiration.' },
        { z: 9, sym: 'F', name: __alloT('stem.molecule.fluorine', 'Fluorine'), mass: 18.998, cat: 'Halogen', notes: 'Most electronegative. Toothpaste, Teflon, refrigerants.' },
        { z: 10, sym: 'Ne', name: __alloT('stem.molecule.neon', 'Neon'), mass: 20.180, cat: 'Noble gas', notes: 'Red-orange signs.' },
        { z: 11, sym: 'Na', name: __alloT('stem.molecule.sodium_2', 'Sodium'), mass: 22.990, cat: 'Alkali metal', notes: 'Reactive! Table salt is NaCl. Vital for nerves.' },
        { z: 12, sym: 'Mg', name: __alloT('stem.molecule.magnesium', 'Magnesium'), mass: 24.305, cat: 'Alkaline earth', notes: 'Light + strong (alloys). Chlorophyll center.' },
        { z: 13, sym: 'Al', name: __alloT('stem.molecule.aluminum', 'Aluminum'), mass: 26.982, cat: 'Post-transition', notes: 'Most abundant metal in crust. Cans, foil, aircraft.' },
        { z: 14, sym: 'Si', name: __alloT('stem.molecule.silicon_2', 'Silicon'), mass: 28.085, cat: 'Metalloid', notes: 'Semiconductor electronics. Glass, sand, quartz.' },
        { z: 15, sym: 'P', name: __alloT('stem.molecule.phosphorus_2', 'Phosphorus'), mass: 30.974, cat: 'Nonmetal', notes: 'DNA backbone, ATP. Fertilizer. Matches.' },
        { z: 16, sym: 'S', name: __alloT('stem.molecule.sulfur_2', 'Sulfur'), mass: 32.06, cat: 'Nonmetal', notes: 'Amino acids cys + met. Volcanic. Gunpowder.' },
        { z: 17, sym: 'Cl', name: __alloT('stem.molecule.chlorine_2', 'Chlorine'), mass: 35.45, cat: 'Halogen', notes: 'Pool water sanitizer. Bleach. PVC.' },
        { z: 18, sym: 'Ar', name: __alloT('stem.molecule.argon', 'Argon'), mass: 39.948, cat: 'Noble gas', notes: 'Inert gas for welding, light bulbs.' },
        { z: 19, sym: 'K', name: __alloT('stem.molecule.potassium_2', 'Potassium'), mass: 39.098, cat: 'Alkali metal', notes: 'Essential for nerves + muscles. Bananas.' },
        { z: 20, sym: 'Ca', name: __alloT('stem.molecule.calcium_2', 'Calcium'), mass: 40.078, cat: 'Alkaline earth', notes: 'Bones, teeth. Milk source.' },
        { z: 21, sym: 'Sc', name: __alloT('stem.molecule.scandium', 'Scandium'), mass: 44.956, cat: 'Transition metal', notes: 'Bicycle frames, baseball bats (aluminum-scandium alloys).' },
        { z: 22, sym: 'Ti', name: __alloT('stem.molecule.titanium', 'Titanium'), mass: 47.867, cat: 'Transition metal', notes: 'Strong + light. Aerospace, implants, paint (TiO₂).' },
        { z: 23, sym: 'V', name: __alloT('stem.molecule.vanadium', 'Vanadium'), mass: 50.942, cat: 'Transition metal', notes: 'High-strength steel alloys.' },
        { z: 24, sym: 'Cr', name: __alloT('stem.molecule.chromium', 'Chromium'), mass: 51.996, cat: 'Transition metal', notes: 'Stainless steel (with Ni). Plating.' },
        { z: 25, sym: 'Mn', name: __alloT('stem.molecule.manganese', 'Manganese'), mass: 54.938, cat: 'Transition metal', notes: 'Steelmaking. Batteries.' },
        { z: 26, sym: 'Fe', name: __alloT('stem.molecule.iron_2', 'Iron'), mass: 55.845, cat: 'Transition metal', notes: 'Most common metal in Earth\'s crust + core. Hemoglobin.' },
        { z: 27, sym: 'Co', name: __alloT('stem.molecule.cobalt', 'Cobalt'), mass: 58.933, cat: 'Transition metal', notes: 'Permanent magnets. Vitamin B12.' },
        { z: 28, sym: 'Ni', name: __alloT('stem.molecule.nickel', 'Nickel'), mass: 58.693, cat: 'Transition metal', notes: 'Coins, stainless steel, batteries.' },
        { z: 29, sym: 'Cu', name: __alloT('stem.molecule.copper', 'Copper'), mass: 63.546, cat: 'Transition metal', notes: 'Electrical wiring, plumbing. Antimicrobial surfaces.' },
        { z: 30, sym: 'Zn', name: __alloT('stem.molecule.zinc', 'Zinc'), mass: 65.38, cat: 'Transition metal', notes: 'Galvanizing iron. Brass (with Cu).' },
        { z: 31, sym: 'Ga', name: __alloT('stem.molecule.gallium', 'Gallium'), mass: 69.723, cat: 'Post-transition', notes: 'Melts in your hand (29.8°C). Semiconductors (GaN LEDs).' },
        { z: 32, sym: 'Ge', name: __alloT('stem.molecule.germanium', 'Germanium'), mass: 72.630, cat: 'Metalloid', notes: 'First transistors. Now mostly for IR optics.' },
        { z: 33, sym: 'As', name: __alloT('stem.molecule.arsenic', 'Arsenic'), mass: 74.922, cat: 'Metalloid', notes: 'Famous poison. Doped in semiconductors. Wood preservative.' },
        { z: 34, sym: 'Se', name: __alloT('stem.molecule.selenium', 'Selenium'), mass: 78.971, cat: 'Nonmetal', notes: 'Trace nutrient. Photocells. Glass color.' },
        { z: 35, sym: 'Br', name: __alloT('stem.molecule.bromine', 'Bromine'), mass: 79.904, cat: 'Halogen', notes: 'Only liquid nonmetal at RT. Flame retardants (some banned).' },
        { z: 36, sym: 'Kr', name: __alloT('stem.molecule.krypton', 'Krypton'), mass: 83.798, cat: 'Noble gas', notes: 'Specialty lighting. Once defined the meter.' },
        { z: 37, sym: 'Rb', name: __alloT('stem.molecule.rubidium', 'Rubidium'), mass: 85.468, cat: 'Alkali metal', notes: 'Atomic clocks.' },
        { z: 38, sym: 'Sr', name: __alloT('stem.molecule.strontium', 'Strontium'), mass: 87.62, cat: 'Alkaline earth', notes: 'Red fireworks. ⁹⁰Sr — radioactive fallout concern.' },
        { z: 39, sym: 'Y', name: __alloT('stem.molecule.yttrium', 'Yttrium'), mass: 88.906, cat: 'Transition metal', notes: 'YBCO superconductors. Red phosphor in old TVs.' },
        { z: 40, sym: 'Zr', name: __alloT('stem.molecule.zirconium', 'Zirconium'), mass: 91.224, cat: 'Transition metal', notes: 'Nuclear fuel cladding. ZrO₂ — fake diamond.' },
        { z: 41, sym: 'Nb', name: __alloT('stem.molecule.niobium', 'Niobium'), mass: 92.906, cat: 'Transition metal', notes: 'Superconductors (NbTi in MRI magnets).' },
        { z: 42, sym: 'Mo', name: __alloT('stem.molecule.molybdenum', 'Molybdenum'), mass: 95.95, cat: 'Transition metal', notes: 'High-strength steel alloys.' },
        { z: 43, sym: 'Tc', name: __alloT('stem.molecule.technetium', 'Technetium'), mass: 98, cat: 'Transition metal', notes: 'No stable isotopes. ⁹⁹ᵐTc most common medical isotope.' },
        { z: 44, sym: 'Ru', name: __alloT('stem.molecule.ruthenium', 'Ruthenium'), mass: 101.07, cat: 'Transition metal', notes: 'Platinum group. Catalysts, electronics.' },
        { z: 45, sym: 'Rh', name: __alloT('stem.molecule.rhodium', 'Rhodium'), mass: 102.906, cat: 'Transition metal', notes: 'Most expensive metal (some years). Catalytic converters.' },
        { z: 46, sym: 'Pd', name: __alloT('stem.molecule.palladium', 'Palladium'), mass: 106.42, cat: 'Transition metal', notes: 'Catalytic converters. H₂ storage.' },
        { z: 47, sym: 'Ag', name: __alloT('stem.molecule.silver', 'Silver'), mass: 107.868, cat: 'Transition metal', notes: 'Best conductor of heat + electricity. Photography (historical).' },
        { z: 48, sym: 'Cd', name: __alloT('stem.molecule.cadmium', 'Cadmium'), mass: 112.414, cat: 'Transition metal', notes: 'Toxic. Old yellow paints. NiCd batteries.' },
        { z: 49, sym: 'In', name: __alloT('stem.molecule.indium', 'Indium'), mass: 114.818, cat: 'Post-transition', notes: 'ITO — transparent conductor for touchscreens.' },
        { z: 50, sym: 'Sn', name: 'Tin', mass: 118.710, cat: 'Post-transition', notes: 'Solder, bronze (with Cu), cans. Low melting point.' },
        { z: 51, sym: 'Sb', name: __alloT('stem.molecule.antimony', 'Antimony'), mass: 121.760, cat: 'Metalloid', notes: 'Flame retardants. Old "stibnite" eye makeup.' },
        { z: 52, sym: 'Te', name: __alloT('stem.molecule.tellurium', 'Tellurium'), mass: 127.60, cat: 'Metalloid', notes: 'Photovoltaics (CdTe solar cells).' },
        { z: 53, sym: 'I', name: __alloT('stem.molecule.iodine', 'Iodine'), mass: 126.904, cat: 'Halogen', notes: 'Thyroid hormone. Antiseptic. Iodized salt.' },
        { z: 54, sym: 'Xe', name: __alloT('stem.molecule.xenon', 'Xenon'), mass: 131.293, cat: 'Noble gas', notes: 'Bright arc lamps. Anesthetic.' },
        { z: 55, sym: 'Cs', name: __alloT('stem.molecule.cesium', 'Cesium'), mass: 132.905, cat: 'Alkali metal', notes: 'Atomic clocks define the second. Reactive.' },
        { z: 56, sym: 'Ba', name: __alloT('stem.molecule.barium', 'Barium'), mass: 137.327, cat: 'Alkaline earth', notes: 'Green fireworks. BaSO₄ for X-ray contrast (insoluble = nontoxic).' },
        { z: 57, sym: 'La', name: __alloT('stem.molecule.lanthanum', 'Lanthanum'), mass: 138.905, cat: 'Lanthanide', notes: 'Camera lenses (high refractive index).' },
        { z: 58, sym: 'Ce', name: __alloT('stem.molecule.cerium', 'Cerium'), mass: 140.116, cat: 'Lanthanide', notes: 'Most abundant rare earth. Catalytic converters.' },
        { z: 59, sym: 'Pr', name: __alloT('stem.molecule.praseodymium', 'Praseodymium'), mass: 140.908, cat: 'Lanthanide', notes: 'Magnets. Tinted welding goggles.' },
        { z: 60, sym: 'Nd', name: __alloT('stem.molecule.neodymium', 'Neodymium'), mass: 144.242, cat: 'Lanthanide', notes: 'Strongest permanent magnets (NdFeB). Speakers, hard drives, motors.' },
        { z: 61, sym: 'Pm', name: __alloT('stem.molecule.promethium', 'Promethium'), mass: 145, cat: 'Lanthanide', notes: 'No stable isotopes. Glow-in-dark paints.' },
        { z: 62, sym: 'Sm', name: __alloT('stem.molecule.samarium', 'Samarium'), mass: 150.36, cat: 'Lanthanide', notes: 'SmCo magnets (high-temp).' },
        { z: 63, sym: 'Eu', name: __alloT('stem.molecule.europium', 'Europium'), mass: 151.964, cat: 'Lanthanide', notes: 'Red phosphors. Anti-counterfeit ink in euros.' },
        { z: 64, sym: 'Gd', name: __alloT('stem.molecule.gadolinium', 'Gadolinium'), mass: 157.25, cat: 'Lanthanide', notes: 'MRI contrast. Magnetic refrigeration research.' },
        { z: 65, sym: 'Tb', name: __alloT('stem.molecule.terbium', 'Terbium'), mass: 158.925, cat: 'Lanthanide', notes: 'Green phosphors. Magnetostrictive alloys.' },
        { z: 66, sym: 'Dy', name: __alloT('stem.molecule.dysprosium', 'Dysprosium'), mass: 162.500, cat: 'Lanthanide', notes: 'Magnets that work at high temp (EV motors, wind turbines).' },
        { z: 67, sym: 'Ho', name: __alloT('stem.molecule.holmium', 'Holmium'), mass: 164.930, cat: 'Lanthanide', notes: 'Highest magnetic strength among elements.' },
        { z: 68, sym: 'Er', name: __alloT('stem.molecule.erbium', 'Erbium'), mass: 167.259, cat: 'Lanthanide', notes: 'Fiber amplifiers (EDFA) for internet backbones.' },
        { z: 69, sym: 'Tm', name: __alloT('stem.molecule.thulium', 'Thulium'), mass: 168.934, cat: 'Lanthanide', notes: 'Portable X-ray sources.' },
        { z: 70, sym: 'Yb', name: __alloT('stem.molecule.ytterbium', 'Ytterbium'), mass: 173.045, cat: 'Lanthanide', notes: 'Atomic clocks (most accurate today).' },
        { z: 71, sym: 'Lu', name: __alloT('stem.molecule.lutetium', 'Lutetium'), mass: 174.967, cat: 'Lanthanide', notes: 'PET scan crystals.' },
        { z: 72, sym: 'Hf', name: __alloT('stem.molecule.hafnium', 'Hafnium'), mass: 178.49, cat: 'Transition metal', notes: 'Nuclear control rods. CPU gate dielectric.' },
        { z: 73, sym: 'Ta', name: __alloT('stem.molecule.tantalum', 'Tantalum'), mass: 180.948, cat: 'Transition metal', notes: 'Capacitors in electronics. Conflict mineral concerns.' },
        { z: 74, sym: 'W', name: __alloT('stem.molecule.tungsten', 'Tungsten'), mass: 183.84, cat: 'Transition metal', notes: 'Highest melting point of metals (3422°C). Filaments, drill bits.' },
        { z: 75, sym: 'Re', name: __alloT('stem.molecule.rhenium', 'Rhenium'), mass: 186.207, cat: 'Transition metal', notes: 'Jet engine alloys (high-T strength).' },
        { z: 76, sym: 'Os', name: __alloT('stem.molecule.osmium', 'Osmium'), mass: 190.23, cat: 'Transition metal', notes: 'Densest natural element (22.59 g/cm³). Fountain pen nibs.' },
        { z: 77, sym: 'Ir', name: __alloT('stem.molecule.iridium', 'Iridium'), mass: 192.217, cat: 'Transition metal', notes: 'Second densest. Spark plugs. Asteroid layer marker (K-Pg boundary).' },
        { z: 78, sym: 'Pt', name: __alloT('stem.molecule.platinum', 'Platinum'), mass: 195.084, cat: 'Transition metal', notes: 'Catalytic converters. Jewelry. Chemotherapy (cisplatin).' },
        { z: 79, sym: 'Au', name: __alloT('stem.molecule.gold', 'Gold'), mass: 196.967, cat: 'Transition metal', notes: 'Doesn\'t tarnish. Jewelry, electronics, dental, money standard.' },
        { z: 80, sym: 'Hg', name: __alloT('stem.molecule.mercury', 'Mercury'), mass: 200.592, cat: 'Transition metal', notes: 'Only metal liquid at RT. Thermometers (banned now). Toxic.' },
        { z: 81, sym: 'Tl', name: __alloT('stem.molecule.thallium', 'Thallium'), mass: 204.38, cat: 'Post-transition', notes: 'Extremely toxic. Famous Agatha Christie poison.' },
        { z: 82, sym: 'Pb', name: __alloT('stem.molecule.lead', 'Lead'), mass: 207.2, cat: 'Post-transition', notes: 'Lead-acid batteries, X-ray shielding. Neurotoxin — phased out of paint, gasoline.' },
        { z: 83, sym: 'Bi', name: __alloT('stem.molecule.bismuth', 'Bismuth'), mass: 208.980, cat: 'Post-transition', notes: 'Pepto-Bismol. Heavy but relatively non-toxic.' },
        { z: 84, sym: 'Po', name: __alloT('stem.molecule.polonium', 'Polonium'), mass: 209, cat: 'Metalloid', notes: 'Highly radioactive. Discovered by Marie Curie. Poisoning agent (Litvinenko).' },
        { z: 85, sym: 'At', name: __alloT('stem.molecule.astatine', 'Astatine'), mass: 210, cat: 'Halogen', notes: 'Rarest element on Earth (~1g exists at any time).' },
        { z: 86, sym: 'Rn', name: __alloT('stem.molecule.radon', 'Radon'), mass: 222, cat: 'Noble gas', notes: 'Radioactive. Major basement lung cancer risk.' },
        { z: 87, sym: 'Fr', name: __alloT('stem.molecule.francium', 'Francium'), mass: 223, cat: 'Alkali metal', notes: 'Highly radioactive + reactive. Only tiny amounts exist.' },
        { z: 88, sym: 'Ra', name: __alloT('stem.molecule.radium', 'Radium'), mass: 226, cat: 'Alkaline earth', notes: 'Discovered by Curies. Glow-in-dark paints (radium girls).' },
        { z: 89, sym: 'Ac', name: __alloT('stem.molecule.actinium', 'Actinium'), mass: 227, cat: 'Actinide', notes: 'Radioactive. Limited research uses.' },
        { z: 90, sym: 'Th', name: __alloT('stem.molecule.thorium', 'Thorium'), mass: 232.038, cat: 'Actinide', notes: 'Potential nuclear fuel. Old lantern mantles.' },
        { z: 92, sym: 'U', name: __alloT('stem.molecule.uranium', 'Uranium'), mass: 238.029, cat: 'Actinide', notes: 'Nuclear fuel + weapons. ²³⁵U fissile, ²³⁸U fertile.' },
        { z: 94, sym: 'Pu', name: __alloT('stem.molecule.plutonium', 'Plutonium'), mass: 244, cat: 'Actinide', notes: 'Synthetic. Reactor fuel + weapons. RTGs (Voyager, Mars rovers).' }
      ];

      var MINERALS = [
        { name: __alloT('stem.molecule.quartz', 'Quartz'), formula: 'SiO₂', mohs: 7, notes: 'Most abundant mineral in crust. Sand. Watch crystals (piezo).' },
        { name: __alloT('stem.molecule.feldspar', 'Feldspar'), formula: '(K,Na,Ca)(Al,Si)₄O₈', mohs: 6, notes: 'Most abundant mineral group. Ceramics, glass.' },
        { name: __alloT('stem.molecule.calcite', 'Calcite'), formula: 'CaCO₃', mohs: 3, notes: 'Limestone, marble. Reacts with HCl → CO₂ bubbles.' },
        { name: __alloT('stem.molecule.halite', 'Halite'), formula: 'NaCl', mohs: 2.5, notes: 'Rock salt. Old salt mines.' },
        { name: __alloT('stem.molecule.gypsum', 'Gypsum'), formula: 'CaSO₄·2H₂O', mohs: 2, notes: 'Drywall. Plaster of Paris (when partly dehydrated).' },
        { name: __alloT('stem.molecule.mica_muscovite', 'Mica (muscovite)'), formula: 'KAl₂(AlSi₃O₁₀)(OH)₂', mohs: 2.5, notes: 'Flakes into thin sheets. Used in cosmetics, capacitors.' },
        { name: __alloT('stem.molecule.olivine', 'Olivine'), formula: '(Mg,Fe)₂SiO₄', mohs: 6.5, notes: 'Mantle mineral. Green peridot gemstone.' },
        { name: __alloT('stem.molecule.pyrite', 'Pyrite'), formula: 'FeS₂', mohs: 6, notes: '"Fool\'s gold". Brassy yellow cubic crystals.' },
        { name: __alloT('stem.molecule.galena', 'Galena'), formula: 'PbS', mohs: 2.5, notes: 'Main lead ore. Heavy, silvery.' },
        { name: __alloT('stem.molecule.magnetite', 'Magnetite'), formula: 'Fe₃O₄', mohs: 5.5, notes: 'Magnetic iron ore. Used in compass needles historically.' },
        { name: __alloT('stem.molecule.hematite', 'Hematite'), formula: 'Fe₂O₃', mohs: 6, notes: 'Iron ore. Red color in rocks + Mars soil.' },
        { name: __alloT('stem.molecule.talc', 'Talc'), formula: 'Mg₃Si₄O₁₀(OH)₂', mohs: 1, notes: 'Softest mineral. Baby powder. Soapstone.' },
        { name: __alloT('stem.molecule.corundum', 'Corundum'), formula: 'Al₂O₃', mohs: 9, notes: 'Ruby (red) + sapphire (other colors). Watch crystals.' },
        { name: __alloT('stem.molecule.diamond', 'Diamond'), formula: 'C', mohs: 10, notes: 'Hardest natural material. Cutting tools, jewelry.' },
        { name: __alloT('stem.molecule.topaz', 'Topaz'), formula: 'Al₂SiO₄(F,OH)₂', mohs: 8, notes: 'Various colors. November birthstone.' },
        { name: __alloT('stem.molecule.beryl_emerald_aquamarine', 'Beryl (emerald, aquamarine)'), formula: 'Be₃Al₂Si₆O₁₈', mohs: 7.5, notes: 'Emerald = green (Cr); aquamarine = blue (Fe).' },
        { name: __alloT('stem.molecule.garnet', 'Garnet'), formula: 'X₃Y₂(SiO₄)₃ (various)', mohs: 7, notes: 'Many colors. Used in sandpaper + as gem.' },
        { name: __alloT('stem.molecule.fluorite_2', 'Fluorite'), formula: 'CaF₂', mohs: 4, notes: 'Fluoresces under UV. Source of name "fluorescence".' },
        { name: __alloT('stem.molecule.apatite', 'Apatite'), formula: 'Ca₅(PO₄)₃(F,Cl,OH)', mohs: 5, notes: 'Main mineral in bones + teeth (hydroxyapatite form).' },
        { name: __alloT('stem.molecule.orthoclase', 'Orthoclase'), formula: 'KAlSi₃O₈', mohs: 6, notes: 'Mohs scale reference at 6.' }
      ];

      var DRUGS_LIST = [
        { name: __alloT('stem.molecule.aspirin_4', 'Aspirin'), formula: 'C₉H₈O₄', class: 'NSAID', use: 'Pain, fever, blood thinner. Original drug from willow bark salicin.' },
        { name: __alloT('stem.molecule.ibuprofen', 'Ibuprofen'), formula: 'C₁₃H₁₈O₂', class: 'NSAID', use: 'Pain, fever, inflammation. OTC since 1984.' },
        { name: __alloT('stem.molecule.acetaminophen_tylenol', 'Acetaminophen (Tylenol)'), formula: 'C₈H₉NO₂', class: 'Analgesic', use: 'Pain, fever. NOT anti-inflammatory. Overdose → liver failure.' },
        { name: __alloT('stem.molecule.caffeine_4', 'Caffeine'), formula: 'C₈H₁₀N₄O₂', class: 'Stimulant', use: 'Adenosine receptor antagonist. Most consumed psychoactive drug.' },
        { name: __alloT('stem.molecule.penicillin_g_2', 'Penicillin G'), formula: 'C₁₆H₁₈N₂O₄S', class: 'Antibiotic (β-lactam)', use: 'First mass-produced antibiotic. Inhibits bacterial cell-wall synthesis.' },
        { name: __alloT('stem.molecule.amoxicillin', 'Amoxicillin'), formula: 'C₁₆H₁₉N₃O₅S', class: 'Antibiotic (β-lactam)', use: 'Common oral antibiotic. Broader spectrum than penicillin G.' },
        { name: __alloT('stem.molecule.insulin', 'Insulin'), formula: 'protein (51 aa)', class: 'Hormone', use: 'Diabetes. First recombinant drug (1982).' },
        { name: __alloT('stem.molecule.metformin', 'Metformin'), formula: 'C₄H₁₁N₅', class: 'Antidiabetic', use: 'First-line for type 2 diabetes. Reduces hepatic glucose output.' },
        { name: __alloT('stem.molecule.statins_e_g_atorvastatin', 'Statins (e.g., atorvastatin)'), formula: 'C₃₃H₃₅FN₂O₅', class: 'HMG-CoA reductase inhibitor', use: 'Lower LDL cholesterol. Most prescribed drug class in many countries.' },
        { name: __alloT('stem.molecule.levothyroxine', 'Levothyroxine'), formula: 'C₁₅H₁₁I₄NO₄', class: 'Thyroid hormone', use: 'Hypothyroidism. Most prescribed drug in US most years.' },
        { name: __alloT('stem.molecule.sertraline_zoloft', 'Sertraline (Zoloft)'), formula: 'C₁₇H₁₇Cl₂N', class: 'SSRI', use: 'Depression, anxiety. Increases serotonin in synapse.' },
        { name: __alloT('stem.molecule.albuterol', 'Albuterol'), formula: 'C₁₃H₂₁NO₃', class: 'Bronchodilator', use: 'Asthma rescue inhaler. β₂-adrenergic agonist.' },
        { name: __alloT('stem.molecule.lisinopril', 'Lisinopril'), formula: 'C₂₁H₃₁N₃O₅', class: 'ACE inhibitor', use: 'Hypertension. Inhibits angiotensin-converting enzyme.' },
        { name: __alloT('stem.molecule.atorvastatin_lipitor', 'Atorvastatin (Lipitor)'), formula: 'C₃₃H₃₅FN₂O₅', class: 'Statin', use: 'Cholesterol. Best-selling drug in history (~$148B lifetime).' },
        { name: __alloT('stem.molecule.omeprazole', 'Omeprazole'), formula: 'C₁₇H₁₉N₃O₃S', class: 'PPI (proton pump inhibitor)', use: 'Heartburn, GERD, ulcers.' },
        { name: __alloT('stem.molecule.diphenhydramine_benadryl', 'Diphenhydramine (Benadryl)'), formula: 'C₁₇H₂₁NO', class: 'Antihistamine (1st gen)', use: 'Allergies, sleep aid. Sedating.' },
        { name: __alloT('stem.molecule.loratadine_claritin', 'Loratadine (Claritin)'), formula: 'C₂₂H₂₃ClN₂O₂', class: 'Antihistamine (2nd gen)', use: 'Allergies. Non-sedating.' },
        { name: __alloT('stem.molecule.codeine', 'Codeine'), formula: 'C₁₈H₂₁NO₃', class: 'Opioid', use: 'Pain, cough. Liver metabolizes to morphine.' },
        { name: __alloT('stem.molecule.morphine', 'Morphine'), formula: 'C₁₇H₁₉NO₃', class: 'Opioid', use: 'Severe pain. First isolated drug from a plant (opium, 1804).' },
        { name: __alloT('stem.molecule.hydrocodone', 'Hydrocodone'), formula: 'C₁₈H₂₁NO₃', class: 'Opioid', use: 'Pain. Often combined with acetaminophen.' },
        { name: __alloT('stem.molecule.diazepam_valium', 'Diazepam (Valium)'), formula: 'C₁₆H₁₃ClN₂O', class: 'Benzodiazepine', use: 'Anxiety, muscle spasms, seizures.' },
        { name: __alloT('stem.molecule.warfarin', 'Warfarin'), formula: 'C₁₉H₁₆O₄', class: 'Anticoagulant', use: 'Blood thinner. Originally a rat poison.' },
        { name: __alloT('stem.molecule.furosemide_lasix', 'Furosemide (Lasix)'), formula: 'C₁₂H₁₁ClN₂O₅S', class: 'Loop diuretic', use: 'Edema, heart failure. Increases urine output.' },
        { name: __alloT('stem.molecule.albuterol_salbutamol', 'Albuterol (salbutamol)'), formula: 'C₁₃H₂₁NO₃', class: 'β₂ agonist', use: 'Asthma quick-relief.' },
        { name: __alloT('stem.molecule.metoprolol', 'Metoprolol'), formula: 'C₁₅H₂₅NO₃', class: 'Beta blocker', use: 'High blood pressure, heart failure, arrhythmia.' }
      ];

      var HOUSEHOLD_CHEM = [
        { product: 'Bleach (household)', active: 'Sodium hypochlorite NaOCl (~5%)', notes: 'Oxidizes stains, kills microbes. NEVER mix with ammonia (toxic chloramines) or acids (toxic Cl₂ gas).' },
        { product: 'Ammonia cleaner', active: 'NH₃ in water', notes: 'Cuts grease. Don\'t mix with bleach.' },
        { product: 'Vinegar', active: 'Acetic acid CH₃COOH (~5%)', notes: 'Mild acid. Cleans mineral deposits, descales coffeemakers.' },
        { product: 'Baking soda', active: 'Sodium bicarbonate NaHCO₃', notes: 'Mild base. Deodorizer, mild abrasive. Reacts with vinegar to make CO₂ (volcano demo).' },
        { product: 'Hydrogen peroxide', active: 'H₂O₂ (3% medical, 35% commercial)', notes: 'Wound disinfectant. Bleaches hair. Decomposes to water + oxygen.' },
        { product: 'Isopropyl alcohol', active: '(CH₃)₂CHOH (70-99%)', notes: 'Disinfectant. Solvent. 70% works best (water helps penetrate cells).' },
        { product: 'Drain cleaner (lye-based)', active: 'Sodium hydroxide NaOH', notes: 'Very strong base. Dissolves hair + grease. Generates heat. WEAR GLOVES.' },
        { product: 'Toilet bowl cleaner', active: 'HCl (5-10%) or H₃PO₄', notes: 'Acids dissolve mineral scale + rust.' },
        { product: 'Glass cleaner (Windex)', active: 'Ammonia + 2-butoxyethanol + water', notes: 'Ammonia dissolves grease without streaks.' },
        { product: 'Antiperspirant', active: 'Aluminum chlorohydrate', notes: 'Forms gel plugs in sweat ducts. Deodorant ≠ antiperspirant.' },
        { product: 'Sunscreen (chemical)', active: 'Avobenzone, oxybenzone, octinoxate', notes: 'Absorb UV photons + dissipate as heat.' },
        { product: 'Sunscreen (mineral)', active: 'Zinc oxide, titanium dioxide', notes: 'Scatter + absorb UV. Less skin penetration concerns.' },
        { product: 'Toothpaste', active: 'Fluoride (NaF, MFP, SnF₂)', notes: 'Strengthens enamel (forms fluorapatite, less acid-soluble than hydroxyapatite).' },
        { product: 'Antacid (Tums)', active: 'Calcium carbonate CaCO₃', notes: 'Neutralizes stomach HCl. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂.' },
        { product: 'Antacid (Mylanta)', active: 'Mg(OH)₂ + Al(OH)₃', notes: 'Different active ingredients = different side effects.' },
        { product: 'Laundry detergent', active: 'Surfactants + enzymes + builders', notes: 'Surfactants surround oils; enzymes (proteases, amylases, lipases) digest stains.' },
        { product: 'Dish soap', active: 'Anionic surfactants', notes: 'Emulsifies fats. Why it cuts grease.' },
        { product: 'Soap (bar)', active: 'Sodium salts of fatty acids', notes: 'From saponification of fats + lye. Old-school cleaning.' },
        { product: 'Pool chlorine', active: 'Calcium hypochlorite Ca(OCl)₂', notes: 'Sanitizes pool water. Sun degrades it — stabilizers (cyanuric acid) help.' },
        { product: 'Antifreeze', active: 'Ethylene glycol (HOCH₂CH₂OH)', notes: 'Lowers freezing point of coolant. SWEET TASTE → toxic to pets + kids.' },
        { product: 'Brake fluid', active: 'Glycol ethers (DOT 3, 4, 5.1) or silicone (DOT 5)', notes: 'Hygroscopic — absorbs water over time → reduces boiling point → fade.' },
        { product: 'Gasoline (octane rating)', active: 'Hydrocarbons (C₄ to C₁₂)', notes: 'Octane rating = resistance to knock. Higher = more compression-tolerant.' }
      ];

      function renderAllElementsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.periodic_table_90_elements', '🅻 Periodic table (90 elements)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.a_summary_of_the_90_naturally_occurrin', 'A summary of the 90 naturally-occurring elements + selected synthetic ones. Full periodic table has 118 elements.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Z', 'Sym', 'Name', 'Mass', 'Category', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                ALL_ELEMENTS.map(function(e, i) {
                  return React.createElement('tr', { key: 'e'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-center' }, e.z),
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-black text-indigo-700' }, e.sym),
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, e.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, e.mass),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px]' }, e.cat),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, e.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMineralsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.common_minerals', '💎 Common minerals')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.mohs_scale_measures_relative_hardness_', 'Mohs scale measures relative hardness (1 = softest, 10 = hardest). The scale steps are NOT linear: corundum (9) is ~4× harder than topaz (8), and diamond (10) is ~4× harder than corundum.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Mineral', 'Formula', 'Mohs', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                MINERALS.map(function(m, i) {
                  return React.createElement('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold text-[10px]' }, m.formula),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 font-bold text-center' }, m.mohs),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, m.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderPharmaSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.common_medications', '💊 Common medications')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.for_chemistry_context_only_not_medical', 'For chemistry context only — NOT medical advice. Always consult a doctor or pharmacist before taking any medication.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Drug', 'Formula', 'Class', 'Use'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                DRUGS_LIST.map(function(d, i) {
                  return React.createElement('tr', { key: 'd'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, d.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 text-[10px]' }, d.formula),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, d.class),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, d.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderHouseholdSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.household_chemicals', '🧴 Household chemicals')),
          React.createElement('div', { className: 'p-2.5 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-900 mb-3' },
            React.createElement('strong', null, __alloT('stem.molecule.safety', '⚠ Safety: ')), __alloT('stem.molecule.never_mix_bleach_with_ammonia_toxic_ch', 'NEVER mix bleach with ammonia (toxic chloramine vapors) or acids (deadly chlorine gas). Store cleaners separately. Keep away from children.')
          ),
          React.createElement('div', { className: 'space-y-2' },
            HOUSEHOLD_CHEM.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, c.product),
                  React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 font-bold ml-auto px-2 py-0.5 rounded bg-indigo-100' }, c.active)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var LAB_TECHNIQUES = [
        { name: __alloT('stem.molecule.recrystallization', 'Recrystallization'), use: 'Purify a solid by dissolving + slowly recrystallizing.', notes: 'Impurities stay in solution; pure crystals grow.' },
        { name: __alloT('stem.molecule.distillation_simple', 'Distillation (simple)'), use: 'Separate liquids with different boiling points.', notes: 'Works when boiling points differ by >25°C.' },
        { name: __alloT('stem.molecule.distillation_fractional', 'Distillation (fractional)'), use: 'Separate liquids with close boiling points.', notes: 'Uses a fractionating column. Refines petroleum, vodka.' },
        { name: __alloT('stem.molecule.filtration_gravity', 'Filtration (gravity)'), use: 'Separate solid from liquid through filter paper.', notes: 'Slow but recovers liquid filtrate cleanly.' },
        { name: __alloT('stem.molecule.vacuum_filtration_b_chner', 'Vacuum filtration (Büchner)'), use: 'Faster filtration with suction.', notes: 'Used to collect crystallized product.' },
        { name: __alloT('stem.molecule.liquid_liquid_extraction', 'Liquid-liquid extraction'), use: 'Pull a compound from one solvent into another (immiscible) solvent.', notes: 'Separatory funnel. Caffeine extraction from tea.' },
        { name: __alloT('stem.molecule.chromatography_tlc', 'Chromatography (TLC)'), use: 'Identify compounds by separation on a thin plate.', notes: 'Quick. Visualize with UV or stain. Rf values identify compounds.' },
        { name: __alloT('stem.molecule.chromatography_column', 'Chromatography (column)'), use: 'Separate larger amounts.', notes: 'Silica gel column. Eluent washes compounds through at different speeds.' },
        { name: __alloT('stem.molecule.chromatography_hplc', 'Chromatography (HPLC)'), use: 'High-resolution separation under pressure.', notes: 'Quantitative analysis of mixtures (e.g., drug purity).' },
        { name: __alloT('stem.molecule.chromatography_gc', 'Chromatography (GC)'), use: 'Separate volatile compounds in gas phase.', notes: 'Coupled to MS for forensics, environmental analysis.' },
        { name: __alloT('stem.molecule.reflux', 'Reflux'), use: 'Heat a reaction without losing solvent.', notes: 'Condenser returns vapor to flask. Drives reaction to completion.' },
        { name: __alloT('stem.molecule.titration', 'Titration'), use: 'Determine concentration via reaction with known standard.', notes: 'Acid-base, redox, complexometric. Endpoint via indicator or pH meter.' },
        { name: __alloT('stem.molecule.gel_electrophoresis', 'Gel electrophoresis'), use: 'Separate molecules by size + charge in electric field.', notes: 'Common for DNA, proteins (SDS-PAGE).' },
        { name: __alloT('stem.molecule.rotary_evaporator_rotovap', 'Rotary evaporator (rotovap)'), use: 'Remove solvent quickly at reduced pressure.', notes: 'Standard in synthesis labs.' },
        { name: __alloT('stem.molecule.schlenk_line', 'Schlenk line'), use: 'Air- + moisture-free synthesis.', notes: 'Vacuum/inert gas manifold. Essential for air-sensitive chemistry.' },
        { name: __alloT('stem.molecule.soxhlet_extraction', 'Soxhlet extraction'), use: 'Continuously extract a compound from solid with solvent.', notes: 'Used in food chem (fat content), natural product isolation.' }
      ];

      var DRUG_DISCOVERY = [
        { stage: 'Target identification', duration: '~1-2 yr', notes: 'Identify protein/pathway that, if modulated, would treat disease. Often via genomics.' },
        { stage: 'Hit discovery', duration: '~1-2 yr', notes: 'Screen libraries of compounds (often millions) against target. Find a few "hits".' },
        { stage: 'Lead optimization', duration: '~2-3 yr', notes: 'Modify hits to improve potency, selectivity, drug-like properties. Test in cells then animals.' },
        { stage: 'Preclinical', duration: '~1-2 yr', notes: 'Safety + efficacy in 2+ animal species. Pharmacokinetics. IND filing to regulator.' },
        { stage: 'Phase I trial', duration: '~1-2 yr', notes: '~20-100 healthy volunteers. Safety + dosing.' },
        { stage: 'Phase II trial', duration: '~2-3 yr', notes: '~100-300 patients. Does it work? At what dose? Side effects.' },
        { stage: 'Phase III trial', duration: '~3-4 yr', notes: '~1,000-5,000 patients. Confirm efficacy + safety vs standard of care.' },
        { stage: 'Regulatory review', duration: '~1 yr', notes: 'FDA/EMA/etc. review NDA. Decide approval.' },
        { stage: 'Phase IV (post-market)', duration: 'ongoing', notes: 'Real-world surveillance. Rare side effects appear only at scale.' }
      ];

      var DRUG_FACTS = [
        { fact: __alloT('stem.molecule.average_time_to_market', 'Average time to market'), detail: __alloT('stem.molecule.10_15_years_from_initial_discovery_to_', '10-15 years from initial discovery to approval.') },
        { fact: __alloT('stem.molecule.average_cost', 'Average cost'), detail: __alloT('stem.molecule.estimated_1_2_5_billion_per_approved_d', 'Estimated $1-2.5 billion per approved drug (includes failures).') },
        { fact: __alloT('stem.molecule.attrition_rate', 'Attrition rate'), detail: __alloT('stem.molecule.10_of_candidates_entering_phase_i_make', '~10% of candidates entering Phase I make it to market. Most fail at Phase II for efficacy or Phase III for safety.') },
        { fact: __alloT('stem.molecule.lipinski_s_rule_of_5', 'Lipinski\'s Rule of 5'), detail: __alloT('stem.molecule.drug_likeness_mw_500_logp_5_5_h_bond_d', 'Drug-likeness: MW < 500, logP < 5, ≤ 5 H-bond donors, ≤ 10 H-bond acceptors. Predicts oral bioavailability.') },
        { fact: __alloT('stem.molecule.generic_drugs', 'Generic drugs'), detail: __alloT('stem.molecule.available_after_patent_expires_typical', 'Available after patent expires (typically 20 years from filing). Much cheaper but bioequivalent.') },
        { fact: __alloT('stem.molecule.biologics', 'Biologics'), detail: __alloT('stem.molecule.made_by_living_cells_antibodies_vaccin', 'Made by living cells (antibodies, vaccines). More complex, more expensive, "biosimilars" instead of generics.') }
      ];

      var FOOD_CHEMISTRY = [
        { topic: 'Maillard reaction', detail: __alloT('stem.molecule.reducing_sugar_amino_acid_brown_flavor', 'Reducing sugar + amino acid → brown flavor compounds. Happens above ~140°C. Why bread crusts, seared steak, coffee are flavorful.') },
        { topic: 'Caramelization', detail: __alloT('stem.molecule.sugar_molecules_break_recombine_at_hig', 'Sugar molecules break + recombine at high heat (>160°C). Creates hundreds of flavor compounds. Different from Maillard (no amino acids needed).') },
        { topic: 'Gelatinization (starch)', detail: __alloT('stem.molecule.starch_granules_absorb_water_swell_whe', 'Starch granules absorb water + swell when heated >60°C. Thickens sauces, cooks pasta.') },
        { topic: 'Gluten', detail: __alloT('stem.molecule.wheat_proteins_glutenin_gliadin_form_e', 'Wheat proteins (glutenin + gliadin) form elastic network when hydrated. Develops with kneading. Captures CO₂ in bread.') },
        { topic: 'Emulsion', detail: __alloT('stem.molecule.stable_mixture_of_oil_water_with_emuls', 'Stable mixture of oil + water with emulsifier (lecithin in egg yolk → mayonnaise; mustard or honey help too).') },
        { topic: 'Denaturation', detail: __alloT('stem.molecule.heat_unfolds_proteins_texture_changes_', 'Heat unfolds proteins → texture changes. Eggs cook (clear → white), meat firms.') },
        { topic: 'Fermentation', detail: __alloT('stem.molecule.microbes_convert_sugars_to_acids_alcoh', 'Microbes convert sugars to acids, alcohols, gases. Sauerkraut (lactic), beer (alcohol + CO₂), yogurt (lactic from lactose).') },
        { topic: 'Capsaicin', detail: __alloT('stem.molecule.spicy_compound_in_chili_peppers_activa', 'Spicy compound in chili peppers. Activates TRPV1 heat receptors. Soluble in fat + alcohol, not water — why milk soothes spicy mouth.') },
        { topic: 'MSG (monosodium glutamate)', detail: __alloT('stem.molecule.sodium_salt_of_glutamate_triggers_umam', 'Sodium salt of glutamate. Triggers umami taste receptor. Naturally abundant in tomatoes, parmesan, fish sauce, mushrooms.') },
        { topic: 'Browning enzymes', detail: __alloT('stem.molecule.polyphenol_oxidase_browns_cut_apples_b', 'Polyphenol oxidase browns cut apples + bananas. Lemon juice (acid) or refrigeration slows it.') },
        { topic: 'Carbonation', detail: __alloT('stem.molecule.co_dissolves_in_cold_water_under_press', 'CO₂ dissolves in cold water under pressure. Open bottle → pressure drops → CO₂ escapes as bubbles + H₂CO₃ tang.') },
        { topic: 'Pectin', detail: __alloT('stem.molecule.plant_cell_wall_polysaccharide_forms_g', 'Plant cell wall polysaccharide. Forms gel with sugar + acid → jams.') },
        { topic: 'Saponification', detail: __alloT('stem.molecule.fat_base_soap_glycerol_soap_molecules_', 'Fat + base → soap + glycerol. Soap molecules are amphipathic (one end loves water, one loves oil).') },
        { topic: 'Spherification (molecular gastronomy)', detail: __alloT('stem.molecule.sodium_alginate_calcium_liquid_gel_cav', 'Sodium alginate + calcium → liquid gel "caviar" or "ravioli". Modernist cooking.') },
        { topic: 'Sourdough leavening', detail: __alloT('stem.molecule.wild_yeast_lactic_bacteria_slower_more', 'Wild yeast + lactic bacteria. Slower, more sour than commercial yeast.') }
      ];

      var MATERIALS_CLASSES = [
        { name: __alloT('stem.molecule.metals', 'Metals'), properties: 'Ductile, conductive, lustrous, malleable, dense', examples: 'Steel, aluminum, copper, titanium, gold' },
        { name: __alloT('stem.molecule.ceramics', 'Ceramics'), properties: 'Hard, brittle, high melting point, chemically stable, insulating (usually)', examples: 'Porcelain, alumina, silicon carbide, zirconia, glass' },
        { name: __alloT('stem.molecule.polymers_plastics', 'Polymers (plastics)'), properties: 'Light, formable, low melting, insulating', examples: 'Polyethylene, PVC, polystyrene, nylon, Kevlar, epoxy' },
        { name: __alloT('stem.molecule.composites', 'Composites'), properties: 'Combine properties of constituents', examples: 'Carbon fiber, fiberglass, reinforced concrete, plywood' },
        { name: __alloT('stem.molecule.semiconductors', 'Semiconductors'), properties: 'Conductivity between metal + insulator; controllable via doping', examples: 'Si, GaAs, GaN, SiC, perovskites' },
        { name: __alloT('stem.molecule.biomaterials', 'Biomaterials'), properties: 'Compatible with living tissue', examples: 'Titanium implants, hydroxyapatite (bone-mimic), PLA sutures, hydrogels' },
        { name: __alloT('stem.molecule.nanomaterials', 'Nanomaterials'), properties: 'Size 1-100 nm; properties different from bulk', examples: 'Carbon nanotubes, graphene, quantum dots, nanoparticles' },
        { name: __alloT('stem.molecule.smart_materials', 'Smart materials'), properties: 'Respond to stimuli (heat, light, voltage)', examples: 'Shape-memory alloys, piezoelectrics, electroactive polymers, thermochromics' },
        { name: __alloT('stem.molecule.superconductors', 'Superconductors'), properties: 'Zero electrical resistance below critical temperature', examples: 'YBCO (Tc 93 K), Nb-Ti (used in MRI), MgB₂' },
        { name: __alloT('stem.molecule.metamaterials', 'Metamaterials'), properties: 'Engineered structure gives properties not found in nature', examples: 'Negative-index (cloaking research), perfect absorbers, acoustic cloaks' }
      ];

      var MATERIAL_FACTS = [
        { material: 'Diamond', property: 'Hardest natural material (Mohs 10)', notes: 'Carbon in tetrahedral lattice. Synthetic diamonds now widely available.' },
        { material: 'Graphene', property: '~200× stronger than steel by weight', notes: 'Single sheet of graphite. Electrically + thermally conductive. Discovered 2004 (Nobel 2010).' },
        { material: 'Carbon nanotubes', property: 'Tensile strength ~63 GPa', notes: 'Rolled-up graphene. Many uses being explored.' },
        { material: 'Kevlar', property: 'Tensile strength ~3.6 GPa, very high modulus', notes: 'Bulletproof vests, ropes. Aligned aromatic polyamide chains.' },
        { material: 'Spider silk', property: '~1-2 GPa tensile, very elastic', notes: 'Tougher than steel by weight (combines high strength + high stretch).' },
        { material: 'Aerogel', property: 'Density as low as 1.6 kg/m³ (~3× air)', notes: '99%+ air. Best thermal insulator. NASA uses on Mars rovers.' },
        { material: 'NEG (Non-Evaporable Getter)', property: 'Absorbs gases at low T', notes: 'Used in vacuum systems, particle accelerators.' },
        { material: 'GFRP (fiberglass)', property: 'Lighter than steel, doesn\'t rust', notes: 'Boats, car bodies, wind turbine blades.' }
      ];

      var INORGANIC_TOPICS = [
        { topic: 'Coordination compounds', detail: __alloT('stem.molecule.central_metal_atom_bonded_to_ligands_n', 'Central metal atom bonded to "ligands" (neutral or anionic). Geometry (octahedral, tetrahedral, square planar) determined by metal + ligands.') },
        { topic: 'Crystal field theory', detail: __alloT('stem.molecule.ligands_split_metal_d_orbital_energies', 'Ligands split metal d-orbital energies. Determines color, magnetic properties. High-spin vs low-spin complexes.') },
        { topic: 'Chelation', detail: __alloT('stem.molecule.a_single_ligand_binds_metal_through_mu', 'A single ligand binds metal through multiple atoms (EDTA is hexadentate). Very stable complexes.') },
        { topic: 'Lewis acid/base', detail: __alloT('stem.molecule.lewis_acid_electron_pair_acceptor_e_g_', 'Lewis acid = electron-pair acceptor (e.g., BF₃, Cu²⁺); Lewis base = electron-pair donor (e.g., NH₃, OH⁻).') },
        { topic: 'Hard-soft acid-base (HSAB) theory', detail: __alloT('stem.molecule.hard_acids_prefer_hard_bases_small_non', 'Hard acids prefer hard bases (small, non-polarizable). Soft prefer soft (large, polarizable). Predicts reactivity.') },
        { topic: 'Lanthanides + actinides', detail: __alloT('stem.molecule.f_block_similar_chemistry_within_each_', 'f-block. Similar chemistry within each series (lanthanide contraction). Many radioactive (all actinides).') },
        { topic: 'Transition metals', detail: __alloT('stem.molecule.d_block_multiple_oxidation_states_fe_f', 'd-block. Multiple oxidation states (Fe²⁺/Fe³⁺), often colored complexes, catalytic activity.') },
        { topic: 'Organometallic chemistry', detail: __alloT('stem.molecule.metal_carbon_bonds_grignard_reagents_r', 'Metal-carbon bonds. Grignard reagents (RMgX), ferrocene (Fe(C₅H₅)₂), catalysts (Wilkinson, Grubbs).') },
        { topic: 'Oxoacids', detail: __alloT('stem.molecule.acids_with_o_h_bonds_h_so_h_po_hno_hcl', 'Acids with O–H bonds. H₂SO₄, H₃PO₄, HNO₃, HClO₄. More O atoms → stronger acid (typically).') },
        { topic: 'Hydrides', detail: __alloT('stem.molecule.binary_compounds_with_h_ionic_nah_cova', 'Binary compounds with H. Ionic (NaH), covalent (CH₄), metallic (PdH, used in H₂ storage).') }
      ];

      var POLLUTANTS = [
        { pollutant: 'Carbon dioxide (CO₂)', source: 'Fossil fuel burning, deforestation, cement', impact: 'Greenhouse gas. ~420 ppm + rising. Drives climate change.' },
        { pollutant: 'Methane (CH₄)', source: 'Livestock, landfills, gas leaks, wetlands', impact: 'Greenhouse gas (~28× CO₂ over 100 yr). ~1.9 ppm + rising.' },
        { pollutant: 'Nitrous oxide (N₂O)', source: 'Fertilizer, livestock, industry', impact: 'Greenhouse gas. Also depletes ozone.' },
        { pollutant: 'Sulfur dioxide (SO₂)', source: 'Coal burning, smelting', impact: 'Acid rain (forms H₂SO₄). Lung irritant. Largely reduced by scrubbers in many countries.' },
        { pollutant: 'Nitrogen oxides (NOₓ)', source: 'Combustion (cars, power plants)', impact: 'Smog precursor, acid rain. Lung damage.' },
        { pollutant: 'Particulate matter (PM₂.₅)', source: 'Combustion, brake/tire wear, dust', impact: 'Lung + cardiovascular disease. Major mortality cause globally.' },
        { pollutant: 'Ground-level ozone (O₃)', source: 'NOₓ + VOCs + sunlight', impact: 'Smog. Lung damage. Crop yield reduction. (Stratospheric O₃ is protective.)' },
        { pollutant: 'CFCs (chlorofluorocarbons)', source: 'Old refrigerants, aerosols', impact: 'Depleted ozone layer. Banned (Montreal Protocol 1987). Hole now slowly recovering.' },
        { pollutant: 'PFAS ("forever chemicals")', source: 'Nonstick coatings, firefighting foam, water-resistant fabric', impact: 'Bioaccumulate. Linked to cancer, immune effects. Being phased out.' },
        { pollutant: 'Microplastics', source: 'Plastic breakdown, synthetic fabrics', impact: 'Found in oceans, drinking water, human blood. Long-term effects under study.' },
        { pollutant: 'Heavy metals (Pb, Hg, Cd, As)', source: 'Industry, mining, old paint, gasoline (Pb phased out)', impact: 'Bioaccumulative. Neurological + kidney damage.' },
        { pollutant: 'Nitrates + phosphates', source: 'Fertilizer runoff, sewage', impact: 'Eutrophication of waterways → algal blooms → dead zones (e.g., Gulf of Mexico).' }
      ];

      var GREEN_CHEMISTRY = [
        { principle: 'Prevention', detail: __alloT('stem.molecule.better_to_prevent_waste_than_treat_or_', 'Better to prevent waste than treat or clean it up.') },
        { principle: 'Atom economy', detail: __alloT('stem.molecule.maximize_fraction_of_reactant_atoms_en', 'Maximize fraction of reactant atoms ending up in product.') },
        { principle: 'Less hazardous synthesis', detail: __alloT('stem.molecule.use_generate_substances_with_little_no', 'Use + generate substances with little/no toxicity.') },
        { principle: 'Safer products', detail: __alloT('stem.molecule.design_products_with_minimal_toxicity_', 'Design products with minimal toxicity while preserving function.') },
        { principle: 'Safer solvents', detail: __alloT('stem.molecule.avoid_solvents_when_possible_use_safer', 'Avoid solvents when possible; use safer ones when not (water, supercritical CO₂).') },
        { principle: 'Energy efficiency', detail: __alloT('stem.molecule.run_reactions_at_ambient_t_p_when_poss', 'Run reactions at ambient T + P when possible.') },
        { principle: 'Renewable feedstocks', detail: __alloT('stem.molecule.use_biomass_agricultural_by_products_i', 'Use biomass/agricultural by-products instead of petroleum.') },
        { principle: 'Reduce derivatives', detail: __alloT('stem.molecule.avoid_protecting_groups_and_unnecessar', 'Avoid protecting groups and unnecessary modifications.') },
        { principle: 'Catalysis', detail: __alloT('stem.molecule.catalytic_stoichiometric_reusable_less', 'Catalytic > stoichiometric. Reusable; less waste.') },
        { principle: 'Design for degradation', detail: __alloT('stem.molecule.products_should_break_down_to_innocuou', 'Products should break down to innocuous substances at end of life.') },
        { principle: 'Real-time analysis', detail: __alloT('stem.molecule.inline_monitoring_to_prevent_pollution', 'Inline monitoring to prevent pollution.') },
        { principle: 'Inherently safer chemistry', detail: __alloT('stem.molecule.design_for_accident_prevention_minimiz', 'Design for accident prevention — minimize releases, explosions, fires.') }
      ];

      var BOND_GEOMETRIES = [
        { electronPairs: 2, bondingPairs: 2, geometry: 'Linear', angle: '180°', example: 'BeCl₂, CO₂' },
        { electronPairs: 3, bondingPairs: 3, geometry: 'Trigonal planar', angle: '120°', example: 'BF₃' },
        { electronPairs: 3, bondingPairs: 2, geometry: 'Bent (1 lone pair)', angle: '~117°', example: 'O₃, SO₂' },
        { electronPairs: 4, bondingPairs: 4, geometry: 'Tetrahedral', angle: '109.5°', example: 'CH₄, NH₄⁺' },
        { electronPairs: 4, bondingPairs: 3, geometry: 'Trigonal pyramidal (1 LP)', angle: '~107°', example: 'NH₃' },
        { electronPairs: 4, bondingPairs: 2, geometry: 'Bent (2 LP)', angle: '~104.5°', example: 'H₂O' },
        { electronPairs: 5, bondingPairs: 5, geometry: 'Trigonal bipyramidal', angle: '120° + 90°', example: 'PCl₅' },
        { electronPairs: 5, bondingPairs: 4, geometry: 'Seesaw (1 LP equatorial)', angle: 'distorted', example: 'SF₄' },
        { electronPairs: 5, bondingPairs: 3, geometry: 'T-shaped (2 LP equatorial)', angle: '~90°', example: 'ClF₃' },
        { electronPairs: 5, bondingPairs: 2, geometry: 'Linear (3 LP equatorial)', angle: '180°', example: 'XeF₂' },
        { electronPairs: 6, bondingPairs: 6, geometry: 'Octahedral', angle: '90°', example: 'SF₆' },
        { electronPairs: 6, bondingPairs: 5, geometry: 'Square pyramidal (1 LP)', angle: '~90°', example: 'BrF₅' },
        { electronPairs: 6, bondingPairs: 4, geometry: 'Square planar (2 LP trans)', angle: '90°', example: 'XeF₄' }
      ];

      var ISOMER_TYPES = [
        { name: __alloT('stem.molecule.structural_constitutional_isomers', 'Structural (constitutional) isomers'), description: __alloT('stem.molecule.different_connectivity_of_atoms_same_m', 'Different connectivity of atoms. Same molecular formula.'), example: 'C₄H₁₀: n-butane vs isobutane.' },
        { name: __alloT('stem.molecule.chain_isomers', 'Chain isomers'), description: __alloT('stem.molecule.different_carbon_chain_arrangements', 'Different carbon chain arrangements.'), example: 'Pentane vs 2-methylbutane vs 2,2-dimethylpropane.' },
        { name: __alloT('stem.molecule.positional_isomers', 'Positional isomers'), description: __alloT('stem.molecule.same_functional_group_different_positi', 'Same functional group, different position.'), example: '1-propanol vs 2-propanol.' },
        { name: __alloT('stem.molecule.functional_group_isomers', 'Functional group isomers'), description: __alloT('stem.molecule.same_molecular_formula_different_funct', 'Same molecular formula, different functional group.'), example: 'C₂H₆O: ethanol (alcohol) vs dimethyl ether.' },
        { name: __alloT('stem.molecule.geometric_cis_trans_isomers', 'Geometric (cis-trans) isomers'), description: __alloT('stem.molecule.different_arrangement_around_a_rigid_b', 'Different arrangement around a rigid bond (e.g., double bond or ring).'), example: 'Cis-2-butene vs trans-2-butene; oleic vs elaidic acid (cis vs trans fat).' },
        { name: __alloT('stem.molecule.enantiomers_mirror_image_stereoisomers', 'Enantiomers (mirror-image stereoisomers)'), description: __alloT('stem.molecule.non_superimposable_mirror_images_chira', 'Non-superimposable mirror images. "Chirality".'), example: 'L- vs D-amino acids; (R)- vs (S)-thalidomide (one safe, one teratogenic).' },
        { name: __alloT('stem.molecule.diastereomers', 'Diastereomers'), description: __alloT('stem.molecule.stereoisomers_that_are_not_mirror_imag', 'Stereoisomers that are NOT mirror images.'), example: 'D-glucose vs D-galactose (both right-handed sugars but differ at C4).' },
        { name: __alloT('stem.molecule.conformational_isomers', 'Conformational isomers'), description: __alloT('stem.molecule.differ_by_rotation_about_single_bonds_', 'Differ by rotation about single bonds — interconvert rapidly.'), example: 'Ethane staggered vs eclipsed; chair vs boat cyclohexane.' },
        { name: __alloT('stem.molecule.tautomers', 'Tautomers'), description: __alloT('stem.molecule.constitutional_isomers_that_interconve', 'Constitutional isomers that interconvert by H-atom migration.'), example: 'Keto-enol tautomerism. Crucial in DNA base pairing.' },
        { name: __alloT('stem.molecule.optical_rotation', 'Optical rotation'), description: __alloT('stem.molecule.chiral_molecules_rotate_polarized_ligh', 'Chiral molecules rotate polarized light. (+) or (−) prefix.'), example: '(+)-Glucose rotates light clockwise.' }
      ];

      var NOBLE_GASES = [
        { gas: 'Helium (He)', uses: 'Cryogenics (liquid He, 4 K), MRI cooling, balloons, deep diving gas mix', notes: 'Second lightest. Escapes Earth\'s gravity → must be extracted from natural gas wells.' },
        { gas: 'Neon (Ne)', uses: 'Signs (red-orange glow), high-voltage indicators', notes: '"Neon signs" with other colors use other gases or fluorescent coatings.' },
        { gas: 'Argon (Ar)', uses: 'Inert gas in welding, light bulbs, glass insulation', notes: '0.93% of atmosphere. Cheapest noble gas.' },
        { gas: 'Krypton (Kr)', uses: 'Specialty lighting, lasers, energy-efficient windows', notes: 'Used in old high-end fluorescent + photography flash bulbs.' },
        { gas: 'Xenon (Xe)', uses: 'High-intensity arc lamps (movie projectors, headlights), ion thrusters, anesthesia', notes: 'Forms some compounds (XeF₂, XeO₃) despite being "noble".' },
        { gas: 'Radon (Rn)', uses: '(Historically) radiation therapy', notes: 'Radioactive. From U/Th decay. Health hazard in basements (lung cancer risk).' },
        { gas: 'Oganesson (Og)', uses: 'None (synthetic, vanishingly small samples)', notes: 'Element 118. First atom made 2002. Decays in milliseconds.' }
      ];

      function renderLabSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.lab_techniques_2', '🔬 Lab techniques')),
          React.createElement('div', { className: 'space-y-2' },
            LAB_TECHNIQUES.map(function(t, i) {
              return React.createElement('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, t.name),
                React.createElement('div', { className: 'text-[11px] text-indigo-700 font-bold mb-1' }, t.use),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      function renderMedchemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.drug_discovery_pipeline', '💊 Drug discovery pipeline')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.stages', 'Stages')),
            React.createElement('div', { className: 'space-y-1' },
              DRUG_DISCOVERY.map(function(d, i) {
                return React.createElement('div', { key: 'd'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, d.stage),
                    React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 ml-auto' }, d.duration)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, d.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.industry_essentials', 'Industry essentials')),
          React.createElement('div', { className: 'space-y-1' },
            DRUG_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-black text-indigo-900 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderFoodSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.food_chemistry_2', '🍳 Food chemistry')),
          React.createElement('div', { className: 'space-y-2' },
            FOOD_CHEMISTRY.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-indigo-900 mb-0.5' }, f.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderMaterialsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.materials_classes', '🪨 Materials classes')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('div', { className: 'space-y-2' },
              MATERIALS_CLASSES.map(function(m, i) {
                return React.createElement('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, m.name),
                  React.createElement('div', { className: 'text-[11px] text-indigo-700 font-bold mb-1' }, m.properties),
                  React.createElement('div', { className: 'text-[10px] text-slate-700 italic' }, 'Examples: ' + m.examples)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.molecule.notable_materials', 'Notable materials')),
          React.createElement('div', { className: 'space-y-1' },
            MATERIAL_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  React.createElement('span', { className: 'text-[11px] font-black text-indigo-900' }, f.material),
                  React.createElement('span', { className: 'text-[10px] text-indigo-700 font-mono ml-auto' }, f.property)
                ),
                React.createElement('div', { className: 'text-[10px] text-slate-700' }, f.notes)
              );
            })
          )
        );
      }

      function renderInorganicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.inorganic_chemistry_topics', '⚛ Inorganic chemistry topics')),
          React.createElement('div', { className: 'space-y-2' },
            INORGANIC_TOPICS.map(function(t, i) {
              return React.createElement('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-indigo-900 mb-0.5' }, t.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.detail)
              );
            })
          )
        );
      }

      function renderEnviro2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.environmental_pollutants', '🏭 Environmental pollutants')),
          React.createElement('div', { className: 'space-y-2' },
            POLLUTANTS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, p.pollutant),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Source: '), p.source),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Impact: '), p.impact)
              );
            })
          )
        );
      }

      function renderGreenSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.12_principles_of_green_chemistry', '🌱 12 Principles of Green Chemistry')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.articulated_by_anastas_warner_1998_gui', 'Articulated by Anastas + Warner (1998). Guides chemists toward more sustainable methods.')),
          React.createElement('div', { className: 'space-y-1' },
            GREEN_CHEMISTRY.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2' },
                  React.createElement('span', { className: 'text-[10px] font-mono text-emerald-700 font-bold' }, (i + 1) + '.'),
                  React.createElement('span', { className: 'text-[12px] font-black text-emerald-900' }, g.principle)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed ml-5' }, g.detail)
              );
            })
          )
        );
      }

      function renderMolGeoSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.vsepr_electron_pair_geometries', '∡ VSEPR — electron pair geometries')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.lone_pairs_lp_take_more_space_than_bon', 'Lone pairs (LP) take more space than bonding pairs → compress bond angles. VSEPR predicts molecular shape from total electron pairs.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Total e- pairs', 'Bonding', 'Geometry', 'Angle', 'Example'].map(function(hh, i) {
                    return React.createElement('th', { scope: 'col', key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                BOND_GEOMETRIES.map(function(b, i) {
                  return React.createElement('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-center' }, b.electronPairs),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-center' }, b.bondingPairs),
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, b.geometry),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold' }, b.angle),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, b.example)
                  );
                })
              )
            )
          )
        );
      }

      function renderIsomersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.isomers_2', '⇄ Isomers')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.molecules_with_the_same_molecular_form', 'Molecules with the same molecular formula but different arrangement. Isomers can have very different properties.')),
          React.createElement('div', { className: 'space-y-2' },
            ISOMER_TYPES.map(function(I, i) {
              return React.createElement('div', { key: 'I'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, I.name),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, I.description),
                React.createElement('div', { className: 'text-[10px] text-indigo-700 italic' }, '→ ' + I.example)
              );
            })
          )
        );
      }

      function renderNobleSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, __alloT('stem.molecule.he_noble_gases_group_18', 'He Noble gases (Group 18)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.molecule.full_outer_electron_shell_very_unreact', 'Full outer electron shell → very unreactive. Discovered late (Ramsay et al., 1894-1898) because they don\'t form compounds easily.')),
          React.createElement('div', { className: 'space-y-2' },
            NOBLE_GASES.map(function(n, i) {
              return React.createElement('div', { key: 'n'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, n.gas),
                React.createElement('div', { className: 'text-[11px] text-indigo-700 font-bold mb-1' }, 'Uses: ' + n.uses),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.notes)
              );
            })
          )
        );
      }

      var __moleculeExpansions = React.createElement('div', { className: 'mt-4 max-w-4xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && React.createElement('div', { className: 'mt-2' }, renderActiveSection())
      );

      return React.createElement(React.Fragment, null, __moleculeMainView, __moleculeExpansions);
    }
  });

})();
