// ═══════════════════════════════════════════════════════════════
// sel_tool_costbenefit.js — Cost-Benefit Analysis Grid
// A 2x2 decision-making grid from Dialectical Behavior Therapy
// (DBT, Linehan). Rows: Short-term vs Long-term. Columns: Pros vs
// Cons. Used for decisions under emotional pressure to widen the
// frame beyond the immediate impulse.
// Registered tool ID: "costBenefit"
// Category: inner-work
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  window.SelHub = window.SelHub || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  if (window.SelHub.isRegistered && window.SelHub.isRegistered('costBenefit')) return;

  (function() {
    if (typeof document === 'undefined' || !document.body) return;
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
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      if (!ctx || !ctx.React) return null;
      var _cobT = (ctx && ctx.theme) || {};
      var _cobHC = !!_cobT.isContrast, _cobL = !_cobHC && !_cobT.isDark;
      var _cob_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _cob_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#fff':'#000000','#15803d':'#000000','#dc2626':'#000000','#f8fafc':'#000000','#ede9fe':'#000000'};
      var _cob_FGL = {'#cbd5e1':'#334155','#c4b5fd':'#5b21b6','#94a3b8':'#475569','#e9d5ff':'#581c87','#e2e8f0':'#1e293b','#a78bfa':'#6d28d9','#fcd34d':'#78350f','#fde68a':'#92400e','#64748b':'#475569'}, _cob_FGH = {'#cbd5e1':'#ffff00','#c4b5fd':'#ffff00','#94a3b8':'#ffff00','#e9d5ff':'#ffff00','#fff':'#ffff00','#e2e8f0':'#ffff00','#64748b':'#ffff00','#a78bfa':'#ffff00','#fcd34d':'#ffff00','#fde68a':'#ffff00','#0f172a':'#ffff00','#475569':'#ffff00'};
      var _cob_FGD = {'#64748b':'#94a3b8'};
      var _cob_BDL = {'#334155':'#cbd5e1','#1e293b':'#e2e8f0','#475569':'#cbd5e1','#a78bfa':'#7c3aed'}, _cob_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#a78bfa':'#ffff00','#475569':'#ffff00','#f59e0b':'#ffff00','#cbd5e1':'#ffff00','#7c3aed':'#ffff00','#22c55e':'#ffff00','#16a34a':'#ffff00','#dc2626':'#ffff00'};
      var _cobBg = function(h){ return _cobHC ? (_cob_BGH[h]||h) : (_cobL ? (_cob_BGL[h]||h) : h); };
      var _cobFg = function(h){ return _cobHC ? (_cob_FGH[h]||h) : (_cobL ? (_cob_FGL[h]||h) : (_cob_FGD[h]||h)); };
      var _cobBd = function(h){ return _cobHC ? (_cob_BDH[h]||h) : (_cobL ? (_cob_BDL[h]||h) : h); };
      // accent text: HC = yellow, Light = 700-weight, Dark = 300/400-weight (1.4.3)
      var _cob_INKL = {'#22c55e':'#15803d','#f59e0b':'#92400e','#16a34a':'#15803d','#dc2626':'#b91c1c','#a78bfa':'#6d28d9'};
      var _cobInk = function(c){ var k = String(c).toLowerCase(); return _cobHC ? '#ffff00' : (_cobL ? (_cob_INKL[k] || c) : ({'#6366f1':'#818cf8','#4f46e5':'#818cf8','#a855f7':'#c084fc','#9333ea':'#c084fc','#7c3aed':'#a78bfa','#8b5cf6':'#a78bfa','#3b82f6':'#60a5fa','#2563eb':'#60a5fa','#ef4444':'#f87171','#dc2626':'#f87171','#059669':'#34d399','#10b981':'#34d399','#16a34a':'#4ade80','#22c55e':'#4ade80','#0891b2':'#22d3ee','#0284c7':'#38bdf8','#0d9488':'#2dd4bf','#ec4899':'#f472b6','#db2777':'#f472b6','#64748b':'#94a3b8','#475569':'#94a3b8','#a16207':'#fbbf24','#b45309':'#fbbf24','#f59e0b':'#fbbf24'}[k] || c)); };
      var _cobSolid = function(c){ return _cobHC ? '#000000' : ({'#22c55e':'#15803d','#16a34a':'#15803d','#f59e0b':'#b45309','#dc2626':'#b91c1c','#7c3aed':'#6d28d9'}[String(c).toLowerCase()] || c); };
      var _cobSoftBg = function(darkTint, lightTint){ return _cobHC ? '#000000' : (_cobL ? (lightTint || '#f1f5f9') : darkTint); };
      var _cobGradBtn = function(grad){ return _cobHC ? '#000000' : grad; };
      var _cobBtnBd = function(){ return _cobHC ? '1px solid #ffff00' : 'none'; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var _cobBand = (ctx && ctx.gradeBand) || 'high';

      function safeObj(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
      function safeStr(v) { return typeof v === 'string' ? v : ''; }
      function safeList(v) { return Array.isArray(v) ? v.filter(function(item) { return typeof item === 'string'; }) : []; }

      var rawD = labToolData.costBenefit;
      var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : defaultState();
      function setCB(patchOrFn) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var base = safeObj(prev);
          var prevRaw = base.costBenefit;
          var prior = (prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw)) ? prevRaw : defaultState();
          var patch = typeof patchOrFn === 'function' ? patchOrFn(prior) : patchOrFn;
          if (!patch || typeof patch !== 'object') return base;
          var next = Object.assign({}, prior, patch);
          if (patch.cells || patch.decision !== undefined || patch.finalChoice !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, base, { costBenefit: next });
        });
      }
      function scanCbText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed || typeof window === 'undefined' || !window.SelHub) return false;
        var blocked = false;
        if (typeof window.SelHub.safeRehearseCheck === 'function') {
          var chk = window.SelHub.safeRehearseCheck(trimmed, { toolId: 'costBenefit', onSafetyFlag: onSafetyFlag });
          if (chk && chk.action === 'block') blocked = true;
        }
        if (!blocked && typeof window.SelHub.scanForCrisis === 'function') {
          var scan = window.SelHub.scanForCrisis(trimmed);
          if (scan && scan.triggered) {
            blocked = true;
            if (typeof onSafetyFlag === 'function') {
              try { onSafetyFlag({ toolId: 'costBenefit', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
            }
          }
        }
        if (blocked) {
          setCB({ _crisisTier: 3 });
          if (typeof window.SelHub.showCrisisModal === 'function') {
            window.SelHub.showCrisisModal({ toolName: 'Cost-Benefit Grid', contentSnippet: trimmed });
          }
        }
        return blocked;
      }
      var VALID_VIEWS = ['grid', 'edit', 'reflect', 'print', 'about'];
      var view = VALID_VIEWS.indexOf(d.view) !== -1 ? d.view : 'grid';
      function goto(v) { setCB({ view: v }); }
      function printNow() { try { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: function() { if (typeof setSelHubTool === 'function') setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { minHeight: 44, background: _cobSoftBg('rgba(255,255,255,0.05)', '#f1f5f9'), border: '1px solid ' + _cobBd('#334155'), borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: _cobFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _cobFg('#c4b5fd'), fontSize: 22, fontWeight: 900 } }, '⚖️ Cost-Benefit Grid'),
            h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'A 2x2 decision-making grid for when emotion is pushing one direction.')
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
        function selectTab(nextId) {
          goto(nextId);
          if (typeof document !== 'undefined') {
            setTimeout(function() {
              var el = document.getElementById('cb-tab-' + nextId);
              if (el && typeof el.focus === 'function') el.focus();
            }, 0);
          }
        }
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Cost-Benefit Grid sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, ti) {
            var active = view === t.id;
            return h('button', { key: t.id, id: 'cb-tab-' + t.id, type: 'button', onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active, 'aria-controls': 'cb-panel-' + t.id, tabIndex: active ? 0 : -1,
              onKeyDown: function(e) {
                if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectTab(tabs[(ti + 1) % tabs.length].id); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectTab(tabs[(ti - 1 + tabs.length) % tabs.length].id); }
                else if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0].id); }
                else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1].id); }
              },
              style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + _cobBd(active ? '#a78bfa' : '#334155'),
                background: active ? _cobSoftBg('rgba(167,139,250,0.18)', '#f5f3ff') : _cobBg('#1e293b'),
                color: active ? _cobFg('#e9d5ff') : _cobFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _cobSoftBg('rgba(15,23,42,0.5)', '#f1f5f9'), border: '1px solid ' + _cobBd('#334155'), fontSize: 12, color: _cobFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This is a structured deliberation tool, not a magic answer machine. If a decision feels too heavy to make alone, that is information; bring it to a counselor or trusted adult. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // GRID — visual 2x2
      // ═══════════════════════════════════════════════════════════
      function renderGrid() {
        var cells = safeObj(d.cells);
        var decisionStr = safeStr(d.decision);
        var finalStr = safeStr(d.finalChoice);
        var hasAny = CELLS.some(function(cell) { return safeList(cells[cell.id]).length > 0; });

        if (!hasAny && !decisionStr.trim()) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: _cobSoftBg('linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(15,23,42,0.4) 60%)', '#f5f3ff'), border: '1px solid ' + _cobBd('#a78bfa'), textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 }, 'aria-hidden': true }, '⚖️'),
              h('h3', { style: { margin: '0 0 8px', color: _cobFg('#e9d5ff'), fontSize: 18 } }, 'Your grid is empty'),
              h('p', { style: { margin: '0 0 14px', color: _cobFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.65 } },
                'Name the decision you are wrestling with. Then list the pros and cons in two time horizons: short-term (the next day or week) and long-term (months and years). The 2x2 frame is built to surface what the short-term impulse leaves out.'),
              h('button', { type: 'button', onClick: function() { goto('edit'); }, 'aria-label': 'Start the grid',
                style: { minHeight: 44, padding: '10px 22px', borderRadius: 10, border: _cobBtnBd(), cursor: 'pointer', background: _cobGradBtn('linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)'), color: _cobFg('#fff'), fontWeight: 800, fontSize: 14 } },
                '+ Start the grid')
            ),
            softPointer()
          );
        }

        return h('div', null,
          // Decision header
          h('div', { style: { padding: 14, borderRadius: 10, background: _cobBg('#0f172a'), borderTop: '1px solid ' + _cobBd('#1e293b'), borderRight: '1px solid ' + _cobBd('#1e293b'), borderBottom: '1px solid ' + _cobBd('#1e293b'), borderLeft: '3px solid ' + _cobBd('#a78bfa'), marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'The decision'),
            h('div', { style: { fontSize: 18, color: _cobFg('#e9d5ff'), fontWeight: 800, lineHeight: 1.4 } }, decisionStr.trim() ? decisionStr : '(not named yet)')
          ),

          // The 2x2 grid
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 } },
            CELLS.map(function(cell) {
              var items = safeList(cells[cell.id]);
              return h('div', { key: cell.id, style: { padding: 12, borderRadius: 10, background: _cobBg('#0f172a'), borderTop: '1px solid ' + _cobBd('#1e293b'), borderRight: '1px solid ' + _cobBd('#1e293b'), borderBottom: '1px solid ' + _cobBd('#1e293b'), borderLeft: '3px solid ' + _cobBd(cell.color), minHeight: 140 } },
                h('div', { style: { fontSize: 12, color: _cobInk(cell.color), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, cell.icon + ' ' + cell.label),
                items.length > 0
                  ? h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: _cobFg('#e2e8f0'), fontSize: 12.5, lineHeight: 1.55 } },
                      items.map(function(it, i) { return h('li', { key: i, style: { marginBottom: 3 } }, it); }))
                  : h('div', { style: { fontSize: 12, color: _cobFg('#64748b'), fontStyle: 'italic' } }, '(nothing here)')
              );
            })
          ),

          finalStr.trim() ? h('div', { style: { padding: 14, borderRadius: 10, background: _cobSoftBg('rgba(167,139,250,0.10)', '#f5f3ff'), borderTop: '1px solid ' + _cobBd('#a78bfa'), borderRight: '1px solid ' + _cobBd('#a78bfa'), borderBottom: '1px solid ' + _cobBd('#a78bfa'), borderLeft: '3px solid ' + _cobBd('#a78bfa'), marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: _cobFg('#a78bfa'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'My decision'),
            h('div', { style: { fontSize: 14, color: _cobFg('#e9d5ff'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, finalStr)
          ) : null,

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: function() { goto('edit'); }, 'aria-label': 'Edit grid',
              style: { minHeight: 44, padding: '10px 20px', borderRadius: 10, border: _cobBtnBd(), cursor: 'pointer', background: _cobGradBtn('linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)'), color: _cobFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '✏️ Edit'),
            h('button', { type: 'button', onClick: function() { goto('reflect'); }, 'aria-label': 'Make the decision',
              style: { minHeight: 44, padding: '10px 20px', borderRadius: 10, border: '1px solid ' + _cobBd('#475569'), background: _cobBg('#1e293b'), color: _cobFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Decide'),
            h('button', { type: 'button', onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { minHeight: 44, padding: '10px 20px', borderRadius: 10, border: '1px solid ' + _cobBd('#475569'), background: _cobBg('#1e293b'), color: _cobFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        var cells = safeObj(d.cells);
        function cellLabelFor(cellId) {
          var found = CELLS.filter(function(c) { return c.id === cellId; })[0];
          return found ? found.label : cellId;
        }
        function addItem(cellId, value) {
          if (!value || !value.trim()) { if (typeof addToast === 'function') addToast('Add a few words first, then press the button again.', 'info'); return; }
          var text = value.trim();
          setCB(function(prior) {
            var priorCells = safeObj(prior.cells);
            var nx = Object.assign({}, priorCells);
            nx[cellId] = safeList(priorCells[cellId]).slice();
            nx[cellId].push(text);
            return { cells: nx };
          });
          if (typeof announceToSR === 'function') announceToSR('Added to ' + cellLabelFor(cellId) + '.');
        }
        function removeItem(cellId, idx) {
          setCB(function(prior) {
            var priorCells = safeObj(prior.cells);
            var list = safeList(priorCells[cellId]).slice();
            if (idx < 0 || idx >= list.length) return null;
            list.splice(idx, 1);
            var nx = Object.assign({}, priorCells);
            nx[cellId] = list;
            return { cells: nx };
          });
          if (typeof announceToSR === 'function') announceToSR('Removed from ' + cellLabelFor(cellId) + '.');
        }

        return h('div', null,
          // Decision input
          h('div', { style: { padding: 14, borderRadius: 10, background: _cobBg('#0f172a'), border: '1px solid ' + _cobBd('#1e293b'), marginBottom: 12 } },
            h('label', { htmlFor: 'cb-decision', style: { display: 'block', fontSize: 12, color: _cobFg('#a78bfa'), fontWeight: 800, marginBottom: 6 } }, 'What decision am I weighing?'),
            h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 } }, 'Name it as concretely as you can. "Should I drop band class?" is more useful than "should I change my schedule?"'),
            h('input', { id: 'cb-decision', type: 'text', value: safeStr(d.decision),
              placeholder: 'e.g. Should I tell my parents about [the thing]?',
              onChange: function(e) { setCB({ decision: e.target.value }); },
              onBlur: function(e) { scanCbText(e.target.value); },
              style: { width: '100%', minHeight: 44, padding: 10, borderRadius: 6, border: '1px solid ' + _cobBd('#334155'), background: _cobBg('#1e293b'), color: _cobFg('#e2e8f0'), fontSize: 14, fontFamily: 'inherit' } })
          ),

          // 4 cells as editors
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 } },
            CELLS.map(function(cell) {
              var items = safeList(cells[cell.id]);
              var inputId = 'cb-input-' + cell.id;
              function submit() {
                if (typeof document === 'undefined') return;
                var el = document.getElementById(inputId);
                if (!el || !el.value.trim()) { if (typeof addToast === 'function') addToast('Add a few words first, then press the button again.', 'info'); return; }
                scanCbText(el.value);
                addItem(cell.id, el.value);
                el.value = '';
              }
              return h('div', { key: cell.id, style: { padding: 12, borderRadius: 10, background: _cobBg('#0f172a'), borderTop: '1px solid ' + _cobBd('#1e293b'), borderRight: '1px solid ' + _cobBd('#1e293b'), borderBottom: '1px solid ' + _cobBd('#1e293b'), borderLeft: '3px solid ' + _cobBd(cell.color) } },
                h('div', { style: { fontSize: 13, color: _cobInk(cell.color), fontWeight: 800, marginBottom: 6 } }, cell.icon + ' ' + cell.label),
                h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), marginBottom: 10, fontStyle: 'italic', lineHeight: 1.5 } }, cell.blurb),

                items.length > 0 ? h('div', { style: { marginBottom: 10 } },
                  items.map(function(it, i) {
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 6, borderRadius: 4, background: _cobBg('#1e293b'), marginBottom: 4 } },
                      h('span', { style: { flex: 1, fontSize: 12.5, color: _cobFg('#e2e8f0') } }, it),
                      h('button', { type: 'button', onClick: function() { removeItem(cell.id, i); }, 'aria-label': 'Remove from ' + cell.label,
                        style: { minHeight: 44, minWidth: 44, background: 'transparent', border: '1px solid ' + _cobBd('#475569'), color: _cobFg('#94a3b8'), borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 12 } }, '✕')
                    );
                  })
                ) : null,

                h('div', { style: { display: 'flex', gap: 4 } },
                  h('label', { htmlFor: inputId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to ' + cell.label),
                  h('input', { id: inputId, type: 'text', placeholder: 'Add...',
                    onBlur: function(e) { scanCbText(e.target.value); },
                    onKeyDown: function(e) {
                      if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)) return;
                      if (e.key === 'Enter') { e.preventDefault(); submit(); }
                      else if (e.key === 'Escape' && e.target && e.target.value) { e.preventDefault(); e.target.value = ''; }
                    },
                    style: { flex: 1, minHeight: 44, padding: '8px 10px', borderRadius: 4, border: '1px solid ' + _cobBd('#334155'), background: _cobBg('#1e293b'), color: _cobFg('#e2e8f0'), fontSize: 12.5 } }),
                  h('button', { type: 'button', onClick: submit, 'aria-label': 'Add to ' + cell.label,
                    style: { minHeight: 44, minWidth: 44, padding: '8px 12px', borderRadius: 4, border: _cobBtnBd(), cursor: 'pointer', background: _cobSolid(cell.color), color: _cobFg('#fff'), fontWeight: 700, fontSize: 14 } }, '+')
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
        var cells = safeObj(d.cells);
        var stPros = safeList(cells.stPros).length;
        var stCons = safeList(cells.stCons).length;
        var ltPros = safeList(cells.ltPros).length;
        var ltCons = safeList(cells.ltCons).length;

        function setFinal(val) { setCB({ finalChoice: val }); }

        var imbalance = null;
        if (stPros > 0 && ltCons > 0 && (stPros + ltCons) > (stCons + ltPros)) {
          imbalance = 'Your grid is heavier with short-term pros and long-term cons. That is the classic shape of an emotional impulse: it feels good now, costs you later. Worth pausing.';
        } else if (stCons > 0 && ltPros > 0 && (stCons + ltPros) > (stPros + ltCons)) {
          imbalance = 'Your grid is heavier with short-term cons and long-term pros. That is the classic shape of "the hard right thing." Uncomfortable now, worth it later.';
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: _cobSoftBg('rgba(167,139,250,0.08)', '#f5f3ff'), borderTop: '1px solid ' + _cobBd('#a78bfa'), borderRight: '1px solid ' + _cobBd('#a78bfa'), borderBottom: '1px solid ' + _cobBd('#a78bfa'), borderLeft: '3px solid ' + _cobBd('#a78bfa'), marginBottom: 14, fontSize: 13, color: _cobFg('#e9d5ff'), lineHeight: 1.65 } },
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

          imbalance ? h('div', { style: { padding: 12, borderRadius: 10, background: _cobSoftBg('rgba(245,158,11,0.10)', '#fffbeb'), borderTop: '1px solid ' + _cobBd('#f59e0b'), borderRight: '1px solid ' + _cobBd('#f59e0b'), borderBottom: '1px solid ' + _cobBd('#f59e0b'), borderLeft: '3px solid ' + _cobBd('#f59e0b'), marginBottom: 12 } },
            h('div', { style: { fontSize: 13, color: _cobFg('#fcd34d'), fontWeight: 800, marginBottom: 6 } }, '⚖️ Pattern in your grid'),
            h('p', { style: { margin: 0, color: _cobFg('#fde68a'), fontSize: 13, lineHeight: 1.65 } }, imbalance)
          ) : null,

          // Final decision
          h('div', { style: { padding: 14, borderRadius: 10, background: _cobBg('#0f172a'), borderTop: '1px solid ' + _cobBd('#1e293b'), borderRight: '1px solid ' + _cobBd('#1e293b'), borderBottom: '1px solid ' + _cobBd('#1e293b'), borderLeft: '3px solid ' + _cobBd('#a78bfa'), marginBottom: 12 } },
            h('label', { htmlFor: 'cb-final', style: { display: 'block', fontSize: 12, color: _cobFg('#a78bfa'), fontWeight: 800, marginBottom: 6 } }, 'What I am going to do (and why)'),
            h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 } }, 'Write the decision in one sentence, with one sentence of reason. Both. The grid is the input; this is the output.'),
            h('textarea', { id: 'cb-final', value: safeStr(d.finalChoice),
              placeholder: 'I am going to ____ because ____.',
              onChange: function(e) { setFinal(e.target.value); },
              onBlur: function(e) { scanCbText(e.target.value); },
              style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid ' + _cobBd('#334155'), background: _cobBg('#1e293b'), color: _cobFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      function countCard(label, count, color) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _cobBg('#0f172a'), borderTop: '1px solid ' + _cobBd('#1e293b'), borderRight: '1px solid ' + _cobBd('#1e293b'), borderBottom: '1px solid ' + _cobBd('#1e293b'), borderLeft: '3px solid ' + _cobBd(color) } },
          h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
          h('div', { style: { fontSize: 22, color: _cobInk(color), fontWeight: 900 } }, count)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var cells = safeObj(d.cells);
        var decisionStr = safeStr(d.decision);
        var finalStr = safeStr(d.finalChoice);
        var updatedStr = safeStr(d.lastUpdated);
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _cobSoftBg('rgba(167,139,250,0.10)', '#f5f3ff'), borderRadius: 8, border: '1px solid ' + _cobBd('#a78bfa') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _cobFg('#e9d5ff'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { type: 'button', onClick: printNow, style: { minHeight: 44, padding: '8px 18px', borderRadius: 8, border: _cobBtnBd(), cursor: 'pointer', background: _cobGradBtn('linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)'), color: _cobFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { type: 'button', onClick: function() { goto('grid'); }, 'aria-label': 'Back to grid',
              style: { minHeight: 44, padding: '8px 18px', borderRadius: 8, border: '1px solid ' + _cobBd('#475569'), background: _cobBg('#1e293b'), color: _cobFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'cb-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _cobBg('#fff'), color: _cobFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _cobBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#cb-print-region, #cb-print-region * { visibility: visible !important; } ' +
              '#cb-print-region { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff !important; color: #0f172a !important; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _cobBd('#7c3aed') } },
              h('div', { style: { fontSize: 12, color: _cobHC ? '#ffff00' : '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Cost-Benefit Grid'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, decisionStr.trim() ? decisionStr : 'My decision'),
              updatedStr ? h('div', { style: { fontSize: 12, color: _cobFg('#475569'), marginTop: 4 } }, 'Updated ' + updatedStr) : null
            ),

            // 2x2 layout
            h('table', { 'aria-label': 'Short-term and long-term pros and cons', style: { width: '100%', borderCollapse: 'collapse', marginBottom: 18 } },
              h('thead', null,
                h('tr', null,
                  h('th', { scope: 'col', 'aria-label': 'Time frame', style: { width: '15%', position: 'relative' } },
                    h('span', { className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Time frame')
                  ),
                  h('th', { scope: 'col', style: { padding: 8, background: _cobHC ? '#000000' : '#15803d', color: _cobHC ? '#ffff00' : '#ffffff', fontSize: 12, fontWeight: 800, textAlign: 'left' } }, 'PROS'),
                  h('th', { scope: 'col', style: { padding: 8, background: _cobHC ? '#000000' : '#dc2626', color: _cobHC ? '#ffff00' : '#ffffff', fontSize: 12, fontWeight: 800, textAlign: 'left' } }, 'CONS')
                )
              ),
              h('tbody', null,
                h('tr', null,
                  h('th', { scope: 'row', style: { padding: 8, background: _cobBg('#f8fafc'), fontSize: 12, fontWeight: 800, color: _cobFg('#0f172a'), writingMode: 'vertical-rl', textAlign: 'center', verticalAlign: 'middle' } }, 'SHORT-TERM'),
                  printCell(cells.stPros, '#22c55e'),
                  printCell(cells.stCons, '#f59e0b')
                ),
                h('tr', null,
                  h('th', { scope: 'row', style: { padding: 8, background: _cobBg('#f8fafc'), fontSize: 12, fontWeight: 800, color: _cobFg('#0f172a'), writingMode: 'vertical-rl', textAlign: 'center', verticalAlign: 'middle' } }, 'LONG-TERM'),
                  printCell(cells.ltPros, '#16a34a'),
                  printCell(cells.ltCons, '#dc2626')
                )
              )
            ),

            finalStr.trim() ? h('div', { style: { padding: 14, background: _cobBg('#ede9fe'), borderLeft: '4px solid ' + _cobBd('#7c3aed'), marginBottom: 16 } },
              h('div', { style: { fontSize: 12, color: _cobHC ? '#ffff00' : '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'My decision'),
              h('p', { style: { margin: 0, color: _cobFg('#0f172a'), fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' } }, finalStr)
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid ' + _cobBd('#cbd5e1'), fontSize: 12, color: _cobFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'Cost-Benefit Grid from Linehan, M. M. (1993), Dialectical Behavior Therapy. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      function printCell(rawItems, color) {
        var items = safeList(rawItems);
        return h('td', { style: { padding: 10, verticalAlign: 'top', border: '1px solid ' + _cobBd('#cbd5e1') } },
          items.length > 0
            ? h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: _cobFg('#0f172a'), fontSize: 12, lineHeight: 1.55 } },
                items.map(function(it, i) { return h('li', { key: i, style: { marginBottom: 3 } }, it); }))
            : h('div', { style: { fontSize: 12, color: _cobFg('#475569'), fontStyle: 'italic' } }, '(none)')
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (typeof window !== 'undefined' && window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('costBenefit', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: _cobBg('#0f172a'), border: '1px solid ' + _cobBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _cobFg('#c4b5fd'), fontSize: 16 } }, 'What the grid is'),
            h('p', { style: { margin: '0 0 10px', color: _cobFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'A 2x2 decision grid: pros and cons of a decision, in both short-term and long-term time horizons. The point is that emotion usually pushes you to look at one cell (the short-term pro of acting on impulse, or the short-term con of doing the hard thing). The grid forces you to hold all four cells at once.'
            ),
            h('p', { style: { margin: 0, color: _cobFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'It is most useful for decisions you have already been turning over in your head and have not been able to settle: should I have this conversation, should I drop this class, should I tell someone what is going on, should I quit this thing, should I stay in this relationship. Writing it out turns down the volume on the loudest cell and lets the other three be heard.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _cobBg('#0f172a'), border: '1px solid ' + _cobBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _cobFg('#c4b5fd'), fontSize: 16 } }, 'Where the format comes from'),
            h('p', { style: { margin: 0, color: _cobFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The cost-benefit (pros and cons) skill is part of Dialectical Behavior Therapy (DBT), developed by Marsha Linehan starting in the 1980s. Linehan developed DBT specifically for people with intense emotional reactivity (originally for chronically suicidal patients with borderline personality disorder), and the cost-benefit grid is a Distress Tolerance skill: a way to slow down a decision when emotion is pushing for an immediate, impulsive answer. The skill is now taught widely beyond clinical DBT, in schools, coaching, and general decision-making contexts.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: _cobBg('#0f172a'), border: '1px solid ' + _cobBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _cobFg('#c4b5fd'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _cobFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for DBT and the cost-benefit skill.'),
            sourceCard('Linehan, M. M. (1993)', 'Cognitive-Behavioral Treatment of Borderline Personality Disorder, Guilford Press', 'The original DBT treatment manual. Foundational text.', null),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Manual (2nd ed.), Guilford Press', 'The standard skills training manual, including the pros-and-cons worksheet.', null),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Handouts and Worksheets (2nd ed.), Guilford Press', 'The practical worksheets used in DBT skills training. Cost-benefit grid is here.', null),
            sourceCard('Behavioral Tech', 'behavioraltech.org', 'Linehan-founded DBT training organization. Authoritative source for DBT clinical training.', 'https://behavioraltech.org/'),
            sourceCard('DBT Self Help', 'dbtselfhelp.com', 'Open educational resource on DBT skills, including pros-and-cons / cost-benefit work. Free.', 'https://dbtselfhelp.com/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: _cobSoftBg('rgba(245,158,11,0.08)', '#fffbeb'), borderTop: '1px solid ' + _cobBd('#f59e0b'), borderRight: '1px solid ' + _cobBd('#f59e0b'), borderBottom: '1px solid ' + _cobBd('#f59e0b'), borderLeft: '3px solid ' + _cobBd('#f59e0b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _cobFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _cobFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The grid is a deliberation aid, not an answer machine. Counting cells does not give you the decision; the decision is yours.'),
              h('li', null, 'A grid is most useful when you have agency over the decision. If the decision is being made FOR you (by parents, by school, by economic necessity), the grid can clarify your preference but cannot give you what you do not have.'),
              h('li', null, 'Pure cost-benefit thinking has limits in value-laden decisions: some things are right to do even when the cells say otherwise (telling a hard truth, ending a friendship that has become harmful). The grid is one input, not the whole story.'),
              h('li', null, 'For very heavy decisions (about safety, identity, leaving home), a grid is not enough on its own. Bring it to a counselor, family member, or therapist.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: _cobSoftBg('rgba(167,139,250,0.10)', '#f5f3ff'), borderTop: '1px solid ' + _cobBd('#a78bfa'), borderRight: '1px solid ' + _cobBd('#a78bfa'), borderBottom: '1px solid ' + _cobBd('#a78bfa'), borderLeft: '3px solid ' + _cobBd('#a78bfa'), fontSize: 12.5, color: _cobFg('#e9d5ff'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'The cost-benefit grid is a useful Crew skill for ages 11+. A version of the grid for resisting a destructive urge (drinking, fighting, harming self) is a recognized DBT crisis skill; that use should be paired with a counselor, not done as homework. For everyday decision-making, the grid is a portable life skill.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _cobBg('#1e293b'), border: '1px solid ' + _cobBd('#334155'), marginBottom: 8 } },
          h('div', { style: { fontSize: 12, color: _cobFg('#c4b5fd'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: _cobFg('#e9d5ff'), fontWeight: 700, textDecoration: 'underline', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _cobFg('#e9d5ff'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _cobFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
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
        (d._crisisTier >= 3 && typeof window !== 'undefined' && window.SelHub && typeof window.SelHub.renderCrisisResources === 'function')
          ? window.SelHub.renderCrisisResources(h, _cobBand) : null,
        h('div', { role: 'tabpanel', id: 'cb-panel-' + view, 'aria-labelledby': 'cb-tab-' + view }, body)
      );
    }
  });

})();
