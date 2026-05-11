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

  // Print stylesheet — teachers print modules as classroom handouts.
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
      '}'
    ].join('\n');
    if (document.head) document.head.appendChild(st);
  })();

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

      function sectionHeader(emoji, title) {
        return h('h3', { style: { margin: '18px 0 8px', fontSize: 15, color: T.accentHi, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Georgia, serif' } },
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
        var qIdxRaw = useState(0);
        var qIdx = qIdxRaw[0], setQIdx = qIdxRaw[1];
        var resultsRaw = useState({});
        var results = resultsRaw[0], setResults = resultsRaw[1];
        var done = qIdx >= questions.length;
        if (done) {
          var correct = Object.keys(results).filter(function(k) { return results[k] === true; }).length;
          var pct = Math.round((correct / questions.length) * 100);
          if (pct >= 80) {
            useEffect(function() {
              var bid = 'mod_' + modId;
              if (!badges[bid]) awardBadge(bid, 'Module: ' + modId);
            }, []);
          }
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

      function disclaimerFooter() {
        return h('div', { role: 'contentinfo',
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          'This tool models the press historically and pedagogically. For hands-on letterpress, visit the ',
          h('a', { href: 'https://www.printingmuseum.org/', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'International Printing Museum'),
          ' or a local letterpress studio. Letterpress is alive in 2026.'
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
        function renderTile(tile, emphasized) {
          var visited = !!modulesVisited[tile.id];
          var borderColor = visited ? T.ok : (emphasized ? T.accent : T.border);
          return h('button', { key: tile.id, role: 'listitem',
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
              borderStyle: 'solid'
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
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          // Hero
          h('div', { style: { background: 'linear-gradient(135deg, #2a1f15 0%, #1a1410 100%)', border: '2px solid ' + T.accent, borderRadius: 14, padding: 24, marginBottom: 18 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' } },
              h('h1', { style: { margin: 0, fontSize: 30, color: T.accentHi, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '0.02em' } }, '📜 PrintingPress'),
              h('span', { style: { fontSize: 12, color: T.muted },
                'aria-label': 'Modules visited: ' + Math.min(visitedCount, totalModules) + ' of ' + totalModules },
                Math.min(visitedCount, totalModules) + ' / ' + totalModules + ' modules')),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' } },
              'The Gutenberg press changed who could read, what could be known, and how fast an idea could travel. Pull the bar. Set the type. Then see the world it built.'),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 12, lineHeight: 1.5 } },
              'Interdisciplinary: engineering, materials science, history, economics, typography, civics. Sources cited inline.')
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
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'A working Gutenberg-style screw press. Each step is what a journeyman printer in 1450 would have done, in the same order, with the same tools. Click the action button to advance.'),

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
            h('div', { style: { background: T.cardAlt, border: '2px solid ' + (tourActive ? T.accent : T.border), borderRadius: 12, padding: 12, textAlign: 'center', transition: 'border-color 0.3s ease' } },
              h('svg', {
                width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 520, display: 'block', margin: '0 auto', background: '#2a1f15', borderRadius: 8 },
                role: 'img',
                'aria-label': 'Side view of a Gutenberg-style screw press in state: ' + pressState
              },
                // ── Wooden frame ──
                h('rect', { x: 60, y: 30, width: 25, height: 280, fill: T.wood, stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 395, y: 30, width: 25, height: 280, fill: T.wood, stroke: '#3d2914', strokeWidth: 2 }),
                h('rect', { x: 60, y: 30, width: 360, height: 20, fill: '#5a3a1f', stroke: '#3d2914', strokeWidth: 2 }),  // crossbeam top
                h('rect', { x: 60, y: 295, width: 360, height: 15, fill: '#5a3a1f', stroke: '#3d2914', strokeWidth: 2 }),  // base
                // Wood grain hint
                h('line', { x1: 65, y1: 80, x2: 80, y2: 80, stroke: '#3d2914', strokeWidth: 0.5, opacity: 0.5 }),
                h('line', { x1: 65, y1: 150, x2: 80, y2: 150, stroke: '#3d2914', strokeWidth: 0.5, opacity: 0.5 }),
                h('line', { x1: 65, y1: 220, x2: 80, y2: 220, stroke: '#3d2914', strokeWidth: 0.5, opacity: 0.5 }),
                h('line', { x1: 400, y1: 100, x2: 415, y2: 100, stroke: '#3d2914', strokeWidth: 0.5, opacity: 0.5 }),
                h('line', { x1: 400, y1: 200, x2: 415, y2: 200, stroke: '#3d2914', strokeWidth: 0.5, opacity: 0.5 }),

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

                // ── Platen (heavy flat block that comes down) — smooth descent
                h('rect', { x: 130, y: platenY, width: 220, height: platenH,
                  fill: '#7a5a2f', stroke: '#3d2914', strokeWidth: 2,
                  style: { transition: 'y 0.7s ease-in-out' } }),
                // Platen "boss" attaches to screw
                h('rect', { x: 220, y: platenY - 8, width: 40, height: 10,
                  fill: '#4a4a4a', stroke: '#2a2a2a', strokeWidth: 1,
                  style: { transition: 'y 0.7s ease-in-out' } }),

                // ── The bed (where the type forme sits) ──
                h('rect', { x: 110, y: 245, width: 260, height: 35, fill: '#3d2914', stroke: '#1a1410', strokeWidth: 2 }),
                // Type forme on the bed
                h('rect', { x: 140, y: 252, width: 200, height: 22,
                  fill: typeFilled ? T.ink : '#8a7a5a',
                  stroke: '#1a1410', strokeWidth: 1 }),
                // The phrase the press is set up to print. "FIAT LUX"
                // (Genesis 1:3, "Let there be light") is short, recognizably
                // Latin, and historically apt for a Gutenberg-era press —
                // first major use of movable type was the 42-line Bible.
                // If type filled, show suggestion of mirror-reversed letters
                // on the type forme (white on black ink, transform: scaleX(-1)).
                typeFilled && h('text', {
                  x: 240, y: 268,
                  textAnchor: 'middle',
                  fill: T.parchment, opacity: 0.45,
                  fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif',
                  letterSpacing: '0.1em',
                  transform: 'translate(480 0) scale(-1 1)'  // mirror-reversed, centered around x=240
                }, 'FIAT LUX'),

                // ── Paper (when laid) ──
                paperShown && h('rect', {
                  x: 138, y: paperPrinted ? 252 : 240,
                  width: 204, height: 26,
                  fill: T.parchment,
                  stroke: '#8a7a5a', strokeWidth: 1
                }),
                // Printed text on the paper — readable now (the type was
                // mirrored, so the impression flips and reads correctly)
                paperPrinted && h('text', {
                  x: 240, y: 270,
                  textAnchor: 'middle',
                  fill: T.ink,
                  fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif',
                  letterSpacing: '0.1em'
                }, 'FIAT LUX'),

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
        var PHRASE = 'IN PRINT';  // 8 chars including the space
        var stateRaw = useState({ slots: ['', '', '', '', '', '', '', ''], picked: null });
        var st = stateRaw[0], setSt = stateRaw[1];

        // Available type sorts (with one of each needed letter + a few distractors)
        var SORTS = ['I', 'N', ' ', 'P', 'R', 'I', 'N', 'T', 'A', 'E', 'O', 'T', 'S'];
        var solved = st.slots.join('') === PHRASE;

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
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'Each letter of metal type is a tiny mirror-image of the printed letter, set right-to-left in a composing stick. Pick a letter from the case, drop it in a slot. Build the phrase below.'),

          calloutBox('info', 'Why mirror-reversed?',
            'When the type presses against the paper, the image flips. So the type itself has to be a mirror image of what you want to print. (Look at the letter rendered on each sort below — it is the printable face.) Compositors in 1450 read type fluently mirror-reversed. It took years of apprenticeship.'),

          sectionHeader('🎯', 'Target phrase'),
          h('div', { style: { fontSize: 28, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, padding: '12px 16px', background: T.cardAlt, borderRadius: 8, border: '1px solid ' + T.border, textAlign: 'center' } },
            PHRASE),

          sectionHeader('📐', 'Composing stick'),
          h('div', { style: { display: 'flex', gap: 4, marginBottom: 12, padding: 12, background: T.cardAlt, border: '2px solid ' + T.wood, borderRadius: 8, justifyContent: 'center', flexWrap: 'wrap' } },
            st.slots.map(function(letter, i) {
              return h('button', { key: i,
                onClick: function() { letter ? clearSlot(i) : placeInSlot(i); },
                'aria-label': 'Slot ' + (i + 1) + (letter ? ': contains ' + letter + ' (click to remove)' : ': empty' + (st.picked !== null ? ' (click to place ' + SORTS[st.picked] + ')' : '')),
                style: {
                  width: 42, height: 56, borderRadius: 4,
                  background: letter ? T.ink : T.bg,
                  border: '2px solid ' + (letter ? T.accent : T.border),
                  color: T.parchment,
                  fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }
              }, letter || (st.picked !== null ? '⇣' : ''));
            })
          ),
          h('div', { style: { fontSize: 11, color: T.dim, textAlign: 'center', marginBottom: 14, fontStyle: 'italic' } },
            'Click a sort below to pick it up, then click a slot to drop it. Click a filled slot to remove it.'),

          sectionHeader('🗃️', 'Type case (available sorts)'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: 12, background: '#3d2914', border: '2px solid ' + T.wood, borderRadius: 8 } },
            SORTS.map(function(letter, i) {
              var picked = st.picked === i;
              // Mirror-reverse the letter for display (scaleX(-1))
              return h('button', { key: i,
                onClick: function() { setSt({ slots: st.slots, picked: picked ? null : i }); announce(picked ? 'Sort released' : 'Picked up ' + letter); },
                'aria-label': (picked ? 'Drop ' : 'Pick up ') + letter + ' (mirror-reversed type)',
                style: {
                  width: 42, height: 52, borderRadius: 3,
                  background: picked ? T.accentHi : '#5a4630',
                  border: '2px solid ' + (picked ? T.danger : '#3d2914'),
                  color: picked ? T.ink : T.parchment,
                  fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'scaleX(-1)'  // mirror-reversed, as real type is
                }
              }, letter === ' ' ? '·' : letter);
            })
          ),

          solved && calloutBox('ok', 'Set! Now you understand why apprenticeships were 7 years.',
            'A skilled compositor in 1450 could set ~1,000 characters per hour, mirror-reversed, from memory of where every letter in the case sat. Modern keyboard typists do ~12,000 characters per hour. The compositor was a craft profession that required years of training — and a press with a single bad compositor produced unreadable books.'),

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
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 3 — CASTING TYPE
      // ═════════════════════════════════════════════════════════════════════
      function renderCastingType() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🔥 Casting Type'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'Movable type is the heart of the printing press. Each "sort" (one piece of type for one letter) is a small metal block with a raised mirror-image letter on top. To print a book, you need thousands of identical sorts. Casting type is how you make them.'),

          sectionHeader('🛠️', 'The three-step process (Gutenberg\'s actual innovation)'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { step: '1. Punch', icon: '🔨', desc: 'A skilled punch-cutter carves a single letter, mirror-reversed, into the end of a hardened steel rod. This is the "punch." It takes hours per letter. Each font needs ~250 punches (uppercase, lowercase, numerals, punctuation, ligatures, accents).' },
              { step: '2. Matrix', icon: '⬜', desc: 'The steel punch is hammered into a softer copper bar, leaving a clean letter-shaped impression. This copper bar is the "matrix." One matrix can be used to cast thousands of identical type sorts.' },
              { step: '3. Cast', icon: '🪙', desc: 'A hand-held casting device clamps the matrix at the bottom. Molten type-metal alloy is poured in. It cools in seconds, you knock out the new sort, repeat. A skilled caster could make ~4,000 sorts in a day.' }
            ].map(function(s, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                  h('div', { style: { fontSize: 15, fontWeight: 700, color: T.accentHi, fontFamily: 'Georgia, serif' } }, s.step)),
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
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'The press did not just make books faster. It collapsed the cost-per-book by orders of magnitude over 150 years. That collapse is what made literacy mass instead of elite, and the Reformation, the scientific revolution, and the modern public possible.'),

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
            h('div', { style: { marginTop: 14, padding: 12, background: 'rgba(201,161,74,0.1)', borderRadius: 8, border: '1px solid ' + T.accent, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Speedup factor'),
              h('div', { style: { fontSize: 32, fontWeight: 800, color: T.accentHi, fontFamily: 'Georgia, serif' } }, speedup + '×'),
              h('div', { style: { fontSize: 12, color: T.muted, marginTop: 4 } },
                'The press is roughly ', h('strong', { style: { color: T.text } }, speedup + ' times faster'),
                ' than hand-copying for ' + copies + ' copies.'))
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
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 5 — BEFORE & AFTER
      // ═════════════════════════════════════════════════════════════════════
      function renderBeforeAfter() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('📜 Before & After'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'The press did not just print books. It restructured European intellectual life. Within 150 years it enabled the Reformation, the scientific revolution, vernacular literacy, the modern public sphere, and arguably the modern self.'),

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
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 6 — TYPOGRAPHY TODAY
      // ═════════════════════════════════════════════════════════════════════
      function renderTypographyToday() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🔤 Typography Today'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'Open any document on your laptop. Word, Google Docs, a text message. The vocabulary you see (font, leading, kerning, em-dash, justified, italic) is the vocabulary of a 1450 print shop. The medium changed; the language did not.'),

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
          disclaimerFooter()
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // MODULE 7 — THE PEOPLE BEHIND THE PRESS
      // ═════════════════════════════════════════════════════════════════════
      function renderPeople() {
        var PEOPLE = [
          { name: 'Johannes Gutenberg', dates: '~1400–1468', city: 'Mainz', role: 'Inventor (or perfecter) of European movable-type printing.',
            story: 'Goldsmith by training. The actual invention was a system: punch-cutting + matrix-casting + alloy + oil-based ink + screw press + paper handling, all working together. Gutenberg perfected each piece and integrated them. He died nearly bankrupt — financial control of his press passed to Fust and Schöffer years before the Bible was finished.' },
          { name: 'Johann Fust', dates: '~1400–1466', city: 'Mainz', role: 'Goldsmith and financier who funded — and then sued — Gutenberg.',
            story: 'Lent Gutenberg the equivalent of a small fortune to set up the press. When Gutenberg could not repay on schedule, Fust sued, won the lawsuit, and took possession of the press and most of the printed Bible inventory. Fust\'s name is on the colophon of subsequent books, not Gutenberg\'s. Without Fust\'s capital, the press would not have been built. Without his lawsuit, Gutenberg might not have been remembered as the inventor.' },
          { name: 'Peter Schöffer', dates: '~1425–1503', city: 'Mainz', role: 'Gutenberg\'s apprentice; later Fust\'s son-in-law and partner.',
            story: 'A skilled scribe before he came to Gutenberg. Schöffer is credited with major refinements to type design, and he ran the press after Fust took it over. The Mainz Psalter (1457), one of the most beautiful early printed books, bears Fust and Schöffer\'s names — making it the first book with a printer\'s colophon.' },
          { name: 'Aldus Manutius', dates: '1449–1515', city: 'Venice', role: 'Renaissance scholar-printer who invented the pocket book.',
            story: 'Founded the Aldine Press in 1494. Pioneered the small octavo format ("portable books"), commissioned italic type to fit more text per page, and printed Greek classics in beautiful, scholarly editions. The Aldine dolphin-and-anchor logo was widely counterfeited — the first piracy of a publisher\'s brand. Modern paperbacks descend from his portable formats.' },
          { name: 'Charlotte Guillard', dates: '~1485–1557', city: 'Paris', role: 'Printer and publisher; ran one of the largest Paris presses for ~30 years.',
            story: 'Inherited her husband\'s printing business in 1518 and ran it for nearly four decades. Specialized in scholarly Latin theology and law. Her shop produced over 150 substantial books — many with her own preface or note. One of dozens of women who ran European presses in the 16th-17th centuries; women printers were common but standard histories often left them out.' },
          { name: 'The Estienne family', dates: '1500s', city: 'Paris and Geneva', role: 'Multi-generational scholar-printers; produced reference standards still used today.',
            story: 'Henri Estienne, Robert Estienne, and Henri Estienne II produced the Latin Thesaurus and the Greek Thesaurus — reference works still cited as Estienne pagination 500 years later. Robert\'s 1551 Greek New Testament introduced the verse numbering still used in Bibles today.' },
          { name: 'Benjamin Franklin', dates: '1706–1790', city: 'Philadelphia', role: 'Printer, publisher, and revolutionary.',
            story: 'Apprenticed as a printer at age 12. Owned the print shop that produced Pennsylvania Gazette, Poor Richard\'s Almanack, and an enormous range of pamphlets including some of the most important American Revolutionary writing. The press shaped his political career; he ran the colonial postal service partly to distribute newspapers. The American Founding was a print revolution.' }
        ];

        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('👥 The People Behind the Press'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'The story of the press is usually told as Gutenberg, alone, with the Bible. The truth is messier and more interesting — financiers, apprentices, scholars, women printers, and revolutionary pamphleteers. Standard histories often left out who actually did the work.'),

          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            PEOPLE.map(function(p, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                  h('h4', { style: { margin: 0, fontSize: 17, color: T.accentHi, fontFamily: 'Georgia, serif', fontWeight: 700 } }, p.name),
                  h('span', { style: { fontSize: 11, color: T.dim } }, p.dates + ' · ' + p.city)),
                h('div', { style: { fontSize: 12, color: T.warn, fontStyle: 'italic', marginBottom: 8, fontWeight: 600 } }, p.role),
                h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6 } }, p.story)
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
            sample: 'CREW\n\nWe show up.\nWe do quality work.\nWe lift each other.\nWe leave the room\nbetter than we found it.' }
        ];

        var templateRaw = useState(0);
        var templateIdx = templateRaw[0], setTemplateIdx = templateRaw[1];
        var contentRaw = useState(TEMPLATES[0].sample);
        var content = contentRaw[0], setContent = contentRaw[1];
        var fontRaw = useState('Georgia');
        var font = fontRaw[0], setFont = fontRaw[1];
        var titleSizeRaw = useState(48);
        var titleSize = titleSizeRaw[0], setTitleSize = titleSizeRaw[1];

        function loadTemplate(i) {
          setTemplateIdx(i);
          setContent(TEMPLATES[i].sample);
        }

        var lines = content.split('\n');
        var titleLine = lines[0] || '';
        var bodyLines = lines.slice(1);

        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📰 Build a Broadside'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            'A "broadside" was a single-sheet print, often political, advertising, or poetic. Compose your own. Pick a template, customize the text, choose a font, and print it. (Yes, the 🖨️ Print button at the top really prints.)'),

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
              )
            )
          ),

          // ── Preview (this is what prints) ──
          h('div', { style: { background: T.parchment, color: T.ink, padding: 32, border: '2px solid ' + T.border, borderRadius: 6, minHeight: 480, fontFamily: font } },
            h('div', { style: { fontSize: titleSize, fontWeight: 800, textAlign: 'center', marginBottom: 16, lineHeight: 1.1, borderBottom: '3px double ' + T.ink, paddingBottom: 12, fontFamily: font } },
              titleLine || '(your title)'),
            bodyLines.map(function(line, i) {
              return h('div', { key: i, style: { fontSize: Math.max(14, titleSize / 3), lineHeight: 1.5, textAlign: 'center', marginBottom: 6, fontFamily: font } },
                line || h('span', { style: { color: 'transparent' } }, '·'));
            }),
            h('div', { style: { marginTop: 24, fontSize: 10, textAlign: 'center', color: '#5c4630', fontStyle: 'italic', borderTop: '1px solid ' + T.border, paddingTop: 8 } },
              'Composed in PrintingPress · ' + new Date().toLocaleDateString())
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
        if (done) {
          var pct = Math.round((st.score / CUMULATIVE_QUESTIONS.length) * 100);
          var earned = pct >= 80;
          if (earned && !badges['cumulative_pass']) {
            useEffect(function() { awardBadge('cumulative_pass', 'Master Printer'); }, []);
          }
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
              h('h2', { style: { margin: '0 0 8px', fontSize: 22, fontFamily: 'Georgia, serif' } }, earned ? 'Master Printer' : 'Apprentice — review recommended'),
              h('p', { style: { margin: '0 0 14px', fontSize: 16 } },
                'Score: ', h('strong', null, st.score + ' / ' + CUMULATIVE_QUESTIONS.length + ' (' + pct + '%)')),
              h('p', { style: { margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                earned
                  ? 'You\'ve traveled the press — its mechanism, its materials, its economics, its impact. The history of how knowledge spreads now lives in your head.'
                  : 'Below 80% on the cumulative quiz means there are concepts worth revisiting. The cards below show exactly what you missed and where to review.'),
              h('div', { className: 'printingpress-no-print', style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { onClick: function() {
                  upd('bigQuizState', { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} });
                }, style: btn({ padding: '8px 14px', fontSize: 13 }) }, 'Retake quiz'),
                h('button', { onClick: function() { upd('view', 'menu'); }, style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) }, '← Back to menu')
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
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('🎯 Cumulative PrintingPress Quiz'),
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
            'Question ', h('strong', null, st.idx + 1), ' of ' + CUMULATIVE_QUESTIONS.length,
            ' · score ', h('strong', null, st.score)),
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
        var groups = [
          { name: 'See a working press', items: [
            { label: 'International Printing Museum (Carson, CA) — Working Gutenberg replica + tours', url: 'https://www.printingmuseum.org/' },
            { label: 'Gutenberg Museum (Mainz, Germany) — Original Bibles + working presses', url: 'https://www.gutenberg-museum.de/en' },
            { label: 'Smithsonian — Graphic Arts Collection', url: 'https://www.si.edu/spotlight/printing' },
            { label: 'Briar Press — Find a letterpress shop near you', url: 'https://www.briarpress.org/' }
          ] },
          { name: 'Primary sources online', items: [
            { label: 'British Library — Gutenberg Bible (full digital facsimile)', url: 'https://www.bl.uk/treasures/gutenberg/homepage.html' },
            { label: 'Library of Congress — Pre-1800 American Imprints', url: 'https://www.loc.gov/' },
            { label: 'Bodleian Library — Broadside Ballads', url: 'https://ballads.bodleian.ox.ac.uk/' },
            { label: 'Cheongju Early Printing Museum (Korea) — Jikji (1377, oldest extant metal movable-type book)', url: 'https://www.cjcityart.or.kr/' }
          ] },
          { name: 'Scholarship', items: [
            { label: 'Elizabeth Eisenstein, "The Printing Press as an Agent of Change" (1980) — the foundational scholarly account' },
            { label: 'Adrian Johns, "The Nature of the Book: Print and Knowledge in the Making" (1998)' },
            { label: 'Andrew Pettegree, "The Book in the Renaissance" (2010)', url: 'https://yalebooks.yale.edu/book/9780300178210/the-book-in-the-renaissance/' },
            { label: 'Eltjo Buringh & Jan Luiten van Zanden — Book production data 800-1800', url: 'https://www.jstor.org/stable/40208712' }
          ] },
          { name: 'Typography', items: [
            { label: 'Robert Bringhurst, "The Elements of Typographic Style" (4th ed., 2013) — the standard reference' },
            { label: 'Marshall McLuhan, "The Gutenberg Galaxy" (1962)' },
            { label: 'Type@Cooper — Typography history and education', url: 'https://typecooper.com/' }
          ] },
          { name: 'Recovering women printers', items: [
            { label: 'Susan Broomhall — Work on women in early modern French print' },
            { label: 'Helwi Blom — Recent scholarship on women printers in early modern Europe' },
            { label: 'Library of Congress — Charlotte Guillard biography', url: 'https://www.bnf.fr/' }
          ] }
        ];
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Every museum, library, and book cited in this lab. If you are within driving distance of one of the working-press museums, go. Holding a 30-pound platen and pulling the bar yourself is a different category of understanding than reading about it.'),
          groups.map(function(g, gi) {
            return h('div', { key: gi, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 12 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi, fontFamily: 'Georgia, serif' } }, g.name),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 } },
                g.items.map(function(it, ii) {
                  return h('li', { key: ii },
                    it.url ? h('a', { href: it.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, it.label) : it.label
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
      // ═════════════════════════════════════════════════════════════════════
      var content;
      if (view === 'menu') content = renderMenu();
      else if (view === 'pressMechanism') content = renderPressMechanism();
      else if (view === 'setType') content = renderSetType();
      else if (view === 'castingType') content = renderCastingType();
      else if (view === 'economics') content = renderEconomics();
      else if (view === 'beforeAfter') content = renderBeforeAfter();
      else if (view === 'typographyToday') content = renderTypographyToday();
      else if (view === 'people') content = renderPeople();
      else if (view === 'broadside') content = renderBroadside();
      else if (view === 'cumulative') content = renderCumulative();
      else if (view === 'askPrinter') content = renderAskPrinter();
      else if (view === 'resources') content = renderResources();
      else content = renderMenu();

      return h('div', { style: { background: T.bg, minHeight: '100%', color: T.text, fontFamily: 'Georgia, "Times New Roman", serif' } },
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
