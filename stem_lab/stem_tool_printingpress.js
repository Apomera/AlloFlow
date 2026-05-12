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
      '@keyframes printingpress-pulse-glow {',
      '  0%, 100% { box-shadow: 0 0 0 0 rgba(245,215,126,0.45), 0 0 12px rgba(201,161,74,0.3); }',
      '  50%      { box-shadow: 0 0 0 6px rgba(245,215,126,0.15), 0 0 22px rgba(201,161,74,0.55); }',
      '}',
      '.printingpress-tour-active {',
      '  animation: printingpress-pulse-glow 1.6s ease-in-out infinite;',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .printingpress-tile { animation: none !important; opacity: 1 !important; transform: none !important; }',
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
        return h('div', { className: 'printingpress-back-bar', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', {
            className: 'printingpress-no-print',
            'aria-label': 'Back to PrintingPress menu',
            onClick: function() { upd('view', 'menu'); announce('Back to menu'); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, '← Menu'),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text, flex: 1, fontFamily: 'Georgia, serif' } }, title),
          h('button', {
            className: 'printingpress-no-print',
            'aria-label': 'Print this module as a classroom handout',
            onClick: function() { try { window.print(); } catch (_) {} },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, '🖨️ Print')
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
                          { id: 'beforeAfter', hook: 'See real broadsides from history — Common Sense, ballads, notices.' }]
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
        { id: 'cumulative', icon: '🎯', label: 'Cumulative Quiz', section: 'practice',
          desc: '12 questions across the modules. Missed answers link you back to the module you need to review.', ready: true },
        { id: 'askPrinter', icon: '🤖', label: 'Ask the Printer (AI)', section: 'practice',
          desc: 'Ask any printing-press question; the AI returns a sourced answer. Educational only.', ready: true },
        { id: 'resources', icon: '📚', label: 'Resources', section: 'resources',
          desc: 'Every org cited in this tool, plus museum and primary-source links.', ready: true }
      ];

      var MENU_SECTIONS = [
        { id: 'start',     label: 'Start here',       emoji: '⭐', blurb: 'The interactive tiles. Pull the press bar, set your own type. The demo gold.', accent: T.accent, emphasized: true },
        { id: 'modules',   label: 'Modules',          emoji: '📖', blurb: 'The history, materials, economics, and people. Take in any order.', accent: T.accent },
        { id: 'practice',  label: 'Practice and ask', emoji: '🎯', blurb: 'Test what you know, or ask the AI printer.', accent: T.accent },
        { id: 'resources', label: 'Resources',        emoji: '📚', blurb: 'Museums, scholarship, and where to see a working press today.', accent: T.accent }
      ];

      var MODULE_LABELS = {
        pressMechanism: 'The Press Mechanism',
        setType: 'Set Your Own Type',
        castingType: 'Casting Type',
        economics: 'Print Run Economics',
        beforeAfter: 'Before & After',
        typographyToday: 'Typography Today',
        people: 'The People Behind the Press',
        broadside: 'Build a Broadside'
      };

      function renderMenu() {
        var visitedCount = Object.keys(modulesVisited).length;
        var totalModules = 8;
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
              background: emphasized ? T.cardAlt : T.card,
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
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: sec.blurb ? 4 : 8, flexWrap: 'wrap' } },
                h('h3', { style: { margin: 0, fontSize: 15, color: sec.emphasized ? sec.accent : T.accentHi, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, fontFamily: 'Georgia, serif' } },
                  h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, sec.emoji),
                  sec.label)
              ),
              sec.blurb && h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.5 } }, sec.blurb),
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
            setCount(count + 1);
            if (count + 1 === 1) awardBadge('first_impression', 'First Impression');
            if (count + 1 >= 5) awardBadge('journeyman', 'Journeyman Printer');
            announce('Step 6: Impression complete. ' + (count + 1) + ' total. The paper bears the printed text.');
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
                style: { background: T.cardAlt, border: '2px solid ' + (tourActive ? T.accent : T.border), borderRadius: 12, padding: 12, textAlign: 'center', transition: 'border-color 0.3s ease' } },
              h('svg', {
                width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 520, display: 'block', margin: '0 auto', background: '#2a1f15', borderRadius: 8 },
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
                  )
                ),
                // ── Wooden frame ── (now using wood-grain patterns for richness)
                h('rect', { x: 60, y: 30, width: 25, height: 280, fill: 'url(#pp-woodgrain)', stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 395, y: 30, width: 25, height: 280, fill: 'url(#pp-woodgrain)', stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 60, y: 30, width: 360, height: 20, fill: 'url(#pp-woodgrain-horizontal)', stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 60, y: 295, width: 360, height: 15, fill: 'url(#pp-woodgrain-horizontal)', stroke: '#3d2914', strokeWidth: 2 }),

                // ── Screw + nut ──
                // Smooth height transition gives the descending screw shaft a real "lowering" feel
                h('rect', { x: 220, y: 50, width: 40, height: screwY - 50, fill: '#4a4a4a', stroke: '#2a2a2a', strokeWidth: 1, style: { transition: 'height 0.7s ease-in-out' } }),
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
                // Screw "nut" (where the bar enters) — also smoothly transitions
                h('circle', { cx: 240, cy: screwY, r: 26, fill: '#6a6a6a', stroke: '#2a2a2a', strokeWidth: 2, style: { transition: 'cy 0.7s ease-in-out' } }),
                h('circle', { cx: 240, cy: screwY, r: 18, fill: '#4a4a4a', stroke: '#2a2a2a', strokeWidth: 1, style: { transition: 'cy 0.7s ease-in-out' } }),

                // ── The bar (handle to turn the screw) — animated rotation
                h('g', { transform: 'translate(240, ' + screwY + ') rotate(' + screwRot + ')',
                  style: { transition: 'transform 0.7s ease-in-out', transformOrigin: '240px ' + screwY + 'px' } },
                  h('rect', { x: -80, y: -6, width: 160, height: 12, rx: 6, fill: T.wood, stroke: '#3d2914', strokeWidth: 1.5 }),
                  h('circle', { cx: -75, cy: 0, r: 9, fill: '#3d2914' }),  // handle ball
                  h('circle', { cx: 75, cy: 0, r: 9, fill: '#3d2914' })
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
                // Type forme on the bed
                h('rect', { x: 140, y: 252, width: 200, height: 22,
                  fill: typeFilled ? T.ink : '#8a7a5a',
                  stroke: '#1a1410', strokeWidth: 1 }),
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
                paperShown && h('rect', {
                  x: 138, y: paperPrinted ? 252 : 240,
                  width: 204, height: 26,
                  fill: T.parchment,
                  stroke: '#8a7a5a', strokeWidth: 1
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
                  letterSpacing: '0.1em'
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
                // ── Ink balls — active inking (dab and lift) ──
                pressState === 'inking' && (function() {
                  // Two leather-and-wool ink balls dab in and out
                  var leftX = 150 + Math.sin(inkAnim * Math.PI * 4) * 8;
                  var rightX = 330 - Math.sin(inkAnim * Math.PI * 4) * 8;
                  var ballY = 248 + Math.abs(Math.sin(inkAnim * Math.PI * 8)) * 12;
                  return h('g', null,
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
            hint: 'This challenge includes a "fi" ligature — a single sort that prints both letters joined. Look for the special joined sort in the case.' }
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
        // Display helper: render the ligature placeholder as "fi"
        function displayChar(c) { return c === '' ? 'fi' : c; }

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

          // ── Challenge picker ──
          h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
            CHALLENGES.map(function(ch, i) {
              return h('button', { key: i,
                onClick: function() { setChallengeIdx(i); announce('Loaded ' + ch.label); },
                style: i === challengeIdx ? btnPrimary({ padding: '6px 12px', fontSize: 12 }) : btn({ padding: '6px 12px', fontSize: 12 })
              }, ch.label);
            })
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
          // Type case: layered horizontal-grain wood texture using CSS
          // gradients (no SVG needed since this is a div). Repeating linear
          // gradients give the wood a planked-and-grained feel; the inset
          // shadow at the top-left + bottom-right adds depth like a real
          // wooden box hollow filled with metal sorts.
          h('div', { style: {
              display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: 12,
              background: 'repeating-linear-gradient(180deg, #3d2914 0px, #4a3018 1px, #3d2914 3px, #382414 5px, #3d2914 8px), linear-gradient(135deg, #4a3018 0%, #2a1c0e 100%)',
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

          solved && calloutBox('ok', 'Set! Now you understand why apprenticeships were 7 years.',
            'A skilled compositor in 1450 could set ~1,000 characters per hour, mirror-reversed, from memory of where every letter in the case sat. Modern keyboard typists do ~12,000 characters per hour. The compositor was a craft profession that required years of training — and a press with a single bad compositor produced unreadable books.'),

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
              // RIGHT: paper (readable when printed)
              h('div', null,
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
                  transition: 'all 0.5s ease-in-out',
                  minHeight: 22
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
                    // Copper bar (matrix)
                    h('rect', { x: 30, y: 40, width: 140, height: 40, fill: '#b87333', stroke: '#7c4f1f', strokeWidth: 1.5 }),
                    h('rect', { x: 30, y: 40, width: 140, height: 4, fill: '#d4914f' }),  // top highlight
                    // Letter impression carved into the copper (recessed, dark)
                    h('text', { x: 100, y: 70, textAnchor: 'middle', fill: '#5c2f0e', fontSize: 24, fontWeight: 800, fontFamily: 'Georgia, serif', transform: 'translate(200 0) scale(-1 1)' }, 'A'),
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
              h('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 } },
                h('svg', { width: 110, height: 110, viewBox: '0 0 110 110', 'aria-hidden': 'true',
                  style: { display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' } },
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
          { year: 1785, title: 'Falmouth Gazette and Weekly Advertiser', who: 'Thomas Wait + Benjamin Titcomb, Falmouth (now Portland), MA',
            why: 'The first newspaper in what would become Maine — published in Falmouth, the town that would be renamed Portland in 1786. Maine was still part of Massachusetts; the Falmouth Gazette helped build the political case for separate statehood, achieved 35 years later in 1820. King Middle stands less than two miles from where this press operated.',
            url: 'https://www.maine.gov/portal/government/state_history.html' },
          { year: 1827, title: 'Cherokee Phoenix (Cherokee syllabary in print)', who: 'Sequoyah + Elias Boudinot',
            why: 'Sequoyah\'s 86-character Cherokee syllabary made literacy spread among the Cherokee Nation faster than literacy had ever spread anywhere. Print + a writing system designed for the language unlocked mass literacy in a generation.',
            url: 'https://www.loc.gov/item/sn83025118/' },
          { year: 1830, title: 'Steam-powered cylinder press', who: 'Friedrich Koenig (earlier 1814 with The Times of London)',
            why: 'By 1830 the steam press had taken over major newspapers. Production jumped from ~250 impressions per day (Gutenberg-era) to ~1,000 per HOUR. The penny press became economically viable and mass-market journalism began.' },
          { year: 1851, title: 'Uncle Tom\'s Cabin', who: 'Harriet Beecher Stowe, Brunswick, Maine',
            why: 'Stowe wrote it in Brunswick, Maine, while her husband taught at Bowdoin College. Serialized in The National Era, then 300,000 copies in its first US year as a book — the most-printed novel of the 19th century. Lincoln allegedly told Stowe she was "the little woman who started this great war." A Maine kitchen produced one of the most consequential books in American history.',
            url: 'https://www.bowdoin.edu/sites/harriet-beecher-stowe-house/' }
        ];
        var minYear = 1370, maxYear = 1860;
        function yearToPct(y) { return ((y - minYear) / (maxYear - minYear)) * 100; }
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('📜 Before & After'),
          dropCapPara('The press did not just print books. It restructured European intellectual life. Within 150 years it enabled the Reformation, the scientific revolution, vernacular literacy, the modern public sphere, and arguably the modern self.'),

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
              // Event markers
              PRINT_EVENTS.map(function(ev, i) {
                var isSelected = selectedEvent === i;
                return h('button', { key: i,
                  className: 'printingpress-no-print',
                  onClick: function() { setSelectedEvent(isSelected ? null : i); announce(ev.year + ' ' + ev.title); },
                  'aria-label': ev.year + ' · ' + ev.title + ' · click for details',
                  'aria-expanded': isSelected,
                  style: {
                    position: 'absolute',
                    left: yearToPct(ev.year) + '%',
                    top: 22,
                    transform: 'translateX(-50%)',
                    width: 22, height: 22,
                    borderRadius: '50%',
                    border: '2px solid ' + (isSelected ? T.danger : T.accent),
                    background: isSelected ? T.danger : T.accentHi,
                    color: T.ink,
                    cursor: 'pointer',
                    fontSize: 11, fontWeight: 800,
                    padding: 0,
                    boxShadow: isSelected ? '0 0 0 4px rgba(196,69,54,0.35), 0 2px 6px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.4)',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Georgia, serif',
                    zIndex: isSelected ? 10 : 1
                  }
                }, '·');
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
          calloutBox('info', 'Mark Twain on Gutenberg (apocryphally attributed)',
            '"What the world is today, good and bad, it owes to Gutenberg. Everything can be traced to this source." Whether or not Twain actually said it, the structural argument holds: the Reformation required mass print. The Reformation broke the religious monopoly of one institution. Most modern political philosophy follows from that break.'),

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

          calloutBox('info', 'Movable type as the first discrete-symbol information system',
            'Computer scientists sometimes argue that movable type was the world\'s first true discrete information system. Each sort is a discrete symbol. Each character position is addressable. The forme is a 2D array of symbols. Print is a copy operation. The same conceptual structure shows up 500 years later in ASCII, Unicode, and digital text. Marshall McLuhan made this case explicitly in "The Gutenberg Galaxy" (1962).'),

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
                  // The silhouette itself, positioned inside the oval
                  h('div', { style: { position: 'relative', textAlign: 'center', paddingTop: 6 } },
                    silhouette ? silhouette() : null
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
            sample: 'NOTICE\n\nLost on the road\nbetween Portland\nand Falmouth\non the 8th day\nof May:\n\nA bay mare,\nfourteen hands,\nwhite blaze on forehead.\n\nReward of one dollar\nfor return to\nthe printer of\nthis sheet.' }
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
          return null;
        }

        var BORDER_OPTIONS = [
          { id: 'none', label: 'None' },
          { id: 'simple', label: 'Double rule' },
          { id: 'classical', label: 'Classical (corner fleurons)' },
          { id: 'ornate', label: 'Ornate (full fleuron chain)' }
        ];

        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📰 Build a Broadside'),
          dropCapPara('A "broadside" was a single-sheet print, often political, advertising, or poetic. Compose your own. Pick a template, customize the text, choose a font, and print it. (Yes, the 🖨️ Print button at the top really prints.)'),

          // ── Editor ──
          h('div', { className: 'printingpress-no-print', style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
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
          h('div', { style: {
              position: 'relative',
              background: 'radial-gradient(ellipse at 8% 12%, rgba(180,140,80,0.18) 0%, transparent 30%), radial-gradient(ellipse at 92% 88%, rgba(180,140,80,0.18) 0%, transparent 30%), radial-gradient(ellipse at 92% 12%, rgba(180,140,80,0.10) 0%, transparent 25%), radial-gradient(ellipse at 8% 88%, rgba(180,140,80,0.10) 0%, transparent 25%), ' + T.parchment,
              color: T.ink, padding: 36, border: '2px solid ' + T.border, borderRadius: 6, minHeight: 480, fontFamily: font, overflow: 'hidden',
              boxShadow: 'inset 0 0 30px rgba(120,90,40,0.08)'
            } },
            // Border decoration overlay (behind text)
            renderBorder(borderStyle),
            // Content (positioned above border via z-index inheritance)
            h('div', { style: { position: 'relative', zIndex: 1 } },
              h('div', { style: { fontSize: titleSize, fontWeight: 800, textAlign: 'center', marginBottom: 16, lineHeight: 1.1, borderBottom: '3px double ' + T.ink, paddingBottom: 12, fontFamily: font } },
                titleLine || '(your title)'),
              bodyLines.map(function(line, i) {
                return h('div', { key: i, style: { fontSize: Math.max(14, titleSize / 3), lineHeight: 1.5, textAlign: 'center', marginBottom: 6, fontFamily: font } },
                  line || h('span', { style: { color: 'transparent' } }, '·'));
              }),
              h('div', { style: { marginTop: 24, fontSize: 10, textAlign: 'center', color: '#5c4630', fontStyle: 'italic', borderTop: '1px solid ' + T.border, paddingTop: 8 } },
                'Composed in PrintingPress · ' + new Date().toLocaleDateString())
            )
          ),

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
      // CUMULATIVE QUIZ — 12 questions across all 8 modules
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
        { module: 'broadside', q: 'About how many copies of Thomas Paine\'s "Common Sense" sold in the American colonies in 1776?', opts: ['About 1,000', 'About 10,000', 'About 150,000', 'About 1 million'], ans: 2, explain: '~150,000 copies in a colonial population of ~2.5 million. Per capita, one of the best-selling political pamphlets in American history. The Revolution was a print event as much as a military one.' }
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
                h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: earned ? 16 : 0 } },
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

        return h('div', { style: { padding: 20, maxWidth: 760, margin: '0 auto', color: T.text } },
          backBar('🤖 Ask the Printer (AI)'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'Type any printing-press question. The AI grounds its answer in the same sources cited throughout this lab. ',
            h('strong', null, 'Educational only.')),
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
      return h('div', { style: {
          background: T.bg,
          minHeight: '100vh',
          height: '100%',
          margin: 0,
          color: T.text,
          fontFamily: 'Georgia, "Times New Roman", serif'
        } },
        h('div', { ref: _liveRef, 'aria-live': 'polite', 'aria-atomic': 'true',
          style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 } }),
        content
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
