// ═══════════════════════════════════════════
// stem_tool_evolab.js — EvoLab: Evolution & Natural Selection
// Interactive evolution lab with three core simulators (Selection Sandbox, Beak
// Lab, Phylogenetic Tree Builder) plus four quick labs (Hardy-Weinberg, Genetic
// Drift, Common Ancestry Viewer, Misconceptions Quiz). Teaches the *process* of
// evolution — variation → selection → reproduction → inheritance — alongside
// real-world relevance (Maine wildlife examples sprinkled throughout) and
// targeted misconception correction.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('evoLab'))) {

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

  // Detect prefers-reduced-motion at module load — used to gate canvas-level
  // cosmetic motion (creature bouncing, particle effects). The simulation
  // itself still runs; only purely decorative animation is suppressed.
  var _prefersReducedMotion = (function() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // Print stylesheet — when teachers print a module, hide interactive controls
  // and force expand TeacherNotes / glossary so the printed copy includes the
  // pedagogical scaffolding alongside the educational content. Buttons,
  // sliders, autoplay controls collapse out. Anything inside .evolab-print-keep
  // stays. The sheet is scoped via class on <body> rather than @media so it
  // doesn't affect other AlloFlow pages on the same DOM.
  (function() {
    if (document.getElementById('evolab-print-css')) return;
    var st = document.createElement('style');
    st.id = 'evolab-print-css';
    st.textContent = [
      '@media print {',
      '  .evolab-no-print { display: none !important; }',
      '  details.evolab-teacher-notes,',
      '  details.evolab-glossary { display: block !important; }',
      '  details.evolab-teacher-notes > summary,',
      '  details.evolab-glossary > summary { list-style: none; cursor: default; }',
      '  details.evolab-teacher-notes[open] > *,',
      '  details.evolab-glossary[open] > *,',
      '  details.evolab-teacher-notes > *,',
      '  details.evolab-glossary > * { display: block !important; }',
      '  canvas { max-width: 100% !important; height: auto !important; page-break-inside: avoid; }',
      '  .evolab-page-break { page-break-after: always; }',
      '  body { background: white !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-evolab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-evolab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(lr);
  })();
  var announce = function(msg) {
    try { var lr = document.getElementById('allo-live-evolab'); if (lr) lr.textContent = msg; } catch (_) {}
  };

  // ── localStorage helpers (versioned keys, wrapped in try/catch for file://
  // and privacy-mode contexts that disable storage) ──
  function lsGet(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
  function lsSet(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  // ── Tiny math helpers ──
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function randNormal(mean, std) {
    // Box-Muller — population traits sample from normal distribution by default.
    var u = 1 - Math.random(), v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  window.StemLab.registerTool('evoLab', {
    name: 'EvoLab — Evolution',
    icon: '🧬',
    desc: 'Evolution and natural selection — three interactive simulators (Selection Sandbox, Galápagos Beak Lab, Phylogenetic Tree Builder) plus four quick labs covering Hardy-Weinberg, genetic drift, common ancestry, and the most common evolution misconceptions. Real-world relevance: includes Maine wildlife examples (snowshoe hare coat color, Maine finches, moose tick mortality).',
    render: function(ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      var d = (ctx.toolData && ctx.toolData['evoLab']) || {};
      var upd = function(key, val) { ctx.update('evoLab', key, val); };
      var addToast = ctx.addToast || function(msg) { console.log('[EvoLab]', msg); };
      var callTTS = ctx.callTTS || null;

      // Hydrate persisted state once on mount. Gated by ref so re-renders don't
      // re-fire the upd() and create a loop.
      var _hydratedRef = useRef(false);
      if (!_hydratedRef.current) {
        _hydratedRef.current = true;
        var savedBadges = lsGet('evoLab.badges.v1', null);
        if (savedBadges && d.evoBadges === undefined) upd('evoBadges', savedBadges);
        var savedQuizBest = lsGet('evoLab.quizBest.v1', null);
        if (savedQuizBest != null && d.misconQuizBest === undefined) upd('misconQuizBest', savedQuizBest);
      }

      // Top-level view selector. 'menu' is the hub; each module has its own view.
      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];

      // Badge tracking — visiting each module marks it explored. Drives the
      // progress banner on MainMenu and the per-card ✓ checkmark.
      var BADGE_IDS = ['predatorVision','mateChoice','climatePressure','selectionSandbox','beakLab','speciation','coevolution','phyloBuilder','hardyWeinberg','geneticDrift','commonAncestry','antibioticLab','discoveryTimeline','misconceptions','capstone'];
      var goto = function(v) {
        setView(v);
        upd('view', v);
        if (BADGE_IDS.indexOf(v) !== -1) {
          var prev = d.evoBadges || {};
          if (!prev[v]) {
            var next = Object.assign({}, prev);
            next[v] = true;
            upd('evoBadges', next);
            lsSet('evoLab.badges.v1', next);
            announce('Module explored: ' + v);
          }
        }
      };

      // ─────────────────────────────────────────────────────
      // SHARED COMPONENTS
      // ─────────────────────────────────────────────────────

      // BackBar — title bar with back-to-menu button. Used at the top of every
      // sub-module view for consistent navigation.
      function BackBar(props) {
        return h('div', { className: 'flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 shadow' },
          h('button', {
            onClick: function() { setView('menu'); upd('view', 'menu'); },
            'aria-label': 'Back to EvoLab menu',
            className: 'px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-bold text-sm transition-colors'
          }, '← Menu'),
          h('span', { className: 'text-3xl' }, props.icon),
          h('h1', { className: 'text-xl font-black flex-1' }, props.title)
        );
      }

      // Stat card — small reusable display block for numeric readouts.
      function StatCard(props) {
        return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
          h('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-slate-600' }, props.label),
          h('div', { className: 'text-2xl font-black ' + (props.color || 'text-emerald-700') }, props.value),
          props.unit && h('div', { className: 'text-[10px] text-slate-600' }, props.unit)
        );
      }

      // Slider with built-in label, value display, and aria-valuetext.
      function LabeledSlider(props) {
        return h('div', { className: 'bg-white rounded-xl p-3 shadow border border-slate-300' },
          h('label', { className: 'flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' },
            h('span', null, props.label),
            h('span', { className: 'normal-case text-[11px] font-semibold ' + (props.valueColor || 'text-emerald-700') }, props.valueText)
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
            className: 'w-full ' + (props.accent || 'accent-emerald-500')
          }),
          props.hint && h('div', { className: 'text-[10px] text-slate-600 mt-1' }, props.hint)
        );
      }

      // TeacherNotes — collapsible "🍎 Teacher Notes" panel. Default closed so
      // students don't see the meta-content; teachers can expand to grab
      // discussion questions, NGSS standards, common misconceptions, and
      // suggested extension activities. Native <details>/<summary> for
      // keyboard + screen-reader accessibility out of the box.
      function TeacherNotes(props) {
        return h('details', { className: 'evolab-teacher-notes bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
          h('summary', {
            className: 'cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 select-none flex items-center justify-between gap-3',
            'aria-label': 'Teacher Notes — discussion questions, standards alignment, and extension activities'
          },
            h('span', null, '🍎 Teacher Notes — click to expand'),
            // Print button — uses native window.print(); print stylesheet hides
            // controls and force-expands details so the printed page includes
            // the full educational + teacher-facing content.
            h('span', {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Print this module page (includes Teacher Notes)',
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              className: 'evolab-no-print text-xs font-semibold normal-case px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-800'
            }, '🖨️ Print')
          ),
          h('div', { className: 'mt-3 space-y-3 text-sm' },
            // NGSS standards
            props.standards && props.standards.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'NGSS Standards'),
              h('div', { className: 'text-slate-700' },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, className: 'inline-block mr-2 mb-1 px-2 py-0.5 bg-white border border-amber-300 rounded text-xs font-mono' }, s);
                })
              )
            ),
            // Discussion questions
            props.questions && props.questions.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Discussion Questions'),
              h('ol', { className: 'list-decimal list-inside space-y-1 text-slate-700' },
                props.questions.map(function(q, i) { return h('li', { key: i }, q); })
              )
            ),
            // Common misconceptions to watch for
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
            // Extension activity
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
            id: 'predatorVision', title: 'Predator Vision', icon: '👁️',
            subtitle: 'YOU are the selection pressure',
            desc: 'Hunt camouflaged prey by clicking them on a textured background. Each round, the survivors reproduce — and the population evolves to be HARDER for you to spot. By generation 10, you\'re hunting something almost invisible. The most viscerally interactive way to feel evolution happening.',
            bullets: ['Click prey to "eat" them — you select directly', 'Population evolves under YOUR pressure', '4 environments (forest, sand, snow, urban)', 'See your hunting score drop as camouflage rises'],
            color: 'from-lime-500 to-green-700',
            ring: 'ring-lime-500/40'
          },
          {
            id: 'mateChoice', title: 'Mate Choice Lab', icon: '🦚',
            subtitle: 'YOU are the mate-chooser',
            desc: 'Pick the bird you find most attractive. The chosen mate reproduces — others don\'t. Over rounds, the population\'s "showiness" escalates because YOU keep picking the showiest. Watch peacock-style runaway sexual selection unfold under your own preferences. Toggle a predator cost to see how it stabilizes.',
            bullets: ['Click the male bird you prefer — sexual selection', 'Watch tail brightness and length escalate', 'Toggle predator cost to balance the runaway', 'Real biology: peacocks, birds of paradise, guppies'],
            color: 'from-pink-500 to-fuchsia-700',
            ring: 'ring-pink-500/40'
          },
          {
            id: 'climatePressure', title: 'Climate Pressure Lab', icon: '🌡️',
            subtitle: 'YOU are the climate',
            desc: 'Drag the temperature slider. Slowly: the population adapts. Fast: they go extinct. The most direct demonstration of why the RATE of climate change matters — not just the magnitude. Real organisms today face this exact challenge.',
            bullets: ['Move the temperature slider — see adaptation in real time', 'Population goes extinct if you change too fast', 'Find the survivable rate of change', 'Real-world relevance: climate change & extinction'],
            color: 'from-orange-500 to-red-700',
            ring: 'ring-orange-500/40'
          },
          {
            id: 'selectionSandbox', title: 'Selection Sandbox', icon: '🧪',
            subtitle: 'Watch a population evolve under selection',
            desc: '50 creatures with a heritable trait. Set the selection pressure (which trait values survive); each generation, the population shifts. Includes Maine snowshoe hare preset for climate-driven coat color selection.',
            bullets: ['Stabilizing, directional, disruptive selection', 'Live trait histogram + generation chart', 'Toggle selection off → see drift alone', 'Real-world preset: peppered moth'],
            color: 'from-emerald-500 to-teal-600',
            ring: 'ring-emerald-500/40'
          },
          {
            id: 'beakLab', title: 'Galápagos Beak Lab', icon: '🐦',
            subtitle: 'Real Grant data — observed evolution',
            desc: 'Finches with different beak depths specialize in different seed types. When drought hits, only the largest hard seeds remain — and only large-beaked birds can crack them. Reproduces the famous 1977 Grant study.',
            bullets: ['4 beak classes × 4 seed types', 'Drought button shifts selection pressure', 'Overlay actual 1977 Grant data', 'Tooltip: Maine winter finches'],
            color: 'from-amber-500 to-orange-600',
            ring: 'ring-amber-500/40'
          },
          {
            id: 'speciation', title: 'Speciation Simulator', icon: '🌗',
            subtitle: 'Watch one species split into two',
            desc: 'A single ancestral population splits in half across a geographic barrier. Each half evolves under its own pressure. Over generations they diverge until they can no longer interbreed — speciation. Reproduces the allopatric model behind Galápagos finches and Lake Victoria cichlids.',
            bullets: ['Two side-by-side populations from a single source', 'Independent selection on each side', 'Live "compatibility" score', 'Speciation event detection + replay'],
            color: 'from-indigo-500 to-blue-700',
            ring: 'ring-indigo-500/40'
          },
          {
            id: 'phyloBuilder', title: 'Phylogenetic Tree Builder', icon: '🌳',
            subtitle: 'Build a cladogram by shared traits',
            desc: 'Drop 12 organisms onto a branching tree based on shared derived traits (synapomorphies). Verify against the actual evolutionary relationship — see where morphological and molecular evidence agree (and where they don\'t).',
            bullets: ['12 organisms incl. Maine wildlife', 'Trait checklist guides placement', 'Toggle morphological vs molecular', 'Real-time correctness feedback'],
            color: 'from-violet-500 to-purple-600',
            ring: 'ring-violet-500/40'
          }
        ];
        var miniCards = [
          {
            id: 'hardyWeinberg', title: 'Hardy-Weinberg', icon: '🧮',
            subtitle: 'Allele frequency equilibrium',
            desc: 'Visualize p² + 2pq + q² = 1 with adjustable allele frequencies. Toggle selection / mutation / drift / migration to see equilibrium break.',
            color: 'from-cyan-500 to-blue-600',
            ring: 'ring-cyan-500/40'
          },
          {
            id: 'geneticDrift', title: 'Genetic Drift', icon: '🎲',
            subtitle: 'Random allele change in small populations',
            desc: '50/50 starting alleles, no selection — just random sampling. Smaller populations drift hard; larger populations stay near 50/50. Demonstrates founder effects and bottlenecks.',
            color: 'from-rose-500 to-pink-600',
            ring: 'ring-rose-500/40'
          },
          {
            id: 'commonAncestry', title: 'Common Ancestry', icon: '🦴',
            subtitle: 'Homologous bones across species',
            desc: 'Click any bone in the human arm — see the same bone in a bat wing, whale flipper, horse leg, and bird wing. Same skeleton, different jobs.',
            color: 'from-yellow-500 to-amber-600',
            ring: 'ring-yellow-500/40'
          },
          {
            id: 'antibioticLab', title: 'Antibiotic Resistance', icon: '💊',
            subtitle: 'Watch bacteria evolve resistance',
            desc: 'Apply antibiotic pulses to a bacterial population. Resistant strains survive and reproduce. Real-world public health: this is why finishing your prescription matters.',
            color: 'from-fuchsia-500 to-pink-700',
            ring: 'ring-fuchsia-500/40'
          },
          {
            id: 'coevolution', title: 'Coevolution Lab', icon: '🐆',
            subtitle: 'Predator-prey arms race',
            desc: 'Two populations evolving against each other. Predators get faster; prey escape better; the cycle continues. Demonstrates the Red Queen hypothesis: you have to keep running just to stay in place.',
            color: 'from-red-500 to-orange-700',
            ring: 'ring-red-500/40'
          },
          {
            id: 'discoveryTimeline', title: 'Discovery Timeline', icon: '📜',
            subtitle: 'How we learned what we know',
            desc: 'The 250-year history of evolution science. Darwin, Wallace, Mendel, the Modern Synthesis, and the often-overlooked figures whose work made it all possible (Margulis, Franklin, McClintock).',
            color: 'from-stone-500 to-stone-700',
            ring: 'ring-stone-500/40'
          },
          {
            id: 'misconceptions', title: 'Misconceptions Quiz', icon: '❓',
            subtitle: '12 common evolution errors',
            desc: 'Targets the misunderstandings: "just a theory," "humans from monkeys," evolution-with-a-goal, survival-of-the-strongest. Each question gives a detailed evidence-based correction.',
            color: 'from-slate-500 to-slate-700',
            ring: 'ring-slate-500/40'
          },
          {
            id: 'selectionSleuth', title: 'Selection Sleuth', icon: '🕵️',
            subtitle: '10 vignettes — name the mechanism',
            desc: 'For each scenario, identify the evolutionary mechanism: natural selection (directional / stabilizing / disruptive), sexual selection, artificial selection, or genetic drift. Forces students past "evolution = natural selection" toward the full taxonomy of mechanisms.',
            color: 'from-amber-500 to-orange-700',
            ring: 'ring-amber-500/40'
          },
          {
            id: 'homologySleuth', title: 'Homology vs Analogy', icon: '🦴',
            subtitle: '10 trait pairs — same origin or same function',
            desc: 'For each pair of structures, decide: homologous (same evolutionary origin, often different function — like human arm vs whale flipper) or analogous (same function, different origin — like bird wing vs butterfly wing). The signature distinction for inferring common descent.',
            color: 'from-cyan-500 to-blue-700',
            ring: 'ring-cyan-500/40'
          },
          {
            id: 'capstone', title: 'Capstone Project', icon: '🎓',
            subtitle: 'Predict, run, reflect',
            desc: 'A guided 4-step research project. Pick a real-world scenario, predict the outcome, run the matching simulation, then write up your findings. Generates a print-ready lab report.',
            color: 'from-emerald-700 to-cyan-800',
            ring: 'ring-emerald-700/40'
          }
        ];

        var badges = d.evoBadges || {};
        var visitedCount = BADGE_IDS.filter(function(id) { return badges[id]; }).length;
        var totalCount = BADGE_IDS.length;
        var allDone = visitedCount === totalCount;

        var renderCard = function(c, isBig) {
          var visited = !!badges[c.id];
          return h('button', {
            key: c.id,
            onClick: function() { goto(c.id); },
            'aria-label': c.title + (visited ? ' (explored)' : ''),
            className: 'relative text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 ' + (visited ? 'border-emerald-600' : 'border-slate-200') + ' hover:border-slate-400 overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring
          },
            visited && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md'
            }, '✓'),
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('span', { className: isBig ? 'text-5xl' : 'text-4xl' }, c.icon),
                h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, isBig ? 'Core' : 'Mini')
              ),
              h('h2', { className: isBig ? 'text-2xl font-black' : 'text-xl font-black' }, c.title),
              h('p', { className: 'text-sm opacity-90 font-medium' }, c.subtitle)
            ),
            h('div', { className: 'p-5' },
              h('p', { className: 'text-sm text-slate-700 leading-relaxed ' + (isBig ? 'mb-3' : '') }, c.desc),
              isBig && h('ul', { className: 'space-y-1' },
                c.bullets.map(function(b, i) {
                  return h('li', { key: i, className: 'text-xs text-slate-600 flex items-start gap-1.5' },
                    h('span', { className: 'text-emerald-500 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'text-center mb-6' },
            h('div', { className: 'text-6xl mb-3' }, '🧬'),
            h('h1', { className: 'text-4xl font-black text-slate-800 mb-2' }, 'EvoLab'),
            h('p', { className: 'text-lg text-slate-600 max-w-2xl mx-auto' },
              'Evolution and natural selection — see populations change, build the tree of life, and untangle the most common misconceptions.')
          ),
          // Progress banner
          h('div', {
            'aria-live': 'polite',
            className: 'mb-6 p-4 rounded-2xl border-2 ' + (allDone ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200') + ' flex items-center justify-between gap-4'
          },
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-3xl' }, allDone ? '🏆' : '🎯'),
              h('div', null,
                h('div', { className: 'font-bold text-slate-800' },
                  allDone ? 'All modules explored — full evolution path complete!' : ('Progress: ' + visitedCount + ' of ' + totalCount + ' modules explored')
                ),
                h('div', { className: 'text-xs text-slate-600' },
                  allDone ? 'Revisit any module to deepen your understanding.' : 'Open each card below to learn its specialty.')
              )
            ),
            h('div', { className: 'flex-shrink-0 w-32 h-3 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
              h('div', {
                className: 'h-full ' + (allDone ? 'bg-emerald-500' : 'bg-teal-500') + ' transition-all',
                style: { width: Math.round((visitedCount / totalCount) * 100) + '%' }
              })
            )
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1' }, 'Core Simulators'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' },
            bigCards.map(function(c) { return renderCard(c, true); })
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1' }, 'Quick Labs'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
            miniCards.map(function(c) { return renderCard(c, false); })
          ),
          // Teacher Resources section — distinguished by amber theming so students
          // know it's not for them and teachers can find it instantly. Currently
          // one card (5-Day Curriculum Guide) but designed to grow.
          h('div', { className: 'mt-8 text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1 flex items-center gap-2' },
            h('span', null, 'Teacher Resources'),
            h('span', { className: 'normal-case font-medium text-slate-600' }, '— for educators planning a unit')
          ),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
            h('button', {
              onClick: function() { setView('curriculumGuide'); upd('view', 'curriculumGuide'); },
              'aria-label': '5-Day Curriculum Guide — sequenced unit plan with warm-ups, labs, discussions, and exit tickets',
              className: 'text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-amber-300 hover:border-amber-500 overflow-hidden focus:outline-none focus:ring-4 ring-amber-500/40'
            },
              h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 p-5 text-white' },
                h('div', { className: 'flex items-start justify-between mb-2' },
                  h('span', { className: 'text-4xl' }, '📅'),
                  h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, '🍎 Teacher')
                ),
                h('h2', { className: 'text-xl font-black' }, '5-Day Curriculum Guide'),
                h('p', { className: 'text-sm opacity-90 font-medium' }, 'Sequenced unit plan')
              ),
              h('div', { className: 'p-5' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
                  'Five 50-minute periods sequencing all modules into a coherent unit. Each day includes warm-up, lab activity, class discussion, and exit ticket. Click any module link inside the guide to launch it directly. Print-friendly.')
              )
            ),
            h('button', {
              onClick: function() { setView('moduleMap'); upd('view', 'moduleMap'); },
              'aria-label': 'Module Map — visual flowchart of how all modules connect by conceptual scale',
              className: 'text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-amber-300 hover:border-amber-500 overflow-hidden focus:outline-none focus:ring-4 ring-amber-500/40'
            },
              h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 p-5 text-white' },
                h('div', { className: 'flex items-start justify-between mb-2' },
                  h('span', { className: 'text-4xl' }, '🗺️'),
                  h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, '🍎 Teacher')
                ),
                h('h2', { className: 'text-xl font-black' }, 'Module Map'),
                h('p', { className: 'text-sm opacity-90 font-medium' }, 'How modules connect')
              ),
              h('div', { className: 'p-5' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
                  'Visual flowchart showing the 11 student modules organized by conceptual scale (alleles → populations → species → all of life). Includes Quick / Standard / Deep-dive learning paths.')
              )
            ),
            h('button', {
              onClick: function() { setView('standardsCrosswalk'); upd('view', 'standardsCrosswalk'); },
              'aria-label': 'Standards Crosswalk — find a module that addresses a specific NGSS standard',
              className: 'text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-amber-300 hover:border-amber-500 overflow-hidden focus:outline-none focus:ring-4 ring-amber-500/40'
            },
              h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 p-5 text-white' },
                h('div', { className: 'flex items-start justify-between mb-2' },
                  h('span', { className: 'text-4xl' }, '📋'),
                  h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, '🍎 Teacher')
                ),
                h('h2', { className: 'text-xl font-black' }, 'Standards Crosswalk'),
                h('p', { className: 'text-sm opacity-90 font-medium' }, 'NGSS-by-module lookup')
              ),
              h('div', { className: 'p-5' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
                  'For unit planning. Pick an NGSS performance expectation and see which modules address it. Includes AP Biology Big Idea cross-reference for AP Bio teachers.')
              )
            )
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-600' },
            'STEM Lab tool · Evolution & natural selection · Maine examples sprinkled in'
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // HARDY-WEINBERG CALCULATOR
      // ─────────────────────────────────────────────────────
      // Visualizes p² + 2pq + q² = 1. Two main controls: allele frequency p
      // (the big one) and a "force toggle" to add selection / mutation / drift /
      // migration on top. When forces are off, Hardy-Weinberg holds — genotype
      // frequencies are predicted exactly by Mendel's math. Turning on selection
      // breaks equilibrium and the bars shift over generations.
      function HardyWeinberg() {
        var pState = useState(0.5), p = pState[0], setP = pState[1];
        var selState = useState(0), selCoef = selState[0], setSelCoef = selState[1];
        var mutState = useState(0), mutRate = mutState[0], setMutRate = mutState[1];
        var migState = useState(0), migRate = migState[0], setMigRate = migState[1];
        var genState = useState(0), gen = genState[0], setGen = genState[1];
        var historyState = useState([{ gen: 0, p: 0.5, AA: 0.25, Aa: 0.5, aa: 0.25 }]);
        var history = historyState[0], setHistory = historyState[1];

        var q = 1 - p;
        var freqAA = p * p;
        var freqAa = 2 * p * q;
        var freqaa = q * q;

        // Step one generation forward applying enabled forces.
        var stepGeneration = function() {
          // Selection: aa is selected against by selCoef (homozygous-recessive disadvantage).
          // Mean fitness w_bar = freqAA + freqAa + freqaa * (1 - selCoef).
          var wAA = 1, wAa = 1, waa = 1 - selCoef;
          var wBar = freqAA * wAA + freqAa * wAa + freqaa * waa;
          if (wBar < 0.001) wBar = 0.001;
          var newAA = freqAA * wAA / wBar;
          var newAa = freqAa * wAa / wBar;
          // Compute new p from genotype frequencies (random mating).
          var newP = newAA + 0.5 * newAa;
          // Mutation: A → a at rate mutRate (one-way for simplicity).
          newP = newP * (1 - mutRate);
          // Migration: assume influx of A = 0.5 (random outside population).
          newP = newP * (1 - migRate) + 0.5 * migRate;
          newP = clamp(newP, 0, 1);
          setP(newP);
          var nextGen = gen + 1;
          setGen(nextGen);
          var newQ = 1 - newP;
          var snapshot = { gen: nextGen, p: newP, AA: newP * newP, Aa: 2 * newP * newQ, aa: newQ * newQ };
          setHistory(history.concat([snapshot]).slice(-50));
        };

        var reset = function() {
          setP(0.5); setSelCoef(0); setMutRate(0); setMigRate(0); setGen(0);
          setHistory([{ gen: 0, p: 0.5, AA: 0.25, Aa: 0.5, aa: 0.25 }]);
          announce('Hardy-Weinberg reset to equilibrium.');
        };

        var anyForce = selCoef > 0 || mutRate > 0 || migRate > 0;
        var equilibriumStatus = !anyForce && gen > 0 ? '✓ Hardy-Weinberg equilibrium maintained' :
          anyForce && gen > 0 ? '⚠ Forces active — equilibrium broken' : 'Set p, then add forces or step generations';

        // Render the 3-bar genotype chart.
        var renderBars = function() {
          var bars = [
            { label: 'AA', freq: freqAA, color: '#10b981', desc: 'Homozygous dominant' },
            { label: 'Aa', freq: freqAa, color: '#06b6d4', desc: 'Heterozygous' },
            { label: 'aa', freq: freqaa, color: '#f43f5e', desc: 'Homozygous recessive' }
          ];
          return h('div', { className: 'flex items-end justify-around h-48 bg-white rounded-xl shadow border border-slate-300 p-4 gap-4' },
            bars.map(function(b, i) {
              var pctH = Math.round(b.freq * 100);
              return h('div', { key: i, className: 'flex-1 flex flex-col items-center justify-end h-full' },
                h('div', { className: 'text-[10px] font-bold text-slate-700 mb-1' }, (b.freq * 100).toFixed(1) + '%'),
                h('div', {
                  className: 'w-full rounded-t-lg transition-all',
                  style: { height: pctH + '%', backgroundColor: b.color },
                  'aria-label': b.label + ' (' + b.desc + '): ' + (b.freq * 100).toFixed(1) + ' percent'
                }),
                h('div', { className: 'text-sm font-bold text-slate-800 mt-2' }, b.label),
                h('div', { className: 'text-[9px] text-slate-600' }, b.desc)
              );
            })
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🧮', title: 'Hardy-Weinberg Calculator' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-3' },
            // Equation header
            h('div', { className: 'bg-gradient-to-br from-cyan-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg text-center' },
              h('div', { className: 'text-3xl font-black mb-1', style: { fontFamily: 'serif' } }, 'p² + 2pq + q² = 1'),
              h('div', { className: 'text-sm opacity-90' }, 'In a non-evolving population: genotype frequencies are predicted by allele frequencies.')
            ),
            // Stats row
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'p (A)', value: p.toFixed(3), color: 'text-emerald-600' }),
              h(StatCard, { label: 'q (a)', value: q.toFixed(3), color: 'text-rose-600' }),
              h(StatCard, { label: 'Generation', value: gen, color: 'text-cyan-600' }),
              h(StatCard, { label: 'Status', value: anyForce ? 'Evolving' : 'Equilibrium', color: anyForce ? 'text-amber-600' : 'text-emerald-600' })
            ),
            // Bar chart
            renderBars(),
            // Status banner
            h('div', { 'aria-live': 'polite', className: 'p-3 rounded-lg text-center font-bold ' + (anyForce && gen > 0 ? 'bg-amber-50 border-2 border-amber-400 text-amber-800' : 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800') },
              equilibriumStatus
            ),
            // Sliders grid
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h(LabeledSlider, {
                label: '1. Allele Frequency p',
                value: p, min: 0, max: 1, step: 0.01,
                onChange: function(v) { setP(v); setGen(0); setHistory([{ gen: 0, p: v, AA: v * v, Aa: 2 * v * (1 - v), aa: (1 - v) * (1 - v) }]); },
                valueText: 'p = ' + p.toFixed(2) + ', q = ' + q.toFixed(2),
                accent: 'accent-cyan-500',
                hint: 'p is the frequency of allele A. q (frequency of a) is automatically 1 - p.'
              }),
              h(LabeledSlider, {
                label: '2. Selection Against aa',
                value: selCoef, min: 0, max: 1, step: 0.01,
                onChange: function(v) { setSelCoef(v); },
                valueText: selCoef === 0 ? 'No selection' : 's = ' + selCoef.toFixed(2),
                valueColor: selCoef > 0 ? 'text-rose-700' : 'text-slate-600',
                accent: 'accent-rose-500',
                hint: 'How much aa offspring survive less than AA / Aa. 0 = no selection; 1 = aa is lethal.'
              }),
              h(LabeledSlider, {
                label: '3. Mutation Rate (A → a)',
                value: mutRate, min: 0, max: 0.1, step: 0.001,
                onChange: function(v) { setMutRate(v); },
                valueText: mutRate === 0 ? 'No mutation' : 'μ = ' + mutRate.toFixed(3) + ' / gen',
                valueColor: mutRate > 0 ? 'text-amber-700' : 'text-slate-600',
                accent: 'accent-amber-500',
                hint: 'Rate at which A mutates to a per generation. Real biology: ~10⁻⁶ per gene; here exaggerated to be visible.'
              }),
              h(LabeledSlider, {
                label: '4. Migration In (allele A from outside)',
                value: migRate, min: 0, max: 0.5, step: 0.01,
                onChange: function(v) { setMigRate(v); },
                valueText: migRate === 0 ? 'No migration' : 'm = ' + migRate.toFixed(2) + ' / gen',
                valueColor: migRate > 0 ? 'text-cyan-700' : 'text-slate-600',
                accent: 'accent-cyan-500',
                hint: 'Each generation, this fraction of the population is replaced by immigrants with p = 0.5.'
              })
            ),
            // Step / reset buttons
            h('div', { className: 'flex gap-3 justify-center' },
              h('button', {
                onClick: stepGeneration,
                'aria-label': 'Advance one generation, applying any active selection, mutation, or migration forces',
                className: 'px-6 py-3 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg transition-colors'
              }, '⏭ Step 1 Generation'),
              h('button', {
                onClick: function() { for (var i = 0; i < 10; i++) stepGeneration(); },
                'aria-label': 'Advance ten generations',
                className: 'px-6 py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg transition-colors'
              }, '⏭⏭ Step 10'),
              h('button', {
                onClick: reset,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
              }, '↺ Reset')
            ),
            // Educational reference
            h('div', { className: 'bg-cyan-50 border border-cyan-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2' }, '📖 Why Hardy-Weinberg Matters'),
              h('p', { className: 'text-sm text-slate-700 mb-2' },
                'Hardy-Weinberg is the "no-evolution baseline." If p² + 2pq + q² holds across generations, the population is NOT evolving. Real populations always violate at least one of the five HW assumptions: no selection, no mutation, no migration, infinite population (no drift), random mating.'),
              h('p', { className: 'text-sm text-slate-700' },
                h('strong', null, 'The point: '),
                'evolution = any change in allele frequencies over time. Watching HW break is watching evolution happen.')
            ),
            // Try-this experiments — concrete prompts so students don't stare at sliders.
            h('div', { className: 'bg-white border-2 border-cyan-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-cyan-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'No forces: '), 'Set p to anything (e.g., 0.7), leave selection / mutation / migration at 0. Press Step 10. The bars don\'t move — equilibrium holds.'),
                h('li', null, h('strong', null, 'Strong selection: '), 'Set p = 0.5, selection = 0.8 (aa is 80% lethal). Step 10. Watch the aa bar shrink and AA grow as a is purged from the population.'),
                h('li', null, h('strong', null, 'Mutation pressure: '), 'Set p = 1.0 (all A), mutation = 0.05. Step 50. Watch p slowly drift down as A → a mutations accumulate.'),
                h('li', null, h('strong', null, 'Migration overwhelms selection: '), 'Set p = 0.1, selection = 0.5, migration = 0.2. Step 20. The population can\'t purge a because immigrants keep restoring it.')
              )
            ),
            // Cross-module suggestion — point to the next natural lab.
            h('div', { className: 'bg-rose-50 border border-rose-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🎲'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'Hardy-Weinberg assumes infinite population size. In small populations, RANDOM sampling changes allele frequencies even without selection. The Genetic Drift lab shows you exactly how much.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-3', 'HS-LS4-2', 'HS-LS3-1'],
              questions: [
                'Hardy-Weinberg requires five conditions for equilibrium. Which one is hardest to meet in real populations? Why?',
                'If a population is in HW equilibrium, is it evolving? Why or why not?',
                'A class of 24 students has 6 with attached earlobes (recessive). What\'s the allele frequency? Use the calculator to check.',
                'How would you tell, just by sampling a population, whether it\'s under selection vs in equilibrium?'
              ],
              misconceptions: [
                'Students often think the dominant allele will increase in frequency over time. The HW equation shows this is false — allele frequencies stay stable without selection.',
                'Students sometimes assume "dominant" means more common. Dominance is about expression, not frequency. A rare dominant allele will stay rare unless selection favors it.'
              ],
              extension: 'Pick a real human trait (e.g., PTC tasting, ABO blood groups). Find published allele frequencies for two ethnic populations. Compare to HW predictions. What\'s causing any deviation?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // GENETIC DRIFT SIMULATOR
      // ─────────────────────────────────────────────────────
      // Demonstrates that random sampling alone can change allele frequencies
      // dramatically in small populations. Run multiple lineages in parallel
      // at the same population size; see them diverge by chance.
      function GeneticDrift() {
        var popSizeState = useState(50), popSize = popSizeState[0], setPopSize = popSizeState[1];
        var generationsState = useState(100), generations = generationsState[0], setGenerations = generationsState[1];
        var trialsState = useState([]), trials = trialsState[0], setTrials = trialsState[1];
        var runIdState = useState(0), runId = runIdState[0], setRunId = runIdState[1];

        // Run ONE lineage of N generations starting at p=0.5. Returns array of p values.
        var runOneLineage = function(n, gens) {
          var p = 0.5;
          var trace = [p];
          for (var g = 0; g < gens; g++) {
            // Binomial sampling: each of the 2N alleles is drawn from current p.
            var alleles2N = 2 * n;
            var aCount = 0;
            for (var i = 0; i < alleles2N; i++) {
              if (Math.random() < p) aCount++;
            }
            p = aCount / alleles2N;
            trace.push(p);
            if (p === 0 || p === 1) {
              // Fixation — fill remaining generations with the fixed value.
              for (var k = g + 1; k < gens; k++) trace.push(p);
              break;
            }
          }
          return trace;
        };

        var runMany = function() {
          var traces = [];
          for (var i = 0; i < 5; i++) {
            traces.push(runOneLineage(popSize, generations));
          }
          setTrials(traces);
          setRunId(runId + 1);
          // Compute fixation summary
          var fixed0 = traces.filter(function(t) { return t[t.length - 1] === 0; }).length;
          var fixed1 = traces.filter(function(t) { return t[t.length - 1] === 1; }).length;
          announce('Ran 5 lineages at population size ' + popSize + ' for ' + generations + ' generations. Fixed at A: ' + fixed1 + ', fixed at a: ' + fixed0 + '.');
        };

        // SVG line chart of the 5 lineages
        var W = 600, H = 280, padL = 40, padR = 12, padT = 12, padB = 28;
        var xMax = generations;
        var toX = function(g) { return padL + (g / xMax) * (W - padL - padR); };
        var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
        var lineColors = ['#10b981', '#06b6d4', '#f43f5e', '#a855f7', '#f59e0b'];

        var renderTrace = function(trace, idx) {
          var d = trace.map(function(p, g) {
            return (g === 0 ? 'M ' : 'L ') + toX(g).toFixed(1) + ' ' + toY(p).toFixed(1);
          }).join(' ');
          return h('path', { key: idx, d: d, stroke: lineColors[idx % lineColors.length], strokeWidth: 1.6, fill: 'none', opacity: 0.9 });
        };

        var fixedCount = trials.filter(function(t) { return t[t.length - 1] === 0 || t[t.length - 1] === 1; }).length;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🎲', title: 'Genetic Drift Simulator' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-rose-500 to-pink-700 rounded-2xl p-5 text-white shadow-lg' },
              h('h2', { className: 'text-2xl font-black mb-1' }, 'Random sampling, no selection'),
              h('p', { className: 'text-sm opacity-90' },
                'Set a population size, then run 5 parallel lineages. They all start at p = 0.5 (50/50 allele frequencies) and evolve only by chance — no selection, no mutation. Smaller populations drift much harder.')
            ),
            // Stats
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h(StatCard, { label: 'Population (N)', value: popSize, color: 'text-rose-600' }),
              h(StatCard, { label: 'Generations', value: generations, color: 'text-cyan-600' }),
              h(StatCard, { label: 'Fixed Lineages', value: fixedCount + ' / 5', color: fixedCount > 0 ? 'text-amber-600' : 'text-slate-600', unit: 'reached p=0 or p=1' })
            ),
            // Chart
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Allele Frequency Over Time'),
                trials.length > 0 && h('div', { className: 'text-[10px] text-slate-600' }, 'Run #' + runId + ' · 5 parallel lineages')
              ),
              h('svg', {
                viewBox: '0 0 ' + W + ' ' + H,
                className: 'w-full h-72',
                role: 'img',
                'aria-label': trials.length === 0 ? 'Empty chart. Press Run to populate.' : 'Five colored lines showing allele-frequency trajectories. ' + fixedCount + ' of 5 fixed at 0 or 1.'
              },
                // Background
                h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
                // Y axis (p = 0 to 1)
                h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8', strokeWidth: 1 }),
                // X axis (generation 0 to N)
                h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8', strokeWidth: 1 }),
                // Mid-line at p = 0.5
                h('line', { x1: padL, y1: toY(0.5), x2: W - padR, y2: toY(0.5), stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4,4' }),
                // Y labels
                h('text', { x: 8, y: toY(1) + 4, fontSize: '10', fill: '#475569' }, 'p=1 (A fixed)'),
                h('text', { x: 8, y: toY(0.5) + 4, fontSize: '10', fill: '#475569' }, '0.5'),
                h('text', { x: 8, y: toY(0) + 4, fontSize: '10', fill: '#475569' }, 'p=0 (a fixed)'),
                // X labels
                h('text', { x: padL, y: H - 8, fontSize: '10', fill: '#475569' }, 'gen 0'),
                h('text', { x: W - padR - 32, y: H - 8, fontSize: '10', fill: '#475569' }, 'gen ' + generations),
                // Lineage traces
                trials.map(function(t, i) { return renderTrace(t, i); })
              )
            ),
            // Controls
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h('div', { className: 'bg-white rounded-xl p-3 shadow border border-slate-300' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2' }, 'Population Size (N)'),
                h('div', { className: 'grid grid-cols-4 gap-2' },
                  [10, 50, 200, 1000].map(function(n) {
                    return h('button', {
                      key: n,
                      onClick: function() { setPopSize(n); },
                      'aria-pressed': popSize === n,
                      'aria-label': 'Set population size to ' + n,
                      className: 'py-2 rounded-lg font-bold text-sm transition-colors ' + (popSize === n ? 'bg-rose-500 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    }, 'N = ' + n);
                  })
                ),
                h('div', { className: 'text-[10px] text-slate-600 mt-2' }, 'Smaller populations drift harder. N=10 → most lineages fix within 50 generations. N=1000 → rarely fixes.')
              ),
              h(LabeledSlider, {
                label: 'Generations to Run',
                value: generations, min: 20, max: 500, step: 10,
                onChange: function(v) { setGenerations(Math.round(v)); },
                valueText: generations + ' generations',
                accent: 'accent-cyan-500'
              })
            ),
            // Run / reset
            h('div', { className: 'flex gap-3 justify-center' },
              h('button', {
                onClick: runMany,
                className: 'px-6 py-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-colors'
              }, '🎲 Run 5 Lineages'),
              h('button', {
                onClick: function() { setTrials([]); setRunId(0); },
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
              }, '↺ Clear')
            ),
            // Reference
            h('div', { className: 'bg-rose-50 border border-rose-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-rose-800 mb-2' }, '📖 Why Drift Matters'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Founder effect: '), 'when a small group splits off from a larger population, their allele frequencies are random samples — and may differ wildly from the source. Many island populations show this.'),
                h('p', null, h('strong', null, 'Bottleneck: '), 'when a population crashes, the survivors\' allele frequencies become the new starting point. Northern elephant seals went through a bottleneck of ~20 individuals in the 1890s — they have very low genetic diversity today as a result.'),
                h('p', null, h('strong', null, 'The takeaway: '), 'not all evolution is selection. Random change is real, especially in small populations. Conservation biologists worry about this for endangered species — even with perfect protection, a tiny population loses genetic diversity by drift alone.')
              )
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-rose-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-rose-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Tiny population (N=10): '), 'Run 5 lineages over 100 generations. Most lineages "fix" — alleles go to 0 or 1 by chance. Repeat the run and notice the END states are different each time even though all started identically.'),
                h('li', null, h('strong', null, 'Big population (N=1000): '), 'Same 100 generations. Lineages stay near p=0.5 — drift can\'t move them much because random sampling from many individuals smooths out.'),
                h('li', null, h('strong', null, 'Long-term tiny population: '), 'Set N=10 and generations=500. Watch how lineages settle on whichever allele was lucky early. This is the founder effect playing out.'),
                h('li', null, h('strong', null, 'Compare outcomes: '), 'Run N=10 three times, then N=1000 three times. The N=10 outcomes vary wildly between runs; the N=1000 outcomes are nearly identical. Drift\'s power scales as 1/N.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🧪'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'Drift is one major force; SELECTION is the other. The Selection Sandbox lets you watch a 50-creature population evolve under your chosen pressure — stabilizing, directional, or disruptive.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-3', 'HS-LS3-1', 'HS-LS3-3'],
              questions: [
                'Run N=10 several times. The endpoints differ each time. What does this say about the predictability of evolution in small populations?',
                'Why do conservation biologists worry about genetic diversity in endangered species, even when the populations are protected?',
                'How is the founder effect different from a bottleneck? Give a real example of each.',
                'Drift is "random" but selection is "non-random." Why do both still count as evolution?'
              ],
              misconceptions: [
                'Students sometimes think drift only affects "tiny" populations. Drift happens in every population, but its effects scale with 1/N — invisible in big populations, dominant in small ones.',
                'Students may think drift gives a population an "advantage." Drift is directionless — it can take a population either way, and is just as likely to lose a beneficial allele as a harmful one.'
              ],
              extension: 'Research the genetic bottleneck of cheetahs (~10,000 years ago) or northern elephant seals (1890s, ~20 individuals). What are the modern genetic-diversity consequences?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // PLACEHOLDER COMPONENTS (Phases 4-8)
      // ─────────────────────────────────────────────────────
      // These render a "coming soon" stub so the navigation works end-to-end
      // even before the full implementations land. Visiting still marks the
      // badge so the progress banner reflects exploration.

      function ComingSoon(props) {
        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: props.icon || '🚧', title: props.title }),
          h('div', { className: 'p-12 max-w-2xl mx-auto text-center' },
            h('div', { className: 'text-6xl mb-4' }, '🚧'),
            h('h2', { className: 'text-2xl font-black text-slate-800 mb-2' }, 'Coming soon'),
            h('p', { className: 'text-slate-600 mb-4' }, props.preview || 'This module is on the build path — full implementation arrives next phase.'),
            h('div', { className: 'bg-white rounded-xl border border-slate-300 p-4 text-left text-sm text-slate-700 space-y-1' },
              h('div', { className: 'font-bold text-slate-800 mb-2' }, 'What it will do:'),
              (props.features || []).map(function(f, i) { return h('div', { key: i, className: 'flex items-start gap-2' }, h('span', { className: 'text-emerald-500' }, '✓'), h('span', null, f)); })
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SELECTION SANDBOX
      // ─────────────────────────────────────────────────────
      // 50-creature population with one heritable trait visualized as color
      // (light → dark gradient). Each generation: a fitness function selects
      // against creatures far from the environment's "ideal" trait. Survivors
      // reproduce with mutation; offspring inherit parent's trait ± noise.
      // Includes presets for the 3 textbook selection modes plus a Maine
      // snowshoe-hare climate-change scenario.
      function SelectionSandbox() {
        var POP_SIZE = 50;
        // Presets describe a fitness landscape over trait t ∈ [0, 1]:
        //   ideal: target value (where fitness peaks)
        //   width: how forgiving the fitness fall-off is
        //   mode:  'gaussian' (single peak) or 'bimodal' (two peaks for disruptive)
        var PRESETS = {
          stabilizing: {
            label: 'Stabilizing — Birth Weight',
            description: 'Extreme trait values are penalized; the population converges on the optimum. Real example: human birth weight — too small or too large is risky, ~7 lbs is optimal.',
            ideal: 0.5, width: 0.18, mode: 'gaussian',
            envColor: '#e0f2fe', traitLabel: 'Birth weight (small ↔ large)'
          },
          directional: {
            label: 'Directional — Peppered Moth',
            description: 'Selection favors one extreme. Industrial pollution darkened tree bark; moth populations shifted from light to dark over decades (Biston betularia).',
            ideal: 0.85, width: 0.14, mode: 'gaussian',
            envColor: '#475569', traitLabel: 'Wing color (light ↔ dark)'
          },
          disruptive: {
            label: 'Disruptive — Island Beak Depth',
            description: 'Both extremes outperform the middle. Rare in nature — happens when two distinct food sources favor different specialists, with intermediates losing both.',
            ideal: 0.5, width: 0.14, mode: 'bimodal',
            envColor: '#fef3c7', traitLabel: 'Beak depth (small ↔ large)'
          },
          drift: {
            label: 'Drift Only — No Selection',
            description: 'No fitness pressure. Watch how the population still changes over generations from random sampling (genetic drift). Smaller populations drift harder.',
            ideal: 0.5, width: 999, mode: 'gaussian',
            envColor: '#f1f5f9', traitLabel: 'Neutral trait'
          },
          snowshoe: {
            label: 'Maine Snowshoe Hare — Climate Change',
            description: 'Real ongoing research: as Maine winters shorten, hares are still molting white in November but the snow arrives later. White-coated hares against bare ground are easy prey. Selection now favors hares that delay their molt.',
            ideal: 0.32, width: 0.12, mode: 'gaussian',
            envColor: '#cbd5e1', traitLabel: 'Molt timing (early ↔ late)'
          }
        };

        var presetState = useState('directional'), presetId = presetState[0], setPresetId = presetState[1];
        var preset = PRESETS[presetId];
        var selStrengthState = useState(1.0), selStrength = selStrengthState[0], setSelStrength = selStrengthState[1];
        var mutSizeState = useState(0.04), mutSize = mutSizeState[0], setMutSize = mutSizeState[1];
        var generationState = useState(0), generation = generationState[0], setGeneration = generationState[1];
        var autoRunState = useState(false), autoRun = autoRunState[0], setAutoRun = autoRunState[1];
        // Refs for live values the RAF loop reads — kept stable so the loop's
        // useEffect deps don't include `generation` (which would force a full
        // RAF cancel/restart every step). Updated whenever state changes.
        var creaturesRef = useRef([]);
        var historyRef = useRef([]); // mean trait per generation, for chart
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var lastGenTickRef = useRef(0);
        var generationRef = useRef(0);
        var presetRef = useRef(preset);
        var autoRunRef = useRef(autoRun);
        var selStrengthRef = useRef(selStrength);
        var mutSizeRef = useRef(mutSize);
        // Mirror state into refs every render so the long-lived RAF closure
        // always sees the latest values without re-mounting.
        generationRef.current = generation;
        presetRef.current = preset;
        autoRunRef.current = autoRun;
        selStrengthRef.current = selStrength;
        mutSizeRef.current = mutSize;

        // Initialize / reset population. Each creature is randomly placed,
        // gets a random trait from [0,1] uniform, random velocity.
        var initPopulation = function() {
          var pop = [];
          for (var i = 0; i < POP_SIZE; i++) {
            pop.push({
              x: 30 + Math.random() * 740,
              y: 30 + Math.random() * 220,
              vx: (Math.random() - 0.5) * 30,
              vy: (Math.random() - 0.5) * 30,
              trait: Math.random(),
              alive: true,
              age: 0
            });
          }
          creaturesRef.current = pop;
          historyRef.current = [{ gen: 0, mean: 0.5, std: 0.29, alive: POP_SIZE }];
          setGeneration(0);
        };

        // Fitness function: returns [0, 1] for a given trait value under the
        // current preset. Reads from refs so it always uses the latest values
        // even when invoked from the long-lived RAF closure.
        var fitnessOf = function(t) {
          var p = presetRef.current;
          var raw;
          if (p.mode === 'bimodal') {
            // Two peaks at 0.2 and 0.8, valley at 0.5.
            var d1 = Math.abs(t - 0.2);
            var d2 = Math.abs(t - 0.8);
            var dMin = Math.min(d1, d2);
            raw = Math.exp(-Math.pow(dMin / p.width, 2));
          } else {
            raw = Math.exp(-Math.pow((t - p.ideal) / p.width, 2));
          }
          // Lerp between flat (selStrength=0) and full (selStrength=1).
          return lerp(1, raw, selStrengthRef.current);
        };

        // Advance one generation. Each creature's survival probability =
        // fitness. Survivors reproduce; offspring inherit trait ± mutation.
        // Maintain population at POP_SIZE. `silent` flag suppresses the live-
        // region announcement when called from auto-run (otherwise screen
        // readers get spammed every 1.5s).
        var stepGeneration = function(silent) {
          var pop = creaturesRef.current.slice();
          // Selection pass
          var survivors = [];
          for (var i = 0; i < pop.length; i++) {
            var c = pop[i];
            if (Math.random() < fitnessOf(c.trait)) survivors.push(c);
          }
          // Edge case: if everybody died (selStrength too high), keep top half.
          if (survivors.length === 0) {
            survivors = pop.sort(function(a, b) { return fitnessOf(b.trait) - fitnessOf(a.trait); }).slice(0, Math.max(2, Math.floor(pop.length / 2)));
          }
          // Reproduce until population is back to POP_SIZE.
          var next = survivors.slice();
          var mutNow = mutSizeRef.current;
          while (next.length < POP_SIZE) {
            var parent = survivors[Math.floor(Math.random() * survivors.length)];
            next.push({
              x: parent.x + (Math.random() - 0.5) * 30,
              y: parent.y + (Math.random() - 0.5) * 30,
              vx: (Math.random() - 0.5) * 30,
              vy: (Math.random() - 0.5) * 30,
              trait: clamp(parent.trait + randNormal(0, mutNow), 0, 1),
              alive: true,
              age: 0
            });
          }
          // Compute and record stats.
          var sum = 0, sumSq = 0;
          for (var k = 0; k < next.length; k++) { sum += next[k].trait; sumSq += next[k].trait * next[k].trait; }
          var mean = sum / next.length;
          var variance = (sumSq / next.length) - mean * mean;
          var std = Math.sqrt(Math.max(0, variance));
          var nextGen = generationRef.current + 1;
          historyRef.current.push({ gen: nextGen, mean: mean, std: std, alive: survivors.length });
          if (historyRef.current.length > 80) historyRef.current.shift();
          creaturesRef.current = next;
          generationRef.current = nextGen;
          setGeneration(nextGen);
          if (!silent) announce('Generation ' + nextGen + '. Mean trait ' + mean.toFixed(2) + ', survivors before reproduction ' + survivors.length + ' of ' + pop.length + '.');
        };

        // Initialize synchronously before first paint to avoid the empty-canvas
        // flicker. We use a one-time guard so subsequent re-renders don't re-init.
        if (creaturesRef.current.length === 0) {
          initPopulation();
        }
        // Re-init when preset changes (different env / fitness landscape).
        useEffect(function() {
          initPopulation();
        }, [presetId]);

        // Long-lived animation loop. Reads dynamic values from refs, so the
        // loop's deps are stable — it doesn't cancel/restart on every state
        // change. Only re-mounts on canvas remount (component re-mount).
        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          var lastT = performance.now();
          var loop = function(now) {
            var dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            // Update creature positions (skip if reduced motion preferred).
            if (!_prefersReducedMotion) {
              var pop = creaturesRef.current;
              for (var i = 0; i < pop.length; i++) {
                var c = pop[i];
                c.x += c.vx * dt;
                c.y += c.vy * dt;
                if (c.x < 16) { c.x = 16; c.vx = -c.vx; }
                if (c.x > canvas.width - 16) { c.x = canvas.width - 16; c.vx = -c.vx; }
                if (c.y < 16) { c.y = 16; c.vy = -c.vy; }
                if (c.y > canvas.height - 16) { c.y = canvas.height - 16; c.vy = -c.vy; }
              }
            }
            // Auto-run generation tick (silent — don't spam the live region).
            if (autoRunRef.current && now - lastGenTickRef.current > 1500) {
              lastGenTickRef.current = now;
              stepGeneration(true);
            }
            // Draw — direct ctx calls, no React re-render needed every frame.
            drawCanvas(ctx, canvas.width, canvas.height);
            rafRef.current = requestAnimationFrame(loop);
          };
          lastGenTickRef.current = performance.now();
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }, []); // eslint-disable-line — RAF reads from refs, so deps stay empty

        var drawCanvas = function(ctx, W, H) {
          // Read live values from refs — drawCanvas is called from the long-
          // lived RAF closure, so closure-captured `preset` / `generation`
          // would freeze at mount-time values.
          var livePreset = presetRef.current;
          var liveGen = generationRef.current;
          // Background — environment color tints the canvas to suggest the
          // selection landscape (e.g., dark slate for polluted moth scenario).
          ctx.fillStyle = livePreset.envColor;
          ctx.fillRect(0, 0, W, H);
          // Faint grid for structure
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.18)';
          ctx.lineWidth = 1;
          for (var gx = 0; gx < W; gx += 60) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
          }
          for (var gy = 0; gy < H; gy += 60) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
          }
          // Creatures: trait drives color. Map trait 0 → light cream, 1 → dark.
          var pop = creaturesRef.current;
          for (var i = 0; i < pop.length; i++) {
            var c = pop[i];
            var tColor = traitToColor(c.trait);
            ctx.fillStyle = tColor;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            // Subtle eye dot for character
            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(c.x + 2, c.y - 2, 1.2, 0, 2 * Math.PI); ctx.fill();
          }
          // Watermark generation count
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fillText('Generation ' + liveGen + '  ·  Pop ' + pop.length, 12, H - 10);
        };

        // Trait-to-color: blends between two colors based on the preset's
        // visual coding. For most presets we use a light-cream → dark-slate
        // gradient. This is what makes the population shift visually obvious.
        function traitToColor(t) {
          var r = Math.round(lerp(254, 30, t));
          var g = Math.round(lerp(243, 41, t));
          var b = Math.round(lerp(199, 59, t));
          return 'rgb(' + r + ',' + g + ',' + b + ')';
        }

        // Histogram of current trait distribution (10 bins, 0.0-1.0).
        var renderHistogram = function() {
          var bins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          var pop = creaturesRef.current;
          for (var i = 0; i < pop.length; i++) {
            var bin = Math.min(9, Math.floor(pop[i].trait * 10));
            bins[bin]++;
          }
          var maxCount = Math.max.apply(null, bins);
          if (maxCount === 0) maxCount = 1;
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Trait Distribution'),
            h('div', { className: 'flex items-end h-32 gap-1' },
              bins.map(function(count, i) {
                var pct = Math.round((count / maxCount) * 100);
                return h('div', { key: i, className: 'flex-1 flex flex-col justify-end' },
                  h('div', {
                    style: { height: pct + '%', backgroundColor: traitToColor(i / 10 + 0.05) },
                    className: 'w-full rounded-t border border-slate-300',
                    title: 'Trait ' + (i / 10).toFixed(1) + '-' + ((i + 1) / 10).toFixed(1) + ': ' + count + ' creatures'
                  })
                );
              })
            ),
            h('div', { className: 'flex justify-between text-[9px] text-slate-600 mt-1' },
              h('span', null, '0.0'),
              h('span', null, '0.5'),
              h('span', null, '1.0')
            ),
            h('div', { className: 'text-[10px] text-slate-600 mt-1 text-center' }, preset.traitLabel)
          );
        };

        // Mean-trait line chart over generations.
        var renderGenerationChart = function() {
          var hist = historyRef.current;
          var W = 280, H = 130, padL = 30, padR = 8, padT = 10, padB = 22;
          var xMax = Math.max(20, hist.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          var pathD = hist.map(function(pt, i) {
            return (i === 0 ? 'M ' : 'L ') + toX(i).toFixed(1) + ' ' + toY(pt.mean).toFixed(1);
          }).join(' ');
          // Variance band — show ±1 std
          var bandUpper = hist.map(function(pt, i) {
            return (i === 0 ? 'M ' : 'L ') + toX(i).toFixed(1) + ' ' + toY(Math.min(1, pt.mean + pt.std)).toFixed(1);
          }).join(' ');
          var bandLowerReverse = hist.slice().reverse().map(function(pt, i) {
            var idx = hist.length - 1 - i;
            return 'L ' + toX(idx).toFixed(1) + ' ' + toY(Math.max(0, pt.mean - pt.std)).toFixed(1);
          }).join(' ');
          var bandPath = bandUpper + ' ' + bandLowerReverse + ' Z';
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Mean Trait Over Generations'),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full h-32',
              role: 'img',
              'aria-label': hist.length === 0 ? 'No history yet.' : 'Mean trait over ' + hist.length + ' generations. Latest mean: ' + (hist[hist.length - 1] ? hist[hist.length - 1].mean.toFixed(2) : '—')
            },
              // Background
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              // Y axis
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8', strokeWidth: 1 }),
              // X axis
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8', strokeWidth: 1 }),
              // Y labels
              h('text', { x: 4, y: toY(1) + 4, fontSize: '9', fill: '#475569' }, '1.0'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '9', fill: '#475569' }, '0.5'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '9', fill: '#475569' }, '0.0'),
              // Mid line
              h('line', { x1: padL, y1: toY(0.5), x2: W - padR, y2: toY(0.5), stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3,3' }),
              // Variance band
              hist.length > 1 && h('path', { d: bandPath, fill: 'rgba(16, 185, 129, 0.18)', stroke: 'none' }),
              // Mean line
              h('path', { d: pathD, stroke: '#10b981', strokeWidth: 2, fill: 'none' }),
              // Latest dot
              hist.length > 0 && h('circle', { cx: toX(hist.length - 1), cy: toY(hist[hist.length - 1].mean), r: 3, fill: '#10b981' })
            )
          );
        };

        var latest = historyRef.current[historyRef.current.length - 1] || { mean: 0.5, std: 0.29, alive: POP_SIZE };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🧪', title: 'Selection Sandbox' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero with preset description
            h('div', { className: 'bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-3xl' }, '🧪'),
                h('div', null,
                  h('h2', { className: 'text-lg font-black' }, preset.label),
                  h('p', { className: 'text-sm text-emerald-50 mt-1' }, preset.description)
                )
              )
            ),
            // Stats row
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Generation', value: generation, color: 'text-emerald-700' }),
              h(StatCard, { label: 'Mean Trait', value: latest.mean.toFixed(3), color: 'text-cyan-700' }),
              h(StatCard, { label: 'Std Dev', value: latest.std.toFixed(3), color: 'text-violet-700', unit: 'spread of trait' }),
              h(StatCard, { label: 'Last Survivors', value: latest.alive + ' / ' + POP_SIZE, color: latest.alive < POP_SIZE * 0.5 ? 'text-rose-700' : 'text-emerald-700' })
            ),
            // Canvas (population view)
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('canvas', {
                ref: canvasRef,
                width: 800, height: 280,
                className: 'w-full block',
                role: 'img',
                'aria-label': 'Selection sandbox population: ' + creaturesRef.current.length + ' creatures, mean trait ' + latest.mean.toFixed(2) + ', generation ' + generation
              })
            ),
            // Histogram + chart side by side
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              renderHistogram(),
              renderGenerationChart()
            ),
            // Preset picker
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Selection Mode'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2' },
                Object.keys(PRESETS).map(function(id) {
                  var p = PRESETS[id];
                  return h('button', {
                    key: id,
                    onClick: function() { setPresetId(id); },
                    'aria-pressed': presetId === id,
                    'aria-label': 'Select preset: ' + p.label,
                    className: 'p-2 rounded-lg text-xs font-bold border-2 transition-colors text-left ' + (presetId === id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 hover:border-slate-300')
                  }, p.label);
                })
              )
            ),
            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h(LabeledSlider, {
                label: 'Selection Strength',
                value: selStrength, min: 0, max: 1, step: 0.05,
                onChange: function(v) { setSelStrength(v); },
                valueText: selStrength === 0 ? 'Off (drift only)' : 'Strength = ' + selStrength.toFixed(2),
                accent: 'accent-emerald-500',
                hint: 'How strongly the environment selects against unfit creatures. 0 = no selection (genetic drift only); 1 = full selection.'
              }),
              h(LabeledSlider, {
                label: 'Mutation Size',
                value: mutSize, min: 0, max: 0.15, step: 0.01,
                onChange: function(v) { setMutSize(v); },
                valueText: mutSize === 0 ? 'No mutation (clonal)' : 'σ = ' + mutSize.toFixed(2),
                accent: 'accent-violet-500',
                hint: 'Standard deviation of trait change between parent and offspring. Higher = more variation each generation.'
              })
            ),
            // Controls
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: stepGeneration,
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white shadow-lg transition-colors'
              }, '⏭ Step 1 Generation'),
              h('button', {
                onClick: function() { for (var i = 0; i < 10; i++) stepGeneration(); },
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white shadow-lg transition-colors'
              }, '⏭⏭ Step 10'),
              h('button', {
                onClick: function() { setAutoRun(!autoRun); },
                'aria-pressed': autoRun,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg transition-colors ' + (autoRun ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white')
              }, autoRun ? '⏸ Stop Auto-Run' : '▶ Auto-Run'),
              h('button', {
                onClick: function() { initPopulation(); },
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
              }, '↺ Reset Population')
            ),
            // Educational reference
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2' }, '📖 What you\'re seeing'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Variation: '), 'Each generation\'s trait distribution (the histogram) shows variation among individuals. Without variation, there\'s nothing for selection to act on.'),
                h('p', null, h('strong', null, 'Selection: '), 'Creatures with traits closer to the preset\'s "ideal" survive at higher rates. The fraction that dies before reproducing is the selection pressure.'),
                h('p', null, h('strong', null, 'Inheritance: '), 'Survivors\' offspring inherit the parent\'s trait ± a small random change (mutation). Over generations, this shifts the population mean.')
              )
            ),
            // Try-this experiments — concrete prompts mapped to the presets.
            h('div', { className: 'bg-white border-2 border-emerald-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Selection vs drift: '), 'Pick the directional (peppered moth) preset, set Selection Strength to 1.0, click Step 10. Watch the mean shift toward 0.85. Now set Selection to 0 and step another 30 generations — the mean wanders randomly without converging.'),
                h('li', null, h('strong', null, 'Stabilizing keeps the mean stable: '), 'Switch to the stabilizing (birth weight) preset. The mean stays near 0.5 but the standard deviation SHRINKS over generations as extremes are pruned. Variation decreases without the mean moving.'),
                h('li', null, h('strong', null, 'Disruptive splits the population: '), 'Switch to disruptive. After 15-20 generations the histogram becomes BIMODAL — two peaks at 0.2 and 0.8 with a valley at 0.5. This is how one species can begin to split into two.'),
                h('li', null, h('strong', null, 'Mutation matters: '), 'On the directional preset with selection ON, set Mutation Size to 0 (no variation introduced). After convergence the population stops changing — selection has nothing left to act on. Then bump Mutation Size up — convergence resumes faster.'),
                h('li', null, h('strong', null, 'Snowshoe hare scenario: '), 'Switch to the snowshoe hare preset. The "ideal" trait is 0.32 (delayed molt) — selection now pushes hares away from their ancestral early-molt genes. This is real ongoing Maine evolution.')
              )
            ),
            // Cross-module suggestion — invites learners to the next natural step.
            h('div', { className: 'bg-cyan-50 border border-cyan-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🐦'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'See selection happen in REAL data. The Galápagos Beak Lab reproduces the Grant 1977 drought study where finch beak depth shifted measurably in just one year.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5', 'HS-LS4-6'],
              questions: [
                'In stabilizing selection (birth weight), the mean stays put but variance shrinks. What does this tell us about extreme phenotypes in nature?',
                'Disruptive selection produces a bimodal distribution. Why might this be the start of speciation?',
                'The snowshoe hare scenario reflects ongoing climate-change selection in Maine. What\'s the "ideal" trait shifting toward, and why?',
                'If you turn selection off and just run mutation + drift for 50 generations, the mean wanders. Is this still "evolution"?'
              ],
              misconceptions: [
                '"Animals try to evolve to fit the environment." Selection acts on existing variation; mutations are random and don\'t arise on demand. Watch for goal-driven language in student explanations.',
                '"Survival of the fittest = strongest survives." Fitness here is reproductive success — a smaller animal that has more surviving offspring is FITTER than a stronger one that has none.',
                '"The peppered moth experiment is faked." It\'s not — Bernard Kettlewell\'s 1950s experiments have been replicated multiple times with corrections, and direct observations of moth predation by birds (e.g., Cook 2003, Majerus 2007) confirmed the mechanism.'
              ],
              extension: 'Pick one preset and write a 1-page lab report: hypothesis, what would prove vs disprove the mechanism, what you observed in 30 generations, what real-world species this matches.'
            })
          )
        );
      }
      // ─────────────────────────────────────────────────────
      // GALÁPAGOS BEAK LAB
      // ─────────────────────────────────────────────────────
      // Reproduces the Peter & Rosemary Grant 1977 medium-ground-finch drought
      // study on Daphne Major. Population starts at mean 9.2mm beak depth.
      // Drought eliminates the small seeds, leaving only large hard ones —
      // birds with small beaks can't crack them and starve. Within ONE year,
      // the surviving population shifts to mean 10.0mm. Real-world observed
      // evolution. Toggle "Show Grant Data" to overlay the actual measurements.
      function BeakLab() {
        // Beak depth in mm. Real Grant data: pre-drought mean ≈ 9.2mm, post ≈ 10.0mm.
        // Birds modeled as continuous beak depth, sorted into 4 display classes.
        var POP_SIZE = 60;
        var BEAK_CLASSES = [
          { min: 0, max: 9.0, label: 'Small (<9mm)', color: '#fde68a', icon: '🐤', canCrack: 1 },   // tiny seeds only
          { min: 9.0, max: 10.0, label: 'Medium (9-10mm)', color: '#fb923c', icon: '🐦', canCrack: 2 }, // small + medium
          { min: 10.0, max: 11.0, label: 'Large (10-11mm)', color: '#dc2626', icon: '🦃', canCrack: 3 }, // small + medium + large
          { min: 11.0, max: 99, label: 'Extra-large (>11mm)', color: '#7f1d1d', icon: '🦅', canCrack: 4 }  // can crack everything including very hard
        ];
        // Seed types — hardness rank determines minimum beak class to crack.
        // Real Galápagos seeds: tribulus = ~14N, opuntia = ~25N, palo santo = larger.
        var SEED_TYPES = [
          { id: 'small', label: 'Small soft (chamaesyce)', hardness: 1, color: '#86efac' },
          { id: 'medium', label: 'Medium (cordia)', hardness: 2, color: '#facc15' },
          { id: 'large', label: 'Large (tribulus)', hardness: 3, color: '#a16207' },
          { id: 'veryHard', label: 'Very hard (palo santo)', hardness: 4, color: '#3f1d1d' }
        ];
        // Year 0 (baseline) seed availability. Drought removes the soft seeds.
        var BASELINE_SEEDS = { small: 600, medium: 400, large: 200, veryHard: 80 };
        var DROUGHT_SEEDS = { small: 30, medium: 60, large: 250, veryHard: 200 };

        // Real Grant data — published in their 1986 Ecology paper. Mean beak
        // depth of medium ground finches before/after the 1977 drought.
        var GRANT_DATA = [
          { year: 1976, mean: 9.21, label: 'Pre-drought baseline' },
          { year: 1977, mean: 9.42, label: 'During drought' },
          { year: 1978, mean: 10.05, label: 'After drought (1 year)' },
          { year: 1979, mean: 9.88, label: 'Wet again — partial reversion' },
          { year: 1980, mean: 9.74, label: 'Equilibrating' }
        ];

        var birdsRef = useRef([]);
        var historyRef = useRef([]);
        var yearState = useState(0), year = yearState[0], setYear = yearState[1];
        var droughtState = useState(false), drought = droughtState[0], setDrought = droughtState[1];
        var showGrantState = useState(false), showGrant = showGrantState[0], setShowGrant = showGrantState[1];
        var mutSizeState = useState(0.25), mutSize = mutSizeState[0], setMutSize = mutSizeState[1];

        var initPopulation = function() {
          var pop = [];
          for (var i = 0; i < POP_SIZE; i++) {
            // Mean 9.2mm, std 0.6mm — matches Grant baseline.
            pop.push({ depth: clamp(randNormal(9.2, 0.6), 6, 14), alive: true });
          }
          birdsRef.current = pop;
          var sum = 0; for (var k = 0; k < pop.length; k++) sum += pop[k].depth;
          historyRef.current = [{ year: 0, mean: sum / pop.length, alive: pop.length }];
          setYear(0);
          setDrought(false);
        };

        // Run one annual cycle: seeds set by drought flag, birds eat what
        // they can crack, those who don't get enough food die.
        var stepYear = function() {
          var seeds = drought ? Object.assign({}, DROUGHT_SEEDS) : Object.assign({}, BASELINE_SEEDS);
          var birds = birdsRef.current.slice();
          // Each bird's "food eaten" — proportional to seeds it can access.
          // Sort birds by depth descending so big-beaked birds eat first
          // (they get all seeds; small-beaked birds get leftovers of soft seeds).
          birds.sort(function(a, b) { return b.depth - a.depth; });
          var birdFood = new Array(birds.length);
          for (var i = 0; i < birds.length; i++) {
            var bird = birds[i];
            var crackability = depthToCrackLevel(bird.depth);
            var got = 0;
            // Each bird eats some of every seed type it can crack.
            // Eat proportional to availability; consume what's eaten.
            for (var s = 0; s < SEED_TYPES.length; s++) {
              var seedId = SEED_TYPES[s].id;
              if (crackability >= SEED_TYPES[s].hardness && seeds[seedId] > 0) {
                var portion = Math.min(seeds[seedId], 18);
                seeds[seedId] -= portion;
                got += portion;
              }
            }
            birdFood[i] = got;
          }
          // Survival threshold: need at least 30 food units to survive the year.
          // (Calibrated so drought wipes ~half the small-beak birds.)
          var survivors = [];
          for (var j = 0; j < birds.length; j++) {
            if (birdFood[j] >= 30) survivors.push(birds[j]);
          }
          // Edge case
          if (survivors.length < 4) {
            survivors = birds.slice().sort(function(a, b) { return b.depth - a.depth; }).slice(0, Math.max(4, Math.floor(birds.length / 4)));
          }
          // Reproduction: pair up survivors, each pair has 1-3 offspring up to
          // population cap. Offspring depth = mean of parents ± mutation noise.
          var next = survivors.slice();
          while (next.length < POP_SIZE) {
            var p1 = survivors[Math.floor(Math.random() * survivors.length)];
            var p2 = survivors[Math.floor(Math.random() * survivors.length)];
            var childDepth = clamp((p1.depth + p2.depth) / 2 + randNormal(0, mutSize), 6, 14);
            next.push({ depth: childDepth, alive: true });
          }
          birdsRef.current = next;
          var sum = 0;
          for (var m = 0; m < next.length; m++) sum += next[m].depth;
          var nextYear = year + 1;
          historyRef.current.push({ year: nextYear, mean: sum / next.length, alive: survivors.length, drought: drought });
          if (historyRef.current.length > 30) historyRef.current.shift();
          setYear(nextYear);
          announce('Year ' + nextYear + (drought ? ' (drought)' : '') + '. Mean beak depth ' + (sum / next.length).toFixed(2) + 'mm. ' + survivors.length + ' of ' + birds.length + ' birds survived.');
        };

        // Map continuous depth → beak class index (for display & cracking ability).
        function depthToClassIdx(depth) {
          for (var i = 0; i < BEAK_CLASSES.length; i++) {
            if (depth >= BEAK_CLASSES[i].min && depth < BEAK_CLASSES[i].max) return i;
          }
          return BEAK_CLASSES.length - 1;
        }
        function depthToCrackLevel(depth) {
          return BEAK_CLASSES[depthToClassIdx(depth)].canCrack;
        }

        // Initialize synchronously before first paint to avoid an empty-grid
        // flicker. Guarded so subsequent re-renders don't re-init.
        if (birdsRef.current.length === 0) {
          initPopulation();
        }

        // Compute current population stats.
        var pop = birdsRef.current;
        var classCounts = [0, 0, 0, 0];
        var sumDepth = 0;
        for (var i = 0; i < pop.length; i++) {
          classCounts[depthToClassIdx(pop[i].depth)]++;
          sumDepth += pop[i].depth;
        }
        var meanDepth = pop.length > 0 ? sumDepth / pop.length : 0;
        var latest = historyRef.current[historyRef.current.length - 1] || { mean: 9.2, alive: POP_SIZE };

        // SVG: bird population grid (4 columns by class)
        var renderBirds = function() {
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Population by Beak Class'),
              h('div', { className: 'text-[10px] text-slate-600' }, pop.length + ' birds total')
            ),
            h('div', { className: 'grid grid-cols-4 gap-2' },
              BEAK_CLASSES.map(function(cls, i) {
                var count = classCounts[i];
                return h('div', { key: i, className: 'p-2 rounded-lg', style: { backgroundColor: cls.color + '33', borderColor: cls.color } },
                  h('div', { className: 'text-3xl text-center mb-1' }, cls.icon),
                  h('div', { className: 'text-xs font-bold text-center text-slate-800' }, cls.label),
                  h('div', { className: 'text-2xl font-black text-center text-slate-900 mt-1' }, count),
                  h('div', { className: 'text-[9px] text-slate-600 text-center' }, count === 1 ? 'bird' : 'birds')
                );
              })
            )
          );
        };

        // Seed availability bar chart
        var renderSeeds = function() {
          var seeds = drought ? DROUGHT_SEEDS : BASELINE_SEEDS;
          var total = SEED_TYPES.reduce(function(s, st) { return s + seeds[st.id]; }, 0);
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Available Seeds This Year'),
              h('div', { className: 'text-[10px] font-bold ' + (drought ? 'text-rose-700' : 'text-emerald-700') }, drought ? '🌵 DROUGHT' : '🌱 Normal year')
            ),
            h('div', { className: 'space-y-1' },
              SEED_TYPES.map(function(st) {
                var pct = total > 0 ? (seeds[st.id] / total) * 100 : 0;
                return h('div', { key: st.id, className: 'flex items-center gap-2 text-[11px]' },
                  h('div', { className: 'w-32 text-slate-700' }, st.label),
                  h('div', { className: 'flex-1 h-4 bg-slate-100 rounded overflow-hidden' },
                    h('div', { style: { width: pct + '%', backgroundColor: st.color, height: '100%' } })
                  ),
                  h('div', { className: 'w-12 text-right font-mono text-slate-700' }, seeds[st.id])
                );
              })
            ),
            h('div', { className: 'text-[10px] text-slate-600 mt-2' },
              drought ? 'In drought, soft seeds are gone. Only birds with beaks ≥10mm can crack the remaining hard seeds.' : 'Normal year — abundant soft seeds favor small-beaked birds (cheaper to crack).')
          );
        };

        // Generation-over-time chart with optional Grant overlay.
        var renderHistory = function() {
          var hist = historyRef.current;
          var W = 500, H = 180, padL = 40, padR = 12, padT = 12, padB = 28;
          var allYears = hist.map(function(h) { return h.year; }).concat(showGrant ? GRANT_DATA.map(function(g) { return g.year - 1976; }) : []);
          var xMax = Math.max(8, Math.max.apply(null, allYears.length > 0 ? allYears : [8]));
          var allMeans = hist.map(function(h) { return h.mean; }).concat(showGrant ? GRANT_DATA.map(function(g) { return g.mean; }) : []);
          var yMin = Math.min(8.8, Math.min.apply(null, allMeans.length > 0 ? allMeans : [8.8]));
          var yMax = Math.max(10.5, Math.max.apply(null, allMeans.length > 0 ? allMeans : [10.5]));
          var toX = function(yr) { return padL + (yr / xMax) * (W - padL - padR); };
          var toY = function(d) { return padT + ((yMax - d) / (yMax - yMin)) * (H - padT - padB); };
          var pathD = hist.map(function(pt, i) {
            return (i === 0 ? 'M ' : 'L ') + toX(pt.year).toFixed(1) + ' ' + toY(pt.mean).toFixed(1);
          }).join(' ');
          var grantPath = GRANT_DATA.map(function(g, i) {
            return (i === 0 ? 'M ' : 'L ') + toX(g.year - 1976).toFixed(1) + ' ' + toY(g.mean).toFixed(1);
          }).join(' ');
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Mean Beak Depth Over Years'),
              h('div', { className: 'flex gap-3 text-[10px]' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#f59e0b', display: 'inline-block' } }),
                  h('span', { className: 'text-slate-700' }, 'Your sim')
                ),
                showGrant && h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#1e293b', display: 'inline-block' } }),
                  h('span', { className: 'text-slate-700' }, 'Real Grant data')
                )
              )
            ),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': 'Mean beak depth chart over ' + hist.length + ' years' + (showGrant ? ', with real Grant 1977 data overlay' : '')
            },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              // axes
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              // y labels
              h('text', { x: 4, y: toY(yMax) + 4, fontSize: '10', fill: '#475569' }, yMax.toFixed(1) + 'mm'),
              h('text', { x: 4, y: toY((yMin + yMax) / 2) + 4, fontSize: '10', fill: '#475569' }, ((yMin + yMax) / 2).toFixed(1) + 'mm'),
              h('text', { x: 4, y: toY(yMin) + 4, fontSize: '10', fill: '#475569' }, yMin.toFixed(1) + 'mm'),
              // grid line at 9.2 (real baseline)
              h('line', { x1: padL, y1: toY(9.2), x2: W - padR, y2: toY(9.2), stroke: '#cbd5e1', strokeDasharray: '3,3' }),
              h('text', { x: W - padR - 60, y: toY(9.2) - 4, fontSize: '9', fill: '#94a3b8' }, 'baseline 9.2mm'),
              // x labels
              h('text', { x: padL, y: H - 8, fontSize: '10', fill: '#475569' }, 'Year 0'),
              h('text', { x: W - padR - 38, y: H - 8, fontSize: '10', fill: '#475569' }, 'Year ' + xMax),
              // user line
              hist.length > 1 && h('path', { d: pathD, stroke: '#f59e0b', strokeWidth: 2, fill: 'none' }),
              hist.length > 0 && h('circle', { cx: toX(hist[hist.length - 1].year), cy: toY(hist[hist.length - 1].mean), r: 4, fill: '#f59e0b' }),
              // grant overlay
              showGrant && h('path', { d: grantPath, stroke: '#1e293b', strokeWidth: 2, strokeDasharray: '6,3', fill: 'none' }),
              showGrant && GRANT_DATA.map(function(g, i) {
                return h('circle', { key: i, cx: toX(g.year - 1976), cy: toY(g.mean), r: 3, fill: '#1e293b' });
              })
            )
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🐦', title: 'Galápagos Beak Lab' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🌵'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'Daphne Major, 1977'),
                  h('p', { className: 'text-sm text-amber-50 mt-1' },
                    'Peter & Rosemary Grant tagged every medium ground finch on this Galápagos islet for 40+ years. In 1977 a severe drought killed 85% of small soft seeds. The next year, surviving birds had measurably larger beaks — observed evolution within ONE generation.')
                )
              )
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Year', value: year, color: 'text-amber-700' }),
              h(StatCard, { label: 'Mean Beak', value: meanDepth.toFixed(2), unit: 'mm', color: 'text-orange-700' }),
              h(StatCard, { label: 'Last Year', value: latest.alive + ' / ' + POP_SIZE, color: latest.alive < POP_SIZE * 0.6 ? 'text-rose-700' : 'text-emerald-700', unit: 'survived' }),
              h(StatCard, { label: 'Mode', value: drought ? 'Drought' : 'Normal', color: drought ? 'text-rose-700' : 'text-emerald-700' })
            ),
            renderBirds(),
            renderSeeds(),
            renderHistory(),
            // Controls
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: stepYear,
                className: 'px-5 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg'
              }, '⏭ Run 1 Year'),
              h('button', {
                onClick: function() { setDrought(!drought); },
                'aria-pressed': drought,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (drought ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white')
              }, drought ? '🌵 Drought ON' : '🌧️ Trigger Drought'),
              h('button', {
                onClick: function() { setShowGrant(!showGrant); },
                'aria-pressed': showGrant,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (showGrant ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-800')
              }, showGrant ? '📊 Grant Data ON' : '📊 Show Real Grant Data'),
              h('button', {
                onClick: initPopulation,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Reset')
            ),
            // Mutation slider
            h(LabeledSlider, {
              label: 'Mutation Size (Beak Variation per Generation)',
              value: mutSize, min: 0.05, max: 0.5, step: 0.05,
              onChange: function(v) { setMutSize(v); },
              valueText: 'σ = ' + mutSize.toFixed(2) + 'mm',
              accent: 'accent-amber-500',
              hint: 'Standard deviation of offspring beak depth around the parental mean. Higher = faster evolution but also faster reversal.'
            }),
            // Maine sprinkle
            h('div', { className: 'bg-cyan-50 border border-cyan-300 rounded-xl p-3 text-sm text-slate-700' },
              h('strong', null, '🦆 Connecting to Maine: '),
              'Maine has its own beak-specialist finches. Purple finches (small conical bills) eat seeds and berries. Evening grosbeaks have unusually large bills for cracking sugar maple and box elder seeds — a Maine winter staple. White-winged crossbills have crossed mandible tips that pry open spruce cones. Same evolutionary principle as the Galápagos: bill shape adapts to the available food source.'
            ),
            // Educational reference
            h('div', { className: 'bg-amber-50 border border-amber-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-2' }, '📖 What the Grants Found'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, '1977 baseline: '), 'Mean medium-ground-finch beak depth ≈ 9.21mm. Population ~1,500 birds.'),
                h('p', null, h('strong', null, 'Drought: '), '~85% of all the soft seeds died off. Only the largest, hardest seeds remained.'),
                h('p', null, h('strong', null, 'Mortality: '), '~85% of the finch population died — and the survivors were almost all large-beaked birds (the only ones who could crack the remaining seeds).'),
                h('p', null, h('strong', null, '1978 mean: '), '10.05mm — a 0.84mm shift in ONE generation. This was the first DOCUMENTED case of evolution caught happening in a wild vertebrate, and it took just one year.'),
                h('p', null, h('strong', null, 'The lesson: '), 'Evolution is not slow. Given strong selection, populations can shift dramatically within a single generation. The Grants\' work is now a textbook example of natural selection in action.')
              )
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-amber-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Reproduce the 1977 study: '), 'Start fresh (Reset). Trigger Drought, then Run 1 Year. Look at the mean beak depth shift. Toggle "Show Real Grant Data" — your result should track the historical 1977 → 1978 jump (~0.5-1mm).'),
                h('li', null, h('strong', null, 'Drought without an end: '), 'Keep drought ON and run 5 more years. The population keeps shifting toward larger beaks until it hits the upper end of available variation — selection can\'t create new traits, only sort existing ones.'),
                h('li', null, h('strong', null, 'Reversal when the rains return: '), 'After 5 drought years, turn drought OFF and run 5 more years. Notice the mean drift back toward smaller — small beaks are cheaper to grow when soft seeds return.'),
                h('li', null, h('strong', null, 'Mutation rate matters: '), 'Set σ = 0.05 (very tight inheritance) and run 5 drought years. Compare with σ = 0.40 (loose inheritance). Lower mutation = slower response to selection because there\'s less variation to work with.'),
                h('li', null, h('strong', null, 'Try to make small beaks come back: '), 'Once large-beaked birds dominate, turning off drought is not enough — the small-beak gene pool may already be too thin to recover quickly. This is why evolution often doesn\'t fully reverse even when conditions revert.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-indigo-50 border border-indigo-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🌗'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You watched one species CHANGE. The Speciation Simulator shows what happens next — when an isolated population diverges far enough that it becomes a SECOND species. This is how the Galápagos got 14 finch species from one ancestor.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5'],
              questions: [
                'The Grants observed evolution in just ONE year. What features of the finch population (population size, generation length, selection strength) made this so fast?',
                'Why do post-drought beaks shift toward LARGER (not smaller)? What\'s the underlying physical / mechanical reason?',
                'When the rains return, mean beak depth reverts somewhat — but not all the way. Why?',
                'Could this same kind of rapid evolution happen in humans? Why or why not?'
              ],
              misconceptions: [
                '"Evolution is too slow to observe." This is the textbook counterexample. Antibiotic resistance is another. Both demonstrate strong selection on short generation times.',
                '"The Grants experimented on the finches." They didn\'t — they observed natural variation and natural selection. Understanding the difference between observational and experimental science matters here.'
              ],
              extension: 'Read the abstract of Grant & Grant\'s 2006 paper "Evolution of Character Displacement in Darwin\'s Finches" (Science 313: 224-226). What did they document there that this lab doesn\'t simulate?'
            })
          )
        );
      }
      // ─────────────────────────────────────────────────────
      // PHYLOGENETIC TREE BUILDER
      // ─────────────────────────────────────────────────────
      // 12 organisms (mix of Maine wildlife + global examples). Each must be
      // assigned to a clade based on shared derived traits. Tool grades the
      // placement and shows the correct cladogram. Plain dropdown UI rather
      // than drag-and-drop — simpler, more accessible, works on touch.
      function PhyloBuilder() {
        var ORGANISMS = [
          { id: 'moose',    name: 'Moose',           icon: '🫎', truth: 'mammals',    note: 'Maine\'s largest land animal — has fur, milk glands.' },
          { id: 'deer',     name: 'White-tail Deer', icon: '🦌', truth: 'mammals',    note: 'Common Maine mammal — fur, live birth, mammary glands.' },
          { id: 'bear',     name: 'Black Bear',      icon: '🐻', truth: 'mammals',    note: 'Mainland Maine apex carnivore.' },
          { id: 'cardinal', name: 'Cardinal',        icon: '🐦', truth: 'birds',      note: 'Year-round Maine resident — feathers, lays eggs.' },
          { id: 'turtle',   name: 'Box Turtle',      icon: '🐢', truth: 'reptiles',   note: 'Cold-blooded, scales, lays leathery eggs.' },
          { id: 'snake',    name: 'Garter Snake',    icon: '🐍', truth: 'reptiles',   note: 'Common Maine snake — scaly, ectothermic.' },
          { id: 'salmon',   name: 'Atlantic Salmon', icon: '🐟', truth: 'fish',       note: 'Anadromous — Maine\'s endangered native.' },
          { id: 'frog',     name: 'Bullfrog',        icon: '🐸', truth: 'amphibians', note: 'Moist skin, lays jelly-coated eggs in water.' },
          { id: 'lobster',  name: 'Maine Lobster',   icon: '🦞', truth: 'arthropods', note: 'Jointed exoskeleton, 10 legs — like insects, not fish.' },
          { id: 'bee',      name: 'Honeybee',        icon: '🐝', truth: 'arthropods', note: 'Insect — 6 legs, exoskeleton.' },
          { id: 'crab',     name: 'Crab',            icon: '🦀', truth: 'arthropods', note: 'Crustacean — close cousin to lobster.' },
          { id: 'maple',    name: 'Red Maple',       icon: '🍁', truth: 'plants',     note: 'Maine state tree — photosynthesizes, no nervous system.' }
        ];
        var CLADES = [
          { id: 'plants',     label: '🌳 Plants',                 color: '#10b981', tip: 'Photosynthesize. Cell walls of cellulose. No nervous system.' },
          { id: 'arthropods', label: '🦞 Arthropods',             color: '#7c3aed', tip: 'Jointed exoskeleton. Segmented body. Insects, crustaceans, spiders.' },
          { id: 'fish',       label: '🐟 Fish',                    color: '#06b6d4', tip: 'Aquatic vertebrate. Gills, scales, fins. Cold-blooded.' },
          { id: 'amphibians', label: '🐸 Amphibians',             color: '#f59e0b', tip: 'Moist permeable skin. Lay eggs in water. Larval water → adult land.' },
          { id: 'reptiles',   label: '🐢 Reptiles',                color: '#dc2626', tip: 'Dry scaly skin. Amniotic eggs (or live birth). Cold-blooded.' },
          { id: 'birds',      label: '🐦 Birds',                   color: '#ec4899', tip: 'Feathers (modified scales). Warm-blooded. Lay hard-shelled eggs.' },
          { id: 'mammals',    label: '🫎 Mammals',                 color: '#a16207', tip: 'Hair/fur. Mammary glands. Warm-blooded. Mostly live birth.' }
        ];

        var assignmentsState = useState({}), assignments = assignmentsState[0], setAssignments = assignmentsState[1];
        var checkedState = useState(false), checked = checkedState[0], setChecked = checkedState[1];
        var showHintsState = useState(false), showHints = showHintsState[0], setShowHints = showHintsState[1];
        var modeState = useState('morphological'), mode = modeState[0], setModeId = modeState[1];

        var assign = function(orgId, cladeId) {
          var next = Object.assign({}, assignments);
          next[orgId] = cladeId;
          setAssignments(next);
          if (checked) setChecked(false); // re-grade when changed after submission
        };

        var resetAll = function() {
          setAssignments({});
          setChecked(false);
        };

        var runCheck = function() {
          setChecked(true);
          var correct = ORGANISMS.filter(function(o) { return assignments[o.id] === o.truth; }).length;
          announce('Cladogram graded. ' + correct + ' of ' + ORGANISMS.length + ' organisms placed correctly.');
        };

        var allAssigned = ORGANISMS.every(function(o) { return assignments[o.id]; });
        var correctCount = checked ? ORGANISMS.filter(function(o) { return assignments[o.id] === o.truth; }).length : 0;
        var pctCorrect = checked ? Math.round((correctCount / ORGANISMS.length) * 100) : 0;

        // Render the actual cladogram (revealed after grading) — a simple
        // text-tree showing the canonical relationships.
        var renderCladogram = function() {
          return h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-4 font-mono text-sm' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-violet-800 mb-3 font-sans' }, '🌳 Actual Cladogram'),
            h('pre', { className: 'text-slate-800 leading-tight whitespace-pre overflow-x-auto' },
              'Life on Earth\n' +
              '  │\n' +
              '  ├── 🌳 Plants — Red Maple\n' +
              '  │\n' +
              '  └── Animals\n' +
              '        │\n' +
              '        ├── 🦞 Arthropods — Honeybee, Crab, Lobster\n' +
              '        │      (lobster + crab = closer than either to bee)\n' +
              '        │\n' +
              '        └── Vertebrates (have a backbone)\n' +
              '              │\n' +
              '              ├── 🐟 Fish — Atlantic Salmon\n' +
              '              │\n' +
              '              └── Tetrapods (4 limbs)\n' +
              '                    │\n' +
              '                    ├── 🐸 Amphibians — Bullfrog\n' +
              '                    │\n' +
              '                    └── Amniotes (amniotic eggs)\n' +
              '                          │\n' +
              '                          ├── 🐢 Reptiles — Box Turtle, Garter Snake\n' +
              '                          │\n' +
              '                          ├── 🐦 Birds — Cardinal\n' +
              '                          │      (birds ARE reptiles, descended from\n' +
              '                          │       theropod dinosaurs — feathers were\n' +
              '                          │       a reptilian innovation)\n' +
              '                          │\n' +
              '                          └── 🫎 Mammals — Moose, Deer, Black Bear'
            )
          );
        };

        // Surprise notes — reveal counter-intuitive corrections after grading.
        var SURPRISES = {
          lobster: 'Lobster is an ARTHROPOD, not a fish. It shares an exoskeleton and segmented body with insects. Salmon is a vertebrate fish; lobster\'s closest relatives are crabs (and somewhat distantly, bees).',
          crab: 'Crab is an arthropod (crustacean), like lobster. Crab + lobster share a more recent common ancestor than either does with insects.',
          bee: 'Honeybee is an ARTHROPOD (insect). Same major group as crab and lobster — exoskeleton + jointed legs.',
          frog: 'Frog is an AMPHIBIAN, not a reptile. Amphibians have moist permeable skin and lay jelly-coated eggs in water. Reptiles have dry scaly skin and lay eggs on land.',
          turtle: 'Turtle is a REPTILE. Despite living in water, it has scales, is cold-blooded, and lays amniotic eggs.',
          cardinal: 'Cardinal is a BIRD — but birds are technically descended from theropod dinosaurs, so birds ARE reptiles in cladistic terms. We split them off as a separate group because feathers are such a distinctive feature.'
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🌳', title: 'Phylogenetic Tree Builder' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🌳'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'Build the tree of life'),
                  h('p', { className: 'text-sm text-violet-50 mt-1' }, 'Each organism belongs to one of seven major clades. Use the dropdown to assign each one. The tool grades your placements against the canonical cladogram. Watch out — some organisms look like they\'d group with one clade but their evolutionary history says otherwise.')
                )
              )
            ),
            // Status row
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h(StatCard, { label: 'Assigned', value: Object.keys(assignments).length + ' / ' + ORGANISMS.length, color: 'text-violet-700' }),
              h(StatCard, { label: 'Correct', value: checked ? correctCount + ' / ' + ORGANISMS.length : '—', color: checked ? (pctCorrect >= 80 ? 'text-emerald-700' : pctCorrect >= 60 ? 'text-amber-700' : 'text-rose-700') : 'text-slate-600' }),
              h(StatCard, { label: 'Score', value: checked ? pctCorrect + '%' : '—', color: checked ? (pctCorrect >= 80 ? 'text-emerald-700' : pctCorrect >= 60 ? 'text-amber-700' : 'text-rose-700') : 'text-slate-600' })
            ),
            // Clade reference
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'The 7 Clades'),
                h('button', {
                  onClick: function() { setShowHints(!showHints); },
                  'aria-pressed': showHints,
                  className: 'text-xs font-bold px-3 py-1 rounded-full ' + (showHints ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                }, showHints ? '✓ Hints ON' : '💡 Show Trait Hints')
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2' },
                CLADES.map(function(c) {
                  return h('div', { key: c.id, className: 'p-2 rounded-lg text-xs', style: { backgroundColor: c.color + '22', borderLeft: '3px solid ' + c.color } },
                    h('div', { className: 'font-bold text-slate-800' }, c.label),
                    showHints && h('div', { className: 'text-[10px] text-slate-600 mt-1' }, c.tip)
                  );
                })
              )
            ),
            // Organism placement grid
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-3' }, '12 Organisms — Pick Each One\'s Clade'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                ORGANISMS.map(function(o) {
                  var assigned = assignments[o.id];
                  var isCorrect = checked && assigned === o.truth;
                  var isWrong = checked && assigned && assigned !== o.truth;
                  var bg = isCorrect ? 'bg-emerald-50 border-emerald-400' : isWrong ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-200';
                  return h('div', { key: o.id, className: 'p-3 rounded-lg border-2 transition-colors ' + bg },
                    h('div', { className: 'flex items-center gap-3' },
                      h('span', { className: 'text-3xl' }, o.icon),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'font-bold text-slate-800' }, o.name),
                        h('div', { className: 'text-[10px] text-slate-600 italic' }, o.note)
                      ),
                      checked && (isCorrect ? h('span', { className: 'text-2xl', 'aria-label': 'Correct' }, '✓') : isWrong ? h('span', { className: 'text-2xl', 'aria-label': 'Incorrect' }, '✗') : null)
                    ),
                    h('select', {
                      value: assigned || '',
                      onChange: function(e) { assign(o.id, e.target.value); },
                      'aria-label': 'Assign clade for ' + o.name,
                      className: 'mt-2 w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400'
                    },
                      h('option', { value: '' }, '— Select clade —'),
                      CLADES.map(function(c) { return h('option', { key: c.id, value: c.id }, c.label); })
                    ),
                    isWrong && SURPRISES[o.id] && h('div', { className: 'mt-2 p-2 bg-rose-100 border border-rose-300 rounded text-[11px] text-rose-900' },
                      h('strong', null, '💡 Why: '), SURPRISES[o.id]
                    )
                  );
                })
              )
            ),
            // Action buttons
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: runCheck,
                disabled: !allAssigned,
                className: 'px-6 py-3 rounded-xl font-bold shadow-lg transition-colors ' + (allAssigned ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-300 text-slate-700 cursor-not-allowed')
              }, allAssigned ? '✓ Grade My Tree' : '⏳ Assign all 12 first'),
              checked && h('button', {
                onClick: resetAll,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Try Again')
            ),
            // Cladogram (revealed after grading)
            checked && renderCladogram(),
            // Educational reference
            h('div', { className: 'bg-violet-50 border border-violet-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-violet-800 mb-2' }, '📖 Tree-thinking, the cladogram way'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Synapomorphies are everything: '), 'Modern phylogenetics groups species by SHARED DERIVED traits (synapomorphies), not by overall similarity. A whale and a fish both swim, but the whale\'s lungs, hair, and mammary glands tell us it\'s a mammal that returned to the water — its closest cousins are hippos, not herring.'),
                h('p', null, h('strong', null, 'Why lobster ≠ fish: '), 'Lobsters live in water and have a tail-like abdomen, but they have an exoskeleton, jointed legs, and lack a vertebral column. Their closest relatives are CRABS, then more distantly INSECTS — both arthropods. Salmon (a true fish) shares a vertebral column with you, not with the lobster.'),
                h('p', null, h('strong', null, 'Why birds are reptiles: '), 'Cladistic logic says a clade includes ALL descendants of an ancestor. Birds descended from theropod dinosaurs — and dinosaurs were reptiles — so technically birds belong inside the reptile clade. We split them out for convenience because feathers are so distinctive.'),
                h('p', null, h('strong', null, 'Tree-thinking matters because: '), 'Folk taxonomy groups things by appearance ("looks like a fish"). Cladistics groups by ancestry. The two often disagree, and the latter is what evolution explains.')
              )
            ),
            // Glossary — collapsed by default, expandable on click. Lets students
            // look up jargon without leaving the lab. Native <details> = keyboard-
            // and screen-reader-accessible by default.
            h('details', { className: 'evolab-glossary bg-white border border-slate-300 rounded-xl p-4' },
              h('summary', { className: 'cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-violet-700' }, '📚 Glossary — click to expand'),
              h('dl', { className: 'mt-3 space-y-3 text-sm' },
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Clade'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'A group of organisms that includes a common ancestor AND all of its descendants. Mammals form a clade; "fish" usually does not (because tetrapods descended from fish but most people don\'t consider whales fish).')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Synapomorphy'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'A trait shared by all members of a clade because they inherited it from their common ancestor — but NOT found in organisms outside the clade. Mammary glands are a synapomorphy of mammals; feathers are a synapomorphy of birds.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Homologous structures'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'Body parts that share a common evolutionary origin even if they look different — like the human arm, bat wing, and whale flipper. Same blueprint, modified for different uses.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Analogous structures'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'Body parts that LOOK similar and do similar jobs but evolved INDEPENDENTLY — like a bird wing and a butterfly wing. Convergent evolution, NOT shared ancestry.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Vertebrate'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'An animal with a backbone (vertebral column). Includes fish, amphibians, reptiles, birds, and mammals.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Tetrapod'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'A vertebrate with four limbs (or whose ancestors had four limbs — whales and snakes count even though they\'ve lost theirs). Includes amphibians, reptiles, birds, and mammals.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Amniote / amniotic egg'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'A vertebrate that lays eggs with internal membranes (amnion, chorion, allantois) — or whose ancestors did. The amniotic egg let vertebrates fully colonize land. Reptiles, birds, and mammals are all amniotes.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Arthropod'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'An animal with a jointed exoskeleton and segmented body. Includes insects, crustaceans (lobster, crab, shrimp), arachnids (spiders), and myriapods (centipedes). Most numerous animal phylum on Earth.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Cladogram'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'A branching diagram showing inferred evolutionary relationships among organisms. Each split (node) represents a common ancestor; each tip is a present-day species.')
                ),
                h('div', null,
                  h('dt', { className: 'font-bold text-slate-800' }, 'Common ancestor'),
                  h('dd', { className: 'text-slate-700 ml-4' }, 'An organism (or population) from which two or more later lineages descended. Humans and chimps share a common ancestor that lived ~6 million years ago — that ancestor was neither a human nor a chimp, but a third thing that gave rise to both.')
                )
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-yellow-50 border border-yellow-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🦴'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'The cladogram is a tree built from shared traits. Common Ancestry Viewer shows you the most striking shared trait of all — the same five-bone forelimb skeleton in human, bat, whale, horse, and bird.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-1', 'MS-LS4-1', 'MS-LS4-2', 'HS-LS4-2'],
              questions: [
                'Lobsters live in water and have a tail-like abdomen. Why aren\'t they grouped with fish?',
                'A whale and a hippo share a more recent common ancestor than a whale and a fish. What features support this — and what features make it surprising?',
                'How would the tree change if we used DNA sequence evidence vs morphology? When do they DISAGREE in real biology?',
                'Why is "fish" technically not a clade? (Hint: tetrapods are descended from fish.)'
              ],
              misconceptions: [
                '"The cladogram shows a main line of evolution." It doesn\'t — every branch is its own equally-evolved lineage. There\'s no "main line" toward humans or any other species.',
                '"Closely related species look similar." Often true, but not always. Hummingbirds and swifts look similar but are not each other\'s closest relatives. Whales look like fish but aren\'t.',
                '"Older species are simpler / less evolved." Bacteria have been evolving for ~3.8 billion years, same as humans. Both are equally "evolved."'
              ],
              extension: 'Pick 5 organisms you\'re personally interested in (pets, dinner, etc.) and try to construct their cladogram. Use a free tool like OneZoom (onezoom.org) to verify.'
            })
          )
        );
      }
      // ─────────────────────────────────────────────────────
      // COMMON ANCESTRY VIEWER
      // ─────────────────────────────────────────────────────
      // Five tetrapod forelimbs side-by-side: human arm, bat wing, whale
      // flipper, horse leg, bird wing. Same five bone groups (humerus,
      // radius, ulna, carpals, metacarpals, phalanges). Click any bone to
      // highlight the homologous bone across all species — proving the
      // structures share a common ancestor despite radically different uses.
      function CommonAncestry() {
        var BONES = [
          { id: 'humerus', label: 'Humerus', color: '#dc2626' },
          { id: 'radius', label: 'Radius', color: '#f59e0b' },
          { id: 'ulna', label: 'Ulna', color: '#10b981' },
          { id: 'carpals', label: 'Carpals (wrist)', color: '#06b6d4' },
          { id: 'metacarpals', label: 'Metacarpals (palm)', color: '#7c3aed' },
          { id: 'phalanges', label: 'Phalanges (fingers/toes)', color: '#ec4899' }
        ];
        var SELECTED_DEFAULT = 'humerus';
        var selState = useState(SELECTED_DEFAULT), selected = selState[0], setSelected = selState[1];

        // Bone-by-bone modification descriptions per species.
        var MODIFICATIONS = {
          humerus: {
            human:  'Long, sturdy. Anchors the deltoid for lifting and rotating.',
            bat:    'Short and stout — flight requires light, strong upper bones.',
            whale:  'Short, wide, and embedded inside the body. Connects to the rest of the flipper.',
            horse:  'Long and angled forward. Muscles attach here to power the gallop.',
            bird:   'Short and lightweight, with internal honeycomb structure to save weight.'
          },
          radius: {
            human:  'Pairs with ulna for forearm rotation (palm up / palm down).',
            bat:    'Elongated — provides the leading edge of the wing.',
            whale:  'Short and flattened, fused into a flipper-stiffening platform.',
            horse:  'Fused with ulna into a single rigid bone — no rotation, just a strong support strut.',
            bird:   'Slender and long — forms part of the wing\'s leading edge.'
          },
          ulna: {
            human:  'Forms the elbow point. Pairs with radius for forearm rotation.',
            bat:    'Reduced and partially fused with radius — wing structure doesn\'t need rotation.',
            whale:  'Greatly reduced and embedded — vestigial in the flipper.',
            horse:  'Mostly reduced; fused into the radius. Only the elbow remnant remains.',
            bird:   'Larger than radius (opposite of mammals). Anchors the secondary flight feathers.'
          },
          carpals: {
            human:  'Eight small bones forming the flexible wrist.',
            bat:    'Reduced; some fused. The wing folds at this joint.',
            whale:  'Several reduced and rounded — locked rigid for paddling.',
            horse:  'Forms the "knee" (which is anatomically a wrist). Locked for support.',
            bird:   'Reduced and partially fused into the carpometacarpus (wing structure).'
          },
          metacarpals: {
            human:  'Five long bones — the body of the palm.',
            bat:    'EXTREMELY long — the structural ribs of the wing membrane.',
            whale:  'Short, flat, and packed close — provide the flipper\'s stiffness.',
            horse:  'Reduced to ONE prominent bone (the cannon). The other four shrunk to splints.',
            bird:   'Fused into a single carpometacarpus bone supporting the primaries.'
          },
          phalanges: {
            human:  'Three per finger, two for the thumb. Highly mobile.',
            bat:    'Hugely elongated finger bones support the wing membrane between them.',
            whale:  'Many small, rounded bones make up the flipper "fingers" — embedded inside the flesh.',
            horse:  'Reduced to ONE toe (the hoof). The other digits vanished or became splint bones.',
            bird:   'Reduced — only 2-3 finger bones, fused, anchoring the primary flight feathers.'
          }
        };

        // Each species is rendered as an SVG group. To keep this maintainable,
        // we use simple polygons / paths colored by bone group. When a bone
        // group is selected, all bones of that group glow.
        var glow = function(boneId) {
          return selected === boneId ? { strokeWidth: 4, stroke: '#fbbf24', fillOpacity: 1 } : { strokeWidth: 1.5, stroke: '#1e293b', fillOpacity: 0.85 };
        };
        var fillFor = function(boneId) {
          var b = BONES.find(function(b) { return b.id === boneId; });
          return b ? b.color : '#999';
        };
        var bonePath = function(d, boneId, cls) {
          var g = glow(boneId);
          return h('path', Object.assign({
            d: d,
            fill: fillFor(boneId),
            stroke: g.stroke,
            strokeWidth: g.strokeWidth,
            opacity: g.fillOpacity,
            onClick: function() { setSelected(boneId); },
            style: { cursor: 'pointer' },
            'aria-label': ((BONES.find(function(b) { return b.id === boneId; }) || {}).label || 'bone') + ' on ' + cls,
            tabIndex: 0,
            onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(boneId); } }
          }), null);
        };

        // Species panels — each one a small SVG showing the limb skeleton.
        // Coordinates are tuned to fit a 200x200 viewBox per species.
        var renderSpecies = function(name, label, useDesc, content) {
          return h('div', {
            className: 'bg-white rounded-xl shadow border border-slate-300 p-3 flex flex-col items-center'
          },
            h('h3', { className: 'text-sm font-bold text-slate-800' }, label),
            h('div', { className: 'text-[10px] text-slate-600 mb-1' }, useDesc),
            h('svg', {
              viewBox: '0 0 200 200',
              className: 'w-full max-w-[180px] h-44',
              role: 'img',
              'aria-label': label + ' forelimb skeleton. Click any bone to highlight it across all species.'
            }, content)
          );
        };

        var humanArm = renderSpecies('human', 'Human Arm', 'Lifting & manipulation',
          // Humerus (top)
          [bonePath('M 95 30 L 105 30 L 108 90 L 92 90 Z', 'humerus', 'human'),
           // Radius + ulna (forearm)
           bonePath('M 92 95 L 90 150 L 85 150 L 87 95 Z', 'radius', 'human'),
           bonePath('M 108 95 L 110 150 L 115 150 L 113 95 Z', 'ulna', 'human'),
           // Carpals (wrist)
           bonePath('M 85 152 L 115 152 L 113 162 L 87 162 Z', 'carpals', 'human'),
           // Metacarpals
           bonePath('M 90 165 L 96 185 L 92 185 L 88 165 Z', 'metacarpals', 'human'),
           bonePath('M 95 165 L 100 185 L 96 185 L 93 165 Z', 'metacarpals', 'human'),
           bonePath('M 100 165 L 104 185 L 100 185 L 98 165 Z', 'metacarpals', 'human'),
           bonePath('M 105 165 L 108 185 L 104 185 L 103 165 Z', 'metacarpals', 'human'),
           bonePath('M 110 165 L 112 185 L 108 185 L 108 165 Z', 'metacarpals', 'human'),
           // Phalanges (fingers)
           bonePath('M 91 187 L 95 195 L 91 195 L 89 187 Z', 'phalanges', 'human'),
           bonePath('M 96 187 L 100 195 L 96 195 L 94 187 Z', 'phalanges', 'human'),
           bonePath('M 101 187 L 104 195 L 100 195 L 99 187 Z', 'phalanges', 'human'),
           bonePath('M 106 187 L 109 195 L 105 195 L 104 187 Z', 'phalanges', 'human'),
           bonePath('M 111 187 L 113 195 L 109 195 L 109 187 Z', 'phalanges', 'human')]
        );

        var batWing = renderSpecies('bat', 'Bat Wing', 'Flight',
          [// Wing membrane outline (visual context)
           h('path', { d: 'M 100 30 L 30 130 L 60 195 L 180 180 L 165 100 Z', fill: 'rgba(180,180,200,0.18)', stroke: 'none' }),
           // Humerus (short)
           bonePath('M 95 30 L 105 30 L 108 70 L 92 70 Z', 'humerus', 'bat'),
           // Radius + ulna
           bonePath('M 92 75 L 78 130 L 73 128 L 88 75 Z', 'radius', 'bat'),
           bonePath('M 108 75 L 95 128 L 91 125 L 105 73 Z', 'ulna', 'bat'),
           // Carpals — small block at the wrist bend
           bonePath('M 75 130 L 92 130 L 90 138 L 77 138 Z', 'carpals', 'bat'),
           // Metacarpals — extremely long, radiating to wing tips
           bonePath('M 80 138 L 35 130 L 38 134 L 82 142 Z', 'metacarpals', 'bat'),
           bonePath('M 85 140 L 60 195 L 64 196 L 88 144 Z', 'metacarpals', 'bat'),
           bonePath('M 90 140 L 130 195 L 134 192 L 94 144 Z', 'metacarpals', 'bat'),
           bonePath('M 92 138 L 165 175 L 168 170 L 96 134 Z', 'metacarpals', 'bat'),
           // Phalanges — at the tip of each metacarpal
           bonePath('M 33 130 L 25 128 L 25 124 L 33 126 Z', 'phalanges', 'bat'),
           bonePath('M 60 195 L 56 198 L 53 195 L 58 192 Z', 'phalanges', 'bat'),
           bonePath('M 130 195 L 138 198 L 138 192 L 132 192 Z', 'phalanges', 'bat'),
           bonePath('M 165 175 L 175 175 L 175 170 L 165 170 Z', 'phalanges', 'bat')]
        );

        var whaleFlipper = renderSpecies('whale', 'Whale Flipper', 'Swimming',
          [// Flipper outline
           h('path', { d: 'M 90 25 Q 70 110 80 195 Q 105 200 130 195 Q 140 110 110 25 Z', fill: 'rgba(120,140,160,0.25)', stroke: '#475569', strokeWidth: 1 }),
           // Humerus (short, embedded)
           bonePath('M 96 35 L 104 35 L 105 65 L 95 65 Z', 'humerus', 'whale'),
           // Radius + ulna (short, flattened)
           bonePath('M 95 70 L 96 105 L 90 105 L 91 70 Z', 'radius', 'whale'),
           bonePath('M 105 70 L 108 105 L 102 105 L 102 70 Z', 'ulna', 'whale'),
           // Carpals — multiple rounded blocks
           bonePath('M 88 108 L 100 108 L 99 116 L 89 116 Z', 'carpals', 'whale'),
           bonePath('M 100 108 L 112 108 L 111 116 L 100 116 Z', 'carpals', 'whale'),
           // Metacarpals — short flat bones
           bonePath('M 88 118 L 90 134 L 86 134 L 85 118 Z', 'metacarpals', 'whale'),
           bonePath('M 94 118 L 96 134 L 92 134 L 91 118 Z', 'metacarpals', 'whale'),
           bonePath('M 100 118 L 102 134 L 98 134 L 97 118 Z', 'metacarpals', 'whale'),
           bonePath('M 106 118 L 108 134 L 104 134 L 103 118 Z', 'metacarpals', 'whale'),
           bonePath('M 112 118 L 114 134 L 110 134 L 109 118 Z', 'metacarpals', 'whale'),
           // Phalanges — many small rounded bones in each digit
           bonePath('M 86 137 L 88 148 L 84 148 L 83 137 Z', 'phalanges', 'whale'),
           bonePath('M 86 150 L 88 161 L 84 161 L 83 150 Z', 'phalanges', 'whale'),
           bonePath('M 92 137 L 94 148 L 90 148 L 89 137 Z', 'phalanges', 'whale'),
           bonePath('M 92 150 L 94 161 L 90 161 L 89 150 Z', 'phalanges', 'whale'),
           bonePath('M 98 137 L 100 150 L 96 150 L 95 137 Z', 'phalanges', 'whale'),
           bonePath('M 98 152 L 100 165 L 96 165 L 95 152 Z', 'phalanges', 'whale'),
           bonePath('M 104 137 L 106 148 L 102 148 L 101 137 Z', 'phalanges', 'whale'),
           bonePath('M 110 137 L 112 145 L 108 145 L 107 137 Z', 'phalanges', 'whale')]
        );

        var horseLeg = renderSpecies('horse', 'Horse Foreleg', 'Galloping (one toe!)',
          [// Humerus
           bonePath('M 95 25 L 105 25 L 110 70 L 90 70 Z', 'humerus', 'horse'),
           // Radius (fused with ulna in horse — shown as one bone)
           bonePath('M 90 73 L 92 130 L 84 130 L 86 73 Z', 'radius', 'horse'),
           bonePath('M 110 73 L 116 130 L 108 130 L 108 73 Z', 'ulna', 'horse'),
           // Carpals (the "knee")
           bonePath('M 86 132 L 116 132 L 113 144 L 89 144 Z', 'carpals', 'horse'),
           // Metacarpals — single dominant bone (the cannon)
           bonePath('M 95 146 L 105 146 L 104 175 L 96 175 Z', 'metacarpals', 'horse'),
           // Phalanges — three bones forming the toe; final one is the hoof
           bonePath('M 96 178 L 104 178 L 103 188 L 97 188 Z', 'phalanges', 'horse'),
           // Hoof (visual indication)
           h('path', { d: 'M 92 188 L 108 188 L 110 196 L 90 196 Z', fill: '#1e293b', stroke: '#1e293b' })]
        );

        var birdWing = renderSpecies('bird', 'Bird Wing', 'Flight',
          [// Wing outline (feathers context)
           h('path', { d: 'M 100 25 L 50 60 L 30 145 L 80 195 L 130 180 L 160 90 Z', fill: 'rgba(220,200,170,0.25)', stroke: 'none' }),
           // Humerus (short, light)
           bonePath('M 95 28 L 105 28 L 100 75 L 92 70 Z', 'humerus', 'bird'),
           // Radius
           bonePath('M 92 78 L 70 130 L 65 128 L 88 78 Z', 'radius', 'bird'),
           // Ulna (larger than radius in birds — anchors secondaries)
           bonePath('M 105 75 L 85 130 L 78 128 L 100 73 Z', 'ulna', 'bird'),
           // Carpals (reduced/fused)
           bonePath('M 65 132 L 85 132 L 82 138 L 67 138 Z', 'carpals', 'bird'),
           // Metacarpals (carpometacarpus — fused into one)
           bonePath('M 70 140 L 50 180 L 45 178 L 65 138 Z', 'metacarpals', 'bird'),
           // Phalanges — reduced "thumb" + "finger" + tip
           bonePath('M 50 180 L 45 195 L 40 192 L 46 178 Z', 'phalanges', 'bird'),
           bonePath('M 75 130 L 70 140 L 67 138 L 73 128 Z', 'phalanges', 'bird')]
        );

        // Side panel: explain the selected bone in each species.
        var renderSidePanel = function() {
          var b = BONES.find(function(x) { return x.id === selected; });
          var mods = MODIFICATIONS[selected] || {};
          return h('div', { className: 'bg-white rounded-xl shadow border-2 p-4', style: { borderColor: b ? b.color : '#94a3b8' } },
            h('div', { className: 'flex items-center gap-3 mb-3' },
              h('div', { className: 'w-12 h-12 rounded-lg flex items-center justify-center text-2xl', style: { backgroundColor: b ? b.color + '33' : '#f1f5f9', color: b ? b.color : '#475569' } }, '🦴'),
              h('div', null,
                h('h3', { className: 'text-lg font-black text-slate-800' }, b ? b.label : 'Select a bone'),
                h('p', { className: 'text-xs text-slate-600' }, 'How this bone is modified across species:')
              )
            ),
            h('div', { 'aria-live': 'polite', className: 'space-y-2 text-sm' },
              [['🐵', 'Human', 'human'],
               ['🦇', 'Bat', 'bat'],
               ['🐋', 'Whale', 'whale'],
               ['🐎', 'Horse', 'horse'],
               ['🦅', 'Bird', 'bird']].map(function(row) {
                return h('div', { key: row[2], className: 'flex items-start gap-2 p-2 rounded bg-slate-50' },
                  h('span', { className: 'text-xl' }, row[0]),
                  h('div', { className: 'flex-1' },
                    h('strong', { className: 'text-slate-800' }, row[1] + ': '),
                    h('span', { className: 'text-slate-700' }, mods[row[2]] || '—')
                  )
                );
              })
            )
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🦴', title: 'Common Ancestry Viewer' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-yellow-500 to-amber-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🦴'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'Same blueprint, different jobs'),
                  h('p', { className: 'text-sm text-amber-50 mt-1' }, 'Five tetrapod forelimbs. Look closely — every one has a humerus, radius, ulna, carpals, metacarpals, and phalanges. Same bones, dramatically modified to fly, swim, gallop, or grasp. Click any bone to see its homologous match in all species.')
                )
              )
            ),
            // Bone-selector chip row
            h('div', { className: 'flex flex-wrap gap-2 justify-center' },
              BONES.map(function(b) {
                var isSel = selected === b.id;
                return h('button', {
                  key: b.id,
                  onClick: function() { setSelected(b.id); },
                  'aria-pressed': isSel,
                  className: 'px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ' + (isSel ? 'text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'),
                  style: isSel ? { backgroundColor: b.color, borderColor: b.color } : { borderColor: b.color }
                }, b.label);
              })
            ),
            // Skeletons grid (5 cards)
            h('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3' },
              humanArm, batWing, whaleFlipper, horseLeg, birdWing
            ),
            // Side panel: bone modifications across species
            renderSidePanel(),
            // Educational reference
            h('div', { className: 'bg-yellow-50 border border-yellow-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-yellow-800 mb-2' }, '📖 Why this is evidence of common descent'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'The argument: '), 'A horse, a whale, a bat, a bird, and a human have completely different lifestyles. If each species had been designed independently, you\'d expect each to have a totally different limb engineered for its job — like a fan blade vs a propeller vs a paddle vs a leg.'),
                h('p', null, h('strong', null, 'What we observe: '), 'Instead, they all have the SAME skeletal blueprint, just heavily modified. The only natural explanation is that they all inherited that blueprint from a common ancestor — and modification by descent reshaped it for each lineage.'),
                h('p', null, h('strong', null, 'Homologous vs analogous: '), 'These are HOMOLOGOUS structures (same origin, different function). A bird wing and a butterfly wing are ANALOGOUS (same function, totally different origins) — the butterfly wing has no humerus or phalanges. Homology is the key signature of common descent.'),
                h('p', null, h('strong', null, 'Vestigial bonus: '), 'The horse\'s ulna and the whale\'s ulna are both vestigial (greatly reduced) — fossils of the ancestor still visible in the descendant\'s skeleton.')
              )
            ),
            // Try-this prompts — directed-discovery exercises rather than experiments,
            // since this module is exploration rather than simulation.
            h('div', { className: 'bg-white border-2 border-yellow-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-yellow-800 mb-3' }, '🔍 Try these comparisons'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Find the 5-bone pattern: '), 'Click each of the 6 bone chips in turn (humerus, radius, ulna, carpals, metacarpals, phalanges). Notice that ALL five species have ALL six bone groups — even the bird and the whale.'),
                h('li', null, h('strong', null, 'Spot the disappearing bone: '), 'Click "Ulna." In the horse it\'s tiny — fused into the radius. In the whale it\'s also reduced. Why? Both don\'t need a separate forearm-rotation bone; the radius alone is enough.'),
                h('li', null, h('strong', null, 'Spot the runaway bone: '), 'Click "Metacarpals." In humans they\'re modest palm bones. In bats they\'re INSANELY long — the structural ribs of the wing membrane. In horses, four of five vanished and the remaining one became the cannon bone.'),
                h('li', null, h('strong', null, 'Find the "one toe" lineage: '), 'Click "Phalanges." Compare horse vs human. Horses reduced from 5 toes to 1 (the hoof). The other 4 are vestigial splint bones. This took ~50 million years.'),
                h('li', null, h('strong', null, 'Spot the embedded skeleton: '), 'Click any bone — notice the whale flipper has the WHOLE arm hidden inside it. The flipper is anatomically still an arm with hand bones; it just got shorter, flatter, and wrapped in soft tissue.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '❓'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'Common descent is one of the most-misunderstood ideas in biology. The Misconceptions Quiz tackles "humans from monkeys," the "just a theory" trap, and 10 other common errors.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-1', 'MS-LS4-2', 'HS-LS4-2'],
              questions: [
                'Why are homologous structures considered evidence of common descent, while analogous structures (bird wing vs butterfly wing) are not?',
                'A horse\'s ulna is greatly reduced (vestigial). What does this say about its ancestor\'s anatomy?',
                'A whale flipper has finger bones inside it. Why would natural selection retain those bones if they\'re not used for grasping?',
                'What human body features are vestigial? (Examples: tailbone, wisdom teeth, ear muscles, plantaris muscle.)'
              ],
              misconceptions: [
                '"Homologous = looks similar." Not exactly — homologous structures share an evolutionary ORIGIN. They may look very different (human arm vs whale flipper) but trace back to the same ancestral structure.',
                '"Vestigial = useless." Some vestigial structures retain reduced function (the human appendix has minor immune roles). The key is that they\'re reduced from a more functional ancestral form.'
              ],
              extension: 'Find 3 vestigial structures in your own body. Research what each one was used for in our ancestors and when it became reduced.'
            })
          )
        );
      }
      // ─────────────────────────────────────────────────────
      // EVOLUTION MISCONCEPTIONS QUIZ
      // ─────────────────────────────────────────────────────
      // 12 multiple-choice questions targeting the most common evolution
      // misunderstandings. Each has a tempting wrong answer alongside the
      // correct one, plus a detailed evidence-based explanation that runs
      // even on correct answers (so students with right intuitions still
      // learn the underlying reasoning).
      function MisconceptionsQuiz() {
        var QUESTIONS = [
          {
            q: '"Evolution is just a theory" — what does \'theory\' mean in science?',
            choices: [
              { id: 'a', label: 'A guess that hasn\'t been proven yet' },
              { id: 'b', label: 'A well-tested explanation supported by extensive evidence', correct: true },
              { id: 'c', label: 'Something less reliable than a "law"' },
              { id: 'd', label: 'A belief that hasn\'t been observed' }
            ],
            explain: 'In science, a "theory" is a comprehensive explanation supported by mountains of evidence — not a guess. Examples: germ theory of disease, atomic theory, plate tectonics, gravitational theory. The theory of evolution is in the same category. The colloquial "I have a theory" (meaning "guess") is a different word entirely. Calling evolution "just a theory" is like saying gravity is "just a theory" — technically correct in the casual sense, but missing what scientific theories actually are.'
          },
          {
            q: 'Did humans evolve from monkeys?',
            choices: [
              { id: 'a', label: 'Yes, modern monkeys are our direct ancestors' },
              { id: 'b', label: 'No, humans and modern monkeys share a common ancestor that lived ~25-30 million years ago', correct: true },
              { id: 'c', label: 'No, humans evolved separately from any other primate' },
              { id: 'd', label: 'Only some humans evolved from monkeys' }
            ],
            explain: 'Humans did NOT evolve from any modern monkey species — modern monkeys are our cousins, not our ancestors. Humans, chimpanzees, gorillas, orangutans, and gibbons share a common ancestor with Old World monkeys roughly 25-30 million years ago. That ancestor was neither a "monkey" nor a "human" — it was a primate that gave rise to multiple lineages. Calling someone\'s ancestor a monkey is like calling your great-great-grandmother your sister.'
          },
          {
            q: 'Does evolution have a goal or direction?',
            choices: [
              { id: 'a', label: 'Yes — life is constantly improving toward greater complexity' },
              { id: 'b', label: 'Yes — every species is moving toward an "ideal" form' },
              { id: 'c', label: 'No — evolution is directionless; it just optimizes for survival in current conditions', correct: true },
              { id: 'd', label: 'Only intelligent species have evolutionary direction' }
            ],
            explain: 'Evolution has NO goal. It does not aim for complexity, intelligence, or any particular outcome. It just changes populations to fit current local conditions. Lots of evolution is "regressive" — cave fish lose their eyes; whales lost their hind legs; humans lost most of our body hair and our ability to make vitamin C. None of those are "improvements" in any objective sense; they\'re just trade-offs that fit the environment. The phrase "more evolved" is misleading — every living species is equally "evolved" because every species has been evolving for the same 3.8 billion years.'
          },
          {
            q: '"Survival of the fittest" — what does fitness actually mean in evolution?',
            choices: [
              { id: 'a', label: 'The strongest individual wins' },
              { id: 'b', label: 'The fastest individual wins' },
              { id: 'c', label: 'The individual that produces the most surviving offspring "wins"', correct: true },
              { id: 'd', label: 'The smartest individual wins' }
            ],
            explain: 'Evolutionary fitness = REPRODUCTIVE SUCCESS, not physical strength, speed, or intelligence. A small bird that successfully raises 8 chicks is "fitter" than a powerful bird that raises 0 chicks. This is why traits like nurturing behavior, communication, and cooperation evolve — they boost reproductive success even when they don\'t boost individual strength. Some of the most "successful" organisms by evolutionary metrics are bacteria and beetles — neither of which are particularly tough or smart.'
          },
          {
            q: 'A weightlifter develops big muscles. Will their children be born with bigger muscles?',
            choices: [
              { id: 'a', label: 'Yes — acquired traits are passed to offspring' },
              { id: 'b', label: 'No — only changes to DNA can be inherited; muscles built in life don\'t change DNA', correct: true },
              { id: 'c', label: 'Sometimes — only if both parents lift weights' },
              { id: 'd', label: 'Yes — but only after many generations of weightlifting' }
            ],
            explain: 'Acquired characteristics — muscles from working out, calluses from labor, scars from injury, tan from sun — are NOT inherited. This idea (called Lamarckism) was a popular pre-Darwin theory but was disproven. The "giraffe stretched its neck reaching for leaves and passed the long neck to its kids" story is wrong. The actual Darwinian explanation: giraffe ancestors had varying neck lengths; longer-necked ones reached more food and had more offspring; over many generations the average neck length increased. Bodies don\'t teach DNA new tricks. (Tiny epigenetic exceptions exist but they don\'t accumulate over generations.)'
          },
          {
            q: '"If humans evolved from earlier apes, why are there still apes today?"',
            choices: [
              { id: 'a', label: 'Modern apes are old human ancestors who somehow survived' },
              { id: 'b', label: 'Evolution is wrong — we\'d expect the ancestors to be gone' },
              { id: 'c', label: 'Lineages branch — when one population evolves into something new, the original population can persist alongside as a separate species', correct: true },
              { id: 'd', label: 'Modern apes are humans who haven\'t finished evolving yet' }
            ],
            explain: 'When a population splits and one branch evolves into a new species, the OTHER branch can persist unchanged. Imagine an ancestor population that geographically splits — some go to the savanna and become hominins, others stay in the forest and stay forest-apes. There\'s no rule that says the parent species must vanish when it gives rise to a daughter. Today\'s chimps and gorillas aren\'t our ancestors; they\'re our cousins, and they have their own evolutionary histories.'
          },
          {
            q: 'Are mutations always bad?',
            choices: [
              { id: 'a', label: 'Yes — mutations always damage the organism' },
              { id: 'b', label: 'No — most mutations are neutral; some are harmful; some are beneficial', correct: true },
              { id: 'c', label: 'Mutations only happen in cancer' },
              { id: 'd', label: 'Mutations are always beneficial' }
            ],
            explain: 'Most mutations are NEUTRAL — they happen in non-coding DNA or change a protein to a chemically equivalent one. A smaller number are harmful (the cell\'s repair machinery handles or kills these). A SMALL but crucial number are BENEFICIAL — improved enzyme efficiency, new immune resistance, lactase persistence in adults. Beneficial mutations are rare, but over millions of years they accumulate and drive evolution. The "all mutations are bad" idea ignores that beneficial ones, even if rare, are the raw material of all adaptation.'
          },
          {
            q: 'Does evolution explain how life originally began?',
            choices: [
              { id: 'a', label: 'Yes — evolution covers everything from non-life to humans' },
              { id: 'b', label: 'No — evolution explains how life DIVERSIFIES once it exists; the origin of life itself is a separate field called abiogenesis', correct: true },
              { id: 'c', label: 'Yes — evolution proved life came from non-life' },
              { id: 'd', label: 'No — evolution disproves the origin of life' }
            ],
            explain: 'Evolution by natural selection explains how living populations CHANGE over time and DIVERSIFY into many species. It assumes life already exists. The question of how the FIRST self-replicating molecules arose from non-living chemistry is called abiogenesis or chemical evolution — a separate research area with its own evidence (RNA-world hypothesis, hydrothermal vent chemistry, etc.). Conflating the two is a common error: even if we never solved the origin of life, evolution would still be the correct explanation for the diversity of life we see today.'
          },
          {
            q: 'Is evolution a random process?',
            choices: [
              { id: 'a', label: 'Yes — every aspect of evolution is purely random' },
              { id: 'b', label: 'No — mutations are random, but selection is non-random (it favors traits that boost survival/reproduction)', correct: true },
              { id: 'c', label: 'No — evolution is fully directed by an external force' },
              { id: 'd', label: 'Mutations are non-random but selection is random' }
            ],
            explain: 'Evolution has TWO main forces, with very different randomness. (1) MUTATIONS are random — they happen by chance, regardless of whether they\'d be useful. (2) NATURAL SELECTION is non-random — it consistently favors mutations that boost survival/reproduction in the current environment. Calling evolution "random" is like calling a sieve "random" because some things fall through and others don\'t — but the sieve isn\'t random; it has holes of a specific size that filter consistently. The combination of random variation + non-random selection produces ordered adaptation.'
          },
          {
            q: 'Critics say "macroevolution" (one species becoming another) hasn\'t been observed, only small "microevolution." Is this true?',
            choices: [
              { id: 'a', label: 'True — macroevolution is unproven and impossible' },
              { id: 'b', label: 'False — speciation has been directly observed many times (apple maggot fly, London Underground mosquito, ring species, lab fruit flies, observed sympatric speciation in cichlid fish)', correct: true },
              { id: 'c', label: 'True — but evolution is still real for small changes' },
              { id: 'd', label: 'False — but only on geological timescales' }
            ],
            explain: 'Speciation HAS been directly observed. Examples: the apple maggot fly Rhagoletis pomonella diverging from its hawthorn-eating ancestor in just ~150 years; the London Underground mosquito (Culex molestus) genetically distinct from above-ground populations; experimental Drosophila populations losing the ability to interbreed within decades; ring species like the Ensatina salamander complex; cichlid fish speciation observed in real time. "Macroevolution" is just enough microevolution accumulated over enough generations — it\'s the same process at different timescales. The microevolution / macroevolution distinction is mostly a rhetorical move, not a biological one.'
          },
          {
            q: 'Did giraffes get long necks because they "needed" to reach high leaves?',
            choices: [
              { id: 'a', label: 'Yes — needs drive evolution' },
              { id: 'b', label: 'No — selection happens because individuals with longer necks happened to leave more offspring; no "need" causes mutations to appear', correct: true },
              { id: 'c', label: 'Yes — but only if many giraffes need it at once' },
              { id: 'd', label: 'No — giraffes were created with long necks' }
            ],
            explain: 'Selection is RETROSPECTIVE, not prospective. Mutations happen randomly; they don\'t arise because they\'re needed. The standard giraffe story: ancestral giraffes had varying neck lengths (random variation). When food was scarce up high, longer-necked individuals reached more leaves, survived better, and had more offspring. Over many generations, average neck length grew. The mutations themselves weren\'t triggered by the giraffes "needing" them — they were already in the population before food got scarce. We say things like "evolved a long neck for reaching leaves" as shorthand, but the literal mechanism is descriptive, not goal-driven.'
          },
          {
            q: 'How fast can evolution happen?',
            choices: [
              { id: 'a', label: 'Always extremely slow — millions of years for any change' },
              { id: 'b', label: 'Variable — strong selection can produce visible change in a single generation; weak selection takes thousands or millions of generations', correct: true },
              { id: 'c', label: 'Always extremely fast — within a single lifetime' },
              { id: 'd', label: 'It depends only on the species, not the environment' }
            ],
            explain: 'Evolution can be FAST or SLOW depending on selection strength. The Galápagos finch beak shift in 1977 happened in ONE year. Antibiotic resistance in bacteria evolves in days. Industrial melanism in peppered moths shifted from light-dominated to dark-dominated in ~50 years. On the slow end: deep-sea organisms in stable environments may go millions of years with little change. The popular image of evolution as always slow comes from looking at very ancient fossil lineages — but observed evolution in living populations is often startlingly quick.'
          }
        ];

        var ROUND_COUNT = QUESTIONS.length;
        var idxState = useState(0), idx = idxState[0], setIdx = idxState[1];
        var answersState = useState({}), answers = answersState[0], setAnswers = answersState[1];
        var revealState = useState(false), reveal = revealState[0], setReveal = revealState[1];
        // Review mode: when set, prev/next navigates only the missed questions
        // (a 5-of-12 score becomes a 7-question review pass). Resets when
        // student clicks "Try Again".
        var reviewModeState = useState(false), reviewMode = reviewModeState[0], setReviewMode = reviewModeState[1];

        // Boundary guard against state corruption
        if (idx < 0 || idx >= QUESTIONS.length) {
          var safeIdx = clamp(idx, 0, QUESTIONS.length - 1);
          if (safeIdx !== idx) setIdx(safeIdx);
          return h('div', { className: 'p-6 text-center text-slate-600' }, 'Loading quiz…');
        }

        var q = QUESTIONS[idx];
        var hasAnswered = answers[idx] !== undefined;
        var chosenId = answers[idx];
        var chosenChoice = hasAnswered ? q.choices.find(function(c) { return c.id === chosenId; }) : null;
        var isCorrect = !!(chosenChoice && chosenChoice.correct);

        var pickChoice = function(cid) {
          if (hasAnswered) return;
          var update = {}; update[idx] = cid;
          setAnswers(Object.assign({}, answers, update));
          setReveal(true);
          var picked = q.choices.find(function(c) { return c.id === cid; });
          announce(picked && picked.correct ? 'Correct.' : 'Incorrect — read the explanation.');
        };

        // Compute the navigable index list. In normal mode it's [0..N-1].
        // In review mode it's just the indices the student got wrong, so prev/next
        // only walks through their misses.
        var missedIndices = QUESTIONS.map(function(_, i) { return i; }).filter(function(i) {
          var ci = answers[i];
          var choice = QUESTIONS[i].choices.find(function(c) { return c.id === ci; });
          return !choice || !choice.correct;
        });
        var navIndices = reviewMode ? missedIndices : QUESTIONS.map(function(_, i) { return i; });
        var navPos = navIndices.indexOf(idx);

        var goNext = function() {
          if (navPos < navIndices.length - 1) {
            setIdx(navIndices[navPos + 1]);
            setReveal(false);
          }
        };
        var goPrev = function() {
          if (navPos > 0) {
            setIdx(navIndices[navPos - 1]);
            setReveal(false);
          }
        };
        var startReviewMode = function() {
          // Find first missed; clear that answer so the student can retry it.
          var firstMissed = missedIndices[0];
          if (firstMissed === undefined) return;
          var nextAnswers = Object.assign({}, answers);
          // Clear answers ONLY for missed questions so the user re-attempts them.
          missedIndices.forEach(function(i) { delete nextAnswers[i]; });
          setAnswers(nextAnswers);
          setReviewMode(true);
          setIdx(firstMissed);
          setReveal(false);
          announce('Review mode. ' + missedIndices.length + ' missed questions to retry.');
        };

        var correctCount = Object.keys(answers).filter(function(k) {
          var ci = answers[k];
          var choice = QUESTIONS[k] && QUESTIONS[k].choices.find(function(c) { return c.id === ci; });
          return !!(choice && choice.correct);
        }).length;
        var totalAnswered = Object.keys(answers).length;
        var allDone = totalAnswered >= ROUND_COUNT;
        var pctDone = Math.round((totalAnswered / ROUND_COUNT) * 100);

        // Persist personal best
        useEffect(function() {
          if (allDone) {
            var prev = d.misconQuizBest || 0;
            if (correctCount > prev) {
              upd('misconQuizBest', correctCount);
              lsSet('evoLab.quizBest.v1', correctCount);
            }
          }
        }, [allDone, correctCount]); // eslint-disable-line

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '❓', title: 'Evolution Misconceptions Quiz' }),
          h('div', { className: 'p-4 max-w-3xl mx-auto w-full space-y-3' },
            // Hero / progress
            h('div', { className: 'bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', null,
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80' }, 'Question ' + (idx + 1) + ' of ' + ROUND_COUNT),
                  h('h2', { className: 'text-lg font-black mt-1' }, 'Spot the misconception')
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-[11px] opacity-80' }, 'Score'),
                  h('div', { className: 'text-2xl font-black' }, correctCount + ' / ' + totalAnswered),
                  d.misconQuizBest && h('div', { className: 'text-[10px] opacity-80' }, 'Best: ' + d.misconQuizBest)
                )
              ),
              // Progress bar
              h('div', { className: 'h-2 bg-white/20 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-white transition-all', style: { width: pctDone + '%' } })
              )
            ),
            // Question card
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
              h('h3', { className: 'text-base font-bold text-slate-800 mb-4' }, q.q),
              h('div', { className: 'space-y-2' },
                q.choices.map(function(c) {
                  var picked = chosenId === c.id;
                  var showResult = hasAnswered;
                  var correct = c.correct;
                  var bg, border;
                  if (showResult) {
                    if (correct) { bg = 'rgba(74,222,128,0.15)'; border = '#4ade80'; }
                    else if (picked) { bg = 'rgba(239,68,68,0.15)'; border = '#ef4444'; }
                    else { bg = '#f8fafc'; border = '#cbd5e1'; }
                  } else {
                    bg = '#f8fafc'; border = '#cbd5e1';
                  }
                  return h('button', {
                    key: c.id,
                    onClick: function() { pickChoice(c.id); },
                    disabled: showResult,
                    'aria-label': c.label + (showResult ? (correct ? ' (correct answer)' : picked ? ' (your incorrect answer)' : '') : ''),
                    className: 'block w-full text-left p-3 rounded-lg border-2 transition-colors ' + (showResult ? 'cursor-default' : 'hover:bg-slate-100 cursor-pointer'),
                    style: { background: bg, borderColor: border }
                  }, c.label);
                })
              ),
              // Explanation panel
              hasAnswered && h('div', {
                'aria-live': 'polite',
                className: 'mt-4 p-4 rounded-lg border-2 ' + (isCorrect ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400')
              },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2 ' + (isCorrect ? 'text-emerald-800' : 'text-rose-800') },
                  isCorrect ? '✓ Correct — here\'s why' : '✗ Why this matters'
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, q.explain)
              )
            ),
            // Navigation — uses navIndices so review mode walks only the misses.
            h('div', { className: 'flex items-center justify-between gap-3' },
              h('button', {
                onClick: goPrev,
                disabled: navPos <= 0,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (navPos <= 0 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, '← Previous'),
              h('div', { className: 'text-sm text-slate-600' },
                reviewMode
                  ? '🔍 Review · ' + (navPos + 1) + ' of ' + navIndices.length + ' missed (Q' + (idx + 1) + ')'
                  : (idx + 1) + ' of ' + ROUND_COUNT
              ),
              h('button', {
                onClick: goNext,
                disabled: navPos >= navIndices.length - 1,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (navPos >= navIndices.length - 1 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800 text-white')
              }, 'Next →')
            ),
            // Final summary (when all done) — offers Review-Missed if anything was wrong.
            allDone && h('div', { className: 'bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-5 text-white shadow-lg text-center' },
              h('div', { className: 'text-5xl mb-2' }, correctCount === ROUND_COUNT ? '🏆' : correctCount >= 9 ? '🌟' : correctCount >= 7 ? '👍' : '📖'),
              h('h3', { className: 'text-2xl font-black mb-1' },
                correctCount === ROUND_COUNT ? 'Perfect score!' :
                correctCount >= 9 ? 'Great work!' :
                correctCount >= 7 ? 'Solid grasp.' :
                'Keep studying.'
              ),
              h('p', { className: 'text-emerald-50 mb-3' }, 'You correctly identified ' + correctCount + ' of ' + ROUND_COUNT + ' misconceptions.'),
              h('div', { className: 'flex flex-wrap gap-2 justify-center' },
                missedIndices.length > 0 && h('button', {
                  onClick: startReviewMode,
                  'aria-label': 'Review and retry the ' + missedIndices.length + ' missed questions only',
                  className: 'px-5 py-2.5 rounded-lg font-bold bg-amber-400 text-amber-900 hover:bg-amber-300 shadow'
                }, '🔍 Review ' + missedIndices.length + ' Missed'),
                h('button', {
                  onClick: function() { setAnswers({}); setIdx(0); setReveal(false); setReviewMode(false); },
                  className: 'px-5 py-2.5 rounded-lg font-bold bg-white text-emerald-700 hover:bg-emerald-50'
                }, '↻ Restart All ' + ROUND_COUNT)
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-1', 'HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5'],
              questions: [
                'Which of the 12 misconceptions did you find most surprising? Why?',
                'Which misconception do you think is most dangerous in real life — i.e., would lead to the worst real-world decisions if held by a doctor, policymaker, or voter?',
                'How could you respectfully and effectively correct someone who says "evolution is just a theory" without dismissing them?',
                'Why might science teachers especially want to address the "humans from monkeys" misconception early?'
              ],
              misconceptions: [
                'Don\'t expect this quiz to permanently fix any of these errors — research shows misconceptions are sticky. Plan to revisit them in different contexts.',
                'A few questions touch politically/religiously sensitive territory (Q1, Q8). Use neutral, evidence-focused language. The Q8 framing ("evolution doesn\'t address origin of life") is intentionally chosen to defuse the most common conflict.',
                'Students may "get" a question on the quiz but still hold the misconception in conversation. Watch for it in their writing and discussions.'
              ],
              extension: 'Interview 3 non-biologists (parent, friend, neighbor) and ask them: 1) Is evolution just a theory? 2) Did humans evolve from monkeys? 3) Is evolution random? Compare their answers to what you learned. Don\'t correct them in the moment — just listen and report back.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // ANTIBIOTIC RESISTANCE LAB
      // ─────────────────────────────────────────────────────
      // Shows evolution on human-relevant timescales. A bacterial population
      // (~150 cells) starts mostly susceptible. Each "tick" represents a few
      // hours: bacteria reproduce, mutations occasionally produce resistant
      // strains, and the player can apply antibiotic pulses that kill the
      // susceptible. Over weeks of treatment, resistant strains take over.
      // Real-world hooks: MRSA, TB, the importance of finishing prescriptions.
      function AntibioticLab() {
        var POP_CAP = 150;
        // Bacteria carry a continuous resistance trait r ∈ [0, 1]:
        //   r = 0   fully susceptible — antibiotic kills with probability 1
        //   r = 1   fully resistant — antibiotic has no effect
        // Mutation introduces small random shifts each replication.
        var antibioticState = useState(false), antibiotic = antibioticState[0], setAntibiotic = antibioticState[1];
        var doseStrengthState = useState(0.85), doseStrength = doseStrengthState[0], setDoseStrength = doseStrengthState[1];
        var mutRateState = useState(0.04), mutRate = mutRateState[0], setMutRate = mutRateState[1];
        var startResState = useState(0.02), startRes = startResState[0], setStartRes = startResState[1];
        var tickState = useState(0), tick = tickState[0], setTick = tickState[1];
        var historyState = useState([]), history = historyState[0], setHistory = historyState[1];
        var autoRunState = useState(false), autoRun = autoRunState[0], setAutoRun = autoRunState[1];
        var bacteriaRef = useRef([]);
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var lastTickRef = useRef(0);
        var antibioticRef = useRef(antibiotic);
        var doseRef = useRef(doseStrength);
        var mutRef = useRef(mutRate);
        var autoRunRef2 = useRef(autoRun);
        // Mirror state into refs every render so the long-lived RAF closure
        // sees the latest values without re-mounting.
        antibioticRef.current = antibiotic;
        doseRef.current = doseStrength;
        mutRef.current = mutRate;
        autoRunRef2.current = autoRun;

        var initPopulation = function() {
          var pop = [];
          for (var i = 0; i < POP_CAP; i++) {
            // startRes fraction begin partially resistant; rest are susceptible.
            var r = Math.random() < startRes ? clamp(0.6 + Math.random() * 0.3, 0, 1) : clamp(Math.random() * 0.1, 0, 1);
            pop.push({
              x: 50 + Math.random() * 700,
              y: 30 + Math.random() * 200,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              r: r,
              alive: true
            });
          }
          bacteriaRef.current = pop;
          setTick(0);
          var resCount = pop.filter(function(b) { return b.r > 0.5; }).length;
          setHistory([{ tick: 0, pop: pop.length, resistant: resCount, anti: false }]);
        };

        // Advance one "step" (~few hours of bacterial life). Either:
        //  - antibiotic OFF: pop grows back to cap; small mutation noise per cell
        //  - antibiotic ON:  each cell's survival = (1 - dose * (1 - r))
        //                    so resistant cells survive; susceptible die
        var stepOne = function() {
          var pop = bacteriaRef.current.slice();
          var antiOn = antibioticRef.current;
          var dose = doseRef.current;
          var mut = mutRef.current;
          var survivors;
          if (antiOn) {
            survivors = [];
            for (var i = 0; i < pop.length; i++) {
              var b = pop[i];
              // Survival probability rises with resistance.
              var survival = 1 - dose * (1 - b.r);
              if (Math.random() < Math.max(0.02, survival)) survivors.push(b);
            }
          } else {
            // No antibiotic — everyone survives the step.
            survivors = pop.slice();
          }
          // Reproduction back to cap (antibiotic-free conditions allow regrowth;
          // antibiotic conditions reproduce more slowly because most are dying).
          var growthCap = antiOn ? Math.min(POP_CAP, survivors.length + 8) : POP_CAP;
          var next = survivors.slice();
          var attempts = 0;
          while (next.length < growthCap && survivors.length > 0 && attempts < 500) {
            attempts++;
            var parent = survivors[Math.floor(Math.random() * survivors.length)];
            // Offspring resistance: parent's value plus random small mutation.
            var newR = clamp(parent.r + randNormal(0, mut), 0, 1);
            next.push({
              x: parent.x + (Math.random() - 0.5) * 20,
              y: parent.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              r: newR,
              alive: true
            });
          }
          bacteriaRef.current = next;
          var t = tick + 1;
          var resistantCount = next.filter(function(b) { return b.r > 0.5; }).length;
          setTick(t);
          setHistory(history.concat([{ tick: t, pop: next.length, resistant: resistantCount, anti: antiOn }]).slice(-80));
          if (next.length === 0) setAutoRun(false); // population extinct
        };

        // Init synchronously to avoid empty-canvas flicker.
        if (bacteriaRef.current.length === 0) initPopulation();

        // Long-lived RAF loop — bouncing motion + auto-run tick.
        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          var lastT = performance.now();
          var loop = function(now) {
            var dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            if (!_prefersReducedMotion) {
              var pop = bacteriaRef.current;
              for (var i = 0; i < pop.length; i++) {
                var b = pop[i];
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                if (b.x < 12) { b.x = 12; b.vx = -b.vx; }
                if (b.x > canvas.width - 12) { b.x = canvas.width - 12; b.vx = -b.vx; }
                if (b.y < 12) { b.y = 12; b.vy = -b.vy; }
                if (b.y > canvas.height - 12) { b.y = canvas.height - 12; b.vy = -b.vy; }
              }
            }
            // Auto-run tick every 800ms when running.
            if (autoRunRef2.current && now - lastTickRef.current > 800) {
              lastTickRef.current = now;
              stepOne();
            }
            drawCanvas(ctx, canvas.width, canvas.height);
            rafRef.current = requestAnimationFrame(loop);
          };
          lastTickRef.current = performance.now();
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }, []); // eslint-disable-line — RAF reads from refs, deps stay empty

        var drawCanvas = function(ctx, W, H) {
          // Petri dish background — slightly different color when antibiotic is on
          // (subtle wash of pink) so the user has a constant ambient cue.
          ctx.fillStyle = antibioticRef.current ? '#fdf2f8' : '#f0fdf4';
          ctx.fillRect(0, 0, W, H);
          // Dish circle decoration
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.strokeRect(8, 8, W - 16, H - 16);
          // Bacteria — color encodes resistance: green (susceptible) → red (resistant).
          var pop = bacteriaRef.current;
          for (var i = 0; i < pop.length; i++) {
            var b = pop[i];
            // Green-to-red gradient via r value
            var rr = Math.round(lerp(34, 220, b.r));
            var gg = Math.round(lerp(197, 38, b.r));
            var bb = Math.round(lerp(94, 38, b.r));
            ctx.fillStyle = 'rgb(' + rr + ',' + gg + ',' + bb + ')';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 5, 0, 2 * Math.PI);
            ctx.fill();
          }
          // Antibiotic indicator
          if (antibioticRef.current) {
            ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('💊 ANTIBIOTIC ACTIVE — dose ' + Math.round(doseRef.current * 100) + '%', 16, 28);
          }
          // Population watermark
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
          ctx.fillText('Pop ' + pop.length + ' · ' + pop.filter(function(b) { return b.r > 0.5; }).length + ' resistant', 16, H - 10);
        };

        var pop = bacteriaRef.current;
        var resistantCount = pop.filter(function(b) { return b.r > 0.5; }).length;
        var resistantPct = pop.length > 0 ? Math.round((resistantCount / pop.length) * 100) : 0;

        // History line chart of resistance % over time.
        var renderHistoryChart = function() {
          var W = 600, H = 160, padL = 36, padR = 12, padT = 12, padB = 22;
          var xMax = Math.max(20, history.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          // Path of resistance fraction
          var resPath = history.map(function(pt, i) {
            var frac = pt.pop > 0 ? pt.resistant / pt.pop : 0;
            return (i === 0 ? 'M ' : 'L ') + toX(i).toFixed(1) + ' ' + toY(frac).toFixed(1);
          }).join(' ');
          // Antibiotic active band (where pt.anti is true)
          var bandPath = '';
          var inBand = false, bandStart = 0;
          for (var i = 0; i < history.length; i++) {
            if (history[i].anti && !inBand) { inBand = true; bandStart = i; }
            else if (!history[i].anti && inBand) {
              bandPath += 'M ' + toX(bandStart) + ' ' + padT + ' L ' + toX(i) + ' ' + padT + ' L ' + toX(i) + ' ' + (H - padB) + ' L ' + toX(bandStart) + ' ' + (H - padB) + ' Z ';
              inBand = false;
            }
          }
          if (inBand) bandPath += 'M ' + toX(bandStart) + ' ' + padT + ' L ' + toX(history.length - 1) + ' ' + padT + ' L ' + toX(history.length - 1) + ' ' + (H - padB) + ' L ' + toX(bandStart) + ' ' + (H - padB) + ' Z ';
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, '📊 Resistance Fraction Over Time'),
              h('div', { className: 'flex gap-3 text-[10px]' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#dc2626', display: 'inline-block' } }),
                  h('span', { className: 'text-slate-700' }, '% resistant')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 8, backgroundColor: 'rgba(236,72,153,0.25)', display: 'inline-block' } }),
                  h('span', { className: 'text-slate-700' }, 'antibiotic on')
                )
              )
            ),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': history.length === 0 ? 'Empty resistance chart.' : 'Resistance fraction chart over ' + history.length + ' generations. Currently ' + resistantPct + ' percent resistant.'
            },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              // Antibiotic active band(s)
              bandPath && h('path', { d: bandPath, fill: 'rgba(236,72,153,0.18)', stroke: 'none' }),
              // Axes
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              h('text', { x: 4, y: toY(1) + 4, fontSize: '10', fill: '#475569' }, '100%'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '10', fill: '#475569' }, '50%'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '10', fill: '#475569' }, '0%'),
              h('line', { x1: padL, y1: toY(0.5), x2: W - padR, y2: toY(0.5), stroke: '#cbd5e1', strokeDasharray: '3,3' }),
              h('text', { x: padL, y: H - 8, fontSize: '10', fill: '#475569' }, 'tick 0'),
              h('text', { x: W - padR - 38, y: H - 8, fontSize: '10', fill: '#475569' }, 'tick ' + xMax),
              history.length > 1 && h('path', { d: resPath, stroke: '#dc2626', strokeWidth: 2, fill: 'none' }),
              history.length > 0 && h('circle', { cx: toX(history.length - 1), cy: toY(history[history.length - 1].pop > 0 ? history[history.length - 1].resistant / history[history.length - 1].pop : 0), r: 3, fill: '#dc2626' })
            )
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '💊', title: 'Antibiotic Resistance Lab' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-fuchsia-500 to-pink-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '💊'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'Evolution on a human timescale'),
                  h('p', { className: 'text-sm text-pink-50 mt-1' }, 'Bacteria divide every 20-30 minutes. Apply an antibiotic, kill 99% of them, and the 1% that survive — usually carrying a rare resistance mutation — repopulate. Within days you have a fully resistant strain. This is happening in real hospitals right now.')
                )
              )
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Population', value: pop.length, color: 'text-fuchsia-700' }),
              h(StatCard, { label: '% Resistant', value: resistantPct + '%', color: resistantPct > 70 ? 'text-rose-700' : resistantPct > 30 ? 'text-amber-700' : 'text-emerald-700' }),
              h(StatCard, { label: 'Tick', value: tick, color: 'text-cyan-700' }),
              h(StatCard, { label: 'Mode', value: antibiotic ? '💊 ON' : 'Off', color: antibiotic ? 'text-rose-700' : 'text-slate-600' })
            ),
            // Petri dish canvas
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('canvas', {
                ref: canvasRef,
                width: 800, height: 240,
                className: 'w-full block',
                role: 'img',
                'aria-label': 'Petri dish with ' + pop.length + ' bacteria. ' + resistantPct + ' percent resistant. Antibiotic ' + (antibiotic ? 'active' : 'off') + '.'
              })
            ),
            // History chart
            renderHistoryChart(),
            // Controls
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: stepOne,
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-300 text-white shadow-lg'
              }, '⏭ Step 1 Tick'),
              h('button', {
                onClick: function() { for (var i = 0; i < 10; i++) stepOne(); },
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-fuchsia-500 hover:bg-fuchsia-600 disabled:bg-fuchsia-300 text-white shadow-lg'
              }, '⏭⏭ Step 10'),
              h('button', {
                onClick: function() { setAutoRun(!autoRun); },
                'aria-pressed': autoRun,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (autoRun ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white')
              }, autoRun ? '⏸ Stop Auto-Run' : '▶ Auto-Run'),
              h('button', {
                onClick: function() { setAntibiotic(!antibiotic); },
                'aria-pressed': antibiotic,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (antibiotic ? 'bg-pink-700 hover:bg-pink-800 text-white' : 'bg-pink-200 hover:bg-pink-300 text-pink-900')
              }, antibiotic ? '💊 Antibiotic ON' : '💊 Apply Antibiotic'),
              h('button', {
                onClick: initPopulation,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Reset Dish')
            ),
            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h(LabeledSlider, {
                label: 'Antibiotic Dose',
                value: doseStrength, min: 0.3, max: 1.0, step: 0.05,
                onChange: function(v) { setDoseStrength(v); },
                valueText: 'Dose ' + Math.round(doseStrength * 100) + '% lethal',
                accent: 'accent-pink-500',
                hint: 'Higher dose kills more susceptible bacteria each tick. But it also selects more strongly for resistance.'
              }),
              h(LabeledSlider, {
                label: 'Mutation Rate',
                value: mutRate, min: 0, max: 0.15, step: 0.01,
                onChange: function(v) { setMutRate(v); },
                valueText: 'σ = ' + mutRate.toFixed(2),
                accent: 'accent-violet-500',
                hint: 'How much offspring resistance varies from parent. Real bacterial mutation is much rarer; here exaggerated to be visible.'
              }),
              h(LabeledSlider, {
                label: 'Starting Resistance',
                value: startRes, min: 0, max: 0.3, step: 0.01,
                onChange: function(v) { setStartRes(v); },
                valueText: Math.round(startRes * 100) + '% start resistant',
                accent: 'accent-fuchsia-500',
                hint: 'Fraction of the initial population that\'s already resistant. Even 1-2% is enough to seed full resistance under treatment.'
              })
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-fuchsia-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-fuchsia-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Watch resistance evolve: '), 'Reset. Apply Antibiotic. Auto-Run for ~30 ticks. Watch the population crash, then rebuild from the few resistant survivors. By tick 30 the dish is mostly red.'),
                h('li', null, h('strong', null, '"Finish your prescription": '), 'Apply Antibiotic for 10 ticks (population shrinks but isn\'t gone). Turn antibiotic OFF. The remaining bacteria — already partly resistant — repopulate fast. Restart the antibiotic; it\'s less effective now. This is exactly why doctors say "finish all the pills."'),
                h('li', null, h('strong', null, 'Dose makes the poison: '), 'Reset. Set Dose to 0.4 (low). Apply antibiotic and Auto-Run. Notice resistance rises slowly. Now Reset and try Dose = 1.0 (max). Resistance evolves FASTER under stronger selection — counterintuitive but true.'),
                h('li', null, h('strong', null, 'Stop using it altogether: '), 'After resistance reaches 100%, turn antibiotic OFF and Auto-Run. Watch resistance slowly decline if there\'s a "fitness cost" of being resistant — but in this model there isn\'t one, so resistance stays. (In real bacteria, fitness costs are sometimes present, sometimes not.)'),
                h('li', null, h('strong', null, 'Mutation rate matters: '), 'Reset. Set Mutation Rate to 0. Apply Antibiotic. Population goes extinct — no resistance can evolve from scratch. Now set Mutation Rate to 0.15. Resistance evolves nearly instantly. Real-world: bacteria with higher mutation rates evolve resistance faster.')
              )
            ),
            // Real-world callout
            h('div', { className: 'bg-fuchsia-50 border border-fuchsia-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-fuchsia-800 mb-2' }, '📖 Real-world public health'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'MRSA: '), 'Methicillin-resistant Staphylococcus aureus. First seen in 1961, two years after methicillin was introduced. Now common in hospitals worldwide. Annually causes ~10,000+ deaths in the US alone.'),
                h('p', null, h('strong', null, 'TB: '), 'Multidrug-resistant tuberculosis (MDR-TB) and extensively drug-resistant (XDR-TB) emerged because TB requires 6-9 months of treatment — patients who stop early select for resistance.'),
                h('p', null, h('strong', null, 'C. difficile: '), 'Often emerges AFTER antibiotic treatment for something else. The antibiotic kills off normal gut bacteria, leaving room for resistant C. diff to take over. ~12,800 US deaths/year.'),
                h('p', null, h('strong', null, 'Why this matters: '), 'The CDC estimates antibiotic-resistant infections kill ~35,000 Americans per year. WHO calls antibiotic resistance one of the top 10 public health threats. Every prescription not finished, every antibiotic taken for a viral infection, every drop in livestock feed adds selection pressure.'),
                h('p', null, h('strong', null, 'What you can do: '), 'Finish prescriptions even if you feel better. Don\'t demand antibiotics for viral infections (they don\'t work on viruses). Don\'t share or save antibiotics. The selection pressure you create today shapes the resistance landscape your kids will inherit.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '❓'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You\'ve seen evolution happening in days. The Misconceptions Quiz tackles the deeper conceptual errors people still make about how all of this works.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-4', 'HS-LS4-5', 'HS-LS2-7'],
              questions: [
                'In the "stop the prescription early" experiment, why does the second course of antibiotics work less well than the first?',
                'Counterintuitively, HIGHER doses select for resistance FASTER than lower doses. Why?',
                'What policies could we put in place — at the patient level, hospital level, agricultural level — to slow the rise of antibiotic resistance?',
                'Why does the CDC consider antibiotic resistance one of the top 10 public health threats globally?'
              ],
              misconceptions: [
                '"Bacteria LEARN to resist antibiotics." They don\'t learn — they evolve. Random mutations occasionally produce resistance; antibiotics select FOR those mutations. The bacteria themselves don\'t change in response to the drug.',
                '"You only get resistance if you take antibiotics often." Even a single under-completed course can select for resistance. And resistance can spread between bacteria (and even between species) via horizontal gene transfer.',
                '"My antibiotic stopped working — I need a stronger one." Sometimes the right answer is a different antibiotic class entirely, not a stronger version of the same one. Resistance is often class-specific.'
              ],
              extension: 'Research the WHO\'s "Antibiotic Stewardship" guidelines. List 3 specific policies and explain the evolutionary logic behind each one.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SPECIATION SIMULATOR
      // ─────────────────────────────────────────────────────
      // Allopatric speciation: a single ancestral population is split by a
      // geographic barrier. Each half evolves under its own selection pressure.
      // Over generations, the two means diverge until they can no longer
      // interbreed — speciation. Compatibility = overlap of trait distributions;
      // when overlap drops below 30%, the model declares them separate species.
      // Real-world template: Galápagos finches (all 14 from one ancestor across
      // 14 islands), Lake Victoria cichlids (~500 species in a single lake from
      // a small founder pool ~14,000 years ago).
      function SpeciationSimulator() {
        var POP_PER_SIDE = 30;
        // Each population has independent selection toward its own ideal trait.
        // The default starts both at the same ideal (no divergence) so the
        // student can choose to diverge them by adjusting the sliders.
        var idealLeftState = useState(0.3), idealLeft = idealLeftState[0], setIdealLeft = idealLeftState[1];
        var idealRightState = useState(0.7), idealRight = idealRightState[0], setIdealRight = idealRightState[1];
        var selStrengthState = useState(0.7), selStrength = selStrengthState[0], setSelStrength = selStrengthState[1];
        var mutSizeState = useState(0.05), mutSize = mutSizeState[0], setMutSize = mutSizeState[1];
        var generationState = useState(0), generation = generationState[0], setGeneration = generationState[1];
        var autoRunState = useState(false), autoRun = autoRunState[0], setAutoRun = autoRunState[1];
        var speciatedState = useState(false), speciated = speciatedState[0], setSpeciated = speciatedState[1];
        var speciatedAtState = useState(null), speciatedAt = speciatedAtState[0], setSpeciatedAt = speciatedAtState[1];
        // Live refs so the long-lived RAF closure reads current values.
        var leftPopRef = useRef([]);
        var rightPopRef = useRef([]);
        var historyRef = useRef([]);
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var lastTickRef = useRef(0);
        var generationRef = useRef(0);
        var idealLeftRef = useRef(idealLeft);
        var idealRightRef = useRef(idealRight);
        var selStrengthRef = useRef(selStrength);
        var mutSizeRef = useRef(mutSize);
        var autoRunRef3 = useRef(autoRun);
        generationRef.current = generation;
        idealLeftRef.current = idealLeft;
        idealRightRef.current = idealRight;
        selStrengthRef.current = selStrength;
        mutSizeRef.current = mutSize;
        autoRunRef3.current = autoRun;

        var initPopulations = function() {
          var makeOne = function() {
            return {
              x: 30 + Math.random() * 320,
              y: 30 + Math.random() * 220,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              // Both populations start at mean 0.5 (same ancestral distribution).
              trait: clamp(randNormal(0.5, 0.08), 0, 1)
            };
          };
          var left = [];
          var right = [];
          for (var i = 0; i < POP_PER_SIDE; i++) {
            var l = makeOne();
            var r = makeOne();
            // Right population starts on the right canvas (offset positions).
            r.x = 410 + Math.random() * 320;
            left.push(l);
            right.push(r);
          }
          leftPopRef.current = left;
          rightPopRef.current = right;
          historyRef.current = [{ gen: 0, lMean: 0.5, rMean: 0.5, compat: 1.0 }];
          setGeneration(0);
          setSpeciated(false);
          setSpeciatedAt(null);
        };

        // Compatibility = how much the two trait distributions overlap.
        // Computed as 1 - normalized distance between means (penalized by std).
        // Returns 1.0 when populations are identical, ~0.0 when fully diverged.
        var computeCompatibility = function(lMean, rMean, lStd, rStd) {
          var d = Math.abs(lMean - rMean);
          var sumStd = (lStd + rStd) / 2;
          if (sumStd < 0.001) sumStd = 0.001;
          // Mahalanobis-ish distance, clamped.
          var z = d / Math.max(sumStd * 2.0, 0.05);
          return clamp(Math.exp(-z * z), 0, 1);
        };

        // Compute mean and std of a population's trait values.
        var meanStd = function(pop) {
          var sum = 0, sumSq = 0;
          for (var i = 0; i < pop.length; i++) { sum += pop[i].trait; sumSq += pop[i].trait * pop[i].trait; }
          var mean = sum / pop.length;
          var v = (sumSq / pop.length) - mean * mean;
          return { mean: mean, std: Math.sqrt(Math.max(0, v)) };
        };

        // Apply selection + reproduction for ONE side. Each side gets its own
        // ideal trait and selects independently. selStrength is shared.
        var stepOneSide = function(pop, ideal) {
          var sel = selStrengthRef.current;
          var mut = mutSizeRef.current;
          var fitnessOf = function(t) {
            // Gaussian fitness around `ideal`; selStrength=0 → flat (fitness=1).
            var raw = Math.exp(-Math.pow((t - ideal) / 0.18, 2));
            return lerp(1, raw, sel);
          };
          var survivors = [];
          for (var i = 0; i < pop.length; i++) {
            if (Math.random() < fitnessOf(pop[i].trait)) survivors.push(pop[i]);
          }
          if (survivors.length === 0) {
            survivors = pop.slice().sort(function(a, b) { return fitnessOf(b.trait) - fitnessOf(a.trait); }).slice(0, 4);
          }
          var next = survivors.slice();
          while (next.length < POP_PER_SIDE) {
            var parent = survivors[Math.floor(Math.random() * survivors.length)];
            next.push({
              x: parent.x + (Math.random() - 0.5) * 24,
              y: parent.y + (Math.random() - 0.5) * 24,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              trait: clamp(parent.trait + randNormal(0, mut), 0, 1)
            });
          }
          return next;
        };

        var stepGeneration = function(silent) {
          var nextL = stepOneSide(leftPopRef.current, idealLeftRef.current);
          var nextR = stepOneSide(rightPopRef.current, idealRightRef.current);
          leftPopRef.current = nextL;
          rightPopRef.current = nextR;
          var l = meanStd(nextL);
          var r = meanStd(nextR);
          var compat = computeCompatibility(l.mean, r.mean, l.std, r.std);
          var nextGen = generationRef.current + 1;
          historyRef.current.push({ gen: nextGen, lMean: l.mean, rMean: r.mean, compat: compat });
          if (historyRef.current.length > 80) historyRef.current.shift();
          generationRef.current = nextGen;
          setGeneration(nextGen);
          // Detect speciation on threshold cross (compat < 0.3) — first time only.
          if (!speciated && compat < 0.3) {
            setSpeciated(true);
            setSpeciatedAt(nextGen);
            setAutoRun(false); // pause for the moment
            announce('Speciation event! At generation ' + nextGen + ', the two populations have diverged enough to be considered separate species.');
          } else if (!silent) {
            announce('Generation ' + nextGen + '. Compatibility ' + Math.round(compat * 100) + ' percent.');
          }
        };

        // Init synchronously to avoid empty canvas flicker.
        if (leftPopRef.current.length === 0) initPopulations();

        // RAF loop: bouncing motion + auto-run.
        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          var lastT = performance.now();
          var loop = function(now) {
            var dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            if (!_prefersReducedMotion) {
              var moveAside = function(pop, minX, maxX) {
                for (var i = 0; i < pop.length; i++) {
                  var c = pop[i];
                  c.x += c.vx * dt;
                  c.y += c.vy * dt;
                  if (c.x < minX) { c.x = minX; c.vx = -c.vx; }
                  if (c.x > maxX) { c.x = maxX; c.vx = -c.vx; }
                  if (c.y < 16) { c.y = 16; c.vy = -c.vy; }
                  if (c.y > canvas.height - 16) { c.y = canvas.height - 16; c.vy = -c.vy; }
                }
              };
              moveAside(leftPopRef.current, 14, 360);
              moveAside(rightPopRef.current, 412, canvas.width - 14);
            }
            if (autoRunRef3.current && now - lastTickRef.current > 1100) {
              lastTickRef.current = now;
              stepGeneration(true);
            }
            drawCanvas(ctx, canvas.width, canvas.height);
            rafRef.current = requestAnimationFrame(loop);
          };
          lastTickRef.current = performance.now();
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }, []); // eslint-disable-line — RAF reads from refs

        // Trait → color: same blue→orange gradient on both sides so divergence is visible.
        function traitColor(t) {
          var rr = Math.round(lerp(34, 244, t));
          var gg = Math.round(lerp(94, 114, t));
          var bb = Math.round(lerp(212, 41, t));
          return 'rgb(' + rr + ',' + gg + ',' + bb + ')';
        }

        var drawCanvas = function(ctx, W, H) {
          // Background — left side cool blue, right side warm sand to suggest
          // two different environments selecting in different directions.
          ctx.fillStyle = '#dbeafe';
          ctx.fillRect(0, 0, 376, H);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(376, 0, W - 376, H);
          // Geographic barrier — visual mountains/wall in the middle.
          ctx.fillStyle = '#78350f';
          ctx.fillRect(370, 0, 12, H);
          ctx.fillStyle = '#92400e';
          // Mountain peaks
          for (var m = 0; m < H; m += 24) {
            ctx.beginPath();
            ctx.moveTo(370, m);
            ctx.lineTo(376, m + 12);
            ctx.lineTo(382, m);
            ctx.fill();
          }
          // Labels
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#1e3a8a';
          ctx.fillText('🏞️  COOL · WET', 16, 22);
          ctx.fillStyle = '#92400e';
          ctx.fillText('☀️  HOT · DRY', 396, 22);
          // Bacteria/creatures on each side
          var renderSide = function(pop) {
            for (var i = 0; i < pop.length; i++) {
              var c = pop[i];
              ctx.fillStyle = traitColor(c.trait);
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(c.x, c.y, 7, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#1e293b';
              ctx.beginPath(); ctx.arc(c.x + 1.6, c.y - 1.6, 1.0, 0, 2 * Math.PI); ctx.fill();
            }
          };
          renderSide(leftPopRef.current);
          renderSide(rightPopRef.current);
          // Generation counter
          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.fillText('Generation ' + generationRef.current, 14, H - 10);
        };

        // Compute live stats for the panel.
        var lStats = meanStd(leftPopRef.current);
        var rStats = meanStd(rightPopRef.current);
        var compat = computeCompatibility(lStats.mean, rStats.mean, lStats.std, rStats.std);
        var compatPct = Math.round(compat * 100);

        // SVG history chart — both means + compatibility line.
        var renderHistoryChart = function() {
          var hist = historyRef.current;
          var W = 600, H = 160, padL = 36, padR = 12, padT = 12, padB = 24;
          var xMax = Math.max(20, hist.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          var lPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.lMean); }).join(' ');
          var rPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.rMean); }).join(' ');
          var cPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.compat); }).join(' ');
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Trait Means + Compatibility Over Time'),
              h('div', { className: 'flex gap-3 text-[10px]' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#3b82f6', display: 'inline-block' } }),
                  h('span', null, 'Left mean')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#f59e0b', display: 'inline-block' } }),
                  h('span', null, 'Right mean')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#10b981', display: 'inline-block' } }),
                  h('span', null, 'Compatibility')
                )
              )
            ),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': 'Two trait means and a compatibility line over generations. Compatibility currently ' + compatPct + ' percent.'
            },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              // Speciation threshold at 0.3 compatibility
              h('line', { x1: padL, y1: toY(0.3), x2: W - padR, y2: toY(0.3), stroke: '#dc2626', strokeDasharray: '4,2', strokeWidth: 1 }),
              h('text', { x: W - padR - 110, y: toY(0.3) - 4, fontSize: '9', fill: '#dc2626' }, 'speciation threshold (30%)'),
              h('text', { x: 4, y: toY(1) + 4, fontSize: '10', fill: '#475569' }, '1.0'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '10', fill: '#475569' }, '0.5'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '10', fill: '#475569' }, '0.0'),
              hist.length > 1 && h('path', { d: lPath, stroke: '#3b82f6', strokeWidth: 2, fill: 'none' }),
              hist.length > 1 && h('path', { d: rPath, stroke: '#f59e0b', strokeWidth: 2, fill: 'none' }),
              hist.length > 1 && h('path', { d: cPath, stroke: '#10b981', strokeWidth: 2.4, fill: 'none' })
            )
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🌗', title: 'Speciation Simulator' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-indigo-600 to-blue-800 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🌗'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'How one species becomes two'),
                  h('p', { className: 'text-sm text-indigo-50 mt-1' }, 'A geographic barrier splits an ancestral population. Each half evolves under its own pressure. When trait distributions diverge enough that the two can no longer interbreed (compatibility < 30%), they\'re separate species. This is the textbook allopatric model behind Galápagos finches, Lake Victoria cichlids, and ring species.')
                )
              )
            ),
            // Stats row
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Generation', value: generation, color: 'text-indigo-700' }),
              h(StatCard, { label: 'Left Mean', value: lStats.mean.toFixed(2), color: 'text-blue-700' }),
              h(StatCard, { label: 'Right Mean', value: rStats.mean.toFixed(2), color: 'text-amber-700' }),
              h(StatCard, { label: 'Compatibility', value: compatPct + '%', color: compat < 0.3 ? 'text-rose-700' : compat < 0.6 ? 'text-amber-700' : 'text-emerald-700' })
            ),
            // Speciation banner
            speciated && h('div', { 'aria-live': 'polite', className: 'bg-gradient-to-r from-rose-500 to-pink-700 rounded-2xl p-4 text-white shadow-lg flex items-center gap-3' },
              h('span', { className: 'text-4xl' }, '🎉'),
              h('div', null,
                h('div', { className: 'text-lg font-black' }, 'SPECIATION!'),
                h('div', { className: 'text-sm opacity-95' }, 'At generation ' + speciatedAt + ', the two populations have diverged enough that they\'d no longer interbreed in nature. They\'re now separate species. Reset to try again with different settings.')
              )
            ),
            // Canvas (two-population view with barrier)
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('canvas', {
                ref: canvasRef,
                width: 800, height: 280,
                className: 'w-full block',
                role: 'img',
                'aria-label': 'Two populations separated by a barrier. Left mean ' + lStats.mean.toFixed(2) + ', right mean ' + rStats.mean.toFixed(2) + '. Compatibility ' + compatPct + ' percent.'
              })
            ),
            // History chart
            renderHistoryChart(),
            // Sliders for each side's selection ideal
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h(LabeledSlider, {
                label: 'Left side: ideal trait',
                value: idealLeft, min: 0, max: 1, step: 0.05,
                onChange: function(v) { setIdealLeft(v); },
                valueText: 'Ideal = ' + idealLeft.toFixed(2),
                accent: 'accent-blue-500',
                hint: 'What trait value selection favors on the left (cool/wet) side. Move toward 0 to push left population away from right.'
              }),
              h(LabeledSlider, {
                label: 'Right side: ideal trait',
                value: idealRight, min: 0, max: 1, step: 0.05,
                onChange: function(v) { setIdealRight(v); },
                valueText: 'Ideal = ' + idealRight.toFixed(2),
                accent: 'accent-amber-500',
                hint: 'What trait value selection favors on the right (hot/dry) side. The greater the gap from left ideal, the faster speciation.'
              }),
              h(LabeledSlider, {
                label: 'Selection Strength (both sides)',
                value: selStrength, min: 0, max: 1, step: 0.05,
                onChange: function(v) { setSelStrength(v); },
                valueText: selStrength === 0 ? 'Off (drift only)' : 'Strength = ' + selStrength.toFixed(2),
                accent: 'accent-emerald-500',
                hint: 'How strongly each side selects toward its ideal. With selection off, drift alone may still cause speciation in small populations — eventually.'
              }),
              h(LabeledSlider, {
                label: 'Mutation Size',
                value: mutSize, min: 0.01, max: 0.15, step: 0.01,
                onChange: function(v) { setMutSize(v); },
                valueText: 'σ = ' + mutSize.toFixed(2),
                accent: 'accent-violet-500',
                hint: 'Higher mutation = faster response to selection AND more variance maintained = somewhat slower full speciation.'
              })
            ),
            // Controls
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: function() { stepGeneration(false); },
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white shadow-lg'
              }, '⏭ Step 1 Generation'),
              h('button', {
                onClick: function() { for (var i = 0; i < 10; i++) stepGeneration(true); },
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white shadow-lg'
              }, '⏭⏭ Step 10'),
              h('button', {
                onClick: function() { setAutoRun(!autoRun); },
                'aria-pressed': autoRun,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (autoRun ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white')
              }, autoRun ? '⏸ Stop Auto-Run' : '▶ Auto-Run'),
              h('button', {
                onClick: initPopulations,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Reset')
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-indigo-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Default fast speciation: '), 'Left ideal = 0.3, right = 0.7, selection = 0.7. Auto-run. Speciation usually triggers within 15-25 generations.'),
                h('li', null, h('strong', null, 'Same ideal, no divergence: '), 'Set BOTH ideals to 0.5 (same selection pressure on both sides). Auto-run for 50 generations — populations stay compatible. Speciation needs DIFFERENT pressures.'),
                h('li', null, h('strong', null, 'Drift-only speciation: '), 'Set selection to 0 on both sides. Auto-run for 80+ generations. Even without selection, populations drift apart by chance — this is exactly how some island species formed.'),
                h('li', null, h('strong', null, 'Reverse a near-speciation: '), 'Run until compatibility ≈ 40%. Set BOTH ideals to 0.5 and resume. The populations partially merge back — but only if you stop in time. Past the threshold, divergence accumulates faster than mixing can reverse.'),
                h('li', null, h('strong', null, 'Slow vs fast speciation: '), 'Compare selection = 1.0 (strong) vs 0.3 (weak). Stronger selection causes faster trait divergence and faster speciation.')
              )
            ),
            // Real-world examples
            h('div', { className: 'bg-indigo-50 border border-indigo-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2' }, '📖 Real-world speciation events'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Galápagos finches: '), 'A single ancestral finch species reached the Galápagos ~2 million years ago. With ~14 islands offering different food sources, the population spread, and isolated subpopulations evolved into 14 distinct species — different beak shapes for different niches. This is adaptive radiation.'),
                h('p', null, h('strong', null, 'Lake Victoria cichlids: '), '~500 species of cichlid fish in a single lake. The lake nearly dried up ~14,000 years ago — the survivors radiated explosively as the lake refilled. One of the fastest documented speciation events.'),
                h('p', null, h('strong', null, 'Ring species: '), 'The Ensatina salamander complex in California — populations form a "ring" around the Central Valley. Adjacent populations interbreed. End populations meeting at the southern junction can\'t. They\'re mid-speciation, caught in the act.'),
                h('p', null, h('strong', null, 'Maine relevance: '), 'The American eel and European eel split ~3 million years ago when their range fragmented across the Atlantic. Both still spawn in the Sargasso Sea (a remnant of their shared ancestry) but are now distinct species — partial allopatric speciation in progress.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-violet-50 border border-violet-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🌳'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You\'ve seen one species become two. Now scale up: the Phylogenetic Tree Builder shows the full branching pattern of life — every species today descended from a chain of speciation events going back billions of years.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5'],
              questions: [
                'What\'s the difference between allopatric, sympatric, and parapatric speciation? Which does this simulator model?',
                'In the "drift-only" experiment, populations still speciate eventually. What does this tell us about the necessity of selection?',
                'Compatibility falls below 30% — that\'s the model\'s threshold. What real-world tests would scientists actually use to declare two populations separate species?',
                'Why is allopatric speciation more common than sympatric in the wild?'
              ],
              misconceptions: [
                '"Speciation always requires geographic isolation." Most cases yes, but sympatric speciation (in the same area) does happen — host-shifting in apple maggot flies, hawthorn fly speciation, polyploidy in plants.',
                '"Two populations either CAN or CAN\'T interbreed." Reality is fuzzier — partial reproductive isolation, hybrid zones, ring species. The "biological species concept" is a useful idealization, not a perfect rule.'
              ],
              extension: 'Research a real ring species (Ensatina salamanders, Larus gulls). Map the geographic distribution. At which junction does interbreeding break down? Why is this evidence of speciation in progress?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // COEVOLUTION LAB — predator/prey arms race
      // ─────────────────────────────────────────────────────
      // Two interacting populations: predators (red) and prey (blue). Each has
      // a "speed" trait. Per generation: predators try to catch prey (success
      // when predator_speed > prey_speed); successful predators reproduce
      // (others starve), caught prey die (uncaught prey reproduce). Result:
      // both populations escalate speed together — the Red Queen hypothesis.
      // Optionally enable a "cost" of speed so neither side can run away to
      // infinity, modeling stable coevolutionary dynamics.
      function CoevolutionLab() {
        var POP_PER_SIDE = 30;
        var huntPressureState = useState(0.6), huntPressure = huntPressureState[0], setHuntPressure = huntPressureState[1];
        var mutSizeState = useState(0.04), mutSize = mutSizeState[0], setMutSize = mutSizeState[1];
        var costState = useState(true), costEnabled = costState[0], setCostEnabled = costState[1];
        var generationState = useState(0), generation = generationState[0], setGeneration = generationState[1];
        var autoRunState = useState(false), autoRun = autoRunState[0], setAutoRun = autoRunState[1];
        var predRef = useRef([]);
        var preyRef = useRef([]);
        var historyRef = useRef([]);
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var lastTickRef = useRef(0);
        var generationRef = useRef(0);
        var huntRef = useRef(huntPressure);
        var mutRef2 = useRef(mutSize);
        var costRef = useRef(costEnabled);
        var autoRunRef4 = useRef(autoRun);
        generationRef.current = generation;
        huntRef.current = huntPressure;
        mutRef2.current = mutSize;
        costRef.current = costEnabled;
        autoRunRef4.current = autoRun;

        var initPopulations = function() {
          var preds = [], prey = [];
          for (var i = 0; i < POP_PER_SIDE; i++) {
            // Both populations start at speed 0.3 (slow ancestors).
            preds.push({
              x: 30 + Math.random() * 720,
              y: 30 + Math.random() * 220,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              speed: clamp(randNormal(0.3, 0.05), 0, 1)
            });
            prey.push({
              x: 30 + Math.random() * 720,
              y: 30 + Math.random() * 220,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              speed: clamp(randNormal(0.3, 0.05), 0, 1)
            });
          }
          predRef.current = preds;
          preyRef.current = prey;
          historyRef.current = [{ gen: 0, predMean: 0.3, preyMean: 0.3, gap: 0, capture: 0 }];
          setGeneration(0);
        };

        // One generational cycle: each predator picks a random prey, hunts it,
        // success scales with speed difference. Caught prey die. Predators
        // that catch food reproduce; those that fail starve. Then prey
        // reproduces back to cap. Mutation noise on both sides.
        var stepGeneration = function(silent) {
          var preds = predRef.current.slice();
          var prey = preyRef.current.slice();
          var hunt = huntRef.current;
          var mut = mutRef2.current;
          var costOn = costRef.current;
          // Each prey can only be eaten once. Track which were eaten.
          var preyAlive = prey.map(function() { return true; });
          var captures = 0;
          var fedPredators = [];
          // Each predator gets one hunt attempt.
          for (var i = 0; i < preds.length; i++) {
            var pred = preds[i];
            // Pick a random LIVING prey. If none left, this pred starves.
            var aliveIdxs = [];
            for (var j = 0; j < prey.length; j++) if (preyAlive[j]) aliveIdxs.push(j);
            if (aliveIdxs.length === 0) continue;
            var target = prey[aliveIdxs[Math.floor(Math.random() * aliveIdxs.length)]];
            // Capture probability scales with speed gap and hunt pressure.
            var gap = pred.speed - target.speed;
            var captureP = clamp(0.5 + gap * 1.5, 0, 1) * hunt + (1 - hunt) * 0.5;
            // Cost-of-speed model: very fast predators tire (small fitness penalty).
            if (costOn) captureP *= (1 - pred.speed * 0.15);
            if (Math.random() < captureP) {
              // Successful hunt: prey dies, predator reproduces.
              var preyIdx = prey.indexOf(target);
              if (preyIdx >= 0) preyAlive[preyIdx] = false;
              fedPredators.push(pred);
              captures++;
            }
          }
          // Predator reproduction: only fed predators reproduce.
          var predNext = fedPredators.slice();
          while (predNext.length < POP_PER_SIDE && fedPredators.length > 0) {
            var parent = fedPredators[Math.floor(Math.random() * fedPredators.length)];
            predNext.push({
              x: parent.x + (Math.random() - 0.5) * 24,
              y: parent.y + (Math.random() - 0.5) * 24,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              speed: clamp(parent.speed + randNormal(0, mut), 0, 1)
            });
          }
          // If no predators survived, seed a fresh group at low speed (mass-extinction recovery).
          if (predNext.length === 0) {
            for (var k = 0; k < POP_PER_SIDE; k++) {
              predNext.push({
                x: 30 + Math.random() * 720, y: 30 + Math.random() * 220,
                vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18,
                speed: clamp(randNormal(0.25, 0.05), 0, 1)
              });
            }
          }
          // Prey reproduction: surviving prey reproduce back to cap.
          var preySurvivors = [];
          for (var s = 0; s < prey.length; s++) if (preyAlive[s]) preySurvivors.push(prey[s]);
          var preyNext = preySurvivors.slice();
          while (preyNext.length < POP_PER_SIDE && preySurvivors.length > 0) {
            var pp = preySurvivors[Math.floor(Math.random() * preySurvivors.length)];
            // Cost: very fast prey expend more energy, slightly fewer offspring (modeled via mutation toward smaller speed).
            var inheritedSpeed = pp.speed + randNormal(0, mut);
            preyNext.push({
              x: pp.x + (Math.random() - 0.5) * 24,
              y: pp.y + (Math.random() - 0.5) * 24,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              speed: clamp(inheritedSpeed, 0, 1)
            });
          }
          if (preyNext.length === 0) {
            // Mass extinction of prey — reseed at low speed (predators may also crash next gen)
            for (var kk = 0; kk < POP_PER_SIDE; kk++) {
              preyNext.push({
                x: 30 + Math.random() * 720, y: 30 + Math.random() * 220,
                vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18,
                speed: clamp(randNormal(0.25, 0.05), 0, 1)
              });
            }
          }
          predRef.current = predNext;
          preyRef.current = preyNext;
          // Compute means + gap for chart.
          var pSum = 0, ySum = 0;
          for (var a = 0; a < predNext.length; a++) pSum += predNext[a].speed;
          for (var b = 0; b < preyNext.length; b++) ySum += preyNext[b].speed;
          var predMean = pSum / predNext.length;
          var preyMean = ySum / preyNext.length;
          var nextGen = generationRef.current + 1;
          historyRef.current.push({ gen: nextGen, predMean: predMean, preyMean: preyMean, gap: predMean - preyMean, capture: captures / POP_PER_SIDE });
          if (historyRef.current.length > 80) historyRef.current.shift();
          generationRef.current = nextGen;
          setGeneration(nextGen);
          if (!silent) announce('Generation ' + nextGen + '. Predator mean speed ' + predMean.toFixed(2) + ', prey mean ' + preyMean.toFixed(2) + '. ' + captures + ' captures.');
        };

        if (predRef.current.length === 0) initPopulations();

        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          var lastT = performance.now();
          var loop = function(now) {
            var dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            if (!_prefersReducedMotion) {
              var move = function(pop) {
                for (var i = 0; i < pop.length; i++) {
                  var c = pop[i];
                  // Faster individuals move more — visualizes the trait.
                  var spdMul = 0.6 + c.speed * 1.4;
                  c.x += c.vx * dt * spdMul;
                  c.y += c.vy * dt * spdMul;
                  if (c.x < 12) { c.x = 12; c.vx = -c.vx; }
                  if (c.x > canvas.width - 12) { c.x = canvas.width - 12; c.vx = -c.vx; }
                  if (c.y < 12) { c.y = 12; c.vy = -c.vy; }
                  if (c.y > canvas.height - 12) { c.y = canvas.height - 12; c.vy = -c.vy; }
                }
              };
              move(predRef.current);
              move(preyRef.current);
            }
            if (autoRunRef4.current && now - lastTickRef.current > 1300) {
              lastTickRef.current = now;
              stepGeneration(true);
            }
            drawCanvas(ctx, canvas.width, canvas.height);
            rafRef.current = requestAnimationFrame(loop);
          };
          lastTickRef.current = performance.now();
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }, []); // eslint-disable-line — RAF reads from refs

        var drawCanvas = function(ctx, W, H) {
          // Tan savanna background to set scene.
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(0, 0, W, H);
          // Sparse grass texture
          ctx.strokeStyle = 'rgba(132, 204, 22, 0.18)';
          ctx.lineWidth = 1;
          for (var g = 0; g < 80; g++) {
            var gx = (g * 47) % W;
            var gy = (g * 73) % H;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + 4, gy - 6);
            ctx.stroke();
          }
          // Render prey first (under), then predators (over)
          var prey = preyRef.current;
          for (var i = 0; i < prey.length; i++) {
            var py = prey[i];
            // Color: blue, intensity by speed (faster = darker)
            var bs = Math.round(lerp(180, 30, py.speed));
            ctx.fillStyle = 'rgb(' + bs + ',' + (bs + 30) + ',220)';
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(py.x, py.y, 5 + py.speed * 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          var preds = predRef.current;
          for (var j = 0; j < preds.length; j++) {
            var pd = preds[j];
            var ps = Math.round(lerp(220, 80, pd.speed));
            ctx.fillStyle = 'rgb(' + ps + ',60,60)';
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pd.x, pd.y, 6 + pd.speed * 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          // Watermark
          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
          ctx.fillText('Generation ' + generationRef.current + '  ·  🟥 ' + preds.length + ' pred  ·  🟦 ' + prey.length + ' prey', 12, H - 10);
        };

        // Live stats
        var pSum = 0, ySum = 0;
        for (var a = 0; a < predRef.current.length; a++) pSum += predRef.current[a].speed;
        for (var b = 0; b < preyRef.current.length; b++) ySum += preyRef.current[b].speed;
        var predMean = predRef.current.length > 0 ? pSum / predRef.current.length : 0;
        var preyMean = preyRef.current.length > 0 ? ySum / preyRef.current.length : 0;
        var gap = predMean - preyMean;

        // SVG history chart of both means + capture rate.
        var renderHistoryChart = function() {
          var hist = historyRef.current;
          var W = 600, H = 180, padL = 36, padR = 12, padT = 12, padB = 24;
          var xMax = Math.max(20, hist.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          var predPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.predMean); }).join(' ');
          var preyPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.preyMean); }).join(' ');
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, '📊 Speed Coevolution Over Time'),
              h('div', { className: 'flex gap-3 text-[10px]' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#dc2626', display: 'inline-block' } }),
                  h('span', null, 'Predator speed')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#3b82f6', display: 'inline-block' } }),
                  h('span', null, 'Prey speed')
                )
              )
            ),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': 'Predator and prey mean speeds over generations. Currently predator ' + predMean.toFixed(2) + ', prey ' + preyMean.toFixed(2) + '.'
            },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              h('text', { x: 4, y: toY(1) + 4, fontSize: '10', fill: '#475569' }, '1.0'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '10', fill: '#475569' }, '0.5'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '10', fill: '#475569' }, '0.0'),
              hist.length > 1 && h('path', { d: predPath, stroke: '#dc2626', strokeWidth: 2, fill: 'none' }),
              hist.length > 1 && h('path', { d: preyPath, stroke: '#3b82f6', strokeWidth: 2, fill: 'none' })
            )
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🐆', title: 'Coevolution Lab' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-red-600 to-orange-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🐆'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'The Red Queen runs faster every year'),
                  h('p', { className: 'text-sm text-orange-50 mt-1' }, '"Now, here, you see, it takes all the running you can do, to keep in the same place." — Lewis Carroll, Through the Looking-Glass. Predators select prey to be faster; prey selects predators to be faster. Both populations escalate together — neither getting ahead. Real examples: cheetahs vs gazelles, bats vs moths, plants vs caterpillars.')
                )
              )
            ),
            // Stats row
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Generation', value: generation, color: 'text-orange-700' }),
              h(StatCard, { label: 'Predator Speed', value: predMean.toFixed(2), color: 'text-red-700' }),
              h(StatCard, { label: 'Prey Speed', value: preyMean.toFixed(2), color: 'text-blue-700' }),
              h(StatCard, { label: 'Gap', value: gap.toFixed(2), color: gap > 0.05 ? 'text-rose-700' : 'text-emerald-700', unit: gap > 0.05 ? 'pred winning' : 'roughly tied' })
            ),
            // Canvas
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('canvas', {
                ref: canvasRef,
                width: 800, height: 280,
                className: 'w-full block',
                role: 'img',
                'aria-label': 'Predator-prey simulation. ' + predRef.current.length + ' red predators chasing ' + preyRef.current.length + ' blue prey. Mean predator speed ' + predMean.toFixed(2) + ', prey ' + preyMean.toFixed(2) + '.'
              })
            ),
            renderHistoryChart(),
            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h(LabeledSlider, {
                label: 'Hunt Pressure',
                value: huntPressure, min: 0.2, max: 1.0, step: 0.05,
                onChange: function(v) { setHuntPressure(v); },
                valueText: 'Pressure = ' + huntPressure.toFixed(2),
                accent: 'accent-red-500',
                hint: 'How effective predators are at converting speed advantage into kills. Higher = stronger selection on both sides.'
              }),
              h(LabeledSlider, {
                label: 'Mutation Size',
                value: mutSize, min: 0.01, max: 0.12, step: 0.01,
                onChange: function(v) { setMutSize(v); },
                valueText: 'σ = ' + mutSize.toFixed(2),
                accent: 'accent-violet-500',
                hint: 'How much offspring speed varies from parent. Higher = faster adaptation but messier dynamics.'
              })
            ),
            // Cost toggle
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 flex items-center justify-between gap-3' },
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Cost of Speed'),
                h('div', { className: 'text-sm text-slate-600' }, costEnabled ? 'ON — Very fast predators tire easily (mild fitness penalty). This stabilizes the arms race at a finite speed.' : 'OFF — No cost. Speeds keep rising forever, hitting the simulation\'s [0, 1] cap.')
              ),
              h('button', {
                onClick: function() { setCostEnabled(!costEnabled); },
                'aria-pressed': costEnabled,
                className: 'px-4 py-2 rounded-lg font-bold ' + (costEnabled ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, costEnabled ? '✓ Cost Enabled' : 'Cost Disabled')
            ),
            // Controls
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: function() { stepGeneration(false); },
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white shadow-lg'
              }, '⏭ Step 1 Generation'),
              h('button', {
                onClick: function() { for (var i = 0; i < 10; i++) stepGeneration(true); },
                disabled: autoRun,
                className: 'px-5 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white shadow-lg'
              }, '⏭⏭ Step 10'),
              h('button', {
                onClick: function() { setAutoRun(!autoRun); },
                'aria-pressed': autoRun,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (autoRun ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white')
              }, autoRun ? '⏸ Stop Auto-Run' : '▶ Auto-Run'),
              h('button', {
                onClick: initPopulations,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Reset')
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-red-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-red-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Watch the arms race: '), 'Default settings, Auto-Run for 30 generations. Both lines climb together — neither gets meaningfully ahead. The GAP stays small even though absolute speeds rise dramatically.'),
                h('li', null, h('strong', null, 'Cost OFF — runaway: '), 'Disable Cost of Speed. Auto-Run for 50 generations. Speeds hit the simulation cap (1.0) and stay there. In nature, real costs (energy, predation visibility, joint stress) prevent this — which is why cheetahs aren\'t infinitely fast.'),
                h('li', null, h('strong', null, 'Hunt pressure crash: '), 'Reset, set Hunt Pressure to 1.0 (max). Within ~10 generations one side often crashes — usually prey, since they\'re selected harder. Population recovery takes many generations.'),
                h('li', null, h('strong', null, 'Hunt pressure off: '), 'Reset, set Hunt Pressure to 0.2 (low). Both populations stay at low speed — without selection pressure, there\'s no arms race.'),
                h('li', null, h('strong', null, 'High mutation: '), 'Set Mutation Size to 0.12 (high). The dynamics get noisier but the arms race speeds up. Real mutation rates are lower; here exaggerated to be visible on the timescale of a classroom session.')
              )
            ),
            // Real-world examples
            h('div', { className: 'bg-red-50 border border-red-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-red-800 mb-2' }, '📖 Real-world coevolution'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Bats vs moths: '), 'Bats evolved echolocation. Moths evolved ears tuned to detect bat calls — and SOMETIMES, jamming clicks that interfere with bat sonar. Bats then evolved frequency-shifting calls to defeat moth jamming. Layer after layer of tit-for-tat innovation.'),
                h('p', null, h('strong', null, 'Cheetahs vs gazelles: '), 'Cheetahs reach 60+ mph but their hunts succeed only ~50% of the time — and that\'s with a 30% chance of injury per chase. Gazelles aren\'t much slower in absolute terms; the race is close.'),
                h('p', null, h('strong', null, 'Plants vs herbivores: '), 'Plants evolved chemical defenses (caffeine, capsaicin, alkaloids). Some insects evolved enzymes to detoxify those defenses. Plants evolved BETTER toxins. Caterpillars evolved BETTER detox. This is happening right now in milkweed-monarch interactions.'),
                h('p', null, h('strong', null, 'Maine relevance: '), 'White-tailed deer browse pressure on Maine forests has driven plants like striped maple to invest more in chemical defenses (high tannins). The deer compensate by being less selective. Deer-tick coevolution is also active: ticks evolved to detect host CO2 plumes; deer evolved more vigorous grooming.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-fuchsia-50 border border-fuchsia-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '💊'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You just saw two species evolving against each other. The Antibiotic Resistance Lab shows the SAME dynamic on a much faster timescale: bacteria vs antibiotics is just predator-prey at the molecular level.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS2-7', 'HS-LS4-2', 'HS-LS4-5'],
              questions: [
                'In the "Cost OFF" run, speeds rise to the cap. Why does this NOT happen in real-world predator-prey systems?',
                'The Red Queen hypothesis says you have to keep running to stay in place. How does this apply to immune systems vs pathogens?',
                'Both predators and prey reach much higher speeds than they started — yet the gap stays small. So what was the point of the arms race?',
                'How is coevolution different from a simple environmental selection (like the Selection Sandbox)?'
              ],
              misconceptions: [
                '"In a long arms race, one side eventually wins." Coevolution doesn\'t produce winners — both sides escalate continuously. The cheetah is hugely faster than its ancestor and so are its prey.',
                '"Coevolution always means antagonism." It also covers MUTUALISMS (plant-pollinator, gut bacteria-host). Both species evolving in response to each other = coevolution, regardless of whether they\'re fighting or cooperating.'
              ],
              extension: 'Pick a coevolutionary pair (bats/moths, plants/herbivores, parasites/hosts, pollinators/flowers). Research one specific innovation and the matching counter-innovation.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // DISCOVERY TIMELINE — history of evolution science
      // ─────────────────────────────────────────────────────
      // Vertical timeline of major figures and discoveries from 1735 to today.
      // Each entry has a portrait emoji, name, year, contribution, and click-to-
      // expand context. Deliberate emphasis on under-recognized figures: Wallace
      // (independently co-discovered selection but Darwin gets the credit),
      // Mendel (ignored for 35 years), Margulis (ridiculed for endosymbiosis),
      // McClintock (transposons, 30-year delay before Nobel), Franklin (DNA).
      function DiscoveryTimeline() {
        var openState = useState(null), open = openState[0], setOpen = openState[1];

        var ENTRIES = [
          {
            id: 'linnaeus', year: 1735, name: 'Carl Linnaeus', portrait: '🌿', country: 'Sweden',
            headline: 'Systematic naming for all life',
            short: 'Created the binomial nomenclature (Genus species) and the hierarchical taxonomy (kingdom, phylum, class, order, family, genus, species) we still use.',
            why: 'Linnaeus didn\'t believe in evolution — he thought species were fixed. But his classification system inadvertently exposed the patterns of relatedness between species, providing the framework Darwin would later use to describe how species are related by descent. You can\'t see "tree-like" patterns of life until you have a system for naming and grouping.',
            tag: 'foundations'
          },
          {
            id: 'lamarck', year: 1809, name: 'Jean-Baptiste Lamarck', portrait: '🦒', country: 'France',
            headline: 'First explicit theory of evolution',
            short: 'Proposed that organisms acquire traits during their lifetime and pass them to offspring (e.g., giraffes stretched necks → longer-necked babies). The mechanism is wrong, but the IDEA that species change over time was revolutionary.',
            why: 'Lamarck is often unfairly mocked for the "stretching necks" example, but he was the first major scientist to publicly argue that species evolve — fifty years before Darwin. His mechanism was wrong (acquired traits aren\'t inherited), but his framing of life as dynamic and changing prepared the ground for Darwin\'s actual mechanism.',
            tag: 'foundations'
          },
          {
            id: 'darwinwallace', year: 1858, name: 'Charles Darwin & Alfred Russel Wallace', portrait: '🐢', country: 'UK',
            headline: 'Natural selection — together, often forgotten',
            short: 'Wallace independently arrived at the theory of evolution by natural selection while collecting specimens in the Malay Archipelago. He sent his manuscript to Darwin in 1858. They presented jointly at the Linnean Society in 1858; Darwin\'s "On the Origin of Species" came in 1859.',
            why: 'Wallace usually gets pushed out of the textbook. But in 1858, two scientists — working independently from opposite hemispheres — converged on the same explanation. That convergent insight is itself evidence the theory was capturing something real about nature, not just one person\'s pet idea. Wallace\'s contribution included some ideas Darwin missed (notably the role of geography in speciation).',
            tag: 'foundations'
          },
          {
            id: 'mendel', year: 1866, name: 'Gregor Mendel', portrait: '🌱', country: 'Austrian Empire',
            headline: 'Genetics — ignored for 35 years',
            short: 'A monk in what\'s now the Czech Republic crossed pea plants for 8 years and worked out the rules of inheritance: traits pass via discrete particles (genes) following predictable ratios. He published in 1866. Almost nobody read it.',
            why: 'Mendel\'s work was the missing piece Darwin needed: HOW does inheritance work without blending? Darwin never knew. Mendel\'s paper sat unread until 1900 when three biologists independently rediscovered it. Mendel never knew his work would solve evolution\'s biggest puzzle. The 35-year delay shows that being right is necessary but not sufficient — you also need to be heard.',
            tag: 'foundations'
          },
          {
            id: 'weismann', year: 1883, name: 'August Weismann', portrait: '🧬', country: 'Germany',
            headline: 'Refuting Lamarckian inheritance',
            short: 'Conducted the famous mouse-tail experiment: cut the tails off 5 generations of mice. Their offspring still had normal tails. Demonstrated that acquired traits aren\'t inherited — the germline (sperm/eggs) is separate from somatic cells (body cells).',
            why: 'Killed Lamarckism for good. Established the "Weismann barrier": changes to your body during life don\'t reach your DNA. This is why a weightlifter\'s kids aren\'t born buff. The mouse-tail experiment is brutal but pivotal — it took an empirical demonstration to dislodge the intuitive (but wrong) Lamarckian theory.',
            tag: 'foundations'
          },
          {
            id: 'rediscovery', year: 1900, name: 'de Vries · Correns · Tschermak', portrait: '🌾', country: 'Multiple',
            headline: 'Mendel rediscovered — three times in one year',
            short: 'Three botanists independently rediscovered the principles of inheritance Mendel had published 35 years earlier. They all then found Mendel\'s paper and credited him. Genetics was born.',
            why: 'A striking pattern in science history: when an idea\'s time comes, multiple people often arrive at it simultaneously (cf. Darwin & Wallace). Three rediscoveries in one year suggest the ground was ready and the tools were available. The Modern Synthesis would not have been possible without this rediscovery.',
            tag: 'genetics'
          },
          {
            id: 'popgenetics', year: 1918, name: 'Fisher · Haldane · Wright', portrait: '🧮', country: 'UK / USA',
            headline: 'Population genetics — math meets biology',
            short: 'Three founders independently developed the mathematical framework showing that Mendelian inheritance + natural selection = evolution at the population level. Hardy-Weinberg equilibrium, fixation probability, the cost of natural selection.',
            why: 'In the early 1900s, biostatisticians and geneticists had been arguing for 30 years about whether Mendelian inheritance and Darwinian evolution were even compatible. Fisher\'s 1918 paper "The Correlation Between Relatives on the Supposition of Mendelian Inheritance" mathematically proved they were. This work directly underlies the Hardy-Weinberg lab in this tool.',
            tag: 'genetics'
          },
          {
            id: 'modernsynthesis', year: 1937, name: 'Dobzhansky · Mayr · Simpson · Stebbins', portrait: '📚', country: 'USA',
            headline: 'The Modern Synthesis',
            short: 'A unification of Darwinian natural selection, Mendelian genetics, population genetics, paleontology, and systematics into a single coherent framework. Dobzhansky\'s "Genetics and the Origin of Species" (1937), Mayr\'s "Systematics and the Origin of Species" (1942), Simpson\'s "Tempo and Mode in Evolution" (1944).',
            why: 'This is what most working biologists mean by "evolution." It\'s not Darwin\'s theory alone — it\'s the integration of Darwin + Mendel + population genetics + decades of fossil and field data. The Modern Synthesis is the foundation that AP Biology and most college bio courses teach today.',
            tag: 'synthesis'
          },
          {
            id: 'mcclintock', year: 1948, name: 'Barbara McClintock', portrait: '🌽', country: 'USA',
            headline: 'Jumping genes — ignored for 30 years',
            short: 'McClintock discovered transposable elements ("jumping genes") in maize — DNA sequences that move around within a genome. Her contemporaries didn\'t believe her or understand the implications. She received the Nobel Prize in 1983 — 35 years later.',
            why: 'McClintock\'s work upended the notion that genomes are static blueprints. Transposable elements turn out to be widespread and crucial for evolution — they\'re a major source of genetic variation, gene regulation changes, and even speciation. Her 35-year wait for recognition mirrors Mendel\'s 35-year delay. Worth noting the gendered history: she did this work in an era when women were systematically excluded from senior science roles.',
            tag: 'genetics'
          },
          {
            id: 'franklinwatsoncrick', year: 1953, name: 'Franklin · Wilkins · Watson · Crick', portrait: '🧬', country: 'UK',
            headline: 'DNA structure — and a credit dispute',
            short: 'The double-helix structure of DNA was solved using Rosalind Franklin\'s X-ray diffraction images (her famous "Photograph 51"). Watson and Crick saw the photo without her permission via Wilkins. Watson, Crick, and Wilkins won the 1962 Nobel; Franklin had died in 1958.',
            why: 'DNA structure → genetic code → molecular evolution. This is the foundation of every modern technique for measuring evolution: comparing DNA sequences, computing molecular clocks, building molecular phylogenies. The credit dispute is a famous example of how scientific recognition can fail to track scientific contribution — Franklin\'s key data was used without consent.',
            tag: 'molecular'
          },
          {
            id: 'kimura', year: 1968, name: 'Motoo Kimura', portrait: '🎲', country: 'Japan',
            headline: 'Neutral theory — most molecular evolution is drift',
            short: 'Kimura\'s neutral theory: at the molecular level, most evolutionary change is due to genetic drift acting on neutral (or nearly neutral) mutations — not selection. Selection still drives adaptive change, but most variation we SEE in DNA sequences is selection-blind random sampling.',
            why: 'A genuine paradigm shift. Until 1968, most biologists assumed everything was under selection. Kimura\'s math forced the field to accept that random drift is the dominant force at the molecular level — making the Genetic Drift module in this tool not a quirky exception but a major mechanism.',
            tag: 'molecular'
          },
          {
            id: 'margulis', year: 1967, name: 'Lynn Margulis', portrait: '🦠', country: 'USA',
            headline: 'Endosymbiotic theory — mitochondria were bacteria',
            short: 'Margulis argued that mitochondria and chloroplasts were originally free-living bacteria that got swallowed by larger cells ~1.5 billion years ago and never left. Her 1967 paper was rejected by 15 journals. She finally published it, and was ridiculed for years.',
            why: 'Endosymbiotic theory is now a cornerstone of cell biology. Mitochondria have their own DNA, their own ribosomes, and their own membrane structure — all matching free-living bacteria. Margulis was right; the field was wrong. The story is also a reminder of how the establishment can resist big new ideas, especially from women working outside elite institutions.',
            tag: 'molecular'
          },
          {
            id: 'punkeq', year: 1972, name: 'Eldredge & Gould', portrait: '🪨', country: 'USA',
            headline: 'Punctuated equilibrium',
            short: 'Eldredge and Gould proposed that the fossil record shows long periods of stasis (no change) interrupted by rapid bursts of speciation — not the slow continuous gradualism Darwin emphasized. Big debate ensued.',
            why: 'Often misrepresented as "anti-Darwinian" — it isn\'t. Punctuated equilibrium just refines the timing: evolution happens, but in spurts, not at constant rate. Most working evolutionary biologists today accept some role for both gradualism and punctuated change. The debate was a healthy correction within the Modern Synthesis, not a refutation.',
            tag: 'synthesis'
          },
          {
            id: 'genomics', year: 2001, name: 'Human Genome Project', portrait: '🧬', country: 'International',
            headline: 'The genome era opens',
            short: 'The full human genome sequence was published in 2001 (draft) and 2003 (complete). Within a decade, sequencing other species became fast and cheap. Now we have genomes for thousands of species and can directly compare them.',
            why: 'Phylogenetics shifted from morphological inference to direct DNA comparison. Suddenly we could see exactly how many mutations separate human from chimp (~1.5%), human from mouse (~15%), human from yeast (still substantial overlap). The Phylo Tree Builder module\'s "molecular vs morphological evidence" toggle reflects this shift.',
            tag: 'molecular'
          },
          {
            id: 'modern', year: 2025, name: 'Today', portrait: '🔬', country: 'Global',
            headline: 'Where we are now',
            short: 'Active research areas: how the gut microbiome shapes host evolution, ancient-DNA studies (Neanderthals, mammoths), CRISPR as both a tool and a window into bacterial evolution, the role of regulatory genes (evo-devo), epigenetics and trans-generational effects, evolution of behavior, evolution of language, evolution of disease.',
            why: 'Evolution remains one of the most active fields in biology. New tools (sequencing, computing, ancient-DNA techniques) keep opening questions Darwin couldn\'t imagine. Most importantly: the basics aren\'t in dispute. Variation, selection, inheritance, common descent — these are as solid as gravity. The frontier is filling in detail and tackling new questions.',
            tag: 'modern'
          }
        ];

        var TAG_LABELS = {
          foundations: { label: 'Foundations', color: 'bg-stone-200 text-stone-800' },
          genetics: { label: 'Genetics', color: 'bg-violet-200 text-violet-800' },
          synthesis: { label: 'Synthesis', color: 'bg-emerald-200 text-emerald-800' },
          molecular: { label: 'Molecular', color: 'bg-cyan-200 text-cyan-800' },
          modern: { label: 'Modern', color: 'bg-rose-200 text-rose-800' }
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '📜', title: 'Discovery Timeline' }),
          h('div', { className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-stone-700 to-stone-900 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-5xl' }, '📜'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black' }, 'How we learned what we know'),
                  h('p', { className: 'text-sm text-stone-200 mt-1' }, '290 years of figuring out evolution. Darwin gets the textbook spotlight, but he didn\'t do this alone — and many key figures (Wallace, Mendel, Margulis, McClintock, Franklin) were ignored or pushed aside in their time. Click any card to read more.')
                )
              )
            ),
            // Timeline
            h('div', { className: 'space-y-3 relative' },
              // Vertical line down the left
              h('div', {
                'aria-hidden': true,
                className: 'absolute left-6 top-2 bottom-2 w-1 bg-gradient-to-b from-stone-300 via-violet-300 to-rose-300 rounded',
              }),
              ENTRIES.map(function(entry) {
                var isOpen = open === entry.id;
                var tag = TAG_LABELS[entry.tag] || { label: entry.tag, color: 'bg-slate-200 text-slate-800' };
                return h('div', { key: entry.id, className: 'relative pl-16' },
                  // Year dot
                  h('div', {
                    'aria-hidden': true,
                    className: 'absolute left-0 top-2 w-12 h-12 rounded-full bg-white border-2 border-stone-400 shadow-md flex items-center justify-center text-2xl'
                  }, entry.portrait),
                  // Card
                  h('button', {
                    onClick: function() { setOpen(isOpen ? null : entry.id); },
                    'aria-expanded': isOpen,
                    'aria-label': entry.year + ': ' + entry.name + ' — ' + entry.headline + (isOpen ? ' (expanded)' : ' (click to expand)'),
                    className: 'w-full text-left bg-white rounded-xl shadow border-2 ' + (isOpen ? 'border-stone-500' : 'border-slate-200 hover:border-stone-300') + ' p-4 transition-colors'
                  },
                    h('div', { className: 'flex items-start justify-between gap-3 mb-1' },
                      h('div', null,
                        h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2' },
                          h('span', null, entry.year),
                          entry.country && h('span', { className: 'font-medium text-stone-500' }, '· ' + entry.country),
                          h('span', { className: 'px-1.5 py-0.5 rounded ' + tag.color + ' font-bold' }, tag.label)
                        ),
                        h('div', { className: 'text-base font-black text-slate-800 mt-1' }, entry.name),
                        h('div', { className: 'text-sm font-semibold text-stone-700' }, entry.headline)
                      ),
                      h('span', { className: 'text-stone-400 text-lg flex-shrink-0' }, isOpen ? '−' : '+')
                    ),
                    h('div', { className: 'text-sm text-slate-700 leading-relaxed' }, entry.short),
                    isOpen && h('div', {
                      'aria-live': 'polite',
                      className: 'mt-3 pt-3 border-t border-slate-200 text-sm text-slate-700 leading-relaxed'
                    },
                      h('div', { className: 'text-xs font-bold uppercase tracking-wider text-stone-700 mb-2' }, '📚 Why this matters'),
                      h('p', null, entry.why)
                    )
                  )
                );
              })
            ),
            // Reflection callout
            h('div', { className: 'bg-stone-50 border border-stone-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-stone-800 mb-2' }, '🤔 Patterns to notice'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Multiple discovery: '), 'Major ideas often emerge from multiple people simultaneously (Darwin & Wallace 1858, three rediscoverers of Mendel in 1900, Fisher/Haldane/Wright in the 1920s). When an idea\'s time comes, the necessary tools and questions are usually shared.'),
                h('p', null, h('strong', null, 'Long delays: '), 'Mendel waited 35 years for recognition. McClintock waited 35 years for the Nobel. Margulis was rejected 15 times. Franklin died before her contribution was acknowledged. Being right early is hard.'),
                h('p', null, h('strong', null, 'Resistance to new ideas: '), 'Each major step (Darwin\'s natural selection, Mendel\'s discrete inheritance, Margulis\'s endosymbiosis, Eldredge & Gould\'s punctuated equilibrium) was met with strong opposition before being accepted. Healthy skepticism is part of how science self-corrects — but it can also slow down ideas that turn out to be right.'),
                h('p', null, h('strong', null, 'Underrepresented contributions: '), 'Wallace co-discovered selection but Darwin gets the credit. Franklin\'s data unlocked DNA but Watson and Crick got the Nobel. Margulis and McClintock did paradigm-shifting work despite being marginalized. The textbook story tends to compress messy history into "hero scientists" — the messier reality is more interesting and more honest.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-slate-100 border border-slate-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '❓'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You\'ve seen the people who built the theory. The Misconceptions Quiz tests how well the IDEAS landed — including ones the textbook story sometimes obscures.'
              )
            ),
            // Teacher Notes
            h(TeacherNotes, {
              standards: ['HS-LS4-1', 'HS-LS4-2', 'NOS (Nature of Science)'],
              questions: [
                'What does it tell us about science that Darwin and Wallace independently arrived at the same theory in 1858?',
                'Mendel\'s work was ignored for 35 years. McClintock\'s for 35 years. Why does it take so long for paradigm-shifting ideas to be accepted?',
                'Pick one figure (Lamarck, Wallace, Margulis, McClintock, Franklin) whose contribution gets less credit than Darwin\'s. Why do you think that is?',
                'How does the messy history of these discoveries compare to the way evolution is usually presented in textbooks?'
              ],
              misconceptions: [
                '"Darwin invented evolution." Lamarck published an evolutionary theory 50 years before Darwin. Darwin\'s contribution was the MECHANISM (natural selection), not the IDEA of species change.',
                '"Science marches forward in obvious progress." Real science is full of resistance, delayed credit, lucky breaks, and contested priority. The cleaner textbook version misses how human and contingent the process is.',
                '"Big ideas come from lone geniuses." Most major evolutionary insights came from multiple people simultaneously, or from teams. The "lone genius" framing is rarely accurate.'
              ],
              extension: 'Pick one of the underrepresented figures (Wallace, Mendel, Franklin, Margulis, McClintock) and write a 1-page biography focused on what they contributed and why their recognition was delayed or partial.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // CLIMATE PRESSURE LAB — student-as-climate
      // ─────────────────────────────────────────────────────
      // The third interactive student-as-selection-pressure sim. Population
      // has a continuous "tolerance" trait (0 = warm-loving, 1 = cold-loving).
      // Student drags a temperature slider; mismatch between tolerance and
      // current temperature drops survival probability. The pedagogical point:
      // the RATE of temperature change determines whether the population
      // adapts (slow) or goes extinct (fast). Real-world tie-in to current
      // climate-change biology.
      function ClimatePressureLab() {
        var POP_CAP = 60;
        var EXTINCTION_THRESHOLD = 5;

        var temperatureState = useState(0.5), temperature = temperatureState[0], setTemperature = temperatureState[1];
        var generationState = useState(0), generation = generationState[0], setGeneration = generationState[1];
        var autoRunState = useState(false), autoRun = autoRunState[0], setAutoRun = autoRunState[1];
        var extinctState = useState(false), extinct = extinctState[0], setExtinct = extinctState[1];
        var mutSizeState = useState(0.04), mutSize = mutSizeState[0], setMutSize = mutSizeState[1];

        var popRef = useRef([]);
        var historyRef = useRef([]);
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var lastTickRef = useRef(0);
        var temperatureRef = useRef(temperature);
        var mutRef = useRef(mutSize);
        var autoRunRef = useRef(autoRun);
        var extinctRef = useRef(extinct);
        temperatureRef.current = temperature;
        mutRef.current = mutSize;
        autoRunRef.current = autoRun;
        extinctRef.current = extinct;

        var initPopulation = function() {
          var pop = [];
          for (var i = 0; i < POP_CAP; i++) {
            pop.push({
              id: 'c' + i + '_' + Math.random(),
              x: 30 + Math.random() * 720,
              y: 30 + Math.random() * 220,
              vx: (Math.random() - 0.5) * 14,
              vy: (Math.random() - 0.5) * 14,
              tolerance: clamp(randNormal(0.5, 0.08), 0, 1),
              age: 0
            });
          }
          popRef.current = pop;
          var sum = 0; for (var k = 0; k < pop.length; k++) sum += pop[k].tolerance;
          historyRef.current = [{ gen: 0, mean: sum / pop.length, popSize: pop.length, temp: temperature }];
          setGeneration(0);
          setExtinct(false);
        };

        // One generation tick: each creature's survival probability falls off
        // sharply with distance from current temperature. Survivors reproduce.
        var stepGeneration = function() {
          if (extinctRef.current) return;
          var temp = temperatureRef.current;
          var mut = mutRef.current;
          var pop = popRef.current.slice();
          // Survival: Gaussian falloff from |tolerance - temp|
          // Sharper than Selection Sandbox so rate-of-change actually bites.
          var survivors = [];
          for (var i = 0; i < pop.length; i++) {
            var c = pop[i];
            var d = Math.abs(c.tolerance - temp);
            // Death increases steeply when d > 0.15
            var survivalP = Math.exp(-Math.pow(d / 0.18, 2));
            if (Math.random() < survivalP) survivors.push(c);
          }
          // Check for extinction
          if (survivors.length < EXTINCTION_THRESHOLD) {
            popRef.current = survivors;
            setExtinct(true);
            setAutoRun(false);
            announce('Extinction event! Population dropped to ' + survivors.length + '. Climate changed faster than they could adapt.');
            return;
          }
          // Reproduce back to cap
          var next = survivors.slice();
          while (next.length < POP_CAP) {
            var parent = survivors[Math.floor(Math.random() * survivors.length)];
            next.push({
              id: 'c' + next.length + '_' + (generation + 1) + '_' + Math.random(),
              x: parent.x + (Math.random() - 0.5) * 24,
              y: parent.y + (Math.random() - 0.5) * 24,
              vx: (Math.random() - 0.5) * 14,
              vy: (Math.random() - 0.5) * 14,
              tolerance: clamp(parent.tolerance + randNormal(0, mut), 0, 1),
              age: 0
            });
          }
          popRef.current = next;
          var sum = 0; for (var k = 0; k < next.length; k++) sum += next[k].tolerance;
          var meanNext = sum / next.length;
          var nextGen = generation + 1;
          historyRef.current.push({ gen: nextGen, mean: meanNext, popSize: next.length, temp: temp, survivors: survivors.length });
          if (historyRef.current.length > 80) historyRef.current.shift();
          setGeneration(nextGen);
        };

        if (popRef.current.length === 0) initPopulation();

        // RAF loop: bouncing motion + auto-run tick (~1 generation per second).
        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          var lastT = performance.now();
          var loop = function(now) {
            var dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            if (!_prefersReducedMotion && !extinctRef.current) {
              var pop = popRef.current;
              for (var i = 0; i < pop.length; i++) {
                var c = pop[i];
                c.x += c.vx * dt;
                c.y += c.vy * dt;
                if (c.x < 12) { c.x = 12; c.vx = -c.vx; }
                if (c.x > canvas.width - 12) { c.x = canvas.width - 12; c.vx = -c.vx; }
                if (c.y < 12) { c.y = 12; c.vy = -c.vy; }
                if (c.y > canvas.height - 12) { c.y = canvas.height - 12; c.vy = -c.vy; }
              }
            }
            if (autoRunRef.current && now - lastTickRef.current > 900) {
              lastTickRef.current = now;
              stepGeneration();
            }
            drawCanvas(ctx, canvas.width, canvas.height);
            rafRef.current = requestAnimationFrame(loop);
          };
          lastTickRef.current = performance.now();
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }, []); // eslint-disable-line — RAF reads from refs

        // Tolerance → color: same scheme as the temperature scale itself.
        // Cold-tolerant (high tolerance, ~1.0) = blue; warm-tolerant (~0.0) = red.
        // So creatures whose color matches the background are "in their zone."
        function tempColor(t) {
          // t=0 (warm) → red, t=1 (cold) → blue
          var rr = Math.round(lerp(220, 56, t));
          var gg = Math.round(lerp(60, 122, t));
          var bb = Math.round(lerp(35, 220, t));
          return 'rgb(' + rr + ',' + gg + ',' + bb + ')';
        }

        var drawCanvas = function(ctx, W, H) {
          var temp = temperatureRef.current;
          // Background gradient — top is "sky" tinted by current temp, bottom is "ground"
          var bgColor = tempColor(1 - temp); // invert: hot bg = red, cold bg = blue
          var grad = ctx.createLinearGradient(0, 0, 0, H);
          // Lighten the bg color for the top
          grad.addColorStop(0, bgColor);
          grad.addColorStop(1, '#1e293b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
          // Subtle horizon line
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, H * 0.7);
          ctx.lineTo(W, H * 0.7);
          ctx.stroke();
          // Render creatures — color them by their tolerance trait
          var pop = popRef.current;
          for (var i = 0; i < pop.length; i++) {
            var c = pop[i];
            var d = Math.abs(c.tolerance - temp);
            var stressed = d > 0.2;
            ctx.fillStyle = tempColor(c.tolerance);
            ctx.strokeStyle = stressed ? '#fef08a' : '#0f172a';
            ctx.lineWidth = stressed ? 2 : 1;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 7, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            // Stressed indicator: small "!" above
            if (stressed) {
              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 10px monospace';
              ctx.fillText('!', c.x - 2, c.y - 12);
            }
          }
          // Watermark — gen + temp
          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillText('Gen ' + generation + '  ·  Temp ' + temp.toFixed(2) + '  ·  Pop ' + pop.length, 14, H - 12);
          if (extinctRef.current) {
            ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
            ctx.fillRect(W / 2 - 130, H / 2 - 36, 260, 72);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💀  EXTINCTION  💀', W / 2, H / 2 - 6);
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('Climate changed too fast', W / 2, H / 2 + 14);
            ctx.textAlign = 'left';
          }
        };

        // History line chart: temperature track + population mean tolerance
        var renderChart = function() {
          var hist = historyRef.current;
          var W = 600, H = 180, padL = 36, padR = 12, padT = 12, padB = 24;
          var xMax = Math.max(40, hist.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          var tempPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.temp); }).join(' ');
          var meanPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.mean); }).join(' ');
          // Population size: separate scaling
          var popPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.popSize / POP_CAP); }).join(' ');
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Temperature, Tolerance, & Population'),
              h('div', { className: 'flex gap-3 text-[10px]' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#dc2626', display: 'inline-block' } }),
                  h('span', null, 'Temp')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#3b82f6', display: 'inline-block' } }),
                  h('span', null, 'Tolerance mean')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#10b981', display: 'inline-block' } }),
                  h('span', null, 'Pop size')
                )
              )
            ),
            h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', role: 'img', 'aria-label': 'Temperature, mean tolerance, and population size over generations.' },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: toY(0.5), x2: W - padR, y2: toY(0.5), stroke: '#cbd5e1', strokeDasharray: '3,3' }),
              h('text', { x: 4, y: toY(1) + 4, fontSize: '10', fill: '#475569' }, '1.0'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '10', fill: '#475569' }, '0.5'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '10', fill: '#475569' }, '0.0'),
              hist.length > 1 && h('path', { d: tempPath, stroke: '#dc2626', strokeWidth: 2.4, fill: 'none' }),
              hist.length > 1 && h('path', { d: meanPath, stroke: '#3b82f6', strokeWidth: 2, fill: 'none' }),
              hist.length > 1 && h('path', { d: popPath, stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '3,2', fill: 'none' })
            ),
            h('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'When temperature (red) and tolerance mean (blue) move together, the population is adapting. When they DIVERGE, the population is in trouble.')
          );
        };

        // Compute live stats
        var pop = popRef.current;
        var sum = 0; for (var i = 0; i < pop.length; i++) sum += pop[i].tolerance;
        var mean = pop.length > 0 ? sum / pop.length : 0;
        var lag = Math.abs(mean - temperature);
        var stressed = pop.filter(function(c) { return Math.abs(c.tolerance - temperature) > 0.2; }).length;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🌡️', title: 'Climate Pressure Lab' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-orange-500 to-red-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🌡️'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'You ARE the climate'),
                  h('p', { className: 'text-sm text-orange-50 mt-1' }, 'Drag the temperature slider. Each generation, creatures whose tolerance trait matches the current temperature survive better. If you change temperature SLOWLY, the population can adapt by selection. If you change too FAST, they go extinct. The lesson: the RATE of climate change matters more than the magnitude.')
                )
              )
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Generation', value: generation, color: 'text-orange-700' }),
              h(StatCard, { label: 'Population', value: pop.length + ' / ' + POP_CAP, color: pop.length < 20 ? 'text-rose-700' : 'text-emerald-700' }),
              h(StatCard, { label: 'Tolerance Lag', value: lag.toFixed(2), color: lag > 0.2 ? 'text-rose-700' : lag > 0.1 ? 'text-amber-700' : 'text-emerald-700', unit: lag > 0.2 ? 'critical!' : lag > 0.1 ? 'stressed' : 'matched' }),
              h(StatCard, { label: 'Stressed', value: stressed + ' / ' + pop.length, color: stressed > pop.length / 3 ? 'text-rose-700' : 'text-slate-600' })
            ),
            // Canvas
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('canvas', {
                ref: canvasRef,
                width: 800, height: 280,
                className: 'w-full block',
                role: 'img',
                'aria-label': 'Climate landscape with ' + pop.length + ' creatures. Temperature ' + temperature.toFixed(2) + '. Mean tolerance ' + mean.toFixed(2) + '.' + (extinct ? ' EXTINCTION OCCURRED.' : '')
              })
            ),
            // Big temperature slider — the main interaction
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
              h('label', { className: 'flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' },
                h('span', null, '🌡️ Temperature (drag this!)'),
                h('span', { className: 'normal-case font-semibold ' + (lag > 0.2 ? 'text-rose-700' : lag > 0.1 ? 'text-amber-700' : 'text-emerald-700') },
                  temperature.toFixed(2) + ' (population mean: ' + mean.toFixed(2) + ')'
                )
              ),
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl' }, '❄️'),
                h('input', {
                  type: 'range',
                  min: 0, max: 1, step: 0.01,
                  value: temperature,
                  onChange: function(e) {
                    var v = parseFloat(e.target.value);
                    if (isFinite(v)) setTemperature(v);
                  },
                  'aria-valuetext': 'Temperature ' + temperature.toFixed(2) + (lag > 0.2 ? ', population in critical lag' : lag > 0.1 ? ', population stressed' : ', population matched'),
                  className: 'flex-1 accent-orange-500',
                  style: { height: '24px' }
                }),
                h('span', { className: 'text-2xl' }, '🔥')
              ),
              h('div', { className: 'text-[10px] text-slate-600 mt-2 italic' }, 'Slide slowly while the simulation runs to let the population catch up. Slide fast to force extinction.')
            ),
            // Mutation rate slider
            h(LabeledSlider, {
              label: 'Mutation Size (offspring trait variation)',
              value: mutSize, min: 0.01, max: 0.12, step: 0.01,
              onChange: function(v) { setMutSize(v); },
              valueText: 'σ = ' + mutSize.toFixed(2),
              accent: 'accent-violet-500',
              hint: 'Higher mutation rate = faster adaptation. Population can survive faster temperature changes when offspring vary more from parents.'
            }),
            // Controls
            h('div', { className: 'flex flex-wrap gap-3 justify-center' },
              h('button', {
                onClick: function() { stepGeneration(); },
                disabled: autoRun || extinct,
                className: 'px-5 py-3 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white shadow-lg'
              }, '⏭ Step 1 Generation'),
              h('button', {
                onClick: function() { setAutoRun(!autoRun); },
                disabled: extinct,
                'aria-pressed': autoRun,
                className: 'px-5 py-3 rounded-xl font-bold shadow-lg ' + (autoRun ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white')
              }, autoRun ? '⏸ Stop Auto-Run' : '▶ Auto-Run'),
              h('button', {
                onClick: initPopulation,
                className: 'px-5 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, extinct ? '↺ Restart (after extinction)' : '↺ Reset')
            ),
            // History chart
            renderChart(),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-orange-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-orange-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Slow gradual warming (adaptation): '), 'Reset. Auto-Run, then move temp slider from 0.5 to 0.9 over ~30 seconds. The mean tolerance will track the temperature line, lagging slightly. Population survives — they ADAPTED.'),
                h('li', null, h('strong', null, 'Rapid temperature jump (extinction): '), 'Reset. Pause auto-run. Drag temp from 0.5 to 0.95 instantly. Resume auto-run. Within ~3-5 generations, watch the population crash. Extinction.'),
                h('li', null, h('strong', null, 'Find the survivable rate: '), 'Reset. Try moving the slider at different rates — slow enough that pop stays > 30, but as fast as possible. This is the population\'s "adaptive capacity."'),
                h('li', null, h('strong', null, 'Mutation matters: '), 'Reset. Set Mutation Size to 0.10 (high). Try the same rapid temp change. Population may now survive — high mutation means more variation for selection to act on. Real species with short generation times (insects, bacteria) adapt faster than slow ones (whales, humans).'),
                h('li', null, h('strong', null, 'Compare with Predator Vision: '), 'Both labs put YOU in control of selection. Predator Vision: you applied a static pressure. Climate Pressure: you apply a CHANGING pressure. The dynamic introduces extinction as a possibility — selection pressure can outpace adaptation.')
              )
            ),
            // Real-world callout
            h('div', { className: 'bg-orange-50 border border-orange-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-orange-800 mb-2' }, '📖 This is happening right now'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Pace matters: '), 'Earth\'s temperature is currently rising about 0.2°C per decade — about 10x faster than typical post-glacial warming. Many species can adapt to climate change, but many can\'t adapt this fast.'),
                h('p', null, h('strong', null, 'Maine examples: '), 'The Gulf of Maine is warming faster than 99% of the world\'s oceans. American lobsters are migrating north (lobster industry shifting from Maine toward Canada). Maine moose are stressed by tick infestations made worse by warmer winters. Iconic Maine cod populations have collapsed partly from temperature shifts.'),
                h('p', null, h('strong', null, 'Mass extinctions: '), 'Five of the six major mass extinctions in Earth\'s history involved rapid climate change. The current "Holocene/Anthropocene extinction" is happening 100-1000x faster than the natural background rate. The driver is the same: rate of environmental change exceeding adaptive capacity.'),
                h('p', null, h('strong', null, 'Generation time matters: '), 'Bacteria reproduce in minutes — they adapt to climate shifts essentially instantly. Whales reproduce every few years — they may not be able to keep up with century-scale change. Most large mammals and birds are in this "too slow to adapt" category.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🦚'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You\'ve been the predator (camouflage), the climate (extinction). Be the mate-chooser next — the third major selection pressure that drives evolution. Mate Choice Lab shows runaway sexual selection.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5', 'HS-LS4-6', 'HS-LS2-7', 'HS-ESS3-1'],
              questions: [
                'Why does the RATE of climate change matter, not just the magnitude?',
                'Compare two species: one with short generation time and lots of offspring (e.g., a fly), one with long generation time and few offspring (e.g., an elephant). Which is better positioned to survive rapid climate change? Why?',
                'In the simulator, raising mutation rate helped survival under fast change. Does this mean we should engineer wild populations to mutate faster? Why or why not?',
                'A species CAN\'T choose to adapt — but their genes happen to vary in ways that may or may not match the new conditions. What does this say about the role of "luck" in evolution?'
              ],
              misconceptions: [
                '"Animals will just move where the climate is right." Many can\'t — habitat fragmentation, geographic barriers, and food-web dependencies prevent simple range shifts. Maine moose can\'t just "move north" if the trees they eat don\'t move with them.',
                '"Evolution will save species from climate change." Sometimes — but often selection can\'t keep pace, and the species goes extinct. Past mass extinctions show that rapid change overwhelms most adaptation.',
                '"Climate change is too gradual for evolution to matter." For long-lived species, current warming is FASTER than they can adapt. The "gradual" framing is wrong on the relevant biological timescale.',
                '"This is a political topic, not a science topic." The mechanism this lab teaches (rate of selection vs adaptive capacity) is purely biological. The data on current warming is observational science.'
              ],
              extension: 'Pick one Maine species (lobster, moose, brook trout, white-tailed deer, lynx, snowshoe hare). Research: how is climate change affecting them today? Are they expected to adapt, migrate, or go extinct? What evidence supports your answer?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MATE CHOICE LAB — student-as-mate-chooser
      // ─────────────────────────────────────────────────────
      // Sexual selection made interactive. Student picks one bird per round to
      // be the parent of the next generation. Shows runaway sexual selection
      // (Fisher's mechanism): the trait the student picks gets exaggerated
      // each generation. Toggle "predator cost" to demonstrate how natural
      // selection stabilizes the trait at a finite size — the standard
      // peacock/Zahavi/handicap-principle dynamic.
      function MateChoiceLab() {
        var POP_SIZE = 12;
        var MAX_ROUNDS = 12;

        var birdsRef = useRef([]);
        var historyRef = useRef([]);
        var roundState = useState(0), round = roundState[0], setRound = roundState[1];
        var predatorCostState = useState(false), predatorCost = predatorCostState[0], setPredatorCost = predatorCostState[1];
        var phaseState = useState('intro'), phase = phaseState[0], setPhase = phaseState[1];
        var msgState = useState(''), msg = msgState[0], setMsg = msgState[1];
        var lastSelectedState = useState(null), lastSelected = lastSelectedState[0], setLastSelected = lastSelectedState[1];
        var phaseRef = useRef(phase);
        phaseRef.current = phase;

        var initPopulation = function() {
          var pop = [];
          for (var i = 0; i < POP_SIZE; i++) {
            // Start at trait ≈ 0.3 (modest showiness) — leaves room to escalate.
            pop.push({
              id: 'b' + i + '_' + Math.random(),
              showiness: clamp(randNormal(0.3, 0.07), 0, 1)
            });
          }
          birdsRef.current = pop;
          var sum = 0; for (var k = 0; k < pop.length; k++) sum += pop[k].showiness;
          historyRef.current = [{ round: 0, mean: sum / pop.length, max: Math.max.apply(null, pop.map(function(b) { return b.showiness; })) }];
          setRound(0); setPhase('intro'); setMsg(''); setLastSelected(null);
        };

        var pickMate = function(bid) {
          if (phaseRef.current !== 'choosing') return;
          var pop = birdsRef.current;
          var chosen = pop.find(function(b) { return b.id === bid; });
          if (!chosen) return;
          setLastSelected(chosen);
          // Predator cost: showiest birds may have been "eaten" before mating.
          // We model this by reducing the chosen bird's effective contribution
          // proportional to a stabilizing penalty if predator cost is enabled.
          // BUT for runaway-selection visualization, the chosen bird IS the
          // parent regardless — predator cost just kills SOME competing birds
          // before the user sees them next round (via penalty in initial draw).
          // Simplification: the selected bird produces all 12 offspring with
          // mutation. If predator cost enabled, mutation has a downward bias
          // (offspring are slightly less showy than parent on average).
          var bias = predatorCost ? -0.02 : 0;
          var nextPop = [];
          for (var i = 0; i < POP_SIZE; i++) {
            nextPop.push({
              id: 'b' + i + '_' + (round + 1) + '_' + Math.random(),
              showiness: clamp(chosen.showiness + bias + randNormal(0, 0.05), 0, 1)
            });
          }
          birdsRef.current = nextPop;
          var sum = 0; for (var k = 0; k < nextPop.length; k++) sum += nextPop[k].showiness;
          var meanNext = sum / nextPop.length;
          historyRef.current.push({ round: round + 1, mean: meanNext, max: Math.max.apply(null, nextPop.map(function(b) { return b.showiness; })) });
          setRound(round + 1);
          announce('You chose the bird with showiness ' + chosen.showiness.toFixed(2) + '. Next generation mean: ' + meanNext.toFixed(2) + '.');
          if (round + 1 >= MAX_ROUNDS) {
            setPhase('done');
            setMsg('🎯 Selection complete. Look how the population\'s showiness shifted because of YOUR choices.');
          } else {
            setMsg('Round ' + (round + 1) + ' — pick the next mate. Showiness ' + (predatorCost ? 'biased down by predator cost.' : 'unconstrained — runaway likely.'));
            setTimeout(function() { setMsg(''); }, 2200);
          }
        };

        var startSelection = function() {
          initPopulation();
          setPhase('choosing');
          announce('Mate choice begins. Click the bird you find most attractive each round.');
        };

        if (birdsRef.current.length === 0) initPopulation();

        // Render a single bird as SVG: body + tail. Tail length and color
        // intensity scale with showiness; "eyespots" appear above showiness > 0.6.
        var renderBird = function(b, idx) {
          var s = b.showiness;
          var W = 180, H = 130;
          var tailLen = 20 + s * 90;       // 20 → 110 px tail
          var tailHue = Math.round(lerp(40, 320, s)); // gold → magenta as showiness rises
          var eyespotCount = Math.floor(s * 6); // 0 to 6 eyespots
          var bodyX = 30, bodyY = H / 2;
          // Tail fans behind the bird from bodyX going leftward
          var tailFanPath = '';
          for (var f = 0; f < 7; f++) {
            var angle = (f / 6 - 0.5) * 1.5; // -0.75 to +0.75 rad
            var endX = bodyX - Math.cos(angle) * tailLen;
            var endY = bodyY + Math.sin(angle) * tailLen;
            tailFanPath += 'M ' + bodyX + ' ' + bodyY + ' L ' + endX + ' ' + endY + ' ';
          }
          var eyespots = [];
          for (var e = 0; e < eyespotCount; e++) {
            var ea = (e / Math.max(1, eyespotCount - 1) - 0.5) * 1.2;
            var ex = bodyX - Math.cos(ea) * (tailLen * 0.85);
            var ey = bodyY + Math.sin(ea) * (tailLen * 0.85);
            eyespots.push(h('circle', { key: 'eye' + e, cx: ex, cy: ey, r: 5, fill: 'hsl(' + ((tailHue + 60) % 360) + ',80%,40%)', stroke: '#1e293b', strokeWidth: 1 }));
            eyespots.push(h('circle', { key: 'eyec' + e, cx: ex, cy: ey, r: 2, fill: '#fef9c3' }));
          }
          var selected = lastSelected && lastSelected.id === b.id;
          return h('button', {
            key: b.id,
            onClick: function() { pickMate(b.id); },
            disabled: phaseRef.current !== 'choosing',
            'aria-pressed': selected,
            'aria-label': 'Bird with showiness ' + s.toFixed(2) + (selected ? ' (your last pick)' : '') + '. Click to choose this mate.',
            className: 'rounded-2xl border-4 ' + (selected ? 'border-fuchsia-500 ring-4 ring-fuchsia-200' : 'border-slate-200 hover:border-slate-400') + ' bg-gradient-to-b from-sky-50 to-emerald-50 transition-all ' + (phaseRef.current === 'choosing' ? 'cursor-pointer hover:scale-105' : 'opacity-80'),
            style: { padding: '4px' }
          },
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': 'A bird with showiness ' + s.toFixed(2) + (eyespotCount > 0 ? ', ' + eyespotCount + ' tail eyespots' : '') + ', tail length ' + Math.round(tailLen) + ' pixels'
            },
              // Background sky/grass gradient is handled by parent button
              // Tail fans
              h('path', {
                d: tailFanPath,
                stroke: 'hsl(' + tailHue + ',75%,55%)',
                strokeWidth: 4,
                fill: 'none',
                strokeLinecap: 'round'
              }),
              // Eyespots (peacock-style)
              eyespots,
              // Body — a teardrop-like shape
              h('ellipse', { cx: bodyX + 30, cy: bodyY, rx: 26, ry: 18, fill: '#1e293b', stroke: '#0f172a', strokeWidth: 1 }),
              // Head
              h('circle', { cx: bodyX + 56, cy: bodyY - 8, r: 12, fill: '#1e293b', stroke: '#0f172a', strokeWidth: 1 }),
              // Eye
              h('circle', { cx: bodyX + 60, cy: bodyY - 10, r: 2.5, fill: '#fbbf24' }),
              h('circle', { cx: bodyX + 60.5, cy: bodyY - 10.5, r: 1, fill: '#0f172a' }),
              // Beak
              h('polygon', { points: (bodyX + 67) + ',' + (bodyY - 7) + ' ' + (bodyX + 75) + ',' + (bodyY - 4) + ' ' + (bodyX + 67) + ',' + (bodyY - 1), fill: '#f59e0b' }),
              // Legs
              h('line', { x1: bodyX + 24, y1: bodyY + 17, x2: bodyX + 22, y2: H - 12, stroke: '#f59e0b', strokeWidth: 2 }),
              h('line', { x1: bodyX + 36, y1: bodyY + 17, x2: bodyX + 38, y2: H - 12, stroke: '#f59e0b', strokeWidth: 2 }),
              // Showiness indicator (small badge)
              h('rect', { x: 4, y: 4, width: 38, height: 16, fill: 'rgba(255,255,255,0.85)', rx: 4 }),
              h('text', { x: 23, y: 16, fontSize: '10', fill: '#1e293b', fontWeight: 'bold', textAnchor: 'middle' }, 'S=' + s.toFixed(2))
            )
          );
        };

        // History chart of mean + max showiness over rounds
        var renderChart = function() {
          var hist = historyRef.current;
          var W = 500, H = 180, padL = 32, padR = 8, padT = 12, padB = 24;
          var xMax = Math.max(MAX_ROUNDS, hist.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          var meanPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.mean); }).join(' ');
          var maxPath = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i) + ' ' + toY(pt.max); }).join(' ');
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Showiness Over Rounds'),
              h('div', { className: 'flex gap-3 text-[10px]' },
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#ec4899', display: 'inline-block' } }),
                  h('span', null, 'Mean')
                ),
                h('span', { className: 'flex items-center gap-1' },
                  h('span', { style: { width: 12, height: 2, backgroundColor: '#7c3aed', display: 'inline-block' } }),
                  h('span', null, 'Max')
                )
              )
            ),
            h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', role: 'img', 'aria-label': 'Mean and max showiness over rounds.' },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              h('text', { x: 4, y: toY(1) + 4, fontSize: '10', fill: '#475569' }, '1.0'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '10', fill: '#475569' }, '0.5'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '10', fill: '#475569' }, '0.0'),
              h('text', { x: padL, y: H - 8, fontSize: '10', fill: '#475569' }, 'round 0'),
              h('text', { x: W - padR - 50, y: H - 8, fontSize: '10', fill: '#475569' }, 'round ' + xMax),
              hist.length > 1 && h('path', { d: meanPath, stroke: '#ec4899', strokeWidth: 2.4, fill: 'none' }),
              hist.length > 1 && h('path', { d: maxPath, stroke: '#7c3aed', strokeWidth: 1.5, strokeDasharray: '4,2', fill: 'none' })
            )
          );
        };

        // Stats
        var pop = birdsRef.current;
        var sum = 0; for (var i = 0; i < pop.length; i++) sum += pop[i].showiness;
        var mean = pop.length > 0 ? sum / pop.length : 0;
        var max = pop.length > 0 ? Math.max.apply(null, pop.map(function(b) { return b.showiness; })) : 0;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🦚', title: 'Mate Choice Lab' }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-pink-500 to-fuchsia-700 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🦚'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'You pick the mate'),
                  h('p', { className: 'text-sm text-pink-50 mt-1' }, 'Each round you see 12 male birds with varying tail showiness. You pick one to be the parent of the next generation. The others don\'t reproduce. Watch how YOUR choices drive the population. Without a predator cost, showiness escalates indefinitely (the famous "runaway sexual selection" model). With a cost, it stabilizes — like real peacocks who have to balance attractiveness against being eaten.')
                )
              )
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Round', value: round + ' / ' + MAX_ROUNDS, color: 'text-pink-700' }),
              h(StatCard, { label: 'Mean Showiness', value: mean.toFixed(2), color: 'text-fuchsia-700' }),
              h(StatCard, { label: 'Max Showiness', value: max.toFixed(2), color: 'text-violet-700' }),
              h(StatCard, { label: 'Cost', value: predatorCost ? 'Predator ON' : 'No cost', color: predatorCost ? 'text-rose-700' : 'text-emerald-700' })
            ),
            // Round message
            msg && h('div', { 'aria-live': 'polite', className: 'bg-white border-2 border-pink-400 rounded-xl p-3 text-center font-bold text-pink-800' }, msg),
            // 12-bird grid
            phase !== 'intro' && h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' },
                phase === 'choosing' ? '🦚 Round ' + (round + 1) + ' — Pick the male you find most attractive' : '🏁 Final population'
              ),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' },
                pop.map(function(b, idx) { return renderBird(b, idx); })
              )
            ),
            // History chart
            historyRef.current.length > 1 && renderChart(),
            // Predator cost toggle
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 flex items-center justify-between gap-3' },
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, '🦅 Predator Cost'),
                h('div', { className: 'text-sm text-slate-600' },
                  predatorCost
                    ? 'ON — showy males die more often. Sexual selection vs natural selection in tension.'
                    : 'OFF — no penalty for being showy. Runaway selection: trait escalates without limit.'
                )
              ),
              h('button', {
                onClick: function() { setPredatorCost(!predatorCost); },
                'aria-pressed': predatorCost,
                className: 'px-4 py-2 rounded-lg font-bold ' + (predatorCost ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, predatorCost ? '✓ Cost Enabled' : 'Cost Disabled')
            ),
            // Phase controls
            phase === 'intro' && h('div', { className: 'flex justify-center' },
              h('button', {
                onClick: startSelection,
                className: 'px-7 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-lg text-lg'
              }, '▶ Start Choosing')
            ),
            phase === 'done' && h('div', { className: 'bg-gradient-to-br from-fuchsia-500 to-pink-700 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🎯'),
                h('div', { className: 'flex-1' },
                  h('h3', { className: 'text-xl font-black' }, 'Your choices shaped the population'),
                  h('p', { className: 'text-sm text-pink-50 mt-1' },
                    'Mean showiness shifted from ~0.30 to ' + mean.toFixed(2) + ' across ' + round + ' rounds. ' +
                    (predatorCost
                      ? 'Predator cost balanced the runaway — note how the trend stabilized rather than racing to 1.0.'
                      : 'Without predator cost, runaway selection drove showiness rapidly upward.'
                    )
                  ),
                  h('button', {
                    onClick: initPopulation,
                    className: 'mt-3 px-5 py-2 rounded-lg font-bold bg-white text-pink-700 hover:bg-pink-50'
                  }, '↻ Run Again')
                )
              )
            ),
            phase === 'choosing' && h('div', { className: 'flex justify-center gap-3' },
              h('button', {
                onClick: function() { setPhase('done'); },
                className: 'px-5 py-2.5 rounded-lg font-bold bg-amber-200 hover:bg-amber-300 text-amber-900'
              }, '⏹️ End Selection'),
              h('button', {
                onClick: initPopulation,
                className: 'px-5 py-2.5 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Restart')
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-pink-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-pink-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Runaway selection: '), 'With Predator Cost OFF, always pick the showiest bird. Within ~8 rounds, the population is at maximum showiness (1.0). This is the Fisher runaway model.'),
                h('li', null, h('strong', null, 'Stabilizing balance: '), 'Restart with Predator Cost ON. Pick the showiest bird each round. The trait still rises but plateaus — predator cost prevents runaway. Real-world peacocks live here.'),
                h('li', null, h('strong', null, 'Pick something different: '), 'Try picking the LEAST showy bird each round. The population evolves toward dull/cryptic. Female preference can drive evolution in any direction — including toward camouflage if predators are intense.'),
                h('li', null, h('strong', null, 'Mix strategies: '), 'Pick the showiest for 3 rounds, then switch to picking modestly showy birds. The trait briefly drops, but the genetic momentum from earlier rounds means it doesn\'t crash all the way down. Selection has memory.'),
                h('li', null, h('strong', null, 'Compare with Predator Vision: '), 'In Predator Vision Lab, your selection drove camouflage (cryptic, hard-to-see). Here, it drives showiness (conspicuous, easy-to-see). Same MECHANISM (heritable variation + selection), opposite DIRECTION.')
              )
            ),
            // Real-world callout
            h('div', { className: 'bg-pink-50 border border-pink-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-pink-800 mb-2' }, '📖 Real biology'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Peacocks: '), 'Male peacocks have absurd tail trains — 5 feet long, with up to 200 eyespots. The tail makes flying harder and attracts predators. Why do they have it? Female peahens prefer it. The tail evolved because females consistently picked the showiest males for thousands of generations.'),
                h('p', null, h('strong', null, 'Birds of paradise: '), '~40 species in New Guinea, all descended from a crow-like ancestor. Each species has a different bizarre display: spinning ribbons, head shaking, capes that flip up, dance moves. All driven by female mate preference operating in isolation on different islands.'),
                h('p', null, h('strong', null, 'Guppies: '), 'Trinidad guppies have vivid spots in safe streams (mate choice wins) but dull spots in predator-rich streams (natural selection wins). Same species, different equilibria — exactly the dynamic the predator cost toggle models.'),
                h('p', null, h('strong', null, 'Why this matters: '), 'Sexual selection is one of the major engines of evolution. It drives speciation, ornamentation, song, courtship dances. It also explains why some traits seem maladaptive — they\'re not optimizing survival; they\'re optimizing reproduction.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🐆'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You\'ve seen sexual selection within a population. The Coevolution Lab shows what happens when TWO populations evolve in response to each other — natural selection\'s answer to sexual selection.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5', 'HS-LS4-6'],
              questions: [
                'In the Predator Vision Lab, your selection produced camouflage. Here, your selection produced showiness. What does that tell you about the role of selection PRESSURE vs the role of TRAITS?',
                'A peacock\'s tail makes it easier for predators to spot. Why hasn\'t natural selection eliminated the trait?',
                'Real peahens prefer showier tails. Could this preference itself have evolved? How?',
                'Sexual selection sometimes produces traits that look "maladaptive" (energetically costly, predator-attracting). How is this consistent with evolution by natural selection?'
              ],
              misconceptions: [
                'Students may think sexual selection is "weaker" or "less real" than natural selection. It isn\'t — it produces some of the most striking traits in nature (peacock tails, lion manes, deer antlers).',
                'Students often think mate choice is conscious. The selection mechanism doesn\'t require conscious decision-making — birds, fish, and insects all show mate-choice patterns without anything like deliberation.',
                'Students may project human attractiveness onto the simulation. The sim is intentionally about non-human creatures (birds) — the underlying mechanism is the same, but the mechanism applies to species that aren\'t making "choices" in any cognitively rich sense.'
              ],
              extension: 'Pick a real species with extreme sexually-selected traits (peacock, bird of paradise, fiddler crab, deer, elephant seal). Research: how big is the trait? What does mate choice / display look like? What predator cost does the trait impose?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // PREDATOR VISION LAB — student-as-selection-pressure
      // ─────────────────────────────────────────────────────
      // The classic "Toothpick Bird" classroom activity, made digital. Student
      // hunts prey by clicking them. Easier-to-see prey die first; survivors
      // reproduce. After several rounds the population evolves to match the
      // background — camouflage emerges from the student's own selection.
      // Pedagogically: makes evolution viscerally felt, not just observed.
      function PredatorVisionLab() {
        var POP_SIZE = 30;
        var KILLS_PER_ROUND = 10;
        var MAX_ROUNDS = 12;

        // Each environment specifies its "ideal" trait (the color value that's
        // hardest for the student to spot against this background).
        var ENVIRONMENTS = {
          forest: {
            label: '🌲 Forest Floor', idealTrait: 0.55,
            description: 'Mottled greens and browns. Mid-range trait values blend in best.',
            bgColor1: '#14532d', bgColor2: '#3f6212', noiseColor: '#1f2937'
          },
          sand: {
            label: '🏖️ Sandy Beach', idealTrait: 0.85,
            description: 'Light tan and beige. Pale trait values disappear into the sand.',
            bgColor1: '#fef3c7', bgColor2: '#fde68a', noiseColor: '#a16207'
          },
          snow: {
            label: '❄️ Snowy Field', idealTrait: 0.95,
            description: 'White on white. Whitest creatures are nearly invisible.',
            bgColor1: '#f1f5f9', bgColor2: '#e2e8f0', noiseColor: '#94a3b8'
          },
          urban: {
            label: '🏙️ Urban Concrete', idealTrait: 0.40,
            description: 'Mid-grey concrete and asphalt. Mid-dark traits blend best.',
            bgColor1: '#475569', bgColor2: '#334155', noiseColor: '#1e293b'
          }
        };

        var envState = useState('forest'), envId = envState[0], setEnvId = envState[1];
        var env = ENVIRONMENTS[envId];
        var popRef = useRef([]);
        var historyRef = useRef([]);
        var canvasRef = useRef(null);
        var rafRef = useRef(null);
        var roundState = useState(0), round = roundState[0], setRound = roundState[1];
        var killsState = useState(0), kills = killsState[0], setKills = killsState[1];
        var totalKillsState = useState(0), totalKills = totalKillsState[0], setTotalKills = totalKillsState[1];
        var roundStartRef = useRef(performance.now());
        var roundTimesState = useState([]), roundTimes = roundTimesState[0], setRoundTimes = roundTimesState[1];
        var phaseState = useState('intro'), phase = phaseState[0], setPhase = phaseState[1]; // intro | hunting | done
        var msgState = useState(''), msg = msgState[0], setMsg = msgState[1];
        // Live refs
        var envRef = useRef(env);
        envRef.current = env;
        var phaseRef = useRef(phase);
        phaseRef.current = phase;

        var initPopulation = function() {
          var pop = [];
          for (var i = 0; i < POP_SIZE; i++) {
            // Start with uniform random colors across the whole [0,1] range —
            // a "naive" population with no camouflage yet.
            pop.push({
              id: 'p' + i + '_' + Math.random(),
              x: 30 + Math.random() * 720,
              y: 30 + Math.random() * 240,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              trait: Math.random(),
              alive: true
            });
          }
          popRef.current = pop;
          var sum = 0; for (var k = 0; k < pop.length; k++) sum += pop[k].trait;
          historyRef.current = [{ round: 0, mean: sum / pop.length, time: 0, kills: 0 }];
          setRound(0); setKills(0); setTotalKills(0); setRoundTimes([]); setPhase('intro'); setMsg('');
        };

        // Kill a prey — survivors reproduce when KILLS_PER_ROUND is hit.
        var killPrey = function(pid) {
          if (phaseRef.current !== 'hunting') return;
          var pop = popRef.current;
          var idx = pop.findIndex(function(p) { return p.id === pid && p.alive; });
          if (idx < 0) return;
          pop[idx].alive = false;
          // Move the dead prey off-canvas
          pop[idx].x = -100; pop[idx].y = -100;
          var newKills = kills + 1;
          var newTotal = totalKills + 1;
          setKills(newKills);
          setTotalKills(newTotal);
          if (newKills >= KILLS_PER_ROUND) {
            // End of round — survivors reproduce.
            var survivors = pop.filter(function(p) { return p.alive; });
            var time = (performance.now() - roundStartRef.current) / 1000;
            var newRoundTimes = roundTimes.concat([time]);
            setRoundTimes(newRoundTimes);
            var sumS = 0;
            for (var s = 0; s < survivors.length; s++) sumS += survivors[s].trait;
            var meanSurvivors = survivors.length > 0 ? sumS / survivors.length : 0.5;
            historyRef.current.push({ round: round + 1, mean: meanSurvivors, time: time, kills: KILLS_PER_ROUND });
            // Reproduce: each survivor produces offspring back to POP_SIZE
            var nextPop = survivors.slice();
            while (nextPop.length < POP_SIZE && survivors.length > 0) {
              var parent = survivors[Math.floor(Math.random() * survivors.length)];
              nextPop.push({
                id: 'p' + nextPop.length + '_' + round + '_' + Math.random(),
                x: 30 + Math.random() * 720,
                y: 30 + Math.random() * 240,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                trait: clamp(parent.trait + randNormal(0, 0.05), 0, 1),
                alive: true
              });
            }
            popRef.current = nextPop;
            setKills(0);
            setRound(round + 1);
            roundStartRef.current = performance.now();
            announce('Round ' + (round + 1) + ' complete. ' + KILLS_PER_ROUND + ' eaten in ' + time.toFixed(1) + ' seconds. Population mean trait now ' + meanSurvivors.toFixed(2) + '.');
            if (round + 1 >= MAX_ROUNDS) {
              setPhase('done');
              setMsg('🎯 Hunt complete! Look how the population shifted toward camouflage.');
            } else {
              setMsg('Round ' + (round + 1) + ' survivors reproduce → fresh population. Keep hunting!');
              setTimeout(function() { setMsg(''); }, 2200);
            }
          }
        };

        var startHunt = function() {
          initPopulation();
          setPhase('hunting');
          roundStartRef.current = performance.now();
          announce('Hunt started. Click prey to select against them.');
        };

        // Init synchronously so canvas has prey on first paint
        if (popRef.current.length === 0) initPopulation();

        // RAF loop for prey motion + canvas draw
        useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas) return;
          var ctx = canvas.getContext('2d');
          var lastT = performance.now();
          var loop = function(now) {
            var dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            if (!_prefersReducedMotion && phaseRef.current === 'hunting') {
              var pop = popRef.current;
              for (var i = 0; i < pop.length; i++) {
                var p = pop[i];
                if (!p.alive) continue;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.x < 12) { p.x = 12; p.vx = -p.vx; }
                if (p.x > canvas.width - 12) { p.x = canvas.width - 12; p.vx = -p.vx; }
                if (p.y < 12) { p.y = 12; p.vy = -p.vy; }
                if (p.y > canvas.height - 12) { p.y = canvas.height - 12; p.vy = -p.vy; }
              }
            }
            drawCanvas(ctx, canvas.width, canvas.height);
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }, []); // eslint-disable-line — RAF reads from refs

        // Trait-to-color: maps trait [0, 1] to a color that's lighter/darker.
        // The closer to env.idealTrait, the harder to see against the background.
        function traitColor(t) {
          // Convert trait to RGB based on environment hue family.
          var e = envRef.current;
          if (e === ENVIRONMENTS.forest) {
            // Greens/browns ramp
            var rr = Math.round(lerp(50, 134, t));
            var gg = Math.round(lerp(80, 142, t));
            var bb = Math.round(lerp(40, 70, t));
            return 'rgb(' + rr + ',' + gg + ',' + bb + ')';
          }
          if (e === ENVIRONMENTS.sand) {
            // Brown to pale tan
            var sr = Math.round(lerp(120, 254, t));
            var sg = Math.round(lerp(80, 240, t));
            var sb = Math.round(lerp(40, 200, t));
            return 'rgb(' + sr + ',' + sg + ',' + sb + ')';
          }
          if (e === ENVIRONMENTS.snow) {
            // Dark grey → white
            var v = Math.round(lerp(60, 250, t));
            return 'rgb(' + v + ',' + v + ',' + v + ')';
          }
          // urban: dark to medium grey
          var ur = Math.round(lerp(20, 160, t));
          var ug = Math.round(lerp(20, 165, t));
          var ub = Math.round(lerp(25, 170, t));
          return 'rgb(' + ur + ',' + ug + ',' + ub + ')';
        }

        var drawCanvas = function(ctx, W, H) {
          var e = envRef.current;
          // Background — base gradient + noise dots for texture
          var grad = ctx.createLinearGradient(0, 0, W, H);
          grad.addColorStop(0, e.bgColor1);
          grad.addColorStop(1, e.bgColor2);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
          // Noise — random small dots in the noiseColor for texture/camouflage feel
          ctx.fillStyle = e.noiseColor;
          // Use a deterministic seed-ish pattern so it doesn't shimmer per frame
          for (var ni = 0; ni < 350; ni++) {
            var nx = (ni * 137 + envId.length * 11) % W;
            var ny = (ni * 89 + envId.charCodeAt(0)) % H;
            var ns = ((ni * 7) % 4) + 1;
            ctx.fillRect(nx, ny, ns, ns);
          }
          // Draw prey
          var pop = popRef.current;
          for (var i = 0; i < pop.length; i++) {
            var p = pop[i];
            if (!p.alive) continue;
            ctx.fillStyle = traitColor(p.trait);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            // Subtle outline only on prey closest to detect (high contrast against bg)
            // Otherwise no outline = pure camouflage challenge
          }
        };

        // Click handler — translate canvas coordinates to a prey target.
        var onCanvasClick = function(e) {
          if (phaseRef.current !== 'hunting') return;
          var canvas = canvasRef.current;
          if (!canvas) return;
          var rect = canvas.getBoundingClientRect();
          // Scale click position to canvas internal coords
          var scaleX = canvas.width / rect.width;
          var scaleY = canvas.height / rect.height;
          var x = (e.clientX - rect.left) * scaleX;
          var y = (e.clientY - rect.top) * scaleY;
          // Find closest live prey within click radius
          var pop = popRef.current;
          var closestIdx = -1;
          var closestDist = 16; // click radius
          for (var i = 0; i < pop.length; i++) {
            var p = pop[i];
            if (!p.alive) continue;
            var d = Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y));
            if (d < closestDist) { closestDist = d; closestIdx = i; }
          }
          if (closestIdx >= 0) killPrey(pop[closestIdx].id);
        };

        // History chart of mean trait over rounds
        var renderHistoryChart = function() {
          var hist = historyRef.current;
          var W = 400, H = 120, padL = 30, padR = 8, padT = 10, padB = 22;
          var xMax = Math.max(MAX_ROUNDS, hist.length);
          var toX = function(i) { return padL + (i / xMax) * (W - padL - padR); };
          var toY = function(p) { return padT + (1 - p) * (H - padT - padB); };
          var pathD = hist.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + toX(i).toFixed(1) + ' ' + toY(pt.mean).toFixed(1); }).join(' ');
          // Mark the "ideal" trait line — where the population is HEADED
          var idealY = toY(env.idealTrait);
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, '📊 Mean Trait Over Rounds'),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': 'Mean trait over ' + hist.length + ' rounds. Approaching the camouflage ideal trait of ' + env.idealTrait.toFixed(2) + '.'
            },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              // Ideal trait reference line
              h('line', { x1: padL, y1: idealY, x2: W - padR, y2: idealY, stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4,3' }),
              h('text', { x: W - padR - 90, y: idealY - 4, fontSize: '9', fill: '#10b981', fontWeight: 'bold' }, 'camouflage ideal'),
              h('text', { x: 4, y: toY(1) + 4, fontSize: '9', fill: '#475569' }, '1.0'),
              h('text', { x: 4, y: toY(0.5) + 4, fontSize: '9', fill: '#475569' }, '0.5'),
              h('text', { x: 4, y: toY(0) + 4, fontSize: '9', fill: '#475569' }, '0.0'),
              h('text', { x: padL, y: H - 8, fontSize: '9', fill: '#475569' }, 'round 0'),
              h('text', { x: W - padR - 36, y: H - 8, fontSize: '9', fill: '#475569' }, 'round ' + xMax),
              hist.length > 1 && h('path', { d: pathD, stroke: '#dc2626', strokeWidth: 2, fill: 'none' }),
              hist.length > 0 && h('circle', { cx: toX(hist.length - 1), cy: toY(hist[hist.length - 1].mean), r: 3, fill: '#dc2626' })
            )
          );
        };

        // Hunt times chart — shows that you slow down each round
        var renderTimeChart = function() {
          if (roundTimes.length === 0) return null;
          var W = 400, H = 100, padL = 30, padR = 8, padT = 10, padB = 22;
          var maxTime = Math.max(20, Math.max.apply(null, roundTimes));
          var toX = function(i) { return padL + (i / Math.max(MAX_ROUNDS - 1, 1)) * (W - padL - padR); };
          var toY = function(t) { return padT + (1 - t / maxTime) * (H - padT - padB); };
          var bars = roundTimes.map(function(t, i) {
            var x = toX(i);
            var w = (W - padL - padR) / Math.max(MAX_ROUNDS, 1) * 0.7;
            var y = toY(t);
            // Color: faster (green) → slower (red)
            var hue = clamp(120 - (t / maxTime) * 120, 0, 120);
            return h('rect', { key: i, x: x - w / 2, y: y, width: w, height: H - padB - y, fill: 'hsl(' + hue + ',70%,55%)' });
          });
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
            h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, '⏱️ Time to Eat 10 (Per Round)'),
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full',
              role: 'img',
              'aria-label': 'Bar chart of time to complete each round. ' + roundTimes.length + ' rounds completed. Latest time: ' + (roundTimes[roundTimes.length - 1] || 0).toFixed(1) + ' seconds.'
            },
              h('rect', { x: 0, y: 0, width: W, height: H, fill: '#f8fafc' }),
              h('line', { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: '#94a3b8' }),
              h('line', { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: '#94a3b8' }),
              h('text', { x: 4, y: padT + 8, fontSize: '9', fill: '#475569' }, maxTime.toFixed(0) + 's'),
              h('text', { x: 4, y: H - padB + 4, fontSize: '9', fill: '#475569' }, '0s'),
              bars
            ),
            h('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'Bars get TALLER (slower) as the prey become better camouflaged.')
          );
        };

        // Stats
        var pop = popRef.current.filter(function(p) { return p.alive; });
        var sum = 0; for (var i = 0; i < pop.length; i++) sum += pop[i].trait;
        var mean = pop.length > 0 ? sum / pop.length : 0.5;
        var idealDist = Math.abs(mean - env.idealTrait);
        var camouflageScore = Math.max(0, Math.round((1 - idealDist) * 100));
        var avgTime = roundTimes.length > 0 ? roundTimes.reduce(function(s, t) { return s + t; }, 0) / roundTimes.length : 0;

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '👁️', title: 'Predator Vision Lab' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-3' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-lime-600 to-green-800 rounded-2xl p-4 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '👁️'),
                h('div', null,
                  h('h2', { className: 'text-xl font-black' }, 'You are the predator'),
                  h('p', { className: 'text-sm text-lime-50 mt-1' }, 'Click prey to "eat" them. Each round, the survivors reproduce — and each generation looks slightly more like the background. By round 10, the prey will be almost invisible. The camouflage you\'re watching emerge is YOUR doing — you applied the selection pressure that produced it.')
                )
              )
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h(StatCard, { label: 'Round', value: round + ' / ' + MAX_ROUNDS, color: 'text-green-700' }),
              h(StatCard, { label: 'Eaten This Round', value: kills + ' / ' + KILLS_PER_ROUND, color: 'text-rose-700' }),
              h(StatCard, { label: 'Total Hunted', value: totalKills, color: 'text-amber-700' }),
              h(StatCard, { label: 'Camouflage', value: camouflageScore + '%', color: camouflageScore > 80 ? 'text-rose-700' : camouflageScore > 50 ? 'text-amber-700' : 'text-emerald-700', unit: 'population vs ideal' })
            ),
            // Round-end message
            msg && h('div', { 'aria-live': 'polite', className: 'bg-white border-2 border-lime-400 rounded-xl p-3 text-center font-bold text-lime-800' }, msg),
            // Hunting canvas
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('canvas', {
                ref: canvasRef,
                width: 800, height: 300,
                onClick: onCanvasClick,
                className: 'w-full block cursor-crosshair',
                role: 'img',
                'aria-label': 'Hunting field with ' + pop.length + ' camouflaged prey on ' + env.label + ' background. Click prey to eat them.',
                style: { imageRendering: 'crisp-edges' }
              })
            ),
            // Two charts side-by-side
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              renderHistoryChart(),
              renderTimeChart() || h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 flex items-center justify-center text-slate-600 text-sm italic' }, '⏱️ Round times will appear after Round 1.')
            ),
            // Environment picker
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Choose Environment'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                Object.keys(ENVIRONMENTS).map(function(id) {
                  var e2 = ENVIRONMENTS[id];
                  return h('button', {
                    key: id,
                    onClick: function() { setEnvId(id); initPopulation(); },
                    'aria-pressed': envId === id,
                    'aria-label': 'Set environment to ' + e2.label,
                    className: 'p-2 rounded-lg text-sm font-bold border-2 transition-colors text-left ' + (envId === id ? 'border-lime-500 bg-lime-50 text-lime-800' : 'border-slate-200 text-slate-700 hover:border-slate-300')
                  }, e2.label);
                })
              ),
              h('div', { className: 'text-xs text-slate-600 mt-2 italic' }, env.description)
            ),
            // Phase controls
            phase === 'intro' && h('div', { className: 'flex justify-center' },
              h('button', {
                onClick: startHunt,
                className: 'px-7 py-3 rounded-xl font-bold bg-lime-600 hover:bg-lime-700 text-white shadow-lg text-lg'
              }, '▶ Start Hunting')
            ),
            phase === 'hunting' && h('div', { className: 'flex justify-center gap-3' },
              h('button', {
                onClick: function() { setPhase('done'); },
                className: 'px-5 py-2.5 rounded-lg font-bold bg-amber-200 hover:bg-amber-300 text-amber-900'
              }, '⏹️ End Hunt'),
              h('button', {
                onClick: initPopulation,
                className: 'px-5 py-2.5 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↺ Restart')
            ),
            phase === 'done' && h('div', { className: 'bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-4xl' }, '🎯'),
                h('div', { className: 'flex-1' },
                  h('h3', { className: 'text-xl font-black' }, 'Hunt complete'),
                  h('p', { className: 'text-sm text-emerald-50 mt-1' },
                    'You ate ' + totalKills + ' prey across ' + round + ' rounds. ' +
                    'Population mean trait shifted from ~0.50 to ' + mean.toFixed(2) + ' (camouflage ideal: ' + env.idealTrait.toFixed(2) + '). ' +
                    (avgTime > 0 ? 'Average round time: ' + avgTime.toFixed(1) + 's. ' : '') +
                    'YOU caused this evolution by selecting against the easy-to-spot prey.'
                  ),
                  h('button', {
                    onClick: initPopulation,
                    className: 'mt-3 px-5 py-2 rounded-lg font-bold bg-white text-emerald-700 hover:bg-emerald-50'
                  }, '↻ Hunt Again')
                )
              )
            ),
            // Try-this experiments
            h('div', { className: 'bg-white border-2 border-lime-400 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-lime-800 mb-3' }, '🧪 Try these experiments'),
              h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
                h('li', null, h('strong', null, 'Race against your own evolution: '), 'Note your time to eat 10 in Round 1. Compare to your time in Round 10. You\'ll be SLOWER even though you\'re more practiced — because the prey are evolving to evade YOU.'),
                h('li', null, h('strong', null, 'Switch environments mid-evolution: '), 'After 5 rounds in Forest, switch to Snow. The prey that evolved to match leaves now stand out against snow. They have to evolve again from scratch.'),
                h('li', null, h('strong', null, 'Hunt strategically vs randomly: '), 'In Round 1, click only the BRIGHTEST prey. In Round 2, click randomly. Compare end-of-round populations. Selective hunting produces faster camouflage evolution.'),
                h('li', null, h('strong', null, 'Compare with a partner: '), 'Two students, one screen — take turns hunting one round each. Notice how each person\'s "predator profile" subtly differs and shapes the prey differently.'),
                h('li', null, h('strong', null, 'Check the chart: '), 'The red line on the trait chart approaches the green dashed "camouflage ideal" line. That\'s natural selection in action — the population converging on the trait you\'re NOT selecting against.')
              )
            ),
            // Real-world tie-in
            h('div', { className: 'bg-lime-50 border border-lime-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-lime-800 mb-2' }, '📖 This is real biology'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Peppered moths (Biston betularia): '), 'Before the Industrial Revolution, most peppered moths were light-colored and matched lichen-covered tree bark. Pollution killed lichen and blackened trees with soot. Within 50 years, dark moths dominated — bird predators selected against light moths against dark trees, exactly like you just selected against high-contrast prey.'),
                h('p', null, h('strong', null, 'Snowshoe hares: '), 'In Maine, where you live, snowshoe hares molt to white in winter. With climate change shortening winters, hares that molt EARLY are now mismatched against bare ground — and predators (lynx, foxes, owls) eat them at higher rates. Real selection pressure happening right now.'),
                h('p', null, h('strong', null, 'Cuttlefish on demand: '), 'Cuttlefish change their skin color in seconds to match their background — a non-evolutionary form of camouflage that they can do because of specialized cells. Compare with what you saw: peppered moths and hares need MULTIPLE GENERATIONS to camouflage; cuttlefish do it in seconds.'),
                h('p', null, h('strong', null, 'You as a predator: '), 'You aren\'t a "natural" predator for these creatures, but the dynamic is identical. ANY consistent selection pressure (predators, weather, mate choice, food sources) drives populations to evolve. The pressure doesn\'t have to be intentional.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '🧪'),
              h('div', null,
                h('strong', null, 'Next up: '),
                'You just felt selection happening. The Selection Sandbox lets you adjust selection pressure as a slider rather than as your own clicks — see how the same dynamic plays out under different settings.'
              )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5', 'HS-LS4-6', 'NOS'],
              questions: [
                'How did your hunting time change between Round 1 and Round 10? What does that change tell you about what was happening to the population?',
                'In what way are YOU different from a real predator (e.g., a bird or a fox)? In what way are you the same?',
                'Could you make the population evolve in a DIFFERENT direction by deliberately hunting only the well-camouflaged prey? What would that prove?',
                'Cuttlefish change color in seconds — but it\'s not evolution. Why not?'
              ],
              misconceptions: [
                'Students may think they\'re "training" the population. The population isn\'t learning — they\'re experiencing differential reproduction. Each generation\'s genes are pre-set; only WHO survives changes.',
                'Some students will think they\'re causing intentional evolution. They\'re not — they\'re applying a selection pressure. The mutations creating variation happen randomly, before the student clicks.',
                'Students may think real predators "teach" prey to camouflage. They don\'t. Each individual prey doesn\'t change — but the population shifts because well-camouflaged individuals leave more offspring.'
              ],
              extension: 'Run two parallel experiments: one with selective hunting (only click the easy-to-see prey), one with random hunting (click any prey). Predict the difference. Then graph the trait distributions side-by-side. What does this tell you about random vs selective predation in the wild?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // CAPSTONE PROJECT — 4-step guided research workflow
      // ─────────────────────────────────────────────────────
      // SELECTION SLEUTH (net-new mini-game)
      // 10 vignettes; player picks the evolutionary mechanism from 6 options.
      // Tests the AP Bio / intro bio canonical concept that "evolution" has
      // multiple distinct mechanisms — natural selection (3 modes), sexual
      // selection, artificial selection, genetic drift. Most-misclassified:
      // sexual vs natural (peacock tails), drift vs selection (small pops),
      // artificial vs natural (cultivated species), and the 3 directional
      // modes of natural selection.
      // ─────────────────────────────────────────────────────
      function SelectionSleuth() {
        var MECHANISMS = [
          { id: 'natural-directional', label: 'Natural — directional', color: '#16a34a', icon: '➡️',
            def: 'A pressure favors one extreme. Population mean shifts that way over generations.' },
          { id: 'natural-stabilizing', label: 'Natural — stabilizing',  color: '#0ea5e9', icon: '🎯',
            def: 'Pressure against BOTH extremes. Population narrows around the average.' },
          { id: 'natural-disruptive',  label: 'Natural — disruptive',   color: '#a855f7', icon: '⇆',
            def: 'Pressure against the AVERAGE. Population splits to both extremes; intermediate phenotypes lose.' },
          { id: 'sexual',              label: 'Sexual selection',       color: '#ec4899', icon: '🦚',
            def: 'Trait spreads via mate choice (or male-male competition), even if it costs survival.' },
          { id: 'artificial',          label: 'Artificial selection',   color: '#f59e0b', icon: '🧑‍🌾',
            def: 'Humans deliberately breed for chosen traits. Crops, livestock, dog breeds.' },
          { id: 'drift',               label: 'Genetic drift',          color: '#94a3b8', icon: '🎲',
            def: 'Random changes in allele frequency, especially in small populations. Bottleneck and founder effects.' }
        ];
        var V = [
          { id: 1, scenario: 'African elephants in heavily-poached areas have shorter (or no) tusks compared to those in protected reserves. Ivory poaching has been intense for ~150 years.', correct: 'natural-directional',
            why: 'Poaching is a survival pressure that favors one extreme (no tusks / small tusks). The population mean for tusk size is shifting in that direction. Not artificial selection because humans aren\'t deliberately breeding the surviving elephants — they\'re just removing the ones with tusks.' },
          { id: 2, scenario: 'Modern dairy cattle produce 2–3× more milk than their 1950s ancestors. Farmers have systematically bred for higher milk yield using AI-selected sires.', correct: 'artificial',
            why: 'Humans deliberately choose which animals reproduce based on a desired trait. That\'s the textbook definition of artificial selection. The pressure isn\'t survival — it\'s breeder decisions.' },
          { id: 3, scenario: 'Peacock males with the longest, most colorful tails are chosen as mates significantly more often. Long tails make them more visible to predators and harder to fly.', correct: 'sexual',
            why: 'Trait spreads despite its survival cost — a hallmark of sexual selection. Mate choice (or male competition) is the selecting force, not survival. Runaway selection produces ornaments that wouldn\'t survive natural-selection scrutiny alone.' },
          { id: 4, scenario: 'On a small Pacific island, a rare blue flower-color variant became the dominant color over 5 generations after a hurricane killed most of the parent generation. The blue color provides no apparent advantage.', correct: 'drift',
            why: 'Bottleneck event + small population + no fitness advantage = genetic drift. Random sampling (the hurricane) shifted allele frequencies by chance. Population size is the giveaway — drift dominates in small populations even when there\'s no selection pressure.' },
          { id: 5, scenario: 'Antibiotic-resistant E. coli strains have become increasingly common in hospitals worldwide over 30 years of widespread penicillin and methicillin use.', correct: 'natural-directional',
            why: 'Antibiotics are a survival pressure favoring one extreme (resistance). Population mean shifts toward higher resistance. Not artificial — humans aren\'t deliberately breeding resistant bacteria; they\'re creating a survival pressure that selects for them. (This is why "finishing your prescription" matters.)' },
          { id: 6, scenario: 'Most human babies cluster around 7–8 lbs at birth. Babies that are very small (premature) or very large (gestational diabetes) have higher mortality. Average-weight babies have the highest survival rate.', correct: 'natural-stabilizing',
            why: 'Pressure against BOTH extremes — small AND large — favoring the average. The population narrows around the optimum. Classic textbook example of stabilizing selection. Birthweight has remained relatively stable in human populations for millennia.' },
          { id: 7, scenario: 'In a finch population, small-beaked birds eat small soft seeds; large-beaked birds crack hard seeds; medium-beaked birds can\'t do either well and have lower fitness.', correct: 'natural-disruptive',
            why: 'Pressure against the AVERAGE. Small AND large are favored; medium loses. This produces a bimodal population distribution and is the precursor to sympatric speciation. Real-world: African seedcracker finches show this exactly.' },
          { id: 8, scenario: 'Modern broccoli, kale, cauliflower, Brussels sprouts, and cabbage all descended from a single wild mustard species (Brassica oleracea), bred over centuries by farmers selecting for different parts (flowers, leaves, stems, buds).', correct: 'artificial',
            why: 'Classic artificial selection — same species, deliberate breeding for divergent human-chosen traits. The diversity within Brassica oleracea is one of the most-cited examples in intro bio. Compare to dog breeds (Canis familiaris) for the same pattern.' },
          { id: 9, scenario: 'Cheetahs have very low genetic diversity. Genetic analysis suggests their ancestors went through a near-extinction bottleneck ~12,000 years ago, with as few as 500 surviving individuals.', correct: 'drift',
            why: 'Bottleneck effect — a form of genetic drift. The few survivors carried only a sample of the original gene pool, by chance. Modern cheetahs are essentially genetic clones of each other. Founder effects (small population colonizing new area) work the same way.' },
          { id: 10, scenario: 'Bowerbird males build elaborate stick-and-decoration display structures (bowers). Females visit multiple bowers and mate with the male whose bower most impresses them. Males with sloppier bowers rarely reproduce.', correct: 'sexual',
            why: 'Mate choice is the selection force. The bower itself doesn\'t aid survival; the trait (bower-building skill) spreads only because females select for it. Compare to peacock tails (#3) — same mechanism, different display modality.' }
        ];

        var sIdx = d.evoSlIdx == null ? -1 : d.evoSlIdx;
        var sSeed = d.evoSlSeed || 1;
        var sAns = !!d.evoSlAns;
        var sPick = d.evoSlPick;
        var sScore = d.evoSlScore || 0;
        var sRounds = d.evoSlRounds || 0;
        var sStreak = d.evoSlStreak || 0;
        var sBest = d.evoSlBest || 0;
        var sShown = d.evoSlShown || [];

        function startSl() {
          var pool = [];
          for (var i = 0; i < V.length; i++) if (sShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); sShown = []; }
          var seedNext = ((sSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('evoSlSeed', seedNext);
          upd('evoSlIdx', pick);
          upd('evoSlAns', false);
          upd('evoSlPick', null);
          upd('evoSlShown', sShown.concat([pick]));
        }
        function pickSl(mechId) {
          if (sAns) return;
          var v = V[sIdx];
          var correct = mechId === v.correct;
          var newScore = sScore + (correct ? 1 : 0);
          var newStreak = correct ? (sStreak + 1) : 0;
          var newBest = Math.max(sBest, newStreak);
          upd('evoSlAns', true);
          upd('evoSlPick', mechId);
          upd('evoSlScore', newScore);
          upd('evoSlRounds', sRounds + 1);
          upd('evoSlStreak', newStreak);
          upd('evoSlBest', newBest);
        }

        if (sIdx < 0) {
          return h('div', { className: 'p-6 max-w-3xl mx-auto' },
            h('button', { onClick: function() { setView('menu'); upd('view', 'menu'); }, className: 'mb-4 text-sm font-bold text-slate-700 hover:text-slate-900' }, '← Back to EvoLab menu'),
            h('h1', { className: 'text-3xl font-black text-amber-700 mb-2' }, '🕵️ Selection Sleuth'),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed mb-4' },
              '10 vignettes. For each, identify which of six mechanisms is driving the evolutionary change. After picking, a coaching block names what makes this mechanism more likely than the others (and what would have to be different to make a different mechanism the right answer).'
            ),
            h('div', { className: 'p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 mb-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-widest text-amber-800 mb-2' }, 'The six mechanisms'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                MECHANISMS.map(function(m) {
                  return h('div', { key: m.id, style: { padding: '10px 12px', borderRadius: 8, background: m.color + '15', border: '1px solid ' + m.color + '55' } },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, m.icon),
                      h('span', { style: { color: m.color, fontWeight: 800, fontSize: 12 } }, m.label)
                    ),
                    h('div', { className: 'text-xs text-slate-700 leading-relaxed' }, m.def)
                  );
                })
              )
            ),
            h('button', {
              onClick: startSl,
              className: 'w-full px-5 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 focus:outline-none focus:ring-2 ring-amber-400'
            }, '🕵️ Start — vignette 1 of 10')
          );
        }

        var v = V[sIdx];
        var pickedCorrect = sAns && sPick === v.correct;
        var pct = sRounds > 0 ? Math.round((sScore / sRounds) * 100) : 0;
        var allDone = sShown.length >= V.length && sAns;
        var correctMech = MECHANISMS.filter(function(m) { return m.id === v.correct; })[0];
        var pickedMech = sPick ? MECHANISMS.filter(function(m) { return m.id === sPick; })[0] : null;

        return h('div', { className: 'p-6 max-w-3xl mx-auto' },
          h('button', { onClick: function() { setView('menu'); upd('view', 'menu'); }, className: 'mb-4 text-sm font-bold text-slate-700 hover:text-slate-900' }, '← Back to EvoLab menu'),
          h('h1', { className: 'text-3xl font-black text-amber-700 mb-2' }, '🕵️ Selection Sleuth'),
          // Score header
          h('div', { className: 'flex flex-wrap gap-3 items-center text-xs text-slate-600 mb-4' },
            h('span', null, 'Vignette ', h('strong', { className: 'text-slate-800' }, sShown.length)),
            h('span', null, 'Score ', h('strong', { className: 'text-emerald-700' }, sScore + ' / ' + sRounds)),
            sRounds > 0 && h('span', null, 'Accuracy ', h('strong', { className: 'text-cyan-700' }, pct + '%')),
            h('span', null, 'Streak ', h('strong', { className: 'text-amber-700' }, sStreak)),
            h('span', null, 'Best ', h('strong', { className: 'text-fuchsia-700' }, sBest))
          ),
          // The vignette
          h('section', { className: 'p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 mb-4' },
            h('div', { className: 'text-xs font-bold uppercase tracking-widest text-amber-700 mb-2' }, 'Vignette ' + sShown.length + ' of ' + V.length),
            h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, v.scenario)
          ),
          // 6 mechanism picker buttons
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-4', role: 'radiogroup', 'aria-label': 'Pick the mechanism' },
            MECHANISMS.map(function(m) {
              var picked = sAns && sPick === m.id;
              var isRight = sAns && m.id === v.correct;
              var bg, border, color;
              if (sAns) {
                if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
              } else {
                bg = m.color + '12'; border = m.color + '60'; color = '#1e293b';
              }
              return h('button', {
                key: m.id, role: 'radio',
                'aria-checked': picked ? 'true' : 'false',
                'aria-label': m.label,
                disabled: sAns,
                onClick: function() { pickSl(m.id); },
                style: { padding: '12px 14px', borderRadius: 12, background: bg, color: color, border: '2px solid ' + border, cursor: sAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 70, transition: 'all 0.15s' }
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, m.icon),
                  h('span', { style: { color: sAns ? color : m.color, fontSize: 13, fontWeight: 800 } }, m.label)
                ),
                h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: sAns ? color : '#475569' } }, m.def)
              );
            })
          ),
          // Feedback
          sAns && h('section', {
            className: 'p-4 rounded-2xl',
            style: {
              background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
              border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
            }
          },
            h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
              pickedCorrect
                ? '✅ Correct — ' + correctMech.label
                : '❌ The mechanism is ' + correctMech.label + (pickedMech ? ' (you picked ' + pickedMech.label + ')' : '')
            ),
            h('p', { className: 'text-xs text-slate-800 leading-relaxed mb-3' }, v.why),
            allDone
              ? h('div', { className: 'p-3 rounded-lg bg-amber-100 border border-amber-300' },
                  h('div', { className: 'text-sm font-black text-amber-800 mb-1' }, '🏆 All 10 vignettes complete'),
                  h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                    'Final: ', h('strong', null, sScore + ' / ' + V.length + ' (' + Math.round((sScore / V.length) * 100) + '%)'),
                    sScore === V.length ? ' — every mechanism correctly identified. Ready for AP Bio FRQ work on selection.' :
                    sScore >= 8 ? ' — strong mechanism reasoning. The most-confused pair is usually natural-directional vs artificial (when humans create a pressure but don\'t deliberately breed) and natural vs sexual (when a trait helps with mate-getting AND survives — both can be active).' :
                    sScore >= 6 ? ' — solid baseline. The biggest reflex to build: ask whether HUMANS deliberately picked which individuals reproduced (artificial), or just removed some (natural).' :
                    ' — these distinctions take practice. The 3 natural-selection modes (directional / stabilizing / disruptive) trip up nearly everyone at first. Re-read the rationales, then retake.'
                  ),
                  h('button', {
                    onClick: function() { upd('evoSlIdx', -1); upd('evoSlShown', []); upd('evoSlScore', 0); upd('evoSlRounds', 0); upd('evoSlStreak', 0); },
                    className: 'mt-3 px-4 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700'
                  }, '🔄 Restart')
                )
              : h('button', {
                  onClick: startSl,
                  className: 'px-4 py-2 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 focus:outline-none focus:ring-2 ring-amber-400'
                }, '➡️ Next vignette')
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // HOMOLOGY VS ANALOGY SLEUTH (net-new mini-game)
      // 10 paired structures; player picks homologous (shared origin, often
      // different function) or analogous (same function, independent origin —
      // convergent evolution). The single most important inferential reflex
      // for reading evolutionary trees.
      // ─────────────────────────────────────────────────────
      function HomologySleuth() {
        var TYPES = [
          { id: 'homologous', label: 'Homologous',  color: '#16a34a', icon: '🦴',
            def: 'Same evolutionary ORIGIN — inherited from a common ancestor — even if function differs. Internal structure (bones, embryo) is the diagnostic.' },
          { id: 'analogous',  label: 'Analogous',   color: '#0ea5e9', icon: '🦋',
            def: 'Same FUNCTION — but independently evolved from different ancestral structures (convergent evolution). Surface similarity, different inside.' }
        ];
        var V = [
          { id: 1, pair: 'Human arm vs whale flipper', correct: 'homologous',
            why: 'Both have humerus, radius, ulna, carpals, metacarpals, phalanges. Same bones, dramatically different jobs (manipulation vs propulsion). The textbook example of homology — shared tetrapod common ancestor ~370 million years ago.' },
          { id: 2, pair: 'Bird wing vs butterfly wing', correct: 'analogous',
            why: 'Both fly. But bird wing = modified vertebrate forelimb (humerus, radius, ulna, fused digits). Butterfly wing = epithelial outgrowth on thorax with chitinous veins, no bones. Independent solutions to the same physics problem.' },
          { id: 3, pair: 'Bat wing vs whale flipper', correct: 'homologous',
            why: 'Both are mammalian forelimbs with the same bones (humerus, radius, ulna, carpals, phalanges). Bat = elongated digits supporting membrane; whale = shortened digits in fluke. Different functions (flight vs swimming) from the SAME ancestral tetrapod limb.' },
          { id: 4, pair: 'Octopus eye vs human eye', correct: 'analogous',
            why: 'Camera-eye anatomy in both: lens, retina, iris. But cephalopods and vertebrates last shared an eyeless common ancestor ~600 million years ago. Eyes evolved independently — convergent evolution under similar selection (focus light onto a sensor).' },
          { id: 5, pair: 'Shark dorsal fin vs dolphin dorsal fin', correct: 'analogous',
            why: 'Same job (stability while swimming), different origins. Shark = cartilaginous fish, fin supported by ceratotrichia. Dolphin = mammal, fin supported by connective tissue (no bones in dorsal fin specifically). Convergent for streamlined swimming.' },
          { id: 6, pair: 'Cactus spine vs rose thorn', correct: 'analogous',
            why: 'Both are sharp protective structures, but cactus spines are MODIFIED LEAVES (each spine arises from an areole — a bud) while rose thorns are MODIFIED EPIDERMIS (skin outgrowths from the stem). Same function, different ancestral organs.' },
          { id: 7, pair: 'Vestigial whale pelvic bones vs functional dog pelvis', correct: 'homologous',
            why: 'Whales descended from terrestrial mammals (~50 mya — Pakicetus and friends). Modern whales retain vestigial pelvic bones from those ancestors — sometimes used as anchor points for reproductive muscles. Same bones as dog pelvis, lost their original function. Strong evidence of common descent.' },
          { id: 8, pair: 'Hummingbird hover-flight vs hummingbird-moth hover-flight', correct: 'analogous',
            why: 'Both hover at flowers and drink nectar with long tongues — but hummingbird = bird (vertebrate, feathered wings, hollow bones), hummingbird moth = insect (exoskeleton, chitinous wings, no bones). Convergent evolution under the same nectar-feeding niche pressure.' },
          { id: 9, pair: 'Wolf canine teeth vs vampire bat canine teeth', correct: 'homologous',
            why: 'Both are mammalian canines from the same ancestral mammalian dentition. Wolf = piercing/tearing meat; vampire bat = piercing skin to access blood. Same homologous tooth specialized for different food sources. Mammalian dental homology is one of the strongest cross-clade inheritance signatures.' },
          { id: 10, pair: 'Insect wing vs bird wing', correct: 'analogous',
            why: 'Insects and vertebrates last shared an ancestor before either had wings. Insect wings evolved from epithelial outgrowths on the thorax (or possibly modified gill structures); bird wings evolved from modified theropod-dinosaur forelimbs. Two completely independent paths to powered flight.' }
        ];

        var hsIdx = d.hsIdx == null ? -1 : d.hsIdx;
        var hsSeed = d.hsSeed || 1;
        var hsAns = !!d.hsAns;
        var hsPick = d.hsPick;
        var hsScore = d.hsScore || 0;
        var hsRounds = d.hsRounds || 0;
        var hsStreak = d.hsStreak || 0;
        var hsBest = d.hsBest || 0;
        var hsShown = d.hsShown || [];

        function startHs() {
          var pool = [];
          for (var i = 0; i < V.length; i++) if (hsShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); hsShown = []; }
          var seedNext = ((hsSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('hsSeed', seedNext);
          upd('hsIdx', pick);
          upd('hsAns', false);
          upd('hsPick', null);
          upd('hsShown', hsShown.concat([pick]));
        }
        function pickHs(typeId) {
          if (hsAns) return;
          var v = V[hsIdx];
          var correct = typeId === v.correct;
          var newScore = hsScore + (correct ? 1 : 0);
          var newStreak = correct ? (hsStreak + 1) : 0;
          var newBest = Math.max(hsBest, newStreak);
          upd('hsAns', true);
          upd('hsPick', typeId);
          upd('hsScore', newScore);
          upd('hsRounds', hsRounds + 1);
          upd('hsStreak', newStreak);
          upd('hsBest', newBest);
        }

        if (hsIdx < 0) {
          return h('div', { className: 'p-6 max-w-3xl mx-auto' },
            h('button', { onClick: function() { setView('menu'); upd('view', 'menu'); }, className: 'mb-4 text-sm font-bold text-slate-700 hover:text-slate-900' }, '← Back to EvoLab menu'),
            h('h1', { className: 'text-3xl font-black text-cyan-700 mb-2' }, '🦴 Homology vs Analogy'),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed mb-4' },
              '10 pairs of structures. For each, decide: HOMOLOGOUS (shared evolutionary origin — same ancestral structure even if function differs) or ANALOGOUS (same function but independently evolved — convergent evolution). The single most important inferential reflex for reading evolutionary trees.'
            ),
            h('div', { className: 'p-4 rounded-2xl bg-cyan-50 border-2 border-cyan-300 mb-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-widest text-cyan-800 mb-2' }, 'The two types'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                TYPES.map(function(t) {
                  return h('div', { key: t.id, style: { padding: '10px 12px', borderRadius: 8, background: t.color + '15', border: '1px solid ' + t.color + '55' } },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, t.icon),
                      h('span', { style: { color: t.color, fontWeight: 800, fontSize: 13 } }, t.label)
                    ),
                    h('div', { className: 'text-xs text-slate-700 leading-relaxed' }, t.def)
                  );
                })
              )
            ),
            h('button', {
              onClick: startHs,
              className: 'w-full px-5 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-700 focus:outline-none focus:ring-2 ring-cyan-400'
            }, '🦴 Start — pair 1 of 10')
          );
        }

        var v = V[hsIdx];
        var pickedCorrect = hsAns && hsPick === v.correct;
        var pct = hsRounds > 0 ? Math.round((hsScore / hsRounds) * 100) : 0;
        var allDone = hsShown.length >= V.length && hsAns;
        var correctType = TYPES.filter(function(t) { return t.id === v.correct; })[0];
        var pickedType = hsPick ? TYPES.filter(function(t) { return t.id === hsPick; })[0] : null;

        return h('div', { className: 'p-6 max-w-3xl mx-auto' },
          h('button', { onClick: function() { setView('menu'); upd('view', 'menu'); }, className: 'mb-4 text-sm font-bold text-slate-700 hover:text-slate-900' }, '← Back to EvoLab menu'),
          h('h1', { className: 'text-3xl font-black text-cyan-700 mb-2' }, '🦴 Homology vs Analogy'),
          h('div', { className: 'flex flex-wrap gap-3 items-center text-xs text-slate-600 mb-4' },
            h('span', null, 'Pair ', h('strong', { className: 'text-slate-800' }, hsShown.length)),
            h('span', null, 'Score ', h('strong', { className: 'text-emerald-700' }, hsScore + ' / ' + hsRounds)),
            hsRounds > 0 && h('span', null, 'Accuracy ', h('strong', { className: 'text-cyan-700' }, pct + '%')),
            h('span', null, 'Streak ', h('strong', { className: 'text-amber-700' }, hsStreak)),
            h('span', null, 'Best ', h('strong', { className: 'text-fuchsia-700' }, hsBest))
          ),
          h('section', { className: 'p-5 rounded-2xl bg-cyan-50 border-2 border-cyan-300 mb-4' },
            h('div', { className: 'text-xs font-bold uppercase tracking-widest text-cyan-700 mb-2' }, 'Pair ' + hsShown.length + ' of ' + V.length),
            h('p', { className: 'text-base text-slate-800 leading-relaxed font-bold' }, v.pair)
          ),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-4', role: 'radiogroup', 'aria-label': 'Pick the relationship type' },
            TYPES.map(function(t) {
              var picked = hsAns && hsPick === t.id;
              var isRight = hsAns && t.id === v.correct;
              var bg, border, color;
              if (hsAns) {
                if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
              } else {
                bg = t.color + '12'; border = t.color + '60'; color = '#1e293b';
              }
              return h('button', {
                key: t.id, role: 'radio',
                'aria-checked': picked ? 'true' : 'false',
                'aria-label': t.label,
                disabled: hsAns,
                onClick: function() { pickHs(t.id); },
                style: { padding: '14px 16px', borderRadius: 12, background: bg, color: color, border: '2px solid ' + border, cursor: hsAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 13, minHeight: 80, transition: 'all 0.15s' }
              },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, t.icon),
                  h('span', { style: { color: hsAns ? color : t.color, fontSize: 15, fontWeight: 800 } }, t.label)
                ),
                h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.5, color: hsAns ? color : '#475569' } }, t.def)
              );
            })
          ),
          hsAns && h('section', {
            className: 'p-4 rounded-2xl',
            style: {
              background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
              border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
            }
          },
            h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
              pickedCorrect
                ? '✅ Correct — ' + correctType.label
                : '❌ The relationship is ' + correctType.label + (pickedType ? ' (you picked ' + pickedType.label + ')' : '')
            ),
            h('p', { className: 'text-xs text-slate-800 leading-relaxed mb-3' }, v.why),
            allDone
              ? h('div', { className: 'p-3 rounded-lg bg-cyan-100 border border-cyan-300' },
                  h('div', { className: 'text-sm font-black text-cyan-900 mb-1' }, '🏆 All 10 pairs complete'),
                  h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                    'Final: ', h('strong', null, hsScore + ' / ' + V.length + ' (' + Math.round((hsScore / V.length) * 100) + '%)'),
                    hsScore === V.length ? ' — ready to read evolutionary trees and spot convergent evolution in the wild.' :
                    hsScore >= 8 ? ' — strong inferential reasoning. The most-confused pairs are usually the convergent-eye ones (octopus vs human) and the modified-organ-of-origin ones (cactus spine = leaf, rose thorn = epidermis).' :
                    ' — these distinctions take practice. The diagnostic question: "do they share an ancestor with the SAME structure?" Yes = homologous. No = analogous. Re-read the rationales, then retake.'
                  ),
                  h('button', {
                    onClick: function() { upd('hsIdx', -1); upd('hsShown', []); upd('hsScore', 0); upd('hsRounds', 0); upd('hsStreak', 0); },
                    className: 'mt-3 px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-700'
                  }, '🔄 Restart')
                )
              : h('button', {
                  onClick: startHs,
                  className: 'px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 ring-cyan-400'
                }, '➡️ Next pair')
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // CAPSTONE PROJECT
      // ─────────────────────────────────────────────────────
      // Students pick a real-world evolutionary scenario, predict outcomes,
      // run the matching sim, then reflect. Final step generates a printable
      // lab report. This is the assessment artifact teachers can grade.
      // Designed as a wizard: each step gates the next.
      function CapstoneProject() {
        // 4 preset scenarios + a custom option. Each maps to a recommended
        // module to run for the data-collection step.
        var SCENARIOS = [
          {
            id: 'pesticide',
            title: 'Pesticide Resistance in a Wheat Field',
            icon: '🌾',
            color: 'from-fuchsia-500 to-pink-700',
            problem: 'A farmer applies a strong pesticide to a wheat field every season. The pest population starts with about 1% of individuals carrying a rare resistance gene. After 10 generations of repeated pesticide use, what happens to the pest population?',
            module: 'antibioticLab',
            moduleLabel: '💊 Antibiotic Resistance Lab',
            moduleHint: 'Use the Antibiotic Resistance Lab as your model — same mechanism, different organism. Set Starting Resistance to 1%, Apply Antibiotic, and run for 10-30 ticks.',
            predictPrompts: [
              'After 10 generations of pesticide use, will the pest population go extinct, stay the same, or shift toward resistance?',
              'What % of pests will be resistant after 10 generations? (Make a numerical estimate.)',
              'If the farmer stopped using pesticide after the population became resistant, would resistance disappear? Explain.'
            ],
            reflectPrompts: [
              'How did your prediction compare to what you observed in the simulation?',
              'What real-world implications does this have for agriculture?',
              'Suggest 2-3 strategies a farmer could use to slow the evolution of pesticide resistance.'
            ]
          },
          {
            id: 'island',
            title: 'The Stranded Island Population',
            icon: '🏝️',
            color: 'from-cyan-500 to-blue-700',
            problem: 'A storm blows a small flock of 10 birds to a previously uninhabited island. They establish a new population. Their original mainland population has 50% allele A and 50% allele a at a specific gene. After 100 generations on the island (with no further migration), what will the island\'s allele frequencies look like?',
            module: 'geneticDrift',
            moduleLabel: '🎲 Genetic Drift Simulator',
            moduleHint: 'Use the Genetic Drift Simulator with N=10 (matches the founders) and 100 generations. Run multiple lineages to see the range of possible outcomes.',
            predictPrompts: [
              'Will the island population\'s allele frequencies stay near 50/50, drift to fixation (0 or 1), or something else?',
              'If you run this scenario 5 different times, will the outcomes be similar to each other or different? Why?',
              'How does this connect to the "founder effect" in real biology?'
            ],
            reflectPrompts: [
              'Did the simulation outcomes match your prediction?',
              'Why is genetic diversity often LOWER on islands than on mainlands?',
              'How does this relate to conservation of endangered species (e.g., why we worry when a population drops to a few hundred individuals)?'
            ]
          },
          {
            id: 'climate',
            title: 'Climate Change in Maine',
            icon: '❄️',
            color: 'from-emerald-500 to-teal-700',
            problem: 'Maine winters are getting shorter. Historically, snowshoe hares molted to white fur in November to match the snow. Today, the snow often doesn\'t arrive until December — leaving white-coated hares against bare brown ground for weeks. Over the next 50 generations, what will happen to the hare population\'s molt-timing genes?',
            module: 'selectionSandbox',
            moduleLabel: '🧪 Selection Sandbox',
            moduleHint: 'Use the Selection Sandbox with the "Maine Snowshoe Hare" preset. The "ideal" trait is set to 0.32 (delayed molt). Run for 30+ generations.',
            predictPrompts: [
              'Will the population shift toward earlier molting, later molting, or stay the same? Why?',
              'How fast can selection respond to climate change? What does the speed depend on?',
              'Could this lead to extinction if the climate changes faster than the population can evolve?'
            ],
            reflectPrompts: [
              'Did the simulation match your prediction about the direction and rate of evolution?',
              'What other Maine species might face similar climate-driven selection pressure?',
              'How is this scenario different from human-driven selection (like in the Pesticide Resistance scenario)?'
            ]
          },
          {
            id: 'invasive',
            title: 'The Invasive Species Arms Race',
            icon: '🌿',
            color: 'from-amber-500 to-orange-700',
            problem: 'Garlic mustard, an invasive plant from Europe, is taking over Maine forests. Native plants haven\'t evolved defenses against its allelopathic chemicals (it poisons soil for competing plants). Over 200 years of coexistence, how will native plants and garlic mustard coevolve?',
            module: 'coevolution',
            moduleLabel: '🐆 Coevolution Lab',
            moduleHint: 'Use the Coevolution Lab as a model. Treat predator = invasive species, prey = native plant. Apply Hunt Pressure for the invasive\'s strong selection. Try with and without "Cost of Speed" enabled.',
            predictPrompts: [
              'Will native plants evolve resistance to garlic mustard\'s chemicals over 200 years? Why or why not?',
              'Will garlic mustard evolve in response? In what direction?',
              'Will one side "win" or will they coexist in a Red Queen-style arms race?'
            ],
            reflectPrompts: [
              'How well did the predator-prey model fit the plant-vs-plant scenario?',
              'Real-world example: California sea otters keep purple urchins in check. When otters were nearly hunted to extinction, urchins exploded and destroyed kelp forests. How does this fit the Coevolution model?',
              'What management interventions could help native Maine plants while limiting garlic mustard?'
            ]
          },
          {
            id: 'custom',
            title: 'Design Your Own Scenario',
            icon: '🛠️',
            color: 'from-violet-500 to-purple-700',
            problem: '(Open-ended) — Pick any evolutionary scenario you\'re curious about. Could be observed evolution (peppered moths, antibiotic resistance, hawthorn flies), conservation biology (a small endangered population), human evolution (lactase persistence, sickle cell, malaria resistance), or speculation (what if dinosaurs hadn\'t gone extinct?).',
            module: null,
            moduleLabel: 'Pick the most relevant module from the menu',
            moduleHint: 'Match your scenario to a module: selection in one population → Selection Sandbox; two populations → Speciation or Coevolution; small isolated population → Genetic Drift; molecular timescale → Antibiotic Lab. If your scenario is purely conceptual, use the module that best fits the underlying mechanism.',
            predictPrompts: [
              'Describe your scenario in your own words.',
              'What evolutionary mechanism do you think drives the change (selection, drift, mutation, gene flow, or some combination)?',
              'What outcome do you predict, and why?'
            ],
            reflectPrompts: [
              'Did the simulation outcome match your prediction?',
              'What were the LIMITATIONS of using a simulation for this scenario? What would the real-world data look different from?',
              'What FOLLOW-UP question would you want to investigate next?'
            ]
          }
        ];

        var stepState = useState(0), step = stepState[0], setStep = stepState[1];
        var scenarioState = useState(null), scenarioId = scenarioState[0], setScenarioId = scenarioState[1];
        var nameState = useState(''), studentName = nameState[0], setStudentName = nameState[1];
        var predictionsState = useState(['', '', '']), predictions = predictionsState[0], setPredictions = predictionsState[1];
        var reflectionsState = useState(['', '', '']), reflections = reflectionsState[0], setReflections = reflectionsState[1];

        var scenario = scenarioId ? SCENARIOS.find(function(s) { return s.id === scenarioId; }) : null;

        var resetAll = function() {
          setStep(0); setScenarioId(null); setStudentName('');
          setPredictions(['', '', '']); setReflections(['', '', '']);
          announce('Capstone Project reset.');
        };

        var canAdvance = function() {
          if (step === 0) return !!scenarioId;
          if (step === 1) return predictions.every(function(p) { return p.trim().length >= 10; });
          if (step === 2) return true; // Just running the sim is enough to advance
          if (step === 3) return reflections.every(function(r) { return r.trim().length >= 10; });
          return false;
        };

        var setPrediction = function(idx, val) {
          var next = predictions.slice();
          next[idx] = val;
          setPredictions(next);
        };
        var setReflection = function(idx, val) {
          var next = reflections.slice();
          next[idx] = val;
          setReflections(next);
        };

        // Step 0: Pick a scenario
        var renderStep0 = function() {
          return h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-lg font-black text-slate-800 mb-2' }, 'Step 1: Pick your scenario'),
            h('p', { className: 'text-sm text-slate-600 mb-4' }, 'Each scenario is a real-world evolutionary problem. Pick one that interests you. The Custom option is open-ended.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              SCENARIOS.map(function(s) {
                var selected = scenarioId === s.id;
                return h('button', {
                  key: s.id,
                  onClick: function() { setScenarioId(s.id); },
                  'aria-pressed': selected,
                  'aria-label': 'Pick scenario: ' + s.title,
                  className: 'text-left rounded-xl border-2 ' + (selected ? 'border-emerald-500 ring-4 ring-emerald-200' : 'border-slate-200 hover:border-slate-400') + ' bg-white overflow-hidden transition-all'
                },
                  h('div', { className: 'bg-gradient-to-br ' + s.color + ' p-4 text-white' },
                    h('div', { className: 'flex items-center gap-3 mb-1' },
                      h('span', { className: 'text-3xl' }, s.icon),
                      h('h4', { className: 'text-base font-black' }, s.title)
                    )
                  ),
                  h('p', { className: 'p-3 text-sm text-slate-700 leading-relaxed' }, s.problem)
                );
              })
            ),
            h('div', { className: 'mt-4' },
              h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 block' }, 'Your Name (optional, for the report)'),
              h('input', {
                type: 'text',
                value: studentName,
                onChange: function(e) { setStudentName(e.target.value); },
                placeholder: 'Enter your name…',
                'aria-label': 'Student name for the lab report',
                className: 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
              })
            )
          );
        };

        // Step 1: Make predictions
        var renderStep1 = function() {
          if (!scenario) return null;
          return h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-lg font-black text-slate-800 mb-2' }, 'Step 2: Predict the outcome'),
            h('div', { className: 'bg-slate-100 border border-slate-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '🎯 Your scenario'),
              h('p', { className: 'text-sm text-slate-700' }, scenario.problem)
            ),
            h('p', { className: 'text-sm text-slate-600 mb-4' }, 'Before you run any simulation: write down your predictions. Be specific. Use complete sentences. Aim for at least 2-3 sentences per prompt.'),
            scenario.predictPrompts.map(function(prompt, i) {
              return h('div', { key: i, className: 'mb-3' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 block' },
                  'Prediction ' + (i + 1)
                ),
                h('div', { className: 'text-sm text-slate-700 mb-2 italic' }, prompt),
                h('textarea', {
                  value: predictions[i] || '',
                  onChange: function(e) { setPrediction(i, e.target.value); },
                  rows: 3,
                  placeholder: 'Type your prediction…',
                  'aria-label': 'Prediction ' + (i + 1) + ': ' + prompt,
                  className: 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 leading-relaxed'
                }),
                h('div', { className: 'text-[10px] text-slate-600 mt-1' }, predictions[i] && predictions[i].length >= 10 ? '✓ Looks good' : 'Need at least 10 characters')
              );
            })
          );
        };

        // Step 2: Run the simulation
        var renderStep2 = function() {
          if (!scenario) return null;
          return h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-lg font-black text-slate-800 mb-2' }, 'Step 3: Run the simulation'),
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1' }, '🧪 Recommended module'),
              h('div', { className: 'text-base font-bold text-slate-800 mb-2' }, scenario.moduleLabel),
              h('p', { className: 'text-sm text-slate-700 mb-3' }, scenario.moduleHint),
              scenario.module && h('button', {
                onClick: function() { goto(scenario.module); },
                'aria-label': 'Open ' + scenario.moduleLabel + ' to run the simulation',
                className: 'px-5 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
              }, '→ Open ' + scenario.moduleLabel)
            ),
            h('div', { className: 'bg-amber-50 border border-amber-300 rounded-xl p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, '📓 What to record'),
              h('ul', { className: 'list-disc list-inside text-sm text-slate-700 space-y-1' },
                h('li', null, 'The starting state of the simulation (population size, trait distribution).'),
                h('li', null, 'Any settings you adjusted (selection strength, mutation rate, etc.).'),
                h('li', null, 'The state after running for the recommended number of generations.'),
                h('li', null, 'Any patterns or surprises you noticed.')
              ),
              h('p', { className: 'text-sm text-slate-600 mt-2 italic' }, 'Take screenshots, write notes — you\'ll use them in the next step.')
            ),
            h('div', { className: 'text-center' },
              h('button', {
                onClick: function() { setStep(3); },
                'aria-label': 'I\'ve run the simulation; advance to the reflection step',
                className: 'px-5 py-2.5 rounded-lg font-bold bg-cyan-500 hover:bg-cyan-600 text-white'
              }, '✓ I\'ve run it — continue')
            )
          );
        };

        // Step 3: Reflect
        var renderStep3 = function() {
          if (!scenario) return null;
          return h('div', { className: 'space-y-3' },
            h('h3', { className: 'text-lg font-black text-slate-800 mb-2' }, 'Step 4: Reflect on your findings'),
            h('p', { className: 'text-sm text-slate-600 mb-4' }, 'Compare what you observed to what you predicted. Be honest if your prediction was wrong — that\'s how you learn.'),
            scenario.reflectPrompts.map(function(prompt, i) {
              return h('div', { key: i, className: 'mb-3' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 block' },
                  'Reflection ' + (i + 1)
                ),
                h('div', { className: 'text-sm text-slate-700 mb-2 italic' }, prompt),
                h('textarea', {
                  value: reflections[i] || '',
                  onChange: function(e) { setReflection(i, e.target.value); },
                  rows: 3,
                  placeholder: 'Type your reflection…',
                  'aria-label': 'Reflection ' + (i + 1) + ': ' + prompt,
                  className: 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 leading-relaxed'
                }),
                h('div', { className: 'text-[10px] text-slate-600 mt-1' }, reflections[i] && reflections[i].length >= 10 ? '✓ Looks good' : 'Need at least 10 characters')
              );
            })
          );
        };

        // Step 4: Final report
        var renderReport = function() {
          if (!scenario) return null;
          var date = new Date().toLocaleDateString();
          return h('div', { className: 'space-y-4' },
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-400 rounded-xl p-3 evolab-no-print' },
              h('div', { className: 'flex items-center gap-2 text-emerald-800 font-bold' },
                h('span', { className: 'text-xl' }, '🎉'),
                h('span', null, 'Capstone complete! Print this page to submit your report.')
              )
            ),
            // The print-friendly report itself
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-6 space-y-4' },
              // Header
              h('div', { className: 'border-b-2 border-slate-300 pb-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-widest text-emerald-700' }, '🧬 EvoLab Capstone Project — Lab Report'),
                h('h2', { className: 'text-2xl font-black text-slate-900 mt-1' }, scenario.title),
                h('div', { className: 'text-sm text-slate-700 mt-1' },
                  studentName && h('span', null, h('strong', null, 'Student: '), studentName, ' · '),
                  h('span', null, h('strong', null, 'Date: '), date),
                  h('span', null, ' · '),
                  h('strong', null, 'Module used: '),
                  scenario.moduleLabel
                )
              ),
              // Problem statement
              h('div', null,
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-emerald-800 mb-1' }, '1. Problem Statement'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, scenario.problem)
              ),
              // Predictions
              h('div', null,
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-emerald-800 mb-1' }, '2. Predictions (made BEFORE running the sim)'),
                h('ol', { className: 'list-decimal list-outside pl-5 space-y-2' },
                  scenario.predictPrompts.map(function(prompt, i) {
                    return h('li', { key: i, className: 'text-sm text-slate-800 leading-relaxed' },
                      h('div', { className: 'text-slate-600 italic mb-1' }, prompt),
                      h('div', null, predictions[i] || h('span', { className: 'text-rose-600' }, '(no answer recorded)'))
                    );
                  })
                )
              ),
              // Reflections
              h('div', null,
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-emerald-800 mb-1' }, '3. Findings & Reflection (after running the sim)'),
                h('ol', { className: 'list-decimal list-outside pl-5 space-y-2' },
                  scenario.reflectPrompts.map(function(prompt, i) {
                    return h('li', { key: i, className: 'text-sm text-slate-800 leading-relaxed' },
                      h('div', { className: 'text-slate-600 italic mb-1' }, prompt),
                      h('div', null, reflections[i] || h('span', { className: 'text-rose-600' }, '(no answer recorded)'))
                    );
                  })
                )
              ),
              // Footer
              h('div', { className: 'border-t-2 border-slate-300 pt-3 text-xs text-slate-600 italic' },
                'Generated by EvoLab Capstone Project · Use the print button below to save or submit this report.'
              )
            ),
            h('div', { className: 'flex flex-wrap gap-2 justify-center evolab-no-print' },
              h('button', {
                onClick: function() { try { window.print(); } catch (_) {} },
                className: 'px-5 py-2.5 rounded-lg font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow'
              }, '🖨️ Print This Report'),
              h('button', {
                onClick: resetAll,
                className: 'px-5 py-2.5 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700'
              }, '↻ Start a New Project')
            )
          );
        };

        var STEPS = ['Pick scenario', 'Predict', 'Run sim', 'Reflect', 'Report'];

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🎓', title: 'Capstone Project' }),
          h('div', { className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
            // Hero (hidden in print)
            h('div', { className: 'evolab-no-print bg-gradient-to-br from-emerald-700 to-cyan-800 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-5xl' }, '🎓'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black' }, 'Design, predict, run, reflect'),
                  h('p', { className: 'text-sm text-emerald-50 mt-1' }, 'A 4-step research project. Pick a real-world evolutionary scenario, predict what will happen, run the matching simulation, then reflect on what you observed. The final step generates a print-ready lab report. Tip: be willing to be wrong — incorrect predictions are how you learn.')
                )
              )
            ),
            // Progress stepper (hidden in print)
            h('div', { 'aria-label': 'Progress', className: 'evolab-no-print bg-white rounded-xl shadow border border-slate-300 p-3' },
              h('div', { className: 'flex items-center justify-between gap-1' },
                STEPS.map(function(stepName, i) {
                  var isCurrent = i === step;
                  var isDone = i < step;
                  return h('div', { key: i, className: 'flex items-center flex-1 ' + (i === STEPS.length - 1 ? '' : 'after:flex-1') },
                    h('div', { className: 'flex flex-col items-center flex-1' },
                      h('div', { className: 'w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm ' + (isCurrent ? 'bg-emerald-600 text-white shadow' : isDone ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600') }, isDone ? '✓' : (i + 1)),
                      h('div', { className: 'text-[10px] font-bold mt-1 ' + (isCurrent ? 'text-emerald-700' : 'text-slate-600') }, stepName)
                    ),
                    i < STEPS.length - 1 && h('div', { 'aria-hidden': true, className: 'h-0.5 flex-1 ' + (i < step ? 'bg-emerald-300' : 'bg-slate-200') })
                  );
                })
              )
            ),
            // Step content
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 evolab-print-keep' },
              step === 0 && renderStep0(),
              step === 1 && renderStep1(),
              step === 2 && renderStep2(),
              step === 3 && renderStep3(),
              step === 4 && renderReport()
            ),
            // Navigation buttons (hidden on report step + in print)
            step < 4 && h('div', { className: 'evolab-no-print flex items-center justify-between gap-3' },
              h('button', {
                onClick: function() { if (step > 0) setStep(step - 1); },
                disabled: step === 0,
                className: 'px-5 py-2.5 rounded-lg font-bold ' + (step === 0 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, '← Back'),
              h('button', {
                onClick: function() {
                  if (canAdvance() && step < 4) setStep(step + 1);
                },
                disabled: !canAdvance(),
                'aria-label': step === 3 ? 'Generate the final report' : 'Advance to the next step',
                className: 'px-5 py-2.5 rounded-lg font-bold ' + (canAdvance() ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow' : 'bg-slate-200 text-slate-700 cursor-not-allowed')
              }, step === 3 ? '🎓 Generate Report →' : 'Continue →')
            ),
            // Teacher Notes
            h(TeacherNotes, {
              standards: ['HS-LS4-2', 'HS-LS4-4', 'HS-LS4-5', 'HS-LS4-6', 'NOS'],
              questions: [
                'Did students predict accurately, or were they surprised? What does each tell you about their conceptual understanding?',
                'For the Custom scenario: was the student\'s scenario genuinely evolutionary, or were they describing something else (e.g., individual adaptation, learning, or non-heritable change)?',
                'In their reflection, did students acknowledge the LIMITATIONS of using a simulation as evidence?',
                'Are students writing in their own words or echoing the prompts back?'
              ],
              misconceptions: [
                'Watch for "the species evolved BECAUSE it needed to" framing — that\'s goal-driven (Lamarckian) thinking.',
                'Students may treat the simulation as definitive proof rather than a model. Push them to think about what real-world data would look different from the sim.',
                'Some students will conflate the simulated trait with the real-world phenotype. The simulator abstracts a lot.'
              ],
              extension: 'Students who finish early can take a SECOND scenario and write a comparison: how were the two evolutionary mechanisms similar? Different? What does each scenario reveal that the other couldn\'t?'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE MAP — visual flowchart of how modules connect
      // ─────────────────────────────────────────────────────
      // Shows the 11 modules organized into concentric "scales" of evolution:
      // alleles (innermost) → traits in one population → traits between
      // populations → all of life → application/cleanup (outermost). Lines
      // between modules show the recommended flow ("Next up" suggestions).
      // Helps teachers and students see the conceptual architecture instead
      // of feeling lost in a flat menu of 11 cards.
      function ModuleMap() {
        // Map cluster groups — each row is a row in the visual map.
        var GROUPS = [
          {
            id: 'foundations', label: 'Allele-level mechanics', color: 'bg-cyan-100 border-cyan-400 text-cyan-900',
            description: 'How allele frequencies change. The math under everything else.',
            modules: [
              { id: 'hardyWeinberg', icon: '🧮', name: 'Hardy-Weinberg' },
              { id: 'geneticDrift', icon: '🎲', name: 'Genetic Drift' }
            ]
          },
          {
            id: 'within', label: 'Within one population', color: 'bg-emerald-100 border-emerald-400 text-emerald-900',
            description: 'How a single species changes over generations under selection.',
            modules: [
              { id: 'selectionSandbox', icon: '🧪', name: 'Selection Sandbox' },
              { id: 'beakLab', icon: '🐦', name: 'Beak Lab' },
              { id: 'antibioticLab', icon: '💊', name: 'Antibiotic Resistance' }
            ]
          },
          {
            id: 'between', label: 'Between populations', color: 'bg-indigo-100 border-indigo-400 text-indigo-900',
            description: 'What happens when isolated populations diverge, or two species coevolve.',
            modules: [
              { id: 'speciation', icon: '🌗', name: 'Speciation' },
              { id: 'coevolution', icon: '🐆', name: 'Coevolution' }
            ]
          },
          {
            id: 'macro', label: 'Across all of life', color: 'bg-violet-100 border-violet-400 text-violet-900',
            description: 'Macroevolutionary patterns. Common ancestry. The tree of life.',
            modules: [
              { id: 'phyloBuilder', icon: '🌳', name: 'Phylo Tree Builder' },
              { id: 'commonAncestry', icon: '🦴', name: 'Common Ancestry' }
            ]
          },
          {
            id: 'meta', label: 'Context & cleanup', color: 'bg-stone-100 border-stone-400 text-stone-900',
            description: 'History of the science, and the most common student misconceptions.',
            modules: [
              { id: 'discoveryTimeline', icon: '📜', name: 'Discovery Timeline' },
              { id: 'misconceptions', icon: '❓', name: 'Misconceptions Quiz' }
            ]
          }
        ];

        // The "recommended flow" — pairs of (from, to) used to draw arrow paths.
        // Mirrors the cross-module 'Next up' suggestions in each module.
        var FLOW = [
          ['hardyWeinberg', 'geneticDrift'],
          ['geneticDrift', 'selectionSandbox'],
          ['selectionSandbox', 'beakLab'],
          ['beakLab', 'speciation'],
          ['speciation', 'coevolution'],
          ['coevolution', 'antibioticLab'],
          ['antibioticLab', 'phyloBuilder'],
          ['phyloBuilder', 'commonAncestry'],
          ['commonAncestry', 'discoveryTimeline'],
          ['discoveryTimeline', 'misconceptions']
        ];

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '🗺️', title: 'Module Map' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-4' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-5xl' }, '🗺️'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black' }, 'How the modules connect'),
                  h('p', { className: 'text-sm text-amber-50 mt-1' }, 'EvoLab\'s 11 modules are organized into 5 conceptual scales — from individual alleles changing in a population, all the way out to the history and cleanup of evolution as a science. The recommended flow (the dotted arrows) walks you through them in a natural learning order, but you can jump anywhere anytime.')
                )
              )
            ),
            // Five scale rows
            h('div', { className: 'space-y-3' },
              GROUPS.map(function(g, i) {
                return h('div', { key: g.id, className: 'rounded-2xl border-2 ' + g.color + ' p-4' },
                  h('div', { className: 'flex items-center gap-3 mb-3' },
                    h('div', { className: 'w-8 h-8 rounded-full bg-white border-2 ' + g.color + ' flex items-center justify-center font-black text-sm' }, i + 1),
                    h('div', null,
                      h('h3', { className: 'text-base font-black' }, g.label),
                      h('div', { className: 'text-xs opacity-80' }, g.description)
                    )
                  ),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
                    g.modules.map(function(m) {
                      return h('button', {
                        key: m.id,
                        onClick: function() { goto(m.id); },
                        'aria-label': 'Open ' + m.name + ' module',
                        className: 'flex items-center gap-2 p-3 bg-white border-2 border-slate-200 hover:border-slate-400 rounded-lg transition-colors text-left'
                      },
                        h('span', { className: 'text-2xl' }, m.icon),
                        h('span', { className: 'text-sm font-bold text-slate-800' }, m.name)
                      );
                    })
                  )
                );
              })
            ),
            // Recommended flow legend
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, '🧭 Recommended flow (the "Next up" path)'),
              h('div', { className: 'flex flex-wrap gap-1 items-center text-xs text-slate-700' },
                FLOW.map(function(pair, i) {
                  // Find the module name for the FROM step
                  var fromModule = null;
                  for (var k = 0; k < GROUPS.length; k++) {
                    var found = GROUPS[k].modules.find(function(m) { return m.id === pair[0]; });
                    if (found) { fromModule = found; break; }
                  }
                  if (!fromModule) return null;
                  return h('span', { key: i, className: 'flex items-center gap-1' },
                    h('span', { className: 'inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded' },
                      h('span', null, fromModule.icon),
                      h('span', null, fromModule.name)
                    ),
                    h('span', { className: 'text-slate-400 mx-1' }, '→')
                  );
                }),
                // Last step destination
                (function() {
                  var lastTo = FLOW[FLOW.length - 1][1];
                  for (var k = 0; k < GROUPS.length; k++) {
                    var found = GROUPS[k].modules.find(function(m) { return m.id === lastTo; });
                    if (found) {
                      return h('span', { className: 'inline-flex items-center gap-1 px-2 py-1 bg-stone-200 rounded font-bold' },
                        h('span', null, found.icon),
                        h('span', null, found.name)
                      );
                    }
                  }
                  return null;
                })()
              ),
              h('div', { className: 'text-[10px] text-slate-600 mt-2' }, 'You don\'t have to follow this order. Each module is self-contained. But each module\'s ending suggestion points to the next one in this sequence.')
            ),
            // Three suggested learning arcs
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h('div', { className: 'bg-cyan-50 border border-cyan-300 rounded-xl p-3' },
                h('h4', { className: 'text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1' }, '🎯 Quick (30 min)'),
                h('div', { className: 'text-sm text-slate-700 mb-2' }, 'For introducing evolution in one period:'),
                h('div', { className: 'space-y-1 text-xs' },
                  h('div', null, '1. 🧪 Selection Sandbox (10 min)'),
                  h('div', null, '2. 🐦 Beak Lab (10 min)'),
                  h('div', null, '3. ❓ Misconceptions Quiz (10 min)')
                )
              ),
              h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3' },
                h('h4', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1' }, '📚 Standard (5 days)'),
                h('div', { className: 'text-sm text-slate-700 mb-2' }, 'See the 5-Day Curriculum Guide. Walks through all 11 modules in 5 fifty-minute periods.'),
                h('button', {
                  onClick: function() { setView('curriculumGuide'); upd('view', 'curriculumGuide'); },
                  className: 'text-xs font-bold text-emerald-700 hover:underline'
                }, '→ Open Curriculum Guide')
              ),
              h('div', { className: 'bg-violet-50 border border-violet-300 rounded-xl p-3' },
                h('h4', { className: 'text-xs font-bold uppercase tracking-wider text-violet-800 mb-1' }, '🔬 Deep dive (10+ days)'),
                h('div', { className: 'text-sm text-slate-700 mb-2' }, 'For AP Biology or evolution-focused electives:'),
                h('div', { className: 'space-y-1 text-xs' },
                  h('div', null, '· One full period per major module'),
                  h('div', null, '· Use Extension Activities as homework'),
                  h('div', null, '· Add primary literature reading'),
                  h('div', null, '· Capstone: original research proposal')
                )
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // STANDARDS CROSSWALK — NGSS-by-module lookup
      // ─────────────────────────────────────────────────────
      // Reverse index: pick a standard, see which modules cover it. Useful for
      // teachers planning a unit around specific NGSS performance expectations,
      // or for AP Bio teachers cross-referencing College Board Big Ideas.
      function StandardsCrosswalk() {
        // Each standard maps to (a) the modules that address it, (b) a short
        // restatement of what the standard asks for in plain English.
        var STANDARDS = [
          {
            id: 'HS-LS4-1', title: 'Communicate scientific information about evidence for evolution',
            plain: 'Students explain the multiple lines of evidence that support evolution: anatomical, molecular, fossil, biogeographic.',
            modules: ['commonAncestry', 'phyloBuilder', 'discoveryTimeline', 'misconceptions']
          },
          {
            id: 'HS-LS4-2', title: 'Construct an explanation based on evidence for natural selection',
            plain: 'Students explain natural selection in terms of variation, differential survival, and inheritance.',
            modules: ['selectionSandbox', 'beakLab', 'speciation', 'coevolution', 'phyloBuilder', 'hardyWeinberg', 'discoveryTimeline', 'misconceptions']
          },
          {
            id: 'HS-LS4-3', title: 'Apply concepts of statistics and probability to explain population frequency',
            plain: 'Students use statistical reasoning to explain how allele frequencies change in a population.',
            modules: ['hardyWeinberg', 'geneticDrift']
          },
          {
            id: 'HS-LS4-4', title: 'Construct an explanation for how natural selection leads to adaptation',
            plain: 'Students show how environmental change drives selection and how populations adapt over time.',
            modules: ['selectionSandbox', 'beakLab', 'speciation', 'antibioticLab', 'misconceptions']
          },
          {
            id: 'HS-LS4-5', title: 'Evaluate evidence supporting claims about distribution of traits',
            plain: 'Students evaluate how environmental conditions influence the distribution of traits in a population.',
            modules: ['selectionSandbox', 'beakLab', 'speciation', 'coevolution', 'antibioticLab', 'misconceptions', 'phyloBuilder']
          },
          {
            id: 'HS-LS4-6', title: 'Create or revise a simulation to test a solution',
            plain: 'Students design or revise a simulation to model evolutionary change and predict outcomes.',
            modules: ['selectionSandbox', 'antibioticLab', 'speciation', 'coevolution']
          },
          {
            id: 'HS-LS3-1', title: 'Inheritance and gene-environment effects on traits',
            plain: 'Students explain how DNA mutations and gene-environment interactions produce phenotypic variation.',
            modules: ['hardyWeinberg', 'geneticDrift']
          },
          {
            id: 'HS-LS3-3', title: 'Apply statistics to explain trait variation',
            plain: 'Students use statistical analysis to explain variation and the role of meiosis in producing variation.',
            modules: ['geneticDrift']
          },
          {
            id: 'HS-LS2-7', title: 'Design solutions for human activity impacts on biodiversity',
            plain: 'Students design solutions to reduce human impact, including the impact of antibiotic overuse.',
            modules: ['antibioticLab', 'coevolution']
          },
          {
            id: 'MS-LS4-1', title: 'Analyze and interpret patterns in the fossil record',
            plain: 'Middle school students analyze fossil patterns to infer relationships among organisms over time.',
            modules: ['phyloBuilder']
          },
          {
            id: 'MS-LS4-2', title: 'Construct explanations from anatomical similarities',
            plain: 'Middle school students explain how anatomical similarities support common ancestry.',
            modules: ['commonAncestry', 'phyloBuilder']
          },
          {
            id: 'NOS', title: 'Nature of Science (cross-cutting)',
            plain: 'Students understand how scientific knowledge develops, including the social and historical context.',
            modules: ['discoveryTimeline', 'misconceptions']
          }
        ];

        // Reverse map for the "by module" view at the bottom: which standards does
        // each module address?
        var moduleNames = {
          selectionSandbox: { icon: '🧪', name: 'Selection Sandbox' },
          beakLab: { icon: '🐦', name: 'Beak Lab' },
          speciation: { icon: '🌗', name: 'Speciation' },
          coevolution: { icon: '🐆', name: 'Coevolution' },
          phyloBuilder: { icon: '🌳', name: 'Phylo Tree' },
          hardyWeinberg: { icon: '🧮', name: 'Hardy-Weinberg' },
          geneticDrift: { icon: '🎲', name: 'Genetic Drift' },
          commonAncestry: { icon: '🦴', name: 'Common Ancestry' },
          antibioticLab: { icon: '💊', name: 'Antibiotic Lab' },
          discoveryTimeline: { icon: '📜', name: 'Discovery Timeline' },
          misconceptions: { icon: '❓', name: 'Misconceptions' }
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '📋', title: 'Standards Crosswalk' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-4' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-5xl' }, '📋'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black' }, 'NGSS Standards Crosswalk'),
                  h('p', { className: 'text-sm text-amber-50 mt-1' }, 'For unit planning. Pick a Next Generation Science Standard you need to address; see which modules cover it. Each module has its own NGSS list inside its 🍎 Teacher Notes panel.')
                )
              )
            ),
            // By-standard table
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('div', { className: 'p-3 border-b border-slate-200' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-800' }, 'By Standard')
              ),
              h('div', { className: 'divide-y divide-slate-200' },
                STANDARDS.map(function(s) {
                  return h('div', { key: s.id, className: 'p-3 hover:bg-slate-50' },
                    h('div', { className: 'flex items-center gap-3 mb-1' },
                      h('span', { className: 'inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-xs font-bold' }, s.id),
                      h('span', { className: 'text-sm font-bold text-slate-800' }, s.title)
                    ),
                    h('div', { className: 'text-xs text-slate-600 mb-2' }, s.plain),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      s.modules.map(function(mid) {
                        var mod = moduleNames[mid];
                        if (!mod) return null;
                        return h('button', {
                          key: mid,
                          onClick: function() { goto(mid); },
                          'aria-label': 'Open ' + mod.name + ' (covers ' + s.id + ')',
                          className: 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-500 text-xs text-emerald-900 font-bold transition-colors'
                        },
                          h('span', null, mod.icon),
                          h('span', null, mod.name)
                        );
                      })
                    )
                  );
                })
              )
            ),
            // By-module view (reverse index)
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 overflow-hidden' },
              h('div', { className: 'p-3 border-b border-slate-200' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-800' }, 'By Module')
              ),
              h('div', { className: 'divide-y divide-slate-200' },
                Object.keys(moduleNames).map(function(mid) {
                  var mod = moduleNames[mid];
                  var matching = STANDARDS.filter(function(s) { return s.modules.indexOf(mid) !== -1; });
                  if (matching.length === 0) return null;
                  return h('div', { key: mid, className: 'p-3 hover:bg-slate-50' },
                    h('div', { className: 'flex items-center justify-between gap-3 mb-2' },
                      h('button', {
                        onClick: function() { goto(mid); },
                        'aria-label': 'Open ' + mod.name + ' module',
                        className: 'flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-violet-700'
                      },
                        h('span', { className: 'text-xl' }, mod.icon),
                        h('span', null, mod.name),
                        h('span', { className: 'text-slate-400' }, '→')
                      ),
                      h('span', { className: 'text-xs text-slate-600' }, matching.length + ' standard' + (matching.length === 1 ? '' : 's'))
                    ),
                    h('div', { className: 'flex flex-wrap gap-1 pl-7' },
                      matching.map(function(s) {
                        return h('span', { key: s.id, className: 'inline-block px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-mono text-[10px] font-bold' }, s.id);
                      })
                    )
                  );
                })
              )
            ),
            // AP Bio crosswalk note
            h('div', { className: 'bg-stone-50 border border-stone-300 rounded-xl p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-stone-800 mb-2' }, '🎓 AP Biology mapping'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Big Idea 1 (Evolution): '), 'Most modules contribute. Selection Sandbox, Beak Lab, Speciation, and Coevolution directly address Topics 1.A and 1.C. Hardy-Weinberg + Genetic Drift cover the quantitative work in Topic 1.B.'),
                h('p', null, h('strong', null, 'Big Idea 2 (Cellular Processes): '), 'Antibiotic Resistance Lab connects to selection at the molecular level (Topic 2.A.4). Discovery Timeline gives historical context for Watson-Crick / Franklin / Margulis.'),
                h('p', null, h('strong', null, 'Big Idea 3 (Genetics): '), 'Hardy-Weinberg directly addresses Topic 3.C.1 (allele frequencies). Genetic Drift covers Topic 3.C.2 (random change). Phylo Tree Builder addresses Topic 3.D (information transfer between generations).'),
                h('p', null, h('strong', null, 'Big Idea 4 (Interactions): '), 'Coevolution and Antibiotic Resistance both fit Topic 4.B.3 (species interactions drive evolution).')
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // CURRICULUM GUIDE — 5-day unit plan for teachers
      // ─────────────────────────────────────────────────────
      // Sequences the 10 modules into a teachable 5-day arc. Each day has a
      // warm-up, lab activity, discussion, and exit ticket — totaling roughly
      // a 50-minute period. Designed for HS biology / earth-science teachers
      // looking to drop EvoLab into an existing curriculum without major prep.
      function CurriculumGuide() {
        var DAYS = [
          {
            n: 1,
            theme: 'Foundation: Allele Frequencies',
            big: '🧮',
            color: 'cyan',
            warmup: 'Show students a class-wide trait (attached vs free earlobes, can-roll-tongue vs not, hitchhiker\'s thumb). Count and graph the class frequencies on the board. Ask: "Are these allele frequencies stable across human populations?"',
            modules: [
              { id: 'hardyWeinberg', label: 'Hardy-Weinberg Calculator', minutes: 15 },
              { id: 'geneticDrift', label: 'Genetic Drift Simulator', minutes: 15 }
            ],
            discussion: [
              'In real populations, why do we so rarely see Hardy-Weinberg equilibrium?',
              'If a population is in HW equilibrium, is it evolving? Why or why not?',
              'Why does drift have less impact in large populations? Use the simulator results to support your answer.'
            ],
            exitTicket: 'In one sentence each: define equilibrium, define drift, and give one example where drift overwhelmed selection in a real population.'
          },
          {
            n: 2,
            theme: 'Selection in Action',
            big: '🧪',
            color: 'emerald',
            warmup: 'Show two photos of peppered moths (light vs dark) on tree bark — one clean tree, one polluted. Ask: "Which moth is more likely to be eaten by a bird in each environment?"',
            modules: [
              { id: 'selectionSandbox', label: 'Selection Sandbox (try all 4 modes)', minutes: 18 },
              { id: 'beakLab', label: 'Galápagos Beak Lab (reproduce 1977 drought)', minutes: 18 }
            ],
            discussion: [
              'How is selection different from drift? When would a biologist suspect one vs the other?',
              'The Beak Lab shows evolution in just one year. What conditions made this possible?',
              'In the snowshoe hare scenario, selection is currently shifting Maine hares toward later molting. Is this an "improvement"? Why or why not?'
            ],
            exitTicket: 'Sketch a graph of trait distribution before vs after directional selection. Then do the same for stabilizing selection. Label the axes.'
          },
          {
            n: 3,
            theme: 'Between Populations: Speciation & Coevolution',
            big: '🌗',
            color: 'indigo',
            warmup: 'Show a map of the Galápagos islands with species ranges. Ask: "How did one ancestral finch become 14 species?" Have students hypothesize before any explanation.',
            modules: [
              { id: 'speciation', label: 'Speciation Simulator', minutes: 18 },
              { id: 'coevolution', label: 'Coevolution Lab', minutes: 18 }
            ],
            discussion: [
              'What\'s the difference between allopatric and sympatric speciation? Which does our simulator model?',
              'In the Coevolution Lab\'s "Cost OFF" mode, speeds run away to infinity. Why doesn\'t this happen in nature?',
              'Are bacteria and antibiotics in a coevolutionary relationship? Why or why not?'
            ],
            exitTicket: 'Pick a real coevolutionary pair (bats/moths, plants/herbivores, predator/prey, host/parasite) and describe one specific innovation and its counter-innovation.'
          },
          {
            n: 4,
            theme: 'Macroevolution: The Tree of Life',
            big: '🌳',
            color: 'violet',
            warmup: 'Show a comparative-anatomy slide (human arm, bat wing, whale flipper, horse leg, bird wing). Ask: "If each was designed independently, would you expect them to share a skeleton?"',
            modules: [
              { id: 'phyloBuilder', label: 'Phylogenetic Tree Builder', minutes: 20 },
              { id: 'commonAncestry', label: 'Common Ancestry Viewer', minutes: 15 }
            ],
            discussion: [
              'Why is "fish" technically not a clade?',
              'A horse\'s ulna is reduced (vestigial). What does this tell us about the horse\'s ancestor?',
              'How do scientists decide whether two structures are homologous (shared ancestry) vs analogous (independent evolution)?'
            ],
            exitTicket: 'Draw a cladogram of 5 organisms of your choice. Label one synapomorphy (shared derived trait) for each clade.'
          },
          {
            n: 5,
            theme: 'Application & Reflection',
            big: '💊',
            color: 'fuchsia',
            warmup: 'Read this scenario aloud: "Your friend feels better after 3 days of a 10-day antibiotic course. They want to save the rest for next time. What should you tell them?"',
            modules: [
              { id: 'antibioticLab', label: 'Antibiotic Resistance Lab', minutes: 18 },
              { id: 'misconceptions', label: 'Misconceptions Quiz (12 questions)', minutes: 20 }
            ],
            discussion: [
              'Why does taking antibiotics WHEN YOU DON\'T NEED THEM contribute to resistance — even if you finish the course?',
              'Of the 12 misconceptions in the quiz, which would lead to the worst real-world decision if held by a politician? A doctor? A farmer?',
              'How would you respectfully and effectively correct someone who says "evolution is just a theory"?'
            ],
            exitTicket: 'Write a 2-sentence response to the warm-up scenario. Then write 1 sentence explaining the underlying evolutionary mechanism.'
          }
        ];

        var colorClasses = {
          cyan: { bg: 'from-cyan-500 to-blue-700', border: 'border-cyan-400', text: 'text-cyan-800' },
          emerald: { bg: 'from-emerald-500 to-teal-700', border: 'border-emerald-400', text: 'text-emerald-800' },
          indigo: { bg: 'from-indigo-500 to-blue-700', border: 'border-indigo-400', text: 'text-indigo-800' },
          violet: { bg: 'from-violet-500 to-purple-700', border: 'border-violet-400', text: 'text-violet-800' },
          fuchsia: { bg: 'from-fuchsia-500 to-pink-700', border: 'border-fuchsia-400', text: 'text-fuchsia-800' }
        };

        var renderDay = function(day) {
          var c = colorClasses[day.color] || colorClasses.emerald;
          return h('div', { key: day.n, className: 'bg-white rounded-2xl shadow border-2 ' + c.border + ' overflow-hidden' },
            // Day header
            h('div', { className: 'bg-gradient-to-br ' + c.bg + ' p-4 text-white' },
              h('div', { className: 'flex items-center gap-3' },
                h('div', { className: 'text-4xl' }, day.big),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-90' }, 'Day ' + day.n + ' · ~50 min'),
                  h('h3', { className: 'text-xl font-black' }, day.theme)
                )
              )
            ),
            h('div', { className: 'p-4 space-y-3 text-sm text-slate-700' },
              // Warm-up
              h('div', null,
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-lg' }, '☕'),
                  h('strong', { className: c.text }, 'Warm-up (5 min)')
                ),
                h('p', { className: 'pl-7' }, day.warmup)
              ),
              // Lab activity
              h('div', null,
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-lg' }, '🧪'),
                  h('strong', { className: c.text }, 'Lab activity (' + day.modules.reduce(function(s, m) { return s + m.minutes; }, 0) + ' min)')
                ),
                h('div', { className: 'pl-7 space-y-1' },
                  day.modules.map(function(m, i) {
                    return h('div', { key: i, className: 'flex items-center justify-between gap-2 p-2 bg-slate-50 rounded' },
                      h('button', {
                        onClick: function() { goto(m.id); },
                        className: 'text-left font-semibold text-slate-800 hover:text-violet-700 underline-offset-2 hover:underline'
                      }, '→ ' + m.label),
                      h('span', { className: 'text-xs text-slate-600 font-mono' }, m.minutes + ' min')
                    );
                  })
                )
              ),
              // Discussion
              h('div', null,
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-lg' }, '💬'),
                  h('strong', { className: c.text }, 'Class discussion (10 min)')
                ),
                h('ol', { className: 'pl-10 list-decimal space-y-1' },
                  day.discussion.map(function(q, i) { return h('li', { key: i }, q); })
                )
              ),
              // Exit ticket
              h('div', null,
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-lg' }, '🎫'),
                  h('strong', { className: c.text }, 'Exit ticket (5 min)')
                ),
                h('p', { className: 'pl-7 italic' }, day.exitTicket)
              )
            )
          );
        };

        var totalModules = DAYS.reduce(function(s, d) { return s + d.modules.length; }, 0);
        var totalMinutes = DAYS.reduce(function(s, d) { return s + d.modules.reduce(function(ss, m) { return ss + m.minutes; }, 0) + 20; }, 0);

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          h(BackBar, { icon: '📅', title: 'Curriculum Guide — 5-Day Unit Plan' }),
          h('div', { className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
            // Hero
            h('div', { className: 'bg-gradient-to-br from-amber-500 to-orange-700 rounded-2xl p-5 text-white shadow-lg' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-5xl' }, '🍎'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black' }, 'Drop-in evolution unit'),
                  h('p', { className: 'text-sm text-amber-50 mt-1' }, 'Five 50-minute periods sequenced from "what is an allele frequency" to "why does antibiotic resistance matter." Each day has a warm-up, lab activity, discussion, and exit ticket. Click any module link to launch it directly. Designed for high school biology; modular enough to compress to 3 days or expand to 8.')
                )
              )
            ),
            // Summary stats
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h(StatCard, { label: 'Days', value: DAYS.length, color: 'text-amber-700' }),
              h(StatCard, { label: 'Lab Modules', value: totalModules + ' / 10', color: 'text-emerald-700' }),
              h(StatCard, { label: 'Total Time', value: Math.round(totalMinutes / 60) + ' hours', color: 'text-cyan-700' })
            ),
            // Print button
            h('div', { className: 'flex justify-center' },
              h('button', {
                onClick: function() { try { window.print(); } catch (_) {} },
                'aria-label': 'Print this curriculum guide for offline use',
                className: 'px-5 py-2.5 rounded-lg font-bold bg-white border-2 border-amber-400 text-amber-800 hover:bg-amber-50 shadow'
              }, '🖨️ Print This Guide')
            ),
            // Days
            h('div', { className: 'space-y-4' },
              DAYS.map(function(d) { return renderDay(d); })
            ),
            // Adaptation tips
            h('div', { className: 'bg-white border-2 border-slate-300 rounded-xl p-4' },
              h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-800 mb-2' }, '🧰 Adapting this unit'),
              h('div', { className: 'text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Compress to 3 days: '), 'Combine Days 1+2 (foundation + selection in one period), keep Day 3 as-is, combine Days 4+5 (macro + application). Extend the discussion sections in each.'),
                h('p', null, h('strong', null, 'Expand to 8-10 days: '), 'Spend a full period per major module. Add a fossil-record day, an embryology / developmental-biology day, a human-evolution day. Use the "Extension Activities" in each module\'s Teacher Notes as homework.'),
                h('p', null, h('strong', null, 'Middle school adaptation: '), 'Skip Hardy-Weinberg (math-heavy). Replace the misconceptions quiz with a teacher-led 5-question version. Spend more time on Common Ancestry and Phylo Tree (concrete, visual).'),
                h('p', null, h('strong', null, 'AP Biology extension: '), 'Each module\'s Teacher Notes lists NGSS standards. Cross-reference with AP Bio Unit 7 (Natural Selection). The Hardy-Weinberg + Genetic Drift labs map directly to AP\'s Big Idea 1.')
              )
            ),
            // Cross-module suggestion
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-sm text-slate-700 flex items-center gap-3' },
              h('span', { className: 'text-2xl' }, '📋'),
              h('div', null,
                h('strong', null, 'Tip: '),
                'Open each module before class to verify it loads correctly and to see what controls students will see. Each module has its own collapsible 🍎 Teacher Notes section with NGSS standards, common misconceptions, and extension activities.'
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAIN VIEW DISPATCH
      // ─────────────────────────────────────────────────────
      if (view === 'predatorVision') return h(PredatorVisionLab);
      if (view === 'mateChoice') return h(MateChoiceLab);
      if (view === 'climatePressure') return h(ClimatePressureLab);
      if (view === 'selectionSandbox') return h(SelectionSandbox);
      if (view === 'beakLab') return h(BeakLab);
      if (view === 'speciation') return h(SpeciationSimulator);
      if (view === 'coevolution') return h(CoevolutionLab);
      if (view === 'phyloBuilder') return h(PhyloBuilder);
      if (view === 'hardyWeinberg') return h(HardyWeinberg);
      if (view === 'geneticDrift') return h(GeneticDrift);
      if (view === 'commonAncestry') return h(CommonAncestry);
      if (view === 'antibioticLab') return h(AntibioticLab);
      if (view === 'discoveryTimeline') return h(DiscoveryTimeline);
      if (view === 'misconceptions') return h(MisconceptionsQuiz);
      if (view === 'selectionSleuth') return h(SelectionSleuth);
      if (view === 'homologySleuth') return h(HomologySleuth);
      if (view === 'capstone') return h(CapstoneProject);
      if (view === 'curriculumGuide') return h(CurriculumGuide);
      if (view === 'moduleMap') return h(ModuleMap);
      if (view === 'standardsCrosswalk') return h(StandardsCrosswalk);
      return h(MainMenu);
    }
  });

})();

}
