// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════════════════════════════════════
// stem_tool_printingpress.js — PrintingPress
// Hands-on simulation of the Gutenberg-style screw press, plus the materials
// science, mechanical engineering, economics, history, and typography that
// the press touches. Built for an EL Education middle-school demo: deep,
// interdisciplinary, and tactile.
//
// 8 tiles + cumulative quiz + AI tutor + resources:
//   1. Press Mechanism (interactive SVG simulation of the screw press)
//   2. Set Your Own Type (drag-letter composing stick with mirror reversal)
//   3. Casting Type (punch → matrix → type-metal alloy)
//   4. Print Run Economics (cost-per-book collapse calculator)
//   5. Before & After (literacy, Reformation, scientific revolution)
//   6. Typography Today (vocabulary that survives into digital)
//   7. The People (Gutenberg, Fust, Schöffer, Aldus, women printers)
//   8. Build a Broadside (compose a single-page printable)
//
// Sources cited inline: Gutenberg Museum (Mainz), British Library, Library
// of Congress, Smithsonian, Aldine Press scholarship, Adrian Johns "The
// Nature of the Book," Elizabeth Eisenstein "The Printing Press as an
// Agent of Change," Robert Bringhurst "Elements of Typographic Style,"
// and primary sources where direct.
// ═══════════════════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('printingPress'))) {

(function() {
  'use strict';

  // Print stylesheet + entrance-animation keyframes.
  // Print: hide UI chrome and force-expand teacher notes.
  // Entrance animation: a small fade-in-up that the menu tiles use on first
  // render. Each tile gets a nominal animation-delay set inline so they
  // appear in a staggered cascade. Honors prefers-reduced-motion.
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('printingpress-print-css')) return;
    var st = document.createElement('style');
    st.id = 'printingpress-print-css';
    st.textContent = [
      '@media print {',
      '  .printingpress-no-print { display: none !important; }',
      '  body { background: white !important; }',
      '  details.printingpress-teacher-notes { display: block !important; }',
      '  details.printingpress-teacher-notes > summary { list-style: none; cursor: default; }',
      '  details.printingpress-teacher-notes[open] > *,',
      '  details.printingpress-teacher-notes > * { display: block !important; }',
      '}',
      '@keyframes printingpress-tile-in {',
      '  0%   { opacity: 0; transform: translateY(8px); }',
      '  100% { opacity: 1; transform: translateY(0); }',
      '}',
      '.printingpress-tile {',
      '  animation: printingpress-tile-in 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both;',
      '}',
      // Pulse-glow ring used to highlight an active simulation during a
      // Guided Tour. Subtle gold halo that breathes once per ~1.6s.
      // Combined with a warm "candle glow" layered shadow that doesn't pulse
      // — gives the simulation a "lit from within" feel matching the
      // 1450 print shop atmosphere (presses were worked by candle/lamplight).
      '@keyframes printingpress-pulse-glow {',
      '  0%, 100% { box-shadow: 0 0 0 0 rgba(245,215,126,0.45), 0 0 12px rgba(201,161,74,0.3), inset 0 0 40px rgba(245,180,80,0.08); }',
      '  50%      { box-shadow: 0 0 0 6px rgba(245,215,126,0.15), 0 0 28px rgba(201,161,74,0.55), inset 0 0 50px rgba(245,180,80,0.14); }',
      '}',
      '.printingpress-tour-active {',
      '  animation: printingpress-pulse-glow 1.6s ease-in-out infinite;',
      '}',
      // Candle flame flicker — subtle non-uniform scale + slight skew so
      // the flame breathes naturally. Reduced-motion users get a static
      // flame (no animation), still legible.
      '@keyframes printingpress-candle-flicker {',
      '  0%   { transform: scale(1, 1) skewX(0deg); opacity: 0.85; }',
      '  30%  { transform: scale(1.05, 0.95) skewX(2deg); opacity: 0.95; }',
      '  60%  { transform: scale(0.95, 1.05) skewX(-2deg); opacity: 0.8; }',
      '  100% { transform: scale(1, 1) skewX(0deg); opacity: 0.85; }',
      '}',
      // Medallion entrance pulse — brief scale-up + glow when the value
      // changes. Used on the speedup-factor seal when the slider updates.
      '@keyframes printingpress-medallion-pop {',
      '  0%   { transform: scale(1); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }',
      '  30%  { transform: scale(1.06); filter: drop-shadow(0 4px 12px rgba(245,215,126,0.45)); }',
      '  100% { transform: scale(1); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }',
      '}',
      '.printingpress-medallion {',
      '  animation: printingpress-medallion-pop 0.5s ease-out;',
      '}',
      // Onomatopoeia bubble — drifts up while fading out. Used for the
      // transient *creak* / *thunk* / *hiss* labels above the press
      // during the impression cycle. Pure atmosphere.
      '@keyframes printingpress-onomatopoeia {',
      '  0%   { transform: translateY(0) rotate(-3deg) scale(0.9); opacity: 0; }',
      '  15%  { transform: translateY(-6px) rotate(-2deg) scale(1.05); opacity: 0.95; }',
      '  70%  { transform: translateY(-26px) rotate(2deg) scale(1); opacity: 0.7; }',
      '  100% { transform: translateY(-44px) rotate(4deg) scale(0.85); opacity: 0; }',
      '}',
      '.printingpress-onomatopoeia {',
      '  animation: printingpress-onomatopoeia 1.4s ease-out forwards;',
      '  pointer-events: none;',
      '}',
      // Tile hover/focus glow — subtle accent ring on hover and a stronger
      // keyboard-focus ring (gold) so keyboard navigation is unambiguous.
      // Transitions in/out smoothly.
      '.printingpress-tile {',
      '  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;',
      '}',
      '.printingpress-tile:hover {',
      '  transform: translateY(-2px);',
      '  box-shadow: 0 6px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,215,126,0.35);',
      '}',
      '.printingpress-tile:focus-visible {',
      '  outline: none;',
      '  box-shadow: 0 0 0 3px rgba(245,215,126,0.55), 0 6px 16px rgba(0,0,0,0.4);',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .printingpress-tile { animation: none !important; opacity: 1 !important; transform: none !important; transition: none !important; }',
      '  .printingpress-tile:hover { transform: none !important; }',
      '  .printingpress-tour-active { animation: none !important; box-shadow: 0 0 0 4px rgba(245,215,126,0.25) !important; }',
      '}'
    ].join('\n');
    if (document.head) document.head.appendChild(st);
  })();

  // ── _ViewWrapper: stable React component that renders whichever
  //    view-render function is passed via props._render. Defined ONCE at
  //    module scope so React sees a stable component identity.
  //
  // Why this exists: every renderXxx (renderMenu, renderPressMechanism, ...)
  // calls hooks (useState/useEffect/useRef). When they were called directly
  // inside the outer render() function via `content = renderPressMechanism()`,
  // ALL of those hooks belonged to StemPluginBridge. Hook count varied per
  // view (3 for menu vs ~13 for press mechanism), violating React's Rules
  // of Hooks ("Rendered more hooks than during the previous render").
  //
  // By wrapping each view in `h(_ViewWrapper, { _render: renderXxx, key: 'X' })`
  // each view becomes its own React component instance. Hook tracking is
  // per-instance. Different `key` per view means React mounts/unmounts on
  // navigation (state reset across views — fine, that's a real intent change),
  // but re-renders within a view keep the same instance and thus stable
  // hook order.
  function _ViewWrapper(props) { return props._render(); }

  window.StemLab.registerTool('printingPress', {
    name: 'PrintingPress',
    icon: '📜',
    category: 'history-engineering',
    description: 'The Gutenberg-style screw press as a working simulation, plus the materials science, mechanical engineering, economics, history, and typography it touches. Compose your own type, ink the forme, pull the bar, see the impression. Built for interdisciplinary middle-school work. Sources: Gutenberg Museum (Mainz), British Library, Library of Congress, Smithsonian, Aldine Press scholarship, Eisenstein, Johns, Bringhurst.',
    tags: ['printing-press', 'gutenberg', 'history', 'engineering', 'mechanical-advantage', 'typography', 'literacy', 'renaissance', 'reformation', 'mass-media'],

    render: function(ctx) {
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      var d = (ctx.toolData && ctx.toolData['printingPress']) || {};
      var upd = function(key, val) { ctx.update('printingPress', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('printingPress', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[PrintingPress]', msg); };
      var callGemini = ctx.callGemini || null;

      var view = d.view || 'menu';
      var modulesVisited = d.modulesVisited || {};
      var badges = d.badges || {};
      var bigQuizState = d.bigQuizState || { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} };

      // Hydration: window slot → localStorage → host state
      var _hydratedRef = useRef(false);
      if (!_hydratedRef.current) {
        _hydratedRef.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowPrintingPress) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('printingPress.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.badges && d.badges === undefined) merge.badges = seed.badges;
            if (seed.modulesVisited && d.modulesVisited === undefined) merge.modulesVisited = seed.modulesVisited;
            if (Object.keys(merge).length > 0) updMulti(merge);
          }
        } catch (e) {}
      }

      // Persist on change
      useEffect(function() {
        try {
          var snap = {
            badges: d.badges || {},
            modulesVisited: d.modulesVisited || {},
            _ts: Date.now()
          };
          window.__alloflowPrintingPress = snap;
          localStorage.setItem('printingPress.state.v1', JSON.stringify(snap));
        } catch (e) {}
      }, [d.badges, d.modulesVisited]);

      // SR live region
      var _liveRef = useRef(null);
      function announce(msg) {
        if (_liveRef.current) {
          _liveRef.current.textContent = '';
          setTimeout(function() { if (_liveRef.current) _liveRef.current.textContent = msg; }, 30);
        }
      }

      function awardBadge(id, label) {
        if (badges[id]) return;
        var next = Object.assign({}, badges);
        next[id] = { label: label, earnedAt: new Date().toISOString() };
        upd('badges', next);
        addToast('🏅 Badge: ' + label, 'success');
      }

      function markVisited(modId) {
        if (modulesVisited[modId]) return;
        var nextVisited = Object.assign({}, modulesVisited);
        nextVisited[modId] = new Date().toISOString();
        upd('modulesVisited', nextVisited);
      }

      // ── Theme (parchment + ink + brass palette, period-appropriate) ──
      var T = {
        bg: '#1a1410', card: '#2a1f15', cardAlt: '#13100c', border: '#5c4630',
        text: '#f5ecd9', muted: '#d4c4a0', dim: '#9c8a6e',
        accent: '#c9a14a', accentHi: '#f5d77e',
        ok: '#7fb069', warn: '#e8a04a', danger: '#c44536',
        link: '#f5d77e', ink: '#0a0805', parchment: '#f5e8c8', wood: '#6b4423'
      };

      function btn(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
          background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left',
          fontFamily: 'Georgia, "Times New Roman", serif'
        }, extra || {});
      }
      function btnPrimary(extra) {
        return Object.assign(btn({ background: T.accent, color: T.ink, border: '1px solid ' + T.accent }), extra || {});
      }

      function backBar(title) {
        // Period-flourish row: back button | fleuron | title | fleuron | print
        // button. Below it, a thin double gold rule (the same border treatment
        // a 1450 book page used between the headpiece and the body text).
        // Pure visual framing — matches the broadside borders elsewhere in
        // the tool so every view feels printed, not screen-rendered.
        return h('div', { className: 'printingpress-back-bar', style: { marginBottom: 14 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
            h('button', {
              className: 'printingpress-no-print',
              'aria-label': 'Back to PrintingPress menu',
              onClick: function() { upd('view', 'menu'); announce('Back to menu'); },
              style: btn({ padding: '6px 12px', fontSize: 12 })
            }, '← Menu'),
            h('span', { 'aria-hidden': 'true', style: { color: T.accent, opacity: 0.7, display: 'inline-flex', alignItems: 'center' } }, fleuron(11)),
            h('h2', { style: { margin: 0, fontSize: 18, color: T.text, flex: 1, fontFamily: 'Georgia, serif', letterSpacing: '0.01em' } }, title),
            h('span', { 'aria-hidden': 'true', style: { color: T.accent, opacity: 0.7, display: 'inline-flex', alignItems: 'center' } }, fleuron(11)),
            h('button', {
              className: 'printingpress-no-print',
              'aria-label': 'Print this module as a classroom handout',
              onClick: function() { try { window.print(); } catch (_) {} },
              style: btn({ padding: '6px 12px', fontSize: 12 })
            }, '🖨️ Print')
          ),
          // Double gold rule (thick + thin), the period-typical headpiece
          // separator. ~6px gap between rules.
          h('div', { 'aria-hidden': 'true', style: { marginTop: 8 } },
            h('div', { style: { height: 1.5, background: T.accent, opacity: 0.55 } }),
            h('div', { style: { height: 1, background: T.accent, opacity: 0.35, marginTop: 2 } })
          )
        );
      }

      // Reusable fleuron (printer's flower) — same diamond + petal motif used
      // in the broadside borders, scaled small enough for inline use as a
      // section-header flourish.
      function fleuron(size) {
        var s = size || 10;
        return h('svg', { width: s, height: s, viewBox: '-7 -7 14 14', 'aria-hidden': 'true',
          style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 } },
          h('path', { d: 'M 0 -4 L 3 0 L 0 4 L -3 0 Z', fill: T.accent, opacity: 0.85 }),
          h('circle', { cx: 0, cy: -5.5, r: 0.9, fill: T.accent, opacity: 0.65 }),
          h('circle', { cx: 0, cy: 5.5, r: 0.9, fill: T.accent, opacity: 0.65 }),
          h('circle', { cx: -5.5, cy: 0, r: 0.9, fill: T.accent, opacity: 0.65 }),
          h('circle', { cx: 5.5, cy: 0, r: 0.9, fill: T.accent, opacity: 0.65 })
        );
      }
      function sectionHeader(emoji, title) {
        // Header now has a decorative fleuron + thin gold rule before the
        // emoji, and a thin gold rule + fleuron after the title. Visually
        // signals "this is a section break" with period-appropriate weight,
        // and unifies the look across all 8 modules.
        return h('h3', { style: { margin: '20px 0 10px', fontSize: 15, color: T.accentHi, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Georgia, serif' } },
          fleuron(11),
          h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, emoji),
          h('span', null, title),
          // Trailing rule: takes remaining width, ends with a fleuron
          h('span', { 'aria-hidden': 'true', style: { flex: 1, height: 1, background: 'linear-gradient(90deg, ' + T.accent + ' 0%, transparent 100%)', opacity: 0.4, marginLeft: 4 } })
        );
      }

      function keyPointBlock(intro, points) {
        // List bullets replaced with small gold fleurons via CSS markers.
        // Each list item gets a custom marker (diamond) instead of the
        // default disc, in the gold accent palette. Period-appropriate and
        // visually ties keyPointBlock to the rest of the tool's ornamental
        // language (fleurons on section headers, on the broadside borders,
        // on the colophon).
        return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
          intro && h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14 } }, intro),
          h('ul', { style: { margin: 0, paddingLeft: 0, listStyle: 'none', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
            points.map(function(p, i) {
              return h('li', { key: i,
                style: { position: 'relative', paddingLeft: 18, marginBottom: 4 } },
                // Inline fleuron marker — small gold diamond as the bullet
                h('span', { 'aria-hidden': 'true', style: {
                  position: 'absolute', left: 4, top: '0.5em',
                  width: 6, height: 6, transform: 'rotate(45deg)',
                  background: T.accent, opacity: 0.75
                } }),
                typeof p === 'string' ? p : (
                  h(React.Fragment, null,
                    h('strong', { style: { color: T.text } }, p.k + ': '),
                    p.v
                  )
                )
              );
            })
          )
        );
      }

      function calloutBox(kind, title, body) {
        var palette = {
          warn: { bg: '#3d2810', border: T.warn, fg: '#fed7aa', label: '⚠️' },
          info: { bg: '#1f2937', border: '#60a5fa', fg: '#dbeafe', label: 'ℹ️' },
          danger: { bg: '#3d1f1f', border: T.danger, fg: '#fecaca', label: '🚨' },
          ok: { bg: '#1f3d28', border: T.ok, fg: '#bbf7d0', label: '✅' }
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
        var localStateRaw = useState(null);
        var localState = localStateRaw[0], setLocalState = localStateRaw[1];
        var revealed = !!localState;
        return h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 10 } },
          h('div', { style: { fontSize: 12, color: T.dim, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎭 Scenario ' + (idx + 1)),
          h('p', { style: { margin: '0 0 12px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, scenario.prompt),
          !revealed && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            scenario.choices.map(function(c, ci) {
              return h('button', { key: ci,
                onClick: function() { setLocalState({ choice: ci }); announce('Choice selected. ' + (ci === scenario.correct ? 'Correct.' : 'See explanation.')); },
                style: btn({ padding: '8px 12px', fontSize: 12 }) }, c);
            })
          ),
          revealed && h('div', null,
            h('div', { style: { fontSize: 12, color: localState.choice === scenario.correct ? T.ok : T.warn, marginBottom: 8 } },
              localState.choice === scenario.correct ? '✓ Correct.' : '✗ Reconsider — see why below.'),
            h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', null, 'Right answer: '),
              scenario.choices[scenario.correct]),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } }, scenario.explain),
            h('button', {
              onClick: function() { setLocalState(null); },
              style: btn({ padding: '6px 10px', fontSize: 11, marginTop: 6 }) }, 'Try again')
          )
        );
      }

      function miniQuizBlock(modId, questions) {
        // Hooks called UNCONDITIONALLY at the top — Rules of Hooks. The
        // badge-award useEffect was previously inside an `if (done && pct >= 80)`
        // branch which violated React's rules. Now it always runs and the
        // condition lives inside the effect body.
        var qIdxRaw = useState(0);
        var qIdx = qIdxRaw[0], setQIdx = qIdxRaw[1];
        var resultsRaw = useState({});
        var results = resultsRaw[0], setResults = resultsRaw[1];
        var done = qIdx >= questions.length;
        var correctCount = done ? Object.keys(results).filter(function(k) { return results[k] === true; }).length : 0;
        var donePct = done ? Math.round((correctCount / questions.length) * 100) : 0;
        useEffect(function() {
          if (done && donePct >= 80) {
            var bid = 'mod_' + modId;
            if (!badges[bid]) awardBadge(bid, 'Module: ' + modId);
          }
        }, [done, donePct, modId]);
        if (done) {
          var correct = correctCount;
          var pct = donePct;
          return h('div', { style: { background: T.card, border: '1px solid ' + (pct >= 80 ? T.ok : T.warn), borderRadius: 12, padding: 14, marginTop: 12 } },
            h('div', { style: { fontSize: 14, fontWeight: 700, color: pct >= 80 ? T.ok : T.warn, marginBottom: 6 } },
              pct >= 80 ? '🏅 Mastery' : '📖 Review recommended'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13 } },
              'Score: ', h('strong', null, correct + ' / ' + questions.length + ' (' + pct + '%)')),
            h('button', { onClick: function() { setQIdx(0); setResults({}); }, style: btn({ marginTop: 10, padding: '6px 12px', fontSize: 12 }) }, 'Retry')
          );
        }
        var q = questions[qIdx];
        var answered = results[qIdx] !== undefined;
        return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14, marginTop: 12 } },
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 6 } }, 'Mini-quiz · ' + (qIdx + 1) + ' / ' + questions.length),
          h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 14, fontWeight: 600 } }, q.q),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            q.opts.map(function(opt, oi) {
              var isCorrect = oi === q.ans;
              var picked = answered && results[qIdx + '_pick'] === oi;
              var style = btn({ padding: '8px 12px', fontSize: 13 });
              if (answered) {
                if (isCorrect) style = Object.assign({}, style, { background: '#1f3d28', borderColor: T.ok, color: '#bbf7d0' });
                else if (picked) style = Object.assign({}, style, { background: '#3d1f1f', borderColor: T.danger, color: '#fecaca' });
              }
              return h('button', { key: oi, disabled: answered,
                onClick: function() {
                  var newResults = Object.assign({}, results);
                  newResults[qIdx] = (oi === q.ans);
                  newResults[qIdx + '_pick'] = oi;
                  setResults(newResults);
                  announce(oi === q.ans ? 'Correct.' : 'Incorrect.');
                }, style: style }, opt);
            })
          ),
          answered && h('div', { style: { marginTop: 10, padding: 10, background: T.cardAlt, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.text } }, 'Why: '), q.explain),
          answered && h('div', { style: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' } },
            results[qIdx] === false && h('button', {
              onClick: function() {
                var nr = Object.assign({}, results);
                delete nr[qIdx]; delete nr[qIdx + '_pick'];
                setResults(nr);
                announce('Question reset. Try again.');
              },
              style: btn({ padding: '8px 14px', fontSize: 13 }) }, '↺ Try again'),
            h('button', {
              onClick: function() { setQIdx(qIdx + 1); },
              style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) },
              qIdx + 1 < questions.length ? 'Next →' : 'See score')
          )
        );
      }

      function sourcesBlock(sources) {
        return h('div', { style: { marginTop: 14, padding: 12, background: T.cardAlt, border: '1px dashed ' + T.border, borderRadius: 8 } },
          h('div', { style: { fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, '📖 Sources'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: T.muted, lineHeight: 1.6 } },
            sources.map(function(src, i) {
              return h('li', { key: i },
                src.url ? h('a', { href: src.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, src.label) : src.label,
                src.note ? ' — ' + src.note : ''
              );
            })
          )
        );
      }

      // Drop-cap helper — renders an intro paragraph with the first letter
      // styled as an illuminated-manuscript drop-cap. Period-authentic
      // (manuscript and early-print convention from the 1100s onward) and
      // visually signals "this is the start of the text." The first letter
      // floats left, sized ~3.5x normal, color-accented, with a subtle
      // background block to evoke the illumination tradition.
      function dropCapPara(text, opts) {
        opts = opts || {};
        var first = (text || '').charAt(0);
        var rest = (text || '').slice(1);
        return h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.7 } },
          h('span', { 'aria-hidden': 'true', style: {
            float: 'left',
            fontSize: 44,
            lineHeight: 0.9,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 800,
            color: T.accentHi,
            background: 'rgba(201,161,74,0.08)',
            border: '1px solid ' + T.accent,
            padding: '4px 8px 2px',
            marginRight: 8,
            marginTop: 2,
            marginBottom: 0
          } }, first),
          // Screen-reader text gets the full original word (the floated span
          // is aria-hidden so the reader doesn't read the letter twice).
          h('span', { className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, first),
          rest,
          // Clearfix so the next element doesn't wrap weirdly under the cap
          h('span', { 'aria-hidden': 'true', style: { display: 'block', clear: 'both' } })
        );
      }

      function disclaimerFooter() {
        return h('div', { role: 'contentinfo',
          style: { marginTop: 18, padding: '14px 14px 10px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55, position: 'relative' } },
          // Stylized printer's mark — Aldine-tradition dolphin-and-anchor.
          // Aldus Manutius's Aldine Press logo (~1500 onward) was widely
          // imitated and pirated; using a dolphin-and-anchor here pays tribute
          // to the Aldine tradition without copying the exact mark. Symbolic
          // meaning: "festina lente" (make haste slowly) — speed of the
          // dolphin, steadiness of the anchor.
          h('div', { 'aria-hidden': 'true',
            style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } },
            h('svg', { width: 38, height: 46, viewBox: '0 0 38 46',
              style: { display: 'block', opacity: 0.7 } },
              // Anchor shaft
              h('line', { x1: 19, y1: 6, x2: 19, y2: 38, stroke: T.accent, strokeWidth: 2, strokeLinecap: 'round' }),
              // Anchor crossbar (stock)
              h('line', { x1: 11, y1: 12, x2: 27, y2: 12, stroke: T.accent, strokeWidth: 1.5, strokeLinecap: 'round' }),
              // Anchor ring at top
              h('circle', { cx: 19, cy: 5, r: 2.5, fill: 'none', stroke: T.accent, strokeWidth: 1.2 }),
              // Anchor flukes (curved arms at the bottom)
              h('path', { d: 'M 19 38 Q 8 38 7 30 Q 9 34 13 35', fill: 'none', stroke: T.accent, strokeWidth: 1.5, strokeLinecap: 'round' }),
              h('path', { d: 'M 19 38 Q 30 38 31 30 Q 29 34 25 35', fill: 'none', stroke: T.accent, strokeWidth: 1.5, strokeLinecap: 'round' }),
              // Dolphin curling around the shaft (stylized S-curve)
              h('path', { d: 'M 11 18 Q 6 22 11 28 Q 19 31 26 26 Q 31 22 26 17 Q 21 14 19 18',
                fill: 'none', stroke: T.accentHi, strokeWidth: 1.4, strokeLinecap: 'round' }),
              // Dolphin eye dot
              h('circle', { cx: 13, cy: 20, r: 0.8, fill: T.accentHi })
            )
          ),
          // Festina lente — Latin motto used by Aldus, "make haste slowly"
          h('div', { style: { fontSize: 10, fontStyle: 'italic', color: T.accent, fontFamily: 'Georgia, serif', marginBottom: 6, letterSpacing: '0.05em', opacity: 0.85 } },
            'festina lente'),
          // Original disclaimer text
          h('div', null,
            'This tool models the press historically and pedagogically. For hands-on letterpress, visit the ',
            h('a', { href: 'https://www.printingmuseum.org/', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'International Printing Museum'),
            ' or a local letterpress studio. Letterpress is alive in 2026.'
          )
        );
      }

      // ── Cross-link footer ──
      // "Continue with..." panel at the bottom of each module suggests the
      // 1-2 most pedagogically-related modules. Makes the tool feel cohesive
      // — students follow threads instead of bouncing back to the menu.
      // Each suggestion gets the module label and a one-line hook.
      // Mapping: which modules pair with which.
      var CROSS_LINKS = {
        pressMechanism:  [{ id: 'setType', hook: 'Now compose your own type to print on the press you just learned.' },
                          { id: 'castingType', hook: 'See how each piece of metal type was cast in the first place.' }],
        setType:         [{ id: 'pressMechanism', hook: 'Take your composed type to the press and pull an impression.' },
                          { id: 'typographyToday', hook: 'See where every typography term we still use came from.' }],
        castingType:     [{ id: 'pressMechanism', hook: 'Now use the type you just cast on a working press.' },
                          { id: 'economics', hook: 'Calculate what casting thousands of sorts cost.' }],
        economics:       [{ id: 'beforeAfter', hook: 'See what the cost-collapse made possible — Reformation, scientific revolution.' },
                          { id: 'people', hook: 'Meet the people who navigated those economics, including ones you have never heard of.' }],
        beforeAfter:     [{ id: 'people', hook: 'Meet the people behind the events on the timeline.' },
                          { id: 'typographyToday', hook: 'The vocabulary that survived from those first 150 years into your laptop today.' }],
        typographyToday: [{ id: 'setType', hook: 'Try the typography vocabulary in your hands — set type the 1450 way.' },
                          { id: 'broadside', hook: 'Apply the typography knowledge: compose your own broadside.' }],
        people:          [{ id: 'beforeAfter', hook: 'See where each of these people fits on the timeline of print history.' },
                          { id: 'pressMechanism', hook: 'See the press these people built and ran.' }],
        broadside:       [{ id: 'setType', hook: 'Want to know how every word on a real broadside was set? Try it.' },
                          { id: 'beforeAfter', hook: 'See real broadsides from history — Common Sense, ballads, notices.' }],
        sameFears:       [{ id: 'beforeAfter', hook: 'See the real-world events the critics feared — Reformation, religious wars, scientific revolution.' },
                          { id: 'economics', hook: 'The economics of mass print — the same cost-collapse argument we now have about AI.' }],
        dayInShop:       [{ id: 'people', hook: 'Meet the actual people who made these decisions — Gutenberg, Fust, Schöffer, Guillard.' },
                          { id: 'economics', hook: 'See the financial math behind the decisions you just made.' }]
      };
      function crossLinkFooter(currentModId) {
        var links = CROSS_LINKS[currentModId];
        if (!links || links.length === 0) return null;
        return h('div', { className: 'printingpress-no-print', style: { marginTop: 14, background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 14 } },
          h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'Georgia, serif' } }, '↪ Continue with…'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 } },
            links.map(function(link, i) {
              var label = MODULE_LABELS[link.id] || link.id;
              return h('button', { key: i,
                onClick: function() { upd('view', link.id); markVisited(link.id); announce('Opening ' + label); },
                'aria-label': 'Open ' + label,
                style: btn({
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  padding: 10, borderColor: T.border
                })
              },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, '→ ' + label),
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, link.hook)
              );
            })
          )
        );
      }

      // ─────────────────────────────────────────
      // TEACHER NOTES — pattern from SwimLab.
      // ─────────────────────────────────────────
      function TeacherNotes(props) {
        return h('details', { className: 'printingpress-teacher-notes',
          style: { background: '#3b2a08', border: '2px solid ' + T.warn, borderRadius: 12, padding: 14, marginTop: 14 } },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fed7aa', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
            'aria-label': 'Teacher Notes for this module'
          },
            h('span', null, '🍎 Teacher Notes — click to expand'),
            h('span', {
              className: 'printingpress-no-print',
              role: 'button', tabIndex: 0,
              'aria-label': 'Print this module page',
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: '#fef3c7', color: '#7c2d12', border: '1px solid ' + T.warn }
            }, '🖨️ Print')
          ),
          h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 } },
            props.standards && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Aligned standards'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, style: { fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#7c2d12', border: '1px solid ' + T.warn, borderRadius: 6, fontFamily: 'ui-monospace, monospace', fontWeight: 600 } }, s);
                })
              )
            ),
            props.discussion && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Discussion questions'),
              h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: '#fde68a', lineHeight: 1.65 } },
                props.discussion.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })
              )
            ),
            props.misconceptions && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Common misconceptions'),
              h('ul', { style: { margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 } },
                props.misconceptions.map(function(m, i) {
                  return h('li', { key: i, style: { fontSize: 13, color: '#fde68a', lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'flex-start' } },
                    h('span', { 'aria-hidden': 'true', style: { color: '#dc2626', fontWeight: 800, flex: 'none' } }, '⚠'),
                    h('span', null, h('em', null, m.wrong), ' — ', m.right)
                  );
                })
              )
            ),
            props.extension && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Extension activity'),
              h('div', { style: { fontSize: 13, color: '#fde68a', fontStyle: 'italic', lineHeight: 1.55 } }, props.extension)
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MENU
      // ═════════════════════════════════════════════════════════════════════
      var MENU_TILES = [
        { id: 'pressMechanism', icon: '⚙️', label: 'The Press Mechanism', section: 'start',
          desc: 'Pull the bar, watch the screw turn, the platen drop, the type ink the paper. Mechanical advantage, force, and historical accuracy. The wow tile.', ready: true },
        { id: 'setType', icon: '🔠', label: 'Set Your Own Type', section: 'start',
          desc: 'Drag mirror-reversed letter blocks into a composing stick to spell a phrase. Feel why typesetting took hours and why the apprenticeship was years.', ready: true },
        { id: 'castingType', icon: '🔥', label: 'Casting Type', section: 'modules',
          desc: 'Punch → matrix → cast. The three-step process that made identical reusable type possible. Type-metal alloy: lead + tin + antimony, and why each.', ready: true },
        { id: 'economics', icon: '💰', label: 'Print Run Economics', section: 'modules',
          desc: 'Slider-driven cost calculator: hand-copying a Bible vs printing it. The cost-per-book collapse from 1440 to 1500 to 1600.', ready: true },
        { id: 'beforeAfter', icon: '📜', label: 'Before & After', section: 'modules',
          desc: 'The world the press changed: literacy rates, Luther\'s 95 Theses, the scientific revolution, vernacular publishing, newspapers, the modern public.', ready: true },
        { id: 'typographyToday', icon: '🔤', label: 'Typography Today', section: 'modules',
          desc: 'Why your laptop has uppercase and lowercase. Where leading and em-dash come from. The vocabulary of digital type is the vocabulary of a 1450 print shop.', ready: true },
        { id: 'people', icon: '👥', label: 'The People Behind the Press', section: 'modules',
          desc: 'Gutenberg, Fust the financier who sued him, Schöffer the apprentice who improved it, Aldus Manutius and pocket books, and the women printers history forgot.', ready: true },
        { id: 'broadside', icon: '📰', label: 'Build a Broadside', section: 'modules',
          desc: 'Compose a single-page printable: a poem, a manifesto, an announcement. Choose your type, set your layout, print as PDF.', ready: true },
        { id: 'sameFears', icon: '🪶', label: 'The Same Fears', section: 'modules',
          desc: 'Every new information technology arrives with the same warnings. The 1450 print critics and the 2026 internet/AI critics often share an argument. Some critics were right. Some were wrong. The grown-up question is: how do you tell which is which in your own time?', ready: true },
        { id: 'dayInShop', icon: '⚒️', label: 'A Day in the Shop', section: 'modules',
          desc: 'It is 1455 in a Mainz print shop. Choose a role — apprentice, compositor, pressman, or master printer — and walk through four decisions across a working day. Your choices shape who you become. Pure role-play history.', ready: true },
        { id: 'cumulative', icon: '🎯', label: 'Cumulative Quiz', section: 'practice',
          desc: '15 questions across all 10 modules. Missed answers link you back to the module you need to review.', ready: true },
        { id: 'askPrinter', icon: '🤖', label: 'Ask the Printer (AI)', section: 'practice',
          desc: 'Ask any printing-press question; the AI returns a sourced answer. Educational only.', ready: true },
        { id: 'resources', icon: '📚', label: 'Resources', section: 'resources',
          desc: 'Every org cited in this tool, plus museum and primary-source links.', ready: true }
      ];

      // Section accent colors. Each section gets a distinct hue so the menu
      // reads as a 4-part curriculum at a glance. Hues are all warm/earthy
      // (period palette) so nothing jars against the brass/wood/parchment
      // vocabulary. The `stripe` field paints a 3px left-border accent on
      // each section header. The `accent` field stays gold for headlines.
      var MENU_SECTIONS = [
        { id: 'start',     label: 'Start here',       emoji: '⭐', blurb: 'The interactive tiles. Pull the press bar, set your own type. The demo gold.', accent: T.accent, stripe: '#c44536', emphasized: true },
        { id: 'modules',   label: 'Modules',          emoji: '📖', blurb: 'The history, materials, economics, and people. Take in any order.', accent: T.accent, stripe: '#c9a14a' },
        { id: 'practice',  label: 'Practice and ask', emoji: '🎯', blurb: 'Test what you know, or ask the AI printer.', accent: T.accent, stripe: '#7fb069' },
        { id: 'resources', label: 'Resources',        emoji: '📚', blurb: 'Museums, scholarship, and where to see a working press today.', accent: T.accent, stripe: '#b87333' }
      ];

      var MODULE_LABELS = {
        pressMechanism: 'The Press Mechanism',
        setType: 'Set Your Own Type',
        castingType: 'Casting Type',
        economics: 'Print Run Economics',
        beforeAfter: 'Before & After',
        typographyToday: 'Typography Today',
        people: 'The People Behind the Press',
        broadside: 'Build a Broadside',
        sameFears: 'The Same Fears',
        dayInShop: 'A Day in the Shop'
      };

      function renderMenu() {
        var visitedCount = Object.keys(modulesVisited).length;
        var totalModules = 10;
        // Tile counter for staggered entrance: each successive tile gets a
        // ~50ms incremental delay so they cascade in instead of all at once.
        // Reset per render so the cascade plays again if the user navigates
        // away and back (which is fine — the user expects fresh state).
        var tileIdx = 0;
        function renderTile(tile, emphasized) {
          var visited = !!modulesVisited[tile.id];
          var borderColor = visited ? T.ok : (emphasized ? T.accent : T.border);
          var myDelay = tileIdx * 50;
          tileIdx++;
          // Per-section tint — find this tile's section and use a faint
          // radial gradient in its stripe color at the corner of the tile.
          // Subtle (~6% opacity) so tiles still read as a unified set, but
          // each section's identity carries down to its individual cards.
          var tileSection = MENU_SECTIONS.find(function(s) { return s.id === tile.section; });
          var stripe = tileSection ? (tileSection.stripe || T.accent) : T.accent;
          var stripeRgb = stripe === '#c44536' ? '196,69,54' :
                          stripe === '#c9a14a' ? '201,161,74' :
                          stripe === '#7fb069' ? '127,176,105' :
                          stripe === '#b87333' ? '184,115,51' : '201,161,74';
          var tintBg = 'radial-gradient(ellipse at 100% 0%, rgba(' + stripeRgb + ',0.10) 0%, transparent 50%), ' + (emphasized ? T.cardAlt : T.card);
          return h('button', { key: tile.id, role: 'listitem',
            className: 'printingpress-tile',
            'aria-label': tile.label + (visited ? ' (visited)' : '') + (emphasized ? ' — start here' : ''),
            onClick: function() {
              upd('view', tile.id);
              markVisited(tile.id);
              announce('Opening ' + tile.label);
            },
            style: btn({
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
              padding: 14, minHeight: 110,
              background: tintBg,
              borderColor: borderColor,
              borderWidth: emphasized ? 2 : 1,
              borderStyle: 'solid',
              animationDelay: myDelay + 'ms'
            })
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
              h('span', { style: { fontWeight: 700, fontSize: 15, flex: 1, color: T.text, fontFamily: 'Georgia, serif' } }, tile.label),
              visited && h('span', { 'aria-hidden': 'true', style: { color: T.ok, fontSize: 14 } }, '✓')
            ),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.45 } }, tile.desc)
          );
        }
        // All-modules-visited celebration. Counts only the 8 educational
        // modules (cumulative quiz / AI tutor / resources are excluded).
        // When all 8 are visited the menu surfaces a parchment-style
        // congratulations banner above the hero. Award once.
        var allVisited = MENU_TILES.filter(function(t) { return t.section === 'start' || t.section === 'modules'; })
                                    .every(function(t) { return modulesVisited[t.id]; });
        useEffect(function() {
          if (allVisited && !badges['all_modules']) awardBadge('all_modules', 'Toured the Press');
        }, [allVisited]);
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          // ── All-modules-visited celebration banner ──
          // Parchment-style banner with the same fleuron-corner treatment as
          // the cumulative quiz mastery card. Visible only when every
          // educational module has been opened at least once.
          allVisited && h('div', { 'aria-live': 'polite',
            style: { position: 'relative',
              background: 'radial-gradient(ellipse at 50% 35%, #fef3c7 0%, ' + T.parchment + ' 70%)',
              color: T.ink, border: '3px solid ' + T.accent, borderRadius: 12,
              padding: '14px 20px', marginBottom: 14, textAlign: 'center',
              boxShadow: 'inset 0 0 20px rgba(201,161,74,0.2), 0 2px 8px rgba(0,0,0,0.3)' } },
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 6, left: 10, color: T.accent } }, fleuron(12)),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 6, right: 10, color: T.accent } }, fleuron(12)),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 6, left: 10, color: T.accent } }, fleuron(12)),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 6, right: 10, color: T.accent } }, fleuron(12)),
            h('div', { style: { fontSize: 30, marginBottom: 4, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' } }, '🏅'),
            h('div', { style: { fontSize: 16, fontWeight: 800, color: '#7c2d12', fontFamily: 'Georgia, serif', letterSpacing: '0.04em', marginBottom: 4 } }, 'You toured the press'),
            h('div', { 'aria-hidden': 'true', style: { borderTop: '1px solid #7c2d12', borderBottom: '1px solid #7c2d12', height: 3, margin: '4px auto 8px', width: 140, opacity: 0.6 } }),
            h('div', { style: { fontSize: 12, color: '#5c4630', fontStyle: 'italic', lineHeight: 1.5, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' } },
              'Every module visited. Take the cumulative quiz to earn the Master Printer badge, or revisit any module that piqued your curiosity.')
          ),
          // ── Apprentice's journey progress card ──
          // Pairs the existing module-visit count with a real 1450 print
          // shop career arc (Apprentice → Journeyman → Master Printer).
          // Surfaces only when the student is mid-journey — the existing
          // celebration banner above handles the all-visited end state.
          // Closes the menu's progress display from "X / 10 modules" (a
          // checklist) into "you are an Apprentice in year two, three more
          // modules to Journeyman" (a story).
          !allVisited && (function () {
            // Educational-tile order from MENU_TILES (start + modules).
            // First un-visited in this order = the natural next stop,
            // matching Aaron's pedagogical sequencing of the menu.
            var educationalTiles = MENU_TILES.filter(function (t) {
              return t.section === 'start' || t.section === 'modules';
            });
            var totalModules = educationalTiles.length;
            var doneCount = educationalTiles.filter(function (t) {
              return modulesVisited[t.id];
            }).length;
            // Career-tier mapping — uses period vocabulary the rest of
            // the tool already establishes (apprentice/journeyman/master
            // appear in dayInShop and the apprentice contract reading).
            var tier, tierIcon, tierBlurb, tierColor;
            if (doneCount === 0) {
              tier = 'New to the shop';
              tierIcon = '👋';
              tierColor = T.dim;
              tierBlurb = 'Pick any tile below to begin. The Press Mechanism is the dramatic foundation everything else builds on.';
            } else if (doneCount <= 3) {
              tier = 'Apprentice (Year ' + doneCount + ')';
              tierIcon = '🧒';
              tierColor = T.warn;
              tierBlurb = 'Year-one work — sweeping the shop, fetching ink, watching the journeymen. ' + (4 - doneCount) + ' more module' + (4 - doneCount === 1 ? '' : 's') + ' to Journeyman.';
            } else if (doneCount <= 7) {
              tier = 'Journeyman';
              tierIcon = '⚒️';
              tierColor = T.accent;
              tierBlurb = 'Qualified for daily work. You could draw wages from any shop in Mainz. ' + (8 - doneCount) + ' more to Master Printer (in progress).';
            } else {
              tier = 'Master Printer (in progress)';
              tierIcon = '🔥';
              tierColor = T.accentHi;
              tierBlurb = 'You have run nearly the whole craft. ' + (totalModules - doneCount) + ' module' + (totalModules - doneCount === 1 ? '' : 's') + ' to a complete tour. Your colophon is almost on the title page.';
            }
            // Find the natural next tile — first un-visited educational
            // tile in MENU_TILES declaration order.
            var nextTile = null;
            for (var ti = 0; ti < educationalTiles.length; ti++) {
              if (!modulesVisited[educationalTiles[ti].id]) {
                nextTile = educationalTiles[ti];
                break;
              }
            }
            return h('div', {
              'aria-live': 'polite',
              style: {
                background: T.card,
                border: '1px solid ' + tierColor,
                borderLeft: '4px solid ' + tierColor,
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 14
              }
            },
              // Top row: tier + progress bar
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, tierIcon),
                  h('div', null,
                    h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2, fontFamily: 'Georgia, serif' } }, 'Your tier'),
                    h('div', { style: { fontSize: 16, fontWeight: 800, color: tierColor, fontFamily: 'Georgia, serif', lineHeight: 1.1 } }, tier),
                    h('div', { style: { fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.4, maxWidth: 460 } }, tierBlurb)
                  )
                ),
                h('div', { style: { flexShrink: 0, width: 144 } },
                  h('div', { style: { fontSize: 10, color: T.dim, textAlign: 'right', fontFamily: 'ui-monospace, monospace', marginBottom: 4 } },
                    doneCount + ' / ' + totalModules + ' modules'),
                  h('div', { style: { width: '100%', height: 8, background: T.bg, border: '1px solid ' + T.border, borderRadius: 4, overflow: 'hidden' } },
                    h('div', { 'aria-hidden': 'true', style: {
                      height: '100%',
                      width: Math.round((doneCount / totalModules) * 100) + '%',
                      background: 'linear-gradient(90deg, ' + T.accent + ', ' + T.accentHi + ')',
                      transition: 'width 0.3s ease-out'
                    } })
                  )
                )
              ),
              // Bottom row: "Try next" nudge — only if there's a clear next stop
              nextTile && h('div', {
                style: {
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px dashed ' + T.border,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8
                }
              },
                h('div', { style: { fontSize: 12, color: T.text, flex: 1, minWidth: 200 } },
                  h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '→'),
                  h('span', { style: { color: T.dim } }, 'Try next: '),
                  h('strong', { style: { color: T.accentHi } }, nextTile.icon + ' ' + nextTile.label)
                ),
                h('button', {
                  className: 'printingpress-no-print',
                  onClick: function () {
                    upd('view', nextTile.id);
                    markVisited(nextTile.id);
                    announce('Opening ' + nextTile.label);
                  },
                  style: Object.assign(btn({}), {
                    background: T.accent,
                    color: T.ink,
                    borderColor: T.accentHi,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  })
                }, 'Open →')
              )
            );
          })(),
          // Hero — title + tagline + miniature press SVG. The press silhouette
          // gives the menu instant visual identity: "this tool is about THE
          // press, not just a webpage about printing."
          h('div', { style: { background: 'linear-gradient(135deg, #2a1f15 0%, #1a1410 100%)', border: '2px solid ' + T.accent, borderRadius: 14, padding: 20, marginBottom: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center' } },
            // Left side: title + taglines + stats
            h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' } },
                h('h1', { style: { margin: 0, fontSize: 30, color: T.accentHi, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '0.02em' } }, '📜 PrintingPress'),
                h('span', { style: { fontSize: 12, color: T.muted },
                  'aria-label': 'Modules visited: ' + Math.min(visitedCount, totalModules) + ' of ' + totalModules },
                  Math.min(visitedCount, totalModules) + ' / ' + totalModules + ' modules')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' } },
                'The Gutenberg press changed who could read, what could be known, and how fast an idea could travel. Pull the bar. Set the type. Then see the world it built.'),
              h('p', { style: { margin: '0 0 8px', color: T.dim, fontSize: 12, lineHeight: 1.5 } },
                'Interdisciplinary: engineering, materials science, history, economics, typography, civics. Sources cited inline.'),
              // Quick-stat strip
              h('div', { style: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: T.dim } },
                h('span', null, h('strong', { style: { color: T.accentHi } }, '8'), ' modules'),
                h('span', null, h('strong', { style: { color: T.accentHi } }, '3'), ' interactive simulations'),
                h('span', null, h('strong', { style: { color: T.accentHi } }, '12'), ' cumulative-quiz items'),
                h('span', null, h('strong', { style: { color: T.accentHi } }, '20+'), ' scenarios')
              )
            ),
            // Right side: miniature press SVG (decorative, no interaction needed)
            h('svg', { width: 130, height: 160, viewBox: '0 0 130 160', 'aria-hidden': 'true',
              style: { display: 'block', flexShrink: 0 } },
              // Frame uprights
              h('rect', { x: 18, y: 12, width: 9, height: 130, fill: T.wood, stroke: '#3d2914', strokeWidth: 1 }),
              h('rect', { x: 103, y: 12, width: 9, height: 130, fill: T.wood, stroke: '#3d2914', strokeWidth: 1 }),
              // Crossbeam
              h('rect', { x: 18, y: 12, width: 94, height: 9, fill: '#5a3a1f', stroke: '#3d2914', strokeWidth: 1 }),
              // Base
              h('rect', { x: 12, y: 138, width: 106, height: 7, fill: '#5a3a1f', stroke: '#3d2914', strokeWidth: 1 }),
              // Screw shaft
              h('rect', { x: 60, y: 21, width: 10, height: 30, fill: '#4a4a4a', stroke: '#2a2a2a', strokeWidth: 0.5 }),
              // Screw threads
              h('line', { x1: 60, y1: 27, x2: 70, y2: 27, stroke: '#2a2a2a', strokeWidth: 0.5 }),
              h('line', { x1: 60, y1: 33, x2: 70, y2: 33, stroke: '#2a2a2a', strokeWidth: 0.5 }),
              h('line', { x1: 60, y1: 39, x2: 70, y2: 39, stroke: '#2a2a2a', strokeWidth: 0.5 }),
              h('line', { x1: 60, y1: 45, x2: 70, y2: 45, stroke: '#2a2a2a', strokeWidth: 0.5 }),
              // Nut
              h('circle', { cx: 65, cy: 51, r: 9, fill: '#6a6a6a', stroke: '#2a2a2a', strokeWidth: 0.8 }),
              h('circle', { cx: 65, cy: 51, r: 6, fill: '#4a4a4a' }),
              // Bar
              h('rect', { x: 30, y: 49, width: 70, height: 5, rx: 2, fill: T.wood, stroke: '#3d2914', strokeWidth: 0.8 }),
              h('circle', { cx: 32, cy: 51.5, r: 3, fill: '#3d2914' }),
              h('circle', { cx: 98, cy: 51.5, r: 3, fill: '#3d2914' }),
              // Platen (held up)
              h('rect', { x: 35, y: 60, width: 60, height: 10, fill: '#7a5a2f', stroke: '#3d2914', strokeWidth: 1 }),
              // Bed
              h('rect', { x: 25, y: 110, width: 80, height: 12, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 1 }),
              // Type forme on bed (inked)
              h('rect', { x: 33, y: 113, width: 64, height: 6, fill: T.ink }),
              // Tiny hint of letters
              h('text', { x: 65, y: 118, textAnchor: 'middle', fill: T.parchment, opacity: 0.5,
                fontSize: 5, fontFamily: 'Georgia, serif', fontWeight: 700, transform: 'translate(130 0) scale(-1 1)' }, 'FIAT'),
              // Resting ink balls
              h('line', { x1: 18, y1: 138, x2: 16, y2: 122, stroke: T.wood, strokeWidth: 2, strokeLinecap: 'round' }),
              h('circle', { cx: 16, cy: 122, r: 4, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 0.5 }),
              h('line', { x1: 112, y1: 138, x2: 114, y2: 122, stroke: T.wood, strokeWidth: 2, strokeLinecap: 'round' }),
              h('circle', { cx: 114, cy: 122, r: 4, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 0.5 }),
              // Caption
              h('text', { x: 65, y: 156, textAnchor: 'middle', fill: T.dim, fontSize: 7, fontStyle: 'italic', fontFamily: 'Georgia, serif' }, '~1450 screw press')
            )
          ),
          MENU_SECTIONS.map(function(sec) {
            var sectionTiles = MENU_TILES.filter(function(t) { return t.section === sec.id; });
            if (sectionTiles.length === 0) return null;
            return h('section', { key: sec.id, 'aria-label': sec.label,
              style: {
                marginBottom: 18,
                padding: sec.emphasized ? 14 : 0,
                borderRadius: sec.emphasized ? 12 : 0,
                background: sec.emphasized ? 'rgba(201,161,74,0.08)' : 'transparent',
                border: sec.emphasized ? '1px solid ' + sec.accent : 'none'
              }
            },
              // Section header with per-section accent stripe on the left.
              // Stripe color is distinct per section (red for Start Here,
               // gold for Modules, green for Practice, copper for Resources).
              // The stripe is 3px wide and runs the full height of the header
              // block. Subtle but signals "different category" at a glance.
              h('div', { style: { display: 'flex', gap: 10, marginBottom: sec.blurb ? 4 : 8 } },
                h('div', { 'aria-hidden': 'true', style: { width: 3, alignSelf: 'stretch', background: sec.stripe || sec.accent, borderRadius: 2, flexShrink: 0 } }),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
                    h('h3', { style: { margin: 0, fontSize: 15, color: sec.emphasized ? sec.accent : T.accentHi, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, fontFamily: 'Georgia, serif' } },
                      h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, sec.emoji),
                      sec.label)
                  ),
                  sec.blurb && h('p', { style: { margin: '4px 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.5 } }, sec.blurb)
                )
              ),
              h('div', { role: 'list',
                style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
                sectionTiles.map(function(tile) { return renderTile(tile, !!sec.emphasized); })
              )
            );
          }),
          Object.keys(badges).length > 0 && h('div', { style: { marginTop: 18, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, '🏅 Badges earned'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                return h('span', { key: bid,
                  style: { fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#3b2a08', color: T.accentHi, border: '1px solid ' + T.warn } },
                  badges[bid].label || bid);
              })
            )
          ),

          // ── Teacher Quick-Start card ──
          // Collapsible so it does not crowd the student menu. Plain-language
          // sequencing by class-period length so a teacher can preview the
          // tool and map it onto their schedule in 30 seconds. Maine state
          // standards + CCSS-ELA anchors below.
          h('details', { style: { marginTop: 18, background: T.cardAlt, border: '1px solid ' + T.accent, borderRadius: 10, padding: '10px 14px' } },
            h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.accentHi, fontWeight: 700, fontFamily: 'Georgia, serif' } },
              '🎓 Teacher quick-start (click to expand)'),
            h('div', { style: { marginTop: 12 } },
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.6 } },
                'Three pre-built sequences depending on how much class time you have. None require setup; everything in PrintingPress runs in the browser.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
                [
                  { time: '20 minutes', label: 'Crew warm-up', tone: T.accent,
                    plan: 'Open Press Mechanism. Run the Guided Tour. Pull the bar. End at the "What you just did" recap. Close with one Crew question: which century are we still living off?' },
                  { time: '50 minutes', label: 'Single class period', tone: T.warn,
                    plan: 'Press Mechanism (10m) → Set Your Own Type with the composing stick + proofreader (15m) → Build a Broadside; students compose and print one (20m) → 5-minute share-out.' },
                  { time: '1-2 weeks', label: 'Full unit', tone: T.ok,
                    plan: 'One module per day. End with the cumulative quiz and Ask the Printer. Have each student produce a finished broadside as the unit artifact. Use The Same Fears as the Crew anchor for the final discussion.' }
                ].map(function(seq, i) {
                  return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderLeft: '3px solid ' + seq.tone, borderRadius: 6, padding: 10 } },
                    h('div', { style: { fontSize: 10, color: seq.tone, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia, serif' } }, seq.time),
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 6, fontFamily: 'Georgia, serif' } }, seq.label),
                    h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, seq.plan)
                  );
                })
              ),
              h('div', { style: { background: T.card, border: '1px dashed ' + T.accent, borderRadius: 8, padding: 12 } },
                h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8, fontFamily: 'Georgia, serif' } }, 'Standards anchors'),
                h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: T.muted, lineHeight: 1.6 } },
                  h('li', null, h('strong', { style: { color: T.text } }, 'CCSS-ELA RH.6-8.2:'), ' Determine the central ideas of a primary source (use the Reformation theses + Falmouth Gazette as period sources).'),
                  h('li', null, h('strong', { style: { color: T.text } }, 'CCSS-ELA RH.6-8.9:'), ' Analyze the relationship between a primary source and the secondary account (compare 1450 critic quotes to modern echoes in The Same Fears).'),
                  h('li', null, h('strong', { style: { color: T.text } }, 'Maine Social Studies SS.M.4:'), ' Trace the development of a Maine institution; Falmouth Gazette (1785) traces to the modern Portland Press Herald, a 240-year chain.'),
                  h('li', null, h('strong', { style: { color: T.text } }, 'NGSS MS-ETS1-2:'), ' Evaluate competing design solutions using systematic criteria (alloy designer in Casting Type).'),
                  h('li', null, h('strong', { style: { color: T.text } }, 'CCSS-Math 7.RP, 8.F:'), ' Proportional reasoning and functions (pamphlet reach calculator + mechanical-advantage screw math).')
                )
              ),
              // Subject-mapping mini-grid: which modules touch which school
              // subject. Lets a teacher slot the tool into whatever subject
              // window they have. Each subject lists 2-4 module IDs.
              h('div', { style: { background: T.card, border: '1px dashed ' + T.warn, borderRadius: 8, padding: 12, marginTop: 10 } },
                h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8, fontFamily: 'Georgia, serif' } }, 'Map to your subject'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 } },
                  [
                    { subj: 'Physics', icon: '⚙️',
                      mods: 'Press Mechanism, Casting Type',
                      hook: 'Screw mechanical advantage, alloy materials science, screw-as-inclined-plane.' },
                    { subj: 'English Language Arts', icon: '✍️',
                      mods: 'Set Your Own Type, Typography Today, Build a Broadside',
                      hook: 'Primary-source reading (Reformation theses, Common Sense, Falmouth Gazette), proofreader\'s eye, period vocabulary.' },
                    { subj: 'Social Studies / History', icon: '🏛️',
                      mods: 'Before & After, The People, The Same Fears',
                      hook: 'Reformation spread map, Maine timeline, 1450 ↔ 2026 cross-era media parallels.' },
                    { subj: 'Mathematics', icon: '🧮',
                      mods: 'Print Run Economics, Press Mechanism',
                      hook: 'Proportional reasoning, exponential reach modeling, mechanical-advantage formula, log-scale comparisons.' },
                    { subj: 'Art / Design', icon: '🎨',
                      mods: 'Typography Today, Build a Broadside',
                      hook: 'Typeface anatomy, fleurons, drop caps, layout grid, signature design.' },
                    { subj: 'Career & Technical Ed', icon: '🔧',
                      mods: 'A Day in the Shop, Casting Type',
                      hook: 'Skilled-trade pathways, modern echoes (CNC, industrial press, additive manufacturing), apprenticeship as a model.' },
                    { subj: 'Crew / Advisory', icon: '🌱',
                      mods: 'The Same Fears, Before & After',
                      hook: 'Discussion-driven, no single-right-answer questions on tech, change, and what gets preserved.' },
                    { subj: 'Local / Maine', icon: '🌲',
                      mods: 'People, Build a Broadside, Before & After',
                      hook: 'Falmouth Gazette (1785), Wait & Titcomb, 1820 statehood peg, 240-year newspaper chain.' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { background: T.cardAlt, borderLeft: '3px solid ' + T.accent, borderRadius: 4, padding: 8 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                        h('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, s.icon),
                        h('strong', { style: { fontSize: 12, color: T.accentHi, fontFamily: 'Georgia, serif' } }, s.subj)
                      ),
                      h('div', { style: { fontSize: 10, color: T.warn, fontStyle: 'italic', marginBottom: 4 } }, s.mods),
                      h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, s.hook)
                    );
                  })
                )
              ),
              h('p', { style: { margin: '12px 0 0', fontSize: 10, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
                'Built by a Portland school psychologist for King Middle, EL Education aligned. Every module has a Teacher Notes block at the bottom with discussion prompts and "what students often ask." No student data is collected; everything runs locally in the browser.')
            )
          ),

          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // STAR MODULE 1 — THE PRESS MECHANISM (interactive simulation)
      // ═════════════════════════════════════════════════════════════════════
      // The press has six logical states the user steps through:
      //   1. CLEAN — empty bed, screw up. Action: "Ink the type."
      //   2. INKING — ink balls animate dabbing the type. Auto-advances to:
      //   3. INKED — type is black. Action: "Lay paper."
      //   4. PAPERED — paper on tympan. Action: "Pull the bar."
      //   5. PRESSED — platen down, paper pressed. Action: "Lift and reveal."
      //   6. REVEALED — see the printed phrase. Action: "Print another" (→ CLEAN).
      // Counter tracks impressions made. Screw angle is derived from state.
      function renderPressMechanism() {
        var stateRaw = useState('clean');
        var pressState = stateRaw[0], setPressState = stateRaw[1];
        var countRaw = useState(0);
        var count = countRaw[0], setCount = countRaw[1];
        var inkAnimRaw = useState(0);  // 0..1 progress for ink animation
        var inkAnim = inkAnimRaw[0], setInkAnim = inkAnimRaw[1];
        // Guided tour state — auto-advance through all 6 states for a hands-
        // free demo. Aaron can hit "▶ Guided Tour" at the board, talk over
        // the simulation, and the press cycles through the full impression
        // cycle on its own. Tour cancels if the user clicks anything.
        var tourActiveRaw = useState(false);
        var tourActive = tourActiveRaw[0], setTourActive = tourActiveRaw[1];
        // User-customizable phrase. Default = FIAT LUX (Genesis 1:3, "Let
        // there be light" — historically apt for a Gutenberg-era press whose
        // first major use was the Bible). Capped at 14 chars to fit visually
        // in the type forme. Auto-uppercased because metal type was case-
        // separated and the simulation only renders one case.
        var phraseRaw = useState('FIAT LUX');
        var phrase = phraseRaw[0], setPhrase = phraseRaw[1];
        var safePhrase = (phrase || 'FIAT LUX').toUpperCase().slice(0, 14);
        // Labels overlay — when on, the SVG shows leader lines + part names
        // for the major press components. Off by default so the simulation
        // stays clean during pure demo; on for "let me explain the parts."
        var showLabelsRaw = useState(false);
        var showLabels = showLabelsRaw[0], setShowLabels = showLabelsRaw[1];

        // Ink balls animation when state === 'inking'
        useEffect(function() {
          if (pressState !== 'inking') return;
          var start = Date.now();
          var DURATION = 1200;
          var iv = setInterval(function() {
            var t = Math.min(1, (Date.now() - start) / DURATION);
            setInkAnim(t);
            if (t >= 1) {
              clearInterval(iv);
              setPressState('inked');
              setInkAnim(0);
              announce('Type is inked. Lay paper on the tympan.');
            }
          }, 40);
          return function() { clearInterval(iv); };
        }, [pressState]);

        // Guided tour auto-advancer. Pauses on each state for ~2.5s except
        // 'inking' (which has its own animation) so the audience reads the
        // narration. Stops automatically after one full cycle returns to
        // 'clean' OR if the user manually advances during the tour.
        useEffect(function() {
          if (!tourActive) return;
          if (pressState === 'inking') return;  // ink animation handles its own timing
          var DELAY = pressState === 'revealed' ? 3500 : 2500;  // hold the reveal longer
          var to = setTimeout(function() {
            if (pressState === 'clean' && count >= 1) {
              setTourActive(false);
              announce('Guided tour complete. Click any button to take the controls.');
              return;
            }
            advance();
          }, DELAY);
          return function() { clearTimeout(to); };
        }, [tourActive, pressState, count]);

        function advance() {
          if (pressState === 'clean') {
            setPressState('inking');
            announce('Step 2: Inking the type with the leather ink balls.');
          } else if (pressState === 'inked') {
            setPressState('papered');
            announce('Step 4: Paper laid on the tympan. Now pull the bar.');
          } else if (pressState === 'papered') {
            setPressState('pressed');
            announce('Step 5: Bar pulled, screw turning, platen down. Pressure applied to the type forme.');
          } else if (pressState === 'pressed') {
            setPressState('revealed');
            var nextCount = count + 1;
            setCount(nextCount);
            // Milestone celebrations at meaningful production thresholds.
            // The 1st is "First Impression," 5 is "Journeyman" (the
            // apprenticeship benchmark), 25 was a typical morning's
            // output for a Gutenberg-era crew, 50 is half a day. Each
            // hits a different badge so the student sees a progression
            // that mirrors the actual print shop's career structure.
            if (nextCount === 1) awardBadge('first_impression', 'First Impression');
            if (nextCount === 5) awardBadge('journeyman', 'Journeyman Printer');
            if (nextCount === 25) awardBadge('morning_crew', 'Morning Crew (25 impressions)');
            if (nextCount === 50) awardBadge('half_day_run', 'Half-Day Run (50 impressions)');
            if (nextCount === 100) awardBadge('master_printer_run', 'Master Printer (100 impressions)');
            announce('Step 6: Impression complete. ' + nextCount + ' total. The paper bears the printed text.');
          } else if (pressState === 'revealed') {
            setPressState('clean');
            announce('Press reset. Ready for the next impression.');
          }
        }

        function nextAction() {
          // Manual click cancels the tour so the user takes control.
          if (tourActive) setTourActive(false);
          advance();
        }

        var actionLabel = {
          clean:    '① Ink the type',
          inking:   'Inking…',
          inked:    '② Lay paper',
          papered:  '③ Pull the bar',
          pressed:  '④ Lift and reveal',
          revealed: '⑤ Print another'
        }[pressState];

        var actionDisabled = pressState === 'inking';

        // The SVG press, side view.
        var W = 480, H = 360;
        // Derived geometry based on state
        var screwY = (pressState === 'pressed' || pressState === 'revealed') ? 145 : 60;
        var screwRot = (pressState === 'pressed' || pressState === 'revealed') ? -75 : 0;  // bar swung down
        var platenY = (pressState === 'pressed' || pressState === 'revealed') ? 195 : 110;
        var platenH = 30;
        var typeFilled = (pressState === 'inked' || pressState === 'papered' || pressState === 'pressed' || pressState === 'revealed');
        var paperShown = (pressState === 'papered' || pressState === 'pressed' || pressState === 'revealed');
        var paperPrinted = (pressState === 'revealed');

        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('⚙️ The Press Mechanism'),
          dropCapPara('A working Gutenberg-style screw press. Each step is what a journeyman printer in 1450 would have done, in the same order, with the same tools. Click the action button to advance.'),

          // ── Custom phrase input ──
          // Lets the demo audience pick what gets printed. Cap at 14 chars so
          // it fits on the type forme. Disabled mid-cycle so changing the
          // phrase while inking doesn't desync the paper from the type.
          h('div', { className: 'printingpress-no-print', style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('label', { htmlFor: 'pp-phrase', style: { fontSize: 13, color: T.text, fontWeight: 600, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' } },
              '🪶 What should the press print?'),
            h('input', {
              id: 'pp-phrase',
              type: 'text',
              value: phrase,
              maxLength: 14,
              disabled: pressState !== 'clean' && pressState !== 'revealed',
              onChange: function(e) { setPhrase(e.target.value); },
              placeholder: 'Up to 14 characters',
              style: { flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 14, fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.05em' }
            }),
            h('button', {
              onClick: function() { setPhrase('FIAT LUX'); announce('Phrase reset to FIAT LUX.'); },
              disabled: pressState !== 'clean' && pressState !== 'revealed',
              style: btn({ padding: '6px 10px', fontSize: 11, opacity: (pressState !== 'clean' && pressState !== 'revealed') ? 0.5 : 1 })
            }, '↺ FIAT LUX'),
            h('div', { style: { width: '100%', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.4 } },
              'Your phrase appears mirror-reversed on the type forme and reads correctly on the paper after pressing. ',
              h('strong', { style: { color: T.text } }, 'Try your name, the date, or any short phrase.'))
          ),

          // ── Tour narration banner (only visible during guided tour) ──
          tourActive && h('div', {
            'aria-live': 'polite',
            style: { background: 'linear-gradient(90deg, ' + T.accent + ' 0%, ' + T.accentHi + ' 100%)', color: T.ink, padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'Georgia, serif', boxShadow: '0 2px 8px rgba(201,161,74,0.4)' } },
            '🎬 ',
            ({clean: 'Step 1: The press is empty. Type forme rests on the bed; ink balls hang ready.',
              inking: 'Step 2: Inking the type — leather-and-wool ink balls dab oil-based ink onto the metal type.',
              inked: 'Step 3: Type is fully inked. Time to lay paper on the tympan.',
              papered: 'Step 4: Paper laid on the tympan. The pressman pulls the bar.',
              pressed: 'Step 5: The screw turns, the platen descends, and pressure transfers ink from type to paper.',
              revealed: 'Step 6: A perfect impression. About 250 of these in a working day, ~180 Bibles in 3 years.'})[pressState]
          ),

          // ── The simulation ──
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 18 } },
            h('div', {
                className: tourActive ? 'printingpress-tour-active' : '',
                style: {
                  // Workshop-floor texture: faint flagstone pattern made
                  // from layered radial gradients. Subtle ambient "the press
                  // sits on a stone floor" feel without competing with the
                  // simulation. ~6% opacity per stone, never dominant.
                  background:
                    'radial-gradient(ellipse at 18% 30%, rgba(180,140,80,0.06) 0%, transparent 12%), ' +
                    'radial-gradient(ellipse at 72% 45%, rgba(180,140,80,0.05) 0%, transparent 14%), ' +
                    'radial-gradient(ellipse at 40% 75%, rgba(180,140,80,0.06) 0%, transparent 11%), ' +
                    'radial-gradient(ellipse at 86% 20%, rgba(180,140,80,0.04) 0%, transparent 10%), ' +
                    'radial-gradient(ellipse at 10% 80%, rgba(180,140,80,0.05) 0%, transparent 13%), ' +
                    T.cardAlt,
                  border: '2px solid ' + (tourActive ? T.accent : T.border), borderRadius: 12, padding: 12, textAlign: 'center', transition: 'border-color 0.3s ease',
                  position: 'relative'
                } },
              // Transient onomatopoeia overlay. Re-mounted via key whenever
              // pressState changes so the CSS keyframe replays. Pure
              // atmosphere; aria-hidden so screen readers don't get spam.
              (function() {
                var labels = {
                  inking: { txt: '*tap tap*', color: '#a87a3a' },
                  papered: { txt: '*flap*', color: T.parchment },
                  pressing: { txt: '*CHUNK*', color: T.accentHi },
                  printed: { txt: '*hiss...*', color: T.muted }
                };
                var lab = labels[pressState];
                if (!lab) return null;
                return h('div', {
                  key: 'onomato-' + pressState,
                  className: 'printingpress-onomatopoeia',
                  'aria-hidden': 'true',
                  style: {
                    position: 'absolute',
                    top: '32%', right: '14%',
                    color: lab.color,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: pressState === 'pressing' ? 22 : 16,
                    textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                    zIndex: 4,
                    letterSpacing: '0.04em'
                  }
                }, lab.txt);
              })(),
              h('svg', {
                width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 520, display: 'block', margin: '0 auto', background: '#1f1610', borderRadius: 8 },
                role: 'img',
                'aria-label': 'Side view of a Gutenberg-style screw press in state: ' + pressState
              },
                // ── SVG defs: wood grain pattern + paper aging filter ──
                // The wood pattern is a vertical-grain texture using
                // semi-transparent darker streaks. Reused on all wooden
                // parts of the press for consistency. Pattern repeats so
                // it scales with the part size.
                h('defs', null,
                  h('pattern', { id: 'pp-woodgrain', x: 0, y: 0, width: 25, height: 280, patternUnits: 'userSpaceOnUse' },
                    h('rect', { width: 25, height: 280, fill: T.wood }),
                    // Vertical grain streaks (varied widths and opacity for organic feel)
                    h('rect', { x: 3, y: 0, width: 0.8, height: 280, fill: '#3d2914', opacity: 0.3 }),
                    h('rect', { x: 7, y: 0, width: 1.2, height: 280, fill: '#3d2914', opacity: 0.4 }),
                    h('rect', { x: 11, y: 0, width: 0.5, height: 280, fill: '#3d2914', opacity: 0.25 }),
                    h('rect', { x: 14, y: 0, width: 0.9, height: 280, fill: '#3d2914', opacity: 0.35 }),
                    h('rect', { x: 18, y: 0, width: 0.6, height: 280, fill: '#3d2914', opacity: 0.3 }),
                    h('rect', { x: 21, y: 0, width: 1.1, height: 280, fill: '#3d2914', opacity: 0.4 }),
                    // Subtle highlight streak (lighter)
                    h('rect', { x: 5, y: 0, width: 0.4, height: 280, fill: '#8b5a2f', opacity: 0.3 }),
                    h('rect', { x: 16, y: 0, width: 0.4, height: 280, fill: '#8b5a2f', opacity: 0.25 }),
                    // A few knots (small ovals)
                    h('ellipse', { cx: 8, cy: 60, rx: 2.5, ry: 1.5, fill: '#3d2914', opacity: 0.45 }),
                    h('ellipse', { cx: 17, cy: 180, rx: 2, ry: 1.2, fill: '#3d2914', opacity: 0.4 })
                  ),
                  // Horizontal grain pattern for the crossbeam and base
                  h('pattern', { id: 'pp-woodgrain-horizontal', x: 0, y: 0, width: 360, height: 20, patternUnits: 'userSpaceOnUse' },
                    h('rect', { width: 360, height: 20, fill: '#5a3a1f' }),
                    h('rect', { x: 0, y: 4, width: 360, height: 0.6, fill: '#3d2914', opacity: 0.4 }),
                    h('rect', { x: 0, y: 9, width: 360, height: 0.5, fill: '#3d2914', opacity: 0.3 }),
                    h('rect', { x: 0, y: 13, width: 360, height: 0.7, fill: '#3d2914', opacity: 0.4 }),
                    h('rect', { x: 0, y: 17, width: 360, height: 0.4, fill: '#3d2914', opacity: 0.25 }),
                    h('rect', { x: 0, y: 6, width: 360, height: 0.3, fill: '#8b5a2f', opacity: 0.3 })
                  ),
                  // Platen wood-grain — sized to the platen footprint (220×30)
                  // so the grain doesn't tile awkwardly. Slightly lighter
                  // base wood than the frame because a master printer's
                  // platen was usually a smoother, finer hardwood (oak or
                  // beech) — finished and waxed, not raw timber.
                  h('pattern', { id: 'pp-woodgrain-platen', x: 0, y: 0, width: 220, height: 30, patternUnits: 'userSpaceOnUse' },
                    h('rect', { width: 220, height: 30, fill: '#7a5a2f' }),
                    h('rect', { x: 0, y: 5, width: 220, height: 0.7, fill: '#3d2914', opacity: 0.45 }),
                    h('rect', { x: 0, y: 11, width: 220, height: 0.5, fill: '#3d2914', opacity: 0.3 }),
                    h('rect', { x: 0, y: 16, width: 220, height: 0.6, fill: '#3d2914', opacity: 0.4 }),
                    h('rect', { x: 0, y: 22, width: 220, height: 0.5, fill: '#3d2914', opacity: 0.35 }),
                    h('rect', { x: 0, y: 27, width: 220, height: 0.4, fill: '#3d2914', opacity: 0.3 }),
                    // Subtle highlight (lighter polished sheen)
                    h('rect', { x: 0, y: 8, width: 220, height: 0.4, fill: '#a87a3a', opacity: 0.4 }),
                    // A small knot
                    h('ellipse', { cx: 60, cy: 14, rx: 3, ry: 1.5, fill: '#3d2914', opacity: 0.4 })
                  ),
                  // Brass/iron screw-shaft gradient — horizontal so the
                  // metal cylinder reads as 3D (dark edges, bright center
                  // highlight). Mirrors how light catches a real polished
                  // metal shaft. Color stops simulate iron with a brass
                  // patina (period-accurate: screws were usually iron in
                  // 1450, sometimes brass-tipped for cosmetic reasons).
                  h('linearGradient', { id: 'pp-screw-metal', x1: 0, y1: 0, x2: 1, y2: 0 },
                    h('stop', { offset: '0%',  stopColor: '#2a2a2a' }),
                    h('stop', { offset: '20%', stopColor: '#5a5a5a' }),
                    h('stop', { offset: '50%', stopColor: '#8a8a8a' }),
                    h('stop', { offset: '80%', stopColor: '#5a5a5a' }),
                    h('stop', { offset: '100%', stopColor: '#2a2a2a' })
                  ),
                  // Brass gradient for the nut (which historically was often
                  // brass for both cosmetic and machinability reasons)
                  h('radialGradient', { id: 'pp-nut-brass', cx: '35%', cy: '30%' },
                    h('stop', { offset: '0%',  stopColor: '#fef3c7' }),
                    h('stop', { offset: '40%', stopColor: '#c9a14a' }),
                    h('stop', { offset: '100%', stopColor: '#7c4f1f' })
                  ),
                  // Polished-wood radial for the bar handle ball caps —
                  // simulates a turned wooden knob with a highlight at the
                  // upper-left (like a real spherical wooden ball under
                  // workshop light). Reuses the wood palette so the bar
                  // material reads consistently across all parts.
                  h('radialGradient', { id: 'pp-handle-ball', cx: '30%', cy: '30%' },
                    h('stop', { offset: '0%',  stopColor: '#8b5a2f' }),
                    h('stop', { offset: '40%', stopColor: '#5a3a1f' }),
                    h('stop', { offset: '100%', stopColor: '#2a1c0e' })
                  ),
                  // Pressed-paper grain filter — applied to the printed text
                  // on the paper to simulate the irregular absorption of ink
                  // into hand-pressed letterpress paper. Subtle: low-base
                  // turbulence + displacement gives the type a slightly
                  // rough edge instead of perfectly crisp digital lines.
                  // The result is a "real impression" feel rather than a
                  // computer-rendered letterform.
                  h('filter', { id: 'pp-paper-grain', x: '-5%', y: '-10%', width: '110%', height: '120%' },
                    h('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '1', seed: '3', result: 'noise' }),
                    h('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: '0.5' })
                  ),
                  // Candle-glow radial — warm halo around the flame
                  h('radialGradient', { id: 'pp-candle-glow', cx: '50%', cy: '50%', r: '50%' },
                    h('stop', { offset: '0%',  stopColor: '#fef3c7', stopOpacity: 0.6 }),
                    h('stop', { offset: '50%', stopColor: '#fbbf24', stopOpacity: 0.2 }),
                    h('stop', { offset: '100%', stopColor: '#fbbf24', stopOpacity: 0 })
                  ),
                  // Workshop wall gradient — dim plaster wall behind the
                  // press. Slightly warmer at the top (the rafters catch
                  // window light) and darker at the bottom (the wall
                  // recedes into shadow at floor level).
                  h('linearGradient', { id: 'pp-wall', x1: 0, y1: 0, x2: 0, y2: 1 },
                    h('stop', { offset: '0%',  stopColor: '#3a2a1c' }),
                    h('stop', { offset: '60%', stopColor: '#241a12' }),
                    h('stop', { offset: '100%', stopColor: '#1a120a' })
                  ),
                  // Window-light beam — diagonal linear gradient, warm
                  // amber, fading from the upper-left to mid-right. Reads
                  // as morning sun coming through a high window onto the
                  // press. Low opacity so it suggests light, doesn't shout.
                  h('linearGradient', { id: 'pp-window-beam', x1: 0, y1: 0, x2: 1, y2: 1 },
                    h('stop', { offset: '0%',   stopColor: '#fbbf24', stopOpacity: 0.18 }),
                    h('stop', { offset: '40%',  stopColor: '#fbbf24', stopOpacity: 0.06 }),
                    h('stop', { offset: '100%', stopColor: '#fbbf24', stopOpacity: 0 })
                  ),
                  // Wooden floorboards — horizontal planks under the press
                  // base. Each plank ~80px wide; the pattern repeats.
                  h('pattern', { id: 'pp-floorboards', x: 0, y: 0, width: 96, height: 50, patternUnits: 'userSpaceOnUse' },
                    h('rect', { width: 96, height: 50, fill: '#3d2914' }),
                    // Plank seams (vertical between boards)
                    h('rect', { x: 0,  y: 0, width: 0.8, height: 50, fill: '#1a0d05', opacity: 0.7 }),
                    h('rect', { x: 95, y: 0, width: 0.8, height: 50, fill: '#1a0d05', opacity: 0.7 }),
                    // Grain streaks
                    h('rect', { x: 0, y: 12, width: 96, height: 0.5, fill: '#2a1c0e', opacity: 0.5 }),
                    h('rect', { x: 0, y: 28, width: 96, height: 0.6, fill: '#2a1c0e', opacity: 0.45 }),
                    h('rect', { x: 0, y: 38, width: 96, height: 0.4, fill: '#2a1c0e', opacity: 0.4 }),
                    // Subtle highlight (waxed plank sheen)
                    h('rect', { x: 0, y: 18, width: 96, height: 0.3, fill: '#5a3a1f', opacity: 0.35 })
                  )
                ),
                // ── Workshop scene backdrop ──
                // Dark plaster wall behind the press, then a wooden floor
                // strip below the press base, then a soft window-light beam
                // angled across the upper-left (suggests morning light from
                // a high window). All decorative — drawn before the press
                // so the press parts render on top of the scene.
                h('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#pp-wall)' }),
                h('polygon', { points: '0,0 200,0 0,300', fill: 'url(#pp-window-beam)', 'aria-hidden': 'true' }),
                h('rect', { x: 0, y: 312, width: W, height: H - 312, fill: 'url(#pp-floorboards)' }),
                // Subtle floor-line shadow where the floor meets the wall
                h('rect', { x: 0, y: 311, width: W, height: 1.5, fill: '#0c0805', opacity: 0.7 }),
                // ── Wooden frame ── (now using wood-grain patterns for richness)
                h('rect', { x: 60, y: 30, width: 25, height: 280, fill: 'url(#pp-woodgrain)', stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 395, y: 30, width: 25, height: 280, fill: 'url(#pp-woodgrain)', stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 60, y: 30, width: 360, height: 20, fill: 'url(#pp-woodgrain-horizontal)', stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 60, y: 295, width: 360, height: 15, fill: 'url(#pp-woodgrain-horizontal)', stroke: '#3d2914', strokeWidth: 2 }),
                // Sawdust + ink-spatter on the floor in front of the press —
                // tiny tan dots scattered along the bottom edge. Adds the
                // lived-in workshop feel of a press that has been worked
                // for years. Subtle enough not to distract.
                h('g', { 'aria-hidden': 'true' },
                  h('circle', { cx: 92, cy: 322, r: 0.8, fill: '#a87a3a', opacity: 0.6 }),
                  h('circle', { cx: 108, cy: 326, r: 0.5, fill: '#8b5a2f', opacity: 0.55 }),
                  h('circle', { cx: 125, cy: 324, r: 0.6, fill: '#a87a3a', opacity: 0.5 }),
                  h('circle', { cx: 142, cy: 327, r: 0.4, fill: '#8b5a2f', opacity: 0.55 }),
                  h('circle', { cx: 175, cy: 323, r: 0.7, fill: '#a87a3a', opacity: 0.55 }),
                  h('circle', { cx: 210, cy: 326, r: 0.5, fill: '#8b5a2f', opacity: 0.6 }),
                  h('circle', { cx: 248, cy: 324, r: 0.6, fill: '#a87a3a', opacity: 0.55 }),
                  h('circle', { cx: 285, cy: 326, r: 0.5, fill: '#8b5a2f', opacity: 0.5 }),
                  h('circle', { cx: 312, cy: 323, r: 0.8, fill: '#a87a3a', opacity: 0.6 }),
                  h('circle', { cx: 348, cy: 327, r: 0.5, fill: '#8b5a2f', opacity: 0.55 }),
                  h('circle', { cx: 378, cy: 324, r: 0.6, fill: '#a87a3a', opacity: 0.55 }),
                  // A few ink flecks too
                  h('circle', { cx: 130, cy: 328, r: 0.4, fill: T.ink, opacity: 0.4 }),
                  h('circle', { cx: 290, cy: 328, r: 0.5, fill: T.ink, opacity: 0.45 })
                ),

                // ── Screw + nut ──
                // Smooth height transition gives the descending screw shaft
                // a real "lowering" feel. Horizontal metal gradient reads as
                // a 3D cylinder rather than a flat rectangle.
                h('rect', { x: 220, y: 50, width: 40, height: screwY - 50, fill: 'url(#pp-screw-metal)', stroke: '#2a2a2a', strokeWidth: 1, style: { transition: 'height 0.7s ease-in-out' } }),
                // Screw threads (decorative)
                (function() {
                  var threads = [];
                  for (var ti = 0; ti < (screwY - 50) / 8; ti++) {
                    threads.push(h('line', {
                      key: 'thr' + ti,
                      x1: 222, y1: 52 + ti * 8,
                      x2: 258, y2: 52 + ti * 8,
                      stroke: '#2a2a2a', strokeWidth: 1
                    }));
                  }
                  return h('g', null, threads);
                })(),
                // Screw "nut" (where the bar enters) — brass radial gradient
                // gives the boss a polished, slightly raised appearance. The
                // inner darker disk is the bar socket where the wooden lever
                // inserts.
                h('circle', { cx: 240, cy: screwY, r: 26, fill: 'url(#pp-nut-brass)', stroke: '#7c4f1f', strokeWidth: 2, style: { transition: 'cy 0.7s ease-in-out' } }),
                h('circle', { cx: 240, cy: screwY, r: 18, fill: '#5a4036', stroke: '#3d2914', strokeWidth: 1, style: { transition: 'cy 0.7s ease-in-out' } }),

                // ── The bar (handle to turn the screw) — animated rotation.
                // Ball caps use a polished-wood radial gradient so they
                // read as turned wooden knobs (lit from upper-left) rather
                // than flat black circles.
                h('g', { transform: 'translate(240, ' + screwY + ') rotate(' + screwRot + ')',
                  style: { transition: 'transform 0.7s ease-in-out', transformOrigin: '240px ' + screwY + 'px' } },
                  h('rect', { x: -80, y: -6, width: 160, height: 12, rx: 6, fill: T.wood, stroke: '#3d2914', strokeWidth: 1.5 }),
                  h('circle', { cx: -75, cy: 0, r: 9, fill: 'url(#pp-handle-ball)', stroke: '#1a1410', strokeWidth: 0.8 }),
                  h('circle', { cx: 75, cy: 0, r: 9, fill: 'url(#pp-handle-ball)', stroke: '#1a1410', strokeWidth: 0.8 })
                ),

                // ── Platen (heavy flat block that comes down) — smooth descent.
                // Wood-grain pattern matches the rest of the timber on the press.
                h('rect', { x: 130, y: platenY, width: 220, height: platenH,
                  fill: 'url(#pp-woodgrain-platen)', stroke: '#3d2914', strokeWidth: 2,
                  style: { transition: 'y 0.7s ease-in-out' } }),
                // Platen "boss" attaches to screw
                h('rect', { x: 220, y: platenY - 8, width: 40, height: 10,
                  fill: '#4a4a4a', stroke: '#2a2a2a', strokeWidth: 1,
                  style: { transition: 'y 0.7s ease-in-out' } }),

                // ── The bed (where the type forme sits) ──
                h('rect', { x: 110, y: 245, width: 260, height: 35, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 2 }),
                // Subtle ink staining on the bed when the type is inked —
                // a real working press accumulates ink at the edges of the
                // forme over hundreds of impressions. Visible only after
                // the type is filled so it doesn't appear out of nowhere.
                typeFilled && h('g', { 'aria-hidden': 'true' },
                  // Tiny irregular dots near the forme corners
                  h('circle', { cx: 134, cy: 250, r: 1.2, fill: T.ink, opacity: 0.7 }),
                  h('circle', { cx: 137, cy: 252.5, r: 0.6, fill: T.ink, opacity: 0.5 }),
                  h('circle', { cx: 132, cy: 277, r: 1, fill: T.ink, opacity: 0.6 }),
                  h('circle', { cx: 348, cy: 250, r: 0.8, fill: T.ink, opacity: 0.6 }),
                  h('circle', { cx: 345, cy: 277, r: 1.4, fill: T.ink, opacity: 0.7 }),
                  h('circle', { cx: 351, cy: 274, r: 0.5, fill: T.ink, opacity: 0.4 }),
                  // A small smear along the bottom edge
                  h('ellipse', { cx: 240, cy: 278, rx: 8, ry: 0.6, fill: T.ink, opacity: 0.35 })
                ),
                // Ink-mist puff at the moment of impression — visible when
                // the platen is fully down. Three small ink puffs near the
                // edges of the type forme, slightly above the bed, simulating
                // the fine spray of ink dispersed by sudden pressure. Soft
                // dark wisps fading outward.
                pressState === 'pressed' && h('g', { 'aria-hidden': 'true' },
                  h('ellipse', { cx: 150, cy: 245, rx: 8, ry: 3, fill: T.ink, opacity: 0.25 }),
                  h('ellipse', { cx: 240, cy: 240, rx: 12, ry: 3.5, fill: T.ink, opacity: 0.2 }),
                  h('ellipse', { cx: 330, cy: 245, rx: 8, ry: 3, fill: T.ink, opacity: 0.25 }),
                  // Tiny dots radiating outward
                  h('circle', { cx: 142, cy: 240, r: 0.8, fill: T.ink, opacity: 0.5 }),
                  h('circle', { cx: 338, cy: 240, r: 0.8, fill: T.ink, opacity: 0.5 }),
                  h('circle', { cx: 256, cy: 234, r: 0.6, fill: T.ink, opacity: 0.4 }),
                  h('circle', { cx: 224, cy: 234, r: 0.6, fill: T.ink, opacity: 0.4 })
                ),
                // Dust + paper-fiber particles falling from the platen edges
                // when the press has just released (revealed state). Subtle
                // suggestion that the impression dislodged some material as
                // the platen lifted. Small tan/cream specks at varied
                // vertical positions, simulating motion-blurred descent.
                pressState === 'revealed' && h('g', { 'aria-hidden': 'true' },
                  h('circle', { cx: 145, cy: 215, r: 0.5, fill: '#e8d4b0', opacity: 0.6 }),
                  h('circle', { cx: 142, cy: 222, r: 0.4, fill: '#a87a3a', opacity: 0.5 }),
                  h('circle', { cx: 148, cy: 228, r: 0.5, fill: '#e8d4b0', opacity: 0.4 }),
                  h('circle', { cx: 336, cy: 218, r: 0.5, fill: '#e8d4b0', opacity: 0.55 }),
                  h('circle', { cx: 339, cy: 226, r: 0.4, fill: '#a87a3a', opacity: 0.5 }),
                  h('circle', { cx: 332, cy: 233, r: 0.45, fill: '#e8d4b0', opacity: 0.4 }),
                  h('circle', { cx: 215, cy: 210, r: 0.5, fill: '#e8d4b0', opacity: 0.45 }),
                  h('circle', { cx: 268, cy: 213, r: 0.4, fill: '#a87a3a', opacity: 0.4 })
                ),
                // Type forme on the bed. Smooth fill transition gives the
                // inking step (state: 'inking') a visible "filling up" feel
                // as the ink balls dab the type. SVG `fill` doesn't animate
                // natively in all browsers, so we use a CSS `transition`
                // with `fill` listed — works in Chrome and Firefox, and
                // gracefully no-ops elsewhere (still functional, just no
                // animation). Brown→black transition is what a real type
                // forme looks like as it goes from clean metal to inked.
                h('rect', { x: 140, y: 252, width: 200, height: 22,
                  fill: typeFilled ? T.ink : '#8a7a5a',
                  stroke: '#1a1410', strokeWidth: 1,
                  style: { transition: 'fill 0.8s ease-in-out' } }),
                // User-customizable phrase rendered on the type forme
                // (mirror-reversed via scaleX(-1) transform). Default is
                // "FIAT LUX" (Genesis 1:3, "Let there be light") — historically
                // apt for a Gutenberg-era press whose first major use was the
                // Bible. Font size scales down a touch for longer phrases so
                // up to 14 chars still fit visually on the type forme.
                typeFilled && h('text', {
                  x: 240, y: 268,
                  textAnchor: 'middle',
                  fill: T.parchment, opacity: 0.45,
                  fontSize: safePhrase.length > 10 ? 11 : 14, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif',
                  letterSpacing: '0.1em',
                  transform: 'translate(480 0) scale(-1 1)'  // mirror-reversed, centered around x=240
                }, safePhrase),

                // ── Paper (when laid) ──
                // Smooth y-transition gives the paper a "sliding into
                // position" feel when the user advances from 'inked' →
                // 'papered' (the journeyman laying paper on the tympan).
                // Drop shadow underneath so the paper reads as a sheet
                // sitting on the bed rather than a flat fill.
                paperShown && h('rect', {
                  x: 138, y: paperPrinted ? 252 : 240,
                  width: 204, height: 26,
                  fill: T.parchment,
                  stroke: '#8a7a5a', strokeWidth: 1,
                  style: { transition: 'y 0.5s ease-out', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.3))' }
                }),
                // Printed text on the paper — readable now (the type was
                // mirrored, so the impression flips and reads correctly).
                // Inked-paper wash effect: the printed text gets a SECOND
                // copy of itself rendered first at lower opacity with a
                // tiny offset, simulating ink that bled slightly into the
                // paper fibers (a real letterpress signature, not a glitch).
                // This is what distinguishes hand-pressed letterpress from
                // crisp digital print.
                paperPrinted && h('text', {
                  x: 240.5, y: 270.5,
                  textAnchor: 'middle',
                  fill: T.ink,
                  opacity: 0.4,
                  fontSize: safePhrase.length > 10 ? 11 : 14, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif',
                  letterSpacing: '0.1em'
                }, safePhrase),
                paperPrinted && h('text', {
                  x: 240, y: 270,
                  textAnchor: 'middle',
                  fill: T.ink,
                  fontSize: safePhrase.length > 10 ? 11 : 14, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif',
                  letterSpacing: '0.1em',
                  // Paper-grain filter softens the letter edges so the
                  // printed phrase reads as hand-pressed, not digital crisp
                  filter: 'url(#pp-paper-grain)'
                }, safePhrase),
                // Tiny ink dots scattered on the paper — real impressions
                // pick up flecks of ink from the surrounding type bed.
                paperPrinted && h('g', { 'aria-hidden': 'true', opacity: 0.5 },
                  h('circle', { cx: 152, cy: 258, r: 0.6, fill: T.ink }),
                  h('circle', { cx: 326, cy: 261, r: 0.7, fill: T.ink }),
                  h('circle', { cx: 168, cy: 275, r: 0.4, fill: T.ink }),
                  h('circle', { cx: 312, cy: 256, r: 0.5, fill: T.ink })
                ),

                // ── Ink balls — visible at rest when not active ──
                // Resting position: leaning against the press base, just outside
                // the type bed. Historically accurate: a 1450 print shop kept
                // its ink balls dipped on a small ink stone next to the press,
                // ready for the next inking pass.
                (pressState === 'clean' || pressState === 'revealed') && h('g', { 'aria-hidden': 'true' },
                  // Resting against left frame
                  h('line', { x1: 95, y1: 290, x2: 88, y2: 245, stroke: T.wood, strokeWidth: 5, strokeLinecap: 'round' }),
                  h('circle', { cx: 88, cy: 245, r: 12, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 1 }),
                  // Resting against right frame
                  h('line', { x1: 385, y1: 290, x2: 392, y2: 245, stroke: T.wood, strokeWidth: 5, strokeLinecap: 'round' }),
                  h('circle', { cx: 392, cy: 245, r: 12, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 1 })
                ),
                // ── Ink balls — active inking (dab and lift) + floating ink droplets ──
                pressState === 'inking' && (function() {
                  // Two leather-and-wool ink balls dab in and out
                  var leftX = 150 + Math.sin(inkAnim * Math.PI * 4) * 8;
                  var rightX = 330 - Math.sin(inkAnim * Math.PI * 4) * 8;
                  var ballY = 248 + Math.abs(Math.sin(inkAnim * Math.PI * 8)) * 12;
                  // Floating ink droplets — small dark dots that drift upward
                  // and fade out during the inking animation. Positions are
                  // deterministic from inkAnim so React doesn't rerender them
                  // randomly on each frame. Each droplet has its own phase
                  // offset so they don't all move in lockstep.
                  var droplets = [];
                  for (var di = 0; di < 6; di++) {
                    var phase = (inkAnim + di * 0.17) % 1;
                    var dx = 160 + di * 32 + Math.sin((inkAnim + di) * Math.PI * 2) * 4;
                    var dy = 246 - phase * 22;  // rises ~22px over animation
                    var opacity = (1 - phase) * 0.55;  // fades as it rises
                    droplets.push(h('circle', {
                      key: 'drop' + di,
                      cx: dx, cy: dy, r: 0.9 + (di % 3) * 0.3,
                      fill: T.ink, opacity: opacity
                    }));
                  }
                  return h('g', null,
                    // Floating ink droplets behind ink balls
                    h('g', { 'aria-hidden': 'true' }, droplets),
                    // Left ink ball
                    h('circle', { cx: leftX, cy: ballY, r: 14, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 1 }),
                    h('line', { x1: leftX, y1: ballY, x2: leftX - 12, y2: ballY - 28, stroke: T.wood, strokeWidth: 5, strokeLinecap: 'round' }),
                    // Right ink ball
                    h('circle', { cx: rightX, cy: ballY, r: 14, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 1 }),
                    h('line', { x1: rightX, y1: ballY, x2: rightX + 12, y2: ballY - 28, stroke: T.wood, strokeWidth: 5, strokeLinecap: 'round' })
                  );
                })(),

                // ── Parts labels (overlay) ──
                // Labels for the major press components, drawn over the SVG
                // when showLabels is on. Each label has a leader line pointing
                // to its part. Positions chosen to avoid overlap with the
                // simulation elements at the most-common press states.
                showLabels && h('g', { 'aria-hidden': 'true' },
                  // Define a reusable label style
                  // Each label: leader line + small text box
                  [
                    { name: 'Crossbeam', tx: 200, ty: 38, lx: 60, ly: 40, lx2: 200, ly2: 40 },
                    { name: 'Frame', tx: 28, ty: 100, lx: 28, ly: 80, lx2: 28, ly2: 100 },
                    { name: 'Screw', tx: 160, ty: 80, lx: 220, ly: 80, lx2: 162, ly2: 80 },
                    { name: 'Bar (lever)', tx: 320, ty: screwY, lx: 320, ly: screwY, lx2: 320, ly2: screwY },
                    { name: 'Nut', tx: 295, ty: screwY + 28, lx: 265, ly: screwY + 18, lx2: 295, ly2: screwY + 26 },
                    { name: 'Platen', tx: 88, ty: platenY + 20, lx: 130, ly: platenY + 10, lx2: 88, ly2: platenY + 18 },
                    { name: 'Bed', tx: 88, ty: 262, lx: 110, ly: 262, lx2: 88, ly2: 262 },
                    { name: 'Type forme', tx: 240, ty: 233, lx: 240, ly: 252, lx2: 240, ly2: 235 },
                    { name: 'Ink balls', tx: 35, ty: 235, lx: 78, ly: 240, lx2: 50, ly2: 235 }
                  ].map(function(L, li) {
                    return h('g', { key: li },
                      // Leader line (subtle gold)
                      h('line', { x1: L.lx, y1: L.ly, x2: L.lx2, y2: L.ly2,
                        stroke: T.accentHi, strokeWidth: 0.8, opacity: 0.7, strokeDasharray: '2 2' }),
                      // Small backing rect for the label so it's readable on any background
                      h('rect', { x: L.tx - L.name.length * 2.6 - 4, y: L.ty - 8, width: L.name.length * 5.2 + 8, height: 12,
                        fill: T.bg, stroke: T.accentHi, strokeWidth: 0.5, rx: 2, opacity: 0.92 }),
                      // The label text
                      h('text', { x: L.tx, y: L.ty + 1, textAnchor: 'middle',
                        fill: T.accentHi, fontSize: 9, fontWeight: 700, fontFamily: 'Georgia, serif' }, L.name)
                    );
                  })
                ),
                // ── Workshop candle ──
                // Small lit beeswax candle in the upper-right corner of the
                // SVG, just outside the frame area. Atmospheric: a 1450
                // print shop was lit by candles and oil lamps. Flame
                // animation via CSS keyframe ensures the flame flickers
                // subtly without re-rendering React state. Reduced-motion
                // users see a static flame.
                h('g', { 'aria-hidden': 'true', transform: 'translate(450, 130)' },
                  // Brass candleholder dish
                  h('ellipse', { cx: 0, cy: 24, rx: 14, ry: 3, fill: '#7c4f1f', stroke: '#3d2914', strokeWidth: 0.6 }),
                  h('rect', { x: -5, y: 20, width: 10, height: 4, fill: '#a87a3a', stroke: '#5a3a1f', strokeWidth: 0.4, rx: 1 }),
                  // Wax candle body
                  h('rect', { x: -3, y: 4, width: 6, height: 16, fill: '#fef3c7', stroke: '#c9a14a', strokeWidth: 0.5, rx: 0.5 }),
                  // Wick
                  h('line', { x1: 0, y1: 4, x2: 0, y2: 1, stroke: '#1a1410', strokeWidth: 0.7 }),
                  // Flame — outer (warm) + inner (hot)
                  h('ellipse', { cx: 0, cy: -2, rx: 2.5, ry: 4.5, fill: '#fbbf24', opacity: 0.85,
                    style: { animation: 'printingpress-candle-flicker 1.8s ease-in-out infinite', transformOrigin: '0 2px' } }),
                  h('ellipse', { cx: 0, cy: -1, rx: 1.2, ry: 2.8, fill: '#fef3c7',
                    style: { animation: 'printingpress-candle-flicker 1.4s ease-in-out infinite reverse', transformOrigin: '0 2px' } }),
                  // Soft glow halo around the flame
                  h('circle', { cx: 0, cy: -2, r: 12, fill: 'url(#pp-candle-glow)', opacity: 0.5 })
                ),
                // ── State label ──
                h('text', { x: W / 2, y: 22, fill: T.accentHi, fontSize: 13, fontWeight: 700, textAnchor: 'middle', fontFamily: 'Georgia, serif' },
                  ({clean: 'Step 1: Bed empty', inking: 'Step 2: Inking…', inked: 'Step 3: Type inked', papered: 'Step 4: Paper on tympan', pressed: 'Step 5: Pressure applied', revealed: 'Step 6: Impression complete'})[pressState])
              ),
              // ── Status + counter ──
              h('div', { style: { marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: T.muted, flexWrap: 'wrap', gap: 10 } },
                h('span', null, 'State: ', h('strong', { style: { color: T.accentHi, fontFamily: 'ui-monospace, monospace' } }, pressState.toUpperCase())),
                h('span', null, 'Impressions: ', h('strong', { style: { color: T.text } }, count))
              ),
              // ── Action row ──
              // The Guided Tour button is the demo-day affordance: hit it
              // once, the press cycles automatically while the presenter
              // talks. A manual click on the action button cancels the tour
              // and hands control back to the user.
              h('div', { className: 'printingpress-no-print', style: { marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
                h('button', {
                  onClick: nextAction,
                  disabled: actionDisabled,
                  'aria-label': actionLabel + (tourActive ? ' (cancels guided tour)' : ''),
                  style: btnPrimary({ padding: '12px 22px', fontSize: 15, opacity: actionDisabled ? 0.5 : 1, minWidth: 200 })
                }, actionLabel),
                !tourActive && h('button', {
                  onClick: function() {
                    if (pressState !== 'clean') { setPressState('clean'); }
                    setTourActive(true);
                    announce('Guided tour starting. The press will cycle automatically.');
                  },
                  'aria-label': 'Start a hands-free guided tour through the full press cycle',
                  style: btn({ padding: '12px 16px', fontSize: 13, background: T.accentHi, color: T.ink, border: '1px solid ' + T.accentHi, fontWeight: 700 })
                }, '▶ Guided Tour'),
                tourActive && h('button', {
                  onClick: function() { setTourActive(false); announce('Guided tour stopped.'); },
                  style: btn({ padding: '12px 16px', fontSize: 13, background: T.danger, color: T.text, border: '1px solid ' + T.danger })
                }, '⏸ Stop tour'),
                // Parts-labels toggle: on/off, persists across state changes
                h('button', {
                  onClick: function() { setShowLabels(!showLabels); announce(showLabels ? 'Part labels hidden.' : 'Part labels shown.'); },
                  'aria-pressed': showLabels,
                  style: btn({ padding: '12px 16px', fontSize: 13,
                    background: showLabels ? T.accent : T.card,
                    color: showLabels ? T.ink : T.text,
                    border: '1px solid ' + T.accent,
                    fontWeight: showLabels ? 700 : 600 })
                }, showLabels ? '🔖 Labels: On' : '🔖 Show parts'),
                count > 0 && !tourActive && h('button', {
                  onClick: function() { setCount(0); setPressState('clean'); announce('Counter reset.'); },
                  style: btn({ padding: '12px 16px', fontSize: 13 })
                }, '↺ Reset run')
              )
            )
          ),

          // ── The physics ──
          sectionHeader('⚙️', 'The mechanical advantage of the screw'),
          keyPointBlock(
            'The screw press is one of the six classical simple machines. It trades distance for force.',
            [
              { k: 'Mechanical advantage formula', v: 'MA = (2 × π × bar length) ÷ (pitch of the screw thread). For Gutenberg-era presses, MA was roughly 15:1 to 30:1 — a printer applying ~30 lb of pull at the bar generated 450 to 900 lb of pressure on the platen.' },
              { k: 'Why a screw and not a lever?', v: 'A lever needs a long throw and a fulcrum at a fixed position. A screw converts continuous rotation into linear motion in a compact vertical space. It also self-holds — the friction in the threads keeps the platen down without you having to keep pulling.' },
              { k: 'Why the platen is heavy and flat', v: 'Mass distributes pressure evenly across the type forme. Uneven pressure means uneven inking, which means an unreadable print. Platen flatness was a craftsmanship metric: master printers had platens machined flat to thousandths of an inch.' },
              { k: 'The "kiss"', v: 'A perfect impression presses just hard enough to transfer ink, not hard enough to dent the paper. Too soft = pale print. Too hard = embossed (you can feel the letter on the back of the page). Modern letterpress fans call good pressure "kiss impression" and bad pressure "deboss."' }
            ]
          ),

          calloutBox('info', 'Why this matters for engineering students',
            'The screw press is a working example of mechanical advantage. The relationship between input force, output force, and the geometry of the screw is the same physics as a car jack, a vise, a wine press, or the leadscrew in a 3D printer. The Gutenberg press is engineering history you can put on a graph.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('pressMechanism', 0, {
            prompt: 'A 1450 print shop has a screw press with a 60 cm bar and 5 mm screw pitch. The journeyman pulls with about 15 kg of force. Approximately how much force lands on the platen?',
            choices: [
              'About 15 kg (no multiplication)',
              'About 1,100 kg (~1.1 tonnes — the screw gives roughly 75:1 mechanical advantage here)',
              'About 60 kg',
              'About 300 kg'
            ],
            correct: 1,
            explain: 'MA = (2 × π × 60 cm) ÷ 0.5 cm ≈ 754. With 15 kg of pull, that\'s ~11,000 N or ~1.1 tonnes of platen force. (Real friction losses reduced this in practice, but the order of magnitude is correct. The screw is a force multiplier on the order of 100×.)'
          }),
          scenarioCard('pressMechanism', 1, {
            prompt: 'A printer pulls the bar but the print comes out faint and patchy on the right side. What is the most likely cause?',
            choices: [
              'Bad paper.',
              'Platen is not perfectly flat or the bed is tilted — uneven pressure distributes ink unevenly across the type forme.',
              'The screw is broken.',
              'Wrong ink color.'
            ],
            correct: 1,
            explain: 'Patchy impression almost always means uneven platen pressure. Master printers obsessed over platen flatness. A modern letterpress shop uses "makeready" — small paper shims under the type to bring the impression even.'
          }),

          // ── Inkmaking recipe card ──
          // Closes the materials triad: type (alloy in castingType), paper
          // (people / Maine sidebar), and now ink. Gutenberg's oil-based
          // ink is the third quiet invention that made the system work.
          // ── Shop hazards card ──
          // The press is the romance; the shop was an industrial workplace
          // with documented hazards. Names labor history without melodrama.
          sectionHeader('⚠️', 'The other side: shop hazards'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'A print shop was a workshop. Workshops have hazards. The romance of the press has tended to obscure the labor reality, but the historical record is clear: every role had specific occupational risks that printers wrote about, joked about, and sometimes died from.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.danger, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              [
                { hazard: 'Lead exposure',
                  who: 'Compositor + caster + pressman',
                  detail: 'Type alloy is mostly lead. Compositors picked up sorts thousands of times a day; casters worked over molten metal. Chronic low-dose lead exposure produced the "printer\'s palsy" that 19th-century occupational physicians documented. Modern letterpress shops use polymer plates or photopolymer instead.' },
                { hazard: 'Linseed-oil fire',
                  who: 'Anyone making ink',
                  detail: 'Boiling linseed oil to make varnish was the most dangerous step. Hot oil can ignite; once burning, it is hard to extinguish. Shops cooked ink outdoors when possible. Several documented 1500s shop fires started this way.' },
                { hazard: 'Repetitive strain',
                  who: 'Pressman (mainly)',
                  detail: 'Pulling the bar 250 times a day, every working day, year after year, wore out shoulders and elbows. By age 50 many pressmen had lost the strength for full-day work. The Linotype operator inherited the same kind of injury in a different shape (keyboard) 400 years later.' },
                { hazard: 'Eye strain',
                  who: 'Compositor + corrector',
                  detail: 'Reading mirror-reversed type by candle or oil-lamp light, for 10+ hour days, ruined eyes. Reading glasses became common among compositors a century before they were common in the general population.' },
                { hazard: 'Chemical exposure',
                  who: 'Inker + apprentice',
                  detail: 'Cleaning solvents (turpentine, lye solutions) for cleaning type and inking balls produced respiratory and skin issues. Apprentices got the worst of this because cleaning was usually their job.' },
                { hazard: 'Heavy lifting',
                  who: 'Apprentice (mainly)',
                  detail: 'Paper bales, lead pigs (raw type metal), finished books, locked formes all weighed substantial amounts. Back injuries were common. The apprentice carried everything.' }
              ].map(function(z, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.danger, borderRadius: 6, padding: 10 } },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 3 } }, z.hazard),
                  h('div', { style: { fontSize: 10, color: T.warn, fontStyle: 'italic', marginBottom: 6 } }, z.who),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, z.detail)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Modern occupational-safety scholarship credits printers as one of the first trades to systematically document workplace hazards. The 19th-century reformers who pushed for child-labor laws, ventilation standards, and shop inspections often started by looking at print shops because the hazards were so visible.')
          ),

          sectionHeader('🖋️', 'Inkmaking, the third quiet invention'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Manuscript ink was water-based and beaded off metal type. Gutenberg adapted oil-painting varnish into a printer’s ink that clung to the type face, transferred cleanly to paper, and dried without bleeding. The recipe is short. Getting it right took years.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 } },
              [
                { name: 'Lampblack', role: 'Pigment', pct: 30, color: '#0a0805',
                  note: 'Soot scraped from the inside of an oil lamp. Almost pure carbon. The black you see on a 1455 Bible page is lampblack.' },
                { name: 'Linseed oil (boiled to varnish)', role: 'Vehicle', pct: 55, color: '#a87a3a',
                  note: 'Linseed boiled slowly for hours becomes a sticky varnish. This is the breakthrough. It holds the pigment, clings to metal, and oxidizes to dry on paper instead of soaking through.' },
                { name: 'Walnut oil / rosin / a touch of turpentine', role: 'Modifier', pct: 15, color: '#3a2a1a',
                  note: 'Tunes the drying rate and consistency for the season. Hot summer ink is mixed differently from cold winter ink. This is artisan judgment, not a fixed formula.' }
              ].map(function(ing, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 12 } },
                  // Mini-vessel SVG: a stylized apothecary jar with the ingredient color
                  h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } },
                    h('svg', { viewBox: '0 0 60 80', width: 50, height: 66, 'aria-hidden': 'true' },
                      // Jar body
                      h('rect', { x: 12, y: 20, width: 36, height: 52, rx: 4, fill: T.parchment, stroke: T.wood, strokeWidth: 1.5 }),
                      // Jar neck
                      h('rect', { x: 18, y: 10, width: 24, height: 12, fill: T.parchment, stroke: T.wood, strokeWidth: 1.5 }),
                      // Cork
                      h('rect', { x: 20, y: 4, width: 20, height: 8, fill: T.wood, stroke: '#3d2810', strokeWidth: 1 }),
                      // Contents fill (height proportional to pct)
                      h('rect', { x: 14, y: 72 - (52 * ing.pct / 100), width: 32, height: 52 * ing.pct / 100, fill: ing.color, opacity: 0.92 }),
                      // Label
                      h('rect', { x: 14, y: 38, width: 32, height: 12, fill: T.parchment, stroke: T.wood, strokeWidth: 0.6, opacity: 0.85 }),
                      h('text', { x: 30, y: 47, textAnchor: 'middle', fontFamily: 'Georgia, serif', fontSize: 6, fontWeight: 700, fill: T.ink }, ing.pct + '%')
                    )
                  ),
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 2, textAlign: 'center' } }, ing.name),
                  h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', fontWeight: 700, marginBottom: 8 } }, ing.role + ' · ~' + ing.pct + '%'),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } }, ing.note)
                );
              })
            ),
            // Three-step process strip
            h('div', { style: { background: T.cardAlt, border: '1px dashed ' + T.accent, borderRadius: 8, padding: 12 } },
              h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8, textAlign: 'center', fontFamily: 'Georgia, serif' } }, 'The process'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 } },
                [
                  { n: 1, t: 'Boil the linseed oil', d: 'Slow heat for 4-6 hours until it thickens into varnish. The dangerous step. Hot linseed oil can ignite, so 1450 shops cooked it outdoors.' },
                  { n: 2, t: 'Grind the lampblack in', d: 'Add pigment to warm varnish on a marble slab. Grind with a muller for hours until smooth, like a chef working a slow emulsion.' },
                  { n: 3, t: 'Adjust for the day', d: 'Add modifier (walnut oil, rosin) to tune drying time to weather. Test on a proof. Adjust again. This is where masters earned their pay.' }
                ].map(function(st, i) {
                  return h('div', { key: i, style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 } },
                      h('div', { style: { background: T.accent, color: T.ink, width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'Georgia, serif' } }, st.n),
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, st.t)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, st.d)
                  );
                })
              )
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
              'A 1450 print shop kept its ink recipe close. Some shops were known for blacker blacks; others for faster drying. The recipe survived in apprentice notebooks, not published manuals. Most modern letterpress ink is still oil-based, with synthetic pigments swapped in for lampblack.')
          ),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('pressMechanism', [
            { q: 'The screw press is which type of simple machine?', opts: ['Lever', 'Pulley', 'Inclined plane (the screw is a wrapped inclined plane)', 'Wheel and axle'], ans: 2, explain: 'A screw is mathematically an inclined plane wrapped around a cylinder. The pitch of the thread is the rise of the inclined plane.' },
            { q: 'A press has a screw with 6 mm pitch and a bar that is 50 cm from the screw center. Roughly what is the mechanical advantage?', opts: ['About 50:1', 'About 500:1', 'About 10:1', 'About 100:1'], ans: 1, explain: 'MA = (2π × 500 mm) ÷ 6 mm ≈ 523. So roughly 500:1. The screw is the largest force-multiplier in classical mechanics.' },
            { q: 'Why was the platen made heavy and flat?', opts: ['To look impressive', 'To distribute pressure evenly across the type forme (uneven pressure = uneven inking = unreadable print)', 'To resist heat', 'It was decorative'], ans: 1, explain: 'A flat heavy platen distributes pressure evenly, so every letter prints with the same impression. Master printers machined platens flat to fractions of a millimeter.' },
            { q: 'In 1450, roughly how many impressions per day could a two-person crew make on a screw press?', opts: ['About 50', 'About 250 (one impression every 2 minutes for an 8-hour day, with breaks)', 'About 1000', 'About 5000'], ans: 1, explain: '~250 impressions per day was typical for a Gutenberg-era press with a two-person crew. Modern letterpress hobbyists working slowly might do 50-100; mechanical 19th-century presses jumped this to thousands per hour.' }
          ]),

          sourcesBlock([
            { label: 'Gutenberg Museum (Mainz)', url: 'https://www.gutenberg-museum.de/en' },
            { label: 'British Library — Gutenberg Bible', url: 'https://www.bl.uk/treasures/gutenberg/homepage.html' },
            { label: 'International Printing Museum (Carson, CA) — Working Gutenberg replica', url: 'https://www.printingmuseum.org/' },
            { label: 'Smithsonian — Graphic Arts Collection', url: 'https://www.si.edu/spotlight/printing' },
            { label: 'Adrian Johns, "The Nature of the Book: Print and Knowledge in the Making" (1998)' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.pressMechanism),
          crossLinkFooter('pressMechanism'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // STAR MODULE 2 — SET YOUR OWN TYPE
      // ═════════════════════════════════════════════════════════════════════
      // Interactive composing stick: students drag mirror-reversed letter
      // blocks into slots to spell a target phrase. They learn (1) typesetting
      // is slow, (2) the type is mirror-reversed, (3) right-to-left for
      // left-to-right reading, (4) the "fi" ligature is one piece of type.
      function renderSetType() {
        // Two challenges: the second teaches the "fi" ligature.
        // Real compositors used a single sort of type for "fi" (and "fl",
        // "ffi", "ffl") because the f's overhang would crash into the
        // dot of the i, breaking off both. The fi sort is one block with
        // both glyphs joined. Modern OpenType fonts replicate this
        // automatically as ligature substitution.
        var CHALLENGES = [
          { id: 'IN_PRINT', label: 'Phrase 1: IN PRINT', phrase: 'IN PRINT', slotCount: 8,
            sorts: ['I', 'N', ' ', 'P', 'R', 'I', 'N', 'T', 'A', 'E', 'O', 'T', 'S'],
            hint: 'Pick mirror-reversed letters from the case and drop them in the composing stick — right-to-left, just as a 1450 compositor would.' },
          { id: 'FIRST_PROOF', label: 'Phrase 2: FIRST PROOF (with fi ligature)', phrase: 'FRST PROOF', slotCount: 10,
            // Note:  is a placeholder for the "fi" ligature in the target.
            // The corresponding sort is 'fi' (a 2-character string treated as one block).
            sorts: ['F', '', 'R', 'S', 'T', ' ', 'P', 'R', 'O', 'O', 'F', 'I', 'N'],
            hint: 'This challenge includes a "fi" ligature — a single sort that prints both letters joined. Look for the special joined sort in the case.' },
          { id: 'FALMOUTH', label: 'Phrase 3: FALMOUTH (1785 Maine)', phrase: 'FALMOUTH', slotCount: 8,
            sorts: ['F', 'A', 'L', 'M', 'O', 'U', 'T', 'H', 'E', 'I', 'R', 'N', 'S'],
            hint: 'Compose FALMOUTH the way Thomas B. Wait and Benjamin Titcomb would have set it for the first issue of the Falmouth Gazette in January 1785 — the first newspaper printed in what would become Maine. (Falmouth is now Portland, walking distance from King Middle School.)' },
          { id: 'COMMON_SENSE', label: 'Phrase 4: COMMON SENSE (1776 Paine)', phrase: 'COMMON SENSE', slotCount: 12,
            sorts: ['C', 'O', 'M', 'M', 'O', 'N', ' ', 'S', 'E', 'N', 'S', 'E', 'T', 'R', 'I', 'A', 'P'],
            hint: 'Compose the title of the pamphlet that sold about 150,000 copies in colonial America in 1776 — the highest-leverage broadside in American history. Thomas Paine wrote it in three months; printers across the colonies set it in days. Per capita, one of the best-selling political works ever published.' },
          { id: 'AD_FONTES', label: 'Phrase 5: AD FONTES (Renaissance motto)', phrase: 'AD FONTES', slotCount: 9,
            sorts: ['A', 'D', ' ', 'F', 'O', 'N', 'T', 'E', 'S', 'B', 'L', 'U', 'P', 'R'],
            hint: 'Compose AD FONTES — Latin for "to the sources" — the Renaissance scholar\'s rallying cry. When Erasmus and his fellow humanists pushed printers to publish ancient Greek and Hebrew texts in their original languages, this was the call. Movable type made it possible: scholars could finally lay ten copies of the same passage side by side and catch errors that a thousand years of hand-copying had introduced.' }
        ];
        var challengeIdxRaw = useState(0);
        var challengeIdx = challengeIdxRaw[0], setChallengeIdx = challengeIdxRaw[1];
        var CHALLENGE = CHALLENGES[challengeIdx];
        var PHRASE = CHALLENGE.phrase;
        var SORTS = CHALLENGE.sorts;

        var stateRaw = useState({ slots: Array.apply(null, { length: CHALLENGES[0].slotCount }).map(function() { return ''; }), picked: null });
        var st = stateRaw[0], setSt = stateRaw[1];
        // Press-impression state for the preview after the phrase is solved.
        // 'idle' (button), 'pressing' (animation), 'printed' (paper visible).
        var pressStateRaw = useState('idle');
        var pressState = pressStateRaw[0], setPressState = pressStateRaw[1];

        // When the challenge changes, reset slots/press state to match
        useEffect(function() {
          setSt({ slots: Array.apply(null, { length: CHALLENGE.slotCount }).map(function() { return ''; }), picked: null });
          setPressState('idle');
        }, [challengeIdx]);

        var solved = st.slots.join('') === PHRASE;
        // Track which challenges the student has completed this session.
        // Map of challenge.id → true. Used by the picker to render a star
        // badge next to completed phrases. Session-only by design (a
        // student returning fresh should see all challenges open).
        var challengesDoneRaw = useState({});
        var challengesDone = challengesDoneRaw[0], setChallengesDone = challengesDoneRaw[1];
        useEffect(function () {
          if (solved && CHALLENGE && CHALLENGE.id && !challengesDone[CHALLENGE.id]) {
            var next = Object.assign({}, challengesDone);
            next[CHALLENGE.id] = true;
            setChallengesDone(next);
          }
        }, [solved, CHALLENGE && CHALLENGE.id]);
        // Display helper: render the ligature placeholder as "fi"
        function displayChar(c) { return c === '' ? 'fi' : c; }
        // Decode-mirror-text exercise state. Students see a mirror-reversed
        // word and type what it would say after pressing. Tests the
        // compositor skill: reading mirror-reversed at speed.
        var decodeIdxRaw = useState(0);
        var decodeIdx = decodeIdxRaw[0], setDecodeIdx = decodeIdxRaw[1];
        var decodeAnswerRaw = useState('');
        var decodeAnswer = decodeAnswerRaw[0], setDecodeAnswer = decodeAnswerRaw[1];
        // AI-generated mirror word — when set, displayed instead of the
        // static DECODE_WORDS cycle. Cleared on "↻ New word" so the
        // student can always return to the curated set.
        var decodeAiWordRaw = useState(null);
        var decodeAiWord = decodeAiWordRaw[0], setDecodeAiWord = decodeAiWordRaw[1];
        var decodeGenStateRaw = useState({ loading: false, error: null });
        var decodeGenState = decodeGenStateRaw[0], setDecodeGenState = decodeGenStateRaw[1];
        var decodeFeedbackRaw = useState(null);
        var decodeFeedback = decodeFeedbackRaw[0], setDecodeFeedback = decodeFeedbackRaw[1];
        var DECODE_WORDS = ['VERITAS', 'PRINT', 'TYPE', 'BIBLE', 'FREEDOM'];
        // Proofreader's Eye exercise state. A corrector in a 1450 shop
        // pulled a 'proof' print, scanned it against the manuscript, and
        // flagged errors with margin marks. Students do that here: a
        // printed-style line with one error, click the wrong word.
        var proofIdxRaw = useState(0);
        var proofIdx = proofIdxRaw[0], setProofIdx = proofIdxRaw[1];
        var proofGuessRaw = useState(null);
        var proofGuess = proofGuessRaw[0], setProofGuess = proofGuessRaw[1];
        // AI-generated round override — when set, displayed in place of
        // the static PROOF_LINES round. Stays in place until the student
        // clicks "↻ New proof" (which clears the override and advances
        // the static cycle) or generates another AI round.
        var proofAiRoundRaw = useState(null);
        var proofAiRound = proofAiRoundRaw[0], setProofAiRound = proofAiRoundRaw[1];
        var proofGenStateRaw = useState({ loading: false, error: null });
        var proofGenState = proofGenStateRaw[0], setProofGenState = proofGenStateRaw[1];
        var proofRevealedRaw = useState(false);
        var proofRevealed = proofRevealedRaw[0], setProofRevealed = proofRevealedRaw[1];
        // Each round: tokens (words) of the printed line, errorIdx points
        // to the wrong token. Explanation describes the mark a 1450
        // corrector would have written in the margin.
        var PROOF_LINES = [
          {
            tokens: ['IN', 'PRINT,', 'IDEAS', 'LIVE', 'FORVER.'],
            errorIdx: 4,
            corrected: 'FOREVER.',
            mark: 'caret (\u2227) + missing letter in margin',
            explanation: 'A letter is missing. The compositor dropped the second E in FOREVER. A 1450 corrector would mark a caret (\u2227) where the letter goes and write "e" in the margin.'
          },
          {
            tokens: ['TEH', 'PRESS', 'GIVES', 'VOICE', 'TO', 'ALL.'],
            errorIdx: 0,
            corrected: 'THE',
            mark: 'transposition mark (\u223F)',
            explanation: 'Letters out of order. THE became TEH because the compositor reached for sorts in the wrong order. The mark is a tilde-like swoop over the swapped letters, sometimes called a transposition mark.'
          },
          {
            tokens: ['BOOKS', 'ARE', 'CHEAP', 'BECAUSE', 'OF', 'TYPE', 'TYPE.'],
            errorIdx: 6,
            corrected: '(delete)',
            mark: 'deletion mark (\u232B)',
            explanation: 'A duplicated word. The compositor set the last sort twice. The corrector would draw a deletion mark through the second TYPE and write "dele" in the margin (short for delete).'
          },
          {
            tokens: ['WE', 'PRINT', 'WHAT', 'THE', 'PEOPEL', 'NEED.'],
            errorIdx: 4,
            corrected: 'PEOPLE',
            mark: 'transposition mark (\u223F)',
            explanation: 'Letters out of order. PEOPLE became PEOPEL. A corrector would mark the swapped L and E with a transposition swoop, the same mark as in TEH above.'
          },
          {
            tokens: ['ONE', 'PRESS,', 'TEN', 'TEN', 'HOURS,', 'A', 'BOOK.'],
            errorIdx: 3,
            corrected: '(delete)',
            mark: 'deletion mark (\u232B)',
            explanation: 'A duplicated word. TEN was set twice. The corrector would strike through the second TEN with a deletion mark, the same as the duplicated TYPE above.'
          }
        ];
        // Clock-challenge mode: time the student composing the current
        // phrase. startTime = epoch ms when they placed their first letter;
        // elapsed = ms since. Calculated benchmarks compare to historical
        // compositor speed (1,000 chars/hour = 3.6 sec per char) and modern
        // keyboard speed (12,000 chars/hour = 0.3 sec per char).
        var startTimeRaw = useState(null);
        var startTime = startTimeRaw[0], setStartTime = startTimeRaw[1];
        var nowRaw = useState(Date.now());
        var nowTs = nowRaw[0], setNowTs = nowRaw[1];
        useEffect(function() {
          if (!startTime || solved) return;
          var iv = setInterval(function() { setNowTs(Date.now()); }, 100);
          return function() { clearInterval(iv); };
        }, [startTime, solved]);
        // Capture first-place start time. Track when slot count changes
        // from 0 to 1.
        var placedCount = st.slots.filter(function(s) { return s; }).length;
        useEffect(function() {
          if (placedCount > 0 && !startTime) setStartTime(Date.now());
          if (placedCount === 0 && startTime) setStartTime(null);
        }, [placedCount]);
        var elapsedMs = startTime ? (nowTs - startTime) : 0;
        var elapsedSec = elapsedMs / 1000;
        // Folio-imposition puzzle state. Folio = one sheet, folded once,
        // 4 pages total. Slots: [0]=outer-left, [1]=outer-right,
        // [2]=inner-left, [3]=inner-right. Each holds a page number (1-4)
        // or null. Correct answer: [4, 1, 2, 3].
        var impSlotsRaw = useState([null, null, null, null]);
        var impSlots = impSlotsRaw[0], setImpSlots = impSlotsRaw[1];
        var impSelectedRaw = useState(null);
        var impSelected = impSelectedRaw[0], setImpSelected = impSelectedRaw[1];
        // 'edit' (placing), 'wrong' (revealed wrong), 'right' (revealed correct, outer side),
        // 'right-open' (correct + opened inner side).
        var impStageRaw = useState('edit');
        var impStage = impStageRaw[0], setImpStage = impStageRaw[1];

        // Auto-advance pressing → printed after a short delay (drama)
        useEffect(function() {
          if (pressState !== 'pressing') return;
          var to = setTimeout(function() {
            setPressState('printed');
            announce('Impression complete. The mirror-reversed type prints as readable text.');
            awardBadge('impression', 'First Impression');
          }, 900);
          return function() { clearTimeout(to); };
        }, [pressState]);

        useEffect(function() {
          if (solved) awardBadge('compositor', 'Compositor');
        }, [solved]);

        function placeInSlot(slotIdx) {
          if (st.picked === null) return;
          var idx = st.picked;
          var nextSlots = st.slots.slice();
          nextSlots[slotIdx] = SORTS[idx];
          setSt({ slots: nextSlots, picked: null });
          announce('Placed ' + SORTS[idx] + ' in slot ' + (slotIdx + 1));
        }
        function clearSlot(slotIdx) {
          var nextSlots = st.slots.slice();
          nextSlots[slotIdx] = '';
          setSt({ slots: nextSlots, picked: st.picked });
        }

        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('🔠 Set Your Own Type'),
          dropCapPara('Each letter of metal type is a tiny mirror-image of the printed letter, set right-to-left in a composing stick. Pick a letter from the case, drop it in a slot. Build the phrase below.'),

          calloutBox('info', 'Why mirror-reversed?',
            'When the type presses against the paper, the image flips. So the type itself has to be a mirror image of what you want to print. (Look at the letter rendered on each sort below — it is the printable face.) Compositors in 1450 read type fluently mirror-reversed. It took years of apprenticeship.'),

          // ── Decode mirror text exercise ──
          // Tests the actual compositor skill: reading mirror-reversed at
          // speed. Shows a word rendered mirror-reversed; the student
          // types what it would print as. Quick, satisfying, directly
          // grounds the "compositors took years to learn this" claim.
          (function() {
            var word = decodeAiWord || DECODE_WORDS[decodeIdx];
            var isAiWord = !!decodeAiWord;

            function generateNewMirrorWord() {
              if (!callGemini) {
                setDecodeGenState({ loading: false, error: 'AI tutor unavailable in this build.' });
                return;
              }
              setDecodeGenState({ loading: true, error: null });
              var prompt = 'Pick ONE single English word, ALL CAPS, 5 to 10 letters, no punctuation, no spaces, that would feel at home as a 1450-1700 print-shop motto or scriptural / civic vocabulary item. Examples of the right register: VERITAS, PRESS, BIBLE, FREEDOM, JUSTICE, SCRIPTURE, MAINZ, GUTENBERG, PSALTER, COLOPHON. Avoid modern slang, brand names, profanity, and proper nouns from after 1900. Respond with ONLY the single word — no quotes, no explanation, no punctuation, no markdown.';
              callGemini(prompt, { maxOutputTokens: 30 })
                .then(function(resp) {
                  var raw = (resp && (resp.text || resp.content || (typeof resp === 'string' ? resp : ''))) || '';
                  // Extract first all-caps token of 3-12 letters. Strip quotes/markdown/punctuation.
                  var match = raw.toUpperCase().match(/[A-Z]{3,12}/);
                  if (!match) {
                    setDecodeGenState({ loading: false, error: 'AI returned no valid word. Try again.' });
                    return;
                  }
                  setDecodeAiWord(match[0]);
                  setDecodeAnswer('');
                  setDecodeFeedback(null);
                  setDecodeGenState({ loading: false, error: null });
                  announce('New AI-generated mirror word loaded.');
                })
                .catch(function(err) {
                  setDecodeGenState({ loading: false, error: 'Could not reach the AI: ' + ((err && err.message) || 'unknown error') });
                });
            }
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                '🪞 Try it: read the type'),
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                'Below is a word of type, mirror-reversed (as it would sit in the composing stick). What would it print as on the paper? Type the readable version.'),
              h('div', { style: { background: T.ink, padding: '14px 18px', border: '2px solid ' + T.wood, borderRadius: 6, textAlign: 'center', marginBottom: 12 } },
                h('div', { style: {
                  display: 'inline-block',
                  fontSize: 32, fontWeight: 700, fontFamily: 'Georgia, serif',
                  color: T.parchment, letterSpacing: '0.12em',
                  transform: 'scaleX(-1)'
                } }, word)
              ),
              h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 } },
                h('input', {
                  type: 'text', value: decodeAnswer,
                  onChange: function(e) { setDecodeAnswer(e.target.value); setDecodeFeedback(null); },
                  placeholder: 'Type the readable word…',
                  style: { flex: 1, minWidth: 180, padding: 10, borderRadius: 6, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 16, fontFamily: 'Georgia, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }
                }),
                h('button', {
                  onClick: function() {
                    var correct = decodeAnswer.trim().toUpperCase() === word;
                    setDecodeFeedback({ correct: correct, attempted: decodeAnswer.trim().toUpperCase() });
                    announce(correct ? 'Correct! That is what the type would print.' : 'Not quite. The correct word is ' + word + '.');
                  },
                  disabled: !decodeAnswer.trim(),
                  style: btnPrimary({ padding: '10px 16px', fontSize: 13, opacity: decodeAnswer.trim() ? 1 : 0.5 })
                }, 'Check'),
                h('button', {
                  onClick: function() {
                    // ↻ New word always returns to the static cycle, even
                    // after an AI round, so students can flip back to the
                    // curated set whenever they want.
                    setDecodeAiWord(null);
                    setDecodeIdx((decodeIdx + 1) % DECODE_WORDS.length);
                    setDecodeAnswer(''); setDecodeFeedback(null);
                    setDecodeGenState({ loading: false, error: null });
                    announce('Next word loaded.');
                  },
                  style: btn({ padding: '10px 16px', fontSize: 13 }) }, '↻ New word'),
                callGemini && h('button', {
                  onClick: generateNewMirrorWord,
                  disabled: decodeGenState.loading,
                  'aria-label': 'Generate a new AI word',
                  style: btn({
                    padding: '10px 16px', fontSize: 13,
                    opacity: decodeGenState.loading ? 0.6 : 1,
                    cursor: decodeGenState.loading ? 'wait' : 'pointer',
                    borderColor: T.warn, color: T.warn
                  })
                }, decodeGenState.loading ? '\u{1F916} Generating…' : '\u{1F916} Generate (AI)')
              ),
              // AI source chip when displaying a generated word
              isAiWord && h('div', { style: { fontSize: 10, color: T.warn, fontStyle: 'italic', marginBottom: 8 } },
                '\u{1F916} AI-generated word'),
              // AI generation error / status
              decodeGenState.error && h('div', {
                'aria-live': 'polite', role: 'alert',
                style: { padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 10, background: '#3d2810', border: '1px dashed ' + T.warn, color: '#fed7aa' }
              }, '⚠ ' + decodeGenState.error),
              decodeFeedback && h('div', { 'aria-live': 'polite',
                style: { padding: 10, borderRadius: 6, fontSize: 13, lineHeight: 1.55,
                  background: decodeFeedback.correct ? '#1f3d28' : '#3d2810',
                  border: '1px solid ' + (decodeFeedback.correct ? T.ok : T.warn),
                  color: decodeFeedback.correct ? '#bbf7d0' : '#fed7aa' } },
                decodeFeedback.correct ? '✓ Correct. That is what the type would print as. You just did, briefly, what a 1450 compositor did all day.' :
                  '✗ Not quite. You typed "' + decodeFeedback.attempted + '"; the type would print as "' + word + '." Tip: cover the type with a hand, squint, and the brain re-orients fast with practice.')
            );
          })(),

          // ── Proofreader's Eye exercise ──
          // The corrector's job: pull a proof, scan against the
          // manuscript, flag every error with a margin mark. Students
          // click the wrong word in a printed-style line.
          //
          // Two enhancements live here:
          // (1) Duplicate-word tolerance — for "TEN TEN" / "TYPE TYPE."
          //     style errors, the two copies are visually identical, so
          //     either click counts as correctly identifying the
          //     duplicate. Both copies highlight on reveal so the
          //     student sees the duplicate-pattern itself.
          // (2) AI-generated rounds — a \u{1F916} button calls Gemini for a
          //     fresh proof line with a parsed { tokens, errorIdx,
          //     corrected, mark, explanation } shape, validated before
          //     it overrides the static cycle. Falls back politely if
          //     the AI is unreachable or returns an unparseable response.
          (function() {
            var round = proofAiRound || PROOF_LINES[proofIdx];
            var isAiRound = !!proofAiRound;
            // Duplicate-tolerant correctness check. Returns true if the
            // index is the marked error position OR if it is an adjacent
            // copy of the same word text (the duplicate-word case).
            function isProofErrorPosition(i) {
              if (i === round.errorIdx) return true;
              if (Math.abs(i - round.errorIdx) === 1 &&
                  round.tokens[i] === round.tokens[round.errorIdx]) {
                return true;
              }
              return false;
            }
            var guessIsCorrect = proofGuess !== null && isProofErrorPosition(proofGuess);

            function generateNewProof() {
              if (!callGemini) {
                setProofGenState({ loading: false, error: 'AI tutor unavailable in this build.' });
                return;
              }
              setProofGenState({ loading: true, error: null });
              var prompt = 'Generate ONE short printed line in the style of a 1450 broadside or pamphlet, with EXACTLY ONE intentional typesetting error. ' +
                'The error must be one of: missing letter, transposed letters (one pair swapped), or duplicated word. ' +
                'Respond with ONLY a JSON object. NO markdown fences, NO commentary, NO explanation outside the JSON. ' +
                'Exact shape: ' +
                '{"tokens": ["WORD1", "WORD2", ...], "errorIdx": <0-based index of the wrong token in tokens>, "corrected": "<what the wrong token should say, or the literal string (delete) for duplicated words>", "mark": "<corrector\'s margin mark name + symbol>", "explanation": "<1-2 sentence explanation of the error type and what a 1450 corrector would write in the margin>"} ' +
                'Constraints: 5 to 8 tokens; tokens are space-separated words including any trailing punctuation; ALL CAPS throughout; the line should sound like 1450-1700 print culture (a motto, declaration, scriptural verse, or news bulletin); errorIdx must point to the actual wrong token; for duplicated-word errors errorIdx points to the second copy and the duplicate token is identical to its neighbor; mark should reference the appropriate symbol (caret ∧ for missing letter, transposition swoop ∿ for letter order, deletion mark ⌫ for duplicated word).';
              callGemini(prompt, { maxOutputTokens: 400 })
                .then(function(resp) {
                  var text = (resp && (resp.text || resp.content || (typeof resp === 'string' ? resp : ''))) || '';
                  // Strip any leading/trailing prose; extract the first {...} block.
                  var braceMatch = text.match(/\{[\s\S]*\}/);
                  if (!braceMatch) {
                    setProofGenState({ loading: false, error: 'AI returned no JSON object. Try again.' });
                    return;
                  }
                  var parsed;
                  try { parsed = JSON.parse(braceMatch[0]); }
                  catch (e) {
                    setProofGenState({ loading: false, error: 'AI returned an unparseable response. Try again.' });
                    return;
                  }
                  if (!parsed || !Array.isArray(parsed.tokens) || parsed.tokens.length < 3 ||
                      typeof parsed.errorIdx !== 'number' || parsed.errorIdx < 0 || parsed.errorIdx >= parsed.tokens.length ||
                      !parsed.corrected || !parsed.explanation) {
                    setProofGenState({ loading: false, error: 'AI response was missing required fields. Try again.' });
                    return;
                  }
                  parsed.tokens = parsed.tokens.map(function(t) { return String(t); });
                  parsed.mark = parsed.mark || 'corrector’s mark';
                  setProofAiRound(parsed);
                  setProofGuess(null);
                  setProofRevealed(false);
                  setProofGenState({ loading: false, error: null });
                  announce('New AI-generated proof loaded.');
                })
                .catch(function(err) {
                  setProofGenState({ loading: false, error: 'Could not reach the AI: ' + ((err && err.message) || 'unknown error') });
                });
            }

            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                  '\u{1F50D} Proofreader\u2019s eye'),
                isAiRound && h('span', {
                  style: { fontSize: 10, color: T.warn, fontStyle: 'italic', padding: '2px 8px', background: 'rgba(245,215,126,0.12)', borderRadius: 4, border: '1px solid ' + T.warn }
                }, '\u{1F916} AI-generated round')
              ),
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                'A corrector in 1450 caught every typesetting error before the run. One word in this printed line is wrong. Click it.'),
              h('div', { style: { background: T.parchment, color: T.ink, padding: '16px 20px', border: '2px solid ' + T.wood, borderRadius: 6, marginBottom: 12, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.4) inset', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22, letterSpacing: '0.04em', lineHeight: 1.5 } },
                round.tokens.map(function(tok, i) {
                  var isError = isProofErrorPosition(i);
                  var isGuessed = (proofGuess === i);
                  var bg = 'transparent';
                  var color = T.ink;
                  var underline = 'none';
                  if (proofRevealed) {
                    if (isError) { bg = 'rgba(199, 69, 54, 0.18)'; underline = '2px wavy ' + T.danger; }
                    if (isGuessed && !isError) { bg = 'rgba(199, 69, 54, 0.10)'; color = T.danger; }
                  } else if (isGuessed) {
                    bg = 'rgba(201, 161, 74, 0.25)';
                  }
                  return h('button', {
                    key: i,
                    onClick: function() {
                      if (proofRevealed) return;
                      setProofGuess(i);
                      setProofRevealed(true);
                      announce(isProofErrorPosition(i) ? 'Correct. That word is the error.' : 'Not the error. The correct answer is shown.');
                    },
                    'aria-pressed': isGuessed ? 'true' : 'false',
                    'aria-label': 'Word ' + (i + 1) + ': ' + tok,
                    disabled: proofRevealed,
                    style: {
                      display: 'inline-block',
                      background: bg, color: color,
                      border: 'none', padding: '2px 6px', margin: '0 2px',
                      borderRadius: 3,
                      font: 'inherit',
                      letterSpacing: 'inherit',
                      cursor: proofRevealed ? 'default' : 'pointer',
                      textDecoration: underline,
                      textUnderlineOffset: '4px',
                      transition: 'background 0.2s ease'
                    }
                  }, tok);
                })
              ),
              proofRevealed && h('div', { 'aria-live': 'polite',
                style: { padding: 12, borderRadius: 6, fontSize: 13, lineHeight: 1.55, marginBottom: 10,
                  background: guessIsCorrect ? '#1f3d28' : '#3d2810',
                  border: '1px solid ' + (guessIsCorrect ? T.ok : T.warn),
                  color: guessIsCorrect ? '#bbf7d0' : '#fed7aa' } },
                h('div', { style: { fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } },
                  guessIsCorrect ? '\u2713 You caught it.' : '\u2717 Missed. The error was the highlighted word.'),
                h('div', { style: { marginBottom: 4 } },
                  h('strong', null, 'What it should say: '), round.corrected),
                h('div', { style: { marginBottom: 4 } },
                  h('strong', null, 'Corrector\u2019s margin mark: '), round.mark),
                h('div', { style: { fontStyle: 'italic', opacity: 0.92 } }, round.explanation)
              ),
              proofGenState.error && h('div', {
                'aria-live': 'polite',
                role: 'alert',
                style: { padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 10, background: '#3d2810', border: '1px dashed ' + T.warn, color: '#fed7aa' }
              }, '\u26A0 ' + proofGenState.error),
              h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                h('button', {
                  onClick: function() {
                    setProofAiRound(null);
                    setProofIdx((proofIdx + 1) % PROOF_LINES.length);
                    setProofGuess(null); setProofRevealed(false);
                    setProofGenState({ loading: false, error: null });
                    announce('New proof loaded.');
                  },
                  style: btnPrimary({ padding: '8px 14px', fontSize: 12 })
                }, '\u21BB New proof'),
                callGemini && h('button', {
                  onClick: generateNewProof,
                  disabled: proofGenState.loading,
                  style: btn({
                    padding: '8px 14px', fontSize: 12,
                    opacity: proofGenState.loading ? 0.6 : 1,
                    cursor: proofGenState.loading ? 'wait' : 'pointer',
                    borderColor: T.warn,
                    color: T.warn
                  })
                }, proofGenState.loading ? '\u{1F916} Generating\u2026' : '\u{1F916} Generate new (AI)'),
                proofRevealed && h('button', {
                  onClick: function() { setProofGuess(null); setProofRevealed(false); },
                  style: btn({ padding: '8px 14px', fontSize: 12 })
                }, 'Try this one again')
              )
            );
          })(),

          // ── Famous typos through history ──
          // Companion to the proofreader exercise above. Shows that even
          // skilled correctors missed catastrophic errors. Pedagogy: print
          // has always been imperfect; quality control is institutional,
          // not individual.
          sectionHeader('💀', 'Famous typos through history (when proofreaders missed)'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.danger, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
              'Even the most careful 1450-1900 shops shipped errors. Some of them changed history; some of them got shops fined or shut down. The lesson is not "correctors were lazy." It is that a fast-moving system needs institutional quality control beyond any single human eye.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              [
                { title: 'The "Wicked Bible"',
                  year: '1631',
                  shop: 'Robert Barker (London, the King\'s printer)',
                  error: 'Exodus 20:14 set as "Thou shalt commit adultery." The word NOT was missing.',
                  consequence: 'King Charles I and the Archbishop of Canterbury fined Barker £300 (a small fortune) and revoked his printing license. About 11 of the 1,000 copies survive today; collectors call them "Wicked Bibles" and they sell for hundreds of thousands of dollars.' },
                { title: 'The "Murderer\'s Bible"',
                  year: '1801',
                  shop: 'Thomas Bensley (London)',
                  error: 'Mark 7:27 reads "Let the children first be killed" instead of "Let the children first be filled." A single dropped letter changed Christ\'s instruction about feeding children into a command to murder them.',
                  consequence: 'Recalled and corrected. A few uncorrected copies survive in the British Library and Folger Shakespeare Library.' },
                { title: 'The Sheppard\'s Bible',
                  year: '1716',
                  shop: 'John Baskett (Oxford and London)',
                  error: 'Jeremiah 31:34 set as "sin on more" instead of "sin no more." Repeated through ~8,000 copies of the Bible printed for the King\'s use.',
                  consequence: 'Survived; nicknamed "The Vinegar Bible" by collectors because the running header for Luke 20 read "The Parable of the Vinegar" instead of "Vineyard." Multiple errors in one print run.' },
                { title: 'The Bay Psalm Book',
                  year: '1640',
                  shop: 'Stephen Daye (Cambridge, Massachusetts Bay Colony)',
                  error: 'First book printed in colonial English North America. Set with imported but mismatched fonts, awkward translations, and many small errors throughout. Quality was widely criticized in the 1640s.',
                  consequence: 'Despite the errors, only 11 of the original 1,700 copies survive. One sold at auction in 2013 for $14.2 million, making it briefly the most expensive printed book ever sold.' }
              ].map(function(t, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.danger, borderRadius: 6, padding: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                    h('h4', { style: { margin: 0, fontSize: 13, color: T.accentHi, fontFamily: 'Georgia, serif' } }, t.title),
                    h('span', { style: { fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, t.year)
                  ),
                  h('div', { style: { fontSize: 10, color: T.warn, fontStyle: 'italic', marginBottom: 6 } }, t.shop),
                  h('div', { style: { background: T.bg, border: '1px dashed ' + T.danger, borderRadius: 4, padding: 8, marginBottom: 6 } },
                    h('div', { style: { fontSize: 10, color: T.danger, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'The error'),
                    h('p', { style: { margin: 0, fontSize: 12, color: T.text, lineHeight: 1.5 } }, t.error)
                  ),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
                    h('strong', { style: { color: T.text, fontStyle: 'normal' } }, 'What happened: '), t.consequence)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'The shops that survived these embarrassments built bigger correction systems: dedicated correctors instead of shared ones, multiple proof passes, errata sheets distributed after the fact, eventually printed lists of corrections at the end of each book. Modern publishing (and modern software releases) inherited every one of these institutional fixes.')
          ),

          // ── Challenge picker ──
          // ⭐ badge appears on each challenge once the student composes it
          // correctly this session. Session-only — a fresh visit shows all
          // four challenges as still-to-do. Combined count rendered to the
          // right of the picker (e.g. "2 / 4 composed") so students see a
          // quick set-completion goal.
          h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' } },
            CHALLENGES.map(function(ch, i) {
              var doneHere = !!challengesDone[ch.id];
              return h('button', {
                key: i,
                onClick: function() { setChallengeIdx(i); announce('Loaded ' + ch.label); },
                'aria-label': ch.label + (doneHere ? ' (composed)' : ''),
                style: i === challengeIdx ? btnPrimary({ padding: '6px 12px', fontSize: 12 }) : btn({ padding: '6px 12px', fontSize: 12 })
              },
                doneHere && h('span', { 'aria-hidden': 'true', style: { color: T.accentHi, marginRight: 4 } }, '⭐'),
                ch.label
              );
            }),
            (function () {
              var doneCount = CHALLENGES.filter(function (c) { return !!challengesDone[c.id]; }).length;
              return h('div', { style: { fontSize: 11, color: doneCount === CHALLENGES.length ? T.accentHi : T.dim, marginLeft: 'auto', fontFamily: 'ui-monospace, Consolas, monospace' } },
                doneCount + ' / ' + CHALLENGES.length + ' composed' + (doneCount === CHALLENGES.length ? ' ⭐' : '')
              );
            })()
          ),
          h('div', { style: { fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 12, padding: '8px 12px', background: T.cardAlt, borderRadius: 6, border: '1px solid ' + T.border, lineHeight: 1.5 } }, CHALLENGE.hint),

          sectionHeader('🎯', 'Target phrase'),
          h('div', { style: { fontSize: 28, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, padding: '12px 16px', background: T.cardAlt, borderRadius: 8, border: '1px solid ' + T.border, textAlign: 'center' } },
            // For the fi challenge, render the ligature in red so students
            // see it visually distinguished from individual sorts.
            CHALLENGE.id === 'FIRST_PROOF'
              ? h(React.Fragment, null, 'F', h('span', { style: { color: T.danger } }, 'fi'), 'RST PROOF')
              : PHRASE
          ),
          // Note about the special ligature sort, only shown for the fi challenge
          CHALLENGE.id === 'FIRST_PROOF' && h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', marginBottom: 12, textAlign: 'center' } },
            'The "fi" in red is one ligature sort — a single piece of type with both letters joined.'),

          // Clock-challenge panel. Live composing pace against
          // historical (1,000 chars/hour) and modern (12,000 chars/hour)
          // benchmarks. Only renders once the student places the first
          // sort. After solve, shows a final verdict line.
          (startTime || solved) && (function() {
            var mins = Math.floor(elapsedSec / 60);
            var secs = Math.floor(elapsedSec % 60);
            var mmss = (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs);
            var cph = (placedCount > 0 && elapsedSec > 0) ? Math.round(placedCount / elapsedSec * 3600) : 0;
            var verdict = null;
            if (solved && elapsedSec > 0 && placedCount > 0) {
              var secPerChar = elapsedSec / placedCount;
              if (secPerChar < 3.6) verdict = { txt: 'Faster than a 1450 master compositor. A 12-hour day at this pace would yield more pages than Gutenberg himself.', color: T.ok };
              else if (secPerChar < 7.2) verdict = { txt: 'About apprentice speed for a Mainz shop. A master would do this in half the time, but you would be earning your room and board.', color: T.accentHi };
              else verdict = { txt: 'Still learning the case layout, which is exactly how every printer started. Speed comes after the muscle memory.', color: T.muted };
            }
            // Pace bar caps at 15,000 c/h so the modern marker sits near (but not at) the right edge.
            var paceWidth = Math.min(100, cph / 15000 * 100);
            return h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 12, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: verdict ? 10 : 0 } },
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 } },
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: T.accentHi, fontVariantNumeric: 'tabular-nums', lineHeight: 1 } }, mmss),
                  h('div', { style: { fontSize: 9, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 } }, 'elapsed')
                ),
                h('div', { style: { flex: 1, minWidth: 200 } },
                  h('div', { style: { fontSize: 12, color: T.muted, marginBottom: 5 } },
                    'Your pace, ',
                    h('span', { style: { color: T.accentHi, fontWeight: 700 } }, cph.toLocaleString()),
                    ' characters per hour.'
                  ),
                  h('div', { style: { position: 'relative', height: 10, background: '#0e0a06', borderRadius: 5, border: '1px solid ' + T.border, overflow: 'visible' } },
                    // Live pace fill
                    h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: paceWidth + '%', background: 'linear-gradient(90deg, ' + T.accent + ', ' + T.accentHi + ')', borderRadius: 4, transition: 'width 0.25s ease-out' } }),
                    // 1,000 c/h benchmark line (compositor)
                    h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: (1000 / 15000 * 100) + '%', top: -3, bottom: -3, width: 2, background: T.muted, opacity: 0.7 } }),
                    // 12,000 c/h benchmark line (modern typist)
                    h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: (12000 / 15000 * 100) + '%', top: -3, bottom: -3, width: 2, background: T.ok, opacity: 0.7 } })
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.dim, marginTop: 4, fontFamily: 'Georgia, serif' } },
                    h('span', null, '↑ 1,000 c/h (1450 compositor)'),
                    h('span', null, '12,000 c/h (modern typist) ↑')
                  )
                )
              ),
              verdict && h('div', { style: { padding: '8px 12px', background: T.bg, border: '1px dashed ' + verdict.color, borderRadius: 6, color: verdict.color, fontSize: 13, fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.4 } }, verdict.txt)
            );
          })(),

          sectionHeader('📐', 'Composing stick'),
          // Composing stick: brass-and-wood feel. Brass-rail bottom + dark
          // wood backing so the metal sorts visually pop against a darker
          // tray. Boxed shadow gives it weight like a real held tool.
          h('div', { style: {
              display: 'flex', gap: 4, marginBottom: 12, padding: 12,
              background: 'linear-gradient(180deg, #1a1410 0%, #1a1410 78%, ' + T.accent + ' 78%, #8a6a30 100%)',
              border: '2px solid ' + T.wood, borderRadius: 8,
              justifyContent: 'center', flexWrap: 'wrap',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3)'
            } },
            st.slots.map(function(letter, i) {
              var isLigature = letter === '';
              return h('button', { key: i,
                onClick: function() { letter ? clearSlot(i) : placeInSlot(i); },
                'aria-label': 'Slot ' + (i + 1) + (letter ? ': contains ' + displayChar(letter) + ' (click to remove)' : ': empty' + (st.picked !== null ? ' (click to place ' + displayChar(SORTS[st.picked]) + ')' : '')),
                style: {
                  width: isLigature ? 56 : 42, height: 56, borderRadius: 4,
                  background: letter ? T.ink : T.bg,
                  border: '2px solid ' + (letter ? (isLigature ? T.danger : T.accent) : T.border),
                  color: T.parchment,
                  fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }
              }, displayChar(letter) || (st.picked !== null ? '⇣' : ''));
            })
          ),
          h('div', { style: { fontSize: 11, color: T.dim, textAlign: 'center', marginBottom: 14, fontStyle: 'italic' } },
            'Click a sort below to pick it up, then click a slot to drop it. Click a filled slot to remove it.'),

          sectionHeader('🗃️', 'Type case (available sorts)'),
          // Period note about real type case organization. In a 1450 shop
          // every letter had a specific compartment — vowels and common
          // consonants near the center for fast reach, rare letters at the
          // edges. The standard layout was memorized through years of
          // apprenticeship. We don't enforce position here (the simulation
          // is about composing, not memorizing), but the note teaches the
          // craft knowledge embedded in the physical case.
          h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', marginBottom: 10, padding: '8px 12px', background: T.cardAlt, borderRadius: 6, border: '1px dashed ' + T.border, lineHeight: 1.5 } },
            h('strong', { style: { color: T.muted, fontStyle: 'normal' } }, 'In a real 1450 case: '),
            'every letter had a fixed compartment. Vowels (a, e, i, o, u) and common consonants (n, r, s, t) sat near the center for fastest reach. Rare letters (q, x, z) lived at the edges. A skilled compositor knew the case by feel — picking sorts without looking.'),
          // Letter-frequency visualization — visible heatmap showing which
          // letters get used most in English. Explains why the type case
          // is organized the way it is. Frequencies are approximate English
          // letter frequencies (e dominant, t/a/o/i/n next, q/x/z near zero).
          (function() {
            // English letter frequency (rough percentages, rounded for clarity).
            // Reference: Norvig's letter-frequency analysis of Google Books.
            var FREQ = [
              { l: 'E', p: 12.7 }, { l: 'T', p: 9.1 }, { l: 'A', p: 8.2 },
              { l: 'O', p: 7.5 }, { l: 'I', p: 7.0 }, { l: 'N', p: 6.7 },
              { l: 'S', p: 6.3 }, { l: 'H', p: 6.1 }, { l: 'R', p: 6.0 },
              { l: 'D', p: 4.3 }, { l: 'L', p: 4.0 }, { l: 'C', p: 2.8 },
              { l: 'U', p: 2.8 }, { l: 'M', p: 2.4 }, { l: 'W', p: 2.4 },
              { l: 'F', p: 2.2 }, { l: 'G', p: 2.0 }, { l: 'Y', p: 2.0 },
              { l: 'P', p: 1.9 }, { l: 'B', p: 1.5 }, { l: 'V', p: 1.0 },
              { l: 'K', p: 0.8 }, { l: 'J', p: 0.15 }, { l: 'X', p: 0.15 },
              { l: 'Q', p: 0.1 }, { l: 'Z', p: 0.07 }
            ];
            var maxP = 12.7;
            return h('details', { style: { marginBottom: 10, background: T.cardAlt, border: '1px dashed ' + T.border, borderRadius: 6, padding: '8px 12px' } },
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: T.muted, fontWeight: 600 } }, '📊 Why some compartments were bigger (letter frequency)'),
              h('div', { style: { marginTop: 10 } },
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' } },
                  'English letter frequency. A compositor needed many more E\'s than Z\'s, so the case had ' +
                  'large compartments for vowels and tiny ones for rare letters. Compartment size mirrored use.'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 4 } },
                  FREQ.map(function(f, fi) {
                    var w = Math.max(8, (f.p / maxP) * 100);
                    return h('div', { key: fi, style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
                      h('div', { style: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 2 } }, f.l),
                      h('div', { style: { width: '100%', height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' } },
                        h('div', { style: { width: w + '%', height: '100%', background: T.accent } })),
                      h('div', { style: { fontSize: 9, color: T.dim, marginTop: 2, fontFamily: 'ui-monospace, monospace' } }, f.p < 1 ? f.p.toFixed(2) + '%' : f.p.toFixed(1) + '%')
                    );
                  })
                )
              )
            );
          })(),
          // Type case: layered horizontal-grain wood texture using CSS
          // gradients (no SVG needed since this is a div). Repeating linear
          // gradients give the wood a planked-and-grained feel; the inset
          // shadow at the top-left + bottom-right adds depth like a real
          // wooden box hollow filled with metal sorts.
          // Type case wood-grain refined to match the press timber palette
          // exactly. Layered gradients: vertical grain streaks at varied
          // widths (mimicking the SVG `pp-woodgrain` pattern on the press
          // frame) + a diagonal sheen for polished wood under workshop
          // light. Inset shadows give the case the hollowed-out depth of
          // a real wooden type tray.
          h('div', { style: {
              display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: 12,
              background:
                // Horizontal compartment-divider rule near the middle — real
                // type cases had a horizontal shelf line halfway down, which
                // separated the "upper" case row from the "lower" case row.
                // 90deg gradient places it visually about 60% down the box.
                'linear-gradient(180deg, transparent 0%, transparent 55%, rgba(139,90,47,0.4) 55.5%, rgba(139,90,47,0.4) 56.5%, transparent 57%, transparent 100%), ' +
                // Subtle highlight streak
                'repeating-linear-gradient(180deg, transparent 0px, transparent 4px, rgba(139,90,47,0.18) 4px, rgba(139,90,47,0.18) 4.3px, transparent 4.3px, transparent 12px), ' +
                // Primary vertical grain (multiple line widths for organic feel)
                'repeating-linear-gradient(180deg, transparent 0px, transparent 6px, rgba(61,41,20,0.45) 6px, rgba(61,41,20,0.45) 6.8px, transparent 6.8px, transparent 14px), ' +
                'repeating-linear-gradient(180deg, transparent 0px, transparent 9px, rgba(61,41,20,0.25) 9px, rgba(61,41,20,0.25) 9.4px, transparent 9.4px, transparent 18px), ' +
                // Diagonal polished-wood sheen
                'linear-gradient(135deg, #5a3a1f 0%, #3d2914 50%, #2a1c0e 100%)',
              border: '2px solid ' + T.wood, borderRadius: 8,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)'
            } },
            SORTS.map(function(letter, i) {
              var picked = st.picked === i;
              var isLigature = letter === '';
              // Mirror-reverse the letter for display (scaleX(-1)).
              // Ligature sorts get a wider block AND a red accent border so
              // students can distinguish them from individual sorts in the case.
              return h('button', { key: i,
                onClick: function() { setSt({ slots: st.slots, picked: picked ? null : i }); announce(picked ? 'Sort released' : 'Picked up ' + displayChar(letter)); },
                'aria-label': (picked ? 'Drop ' : 'Pick up ') + displayChar(letter) + (isLigature ? ' (fi ligature — single sort with both letters)' : ' (mirror-reversed type)'),
                style: {
                  width: isLigature ? 56 : 42, height: 52, borderRadius: 3,
                  background: picked ? T.accentHi : '#5a4630',
                  border: '2px solid ' + (picked ? T.danger : isLigature ? T.danger : '#3d2914'),
                  color: picked ? T.ink : T.parchment,
                  fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'scaleX(-1)'  // mirror-reversed, as real type is
                }
              }, letter === ' ' ? '·' : displayChar(letter));
            })
          ),

          solved && (function () {
            // Per-challenge solve flavor. Each phrase pays off with a
            // historically-anchored note tied to *that* phrase, not a
            // generic compositor-speed line.
            var SOLVE_FLAVOR = {
              IN_PRINT: {
                title: 'Set! Now you understand why apprenticeships were 7 years.',
                body: 'A skilled compositor in 1450 could set ~1,000 characters per hour, mirror-reversed, from memory of where every letter in the case sat. Modern keyboard typists do ~12,000 characters per hour. The compositor was a craft profession that required years of training, and a press with a single bad compositor produced unreadable books.'
              },
              FIRST_PROOF: {
                title: 'Set — with the fi-ligature in place.',
                body: 'A real 1450 case held about 150 different sorts, not just 26 letters. Dozens of ligatures (fi, fl, ff, ffi, ffl, ct, st) lived alongside the letters, plus accented letters, fractions, and punctuation. A compositor who reached for the wrong drawer cost the shop a whole proof pull.'
              },
              FALMOUTH: {
                title: 'Set the way Wait and Titcomb set it in January 1785.',
                body: 'The first issue of the Falmouth Gazette ran four pages and sold for sixpence. Within fifteen years there were nine newspapers in what would become Maine. The press in Falmouth (now Portland) was a few hundred yards from the wharves where the paper, type, and ink arrived from Boston by sloop.'
              },
              COMMON_SENSE: {
                title: 'Set the highest-leverage pamphlet in colonial America.',
                body: 'Common Sense was reprinted by dozens of printers across the thirteen colonies in 1776. Total run is estimated at 150,000 copies in a population of about 2.5 million. Per capita, that is the equivalent of around 20 million copies in the United States today, and it was set by hand in shops the size of a large bedroom.'
              },
              AD_FONTES: {
                title: 'BENE FACTUM. Erasmus would have said it that way.',
                body: 'AD FONTES, "back to the sources," was the rallying cry that drove a huge share of the printed output of the 1500s. Scholars wanted Greek New Testaments, Hebrew Old Testaments, and classical Latin from before a thousand years of hand-copying had introduced errors. Print made comparison possible: ten copies of the same passage on ten desks at once.'
              }
            };
            var flavor = (CHALLENGE && SOLVE_FLAVOR[CHALLENGE.id]) || SOLVE_FLAVOR.IN_PRINT;
            return calloutBox('ok', flavor.title, flavor.body);
          })(),

          // ── Press impression preview ──
          // Once the phrase is fully composed, the student sees "Press!" and
          // a side-by-side preview: the mirror-reversed type in the composing
          // stick (left) vs the readable printed phrase on paper (right).
          // The lesson — "type is mirrored, paper reads correctly" — is no
          // longer textual; students see the flip happen.
          solved && h('div', { style: { background: T.card, border: '2px solid ' + T.accent, borderRadius: 12, padding: 16, marginTop: 14, marginBottom: 14 } },
            h('div', { style: { textAlign: 'center', marginBottom: 12 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 4 } },
                pressState === 'idle' ? '🪢 Now press the type onto paper' :
                pressState === 'pressing' ? '⚙️ Pressing…' :
                '✓ The impression flipped'),
              h('div', { style: { fontSize: 12, color: T.muted, fontStyle: 'italic' } },
                pressState === 'idle' ? 'Click below to take an impression. The mirror-reversed type will print as readable letters.' :
                pressState === 'pressing' ? 'The platen comes down. Pressure transfers ink from the type to the paper.' :
                'Type is mirror-reversed. Paper reads normally. This is the whole pedagogical point of metal movable type.')
            ),
            // Side-by-side: type forme (mirrored) vs paper (readable)
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 12 } },
              // LEFT: mirrored type forme on the bed
              h('div', null,
                h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: 4, fontWeight: 700 } }, 'Type forme (mirrored)'),
                h('div', { style: {
                  background: T.ink, color: T.parchment, padding: '12px 8px',
                  border: '2px solid ' + T.wood, borderRadius: 4,
                  fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 22, letterSpacing: '0.1em',
                  textAlign: 'center',
                  transform: 'scaleX(-1)'  // mirror-reversed display
                } }, st.slots.join('').replace(/ƒ/g, 'fi').replace(/ /g, '·'))
              ),
              // CENTER: arrow + animation indicator
              h('div', { style: { textAlign: 'center', color: T.accent, fontSize: 24, fontFamily: 'Georgia, serif' } },
                h('div', { style: {
                  transform: pressState === 'pressing' ? 'scaleY(0.6)' : 'scaleY(1)',
                  transition: 'transform 0.5s ease-in-out'
                } }, '⇒'),
                h('div', { style: { fontSize: 9, color: T.dim, fontStyle: 'italic', marginTop: 2 } }, 'press')
              ),
              // RIGHT: paper (readable when printed). 3D flip animation —
              // during the 'pressing' state, the paper container rotates on
              // the X axis to suggest the impression being struck. The
              // perspective container gives the flip apparent depth.
              h('div', { style: { perspective: '600px' } },
                h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: 4, fontWeight: 700 } }, 'Paper (readable)'),
                h('div', { style: {
                  background: pressState === 'printed' ? T.parchment : '#3a2a1a',
                  color: pressState === 'printed' ? T.ink : 'transparent',
                  padding: '12px 8px',
                  border: '2px solid ' + (pressState === 'printed' ? '#8a7a5a' : T.border),
                  borderRadius: 4,
                  fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 22, letterSpacing: '0.1em',
                  textAlign: 'center',
                  opacity: pressState === 'pressing' ? 0.5 : 1,
                  // X-axis rotation during the press: paper flips edge-on
                  // mid-press, then settles back to 0° when the impression
                  // is complete. Pure CSS animation, no extra state needed.
                  transform: pressState === 'pressing' ? 'rotateX(180deg)' : 'rotateX(0deg)',
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                  transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.5s ease, color 0.5s ease, border-color 0.5s ease',
                  minHeight: 22,
                  boxShadow: pressState === 'printed' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                } },
                  pressState === 'printed' ? st.slots.join('').replace(/ƒ/g, 'fi').replace(/ /g, '   ') : (pressState === 'pressing' ? '…' : '(blank)'))
              )
            ),
            // Action buttons
            h('div', { className: 'printingpress-no-print', style: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
              pressState === 'idle' && h('button', {
                onClick: function() { setPressState('pressing'); announce('Pressing the type onto paper.'); },
                style: btnPrimary({ padding: '10px 20px', fontSize: 14 })
              }, '🪢 Press!'),
              pressState === 'printed' && h('button', {
                onClick: function() { setPressState('idle'); announce('Press reset.'); },
                style: btn({ padding: '10px 16px', fontSize: 13 })
              }, '↺ Press again'),
              pressState === 'printed' && h('button', {
                onClick: function() {
                  setSt({ slots: ['', '', '', '', '', '', '', ''], picked: null });
                  setPressState('idle');
                  announce('Composing stick cleared. Set a new phrase.');
                },
                style: btn({ padding: '10px 16px', fontSize: 13 })
              }, '🆕 Compose new')
            )
          ),

          // ── Folio imposition puzzle ──
          // A folio is one sheet of paper folded once = 4 pages.
          // The student decides which page number goes where on the
          // sheet so the folded book reads 1, 2, 3, 4. Correct:
          //   outer-left = 4, outer-right = 1
          //   inner-left = 2, inner-right = 3
          // Mind-bender the first time. Real 1450 imposer's job.
          (function() {
            var CORRECT = [4, 1, 2, 3];
            var isCorrect = impSlots.every(function(v, i) { return v === CORRECT[i]; });
            var allPlaced = impSlots.every(function(v) { return v !== null; });
            var revealed = (impStage === 'wrong' || impStage === 'right' || impStage === 'right-open');
            var slotLabels = ['outer-left', 'outer-right', 'inner-left', 'inner-right'];
            function placeIn(slot) {
              if (revealed) return;
              if (impSlots[slot] !== null) {
                // Remove (allow re-place)
                var copy = impSlots.slice();
                copy[slot] = null;
                setImpSlots(copy);
                return;
              }
              if (impSelected === null) return;
              // Place selected, ensure each page used at most once.
              var copy = impSlots.slice();
              for (var i = 0; i < copy.length; i++) {
                if (copy[i] === impSelected) copy[i] = null;
              }
              copy[slot] = impSelected;
              setImpSlots(copy);
              setImpSelected(null);
            }
            function checkAnswer() {
              setImpStage(isCorrect ? 'right' : 'wrong');
              announce(isCorrect ? 'Correct. The fold reads 1, 2, 3, 4.' : 'Not yet. The correct imposition is shown.');
            }
            function reset() {
              setImpSlots([null, null, null, null]);
              setImpSelected(null);
              setImpStage('edit');
            }
            // What to display in each slot for the reveal animations.
            // On 'right-open', the outer side is hidden and the inner side shows 2|3.
            function slotDisplay(idx) {
              if (revealed && impStage !== 'wrong') return CORRECT[idx];
              return impSlots[idx];
            }
            // The available palette: unused page numbers (those not in slots).
            var palette = [1, 2, 3, 4].filter(function(n) { return impSlots.indexOf(n) === -1; });
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                '\u{1F4D1} Imposition puzzle (folio, 4 pages)'),
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                'A "folio" is one sheet of paper folded once \u2014 4 pages total. To make the folded book read in order (1, 2, 3, 4), the pages need to be on the sheet in specific positions. Pick a page number from the palette and click an empty slot. When you think you have it, check the fold.'),
              // Palette (the four page-number tiles)
              !revealed && h('div', { className: 'printingpress-no-print', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 14, padding: 10, background: T.cardAlt, border: '1px dashed ' + T.border, borderRadius: 8 } },
                h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginRight: 6 } }, 'Pages'),
                palette.length > 0 ? palette.map(function(n) {
                  var isPicked = (impSelected === n);
                  return h('button', { key: n,
                    onClick: function() { setImpSelected(isPicked ? null : n); },
                    'aria-pressed': isPicked ? 'true' : 'false',
                    style: {
                      width: 44, height: 44, borderRadius: 8,
                      background: isPicked ? T.accent : T.parchment,
                      color: isPicked ? T.ink : T.ink,
                      border: '2px solid ' + (isPicked ? T.accentHi : T.wood),
                      fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif',
                      cursor: 'pointer',
                      boxShadow: isPicked ? '0 0 0 3px rgba(245,215,126,0.3)' : '0 1px 2px rgba(0,0,0,0.3)',
                      transition: 'all 0.15s ease'
                    }
                  }, n);
                }) : h('span', { style: { fontSize: 12, color: T.dim, fontStyle: 'italic' } }, 'All placed. Hit \u201CCheck the fold.\u201D')
              ),
              // Two sheets side by side: outer and inner
              // 'right-open' shows only the inner side (animation step).
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 12 } },
                // OUTER SIDE
                impStage !== 'right-open' && h('div', null,
                  h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4, textAlign: 'center' } }, 'Outer side of sheet'),
                  h('div', { style: { background: T.parchment, color: T.ink, border: '2px solid ' + T.wood, borderRadius: 6, display: 'flex', minHeight: 110, position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' } },
                    // Fold line in middle
                    h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: -4, bottom: -4, left: '50%', width: 0, borderLeft: '1px dashed ' + T.wood, opacity: 0.5 } }),
                    [0, 1].map(function(slotIdx) {
                      var val = slotDisplay(slotIdx);
                      var revealCorrect = revealed && impStage !== 'wrong';
                      return h('button', { key: slotIdx,
                        onClick: function() { placeIn(slotIdx); },
                        'aria-label': slotLabels[slotIdx] + (val ? ', page ' + val : ', empty'),
                        disabled: revealed,
                        style: {
                          flex: 1, padding: 14,
                          background: 'transparent',
                          border: 'none',
                          borderRight: slotIdx === 0 ? '1px dashed ' + T.wood : 'none',
                          cursor: revealed ? 'default' : 'pointer',
                          fontSize: 40, fontWeight: 700, fontFamily: 'Georgia, serif',
                          color: T.ink,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minHeight: 100,
                          position: 'relative'
                        }
                      }, val !== null ? val : h('span', { style: { color: T.dim, fontSize: 28, fontWeight: 400, fontStyle: 'italic' } }, '?'));
                    })
                  )
                ),
                // INNER SIDE
                h('div', null,
                  h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4, textAlign: 'center' } }, 'Inner side of sheet'),
                  h('div', { style: { background: T.parchment, color: T.ink, border: '2px solid ' + T.wood, borderRadius: 6, display: 'flex', minHeight: 110, position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' } },
                    h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: -4, bottom: -4, left: '50%', width: 0, borderLeft: '1px dashed ' + T.wood, opacity: 0.5 } }),
                    [2, 3].map(function(slotIdx) {
                      var val = slotDisplay(slotIdx);
                      return h('button', { key: slotIdx,
                        onClick: function() { placeIn(slotIdx); },
                        'aria-label': slotLabels[slotIdx] + (val ? ', page ' + val : ', empty'),
                        disabled: revealed,
                        style: {
                          flex: 1, padding: 14,
                          background: 'transparent',
                          border: 'none',
                          borderRight: slotIdx === 2 ? '1px dashed ' + T.wood : 'none',
                          cursor: revealed ? 'default' : 'pointer',
                          fontSize: 40, fontWeight: 700, fontFamily: 'Georgia, serif',
                          color: T.ink,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minHeight: 100
                        }
                      }, val !== null ? val : h('span', { style: { color: T.dim, fontSize: 28, fontWeight: 400, fontStyle: 'italic' } }, '?'));
                    })
                  )
                )
              ),
              // Check / reveal controls
              !revealed && h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', {
                  onClick: checkAnswer,
                  disabled: !allPlaced,
                  style: btnPrimary({ padding: '10px 16px', fontSize: 13, opacity: allPlaced ? 1 : 0.5 })
                }, '\u{1F4D6} Check the fold'),
                h('button', { onClick: reset, style: btn({ padding: '10px 16px', fontSize: 13 }) }, '\u21BB Clear')
              ),
              // Reveal panel
              revealed && h('div', { 'aria-live': 'polite',
                style: { padding: 12, borderRadius: 6, fontSize: 13, lineHeight: 1.6, marginBottom: 10,
                  background: impStage === 'wrong' ? '#3d2810' : '#1f3d28',
                  border: '1px solid ' + (impStage === 'wrong' ? T.warn : T.ok),
                  color: impStage === 'wrong' ? '#fed7aa' : '#bbf7d0' } },
                h('div', { style: { fontWeight: 700, marginBottom: 8, fontFamily: 'Georgia, serif', fontSize: 14 } },
                  impStage === 'wrong' ? '\u2717 Not yet \u2014 the correct imposition is now shown.' : '\u2713 Correct. Fold this sheet and the pages read in order.'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 8 } },
                  [
                    { slot: 'outer-left', page: 4, role: 'Back cover' },
                    { slot: 'outer-right', page: 1, role: 'Front cover' },
                    { slot: 'inner-left', page: 2, role: 'Left-hand inside page' },
                    { slot: 'inner-right', page: 3, role: 'Right-hand inside page' }
                  ].map(function(row, i) {
                    return h('div', { key: i, style: { background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '6px 8px' } },
                      h('div', { style: { fontSize: 10, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 } }, row.slot),
                      h('div', { style: { fontSize: 13, fontWeight: 700 } }, 'Page ' + row.page + ' \u00B7 ' + row.role)
                    );
                  })
                ),
                h('div', { style: { fontStyle: 'italic', opacity: 0.92 } },
                  'Why this works: when you fold the sheet in half, the outer-right page (1) lands on top of the outer-left page (4). Page 1 is the cover; page 4 is the back. Opening the folded sheet reveals the inner side, with page 2 facing page 3. Read the book \u2014 1, 2, 3, 4.')
              ),
              // After-reveal controls
              revealed && h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                impStage === 'right' && h('button', {
                  onClick: function() { setImpStage('right-open'); announce('Folded. Showing the inner side.'); },
                  style: btnPrimary({ padding: '10px 16px', fontSize: 13 })
                }, '\u{1F4D6} Fold it'),
                impStage === 'right-open' && h('button', {
                  onClick: function() { setImpStage('right'); },
                  style: btn({ padding: '10px 16px', fontSize: 13 })
                }, '\u21A9 Open it back up'),
                h('button', { onClick: reset, style: btn({ padding: '10px 16px', fontSize: 13 }) }, '\u21BB Try again')
              ),
              h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
                'Bigger formats (quarto, 8 pages per sheet; octavo, 16 pages) follow the same kind of logic but get progressively harder. In a real 1450 shop, the imposer was a senior craftsman; getting it wrong meant printing the run upside-down or out of order. The schematics for octavo imposition look like geometry puzzles \u2014 and they are.')
            );
          })(),

          // \u2500\u2500 A compositor's lifetime in characters \u2500\u2500
          // Quick math reflection. Concrete number lands the scale of
          // the craft for students who just spent 30 seconds setting one
          // phrase.
          sectionHeader('\u{1F9EE}', 'A compositor\u2019s lifetime in characters'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              'You just set 8 to 10 characters. A 1450 master compositor set roughly 1,000 characters per hour, ten hours per day, six days per week, for forty years.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 } },
              [
                { label: 'Per hour', value: '1,000', unit: 'chars' },
                { label: 'Per 10-hr day', value: '10,000', unit: 'chars' },
                { label: 'Per 6-day week', value: '60,000', unit: 'chars' },
                { label: 'Per 50-week year', value: '3,000,000', unit: 'chars' },
                { label: 'Per 40-year career', value: '120,000,000', unit: 'chars' }
              ].map(function(row, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.accent, borderRadius: 6, padding: 10, textAlign: 'center' } },
                  h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia, serif' } }, row.label),
                  h('div', { style: { fontSize: 18, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 } }, row.value),
                  h('div', { style: { fontSize: 10, color: T.muted, marginTop: 2 } }, row.unit)
                );
              })
            ),
            h('p', { style: { margin: 0, fontSize: 12, color: T.text, lineHeight: 1.65 } },
              'A 120-million-character career is roughly 600 King James Bibles, set one mirror-reversed sort at a time, by hand, by feel of the nick. Most compositors did this for less wage than a modern barista. The economic case for the press was that one of these workers, with a press to back them, could do hundreds of times what a scribe could do alone.'),
            h('p', { style: { margin: '8px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'For comparison: a fast modern keyboard typist (12,000 chars/hour) writing 4 hours a day for 40 years produces about 380 million characters in their typing lifetime. The press-shop compositor was within an order of magnitude of this, four hundred years before computers existed.')
          ),

          sectionHeader('📦', 'What you just did, in real-shop terms'),
          keyPointBlock(
            'You set type the way it was done from 1450 to ~1880. The exact same physical operation:',
            [
              { k: 'Lower case / Upper case', v: 'The compositor stood in front of two wooden cases. Lowercase letters lived in the lower (closer, more frequently used). Uppercase lived in the upper (farther reach, less frequent). That is literally where the names come from.' },
              { k: 'The composing stick', v: 'A handheld metal tray adjustable for line width. The compositor built one line at a time, right-to-left, reading from a manuscript propped on a stand.' },
              { k: 'Galley', v: 'When the stick was full, lines were transferred onto a "galley" — a flat tray. Galley proofs (page proofs taken from the galley before final pagination) are still a publishing-industry term.' },
              { k: 'Justification', v: 'The compositor inserted thin metal spacers ("quads") between words to make every line the same width. This is where the modern term "justified text" comes from.' },
              { k: 'Distribution', v: 'After printing, each sort had to be picked up and returned to its case. A bad compositor would "fall in pi" (mix up the letters), which was a workshop disaster.' }
            ]
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('setType', 0, {
            prompt: 'A compositor in 1450 reads from a Latin manuscript and sets type. The text reads "Confitemini Domino" (Give thanks to the Lord). Which way through the composing stick does she set the letters?',
            choices: [
              'Left-to-right, the same as we read.',
              'Right-to-left, mirror-reversed, so when printed it reads left-to-right normally.',
              'Top-to-bottom.',
              'Randomly, then sorted later.'
            ],
            correct: 1,
            explain: 'Type is mirror-reversed AND set right-to-left in the stick, so when the forme is pressed against paper, the impression flips both ways and reads correctly. Compositors had to read text fluently in mirror-image. (And yes — a significant number of compositors in 1450-1500 Europe were women, often printers\' daughters or widows running family shops.)'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('setType', [
            { q: 'Why is metal type mirror-reversed?', opts: ['For aesthetic reasons', 'Because the type presses INTO the paper and the image flips — mirror type prints as normal letters', 'It is not — that is a myth', 'To save space'], ans: 1, explain: 'When type presses against paper, left and right swap. So the type face itself is a mirror image of the printed letter.' },
            { q: 'The terms "uppercase" and "lowercase" come from:', opts: ['Software naming', 'The physical wooden type cases — lowercase letters were in the lower, more accessible case; capitals in the upper', 'Greek tradition', 'The names of the printers'], ans: 1, explain: 'Literally the physical position of the type cases in a print shop. The compositor stood in front of two cases, lower and upper.' },
            { q: 'A skilled compositor in 1450 could set roughly how many characters per hour?', opts: ['About 100', 'About 1,000', 'About 10,000', 'About 50,000'], ans: 1, explain: 'About 1,000 characters per hour, mirror-reversed, right-to-left, by memory of the case. Compare to ~12,000 chars/hour for a fast modern keyboard typist.' },
            { q: 'A "galley proof" today refers to a publishing-industry preview copy. The term comes from:', opts: ['Ship galleys (kitchens)', 'The metal tray ("galley") that held set type before final pagination, used to take preview impressions', 'The Latin word for proof', 'A 19th-century US printer named Galley'], ans: 1, explain: 'The galley was the metal tray where set type rested before being arranged into pages. Proofs pulled from the galley were "galley proofs." The term stuck even after the physical galley disappeared.' }
          ]),

          sourcesBlock([
            { label: 'Gutenberg Museum (Mainz) — Composing stick demonstrations', url: 'https://www.gutenberg-museum.de/en' },
            { label: 'Library of Congress — "Printing Innovations" (typesetting history)', url: 'https://www.loc.gov/collections/manuscripts/' },
            { label: 'Robert Bringhurst, "The Elements of Typographic Style" (4th ed., 2013)' },
            { label: 'Briar Press — Letterpress community + glossary', url: 'https://www.briarpress.org/' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.setType),
          crossLinkFooter('setType'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 3 — CASTING TYPE
      // ═════════════════════════════════════════════════════════════════════
      function renderCastingType() {
        // Casting Tour state — parallels the Press Mechanism Guided Tour.
        // Aaron clicks "▶ Walk through" and the focus highlights step 1, then
        // step 2, then step 3, with narration above each. ~3.5s per step.
        // Manual click anywhere on the cards exits the tour.
        var castingFocusRaw = useState(null);  // null | 0 | 1 | 2
        var castingFocus = castingFocusRaw[0], setCastingFocus = castingFocusRaw[1];
        var castingTourRaw = useState(false);
        var castingTour = castingTourRaw[0], setCastingTour = castingTourRaw[1];

        useEffect(function() {
          if (!castingTour) return;
          if (castingFocus === null) return;
          var DELAY = 3500;
          var to = setTimeout(function() {
            if (castingFocus >= 2) {
              setCastingTour(false);
              setCastingFocus(null);
              announce('Casting tour complete.');
            } else {
              setCastingFocus(castingFocus + 1);
            }
          }, DELAY);
          return function() { clearTimeout(to); };
        }, [castingTour, castingFocus]);

        // Alloy Designer state. Default = historical Gutenberg-era target.
        // Constraint: lead + tin + antimony must always sum to 100, so when
        // one slider moves the other two re-balance proportionally to absorb
        // the delta. Below 0 or above 100 on any individual is clamped.
        var leadPctRaw = useState(54);
        var leadPct = leadPctRaw[0], setLeadPct = leadPctRaw[1];
        var tinPctRaw = useState(28);
        var tinPct = tinPctRaw[0], setTinPct = tinPctRaw[1];
        // Inventory-guess game state. Slider on a log scale (~100 to 300,000).
        var sortGuessRaw = useState(5000);
        var sortGuess = sortGuessRaw[0], setSortGuess = sortGuessRaw[1];
        var sortRevealedRaw = useState(false);
        var sortRevealed = sortRevealedRaw[0], setSortRevealed = sortRevealedRaw[1];
        // Right-side-up detection game state. Tests by-nick orientation.
        var nickRoundRaw = useState(0);
        var nickRound = nickRoundRaw[0], setNickRound = nickRoundRaw[1];
        var nickPickedRaw = useState(null);
        var nickPicked = nickPickedRaw[0], setNickPicked = nickPickedRaw[1];
        var nickScoreRaw = useState(0);
        var nickScore = nickScoreRaw[0], setNickScore = nickScoreRaw[1];
        var antimonyPct = Math.max(0, 100 - leadPct - tinPct);

        function setAlloy(field, val) {
          val = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
          if (field === 'lead') {
            // Adjust tin to keep antimony non-negative if lead+tin would exceed 100
            var newTin = tinPct;
            if (val + newTin > 100) newTin = 100 - val;
            setLeadPct(val);
            setTinPct(newTin);
          } else if (field === 'tin') {
            var newLead = leadPct;
            if (val + newLead > 100) newLead = 100 - val;
            setTinPct(val);
            setLeadPct(newLead);
          } else if (field === 'antimony') {
            // Setting antimony directly = adjust by absorbing delta from
            // lead and tin proportionally
            var targetSb = val;
            var oldSb = antimonyPct;
            var delta = targetSb - oldSb;
            // Take from / give to lead and tin in their existing proportion
            var oldLT = leadPct + tinPct;
            if (oldLT === 0) { setLeadPct(50 - targetSb / 2); setTinPct(50 - targetSb / 2); }
            else {
              setLeadPct(Math.max(0, leadPct - delta * (leadPct / oldLT)));
              setTinPct(Math.max(0, tinPct - delta * (tinPct / oldLT)));
            }
          }
        }

        // Quality assessment: each metric scored 0-100 from current alloy.
        // Numbers are pedagogically reasonable approximations, not metallurgy.
        // Dimensional accuracy = how close cast comes to the matrix size,
        //   peaks at antimony ~18% (the historical target). Above or below
        //   degrades fast; below 5% is essentially unusable.
        function dimensionalAccuracy() {
          var sb = antimonyPct;
          if (sb < 5) return 10;
          if (sb < 12) return 30 + (sb - 5) * 8;
          if (sb < 22) return 90 + (sb - 12) * 1;  // peak
          if (sb < 35) return 100 - (sb - 22) * 4;
          return Math.max(15, 50 - (sb - 35) * 2);
        }
        // Hardness = lead is soft; antimony adds hardness; tin moderates.
        function hardness() {
          var sb = antimonyPct;
          var lead = leadPct;
          // More antimony = harder; too much lead = soft
          var h = 30 + sb * 1.8 - Math.max(0, lead - 70) * 1.2;
          return Math.max(0, Math.min(100, h));
        }
        // Mold fill = needs low melting point (lead + tin help, antimony hurts)
        function moldFill() {
          var lead = leadPct;
          var tin = tinPct;
          var sb = antimonyPct;
          // Lead-tin eutectic gives best fill; pure lead OK; high antimony bad
          var f = 50 + tin * 1.0 + lead * 0.3 - sb * 1.5;
          return Math.max(0, Math.min(100, f));
        }
        // Durability = how many impressions before the type wears out.
        // Needs hardness AND structural integrity (not too brittle from too much antimony)
        function durability() {
          var sb = antimonyPct;
          var lead = leadPct;
          if (sb < 8) return 15 + sb * 4;  // soft type, deforms fast
          if (sb < 25) return 60 + sb * 1.5;  // good range
          return Math.max(20, 100 - (sb - 25) * 3);  // brittle, chips
        }

        var dim = Math.round(dimensionalAccuracy());
        var hard = Math.round(hardness());
        var fill = Math.round(moldFill());
        var dur = Math.round(durability());
        var overall = Math.round((dim + hard + fill + dur) / 4);

        // Editorial assessment based on the alloy
        function assessment() {
          if (antimonyPct < 5) return { tone: 'danger', label: 'Failed cast', text: 'Without antimony, the lead-tin alloy shrinks as it cools. Cast type comes out smaller than the matrix with rounded edges. Letters are unreadable. This is exactly why pre-Gutenberg attempts at metal type failed.' };
          if (antimonyPct > 35) return { tone: 'danger', label: 'Brittle, chips on first press', text: 'Too much antimony makes the alloy hard but brittle. Type chips or shatters under press pressure within a few impressions. Workshop disaster.' };
          if (leadPct < 20) return { tone: 'warn', label: 'Expensive and impractical', text: 'You are using too little lead — the cheap, dense base of the alloy. Per-sort cost spirals; this is closer to silversmithing than type-casting.' };
          if (tinPct < 8) return { tone: 'warn', label: 'Mold fill problem', text: 'Insufficient tin means the melting point is too high and the alloy does not flow well into the matrix. Cast letters come out incomplete around fine details.' };
          if (leadPct > 80) return { tone: 'warn', label: 'Too soft', text: 'Mostly lead. The type deforms after only a few hundred impressions. Letters get fuzzy then unrecognizable. Workshop costs spike from constant recasting.' };
          if (overall >= 88) return { tone: 'ok', label: 'Excellent — at or near the historical target', text: 'This is approximately the lead-tin-antimony ratio that 1450 print shops settled on after generations of trial and error. Crisp casts, durable type, reasonable cost.' };
          if (overall >= 70) return { tone: 'ok', label: 'Acceptable', text: 'Workable. Print runs would be slower than ideal and recasting more frequent, but the shop could function.' };
          return { tone: 'warn', label: 'Marginal', text: 'The cast type would work for limited runs but the workshop would lose money to recasting and lost impressions.' };
        }
        var a = assessment();

        function alloySlider(label, value, onChange, color) {
          return h('div', { style: { marginBottom: 10 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 } },
              h('span', { style: { color: T.text, fontWeight: 600 } }, label),
              h('strong', { style: { color: color, fontFamily: 'ui-monospace, monospace' } }, value.toFixed(0) + '%')),
            h('input', { type: 'range', min: 0, max: 100, value: value,
              onChange: onChange,
              className: 'printingpress-no-print',
              style: { width: '100%', accentColor: color }
            })
          );
        }

        function metricBar(label, value, color) {
          var bar = h('div', { style: { width: '100%', height: 10, background: T.cardAlt, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + T.border } },
            h('div', { style: { width: value + '%', height: '100%', background: color, transition: 'width 0.3s ease' } }));
          return h('div', { style: { marginBottom: 8 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 } },
              h('span', { style: { color: T.muted } }, label),
              h('strong', { style: { color: value > 75 ? T.ok : value > 45 ? T.accentHi : T.warn, fontFamily: 'ui-monospace, monospace' } }, value)),
            bar);
        }

        // Tone palette for assessment box
        var aPalette = ({
          ok: { bg: '#1f3d28', border: T.ok, fg: '#bbf7d0' },
          warn: { bg: '#3d2810', border: T.warn, fg: '#fed7aa' },
          danger: { bg: '#3d1f1f', border: T.danger, fg: '#fecaca' }
        })[a.tone];

        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🔥 Casting Type'),
          dropCapPara('Movable type is the heart of the printing press. Each "sort" (one piece of type for one letter) is a small metal block with a raised mirror-image letter on top. To print a book, you need thousands of identical sorts. Casting type is how you make them.'),

          sectionHeader('🛠️', 'The three-step process (Gutenberg\'s actual innovation)'),
          // Tour control + narration banner (only visible during the tour)
          h('div', { className: 'printingpress-no-print', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
            castingTour && h('div', { 'aria-live': 'polite',
              style: { flex: 1, minWidth: 0, background: 'linear-gradient(90deg, ' + T.accent + ' 0%, ' + T.accentHi + ' 100%)', color: T.ink, padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: 'Georgia, serif' } },
              '🎬 ',
              castingFocus === 0 ? 'Step 1: A punch-cutter carves a mirror-reversed letter into hardened steel. Hours per letter; ~250 letters per font.' :
              castingFocus === 1 ? 'Step 2: The steel punch is hammered into softer copper, leaving a precise impression. One matrix produces thousands of identical sorts.' :
              castingFocus === 2 ? 'Step 3: A hand mold clamps the matrix at the bottom, molten lead-tin-antimony alloy is poured in, the cast cools in seconds. Skilled casters made ~4,000 sorts per day.' :
              ''
            ),
            !castingTour && h('button', {
              onClick: function() {
                setCastingTour(true);
                setCastingFocus(0);
                announce('Casting tour starting. Walking through the three steps.');
              },
              style: btn({ padding: '8px 14px', fontSize: 12, background: T.accentHi, color: T.ink, border: '1px solid ' + T.accentHi, fontWeight: 700 })
            }, '▶ Walk through the steps'),
            castingTour && h('button', {
              onClick: function() { setCastingTour(false); setCastingFocus(null); announce('Casting tour stopped.'); },
              style: btn({ padding: '8px 14px', fontSize: 12, background: T.danger, color: T.text, border: '1px solid ' + T.danger })
            }, '⏸ Stop')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { step: '1. Punch', icon: '🔨', desc: 'A skilled punch-cutter carves a single letter, mirror-reversed, into the end of a hardened steel rod. This is the "punch." It takes hours per letter. Each font needs ~250 punches (uppercase, lowercase, numerals, punctuation, ligatures, accents).',
                svg: function() {
                  return h('svg', { width: '100%', height: 90, viewBox: '0 0 200 90', 'aria-hidden': 'true' },
                    // Hammer above
                    h('rect', { x: 60, y: 8, width: 80, height: 14, rx: 2, fill: '#3a3a3a', stroke: '#1a1410', strokeWidth: 1 }),
                    h('rect', { x: 96, y: 22, width: 8, height: 18, fill: T.wood, stroke: '#3d2914', strokeWidth: 0.5 }),
                    // Motion lines (hammer striking)
                    h('line', { x1: 70, y1: 28, x2: 78, y2: 36, stroke: T.dim, strokeWidth: 1, opacity: 0.5 }),
                    h('line', { x1: 130, y1: 28, x2: 122, y2: 36, stroke: T.dim, strokeWidth: 1, opacity: 0.5 }),
                    // Steel punch rod
                    h('rect', { x: 90, y: 42, width: 20, height: 38, fill: '#8a8a8a', stroke: '#2a2a2a', strokeWidth: 1 }),
                    // Subtle age/wear spots on the punch — small darker
                    // ovals scattered on the steel. A real working punch
                    // was struck hundreds of times and showed surface wear,
                    // pitting, and a slightly oxidized patina. These dots
                    // sell the "this is well-used craft hardware."
                    h('ellipse', { cx: 95, cy: 50, rx: 1.5, ry: 1, fill: '#4a4a4a', opacity: 0.6 }),
                    h('ellipse', { cx: 105, cy: 56, rx: 1, ry: 0.6, fill: '#5a5a5a', opacity: 0.55 }),
                    h('ellipse', { cx: 98, cy: 64, rx: 1.2, ry: 0.8, fill: '#4a4a4a', opacity: 0.6 }),
                    h('ellipse', { cx: 103, cy: 73, rx: 1, ry: 0.7, fill: '#5a5a5a', opacity: 0.5 }),
                    // Letter "A" carved at the bottom (mirror-reversed, so it appears as backwards A)
                    h('text', { x: 100, y: 72, textAnchor: 'middle', fill: '#1a1410', fontSize: 14, fontWeight: 800, fontFamily: 'Georgia, serif', transform: 'translate(200 0) scale(-1 1)' }, 'A'),
                    // Caption
                    h('text', { x: 100, y: 88, textAnchor: 'middle', fill: T.dim, fontSize: 8, fontStyle: 'italic', fontFamily: 'Georgia, serif' }, 'Steel punch (mirror-cut)')
                  );
                }
              },
              { step: '2. Matrix', icon: '⬜', desc: 'The steel punch is hammered into a softer copper bar, leaving a clean letter-shaped impression. This copper bar is the "matrix." One matrix can be used to cast thousands of identical type sorts.',
                svg: function() {
                  return h('svg', { width: '100%', height: 90, viewBox: '0 0 200 90', 'aria-hidden': 'true' },
                    // Copper sheen gradient — locally defined since defs
                    // here are scoped to the inner step SVG. Vertical
                    // gradient: dark-edge copper top, bright polished
                    // center band, dark-edge copper bottom. Reads as a
                    // polished metal bar lit from above.
                    h('defs', null,
                      h('linearGradient', { id: 'pp-matrix-copper', x1: 0, y1: 0, x2: 0, y2: 1 },
                        h('stop', { offset: '0%',  stopColor: '#8a4f1f' }),
                        h('stop', { offset: '25%', stopColor: '#d4914f' }),
                        h('stop', { offset: '50%', stopColor: '#e8a460' }),
                        h('stop', { offset: '75%', stopColor: '#b87333' }),
                        h('stop', { offset: '100%', stopColor: '#5c2f0e' })
                      )
                    ),
                    // Copper bar (matrix) — polished sheen
                    h('rect', { x: 30, y: 40, width: 140, height: 40, fill: 'url(#pp-matrix-copper)', stroke: '#7c4f1f', strokeWidth: 1.5 }),
                    // Bright thin highlight band along the upper edge
                    h('rect', { x: 32, y: 42, width: 136, height: 1.5, fill: '#fef3c7', opacity: 0.6 }),
                    // Letter impression carved into the copper (recessed, dark)
                    h('text', { x: 100, y: 70, textAnchor: 'middle', fill: '#3a1808', fontSize: 24, fontWeight: 800, fontFamily: 'Georgia, serif', transform: 'translate(200 0) scale(-1 1)', style: { filter: 'drop-shadow(0 1px 0 rgba(254,243,199,0.4))' } }, 'A'),
                    // Punch above (small, lifted away after striking)
                    h('rect', { x: 92, y: 14, width: 16, height: 22, fill: '#8a8a8a', stroke: '#2a2a2a', strokeWidth: 0.8 }),
                    h('text', { x: 100, y: 32, textAnchor: 'middle', fill: '#1a1410', fontSize: 8, fontWeight: 800, fontFamily: 'Georgia, serif', transform: 'translate(200 0) scale(-1 1)' }, 'A'),
                    // Arrow showing it was just struck
                    h('path', { d: 'M 100 36 L 100 42 M 96 38 L 100 42 L 104 38', stroke: T.accent, strokeWidth: 1.5, fill: 'none' }),
                    // Caption
                    h('text', { x: 100, y: 88, textAnchor: 'middle', fill: T.dim, fontSize: 8, fontStyle: 'italic', fontFamily: 'Georgia, serif' }, 'Copper matrix (struck impression)')
                  );
                }
              },
              { step: '3. Cast', icon: '🪙', desc: 'A hand-held casting device clamps the matrix at the bottom. Molten type-metal alloy is poured in. It cools in seconds, you knock out the new sort, repeat. A skilled caster could make ~4,000 sorts in a day.',
                svg: function() {
                  return h('svg', { width: '100%', height: 90, viewBox: '0 0 200 90', 'aria-hidden': 'true' },
                    // Hand mold (two halves clamped)
                    h('rect', { x: 60, y: 22, width: 18, height: 50, fill: T.wood, stroke: '#3d2914', strokeWidth: 1 }),
                    h('rect', { x: 122, y: 22, width: 18, height: 50, fill: T.wood, stroke: '#3d2914', strokeWidth: 1 }),
                    // Top brass clamp with funnel opening
                    h('path', { d: 'M 60 22 L 78 22 L 90 12 L 110 12 L 122 22 L 140 22', stroke: '#c9a14a', strokeWidth: 2, fill: '#8a6a30' }),
                    // Cast piece inside (the freshly-cast sort)
                    h('rect', { x: 88, y: 38, width: 24, height: 28, fill: '#5a6a7a', stroke: '#2a2a2a', strokeWidth: 1 }),
                    h('text', { x: 100, y: 56, textAnchor: 'middle', fill: T.parchment, fontSize: 10, fontWeight: 800, fontFamily: 'Georgia, serif', transform: 'translate(200 0) scale(-1 1)' }, 'A'),
                    // Matrix at bottom
                    h('rect', { x: 80, y: 66, width: 40, height: 6, fill: '#b87333', stroke: '#7c4f1f', strokeWidth: 0.8 }),
                    // Molten metal stream (tiny, poured in from above)
                    h('path', { d: 'M 100 4 Q 100 8 100 12', stroke: T.danger, strokeWidth: 2, fill: 'none', opacity: 0.7 }),
                    h('circle', { cx: 100, cy: 8, r: 1.5, fill: T.danger, opacity: 0.8 }),
                    // Caption
                    h('text', { x: 100, y: 88, textAnchor: 'middle', fill: T.dim, fontSize: 8, fontStyle: 'italic', fontFamily: 'Georgia, serif' }, 'Hand mold + matrix + molten alloy')
                  );
                }
              }
            ].map(function(s, i) {
              var focused = castingFocus === i;
              return h('div', { key: i,
                onClick: function() { if (castingTour) { setCastingTour(false); setCastingFocus(null); } },
                style: {
                  background: focused ? '#3d2810' : T.card,
                  border: '2px solid ' + (focused ? T.accentHi : T.border),
                  borderRadius: 10, padding: 12,
                  boxShadow: focused ? '0 0 0 3px rgba(245,215,126,0.35), 0 4px 12px rgba(0,0,0,0.4)' : 'none',
                  transition: 'all 0.3s ease'
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                  h('div', { style: { fontSize: 15, fontWeight: 700, color: focused ? T.accentHi : T.accentHi, fontFamily: 'Georgia, serif' } }, s.step),
                  focused && h('span', { className: 'printingpress-no-print', style: { marginLeft: 'auto', fontSize: 10, color: T.ink, background: T.accentHi, padding: '2px 8px', borderRadius: 999, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '◉ Now')
                ),
                // Inline SVG illustration of the step
                s.svg && h('div', { style: { background: T.cardAlt, borderRadius: 6, padding: 6, marginBottom: 8, border: '1px solid ' + T.border } }, s.svg()),
                h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55 } }, s.desc)
              );
            })
          ),

          calloutBox('info', 'Why this was the breakthrough',
            'Wood-block printing existed in China and Korea centuries before Gutenberg. What Gutenberg actually invented (or perfected) was the punch-matrix-cast workflow that made identical, reusable, mass-produced metal type economically possible in a Western alphabet. Korean movable type used a different process and never displaced wood-block printing in the same way.'),

          // ── Jikji vs Gutenberg side-by-side ──
          // Honest comparison. Korean metal movable type predates Gutenberg
          // by 78 years; the Jikji (1377) is the oldest extant book
          // printed with metal movable type. The question is not whether
          // Gutenberg invented metal type (he did not), but why the
          // Western variant scaled into a continent-changing industry
          // while the Korean did not. The honest answer is alphabet
          // economics — a 250-glyph alphabet supports punch-matrix-cast
          // amortization; a 6,000+ Hanja character set does not.
          sectionHeader('🌏', 'Jikji (1377) vs Gutenberg Bible (1455)'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 } },
              // Jikji card
              h('div', { style: { background: T.cardAlt, borderRadius: 10, padding: 14, borderLeft: '3px solid #c44536' } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 } },
                  h('h4', { style: { margin: 0, fontSize: 15, color: T.accentHi, fontFamily: 'Georgia, serif' } }, 'Jikji'),
                  h('span', { style: { fontSize: 11, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, '1377')
                ),
                h('div', { style: { fontSize: 12, color: T.warn, fontStyle: 'italic', marginBottom: 8 } }, 'Buddhist monks, Heungdeok Temple, Korea'),
                h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55 } },
                  'The oldest extant book printed with metal movable type. 78 years before Gutenberg. Subject: a Buddhist Zen anthology. Surviving copy in the Bibliothèque nationale de France. The casting process was different from Gutenberg\'s — a sand-mold technique, not the steel-punch-into-copper-matrix workflow that scaled.')
              ),
              // Gutenberg card
              h('div', { style: { background: T.cardAlt, borderRadius: 10, padding: 14, borderLeft: '3px solid ' + T.accent } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 } },
                  h('h4', { style: { margin: 0, fontSize: 15, color: T.accentHi, fontFamily: 'Georgia, serif' } }, 'Gutenberg Bible'),
                  h('span', { style: { fontSize: 11, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, '1455')
                ),
                h('div', { style: { fontSize: 12, color: T.warn, fontStyle: 'italic', marginBottom: 8 } }, 'Johannes Gutenberg, Mainz, Germany'),
                h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55 } },
                  '~180 copies of a 1,282-page Latin Bible. Subject: the Vulgate. ~49 copies survive (12 on vellum). The punch-matrix-cast workflow that scaled into a continent-wide industry within 50 years.')
              )
            ),
            // The honest comparison row
            h('div', { style: { marginTop: 14, padding: 12, background: T.bg, borderRadius: 8, border: '1px dashed ' + T.accent } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, 'So why did one scale and the other did not?'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12, color: T.text, lineHeight: 1.6 } },
                h('strong', { style: { color: T.accentHi } }, 'Alphabet size:'),
                h('div', null, 'Korean Hanja used in 1377: ~6,000+ characters. Western Latin alphabet: ~250 glyphs (including caps, lowercase, ligatures, punctuation). The punch-cutting cost amortizes per book printed — a 250-glyph set pays off after ~50-100 books, a 6,000-glyph set never quite does.'),
                h('strong', { style: { color: T.accentHi } }, 'Mold technique:'),
                h('div', null, 'Jikji used sand-mold casting (less repeatable). Gutenberg used the hand-mold + copper matrix (very repeatable). Repeatability matters when you need 50,000 identical sorts.'),
                h('strong', { style: { color: T.accentHi } }, 'Economic context:'),
                h('div', null, 'Korea\'s Joseon dynasty restricted Hangul (the simpler alphabet of ~24 letters, designed by King Sejong in 1443) to limited use. Hanja remained the scholarly script. Western Europe had no such restriction — the Latin alphabet was the de-facto script everywhere print spread.'),
                h('strong', { style: { color: T.accentHi } }, 'Honest summary:'),
                h('div', null, 'Korea invented metal movable type. Gutenberg invented (or perfected) the SYSTEM — alphabet economics + repeatable mold + screw press + oil-based ink + paper supply — that made it scale. Both achievements are real; neither cancels the other.')
              )
            )
          ),

          // ── Anatomy of a single sort ──
          // Most students have never seen a piece of metal type up close.
          // A labeled axonometric diagram makes the physical object
          // concrete before students try to design its alloy.
          sectionHeader('🔍', 'Anatomy of a single sort'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'One piece of metal type, about the size of a fingernail, is more engineered than it looks. Every named part exists for a reason: alignment, stacking, picking up by feel, even running ink. Before designing the alloy, look at what you are casting.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 260px) 1fr', gap: 16, alignItems: 'center' } },
              // Left: SVG diagram of a sort in axonometric view
              h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 8 } },
                h('svg', { viewBox: '0 0 240 320', width: '100%', height: 'auto', style: { maxHeight: 320, display: 'block' }, role: 'img', 'aria-label': 'Labeled axonometric diagram of a single piece of metal type' },
                  h('defs', null,
                    h('linearGradient', { id: 'sortMetal', x1: 0, y1: 0, x2: 1, y2: 0 },
                      h('stop', { offset: '0%', stopColor: '#9a8a6a' }),
                      h('stop', { offset: '50%', stopColor: '#c9b88a' }),
                      h('stop', { offset: '100%', stopColor: '#6a5a3a' })
                    ),
                    h('linearGradient', { id: 'sortMetalTop', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: '#d8c89a' }),
                      h('stop', { offset: '100%', stopColor: '#8a7a5a' })
                    )
                  ),
                  // Front face of the type body (main rectangle)
                  h('polygon', { points: '70,80 140,80 140,290 70,290', fill: 'url(#sortMetal)', stroke: '#3a2a1a', strokeWidth: 1.5 }),
                  // Top face of the type (the letter side, mirror-reversed)
                  h('polygon', { points: '70,80 140,80 170,50 100,50', fill: 'url(#sortMetalTop)', stroke: '#3a2a1a', strokeWidth: 1.5 }),
                  // Right side (depth)
                  h('polygon', { points: '140,80 170,50 170,260 140,290', fill: '#8a7a5a', stroke: '#3a2a1a', strokeWidth: 1.5 }),
                  // The letter face (the printing surface) — a mirror-reversed lowercase 'a'
                  // Rendered as text on the slanted top face
                  h('g', { transform: 'translate(135, 55) skewX(-30) scale(-1 1)' },
                    h('text', { x: 0, y: 18, fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#3a2a1a' }, 'a')
                  ),
                  // Nick — small groove on the front near the foot
                  h('rect', { x: 70, y: 250, width: 70, height: 5, fill: '#3a2a1a' }),
                  // Foot bevel — slightly indented at the very bottom
                  h('polygon', { points: '70,285 140,285 140,290 70,290', fill: '#3a2a1a' }),
                  // Shoulder — the angled bevel just below the face
                  h('line', { x1: 70, y1: 92, x2: 140, y2: 92, stroke: '#3a2a1a', strokeWidth: 0.8, opacity: 0.6 }),
                  // ─── Labels with leader lines ───
                  // Face (top right)
                  h('line', { x1: 160, y1: 55, x2: 215, y2: 30, stroke: T.accentHi, strokeWidth: 1 }),
                  h('circle', { cx: 215, cy: 30, r: 2, fill: T.accentHi }),
                  h('text', { x: 217, y: 28, fontSize: 11, fontFamily: 'Georgia, serif', fill: T.accentHi, fontWeight: 700 }, 'Face'),
                  h('text', { x: 217, y: 39, fontSize: 9, fontFamily: 'Georgia, serif', fill: T.muted }, '(mirror letter)'),
                  // Shoulder
                  h('line', { x1: 140, y1: 92, x2: 200, y2: 100, stroke: T.accentHi, strokeWidth: 1 }),
                  h('circle', { cx: 200, cy: 100, r: 2, fill: T.accentHi }),
                  h('text', { x: 202, y: 104, fontSize: 11, fontFamily: 'Georgia, serif', fill: T.accentHi, fontWeight: 700 }, 'Shoulder'),
                  // Shank (body)
                  h('line', { x1: 140, y1: 170, x2: 210, y2: 175, stroke: T.accentHi, strokeWidth: 1 }),
                  h('circle', { cx: 210, cy: 175, r: 2, fill: T.accentHi }),
                  h('text', { x: 212, y: 179, fontSize: 11, fontFamily: 'Georgia, serif', fill: T.accentHi, fontWeight: 700 }, 'Shank'),
                  h('text', { x: 212, y: 190, fontSize: 9, fontFamily: 'Georgia, serif', fill: T.muted }, '(body)'),
                  // Nick
                  h('line', { x1: 70, y1: 252, x2: 15, y2: 230, stroke: T.accentHi, strokeWidth: 1 }),
                  h('circle', { cx: 15, cy: 230, r: 2, fill: T.accentHi }),
                  h('text', { x: 13, y: 224, fontSize: 11, fontFamily: 'Georgia, serif', fill: T.accentHi, fontWeight: 700, textAnchor: 'end' }, 'Nick'),
                  // Foot
                  h('line', { x1: 100, y1: 290, x2: 60, y2: 310, stroke: T.accentHi, strokeWidth: 1 }),
                  h('circle', { cx: 60, cy: 310, r: 2, fill: T.accentHi }),
                  h('text', { x: 58, y: 314, fontSize: 11, fontFamily: 'Georgia, serif', fill: T.accentHi, fontWeight: 700, textAnchor: 'end' }, 'Foot'),
                  // Height indicator (right side)
                  h('line', { x1: 188, y1: 50, x2: 188, y2: 260, stroke: T.dim, strokeWidth: 0.6, strokeDasharray: '2 2' }),
                  h('line', { x1: 184, y1: 50, x2: 192, y2: 50, stroke: T.dim, strokeWidth: 0.6 }),
                  h('line', { x1: 184, y1: 260, x2: 192, y2: 260, stroke: T.dim, strokeWidth: 0.6 }),
                  h('text', { x: 196, y: 158, fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: T.dim, transform: 'rotate(90, 196, 158)' }, '~ 24 mm'),
                  // Width indicator (bottom)
                  h('line', { x1: 70, y1: 305, x2: 140, y2: 305, stroke: T.dim, strokeWidth: 0.6 }),
                  h('line', { x1: 70, y1: 301, x2: 70, y2: 309, stroke: T.dim, strokeWidth: 0.6 }),
                  h('line', { x1: 140, y1: 301, x2: 140, y2: 309, stroke: T.dim, strokeWidth: 0.6 }),
                  h('text', { x: 105, y: 318, fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: T.dim, textAnchor: 'middle' }, '~ 3-5 mm')
                )
              ),
              // Right: parts descriptions
              h('div', null,
                [
                  { name: 'Face', why: 'The raised letter, mirror-reversed. This is the only part that touches the ink and the paper. Designed to a fraction of a millimeter.' },
                  { name: 'Shoulder', why: 'A small bevel from the face down to the body. Catches stray ink so it does not bleed onto the page during the impression.' },
                  { name: 'Shank (body)', why: 'The bulk of the metal. Has to stand straight up under press pressure, stay dimensionally stable, and pack tightly against neighboring sorts.' },
                  { name: 'Nick', why: 'A small horizontal groove on one side near the foot. The compositor feels for it without looking — it tells which way is up so they do not set a sort upside-down.' },
                  { name: 'Foot', why: 'The flat base. Sometimes split into two parts during casting so the sort sits perfectly flat on the imposing stone. Uneven feet = uneven impression.' },
                  { name: 'Height-to-paper', why: 'The total height from foot to face. In Anglo-American printing this is exactly 0.918 inches (~23.32 mm). EVERY sort in the world has to match this, or some letters press harder than others.' }
                ].map(function(part, i) {
                  return h('div', { key: i, style: { marginBottom: 10, paddingBottom: 10, borderBottom: i === 5 ? 'none' : '1px dashed ' + T.border } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 3 } }, part.name),
                    h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, part.why)
                  );
                })
              )
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'A 1450 print shop kept maybe 100,000 sorts in inventory. Every one was identical in size and height to within a fraction of a millimeter. That dimensional precision, multiplied by 100,000, is the real Gutenberg achievement — not any one sort, but the system that made them all the same.')
          ),

          // ── Right-side-up sort detection game ──
          // Tests the compositor's by-feel orientation skill. The nick must
          // be near the foot on the front side. If the nick is on top, side,
          // or absent, the sort is wrong-way-up and would print upside-down.
          sectionHeader('🎯', 'Find the right-side-up sort'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'A compositor picked up a sort and knew which way was up without looking. They felt for the nick groove near the foot on the front. Try the same skill below: in each row, only one of the four sorts is oriented correctly. Click it.'),
          (function() {
            // Each round defines which slot has the correctly-oriented sort.
            // The other three have the nick in a wrong place (top, side, none).
            // Wrong-orientation positions are fixed per round, deterministic
            // so the same round renders identically across re-renders.
            var ROUNDS = [
              { correct: 1, configs: ['top', 'correct', 'side', 'none'] },
              { correct: 3, configs: ['none', 'top', 'side', 'correct'] },
              { correct: 0, configs: ['correct', 'side', 'none', 'top'] },
              { correct: 2, configs: ['side', 'none', 'correct', 'top'] },
              { correct: 1, configs: ['top', 'correct', 'none', 'side'] }
            ];
            var round = ROUNDS[nickRound % ROUNDS.length];
            var done = nickRound >= ROUNDS.length;
            // Renders one sort with the nick in the specified location.
            function renderSort(config, slotIdx) {
              var isPicked = (nickPicked === slotIdx);
              var revealed = (nickPicked !== null);
              var isCorrect = (slotIdx === round.correct);
              var ringColor = T.border;
              if (revealed) {
                if (isCorrect) ringColor = T.ok;
                else if (isPicked) ringColor = T.danger;
              }
              // Nick position on the SVG:
              //   correct = front face, near the bottom (foot)
              //   top     = front face, near the top (face) — wrong way up
              //   side    = right side, middle — wrong rotation
              //   none    = no nick at all
              var nickRect = null;
              if (config === 'correct') nickRect = h('rect', { x: 12, y: 90, width: 30, height: 4, fill: '#3a2a1a' });
              else if (config === 'top') nickRect = h('rect', { x: 12, y: 30, width: 30, height: 4, fill: '#3a2a1a' });
              else if (config === 'side') nickRect = h('rect', { x: 42, y: 60, width: 4, height: 30, fill: '#3a2a1a' });
              // 'none' = no rect
              return h('button', { key: slotIdx,
                onClick: function() {
                  if (revealed) return;
                  setNickPicked(slotIdx);
                  if (slotIdx === round.correct) setNickScore(nickScore + 1);
                  announce(slotIdx === round.correct ? 'Correct. Nick is at the foot.' : 'Not quite. The right one is now outlined.');
                },
                disabled: revealed,
                'aria-label': 'Sort ' + (slotIdx + 1) + ', nick ' + (config === 'correct' ? 'near foot' : config === 'top' ? 'near top' : config === 'side' ? 'on side' : 'absent'),
                style: {
                  background: T.cardAlt, border: '3px solid ' + ringColor, borderRadius: 8,
                  padding: 8, cursor: revealed ? 'default' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transition: 'all 0.2s ease', minWidth: 80
                }
              },
                h('svg', { viewBox: '0 0 60 120', width: 50, height: 100, 'aria-hidden': 'true' },
                  // Sort body (front face)
                  h('rect', { x: 12, y: 18, width: 30, height: 90, fill: '#c9b88a', stroke: '#3a2a1a', strokeWidth: 1.5 }),
                  // Right side (depth hint)
                  h('polygon', { points: '42,18 50,10 50,100 42,108', fill: '#8a7a5a', stroke: '#3a2a1a', strokeWidth: 1.5 }),
                  // Top (the letter face)
                  h('polygon', { points: '12,18 42,18 50,10 20,10', fill: '#d8c89a', stroke: '#3a2a1a', strokeWidth: 1.5 }),
                  // The letter on the top face (visible as a mirror-reversed glyph)
                  h('text', { x: 28, y: 16, fontSize: 8, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#3a2a1a', transform: 'scale(-1, 1)', textAnchor: 'middle' }, 'a'),
                  // Nick wherever it goes
                  nickRect
                ),
                revealed && isCorrect && h('div', { style: { fontSize: 10, color: T.ok, marginTop: 4, fontWeight: 700 } }, '✓ correct')
              );
            }
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 6 } },
                h('div', { style: { fontSize: 11, color: T.dim, fontFamily: 'ui-monospace, monospace' } },
                  done ? 'Round complete' : ('Round ' + (nickRound + 1) + ' of ' + ROUNDS.length)),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700 } }, 'Score: ' + nickScore + ' / ' + ROUNDS.length)
              ),
              !done && h('div', { className: 'printingpress-no-print', style: { display: 'flex', justifyContent: 'space-around', gap: 8, flexWrap: 'wrap', marginBottom: 10 } },
                round.configs.map(function(c, i) { return renderSort(c, i); })
              ),
              done && h('div', { 'aria-live': 'polite', style: { padding: 14, background: nickScore >= 4 ? '#1f3d28' : '#3d2810', border: '1px solid ' + (nickScore >= 4 ? T.ok : T.warn), borderRadius: 8, color: nickScore >= 4 ? '#bbf7d0' : '#fed7aa', textAlign: 'center', marginBottom: 10 } },
                h('div', { style: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 16, marginBottom: 6 } },
                  'You scored ' + nickScore + ' of ' + ROUNDS.length),
                h('div', { style: { fontSize: 12, fontStyle: 'italic' } },
                  nickScore === ROUNDS.length ? 'A 1450 master would have hired you on the spot.' :
                  nickScore >= 3 ? 'Apprentice level. You would learn the rest in a week of full days.' :
                  'Worth another round. The skill is real and takes practice.')
              ),
              nickPicked !== null && !done && h('div', { 'aria-live': 'polite', style: { padding: 10, background: nickPicked === round.correct ? '#1f3d28' : '#3d2810', border: '1px solid ' + (nickPicked === round.correct ? T.ok : T.warn), borderRadius: 6, color: nickPicked === round.correct ? '#bbf7d0' : '#fed7aa', marginBottom: 10, fontSize: 12, lineHeight: 1.55 } },
                nickPicked === round.correct
                  ? '✓ Yes. The nick groove sits near the foot, on the front. That is the by-feel signal that the sort is right-side-up.'
                  : '✗ The correct sort is the one outlined in green. Its nick is on the front, near the foot. The others have the nick on top, on the side, or missing entirely.'),
              h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                nickPicked !== null && !done && h('button', {
                  onClick: function() { setNickRound(nickRound + 1); setNickPicked(null); },
                  style: btnPrimary({ padding: '8px 14px', fontSize: 12 })
                }, 'Next sort →'),
                done && h('button', {
                  onClick: function() { setNickRound(0); setNickPicked(null); setNickScore(0); },
                  style: btnPrimary({ padding: '8px 14px', fontSize: 12 })
                }, '↻ Play again')
              )
            );
          })(),

          // ── Inventory estimation game ──
          // Most students wildly underestimate. The "aha" reveal is that
          // sorts cannot be reused until a forme is printed AND distributed
          // back, which means you need ~5-10× the per-page count just to
          // keep the press running while sorts are tied up in formes.
          sectionHeader('🎯', 'Guess the inventory'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'A 42-line Gutenberg Bible has about 1,290 pages, set two pages at a time in a forme. Each page averages roughly 2,500 characters. Question: about how many sorts (individual pieces of cast metal type) do you think Gutenberg\'s shop needed in inventory at one time?'),
            h('label', { htmlFor: 'pp-sort-guess', style: { display: 'block', fontSize: 12, color: T.muted, marginBottom: 6 } },
              'Your guess: ',
              h('strong', { style: { color: T.accentHi, fontSize: 18, fontVariantNumeric: 'tabular-nums' } }, sortGuess.toLocaleString()),
              ' sorts'),
            h('input', {
              id: 'pp-sort-guess', type: 'range', min: 100, max: 300000, step: 100,
              value: sortGuess,
              onChange: function(e) { setSortGuess(parseInt(e.target.value, 10)); if (sortRevealed) setSortRevealed(false); },
              className: 'printingpress-no-print',
              disabled: sortRevealed,
              style: { width: '100%', accentColor: T.accent, marginBottom: 10 }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace', marginBottom: 14 } },
              h('span', null, '100'),
              h('span', null, '300,000')
            ),
            !sortRevealed && h('div', { className: 'printingpress-no-print', style: { textAlign: 'center' } },
              h('button', { onClick: function() { setSortRevealed(true); announce('Reveal: about 100,000 sorts.'); },
                style: btnPrimary({ padding: '10px 20px', fontSize: 14 }) }, '🔍 Reveal the answer')
            ),
            sortRevealed && (function() {
              var actual = 100000;
              var diff = sortGuess - actual;
              var off;
              if (Math.abs(diff) < 10000) off = 'within an order of magnitude. Strong call.';
              else if (sortGuess < actual / 5) off = 'a major underestimate. Most people guess far too low.';
              else if (sortGuess < actual) off = 'low but in the right ballpark.';
              else if (sortGuess < actual * 3) off = 'a little high, still ballpark.';
              else off = 'higher than realistic, though some larger shops did approach this.';
              return h('div', { 'aria-live': 'polite', style: { background: 'rgba(127,176,105,0.1)', border: '1px solid ' + T.ok, borderRadius: 8, padding: 14 } },
                h('div', { style: { textAlign: 'center', marginBottom: 12 } },
                  h('div', { style: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia, serif' } }, 'Approximate answer'),
                  h('div', { style: { fontSize: 32, fontWeight: 800, color: T.accentHi, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' } }, '~ 100,000'),
                  h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'individual cast sorts in working inventory'),
                  h('div', { style: { fontSize: 12, color: T.text, marginTop: 8 } },
                    'Your guess of ', h('strong', null, sortGuess.toLocaleString()), ' was ', h('em', null, off))
                ),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.65 } },
                  h('strong', { style: { color: T.text } }, 'Why so many?'),
                  ' A two-page forme might use 5,000 sorts. But once those sorts are locked in the forme, they cannot be reused until the run prints AND someone (often the apprentice) distributes them back to their compartments. With multiple formes in various stages of composing, pressing, and distribution, you need roughly 5 to 10 times the per-forme count just to keep all the presses running. Some sorts (E, T, A) need many more copies than others (Q, X, Z), so the inventory is unevenly distributed across the case.')
              );
            })()
          ),

          sectionHeader('🧪', 'Type metal alloy: a materials science problem'),
          keyPointBlock(
            'Pure lead is too soft (deforms under press pressure). Pure tin shrinks unpredictably as it cools. The genius alloy:',
            [
              { k: 'Lead (~54%)', v: 'Cheap, dense, low melting point (~327°C), pours into fine matrix detail. The bulk of the metal.' },
              { k: 'Tin (~28%)', v: 'Lowers the melting point further (eutectic effect). Improves flow into mold detail.' },
              { k: 'Antimony (~18%)', v: 'The secret ingredient. Antimony EXPANDS slightly as it solidifies — almost unique among metals. This counters the natural shrinkage of lead and tin, so the cast type comes out exactly the right size, with crisp details. Without antimony, no movable type.' }
            ]
          ),

          // ── Interactive Alloy Designer ──
          // Drag the sliders, see the cast quality respond. Real materials
          // science play: each slider tells students something about WHY
          // the historical alloy ratio was what it was.
          sectionHeader('🛠️', 'Alloy Designer (try it)'),
          h('div', { style: { background: T.card, border: '2px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              'Drag the sliders to mix your own type-metal alloy. The quality of the cast — dimensional accuracy, hardness, mold fill, durability — responds in real time. Try going to extremes to see what fails, then dial back to the historical Gutenberg-era target.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 } },
              // Left: sliders + cast preview
              h('div', null,
                alloySlider('Lead (Pb)', leadPct, function(e) { setAlloy('lead', e.target.value); }, '#9ca3af'),
                alloySlider('Tin (Sn)', tinPct, function(e) { setAlloy('tin', e.target.value); }, '#cbd5e1'),
                alloySlider('Antimony (Sb)', antimonyPct, function(e) { setAlloy('antimony', e.target.value); }, T.accentHi),
                h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 } },
                  'Always sums to 100%. Adjusting one slider rebalances the others.'),
                // Reset button
                h('button', { className: 'printingpress-no-print',
                  onClick: function() { setLeadPct(54); setTinPct(28); announce('Alloy reset to historical Gutenberg-era target.'); },
                  style: btn({ marginTop: 10, padding: '6px 12px', fontSize: 12 }) }, '↺ Reset to historical (54/28/18)')
              ),
              // Right: cast quality preview
              h('div', null,
                // Stylized cast letter A. Visual quality degrades with bad alloy:
                // - low antimony: blurred / smaller (shrinkage)
                // - high antimony: cracked
                // - low tin: incomplete (mold fill failure)
                h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 14, textAlign: 'center', marginBottom: 10 } },
                  h('div', { style: { fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Cast preview (one sort)'),
                  // Cast metal sort: linear-gradient simulating cast-metal
                  // sheen (top-left highlight, bottom-right shadow), drop
                  // shadow for elevation, inset shadow for the "stamped"
                  // letter recess. 3D-ish without becoming a Memphis design.
                  h('div', { style: {
                    display: 'inline-block',
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg, #8a98a8 0%, #5a6a7a 50%, #3a4a5a 100%)',
                    border: '2px solid #2a2a2a',
                    borderRadius: 4,
                    boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.4), inset 1px 1px 1px rgba(255,255,255,0.15), 2px 3px 5px rgba(0,0,0,0.45)',
                    transform: 'scale(' + (0.85 + dim / 400) + ')',
                    transition: 'transform 0.3s ease'
                  } },
                    h('div', { style: {
                      fontSize: 56,
                      fontWeight: 800,
                      fontFamily: 'Georgia, serif',
                      // Letter color uses a vertical gradient from black at
                      // the top to slightly less-black at the bottom — gives
                      // the raised letter a subtle "carved out of the metal"
                      // appearance. Black background of the metal recess.
                      background: 'linear-gradient(180deg, #0a0805 0%, #2a1f15 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      lineHeight: 1,
                      filter: dim < 50 ? 'blur(' + (1.5 - dim / 50) + 'px) drop-shadow(0 1px 0 rgba(255,255,255,0.2))' : 'drop-shadow(0 1px 0 rgba(255,255,255,0.25))',
                      opacity: fill < 50 ? 0.4 + fill / 100 : 1,
                      textShadow: antimonyPct > 35 ? '0 0 0 #1a1410, 1px 1px 0 transparent, -1px -1px 0 transparent' : 'none',
                      transition: 'all 0.3s ease'
                    } }, 'A')
                  ),
                  h('div', { style: { fontSize: 11, color: T.dim, marginTop: 6, fontStyle: 'italic' } },
                    dim < 30 ? 'Shrunken, no detail' :
                    dim < 60 ? 'Slight shrinkage, soft edges' :
                    dim < 85 ? 'Acceptable' : 'Crisp')
                ),
                // Quality bars
                metricBar('Dimensional accuracy', dim, dim > 75 ? T.ok : dim > 45 ? T.accentHi : T.warn),
                metricBar('Hardness (resists deformation)', hard, hard > 75 ? T.ok : hard > 45 ? T.accentHi : T.warn),
                metricBar('Mold fill (fine detail)', fill, fill > 75 ? T.ok : fill > 45 ? T.accentHi : T.warn),
                metricBar('Durability (impressions before wear)', dur, dur > 75 ? T.ok : dur > 45 ? T.accentHi : T.warn)
              )
            ),
            // Assessment box
            h('div', { 'aria-live': 'polite',
              style: { marginTop: 14, padding: 12, background: aPalette.bg, border: '1px solid ' + aPalette.border, borderRadius: 8, color: aPalette.fg, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { display: 'block', marginBottom: 4 } }, '🔬 ' + a.label),
              a.text)
          ),

          calloutBox('warn', 'Modern letterpress note',
            'Lead-based type metal is genuinely toxic and was a documented occupational hazard for centuries. Modern letterpress shops use polymer plates or magnesium-based "photopolymer" type instead. If you visit a working press, you are seeing a careful safety setup with ventilation and PPE. The era of casual lead handling is over.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('castingType', 0, {
            prompt: 'A 16th-century type-caster pours an alloy of pure lead and tin (no antimony). The cast sorts come out smaller than the matrix and with rounded letter edges. What is the materials-science explanation?',
            choices: [
              'The matrix was wrong.',
              'Without antimony to counter shrinkage during cooling, the lead-tin alloy contracts as it solidifies, producing undersized sorts with poor edge detail.',
              'The temperature was too high.',
              'The mold was dirty.'
            ],
            correct: 1,
            explain: 'Antimony is one of very few metals that expands slightly on solidification. Without it, the natural shrinkage of cooling lead and tin pulls the cast away from the matrix walls, losing detail and dimension. This is a real and elegant materials-science principle that made movable type practical.'
          }),
          scenarioCard('castingType', 1, {
            prompt: 'Why do you need ~250 punches to make a single typeface, even though the alphabet has only 26 letters?',
            choices: [
              'Because punches break easily.',
              'Because you need uppercase, lowercase, numerals, punctuation, ligatures (like "fi" and "fl"), accented characters, and small caps. The full glyph set for a Western typeface is ~250 distinct shapes.',
              'For aesthetic variety.',
              'Because of mistakes.'
            ],
            correct: 1,
            explain: '~250 distinct glyphs per typeface. Modern OpenType fonts often have 600+ glyphs to cover full Unicode language coverage, but the Renaissance-era count was already substantial. Each one was hand-cut by a punch-cutter — months of skilled work per typeface.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('castingType', [
            { q: 'The three-step process for making movable type is:', opts: ['Carve, paint, fire', 'Punch (steel), matrix (copper), cast (alloy poured into matrix)', 'Mold, fire, sand', 'Print, copy, distribute'], ans: 1, explain: 'Punch → matrix → cast. The hardened steel punch is hammered into copper to make a matrix; molten type metal is then cast in the matrix to produce identical sorts.' },
            { q: 'What does antimony contribute to type metal?', opts: ['Color', 'Antimony expands slightly as it solidifies, counteracting the shrinkage of lead and tin so the cast type comes out the right size with crisp detail', 'It lowers the melting point', 'It is decorative'], ans: 1, explain: 'Antimony is one of very few metals that expands on solidification. This is what makes a lead-tin-antimony alloy uniquely suited to casting type with sharp dimensional accuracy.' },
            { q: 'Why was metal movable type a Western breakthrough but not a Korean / Chinese one?', opts: ['Asians could not work metal', 'Chinese and Korean writing has thousands of characters, not ~250 — the Western alphabet made the punch-matrix-cast economics work', 'It was illegal in Asia', 'No reason'], ans: 1, explain: 'Korean movable type DID exist in metal (the Jikji, 1377, predates Gutenberg by 78 years). But scaling it to a writing system with thousands of characters was uneconomic. The Western alphabet\'s small character count made movable-type mass production financially viable.' }
          ]),

          sourcesBlock([
            { label: 'Smithsonian — How Movable Type Was Made', url: 'https://www.si.edu/spotlight/printing' },
            { label: 'Briar Press — Type-casting glossary', url: 'https://www.briarpress.org/' },
            { label: 'Theodore Low De Vinne, "The Practice of Typography" (1900)' },
            { label: 'Cheongju Early Printing Museum (Korea) — Jikji history', url: 'https://www.cjcityart.or.kr/' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.castingType),
          crossLinkFooter('castingType'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 4 — PRINT RUN ECONOMICS (interactive calculator)
      // ═════════════════════════════════════════════════════════════════════
      function renderEconomics() {
        var copiesRaw = useState(180);  // Gutenberg printed ~180 Bibles
        var copies = copiesRaw[0], setCopies = copiesRaw[1];
        // Pamphlet-reach state. 'reachCopies' is independent of the worker-years
        // 'copies' slider so students can model a small pamphlet run (50 copies)
        // without changing the Bible-scale calculator above.
        var reachCopiesRaw = useState(500);
        var reachCopies = reachCopiesRaw[0], setReachCopies = reachCopiesRaw[1];
        var readersPerCopyRaw = useState(8);
        var readersPerCopy = readersPerCopyRaw[0], setReadersPerCopy = readersPerCopyRaw[1];
        var passingRoundsRaw = useState(3);
        var passingRounds = passingRoundsRaw[0], setPassingRounds = passingRoundsRaw[1];

        // Hand-copying a Bible: ~1 year for a single scribe (well-documented)
        var SCRIBE_YEARS_PER_COPY = 1;
        // Gutenberg press for the Bible: ~3 years for a 6-press shop with ~12 workers
        // Per copy, that's about (3 years × 12 workers) / 180 copies ≈ 0.2 worker-years
        var PRESS_WORKER_YEARS_PER_COPY = 0.2;

        var scribeWorkerYears = copies * SCRIBE_YEARS_PER_COPY;
        var pressWorkerYears = Math.max(2, copies * PRESS_WORKER_YEARS_PER_COPY);  // setup floor
        var speedup = (scribeWorkerYears / pressWorkerYears).toFixed(1);

        // Cost-per-book (rough historical estimates in 2026 USD-equivalent)
        // Hand-copied Bible ~1450: ~3 years' wages for a craftsman, ~$60,000 today
        // Gutenberg Bible 1455: equivalent to ~$5,000 today (still expensive)
        // Printed Bible 1500: ~$500 today
        // Printed book 1600: ~$50 today
        var COSTS = [
          { era: 'Hand-copied (pre-1450)', cost: 60000, color: T.danger },
          { era: 'Gutenberg Bible (1455)', cost: 5000, color: T.warn },
          { era: 'Printed book (1500)', cost: 500, color: T.accent },
          { era: 'Printed book (1600)', cost: 50, color: T.ok },
          { era: 'Mass-market paperback today', cost: 12, color: T.dim }
        ];
        var maxCost = COSTS[0].cost;

        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('💰 Print Run Economics'),
          dropCapPara('The press did not just make books faster. It collapsed the cost-per-book by orders of magnitude over 150 years. That collapse is what made literacy mass instead of elite, and the Reformation, the scientific revolution, and the modern public possible.'),

          // ── Interactive calculator ──
          sectionHeader('🧮', 'Hand-copying vs printing — calculator'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('label', { htmlFor: 'pp-copies', style: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: T.text } },
              'How many copies? ',
              h('strong', { style: { color: T.accentHi, fontSize: 18 } }, copies.toLocaleString())),
            h('input', {
              id: 'pp-copies', type: 'range', min: 1, max: 1000, step: 1,
              value: copies,
              onChange: function(e) { setCopies(parseInt(e.target.value, 10)); },
              className: 'printingpress-no-print',
              style: { width: '100%', accentColor: T.accent }
            }),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 } },
              h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.danger, borderRadius: 10, padding: 12 } },
                h('div', { style: { fontSize: 11, color: T.danger, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'By hand (scribes)'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.text, marginTop: 4 } },
                  scribeWorkerYears.toLocaleString() + ' worker-years'),
                h('div', { style: { fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.5 } },
                  '1 scribe per Bible, ~1 year per copy. ',
                  copies + ' scribes working ' + SCRIBE_YEARS_PER_COPY + ' year each.')),
              h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.ok, borderRadius: 10, padding: 12 } },
                h('div', { style: { fontSize: 11, color: T.ok, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'By press (Gutenberg-era)'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.text, marginTop: 4 } },
                  pressWorkerYears.toFixed(1) + ' worker-years'),
                h('div', { style: { fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.5 } },
                  '~12 workers, ~3 years for a print run, plus 2-year setup floor.'))
            ),
            // Speedup factor: stamped-medallion treatment. The number is
            // wrapped in a circular SVG seal (concentric gold rings + dotted
            // outer ring + radial gradient core) like a notarial wax stamp.
            // Reads as "official figure" rather than "data label," matching
            // the editorial weight of the cost-collapse argument.
            h('div', { style: { marginTop: 14, padding: 14, background: 'rgba(201,161,74,0.08)', borderRadius: 10, border: '1px solid ' + T.accent, textAlign: 'center', position: 'relative' } },
              h('div', { style: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700, fontFamily: 'Georgia, serif' } }, 'Speedup factor'),
              // Wrapper div carries the medallion-pop animation class. We
              // also use a `key` derived from `speedup` so React re-mounts
              // the element when the value changes, retriggering the animation.
              // Without the key change, the className stays the same string
              // and the keyframe wouldn't replay on slider movement.
              h('div', { key: 'medallion-' + speedup,
                className: 'printingpress-medallion',
                style: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 } },
                h('svg', { width: 110, height: 110, viewBox: '0 0 110 110', 'aria-hidden': 'true',
                  style: { display: 'block' } },
                  // Outer dotted ring (notarial-stamp style)
                  h('circle', { cx: 55, cy: 55, r: 52, fill: 'none', stroke: T.accent, strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.7 }),
                  // Outer thick ring
                  h('circle', { cx: 55, cy: 55, r: 47, fill: 'none', stroke: T.accent, strokeWidth: 2 }),
                  // Inner thin ring
                  h('circle', { cx: 55, cy: 55, r: 42, fill: 'none', stroke: T.accent, strokeWidth: 0.6, opacity: 0.6 }),
                  // Central seal (radial gradient gives an embossed, wax-like feel)
                  h('defs', null,
                    h('radialGradient', { id: 'pp-seal-fill', cx: '40%', cy: '35%' },
                      h('stop', { offset: '0%', stopColor: '#fef3c7' }),
                      h('stop', { offset: '60%', stopColor: T.accentHi }),
                      h('stop', { offset: '100%', stopColor: '#9a7a1f' })
                    )
                  ),
                  h('circle', { cx: 55, cy: 55, r: 38, fill: 'url(#pp-seal-fill)', stroke: '#9a7a1f', strokeWidth: 0.5 }),
                  // Decorative fleurons at the cardinal points (between rings)
                  [[55, 8], [102, 55], [55, 102], [8, 55]].map(function(c, i) {
                    return h('g', { key: i, transform: 'translate(' + c[0] + ',' + c[1] + ')' },
                      h('path', { d: 'M 0 -2.5 L 2 0 L 0 2.5 L -2 0 Z', fill: T.accent }),
                      h('circle', { cx: 0, cy: -3.5, r: 0.6, fill: T.accent }),
                      h('circle', { cx: 0, cy: 3.5, r: 0.6, fill: T.accent }),
                      h('circle', { cx: -3.5, cy: 0, r: 0.6, fill: T.accent }),
                      h('circle', { cx: 3.5, cy: 0, r: 0.6, fill: T.accent })
                    );
                  }),
                  // The speedup number — large, ink-dark, serif, centered.
                  // y-position tuned so multi-digit numbers stay vertically centered.
                  h('text', { x: 55, y: 64, textAnchor: 'middle',
                    fontSize: speedup.length > 4 ? 22 : 28,
                    fontWeight: 800, fontFamily: 'Georgia, serif',
                    fill: T.ink }, speedup + '×')
                )
              ),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                'The press is roughly ', h('strong', { style: { color: T.text } }, speedup + ' times faster'),
                ' than hand-copying for ' + copies + ' copies.')),

            // ── Books-stack visualization ──
            // A visual pile that grows with the slider. Each book icon = 1
            // copy, capped at 50 visible icons; remainder shown as "+N more"
            // so the visualization doesn't overflow at high slider values
            // but the absolute number stays honest.
            (function() {
              var ICON_CAP = 50;
              var visibleBooks = Math.min(copies, ICON_CAP);
              var overflow = Math.max(0, copies - ICON_CAP);
              var COLS = 10;
              return h('div', { style: { marginTop: 14, padding: 14, background: T.cardAlt, borderRadius: 8, border: '1px solid ' + T.border } },
                h('div', { style: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700, textAlign: 'center' } },
                  'Visualizing ' + copies.toLocaleString() + ' ' + (copies === 1 ? 'copy' : 'copies') + (overflow > 0 ? ' (' + ICON_CAP + ' shown)' : '')),
                h('div', { 'aria-hidden': 'true',
                  style: { display: 'grid', gridTemplateColumns: 'repeat(' + COLS + ', 1fr)', gap: 4, justifyItems: 'center', minHeight: 60 } },
                  Array.apply(null, { length: visibleBooks }).map(function(_, bi) {
                    // Vary book color, spine, height, and rotation slightly
                    // so the stack looks like a hand-shelved warehouse, not
                    // a pixel grid. Deterministic from book index so the
                    // chaos is stable across re-renders (no rerolls when
                    // slider moves).
                    var palette = [
                      { bg: '#7c2d12', spine: '#c9a14a' },
                      { bg: '#1f3d28', spine: '#bbf7d0' },
                      { bg: '#3d2914', spine: '#f5e8c8' },
                      { bg: '#1a3a52', spine: '#cbd5e1' },
                      { bg: '#5a4036', spine: '#fed7aa' }
                    ][bi % 5];
                    // Pseudo-random per-book chaos derived from index
                    var heightVariation = (bi * 37) % 5;  // 0..4 px taller
                    var bookH = 22 + heightVariation;
                    var rotation = ((bi * 17) % 7) - 3;  // -3 to +3 degrees
                    return h('svg', { key: bi, width: 16, height: bookH + 4,
                      viewBox: '0 0 16 ' + (bookH + 4),
                      style: {
                        transition: 'opacity 0.2s ease', opacity: 0.95,
                        transform: 'rotate(' + rotation + 'deg)',
                        transformOrigin: '50% 100%',
                        filter: 'drop-shadow(1px 1px 1.5px rgba(0,0,0,0.5))'
                      } },
                      // Book cover (vertical, like a shelved book)
                      h('rect', { x: 1, y: 1, width: 14, height: bookH,
                        fill: palette.bg, stroke: '#1a1410', strokeWidth: 0.5, rx: 1 }),
                      // Page edges (right side, light cream)
                      h('rect', { x: 14, y: 2, width: 1.5, height: bookH - 2,
                        fill: '#e8d4b0', opacity: 0.7 }),
                      // Spine accents
                      h('rect', { x: 1, y: 4, width: 14, height: 1.5, fill: palette.spine }),
                      h('rect', { x: 1, y: bookH - 4, width: 14, height: 1.5, fill: palette.spine }),
                      // Tiny title hint
                      h('rect', { x: 5, y: bookH * 0.4, width: 6, height: 0.8, fill: palette.spine, opacity: 0.7 }),
                      h('rect', { x: 5, y: bookH * 0.5, width: 6, height: 0.8, fill: palette.spine, opacity: 0.7 })
                    );
                  })
                ),
                overflow > 0 && h('div', { style: { fontSize: 12, color: T.accentHi, fontWeight: 700, textAlign: 'center', marginTop: 8, fontFamily: 'Georgia, serif' } },
                  '+ ' + overflow.toLocaleString() + ' more (each icon represents 1 book)')
              );
            })()
          ),

          // ── Cost-per-book over time ──
          sectionHeader('📉', 'Cost-per-book collapse, 1450 to today'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              'Approximate per-book cost in 2026 USD-equivalent. Estimates from economic history scholarship (Eltjo Buringh, Jan Luiten van Zanden — book production data 800-1800).'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              COSTS.map(function(c, i) {
                var pct = Math.max(2, (c.cost / maxCost) * 100);
                return h('div', { key: i },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text, marginBottom: 2 } },
                    h('span', null, c.era),
                    h('strong', { style: { color: c.color } }, '$' + c.cost.toLocaleString())),
                  h('div', { style: { width: '100%', height: 14, background: T.cardAlt, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + T.border } },
                    h('div', { style: { width: pct + '%', height: '100%', background: c.color } }))
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
              'A roughly 5,000-fold cost reduction in 150 years. For comparison, computing power per dollar reduced by a similar factor over a comparable timespan in the late 20th century.')
          ),

          // ── Pamphlet reach calculator ──
          // Cost-per-book is one leverage axis. Reach-per-copy is the
          // other. A 1450 pamphlet did not stop at the printed copy; it
          // was lent, read aloud in taverns and pulpits, and passed on.
          // This makes the multiplier explicit.
          sectionHeader('\u{1F4E2}', 'Pamphlet reach calculator'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 14px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'A printed pamphlet did not stop at the buyer. It was lent, read aloud in taverns and town squares, posted on church doors, copied by hand, and re-printed in other cities. The reach multiplier is what made Luther\u2019s 95 Theses reach Rome inside three months. Try the math.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 } },
              // Slider 1: copies printed
              h('div', null,
                h('label', { htmlFor: 'pp-reach-copies', style: { display: 'block', fontSize: 12, color: T.muted, marginBottom: 6 } },
                  'Copies printed: ',
                  h('strong', { style: { color: T.accentHi, fontSize: 16, fontVariantNumeric: 'tabular-nums' } }, reachCopies.toLocaleString())),
                h('input', {
                  id: 'pp-reach-copies', type: 'range', min: 50, max: 5000, step: 50,
                  value: reachCopies,
                  onChange: function(e) { setReachCopies(parseInt(e.target.value, 10)); },
                  className: 'printingpress-no-print',
                  style: { width: '100%', accentColor: T.accent }
                }),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4, fontStyle: 'italic' } },
                  'Luther\u2019s 95 Theses ran ~300,000 copies in three years. A typical Reformation pamphlet ran 500\u20131,500.')
              ),
              // Slider 2: readers per copy
              h('div', null,
                h('label', { htmlFor: 'pp-readers', style: { display: 'block', fontSize: 12, color: T.muted, marginBottom: 6 } },
                  'Readers per copy: ',
                  h('strong', { style: { color: T.accentHi, fontSize: 16, fontVariantNumeric: 'tabular-nums' } }, readersPerCopy)),
                h('input', {
                  id: 'pp-readers', type: 'range', min: 1, max: 30, step: 1,
                  value: readersPerCopy,
                  onChange: function(e) { setReadersPerCopy(parseInt(e.target.value, 10)); },
                  className: 'printingpress-no-print',
                  style: { width: '100%', accentColor: T.accent }
                }),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4, fontStyle: 'italic' } },
                  'In 1500 literacy was rare, so reading aloud was normal. One copy in a tavern might reach 10\u201320 hearers per evening.')
              ),
              // Slider 3: passing rounds
              h('div', null,
                h('label', { htmlFor: 'pp-rounds', style: { display: 'block', fontSize: 12, color: T.muted, marginBottom: 6 } },
                  'Passing rounds: ',
                  h('strong', { style: { color: T.accentHi, fontSize: 16, fontVariantNumeric: 'tabular-nums' } }, passingRounds)),
                h('input', {
                  id: 'pp-rounds', type: 'range', min: 1, max: 6, step: 1,
                  value: passingRounds,
                  onChange: function(e) { setPassingRounds(parseInt(e.target.value, 10)); },
                  className: 'printingpress-no-print',
                  style: { width: '100%', accentColor: T.accent }
                }),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4, fontStyle: 'italic' } },
                  'Each round, the pamphlet finds new audiences \u2014 read aloud somewhere else, lent to a neighbor, reprinted in another town.')
              )
            ),
            // Output computation. Halve the readers each subsequent round
            // (diminishing returns) to keep the model honest \u2014 reach grows
            // fast but not exponentially forever.
            (function() {
              var total = 0;
              for (var r = 1; r <= passingRounds; r++) {
                // Round r reach contribution: copies * readersPerCopy * decay^(r-1)
                total += reachCopies * readersPerCopy * Math.pow(0.6, r - 1);
              }
              total = Math.round(total);
              // Modern comparison: an average viral social-media post in 2026
              // reaches roughly 1.5M unique viewers (rough order-of-magnitude).
              var modernViral = 1500000;
              var ratio = total > 0 ? (modernViral / total) : 0;
              // Maine context: state population is ~1.4M (2026).
              var mainePop = 1400000;
              var mainePct = (total / mainePop * 100);
              return h('div', { style: { background: 'rgba(201,161,74,0.08)', border: '1px solid ' + T.accent, borderRadius: 10, padding: 16, textAlign: 'center' } },
                h('div', { style: { fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Estimated total reach'),
                h('div', { style: { fontSize: 36, fontWeight: 800, color: T.accentHi, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 8 } },
                  total.toLocaleString()),
                h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10 } },
                  'people hear the idea (printed readers + listeners across ' + passingRounds + ' rounds, with diminishing returns)'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                  h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 6, padding: 8 } },
                    h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'Maine population today'),
                    h('div', { style: { fontSize: 13, color: T.text, fontWeight: 600 } },
                      mainePct >= 1 ? (mainePct.toFixed(1) + '% of Maine (1.4M)') : ('< 1% of Maine (1.4M)'))
                  ),
                  h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 6, padding: 8 } },
                    h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'Viral social post 2026'),
                    h('div', { style: { fontSize: 13, color: T.text, fontWeight: 600 } },
                      ratio >= 1 ? (Math.round(ratio).toLocaleString() + '\u00D7 more reach today (~1.5M)') : ('Your pamphlet reaches ' + Math.round(1 / ratio) + '\u00D7 more than a viral post'))
                  )
                )
              );
            })(),
            h('p', { style: { margin: '14px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Real history: Luther\u2019s 95 Theses (Oct 1517) reached Rome by Dec 1517. Distance ~750 miles. The mechanism was exactly this multiplier \u2014 print + read-aloud + reprint, in dozens of cities, all in three months. No army or institution could keep up with the spread.')
          ),

          calloutBox('info', 'Why this matters historically',
            'A hand-copied Bible cost roughly 3 years of a craftsman\'s wages — only the wealthiest churches and nobles owned one. Within 50 years of Gutenberg, a printed Bible was within reach of merchants and parish priests. Within 150 years, printed books were affordable to literate working people. This is the prerequisite for: vernacular Bible reading (Reformation), scientific publication (the Royal Society), newspapers, the public sphere, and modern literacy itself.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('economics', 0, {
            prompt: 'A 1455 monastery wants 50 copies of a particular Latin commentary. Hand-copying (5 scribes, 10 years) vs printing (rent a press for 6 months). Which approach makes economic sense?',
            choices: [
              'Hand-copying — printing was an unproven novelty.',
              'Printing — even with the press setup costs, it produces 50 copies in months instead of decades. The break-even for a printed run was around 50-100 copies.',
              'Neither — buy them ready-made.',
              'Split the work.'
            ],
            correct: 1,
            explain: 'The break-even for printing vs hand-copying was around 50-100 copies in the Gutenberg era, depending on book size. Above that threshold, printing was cheaper per copy AND faster in calendar time. Below it, hand-copying was still competitive. This economics drove early printers to focus on bestsellers (Bibles, breviaries, classical texts).'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('economics', [
            { q: 'Approximately how long did a single scribe take to hand-copy a complete Bible?', opts: ['One month', 'About one year', 'About ten years', 'A few weeks'], ans: 1, explain: '~1 year of full-time work for a skilled scribe. The Bible is ~750,000 words, and a scribe could produce ~3,000 high-quality words per day with illumination and proofing.' },
            { q: 'About what was the break-even point (copies) for printing vs hand-copying in the early Gutenberg era?', opts: ['10 copies', '50 to 100 copies', '1,000 copies', '10,000 copies'], ans: 1, explain: 'Around 50-100 copies. Below that, hand-copying was competitive on per-copy cost. This is why early printers concentrated on titles with predictable demand of hundreds of copies.' },
            { q: 'Roughly how much did the cost of a book fall between 1450 and 1600?', opts: ['Halved', 'Roughly 100-fold', 'Roughly 1,000-fold or more', 'No change'], ans: 2, explain: 'Roughly 1,000-fold or more in real terms. A late-medieval hand-copied Bible cost a craftsman ~3 years\' wages. By 1600, a printed book was within range of a working week\'s wages. This collapse is the economic prerequisite for the Reformation and the scientific revolution.' }
          ]),

          sourcesBlock([
            { label: 'Eltjo Buringh & Jan Luiten van Zanden — "Charting the Rise of the West" (book production data 800-1800)', url: 'https://www.jstor.org/stable/40208712' },
            { label: 'Library of Congress — Economic history of printing', url: 'https://www.loc.gov/' },
            { label: 'Elizabeth Eisenstein, "The Printing Press as an Agent of Change" (1980)' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.economics),
          crossLinkFooter('economics'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 5 — BEFORE & AFTER
      // ═════════════════════════════════════════════════════════════════════
      function renderBeforeAfter() {
        // Selected timeline event index. null = no event expanded.
        var selectedEventRaw = useState(null);
        var selectedEvent = selectedEventRaw[0], setSelectedEvent = selectedEventRaw[1];
        // Reformation spread animation state. 0 = not started, 1+ = months elapsed.
        var spreadMonthRaw = useState(0);
        var spreadMonth = spreadMonthRaw[0], setSpreadMonth = spreadMonthRaw[1];
        var spreadPlayingRaw = useState(false);
        var spreadPlaying = spreadPlayingRaw[0], setSpreadPlaying = spreadPlayingRaw[1];
        useEffect(function() {
          if (!spreadPlaying) return;
          if (spreadMonth >= 12) { setSpreadPlaying(false); return; }
          var to = setTimeout(function() { setSpreadMonth(spreadMonth + 1); }, 600);
          return function() { clearTimeout(to); };
        }, [spreadPlaying, spreadMonth]);
        // Primary-source reading exercise state — which thesis the student
        // has selected to read + answer panel reveal flag.
        var thesisIdxRaw = useState(0);
        var thesisIdx = thesisIdxRaw[0], setThesisIdx = thesisIdxRaw[1];
        var thesisReveal = useState(false);
        var psReveal = thesisReveal[0], setPsReveal = thesisReveal[1];
        // PRINT_EVENTS: interactive milestones, 1377-1827. Sorted ascending.
        // Each event names what was printed, who made it happen, and why
        // print specifically (not just the idea) was the load-bearing piece.
        var PRINT_EVENTS = [
          { year: 1377, title: 'Jikji (Korea)', who: 'Buddhist monks at Heungdeok Temple',
            why: 'The oldest extant book printed with metal movable type — 78 years before Gutenberg. Gutenberg\'s breakthrough was the Western alphabet\'s economics (~250 glyphs), not the underlying idea of metal type.',
            url: 'https://www.cjcityart.or.kr/' },
          { year: 1455, title: 'Gutenberg Bible (42-line Bible)', who: 'Johannes Gutenberg, Mainz',
            why: 'The first major book printed with movable metal type in Europe. ~180 copies; ~49 survive today (12 on vellum). The technical demonstration that the punch-matrix-cast workflow worked at scale.',
            url: 'https://www.bl.uk/treasures/gutenberg/homepage.html' },
          { year: 1494, title: 'Aldine Press founded', who: 'Aldus Manutius, Venice',
            why: 'Pioneered the small octavo (pocket) format and italic type. Made scholarly Greek and Latin classics portable and affordable for the first time. The original paperback model.' },
          { year: 1517, title: 'The 95 Theses', who: 'Martin Luther, Wittenberg',
            why: 'Printed within weeks, circulated across Germany, then Europe. Within 3 months printed in dozens of cities. The Reformation IS a print event — earlier reformers (Wycliffe, Hus) made similar arguments and were locally suppressed.' },
          { year: 1543, title: 'De revolutionibus + De humani corporis fabrica', who: 'Copernicus + Vesalius',
            why: 'Two foundational scientific works in the same year. Print enabled standardized anatomical illustrations and reproducible astronomical tables — for the first time, scholars in different cities could refer to "Figure 7" and know they meant the same thing.' },
          { year: 1605, title: 'Don Quixote, Part 1', who: 'Miguel de Cervantes, Madrid',
            why: 'The first modern novel — a long prose narrative written specifically for a mass print audience. Cervantes died poor in 1616; his pirated unauthorized editions outsold authorized ones. Modern intellectual property law starts here.' },
          { year: 1611, title: 'King James Bible (Authorized Version)', who: 'Forty-seven scholars, England',
            why: 'A vernacular English Bible printed at industrial scale shaped English-language literature for 300 years. Combined with William Tyndale\'s 1526 New Testament (printed before Tyndale was burned at the stake) — the printable vernacular Bible was the spark, then the fuel.' },
          { year: 1665, title: 'Philosophical Transactions', who: 'Royal Society, London',
            why: 'The first scientific journal. Print made publication-as-proof-of-priority possible: who discovered what, dated and citable. Modern scientific publishing descends directly from this.' },
          { year: 1690, title: 'Publick Occurrences', who: 'Benjamin Harris, Boston',
            why: 'The first multi-page newspaper in the American colonies. Suppressed after one issue by the colonial governor — but the precedent stuck. Within 50 years there were dozens of colonial newspapers feeding revolutionary discourse.' },
          { year: 1776, title: 'Common Sense', who: 'Thomas Paine, Philadelphia',
            why: '~150,000 copies in a colonial population of ~2.5 million. Per capita, one of the best-selling political pamphlets in American history. The American Revolution was a print event as much as a military one.' },
          // ── Maine local-history pegs (King Middle / Portland audience) ──
          // `local: true` flag tags these for distinct rendering on the
          // timeline (slightly larger marker, evergreen color) so the
          // Portland connection visually stands out from the global events.
          { year: 1785, title: 'Falmouth Gazette and Weekly Advertiser', who: 'Thomas Wait + Benjamin Titcomb, Falmouth (now Portland), MA',
            local: true,
            why: 'The first newspaper in what would become Maine — published in Falmouth, the town that would be renamed Portland in 1786. Maine was still part of Massachusetts; the Falmouth Gazette helped build the political case for separate statehood, achieved 35 years later in 1820. King Middle stands less than two miles from where this press operated.',
            url: 'https://www.maine.gov/portal/government/state_history.html' },
          { year: 1827, title: 'Cherokee Phoenix (Cherokee syllabary in print)', who: 'Sequoyah + Elias Boudinot',
            why: 'Sequoyah\'s 86-character Cherokee syllabary made literacy spread among the Cherokee Nation faster than literacy had ever spread anywhere. Print + a writing system designed for the language unlocked mass literacy in a generation.',
            url: 'https://www.loc.gov/item/sn83025118/' },
          { year: 1830, title: 'Steam-powered cylinder press', who: 'Friedrich Koenig (earlier 1814 with The Times of London)',
            why: 'By 1830 the steam press had taken over major newspapers. Production jumped from ~250 impressions per day (Gutenberg-era) to ~1,000 per HOUR. The penny press became economically viable and mass-market journalism began.' },
          { year: 1820, title: 'Maine becomes a state (Missouri Compromise)', who: 'Maine separation from Massachusetts',
            local: true,
            why: 'Maine entered the Union as the 23rd state, paired with Missouri\'s slave-state admission. The push for separate statehood had been argued in Maine\'s newspapers (notably the Falmouth Gazette) for 35 years before it succeeded. The Missouri Compromise paired a free state (Maine) with a slave state (Missouri) — a fragile 30-year truce that print debate would eventually unravel. Maine\'s statehood was a print-built political achievement.' },
          { year: 1851, title: 'Uncle Tom\'s Cabin', who: 'Harriet Beecher Stowe, Brunswick, Maine',
            local: true,
            why: 'Stowe wrote it in Brunswick, Maine, while her husband taught at Bowdoin College. Serialized in The National Era, then 300,000 copies in its first US year as a book — the most-printed novel of the 19th century. Lincoln allegedly told Stowe she was "the little woman who started this great war." A Maine kitchen produced one of the most consequential books in American history.',
            url: 'https://www.bowdoin.edu/sites/harriet-beecher-stowe-house/' }
        ];
        var minYear = 1370, maxYear = 1860;
        function yearToPct(y) { return ((y - minYear) / (maxYear - minYear)) * 100; }
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('📜 Before & After'),
          dropCapPara('The press did not just print books. It restructured European intellectual life. Within 150 years it enabled the Reformation, the scientific revolution, vernacular literacy, the modern public sphere, and arguably the modern self.'),

          // ── What the standard story leaves out ──
          // The Eurocentric "Gutenberg invented printing" narrative is the
          // default in U.S. textbooks. Naming the gaps respects student
          // perspectives and addresses real historiographic concerns.
          sectionHeader('🌏', 'What the standard story leaves out'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.warn, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
              'The narrative most U.S. textbooks tell is "Gutenberg invented printing in 1450." That is incomplete. Gutenberg invented the system that scaled printing for European alphabets in Europe. Printing as a concept and a practice is older and broader. The honest version names where else printing happened, and why those traditions did not produce the same explosive scale.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              [
                { region: 'Tang Dynasty China', dates: '~600s–1000s',
                  what: 'Block printing on paper. The Diamond Sutra (868 CE) is the oldest dated, complete printed book that survives. Buddhist texts, calendars, paper money, and astronomical charts were mass-produced for centuries before Gutenberg.',
                  why: 'Chinese writing uses thousands of characters, not 26. Wood-block printing scales for fixed texts but movable type becomes uneconomic when each block holds 1,000-2,000 different glyphs. Block printing thrived; movable type did not displace it.' },
                { region: 'Song Dynasty China', dates: '~1040s',
                  what: 'Bi Sheng invented movable clay type around 1040 CE, 400 years before Gutenberg. Wang Zhen experimented with wooden movable type around 1297.',
                  why: 'Same economic constraint as block printing: too many distinct characters for movable type to beat blocks. Bi Sheng\'s invention worked but did not scale.' },
                { region: 'Goryeo and Joseon Korea', dates: '1234–1377',
                  what: 'Metal movable type used for Sangjeong Gogeum Yemun (1234, lost) and the Jikji (1377, survives in Paris). Korea was casting metal type 78 years before Gutenberg.',
                  why: 'Korean scholarly writing used Hanja (Chinese characters), so the same character-count economics applied. Hangul (the simpler Korean alphabet, 1443) was politically suppressed for scholarly use until the 19th century.' },
                { region: 'Islamic world', dates: '~700s–1700s',
                  what: 'Sophisticated paper-making (which the West learned from the Islamic world via Spain) and unmatched calligraphic tradition. Some block-printed amulets and scientific instruments. Movable-type printing for Arabic adopted only in the 1700s-1800s.',
                  why: 'Multiple factors: religious scholars resisted mechanically reproducing the Qur\'an (the calligraphic act was theologically meaningful), Arabic\'s cursive joining and contextual letterforms are hard for movable type, and existing scribe guilds opposed the technology. Not "backwardness" — specific reasons rooted in the writing system and the religious tradition.' },
                { region: 'Sub-Saharan Africa', dates: 'varies',
                  what: 'Multiple indigenous writing systems (Ge\'ez in Ethiopia for ~2,000 years; Nsibidi in West Africa; Vai script, 1830s; many oral traditions with sophisticated transmission methods). The Timbuktu manuscripts (1300s-1600s) document a major manuscript culture in West Africa.',
                  why: 'Printing arrived later than in Europe, often through colonial channels. Vibrant manuscript traditions and oral transmission systems served the same epistemic functions print served in Europe.' }
              ].map(function(row, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.warn, borderRadius: 6, padding: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
                    h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } }, row.region),
                    h('span', { style: { fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, row.dates)
                  ),
                  h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.text, lineHeight: 1.55 } },
                    h('strong', { style: { color: T.warn } }, 'What happened: '), row.what),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
                    h('strong', { style: { color: T.text, fontStyle: 'normal' } }, 'Why it did not scale like Mainz: '), row.why)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'The right framing: Gutenberg solved a specific problem for a specific writing system at a specific moment, and that solution scaled fast. He did not invent the human idea of duplicating texts. Crediting him as "the" inventor of printing erases hundreds of years of innovation in other parts of the world. The honest sentence is "Gutenberg developed the system that made movable-type printing economically viable for European alphabets."')
          ),

          // ── What was happening on Wabanaki land in 1500 ──
          // For the Maine local-history thread to be honest, name what was
          // here before the colonial press arrived. Wabanaki Confederacy +
          // oral knowledge traditions + wampum as durable information.
          // Treats indigenous knowledge systems as parallel-and-prior, not
          // absent, to European print.
          sectionHeader('🪶', 'And on Wabanaki land in 1500'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.warn, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'The Falmouth Gazette (1785) was the first newspaper printed in what would become Maine. But the land had a sophisticated information culture for thousands of years before colonial printers arrived. Naming this honestly is part of the local-history thread.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              [
                { topic: 'Who was here',
                  detail: 'The Wabanaki Confederacy: Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, and Abenaki nations. Together they had occupied what is now Maine, the Maritimes, and northern New England for at least 10,000 years.' },
                { topic: 'How knowledge transmitted',
                  detail: 'Oral traditions backed by trained memory keepers. Stories, treaty histories, place-names, plant knowledge, navigation, and seasonal cycles were carried by individuals who specialized in remembering. Oral does not mean unreliable; specialist memorizers were checked against each other and against material artifacts.' },
                { topic: 'Wampum belts as durable information',
                  detail: 'Wampum belts (shell beads strung in patterns) recorded treaties, alliances, and historical events. A wampum keeper could read a belt the way a European could read a manuscript. Some surviving wampum belts are 400+ years old and still legible to trained readers. Maine museums and tribal cultural centers hold examples.' },
                { topic: 'Birchbark scrolls',
                  detail: 'Mi\'kmaq and other Wabanaki nations used inscribed birchbark for some communications, especially religious and historical material. Some scrolls survive in museum collections; the inscription technique predates colonial contact.' },
                { topic: 'When print arrived',
                  detail: 'Colonial missionary presses began printing in Wabanaki languages in the 1600s. The Eliot Indian Bible (1663, Massachusett-language) is the most famous example, set in Cambridge MA by John Eliot with native-language consultants. Print-in-Wabanaki-languages and oral-tradition-in-Wabanaki-languages coexisted for centuries; both continue today.' }
              ].map(function(row, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.warn, borderRadius: 6, padding: 10 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 4 } }, row.topic),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, row.detail)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'For Maine students: the Abbe Museum (Bar Harbor), the Maine Indian Basketmakers Alliance, and tribal cultural centers in Indian Township and Pleasant Point are working sources today. The Penobscot Nation Library (Indian Island) holds materials many state archives do not. Treat these as living institutions, not just historical references.')
          ),

          sectionHeader('📊', 'Books printed in Europe by century'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              'Approximate cumulative book production in Europe (Buringh & van Zanden, "Charting the Rise of the West"):'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              [
                { era: '1300s', count: '~2.7 million', pct: 1 },
                { era: '1400s (pre-press)', count: '~5 million by 1450', pct: 2 },
                { era: '1400s (post-press, 1450-1500)', count: '~13 million more', pct: 6 },
                { era: '1500s', count: '~120 million', pct: 50 },
                { era: '1600s', count: '~330 million', pct: 100 }
              ].map(function(b, i) {
                return h('div', { key: i },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text, marginBottom: 2 } },
                    h('span', null, b.era),
                    h('strong', { style: { color: T.accentHi } }, b.count)),
                  h('div', { style: { width: '100%', height: 12, background: T.cardAlt, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + T.border } },
                    h('div', { style: { width: b.pct + '%', height: '100%', background: T.accent } }))
                );
              })
            )
          ),

          // ── First books printed, 1455-1493 ──
          // Many people know the Gutenberg Bible was first; few know what
          // came right after. Lists the variety: Bibles, dictionaries,
          // illustrated books, the first books in English / Italian /
          // German, ending with the most spectacular early illustrated book.
          sectionHeader('📖', 'First books printed, 1455 → 1493'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'The Gutenberg Bible was first. But the next 38 years produced an extraordinary variety of "firsts" as printers tried out what the new technology could do beyond the Bible.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              [
                { year: '1455', title: 'Gutenberg Bible', where: 'Mainz', firstFor: 'First substantial printed book in Europe. ~180 copies; 49 survive.' },
                { year: '1457', title: 'Mainz Psalter', where: 'Mainz (Fust & Schöffer)', firstFor: 'First multicolor printing (red and blue initials). First book with a printed colophon naming the printers.' },
                { year: '1460', title: 'Catholicon', where: 'Mainz (probably Gutenberg)', firstFor: 'First printed dictionary. A 13th-century Latin grammar reference set in a small typeface to fit the bulk into one volume.' },
                { year: '1461', title: 'Der Edelstein', where: 'Bamberg (Albrecht Pfister)', firstFor: 'First illustrated printed book. Aesop-style fables with woodcut illustrations alongside the text.' },
                { year: '1463', title: 'Cicero, De Oratore', where: 'Subiaco, Italy (Sweynheym & Pannartz)', firstFor: 'First book printed in Italy. Mainz emigrés set up a press in a Benedictine monastery outside Rome.' },
                { year: '1466', title: 'Mentelin Bible', where: 'Strasbourg (Johann Mentelin)', firstFor: 'First Bible printed in German vernacular, 50+ years before Luther\'s translation. Religiously controversial but legal.' },
                { year: '1470', title: 'Augustine, De Civitate Dei', where: 'Subiaco', firstFor: 'First printed edition of a major Latin classical text. Helped establish printed classical scholarship.' },
                { year: '1474', title: 'Recuyell of the Historyes of Troye', where: 'Bruges (William Caxton)', firstFor: 'First book printed in English. Caxton would set up the first English press at Westminster two years later.' },
                { year: '1477', title: 'Dante, Divine Comedy', where: 'Foligno (Johann Numeister)', firstFor: 'First printed Italian-language book of literature. The vernacular Renaissance enters print.' },
                { year: '1486', title: 'Mainz Mainzer Pilgerfahrt', where: 'Mainz', firstFor: 'First printed travel guide. A pilgrim\'s account of the journey to Jerusalem with maps and illustrations.' },
                { year: '1493', title: 'Nuremberg Chronicle', where: 'Nuremberg (Anton Koberger)', firstFor: 'Most spectacular early illustrated book. ~1,800 woodcut illustrations of cities, biblical scenes, and historical figures. The "coffee table book" of the 15th century.' }
              ].map(function(b, i) {
                return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12, alignItems: 'flex-start', paddingBottom: i === 10 ? 0 : 8, borderBottom: i === 10 ? 'none' : '1px dashed ' + T.border } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: T.accentHi, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums', textAlign: 'right' } }, b.year),
                  h('div', null,
                    h('div', { style: { fontSize: 12, color: T.text, fontFamily: 'Georgia, serif', marginBottom: 2 } },
                      h('strong', null, b.title),
                      h('span', { style: { color: T.dim, fontWeight: 400 } }, ' · ' + b.where)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } }, b.firstFor)
                  )
                );
              })
            ),
            h('p', { style: { margin: '14px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Within 40 years of the Gutenberg Bible, every major category of book we still print had at least one printed exemplar: scripture, scholarship, classics, dictionaries, vernacular literature, illustrated books, reference, travel writing, popular illustration. The press did not just produce more books; it discovered what books could be.')
          ),

          // ── Interactive timeline of major print events 1377-1830 ──
          // Click any marker to open a detail card. Markers are positioned
          // by year on a horizontal axis. Currently-selected event gets a
          // red pulse ring; visited events get a small dot below.
          sectionHeader('🕰️', 'Major print events — click any marker'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' } },
              'Each marker is a moment when print enabled something that would otherwise have stayed local, slow, or impossible. Click to learn what changed.'),
            // Timeline rail with year axis
            h('div', { style: { position: 'relative', height: 70, marginBottom: 6, marginLeft: 6, marginRight: 6 } },
              // Horizontal axis line
              h('div', { 'aria-hidden': 'true',
                style: { position: 'absolute', left: 0, right: 0, top: 32, height: 2, background: T.border } }),
              // Decade tick marks
              [1400, 1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850].map(function(y) {
                return h('div', { key: 'tick' + y,
                  style: { position: 'absolute', left: yearToPct(y) + '%', top: 28, width: 1, height: 10, background: T.dim, opacity: 0.5 } });
              }),
              // Decade labels
              [1400, 1500, 1600, 1700, 1800].map(function(y) {  // decade labels every 100yr (1850 axis edge unlabeled)
                return h('div', { key: 'lab' + y,
                  style: { position: 'absolute', left: yearToPct(y) + '%', top: 44, fontSize: 10, color: T.dim, transform: 'translateX(-50%)', fontFamily: 'ui-monospace, monospace' } }, y);
              }),
              // Event markers. Maine-local events get distinguished
              // rendering: slightly larger (26px vs 22px), evergreen ring
              // and a tiny "ME" label so the local connection reads as
              // intentional rather than incidental.
              PRINT_EVENTS.map(function(ev, i) {
                var isSelected = selectedEvent === i;
                var isLocal = !!ev.local;
                var size = isLocal ? 26 : 22;
                var ringColor = isSelected ? T.danger : (isLocal ? T.ok : T.accent);
                var fillColor = isSelected ? T.danger : (isLocal ? '#bbf7d0' : T.accentHi);
                return h('button', { key: i,
                  className: 'printingpress-no-print',
                  onClick: function() { setSelectedEvent(isSelected ? null : i); announce(ev.year + ' ' + ev.title); },
                  'aria-label': ev.year + ' · ' + ev.title + (isLocal ? ' · Maine-local event' : '') + ' · click for details',
                  'aria-expanded': isSelected,
                  style: {
                    position: 'absolute',
                    left: yearToPct(ev.year) + '%',
                    top: isLocal ? 19 : 22,
                    transform: 'translateX(-50%)',
                    width: size, height: size,
                    borderRadius: '50%',
                    border: '2px solid ' + ringColor,
                    background: fillColor,
                    color: isLocal ? '#1f3d28' : T.ink,
                    cursor: 'pointer',
                    fontSize: isLocal ? 9 : 11, fontWeight: 800,
                    padding: 0,
                    boxShadow: isSelected ? '0 0 0 4px rgba(196,69,54,0.35), 0 2px 6px rgba(0,0,0,0.4)' :
                              (isLocal ? '0 0 0 2px rgba(127,176,105,0.25), 0 2px 5px rgba(0,0,0,0.45)' :
                                         '0 2px 4px rgba(0,0,0,0.4)'),
                    transition: 'all 0.2s ease',
                    fontFamily: 'Georgia, serif',
                    zIndex: isSelected ? 10 : (isLocal ? 3 : 1)
                  }
                }, isLocal ? 'ME' : '·');
              })
            ),
            // Detail card for selected event — parchment-styled with corner
            // fleurons + a thin double-rule below the title. Echoes the
            // ornamental treatment of the silhouette medallions and the
            // broadside borders so the visual language stays consistent.
            selectedEvent !== null && (function() {
              var ev = PRINT_EVENTS[selectedEvent];
              // Local SVG fleuron sized for parchment context (dark ink)
              function inkFleuron(extra) {
                return h('svg', Object.assign({ width: 14, height: 14, viewBox: '-7 -7 14 14', 'aria-hidden': 'true',
                    style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 } }, extra || {}),
                  h('path', { d: 'M 0 -4 L 3 0 L 0 4 L -3 0 Z', fill: '#7c2d12' }),
                  h('circle', { cx: 0, cy: -5.5, r: 0.9, fill: '#7c2d12' }),
                  h('circle', { cx: 0, cy: 5.5, r: 0.9, fill: '#7c2d12' }),
                  h('circle', { cx: -5.5, cy: 0, r: 0.9, fill: '#7c2d12' }),
                  h('circle', { cx: 5.5, cy: 0, r: 0.9, fill: '#7c2d12' })
                );
              }
              return h('div', { 'aria-live': 'polite',
                style: { position: 'relative', background: 'radial-gradient(ellipse at 8% 12%, rgba(180,140,80,0.18) 0%, transparent 35%), radial-gradient(ellipse at 92% 88%, rgba(180,140,80,0.18) 0%, transparent 35%), ' + T.parchment, color: T.ink, border: '2px solid ' + T.accent, borderRadius: 10, padding: '18px 16px 14px', marginTop: 12, fontFamily: 'Georgia, serif',
                  boxShadow: 'inset 0 0 24px rgba(120,90,40,0.08)' } },
                // Top-left + top-right corner fleurons (small parchment ornaments)
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 6, left: 8 } }, inkFleuron()),
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 6, right: 8 } }, inkFleuron()),
                h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap', paddingTop: 4 } },
                  h('div', null,
                    h('span', { style: { fontSize: 22, fontWeight: 800, color: '#7c2d12' } }, ev.year),
                    h('span', { style: { fontSize: 16, fontWeight: 700, color: T.ink, marginLeft: 10 } }, ev.title)
                  ),
                  h('button', {
                    onClick: function() { setSelectedEvent(null); },
                    'aria-label': 'Close detail',
                    style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#7c2d12', padding: '0 6px', fontWeight: 700 }
                  }, '×')
                ),
                // Decorative double-rule under the title (period typesetting convention)
                h('div', { 'aria-hidden': 'true', style: { borderTop: '1px solid #7c2d12', borderBottom: '1px solid #7c2d12', height: 3, margin: '4px 0 8px', opacity: 0.6 } }),
                h('div', { style: { fontSize: 12, color: '#5c4630', fontStyle: 'italic', marginBottom: 8 } }, ev.who),
                h('p', { style: { margin: 0, fontSize: 13, color: T.ink, lineHeight: 1.6 } }, ev.why),
                ev.url && h('div', { style: { marginTop: 8, fontSize: 11 } },
                  h('a', { href: ev.url, target: '_blank', rel: 'noopener', style: { color: '#7c2d12', fontWeight: 600 } },
                    '→ Primary source / digital facsimile'))
              );
            })(),
            !selectedEvent && selectedEvent !== 0 && h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', textAlign: 'center', marginTop: 8 } },
              'Click any marker above to read about the event.')
          ),

          // ── Maine-history callout ──
          // Two markers on the timeline are Maine pegs: 1785 Falmouth Gazette
          // (less than two miles from King Middle) and 1851 Uncle Tom's Cabin
          // (written in Brunswick at Bowdoin). For a Portland audience, the
          // Atlantic Revolution and the Reformation feel distant; the Maine
          // pegs ground the global story in walkable local geography.
          calloutBox('info', 'Two Maine pegs on the timeline',
            h(React.Fragment, null,
              h('strong', null, 'Falmouth Gazette (1785) '),
              'was published in what is now Portland, less than two miles from King Middle. It helped build the case for separating Maine from Massachusetts (achieved 1820). ',
              h('strong', null, 'Uncle Tom\'s Cabin (1851) '),
              'was written by Harriet Beecher Stowe in Brunswick, Maine — a 25-mile drive from Portland — while her husband taught at Bowdoin College. 300,000 copies in its first US year, the most-printed novel of the 19th century. The press in Mainz reached the kitchen table in Maine.')),

          sectionHeader('⛪', 'The Reformation (1517)'),
          keyPointBlock(
            'Martin Luther nailed the 95 Theses to the Wittenberg church door in October 1517. Without the press, this would have been a local academic dispute that died in months. With the press:',
            [
              'The 95 Theses were printed within weeks and circulated across Germany, then Europe',
              'Within 3 months they had been printed in dozens of cities',
              'Luther became the first author to write specifically for a mass print audience — short pamphlets in German (not Latin) at popular prices',
              'By 1520 he was the most-printed author in Europe',
              'The Catholic Church had no comparable print machinery and was outmaneuvered for decades',
              'Tyndale, Calvin, and other reformers used the same playbook'
            ]
          ),
          // ── Reformation spread interactive map ──
          // 12-month animation. Cities pop in by month based on documented
          // appearance of printed 95 Theses editions and Luther pamphlets.
          // Hit "Play" → markers appear from Wittenberg outward over ~7
          // seconds. Each city has an approximate month-of-arrival.
          (function() {
            var W = 360, H = 240;
            // Approximate European city positions (relative to a simplified
            // bounding box centered on Wittenberg). Position is editorial,
            // not GIS-accurate; the point is relative geographic spread.
            var CITIES = [
              { name: 'Wittenberg', x: 200, y: 110, month: 0 },
              { name: 'Leipzig',    x: 188, y: 122, month: 1 },
              { name: 'Nuremberg',  x: 180, y: 152, month: 1 },
              { name: 'Basel',      x: 160, y: 168, month: 2 },
              { name: 'Mainz',      x: 142, y: 132, month: 2 },
              { name: 'Augsburg',   x: 180, y: 170, month: 2 },
              { name: 'Strasbourg', x: 148, y: 158, month: 3 },
              { name: 'Cologne',    x: 142, y: 110, month: 3 },
              { name: 'Vienna',     x: 232, y: 168, month: 4 },
              { name: 'Antwerp',    x: 132, y: 84,  month: 5 },
              { name: 'Paris',      x: 102, y: 142, month: 6 },
              { name: 'Geneva',     x: 130, y: 178, month: 6 },
              { name: 'London',     x: 88,  y: 76,  month: 8 },
              { name: 'Lyon',       x: 122, y: 178, month: 9 },
              { name: 'Krakow',     x: 254, y: 122, month: 10 }
            ];
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
                h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                  '🗺️ Watch the 95 Theses spread (Oct 1517 → Sept 1518)'),
                h('div', { style: { fontSize: 13, color: T.muted, fontFamily: 'ui-monospace, monospace' } },
                  spreadMonth === 0 ? 'Oct 1517' :
                  spreadMonth >= 12 ? 'Sept 1518 (complete)' :
                  ['Oct 1517','Nov 1517','Dec 1517','Jan 1518','Feb 1518','Mar 1518','Apr 1518','May 1518','Jun 1518','Jul 1518','Aug 1518'][spreadMonth - 1] || '')
              ),
              h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' } },
                'Each dot is a city where a printed edition of the Theses or an early Luther pamphlet appeared. Click play to watch the spread by month. By comparison, Wycliffe\'s manuscript-era writings (1380s) took decades to reach a fraction of these cities.'),
              h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 520, display: 'block', margin: '0 auto', background: '#1f3528', borderRadius: 8 },
                role: 'img', 'aria-label': 'Simplified map of Europe showing cities where the 95 Theses appeared, by month' },
                // Simplified Europe outline (very approximate — coastline + major rivers)
                // Background landmass
                h('path', { d: 'M 30 30 L 350 25 L 360 80 L 320 110 L 340 160 L 280 200 L 230 220 L 150 210 L 70 180 L 40 130 L 30 30 Z',
                  fill: '#3a5a3a', stroke: '#1a3018', strokeWidth: 1 }),
                // Major rivers (suggestive only — Rhine, Danube)
                h('path', { d: 'M 142 60 Q 145 100 148 158 Q 150 180 130 200', fill: 'none', stroke: '#4a7080', strokeWidth: 1, opacity: 0.55 }),
                h('path', { d: 'M 175 165 Q 210 170 245 175 Q 270 180 290 188', fill: 'none', stroke: '#4a7080', strokeWidth: 1, opacity: 0.55 }),
                // Coastlines / north sea hint
                h('path', { d: 'M 30 30 Q 80 50 130 60 Q 180 50 250 30', fill: 'none', stroke: '#4a7080', strokeWidth: 1.5, opacity: 0.4 }),
                // City markers — appear by month
                CITIES.map(function(c, i) {
                  var visible = c.month <= spreadMonth;
                  var isOrigin = c.month === 0;
                  return h('g', { key: i, style: { opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' } },
                    // Dot
                    h('circle', { cx: c.x, cy: c.y, r: isOrigin ? 5 : 3.5,
                      fill: isOrigin ? T.danger : T.accentHi,
                      stroke: '#1a1410', strokeWidth: 1 }),
                    // Ripple ring (only for newly-arrived in this month)
                    c.month === spreadMonth && spreadMonth > 0 && h('circle', {
                      cx: c.x, cy: c.y, r: 10,
                      fill: 'none', stroke: T.accentHi, strokeWidth: 1, opacity: 0.6 }),
                    // Label
                    h('text', { x: c.x, y: c.y - 7, textAnchor: 'middle',
                      fill: '#f5e8c8', fontSize: 8, fontFamily: 'Georgia, serif',
                      fontWeight: isOrigin ? 700 : 500,
                      style: { textShadow: '0 0 3px rgba(0,0,0,0.8)' } }, c.name)
                  );
                })
              ),
              h('div', { className: 'printingpress-no-print', style: { marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                !spreadPlaying && spreadMonth < 12 && h('button', {
                  onClick: function() { setSpreadPlaying(true); announce('Reformation spread animation playing'); },
                  style: btnPrimary({ padding: '8px 16px', fontSize: 13 }) },
                  spreadMonth === 0 ? '▶ Play (Oct 1517 onward)' : '▶ Resume'),
                spreadPlaying && h('button', {
                  onClick: function() { setSpreadPlaying(false); },
                  style: btn({ padding: '8px 16px', fontSize: 13 }) }, '⏸ Pause'),
                spreadMonth >= 12 && h('button', {
                  onClick: function() { setSpreadMonth(0); setSpreadPlaying(false); },
                  style: btn({ padding: '8px 16px', fontSize: 13 }) }, '↺ Replay'),
                spreadMonth > 0 && !spreadPlaying && h('button', {
                  onClick: function() { setSpreadMonth(0); setSpreadPlaying(false); },
                  style: btn({ padding: '8px 16px', fontSize: 13 }) }, '↺ Reset')
              )
            );
          })(),
          // ── Primary source reading ──
          // 3 actual translated theses from Luther's 95, each with a brief
          // comprehension prompt. Brings genuine primary-source literacy
          // into the tool — students read what people actually wrote in
          // 1517, not just summaries of it.
          (function() {
            var THESES = [
              { num: 27, translation: 'They preach human follies who say that as soon as the coin clinks in the chest, the soul flies out of purgatory.',
                prompt: 'What practice is Luther directly criticizing in this thesis?',
                answer: 'The sale of indulgences — a Church practice where the faithful could pay money to reduce time their loved ones spent in purgatory. The "coin clinks in the chest" refers to the iron collection chests indulgence-sellers carried. Luther argues this is a "human folly," meaning a made-up tradition with no scriptural basis. This thesis became one of the most-quoted in the spread.' },
              { num: 32, translation: 'Those who believe that, through letters of indulgence, they are made sure of their own salvation will be eternally damned along with their teachers.',
                prompt: 'How would this thesis have read to a faithful 1517 Catholic, and what makes it explosive?',
                answer: 'Explosive because Luther is saying not only that the indulgence-buyers are mistaken — but that they AND the priests selling indulgences will be damned. It directly attacks the religious authority of clergy who profit from the practice. This is the kind of language that turned an academic dispute into a movement that authorities could not easily suppress.' },
              { num: 86, translation: 'Why does the pope, whose wealth today is greater than the wealth of the richest Crassus, build the basilica of St. Peter with the money of poor believers rather than with his own money?',
                prompt: 'Why is naming Crassus (the famously wealthy Roman) such a powerful rhetorical move in 1517?',
                answer: 'Crassus was a Latin shorthand for ultimate wealth — every educated reader would recognize the reference. Luther is comparing the pope to a notorious pagan plutocrat and asking why a man with that level of resources is taking money from the poor to build his church. The class critique is sharp; the historical-classical reference makes it impossible to dismiss as ignorant. This kind of educated polemic is what print specifically enabled.' }
            ];
            var th = THESES[thesisIdx];
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 4px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                '📜 Read a primary source'),
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
                'Excerpts from Luther\'s 95 Theses, translated from the Latin originals printed in 1517. Read the thesis, think about the comprehension question, then reveal the analysis.'),
              // Selector
              h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
                THESES.map(function(t, ti) {
                  return h('button', { key: ti,
                    onClick: function() { setThesisIdx(ti); setPsReveal(false); },
                    style: ti === thesisIdx ? btnPrimary({ padding: '6px 12px', fontSize: 12 }) : btn({ padding: '6px 12px', fontSize: 12 })
                  }, 'Thesis ' + t.num);
                })
              ),
              // The thesis itself, parchment-styled
              h('div', { style: {
                background: T.parchment, color: T.ink,
                padding: '16px 20px', borderRadius: 6, marginBottom: 12,
                border: '2px solid #8a7a5a',
                fontFamily: '"Garamond", "EB Garamond", "Cambria", serif',
                fontSize: 16, lineHeight: 1.7, fontStyle: 'italic',
                textAlign: 'center'
              } },
                h('div', { style: { fontSize: 10, fontStyle: 'normal', color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 } }, 'Thesis ' + th.num + ' · Martin Luther · 1517'),
                '"' + th.translation + '"'
              ),
              // Comprehension prompt
              h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 10, padding: 10, background: T.cardAlt, borderRadius: 6 } },
                h('strong', { style: { color: T.accentHi } }, '❓ '), th.prompt
              ),
              !psReveal && h('button', { className: 'printingpress-no-print',
                onClick: function() { setPsReveal(true); announce('Analysis revealed'); },
                style: btnPrimary({ padding: '8px 14px', fontSize: 12 }) }, '🔍 Reveal the analysis'),
              psReveal && h('div', { 'aria-live': 'polite', style: {
                background: '#1f3d28', border: '1px solid ' + T.ok, borderRadius: 6, padding: 12,
                fontSize: 13, color: '#bbf7d0', lineHeight: 1.6 } },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: T.ok, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Analysis'),
                th.answer
              )
            );
          })(),

          calloutBox('info', 'Mark Twain on Gutenberg (apocryphally attributed)',
            '"What the world is today, good and bad, it owes to Gutenberg. Everything can be traced to this source." Whether or not Twain actually said it, the structural argument holds: the Reformation required mass print. The Reformation broke the religious monopoly of one institution. Most modern political philosophy follows from that break.'),

          // ── Speed of news: technology vs distance ──
          // Visualizes how fast news traveled across major eras. Each row
          // is one transmission technology with a representative speed
          // figure (London → Vienna distance ~1,500 km used as benchmark).
          // The bar widths inversely scale to time: longer bar = faster.
          sectionHeader('⏱️', 'How fast news traveled (London → Vienna, ~1,500 km)'),
          (function() {
            var SPEEDS = [
              { era: 'Foot messenger (Roman era)', time: '~60 days', daysVal: 60, note: 'A relay of runners. Reliable but slow. Imperial dispatches priority.' },
              { era: 'Mounted courier (medieval)', time: '~25 days', daysVal: 25, note: 'Horse + relay station network. The Mongol yam system reached ~250 km/day; medieval Europe ran slower.' },
              { era: 'Sailing ship + horse (1500)', time: '~14 days', daysVal: 14, note: 'Hanseatic League routes plus inland courier. Weather-dependent.' },
              { era: 'Print broadside relay (1620)', time: '~10 days', daysVal: 10, note: 'Couriers carrying printed pamphlets that could be copied at each stop. Print multiplied at each node.' },
              { era: 'Optical telegraph (1794)', time: '~12 hours', daysVal: 0.5, note: 'Chappe semaphore towers across France: signals from tower to tower at light-speed-of-sight, weather permitting.' },
              { era: 'Electric telegraph (1850s)', time: '~minutes', daysVal: 0.005, note: 'Submarine cables under the Channel + overland wire. Reuters built a global news service on this.' },
              { era: 'Internet (2026)', time: '<1 second', daysVal: 0.00001, note: 'Distance is irrelevant. The London → Vienna packet arrives faster than you can blink.' }
            ];
            var maxLog = Math.log10(60) + 6;  // log scale: foot messenger to internet spans 7+ orders of magnitude
            function logBar(d) {
              if (d <= 0.00001) return 100;
              var logVal = Math.log10(d) + 6;  // shift so internet ~1, foot messenger ~7.78
              var pct = 100 - (logVal / maxLog) * 100;
              return Math.max(2, Math.min(100, pct));
            }
            return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
                'Bar width = relative speed (log scale; each tick is roughly 10× faster than the one above). Print was a step change — about 2× faster than horse-only, plus the ability to multiply copies at each relay stop. The bigger change came later (telegraph, internet). But print is when the curve first bent up.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                SPEEDS.map(function(s, i) {
                  var pct = logBar(s.daysVal);
                  var isPrint = s.era.indexOf('Print') === 0;
                  return h('div', { key: i },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, marginBottom: 2 } },
                      h('span', { style: { color: isPrint ? T.accentHi : T.text, fontWeight: isPrint ? 700 : 600 } }, s.era),
                      h('strong', { style: { color: isPrint ? T.accentHi : T.muted, fontFamily: 'ui-monospace, monospace' } }, s.time)
                    ),
                    h('div', { style: { width: '100%', height: 12, background: T.cardAlt, borderRadius: 3, overflow: 'hidden', border: '1px solid ' + T.border, marginBottom: 4 } },
                      h('div', { style: { width: pct + '%', height: '100%',
                        background: isPrint ? T.accent : '#5a6a7a' } })
                    ),
                    h('div', { style: { fontSize: 11, color: T.dim, lineHeight: 1.5, fontStyle: 'italic' } }, s.note)
                  );
                })
              )
            );
          })(),

          sectionHeader('🔬', 'The scientific revolution'),
          keyPointBlock(
            'Science before the press was a memory practice — knowledge passed teacher-to-student in manuscript copies, with errors compounding each generation. The press changed three things:',
            [
              { k: 'Standardization', v: 'A printed astronomical table or anatomical diagram was identical in 500 copies. For the first time, scientists in different cities could refer to "Figure 3" and know they were looking at the same thing.' },
              { k: 'Publication as proof of priority', v: 'Newton vs Leibniz on calculus, Hooke vs Newton on optics — print made first publication the test of who discovered what. The whole scientific-publication system descends from this.' },
              { k: 'Cumulative knowledge', v: 'A scholar in 1600 could own personal copies of Copernicus, Vesalius, Galileo, Kepler. Pre-press, they would have spent years tracking down a single manuscript copy. The print library is the substrate of modern science.' },
              { k: 'Errata and revisions', v: 'Print made errors visible (and persistent), but also fixable in subsequent editions. The errata-and-revision cycle is itself a print-era invention.' }
            ]
          ),

          sectionHeader('📰', 'The modern public'),
          keyPointBlock(
            'The press also created — slowly, over centuries — what historians call the "public sphere":',
            [
              'Vernacular publishing meant ordinary people could read in their own language for the first time',
              'Newspapers (16th-17th century origins) created a shared "today" across geography',
              'Coffee houses became reading rooms; the print-and-discuss culture is the ancestor of modern social media',
              'Pamphlet wars (English Civil War, American Revolution, French Revolution) showed mass print could mobilize political action',
              'Public schools and mass literacy followed; the workplace and citizenship demands of an industrial society required readers'
            ]
          ),

          calloutBox('warn', 'Not all of it was good',
            'The press also made possible mass propaganda, religious persecution at scale (printed lists of heretics, witches, and Jews), and the early modern wars of religion (which killed an estimated 5-10 million Europeans 1517-1648). Print is a power-amplifier. It amplifies whatever the printer wants to amplify. The same technology that enabled Galileo enabled the Malleus Maleficarum.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('beforeAfter', 0, {
            prompt: 'You are a historian arguing that without the printing press, the Reformation would have remained a local German academic dispute. What is your strongest piece of evidence?',
            choices: [
              'There were no other religious reformers.',
              'Earlier reformers like Wycliffe (1380s) and Hus (1415) had the same theological arguments but, lacking print, never reached mass audiences. Both movements were locally suppressed.',
              'Luther was uniquely persuasive.',
              'The Catholic Church was weak.'
            ],
            correct: 1,
            explain: 'Wycliffe and Hus made very similar theological arguments to Luther, a century earlier, in manuscript culture. Both were locally suppressed — Hus was burned at the stake in 1415. The print difference is what allowed Luther\'s ideas to spread faster than they could be suppressed.'
          }),

          // ── What survived? Durability comparison ──
          // Permanence is one of the four pillars of print's contribution
          // (named earlier in The Same Fears). Make it concrete with
          // approximate survival rates across media. Best-effort figures
          // drawn from bibliographic and archival scholarship.
          sectionHeader('⏳', 'What survived? Durability across 600 years'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'A medium\'s reach is one thing. Its durability is another. Print made ideas harder to erase by multiplying physical copies. The trade-off: each new generation of media keeps changing the math. Born-digital content is the most durable in principle and the most fragile in practice.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              [
                { label: 'Pre-print European manuscripts (1100-1450)', survives: 5,
                  note: 'Single copies, vulnerable to fire, mold, neglect. Most pre-print European texts are lost. Estimates vary by genre.',
                  color: T.danger },
                { label: 'Gutenberg Bibles (1455, ~180 printed)', survives: 27,
                  note: '~49 of ~180 known to survive in some form. Sacred status protected them; cathedrals and universities preserved copies.',
                  color: T.warn },
                { label: 'Early printed books (1450-1500, "incunabula")', survives: 60,
                  note: 'Bibliographers track ~30,000 known incunabula editions; surviving examples are reasonably well catalogued in research libraries.',
                  color: T.accent },
                { label: '19th-century newspapers (1800-1900)', survives: 35,
                  note: 'Cheap acidic paper degrades. Microfilm and digitization captured a fraction; many small-town titles are partially or fully lost.',
                  color: T.warn },
                { label: '1990s websites (now ~30 years old)', survives: 30,
                  note: 'Link rot, server shutdowns, format obsolescence. Internet Archive recovers a portion; much is gone or unreachable. The "Eternal September" generation of personal sites is largely vanished.',
                  color: T.danger },
                { label: 'Born-digital today, properly archived', survives: 95,
                  note: 'In principle: bit-perfect copies, distributed redundancy, format migration. In practice: only if institutions actively curate. Most personal data is not curated.',
                  color: T.ok }
              ].map(function(row, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 12 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap', gap: 6 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Georgia, serif' } }, row.label),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: row.color, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' } }, '~' + row.survives + '% survives')
                  ),
                  h('div', { style: { position: 'relative', height: 8, background: T.bg, borderRadius: 4, border: '1px solid ' + T.border, overflow: 'hidden', marginBottom: 6 } },
                    h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: row.survives + '%', background: row.color, opacity: 0.85 } })
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' } }, row.note)
                );
              })
            ),
            h('p', { style: { margin: '14px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Figures are best-effort estimates from bibliographic and archival scholarship; "survival" includes any copy, fragment, or facsimile that can be examined today. The point is order-of-magnitude, not the second decimal. The takeaway: each new medium re-opens the durability question, and the answer is usually "depends on whether anyone bothers to preserve it."')
          ),

          // ── Where the surviving Gutenberg Bibles live ──
          // The durability comparison's abstract 27% becomes a concrete
          // list of specific institutions. Pairs the statistical claim
          // with named places students can visit, request, or read about.
          sectionHeader('🏛️', 'Where the surviving Gutenberg Bibles live today'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'About 180 Gutenberg Bibles were printed in 1454-1455. Approximately 49 survive today in some form (complete or substantial fragment). Most are in research libraries; some are owned by universities; a handful are in private collections. The list below catalogues the publicly held copies you can see or request to view.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              [
                { region: 'United States', count: 11,
                  examples: 'Library of Congress (Washington DC), Morgan Library (NYC, has 3), Harvard Houghton Library, Yale Beinecke Library, Princeton University Library, Columbia University, NYPL, University of Texas Austin Ransom Center, Indiana University Lilly Library' },
                { region: 'United Kingdom', count: 8,
                  examples: 'British Library (London, has 2), Cambridge University Library, Bodleian Library (Oxford), John Rylands Library (Manchester), Eton College, Lambeth Palace Library' },
                { region: 'Germany', count: 13,
                  examples: 'Gutenberg Museum (Mainz, has 2), Staatsbibliothek Berlin, Bayerische Staatsbibliothek (Munich), Niedersächsische Landesbibliothek (Göttingen, on UNESCO Memory of the World Register), Württembergische Landesbibliothek, others' },
                { region: 'Rest of Europe', count: 14,
                  examples: 'Bibliothèque nationale de France (Paris), Vatican Apostolic Library (Rome), Austrian National Library (Vienna), Russian State Library (Moscow), Royal Library of Belgium, Royal Library of Denmark, Spanish National Library' },
                { region: 'Asia', count: 1,
                  examples: 'Keio University Library (Tokyo) — the only copy in private institutional hands outside the West, acquired at auction in 1987 for $5.4M' },
                { region: 'Private + uncatalogued', count: '~2',
                  examples: 'A few copies are known to be in private hands; their locations are not publicly disclosed. Occasional pages or fragments appear at auction' }
              ].map(function(row, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.accent, borderRadius: 6, padding: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap', gap: 4 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, row.region),
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: T.warn, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' } }, '~' + row.count + ' copies')
                  ),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, row.examples)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Most research libraries that hold a Gutenberg Bible will let qualified scholars (and sometimes interested students with an appointment) view it. The British Library and Library of Congress have full digital facsimiles online for free, page by page. Closest to King Middle: Harvard\'s Houghton Library and the Morgan Library in NYC are a Northeast Corridor trip away.')
          ),

          // ── Crew reflection prompt ──
          // Pulls the durability comparison from abstract into personal.
          // Designed for EL Education Crew (advisory) discussions or as a
          // short journal prompt.
          h('div', { style: { background: T.parchment, color: T.ink, border: '2px solid ' + T.accent, borderRadius: 12, padding: 18, marginBottom: 14, position: 'relative' } },
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, left: 12, color: T.accent, fontSize: 16 } }, '❦'),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, right: 12, color: T.accent, fontSize: 16 } }, '❦'),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, left: 12, color: T.accent, fontSize: 16 } }, '❦'),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, right: 12, color: T.accent, fontSize: 16 } }, '❦'),
            h('div', { style: { fontSize: 11, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6, textAlign: 'center', fontFamily: 'Georgia, serif' } },
              'Crew reflection · What about you would survive?'),
            h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#3a2a1a', lineHeight: 1.65, fontFamily: 'Georgia, serif' } },
              'A Gutenberg Bible survives because cathedrals kept it. A 1450 apprentice\'s notebook does not survive because no one preserved it. Your generation is producing more text and images than any previous one. Most of it is on platforms that did not exist 20 years ago and may not exist in 20 years.'),
            h('ol', { style: { margin: '8px 0 0 18px', padding: 0, fontSize: 13, color: '#3a2a1a', lineHeight: 1.7, fontFamily: 'Georgia, serif' } },
              h('li', { style: { marginBottom: 6 } }, h('strong', null, 'Which of your creations would you want to survive 600 years?'), ' Schoolwork, photos, texts to friends, social posts, a piece of writing nobody has seen yet?'),
              h('li', { style: { marginBottom: 6 } }, h('strong', null, 'Where does that thing live right now?'), ' On your phone, in the cloud, on someone else\'s server, on paper?'),
              h('li', { style: { marginBottom: 6 } }, h('strong', null, 'Who would have to keep caring about it for it to last?'), ' You, your family, your school, a company, an archive?'),
              h('li', { style: { marginBottom: 0 } }, h('strong', null, 'What would your generation lose if cloud platforms shut down tomorrow?'), ' Be specific. What goes; what stays?')
            )
          ),

          // ── Four print capitals comparison ──
          // The Reformation-spread map shows geography; this section names
          // four print centers and what each one specialized in. Helps
          // students see that "European printing" was a network of regional
          // shops with distinct styles, not a single uniform tradition.
          sectionHeader('🏛️', 'Four print capitals, four specialties'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Print spread from Mainz outward in waves. Each major center developed a specialty matched to its trade, religion, and politics. By 1500 these four cities defined what European printing looked like.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 } },
            [
              { city: 'Mainz', years: '1450 – 1500', flagColor: '#a83232',
                specialty: 'Foundational presswork',
                claim: 'Gutenberg + Fust + Schöffer perfected the system here. First Bibles, the Mainz Psalter (1457), the first dated colophon.',
                fate: 'Sacked in the Diocesan War (1462), which scattered Mainz-trained printers across Europe and accidentally spread the technology.' },
              { city: 'Strasbourg', years: '1460 – 1530', flagColor: '#3a7a3a',
                specialty: 'Vernacular Bibles + reform texts',
                claim: 'Mentelin\'s shop printed the first German Bible in 1466. Free imperial city, drew refugee printers and Reformation pamphleteers.',
                fate: 'Became a primary center for Luther\'s pamphlets after 1517. The Reformation ran on Strasbourg type for a generation.' },
              { city: 'Venice', years: '1470 – 1550', flagColor: '#c9a14a',
                specialty: 'Classical scholarship + portable books',
                claim: 'Aldus Manutius\'s Aldine Press: Greek and Latin classics, italic type (1500), the portable octavo format. ~150 shops at peak.',
                fate: 'Venice\'s trade network put Aldine books on every European desk. The Index Librorum Prohibitorum (1559) hit Venice hardest because Venice printed everything.' },
              { city: 'Paris', years: '1470 – 1600', flagColor: '#5a7aa8',
                specialty: 'Scholarly reference + law + theology',
                claim: 'Estienne family, Charlotte Guillard, the Sorbonne network. Latin Thesaurus and Greek New Testament with verse numbers still in use today.',
                fate: 'Print regulation arrived early in Paris (royal censorship, 1521). Books either got the king\'s privilege or moved to Geneva and Antwerp.' }
            ].map(function(c, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' } },
                // Color stripe at top
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: c.flagColor } }),
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, marginTop: 6, flexWrap: 'wrap' } },
                  h('h4', { style: { margin: 0, fontSize: 16, color: T.accentHi, fontFamily: 'Georgia, serif' } }, c.city),
                  h('span', { style: { fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, c.years)
                ),
                h('div', { style: { fontSize: 11, color: c.flagColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'Georgia, serif' } },
                  c.specialty),
                h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.text, lineHeight: 1.55 } }, c.claim),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } }, c.fate)
              );
            })
          ),

          // ── Mainz Diocesan War (1462) sidebar ──
          // The missing causal story for why press technology spread so
          // fast: a local feudal war sacked Mainz, scattering its printers
          // across Europe. The disaster became the engine of adoption.
          sectionHeader('⚔️', 'The accident that scattered the printers: Mainz, 1462'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.danger, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'Print spread across Europe with a speed that looks miraculous unless you know the specific event that started it. In 1462, Mainz was caught in a local feudal conflict (the Diocesan War, also called the Mainz Archbishopric Feud) between two rival claimants to the archbishop\'s seat. The city was sacked and burned. The print shops were ruined.'),
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'But the printers, journeymen, and apprentices were not killed. They left. They carried Mainz-trained skills (punch-cutting, matrix-making, casting, composing, press operation, inkmaking) with them to whatever city would take them in. Within a decade, that diaspora produced presses in 60+ European cities. The spread that the standard story tells as "the press caught on" was specifically a refugee crisis turning into a technology transfer.'),
            h('div', { style: { background: T.cardAlt, borderLeft: '3px solid ' + T.warn, borderRadius: 6, padding: 12 } },
              h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8, fontFamily: 'Georgia, serif' } }, 'Where they went · 1462–1475'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 } },
                [
                  { city: 'Cologne (1464)', who: 'Ulrich Zell — one of the earliest documented Mainz emigrés.' },
                  { city: 'Strasbourg (~1464)', who: 'Multiple shops opened by Mainz-trained men; Mentelin had been working in parallel.' },
                  { city: 'Rome (1467)', who: 'Sweynheym and Pannartz brought the press to Italy. Roman classical printing was born here.' },
                  { city: 'Venice (1469)', who: 'Johannes de Spira opened the first Venice press. Within 30 years, Venice had ~150 shops.' },
                  { city: 'Paris (1470)', who: 'Three Mainz-trained printers (Gering, Crantz, Friburger) set up the first Paris press at the Sorbonne.' },
                  { city: 'Westminster (1476)', who: 'William Caxton — not directly Mainz-trained, but in the European print network the diaspora had created.' }
                ].map(function(c, i) {
                  return h('div', { key: i, style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 4, padding: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 3 } }, c.city),
                    h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } }, c.who)
                  );
                })
              )
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'A technology that might have stayed locked in Mainz for a generation went international in a decade because of a local war that scattered the people who knew how. Counterfactual: without the 1462 sack, the technology probably still spreads, but slower, and the Reformation 55 years later might find a thinner network of presses to spread Luther\'s arguments. Local accidents shape global outcomes.')
          ),

          // ── Printing innovations timeline ──
          // Gutenberg's press is the start of an arc, not a finished story.
          // Six milestones from 1450 to today situate the press in the long
          // continuity of duplication technology.
          sectionHeader('🔧', 'What came after Gutenberg: innovations 1450 → 2024'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Each milestone collapses one bottleneck. The screw press scaled up the impression rate; the iron press eliminated frame failure; steam power broke human-arm throughput; Linotype broke composing-by-hand; desktop publishing put the shop on a desk; AI is trying to break composing entirely. The arc is six centuries of unbottlenecking the same job.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
              [
                { year: '1450', name: 'Gutenberg movable-type screw press',
                  rate: '~250 impressions per day',
                  note: 'The starting point you have been studying. Wooden screw press, hand-set metal type, oil-based ink, two-person crew.' },
                { year: '1800', name: 'Stanhope iron press',
                  rate: 'still ~250/day, but larger forme + no frame failure',
                  note: 'Earl Stanhope replaced the wooden frame with cast iron. The press could handle larger sheets and last for decades without splitting. Same throughput, much higher reliability and page size.' },
                { year: '1814', name: 'Koenig steam-powered press',
                  rate: '~1,100 impressions per hour',
                  note: 'The Times of London adopted Friedrich Koenig\'s steam-powered cylinder press. Daily newspapers became economically viable for the first time. Print broke free of human-arm throughput.' },
                { year: '1886', name: 'Mergenthaler Linotype',
                  rate: 'composing jumps from ~1,000 to ~5,000 chars/hour',
                  note: 'A keyboard-operated machine cast a whole line of type at once from molten metal ("a line o\' type"). Newspapers exploded. The compositor\'s job changed from setting individual sorts to operating a keyboard. Same role, new bottleneck.' },
                { year: '1985', name: 'Desktop publishing (Apple LaserWriter + PageMaker)',
                  rate: 'shop fits on a desk',
                  note: 'A laser printer plus page-layout software put what used to be a print shop into anyone\'s home. The 600-year arc from physical sorts to virtual type closes here. The terms (font, leading, kerning) come along untouched.' },
                { year: '2024', name: 'Generative AI for text + layout',
                  rate: 'composing seconds, not hours',
                  note: 'The current frontier. The role of the human composer is shifting from setting type to setting prompts and judging output. The 1450 critic\'s questions (Who is responsible for accuracy? Does this rot reading? Who controls what spreads?) are getting asked again.' }
              ].map(function(milestone, i) {
                var isLast = (i === 5);
                return h('div', { key: i, style: { display: 'flex', gap: 12, position: 'relative' } },
                  // Year column with timeline dot
                  h('div', { style: { flex: '0 0 70px', textAlign: 'right', position: 'relative' } },
                    h('div', { style: { fontSize: 16, fontWeight: 800, color: T.accentHi, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' } }, milestone.year),
                    // Vertical line down to the next milestone
                    !isLast && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', right: -16, top: 24, bottom: -12, width: 2, background: T.accent, opacity: 0.4 } }),
                    // Dot
                    h('div', { 'aria-hidden': 'true', style: { position: 'absolute', right: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: T.accent, border: '2px solid ' + T.accentHi } })
                  ),
                  // Content column
                  h('div', { style: { flex: 1, paddingLeft: 14, paddingBottom: isLast ? 0 : 4 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Georgia, serif', marginBottom: 2 } }, milestone.name),
                    h('div', { style: { fontSize: 11, color: T.warn, fontStyle: 'italic', marginBottom: 4 } }, milestone.rate),
                    h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, milestone.note)
                  )
                );
              })
            ),
            h('p', { style: { margin: '14px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Notice the vocabulary. The 1450 words (font, kerning, leading, justify, italic, em-dash) survive every transition. The job description keeps changing; the language stays the same. Whatever comes after AI will probably still use these words.')
          ),

          // ── Press silhouettes through history ──
          // Compact visual row showing how the press itself changed shape
          // over 600 years. Pure visual; the text-heavy innovations
          // timeline above this one supplies the words.
          sectionHeader('🏭', 'The press changes shape: 1450 → today'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Same job, very different machines. The silhouettes below show what each generation\'s press looked like in profile. Notice how the press grows, mechanizes, and eventually disappears into a kitchen-appliance form factor.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' } },
              [
                { year: '1450', name: 'Wooden screw press',
                  size: '~7 ft tall · 2-person crew',
                  svg: h('svg', { viewBox: '0 0 80 100', width: '100%', style: { maxWidth: 100 }, 'aria-hidden': 'true' },
                    // A-frame wooden uprights
                    h('rect', { x: 14, y: 10, width: 6, height: 80, fill: T.wood, stroke: '#3a2a1a', strokeWidth: 1 }),
                    h('rect', { x: 60, y: 10, width: 6, height: 80, fill: T.wood, stroke: '#3a2a1a', strokeWidth: 1 }),
                    // Top horizontal beam
                    h('rect', { x: 10, y: 6, width: 60, height: 8, fill: T.wood, stroke: '#3a2a1a', strokeWidth: 1 }),
                    // Bottom horizontal beam
                    h('rect', { x: 10, y: 86, width: 60, height: 8, fill: T.wood, stroke: '#3a2a1a', strokeWidth: 1 }),
                    // Screw
                    h('line', { x1: 40, y1: 14, x2: 40, y2: 64, stroke: T.accent, strokeWidth: 3 }),
                    h('circle', { cx: 40, cy: 22, r: 6, fill: T.accentHi, stroke: '#5c4630', strokeWidth: 1 }),
                    // Bar / lever
                    h('line', { x1: 40, y1: 22, x2: 70, y2: 16, stroke: T.accent, strokeWidth: 2.5 }),
                    h('circle', { cx: 70, cy: 16, r: 2, fill: T.wood }),
                    // Platen
                    h('rect', { x: 24, y: 60, width: 32, height: 5, fill: T.wood, stroke: '#3a2a1a', strokeWidth: 1 }),
                    // Bed
                    h('rect', { x: 22, y: 70, width: 36, height: 6, fill: '#3a2a1a' }),
                    h('line', { x1: 12, y1: 96, x2: 68, y2: 96, stroke: '#3a2a1a', strokeWidth: 0.6 })
                  ) },
                { year: '1800', name: 'Stanhope iron press',
                  size: '~6 ft tall · 1-person operation',
                  svg: h('svg', { viewBox: '0 0 80 100', width: '100%', style: { maxWidth: 100 }, 'aria-hidden': 'true' },
                    // Iron frame
                    h('path', { d: 'M 16 14 L 14 88 L 22 88 L 22 14 Z', fill: '#5c5c5c', stroke: '#2a2a2a', strokeWidth: 1 }),
                    h('path', { d: 'M 58 14 L 58 88 L 66 88 L 64 14 Z', fill: '#5c5c5c', stroke: '#2a2a2a', strokeWidth: 1 }),
                    h('rect', { x: 10, y: 6, width: 60, height: 8, fill: '#3a3a3a', stroke: '#2a2a2a', strokeWidth: 1 }),
                    h('rect', { x: 10, y: 86, width: 60, height: 6, fill: '#3a3a3a' }),
                    // Compound lever mechanism
                    h('line', { x1: 40, y1: 14, x2: 40, y2: 64, stroke: '#9a9a9a', strokeWidth: 2.5 }),
                    h('circle', { cx: 40, cy: 22, r: 5, fill: '#7a7a7a', stroke: '#2a2a2a', strokeWidth: 1 }),
                    h('line', { x1: 40, y1: 22, x2: 72, y2: 24, stroke: '#9a9a9a', strokeWidth: 3 }),
                    h('circle', { cx: 72, cy: 24, r: 3, fill: '#7a7a7a' }),
                    // Platen
                    h('rect', { x: 22, y: 60, width: 36, height: 5, fill: '#3a3a3a' }),
                    // Bed
                    h('rect', { x: 20, y: 70, width: 40, height: 7, fill: '#2a2a2a' })
                  ) },
                { year: '1814', name: 'Koenig steam cylinder',
                  size: 'room-sized · steam-powered',
                  svg: h('svg', { viewBox: '0 0 80 100', width: '100%', style: { maxWidth: 100 }, 'aria-hidden': 'true' },
                    // Main bed (horizontal)
                    h('rect', { x: 4, y: 60, width: 74, height: 18, fill: '#3a3a3a', stroke: '#2a2a2a', strokeWidth: 1 }),
                    // Cylinder
                    h('circle', { cx: 40, cy: 50, r: 18, fill: '#5c5c5c', stroke: '#2a2a2a', strokeWidth: 1.5 }),
                    h('circle', { cx: 40, cy: 50, r: 12, fill: '#7a7a7a', stroke: '#2a2a2a', strokeWidth: 0.6 }),
                    h('circle', { cx: 40, cy: 50, r: 3, fill: '#2a2a2a' }),
                    // Steam pipe rising
                    h('rect', { x: 65, y: 20, width: 4, height: 40, fill: '#7a4a2a' }),
                    h('rect', { x: 60, y: 14, width: 14, height: 8, fill: '#7a4a2a', stroke: '#3a2a1a' }),
                    // Steam puffs
                    h('circle', { cx: 67, cy: 10, r: 3, fill: '#cfcfcf', opacity: 0.6 }),
                    h('circle', { cx: 72, cy: 6, r: 2, fill: '#cfcfcf', opacity: 0.5 }),
                    // Paper feed wheel
                    h('circle', { cx: 8, cy: 50, r: 6, fill: '#5c4630', stroke: '#2a2a2a' }),
                    // Paper sheet
                    h('rect', { x: 14, y: 47, width: 12, height: 6, fill: T.parchment, stroke: '#5c4630', strokeWidth: 0.4 }),
                    // Legs
                    h('rect', { x: 8, y: 78, width: 4, height: 18, fill: '#2a2a2a' }),
                    h('rect', { x: 68, y: 78, width: 4, height: 18, fill: '#2a2a2a' })
                  ) },
                { year: '1886', name: 'Linotype machine',
                  size: 'room-sized · keyboard-operated',
                  svg: h('svg', { viewBox: '0 0 80 100', width: '100%', style: { maxWidth: 100 }, 'aria-hidden': 'true' },
                    // Tall vertical magazine
                    h('rect', { x: 28, y: 4, width: 30, height: 50, fill: '#5c5c5c', stroke: '#2a2a2a', strokeWidth: 1 }),
                    // Magazine slots (vertical lines)
                    [32, 36, 40, 44, 48, 52].map(function(x, i) {
                      return h('line', { key: i, x1: x, y1: 8, x2: x, y2: 50, stroke: '#2a2a2a', strokeWidth: 0.5 });
                    }),
                    // Casting box
                    h('rect', { x: 22, y: 54, width: 42, height: 16, fill: '#3a3a3a', stroke: '#2a2a2a', strokeWidth: 1 }),
                    // Hot pot for molten lead (red glow)
                    h('rect', { x: 58, y: 56, width: 8, height: 12, fill: '#c44536', stroke: '#7a2a2a', strokeWidth: 0.6 }),
                    // Keyboard slope
                    h('polygon', { points: '14,70 30,70 24,86 8,86', fill: '#5c4630', stroke: '#2a2a2a', strokeWidth: 1 }),
                    // Key dots — wrapped in Fragment so the outer .map's
                    // returned arrays have unique keys (React warns
                    // otherwise — only the inner circles having keys is
                    // not enough when an outer iteration also returns lists)
                    [12, 16, 20].map(function(x, i) {
                      return h(React.Fragment, { key: 'kbrow' + i },
                        [76, 80, 84].map(function(y, j) {
                          return h('circle', { key: j, cx: x + j * 0.7, cy: y, r: 0.7, fill: '#cfcfcf' });
                        })
                      );
                    }),
                    // Legs
                    h('rect', { x: 22, y: 86, width: 4, height: 10, fill: '#2a2a2a' }),
                    h('rect', { x: 58, y: 86, width: 4, height: 10, fill: '#2a2a2a' })
                  ) },
                { year: '1985+', name: 'Desktop printer / press',
                  size: 'desk-sized · electric',
                  svg: h('svg', { viewBox: '0 0 80 100', width: '100%', style: { maxWidth: 100 }, 'aria-hidden': 'true' },
                    // Main rectangular body (like a laser printer)
                    h('rect', { x: 8, y: 38, width: 64, height: 36, fill: '#cfcfcf', stroke: '#5c5c5c', strokeWidth: 1, rx: 3 }),
                    h('rect', { x: 8, y: 38, width: 64, height: 6, fill: '#7a7a7a', rx: 3 }),
                    // Output tray with paper
                    h('rect', { x: 18, y: 28, width: 44, height: 12, fill: '#e8e8e8', stroke: '#5c5c5c', strokeWidth: 0.6 }),
                    h('rect', { x: 22, y: 24, width: 36, height: 12, fill: T.parchment, stroke: '#5c5c5c', strokeWidth: 0.6 }),
                    // Text on the page
                    h('line', { x1: 26, y1: 28, x2: 54, y2: 28, stroke: '#3a2a1a', strokeWidth: 0.4 }),
                    h('line', { x1: 26, y1: 30, x2: 50, y2: 30, stroke: '#3a2a1a', strokeWidth: 0.4 }),
                    h('line', { x1: 26, y1: 32, x2: 52, y2: 32, stroke: '#3a2a1a', strokeWidth: 0.4 }),
                    // Paper input tray
                    h('rect', { x: 18, y: 74, width: 44, height: 8, fill: '#e8e8e8', stroke: '#5c5c5c', strokeWidth: 0.6 }),
                    // Status light
                    h('circle', { cx: 64, cy: 50, r: 2, fill: T.ok }),
                    // Front display
                    h('rect', { x: 14, y: 50, width: 20, height: 6, fill: '#2a2a2a', stroke: '#5c5c5c', strokeWidth: 0.4 })
                  ) }
              ].map(function(p, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 10, textAlign: 'center' } },
                  h('div', { style: { fontSize: 11, color: T.accentHi, fontFamily: 'ui-monospace, monospace', marginBottom: 6, fontWeight: 700 } }, p.year),
                  h('div', { style: { background: T.bg, borderRadius: 6, padding: 6, marginBottom: 8 } }, p.svg),
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: T.text, fontFamily: 'Georgia, serif', marginBottom: 2 } }, p.name),
                  h('div', { style: { fontSize: 9, color: T.dim, fontStyle: 'italic' } }, p.size)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'The 1450 press was wood and your two arms. The 2026 desktop printer is plastic, electronics, and a USB cable. Both put ink on paper. The shape of the work moved off your back and into a kilowatt.')
          ),

          // ── ETAOIN SHRDLU keyboard story ──
          // Connects the letter-frequency heatmap in Set Type to the
          // Linotype milestone in the innovations timeline. Closes the
          // 1450→1886 loop by showing how letter frequency reorganized
          // the keyboard itself.
          sectionHeader('⌨️', 'ETAOIN SHRDLU: when letter frequency redesigned the keyboard'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'The 1450 type case was organized by frequency: the most-used letters (E, T, A, O, I, N) sat in the easiest compartments to reach. When the Linotype arrived in 1886, designers had a fresh chance to lay out a keyboard from scratch. They did not pick alphabetical. They picked frequency.'),
            // Visual: the actual lowercase Linotype keyboard layout
            h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 12, marginBottom: 12 } },
              h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8, textAlign: 'center', fontFamily: 'Georgia, serif' } }, 'Linotype keyboard, lowercase section'),
              // Render the actual Linotype keyboard layout (left half, lowercase letters)
              // Row 1 (top): e t a o i n   s h r d l u
              // Row 2:        c m f w y p   v b g k q j
              // Row 3:        x z (and rare/punct)
              // The 12 most-frequent English letters are the top row.
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'ui-monospace, Consolas, monospace', alignItems: 'center' } },
                ['etaoin shrdlu', 'cmfwyp vbgkqj', 'xz       .,'].map(function(row, rowIdx) {
                  return h('div', { key: rowIdx, style: { display: 'flex', gap: 4 } },
                    row.split('').map(function(ch, ci) {
                      if (ch === ' ') return h('div', { key: ci, style: { width: 28 } });
                      var isTopRow = (rowIdx === 0);
                      return h('div', { key: ci,
                        style: {
                          width: 28, height: 32,
                          background: isTopRow ? T.accent : T.bg,
                          color: isTopRow ? T.ink : T.text,
                          border: '1px solid ' + (isTopRow ? T.accentHi : T.border),
                          borderRadius: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, serif',
                          boxShadow: isTopRow ? '0 1px 2px rgba(0,0,0,0.4)' : 'none'
                        } }, ch);
                    })
                  );
                })
              ),
              h('div', { style: { fontSize: 10, color: T.dim, textAlign: 'center', marginTop: 8, fontStyle: 'italic' } },
                'The gold top row is "ETAOIN SHRDLU" — the 12 most-frequent English letters, in frequency order.')
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              'A skilled Linotype operator did not "type" the way you do on QWERTY. They worked the keyboard with a left-hand right-hand split, hitting the most common letters from the top row, just like a compositor used to reach for E first in the case.'),
            h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              'The phrase "etaoin shrdlu" became newspaper slang. When a Linotype operator made a mistake mid-line, the standard recovery was to run a finger down the first two columns to fill out the line, then throw away the slug. Sometimes the operator forgot to throw it away, and "etaoin shrdlu" appeared mysteriously in the next morning\'s paper. The New York Times collected dozens of these accidents in the 1960s.'),
            h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'QWERTY (designed for typewriters in 1873) was not frequency-ordered; it was designed to slow typists down so the keys would not jam. ETAOIN SHRDLU represents a counterfactual: if the dominant keyboard had descended from Linotype rather than typewriter, your laptop today would feel completely different under your fingers.')
          ),

          // ── Where the press lives now ──
          // Four modern devices/formats with their 1450 ancestor named.
          // Grounds 600-year continuity in objects students use daily.
          sectionHeader('📱', 'Where the press lives now'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'You did not stop using the press. The press changed shape and moved into your pocket. Four examples of where 1450 technology lives in your daily life.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 } },
            [
              { modern: 'Your laser printer',
                ancestor: 'The screw press',
                arrow: 'descended from',
                lineage: 'A laser printer puts ink on paper via a heated drum instead of metal type, but the job is identical: convert digital text into physical impressions. The throughput equation (impressions per hour) is what shifted; the abstraction stayed.',
                color: T.danger },
              { modern: 'Your e-reader (Kindle, Kobo)',
                ancestor: 'The printed book',
                arrow: 'descended from',
                lineage: 'An e-reader displays text in pages with leading and justification, in a typeface chosen by the publisher, with a cover and a colophon. The page-turning metaphor is direct. E-ink technology imitates the visual physics of ink on paper specifically because that is what worked for 600 years.',
                color: T.accent },
              { modern: 'A social-media post',
                ancestor: 'The broadside',
                arrow: 'descended from',
                lineage: 'A 1450 broadside was a single sheet of opinion or announcement, distributed cheaply and quickly to a public who would read it aloud to others. A modern post is a single screen of opinion or announcement, distributed cheaply and quickly to a public who shares it. Same job, different medium.',
                color: T.warn },
              { modern: 'A PDF document',
                ancestor: 'The forme (locked page of type)',
                arrow: 'descended from',
                lineage: 'A PDF is a fixed, page-addressable container of text and image arranged in a precise layout that will print identically wherever it goes. That is exactly what a forme was: locked-up content, paginated, distribution-ready. Adobe named the technology "Portable Document Format" because the forme was already portable.',
                color: T.ok }
            ].map(function(row, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderLeft: '3px solid ' + row.color, borderRadius: 10, padding: 12 } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 4 } }, row.modern),
                h('div', { style: { fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontStyle: 'italic', marginBottom: 4 } }, row.arrow),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: row.color, fontFamily: 'Georgia, serif', marginBottom: 8 } }, row.ancestor),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, row.lineage)
              );
            })
          ),

          // ── Capstone quote card ──
          // Period quotation as an emotional close to the module. The
          // Erasmus quote is one of the earliest documented written
          // reflections on what the press meant to a person living through
          // its arrival.
          h('div', { style: { position: 'relative', background: 'radial-gradient(ellipse at 50% 30%, #fef3c7 0%, ' + T.parchment + ' 70%)', color: T.ink, border: '3px solid ' + T.accent, borderRadius: 14, padding: '22px 26px', marginBottom: 14, textAlign: 'center', boxShadow: 'inset 0 0 24px rgba(201,161,74,0.18), 0 2px 8px rgba(0,0,0,0.3)' } },
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, left: 12, color: T.accent } }, fleuron(14)),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, right: 12, color: T.accent } }, fleuron(14)),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, left: 12, color: T.accent } }, fleuron(14)),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, right: 12, color: T.accent } }, fleuron(14)),
            h('div', { style: { fontSize: 60, color: T.accent, lineHeight: 0.5, fontFamily: 'Georgia, serif', marginBottom: 4, opacity: 0.5 } }, '“'),
            h('p', { style: { margin: '0 auto 10px', fontSize: 16, lineHeight: 1.65, color: '#3a2a1a', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', maxWidth: 560 } },
              'Printing is the wonder of all wonders. It is the gift of God, by which old things may be made new and new things made known.'),
            h('div', { style: { fontSize: 12, color: '#7c2d12', fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.04em' } },
              '— Desiderius Erasmus, ~1500'),
            h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic', marginTop: 4 } },
              'Dutch humanist scholar, writing within a generation of Gutenberg, on what the printed book meant to a person living through its arrival.')
          ),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('beforeAfter', [
            { q: 'Approximately how many books were printed in Europe in the 16th century (1500s)?', opts: ['About 1 million', 'About 10 million', 'About 120 million', 'About 1 billion'], ans: 2, explain: '~120 million books in the 1500s, roughly 25× the cumulative European production of the entire previous century. The 1600s nearly tripled this again.' },
            { q: 'Why did the Reformation succeed where earlier reform movements (Wycliffe, Hus) failed?', opts: ['Luther was more persuasive', 'Print spread the message faster than it could be suppressed', 'The Catholic Church was weaker', 'Random chance'], ans: 1, explain: 'Wycliffe and Hus made very similar arguments a century earlier in manuscript culture and were locally suppressed. Print made suppression impossible — by the time authorities reacted, the message was already in dozens of cities.' },
            { q: 'What was the biggest scientific impact of the printing press?', opts: ['Faster reading speed', 'Standardization (every copy of an anatomical figure was identical), priority-via-publication, and cumulative knowledge across cities', 'It made scientists rich', 'It is unrelated to science'], ans: 1, explain: 'Standardized figures, publication as proof of priority, and cumulative cross-city knowledge are the three structural changes print made to science. The modern scientific publication system is a direct descendant of these print-era practices.' }
          ]),

          sourcesBlock([
            { label: 'Elizabeth Eisenstein, "The Printing Press as an Agent of Change" (1980)' },
            { label: 'Andrew Pettegree, "The Book in the Renaissance" (2010)', url: 'https://yalebooks.yale.edu/book/9780300178210/the-book-in-the-renaissance/' },
            { label: 'Eltjo Buringh & Jan Luiten van Zanden — book production data', url: 'https://www.jstor.org/stable/40208712' },
            { label: 'British Library — The Gutenberg Bible', url: 'https://www.bl.uk/treasures/gutenberg/homepage.html' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.beforeAfter),
          crossLinkFooter('beforeAfter'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 6 — TYPOGRAPHY TODAY
      // ═════════════════════════════════════════════════════════════════════
      function renderTypographyToday() {
        // Name personalizer state. Default placeholder lets the widget
        // render meaningful preview even before the student types.
        var typoNameRaw = useState('VERITAS');
        var typoName = typoNameRaw[0], setTypoName = typoNameRaw[1];
        // Era-detective quiz state. 5 rounds of typeface-to-century matching.
        var detRoundRaw = useState(0);
        var detRound = detRoundRaw[0], setDetRound = detRoundRaw[1];
        var detPickedRaw = useState(null);
        var detPicked = detPickedRaw[0], setDetPicked = detPickedRaw[1];
        var detScoreRaw = useState(0);
        var detScore = detScoreRaw[0], setDetScore = detScoreRaw[1];
        // AI-generated round override — when set, displayed instead of the
        // static cycle. Cleared on Next sample / Play again so static stays
        // the predictable curated path.
        var detAiRoundRaw = useState(null);
        var detAiRound = detAiRoundRaw[0], setDetAiRound = detAiRoundRaw[1];
        var detGenStateRaw = useState({ loading: false, error: null });
        var detGenState = detGenStateRaw[0], setDetGenState = detGenStateRaw[1];
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🔤 Typography Today'),
          dropCapPara('Open any document on your laptop. Word, Google Docs, a text message. The vocabulary you see (font, leading, kerning, em-dash, justified, italic) is the vocabulary of a 1450 print shop. The medium changed; the language did not.'),

          sectionHeader('📖', 'The vocabulary of digital type, decoded'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { term: 'Font', origin: 'A "fount" of type — a complete set of one typeface in one size. A 12-point Garamond fount = thousands of physical sorts, all the same design.' },
              { term: 'Leading', origin: 'Pronounced "ledding." The thin strips of LEAD inserted between lines of type to add vertical spacing. Modern CSS line-height descends from this.' },
              { term: 'Kerning', origin: 'The "kern" was the part of a sort that overhung the metal block (the diagonal of the W, for instance). Kerning today = adjusting space between specific letter pairs.' },
              { term: 'Em-dash, En-dash', origin: 'A dash the width of a capital M ("em") or a lowercase n ("en"). The widths come from the physical type sizes used as rulers.' },
              { term: 'Uppercase / Lowercase', origin: 'The upper wooden case held capitals; the lower case held minuscules (the more frequently used letters, placed in easier reach).' },
              { term: 'Italic', origin: 'Aldus Manutius commissioned a slanted typeface in Venice ~1500, modeled on Italian humanist handwriting. "Italic" = "Italian." It saved space in his pocket-sized books.' },
              { term: 'Justified text', origin: 'Compositors inserted thin metal spacers ("quads") between words to make every line the same width. "Justify" = "to make right" in line length.' },
              { term: 'Roman / Italic / Bold', origin: 'Roman type imitated 15th-century Italian humanist handwriting (which itself imitated ancient Roman inscriptions). Bold came later, in the 19th century, for headlines.' },
              { term: 'Galley proof', origin: 'A "galley" was the metal tray that held set type before pagination. A "galley proof" was an early impression pulled for proofreading.' },
              { term: 'Stereotype', origin: 'A solid metal printing plate cast from set type, used to print many copies without re-setting. Now means "fixed mental image" — the metaphor preserved the original meaning.' },
              { term: 'Cliché', origin: 'French for the sound of a stereotype plate being struck during casting ("clic-shé"). A cliché was a ready-made plate of common phrases. Now means "overused phrase."' },
              { term: 'Hot off the press', origin: 'Newly-printed sheets came off the press literally warm from the inking. We still say it about fresh news.' }
            ].map(function(t, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                h('div', { style: { fontSize: 15, fontWeight: 700, color: T.accentHi, marginBottom: 4, fontFamily: 'Georgia, serif' } }, t.term),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, t.origin)
              );
            })
          ),

          // ── Inline visual demos ──
          // Five abstract typography terms students just read about, now
          // demonstrated as side-by-side bad-vs-good visuals. The point
          // is that students SEE the difference instead of just being told.
          // Each demo has a short caption explaining what they are looking at.
          sectionHeader('👁️', 'See the difference'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 14 } },
            // ── Leading ──
            h('div', { style: { background: T.parchment, color: T.ink, padding: 12, borderRadius: 8, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Leading (line spacing)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 } },
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Tight'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 11, lineHeight: 0.95, color: T.ink } },
                    'When the leading is too tight, lines of text feel cramped and the eye loses its place between them.')),
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Open'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 11, lineHeight: 1.7, color: T.ink } },
                    'When leading is open, the text breathes and the eye finds the next line easily.'))
              ),
              h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic' } }, 'Lead strips between rows of type controlled this. Today: CSS line-height.')
            ),

            // ── Kerning ──
            h('div', { style: { background: T.parchment, color: T.ink, padding: 12, borderRadius: 8, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Kerning (letter-pair spacing)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 } },
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'No kerning'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 38, fontWeight: 700, color: T.ink, letterSpacing: '0.02em' } }, 'AVA')),
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Kerned'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 38, fontWeight: 700, color: T.ink, letterSpacing: '-0.08em' } }, 'AVA'))
              ),
              h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic' } }, 'Diagonal letter pairs (AV, VA, To, We) leave visible gaps. Kerning closes them.')
            ),

            // ── Em-dash vs En-dash ──
            h('div', { style: { background: T.parchment, color: T.ink, padding: 12, borderRadius: 8, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Em-dash and En-dash'),
              h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 22, color: T.ink, marginBottom: 6, lineHeight: 1.3 } },
                h('div', null, 'M ', h('span', { style: { color: '#7c2d12' } }, '—'), ' (em-dash, M-wide)'),
                h('div', null, 'n ', h('span', { style: { color: '#7c2d12' } }, '–'), ' (en-dash, n-wide)'),
                h('div', null, '- (hyphen)')
              ),
              h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic' } }, 'Width references come from physical type sizes used as rulers in print shops.')
            ),

            // ── Italic ──
            h('div', { style: { background: T.parchment, color: T.ink, padding: 12, borderRadius: 8, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Italic (Aldus Manutius, ~1500)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 } },
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Roman'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 18, color: T.ink, lineHeight: 1.3 } },
                    'Aut viam inveniam aut faciam.')),
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Italic'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 18, color: T.ink, lineHeight: 1.3, fontStyle: 'italic' } },
                    'Aut viam inveniam aut faciam.'))
              ),
              h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic' } }, 'Italic was invented for SPACE, not emphasis — to fit more text per line in pocket-sized books.')
            ),

            // ── Justified text ──
            h('div', { style: { background: T.parchment, color: T.ink, padding: 12, borderRadius: 8, border: '1px solid ' + T.border, gridColumn: 'span 2' } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Justified text (every line the same width)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 } },
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Ragged-right'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 12, color: T.ink, lineHeight: 1.5, textAlign: 'left' } },
                    'When the right edge of a paragraph is allowed to fall where it falls, the result is called ragged-right. Each line ends with a natural word break.')),
                h('div', null,
                  h('div', { style: { fontSize: 9, color: '#7c2d12', marginBottom: 2, fontWeight: 600 } }, 'Justified'),
                  h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 12, color: T.ink, lineHeight: 1.5, textAlign: 'justify' } },
                    'When the right edge of a paragraph is forced to align, the compositor inserts thin metal spacers between words so every line ends at the same position.'))
              ),
              h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic' } }, 'Compositors used metal "quads" between words. The spacing was a craft skill.')
            )
          ),

          // ── Famous typefaces showcase ──
          // 9 typefaces from Blackletter (1455) through Helvetica (1957),
          // each with a sample line and a 2-3-sentence history. Uses CSS
          // font-family fallbacks so visual differences appear on most
          // systems without requiring web-font loads. Pedagogically: every
          // major typeface has a recognizable visual personality that
          // reflects the moment it was designed.
          // ── One letter, six centuries ──
          // Tight visual primer: render the lowercase 'a' in six period
          // typefaces side by side. Same letter, dramatically different
          // shape. Sets up the larger showcase below.
          sectionHeader('🔡', 'One letter, six centuries'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Same letter. Six different times in history. The lowercase a is one of the most-changed letters in Latin type. Compare the closed double-storey "a" of medieval Blackletter with the open geometric "a" of Helvetica.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 } },
              [
                { year: '1455', name: 'Blackletter', font: '"UnifrakturMaguntia", "Old English Text MT", "Goudy Old Style", serif', italic: false },
                { year: '1470', name: 'Roman', font: '"Cambria", "Georgia", "Times New Roman", serif', italic: false },
                { year: '1500', name: 'Italic', font: '"Cambria", "Georgia", serif', italic: true },
                { year: '1722', name: 'Caslon', font: '"Big Caslon", "Caslon Pro", "Hoefler Text", "Georgia", serif', italic: false },
                { year: '1798', name: 'Bodoni', font: '"Bodoni 72", "Didot", "Cambria", serif', italic: false },
                { year: '1957', name: 'Helvetica', font: '"Helvetica", "Helvetica Neue", "Arial", sans-serif', italic: false }
              ].map(function(tf, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 10, textAlign: 'center' } },
                  h('div', { style: {
                    background: T.parchment, color: T.ink,
                    fontFamily: tf.font,
                    fontStyle: tf.italic ? 'italic' : 'normal',
                    fontSize: 72, lineHeight: 1, padding: '8px 4px',
                    border: '1px solid #8a7a5a', borderRadius: 4,
                    marginBottom: 6, fontWeight: 400
                  } }, 'a'),
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, tf.name),
                  h('div', { style: { fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, tf.year)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Designers call this the letter\'s "skeleton" plus its "skin." The skeleton (basic structure) survives across centuries; the skin (proportions, contrast, terminals) marks the era. A type historian can usually date an unattributed book within 50 years just by looking at the lowercase a.')
          ),

          sectionHeader('🏛️', 'Six centuries of typefaces'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Every typeface carries the visual personality of its era. Blackletter is medieval. Aldine italic is Renaissance scholarship. Bodoni is the Enlightenment cult of contrast. Helvetica is post-war Swiss neutrality. The samples below render in approximations of each typeface (depends on what your system has installed).'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { name: 'Blackletter / Textura',  year: '1455', designer: 'Johannes Gutenberg, Mainz',
                font: '"UnifrakturMaguntia", "Old English Text MT", "Goudy Old Style", serif',
                hist: 'The face of the Gutenberg Bible. Dense, vertical, ecclesiastical — the look of medieval manuscripts brought to print. Hard to read for modern eyes; that density was a feature, not a bug, signaling "this is a sacred text."' },
              { name: 'Roman (Jenson)', year: '1470', designer: 'Nicolas Jenson, Venice',
                font: '"Cambria", "Georgia", "Times New Roman", serif',
                hist: 'The first truly humanist Roman type. Jenson based the letterforms on Italian humanist scribes who themselves were imitating ancient Roman inscriptions. Almost every Roman typeface since (Garamond, Caslon, etc.) descends from this design.' },
              { name: 'Italic (Aldine)', year: '1500', designer: 'Francesco Griffo for Aldus Manutius, Venice',
                font: '"Cambria", "Georgia", serif', italic: true,
                hist: 'Commissioned by Aldus Manutius for his pocket-format Greek classics. The slant let more text fit per line, making smaller, more portable books viable. The original "italic" was a body type, not used for emphasis — that came later.' },
              { name: 'Garamond',  year: '1530', designer: 'Claude Garamond, Paris',
                font: '"Garamond", "EB Garamond", "Cambria", serif',
                hist: 'The defining French Renaissance Roman. Refined Jenson\'s letterforms with even more elegance. Most modern "Garamond" fonts (Adobe Garamond, EB Garamond, Garamond Premier) are revivals of either Garamond himself or his student Jean Jannon.' },
              { name: 'Caslon', year: '1722', designer: 'William Caslon, London',
                font: '"Big Caslon", "Caslon Pro", "Hoefler Text", "Georgia", serif',
                hist: 'The English workhorse. The Declaration of Independence and the U.S. Constitution were first printed in Caslon. "When in doubt, use Caslon" was the standard advice for English-language printers for over 200 years.' },
              { name: 'Baskerville', year: '1757', designer: 'John Baskerville, Birmingham',
                font: '"Baskerville", "Libre Baskerville", "Cambria", serif',
                hist: 'Higher contrast between thick and thin strokes than earlier Romans. So radical for its time that Benjamin Franklin defended it against critics who said the strokes were too sharp to read. Now considered one of the most readable typefaces ever designed.' },
              { name: 'Bodoni', year: '1798', designer: 'Giambattista Bodoni, Parma',
                font: '"Bodoni 72", "Didot", "Cambria", serif',
                hist: 'Extreme contrast: hair-thin horizontals, heavy verticals, sharp serifs. The visual signature of the Enlightenment. Bodoni\'s editions of Homer and Virgil are still considered among the most beautiful books ever printed. Modern fashion magazines still reach for Bodoni for the same reason.' },
              { name: 'Times New Roman', year: '1932', designer: 'Stanley Morison + Victor Lardent for The Times of London',
                font: '"Times New Roman", "Times", serif',
                hist: 'Designed for newspaper economics: narrower than earlier Romans, so more words fit per column inch. The Times of London used it for ~60 years. Became the default body text of office software in the 1990s, which is why your school documents probably default to it.' },
              { name: 'Helvetica',  year: '1957', designer: 'Max Miedinger + Eduard Hoffmann, Switzerland',
                font: '"Helvetica", "Helvetica Neue", "Arial", sans-serif',
                hist: 'Swiss post-war design philosophy: neutral, geometric, no ornament. Designed to be the type that "disappears" so the message comes through. Now ubiquitous (NYC subway signs, corporate logos, modernist branding). A 2007 documentary is named for it.' }
            ].map(function(tf, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
                  h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700 } }, tf.name),
                  h('span', { style: { fontSize: 11, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, tf.year)
                ),
                h('div', { style: { fontSize: 11, color: T.warn, fontStyle: 'italic', marginBottom: 8 } }, tf.designer),
                // Type sample
                h('div', { style: {
                  background: T.parchment, color: T.ink,
                  padding: '12px 14px', borderRadius: 6, marginBottom: 10,
                  fontFamily: tf.font,
                  fontStyle: tf.italic ? 'italic' : 'normal',
                  fontSize: 20, lineHeight: 1.2,
                  border: '1px solid #8a7a5a',
                  textAlign: 'center'
                } }, 'The quick brown fox jumps over the lazy dog'),
                h('p', { style: { margin: 0, fontSize: 12, color: T.text, lineHeight: 1.55 } }, tf.hist)
              );
            })
          ),

          // ── Name in 600 Years of Type ──
          // Personal-relevance hook: the student types their name and
          // sees it rendered in 5 typefaces spanning 1455 to 1957. Makes
          // 'typeface as period costume' instantly tangible.
          sectionHeader('\u270D\uFE0F', 'Your name through 600 years of type'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'Type your name, a word, or a short phrase. See it set in five typefaces from across the printed centuries. Each one was the default of its era. Your name in Blackletter would have looked like a 1455 contract. In Helvetica it would look like a 1980s passport.'),
            // Input
            h('div', { className: 'printingpress-no-print', style: { marginBottom: 14 } },
              h('label', { htmlFor: 'pp-typo-name', style: { display: 'block', fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 6 } }, 'Your name or word'),
              h('input', {
                id: 'pp-typo-name',
                type: 'text',
                value: typoName,
                maxLength: 32,
                onChange: function(e) { setTypoName(e.target.value || ''); },
                placeholder: 'Type your name…',
                style: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 16, fontFamily: 'Georgia, serif', letterSpacing: '0.04em', boxSizing: 'border-box' }
              })
            ),
            // Five typeface samples
            (function() {
              var display = (typoName && typoName.trim()) ? typoName : 'YOUR NAME';
              var SAMPLES = [
                { name: 'Blackletter', year: '1455', context: 'Gutenberg Bible. Sacred.',
                  font: '"UnifrakturMaguntia", "Old English Text MT", "Goudy Old Style", serif', italic: false },
                { name: 'Garamond', year: '1530', context: 'French Renaissance. Scholarly.',
                  font: '"Garamond", "EB Garamond", "Cambria", serif', italic: false },
                { name: 'Caslon', year: '1722', context: 'Declaration of Independence.',
                  font: '"Big Caslon", "Caslon Pro", "Hoefler Text", "Georgia", serif', italic: false },
                { name: 'Bodoni', year: '1798', context: 'Enlightenment elegance.',
                  font: '"Bodoni 72", "Didot", "Cambria", serif', italic: false },
                { name: 'Helvetica', year: '1957', context: 'Swiss neutrality. Modern.',
                  font: '"Helvetica", "Helvetica Neue", "Arial", sans-serif', italic: false }
              ];
              return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                SAMPLES.map(function(tf, i) {
                  return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 12 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, tf.name),
                      h('div', { style: { fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace' } }, tf.year)
                    ),
                    h('div', { style: {
                      background: T.parchment, color: T.ink,
                      padding: '14px 12px', borderRadius: 6,
                      fontFamily: tf.font, fontSize: 26, lineHeight: 1.15,
                      textAlign: 'center', minHeight: 36,
                      border: '1px solid #8a7a5a',
                      overflowWrap: 'anywhere',
                      marginBottom: 6
                    } }, display),
                    h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic', textAlign: 'center' } }, tf.context)
                  );
                })
              );
            })(),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
              'If the typefaces look similar on your screen, your system may not have all of them installed. The fallbacks try to keep the right family (serif/sans/blackletter), but the exact letterforms vary.'),
          ),

          // ── Survivor's gallery: marks that crossed 600 years ──
          // Many of the special characters on a modern keyboard came from
          // 1450 print-shop practice. Showing them with their original
          // purpose grounds the "typography vocabulary survived" claim.
          sectionHeader('🧷', 'Marks that survived from 1450 into your keyboard'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Look at the special-character set in any word processor or in Unicode. Many of these marks were physical sorts in a 1450 print shop, and they survived because compositors kept setting them and readers kept understanding them.'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              [
                { mark: '¶', name: 'Pilcrow',
                  then: 'Marked the start of a new paragraph in a manuscript or early printed book, especially in chapter divisions. From the Greek "paragraphos."',
                  now: 'Still used in editing software to show formatting; the symbol survives in Word and Google Docs as "show invisible characters."' },
                { mark: '§', name: 'Section sign',
                  then: 'Marked a section break in legal and theological texts. Two interlocking S\'s suggesting "signum sectionis."',
                  now: 'Used in legal documents, U.S. law citations (e.g., 18 U.S.C. § 1001), and academic writing.' },
                { mark: '†', name: 'Dagger (obelus)',
                  then: 'Used by editors to mark suspect or spurious passages in manuscripts. Carried over into footnotes when the asterisk was taken.',
                  now: 'Footnote indicator after asterisk; also used to mark deceased authors in dated lists.' },
                { mark: '‡', name: 'Double dagger',
                  then: 'The third footnote mark after asterisk and dagger. Print shops kept all three on hand because no one wanted four footnotes in a paragraph.',
                  now: 'Less common today but still standard for the third footnote when symbols are used instead of numbers.' },
                { mark: '⁂', name: 'Asterism',
                  then: 'Three asterisks in a triangle. Used to mark a section break inside a chapter, gentler than a chapter break.',
                  now: 'Mostly extinct in mainstream typesetting, but used by some fiction publishers for scene breaks within a chapter.' },
                { mark: '❦', name: 'Floral heart (aldus leaf)',
                  then: 'A printer\'s flower (fleuron) used to decorate the end of a section or to fill out a short final line. Aldus Manutius set many of these.',
                  now: 'Used in book design for decorative breaks; rendering depends on the font. You see it on poetry pages and chapter dividers.' },
                { mark: '☞', name: 'Manicule (pointing hand)',
                  then: 'A pointing-hand mark that indicated "look here." Drawn in manuscript margins; later cast as a metal sort. Books from 1500-1700 are full of them.',
                  now: 'Re-emerged as a UI icon ("click here") and a Unicode character. The original "user-interface arrow."' },
                { mark: '&', name: 'Ampersand',
                  then: 'A ligature of the Latin "et" (and). Compositors cast it as a single sort because the word was so common. The shape comes from a hand-written "et" run together.',
                  now: 'Everywhere. Brands love it (AT&T, Procter & Gamble). Still a ligature in many typefaces; some fonts give it nearly architectural beauty.' },
                { mark: 'Æ', name: 'Æ ligature',
                  then: 'A single sort combining A and E for Latin words like "Æneid." Compositors saved a slot in the case for it.',
                  now: 'Still used in scientific names, Norse/Faroese/Icelandic text, and stylish branding (Encyclopædia Britannica kept it for centuries).' }
              ].map(function(m, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 } },
                    h('div', { style: { fontSize: 32, fontFamily: 'Georgia, serif', color: T.accentHi, lineHeight: 1, minWidth: 36, textAlign: 'center' } }, m.mark),
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Georgia, serif' } }, m.name)
                  ),
                  h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'In 1450'),
                  h('p', { style: { margin: '0 0 6px', fontSize: 11, color: T.muted, lineHeight: 1.55 } }, m.then),
                  h('div', { style: { fontSize: 10, color: T.ok, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'In 2026'),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, m.now)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Open a word processor right now and try Insert > Special Character. Roughly a quarter of what is in there is the contents of a 1450 type case.')
          ),

          calloutBox('info', 'Movable type as the first discrete-symbol information system',
            'Computer scientists sometimes argue that movable type was the world\'s first true discrete information system. Each sort is a discrete symbol. Each character position is addressable. The forme is a 2D array of symbols. Print is a copy operation. The same conceptual structure shows up 500 years later in ASCII, Unicode, and digital text. Marshall McLuhan made this case explicitly in "The Gutenberg Galaxy" (1962).'),

          // ── Crew reflection: what does your font say about you? ──
          // Closes the typography module by pulling 600 years of history
          // into the student's own daily choices.
          sectionHeader('🤔', 'Reflection: what does your font say about you?'),
          h('div', { style: { background: T.parchment, color: T.ink, border: '2px solid ' + T.accent, borderRadius: 12, padding: 18, marginBottom: 14, position: 'relative' } },
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, left: 12, color: T.accent, fontSize: 14 } }, '❦'),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, right: 12, color: T.accent, fontSize: 14 } }, '❦'),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, left: 12, color: T.accent, fontSize: 14 } }, '❦'),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, right: 12, color: T.accent, fontSize: 14 } }, '❦'),
            h('p', { style: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.65, color: '#3a2a1a', fontFamily: 'Georgia, serif' } },
              'A 1500 printer chose Blackletter for a Bible to signal sacred weight, Garamond for a Renaissance philosopher to signal humanist clarity, italic for a pocket book to fit more text per page. Every typeface choice was a claim about what the text was for.'),
            h('p', { style: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.65, color: '#3a2a1a', fontFamily: 'Georgia, serif' } },
              'You make the same kind of claim every time you open a document and pick a font. Most students never think about this. Pause and think about it now:'),
            h('ol', { style: { margin: '8px 0 0 22px', padding: 0, fontSize: 13, color: '#3a2a1a', fontFamily: 'Georgia, serif', lineHeight: 1.7 } },
              h('li', { style: { marginBottom: 6 } }, h('strong', null, 'What font do you actually use'), ' for your school papers, your texts, your slides? If you say "the default," whose default is that?'),
              h('li', { style: { marginBottom: 6 } }, h('strong', null, 'If you had to pick a font that represents you'), ' (your personality, your sense of humor, the way you carry yourself), which would you pick? Why?'),
              h('li', { style: { marginBottom: 6 } }, h('strong', null, 'Which font signals "I am being serious"'), ' in your school context? Which signals "I am being playful?" Where did you learn that?'),
              h('li', { style: { marginBottom: 0 } }, h('strong', null, 'Comic Sans is widely mocked online.'), ' It is also one of the most readable fonts for people with dyslexia. Does that change how you think about it?')
            )
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('typographyToday', 0, {
            prompt: 'A student asks why the abbreviation "lb" is used for "pound." What does typography history have to do with the answer?',
            choices: [
              'Nothing.',
              'It does not — "lb" comes from Latin "libra," not from typography.',
              'Latin "libra pondo" (pound by weight) gave us "lb." Typography preserved Latin abbreviations because compositors could re-use the same sorts. Many Latin abbreviations survived into print and into us.',
              'It comes from English.'
            ],
            correct: 2,
            explain: 'Latin "libra pondo" gave us both "lb" and the British pound sign £. Many Latin abbreviations (lb, oz from "uncia," etc., am/pm from "ante/post meridiem") survived into print because compositors had Latin-trained eyes and reusable sorts for these forms. Typography preserved a lot of medieval and Roman vocabulary that would otherwise have died.'
          }),

          // ── Era detective: typeface-to-century matching quiz ──
          // Tests the visual pattern recognition built up by the existing
          // typeface showcases. 5 rounds of "name the century from this
          // typeface sample." Designed for transferable skill, not memory.
          sectionHeader('🔍', 'Era detective: name the century'),
          (function() {
            var ROUNDS = [
              { sample: 'Verbum Domini',
                font: '"UnifrakturMaguntia", "Old English Text MT", "Goudy Old Style", serif',
                italic: false, era: '1450s',
                why: 'Blackletter (Textura). Dense, vertical, ecclesiastical. The face of the Gutenberg Bible. Anyone publishing a sacred text in 1455 would set it like this.' },
              { sample: 'Festina lente',
                font: '"Cambria", "Georgia", serif', italic: true, era: '1500s',
                why: 'Aldine italic. Slanted, cursive, modeled on humanist handwriting. Aldus Manutius commissioned this exact style from Francesco Griffo around 1500 to fit more text into pocket-format books.' },
              { sample: 'Liberty or Death',
                font: '"Big Caslon", "Caslon Pro", "Hoefler Text", "Georgia", serif',
                italic: false, era: '1700s',
                why: 'Caslon. The English workhorse typeface. The Declaration of Independence and the U.S. Constitution were first printed in Caslon. "When in doubt, use Caslon" was the standard rule of English-language printers for 200 years.' },
              { sample: 'Madame Bovary',
                font: '"Bodoni 72", "Didot", "Cambria", serif', italic: false, era: '1800s',
                why: 'Bodoni. Hair-thin horizontals, heavy verticals, sharp serifs. The visual signature of the Enlightenment and Napoleonic Europe. Modern fashion magazines still reach for it for the same reason.' },
              { sample: 'EXIT',
                font: '"Helvetica", "Helvetica Neue", "Arial", sans-serif',
                italic: false, era: '1900s',
                why: 'Helvetica. Swiss post-war design philosophy: neutral, geometric, no ornament. Designed in 1957. Now the default of subway signs, corporate logos, and modernist branding.' }
            ];
            var ERAS = ['1450s', '1500s', '1700s', '1800s', '1900s'];
            // Era → canonical font + italic preset, used when an AI round
            // is generated so the visual rendering matches the period.
            // Same fonts as the static ROUNDS so the visual vocabulary is
            // consistent across static + generated rounds.
            var ERA_FONT = {
              '1450s': { font: '"UnifrakturMaguntia", "Old English Text MT", "Goudy Old Style", serif', italic: false, label: 'Blackletter' },
              '1500s': { font: '"Cambria", "Georgia", serif', italic: true, label: 'Aldine italic' },
              '1700s': { font: '"Big Caslon", "Caslon Pro", "Hoefler Text", "Georgia", serif', italic: false, label: 'Caslon' },
              '1800s': { font: '"Bodoni 72", "Didot", "Cambria", serif', italic: false, label: 'Bodoni' },
              '1900s': { font: '"Helvetica", "Helvetica Neue", "Arial", sans-serif', italic: false, label: 'Helvetica' }
            };
            var round = detAiRound || ROUNDS[detRound % ROUNDS.length];
            var isAiRound = !!detAiRound;
            var done = detRound >= ROUNDS.length && !detAiRound;

            function generateNewRound() {
              if (!callGemini) {
                setDetGenState({ loading: false, error: 'AI tutor unavailable in this build.' });
                return;
              }
              setDetGenState({ loading: true, error: null });
              var prompt = 'Generate ONE typeface-detective round. Pick ONE era from this exact list: 1450s | 1500s | 1700s | 1800s | 1900s. ' +
                'Then write a 1-4 word sample text that would feel period-appropriate for that era — register matching the typeface tradition: ' +
                '1450s = scriptural / sacred Latin (Verbum Domini, Pater Noster, Sanctus); ' +
                '1500s = Renaissance humanist Latin or Italian motto (Festina lente, Aldus, Cogito); ' +
                '1700s = Enlightenment / colonial English (Liberty or Death, Common Sense, We the People); ' +
                '1800s = Victorian / Romantic English or French (Madame Bovary, Wuthering Heights, Les Misérables); ' +
                '1900s = modernist / post-war English (EXIT, METRO, NEW YORK, USE OTHER DOOR). ' +
                'Respond with ONLY a JSON object. NO markdown fences, NO commentary outside the JSON. Exact shape: ' +
                '{"sample": "<the period-appropriate text>", "era": "<one of 1450s|1500s|1700s|1800s|1900s>", "why": "<1-2 sentence explanation tying the visual style of the era\'s typeface to its historical context>"}.';
              callGemini(prompt, { maxOutputTokens: 350 })
                .then(function(resp) {
                  var raw = (resp && (resp.text || resp.content || (typeof resp === 'string' ? resp : ''))) || '';
                  var braceMatch = raw.match(/\{[\s\S]*\}/);
                  if (!braceMatch) {
                    setDetGenState({ loading: false, error: 'AI returned no JSON object. Try again.' });
                    return;
                  }
                  var parsed;
                  try { parsed = JSON.parse(braceMatch[0]); }
                  catch (e) {
                    setDetGenState({ loading: false, error: 'AI returned an unparseable response. Try again.' });
                    return;
                  }
                  if (!parsed || !parsed.sample || !parsed.era || !parsed.why) {
                    setDetGenState({ loading: false, error: 'AI response missing required fields. Try again.' });
                    return;
                  }
                  if (ERAS.indexOf(parsed.era) === -1) {
                    setDetGenState({ loading: false, error: 'AI named an era outside the allowed list. Try again.' });
                    return;
                  }
                  // Look up canonical font for the era so the rendering
                  // matches what the typeface gallery taught.
                  var typo = ERA_FONT[parsed.era];
                  setDetAiRound({
                    sample: String(parsed.sample),
                    era: parsed.era,
                    font: typo.font,
                    italic: typo.italic,
                    why: String(parsed.why)
                  });
                  setDetPicked(null);
                  setDetGenState({ loading: false, error: null });
                  announce('New AI-generated typeface sample loaded.');
                })
                .catch(function(err) {
                  setDetGenState({ loading: false, error: 'Could not reach the AI: ' + ((err && err.message) || 'unknown error') });
                });
            }

            function pick(era) {
              if (detPicked !== null) return;
              setDetPicked(era);
              if (era === round.era) setDetScore(detScore + 1);
              announce(era === round.era ? 'Correct.' : 'Not that one. Correct era is now shown.');
            }
            function nextRound() {
              // Always advance the static index — AI rounds clear here too
              // so the user returns to the curated cycle.
              setDetAiRound(null);
              setDetRound(detRound + 1);
              setDetPicked(null);
              setDetGenState({ loading: false, error: null });
            }
            function reset() {
              setDetAiRound(null);
              setDetRound(0);
              setDetPicked(null);
              setDetScore(0);
              setDetGenState({ loading: false, error: null });
            }
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 6 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
                  h('div', { style: { fontSize: 11, color: T.dim, fontFamily: 'ui-monospace, monospace' } },
                    done ? 'Round complete' : (isAiRound ? 'AI round (off-cycle)' : ('Round ' + (detRound + 1) + ' of ' + ROUNDS.length))),
                  isAiRound && h('span', {
                    style: { fontSize: 10, color: T.warn, fontStyle: 'italic', padding: '2px 8px', background: 'rgba(245,215,126,0.12)', borderRadius: 4, border: '1px solid ' + T.warn }
                  }, '\u{1F916} AI-generated round')
                ),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700 } }, 'Score: ' + detScore + ' / ' + ROUNDS.length)
              ),
              // AI generation status — error or loading
              detGenState.error && h('div', {
                'aria-live': 'polite', role: 'alert',
                style: { padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 10, background: '#3d2810', border: '1px dashed ' + T.warn, color: '#fed7aa' }
              }, '⚠ ' + detGenState.error),
              !done && h(React.Fragment, null,
                // The sample
                h('div', { style: { background: T.parchment, color: T.ink, padding: '20px 18px', border: '2px solid ' + T.wood, borderRadius: 6, marginBottom: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.4) inset' } },
                  h('div', { style: { fontFamily: round.font, fontStyle: round.italic ? 'italic' : 'normal', fontSize: 36, lineHeight: 1.1, fontWeight: 400 } }, round.sample)
                ),
                // Era buttons
                h('div', { className: 'printingpress-no-print', style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 10 } },
                  ERAS.map(function(era) {
                    var isPicked = (detPicked === era);
                    var isCorrect = (era === round.era);
                    var bg = T.cardAlt;
                    var brd = T.border;
                    if (detPicked !== null) {
                      if (isCorrect) { bg = 'rgba(127,176,105,0.18)'; brd = T.ok; }
                      else if (isPicked) { bg = 'rgba(199,69,54,0.16)'; brd = T.danger; }
                    }
                    return h('button', { key: era,
                      onClick: function() { pick(era); },
                      disabled: detPicked !== null,
                      style: btn({ padding: '8px 18px', fontSize: 13, fontFamily: 'Georgia, serif',
                        background: bg, color: T.text, borderColor: brd,
                        fontWeight: (detPicked !== null && isCorrect) ? 700 : 500 })
                    }, era);
                  })
                ),
                // Reveal
                detPicked !== null && (function() {
                  var correct = (detPicked === round.era);
                  return h('div', { 'aria-live': 'polite',
                    style: { padding: 10, borderRadius: 6, fontSize: 12, lineHeight: 1.6, marginBottom: 8,
                      background: correct ? '#1f3d28' : '#3d2810',
                      border: '1px solid ' + (correct ? T.ok : T.warn),
                      color: correct ? '#bbf7d0' : '#fed7aa' } },
                    h('div', { style: { fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia, serif' } },
                      correct ? '✓ ' + round.era : '✗ The correct era is ' + round.era),
                    h('div', { style: { fontStyle: 'italic', opacity: 0.92 } }, round.why)
                  );
                })(),
                detPicked !== null && h('div', { className: 'printingpress-no-print', style: { textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('button', { onClick: nextRound, style: btnPrimary({ padding: '8px 16px', fontSize: 12 }) },
                    isAiRound ? 'Back to curated cycle →' : (detRound < ROUNDS.length - 1 ? 'Next sample →' : 'See score →')),
                  callGemini && h('button', {
                    onClick: generateNewRound,
                    disabled: detGenState.loading,
                    'aria-label': 'Generate a new AI typeface round',
                    style: btn({
                      padding: '8px 14px', fontSize: 12,
                      opacity: detGenState.loading ? 0.6 : 1,
                      cursor: detGenState.loading ? 'wait' : 'pointer',
                      borderColor: T.warn, color: T.warn
                    })
                  }, detGenState.loading ? '\u{1F916} Generating…' : '\u{1F916} Generate (AI)')
                )
              ),
              done && h('div', { style: { padding: 14, background: detScore >= 4 ? '#1f3d28' : '#3d2810', border: '1px solid ' + (detScore >= 4 ? T.ok : T.warn), borderRadius: 8, color: detScore >= 4 ? '#bbf7d0' : '#fed7aa', textAlign: 'center' } },
                h('div', { style: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 16, marginBottom: 6 } },
                  'Final score: ' + detScore + ' / ' + ROUNDS.length),
                h('div', { style: { fontSize: 12, fontStyle: 'italic', marginBottom: 10 } },
                  detScore === ROUNDS.length ? 'Type historians would shake your hand. You can date a book by glance.' :
                  detScore >= 3 ? 'Solid eye for period style. Another browse through the typeface gallery and you would be at 5/5.' :
                  'The patterns become obvious with a few more passes. Try the typeface gallery again, then come back.'),
                h('div', { className: 'printingpress-no-print', style: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('button', {
                    onClick: reset,
                    style: btnPrimary({ padding: '8px 14px', fontSize: 12 }) }, '↻ Play again'),
                  callGemini && h('button', {
                    onClick: generateNewRound,
                    disabled: detGenState.loading,
                    'aria-label': 'Generate a new AI typeface round',
                    style: btn({
                      padding: '8px 14px', fontSize: 12,
                      opacity: detGenState.loading ? 0.6 : 1,
                      cursor: detGenState.loading ? 'wait' : 'pointer',
                      borderColor: T.warn, color: T.warn
                    })
                  }, detGenState.loading ? '\u{1F916} Generating…' : '\u{1F916} Generate bonus (AI)')
                )
              )
            );
          })(),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('typographyToday', [
            { q: 'The term "leading" (line spacing) comes from:', opts: ['The lead actor in a play', 'Strips of lead inserted between lines of metal type to add vertical space', 'Leading the eye', 'A printer named Leading'], ans: 1, explain: 'Lead strips of varying thickness were placed between rows of type to space lines vertically. CSS line-height is the digital descendant.' },
            { q: 'Italic type was invented (or popularized) by:', opts: ['Gutenberg', 'Aldus Manutius in Venice ~1500', 'A medieval monk', 'Modern designers'], ans: 1, explain: 'Aldus Manutius commissioned a slanted typeface from Francesco Griffo in Venice ~1500, modeled on humanist handwriting. He used it to fit more text per page in his portable octavo-format books — the original pocket paperbacks.' },
            { q: 'Why are capital letters called "uppercase"?', opts: ['They are taller', 'In a print shop, capitals lived in the upper of two wooden type cases', 'Tradition with no specific origin', 'Computer convention'], ans: 1, explain: 'Literal physical position. The compositor stood in front of two cases. Capitals (less frequently used) were in the upper case (farther reach); minuscules in the lower case (closer reach).' }
          ]),

          sourcesBlock([
            { label: 'Robert Bringhurst, "The Elements of Typographic Style" (4th ed., 2013)' },
            { label: 'Marshall McLuhan, "The Gutenberg Galaxy" (1962)' },
            { label: 'Jost Hochuli, "Detail in Typography"' },
            { label: 'Type@Cooper — Typography history resources', url: 'https://typecooper.com/' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.typographyToday),
          crossLinkFooter('typographyToday'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 7 — THE PEOPLE BEHIND THE PRESS
      // ═════════════════════════════════════════════════════════════════════
      function renderPeople() {
        // Who-said-this attribution game state. Quotes are imagined
        // in the voice of each figure, drawing on documented work or
        // motto. 5-round rotation, score persists in-session.
        var pplQuoteIdxRaw = useState(0);
        var pplQuoteIdx = pplQuoteIdxRaw[0], setPplQuoteIdx = pplQuoteIdxRaw[1];
        var pplGuessRaw = useState(null);
        var pplGuess = pplGuessRaw[0], setPplGuess = pplGuessRaw[1];
        var pplRevealedRaw = useState(false);
        var pplRevealed = pplRevealedRaw[0], setPplRevealed = pplRevealedRaw[1];
        var pplScoreRaw = useState(0);
        var pplScore = pplScoreRaw[0], setPplScore = pplScoreRaw[1];
        var pplAttemptedRaw = useState(0);
        var pplAttempted = pplAttemptedRaw[0], setPplAttempted = pplAttemptedRaw[1];
        // AI-generated quote override — when set, shown instead of the
        // static QUOTES rotation. Cleared on "Next quote" so the student
        // can always return to the curated set.
        var pplAiQuoteRaw = useState(null);
        var pplAiQuote = pplAiQuoteRaw[0], setPplAiQuote = pplAiQuoteRaw[1];
        var pplGenStateRaw = useState({ loading: false, error: null });
        var pplGenState = pplGenStateRaw[0], setPplGenState = pplGenStateRaw[1];
        // "Find your historical printer match" quiz state. 4 questions,
        // 4 archetypes. Each answer scores +1 toward one archetype.
        var matchAnswersRaw = useState([null, null, null, null]);
        var matchAnswers = matchAnswersRaw[0], setMatchAnswers = matchAnswersRaw[1];
        // Period-archetype silhouette functions. Each is a small SVG portrait
        // (head + shoulders) styled to evoke the figure's era and role.
        // Stylized, not photorealistic — many of these figures (especially
        // the women printers) have no surviving portraits, so a stylized
        // silhouette is the honest representation. Costume + posture do the
        // identification work: cap shape, beard length, headcovering, etc.
        var SILHOUETTES = {
          // Renaissance German burgher: bearded, soft cap, high-collared robe
          gutenberg: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Soft round cap (mid-15th-century Mainz style)
              h('path', { d: 'M 18 22 Q 18 12 35 10 Q 52 12 52 22 Q 52 24 50 24 L 20 24 Q 18 24 18 22 Z', fill: '#1a1410' }),
              h('ellipse', { cx: 35, cy: 22, rx: 18, ry: 4, fill: '#0a0805' }),
              // Face
              h('ellipse', { cx: 35, cy: 32, rx: 11, ry: 13, fill: '#d4b58a' }),
              // Beard (full)
              h('path', { d: 'M 26 36 Q 24 50 35 56 Q 46 50 44 36 Q 40 42 35 42 Q 30 42 26 36 Z', fill: '#3d2914' }),
              // Mustache
              h('path', { d: 'M 28 38 Q 35 36 42 38', stroke: '#3d2914', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' }),
              // Eyes
              h('circle', { cx: 31, cy: 31, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 39, cy: 31, r: 0.8, fill: '#1a1410' }),
              // High-collared robe
              h('path', { d: 'M 14 80 L 14 60 Q 14 56 22 54 L 48 54 Q 56 56 56 60 L 56 80 Z', fill: '#3d2914' }),
              // Collar trim
              h('path', { d: 'M 22 54 L 30 60 L 35 56 L 40 60 L 48 54', stroke: '#5a3a1f', strokeWidth: 1.2, fill: 'none' })
            );
          },
          // Merchant/financier: similar Mainz cap, clean-shaven, ledger collar
          fust: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Flat merchant cap with brim
              h('path', { d: 'M 16 22 Q 16 12 35 10 Q 54 12 54 22 L 56 24 L 14 24 Z', fill: '#1a1410' }),
              h('rect', { x: 14, y: 22, width: 42, height: 3, fill: '#0a0805' }),
              // Face (clean-shaven)
              h('ellipse', { cx: 35, cy: 34, rx: 11, ry: 14, fill: '#d4b58a' }),
              // Eyes
              h('circle', { cx: 31, cy: 32, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 39, cy: 32, r: 0.8, fill: '#1a1410' }),
              // Subtle mouth
              h('path', { d: 'M 32 41 Q 35 42 38 41', stroke: '#5c2f0e', strokeWidth: 0.8, fill: 'none' }),
              // Subtle jowl/chin shadow
              h('path', { d: 'M 28 44 Q 35 50 42 44', stroke: '#a08560', strokeWidth: 0.6, fill: 'none' }),
              // Merchant's robe with money-pouch chain
              h('path', { d: 'M 14 80 L 14 60 Q 14 54 22 52 L 48 52 Q 56 54 56 60 L 56 80 Z', fill: '#5a3a1f' }),
              // Chain (decorative — financier's status)
              h('path', { d: 'M 22 56 Q 35 62 48 56', stroke: '#c9a14a', strokeWidth: 1.2, fill: 'none' }),
              h('circle', { cx: 35, cy: 60, r: 1.5, fill: '#c9a14a' })
            );
          },
          // Apprentice/scribe: younger, bare-headed or simple cap, scholarly
          schoffer: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Hair (younger, no cap)
              h('path', { d: 'M 22 22 Q 22 14 35 12 Q 48 14 48 22 Q 48 28 47 30 L 23 30 Q 22 28 22 22 Z', fill: '#3d2914' }),
              // Face
              h('ellipse', { cx: 35, cy: 34, rx: 10, ry: 13, fill: '#d4b58a' }),
              // Eyes
              h('circle', { cx: 31, cy: 32, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 39, cy: 32, r: 0.8, fill: '#1a1410' }),
              // Light beard hint
              h('path', { d: 'M 28 42 Q 35 46 42 42', stroke: '#3d2914', strokeWidth: 0.6, fill: 'none' }),
              // Scribe's tunic (simpler than Gutenberg/Fust)
              h('path', { d: 'M 16 80 L 16 58 Q 16 54 22 52 L 48 52 Q 54 54 54 58 L 54 80 Z', fill: '#5a4630' }),
              // Quill behind ear hint (small line)
              h('line', { x1: 47, y1: 25, x2: 52, y2: 18, stroke: '#f5e8c8', strokeWidth: 1.2, strokeLinecap: 'round' })
            );
          },
          // Renaissance Italian humanist scholar: academic biretta, bearded
          aldus: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Square academic biretta (4-cornered)
              h('path', { d: 'M 16 14 L 54 14 L 54 22 L 16 22 Z', fill: '#1a1410' }),
              h('path', { d: 'M 16 14 L 54 14 L 50 10 L 20 10 Z', fill: '#0a0805' }),
              // Hat tassel
              h('line', { x1: 35, y1: 14, x2: 35, y2: 6, stroke: '#c9a14a', strokeWidth: 1 }),
              h('circle', { cx: 35, cy: 5, r: 1.5, fill: '#c9a14a' }),
              // Face
              h('ellipse', { cx: 35, cy: 32, rx: 11, ry: 13, fill: '#c9a07a' }),
              // Long pointed beard (humanist style)
              h('path', { d: 'M 27 38 Q 26 50 35 60 Q 44 50 43 38 Q 39 44 35 44 Q 31 44 27 38 Z', fill: '#5a4036' }),
              // Eyes
              h('circle', { cx: 31, cy: 31, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 39, cy: 31, r: 0.8, fill: '#1a1410' }),
              // Mustache
              h('path', { d: 'M 28 37 Q 35 35 42 37', stroke: '#5a4036', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' }),
              // Scholarly robe with deep V neck (Venetian academic)
              h('path', { d: 'M 14 80 L 14 60 Q 14 54 22 52 L 48 52 Q 56 54 56 60 L 56 80 Z', fill: '#3d1f1f' }),
              h('path', { d: 'M 22 52 L 35 65 L 48 52', stroke: '#1a1410', strokeWidth: 1.2, fill: 'none' })
            );
          },
          // 16th-c French/Parisian woman: gabled headcovering + dress
          guillard: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // White coif/headcovering (typical for Parisian women)
              h('path', { d: 'M 14 24 Q 14 8 35 6 Q 56 8 56 24 L 56 32 Q 56 36 50 36 L 20 36 Q 14 36 14 32 Z', fill: '#f5e8c8' }),
              h('path', { d: 'M 14 24 Q 14 8 35 6 Q 56 8 56 24', stroke: '#a08560', strokeWidth: 1, fill: 'none' }),
              // Inner hairband line
              h('path', { d: 'M 20 26 Q 35 24 50 26', stroke: '#a08560', strokeWidth: 0.5, fill: 'none' }),
              // Face (visible in opening)
              h('ellipse', { cx: 35, cy: 36, rx: 9, ry: 10, fill: '#e8c9a4' }),
              // Eyes
              h('circle', { cx: 32, cy: 35, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 38, cy: 35, r: 0.8, fill: '#1a1410' }),
              // Subtle mouth
              h('path', { d: 'M 33 41 Q 35 42 37 41', stroke: '#7c2d12', strokeWidth: 0.7, fill: 'none' }),
              // Wide collar / partlet (covers neck)
              h('path', { d: 'M 18 80 L 18 56 Q 18 50 26 48 L 44 48 Q 52 50 52 56 L 52 80 Z', fill: '#3d1f1f' }),
              // White collar trim
              h('path', { d: 'M 26 48 Q 35 52 44 48', stroke: '#f5e8c8', strokeWidth: 2, fill: 'none' })
            );
          },
          // Scholar-priest at desk: skullcap, austere robe (Estienne family archetype)
          estienne: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Skullcap
              h('path', { d: 'M 22 18 Q 22 10 35 8 Q 48 10 48 18 Q 48 22 47 24 L 23 24 Q 22 22 22 18 Z', fill: '#1a1410' }),
              // Face
              h('ellipse', { cx: 35, cy: 32, rx: 11, ry: 13, fill: '#d4b58a' }),
              // Short beard (scholar-priest)
              h('path', { d: 'M 28 40 Q 35 50 42 40 Q 38 44 35 44 Q 32 44 28 40 Z', fill: '#5a4036' }),
              // Eyes
              h('circle', { cx: 31, cy: 31, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 39, cy: 31, r: 0.8, fill: '#1a1410' }),
              // Mustache
              h('path', { d: 'M 30 37 Q 35 35 40 37', stroke: '#5a4036', strokeWidth: 1, fill: 'none' }),
              // Austere black robe with white collar tab (Geneva-Reformed style)
              h('path', { d: 'M 14 80 L 14 60 Q 14 54 22 52 L 48 52 Q 56 54 56 60 L 56 80 Z', fill: '#1a1410' }),
              // Two white "preaching tabs" hanging at the throat
              h('rect', { x: 32, y: 52, width: 2.5, height: 8, fill: '#f5e8c8' }),
              h('rect', { x: 35.5, y: 52, width: 2.5, height: 8, fill: '#f5e8c8' })
            );
          },
          // 18th-century American: balding, spectacles, plain coat (Franklin)
          franklin: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Face (older, balding)
              h('ellipse', { cx: 35, cy: 32, rx: 12, ry: 14, fill: '#d4b58a' }),
              // Receding hair (sides only)
              h('path', { d: 'M 22 22 Q 24 16 28 14', stroke: '#9c8a6e', strokeWidth: 6, fill: 'none', strokeLinecap: 'round' }),
              h('path', { d: 'M 48 22 Q 46 16 42 14', stroke: '#9c8a6e', strokeWidth: 6, fill: 'none', strokeLinecap: 'round' }),
              // Long hair down the back of the neck (lower sides)
              h('path', { d: 'M 22 28 Q 18 38 22 48', stroke: '#9c8a6e', strokeWidth: 5, fill: 'none', strokeLinecap: 'round' }),
              h('path', { d: 'M 48 28 Q 52 38 48 48', stroke: '#9c8a6e', strokeWidth: 5, fill: 'none', strokeLinecap: 'round' }),
              // Spectacles (Franklin's iconic round glasses)
              h('circle', { cx: 30, cy: 32, r: 4, fill: 'none', stroke: '#1a1410', strokeWidth: 1.2 }),
              h('circle', { cx: 40, cy: 32, r: 4, fill: 'none', stroke: '#1a1410', strokeWidth: 1.2 }),
              h('line', { x1: 34, y1: 32, x2: 36, y2: 32, stroke: '#1a1410', strokeWidth: 1 }),
              // Eyes (visible behind specs)
              h('circle', { cx: 30, cy: 32, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 40, cy: 32, r: 0.8, fill: '#1a1410' }),
              // Subtle mouth
              h('path', { d: 'M 31 42 Q 35 44 39 42', stroke: '#7c2d12', strokeWidth: 0.8, fill: 'none' }),
              // Plain dark coat with high lapels (18th-century American)
              h('path', { d: 'M 12 80 L 12 60 Q 12 54 22 52 L 48 52 Q 58 54 58 60 L 58 80 Z', fill: '#3d2914' }),
              // Lapels
              h('path', { d: 'M 22 52 L 28 70 L 35 56 L 42 70 L 48 52', stroke: '#5a3a1f', strokeWidth: 1.5, fill: 'none' }),
              // White cravat at throat
              h('path', { d: 'M 30 56 Q 35 62 40 56', stroke: '#f5e8c8', strokeWidth: 3, fill: 'none' })
            );
          },
          // Northern Renaissance humanist scholar (Erasmus archetype, after
          // the Holbein portrait): soft round scholar's cap that covers the
          // whole crown, pale studious face turned slightly to the side as
          // if reading, beardless, austere black robe with a thin white
          // collar showing. A quill held to the right side signals scholar-
          // at-work — the documented Holbein portrait of Erasmus shows him
          // writing.
          erasmus: function() {
            return h('svg', { width: 70, height: 80, viewBox: '0 0 70 80', 'aria-hidden': 'true' },
              // Soft round scholar's cap (covers the whole crown, no brim)
              h('path', { d: 'M 16 26 Q 16 8 35 6 Q 54 8 54 26 Q 54 28 52 28 L 18 28 Q 16 28 16 26 Z', fill: '#1a1410' }),
              h('ellipse', { cx: 35, cy: 26, rx: 19, ry: 3, fill: '#0a0805' }),
              // Cap shadow under the brim
              h('path', { d: 'M 18 28 L 52 28', stroke: '#0a0805', strokeWidth: 0.6, fill: 'none', opacity: 0.7 }),
              // Face — turned slightly (eye-line shifted right of center)
              h('ellipse', { cx: 35, cy: 36, rx: 11, ry: 13, fill: '#dec0a0' }),
              // Eyes (looking down + slightly right, studious)
              h('circle', { cx: 32, cy: 36, r: 0.8, fill: '#1a1410' }),
              h('circle', { cx: 39, cy: 36, r: 0.8, fill: '#1a1410' }),
              // Faint nose line (Holbein portrait shows a sharp, prominent
              // nose; signal it with a thin shadow)
              h('path', { d: 'M 34 36 Q 33 40 34 43', stroke: '#a8896c', strokeWidth: 0.5, fill: 'none' }),
              // Quietly drawn mouth
              h('path', { d: 'M 32 46 Q 35 47 38 46', stroke: '#7c2d12', strokeWidth: 0.7, fill: 'none' }),
              // Austere black scholar's robe
              h('path', { d: 'M 14 80 L 14 58 Q 14 54 22 52 L 48 52 Q 56 54 56 58 L 56 80 Z', fill: '#1a1410' }),
              // Thin white shirt collar showing
              h('path', { d: 'M 26 52 Q 35 56 44 52', stroke: '#f5e8c8', strokeWidth: 1.2, fill: 'none' }),
              // Quill held in right hand (to the right side of the figure)
              h('line', { x1: 56, y1: 76, x2: 64, y2: 56, stroke: '#f5e8c8', strokeWidth: 1.4, strokeLinecap: 'round' }),
              h('line', { x1: 60, y1: 66, x2: 64, y2: 60, stroke: '#d4c4a0', strokeWidth: 0.8, strokeLinecap: 'round' }),
              h('line', { x1: 62, y1: 62, x2: 64, y2: 58, stroke: '#d4c4a0', strokeWidth: 0.8, strokeLinecap: 'round' })
            );
          }
        };
        var PEOPLE = [
          { silhouetteKey: 'gutenberg', name: 'Johannes Gutenberg', dates: '~1400–1468', city: 'Mainz', role: 'Inventor (or perfecter) of European movable-type printing.',
            story: 'Goldsmith by training. The actual invention was a system: punch-cutting + matrix-casting + alloy + oil-based ink + screw press + paper handling, all working together. Gutenberg perfected each piece and integrated them. He died nearly bankrupt — financial control of his press passed to Fust and Schöffer years before the Bible was finished.' },
          { silhouetteKey: 'fust', name: 'Johann Fust', dates: '~1400–1466', city: 'Mainz', role: 'Goldsmith and financier who funded — and then sued — Gutenberg.',
            story: 'Lent Gutenberg the equivalent of a small fortune to set up the press. When Gutenberg could not repay on schedule, Fust sued, won the lawsuit, and took possession of the press and most of the printed Bible inventory. Fust\'s name is on the colophon of subsequent books, not Gutenberg\'s. Without Fust\'s capital, the press would not have been built. Without his lawsuit, Gutenberg might not have been remembered as the inventor.' },
          { silhouetteKey: 'schoffer', name: 'Peter Schöffer', dates: '~1425–1503', city: 'Mainz', role: 'Gutenberg\'s apprentice; later Fust\'s son-in-law and partner.',
            story: 'A skilled scribe before he came to Gutenberg. Schöffer is credited with major refinements to type design, and he ran the press after Fust took it over. The Mainz Psalter (1457), one of the most beautiful early printed books, bears Fust and Schöffer\'s names — making it the first book with a printer\'s colophon.' },
          { silhouetteKey: 'aldus', name: 'Aldus Manutius', dates: '1449–1515', city: 'Venice', role: 'Renaissance scholar-printer who invented the pocket book.',
            story: 'Founded the Aldine Press in 1494. Pioneered the small octavo format ("portable books"), commissioned italic type to fit more text per page, and printed Greek classics in beautiful, scholarly editions. The Aldine dolphin-and-anchor logo was widely counterfeited — the first piracy of a publisher\'s brand. Modern paperbacks descend from his portable formats.' },
          { silhouetteKey: 'erasmus', name: 'Desiderius Erasmus', dates: '1466–1536', city: 'Rotterdam, Basel, and most of Europe', role: 'Humanist scholar; the AD FONTES rallying cry was effectively his.',
            story: 'The most prolific scholar in Europe in the early 1500s, and arguably the figure who most fully fused the printing press with humanist scholarship. His 1516 Greek New Testament — printed by Johann Froben in Basel — restored the original-language text after centuries of Latin Vulgate copies, and Luther translated from Erasmus\'s Greek edition into German three years later. Erasmus drove printers in Basel, Venice, Paris, and Antwerp to publish ancient sources in their original languages, and personally corresponded with Aldus Manutius for years. AD FONTES — back to the sources — was the program of his life.' },
          { silhouetteKey: 'guillard', name: 'Charlotte Guillard', dates: '~1485–1557', city: 'Paris', role: 'Printer and publisher; ran one of the largest Paris presses for ~30 years.',
            story: 'Inherited her husband\'s printing business in 1518 and ran it for nearly four decades. Specialized in scholarly Latin theology and law. Her shop produced over 150 substantial books — many with her own preface or note. One of dozens of women who ran European presses in the 16th-17th centuries; women printers were common but standard histories often left them out.' },
          { silhouetteKey: 'estienne', name: 'The Estienne family', dates: '1500s', city: 'Paris and Geneva', role: 'Multi-generational scholar-printers; produced reference standards still used today.',
            story: 'Henri Estienne, Robert Estienne, and Henri Estienne II produced the Latin Thesaurus and the Greek Thesaurus — reference works still cited as Estienne pagination 500 years later. Robert\'s 1551 Greek New Testament introduced the verse numbering still used in Bibles today.' },
          { silhouetteKey: 'franklin', name: 'Benjamin Franklin', dates: '1706–1790', city: 'Philadelphia', role: 'Printer, publisher, and revolutionary.',
            story: 'Apprenticed as a printer at age 12. Owned the print shop that produced Pennsylvania Gazette, Poor Richard\'s Almanack, and an enormous range of pamphlets including some of the most important American Revolutionary writing. The press shaped his political career; he ran the colonial postal service partly to distribute newspapers. The American Founding was a print revolution.' }
        ];

        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('👥 The People Behind the Press'),
          dropCapPara('The story of the press is usually told as Gutenberg, alone, with the Bible. The truth is messier and more interesting — financiers, apprentices, scholars, women printers, and revolutionary pamphleteers. Standard histories often left out who actually did the work.'),

          h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', marginBottom: 12, padding: '8px 12px', background: T.cardAlt, borderRadius: 6, border: '1px solid ' + T.border } },
            'Note on the silhouettes: many of these figures (especially the women) have no surviving portraits. The illustrations below are stylized period archetypes that signal era and role, not photographic likenesses. The point is that we know the work; we do not always know the face.'),

          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            PEOPLE.map(function(p, i) {
              var silhouette = SILHOUETTES[p.silhouetteKey];
              // Reuse the menu tile entrance animation. Each portrait fades
              // up in sequence (90ms stagger, slightly slower than the menu
              // since portraits are larger and want a more deliberate reveal).
              return h('div', { key: i,
                className: 'printingpress-tile',
                style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'flex-start',
                  animationDelay: (i * 90) + 'ms' } },
                // Silhouette portrait on the left, framed as a Renaissance
                // commemorative medallion: oval mask, double-rule border in
                // gold, decorative fleurons at top and bottom of the medal,
                // dark parchment background that echoes the broadside palette.
                h('div', { style: { position: 'relative', flexShrink: 0, width: 96, padding: '14px 4px 18px' } },
                  // Oval medallion frame using SVG
                  h('svg', { width: 96, height: 110, viewBox: '0 0 96 110', 'aria-hidden': 'true',
                    style: { position: 'absolute', top: 6, left: 0 } },
                    // Outer dark backing
                    h('ellipse', { cx: 48, cy: 55, rx: 44, ry: 52, fill: T.cardAlt, stroke: T.accent, strokeWidth: 2 }),
                    // Inner thin gold rule
                    h('ellipse', { cx: 48, cy: 55, rx: 41, ry: 49, fill: 'none', stroke: T.accent, strokeWidth: 0.6, opacity: 0.6 }),
                    // Top fleuron on the medallion
                    h('g', { transform: 'translate(48, 4)' },
                      h('path', { d: 'M 0 -2.5 L 2 0 L 0 2.5 L -2 0 Z', fill: T.accent }),
                      h('circle', { cx: 0, cy: -3.5, r: 0.6, fill: T.accent }),
                      h('circle', { cx: 0, cy: 3.5, r: 0.6, fill: T.accent }),
                      h('circle', { cx: -3.5, cy: 0, r: 0.6, fill: T.accent }),
                      h('circle', { cx: 3.5, cy: 0, r: 0.6, fill: T.accent })
                    ),
                    // Bottom fleuron
                    h('g', { transform: 'translate(48, 106)' },
                      h('path', { d: 'M 0 -2.5 L 2 0 L 0 2.5 L -2 0 Z', fill: T.accent }),
                      h('circle', { cx: 0, cy: -3.5, r: 0.6, fill: T.accent }),
                      h('circle', { cx: 0, cy: 3.5, r: 0.6, fill: T.accent }),
                      h('circle', { cx: -3.5, cy: 0, r: 0.6, fill: T.accent }),
                      h('circle', { cx: 3.5, cy: 0, r: 0.6, fill: T.accent })
                    )
                  ),
                  // The silhouette itself, positioned inside the oval.
                  // Wrapped in a container that overlays a faint diagonal
                  // cross-hatch pattern via repeating-linear-gradients —
                  // mimics the appearance of a Renaissance wood engraving
                  // (light cross-hatching for shading). The overlay sits
                  // on top of the silhouette and gives the portrait an
                  // "engraved on the page" period quality without obscuring
                  // any facial detail. pointer-events: none so it stays
                  // decorative-only.
                  h('div', { style: { position: 'relative', textAlign: 'center', paddingTop: 6 } },
                    silhouette ? silhouette() : null,
                    h('div', { 'aria-hidden': 'true', style: {
                      position: 'absolute', top: 6, left: 0, right: 0, bottom: 0,
                      background: 'repeating-linear-gradient(45deg, transparent 0px, transparent 3px, rgba(26,20,16,0.07) 3px, rgba(26,20,16,0.07) 3.5px), repeating-linear-gradient(135deg, transparent 0px, transparent 4px, rgba(26,20,16,0.05) 4px, rgba(26,20,16,0.05) 4.5px)',
                      pointerEvents: 'none',
                      mixBlendMode: 'multiply',
                      borderRadius: '50%'
                    } })
                  )
                ),
                // Bio on the right
                h('div', null,
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                    h('h4', { style: { margin: 0, fontSize: 17, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700 } }, p.name),
                    h('span', { style: { fontSize: 11, color: T.dim } }, p.dates + ' · ' + p.city)),
                  h('div', { style: { fontSize: 12, color: T.warn, fontStyle: 'italic', marginBottom: 8, fontWeight: 600 } }, p.role),
                  h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6 } }, p.story)
                )
              );
            })
          ),

          calloutBox('info', 'Why women printers got written out',
            'Estimates suggest 5-10% of European print shops in the 16th-17th centuries were run by women — usually printer widows who took over family businesses, but also some who came to it through other paths. Many produced significant scholarly and devotional work for decades. Standard 19th-century histories of printing focused almost exclusively on male printer-scholars and largely erased these contributions. Recent scholarship (Susan Broomhall, Helwi Blom, others) has been recovering this history. Worth bringing into a middle-school classroom.'),

          // ── Who said this? Quote attribution game ──
          // Lightly interactive layer on the read-only portrait gallery.
          // 5 imagined quotes in each figure's voice; student picks the
          // speaker from 4 multiple-choice candidates. Quotes are NOT
          // claimed as historical \u2014 imagined in style of the figure's
          // documented work, role, or motto.
          (function() {
            // Each entry: quote + correctName + 3 distractor names from PEOPLE.
            // Names must match the PEOPLE[*].name strings exactly.
            var QUOTES = [
              {
                text: '\u201CFestina lente \u2014 make haste, but slowly. A pocket book that pirates copy is still my book.\u201D',
                speaker: 'Aldus Manutius',
                hint: 'Pioneer of portable octavo books. Dolphin-and-anchor mark.'
              },
              {
                text: '\u201CThe interest accrues whether you finish the Bible or not. Pay, or the press is mine.\u201D',
                speaker: 'Johann Fust',
                hint: 'Goldsmith and financier. Sued his collaborator.'
              },
              {
                text: '\u201CMaster, with a tighter alloy and a slightly smaller body we could fit two more lines per page.\u201D',
                speaker: 'Peter Sch\u00F6ffer',
                hint: 'Apprentice and later partner in Mainz. Skilled scribe before he ever set type.'
              },
              {
                text: '\u201CThe shop carries my husband\u2019s name. The work carries mine.\u201D',
                speaker: 'Charlotte Guillard',
                hint: 'Ran her press in Paris for nearly four decades after her husband\u2019s death.'
              },
              {
                text: '\u201CNumber every verse. A reader needs to find their place \u2014 and a scholar needs to argue from it.\u201D',
                speaker: 'The Estienne family',
                hint: 'Multi-generational scholar-printers. Introduced verse numbering still used today.'
              },
              {
                text: '\u201CAd fontes. The Greek before the Latin, the Latin before its copies \u2014 and let the press carry the original to every desk in Europe at once.\u201D',
                speaker: 'Desiderius Erasmus',
                hint: 'Northern Renaissance humanist. Pushed printers to publish ancient texts in their original languages.'
              }
            ];
            // Use AI-generated quote if present, otherwise the static cycle.
            var round = pplAiQuote || QUOTES[pplQuoteIdx];
            var isAiQuote = !!pplAiQuote;

            function generateNewQuote() {
              if (!callGemini) {
                setPplGenState({ loading: false, error: 'AI tutor unavailable in this build.' });
                return;
              }
              setPplGenState({ loading: true, error: null });
              // Constrain speaker to one of the named printers so the
              // attribution game has a valid answer in the choices.
              var speakerNames = PEOPLE.map(function(pp) { return pp.name; });
              var prompt = 'Generate ONE imagined quote in the voice of a documented 1450-1800 European printer. Pick the speaker from this exact list: ' + speakerNames.join(' | ') + '. ' +
                'The quote must be 1-3 sentences, period-appropriate, plausibly something the printer would say given their documented work, role, motto, or business situation. ' +
                'Respond with ONLY a JSON object. NO markdown fences, NO commentary outside the JSON. Exact shape: ' +
                '{"text": "<the quote in double smart-quotes “like this”>", "speaker": "<exact name from the list above>", "hint": "<one short sentence reminding the student which printer this is — their role, city, or signature work>"}. ' +
                'Constraints: speaker must match one of the names above EXACTLY; the quote should not be a known historical transcript (label as imagined paraphrase); avoid modern phrasing or anachronisms.';
              callGemini(prompt, { maxOutputTokens: 350 })
                .then(function(resp) {
                  var raw = (resp && (resp.text || resp.content || (typeof resp === 'string' ? resp : ''))) || '';
                  var braceMatch = raw.match(/\{[\s\S]*\}/);
                  if (!braceMatch) {
                    setPplGenState({ loading: false, error: 'AI returned no JSON object. Try again.' });
                    return;
                  }
                  var parsed;
                  try { parsed = JSON.parse(braceMatch[0]); }
                  catch (e) {
                    setPplGenState({ loading: false, error: 'AI returned an unparseable response. Try again.' });
                    return;
                  }
                  if (!parsed || !parsed.text || !parsed.speaker || !parsed.hint) {
                    setPplGenState({ loading: false, error: 'AI response missing required fields. Try again.' });
                    return;
                  }
                  // Validate speaker matches one of the printer names exactly.
                  if (speakerNames.indexOf(parsed.speaker) === -1) {
                    setPplGenState({ loading: false, error: 'AI named a speaker not in the printer list. Try again.' });
                    return;
                  }
                  setPplAiQuote({ text: String(parsed.text), speaker: String(parsed.speaker), hint: String(parsed.hint) });
                  setPplGuess(null);
                  setPplRevealed(false);
                  setPplGenState({ loading: false, error: null });
                  announce('New AI-generated quote loaded.');
                })
                .catch(function(err) {
                  setPplGenState({ loading: false, error: 'Could not reach the AI: ' + ((err && err.message) || 'unknown error') });
                });
            }
            // Build the 4 candidate names: correct + 3 distractors drawn from PEOPLE
            var distractors = PEOPLE.map(function(pp) { return pp.name; }).filter(function(n) { return n !== round.speaker; });
            // Deterministic distractor pick by quote index so the same round is stable
            var seed = pplQuoteIdx;
            var chosen = [];
            for (var d = 0; d < 3 && d < distractors.length; d++) {
              chosen.push(distractors[(seed + d) % distractors.length]);
            }
            // Insert correct at a position derived from the index
            var insertAt = pplQuoteIdx % 4;
            var choices = chosen.slice();
            choices.splice(insertAt, 0, round.speaker);
            var done = pplAttempted >= QUOTES.length;
            function pickAnswer(name) {
              if (pplRevealed) return;
              setPplGuess(name);
              setPplRevealed(true);
              setPplAttempted(pplAttempted + 1);
              if (name === round.speaker) setPplScore(pplScore + 1);
              announce(name === round.speaker ? 'Correct. That is the speaker.' : 'Not quite. The speaker is shown.');
            }
            function nextRound() {
              // Always return to static cycle when advancing — students
              // can fire the AI button again if they want another generated
              // round, but Next Quote is the predictable curated path.
              setPplAiQuote(null);
              setPplQuoteIdx((pplQuoteIdx + 1) % QUOTES.length);
              setPplGuess(null);
              setPplRevealed(false);
              setPplGenState({ loading: false, error: null });
            }
            function resetGame() {
              setPplAiQuote(null);
              setPplQuoteIdx(0);
              setPplGuess(null);
              setPplRevealed(false);
              setPplScore(0);
              setPplAttempted(0);
              setPplGenState({ loading: false, error: null });
            }
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 6 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
                  h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                    '\u{1F4AC} Who said this? (imagined voices)'),
                  isAiQuote && h('span', {
                    style: { fontSize: 10, color: T.warn, fontStyle: 'italic', padding: '2px 8px', background: 'rgba(245,215,126,0.12)', borderRadius: 4, border: '1px solid ' + T.warn }
                  }, '\u{1F916} AI-generated round')
                ),
                h('div', { style: { fontSize: 11, color: T.dim, fontFamily: 'ui-monospace, monospace' } },
                  'Round ' + Math.min(pplAttempted + (pplRevealed ? 0 : 1), QUOTES.length) + ' of ' + QUOTES.length + ' \u00B7 score ' + pplScore)
              ),
              h('p', { style: { margin: '0 0 12px', fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } },
                'These quotes are NOT historical transcripts \u2014 imagined paraphrases in the voice each figure is documented to have used. Pick the most likely speaker.'),
              // The quote
              h('blockquote', { style: { background: T.parchment, color: T.ink, padding: '14px 18px', borderLeft: '4px solid ' + T.accent, borderRadius: 4, margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 16, lineHeight: 1.55, fontStyle: 'italic' } },
                round.text),
              // Choices
              h('div', { className: 'printingpress-no-print', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 10 } },
                choices.map(function(name, i) {
                  var isPicked = (pplGuess === name);
                  var isCorrect = (name === round.speaker);
                  var bg = T.cardAlt;
                  var brd = T.border;
                  if (pplRevealed) {
                    if (isCorrect) { bg = 'rgba(127,176,105,0.18)'; brd = T.ok; }
                    else if (isPicked) { bg = 'rgba(199,69,54,0.16)'; brd = T.danger; }
                  }
                  return h('button', { key: i,
                    onClick: function() { pickAnswer(name); },
                    disabled: pplRevealed,
                    style: {
                      padding: '10px 12px', textAlign: 'left',
                      background: bg, color: T.text,
                      border: '1.5px solid ' + brd, borderRadius: 8,
                      cursor: pplRevealed ? 'default' : 'pointer',
                      fontSize: 13, fontFamily: 'Georgia, serif',
                      fontWeight: isCorrect && pplRevealed ? 700 : 500,
                      transition: 'all 0.2s ease'
                    }
                  }, name);
                })
              ),
              // Reveal panel
              pplRevealed && (function() {
                var correct = (pplGuess === round.speaker);
                return h('div', { 'aria-live': 'polite',
                  style: { padding: 12, borderRadius: 6, fontSize: 13, lineHeight: 1.55, marginBottom: 10,
                    background: correct ? '#1f3d28' : '#3d2810',
                    border: '1px solid ' + (correct ? T.ok : T.warn),
                    color: correct ? '#bbf7d0' : '#fed7aa' } },
                  h('div', { style: { fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia, serif' } },
                    correct ? '\u2713 ' + round.speaker : '\u2717 Speaker: ' + round.speaker),
                  h('div', { style: { fontStyle: 'italic', opacity: 0.92, fontSize: 12 } }, round.hint)
                );
              })(),
              // AI generation status \u2014 error or loading hint
              pplGenState.error && h('div', {
                'aria-live': 'polite', role: 'alert',
                style: { padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 10, background: '#3d2810', border: '1px dashed ' + T.warn, color: '#fed7aa' }
              }, '\u26a0 ' + pplGenState.error),
              // Controls
              h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' } },
                pplRevealed && !done && h('button', {
                  onClick: nextRound,
                  style: btnPrimary({ padding: '8px 14px', fontSize: 12 })
                }, 'Next quote \u2192'),
                callGemini && h('button', {
                  onClick: generateNewQuote,
                  disabled: pplGenState.loading,
                  'aria-label': 'Generate a new AI quote',
                  style: btn({
                    padding: '8px 14px', fontSize: 12,
                    opacity: pplGenState.loading ? 0.6 : 1,
                    cursor: pplGenState.loading ? 'wait' : 'pointer',
                    borderColor: T.warn, color: T.warn
                  })
                }, pplGenState.loading ? '\u{1F916} Generating\u2026' : '\u{1F916} Generate quote (AI)'),
                pplRevealed && done && h('div', { style: { width: '100%', textAlign: 'center', padding: 10, background: T.cardAlt, border: '1px solid ' + T.accent, borderRadius: 6, marginBottom: 8 } },
                  h('div', { style: { fontSize: 13, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700, marginBottom: 4 } },
                    'Round complete. Final score: ' + pplScore + ' / ' + QUOTES.length),
                  h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic' } },
                    pplScore === QUOTES.length ? 'A 1450 historian would be impressed.' :
                    pplScore >= 3 ? 'Solid \u2014 you can hear the period voices.' :
                    'Worth a re-read of the portrait gallery above, then another go.')
                ),
                done && h('button', {
                  onClick: resetGame,
                  style: btn({ padding: '8px 14px', fontSize: 12 })
                }, '\u21BB Reset game')
              )
            );
          })(),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('people', 0, {
            prompt: 'A student says "Gutenberg invented the printing press all by himself." What is a more historically accurate framing?',
            choices: [
              'They are right.',
              'Gutenberg PERFECTED a system (punch-matrix-cast + alloy + oil ink + screw press + paper handling). Each piece existed in some form. His genius was integration. He also could not have built it without Fust\'s capital, Schöffer\'s skill, and the broader Mainz craft community.',
              'Schöffer invented it.',
              'It was invented in Korea.'
            ],
            correct: 1,
            explain: 'The historically accurate framing emphasizes Gutenberg as the integrator of an existing toolkit, dependent on capital, skilled labor, and a craft community. Korean metal movable type predates him by 78 years (the Jikji, 1377), but used a different process and faced different economics. The "lone genius" frame is comforting but inaccurate.'
          }),

          // ── Maine Press Roots card ──
          // Local-history sidebar for the King Middle audience. Connects to
          // the 1785 peg on the Before & After timeline and to the new
          // Falmouth Gazette template in Build a Broadside.
          sectionHeader('🌲', 'Maine press roots'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' } },
              // Small period-flag illustration on the left
              h('div', { style: { flex: '0 0 auto' } },
                h('svg', { viewBox: '0 0 80 100', width: 70, height: 88, 'aria-hidden': 'true' },
                  // Pine tree (Maine's defining symbol, on the 1901 state flag's banner)
                  h('rect', { x: 36, y: 60, width: 8, height: 30, fill: T.wood }),
                  h('polygon', { points: '40,8 24,28 32,28 22,44 36,44 28,60 52,60 44,44 58,44 48,28 56,28', fill: '#3d6b3d', stroke: T.accent, strokeWidth: 1 }),
                  // Faint dotted border
                  h('rect', { x: 2, y: 2, width: 76, height: 96, fill: 'none', stroke: T.accent, strokeWidth: 1, strokeDasharray: '2 2', opacity: 0.5 }),
                  // Year banner
                  h('rect', { x: 14, y: 78, width: 52, height: 14, fill: T.parchment, stroke: T.wood, strokeWidth: 0.8 }),
                  h('text', { x: 40, y: 88, textAnchor: 'middle', fontFamily: 'Georgia, serif', fontSize: 9, fontWeight: 700, fill: T.ink }, '1785')
                )
              ),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('h4', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                  'Thomas B. Wait & Benjamin Titcomb'),
                h('div', { style: { fontSize: 11, color: T.warn, fontStyle: 'italic', marginBottom: 8 } },
                  'Falmouth, District of Maine · January 1, 1785'),
                h('p', { style: { margin: '0 0 8px', fontSize: 12, color: T.text, lineHeight: 1.6 } },
                  'Wait and Titcomb founded the ',
                  h('em', null, 'Falmouth Gazette and Weekly Advertiser'),
                  ', the first newspaper printed in what would become Maine. They set up a press in Falmouth (now Portland) thirty-five years before Maine statehood, when Maine was still the District of Maine inside Massachusetts. Their press ran from a small shop on Fore Street.'),
                h('p', { style: { margin: '0 0 8px', fontSize: 12, color: T.text, lineHeight: 1.6 } },
                  'Why this matters: a frontier newspaper in 1785 was a political act. The Falmouth Gazette covered the statehood debate, advertised land sales, reprinted Boston and London news arriving by ship, and gave coastal Maine its first sustained source of printed information. Without local presses, news traveled at the speed of a horse from Boston.')
              )
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 12 } },
              h('div', { style: { background: T.cardAlt, borderLeft: '3px solid ' + T.accent, borderRadius: 4, padding: 8 } },
                h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'Where the press sat'),
                h('div', { style: { fontSize: 12, color: T.text } }, 'Fore Street, Falmouth (now Portland). Block walkable today from King Middle.')
              ),
              h('div', { style: { background: T.cardAlt, borderLeft: '3px solid ' + T.accent, borderRadius: 4, padding: 8 } },
                h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'Successor papers'),
                h('div', { style: { fontSize: 12, color: T.text } }, 'Cumberland Gazette (1786), Eastern Argus (1803), and on to the modern ',
                  h('em', null, 'Portland Press Herald'),
                  '. A 240-year chain.')
              ),
              h('div', { style: { background: T.cardAlt, borderLeft: '3px solid ' + T.accent, borderRadius: 4, padding: 8 } },
                h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 } }, 'Field trip'),
                h('div', { style: { fontSize: 12, color: T.text } }, 'Maine Historical Society and the Wadsworth-Longfellow House (Congress Street) hold early Falmouth Gazette issues.')
              )
            )
          ),

          // ── "Did you know?" trivia card ──
          // Five surprising facts about the named printers that did not fit
          // the main portrait stories. Tell-a-friend material for students.
          sectionHeader('💡', 'Did you know?'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.warn, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
              'A handful of facts that did not fit the main stories above, but are too good not to know.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              [
                { fact: 'Gutenberg\'s actual surname was Gensfleisch.',
                  detail: '"Gutenberg" came from the family estate "zum Gutenberg" in Mainz. Johannes Gensfleisch zur Laden zum Gutenberg is the full name. We remember the street he lived on, not his birth name.' },
                { fact: 'The Aldine dolphin-and-anchor was so heavily pirated that Aldus published a guide to spotting fakes.',
                  detail: 'Aldine books were bestsellers across Europe in the 1500s. Lyonnaise and Venetian rivals copied the mark and sold lower-quality knockoffs. Aldus printed a small pamphlet describing the precise proportions of his mark so buyers could check for themselves. The first published anti-counterfeiting guide.' },
                { fact: 'Charlotte Guillard outlived two husbands (both printers) and ran her shop for 40 years.',
                  detail: 'She inherited the press from her first husband, kept it through her second marriage to another printer, and continued running it for decades after his death. Over her career the Guillard press produced more than 150 substantial scholarly books. Many bore her own preface or note. Standard 19th-century histories did not mention her.' },
                { fact: 'Peter Schöffer printed the first multicolor book using the press.',
                  detail: 'The 1457 Mainz Psalter (Fust & Schöffer) used a complicated two-color printing technique: the body type in black, the large initial capitals printed in red and blue on the same impression. This required printing each page through the press in multiple passes with the type inked in different colors. Most scholars consider it among the most beautifully printed books ever made.' },
                { fact: 'Benjamin Franklin ran away from his apprenticeship at age 17.',
                  detail: 'His older brother James was a Boston printer who took Ben on as an apprentice at age 12. Five years in, Ben fled to Philadelphia rather than finish the term. The legal apprenticeship contract he broke is the same kind of contract you read above. He spent the rest of his life as a printer first and a politician second.' }
              ].map(function(t, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.warn, borderRadius: 6, padding: 10 } },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 4 } }, t.fact),
                  h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, t.detail)
                );
              })
            )
          ),

          // ── Find your historical printer match ──
          // 4-question personality quiz mapping the student to one of four
          // printer archetypes. Fun interactive layer that pulls the named
          // printers from passive reading into active self-identification.
          sectionHeader('🎯', 'Find your historical printer match'),
          (function() {
            // Each question's answers are ordered to align with archetypes:
            // [0] Gutenberg (perfectionist) [1] Aldus (popularizer)
            // [2] Estienne (scholar) [3] Franklin (activist)
            var QUESTIONS = [
              {
                q: 'When you are working on something, what feels best?',
                opts: [
                  'Getting every detail exactly right',
                  'Making it small enough to share widely',
                  'Cross-referencing and looking things up',
                  'Using it to change someone\'s mind'
                ]
              },
              {
                q: 'Which of these would frustrate you most?',
                opts: [
                  'Settling for "good enough"',
                  'Making something only the elite can afford',
                  'Publishing something that turns out to be wrong',
                  'Working hard on something with no impact'
                ]
              },
              {
                q: 'Which project would you be proudest of?',
                opts: [
                  'A technically perfect magnum opus, like the Gutenberg Bible',
                  'A pocket paperback that fits in everyone\'s hand',
                  'A reference work scholars still cite in 500 years',
                  'A pamphlet that starts a revolution'
                ]
              },
              {
                q: 'Pick a motto:',
                opts: [
                  'Make haste slowly',
                  'A book for every reader',
                  'Get it right or do not publish',
                  'Speak truth to power'
                ]
              }
            ];
            var ARCHETYPES = [
              { name: 'Johannes Gutenberg', tone: 'perfectionist craftsman',
                desc: 'You care about getting things exactly right. You would have been the person who tested 27 alloy ratios before committing to one. You measure twice and cut once. Your weakness: sometimes you forget that "good enough and shipped" beats "perfect and abandoned."',
                modern: 'Your modern parallels: typeface designer, watchmaker, surgeon, mathematician.' },
              { name: 'Aldus Manutius', tone: 'popularizer',
                desc: 'You care about making things accessible. You would have invented the paperback because you were sick of seeing classics locked up in expensive folios. You think reach matters at least as much as quality. Your weakness: sometimes you simplify what should stay complex.',
                modern: 'Your modern parallels: pop-science writer, app designer, podcast host, museum educator.' },
              { name: 'Robert Estienne', tone: 'scholar-printer',
                desc: 'You care about accuracy and citation. You would have invented Bible verse numbers because you got tired of saying "the bit near the end of Matthew." Your reference works become the standard everyone else cites. Your weakness: you can lose readers in the apparatus.',
                modern: 'Your modern parallels: librarian, encyclopedist, fact-checker, research scientist, footnote-loving historian.' },
              { name: 'Benjamin Franklin', tone: 'publisher-activist',
                desc: 'You care about impact on the world. You would have run a newspaper, a postal service, and a revolution at the same time. You believe a well-aimed pamphlet beats a brilliant treatise. Your weakness: you sometimes choose persuasion over precision.',
                modern: 'Your modern parallels: journalist, op-ed writer, organizer, documentary filmmaker, public intellectual.' }
            ];
            var allAnswered = matchAnswers.every(function(a) { return a !== null; });
            // Tally scores per archetype index
            var scores = [0, 0, 0, 0];
            matchAnswers.forEach(function(a) { if (a !== null) scores[a]++; });
            // Find winner(s). If tied, prefer the lowest-index one (still meaningful).
            var maxScore = Math.max.apply(null, scores);
            var winnerIdx = scores.indexOf(maxScore);
            var tied = scores.filter(function(s) { return s === maxScore; }).length > 1;
            var winner = ARCHETYPES[winnerIdx];
            function pick(qIdx, optIdx) {
              var next = matchAnswers.slice();
              next[qIdx] = optIdx;
              setMatchAnswers(next);
            }
            function reset() { setMatchAnswers([null, null, null, null]); }
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              !allAnswered && h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
                'A quick 4-question quiz. Pick the answer that feels truest to you, even if more than one fits. At the end you will see which 1450-1750 printer you most resemble — and what modern roles that maps to.'),
              QUESTIONS.map(function(q, qi) {
                return h('div', { key: qi, style: { marginBottom: 14 } },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 8 } },
                    (qi + 1) + '. ' + q.q),
                  h('div', { className: 'printingpress-no-print', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    q.opts.map(function(opt, oi) {
                      var isPicked = (matchAnswers[qi] === oi);
                      return h('button', { key: oi,
                        onClick: function() { pick(qi, oi); },
                        'aria-pressed': isPicked ? 'true' : 'false',
                        style: btn({
                          padding: '10px 14px', textAlign: 'left', fontSize: 12,
                          background: isPicked ? 'rgba(201,161,74,0.18)' : T.cardAlt,
                          color: isPicked ? T.accentHi : T.text,
                          borderColor: isPicked ? T.accent : T.border,
                          fontWeight: isPicked ? 700 : 400
                        })
                      }, opt);
                    })
                  )
                );
              }),
              allAnswered && h('div', { 'aria-live': 'polite',
                style: { marginTop: 6, padding: 16, background: 'rgba(245,215,126,0.08)', border: '2px solid ' + T.accentHi, borderRadius: 10 } },
                h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Your match'),
                h('h4', { style: { margin: '0 0 4px', fontSize: 18, color: T.accentHi, fontFamily: 'Georgia, serif' } }, winner.name),
                h('div', { style: { fontSize: 12, color: T.warn, fontStyle: 'italic', marginBottom: 10 } }, 'the ' + winner.tone),
                h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.text, lineHeight: 1.65 } }, winner.desc),
                h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.65 } }, winner.modern),
                tied && h('p', { style: { margin: '0 0 10px', fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                  '(You tied between multiple archetypes; shown is one of them. You contain multitudes.)'),
                h('button', { className: 'printingpress-no-print',
                  onClick: reset,
                  style: btn({ padding: '8px 14px', fontSize: 12 }) }, '↻ Take it again')
              )
            );
          })(),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('people', [
            { q: 'Who sued Gutenberg, won, and ended up with most of the printing equipment?', opts: ['Schöffer', 'Fust (his financier)', 'The Catholic Church', 'A rival printer'], ans: 1, explain: 'Johann Fust lent Gutenberg the capital to set up the press; when Gutenberg could not repay on schedule, Fust sued and took possession. The early printed books bear Fust and Schöffer\'s names, not Gutenberg\'s.' },
            { q: 'Who pioneered the small portable "pocket book" format?', opts: ['Gutenberg', 'Aldus Manutius in Venice ~1500', 'Charlotte Guillard', 'Benjamin Franklin'], ans: 1, explain: 'Aldus Manutius founded the Aldine Press in 1494 and pioneered the octavo (pocket) format with italic type, making scholarly Greek and Latin classics portable for the first time.' },
            { q: 'What share of European print shops in the 16th-17th centuries are estimated to have been run by women?', opts: ['Essentially none', 'About 5-10%', 'About 50%', 'A majority'], ans: 1, explain: 'Approximately 5-10% per recent scholarship. Often printer widows continued the family business; some ran shops for decades and produced significant scholarly output. Standard 19th-century histories largely left them out; recent scholarship is recovering this.' }
          ]),

          sourcesBlock([
            { label: 'Susan Broomhall, "Women and Religion in Sixteenth-Century France" (work on women printers)' },
            { label: 'Aldine Press scholarship — Yale Beinecke Library', url: 'https://beinecke.library.yale.edu/' },
            { label: 'Charlotte Guillard biography — Bibliothèque nationale de France', url: 'https://www.bnf.fr/' },
            { label: 'British Library — Early printers exhibition', url: 'https://www.bl.uk/' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.people),
          crossLinkFooter('people'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 8 — BUILD A BROADSIDE
      // ═════════════════════════════════════════════════════════════════════
      function renderBroadside() {
        var TEMPLATES = [
          { id: 'announcement', label: 'School announcement',
            sample: 'BAKE\nSALE\nFriday, May 14\nKing Middle Cafeteria\nProceeds support\nthe 7th-grade Crew' },
          { id: 'poem', label: 'Poem',
            sample: 'WE GREW\n\nOnce a seed,\nthen a sprout,\nnow a hand\nreaching out.' },
          { id: 'manifesto', label: 'Crew manifesto',
            sample: 'CREW\n\nWe show up.\nWe do quality work.\nWe lift each other.\nWe leave the room\nbetter than we found it.' },
          // Common Sense excerpt — historically the highest-leverage broadside
          // in American history. ~150,000 copies sold in 1776.
          { id: 'commonsense', label: 'Common Sense (1776)',
            sample: 'COMMON SENSE\n\nThese are the times\nthat try men\'s souls.\n\nThe summer soldier\nand the sunshine patriot\nwill, in this crisis,\nshrink from the service\nof his country.\n\n— Thomas Paine' },
          // Period ballad — the broadside ballad was the popular-music
          // distribution channel of 1500-1800. Sold for a penny on streets.
          { id: 'ballad', label: 'Period ballad (Greensleeves)',
            sample: 'GREENSLEEVES\n\nAlas, my love,\nyou do me wrong\nto cast me off\ndiscourteously.\n\nFor I have loved you\nso long,\ndelighting in your\ncompany.\n\n— Anonymous, ~1580' },
          // Wanted-style — broadsides were a primary public-information form
          // for fugitives, lost livestock, and rewards offered.
          { id: 'wanted', label: 'Notice / period announcement',
            sample: 'NOTICE\n\nLost on the road\nbetween Portland\nand Falmouth\non the 8th day\nof May:\n\nA bay mare,\nfourteen hands,\nwhite blaze on forehead.\n\nReward of one dollar\nfor return to\nthe printer of\nthis sheet.' },
          // Falmouth Gazette (1785) — first newspaper printed in what would
          // become Maine. Predates statehood (1820) by 35 years. Anchored
          // here for local-history relevance to Portland Public Schools.
          { id: 'falmouth', label: 'Falmouth Gazette (1785) reproduction',
            sample: 'THE FALMOUTH GAZETTE\nAND WEEKLY ADVERTISER\n\nVol. I, No. I\nFalmouth, in Maine,\nthe 1st of January, 1785.\n\nTo the inhabitants\nof the District of Maine:\n\nWe propose, by the\nblessing of Providence,\nto publish a Weekly\nNews-Paper, containing\nthe latest Intelligence\nfrom Europe and America.\n\nSubscriptions\nat 8 shillings\nper annum,\npayable quarterly.\n\nPrinted by\nThomas B. Wait\nand Benjamin Titcomb.' }
        ];

        var templateRaw = useState(0);
        var templateIdx = templateRaw[0], setTemplateIdx = templateRaw[1];
        var contentRaw = useState(TEMPLATES[0].sample);
        var content = contentRaw[0], setContent = contentRaw[1];
        var fontRaw = useState('Georgia');
        var font = fontRaw[0], setFont = fontRaw[1];
        var titleSizeRaw = useState(48);
        var titleSize = titleSizeRaw[0], setTitleSize = titleSizeRaw[1];
        // Border style: visual frame around the broadside. Real broadsides
        // used printer's flowers ("fleurons") and rule borders for visual
        // weight. Each option renders as SVG corners + edges that print.
        var borderStyleRaw = useState('classical');
        var borderStyle = borderStyleRaw[0], setBorderStyle = borderStyleRaw[1];
        // Design-your-own-mark state. Each picker is a small ordered choice.
        var markSymbolRaw = useState(0);
        var markSymbol = markSymbolRaw[0], setMarkSymbol = markSymbolRaw[1];
        var markMottoRaw = useState(0);
        var markMotto = markMottoRaw[0], setMarkMotto = markMottoRaw[1];
        var markFinishRaw = useState('gold');
        var markFinish = markFinishRaw[0], setMarkFinish = markFinishRaw[1];

        function loadTemplate(i) {
          setTemplateIdx(i);
          setContent(TEMPLATES[i].sample);
        }

        var lines = content.split('\n');
        var titleLine = lines[0] || '';
        var bodyLines = lines.slice(1);

        // Border SVG renderers — each takes container dimensions and returns
        // an SVG overlay positioned absolutely. Pure decorative.
        function renderBorder(style) {
          if (style === 'none') return null;
          var common = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' };
          if (style === 'simple') {
            // Simple double-rule frame
            return h('div', { 'aria-hidden': 'true', style: common },
              h('div', { style: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, border: '1px solid ' + T.ink } }),
              h('div', { style: { position: 'absolute', top: 14, left: 14, right: 14, bottom: 14, border: '1px solid ' + T.ink } })
            );
          }
          if (style === 'classical') {
            // Classical: double rule + corner ornaments (printer's flowers)
            return h('svg', { 'aria-hidden': 'true', style: Object.assign({}, common, { display: 'block' }), viewBox: '0 0 400 600', preserveAspectRatio: 'none' },
              // Outer rule
              h('rect', { x: 8, y: 8, width: 384, height: 584, fill: 'none', stroke: T.ink, strokeWidth: 1.5 }),
              // Inner thin rule
              h('rect', { x: 16, y: 16, width: 368, height: 568, fill: 'none', stroke: T.ink, strokeWidth: 0.6 }),
              // Corner fleurons (stylized printer's flowers — diamonds with petals)
              [[20, 20], [380, 20], [20, 580], [380, 580]].map(function(c, i) {
                return h('g', { key: i, transform: 'translate(' + c[0] + ',' + c[1] + ')' },
                  h('path', { d: 'M 0 -6 L 4 0 L 0 6 L -4 0 Z', fill: T.ink }),  // diamond
                  h('circle', { cx: 0, cy: -8, r: 1.2, fill: T.ink }),
                  h('circle', { cx: 0, cy: 8, r: 1.2, fill: T.ink }),
                  h('circle', { cx: -8, cy: 0, r: 1.2, fill: T.ink }),
                  h('circle', { cx: 8, cy: 0, r: 1.2, fill: T.ink })
                );
              })
            );
          }
          if (style === 'ornate') {
            // Ornate: chain of fleurons along all four edges
            var fleurons = [];
            // Top + bottom rows
            for (var fx = 0; fx < 18; fx++) {
              fleurons.push(h('g', { key: 'tf' + fx, transform: 'translate(' + (24 + fx * 21) + ',16)' },
                h('path', { d: 'M 0 -3 L 2.5 0 L 0 3 L -2.5 0 Z', fill: T.ink }),
                h('circle', { cx: 0, cy: -4, r: 0.7, fill: T.ink }), h('circle', { cx: 0, cy: 4, r: 0.7, fill: T.ink })));
              fleurons.push(h('g', { key: 'bf' + fx, transform: 'translate(' + (24 + fx * 21) + ',584)' },
                h('path', { d: 'M 0 -3 L 2.5 0 L 0 3 L -2.5 0 Z', fill: T.ink }),
                h('circle', { cx: 0, cy: -4, r: 0.7, fill: T.ink }), h('circle', { cx: 0, cy: 4, r: 0.7, fill: T.ink })));
            }
            // Left + right columns
            for (var fy = 0; fy < 27; fy++) {
              fleurons.push(h('g', { key: 'lf' + fy, transform: 'translate(16,' + (28 + fy * 21) + ')' },
                h('path', { d: 'M -3 0 L 0 -2.5 L 3 0 L 0 2.5 Z', fill: T.ink }),
                h('circle', { cx: -4, cy: 0, r: 0.7, fill: T.ink }), h('circle', { cx: 4, cy: 0, r: 0.7, fill: T.ink })));
              fleurons.push(h('g', { key: 'rf' + fy, transform: 'translate(384,' + (28 + fy * 21) + ')' },
                h('path', { d: 'M -3 0 L 0 -2.5 L 3 0 L 0 2.5 Z', fill: T.ink }),
                h('circle', { cx: -4, cy: 0, r: 0.7, fill: T.ink }), h('circle', { cx: 4, cy: 0, r: 0.7, fill: T.ink })));
            }
            return h('svg', { 'aria-hidden': 'true', style: Object.assign({}, common, { display: 'block' }), viewBox: '0 0 400 600', preserveAspectRatio: 'none' },
              h('rect', { x: 24, y: 24, width: 352, height: 552, fill: 'none', stroke: T.ink, strokeWidth: 1 }),
              fleurons
            );
          }
          if (style === 'floral') {
            // Floral: scrolling vine pattern with small leaf clusters along
            // all four edges. Period-popular ornament — many 16th-17th
            // century broadsides used vegetal corner blocks. Vines built
            // from chained bezier curves; leaves are small ellipses.
            var vines = [];
            // Top edge vine (left to right)
            for (var v = 0; v < 8; v++) {
              var vx = 40 + v * 42;
              vines.push(h('path', { key: 'tv' + v, d: 'M ' + vx + ' 22 Q ' + (vx + 10) + ' 14 ' + (vx + 21) + ' 22 Q ' + (vx + 31) + ' 30 ' + (vx + 42) + ' 22', stroke: T.ink, strokeWidth: 1, fill: 'none' }));
              vines.push(h('ellipse', { key: 'tl' + v, cx: vx + 10, cy: 15, rx: 3, ry: 1.5, fill: T.ink, transform: 'rotate(-30 ' + (vx + 10) + ' 15)' }));
              vines.push(h('ellipse', { key: 'tl2' + v, cx: vx + 31, cy: 29, rx: 3, ry: 1.5, fill: T.ink, transform: 'rotate(30 ' + (vx + 31) + ' 29)' }));
            }
            // Bottom edge vine
            for (var b = 0; b < 8; b++) {
              var bx = 40 + b * 42;
              vines.push(h('path', { key: 'bv' + b, d: 'M ' + bx + ' 578 Q ' + (bx + 10) + ' 586 ' + (bx + 21) + ' 578 Q ' + (bx + 31) + ' 570 ' + (bx + 42) + ' 578', stroke: T.ink, strokeWidth: 1, fill: 'none' }));
              vines.push(h('ellipse', { key: 'bl' + b, cx: bx + 10, cy: 585, rx: 3, ry: 1.5, fill: T.ink, transform: 'rotate(30 ' + (bx + 10) + ' 585)' }));
              vines.push(h('ellipse', { key: 'bl2' + b, cx: bx + 31, cy: 571, rx: 3, ry: 1.5, fill: T.ink, transform: 'rotate(-30 ' + (bx + 31) + ' 571)' }));
            }
            // Side vines (vertical)
            for (var s = 0; s < 12; s++) {
              var sy = 50 + s * 42;
              vines.push(h('path', { key: 'lv' + s, d: 'M 22 ' + sy + ' Q 14 ' + (sy + 10) + ' 22 ' + (sy + 21) + ' Q 30 ' + (sy + 31) + ' 22 ' + (sy + 42), stroke: T.ink, strokeWidth: 1, fill: 'none' }));
              vines.push(h('ellipse', { key: 'lll' + s, cx: 15, cy: sy + 10, rx: 1.5, ry: 3, fill: T.ink, transform: 'rotate(-30 15 ' + (sy + 10) + ')' }));
              vines.push(h('path', { key: 'rv' + s, d: 'M 378 ' + sy + ' Q 386 ' + (sy + 10) + ' 378 ' + (sy + 21) + ' Q 370 ' + (sy + 31) + ' 378 ' + (sy + 42), stroke: T.ink, strokeWidth: 1, fill: 'none' }));
              vines.push(h('ellipse', { key: 'rll' + s, cx: 385, cy: sy + 10, rx: 1.5, ry: 3, fill: T.ink, transform: 'rotate(30 385 ' + (sy + 10) + ')' }));
            }
            return h('svg', { 'aria-hidden': 'true', style: Object.assign({}, common, { display: 'block' }), viewBox: '0 0 400 600', preserveAspectRatio: 'none' },
              h('rect', { x: 36, y: 36, width: 328, height: 528, fill: 'none', stroke: T.ink, strokeWidth: 0.8 }),
              vines
            );
          }
          if (style === 'script') {
            // Scripted: thick-thin scribal flourish with corner curlicues.
            // Mimics the ornate calligraphic borders used on title pages
            // and decrees from the 16th-17th centuries. Built from cubic
            // beziers and tear-drop terminals.
            return h('svg', { 'aria-hidden': 'true', style: Object.assign({}, common, { display: 'block' }), viewBox: '0 0 400 600', preserveAspectRatio: 'none' },
              // Outer thick rule
              h('rect', { x: 10, y: 10, width: 380, height: 580, fill: 'none', stroke: T.ink, strokeWidth: 2.5 }),
              // Inner hairline
              h('rect', { x: 18, y: 18, width: 364, height: 564, fill: 'none', stroke: T.ink, strokeWidth: 0.5 }),
              // Corner curlicues — calligraphic spirals
              [[28, 28, 1, 1], [372, 28, -1, 1], [28, 572, 1, -1], [372, 572, -1, -1]].map(function(c, i) {
                var x = c[0], y = c[1], sx = c[2], sy = c[3];
                return h('g', { key: i, transform: 'translate(' + x + ',' + y + ') scale(' + sx + ',' + sy + ')' },
                  // Outer flourish curl
                  h('path', { d: 'M 0 0 Q 20 -6 26 8 Q 30 18 16 22 Q 6 24 4 14 Q 4 10 10 10 Q 14 12 12 16', fill: 'none', stroke: T.ink, strokeWidth: 1.4, strokeLinecap: 'round' }),
                  // Tear-drop terminal
                  h('ellipse', { cx: 12, cy: 16, rx: 1.5, ry: 1, fill: T.ink, transform: 'rotate(45 12 16)' }),
                  // Small accent dot
                  h('circle', { cx: 24, cy: 4, r: 1.2, fill: T.ink })
                );
              }),
              // Midpoint top/bottom flourishes
              h('path', { d: 'M 180 14 Q 200 4 220 14', fill: 'none', stroke: T.ink, strokeWidth: 1.2, strokeLinecap: 'round' }),
              h('circle', { cx: 200, cy: 8, r: 1.3, fill: T.ink }),
              h('path', { d: 'M 180 586 Q 200 596 220 586', fill: 'none', stroke: T.ink, strokeWidth: 1.2, strokeLinecap: 'round' }),
              h('circle', { cx: 200, cy: 592, r: 1.3, fill: T.ink }),
              // Midpoint side flourishes
              h('path', { d: 'M 14 280 Q 4 300 14 320', fill: 'none', stroke: T.ink, strokeWidth: 1.2, strokeLinecap: 'round' }),
              h('path', { d: 'M 386 280 Q 396 300 386 320', fill: 'none', stroke: T.ink, strokeWidth: 1.2, strokeLinecap: 'round' })
            );
          }
          return null;
        }

        var BORDER_OPTIONS = [
          { id: 'none', label: 'None' },
          { id: 'simple', label: 'Double rule' },
          { id: 'classical', label: 'Classical (corner fleurons)' },
          { id: 'ornate', label: 'Ornate (full fleuron chain)' },
          { id: 'floral', label: 'Floral vine' },
          { id: 'script', label: 'Scribal flourish' }
        ];

        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📰 Build a Broadside'),
          dropCapPara('A "broadside" was a single-sheet print, often political, advertising, or poetic. Compose your own. Pick a template, customize the text, choose a font, and print it. (Yes, the 🖨️ Print button at the top really prints.)'),

          // ── Real printer's marks gallery ──
          // Before students design their own colophon, show them five
          // real shop marks from 1450-1555. Each is a small SVG icon +
          // shop name + city + year + Latin motto with translation + a
          // one-line note on what the symbolism claimed.
          sectionHeader('\u2604\uFE0F', 'Five real printer\u2019s marks (1455\u20131555)'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Every serious shop had a mark, called a "device" or colophon. It went on the title page and the last page. It signaled who printed the book, which mattered when (a) buyers wanted quality and (b) authorities wanted accountability. The dolphin-and-anchor was so successful Aldus Manutius spent half his career suing counterfeiters.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 } },
            [
              { shop: 'Fust & Sch\u00F6ffer', city: 'Mainz', year: '1457', motto: '(twin shields)',
                meaning: 'The first printer\u2019s mark in history. Two heraldic shields, one for Fust, one for Sch\u00F6ffer, hanging from a branch. The book it appeared in (Mainz Psalter, 1457) is the first printed book to credit its makers.',
                svg: h('svg', { viewBox: '0 0 80 80', width: 56, height: 56, 'aria-hidden': 'true' },
                  h('line', { x1: 12, y1: 18, x2: 68, y2: 18, stroke: T.accent, strokeWidth: 2 }),
                  h('line', { x1: 28, y1: 18, x2: 28, y2: 26, stroke: T.dim, strokeWidth: 1.5 }),
                  h('line', { x1: 52, y1: 18, x2: 52, y2: 26, stroke: T.dim, strokeWidth: 1.5 }),
                  h('path', { d: 'M 18 26 L 38 26 L 38 50 Q 28 58 18 50 Z', fill: T.cardAlt, stroke: T.accentHi, strokeWidth: 2 }),
                  h('path', { d: 'M 42 26 L 62 26 L 62 50 Q 52 58 42 50 Z', fill: T.cardAlt, stroke: T.accentHi, strokeWidth: 2 }),
                  h('path', { d: 'M 18 34 L 38 34 M 42 34 L 62 34', stroke: T.accent, strokeWidth: 1 }),
                  h('path', { d: 'M 18 42 L 38 42 M 42 42 L 62 42', stroke: T.accent, strokeWidth: 1 })
                )
              },
              { shop: 'Aldus Manutius', city: 'Venice', year: '1500',
                motto: 'Festina lente \u2014 \u201Cmake haste slowly\u201D',
                meaning: 'A dolphin (speed) coiled around an anchor (steadiness). Aldus pioneered portable octavo books and italic type; his motto captures the print-shop tension between turning out books fast and getting them right.',
                svg: h('svg', { viewBox: '0 0 80 80', width: 56, height: 56, 'aria-hidden': 'true' },
                  // Anchor
                  h('circle', { cx: 40, cy: 14, r: 4, fill: 'none', stroke: T.accentHi, strokeWidth: 2 }),
                  h('line', { x1: 40, y1: 18, x2: 40, y2: 64, stroke: T.accentHi, strokeWidth: 2.5 }),
                  h('line', { x1: 28, y1: 22, x2: 52, y2: 22, stroke: T.accentHi, strokeWidth: 2 }),
                  h('path', { d: 'M 40 64 Q 24 60 22 50', stroke: T.accentHi, strokeWidth: 2, fill: 'none' }),
                  h('path', { d: 'M 40 64 Q 56 60 58 50', stroke: T.accentHi, strokeWidth: 2, fill: 'none' }),
                  h('polygon', { points: '22,50 18,46 26,46', fill: T.accentHi }),
                  h('polygon', { points: '58,50 62,46 54,46', fill: T.accentHi }),
                  // Dolphin S-curve around the anchor
                  h('path', { d: 'M 30 36 Q 16 34 18 48 Q 22 60 36 54 Q 50 48 56 36 Q 58 22 44 24', stroke: T.accent, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' }),
                  h('circle', { cx: 21, cy: 38, r: 1, fill: T.accent })
                )
              },
              { shop: 'Robert Estienne', city: 'Paris', year: '1532',
                motto: 'Noli altum sapere \u2014 \u201Cdo not be high-minded\u201D',
                meaning: 'An olive tree with branches breaking off, from Romans 11:20. A scholar-printer\u2019s mark warning against pride. Estienne\u2019s shop printed the first numbered-verse Bibles, which is why your Bible has chapter and verse numbers at all.',
                svg: h('svg', { viewBox: '0 0 80 80', width: 56, height: 56, 'aria-hidden': 'true' },
                  // Trunk
                  h('rect', { x: 36, y: 30, width: 8, height: 36, fill: T.accent, stroke: T.accentHi, strokeWidth: 1 }),
                  // Roots
                  h('path', { d: 'M 36 66 Q 24 70 18 66 M 44 66 Q 56 70 62 66', stroke: T.accentHi, strokeWidth: 1.5, fill: 'none' }),
                  // Canopy (clusters of leaves)
                  h('circle', { cx: 40, cy: 22, r: 12, fill: T.accentHi, opacity: 0.7 }),
                  h('circle', { cx: 28, cy: 28, r: 8, fill: T.accentHi, opacity: 0.55 }),
                  h('circle', { cx: 52, cy: 28, r: 8, fill: T.accentHi, opacity: 0.55 }),
                  // Falling branches
                  h('line', { x1: 22, y1: 36, x2: 14, y2: 50, stroke: T.dim, strokeWidth: 1.5, strokeLinecap: 'round' }),
                  h('line', { x1: 58, y1: 36, x2: 66, y2: 50, stroke: T.dim, strokeWidth: 1.5, strokeLinecap: 'round' }),
                  h('circle', { cx: 14, cy: 50, r: 2, fill: T.dim }),
                  h('circle', { cx: 66, cy: 50, r: 2, fill: T.dim })
                )
              },
              { shop: 'Johann Froben', city: 'Basel', year: '1491',
                motto: 'Prudens simplicitas amorque recti \u2014 \u201Cwise simplicity and love of right\u201D',
                meaning: 'A caduceus (winged staff with two serpents) flanked by doves. Froben published Erasmus and the humanists; the mark claimed Hermetic wisdom paired with peaceful intent. Caduceus = communication, doves = peace.',
                svg: h('svg', { viewBox: '0 0 80 80', width: 56, height: 56, 'aria-hidden': 'true' },
                  // Vertical staff
                  h('line', { x1: 40, y1: 10, x2: 40, y2: 70, stroke: T.accentHi, strokeWidth: 2.5 }),
                  // Ball-top
                  h('circle', { cx: 40, cy: 10, r: 3.5, fill: T.accentHi }),
                  // Wings at top
                  h('path', { d: 'M 40 14 Q 30 12 24 18 Q 28 14 40 18', fill: T.accent, opacity: 0.85 }),
                  h('path', { d: 'M 40 14 Q 50 12 56 18 Q 52 14 40 18', fill: T.accent, opacity: 0.85 }),
                  // Two intertwined serpents (simplified as S-curves)
                  h('path', { d: 'M 40 22 Q 30 28 40 34 Q 50 40 40 46 Q 30 52 40 58', stroke: T.accent, strokeWidth: 2, fill: 'none' }),
                  h('path', { d: 'M 40 22 Q 50 28 40 34 Q 30 40 40 46 Q 50 52 40 58', stroke: T.accentHi, strokeWidth: 2, fill: 'none' }),
                  // Doves
                  h('path', { d: 'M 18 42 Q 14 38 16 36 Q 18 36 20 38 Q 22 36 24 38 Q 22 42 18 42 Z', fill: T.parchment, stroke: T.accentHi, strokeWidth: 0.8 }),
                  h('path', { d: 'M 62 42 Q 58 38 60 36 Q 62 36 64 38 Q 66 36 68 38 Q 66 42 62 42 Z', fill: T.parchment, stroke: T.accentHi, strokeWidth: 0.8 })
                )
              },
              { shop: 'Christopher Plantin', city: 'Antwerp', year: '1555',
                motto: 'Labore et Constantia \u2014 \u201Cby labor and constancy\u201D',
                meaning: 'A drafting compass with one point fixed, the other tracing a circle. The fixed leg is constancy, the moving leg is labor. Plantin built the largest printing operation of the 16th century. The compass-mark became a model for guild-pride symbolism across Europe.',
                svg: h('svg', { viewBox: '0 0 80 80', width: 56, height: 56, 'aria-hidden': 'true' },
                  // Outer traced circle (faint)
                  h('circle', { cx: 40, cy: 50, r: 22, fill: 'none', stroke: T.dim, strokeWidth: 1, strokeDasharray: '3 2', opacity: 0.5 }),
                  // Compass head
                  h('circle', { cx: 40, cy: 14, r: 4, fill: T.accentHi, stroke: T.accent, strokeWidth: 1 }),
                  h('line', { x1: 40, y1: 8, x2: 40, y2: 12, stroke: T.accentHi, strokeWidth: 2 }),
                  // Fixed leg (vertical)
                  h('line', { x1: 40, y1: 18, x2: 40, y2: 62, stroke: T.accent, strokeWidth: 2.5 }),
                  h('polygon', { points: '37,62 43,62 40,68', fill: T.accentHi }),
                  // Moving leg (angled)
                  h('line', { x1: 40, y1: 18, x2: 60, y2: 64, stroke: T.accent, strokeWidth: 2.5 }),
                  h('polygon', { points: '58,64 62,64 60,72', fill: T.accentHi }),
                  // Small dot at the traced point on the circle
                  h('circle', { cx: 60, cy: 64, r: 1.8, fill: T.warn })
                )
              }
            ].map(function(mk, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' } },
                h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 8, marginBottom: 10, lineHeight: 0 } }, mk.svg),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 2 } }, mk.shop),
                h('div', { style: { fontSize: 10, color: T.dim, fontFamily: 'ui-monospace, monospace', marginBottom: 8 } }, mk.city + ', ' + mk.year),
                h('div', { style: { fontSize: 11, color: T.warn, fontStyle: 'italic', marginBottom: 8, fontFamily: 'Georgia, serif', lineHeight: 1.35 } }, mk.motto),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5, textAlign: 'left' } }, mk.meaning)
              );
            })
          ),
          h('p', { style: { margin: '0 0 14px', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
            'When you design your own broadside below, the dolphin-and-anchor on the colophon (bottom of the page) is your tribute to Aldus. Your own version, with your own symbols, would have been someone\u2019s job for life in 1500.'),

          // ── Famous broadsides hall of fame ──
          // Four historically significant broadsides with what made each
          // one effective. Gives students concrete reference points for
          // their own broadside design.
          sectionHeader('\u{1F3C6}', 'Four broadsides that changed things'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Studied broadsides that shifted public opinion or made law. Notice the design pattern: each one has a single clear message, plain language, and a specific audience.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 } },
            [
              { title: 'The 95 Theses', when: 'October 31, 1517', who: 'Martin Luther, posted in Wittenberg',
                what: 'Ninety-five numbered arguments against the sale of indulgences. Allegedly posted on the door of All Saints Church. Printed almost immediately as a broadside and reprinted across Germany within weeks.',
                effective: 'Numbered list = scannable. Plain Latin (then quickly translated to German). Concrete grievance everyone understood. One sheet of paper started the Reformation.',
                color: '#f87171' },
              { title: 'Common Sense', when: 'January 10, 1776', who: 'Thomas Paine, Philadelphia',
                what: 'Distributed as a 46-page pamphlet but also as broadside excerpts pinned in taverns. About 150,000 copies sold in colonies of about 2.5 million people. Per capita, one of the best-selling political works in American history.',
                effective: 'Plain English, not Latin or fancy rhetoric. Specific, practical arguments. Took monarchy as a target. Cheap (less than a shilling). Built the case for independence in language working people read aloud to each other.',
                color: '#93c5fd' },
              { title: 'Dunlap Declaration broadside', when: 'July 4, 1776 (night)', who: 'John Dunlap, Philadelphia',
                what: 'About 200 broadside copies of the Declaration of Independence, printed overnight in Dunlap\u2019s shop on Market Street. Distributed by horseback to colonial legislatures and military commanders. The first time most Americans heard the text was reading-aloud from one of these sheets.',
                effective: 'Speed. The Continental Congress voted on the 4th; the text was distributed by the 6th. About 26 of the 200 broadsides survive today; they routinely sell at auction for tens of millions of dollars.',
                color: '#c9a14a' },
              { title: 'Emancipation Proclamation', when: 'January 1, 1863', who: 'Abraham Lincoln; printed widely',
                what: 'Distributed as a broadside in Union-held territories and behind Confederate lines to inform enslaved people that as of January 1, they were "thenceforward and forever free." Reproductions and souvenir broadsides circulated for decades after.',
                effective: 'Plain language declaration with the legal force of a presidential proclamation. Designed to be read aloud by anyone who could read, in front of people who could not. Combined legal weight with accessible delivery.',
                color: T.ok }
            ].map(function(b, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderTop: '4px solid ' + b.color, borderRadius: 10, padding: 14 } },
                h('h4', { style: { margin: '0 0 4px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } }, b.title),
                h('div', { style: { fontSize: 10, color: T.warn, fontStyle: 'italic', marginBottom: 2 } }, b.when),
                h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic', marginBottom: 10 } }, b.who),
                h('p', { style: { margin: '0 0 8px', fontSize: 11, color: T.text, lineHeight: 1.55 } }, b.what),
                h('div', { style: { background: T.cardAlt, borderLeft: '3px solid ' + b.color, borderRadius: 4, padding: 8, fontSize: 11, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' } },
                  h('strong', { style: { color: b.color, fontStyle: 'normal' } }, 'Why it worked: '), b.effective)
              );
            })
          ),
          h('p', { style: { margin: '0 0 14px', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
            'Notice the shared pattern: clear single message, plain language, specific audience, one sheet of paper that someone in 1450-1865 could hand to someone else and say "read this." Aim for that when you compose yours below.'),

          // ── Design your own mark ──
          // Mini-tool: pick a symbol + motto + finish. Renders a colophon
          // preview. Students can screenshot/print it; this is a step
          // toward thinking of yourself as a printer rather than just a
          // reader of print.
          sectionHeader('🎨', 'Design your own printer\u2019s mark'),
          h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
            'Aldus had a dolphin and anchor. Plantin had a compass. Estienne had an olive tree. What would yours be? Pick a symbol that means something to you, choose a motto, and pick the finish. The result is YOUR mark, the way a 1500 printer would have signed every book they made.'),
          (function() {
            var SYMBOLS = [
              { key: 'anchor', label: 'Anchor', meaning: 'Steadiness, persistence, returning safely.',
                svg: function(color) { return [
                  h('circle', { cx: 50, cy: 18, r: 5, fill: 'none', stroke: color, strokeWidth: 3 }),
                  h('line', { x1: 50, y1: 23, x2: 50, y2: 78, stroke: color, strokeWidth: 4 }),
                  h('line', { x1: 36, y1: 28, x2: 64, y2: 28, stroke: color, strokeWidth: 3 }),
                  h('path', { d: 'M 50 78 Q 32 72 28 60', stroke: color, strokeWidth: 3, fill: 'none' }),
                  h('path', { d: 'M 50 78 Q 68 72 72 60', stroke: color, strokeWidth: 3, fill: 'none' }),
                  h('polygon', { points: '28,60 23,55 33,55', fill: color }),
                  h('polygon', { points: '72,60 77,55 67,55', fill: color })
                ]; } },
              { key: 'compass', label: 'Compass', meaning: 'Precision, careful work, drawn boundaries.',
                svg: function(color) { return [
                  h('circle', { cx: 50, cy: 60, r: 25, fill: 'none', stroke: color, strokeWidth: 1, strokeDasharray: '3 2', opacity: 0.5 }),
                  h('circle', { cx: 50, cy: 22, r: 5, fill: color }),
                  h('line', { x1: 50, y1: 27, x2: 50, y2: 78, stroke: color, strokeWidth: 4 }),
                  h('polygon', { points: '47,78 53,78 50,84', fill: color }),
                  h('line', { x1: 50, y1: 27, x2: 75, y2: 82, stroke: color, strokeWidth: 4 }),
                  h('polygon', { points: '72,80 78,82 76,87', fill: color })
                ]; } },
              { key: 'tree', label: 'Olive tree', meaning: 'Wisdom, peace, scholarly tradition.',
                svg: function(color) { return [
                  h('rect', { x: 46, y: 50, width: 8, height: 38, fill: color }),
                  h('circle', { cx: 50, cy: 32, r: 18, fill: color, opacity: 0.7 }),
                  h('circle', { cx: 32, cy: 42, r: 12, fill: color, opacity: 0.55 }),
                  h('circle', { cx: 68, cy: 42, r: 12, fill: color, opacity: 0.55 })
                ]; } },
              { key: 'dove', label: 'Dove + branch', meaning: 'Hope, message, news from afar.',
                svg: function(color) { return [
                  h('ellipse', { cx: 50, cy: 50, rx: 18, ry: 12, fill: color, opacity: 0.9 }),
                  h('circle', { cx: 67, cy: 44, r: 7, fill: color }),
                  h('polygon', { points: '74,42 80,40 75,46', fill: color }),
                  h('circle', { cx: 70, cy: 42, r: 1.5, fill: T.ink }),
                  h('path', { d: 'M 32 48 Q 28 38 35 32 Q 30 44 38 50', fill: color, opacity: 0.7 }),
                  h('line', { x1: 73, y1: 48, x2: 85, y2: 56, stroke: '#3d6b3d', strokeWidth: 2 }),
                  h('circle', { cx: 82, cy: 54, r: 2, fill: '#3d6b3d' }),
                  h('circle', { cx: 86, cy: 58, r: 2, fill: '#3d6b3d' })
                ]; } },
              { key: 'hammer', label: 'Hammer + book', meaning: 'Craft, work of hand and mind.',
                svg: function(color) { return [
                  h('rect', { x: 20, y: 50, width: 35, height: 28, fill: 'none', stroke: color, strokeWidth: 2 }),
                  h('line', { x1: 37, y1: 50, x2: 37, y2: 78, stroke: color, strokeWidth: 1 }),
                  h('line', { x1: 23, y1: 56, x2: 34, y2: 56, stroke: color, strokeWidth: 0.6, opacity: 0.6 }),
                  h('line', { x1: 23, y1: 62, x2: 34, y2: 62, stroke: color, strokeWidth: 0.6, opacity: 0.6 }),
                  h('line', { x1: 40, y1: 56, x2: 51, y2: 56, stroke: color, strokeWidth: 0.6, opacity: 0.6 }),
                  h('rect', { x: 60, y: 30, width: 18, height: 12, fill: color }),
                  h('rect', { x: 65, y: 42, width: 3, height: 36, fill: color })
                ]; } },
              { key: 'lighthouse', label: 'Lighthouse', meaning: 'Guidance, signal, holding the coast.',
                svg: function(color) { return [
                  h('polygon', { points: '40,80 60,80 56,30 44,30', fill: color, opacity: 0.85 }),
                  h('rect', { x: 38, y: 22, width: 24, height: 10, fill: color }),
                  h('polygon', { points: '42,22 58,22 50,10', fill: color }),
                  h('rect', { x: 44, y: 36, width: 12, height: 6, fill: T.parchment, opacity: 0.8 }),
                  h('line', { x1: 30, y1: 80, x2: 70, y2: 80, stroke: color, strokeWidth: 2 }),
                  h('line', { x1: 62, y1: 25, x2: 85, y2: 18, stroke: color, strokeWidth: 1, opacity: 0.6, strokeDasharray: '2 2' }),
                  h('line', { x1: 62, y1: 30, x2: 85, y2: 30, stroke: color, strokeWidth: 1, opacity: 0.6, strokeDasharray: '2 2' })
                ]; } }
            ];
            var MOTTOES = [
              { latin: 'Festina lente', en: 'Make haste slowly' },
              { latin: 'Labore et constantia', en: 'By labor and constancy' },
              { latin: 'Veritas vincit', en: 'Truth conquers' },
              { latin: 'Per aspera ad astra', en: 'Through hardship to the stars' },
              { latin: 'Lux ex tenebris', en: 'Light out of darkness' },
              { latin: 'Vincit qui se vincit', en: 'They conquer who conquer themselves' }
            ];
            var FINISHES = [
              { key: 'gold', label: 'Gold', color: T.accentHi },
              { key: 'copper', label: 'Copper', color: '#b87333' },
              { key: 'silver', label: 'Silver', color: '#cfd2cf' }
            ];
            var sym = SYMBOLS[markSymbol] || SYMBOLS[0];
            var mot = MOTTOES[markMotto] || MOTTOES[0];
            var fin = FINISHES.find(function(f) { return f.key === markFinish; }) || FINISHES[0];
            return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr', gap: 18, alignItems: 'center' } },
                // Left: live preview
                h('div', { style: { background: T.parchment, color: T.ink, border: '3px double ' + T.wood, borderRadius: 8, padding: 14, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' } },
                  h('div', { style: { fontSize: 10, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Your mark'),
                  h('svg', { viewBox: '0 0 100 100', width: 130, height: 130, style: { display: 'block', margin: '0 auto' }, 'aria-hidden': 'true' },
                    h('circle', { cx: 50, cy: 50, r: 46, fill: 'none', stroke: fin.color, strokeWidth: 1.5, strokeDasharray: '2 2', opacity: 0.6 }),
                    sym.svg(fin.color)
                  ),
                  h('div', { style: { marginTop: 8, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#5c4630', fontSize: 12, lineHeight: 1.3 } }, mot.latin),
                  h('div', { style: { fontFamily: 'Georgia, serif', color: '#7c2d12', fontSize: 10, marginTop: 2 } }, '"' + mot.en + '"')
                ),
                // Right: pickers
                h('div', null,
                  // Symbol picker
                  h('div', { style: { marginBottom: 12 } },
                    h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Symbol'),
                    h('div', { className: 'printingpress-no-print', style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                      SYMBOLS.map(function(s, i) {
                        var isPicked = (markSymbol === i);
                        return h('button', { key: s.key,
                          onClick: function() { setMarkSymbol(i); },
                          'aria-pressed': isPicked ? 'true' : 'false',
                          style: btn({
                            padding: '6px 10px', fontSize: 11,
                            background: isPicked ? T.accent : T.cardAlt,
                            color: isPicked ? T.ink : T.text,
                            borderColor: isPicked ? T.accentHi : T.border
                          })
                        }, s.label);
                      })
                    ),
                    h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic', marginTop: 4 } }, sym.meaning)
                  ),
                  // Motto picker
                  h('div', { style: { marginBottom: 12 } },
                    h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Motto (Latin)'),
                    h('div', { className: 'printingpress-no-print', style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                      MOTTOES.map(function(m, i) {
                        var isPicked = (markMotto === i);
                        return h('button', { key: i,
                          onClick: function() { setMarkMotto(i); },
                          'aria-pressed': isPicked ? 'true' : 'false',
                          title: m.en,
                          style: btn({
                            padding: '6px 10px', fontSize: 11, fontStyle: 'italic',
                            background: isPicked ? T.accent : T.cardAlt,
                            color: isPicked ? T.ink : T.text,
                            borderColor: isPicked ? T.accentHi : T.border
                          })
                        }, m.latin);
                      })
                    )
                  ),
                  // Finish picker
                  h('div', null,
                    h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Finish'),
                    h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 6 } },
                      FINISHES.map(function(f) {
                        var isPicked = (markFinish === f.key);
                        return h('button', { key: f.key,
                          onClick: function() { setMarkFinish(f.key); },
                          'aria-pressed': isPicked ? 'true' : 'false',
                          style: btn({
                            padding: '6px 10px', fontSize: 11,
                            background: isPicked ? f.color : T.cardAlt,
                            color: isPicked ? T.ink : T.text,
                            borderColor: isPicked ? T.accentHi : T.border,
                            fontWeight: 700
                          })
                        }, f.label);
                      })
                    )
                  )
                )
              ),
              h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
                'A real shop kept its mark for generations. The Estiennes used the olive tree for over 100 years across three printer-generations. Your mark would have appeared on every book your shop made.')
            );
          })(),

          // ── Editor ──
          // Composer controls use a darker variant of the parchment palette
          // so the editor visually echoes the preview below. Faint radial
          // foxing in the corners (same treatment as the preview, dimmer).
          // The brass border ties the composer to the broader brass/wood
          // material vocabulary of the rest of the tool.
          h('div', { className: 'printingpress-no-print', style: {
              background: 'radial-gradient(ellipse at 8% 12%, rgba(201,161,74,0.06) 0%, transparent 35%), radial-gradient(ellipse at 92% 88%, rgba(201,161,74,0.06) 0%, transparent 35%), ' + T.card,
              border: '1px solid ' + T.accent,
              borderRadius: 12, padding: 16, marginBottom: 14,
              boxShadow: 'inset 0 0 18px rgba(201,161,74,0.05)'
            } },
            sectionHeader('📝', 'Composer'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } },
              TEMPLATES.map(function(tpl, i) {
                return h('button', { key: i,
                  onClick: function() { loadTemplate(i); },
                  style: i === templateIdx ? btnPrimary({ padding: '6px 12px', fontSize: 12 }) : btn({ padding: '6px 12px', fontSize: 12 })
                }, tpl.label);
              })
            ),
            h('label', { htmlFor: 'pp-content', style: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 } },
              'Your text (first line is the title, rest is body):'),
            h('textarea', {
              id: 'pp-content', value: content,
              onChange: function(e) { setContent(e.target.value); },
              rows: 8,
              style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
            }),
            h('div', { style: { display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' } },
              h('div', { style: { flex: 1, minWidth: 180 } },
                h('label', { htmlFor: 'pp-font', style: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Font:'),
                h('select', { id: 'pp-font', value: font,
                  onChange: function(e) { setFont(e.target.value); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 13 }
                },
                  ['Georgia', '"Times New Roman"', '"Courier New"', '"Helvetica Neue"', 'Verdana'].map(function(f) {
                    return h('option', { key: f, value: f, style: { fontFamily: f } }, f.replace(/"/g, ''));
                  })
                )
              ),
              h('div', { style: { flex: 1, minWidth: 180 } },
                h('label', { htmlFor: 'pp-size', style: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 } },
                  'Title size: ', h('strong', null, titleSize + 'px')),
                h('input', { id: 'pp-size', type: 'range', min: 24, max: 80, value: titleSize,
                  onChange: function(e) { setTitleSize(parseInt(e.target.value, 10)); },
                  style: { width: '100%', accentColor: T.accent }
                })
              ),
              h('div', { style: { flex: '1 0 100%', minWidth: 180 } },
                h('label', { htmlFor: 'pp-border', style: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Ornamental border:'),
                h('select', { id: 'pp-border', value: borderStyle,
                  onChange: function(e) { setBorderStyle(e.target.value); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 13 }
                },
                  BORDER_OPTIONS.map(function(b) { return h('option', { key: b.id, value: b.id }, b.label); })
                )
              )
            )
          ),

          // ── Preview (this is what prints) ──
          // Position: relative so the absolute-positioned border SVG aligns
          // exactly with the broadside page boundary.
          // Broadside preview: aged-parchment treatment.
          // Background combines a base parchment color with two radial
          // gradients at the corners to simulate aging/foxing, plus a subtle
          // SVG-based grain pattern at very low opacity. This is pure CSS so
          // it prints cleanly via the @media print rule (no big background
          // images to worry about).
          // Broadside preview wrapped in a div that provides a page-curl
          // shadow underneath. The inner div is the actual sheet; the outer
          // div casts a layered shadow that simulates the paper being slightly
          // curled at the corners — a real printed sheet doesn't sit flat on
          // a desk. Drop-shadow stack: subtle ground shadow + sharper top-edge
          // shadow for the "lifted" feel.
          h('div', { style: {
              position: 'relative',
              marginBottom: 4,
              filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            } },
          h('div', { style: {
              position: 'relative',
              background: 'radial-gradient(ellipse at 8% 12%, rgba(180,140,80,0.18) 0%, transparent 30%), radial-gradient(ellipse at 92% 88%, rgba(180,140,80,0.18) 0%, transparent 30%), radial-gradient(ellipse at 92% 12%, rgba(180,140,80,0.10) 0%, transparent 25%), radial-gradient(ellipse at 8% 88%, rgba(180,140,80,0.10) 0%, transparent 25%), ' + T.parchment,
              color: T.ink, padding: 36, border: '2px solid ' + T.border, borderRadius: 6, minHeight: 480, fontFamily: font, overflow: 'hidden',
              boxShadow: 'inset 0 0 30px rgba(120,90,40,0.08)',
              // Page-curl: clip-path with subtle corner bends for a hint of
              // physical paper. Modest values so the broadside still reads
              // as a rectangular page, just with slight imperfection.
              clipPath: 'polygon(0% 1%, 1% 0%, 99% 0%, 100% 1%, 100% 99%, 99% 100%, 1% 100%, 0% 99%)'
            } },
            // Border decoration overlay (behind text)
            renderBorder(borderStyle),
            // Faint vertical fold-mark down the center of the broadside —
            // real broadsides were often folded into halves or quarters for
            // distribution by hand or by post. The subtle crease (gradient
            // shadow + thin highlight on either side) suggests the sheet
            // was once folded and reopened.
            h('div', { 'aria-hidden': 'true', style: {
              position: 'absolute',
              top: 0, bottom: 0,
              left: '50%',
              width: 3,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, rgba(180,140,80,0.15) 0%, rgba(120,90,40,0.18) 50%, rgba(180,140,80,0.15) 100%)',
              pointerEvents: 'none',
              opacity: 0.7
            } }),
            // Content (positioned above border via z-index inheritance).
            // Title rendered with an illuminated drop-cap on the first
            // letter — the medieval-into-Renaissance convention for
            // formal printed pieces. The first character gets a small
            // ornamented "block" (gold-bordered, slightly darker ground)
            // sized proportionally to titleSize. Falls back to a normal
            // title when there's no titleLine (placeholder text).
            h('div', { style: { position: 'relative', zIndex: 1 } },
              h('div', { style: { fontSize: titleSize, fontWeight: 800, textAlign: 'center', marginBottom: 16, lineHeight: 1.1, borderBottom: '3px double ' + T.ink, paddingBottom: 12, fontFamily: font, position: 'relative' } },
                // Illuminated first letter when there's a real title (>= 2 chars)
                titleLine && titleLine.length >= 2 ? h(React.Fragment, null,
                  h('span', { style: {
                    display: 'inline-block',
                    fontSize: Math.round(titleSize * 1.15),
                    background: 'linear-gradient(180deg, #d4914f 0%, #7c4f1f 100%)',
                    color: '#fef3c7',
                    padding: '2px 10px 0',
                    border: '2px solid #7c4f1f',
                    borderRadius: 3,
                    marginRight: 6,
                    textShadow: '1px 1px 0 rgba(0,0,0,0.25)',
                    fontFamily: font,
                    verticalAlign: 'baseline',
                    lineHeight: 1
                  } }, titleLine.charAt(0)),
                  titleLine.slice(1)
                ) : (titleLine || '(your title)')),
              bodyLines.map(function(line, i) {
                return h('div', { key: i, style: { fontSize: Math.max(14, titleSize / 3), lineHeight: 1.5, textAlign: 'center', marginBottom: 6, fontFamily: font } },
                  line || h('span', { style: { color: 'transparent' } }, '·'));
              }),
              // Footer with stationer's mark + composition stamp. Echoes the
              // period convention of printers ending a broadside with their
              // colophon. Tiny dolphin-and-anchor mark to the left (Aldine
              // tribute reused from the disclaimer), composition date to the
              // right, separated by a thin rule.
              h('div', { style: { marginTop: 24, paddingTop: 8, borderTop: '1px solid ' + T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 } },
                // Tiny dolphin-and-anchor — same mark as the disclaimer
                h('svg', { width: 18, height: 22, viewBox: '0 0 38 46', 'aria-hidden': 'true',
                  style: { display: 'block', opacity: 0.6 } },
                  h('line', { x1: 19, y1: 6, x2: 19, y2: 38, stroke: '#7c2d12', strokeWidth: 2, strokeLinecap: 'round' }),
                  h('line', { x1: 11, y1: 12, x2: 27, y2: 12, stroke: '#7c2d12', strokeWidth: 1.5, strokeLinecap: 'round' }),
                  h('circle', { cx: 19, cy: 5, r: 2.5, fill: 'none', stroke: '#7c2d12', strokeWidth: 1.2 }),
                  h('path', { d: 'M 19 38 Q 8 38 7 30 Q 9 34 13 35', fill: 'none', stroke: '#7c2d12', strokeWidth: 1.5, strokeLinecap: 'round' }),
                  h('path', { d: 'M 19 38 Q 30 38 31 30 Q 29 34 25 35', fill: 'none', stroke: '#7c2d12', strokeWidth: 1.5, strokeLinecap: 'round' }),
                  h('path', { d: 'M 11 18 Q 6 22 11 28 Q 19 31 26 26 Q 31 22 26 17 Q 21 14 19 18',
                    fill: 'none', stroke: '#7c2d12', strokeWidth: 1.4, strokeLinecap: 'round' }),
                  h('circle', { cx: 13, cy: 20, r: 0.8, fill: '#7c2d12' })
                ),
                h('div', { style: { fontSize: 10, color: '#5c4630', fontStyle: 'italic', fontFamily: 'Georgia, serif' } },
                  'Composed in PrintingPress · ', new Date().toLocaleDateString()),
                // Hand-drawn printer's signature — period convention. Most
                // 16th-17th century broadsides ended with the printer's name
                // in script as a sort of seal. We render a stylized SVG
                // signature flourish (looks like a quick scribed signature)
                // so the broadside reads as "signed by the printer."
                h('svg', { width: 60, height: 18, viewBox: '0 0 60 18', 'aria-hidden': 'true',
                  style: { opacity: 0.6 } },
                  h('path', { d: 'M 2 12 Q 8 4 14 10 Q 18 14 22 8 Q 26 4 30 10 Q 34 16 38 8 Q 44 4 50 12 Q 54 16 58 14',
                    stroke: '#7c2d12', strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round' }),
                  h('circle', { cx: 58, cy: 14, r: 1.2, fill: '#7c2d12' })
                )
              )
            )
          )),  // close inner sheet div, then outer drop-shadow wrapper

          sectionHeader('💡', 'About broadsides'),
          keyPointBlock(
            'Broadsides were the original mass-print form. Cheap, single-sheet, often illustrated:',
            [
              'Public announcements: lost cattle, town meetings, plays, executions',
              'Political pamphleteering: "Common Sense" by Thomas Paine sold ~150,000 copies in 1776 — at a time when the colonies had ~2.5 million people',
              'Popular ballads and poems: street hawkers sold them for a penny',
              'Religious tracts: both Reformation and Counter-Reformation produced millions',
              'Advertising: the modern poster descends from the broadside'
            ]
          ),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('broadside', [
            { q: 'Approximately how many copies of Thomas Paine\'s "Common Sense" sold in the colonies in 1776?', opts: ['About 1,000', 'About 10,000', 'About 150,000', 'About 1 million'], ans: 2, explain: '~150,000 copies in a colonial population of ~2.5 million. Per-capita, this is one of the best-selling political pamphlets in American history. The American Revolution was a print event as much as a military one.' },
            { q: 'A "broadside" is:', opts: ['A side of a ship', 'A single-sheet printed work, often political or commercial', 'A type of woodcut', 'A printer\'s tool'], ans: 1, explain: 'A broadside is a single-sheet print, traditionally one-sided. Used for announcements, ballads, political tracts, and advertising.' }
          ]),

          sourcesBlock([
            { label: 'Library of Congress — American Broadsides Collection', url: 'https://www.loc.gov/collections/broadsides-and-other-printed-ephemera/' },
            { label: 'British Library — Bodleian Broadside Ballads', url: 'https://ballads.bodleian.ox.ac.uk/' },
            { label: 'Eric Foner, "Tom Paine and Revolutionary America" (1976)' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.broadside),
          crossLinkFooter('broadside'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 9 — THE SAME FEARS
      // Print's moral panic and its parallels to the internet/AI moment.
      // The "tech panic" framing is sometimes dismissed and sometimes
      // valid. This module is honest about both. Print critics in 1450
      // raised concerns about memory atrophy, dangerous ideas spreading
      // faster than they could be contained, job displacement, anonymous
      // authorship, information overload, and class destabilization.
      // Every one of those concerns is alive today, applied to internet,
      // social media, and AI. Some critics were right. Some were wrong.
      // The module teaches students to reason about both.
      // ═════════════════════════════════════════════════════════════════════
      function renderSameFears() {
        // PARALLEL_GRID: each row is a 1450 concern + its 2026 echo.
        // Color column is for visual variety on the comparison table.
        var PARALLEL_GRID = [
          { fear1450: 'Will atrophy memory.', voice1450: 'Echoing Plato on writing — now applied to easy book access.',
            fear2026: 'Smartphones rot attention spans.', voice2026: 'Common parent + clinician argument 2010-present.' },
          { fear1450: 'Spreads heretical / dangerous ideas faster than authorities can respond.', voice1450: 'Catholic Church — Index Librorum Prohibitorum (1559) listed forbidden books.',
            fear2026: 'Social media spreads extremism / misinformation faster than moderation.', voice2026: 'Surgeon General + regulators 2020-present.' },
          { fear1450: 'Cheap mass production destroys quality.', voice1450: 'Manuscript-tradition scholars worried printed books would be sloppy, error-ridden.',
            fear2026: 'AI generates content with no quality control.', voice2026: 'Journalists, scholars, fact-checkers, 2023-present.' },
          { fear1450: 'Scribes and copyists lose their work.', voice1450: 'Guild scribes in Florence, Paris, Cologne 1470-1500.',
            fear2026: 'AI takes coding, writing, art, translation jobs.', voice2026: 'Labor economists + working professionals 2023-present.' },
          { fear1450: 'Too many books to read — information overload.', voice1450: 'Erasmus + Conrad Gessner explicitly used the phrase (1545).',
            fear2026: 'Information overload, doom-scrolling fatigue.', voice2026: 'Attention researchers + every tired adult 2010-present.' },
          { fear1450: 'Anonymous printers — no accountability for what is printed.', voice1450: 'Henri Estienne and others called for printer\'s marks (colophons).',
            fear2026: 'Anonymous social media accounts spread harm without consequence.', voice2026: 'Platform policy debates 2015-present.' },
          { fear1450: 'Subversive pamphlets cause political instability.', voice1450: 'Most European monarchs — censorship laws across Europe 1480-1700.',
            fear2026: 'Online radicalization, foreign election interference.', voice2026: 'Election security researchers 2016-present.' },
          { fear1450: 'Common people read dangerous ideas they cannot interpret.', voice1450: 'Clergy of most denominations — vernacular Bible reading was contested for centuries.',
            fear2026: 'People share AI-generated misinformation they cannot evaluate.', voice2026: 'Media literacy advocates 2020-present.' }
        ];
        // QUESTIONS — designed for Crew-style discussion, not single-right-answer.
        var DISCUSSION = [
          { q: 'What does it mean that we keep having the same argument every 500 years?',
            hint: 'Possible angles: human nature does not change; new tech always disrupts existing institutions; the arguments are templates we reach for whenever something powerful arrives.' },
          { q: 'Print took ~150 years to settle into stable institutions (editorial standards, copyright, libraries, peer review). How long do internet and AI need?',
            hint: 'No clean answer. Worth noticing: the internet is ~30 years old, social media is ~20, generative AI is ~3. We are early in a 150-year settling.' },
          { q: 'Is there a difference between "real moral concern" and "moral panic"? How do you tell them apart in your own time?',
            hint: 'Real concerns usually: cite specific harms with evidence, propose specific interventions, distinguish populations affected. Moral panics usually: invoke vague civilizational decline, target whole technologies rather than uses, assume the worst about new generations.' },
          { q: 'Some 1450 critics were right (print DID cause religious violence; print DID enable mass propaganda). Some were wrong (memory did not collapse; the social order did not end). What does this teach us about evaluating today\'s critics?',
            hint: 'Probably right: some workers WILL be displaced; some institutions WILL be disrupted. Probably wrong: humanity will not lose the ability to think. The hard work is sorting which is which.' },
          { q: 'Print eventually expanded human capability massively. Are there technologies where the fears WERE right and society should have moved differently?',
            hint: 'Open question worth real discussion. Some candidates students might raise: leaded gasoline, asbestos, certain social-media features. The honest answer is that "should have" requires hindsight that critics did not have.' }
        ];
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🪶 The Same Fears'),
          dropCapPara('Every new information technology arrives with the same warnings. It will rot our brains. It will spread dangerous ideas. It will take our jobs. It will destabilize society. The printing press got these warnings in 1450. The internet got them in 1995. AI is getting them now. Some critics were right. Some were wrong. The grown-up question is not whether the critics had a point, but which points are which.'),

          sectionHeader('📚', 'How print supported the transfer of knowledge and ideas'),
          keyPointBlock(
            'Before getting to the fears, what was print actually doing? It changed knowledge transfer in four big ways:',
            [
              { k: 'Standardization', v: 'A printed astronomical table or anatomical diagram was identical in 500 copies. For the first time, scholars in different cities could refer to "Figure 7" and know they meant the same thing. The peer-review tradition descends from this.' },
              { k: 'Speed', v: 'Luther\'s 95 Theses spread across Europe in weeks. Wycliffe had made similar arguments 130 years earlier in manuscript culture, and his movement was locally suppressed before reaching mass audiences. Print broke the suppression timeline.' },
              { k: 'Permanence', v: 'A manuscript copy could disappear. A 500-copy print run was harder to erase. The Cherokee Phoenix (1828) survives because of print; many oral cultures lost similar repositories. Print is a kind of memory insurance.' },
              { k: 'Networks', v: 'Coffeehouses became reading rooms. Scientific journals (Philosophical Transactions, 1665) created cross-city research networks. The "Republic of Letters" was a print-enabled invention. The modern internet is structurally similar — different medium, same idea of distributed scholarship.' }
            ]
          ),

          sectionHeader('⚠️', 'What critics feared in 1450'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              'These are not invented or exaggerated. Each was a genuine, documented concern voiced by someone in the 1450-1600 period. The voice attribution names the actual source where the concern was raised.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              PARALLEL_GRID.map(function(row, i) {
                return h('div', { key: i, style: { background: T.cardAlt, borderRadius: 8, padding: 12, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } }, '1450 fear'),
                  h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 4, fontWeight: 600 } }, '"' + row.fear1450 + '"'),
                  h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.45 } }, row.voice1450)
                );
              })
            )
          ),

          sectionHeader('🔄', '1450 then, 2026 now — the same arguments side by side'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              'Map the 1450 concern to its 2026 echo. The technology changed; the argument template did not. Read each row across, then ask yourself: same fear, or different?'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              PARALLEL_GRID.map(function(row, i) {
                return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'stretch' } },
                  // 1450 side
                  h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.warn, borderRadius: 6, padding: 10 } },
                    h('div', { style: { fontSize: 10, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } }, '1450'),
                    h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.45 } }, row.fear1450)
                  ),
                  // Arrow
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accent, fontSize: 18, fontFamily: 'Georgia, serif' } }, '⇌'),
                  // 2026 side
                  h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid #60a5fa', borderRadius: 6, padding: 10 } },
                    h('div', { style: { fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } }, '2026'),
                    h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.45 } }, row.fear2026)
                  )
                );
              })
            )
          ),

          calloutBox('info', 'Some critics were right. Some were wrong.',
            'Print DID enable mass propaganda. Print DID contribute to the religious wars (5-10 million European dead, 1517-1648). Cheap books often WERE sloppy. Scribal labor DID disappear. The information-overload critique was real and never fully solved. But: memory did not atrophy (it just shifted from raw recall to library navigation). The social order did not collapse (it restructured around new institutions). Common people reading "dangerous ideas" did not produce chaos (it produced the modern democratic public). The honest history is that critics were partly right and partly wrong, and we cannot tell which from inside our own moment.'),

          sectionHeader('💬', 'Thought-provoking questions (designed for Crew or class discussion)'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            DISCUSSION.map(function(d, i) {
              return h('div', { key: i, style: { marginBottom: i === DISCUSSION.length - 1 ? 0 : 14, paddingBottom: i === DISCUSSION.length - 1 ? 0 : 14, borderBottom: i === DISCUSSION.length - 1 ? 'none' : '1px dashed ' + T.border } },
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 14, color: T.accentHi, fontWeight: 800, fontFamily: 'Georgia, serif', flexShrink: 0 } }, (i + 1) + '.'),
                  h('div', { style: { fontSize: 14, color: T.text, fontWeight: 600, lineHeight: 1.5 } }, d.q)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, paddingLeft: 22, fontStyle: 'italic' } },
                  h('strong', { style: { color: T.dim, fontStyle: 'normal' } }, 'Discussion hint: '),
                  d.hint)
              );
            })
          ),

          calloutBox('warn', 'The grown-up frame for technology debates',
            'Treat "this new technology is uniquely bad" and "this new technology is uniquely good" as equally suspicious. The honest position is usually: most fears will turn out smaller than imagined, some fears will turn out larger than imagined, the technology will both enable and constrain in ways nobody predicted, and 150 years from now your great-great-grandkids will be having the same argument about something else.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('sameFears', 0, {
            prompt: 'A 1500 scholar argues that printed books are inferior to manuscript copies because printers cut corners on accuracy. A 2026 scholar argues the same thing about AI-generated text. What do these two arguments share, and what makes them different?',
            choices: [
              'Identical arguments; both are wrong.',
              'Identical arguments; both are right.',
              'Structurally the same argument: cheap mass production lowers per-unit quality. Both have real validity (cheap books WERE often sloppy; AI text often IS unreliable). Both also miss: the mass-produced version eventually develops its own quality-control institutions (errata, second editions for print; verification, fact-checking, attribution norms for AI). The honest answer is the argument is partially right — and the response is institutional, not regulatory or prohibitionist.',
              'Totally different arguments because print and AI are different technologies.'
            ],
            correct: 2,
            explain: 'Both arguments share the structure: cheap mass production lowers quality. Both have partial validity. The real lesson is what print history teaches: cheap-output technologies develop quality-control institutions over time. Editorial standards for print took ~100 years to mature. AI is in year 3. Patience and institution-building are the response, not prohibition.'
          }),
          scenarioCard('sameFears', 1, {
            prompt: 'You are a school administrator in 1525. A worried parent says reading the vernacular Bible at home will lead her child into heresy and the family into trouble with the Church. Your job is not to take a side, but to think clearly. What is the strongest framing of her concern, and what is the strongest counterargument?',
            choices: [
              'She is wrong because everyone should read.',
              'She is right because the Church\'s authority comes first.',
              'Her strongest framing: the institutional structure that protected her family from theological error has just been bypassed; the cost of unsupervised access can be very high (heresy executions, social ostracism). The strongest counterargument: protected access also bypasses agency, and a generation taught to read theology themselves builds the muscle of independent reasoning. Both are real. The 1525 family had to make this call without knowing how it would turn out.',
              'Modern values say she is wrong; we should impose them.'
            ],
            correct: 2,
            explain: 'The honest answer respects that 1525 people did not have our hindsight. The Reformation produced both intellectual flourishing AND massive religious violence. A parent worried about her family\'s safety was not wrong to be worried. The deeper teaching: respect historical actors as people making real decisions under uncertainty, not as villains or heroes by modern lights.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('sameFears', [
            { q: 'The Catholic Church\'s "Index Librorum Prohibitorum" (1559) was:', opts: ['A library catalog', 'A list of forbidden books that the Church prohibited the faithful from reading', 'A pricing index for books', 'A printer\'s union directory'], ans: 1, explain: 'A standing list of books the Catholic Church forbade. It existed in various forms from 1559 until 1966. It is the most direct historical analogue to modern content-moderation lists.' },
            { q: 'Conrad Gessner used the phrase "confusing and harmful abundance of books" in 1545. What modern phrase echoes this concern most directly?', opts: ['"Spam folder"', '"Information overload"', '"Library science"', '"Algorithmic curation"'], ans: 1, explain: 'Gessner literally articulated information overload in 1545 — within a century of Gutenberg. The condition is not new; it is intrinsic to mass information production.' },
            { q: 'Approximately how many Europeans died in the religious wars (1517-1648) that print partly enabled?', opts: ['About 100,000', 'About 1 million', 'About 5-10 million', 'About 100 million'], ans: 2, explain: '5-10 million by most historical estimates. Print critics who warned that mass-distributed religious dissent would cause violence were not wrong about that. They were wrong about whether the violence would be the end of the story — Europe eventually restructured into religious pluralism.' },
            { q: 'Which of these is the most honest reading of "1450 critics vs print"?', opts: ['Critics were silly and obviously wrong', 'Critics were prophets and obviously right', 'Critics were partly right and partly wrong, and the response to genuine concerns was institutional development (editorial standards, copyright, libraries), not banning print', 'Critics did not exist'], ans: 2, explain: 'The honest reading is partial validity. The grown-up response was institutional, not prohibitionist. This is also probably the right frame for current internet and AI debates.' }
          ]),

          sourcesBlock([
            { label: 'Adrian Johns, "The Nature of the Book: Print and Knowledge in the Making" (1998)', note: 'Foundational scholarly account of how printed accuracy and authority were socially constructed.' },
            { label: 'Tom Standage, "Writing on the Wall: Social Media in the First 2,000 Years" (2013)', note: 'Explicit historical parallels between print and modern social media.' },
            { label: 'Index Librorum Prohibitorum (Catholic Church, 1559-1966)', url: 'https://en.wikipedia.org/wiki/Index_Librorum_Prohibitorum', note: 'Primary historical artifact of institutional content moderation.' },
            { label: 'Andrew Pettegree, "The Invention of News" (2014)', note: 'On the moral panic surrounding early newsprint.' },
            { label: 'Ann M. Blair, "Too Much to Know: Managing Scholarly Information Before the Modern Age" (2010)', note: 'Documents the information-overload arguments from 1500-1700.' },
            { label: 'Naomi Baron, "Words Onscreen" (2015)', note: 'Modern reading-vs-attention debates with historical context.' },
            { label: 'Plato, "Phaedrus" (~370 BCE)', note: 'The original "writing will atrophy memory" argument that print critics inherited.' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.sameFears),
          crossLinkFooter('sameFears'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 10 — A DAY IN THE SHOP
      // Role-based narrative vignette. Student picks one of 4 shop roles
      // (Apprentice / Compositor / Pressman / Master Printer) and walks
      // through 4 decisions across a working day in 1455 Mainz. Each
      // choice has a consequence; the end summary shows what kind of
      // printer they turned out to be. Pure interactivity — no single
      // right answer, just historical constraints to inhabit.
      // ═════════════════════════════════════════════════════════════════════
      function renderDayInShop() {
        // State: which role + which decision step + cumulative outcome score
        var roleRaw = useState(null);
        var role = roleRaw[0], setRole = roleRaw[1];
        var stepRaw = useState(0);
        var step = stepRaw[0], setStep = stepRaw[1];
        var choicesRaw = useState([]);
        var choices = choicesRaw[0], setChoices = choicesRaw[1];
        var feedbackRaw = useState(null);
        var feedback = feedbackRaw[0], setFeedback = feedbackRaw[1];

        // ROLES — each has a short character bio and 4 decisions
        var ROLES = {
          apprentice: {
            label: 'Apprentice (Year 1)',
            icon: '🧒',
            bio: 'You are 12 years old. You started 6 months ago. You sweep, fetch ink, stack paper, and watch the journeymen. You are paid only in room and board, but you will be a master in 7 years if you stay disciplined.',
            decisions: [
              { id: 'a1', time: 'Morning', prompt: 'The master sends you to fetch oil-based ink from the cellar. You realize the shop has only enough for half a day. Telling him will mean blame for not noticing earlier. Saying nothing means the press stops at midday.',
                choices: [
                  { id: 'speak', text: 'Tell the master immediately, accept the blame.', outcome: 'The master is stern but glad you spoke up. He sends the senior apprentice to the supplier. A small reprimand, but you are trusted with more responsibility next week. +Trust.' },
                  { id: 'hide',  text: 'Say nothing. Hope someone else notices.', outcome: 'The press stops at midday. The master traces the missed alert back to you. You lose a week of advancement privileges. The print run runs late. −Trust.' },
                  { id: 'fetch', text: 'Run to the supplier on your own — show initiative.', outcome: 'You return with the wrong ink (water-based, useless for the press). The master sighs but appreciates the initiative. You learn the difference between ink types the hard way. Mixed.' }
                ] },
              { id: 'a2', time: 'Mid-morning', prompt: 'The compositor — a journeyman three years your senior — drops a galley. The type "falls in pi" (becomes a jumbled pile). It will take an hour to sort. He glances at you. He saw you watching. He could blame you.',
                choices: [
                  { id: 'help',  text: 'Help sort the type silently. Do not say who dropped it.', outcome: 'You and the compositor sort for an hour. He owes you. Years later when he is a master, he sponsors your transition. +Loyalty.' },
                  { id: 'tell',  text: 'Tell the master what happened so he knows.', outcome: 'The compositor is docked half a day\'s pay. He resents you for years. The shop runs on tighter discipline. +Honesty, but social cost.' },
                  { id: 'walk',  text: 'Pretend you did not see. Stay out of it.', outcome: 'The compositor blames you anyway. You spend the next hour proving it was him. Time wasted on both sides. Lesson learned about staying out of social politics.' }
                ] },
              { id: 'a3', time: 'Afternoon', prompt: 'You accidentally smudge a freshly printed page. The master is on the other side of the shop. The smudge is small. The page will be inserted into a Bible that costs the buyer 3 years\' wages.',
                choices: [
                  { id: 'speak', text: 'Tell the master immediately.', outcome: 'He reprints the page. Cost to the shop: 2 hours and one sheet of paper. He thanks you for your honesty. The Bible ships with no defect. +Integrity.' },
                  { id: 'hide',  text: 'Slip the smudged page under a clean one and hope.', outcome: 'The Bible ships with a smudge on page 47. Three years later, that copy is in a Cologne library. A scholar finds the smudge and traces it to your shop. The shop\'s reputation takes a hit. −Reputation.' },
                  { id: 'clean', text: 'Try to clean the smudge yourself with a damp cloth.', outcome: 'You make it worse — now there is a clear damp ring around the smudge. You have to confess. The master is twice as angry as he would have been. Lesson in problem-escalation.' }
                ] },
              { id: 'a4', time: 'Evening', prompt: 'The shop closes at sunset. Another apprentice asks if you would help him learn the letter positions in the type case (he is behind). Helping him means staying late. The master prefers apprentices rest so they work fresh tomorrow.',
                choices: [
                  { id: 'help',  text: 'Stay and help him. Skip dinner.', outcome: 'He learns faster than he would have. Three years from now you are the two strongest journeymen in the city. Crew matters more than grades. +Crew.' },
                  { id: 'ask',   text: 'Suggest you both ask the master if you can use the next slow hour during the day.', outcome: 'The master appreciates the request and assigns a mentoring slot. You become known as someone who builds others up without sneaking around. +Initiative.' },
                  { id: 'rest',  text: 'Tell him to figure it out himself. Apprentices need rest.', outcome: 'You sleep well. He struggles for weeks. The shop is a little less strong overall. You did the rational thing for yourself; the cost is invisible.' }
                ] }
            ]
          },
          compositor: {
            label: 'Compositor (Year 5)',
            icon: '🔤',
            bio: 'You are 19. You set type for 8 hours a day, ~1,000 characters per hour, mirror-reversed, from memory. Your back hurts. You can read a manuscript fluently mirror-reversed and your fingers know where every letter sits in the case.',
            decisions: [
              { id: 'c1', time: 'Morning', prompt: 'A wealthy patron changes the order: they want the dedication page set in italic instead of Roman. Your shop has no italic punches. Buying punches takes weeks; the patron expects delivery in three days.',
                choices: [
                  { id: 'subcontract', text: 'Subcontract the italic dedication page to the Aldine Press in Venice (overnight courier).', outcome: 'It costs 30% of the patron\'s fee. The dedication ships on time and looks beautiful. Your shop builds a relationship with Aldus that pays off for a decade. Wise.' },
                  { id: 'fake', text: 'Slant the Roman type slightly using shims. Hope the patron does not notice.', outcome: 'The patron notices. They withdraw the order and tell three other patrons. The shop loses two months of work. Faking craftsmanship is detectable.' },
                  { id: 'refuse', text: 'Tell the patron honestly you cannot do italic. Offer Roman instead.', outcome: 'They accept Roman with a small discount. Your reputation for honesty grows. You decide that night to commission an italic punch set as a long-term investment. +Integrity, +Strategy.' }
                ] },
              { id: 'c2', time: 'Mid-morning', prompt: 'Setting type for the manuscript, you spot a clear misspelling — "recieve" instead of "receive." The author is dead (a 14th-century theologian). Modern copies all preserve the error.',
                choices: [
                  { id: 'fix', text: 'Silently correct it. No one will notice.', outcome: 'The print is cleaner. Three editions later, scholars use your edition as the authoritative source — your silent correction becomes the standard. You have shaped the historical record. +Quality, ±Authenticity.' },
                  { id: 'mark', text: 'Print the error and add an editorial note: [recieve, sic].', outcome: 'Your editorial note becomes a model for future scholarly editions. You are doing modern textual criticism 400 years early. +Scholarship.' },
                  { id: 'leave', text: 'Print exactly as the manuscript reads. Author intent rules.', outcome: 'You preserve the error faithfully. Scholars eventually develop "sic" notation to handle exactly this. You did not invent it but you obeyed the right principle.' }
                ] },
              { id: 'c3', time: 'Afternoon', prompt: 'A rival shop in Cologne poaches your apprentice mid-job with better pay. Your typesetting pace drops 30%. The Bible commission is due in two weeks.',
                choices: [
                  { id: 'recruit', text: 'Hire a replacement immediately, even if less skilled.', outcome: 'The replacement is slow at first but loyal. By month two your pace is back. You learn that hiring for character beats hiring for skill.' },
                  { id: 'overtime', text: 'Pull extra hours yourself. Refuse to slow the deadline.', outcome: 'You hit the deadline. Your back gives out three months later. You miss six weeks of work. The Bible shipped on time; you nearly broke yourself for it.' },
                  { id: 'renegotiate', text: 'Tell the patron the deadline must slip by a week. Explain why.', outcome: 'The patron is annoyed but agrees. Your reputation for transparency increases. Future patrons trust your timeline estimates. +Trust.' }
                ] },
              { id: 'c4', time: 'Evening', prompt: 'The master suggests you sign your name on the colophon of the next book. You are still a journeyman, not a master. It would be a step up. Other shops sometimes question whether journeymen-signed work counts.',
                choices: [
                  { id: 'accept', text: 'Accept the recognition. You earned it.', outcome: 'Your name appears on a notable edition. Two years later it accelerates your application for master status. The master\'s sponsorship matters more than the technical rules. +Career.' },
                  { id: 'wait', text: 'Politely decline. Wait until you are a master.', outcome: 'You earn quiet respect for not rushing. When you finally make master, your first colophon-signed book is celebrated. +Discipline.' },
                  { id: 'share', text: 'Suggest the colophon list both your names — master + journeyman.', outcome: 'It is unusual but happens. The book ships. You and the master become known as a pair. It is the precursor to "publisher + editor" credit norms 200 years before they formalized. +Innovation.' }
                ] }
            ]
          },
          pressman: {
            label: 'Pressman (Year 6)',
            icon: '💪',
            bio: 'You are 22 and strong. You pull the bar 250 times a day, generating ~500 lb of platen pressure each time. Your shoulders are bigger than the compositor\'s. You can spot a misaligned forme by feel alone.',
            decisions: [
              { id: 'p1', time: 'Morning', prompt: 'The platen has a slight warp from yesterday\'s heat. Re-leveling takes 90 minutes. Pressing through means slightly uneven impressions all morning.',
                choices: [
                  { id: 'level', text: 'Re-level it. Lose 90 minutes.', outcome: 'Afternoon prints are crisp. Reputation for quality holds. The lost 90 minutes never show up in the final product. +Craft.' },
                  { id: 'push', text: 'Push through. Accept 5% lower quality this morning.', outcome: 'The morning\'s impressions go to the patron who notices the unevenness and asks for reprints. You lose more than 90 minutes correcting them. False economy.' },
                  { id: 'partial', text: 'Re-level only the parts that affect the title page; press through on body text.', outcome: 'Smart compromise. Title page is crisp, body is acceptable. You save 45 minutes and the patron is satisfied. +Judgment.' }
                ] },
              { id: 'p2', time: 'Mid-day', prompt: 'Ink supply is running low. Sending the apprentice to the supplier is risky (he might get the wrong kind, as he did last month). Stopping the press is expensive. Going yourself means abandoning the platen for an hour.',
                choices: [
                  { id: 'teach', text: 'Show the apprentice exactly which ink to ask for, give him a sample, send him with the master\'s seal.', outcome: 'He returns with the correct ink. He has now learned a real responsibility. Future deliveries are easier. +Apprentice growth.' },
                  { id: 'stop', text: 'Stop the press, go yourself.', outcome: 'The shop loses an hour but gets the right ink. Safe choice. Costs 1 hour of production.' },
                  { id: 'mix', text: 'Stretch what you have with a thinner blend. Hope it holds.', outcome: 'The thinner ink does not transfer cleanly. Half the morning\'s prints are pale and need reprinting. Larger loss than just stopping the press.' }
                ] },
              { id: 'p3', time: 'Afternoon', prompt: 'A page comes out smudged. The compositor blames the tympan; the master suspects the spacing in the forme. You can feel by hand which is true. Naming the compositor as the cause damages a colleague.',
                choices: [
                  { id: 'truth', text: 'State the truth: it is the compositor\'s spacing. Volunteer to help him correct it.', outcome: 'Compositor is embarrassed but grateful you helped fix it without escalation. Shop runs more honestly. +Crew.' },
                  { id: 'tympan', text: 'Say it is the tympan. Volunteer to retighten it.', outcome: 'The smudge persists because the real cause is unaddressed. Two more reprints. The compositor never learns the spacing issue. False loyalty costs the shop.' },
                  { id: 'master', text: 'Ask the master to inspect it together — let him diagnose.', outcome: 'The master sees the truth, handles the conversation. You stay out of the politics. Slowest but socially safest path.' }
                ] },
              { id: 'p4', time: 'Evening', prompt: 'A typo is discovered on page 23 of the Bible — already printed in 200 copies. Reprinting page 23 means re-setting and re-pressing 200 sheets. Errata slip (a printed correction tucked inside the book) is cheap but sloppy.',
                choices: [
                  { id: 'reprint', text: 'Reprint page 23 in full. Insert the corrected page.', outcome: 'Two extra days of work, one ream of paper. The Bible ships with no visible error. Patron pleased. +Quality. (This is what Gutenberg himself did for known errors in the 42-line Bible.)' },
                  { id: 'errata', text: 'Insert a printed errata slip in the front matter.', outcome: 'Faster but visibly sloppy. Patron is mildly displeased. Some scholars now use "errata slip" as evidence of a hasty edition. ±Reputation.' },
                  { id: 'leave', text: 'Ship as-is. Hope buyers do not notice.', outcome: 'They notice. Three years later your shop is known as "the one with the misprinted Bible." Long-term reputation cost greater than the reprint would have been.' }
                ] }
            ]
          },
          master: {
            label: 'Master Printer',
            icon: '🎩',
            bio: 'You run the shop. You own the press, hire and fire, take risks, sign contracts, sue when necessary. Profit and reputation are both your responsibility. You are 40 and lived through three apprentices, two journeymen, one disastrous fire, and one lawsuit.',
            decisions: [
              { id: 'm1', time: 'Morning', prompt: 'Three orders arrive this morning. (A) A Bible commission — prestigious, low margin, 6 months of work. (B) An almanac — quick, mass-market, mid margin. (C) A heretical pamphlet — high margin, but printing it could mean Church penalties or worse.',
                choices: [
                  { id: 'bible', text: 'Take the Bible.', outcome: 'Reputation grows. Your shop becomes known for sacred work. Cash flow is tight for 6 months. Long-term it positions you well with patrons of all kinds.' },
                  { id: 'almanac', text: 'Take the almanac.', outcome: 'Quick cash. You print 800 copies in a month. Your shop builds capacity in popular print, which scales well. +Sustainable business.' },
                  { id: 'pamphlet', text: 'Take the heretical pamphlet.', outcome: 'You make a great margin. Six months later the Church investigates. You either flee to a Protestant city (life pivot) or pay massive fines (financial ruin). High risk, high reward.' }
                ] },
              { id: 'm2', time: 'Mid-day', prompt: 'A wealthy patron offers to fund a custom italic type set for your shop, in exchange for a 5-year exclusive on a single epic project — printing a complete Cicero in italic. It is a major investment of artistic capacity.',
                choices: [
                  { id: 'accept', text: 'Accept the deal.', outcome: 'You become the foremost italic shop in Mainz. The Cicero edition is talked about for centuries. You lose 5 years of flexibility but gain a permanent reputation.' },
                  { id: 'counter', text: 'Counter-offer: 3-year exclusive, you retain rights to also print other italic works.', outcome: 'The patron agrees with a slightly smaller font commission. Smart compromise. You get the italic punches AND retain commercial flexibility.' },
                  { id: 'decline', text: 'Decline. Keep your shop generalist.', outcome: 'You miss the italic wave. Aldus in Venice gets the patron instead. You stay financially stable but lose a positioning opportunity.' }
                ] },
              { id: 'm3', time: 'Afternoon', prompt: 'A competing shop in Strasbourg offers to merge with yours — combined capital, shared apprentices, larger market. You lose autonomy but gain scale.',
                choices: [
                  { id: 'merge', text: 'Merge.', outcome: 'The merged shop is the largest in the region. You are co-owner instead of sole owner. In two generations, your descendants run a print empire. +Scale, ±Autonomy.' },
                  { id: 'partner', text: 'Form a partnership instead of merging — shared contracts, separate ownership.', outcome: 'Best of both worlds, hardest to manage. You and the Strasbourg shop trade work for 10 years. Ends amicably when the other master retires.' },
                  { id: 'compete', text: 'Decline. Stay independent.', outcome: 'You remain sole owner. Your shop grows slower but never compromises. Your apprentices eventually open their own shops citing your model. +Legacy.' }
                ] },
              { id: 'm4', time: 'Evening', prompt: 'You close the books for the year. The shop made a small profit. Reinvest in: (A) more type, (B) better paper supply, (C) train another apprentice, (D) save for hard times?',
                choices: [
                  { id: 'type', text: 'Buy more type — open a second press line.', outcome: 'Doubled capacity. Risky if demand drops, but if it holds you double profit. Aggressive.' },
                  { id: 'paper', text: 'Better paper supply chain — direct relationship with a mill.', outcome: 'Quality goes up, costs go down over 3 years. Patrons notice the paper quality and refer more work. +Quality.' },
                  { id: 'apprentice', text: 'Train another apprentice — long-term capacity.', outcome: 'In 7 years you have another journeyman. In 10 you have another master who carries your name. Long-game.' },
                  { id: 'save', text: 'Save against the next bad year.', outcome: 'Two years later a plague hits Mainz. The shop survives on savings while two competitors close. Conservative — but you are still printing in 1465 when others are not.' }
                ] }
            ]
          }
        };
        var roleObj = role ? ROLES[role] : null;
        var allDecisions = roleObj ? roleObj.decisions : [];
        var currentDecision = allDecisions[step];
        var isDone = roleObj && step >= allDecisions.length;

        function pickRole(roleId) {
          setRole(roleId);
          setStep(0);
          setChoices([]);
          setFeedback(null);
          announce('Role selected: ' + ROLES[roleId].label);
        }
        function pickChoice(choiceObj) {
          setFeedback(choiceObj);
          var newChoices = choices.concat([{ stepIdx: step, choice: choiceObj }]);
          setChoices(newChoices);
          announce('Choice recorded. ' + choiceObj.outcome);
        }
        function nextStep() {
          setFeedback(null);
          setStep(step + 1);
        }
        function restart() {
          setRole(null);
          setStep(0);
          setChoices([]);
          setFeedback(null);
        }

        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('⚒️ A Day in the Shop'),
          // ── Role selection screen ──
          !role && h('div', null,
            dropCapPara('It is 1455 in a Mainz print shop. The Gutenberg Bible is being produced. Choose your role and walk through four decisions across a working day. Each choice has consequences. There is no single right answer — there are historical constraints, and you are inside them.'),
            sectionHeader('🎭', 'Choose your role'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 14 } },
              ['apprentice', 'compositor', 'pressman', 'master'].map(function(roleId) {
                var r = ROLES[roleId];
                return h('button', { key: roleId,
                  onClick: function() { pickRole(roleId); },
                  'aria-label': 'Choose role: ' + r.label,
                  style: btn({
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                    padding: 16, minHeight: 160, background: T.card, borderColor: T.border
                  })
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%' } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 32 } }, r.icon),
                    h('span', { style: { fontWeight: 700, fontSize: 16, color: T.accentHi, fontFamily: 'Georgia, serif' } }, r.label)
                  ),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, r.bio)
                );
              })
            ),
            // ── Top-down shop floor plan ──
            // Anchors the four roles spatially. Approximate layout of a
            // 1455 Mainz workshop: ~20 ft square, master's desk near the
            // door, type cases by the window for light, press in the
            // working bay, drying lines along the back. Roles are color-
            // coded to their primary station.
            sectionHeader('🗺️', 'The shop you would work in'),
            h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                'Approximate top-down floor plan of a 1455 Mainz workshop. A typical shop was about the size of a two-car garage. Light entered through tall windows; the press sat in the working bay; type cases lined the bright wall.'),
              h('div', { style: { background: '#1a1410', borderRadius: 10, padding: 12, overflow: 'hidden' } },
                h('svg', { viewBox: '0 0 420 280', width: '100%', height: 'auto', style: { maxHeight: 360, display: 'block', margin: '0 auto' }, role: 'img', 'aria-label': 'Top-down floor plan of a 1455 Mainz print shop' },
                  // Floor planks pattern
                  h('defs', null,
                    h('pattern', { id: 'shopFloor', x: 0, y: 0, width: 30, height: 8, patternUnits: 'userSpaceOnUse' },
                      h('rect', { x: 0, y: 0, width: 30, height: 8, fill: '#3a2a1a' }),
                      h('line', { x1: 0, y1: 0, x2: 30, y2: 0, stroke: '#2a1f15', strokeWidth: 0.5 }),
                      h('line', { x1: 0, y1: 4, x2: 30, y2: 4, stroke: '#2a1f15', strokeWidth: 0.3, opacity: 0.5 })
                    )
                  ),
                  // Walls (thick frame)
                  h('rect', { x: 10, y: 10, width: 400, height: 260, fill: 'url(#shopFloor)', stroke: T.wood, strokeWidth: 5 }),
                  // Inner softer border
                  h('rect', { x: 12, y: 12, width: 396, height: 256, fill: 'none', stroke: '#3d2810', strokeWidth: 1 }),
                  // Window markings on left wall (let in light)
                  h('rect', { x: 8, y: 50, width: 6, height: 30, fill: '#e0d8a8', stroke: T.accent, strokeWidth: 1 }),
                  h('rect', { x: 8, y: 100, width: 6, height: 30, fill: '#e0d8a8', stroke: T.accent, strokeWidth: 1 }),
                  // Door at front (south)
                  h('rect', { x: 190, y: 264, width: 40, height: 8, fill: T.parchment, stroke: T.wood, strokeWidth: 1.5 }),
                  h('text', { x: 210, y: 278, textAnchor: 'middle', fontSize: 9, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'street door'),
                  // ─── Master's desk (front-right) ───
                  h('rect', { x: 280, y: 30, width: 110, height: 50, fill: '#5c4630', stroke: T.accent, strokeWidth: 1.5, rx: 3 }),
                  h('rect', { x: 290, y: 36, width: 90, height: 14, fill: T.parchment, stroke: T.wood, strokeWidth: 0.6 }),
                  h('text', { x: 335, y: 47, textAnchor: 'middle', fontSize: 8, fill: T.ink, fontFamily: 'Georgia, serif' }, 'ledger'),
                  h('text', { x: 335, y: 65, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'Master’s desk'),
                  h('text', { x: 335, y: 76, textAnchor: 'middle', fontSize: 9, fill: T.warn }, '👨‍💼'),
                  // ─── Type cases along the bright window wall ───
                  h('rect', { x: 28, y: 30, width: 50, height: 90, fill: T.wood, stroke: T.accent, strokeWidth: 1.5, rx: 2 }),
                  // Upper case (capitals)
                  h('rect', { x: 32, y: 34, width: 42, height: 38, fill: '#2a1f15', stroke: T.dim, strokeWidth: 0.5 }),
                  // Lower case (minuscules)
                  h('rect', { x: 32, y: 76, width: 42, height: 40, fill: '#2a1f15', stroke: T.dim, strokeWidth: 0.5 }),
                  // grid of compartments
                  [0, 1, 2, 3].map(function(c) {
                    return h('g', { key: 'gC' + c },
                      h('line', { x1: 32 + c * 10.5, y1: 34, x2: 32 + c * 10.5, y2: 72, stroke: T.dim, strokeWidth: 0.3 }),
                      h('line', { x1: 32 + c * 10.5, y1: 76, x2: 32 + c * 10.5, y2: 116, stroke: T.dim, strokeWidth: 0.3 })
                    );
                  }),
                  [0, 1, 2].map(function(r) {
                    return h('g', { key: 'gR' + r },
                      h('line', { x1: 32, y1: 44 + r * 9, x2: 74, y2: 44 + r * 9, stroke: T.dim, strokeWidth: 0.3 }),
                      h('line', { x1: 32, y1: 86 + r * 10, x2: 74, y2: 86 + r * 10, stroke: T.dim, strokeWidth: 0.3 })
                    );
                  }),
                  h('text', { x: 53, y: 130, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'Type cases'),
                  h('text', { x: 53, y: 142, textAnchor: 'middle', fontSize: 8, fill: T.dim, fontFamily: 'Georgia, serif' }, '(upper / lower)'),
                  // Compositor's stand next to cases
                  h('rect', { x: 88, y: 50, width: 30, height: 36, fill: '#3a2a1a', stroke: T.accent, strokeWidth: 1, rx: 2 }),
                  h('rect', { x: 91, y: 55, width: 24, height: 5, fill: T.parchment, stroke: T.wood, strokeWidth: 0.4 }),
                  h('text', { x: 103, y: 78, textAnchor: 'middle', fontSize: 8, fill: T.accentHi }, '✍️'),
                  h('text', { x: 103, y: 98, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'Compositor'),
                  // ─── The press itself (center) ───
                  h('g', { transform: 'translate(180, 110)' },
                    // Frame
                    h('rect', { x: -28, y: -30, width: 56, height: 70, fill: T.wood, stroke: T.accent, strokeWidth: 2 }),
                    h('rect', { x: -24, y: -26, width: 48, height: 60, fill: 'none', stroke: T.accentHi, strokeWidth: 0.6 }),
                    // Bed
                    h('rect', { x: -18, y: -5, width: 36, height: 16, fill: '#1a1410', stroke: T.dim, strokeWidth: 0.6 }),
                    // Screw mechanism (top)
                    h('circle', { cx: 0, cy: -22, r: 5, fill: T.accent, stroke: T.accentHi, strokeWidth: 1 }),
                    // Bar (lever) sticking out
                    h('line', { x1: 0, y1: -22, x2: 38, y2: -34, stroke: T.accent, strokeWidth: 3, strokeLinecap: 'round' }),
                    h('circle', { cx: 38, cy: -34, r: 3, fill: T.accentHi }),
                    // Pressman icon
                    h('text', { x: 0, y: 56, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'The press'),
                    h('text', { x: 0, y: 68, textAnchor: 'middle', fontSize: 9, fill: T.warn }, '💪 pressman + apprentice')
                  ),
                  // ─── Ink table (right of press) ───
                  h('rect', { x: 250, y: 110, width: 50, height: 30, fill: '#3a2a1a', stroke: T.accent, strokeWidth: 1, rx: 2 }),
                  h('circle', { cx: 263, cy: 125, r: 5, fill: '#0a0805', stroke: T.dim, strokeWidth: 0.5 }),
                  h('circle', { cx: 277, cy: 125, r: 5, fill: '#0a0805', stroke: T.dim, strokeWidth: 0.5 }),
                  h('circle', { cx: 290, cy: 125, r: 4, fill: '#a87a3a', stroke: T.dim, strokeWidth: 0.5 }),
                  h('text', { x: 275, y: 152, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'Ink table'),
                  // ─── Drying lines along back wall ───
                  h('line', { x1: 30, y1: 175, x2: 240, y2: 175, stroke: T.parchment, strokeWidth: 1.5 }),
                  [50, 90, 130, 170, 210].map(function(x, i) {
                    return h('g', { key: 'sheet' + i, transform: 'translate(' + x + ', 175)' },
                      h('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: T.dim, strokeWidth: 0.6 }),
                      h('rect', { x: -8, y: 4, width: 16, height: 22, fill: T.parchment, stroke: T.wood, strokeWidth: 0.6 }),
                      h('line', { x1: -6, y1: 9, x2: 6, y2: 9, stroke: T.ink, strokeWidth: 0.4, opacity: 0.6 }),
                      h('line', { x1: -6, y1: 13, x2: 6, y2: 13, stroke: T.ink, strokeWidth: 0.4, opacity: 0.6 }),
                      h('line', { x1: -6, y1: 17, x2: 6, y2: 17, stroke: T.ink, strokeWidth: 0.4, opacity: 0.6 })
                    );
                  }),
                  h('text', { x: 135, y: 215, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'Drying lines'),
                  h('text', { x: 135, y: 226, textAnchor: 'middle', fontSize: 8, fill: T.dim, fontFamily: 'Georgia, serif' }, '(printed sheets hang to dry, hours to a day)'),
                  // ─── Stockroom (back-right) ───
                  h('rect', { x: 280, y: 175, width: 110, height: 60, fill: '#3a2a1a', stroke: T.accent, strokeWidth: 1, rx: 2 }),
                  // Stack of paper / books
                  [0, 1, 2, 3].map(function(b) {
                    return h('rect', { key: 'stk' + b,
                      x: 290 + b * 6, y: 200 - b * 3, width: 10, height: 22, fill: T.parchment, stroke: T.wood, strokeWidth: 0.5 });
                  }),
                  [0, 1, 2, 3].map(function(b) {
                    return h('rect', { key: 'stk2' + b,
                      x: 340 + b * 6, y: 200 - b * 3, width: 10, height: 22, fill: T.parchment, stroke: T.wood, strokeWidth: 0.5 });
                  }),
                  h('text', { x: 335, y: 250, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'Paper + finished sheets'),
                  // ─── Apprentice path (dotted line connecting everywhere) ───
                  h('path', { d: 'M 100 80 Q 140 100 180 110 Q 220 130 270 125 Q 280 160 135 195 Q 110 200 100 80', fill: 'none', stroke: T.accentHi, strokeWidth: 0.6, strokeDasharray: '2 3', opacity: 0.5 }),
                  // Apprentice icon (mid-floor)
                  h('text', { x: 220, y: 245, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: T.accentHi, fontFamily: 'Georgia, serif' }, 'apprentice paths'),
                  h('text', { x: 220, y: 256, textAnchor: 'middle', fontSize: 10, fill: T.warn }, '🧒 · · ·')
                )
              ),
              // Legend strip
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 12 } },
                [
                  { who: 'Apprentice', emoji: '🧒', where: 'Everywhere. Fetches ink, sweeps, runs errands, watches.' },
                  { who: 'Compositor', emoji: '✍️', where: 'At the type cases by the window. Sets type one sort at a time.' },
                  { who: 'Pressman', emoji: '💪', where: 'At the press in the center bay. Pulls the bar; manages registration.' },
                  { who: 'Master', emoji: '👨‍💼', where: 'At the front desk. Greets customers; keeps the ledger; takes the risk.' }
                ].map(function(r, i) {
                  return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 6, padding: 8 } },
                    h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, r.emoji),
                      h('strong', { style: { fontSize: 12, color: T.accentHi, fontFamily: 'Georgia, serif' } }, r.who)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, r.where)
                  );
                })
              )
            ),

            // ── 1455 print-shop day clock SVG ──
            // Circular 12-hour clock showing how a working day was
            // structured. Pairs with the floor plan (spatial anchor) for
            // a temporal anchor. Hours labeled around the rim; activities
            // and role icons positioned at the relevant times.
            sectionHeader('🕰️', 'A day on the clock: 1455 shop hours'),
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
              'A working day in a 1455 print shop ran roughly dawn to dusk, with the highest-skill work in the bright morning hours when daylight made composing and casting easier. The diagram below tracks a representative day.'),
            h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14, display: 'grid', gridTemplateColumns: 'minmax(0, 240px) 1fr', gap: 18, alignItems: 'center' } },
              // Left: the circular clock
              h('div', { style: { display: 'flex', justifyContent: 'center' } },
                h('svg', { viewBox: '0 0 240 240', width: '100%', style: { maxWidth: 220 }, role: 'img', 'aria-label': 'Circular diagram of a 1455 print-shop working day' },
                  // Outer ring
                  h('circle', { cx: 120, cy: 120, r: 100, fill: T.cardAlt, stroke: T.wood, strokeWidth: 4 }),
                  h('circle', { cx: 120, cy: 120, r: 100, fill: 'none', stroke: T.accent, strokeWidth: 1 }),
                  // Inner core (clock face)
                  h('circle', { cx: 120, cy: 120, r: 86, fill: T.parchment, stroke: T.accent, strokeWidth: 1 }),
                  // Hour-tick marks every 30 degrees (12 hours, but we'll mark dawn=0 / noon=180 etc.)
                  // Render 12 ticks
                  Array.apply(null, { length: 12 }).map(function(_, i) {
                    var angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
                    var x1 = 120 + Math.cos(angle) * 86;
                    var y1 = 120 + Math.sin(angle) * 86;
                    var x2 = 120 + Math.cos(angle) * 80;
                    var y2 = 120 + Math.sin(angle) * 80;
                    return h('line', { key: i, x1: x1, y1: y1, x2: x2, y2: y2, stroke: T.wood, strokeWidth: 1 });
                  }),
                  // Hour labels at cardinal points
                  h('text', { x: 120, y: 28, textAnchor: 'middle', fontSize: 10, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#7c2d12' }, 'DAWN'),
                  h('text', { x: 220, y: 124, textAnchor: 'end', fontSize: 10, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#7c2d12' }, 'NOON'),
                  h('text', { x: 120, y: 220, textAnchor: 'middle', fontSize: 10, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#7c2d12' }, 'DUSK'),
                  h('text', { x: 20, y: 124, textAnchor: 'start', fontSize: 10, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#7c2d12' }, 'NIGHT'),
                  // Activity sectors — color-coded ring segments per phase
                  // Dawn–8am: prep (apprentice fetches, fire lit)
                  h('path', { d: 'M 120 120 L 120 20 A 100 100 0 0 1 170.9 33.4 Z', fill: '#a87a3a', opacity: 0.5 }),
                  // 8am–noon: composing + casting (compositor + caster, bright daylight)
                  h('path', { d: 'M 120 120 L 170.9 33.4 A 100 100 0 0 1 220 120 Z', fill: T.accent, opacity: 0.45 }),
                  // Noon–4pm: pressing (pressman + apprentice)
                  h('path', { d: 'M 120 120 L 220 120 A 100 100 0 0 1 170.9 206.6 Z', fill: T.danger, opacity: 0.4 }),
                  // 4pm–dusk: distribution + drying (apprentice)
                  h('path', { d: 'M 120 120 L 170.9 206.6 A 100 100 0 0 1 69.1 206.6 Z', fill: T.ok, opacity: 0.35 }),
                  // Dusk–night: cleanup + ledger (master)
                  h('path', { d: 'M 120 120 L 69.1 206.6 A 100 100 0 0 1 20 120 Z', fill: T.wood, opacity: 0.45 }),
                  // Night: silent (no activity)
                  h('path', { d: 'M 120 120 L 20 120 A 100 100 0 0 1 120 20 Z', fill: '#0a0805', opacity: 0.55 }),
                  // Re-draw center for clean labels
                  h('circle', { cx: 120, cy: 120, r: 30, fill: T.parchment, stroke: T.accent, strokeWidth: 1.5 }),
                  h('text', { x: 120, y: 117, textAnchor: 'middle', fontSize: 9, fontFamily: 'Georgia, serif', fontWeight: 700, fill: '#7c2d12' }, '1455'),
                  h('text', { x: 120, y: 130, textAnchor: 'middle', fontSize: 8, fontFamily: 'Georgia, serif', fontStyle: 'italic', fill: '#7c2d12' }, 'shop day')
                )
              ),
              // Right: phase descriptions
              h('div', null,
                [
                  { hour: 'Dawn → 8 am', who: '🧒 Apprentice', what: 'Sweeps the shop. Lights the fire. Fetches ink and paper from storage. Wakes the journeymen if they overslept. The shop comes alive.', color: '#a87a3a' },
                  { hour: '8 am → noon', who: '✍️ Compositor + caster', what: 'The bright hours. Composing tiny mirror-reversed sorts and casting new type require daylight. The most skilled, eye-straining work is done here.', color: T.accent },
                  { hour: 'Noon → 4 pm', who: '💪 Pressman + apprentice', what: 'Heavy work, two-person team. Bar-pulling, paper-flipping, ink-dabbing on rhythm. Roughly 250 impressions across the afternoon.', color: T.danger },
                  { hour: '4 pm → dusk', who: '🧒 Apprentice', what: 'Hangs printed sheets to dry. Distributes worn type back into the case. Returns the press to a rest state. The shop quiets.', color: T.ok },
                  { hour: 'Dusk → night', who: '👨‍💼 Master', what: 'Light fading. Master reviews ledger, plans tomorrow\'s work, talks to suppliers, decides commissions. The journeymen go home or to the tavern.', color: T.wood },
                  { hour: 'Night', who: '— silent —', what: 'No work. Candles in 1455 were expensive, and the eye-precision work of composing was impossible by candlelight. The shop slept until dawn.', color: '#0a0805' }
                ].map(function(phase, i) {
                  return h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, paddingLeft: 6, borderLeft: '3px solid ' + phase.color } },
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 11, color: phase.color === '#0a0805' ? T.muted : T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700, marginBottom: 2 } },
                        phase.hour),
                      h('div', { style: { fontSize: 11, color: T.warn, fontStyle: 'italic', marginBottom: 3 } }, phase.who),
                      h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, phase.what)
                    )
                  );
                })
              )
            ),
            h('p', { style: { margin: '-4px 0 14px', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Daylight was the constraint that shaped the day. Bright-hour activities (composing, casting) got the morning; lower-precision work (pressing, drying, hauling) got the afternoon. This pattern stayed roughly the same in print shops for 400 years, until gas lighting (1820s) and then electric (1880s) freed the workday from the sun.'),

            // ── Primary-source reading: apprenticeship contract excerpt ──
            // Composite text drawn from documented 1450-1500 European
            // apprenticeship contracts in city archives (Frankfurt, Cologne,
            // Lyon). Modernized into readable English; archaic terms
            // annotated in the right column.
            sectionHeader('📜', 'A real apprentice contract (excerpt)'),
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
              'Apprenticeship was a legal contract, not a handshake. The text below is a composite drawn from documented 1450-1500 European print-shop apprenticeship contracts (city archives in Frankfurt, Cologne, and Lyon). Names and a few terms are normalized for readability. Annotations on the right explain the period vocabulary.'),
            h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
              h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 1fr', gap: 18 } },
                // Left: the document
                h('div', { style: { background: T.parchment, color: T.ink, border: '2px solid ' + T.wood, borderRadius: 6, padding: 18, fontFamily: 'Georgia, serif', boxShadow: '0 1px 3px rgba(0,0,0,0.3) inset' } },
                  h('div', { style: { textAlign: 'center', fontSize: 11, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 } }, 'Mainz · the year of Our Lord 1457'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.7 } },
                    'On this day before God and witnesses, ',
                    h('strong', null, 'Master Heinrich the printer'),
                    ', householder of this city, has taken into his service ',
                    h('strong', null, 'Konrad, son of Wilhelm the cooper'),
                    ', a youth of twelve years, to be his apprentice in the art and ',
                    h('strong', null, 'mystery'),
                    ' of printing, for a term of ',
                    h('strong', null, 'seven full years'),
                    ' from this day.'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.7 } },
                    h('em', null, 'The Master agrees:'),
                    ' to instruct the apprentice in casting type, setting type, the working of the press, the mixing of ink, and the keeping of a shop. To furnish ',
                    h('strong', null, 'meat and drink, lodging and washing'),
                    ', and at the end of the term one new suit of clothes ',
                    h('strong', null, 'fit for a journeyman'),
                    '. To deal with the apprentice in good faith and not to put him to work beneath the trade.'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.7 } },
                    h('em', null, 'The apprentice agrees:'),
                    ' to serve faithfully day and night, to keep the secrets of the trade and not reveal them to any rival shop, to ',
                    h('strong', null, 'shun taverns and play'),
                    ', to take no wife during the term, to obey the Master and his household in all lawful things, and not to absent himself from service without leave.'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.7 } },
                    h('em', null, 'If the apprentice runs away'),
                    ' or breaks this contract, he shall serve double the time absent on his return, and forfeit the clothes promised at the end of the term. If he reveals the trade\'s secrets, he forfeits all and may be pursued at law.'),
                  h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.7 } },
                    h('em', null, 'Sworn'),
                    ' by Master Heinrich, by Wilhelm the cooper (the apprentice\'s father, acting for him), and by ',
                    h('strong', null, 'two witnesses of the guild'),
                    ', and entered into the city book by the clerk this day.'),
                  // Period signature flourish
                  h('div', { style: { borderTop: '1px dashed ' + T.wood, paddingTop: 8, marginTop: 6, fontSize: 11, color: '#5c4630', textAlign: 'right', fontStyle: 'italic' } },
                    '— Sealed with the Master\'s mark · witnessed by the Guild of Printers, Mainz')
                ),
                // Right: vocabulary annotations
                h('div', null,
                  h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 10, fontFamily: 'Georgia, serif' } }, 'Period vocabulary'),
                  [
                    { term: 'mystery', meaning: 'In a guild context, the "secrets of the trade" — recipes, techniques, and know-how that gave a shop its competitive advantage. Same Latin root as "mystery cult."' },
                    { term: 'seven full years', meaning: 'Standard apprenticeship term across European craft guilds for centuries. After 7 years the apprentice became a journeyman (free to work for wages); after several more years and a "masterpiece," a master.' },
                    { term: 'meat and drink, lodging and washing', meaning: 'Room, board, and laundry. The apprentice was paid only in these benefits during the term, plus training and the journeyman\'s suit at the end.' },
                    { term: 'fit for a journeyman', meaning: 'Quality clothing that would let the apprentice present himself to other shops as a qualified hire. The suit was the literal credential.' },
                    { term: 'shun taverns and play', meaning: 'Avoid drinking and gambling. Common clause: shops did not want their apprentices in compromising places that could harm the shop\'s reputation or the apprentice\'s availability.' },
                    { term: 'witnesses of the guild', meaning: 'Two senior guild members who signed as legal witnesses. The contract was enforceable in city court; the guild also enforced its own discipline.' }
                  ].map(function(v, i) {
                    return h('div', { key: i, style: { background: T.cardAlt, borderLeft: '3px solid ' + T.accent, borderRadius: 4, padding: 8, marginBottom: 8 } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 3 } }, v.term),
                      h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, v.meaning)
                    );
                  })
                )
              ),
              h('p', { style: { margin: '14px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
                'Discussion: Modern internships and trade apprenticeships still inherit pieces of this structure — the term-of-service, the credential at the end, the implicit "no moonlighting." What stays the same; what has changed; what should change?')
            ),

            // ── Letter from a 1455 apprentice ──
            // Composite text drawn from real surviving apprentice letters
            // of the 1500s found in family archives across Europe (Frankfurt,
            // Antwerp, Nuremberg). The contract is the legal voice; this is
            // the human voice from inside the shop.
            sectionHeader('✉️', 'A letter home from a 1455 apprentice'),
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } },
              'A composite letter drawn from surviving 1500s apprentice letters in family archives. The legal contract above is the official voice; this is the apprentice\'s own.'),
            h('div', { style: { background: T.parchment, color: T.ink, border: '2px solid ' + T.wood, borderRadius: 8, padding: 22, marginBottom: 14, fontFamily: 'Georgia, serif', boxShadow: '0 2px 6px rgba(0,0,0,0.4) inset' } },
              h('div', { style: { textAlign: 'right', fontSize: 11, color: '#7c2d12', fontStyle: 'italic', marginBottom: 14 } },
                'Mainz, the Feast of St. Lawrence, 1455'),
              h('p', { style: { margin: '0 0 12px', fontSize: 14, lineHeight: 1.7, color: '#3a2a1a' } },
                'My dearest mother,'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.75, color: '#3a2a1a', textIndent: 24 } },
                'I write to you in my own hand, which the Master says shows promise, though my fingers still ache from the cold of the morning. The shop is busy with the Bible. I have not seen any of the printed pages up close; the apprentices are not yet trusted to touch them. But I see them stacked under cloth in the back room. There must be thousands. The Master\'s shop has more books in it now than any cathedral library I have ever heard of.'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.75, color: '#3a2a1a', textIndent: 24 } },
                'My duties are sweeping the shop, fetching ink from the cellar, carrying lead pigs to the casting room (they weigh as much as a small calf), and watching the journeymen at their work. The compositor, Master Konrad, has begun to let me sort distributed type back into the case. I am slow. He laughs but not unkindly. He says the slow apprentice becomes the careful master.'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.75, color: '#3a2a1a', textIndent: 24 } },
                'The food is plain but enough. The Master\'s wife sees that I have bread and broth in the morning and meat at supper. I sleep on a straw mattress with the other apprentice in the loft above the press room. He is from Cologne and snores like a stuck pig.'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.75, color: '#3a2a1a', textIndent: 24 } },
                'Today I dropped a tray. Not the type, thank God, but the wooden tray underneath it. The journeyman pressman did not see, and Master Konrad pretended not to. I will be more careful. The trade is full of dangers I had not thought of when we spoke before I left home: the lead, the boiling oil for the ink, the heavy quoins that can crush a finger. Already I have a small burn on my left hand from the casting room. It is healing.'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.75, color: '#3a2a1a', textIndent: 24 } },
                'Mother, when the work is done at night and the press is quiet, I sometimes go look at the locked-up forme on the imposing stone. The letters are backwards, of course, and at first they made my head ache. But last week I read a full line by myself, reversed and all, and I thought of you and of how I will some day set a page that you could read. I will be a journeyman in six years and a master in ten, the Lord willing. I will print a Bible of my own. You will be proud.'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.75, color: '#3a2a1a', textIndent: 24 } },
                'Pray for me. Give my love to my sisters. Tell Father I am well, and I will write again at Christmas.'),
              h('div', { style: { textAlign: 'right', marginTop: 16, fontSize: 13, lineHeight: 1.6, color: '#3a2a1a', fontStyle: 'italic' } },
                'Your obedient and loving son,',
                h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, marginTop: 4, fontStyle: 'normal' } }, 'Konrad'),
                h('div', { style: { fontSize: 11, color: '#5c4630' } }, 'Apprentice in the shop of Master Heinrich the printer, Mainz')
              )
            ),
            h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 10, padding: 12, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' } }, 'Reading discussion'),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
                h('li', null, 'What does Konrad reveal about apprenticeship that the contract did not? Where do the two documents agree; where do they differ in tone?'),
                h('li', null, 'Konrad describes a "small burn" and dropping a tray. How does he treat these incidents? What does that say about workplace norms?'),
                h('li', null, 'The closing two paragraphs shift from work to home. What does Konrad seem to want most from his mother\'s reply, and how is that different from what an apprentice in 2026 might want from a parent?'),
                h('li', null, 'Konrad describes reading a full line of mirror-reversed type as a milestone. In a 2026 trade apprenticeship (electrical, plumbing, etc.), what would the equivalent "I did the hard thing once" milestone be?')
              )
            ),

            calloutBox('info', 'Pure role-play',
              'Each role makes 4 decisions across a working day. After each choice you see the consequence. At the end you get a summary of what kind of printer you turned out to be. Pick any role; try multiple if you have time. The point is to inhabit the constraints, not to "win."')
          ),

          // ── Decision screen ──
          role && !isDone && currentDecision && h('div', null,
            // Role + progress header
            h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 26 } }, roleObj.icon),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 14, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, roleObj.label),
                h('div', { style: { fontSize: 11, color: T.dim, marginTop: 2 } }, 'Decision ' + (step + 1) + ' of ' + allDecisions.length + ' · ' + currentDecision.time)
              ),
              h('button', { className: 'printingpress-no-print',
                onClick: function() { if (typeof window !== 'undefined' && window.confirm && !window.confirm('Restart? You will lose your current progress.')) return; restart(); },
                style: btn({ padding: '4px 10px', fontSize: 11 }) }, 'Restart')
            ),
            // Progress bar
            h('div', { style: { width: '100%', height: 6, background: T.cardAlt, borderRadius: 3, overflow: 'hidden', border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { width: ((step / allDecisions.length) * 100) + '%', height: '100%', background: T.accent, transition: 'width 0.3s ease' } })),
            // Decision prompt
            h('div', { style: { background: T.card, border: '2px solid ' + T.accent, borderRadius: 12, padding: 18, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8 } }, currentDecision.time),
              h('p', { style: { margin: 0, fontSize: 14, color: T.text, lineHeight: 1.65, fontFamily: 'Georgia, serif' } }, currentDecision.prompt)
            ),
            // Choices OR feedback
            !feedback && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              currentDecision.choices.map(function(c, ci) {
                return h('button', { key: c.id,
                  onClick: function() { pickChoice(c); },
                  style: btn({
                    padding: 14, fontSize: 13, lineHeight: 1.5,
                    textAlign: 'left', background: T.card, borderColor: T.border
                  })
                },
                  h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start' } },
                    h('span', { 'aria-hidden': 'true', style: { color: T.accent, fontWeight: 700, fontSize: 14, flexShrink: 0 } }, ['A.', 'B.', 'C.', 'D.'][ci]),
                    h('span', { style: { color: T.text } }, c.text)
                  )
                );
              })
            ),
            feedback && h('div', { style: { background: T.cardAlt, border: '1px solid ' + T.ok, borderRadius: 10, padding: 16, marginTop: 12 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: T.ok, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, 'Consequence'),
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.text, lineHeight: 1.65 } }, feedback.outcome),
              h('button', { className: 'printingpress-no-print',
                onClick: nextStep,
                style: btnPrimary({ padding: '10px 18px', fontSize: 14 }) },
                step + 1 < allDecisions.length ? 'Next decision →' : 'See your day →')
            )
          ),

          // ── End-of-day summary ──
          role && isDone && h('div', null,
            h('div', { style: { background: T.parchment, color: T.ink, border: '3px solid ' + T.accent, borderRadius: 14, padding: 24, textAlign: 'center', marginBottom: 14, position: 'relative' } },
              h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, left: 12, color: T.accent } }, fleuron(14)),
              h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, right: 12, color: T.accent } }, fleuron(14)),
              h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, left: 12, color: T.accent } }, fleuron(14)),
              h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, right: 12, color: T.accent } }, fleuron(14)),
              h('div', { style: { fontSize: 48, marginBottom: 6 } }, roleObj.icon),
              h('h2', { style: { margin: '0 0 4px', fontSize: 22, color: '#7c2d12', fontFamily: 'Georgia, serif', fontWeight: 800 } }, 'End of day'),
              h('p', { style: { margin: 0, fontSize: 13, color: '#5c4630', fontStyle: 'italic' } }, 'You worked as a ' + roleObj.label + '. Here is what your day looked like:')
            ),
            h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
              choices.map(function(c, i) {
                var d = allDecisions[c.stepIdx];
                return h('div', { key: i, style: { paddingBottom: 12, marginBottom: 12, borderBottom: i === choices.length - 1 ? 'none' : '1px dashed ' + T.border } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } }, d.time),
                  h('div', { style: { fontSize: 13, color: T.text, marginBottom: 4 } }, h('strong', null, 'You chose: '), c.choice.text),
                  h('div', { style: { fontSize: 12, color: T.muted, fontStyle: 'italic', lineHeight: 1.55 } }, c.choice.outcome)
                );
              })
            ),
            calloutBox('info', 'Why this matters',
              'No single right answer means you had to weigh tradeoffs the way a 1455 printer actually did: quality vs speed, loyalty vs honesty, risk vs reward, autonomy vs scale. The historical record is not made of heroes choosing the obvious good. It is made of people like the ones you just inhabited, making real decisions under real constraints.'),
            // ── Modern echoes of your role ──
            // For each 1450 role, surface 2026 careers that share the
            // same fundamental work. Maine-relevant where possible so the
            // career-exploration thread lands locally.
            (function() {
              var ECHOES = {
                apprentice: {
                  intro: 'Year-one apprentice work \u2014 observation, scut work, building trust through small reliable acts \u2014 is still how a lot of skilled-trade pathways begin.',
                  items: [
                    { title: 'Skilled-trade apprentice', maine: 'Electrician, plumber, welder, HVAC \u2014 EMCC, KVCC, Maine IBEW',
                      note: 'Same model: low pay early, learn by watching, certify out in 4\u20136 years. Maine has thousands of openings and not enough hands.' },
                    { title: 'Kitchen prep cook', maine: 'Any Portland restaurant',
                      note: 'Start at prep station, observe sous-chefs, advance through skill. Same apprenticeship structure with a faster ladder.' },
                    { title: 'Lab or shop intern', maine: 'Bath Iron Works co-op, Idexx intern, Jackson Lab',
                      note: 'Junior role on a real team. The senior staff are your masters; the work is real but supervised.' }
                  ]
                },
                compositor: {
                  intro: 'A compositor combined craft (mirror-reading, fine motor work) with aesthetics (layout, spacing, type choice). That blend is still its own family of careers.',
                  items: [
                    { title: 'Graphic designer / typographer', maine: 'Most Portland design studios',
                      note: 'Direct lineage. Same job, software replaces metal. Type pairings, kerning, grid layout all descend from 1450 composing practice.' },
                    { title: 'Front-end web developer', maine: 'Portland tech scene (Tilson, Wex, kotonik)',
                      note: 'CSS grid, line-height, em/rem units, kerning \u2014 the vocabulary of layout is literally compositor vocabulary.' },
                    { title: 'Book designer', maine: 'Tilbury House, Down East Books, Islandport',
                      note: 'The most direct heir of the compositor\u2019s craft. Chooses typefaces, sets margins, plans the page. Working Maine publishers still hire for this.' }
                  ]
                },
                pressman: {
                  intro: 'A pressman ran a heavy, dangerous machine that demanded both strength and a finicky sense for registration, ink flow, and material behavior. That cluster lives in modern manufacturing.',
                  items: [
                    { title: 'Industrial press operator', maine: 'J.S. McCarthy Printers (Augusta), Penmor (Lewiston)',
                      note: 'The literal heir. Bigger, faster machines; same job description: feed material, hold registration, manage wear, hit the schedule.' },
                    { title: 'CNC machinist', maine: 'Pratt & Whitney North Berwick, Bath Iron Works',
                      note: 'Skilled-machine operator. Read prints, run programs, hold tolerances, change tooling. Top earners in Maine\u2019s manufacturing sector.' },
                    { title: '3D-printer / additive manufacturing technician', maine: 'Maine MEP, UMaine ASCC',
                      note: 'Newer machine, same role: load material, monitor a run, troubleshoot defects, calibrate. The pressman\u2019s skill cluster on 21st-century hardware.' }
                  ]
                },
                master: {
                  intro: 'A master printer balanced risk \u2014 which commissions to accept, when to hire, when to refuse the dangerous job. That is the small-business decision space, then and now.',
                  items: [
                    { title: 'Small business owner', maine: 'Any of the ~140,000 small businesses in Maine',
                      note: 'Same tradeoffs at smaller scale: who to trust, what jobs to accept, when to invest, when to say no. The most common business form in the state.' },
                    { title: 'Publisher or editor-in-chief', maine: 'Portland Press Herald, Maine Public, Down East',
                      note: 'Direct lineage. Decides what gets printed (or aired), takes the legal and reputational risk, hires the talent, sells the audience.' },
                    { title: 'Studio or production manager', maine: 'Any creative agency, film production, theater',
                      note: 'Strategic decisions \u2014 which projects to take, which to decline, how to deploy a team of specialists. The master\u2019s job in modern dress.' }
                  ]
                }
              };
              var echo = ECHOES[role];
              if (!echo) return null;
              return h('div', { style: { background: T.card, border: '1px solid ' + T.accent, borderRadius: 12, padding: 16, marginBottom: 14 } },
                h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } },
                  '\u{1F517} Modern echoes of your role'),
                h('p', { style: { margin: '0 0 14px', fontSize: 12, color: T.muted, lineHeight: 1.55 } }, echo.intro),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                  echo.items.map(function(it, i) {
                    return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.accent, borderRadius: 6, padding: 12 } },
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Georgia, serif', marginBottom: 4 } }, it.title),
                      h('div', { style: { fontSize: 10, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 6 } }, '\u{1F4CD} Maine: ' + it.maine),
                      h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } }, it.note)
                    );
                  })
                ),
                h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
                  'You inhabited a 1450 role for a few minutes. The skills cluster you just practiced \u2014 the patience, the craft, the judgment under pressure \u2014 is still recruited for. Maine in 2026 has openings in every column above.')
              );
            })(),
            h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
              h('button', { onClick: restart, style: btnPrimary({ padding: '10px 16px', fontSize: 13 }) }, '🔄 Try a different role'),
              h('button', { onClick: function() { upd('view', 'menu'); }, style: btn({ padding: '10px 16px', fontSize: 13 }) }, '← Back to menu')
            )
          ),

          h(TeacherNotes, TEACHER_NOTES.dayInShop),
          crossLinkFooter('dayInShop'),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // CUMULATIVE QUIZ — 15 questions across all 10 modules
      // ═════════════════════════════════════════════════════════════════════
      var CUMULATIVE_QUESTIONS = [
        { module: 'pressMechanism', q: 'The screw press achieves its mechanical advantage through:', opts: ['A complicated system of gears', 'A wrapped inclined plane (the screw thread); MA = 2π × bar length ÷ thread pitch, often 100:1 or more', 'Pure muscle power', 'Hydraulic pressure'], ans: 1, explain: 'A screw is mathematically an inclined plane wrapped around a cylinder. Mechanical advantage scales with bar length and inversely with thread pitch — a Gutenberg-era press could turn 30 lb of arm pull into hundreds of pounds of platen force.' },
        { module: 'pressMechanism', q: 'About how many impressions per day did a two-person crew on a Gutenberg-era press produce?', opts: ['About 50', 'About 250', 'About 5,000', 'About 50,000'], ans: 1, explain: 'About 250 impressions per day. The 19th-century mechanical press jumped this to thousands per hour, and the 20th-century web press to hundreds of thousands per hour.' },
        { module: 'setType', q: 'Why is metal type mirror-reversed?', opts: ['Aesthetic tradition', 'When type presses against paper, left and right swap; mirror type prints as readable letters', 'It is not — that is a myth', 'To save space'], ans: 1, explain: 'When type presses against paper, the impression flips. So the type itself has to be a mirror image of the printed letter.' },
        { module: 'setType', q: 'The terms "uppercase" and "lowercase" come from:', opts: ['Software conventions', 'Physical wooden type cases — capitals lived in the upper case, minuscules in the lower (more accessible) case', 'Latin tradition', 'A typesetter named Uppercase'], ans: 1, explain: 'Literal physical position. Compositors stood in front of two cases, lower (more frequent letters in easier reach) and upper (capitals).' },
        { module: 'castingType', q: 'What does antimony contribute to type metal?', opts: ['Color', 'Antimony expands slightly as it solidifies, counteracting the shrinkage of lead and tin so cast type comes out the right size with crisp detail', 'Lower melting point', 'Magnetism'], ans: 1, explain: 'Antimony is one of very few metals that expands on solidification. Without it, the lead-tin alloy would shrink as it cooled, producing undersized type with poor edge detail.' },
        { module: 'castingType', q: 'Why was metal movable type a Western breakthrough rather than a Korean one (despite Korea casting metal type 78 years before Gutenberg)?', opts: ['Korea did not work metal', 'The economics — the Western alphabet has ~250 distinct glyphs, while Chinese characters used in Korea number in the thousands; punch-matrix-cast was uneconomic at that scale', 'Religion', 'Random chance'], ans: 1, explain: 'Korean movable metal type existed (the Jikji, 1377). But scaling it to a writing system with thousands of characters was uneconomic, so it never displaced wood-block printing the way Gutenberg displaced manuscripts.' },
        { module: 'economics', q: 'About what was the break-even point (in copies) for printing vs hand-copying in the early Gutenberg era?', opts: ['10 copies', '50 to 100 copies', '1,000 copies', '10,000 copies'], ans: 1, explain: 'Around 50-100 copies. Below that, hand-copying was still competitive. This drove early printers to focus on bestsellers — Bibles, breviaries, classical texts.' },
        { module: 'economics', q: 'Roughly how much did the cost of a book fall in real terms between 1450 and 1600?', opts: ['Halved', 'Roughly 100-fold', 'Roughly 1,000-fold or more', 'No change'], ans: 2, explain: 'Roughly 1,000-fold or more in real terms. From years\' wages for a hand-copied Bible to a working week\'s wages for a printed book. This collapse is the economic prerequisite for the Reformation and the scientific revolution.' },
        { module: 'beforeAfter', q: 'Why did the Reformation succeed where earlier reform movements (Wycliffe, Hus) failed?', opts: ['Luther was more persuasive', 'Print spread the message faster than authorities could suppress it', 'The Catholic Church was weaker', 'Random chance'], ans: 1, explain: 'Wycliffe and Hus made very similar theological arguments a century earlier in manuscript culture and were locally suppressed. Print made suppression impossible — by the time authorities reacted, the message was already in dozens of cities.' },
        { module: 'typographyToday', q: 'The term "leading" (line spacing) comes from:', opts: ['The lead actor', 'Strips of LEAD inserted between lines of metal type to add vertical spacing', 'Leading the eye', 'Lead-in copy'], ans: 1, explain: 'Lead strips of varying thickness physically inserted between rows of type. CSS line-height is the digital descendant.' },
        { module: 'people', q: 'Who sued Gutenberg, won, and ended up with most of the printing equipment?', opts: ['Schöffer', 'Johann Fust (his financier)', 'The Catholic Church', 'A rival printer'], ans: 1, explain: 'Fust lent Gutenberg the capital and sued when Gutenberg could not repay on schedule. Subsequent books bore Fust and Schöffer\'s names, not Gutenberg\'s.' },
        { module: 'broadside', q: 'About how many copies of Thomas Paine\'s "Common Sense" sold in the American colonies in 1776?', opts: ['About 1,000', 'About 10,000', 'About 150,000', 'About 1 million'], ans: 2, explain: '~150,000 copies in a colonial population of ~2.5 million. Per capita, one of the best-selling political pamphlets in American history. The Revolution was a print event as much as a military one.' },
        { module: 'sameFears', q: 'The honest reading of 1450 critics worried about the printing press is:', opts: ['They were silly and obviously wrong about everything', 'They were prophets and obviously right about everything', 'They were partly right (print did cause religious violence, mass propaganda, information overload) and partly wrong (memory did not collapse, the social order did not end); the response was institutional development, not banning print', 'They did not really exist'], ans: 2, explain: 'Partial validity is the honest historical reading. The grown-up response was institutional (editorial standards, copyright, peer review, libraries) rather than prohibitionist. This is probably also the right frame for evaluating modern critics of the internet and AI — some concerns are real, some are panic, and institutional development is usually the productive path forward.' },
        { module: 'dayInShop', q: 'In a 1455 Mainz print shop, what was a master printer\'s primary concern that the apprentice, compositor, and pressman did NOT directly bear?', opts: ['The strength to pull the bar', 'The skill to read mirror-reversed type', 'The financial and reputational risk: which jobs to accept, when to invest, when to refuse risky work (heretical pamphlets, etc.)', 'The ability to mix ink'], ans: 2, explain: 'The master made the business and risk decisions: which commissions to accept (Bible vs almanac vs heretical pamphlet), when to invest in new type, when to merge or stay independent. The technical roles handled craft execution; the master handled the strategic uncertainty.' },
        { module: 'beforeAfter', q: 'Approximately how many European cities had printed editions of Luther\'s 95 Theses within the first three months after October 1517?', opts: ['Two or three', 'About a dozen, all in Saxony', 'Dozens, across Germany and into Switzerland and France', 'Only Wittenberg'], ans: 2, explain: 'Within 3 months the Theses had been reprinted in dozens of cities across Germany, then quickly into Basel, Strasbourg, Paris, and beyond. This is the geographic spread the Reformation-spread map visualizes. Compare to Wycliffe (1380s), whose manuscript-era writings took decades to reach a fraction of these cities — and were locally suppressed before reaching mass audiences.' },
        { module: 'people', q: 'The first newspaper printed in what would become Maine was:', opts: ['The Portland Press Herald (1862)', 'The Falmouth Gazette (1785)', 'The Cumberland Gazette (1786)', 'The Bangor Daily News (1889)'], ans: 1, explain: 'The Falmouth Gazette and Weekly Advertiser, first issued January 1, 1785 from a Fore Street shop in Falmouth (now Portland), by printers Thomas B. Wait and Benjamin Titcomb. It predates Maine statehood (1820) by 35 years and started a 240-year chain of Portland newspapers that continues with the modern Portland Press Herald.' }
      ];

      function renderCumulative() {
        var st = bigQuizState;
        var picks = st.picks || {};
        var done = st.idx >= CUMULATIVE_QUESTIONS.length;
        // Compute earned/pct unconditionally so the useEffect dependencies
        // are stable. Then call the useEffect ALWAYS, with the condition
        // moved inside the effect body. Rules of Hooks.
        var pct = done ? Math.round((st.score / CUMULATIVE_QUESTIONS.length) * 100) : 0;
        var earned = done && pct >= 80;
        useEffect(function() {
          if (earned && !badges['cumulative_pass']) {
            awardBadge('cumulative_pass', 'Master Printer');
          }
        }, [earned]);
        if (done) {
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
            // Result card. On mastery (≥80%), the card gets a celebratory
            // treatment: starburst rays radiating from behind the medal,
            // ornate fleuron-corner border, parchment background, and a
            // "guild certificate" feel. Below mastery, stays modest.
            h('div', { style: {
                position: 'relative',
                background: earned ? 'radial-gradient(ellipse at 50% 35%, #fef3c7 0%, ' + T.parchment + ' 70%)' : T.card,
                color: earned ? T.ink : T.text,
                border: '3px solid ' + (earned ? T.accent : T.warn),
                borderRadius: 14, padding: '32px 24px 24px',
                textAlign: 'center', overflow: 'hidden',
                boxShadow: earned ? 'inset 0 0 30px rgba(201,161,74,0.2), 0 4px 16px rgba(0,0,0,0.4)' : 'none'
              } },
              // ── Mastery: starburst rays + corner fleurons ──
              earned && h('svg', { 'aria-hidden': 'true',
                style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.5 },
                viewBox: '0 0 200 200', preserveAspectRatio: 'xMidYMid slice' },
                // 16 rays radiating from center
                (function() {
                  var rays = [];
                  for (var ri = 0; ri < 16; ri++) {
                    var ang = (ri * 360 / 16) * Math.PI / 180;
                    var x2 = 100 + Math.cos(ang) * 200;
                    var y2 = 100 + Math.sin(ang) * 200;
                    rays.push(h('line', {
                      key: ri, x1: 100, y1: 75, x2: x2, y2: y2,
                      stroke: T.accent, strokeWidth: 0.8, opacity: 0.4
                    }));
                  }
                  return h('g', null, rays);
                })()
              ),
              // ── Mastery: corner fleurons (4 corners) ──
              earned && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, left: 12, color: T.accent } }, fleuron(14)),
              earned && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, right: 12, color: T.accent } }, fleuron(14)),
              earned && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, left: 12, color: T.accent } }, fleuron(14)),
              earned && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, right: 12, color: T.accent } }, fleuron(14)),
              // ── Content (positioned above the SVG overlay) ──
              h('div', { style: { position: 'relative', zIndex: 1 } },
                h('div', { style: {
                    fontSize: earned ? 64 : 48,
                    marginBottom: 6,
                    filter: earned ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none'
                  } }, earned ? '🏅' : '📖'),
                h('h2', { style: { margin: '0 0 8px', fontSize: earned ? 26 : 22, fontFamily: 'Georgia, serif',
                  color: earned ? '#7c2d12' : T.text,
                  fontWeight: earned ? 800 : 700,
                  letterSpacing: earned ? '0.04em' : 'normal' } }, earned ? 'Master Printer' : 'Apprentice — review recommended'),
                // Decorative double-rule under the title for the mastery state
                earned && h('div', { 'aria-hidden': 'true', style: { borderTop: '1px solid #7c2d12', borderBottom: '1px solid #7c2d12', height: 3, margin: '6px auto 12px', width: 200, opacity: 0.6 } }),
                h('p', { style: { margin: '0 0 14px', fontSize: 16,
                  color: earned ? T.ink : T.text } },
                  'Score: ', h('strong', null, st.score + ' / ' + CUMULATIVE_QUESTIONS.length + ' (' + pct + '%)')),
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55,
                  color: earned ? '#5c4630' : T.muted,
                  fontStyle: earned ? 'italic' : 'normal',
                  maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' } },
                  earned
                    ? 'You have traveled the press — its mechanism, its materials, its economics, its impact. The history of how knowledge spreads now lives in your head.'
                    : 'Below 80% on the cumulative quiz means there are concepts worth revisiting. The cards below show exactly what you missed and where to review.'),
                // Crew reflection prompt on mastery. Closes the loop from
                // "I learned this" to "what will I do with it."
                earned && h('div', { style: { background: T.parchment, color: T.ink, border: '2px dashed ' + T.accent, borderRadius: 8, padding: 14, margin: '0 auto 16px', maxWidth: 520, position: 'relative' } },
                  h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 6, left: 10, color: '#7c2d12', fontSize: 14 } }, '❦'),
                  h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 6, right: 10, color: '#7c2d12', fontSize: 14 } }, '❦'),
                  h('div', { style: { fontSize: 10, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8, fontFamily: 'Georgia, serif' } }, 'Closing reflection'),
                  h('p', { style: { margin: 0, fontSize: 13, color: '#3a2a1a', fontStyle: 'italic', lineHeight: 1.65, fontFamily: 'Georgia, serif' } },
                    'You finished the tool. Pick one of these prompts and answer it in your head before you close the tab. Or write it down. Or bring it to your Crew this week:'),
                  h('ul', { style: { margin: '10px 0 0 20px', padding: 0, fontSize: 13, color: '#3a2a1a', fontFamily: 'Georgia, serif', lineHeight: 1.7 } },
                    h('li', null, 'What is one thing you understand about technology change that you didn\'t before?'),
                    h('li', null, 'Pick a 1450 fear from The Same Fears. Is it your fear today, or do you disagree?'),
                    h('li', null, 'What would you print first if you ran a shop?')
                  )
                ),
                h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: earned ? 16 : 0 } },
                  // Print certificate — only on mastery. Opens a new window
                  // with a printable HTML certificate styled like a period
                  // diploma. The new window auto-triggers print on load,
                  // so the student gets the print dialog immediately.
                  // Document content is plain HTML (not React) so it
                  // doesn't need to load the AlloFlow runtime to print.
                  earned && h('button', {
                    onClick: function() {
                      try {
                        var cert = window.open('', '_blank', 'width=800,height=600');
                        if (!cert) { addToast('Pop-up blocked. Allow pop-ups to print the certificate.', 'warn'); return; }
                        var date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        var html = '<!DOCTYPE html><html><head><title>Certificate of Mastery — PrintingPress</title>' +
                          '<style>' +
                          '@page { size: letter landscape; margin: 0.5in; }' +
                          'body { font-family: Georgia, "Times New Roman", serif; background: #f5e8c8; color: #1a1410; margin: 0; padding: 40px; min-height: 100vh; box-sizing: border-box; }' +
                          '.cert { background: radial-gradient(ellipse at 8% 12%, rgba(180,140,80,0.18) 0%, transparent 30%), radial-gradient(ellipse at 92% 88%, rgba(180,140,80,0.18) 0%, transparent 30%), #f5e8c8; padding: 60px; border: 4px double #7c2d12; box-shadow: inset 0 0 60px rgba(120,90,40,0.1); text-align: center; max-width: 900px; margin: 0 auto; position: relative; }' +
                          '.fleuron { display: inline-block; width: 20px; height: 20px; }' +
                          'h1 { font-size: 18px; letter-spacing: 0.3em; text-transform: uppercase; color: #7c2d12; margin: 0 0 8px; font-weight: 400; }' +
                          'h2 { font-size: 48px; margin: 12px 0; font-weight: 800; letter-spacing: 0.04em; color: #1a1410; }' +
                          '.subtitle { font-size: 14px; font-style: italic; color: #5c4630; margin-bottom: 28px; }' +
                          '.body { font-size: 16px; line-height: 1.8; color: #1a1410; max-width: 700px; margin: 0 auto 28px; }' +
                          '.score { font-size: 28px; font-weight: 800; color: #7c2d12; letter-spacing: 0.05em; margin: 16px 0; }' +
                          '.rule { width: 280px; height: 6px; border-top: 1px solid #7c2d12; border-bottom: 1px solid #7c2d12; margin: 8px auto; }' +
                          '.dolphin { width: 50px; height: 60px; }' +
                          '.date-line { font-size: 13px; color: #5c4630; margin-top: 36px; letter-spacing: 0.08em; text-transform: uppercase; }' +
                          '.motto { font-style: italic; color: #c9a14a; letter-spacing: 0.05em; margin-top: 12px; font-size: 14px; }' +
                          '</style></head><body><div class="cert">' +
                          '<svg class="dolphin" viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto; display: block;">' +
                          '<line x1="19" y1="6" x2="19" y2="38" stroke="#7c2d12" stroke-width="2" stroke-linecap="round"/>' +
                          '<line x1="11" y1="12" x2="27" y2="12" stroke="#7c2d12" stroke-width="1.5" stroke-linecap="round"/>' +
                          '<circle cx="19" cy="5" r="2.5" fill="none" stroke="#7c2d12" stroke-width="1.2"/>' +
                          '<path d="M 19 38 Q 8 38 7 30 Q 9 34 13 35" fill="none" stroke="#7c2d12" stroke-width="1.5" stroke-linecap="round"/>' +
                          '<path d="M 19 38 Q 30 38 31 30 Q 29 34 25 35" fill="none" stroke="#7c2d12" stroke-width="1.5" stroke-linecap="round"/>' +
                          '<path d="M 11 18 Q 6 22 11 28 Q 19 31 26 26 Q 31 22 26 17 Q 21 14 19 18" fill="none" stroke="#c9a14a" stroke-width="1.4" stroke-linecap="round"/>' +
                          '<circle cx="13" cy="20" r="0.8" fill="#c9a14a"/></svg>' +
                          '<h1>Certificate of Mastery</h1>' +
                          '<div class="rule"></div>' +
                          '<h2>Master Printer</h2>' +
                          '<p class="subtitle">Awarded to the bearer for completing the PrintingPress curriculum</p>' +
                          '<p class="body">This certifies the bearer has traveled the press: its mechanism, its materials, its economics, and its impact across six centuries of human knowledge. The skills here rehearsed — typesetting mirror-reversed, calculating mechanical advantage, designing alloys, recognizing the moment when an idea changed the world — now live in their head.</p>' +
                          '<div class="score">Score: ' + st.score + ' / ' + CUMULATIVE_QUESTIONS.length + ' (' + pct + '%)</div>' +
                          '<div class="rule"></div>' +
                          '<p class="motto">festina lente — make haste slowly</p>' +
                          '<p class="date-line">Conferred · ' + date + '</p>' +
                          '</div><script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script></body></html>';
                        cert.document.write(html);
                        cert.document.close();
                      } catch (e) {
                        addToast('Could not open certificate window: ' + (e && e.message), 'warn');
                      }
                    },
                    style: btn({ padding: '8px 14px', fontSize: 13,
                      background: '#7c2d12', color: T.parchment,
                      border: '1px solid #5c2f0e', fontWeight: 700 })
                  }, '🪶 Print Certificate'),
                  h('button', { onClick: function() {
                    upd('bigQuizState', { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} });
                  }, style: btn({ padding: '8px 14px', fontSize: 13,
                    background: earned ? T.parchment : T.card,
                    color: earned ? T.ink : T.text,
                    border: '1px solid ' + (earned ? '#7c2d12' : T.border) }) }, 'Retake quiz'),
                  h('button', { onClick: function() { upd('view', 'menu'); }, style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) }, '← Back to menu')
                )
              )
            ),
            missedModuleIds.length > 0 && h('div', { style: { marginTop: 18 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 16, color: T.accentHi, fontFamily: 'Georgia, serif' } }, '📍 Review these specific gaps'),
              missedModuleIds.map(function(modId) {
                var moduleMisses = missedByModule[modId];
                var modLabel = MODULE_LABELS[modId] || modId;
                return h('div', { key: modId, style: { background: T.card, border: '1px solid ' + T.warn, borderRadius: 10, padding: 14, marginBottom: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Module'),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: T.text, fontFamily: 'Georgia, serif' } }, modLabel)),
                    h('button', {
                      className: 'printingpress-no-print',
                      onClick: function() { upd('view', modId); markVisited(modId); announce('Opening ' + modLabel); },
                      style: btnPrimary({ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' })
                    }, 'Review →')
                  ),
                  moduleMisses.map(function(m, mi) {
                    return h('div', { key: mi, style: { padding: 10, background: T.cardAlt, borderRadius: 8, marginTop: 6, fontSize: 12, lineHeight: 1.55 } },
                      h('div', { style: { color: T.text, marginBottom: 4 } }, h('strong', null, 'Q' + (m.qIdx + 1) + ': '), m.q.q),
                      h('div', { style: { color: T.danger } }, h('span', { style: { fontWeight: 700 } }, 'Your answer: '), m.q.opts[picks[m.qIdx]]),
                      h('div', { style: { color: T.ok, marginTop: 2 } }, h('span', { style: { fontWeight: 700 } }, 'Right answer: '), m.q.opts[m.q.ans]),
                      h('div', { style: { color: T.muted, marginTop: 6, fontStyle: 'italic' } }, m.q.explain)
                    );
                  })
                );
              })
            )
          );
        }
        var q = CUMULATIVE_QUESTIONS[st.idx];
        var progressPct = Math.round((st.idx / CUMULATIVE_QUESTIONS.length) * 100);
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('🎯 Cumulative PrintingPress Quiz'),
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 6 } },
            'Question ', h('strong', null, st.idx + 1), ' of ' + CUMULATIVE_QUESTIONS.length,
            ' · score ', h('strong', null, st.score)),
          // Progress bar — fills as the student works through the quiz
          h('div', { 'aria-label': 'Quiz progress: ' + progressPct + '%',
            style: { width: '100%', height: 6, background: T.cardAlt, borderRadius: 3, overflow: 'hidden', border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { width: progressPct + '%', height: '100%', background: T.accent, transition: 'width 0.3s ease' } })),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 } },
            h('p', { style: { margin: '0 0 14px', fontSize: 15, fontWeight: 600, lineHeight: 1.5 } }, q.q),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              q.opts.map(function(opt, oi) {
                var picked = st.answered && st.lastChoice === oi;
                var isCorrect = oi === q.ans;
                var style = btn({ padding: '10px 14px', fontSize: 14 });
                if (st.answered) {
                  if (isCorrect) style = Object.assign({}, style, { background: '#1f3d28', borderColor: T.ok, color: '#bbf7d0' });
                  else if (picked) style = Object.assign({}, style, { background: '#3d1f1f', borderColor: T.danger, color: '#fecaca' });
                }
                return h('button', { key: oi, disabled: st.answered,
                  onClick: function() {
                    var nextPicks = Object.assign({}, picks);
                    nextPicks[st.idx] = oi;
                    var nxt = Object.assign({}, st, { answered: true, lastChoice: oi, picks: nextPicks });
                    if (oi === q.ans) nxt.score = st.score + 1;
                    upd('bigQuizState', nxt);
                    announce(oi === q.ans ? 'Correct.' : 'Incorrect.');
                  },
                  style: style }, opt);
              })
            ),
            st.answered && h('div', { style: { marginTop: 12, padding: 12, background: T.cardAlt, borderRadius: 8, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Why: '), q.explain),
            st.answered && h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
              st.lastChoice !== q.ans && h('button', {
                onClick: function() {
                  var nextPicks = Object.assign({}, picks); delete nextPicks[st.idx];
                  upd('bigQuizState', Object.assign({}, st, { answered: false, lastChoice: null, picks: nextPicks }));
                  announce('Question reset. Try again.');
                },
                style: btn({ padding: '10px 16px', fontSize: 14 }) }, '↺ Try again'),
              h('button', {
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

      // ═════════════════════════════════════════════════════════════════════
      // ASK THE PRINTER (AI)
      // ═════════════════════════════════════════════════════════════════════
      function renderAskPrinter() {
        var qRaw = useState('');
        var q = qRaw[0], setQ = qRaw[1];
        var ansRaw = useState(null);
        var ans = ansRaw[0], setAns = ansRaw[1];
        var loadingRaw = useState(false);
        var loading = loadingRaw[0], setLoading = loadingRaw[1];
        var askHistory = d.askHistory || [];
        var ASK_HISTORY_MAX = 5;

        function ask() {
          if (!q.trim()) return;
          if (!callGemini) {
            setAns({ error: true, text: 'AI tutor is not available in this build. Try the modules or Resources tab.' });
            return;
          }
          var question = q.trim();
          setLoading(true); setAns(null);
          var prompt = 'You are a print history educator answering a question for a US middle-school student or teacher. ' +
            'Ground your answer in: Gutenberg Museum (Mainz), British Library, Library of Congress, Smithsonian, Eisenstein\'s "The Printing Press as an Agent of Change", Adrian Johns\'s "The Nature of the Book", Robert Bringhurst\'s typography work, Buringh & van Zanden\'s book-production data, and primary sources where direct. ' +
            'Cite source organizations or books inline. Use concrete numbers when known. Acknowledge that Korean metal movable type predates Gutenberg by 78 years (Jikji, 1377). When discussing women printers, name them (Charlotte Guillard, the Estienne family women, etc.) — the standard histories often left them out. ' +
            'Keep the answer under 250 words. ' +
            'Question: ' + question;
          callGemini(prompt, { maxOutputTokens: 500 })
            .then(function(resp) {
              setLoading(false);
              var text = (resp && (resp.text || resp.content || (typeof resp === 'string' ? resp : ''))) || 'No response.';
              setAns({ error: false, text: text });
              var entry = { q: question, text: text, ts: Date.now() };
              upd('askHistory', [entry].concat(askHistory).slice(0, ASK_HISTORY_MAX));
            })
            .catch(function(err) {
              setLoading(false);
              setAns({ error: true, text: 'Could not reach the AI tutor: ' + (err && err.message || 'unknown error') });
            });
        }

        function fmtAge(ts) {
          var min = Math.floor((Date.now() - ts) / 60000);
          if (min < 1) return 'just now';
          if (min < 60) return min + ' min ago';
          var hr = Math.floor(min / 60);
          if (hr < 24) return hr + ' hr ago';
          return Math.floor(hr / 24) + ' day' + (Math.floor(hr / 24) === 1 ? '' : 's') + ' ago';
        }

        // Starter prompts — click to seed the textarea with a real question
        // a student or teacher might ask. Reduces the blank-page problem
        // that makes AI tutors feel intimidating. Each prompt links to a
        // concept covered elsewhere in the tool, so the AI's answer tends
        // to reinforce module content.
        var STARTER_PROMPTS = [
          'How did Aldus Manutius decide what books to print first?',
          'What was a 1450 type-caster\'s daily routine?',
          'Why did the Reformation succeed when earlier reform movements failed?',
          'How does the screw press generate so much pressure?',
          'What did 1450 print critics get right and what did they get wrong?',
          'Who were the most important women printers, and why are they not in my textbook?'
        ];
        return h('div', { style: { padding: 20, maxWidth: 760, margin: '0 auto', color: T.text } },
          backBar('🤖 Ask the Printer (AI)'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'Type any printing-press question. The AI grounds its answer in the same sources cited throughout this lab. ',
            h('strong', null, 'Educational only.')),

          // ── How to ask better questions ──
          // Quick prompt-engineering coaching. The AI gives richer answers
          // to richer questions; teaching this skill in-context is more
          // useful than treating the AI as a black box.
          h('details', { style: { background: T.cardAlt, border: '1px dashed ' + T.accent, borderRadius: 8, padding: '10px 14px', marginBottom: 14 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.accentHi, fontWeight: 700, fontFamily: 'Georgia, serif' } },
              '💡 How to get a richer answer (click to expand)'),
            h('div', { style: { marginTop: 12, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('p', { style: { margin: '0 0 10px' } },
                'A short, broad question gets a short, broad answer. A specific question with a frame gets a thoughtful one. Three patterns that work well:'),
              h('div', { style: { display: 'grid', gap: 10 } },
                [
                  { weak: 'When was the press invented?',
                    strong: 'How did the printer\'s apprenticeship system shape the spread of the Reformation between 1517 and 1530?',
                    why: 'Specific date range + specific causal claim + specific subject. The AI can answer with concrete cities, people, and evidence instead of a one-line date.' },
                  { weak: 'Was Gutenberg important?',
                    strong: 'Compare what Gutenberg invented to what Bi Sheng invented in 1040. Which contribution had bigger downstream effects, and why?',
                    why: 'Forces a comparison instead of a value judgment. Asks for a "why." Lets the AI synthesize rather than recite.' },
                  { weak: 'Tell me about printing.',
                    strong: 'I just read the section on the Mainz Diocesan War. What other historical accidents (war, plague, migration) accidentally spread important technologies?',
                    why: 'Anchors the question in something you just learned. Asks for analogies across history. Good prompts often build on each other.' }
                ].map(function(p, i) {
                  return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 6, padding: 10 } },
                    h('div', { style: { fontSize: 10, color: T.danger, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 } }, 'Weaker'),
                    h('div', { style: { fontSize: 12, color: T.text, fontStyle: 'italic', marginBottom: 8 } }, '"' + p.weak + '"'),
                    h('div', { style: { fontSize: 10, color: T.ok, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 } }, 'Stronger'),
                    h('div', { style: { fontSize: 12, color: T.accentHi, fontStyle: 'italic', marginBottom: 6, fontFamily: 'Georgia, serif' } }, '"' + p.strong + '"'),
                    h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                      h('strong', { style: { color: T.muted, fontStyle: 'normal' } }, 'Why it works: '), p.why)
                  );
                })
              ),
              h('p', { style: { margin: '10px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                'This is a real skill called "prompt engineering" that adults are now paid to do. Practice it here, and you have a skill that transfers everywhere you talk to an AI for the rest of your life.')
            )
          ),

          // Starter prompts
          h('div', { className: 'printingpress-no-print', style: { marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 } }, 'Or click a starter question:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              STARTER_PROMPTS.map(function(sp, spi) {
                return h('button', { key: spi,
                  onClick: function() { setQ(sp); announce('Question loaded. Click Ask to submit.'); },
                  style: btn({ padding: '6px 10px', fontSize: 12, background: T.cardAlt, borderColor: T.border, color: T.muted }) },
                  '💭 ' + sp);
              })
            )
          ),
          h('label', { htmlFor: 'pp-q', style: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 } }, 'Your question:'),
          h('textarea', { id: 'pp-q', value: q,
            onChange: function(e) { setQ(e.target.value); }, rows: 3,
            placeholder: 'e.g. "How did Aldus Manutius decide what books to print first?" or "What was a 1450 type-caster\'s daily routine?"',
            style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
          h('div', { className: 'printingpress-no-print', style: { marginTop: 10, display: 'flex', gap: 8 } },
            h('button', { onClick: ask, disabled: loading || !q.trim(),
              style: btnPrimary({ padding: '10px 18px', fontSize: 14, opacity: (loading || !q.trim()) ? 0.5 : 1 }) },
              loading ? 'Thinking…' : 'Ask'),
            h('button', { onClick: function() { setQ(''); setAns(null); }, style: btn({ padding: '10px 14px', fontSize: 14 }) }, 'Clear')
          ),
          ans && h('div', { style: { marginTop: 16, padding: 14, background: T.card, border: '1px solid ' + (ans.error ? T.warn : T.accent), borderRadius: 10, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, ans.text),
          askHistory.length > 0 && h('div', { className: 'printingpress-no-print', style: { marginTop: 18 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' } },
              h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' } }, '🕒 Recent answers (' + askHistory.length + ')'),
              h('button', {
                onClick: function() {
                  if (typeof window !== 'undefined' && window.confirm && !window.confirm('Clear all saved AI answers?')) return;
                  upd('askHistory', []); announce('History cleared');
                },
                style: btn({ padding: '4px 10px', fontSize: 11 })
              }, 'Clear history')
            ),
            askHistory.map(function(entry, i) {
              return h('details', { key: entry.ts + '-' + i,
                style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 10, marginBottom: 6 } },
                h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.text, fontWeight: 600, listStyle: 'revert', display: 'flex', alignItems: 'baseline', gap: 8 } },
                  h('span', { style: { flex: 1, lineHeight: 1.4 } }, entry.q),
                  h('span', { style: { fontSize: 11, color: T.dim, fontWeight: 400, whiteSpace: 'nowrap' } }, fmtAge(entry.ts))
                ),
                h('div', { style: { marginTop: 8, padding: 10, background: T.bg, borderRadius: 6, fontSize: 13, color: T.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, entry.text)
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // RESOURCES
      // ═════════════════════════════════════════════════════════════════════
      function renderResources() {
        // Resource type icons — small SVGs that distinguish at a glance:
        // building (museum), open book (book/scholarship), globe (website),
        // scroll (primary source / facsimile). Categorized per group.
        function rIcon(kind) {
          var stroke = T.accent;
          var common = { width: 16, height: 16, viewBox: '0 0 16 16',
            'aria-hidden': 'true',
            style: { display: 'inline-block', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 } };
          if (kind === 'museum') {
            // Greek-temple building
            return h('svg', common,
              h('polygon', { points: '8,1 1,5 15,5', fill: stroke, opacity: 0.85 }),
              h('rect', { x: 1, y: 5, width: 14, height: 1, fill: stroke }),
              h('rect', { x: 2, y: 6, width: 1.5, height: 7, fill: stroke }),
              h('rect', { x: 5.5, y: 6, width: 1.5, height: 7, fill: stroke }),
              h('rect', { x: 9, y: 6, width: 1.5, height: 7, fill: stroke }),
              h('rect', { x: 12.5, y: 6, width: 1.5, height: 7, fill: stroke }),
              h('rect', { x: 1, y: 13, width: 14, height: 1.5, fill: stroke })
            );
          }
          if (kind === 'book') {
            // Open book
            return h('svg', common,
              h('path', { d: 'M 1 3 L 8 4 L 15 3 L 15 13 L 8 14 L 1 13 Z', fill: 'none', stroke: stroke, strokeWidth: 1 }),
              h('line', { x1: 8, y1: 4, x2: 8, y2: 14, stroke: stroke, strokeWidth: 0.6 }),
              h('line', { x1: 3, y1: 6, x2: 7, y2: 6.3, stroke: stroke, strokeWidth: 0.4 }),
              h('line', { x1: 3, y1: 8, x2: 7, y2: 8.3, stroke: stroke, strokeWidth: 0.4 }),
              h('line', { x1: 3, y1: 10, x2: 7, y2: 10.3, stroke: stroke, strokeWidth: 0.4 }),
              h('line', { x1: 9, y1: 6.3, x2: 13, y2: 6, stroke: stroke, strokeWidth: 0.4 }),
              h('line', { x1: 9, y1: 8.3, x2: 13, y2: 8, stroke: stroke, strokeWidth: 0.4 }),
              h('line', { x1: 9, y1: 10.3, x2: 13, y2: 10, stroke: stroke, strokeWidth: 0.4 })
            );
          }
          if (kind === 'scroll') {
            // Rolled scroll / parchment with text lines
            return h('svg', common,
              h('rect', { x: 2, y: 3, width: 11, height: 10, fill: T.parchment, stroke: stroke, strokeWidth: 0.8 }),
              h('rect', { x: 1, y: 2, width: 2, height: 12, fill: stroke, opacity: 0.7, rx: 1 }),
              h('rect', { x: 13, y: 2, width: 2, height: 12, fill: stroke, opacity: 0.7, rx: 1 }),
              h('line', { x1: 4, y1: 6, x2: 11, y2: 6, stroke: T.ink, strokeWidth: 0.5, opacity: 0.6 }),
              h('line', { x1: 4, y1: 8, x2: 11, y2: 8, stroke: T.ink, strokeWidth: 0.5, opacity: 0.6 }),
              h('line', { x1: 4, y1: 10, x2: 9, y2: 10, stroke: T.ink, strokeWidth: 0.5, opacity: 0.6 })
            );
          }
          // Default: globe (website)
          return h('svg', common,
            h('circle', { cx: 8, cy: 8, r: 6, fill: 'none', stroke: stroke, strokeWidth: 1 }),
            h('ellipse', { cx: 8, cy: 8, rx: 3, ry: 6, fill: 'none', stroke: stroke, strokeWidth: 0.6 }),
            h('line', { x1: 2, y1: 8, x2: 14, y2: 8, stroke: stroke, strokeWidth: 0.6 }),
            h('path', { d: 'M 3 5 Q 8 7 13 5', fill: 'none', stroke: stroke, strokeWidth: 0.6 }),
            h('path', { d: 'M 3 11 Q 8 9 13 11', fill: 'none', stroke: stroke, strokeWidth: 0.6 })
          );
        }
        var groups = [
          { name: 'See a working press', icon: 'museum', items: [
            { label: 'International Printing Museum (Carson, CA) — Working Gutenberg replica + tours', url: 'https://www.printingmuseum.org/', kind: 'museum' },
            { label: 'Gutenberg Museum (Mainz, Germany) — Original Bibles + working presses', url: 'https://www.gutenberg-museum.de/en', kind: 'museum' },
            { label: 'Smithsonian — Graphic Arts Collection', url: 'https://www.si.edu/spotlight/printing', kind: 'museum' },
            { label: 'Briar Press — Find a letterpress shop near you', url: 'https://www.briarpress.org/', kind: 'website' }
          ] },
          { name: 'Primary sources online', icon: 'scroll', items: [
            { label: 'British Library — Gutenberg Bible (full digital facsimile)', url: 'https://www.bl.uk/treasures/gutenberg/homepage.html', kind: 'scroll' },
            { label: 'Library of Congress — Pre-1800 American Imprints', url: 'https://www.loc.gov/', kind: 'scroll' },
            { label: 'Bodleian Library — Broadside Ballads', url: 'https://ballads.bodleian.ox.ac.uk/', kind: 'scroll' },
            { label: 'Cheongju Early Printing Museum (Korea) — Jikji (1377, oldest extant metal movable-type book)', url: 'https://www.cjcityart.or.kr/', kind: 'museum' }
          ] },
          { name: 'Scholarship', icon: 'book', items: [
            { label: 'Elizabeth Eisenstein, "The Printing Press as an Agent of Change" (1980) — the foundational scholarly account', kind: 'book' },
            { label: 'Adrian Johns, "The Nature of the Book: Print and Knowledge in the Making" (1998)', kind: 'book' },
            { label: 'Andrew Pettegree, "The Book in the Renaissance" (2010)', url: 'https://yalebooks.yale.edu/book/9780300178210/the-book-in-the-renaissance/', kind: 'book' },
            { label: 'Eltjo Buringh & Jan Luiten van Zanden — Book production data 800-1800', url: 'https://www.jstor.org/stable/40208712', kind: 'website' }
          ] },
          { name: 'Typography', icon: 'book', items: [
            { label: 'Robert Bringhurst, "The Elements of Typographic Style" (4th ed., 2013) — the standard reference', kind: 'book' },
            { label: 'Marshall McLuhan, "The Gutenberg Galaxy" (1962)', kind: 'book' },
            { label: 'Type@Cooper — Typography history and education', url: 'https://typecooper.com/', kind: 'website' }
          ] },
          { name: 'Recovering women printers', icon: 'book', items: [
            { label: 'Susan Broomhall — Work on women in early modern French print', kind: 'book' },
            { label: 'Helwi Blom — Recent scholarship on women printers in early modern Europe', kind: 'book' },
            { label: 'Library of Congress — Charlotte Guillard biography', url: 'https://www.bnf.fr/', kind: 'website' }
          ] },
          { name: 'Maine archives & places to visit', icon: 'museum', items: [
            { label: 'Maine Historical Society (Portland) — Falmouth Gazette issues, 19th-c Maine newspapers, exhibits open to school groups', url: 'https://www.mainehistory.org/', kind: 'museum' },
            { label: 'Wadsworth-Longfellow House (Portland) — Longfellow family papers, early Portland press connections; walking distance from King Middle', url: 'https://www.mainehistory.org/house-overview/', kind: 'museum' },
            { label: 'Bowdoin College Library Special Collections (Brunswick) — early American imprints, Maine pamphlets, periodicals', url: 'https://library.bowdoin.edu/arch/', kind: 'book' },
            { label: 'Bates College Edmund S. Muskie Archives (Lewiston) — political papers, Maine journalism history', url: 'https://www.bates.edu/archives/', kind: 'book' },
            { label: 'Maine State Archives (Augusta) — colonial-era documents, original Maine constitutional materials (1820)', url: 'https://www.maine.gov/sos/arc/', kind: 'museum' },
            { label: 'Colby College Special Collections (Waterville) — Maine literature manuscripts; Edwin Arlington Robinson papers', url: 'https://www.colby.edu/special-collections/', kind: 'book' },
            { label: 'Penobscot Marine Museum (Searsport) — historic broadsides relating to coastal Maine shipping and ports', url: 'https://penobscotmarinemuseum.org/', kind: 'museum' },
            { label: 'University of Maine Fogler Library (Orono) — extensive Maine periodicals collection; the largest run of pre-1900 Maine newspapers in the state', url: 'https://library.umaine.edu/special/', kind: 'book' },
            { label: 'Portland Public Library — Portland Room — Portland-specific materials including 19th- and 20th-c newspapers on microfilm', url: 'https://www.portlandlibrary.com/', kind: 'museum' }
          ] }
        ];
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Every museum, library, and book cited in this lab. If you are within driving distance of one of the working-press museums, go. Holding a 30-pound platen and pulling the bar yourself is a different category of understanding than reading about it.'),
          groups.map(function(g, gi) {
            return h('div', { key: gi, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 12 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', gap: 6 } },
                rIcon(g.icon), g.name),
              h('ul', { style: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 } },
                g.items.map(function(it, ii) {
                  return h('li', { key: ii, style: { display: 'flex', alignItems: 'flex-start', fontSize: 13, lineHeight: 1.55 } },
                    rIcon(it.kind || 'website'),
                    h('span', null,
                      it.url ? h('a', { href: it.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, it.label) : it.label
                    )
                  );
                })
              )
            );
          }),
          // Glossary panel. Compact alphabetized reference of period
          // vocabulary used across all 10 modules. Designed to be
          // printable (via browser print) as a student handout.
          h('div', { style: { marginTop: 16, padding: 16, background: T.card, border: '1px solid ' + T.accent, borderRadius: 12 } },
            h('h3', { style: { margin: '0 0 4px', fontSize: 15, color: T.accentHi, fontFamily: 'Georgia, serif' } }, '📖 Period vocabulary glossary'),
            h('p', { style: { margin: '0 0 12px', fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } },
              'Every period term used in this lab. Print this page and you have a one-sheet reference for the whole tool. Alphabetized for fast scan.'),
            h('div', { style: { columns: '2 200px', columnGap: 18, fontSize: 12, color: T.text, lineHeight: 1.6 } },
              [
                { t: 'Antimony', d: 'Metal that expands slightly on cooling. The "secret ingredient" in type alloy — its expansion counters lead and tin shrinkage so cast type comes out the right size.' },
                { t: 'Beard', d: 'The sloped area on a sort connecting the printing face down to the body. Catches stray ink.' },
                { t: 'Blackletter', d: 'The dense, vertical, medieval typeface of the Gutenberg Bible. Also called Textura or Old English.' },
                { t: 'Broadside', d: 'A single-sheet print, often political, advertising, religious, or poetic. The format of Common Sense (1776) and most early American pamphlets.' },
                { t: 'Caduceus', d: 'A winged staff with two intertwined serpents. Froben\'s printer\'s mark; later the symbol of Hermes / Mercury and (mistakenly in the U.S.) of medicine.' },
                { t: 'Casting', d: 'Pouring molten alloy into a copper matrix to produce one sort. Mainz printers cast tens of thousands per shop.' },
                { t: 'Colophon', d: 'The printer\'s mark and credit at the back of a book. Fust and Schöffer\'s 1457 Mainz Psalter has the first printed colophon.' },
                { t: 'Composing stick', d: 'A handheld metal tray adjustable for line width. The compositor built one line at a time, right-to-left.' },
                { t: 'Compositor', d: 'The person who set type. Required years of training to read mirror-reversed text at speed and know the case layout by feel.' },
                { t: 'Counter', d: 'The enclosed space inside a letter (the loop of an o, the bowl of a b). The "negative space" of typography.' },
                { t: 'Distribution', d: 'Returning each sort to its compartment after a forme is printed. Long and tedious; usually the apprentice\'s job.' },
                { t: 'Em-dash, en-dash', d: 'Dashes the width of a capital M and a lowercase n respectively. Widths come from physical type sizes used as rulers.' },
                { t: 'Face (of type)', d: 'The raised letter at the top of a sort. The only part that touches ink and paper.' },
                { t: 'Falling in pi', d: 'When set type is dropped and the sorts mix up. Shop disaster; takes hours of resorting.' },
                { t: 'Fell (felt the nick)', d: 'Identifying which way is up on a sort by feeling for the nick groove. Compositor by-touch skill.' },
                { t: 'Festina lente', d: 'Latin: "make haste slowly." Aldus Manutius\'s motto; the meaning of the dolphin-and-anchor mark.' },
                { t: 'Fleuron', d: 'A printer\'s flower — a decorative ornament cast as a sort, used to fill short lines or mark section breaks.' },
                { t: 'Folio, quarto, octavo', d: 'Sheet-folding formats. Folio = folded once (4 pages), quarto = folded twice (8 pages), octavo = folded three times (16 pages). Smaller formats = more portable books.' },
                { t: 'Font', d: 'Originally a "fount" — a complete set of one typeface in one size. Thousands of physical sorts in 1450; a file on your laptop today.' },
                { t: 'Forme', d: 'A complete page-worth of locked-up type ready to be inked and pressed. Locked into a metal frame with wedges.' },
                { t: 'Galley', d: 'A flat metal tray that held set type before pagination. "Galley proofs" today (a publishing-industry term) descend from this.' },
                { t: 'Hangul', d: 'The Korean alphabet (~24 letters), designed by King Sejong in 1443. Simpler than Hanja but politically suppressed in scholarly use.' },
                { t: 'Hanja', d: 'Chinese characters used in Korea (thousands of glyphs). The economic challenge that made Korean movable-type printing harder to scale than European.' },
                { t: 'Height-to-paper', d: 'The total foot-to-face height of a sort. In Anglo-American printing exactly 0.918 inches. Every sort must match.' },
                { t: 'Imposition', d: 'Arranging pages on a sheet so they read in order after folding. Senior craftsman\'s job; messed up and you reprint the run.' },
                { t: 'Incunabula', d: 'Books printed before 1501. The "cradle period" of European printing. ~30,000 known editions; bibliographers track them all.' },
                { t: 'Italic', d: 'A slanted typeface modeled on humanist handwriting. Aldus Manutius commissioned the first body italic from Francesco Griffo (1500) to fit more text per page.' },
                { t: 'Justification', d: 'Inserting thin metal spacers (quads) between words to make every line the same width. Gives us "justified text" today.' },
                { t: 'Kerning', d: 'Adjusting space between specific letter pairs. The "kern" was the part of a sort that overhung the metal block (the diagonal of W, the foot of f, etc.).' },
                { t: 'Lampblack', d: 'Pure carbon soot scraped from oil-lamp interiors. The pigment in Gutenberg-era oil-based ink.' },
                { t: 'Leading', d: 'Pronounced "ledding." Lead strips inserted between rows of type for vertical spacing. CSS line-height descends from this.' },
                { t: 'Ligature', d: 'Two or more characters cast as a single sort (fi, fl, æ, &). Smoothed out awkward letter combinations.' },
                { t: 'Manicule', d: 'A pointing-hand mark used to indicate "look here." Drawn in manuscript margins; later cast as a sort. ☞' },
                { t: 'Manuscript', d: 'A handwritten document, especially a book copied before print. Slow, expensive, often one of a kind.' },
                { t: 'Matrix', d: 'The mother-mold pressed by a punch into a copper blank. Used to cast hundreds of identical sorts. The matrix lasts decades; the cast sorts wear out.' },
                { t: 'Nick', d: 'A small horizontal groove on a sort, near the foot, on one side. Compositors felt for it to know which way was up.' },
                { t: 'Pi (in pi)', d: 'See "falling in pi." A pile of jumbled, unsorted type.' },
                { t: 'Pilcrow (¶)', d: 'Paragraph-start mark used in manuscripts and early printed books. Still in your word processor.' },
                { t: 'Platen', d: 'The heavy flat plate that pressed paper against type. Master printers obsessed over keeping it flat.' },
                { t: 'Punch (puncheon)', d: 'A hardened-steel die with one letter shape cut in mirror-image at one end. Pressed into a copper matrix to create the casting mold.' },
                { t: 'Quoin', d: 'A wedge used to lock type into a forme. Pronounced "coin." Tighter quoin = sorts stay in place; too tight and the forme cracks.' },
                { t: 'Recto, verso', d: 'The right-hand and left-hand pages of an open book. Recto is odd-numbered (1, 3, 5); verso is even.' },
                { t: 'Shoulder', d: 'A small bevel on a sort just below the printing face. Catches stray ink.' },
                { t: 'Shank', d: 'The main body of a sort. Stands the dimensional and mechanical load when pressed.' },
                { t: 'Sort', d: 'A single piece of cast metal type. A shop kept ~100,000 in inventory.' },
                { t: 'Tympan', d: 'A frame covered with parchment that held the paper in place during the impression.' },
                { t: 'Type case', d: 'The wooden compartmented tray that held all the sorts of one typeface. Upper case (capitals) and lower case (minuscules) literally upper and lower.' },
                { t: 'Vernacular', d: 'The everyday language of a region as opposed to scholarly Latin. Vernacular Bibles (Luther\'s German, Tyndale\'s English) were politically explosive.' },
                { t: 'Watermark', d: 'A faint design pressed into paper during papermaking; visible when held to light. Identifies the papermaker; helps date undated books.' }
              ].map(function(g, gi) {
                return h('div', { key: gi, style: { breakInside: 'avoid', marginBottom: 8 } },
                  h('strong', { style: { color: T.accentHi, fontFamily: 'Georgia, serif' } }, g.t),
                  h('span', { style: { color: T.muted } }, ' — ' + g.d)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Use your browser\'s print menu (Cmd/Ctrl + P) on this Resources page to capture the glossary as a one-sheet handout.')
          ),

          // Next steps for curious learners — concrete actions a student
          // or teacher could take after this tool. Turns abstract interest
          // into specific behavior.
          h('div', { style: { marginTop: 16, padding: 16, background: T.card, border: '1px solid ' + T.ok, borderRadius: 12 } },
            h('h3', { style: { margin: '0 0 4px', fontSize: 15, color: T.accentHi, fontFamily: 'Georgia, serif' } }, '🛤️ Next steps if this lab caught you'),
            h('p', { style: { margin: '0 0 12px', fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.55 } },
              'You finished the tool. The most rewarding learning happens off the screen. Pick one or two from this list and actually do them.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              [
                { tier: 'Easy', tone: T.ok,
                  action: 'Visit a working press museum',
                  detail: 'International Printing Museum (Carson, CA) runs Gutenberg demonstrations on real reconstructions. Gutenberg Museum (Mainz) has originals. Neither requires special arrangement.' },
                { tier: 'Easy', tone: T.ok,
                  action: 'Watch the Linotype documentary',
                  detail: '"Linotype: The Film" (2012, on streaming) covers the Mergenthaler Linotype, the machine that changed newspapers for 80 years. Wonderfully nerdy. The machines still run at hobbyist shops.' },
                { tier: 'Easy', tone: T.ok,
                  action: 'Examine a real printed book',
                  detail: 'Pull any hardback off a shelf. Look at the title page, the colophon (back of the title page), the type, the leading. You now know what every choice means.' },
                { tier: 'Medium', tone: T.warn,
                  action: 'Find a letterpress shop near you',
                  detail: 'Briar Press maintains a directory of working letterpress shops worldwide. Many offer workshops. In Maine: try AS220 Industries (Providence, drivable) or look up Down East letterpress practitioners.' },
                { tier: 'Medium', tone: T.warn,
                  action: 'Identify a typeface in the wild',
                  detail: 'Pick a sign, a book, an app, a logo. Try to identify the typeface. Use Fonts In Use (fontsinuse.com) or the Identifont question-based tool. Keep doing this. Within a month you will start seeing typefaces everywhere.' },
                { tier: 'Medium', tone: T.warn,
                  action: 'Follow a modern type designer',
                  detail: 'Tobias Frere-Jones, Erik Spiekermann, Jessica Hische, Tracy Jenkins. They share work-in-progress sketches, talk about historical references, and post the kind of behind-the-scenes craft that schools rarely show.' },
                { tier: 'Stretch', tone: T.danger,
                  action: 'Design one letter',
                  detail: 'Open Glyphr Studio (free, browser-based) or FontForge (free, desktop). Design the lowercase "a" for your own typeface. You will fail your first 10 attempts. You will learn more about type than from any book.' },
                { tier: 'Stretch', tone: T.danger,
                  action: 'Print a real broadside',
                  detail: 'Take the broadside you composed in the Build a Broadside module, print it on heavy paper (cardstock), and post it somewhere public with permission. Watch what happens. This is what a 1450 broadside was for.' },
                { tier: 'Stretch', tone: T.danger,
                  action: 'Read a primary source in full',
                  detail: 'The British Library has the entire Gutenberg Bible online as a high-resolution facsimile. Spend 15 minutes scrolling. Try to read a line of Blackletter. Notice what you can and cannot decode.' }
              ].map(function(step, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '3px solid ' + step.tone, borderRadius: 6, padding: 10 } },
                  h('div', { style: { fontSize: 10, color: step.tone, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia, serif' } }, step.tier),
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif', marginBottom: 4 } }, step.action),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.55 } }, step.detail)
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'A skill built by holding a 30-pound platen is qualitatively different from a skill built by reading about one. Even a single hands-on session at a working press shifts everything you understood from this lab.')
          ),

          // Citation hint — for teachers who use this tool as a classroom
          // resource. Provides a clean attribution format they can adapt
          // for handouts, lesson plans, or student bibliographies.
          h('div', { style: { marginTop: 16, padding: 14, background: T.card, border: '1px dashed ' + T.accent, borderRadius: 10 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 13, color: T.accentHi, fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.06em' } }, '📝 Cite this tool'),
            h('p', { style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.5 } },
              'For lesson plans, student bibliographies, or teaching portfolios:'),
            h('div', { style: { fontSize: 12, fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace', color: T.text, background: T.cardAlt, padding: 10, borderRadius: 6, border: '1px solid ' + T.border, lineHeight: 1.6 } },
              'PrintingPress: an interactive printing-press history and simulation tool. AlloFlow STEM Lab (Pomeranz, A., ', new Date().getFullYear(), '). Retrieved ', new Date().toLocaleDateString(), ' from prismflow-911fe.web.app.'
            )
          ),
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // TEACHER NOTES content (per-module)
      // ═════════════════════════════════════════════════════════════════════
      var TEACHER_NOTES = {
        pressMechanism: {
          standards: ['NGSS MS-PS2-2', 'NGSS MS-ETS1-1', 'NGSS MS-ETS1-3', 'CCSS.ELA-Literacy.RH.6-8.7'],
          discussion: [
            'The screw press is one of the six classical simple machines. Which other simple machine could substitute for the screw, and why was the screw chosen instead?',
            'Mechanical advantage trades distance for force. What is the cost of a 100:1 mechanical advantage in this design (hint: how far does the bar travel vs how far does the platen travel)?',
            'Why was platen flatness one of the most-prized craftsmanship metrics in a print shop? What modern manufacturing concept does this anticipate?'
          ],
          misconceptions: [
            { wrong: 'Gutenberg "invented" the press as a single moment of inspiration.', right: 'He integrated existing technologies (screw, ink, paper, alloy casting) into a working system. The genius was the integration and the materials science, not a single eureka moment.' },
            { wrong: 'A heavier press makes a better print.', right: 'An EVEN press makes a better print. Master printers obsessed over platen flatness — micro-deviations created visible defects.' },
            { wrong: 'Modern offset printing made letterpress obsolete.', right: 'Letterpress is alive in 2026. Hundreds of working shops exist worldwide for fine art, wedding stationery, broadsides, and education. The "kiss impression" aesthetic is genuinely impossible to replicate digitally.' }
          ],
          extension: 'Use the simulation\'s state counter as data: have students hypothesize how many impressions a Gutenberg press could produce per day, then calculate using the 30-second-per-impression journeyman rate. Compare to modern offset and digital print throughput. Discuss what each technology shift made possible.'
        },
        setType: {
          standards: ['NGSS MS-ETS1-1', 'CCSS.ELA-Literacy.RH.6-8.4', 'C3 Framework D2.His.4.6-8'],
          discussion: [
            'Compositors apprenticed for ~7 years. What does this say about the value of skilled craft labor in 1450, and how does it compare to modern apprenticeship models (electricians, plumbers, master machinists)?',
            'A skilled compositor in 1450 set ~1,000 characters per hour, mirror-reversed. A fast modern keyboardist sets ~12,000 in the same time. What did the compositor have to do that the keyboardist does not?',
            'Many early-modern compositors and printers were women, often inheriting family businesses. Why are they largely missing from standard histories of printing?'
          ],
          misconceptions: [
            { wrong: 'Type was set left-to-right, the way we read.', right: 'Type was set right-to-left, mirror-reversed, so when pressed against paper, the impression flipped to read normally.' },
            { wrong: '"Uppercase" and "lowercase" are software conventions.', right: 'They come from the literal physical position of the wooden type cases — capitals in the upper case, minuscules in the more accessible lower case.' },
            { wrong: 'Printing eliminated the need for skilled labor.', right: 'It moved skilled labor from copying to composing. A 16th-century print shop required punch-cutters, type-casters, compositors, pressmen, and proofreaders — all skilled trades with multi-year apprenticeships.' }
          ],
          extension: 'Have students work in pairs to set their name in mirror-reversed letters using paper cards (one card per letter). Then "print" by pressing the cards face-down on inked paper. Time the operation. Discuss why apprenticeships took years.'
        },
        castingType: {
          standards: ['NGSS MS-PS1-3', 'NGSS MS-ETS1-1', 'CCSS.ELA-Literacy.RH.6-8.2'],
          discussion: [
            'Antimony is one of very few metals that expands on solidification. Without it, lead-tin alloys shrink unpredictably. Why is this property so important specifically for casting type, and what happens to the cast piece without it?',
            'Each font requires ~250 distinct punches, hand-cut by a master. What does this say about the upfront capital cost of starting a print shop? How does this compare to modern font design (where one designer can produce a font in months on a laptop)?',
            'Korean metal movable type predates Gutenberg by 78 years (Jikji, 1377), but never displaced wood-block printing in the way Gutenberg displaced manuscripts in Europe. Why?'
          ],
          misconceptions: [
            { wrong: 'Type was just lead.', right: 'Type was a precise alloy: ~54% lead, ~28% tin, ~18% antimony. Each component had a specific functional reason.' },
            { wrong: 'Gutenberg invented movable type.', right: 'Movable metal type existed in Korea by 1377. Gutenberg invented (or perfected) the punch-matrix-cast WORKFLOW + alloy + screw press combination that made movable type economically viable for a Western alphabet.' },
            { wrong: 'Lead type was always understood to be safe.', right: 'Lead poisoning was a documented occupational hazard in print shops for centuries. Modern letterpress shops use polymer plates or magnesium for safety reasons.' }
          ],
          extension: 'Have students research another metal alloy where one component\'s unusual property is essential (bronze, brass, solder, sterling silver). Discuss how materials science enables technologies.'
        },
        economics: {
          standards: ['CCSS.ELA-Literacy.RH.6-8.7', 'C3 Framework D2.Eco.1.6-8', 'C3 Framework D2.His.14.6-8'],
          discussion: [
            'The break-even point for print vs hand-copying was 50-100 copies. How would this have shaped a 1455 printer\'s decisions about WHICH books to print?',
            'A book\'s cost fell ~1,000-fold between 1450 and 1600. What other technologies in history have produced comparable cost collapses, and what social changes followed each?',
            'Computing has produced a similar cost collapse in our own time. What parallels (and disanalogies) do you see between the print revolution and the digital revolution?'
          ],
          misconceptions: [
            { wrong: 'Books were rare before 1450 because few people could read.', right: 'The causation runs the other way. Few people could read partly because books were rare and expensive. Mass literacy followed the cost collapse, not the other way around.' },
            { wrong: 'Printed books were affordable to everyone immediately.', right: 'A Gutenberg Bible cost roughly $5,000 in 2026 USD-equivalent. Affordability for working people took ~150 years.' },
            { wrong: 'The printing press was profitable from day one.', right: 'Gutenberg himself died nearly bankrupt. Many early printers went out of business. The economics were uncertain for decades while markets developed.' }
          ],
          extension: 'Have students compare the cost-collapse curve of printed books (1450-1600) to the cost-collapse curve of personal computing (1975-2025). What rate of decline? What social changes followed? Discuss whether one is a useful analogy for the other.'
        },
        beforeAfter: {
          standards: ['CCSS.ELA-Literacy.RH.6-8.2', 'C3 Framework D2.His.14.6-8', 'C3 Framework D2.His.16.6-8'],
          discussion: [
            'Wycliffe (1380s) and Hus (1415) made arguments very similar to Luther\'s, before the press. Both were locally suppressed. What does this say about technology vs ideas as drivers of historical change?',
            'The printing press enabled both the scientific revolution AND the wars of religion (5-10 million European dead, 1517-1648). What does this tell us about evaluating new information technologies — including the ones we live with now?',
            'Standardization of figures and texts is one of the press\'s biggest impacts on science. How did pre-print science work without standardized figures, and what did this make impossible?'
          ],
          misconceptions: [
            { wrong: 'The Reformation was caused by Luther\'s personality.', right: 'Earlier reformers made very similar arguments. Print is what made Luther\'s campaign succeed where earlier ones failed.' },
            { wrong: 'The press was an unambiguous force for good.', right: 'Print also enabled mass propaganda, witch-hunting at scale, and religious persecution. Information technology amplifies whatever its users want to amplify.' },
            { wrong: 'Mass literacy followed immediately from the press.', right: 'Mass literacy took 200-300 years to develop after the press. It required affordable books, widespread schools, and economic incentives for reading. It was not automatic.' }
          ],
          extension: 'Have students pick a current information technology (social media, smartphones, AI) and write a short essay imagining how a historian in 2150 might describe its "before-and-after" effects on society. Use the printing press as a structural model.'
        },
        typographyToday: {
          standards: ['CCSS.ELA-Literacy.L.6-8.4', 'CCSS.ELA-Literacy.RH.6-8.4', 'ISTE Student 1c'],
          discussion: [
            'Of the typographic terms we still use today, which surprised you the most? Why do you think the original print-shop language survived into digital tools?',
            'Marshall McLuhan argued that movable type was the world\'s first discrete-symbol information system, anticipating digital text by 500 years. What features of print make this argument compelling — and what features make it uncomfortable?',
            'Aldus Manutius designed italic type to fit more characters per line in his pocket-format books. What modern design decisions are similarly driven by a constraint (mobile screen size, attention span, etc.)?'
          ],
          misconceptions: [
            { wrong: 'Italic type was invented for emphasis.', right: 'It was invented (~1500) for SPACE — to fit more characters per line in pocket-sized books. Emphasis use came later.' },
            { wrong: 'Typography is a modern design discipline.', right: 'Typography as a craft is ~570 years old. Most of its terminology and many of its rules predate the modern era.' },
            { wrong: 'Computer fonts are unrelated to physical type.', right: 'Computer font design directly inherits the punch-matrix-cast tradition. Many modern fonts are digital revivals of physical typefaces from 1450-1900.' }
          ],
          extension: 'Have students photograph an everyday object (street sign, book cover, food packaging) and identify three typographic decisions someone made (font choice, leading, alignment, kerning). Discuss why each choice was made.'
        },
        people: {
          standards: ['CCSS.ELA-Literacy.RH.6-8.2', 'C3 Framework D2.His.3.6-8', 'C3 Framework D2.His.4.6-8'],
          discussion: [
            'Why do you think the standard story credits Gutenberg alone, not Fust or Schöffer or the broader Mainz craft community?',
            'Charlotte Guillard ran one of Paris\'s largest presses for 30 years and produced 150+ scholarly books. Why is she not in your textbook? What does her absence (and the absence of dozens like her) say about how histories get written?',
            'The American Founding was largely a print event — Common Sense, the Federalist Papers, the Declaration. What does this say about the relationship between technology and political change?'
          ],
          misconceptions: [
            { wrong: 'Gutenberg got rich from the printing press.', right: 'He died nearly bankrupt. Fust and Schöffer ended up controlling the equipment after Fust\'s lawsuit.' },
            { wrong: 'Women did not participate in early printing.', right: 'Approximately 5-10% of European print shops in the 16th-17th centuries were run by women — many for decades, producing significant scholarly work. They were systematically erased from later histories.' },
            { wrong: 'Benjamin Franklin\'s political career was separate from his printing career.', right: 'They were inseparable. The press was his power base. He owned the colonies\' largest print operation and used it to shape revolutionary thought.' }
          ],
          extension: 'Pair students with one of the lesser-known figures (Charlotte Guillard, the Estienne family, Aldus Manutius). Have them research one figure and present a 5-minute biography to the class focused on what that person did that is invisible in standard histories.'
        },
        broadside: {
          standards: ['CCSS.ELA-Literacy.W.6-8.4', 'CCSS.ELA-Literacy.W.6-8.6', 'C3 Framework D4.7.6-8'],
          discussion: [
            'Common Sense sold 150,000 copies in 1776 in a colonial population of 2.5 million. What modern political pamphlet (or social media post) has had comparable impact? What do the comparisons reveal?',
            'The single-page broadside imposed real constraints (one side, one sheet, limited space). How did those constraints shape the writing? Are there modern formats with comparable constraints?',
            'A broadside had to grab attention from a passerby on a street. How is that different from writing for a captive audience (a textbook, a homework assignment)?'
          ],
          misconceptions: [
            { wrong: 'Broadsides were just advertisements.', right: 'They were a flexible format used for politics, ballads, religious tracts, news, and announcements. The modern poster is one descendant; the modern op-ed is another.' },
            { wrong: 'Mass political pamphleteering started in the 20th century.', right: 'The English Civil War (1640s), the American Revolution (1770s), and the French Revolution (1790s) were all driven by mass print. Pamphlets shaped events that shaped countries.' }
          ],
          extension: 'Have students design and print an actual broadside about a real issue at their school or in their community. Distribute. Observe what catches attention vs what gets ignored. Debrief on what makes a broadside work.'
        },
        sameFears: {
          standards: ['CCSS.ELA-Literacy.RH.6-8.2', 'C3 Framework D2.His.14.6-8', 'CASEL — Self-Awareness, Responsible Decision-Making', 'NCSS Theme 8 — Science, Technology, and Society'],
          discussion: [
            'Pick one 1450 fear about print and one 2026 fear about AI or social media. Are they the same fear in different clothes, or genuinely different concerns? Defend your answer.',
            'Print eventually developed quality-control institutions (editorial standards, copyright, peer review, libraries) that took ~150 years to mature. What equivalents do you think the internet and AI need, and how would we know they have arrived?',
            'When a parent or grandparent expresses concern about a new technology, how should you weigh their concern? Is the right frame "they don\'t understand," "they\'re right and we should listen," or something more careful?',
            'The module argues that "this new technology is uniquely bad" and "this new technology is uniquely good" are equally suspicious framings. Is there an actual technology you think breaks that rule (in either direction)?',
            'The Reformation killed 5-10 million Europeans. Print critics who feared mass-distributed religious dissent would cause violence were not wrong about that — they were wrong about whether the violence was the end of the story. Does this change how you think about modern critics who fear technology-enabled harms?'
          ],
          misconceptions: [
            { wrong: '"Moral panic" means the fear is silly and we should ignore it.', right: 'Moral panic is a specific pattern (vague civilizational decline, scapegoats a whole technology, assumes the worst about the next generation). But moral panics can be ABOUT real things. The label describes the shape of the argument, not whether the underlying concern has any validity.' },
            { wrong: 'Print critics were uniformly wrong and we should laugh at them.', right: 'Several were right — print DID cause religious wars, propaganda, and information overload. The honest reading is partial validity, with the response being institutional development rather than banning the technology.' },
            { wrong: 'Today\'s tech critics are uniformly wrong and we should laugh at them.', right: 'Same as above — some will be right, some wrong, and we cannot tell which from inside our own moment. Treat both "uniquely bad" and "uniquely good" framings as equally suspicious.' }
          ],
          extension: 'Have students interview a parent or grandparent about a technology they were worried about (TV, video games, smartphones, internet). Compare to the 1450 fears in this module. Where do the worries map? Where do they not? Write a 1-page essay arguing whether the worry was right, wrong, or partially both — with specific evidence.'
        },
        dayInShop: {
          standards: ['CCSS.ELA-Literacy.RH.6-8.2', 'C3 Framework D2.His.3.6-8 (perspectives)', 'C3 Framework D2.His.14.6-8 (causation)', 'CASEL — Responsible Decision-Making', 'NCSS Theme 4 — Individual Development and Identity'],
          discussion: [
            'You picked a role and made four decisions. Did your choices reflect what you would actually have done in 1455, or what you think a "good" answer is by modern values? Where do those diverge?',
            'Trade between the roles in your class. Compare the master\'s decisions to the apprentice\'s. Whose constraints were harder? Whose were more interesting?',
            'In several decisions there was a "lie-and-hope" option and a "speak-honestly" option. The historical record is full of both choices. What does that say about the difference between historical actors and historical heroes?',
            'The pamphlet-printing decision (master role) had asymmetric outcomes: high reward + possibly catastrophic risk. How do you think about decisions like that today? What modern parallels exist?',
            'In the journeyman compositor scenario, you could "silently correct" a misspelling. Modern textual criticism would call this an unauthorized edit. But many famous scholarly editions made exactly this choice. Where is the right line?'
          ],
          misconceptions: [
            { wrong: 'Historical actors had obvious right answers and were either heroes or villains.', right: 'They had real constraints and made tradeoffs we are still making versions of today. The "right" answer was rarely obvious from inside their moment.' },
            { wrong: 'A printer\'s job was just turning a screw.', right: 'A print shop had four distinct skilled trades (apprentice / compositor / pressman / master), each with multi-year training. The technical, social, and economic decisions in this module reflect what each role actually managed.' },
            { wrong: 'Loyalty and honesty are always the same thing.', right: 'Several decisions in this module pit them against each other (covering for a colleague vs reporting to the master). The historical record is full of both choices. Recognizing the tension is part of moral education.' }
          ],
          extension: 'After students complete the module once, have them try a different role. Then debrief in pairs: how did the SAME workshop look different from inside two different jobs? Optional advanced extension: have students write a journal entry "in character" describing their day from their role\'s point of view.'
        }
      };

      // ═════════════════════════════════════════════════════════════════════
      // VIEW DISPATCH
      // Each view is wrapped in _ViewWrapper with a unique key. React tracks
      // hooks per (component-type + key) instance — so each view gets its own
      // hook tracking, independent of every other view. Without this wrapper,
      // hooks called inside renderXxx() were charged to StemPluginBridge,
      // and hook count varying per view triggered "Rendered more/fewer hooks
      // than during the previous render" errors on navigation.
      // ═════════════════════════════════════════════════════════════════════
      var content;
      if (view === 'menu')                 content = h(_ViewWrapper, { key: 'menu',            _render: renderMenu });
      else if (view === 'pressMechanism')  content = h(_ViewWrapper, { key: 'pressMechanism',  _render: renderPressMechanism });
      else if (view === 'setType')         content = h(_ViewWrapper, { key: 'setType',         _render: renderSetType });
      else if (view === 'castingType')     content = h(_ViewWrapper, { key: 'castingType',     _render: renderCastingType });
      else if (view === 'economics')       content = h(_ViewWrapper, { key: 'economics',       _render: renderEconomics });
      else if (view === 'beforeAfter')     content = h(_ViewWrapper, { key: 'beforeAfter',     _render: renderBeforeAfter });
      else if (view === 'typographyToday') content = h(_ViewWrapper, { key: 'typographyToday', _render: renderTypographyToday });
      else if (view === 'people')          content = h(_ViewWrapper, { key: 'people',          _render: renderPeople });
      else if (view === 'broadside')       content = h(_ViewWrapper, { key: 'broadside',       _render: renderBroadside });
      else if (view === 'sameFears')       content = h(_ViewWrapper, { key: 'sameFears',       _render: renderSameFears });
      else if (view === 'dayInShop')       content = h(_ViewWrapper, { key: 'dayInShop',       _render: renderDayInShop });
      else if (view === 'cumulative')      content = h(_ViewWrapper, { key: 'cumulative',      _render: renderCumulative });
      else if (view === 'askPrinter')      content = h(_ViewWrapper, { key: 'askPrinter',      _render: renderAskPrinter });
      else if (view === 'resources')       content = h(_ViewWrapper, { key: 'resources',       _render: renderResources });
      else                                 content = h(_ViewWrapper, { key: 'menu',            _render: renderMenu });

      // Outer wrapper. Uses both 100% and 100vh as fallbacks because the
      // StemLab modal parent doesn't always have an explicit height — without
      // a viewport-anchored fallback, the dark T.bg only covers content
      // height, and the parent's lighter background shows through wherever
      // the tool doesn't fill. Also explicitly sets margin/padding to 0 on
      // outer container to defeat any inherited spacing.
      // Background is layered to evoke a 1450 print shop: a warm overhead
      // glow (oil-lamp / window light over the press), a recessed floor
      // shadow at the bottom, and a faint parchment grain (SVG turbulence)
      // over the base wood-brown. The grain is tiled and very low-opacity
      // so it reads as texture, not pattern. backgroundAttachment: fixed
      // keeps the lighting stable as the student scrolls.
      var paperGrainSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
          '<filter id="g">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>' +
            '<feColorMatrix values="0 0 0 0 0.35   0 0 0 0 0.27   0 0 0 0 0.16   0 0 0 0.10 0"/>' +
          '</filter>' +
          '<rect width="100%" height="100%" filter="url(#g)"/>' +
        '</svg>'
      );
      var bgLayers =
        'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(245, 215, 126, 0.10), transparent 70%), ' +
        'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(0, 0, 0, 0.35), transparent 75%), ' +
        'url("' + paperGrainSvg + '"), ' + T.bg;
      return h('div', { style: {
          background: bgLayers,
          backgroundRepeat: 'no-repeat, no-repeat, repeat, no-repeat',
          backgroundAttachment: 'fixed, fixed, scroll, scroll',
          minHeight: '100vh',
          height: '100%',
          margin: 0,
          color: T.text,
          fontFamily: 'Georgia, "Times New Roman", serif'
        } },
        h('div', { ref: _liveRef, 'aria-live': 'polite', 'aria-atomic': 'true',
          style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 } }),
        content,
        // ── Colophon footer ──
        // The period-typical end-of-page mark. 1450-era books closed every
        // section (and the whole work) with a colophon: printer's name, city,
        // year, often a fleuron mark and the word FINIS. Mirrors the
        // headpiece treatment in backBar() so every view is framed top-and-
        // bottom like a printed page. Skipped on the menu (which has its
        // own all-modules celebration banner at the top).
        view !== 'menu' && h('div', { 'aria-hidden': 'true', style: { maxWidth: 980, margin: '24px auto 28px', padding: '0 20px' } },
          // Inverse double rule (thin then thick) — bottom counterpart to
          // the headpiece's thick-then-thin double rule.
          h('div', { style: { height: 1, background: T.accent, opacity: 0.35, marginBottom: 2 } }),
          h('div', { style: { height: 1.5, background: T.accent, opacity: 0.55, marginBottom: 10 } }),
          // Centered FINIS row with flanking fleurons.
          h('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: T.accent } },
            h('span', { style: { display: 'inline-flex', alignItems: 'center', opacity: 0.7 } }, fleuron(10)),
            h('span', { style: { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 13, fontWeight: 700, color: T.accentHi, letterSpacing: '0.3em' } }, 'FINIS'),
            h('span', { style: { display: 'inline-flex', alignItems: 'center', opacity: 0.7 } }, fleuron(10))
          ),
          // Colophon credit line — period-style printer's mark.
          h('div', { style: { textAlign: 'center', fontSize: 11, color: T.dim, fontStyle: 'italic', marginTop: 6, fontFamily: 'Georgia, serif', lineHeight: 1.5 } },
            'Composed and pressed by hand at the AlloFlow PrintingPress · Mainz 1455 in spirit · MMXXVI')
        )
      );

      } catch (err) {
        console.error('[PrintingPress] render error', err);
        var React2 = (ctx && ctx.React) || window.React;
        if (!React2) return null;
        return React2.createElement('div', { style: { padding: 20, color: '#fde2e2', background: '#7f1d1d', borderRadius: 10, margin: 20 } },
          React2.createElement('strong', null, 'PrintingPress error: '),
          String(err && err.message || err)
        );
      }
    }
  });

})();

}
