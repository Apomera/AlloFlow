// ═══════════════════════════════════════════════════════════════
// sel_tool_path.js — PATH: Planning Alternative Tomorrows with Hope
// A person-centered futures-planning visual developed by Pearpoint,
// O'Brien, and Forest at Inclusion Press. PATH starts with the
// long-horizon dream (the North Star) and works BACKWARD through
// eight stages to first steps in the next two weeks. Often paired
// with MAPS for transition planning.
// Registered tool ID: "path"
// Category: self-direction
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';
  if (typeof window !== 'object' || !window) return;

  window.SelHub = (window.SelHub && typeof window.SelHub === 'object') ? window.SelHub : {
    _registry: Object.create(null), _order: [],
    registerTool: function(id, config) {
      if (typeof id !== 'string' || !id || id === '__proto__' || id === 'constructor' || id === 'prototype' || !config || typeof config !== 'object') return;
      config.id = id; config.ready = config.ready !== false; this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(this._registry, id) && !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = (typeof id === 'string' && Object.prototype.hasOwnProperty.call(this._registry, id)) ? this._registry[id] : null; if (!tool || typeof tool.render !== 'function') return null; return tool.render(ctx); }
  };

  if (window.SelHub.isRegistered && window.SelHub.isRegistered('path')) return;

  var _paLocalCrisisRe = /\b(kill\s+myself|end\s+my\s+life|want\s+to\s+die|suicid(?:e|al)|hurt\s+myself|self[\s-]?harm|cut(?:ting)?\s+myself|overdose|no\s+reason\s+to\s+live)\b/i;

  function ensureLiveRegion() {
    if (typeof document !== 'object' || !document || !document.body || typeof document.getElementById !== 'function') return null;
    var existing = document.getElementById('allo-live-path');
    if (existing) return existing;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-path';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
    return liveRegion;
  }
  ensureLiveRegion();

  (function() {
    if (typeof document !== 'object' || !document || !document.head || typeof document.getElementById !== 'function') return;
    if (document.getElementById('allo-path-a11y-css')) return;
    var s = document.createElement('style');
    s.id = 'allo-path-a11y-css';
    s.textContent =
      '.selh-path button:focus-visible,.selh-path a:focus-visible,.selh-path input:focus-visible,.selh-path textarea:focus-visible,.selh-path [tabindex]:focus-visible{outline:3px solid #818cf8;outline-offset:2px;}' +
      '.selh-path button{transition:background-color 140ms ease,border-color 140ms ease,color 140ms ease;}' +
      '@media (prefers-reduced-motion: reduce){.selh-path,.selh-path *{transition:none !important;animation:none !important;}}' +
      '@media (forced-colors: active){.selh-path button:focus-visible,.selh-path a:focus-visible,.selh-path input:focus-visible,.selh-path textarea:focus-visible{outline:2px solid Highlight !important;}.selh-path button,.selh-path [role="tab"]{forced-color-adjust:auto;}}';
    document.head.appendChild(s);
  })();

  function isImeComposing(e) {
    return !!(e && (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)));
  }

  // PATH's 8 stages, in the order Inclusion Press uses them.
  // Note: PATH is filled BACKWARDS in the original practice (start at
  // the North Star, work back toward today). We present in the same
  // order here so the journey reads forward, but encourage starting
  // with the North Star in the on-screen prompts.
  var STAGES = [
    { key: 'northStar',    icon: '⭐', label: 'North Star',          color: '#fbbf24',
      blurb: 'The dream. Where you really want to go in your life over time. Bold, hopeful, true to you. Start here.' },
    { key: 'possible',     icon: '🌅', label: 'Positive Possible',   color: '#f59e0b',
      blurb: 'One year from now, what would be in place if things were going well? What are the specific signs of a positive year?' },
    { key: 'now',          icon: '📍', label: 'Now',                 color: '#0ea5e9',
      blurb: 'Where you are right now. The honest current picture. Strengths in place, things that are hard, what is true today.' },
    { key: 'enroll',       icon: '🤝', label: 'Enroll',              color: '#16a34a',
      blurb: 'Who do you need on the journey with you? Family, friends, teachers, mentors, professionals. Who can you ask?' },
    { key: 'strengths',    icon: '💪', label: 'Strengths I Bring',   color: '#ec4899',
      blurb: 'What strengths are already yours? Skills, qualities, knowledge, energy you have right now to move forward.' },
    { key: 'buildStrong',  icon: '🌱', label: 'Building Strength',   color: '#10b981',
      blurb: 'What strengths do you need to keep building? What skills, supports, or resources will need to grow over the next year?' },
    { key: 'nextMonths',   icon: '📅', label: 'Next Few Months',     color: '#6366f1',
      blurb: 'Three- to six-month goals. Specific milestones along the way to the Positive Possible.' },
    { key: 'firstSteps',   icon: '🚶', label: 'First Steps',         color: '#dc2626',
      blurb: 'What can you do in the next 1-2 weeks? Small, doable, today-or-tomorrow steps that get the journey moving.' }
  ];

  function defaultState() {
    return {
      view: 'overview',
      activeKey: 'northStar',
      name: '',
      responses: {},
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('path', {
    icon: '🧭',
    label: 'PATH',
    desc: 'Planning Alternative Tomorrows with Hope: a futures-planning visual. Eight stages from your long-horizon North Star backward to first steps in the next two weeks. Developed by Pearpoint, O\'Brien, and Forest at Inclusion Press; widely used for transition planning and personal goal setting.',
    color: 'indigo',
    category: 'self-direction',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      if (!ctx || typeof ctx !== 'object' || !ctx.React || typeof ctx.React.createElement !== 'function') return null;
      var _paT = (ctx && ctx.theme) || {};
      var _paHC = !!_paT.isContrast, _paL = !_paHC && !_paT.isDark;
      var _pa_BGL = {'#1e293b':'#ffffff','#0f172a':'#f8fafc'}, _pa_BGH = {'#1e293b':'#000000','#0f172a':'#000000','#fff':'#000000'};
      var _pa_FGL = {'#cbd5e1':'#334155','#a5b4fc':'#3730a3','#94a3b8':'#475569','#e0e7ff':'#3730a3','#fde68a':'#92400e','#e2e8f0':'#1e293b','#fcd34d':'#78350f','#64748b':'#475569'}, _pa_FGH = {'#cbd5e1':'#ffff00','#a5b4fc':'#ffff00','#94a3b8':'#ffff00','#e0e7ff':'#ffff00','#fde68a':'#ffff00','#e2e8f0':'#ffff00','#fff':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00'};
      var _pa_FGD = {'#64748b':'#94a3b8'};
      var _pa_BDL = {'#334155':'#cbd5e1','#1e293b':'#e2e8f0','#475569':'#cbd5e1','#818cf8':'#6366f1'}, _pa_BDH = {'#334155':'#ffff00','#818cf8':'#ffff00','#fbbf24':'#ffff00','#1e293b':'#ffff00','#475569':'#ffff00','#cbd5e1':'#ffff00','#4f46e5':'#ffff00','#f59e0b':'#ffff00','#0ea5e9':'#ffff00','#16a34a':'#ffff00','#ec4899':'#ffff00','#10b981':'#ffff00','#6366f1':'#ffff00','#dc2626':'#ffff00'};
      var _paBg = function(h){ return _paHC ? (_pa_BGH[h]||h) : (_paL ? (_pa_BGL[h]||h) : h); };
      var _paFg = function(h){ return _paHC ? (_pa_FGH[h]||h) : (_paL ? (_pa_FGL[h]||h) : (_pa_FGD[h]||h)); };
      var _paBd = function(h){ return _paHC ? (_pa_BDH[h]||h) : (_paL ? (_pa_BDL[h]||h) : h); };
      // accent text: HC = yellow, Light = 700-weight, Dark = 300/400-weight (1.4.3)
      var _pa_INKL = {'#fbbf24':'#92400e','#f59e0b':'#92400e','#0ea5e9':'#0369a1','#16a34a':'#15803d','#ec4899':'#be185d','#10b981':'#047857','#6366f1':'#4338ca','#dc2626':'#b91c1c'};
      var _paInk = function(c){ var k = String(c).toLowerCase(); return _paHC ? '#ffff00' : (_paL ? (_pa_INKL[k] || c) : ({'#6366f1':'#818cf8','#4f46e5':'#818cf8','#a855f7':'#c084fc','#9333ea':'#c084fc','#7c3aed':'#a78bfa','#8b5cf6':'#a78bfa','#3b82f6':'#60a5fa','#2563eb':'#60a5fa','#ef4444':'#f87171','#dc2626':'#f87171','#059669':'#34d399','#10b981':'#34d399','#16a34a':'#4ade80','#0891b2':'#22d3ee','#0284c7':'#38bdf8','#0ea5e9':'#38bdf8','#0d9488':'#2dd4bf','#ec4899':'#f472b6','#db2777':'#f472b6','#64748b':'#94a3b8','#475569':'#94a3b8','#a16207':'#fbbf24','#b45309':'#fbbf24','#f59e0b':'#fbbf24'}[k] || c)); };
      // white text needs a 700-weight fill (1.4.3)
      var _paSolid = function(c){ return _paHC ? '#000000' : ({'#0ea5e9':'#0369a1','#38bdf8':'#0369a1','#0284c7':'#0369a1','#f59e0b':'#b45309','#fbbf24':'#b45309','#d97706':'#b45309','#22c55e':'#15803d','#16a34a':'#15803d','#4ade80':'#15803d','#10b981':'#047857','#059669':'#047857','#ef4444':'#b91c1c','#f87171':'#b91c1c','#dc2626':'#b91c1c','#fb7185':'#be123c','#3b82f6':'#1d4ed8','#60a5fa':'#1d4ed8','#6366f1':'#4338ca','#818cf8':'#4338ca','#a855f7':'#7e22ce','#a78bfa':'#6d28d9','#8b5cf6':'#6d28d9','#ec4899':'#be185d','#f472b6':'#be185d','#14b8a6':'#0f766e','#0d9488':'#0f766e','#06b6d4':'#0e7490','#0891b2':'#0e7490','#f97316':'#c2410c'}[String(c).toLowerCase()] || c); };
      var _paSoftBg = function(darkTint, lightTint){ return _paHC ? '#000000' : (_paL ? (lightTint || '#f1f5f9') : darkTint); };
      var _paGradBtn = function(grad){ return _paHC ? '#000000' : grad; };
      var _paBtnBd = function(){ return _paHC ? '1px solid #ffff00' : 'none'; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var _paBand = (ctx && ctx.gradeBand) || 'high';
      function announcePA(msg) {
        if (!msg) return;
        if (typeof announceToSR === 'function') { try { announceToSR(msg); return; } catch (_) {} }
        try {
          var live = ensureLiveRegion();
          if (live) {
            live.textContent = '';
            setTimeout(function() { try { live.textContent = String(msg); } catch (_) {} }, 20);
          }
        } catch (_) {}
      }

      function safeObj(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
      function safeStr(v) { return typeof v === 'string' ? v : ''; }

      var rawD = labToolData.path;
      var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : defaultState();
      function setPATH(patchOrFn) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var base = safeObj(prev);
          var prevRaw = base.path;
          var prior = (prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw)) ? prevRaw : defaultState();
          var patch = typeof patchOrFn === 'function' ? patchOrFn(prior) : patchOrFn;
          if (!patch || typeof patch !== 'object') return base;
          var next = Object.assign({}, prior, patch);
          if (patch.responses || patch.name !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, base, { path: next });
        });
      }
      function scanPathText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed) return false;
        var blocked = false;
        var sh = (typeof window === 'object' && window && window.SelHub) ? window.SelHub : null;
        try {
          if (sh && typeof sh.safeRehearseCheck === 'function') {
            var chk = sh.safeRehearseCheck(trimmed, { toolId: 'path', onSafetyFlag: onSafetyFlag });
            if (chk && chk.action === 'block') blocked = true;
          }
          if (!blocked && sh && typeof sh.scanForCrisis === 'function') {
            var scan = sh.scanForCrisis(trimmed);
            if (scan && (scan.triggered || scan.hasCrisis)) {
              blocked = true;
              if (typeof onSafetyFlag === 'function') {
                try { onSafetyFlag({ toolId: 'path', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
              }
            }
          }
          if (!blocked && !(sh && (typeof sh.safeRehearseCheck === 'function' || typeof sh.scanForCrisis === 'function')) && _paLocalCrisisRe.test(trimmed)) {
            blocked = true;
            if (typeof onSafetyFlag === 'function') {
              try { onSafetyFlag({ toolId: 'path', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
            }
          }
          if (blocked) {
            setPATH({ _crisisTier: 3 });
            if (sh && typeof sh.showCrisisModal === 'function') {
              sh.showCrisisModal({ toolName: 'PATH', contentSnippet: trimmed });
            }
            announcePA('Support resources are shown on this screen. Call or text 988 or text HOME to 741741.');
          }
        } catch (_) {}
        return blocked;
      }
      var VALID_VIEWS = ['overview', 'edit', 'print', 'about'];
      var view = VALID_VIEWS.indexOf(d.view) !== -1 ? d.view : 'overview';
      function goto(v) { setPATH({ view: VALID_VIEWS.indexOf(v) !== -1 ? v : 'overview' }); }
      function printNow() { try { if (typeof window === 'object' && window && typeof window.print === 'function') window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: function() { if (typeof setSelHubTool === 'function') setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: _paSoftBg('rgba(255,255,255,0.05)', '#f1f5f9'), border: '1px solid ' + _paBd('#334155'), borderRadius: 8, padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: _paFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _paFg('#a5b4fc'), fontSize: 22, fontWeight: 900 } }, '🧭 PATH'),
            h('div', { style: { fontSize: 12, color: _paFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'Planning Alternative Tomorrows with Hope: a futures-planning visual.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'overview', label: 'My PATH', icon: '🧭' },
          { id: 'edit', label: 'Work on it', icon: '✏️' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        function selectTab(nextTab) {
          goto(nextTab.id);
          announcePA('Switched to ' + nextTab.label + '.');
          if (typeof document === 'object' && document && typeof document.getElementById === 'function') {
            setTimeout(function() {
              try {
                var el = document.getElementById('path-tab-' + nextTab.id);
                if (el && typeof el.focus === 'function') el.focus();
              } catch (_) {}
            }, 0);
          }
        }
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'PATH sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, ti) {
            var active = view === t.id;
            return h('button', { key: t.id, id: 'path-tab-' + t.id, type: 'button', onClick: function() { goto(t.id); announcePA('Switched to ' + t.label + '.'); },
              role: 'tab', 'aria-selected': active, 'aria-controls': 'path-panel-' + t.id, tabIndex: active ? 0 : -1,
              onKeyDown: function(e) {
                if (isImeComposing(e)) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectTab(tabs[(ti + 1) % tabs.length]); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectTab(tabs[(ti - 1 + tabs.length) % tabs.length]); }
                else if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0]); }
                else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1]); }
              },
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _paBd(active ? '#818cf8' : '#334155'),
                background: active ? _paSoftBg('rgba(129,140,248,0.18)', '#eef2ff') : _paBg('#1e293b'),
                color: active ? _paFg('#e0e7ff') : _paFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _paSoftBg('rgba(15,23,42,0.5)', '#f1f5f9'), border: '1px solid ' + _paBd('#334155'), fontSize: 12, color: _paFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Your PATH is yours. If a prompt brings up something heavy, that is information; bring it to a counselor or trusted adult. Call or text 988 (Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in immediate danger.'
        );
      }

      function completedCount() {
        var responses = safeObj(d.responses);
        var n = 0;
        for (var i = 0; i < STAGES.length; i++) {
          var v = safeStr(responses[STAGES[i].key]);
          if (v.trim()) n++;
        }
        return n;
      }

      // ═══════════════════════════════════════════════════════════
      // OVERVIEW — show 8 stages as a left-to-right journey
      // ═══════════════════════════════════════════════════════════
      function renderOverview() {
        var responses = safeObj(d.responses);
        var nameStr = safeStr(d.name);
        var updatedStr = safeStr(d.lastUpdated);
        var doneCount = completedCount();
        var pct = Math.round((doneCount / STAGES.length) * 100);
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 12, background: _paSoftBg('linear-gradient(135deg, rgba(129,140,248,0.16) 0%, rgba(15,23,42,0.4) 60%)', '#eef2ff'), border: '1px solid ' + _paBd('#818cf8'), marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 22, fontWeight: 900, color: _paFg('#e0e7ff') } }, nameStr.trim() ? (nameStr + '’s PATH') : 'My PATH'),
                h('div', { style: { fontSize: 12, color: _paFg('#94a3b8'), marginTop: 4 } },
                  doneCount + ' of ' + STAGES.length + ' stages filled',
                  updatedStr ? ' · updated ' + updatedStr : ''
                )
              ),
              h('button', { type: 'button', onClick: function() { goto('edit'); }, style: { padding: '10px 16px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _paBd('#818cf8'), background: _paSoftBg('rgba(129,140,248,0.18)', '#e0e7ff'), color: _paFg('#e0e7ff'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✏️ Work on it')
            ),
            h('div', { style: { marginTop: 12, height: 8, borderRadius: 4, background: _paBg('#1e293b'), border: _paHC ? '1px solid #ffff00' : 'none', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-valuetext': doneCount + ' of ' + STAGES.length + ' stages filled (' + pct + '%)', 'aria-label': 'PATH completion' },
              h('div', { style: { height: '100%', width: pct + '%', background: _paHC ? '#ffff00' : 'linear-gradient(90deg, #4f46e5, #fbbf24)', transition: 'width 240ms ease' } })
            )
          ),

          // Backward-first guidance
          h('div', { style: { padding: 12, borderRadius: 8, background: _paSoftBg('rgba(251,191,36,0.10)', '#fffbeb'), borderTop: '1px solid ' + _paBd('#fbbf24'), borderRight: '1px solid ' + _paBd('#fbbf24'), borderBottom: '1px solid ' + _paBd('#fbbf24'), borderLeft: '3px solid ' + _paBd('#fbbf24'), marginBottom: 14, fontSize: 12.5, color: _paFg('#fde68a'), lineHeight: 1.65 } },
            h('strong', null, '⭐ Start with the North Star. '),
            'PATH is filled out BACKWARDS in the original practice: you begin with where you want to go (the North Star) and work back toward what you can do tomorrow. The reason is that small first steps make a lot more sense once you know what you are walking toward.'
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            STAGES.map(function(s, i) {
              var v = safeStr(responses[s.key]);
              var done = v.trim().length > 0;
              var cardEdge = '1px solid ' + (_paHC ? '#ffff00' : (done ? s.color + 'aa' : _paBd('#334155')));
              return h('button', { key: s.key, type: 'button',
                onClick: function() { setPATH({ activeKey: s.key, view: 'edit' }); },
                'aria-label': s.label + (done ? ' (filled in)' : ' (empty)'),
                style: { textAlign: 'left', padding: 14, minHeight: 44, borderRadius: 10, borderTop: cardEdge, borderRight: cardEdge, borderBottom: cardEdge, borderLeft: '4px solid ' + _paBd(s.color), background: _paHC ? '#000000' : (done ? s.color + '14' : _paBg('#0f172a')), cursor: 'pointer', color: _paFg('#e2e8f0') } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 22 }, 'aria-hidden': true }, s.icon),
                  h('div', null,
                    h('div', { style: { fontSize: 12, color: _paFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Stage ' + (i + 1)),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: done ? _paInk(s.color) : _paFg('#e0e7ff') } }, s.label)
                  ),
                  done ? h('span', { style: { marginLeft: 'auto', fontSize: 12, color: _paInk(s.color), fontWeight: 700 } }, '✓') : null
                ),
                h('div', { style: { fontSize: 12, color: _paFg('#94a3b8'), lineHeight: 1.55 } },
                  done ? (v.length > 120 ? v.slice(0, 120) + '...' : v) : s.blurb
                )
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: function() { goto('print'); }, 'aria-label': 'Print my PATH',
              style: { padding: '10px 20px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 10, border: _paBtnBd(), cursor: 'pointer', background: _paGradBtn('linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'), color: _paFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '🖨 Print my PATH')
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        var responses = safeObj(d.responses);
        var activeKey = typeof d.activeKey === 'string' ? d.activeKey : 'northStar';
        var activeIdx = Math.max(0, STAGES.findIndex(function(s) { return s.key === activeKey; }));
        var active = STAGES[activeIdx];
        var resp = safeStr(responses[active.key]);

        function setActiveResponse(text) {
          var key = active.key;
          setPATH(function(prior) {
            var nextResponses = Object.assign({}, safeObj(prior.responses));
            nextResponses[key] = text;
            return { responses: nextResponses };
          });
        }
        function selectStage(nextStage) {
          setPATH({ activeKey: nextStage.key });
          announcePA('Moved to ' + nextStage.label + '.');
          if (typeof document === 'object' && document && typeof document.getElementById === 'function') {
            setTimeout(function() {
              try {
                var el = document.getElementById('path-stage-tab-' + nextStage.key);
                if (el && typeof el.focus === 'function') el.focus();
              } catch (_) {}
            }, 0);
          }
        }
        function goPrev() {
          if (activeIdx > 0) {
            var prevS = STAGES[activeIdx - 1];
            setPATH({ activeKey: prevS.key });
            announcePA('Moved to ' + prevS.label + '.');
          }
        }
        function goNext() {
          if (activeIdx < STAGES.length - 1) {
            var nextS = STAGES[activeIdx + 1];
            setPATH({ activeKey: nextS.key });
            announcePA('Moved to ' + nextS.label + '.');
          }
        }
        var panelEdge = '1px solid ' + (_paHC ? '#ffff00' : active.color + '66');

        return h('div', null,
          h('div', { style: { padding: 10, borderRadius: 8, background: _paBg('#0f172a'), border: '1px solid ' + _paBd('#1e293b'), marginBottom: 12 } },
            h('label', { htmlFor: 'path-name', style: { display: 'block', fontSize: 12, color: _paFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Whose PATH is this?'),
            h('input', { id: 'path-name', type: 'text', value: safeStr(d.name),
              placeholder: 'Your name',
              onChange: function(e) { setPATH({ name: e.target.value }); },
              onKeyDown: function(e) {
                if (isImeComposing(e)) return;
                if (e.key === 'Escape' && safeStr(d.name)) {
                  e.preventDefault();
                  setPATH({ name: '' });
                  announcePA('Cleared name.');
                }
              },
              onBlur: function(e) { scanPathText(e.target.value); },
              style: { width: '100%', minHeight: 44, padding: '8px 10px', boxSizing: 'border-box', borderRadius: 6, border: '1px solid ' + _paBd('#334155'), background: _paBg('#1e293b'), color: _paFg('#e2e8f0'), fontSize: 13 } })
          ),

          h('div', { role: 'tablist', 'aria-label': 'PATH stages', style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 } },
            STAGES.map(function(s, i) {
              var act = s.key === active.key;
              var done = safeStr(responses[s.key]).trim().length > 0;
              return h('button', { key: s.key, id: 'path-stage-tab-' + s.key, type: 'button', role: 'tab', 'aria-selected': act, 'aria-controls': 'path-stage-panel', tabIndex: act ? 0 : -1,
                onClick: function() { setPATH({ activeKey: s.key }); announcePA('Moved to ' + s.label + '.'); },
                onKeyDown: function(e) {
                  if (isImeComposing(e)) return;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectStage(STAGES[(i + 1) % STAGES.length]); }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectStage(STAGES[(i - 1 + STAGES.length) % STAGES.length]); }
                  else if (e.key === 'Home') { e.preventDefault(); selectStage(STAGES[0]); }
                  else if (e.key === 'End') { e.preventDefault(); selectStage(STAGES[STAGES.length - 1]); }
                },
                style: { padding: '8px 12px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 6, border: '1px solid ' + _paBd(act ? s.color : '#334155'), background: act ? _paSoftBg(s.color + '22', '#eef2ff') : _paBg('#1e293b'), color: act ? _paInk(s.color) : (done ? _paFg('#cbd5e1') : _paFg('#94a3b8')), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
                (done ? '✓' : (i + 1)) + ' · ' + s.label
              );
            })
          ),

          h('div', { role: 'tabpanel', id: 'path-stage-panel', 'aria-labelledby': 'path-stage-tab-' + active.key, style: { padding: 18, borderRadius: 12, background: _paSoftBg('linear-gradient(135deg, ' + active.color + '14 0%, rgba(15,23,42,0.4) 60%)', '#f8fafc'), borderTop: panelEdge, borderRight: panelEdge, borderBottom: panelEdge, borderLeft: '4px solid ' + _paBd(active.color), marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 32 }, 'aria-hidden': true }, active.icon),
              h('div', null,
                h('div', { style: { fontSize: 12, color: _paFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Stage ' + (activeIdx + 1) + ' of ' + STAGES.length),
                h('h3', { style: { margin: 0, color: _paInk(active.color), fontSize: 20, fontWeight: 900 } }, active.label)
              )
            ),
            h('p', { style: { margin: '0 0 12px', color: _paFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } }, active.blurb),

            h('label', { htmlFor: 'path-resp', style: { display: 'block', fontSize: 12, color: _paFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, active.label),
            h('textarea', { id: 'path-resp', value: resp,
              onChange: function(e) { setActiveResponse(e.target.value); },
              onBlur: function(e) { scanPathText(e.target.value); },
              placeholder: 'Write here. Take as much room as you need.',
              style: { width: '100%', minHeight: 180, padding: 12, boxSizing: 'border-box', borderRadius: 8, border: '1px solid ' + _paBd('#334155'), background: _paBg('#1e293b'), color: _paFg('#e2e8f0'), fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          h('div', { style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: goPrev, disabled: activeIdx === 0, 'aria-label': 'Previous stage',
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _paBd('#475569'), background: _paBg('#1e293b'), color: activeIdx === 0 ? _paFg('#475569') : _paFg('#cbd5e1'), cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 } }, '← Previous'),
            h('div', { style: { flex: 1 } }),
            h('button', { type: 'button', onClick: function() { goto('overview'); }, style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _paBd('#475569'), background: _paBg('#1e293b'), color: _paFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✓ Done for now'),
            h('button', { type: 'button', onClick: goNext, disabled: activeIdx === STAGES.length - 1, 'aria-label': 'Next stage',
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: _paBtnBd(), background: activeIdx === STAGES.length - 1 ? _paBg('#1e293b') : _paSolid(active.color), color: activeIdx === STAGES.length - 1 ? _paFg('#475569') : _paFg('#fff'), cursor: activeIdx === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13 } }, 'Next →')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var responses = safeObj(d.responses);
        var nameStr = safeStr(d.name);
        var updatedStr = safeStr(d.lastUpdated);
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _paSoftBg('rgba(129,140,248,0.10)', '#eef2ff'), borderRadius: 8, border: '1px solid ' + _paBd('#818cf8') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _paFg('#e0e7ff'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'
            ),
            h('button', { type: 'button', onClick: printNow, style: { padding: '10px 18px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: _paBtnBd(), cursor: 'pointer', background: _paGradBtn('linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'), color: _paFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { type: 'button', onClick: function() { goto('overview'); }, 'aria-label': 'Back to overview',
              style: { padding: '10px 18px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _paBd('#475569'), background: _paBg('#1e293b'), color: _paFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'path-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _paBg('#fff'), color: _paFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _paBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#path-print-region, #path-print-region * { visibility: visible !important; } ' +
              '#path-print-region { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff !important; color: #0f172a !important; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _paBd('#4f46e5') } },
              h('div', { style: { fontSize: 12, color: _paHC ? '#ffff00' : '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'PATH · Planning Alternative Tomorrows with Hope'),
              h('h3', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, nameStr.trim() ? (nameStr + '’s PATH') : 'My PATH'),
              updatedStr ? h('div', { style: { fontSize: 12, color: _paFg('#475569'), marginTop: 4 } }, 'Updated ' + updatedStr) : null
            ),

            STAGES.map(function(s, i) {
              var v = safeStr(responses[s.key]);
              return h('div', { key: s.key, style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, marginBottom: 8, background: _paSolid(s.color), border: _paHC ? '1px solid #ffff00' : 'none', color: _paFg('#fff') } },
                  h('span', { style: { fontSize: 18 }, 'aria-hidden': true }, s.icon),
                  h('span', { style: { fontSize: 12, fontWeight: 700 } }, 'Stage ' + (i + 1) + ' ·'),
                  h('span', { style: { fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label)
                ),
                v ? h('p', { style: { margin: '0 8px', color: _paFg('#0f172a'), fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, v)
                  : h('div', { style: { margin: '0 8px', padding: 8, fontSize: 12, color: _paFg('#475569'), fontStyle: 'italic' } }, '(not filled in)')
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid ' + _paBd('#cbd5e1'), fontSize: 12, color: _paFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'PATH format developed by Pearpoint, O\'Brien, and Forest, Inclusion Press (inclusion.com). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (typeof window === 'object' && window && window.SelHubStandards && typeof window.SelHubStandards.render === 'function' ? window.SelHubStandards.render('path', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: _paBg('#0f172a'), border: '1px solid ' + _paBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _paFg('#a5b4fc'), fontSize: 16 } }, 'What PATH is'),
            h('p', { style: { margin: '0 0 10px', color: _paFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'PATH (Planning Alternative Tomorrows with Hope) is a futures-planning visual that helps a person imagine a hopeful, long-horizon future and then plan backward through eight stages to first steps they can take in the next two weeks. The point is to make the dream concrete enough to move toward, while still letting it be a dream.'
            ),
            h('p', { style: { margin: 0, color: _paFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'PATH is filled out in reverse: start with the North Star, then the Positive Possible (one year), then where you are now, then who is on the journey, then strengths in place and strengths to build, then milestones, then first steps. Working backward keeps the small first steps connected to the bigger vision.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _paBg('#0f172a'), border: '1px solid ' + _paBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _paFg('#a5b4fc'), fontSize: 16 } }, 'PATH and MAPS'),
            h('p', { style: { margin: 0, color: _paFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'PATH and MAPS were developed together at Inclusion Press by Jack Pearpoint, John O\'Brien, and Marsha Forest. They are often paired: MAPS gives a picture of who the person is right now (story, gifts, needs); PATH points them toward where they are going. You can do them in either order, but many facilitators use MAPS first, PATH second.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: _paBg('#0f172a'), border: '1px solid ' + _paBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _paFg('#a5b4fc'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _paFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for PATH or to learn more.'),
            sourceCard('Pearpoint, J., O\'Brien, J., and Forest, M. (1993)', 'PATH: A Workbook for Planning Possible Positive Futures', 'The original PATH workbook from Inclusion Press. Step-by-step facilitator guidance.', null),
            sourceCard('Inclusion Press (PATH section)', 'inclusion.com/path', 'Books, training, and facilitator network. Templates and translated materials.', 'https://inclusion.com/path/'),
            sourceCard('Falvey, M. A., Forest, M., Pearpoint, J., and Rosenberg, R. L. (1997)', 'All My Life\'s a Circle: Using the Tools - Circles, MAPS & PATHS', 'Accessible practitioner guide showing PATH alongside MAPS and Circles of Support in school and family contexts.', null),
            sourceCard('Wells, J. and Sheehey, P. H. (2012)', 'Person-Centered Planning: Strategies to Encourage Participation and Facilitate Communication', 'Teaching Exceptional Children article on PATH and MAPS in special education. Cites the evidence base for student-led PCP.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: _paSoftBg('rgba(245,158,11,0.08)', '#fffbeb'), borderTop: '1px solid ' + _paBd('#f59e0b'), borderRight: '1px solid ' + _paBd('#f59e0b'), borderBottom: '1px solid ' + _paBd('#f59e0b'), borderLeft: '3px solid ' + _paBd('#f59e0b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _paFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _paFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'PATH puts a lot of weight on individual hope and effort. A student in a system that does not invest in them can do a beautiful PATH and still not be able to take the first steps. The system carries part of the work.'),
              h('li', null, 'The "Positive Possible" frame can land hard for students who have learned that hope is dangerous. Some students need permission to NOT plan a year out yet.'),
              h('li', null, 'Like MAPS, PATH works best with allies present, not as a worksheet. The solo version (this tool) is preparation for, not a substitute for, a circle.'),
              h('li', null, 'PATH was developed in the context of disability inclusion, where hope was specifically being denied. Used in other contexts it can drift toward a generic "vision board" exercise; the original was sharper.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: _paSoftBg('rgba(129,140,248,0.10)', '#eef2ff'), borderTop: '1px solid ' + _paBd('#818cf8'), borderRight: '1px solid ' + _paBd('#818cf8'), borderBottom: '1px solid ' + _paBd('#818cf8'), borderLeft: '3px solid ' + _paBd('#818cf8'), fontSize: 12.5, color: _paFg('#e0e7ff'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'PATH works well at transition points (entering a new school, leaving high school, a major life change). For an in-person PATH meeting, plan 90-120 minutes; bring a large piece of paper and markers if you want to make the visual; have a facilitator who is not the student\'s direct teacher. Inclusion Press offers facilitator training.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _paBg('#1e293b'), border: '1px solid ' + _paBd('#334155'), marginBottom: 8 } },
          h('div', { style: { fontSize: 12, color: _paFg('#a5b4fc'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _paFg('#e0e7ff'), fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _paFg('#e0e7ff'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _paFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderOverview();

      return h('div', { className: 'selh-path', style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'PATH' },
        header(),
        navTabs(),
        d._crisisTier >= 3
          ? ((typeof window === 'object' && window && window.SelHub && typeof window.SelHub.renderCrisisResources === 'function')
              ? window.SelHub.renderCrisisResources(h, _paBand)
              : h('div', { role: 'alert', style: { marginBottom: 12, padding: 12, borderRadius: 10, background: _paHC ? '#000000' : 'rgba(239,68,68,0.12)', border: '1px solid ' + (_paHC ? '#ffff00' : '#ef4444'), color: _paFg('#fde68a'), fontSize: 13, lineHeight: 1.6 } },
                  'You do not have to carry this alone. Call or text 988 (Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in immediate danger.'))
          : null,
        h('div', { role: 'tabpanel', id: 'path-panel-' + view, 'aria-labelledby': 'path-tab-' + view }, body)
      );
    }
  });

})();
