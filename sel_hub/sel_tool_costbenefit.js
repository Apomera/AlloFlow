// ═══════════════════════════════════════════════════════════════
// sel_tool_costbenefit.js — Cost-Benefit Analysis Grid
// A 2x2 decision-making grid from Dialectical Behavior Therapy
// (DBT, Linehan). Rows: Short-term vs Long-term. Columns: Pros vs
// Cons. Used for decisions under emotional pressure to widen the
// frame beyond the immediate impulse.
// Registered tool ID: "costBenefit"
// Category: inner-work
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('costBenefit'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-costbenefit')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-costbenefit';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The four cells of the grid.
  var CELLS = [
    { id: 'stPros', label: 'Short-term PROS',  axisX: 'pros', axisY: 'st', color: '#22c55e', icon: '✅',
      blurb: 'What\'s good about it right now? What does it give me in the next hour, day, week?' },
    { id: 'stCons', label: 'Short-term CONS',  axisX: 'cons', axisY: 'st', color: '#f59e0b', icon: '⚠️',
      blurb: 'What\'s the downside right now? What does it cost me in the next hour, day, week?' },
    { id: 'ltPros', label: 'Long-term PROS',   axisX: 'pros', axisY: 'lt', color: '#16a34a', icon: '🌳',
      blurb: 'What\'s good about it long-term? What does it give me over months and years?' },
    { id: 'ltCons', label: 'Long-term CONS',   axisX: 'cons', axisY: 'lt', color: '#dc2626', icon: '🚩',
      blurb: 'What\'s the cost long-term? What might this cost me over months and years?' }
  ];

  function defaultState() {
    return {
      view: 'grid',
      decision: '',
      cells: { stPros: [], stCons: [], ltPros: [], ltCons: [] },
      finalChoice: '',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('costBenefit', {
    icon: '⚖️',
    label: 'Cost-Benefit Grid',
    desc: 'A 2x2 decision-making grid from Dialectical Behavior Therapy (DBT). Short-term and long-term pros and cons of a decision, side by side. Useful when emotion is pushing for one option and you want to widen the frame before deciding. Foundational DBT tool (Linehan).',
    color: 'purple',
    category: 'inner-work',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.costBenefit || defaultState();
      function setCB(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.costBenefit) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.cells || patch.decision !== undefined || patch.finalChoice !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { costBenefit: next });
        });
      }
      var view = d.view || 'grid';
      function goto(v) { setCB({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#c4b5fd', fontSize: 22, fontWeight: 900 } }, '⚖️ Cost-Benefit Grid'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A 2x2 decision-making grid for when emotion is pushing one direction.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'grid', label: 'My grid', icon: '⚖️' },
          { id: 'edit', label: 'Edit', icon: '✏️' },
          { id: 'reflect', label: 'Decide', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Cost-Benefit Grid sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#a78bfa' : '#334155'),
                background: active ? 'rgba(167,139,250,0.18)' : '#1e293b',
                color: active ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This is a structured deliberation tool, not a magic answer machine. If a decision feels too heavy to make alone, that is information; bring it to a counselor or trusted adult. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // GRID — visual 2x2
      // ═══════════════════════════════════════════════════════════
      function renderGrid() {
        var cells = d.cells || { stPros: [], stCons: [], ltPros: [], ltCons: [] };
        var hasAny = Object.keys(cells).some(function(k) { return (cells[k] || []).length > 0; });

        if (!hasAny && !d.decision) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(167,139,250,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '⚖️'),
              h('h3', { style: { margin: '0 0 8px', color: '#e9d5ff', fontSize: 18 } }, 'Your grid is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'Name the decision you are wrestling with. Then list the pros and cons in two time horizons: short-term (the next day or week) and long-term (months and years). The 2x2 frame is built to surface what the short-term impulse leaves out.'),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Start the grid',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start the grid')
            ),
            softPointer()
          );
        }

        return h('div', null,
          // Decision header
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a78bfa', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'The decision'),
            h('div', { style: { fontSize: 18, color: '#e9d5ff', fontWeight: 800, lineHeight: 1.4 } }, d.decision || '(not named yet)')
          ),

          // The 2x2 grid
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 } },
            CELLS.map(function(cell) {
              var items = cells[cell.id] || [];
              return h('div', { key: cell.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + cell.color, minHeight: 140 } },
                h('div', { style: { fontSize: 11, color: cell.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, cell.icon + ' ' + cell.label),
                items.length > 0
                  ? h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.55 } },
                      items.map(function(it, i) { return h('li', { key: i, style: { marginBottom: 3 } }, it); }))
                  : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(nothing here)')
              );
            })
          ),

          d.finalChoice ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'My decision'),
            h('div', { style: { fontSize: 14, color: '#e9d5ff', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.finalChoice)
          ) : null,

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Edit grid',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✏️ Edit'),
            h('button', { onClick: function() { goto('reflect'); }, 'aria-label': 'Make the decision',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Decide'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        var cells = d.cells || { stPros: [], stCons: [], ltPros: [], ltCons: [] };
        function addItem(cellId, value) {
          if (!value || !value.trim()) return;
          var nx = Object.assign({}, cells);
          nx[cellId] = (nx[cellId] || []).slice();
          nx[cellId].push(value.trim());
          setCB({ cells: nx });
        }
        function removeItem(cellId, idx) {
          var nx = Object.assign({}, cells);
          nx[cellId] = (nx[cellId] || []).slice();
          nx[cellId].splice(idx, 1);
          setCB({ cells: nx });
        }

        return h('div', null,
          // Decision input
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('label', { htmlFor: 'cb-decision', style: { display: 'block', fontSize: 12, color: '#a78bfa', fontWeight: 800, marginBottom: 6 } }, 'What decision am I weighing?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 } }, 'Name it as concretely as you can. "Should I drop band class?" is more useful than "should I change my schedule?"'),
            h('input', { id: 'cb-decision', type: 'text', value: d.decision || '',
              placeholder: 'e.g. Should I tell my parents about [the thing]?',
              onChange: function(e) { setCB({ decision: e.target.value }); },
              style: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit' } })
          ),

          // 4 cells as editors
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 } },
            CELLS.map(function(cell) {
              var items = cells[cell.id] || [];
              var inputId = 'cb-input-' + cell.id;
              function submit() {
                var el = document.getElementById(inputId);
                if (!el || !el.value.trim()) return;
                addItem(cell.id, el.value);
                el.value = '';
              }
              return h('div', { key: cell.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + cell.color } },
                h('div', { style: { fontSize: 13, color: cell.color, fontWeight: 800, marginBottom: 6 } }, cell.icon + ' ' + cell.label),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic', lineHeight: 1.5 } }, cell.blurb),

                items.length > 0 ? h('div', { style: { marginBottom: 10 } },
                  items.map(function(it, i) {
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 6, borderRadius: 4, background: '#1e293b', marginBottom: 4 } },
                      h('span', { style: { flex: 1, fontSize: 12.5, color: '#e2e8f0' } }, it),
                      h('button', { onClick: function() { removeItem(cell.id, i); }, 'aria-label': 'Remove',
                        style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10 } }, '✕')
                    );
                  })
                ) : null,

                h('div', { style: { display: 'flex', gap: 4 } },
                  h('label', { htmlFor: inputId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to ' + cell.label),
                  h('input', { id: inputId, type: 'text', placeholder: 'Add...',
                    onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                    style: { flex: 1, padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5 } }),
                  h('button', { onClick: submit, 'aria-label': 'Add',
                    style: { padding: '6px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', background: cell.color, color: '#fff', fontWeight: 700, fontSize: 11 } }, '+')
                )
              );
            })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT / DECIDE
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var cells = d.cells || {};
        var stPros = (cells.stPros || []).length;
        var stCons = (cells.stCons || []).length;
        var ltPros = (cells.ltPros || []).length;
        var ltCons = (cells.ltCons || []).length;

        function setFinal(val) { setCB({ finalChoice: val }); }

        var imbalance = null;
        if (stPros > 0 && ltCons > 0 && (stPros + ltCons) > (stCons + ltPros)) {
          imbalance = 'Your grid is heavier with short-term pros and long-term cons. That is the classic shape of an emotional impulse: it feels good now, costs you later. Worth pausing.';
        } else if (stCons > 0 && ltPros > 0 && (stCons + ltPros) > (stPros + ltCons)) {
          imbalance = 'Your grid is heavier with short-term cons and long-term pros. That is the classic shape of "the hard right thing." Uncomfortable now, worth it later.';
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.65 } },
            h('strong', null, '💭 The point of the 2x2: '),
            'Most bad decisions come from looking only at the short-term row. Most over-cautious decisions come from looking only at the long-term row. The whole grid asks you to hold all four cells at once.'
          ),

          // Counts
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 } },
            countCard('Short-term PROS', stPros, '#22c55e'),
            countCard('Short-term CONS', stCons, '#f59e0b'),
            countCard('Long-term PROS', ltPros, '#16a34a'),
            countCard('Long-term CONS', ltCons, '#dc2626')
          ),

          imbalance ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, color: '#fcd34d', fontWeight: 800, marginBottom: 6 } }, '⚖️ Pattern in your grid'),
            h('p', { style: { margin: 0, color: '#fde68a', fontSize: 13, lineHeight: 1.65 } }, imbalance)
          ) : null,

          // Final decision
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a78bfa', marginBottom: 12 } },
            h('label', { htmlFor: 'cb-final', style: { display: 'block', fontSize: 12, color: '#a78bfa', fontWeight: 800, marginBottom: 6 } }, 'What I am going to do (and why)'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 } }, 'Write the decision in one sentence, with one sentence of reason. Both. The grid is the input; this is the output.'),
            h('textarea', { id: 'cb-final', value: d.finalChoice || '',
              placeholder: 'I am going to ____ because ____.',
              onChange: function(e) { setFinal(e.target.value); },
              style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      function countCard(label, count, color) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + color } },
          h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
          h('div', { style: { fontSize: 22, color: color, fontWeight: 900 } }, count)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var cells = d.cells || {};
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(167,139,250,0.10)', borderRadius: 8, border: '1px solid rgba(167,139,250,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('grid'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'cb-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#cb-print-region, #cb-print-region * { visibility: visible !important; } ' +
              '#cb-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #7c3aed' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Cost-Benefit Grid'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, d.decision || 'My decision'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // 2x2 layout
            h('table', { style: { width: '100%', borderCollapse: 'collapse', marginBottom: 18 } },
              h('thead', null,
                h('tr', null,
                  h('th', { style: { width: '15%' } }),
                  h('th', { style: { padding: 8, background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 800, textAlign: 'left' } }, 'PROS'),
                  h('th', { style: { padding: 8, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 800, textAlign: 'left' } }, 'CONS')
                )
              ),
              h('tbody', null,
                h('tr', null,
                  h('td', { style: { padding: 8, background: '#f8fafc', fontSize: 11, fontWeight: 800, color: '#0f172a', writingMode: 'vertical-rl', textAlign: 'center', verticalAlign: 'middle' } }, 'SHORT-TERM'),
                  printCell(cells.stPros, '#22c55e'),
                  printCell(cells.stCons, '#f59e0b')
                ),
                h('tr', null,
                  h('td', { style: { padding: 8, background: '#f8fafc', fontSize: 11, fontWeight: 800, color: '#0f172a', writingMode: 'vertical-rl', textAlign: 'center', verticalAlign: 'middle' } }, 'LONG-TERM'),
                  printCell(cells.ltPros, '#16a34a'),
                  printCell(cells.ltCons, '#dc2626')
                )
              )
            ),

            d.finalChoice ? h('div', { style: { padding: 14, background: '#ede9fe', borderLeft: '4px solid #7c3aed', marginBottom: 16 } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'My decision'),
              h('p', { style: { margin: 0, color: '#0f172a', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' } }, d.finalChoice)
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Cost-Benefit Grid from Linehan, M. M. (1993), Dialectical Behavior Therapy. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      function printCell(items, color) {
        return h('td', { style: { padding: 10, verticalAlign: 'top', border: '1px solid #cbd5e1' } },
          items && items.length > 0
            ? h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: '#0f172a', fontSize: 12, lineHeight: 1.55 } },
                items.map(function(it, i) { return h('li', { key: i, style: { marginBottom: 3 } }, it); }))
            : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(none)')
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('costBenefit', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'What the grid is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A 2x2 decision grid: pros and cons of a decision, in both short-term and long-term time horizons. The point is that emotion usually pushes you to look at one cell (the short-term pro of acting on impulse, or the short-term con of doing the hard thing). The grid forces you to hold all four cells at once.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'It is most useful for decisions you have already been turning over in your head and have not been able to settle: should I have this conversation, should I drop this class, should I tell someone what is going on, should I quit this thing, should I stay in this relationship. Writing it out turns down the volume on the loudest cell and lets the other three be heard.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'Where the format comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The cost-benefit (pros and cons) skill is part of Dialectical Behavior Therapy (DBT), developed by Marsha Linehan starting in the 1980s. Linehan developed DBT specifically for people with intense emotional reactivity (originally for chronically suicidal patients with borderline personality disorder), and the cost-benefit grid is a Distress Tolerance skill: a way to slow down a decision when emotion is pushing for an immediate, impulsive answer. The skill is now taught widely beyond clinical DBT, in schools, coaching, and general decision-making contexts.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for DBT and the cost-benefit skill.'),
            sourceCard('Linehan, M. M. (1993)', 'Cognitive-Behavioral Treatment of Borderline Personality Disorder, Guilford Press', 'The original DBT treatment manual. Foundational text.', null),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Manual (2nd ed.), Guilford Press', 'The standard skills training manual, including the pros-and-cons worksheet.', null),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Handouts and Worksheets (2nd ed.), Guilford Press', 'The practical worksheets used in DBT skills training. Cost-benefit grid is here.', null),
            sourceCard('Behavioral Tech', 'behavioraltech.org', 'Linehan-founded DBT training organization. Authoritative source for DBT clinical training.', 'https://behavioraltech.org/'),
            sourceCard('DBT Self Help', 'dbtselfhelp.com', 'Open educational resource on DBT skills, including pros-and-cons / cost-benefit work. Free.', 'https://dbtselfhelp.com/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The grid is a deliberation aid, not an answer machine. Counting cells does not give you the decision; the decision is yours.'),
              h('li', null, 'A grid is most useful when you have agency over the decision. If the decision is being made FOR you (by parents, by school, by economic necessity), the grid can clarify your preference but cannot give you what you do not have.'),
              h('li', null, 'Pure cost-benefit thinking has limits in value-laden decisions: some things are right to do even when the cells say otherwise (telling a hard truth, ending a friendship that has become harmful). The grid is one input, not the whole story.'),
              h('li', null, 'For very heavy decisions (about safety, identity, leaving home), a grid is not enough on its own. Bring it to a counselor, family member, or therapist.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'The cost-benefit grid is a useful Crew skill for ages 11+. A version of the grid for resisting a destructive urge (drinking, fighting, harming self) is a recognized DBT crisis skill; that use should be paired with a counselor, not done as homework. For everyday decision-making, the grid is a portable life skill.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e9d5ff', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e9d5ff', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderGrid();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Cost-Benefit Grid' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
