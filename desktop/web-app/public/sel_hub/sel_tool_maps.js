// ═══════════════════════════════════════════════════════════════
// sel_tool_maps.js — MAPS: Making Action Plans
// A visual person-centered planning tool developed by Pearpoint,
// O'Brien, and Forest (Inclusion Press). Walks the planner through
// eight prompts in sequence: My Story · My Dream · My Nightmare ·
// Who I Am · My Gifts · What I Need · Action Plan · First Steps.
// Used for transition planning, school inclusion, IEP envisioning.
// Registered tool ID: "maps"
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

  if (window.SelHub.isRegistered && window.SelHub.isRegistered('maps')) return;

  var _mpLocalCrisisRe = /\b(kill\s+myself|end\s+my\s+life|want\s+to\s+die|suicid(?:e|al)|hurt\s+myself|self[\s-]?harm|cut(?:ting)?\s+myself|overdose|no\s+reason\s+to\s+live)\b/i;

  function ensureLiveRegion() {
    if (typeof document !== 'object' || !document || !document.body || typeof document.getElementById !== 'function') return null;
    var existing = document.getElementById('allo-live-maps');
    if (existing) return existing;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-maps';
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
    if (document.getElementById('allo-maps-a11y-css')) return;
    var s = document.createElement('style');
    s.id = 'allo-maps-a11y-css';
    s.textContent =
      '.selh-maps button:focus-visible,.selh-maps a:focus-visible,.selh-maps input:focus-visible,.selh-maps textarea:focus-visible,.selh-maps [tabindex]:focus-visible{outline:3px solid #818cf8;outline-offset:2px;}' +
      '.selh-maps button{transition:background-color 140ms ease,border-color 140ms ease,color 140ms ease;}' +
      '@media (prefers-reduced-motion: reduce){.selh-maps,.selh-maps *{transition:none !important;animation:none !important;}}' +
      '@media (forced-colors: active){.selh-maps button:focus-visible,.selh-maps a:focus-visible,.selh-maps input:focus-visible,.selh-maps textarea:focus-visible{outline:2px solid Highlight !important;}.selh-maps button,.selh-maps [role="tab"]{forced-color-adjust:auto;}}';
    document.head.appendChild(s);
  })();

  function isImeComposing(e) {
    return !!(e && (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)));
  }

  // The eight MAPS prompts. The order matters; this is the original
  // Inclusion Press sequence.
  var PROMPTS = [
    { key: 'story',       icon: '📖', label: 'My Story',     color: '#0ea5e9',
      blurb: 'Where I have come from. The chapters of my life so far. The places, people, and events that have shaped who I am right now.' },
    { key: 'dream',       icon: '🌅', label: 'My Dream',     color: '#f59e0b',
      blurb: 'What I really want my life to look like. Not what is realistic, not what I think I should want; what I actually want.' },
    { key: 'nightmare',   icon: '🌑', label: 'My Nightmare', color: '#7c3aed',
      blurb: 'What I am afraid of. What I do NOT want my life to look like. Naming the nightmare so it has less power.' },
    { key: 'identity',    icon: '🪞', label: 'Who I Am',     color: '#ec4899',
      blurb: 'Words that describe me right now. Roles I hold, identities that matter to me, communities I belong to.' },
    { key: 'gifts',       icon: '🎁', label: 'My Gifts',     color: '#16a34a',
      blurb: 'What I bring. Strengths, skills, knowledge, qualities. Things I do well, things people come to me for, things I am proud of.' },
    { key: 'needs',       icon: '🤝', label: 'What I Need',  color: '#0891b2',
      blurb: 'What I need from the people around me to move toward the dream and away from the nightmare. Be specific.' },
    { key: 'plan',        icon: '🗺️', label: 'Action Plan',  color: '#4f46e5',
      blurb: 'Concrete steps that get me from where I am to where I want to be. Who does what, by when.' },
    { key: 'firstSteps',  icon: '🚶', label: 'First Steps',  color: '#dc2626',
      blurb: 'What I will do in the next week or two. Small, doable, today-or-tomorrow steps.' }
  ];

  function defaultState() {
    return {
      view: 'overview',           // 'overview' | 'edit' | 'print' | 'about'
      activeKey: 'story',
      name: '',
      responses: {},              // { story: '...', dream: '...', ... }
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('maps', {
    icon: '🗺️',
    label: 'MAPS',
    desc: 'Making Action Plans: a person-centered planning visual. Eight prompts in sequence (My Story, Dream, Nightmare, Who I Am, Gifts, Needs, Action Plan, First Steps). Developed by Pearpoint, O\'Brien, and Forest at Inclusion Press; widely used in inclusive education and transition planning.',
    color: 'indigo',
    category: 'self-direction',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      if (!ctx || typeof ctx !== 'object' || !ctx.React || typeof ctx.React.createElement !== 'function') return null;
      var _mpT = (ctx && ctx.theme) || {};
      var _mpHC = !!_mpT.isContrast, _mpL = !_mpHC && !_mpT.isDark;
      var _mp_BGL = {'#1e293b':'#ffffff','#0f172a':'#f8fafc'}, _mp_BGH = {'#1e293b':'#000000','#0f172a':'#000000','#fff':'#000000'};
      var _mp_FGL = {'#cbd5e1':'#334155','#a5b4fc':'#3730a3','#94a3b8':'#475569','#e0e7ff':'#3730a3','#e2e8f0':'#1e293b','#fcd34d':'#78350f','#fde68a':'#92400e','#64748b':'#475569'}, _mp_FGH = {'#cbd5e1':'#ffff00','#a5b4fc':'#ffff00','#94a3b8':'#ffff00','#e0e7ff':'#ffff00','#e2e8f0':'#ffff00','#fff':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00','#fde68a':'#ffff00'};
      var _mp_FGD = {'#64748b':'#94a3b8'};
      var _mp_BDL = {'#334155':'#cbd5e1','#1e293b':'#e2e8f0','#475569':'#cbd5e1','#818cf8':'#6366f1'}, _mp_BDH = {'#334155':'#ffff00','#818cf8':'#ffff00','#1e293b':'#ffff00','#475569':'#ffff00','#cbd5e1':'#ffff00','#4f46e5':'#ffff00','#f59e0b':'#ffff00','#0ea5e9':'#ffff00','#7c3aed':'#ffff00','#ec4899':'#ffff00','#16a34a':'#ffff00','#0891b2':'#ffff00','#dc2626':'#ffff00'};
      var _mpBg = function(h){ return _mpHC ? (_mp_BGH[h]||h) : (_mpL ? (_mp_BGL[h]||h) : h); };
      var _mpFg = function(h){ return _mpHC ? (_mp_FGH[h]||h) : (_mpL ? (_mp_FGL[h]||h) : (_mp_FGD[h]||h)); };
      var _mpBd = function(h){ return _mpHC ? (_mp_BDH[h]||h) : (_mpL ? (_mp_BDL[h]||h) : h); };
      // accent text: HC = yellow, Light = 700-weight, Dark = 300/400-weight (1.4.3)
      var _mp_INKL = {'#0ea5e9':'#0369a1','#f59e0b':'#92400e','#7c3aed':'#6d28d9','#ec4899':'#be185d','#16a34a':'#15803d','#0891b2':'#0e7490','#4f46e5':'#4338ca','#dc2626':'#b91c1c'};
      var _mpInk = function(c){ var k = String(c).toLowerCase(); return _mpHC ? '#ffff00' : (_mpL ? (_mp_INKL[k] || c) : ({'#6366f1':'#818cf8','#4f46e5':'#818cf8','#a855f7':'#c084fc','#9333ea':'#c084fc','#7c3aed':'#a78bfa','#8b5cf6':'#a78bfa','#3b82f6':'#60a5fa','#2563eb':'#60a5fa','#ef4444':'#f87171','#dc2626':'#f87171','#059669':'#34d399','#10b981':'#34d399','#16a34a':'#4ade80','#0891b2':'#22d3ee','#0284c7':'#38bdf8','#0ea5e9':'#38bdf8','#0d9488':'#2dd4bf','#ec4899':'#f472b6','#db2777':'#f472b6','#64748b':'#94a3b8','#475569':'#94a3b8','#a16207':'#fbbf24','#b45309':'#fbbf24','#f59e0b':'#fbbf24'}[k] || c)); };
      // white text needs a 700-weight fill (1.4.3)
      var _mpSolid = function(c){ return _mpHC ? '#000000' : ({'#0ea5e9':'#0369a1','#38bdf8':'#0369a1','#0284c7':'#0369a1','#f59e0b':'#b45309','#fbbf24':'#b45309','#d97706':'#b45309','#22c55e':'#15803d','#16a34a':'#15803d','#4ade80':'#15803d','#10b981':'#047857','#059669':'#047857','#ef4444':'#b91c1c','#f87171':'#b91c1c','#dc2626':'#b91c1c','#fb7185':'#be123c','#3b82f6':'#1d4ed8','#60a5fa':'#1d4ed8','#6366f1':'#4338ca','#818cf8':'#4338ca','#a855f7':'#7e22ce','#a78bfa':'#6d28d9','#8b5cf6':'#6d28d9','#ec4899':'#be185d','#f472b6':'#be185d','#14b8a6':'#0f766e','#0d9488':'#0f766e','#06b6d4':'#0e7490','#0891b2':'#0e7490','#f97316':'#c2410c'}[String(c).toLowerCase()] || c); };
      var _mpSoftBg = function(darkTint, lightTint){ return _mpHC ? '#000000' : (_mpL ? (lightTint || '#f1f5f9') : darkTint); };
      var _mpGradBtn = function(grad){ return _mpHC ? '#000000' : grad; };
      var _mpBtnBd = function(){ return _mpHC ? '1px solid #ffff00' : 'none'; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var _mpBand = (ctx && ctx.gradeBand) || 'high';
      function announceMP(msg) {
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

      var rawD = labToolData.maps;
      var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : defaultState();
      function setMAPS(patchOrFn) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var base = safeObj(prev);
          var prevRaw = base.maps;
          var prior = (prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw)) ? prevRaw : defaultState();
          var patch = typeof patchOrFn === 'function' ? patchOrFn(prior) : patchOrFn;
          if (!patch || typeof patch !== 'object') return base;
          var next = Object.assign({}, prior, patch);
          if (patch.responses || patch.name !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, base, { maps: next });
        });
      }
      function scanMapsText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed) return false;
        var blocked = false;
        var sh = (typeof window === 'object' && window && window.SelHub) ? window.SelHub : null;
        try {
          if (sh && typeof sh.safeRehearseCheck === 'function') {
            var chk = sh.safeRehearseCheck(trimmed, { toolId: 'maps', onSafetyFlag: onSafetyFlag });
            if (chk && chk.action === 'block') blocked = true;
          }
          if (!blocked && sh && typeof sh.scanForCrisis === 'function') {
            var scan = sh.scanForCrisis(trimmed);
            if (scan && (scan.triggered || scan.hasCrisis)) {
              blocked = true;
              if (typeof onSafetyFlag === 'function') {
                try { onSafetyFlag({ toolId: 'maps', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
              }
            }
          }
          if (!blocked && !(sh && (typeof sh.safeRehearseCheck === 'function' || typeof sh.scanForCrisis === 'function')) && _mpLocalCrisisRe.test(trimmed)) {
            blocked = true;
            if (typeof onSafetyFlag === 'function') {
              try { onSafetyFlag({ toolId: 'maps', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
            }
          }
          if (blocked) {
            setMAPS({ _crisisTier: 3 });
            if (sh && typeof sh.showCrisisModal === 'function') {
              sh.showCrisisModal({ toolName: 'MAPS', contentSnippet: trimmed });
            }
            announceMP('Support resources are shown on this screen. Call or text 988 or text HOME to 741741.');
          }
        } catch (_) {}
        return blocked;
      }
      var VALID_VIEWS = ['overview', 'edit', 'print', 'about'];
      var view = VALID_VIEWS.indexOf(d.view) !== -1 ? d.view : 'overview';
      function goto(v) { setMAPS({ view: VALID_VIEWS.indexOf(v) !== -1 ? v : 'overview' }); }
      function printNow() { try { if (typeof window === 'object' && window && typeof window.print === 'function') window.print(); } catch (e) {} }

      // ── Header ──
      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: function() { if (typeof setSelHubTool === 'function') setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: _mpSoftBg('rgba(255,255,255,0.05)', '#f1f5f9'), border: '1px solid ' + _mpBd('#334155'), borderRadius: 8, padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: _mpFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _mpFg('#a5b4fc'), fontSize: 22, fontWeight: 900 } }, '🗺️ MAPS'),
            h('div', { style: { fontSize: 12, color: _mpFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'Making Action Plans: a person-centered planning visual.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'overview', label: 'My MAP', icon: '🗺️' },
          { id: 'edit', label: 'Work on it', icon: '✏️' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        function selectTab(nextTab) {
          goto(nextTab.id);
          announceMP('Switched to ' + nextTab.label + '.');
          if (typeof document === 'object' && document && typeof document.getElementById === 'function') {
            setTimeout(function() {
              try {
                var el = document.getElementById('maps-tab-' + nextTab.id);
                if (el && typeof el.focus === 'function') el.focus();
              } catch (_) {}
            }, 0);
          }
        }
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'MAPS sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, ti) {
            var active = view === t.id;
            return h('button', { key: t.id, id: 'maps-tab-' + t.id, type: 'button', onClick: function() { goto(t.id); announceMP('Switched to ' + t.label + '.'); },
              role: 'tab', 'aria-selected': active, 'aria-controls': 'maps-panel-' + t.id, tabIndex: active ? 0 : -1,
              onKeyDown: function(e) {
                if (isImeComposing(e)) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectTab(tabs[(ti + 1) % tabs.length]); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectTab(tabs[(ti - 1 + tabs.length) % tabs.length]); }
                else if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0]); }
                else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1]); }
              },
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _mpBd(active ? '#818cf8' : '#334155'),
                background: active ? _mpSoftBg('rgba(129,140,248,0.18)', '#eef2ff') : _mpBg('#1e293b'),
                color: active ? _mpFg('#e0e7ff') : _mpFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _mpSoftBg('rgba(15,23,42,0.5)', '#f1f5f9'), border: '1px solid ' + _mpBd('#334155'), fontSize: 12, color: _mpFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Your MAP is yours. You decide who sees it. If a prompt brings up something heavy, that is information; bring it to a counselor or trusted adult. Call or text 988 (Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in immediate danger.'
        );
      }

      function completedCount() {
        var responses = safeObj(d.responses);
        var n = 0;
        for (var i = 0; i < PROMPTS.length; i++) {
          var v = safeStr(responses[PROMPTS[i].key]);
          if (v.trim()) n++;
        }
        return n;
      }

      // ═══════════════════════════════════════════════════════════
      // OVERVIEW — show all 8 prompts as cards with progress
      // ═══════════════════════════════════════════════════════════
      function renderOverview() {
        var responses = safeObj(d.responses);
        var nameStr = safeStr(d.name);
        var updatedStr = safeStr(d.lastUpdated);
        var doneCount = completedCount();
        var pct = Math.round((doneCount / PROMPTS.length) * 100);
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 12, background: _mpSoftBg('linear-gradient(135deg, rgba(129,140,248,0.16) 0%, rgba(15,23,42,0.4) 60%)', '#eef2ff'), border: '1px solid ' + _mpBd('#818cf8'), marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 22, fontWeight: 900, color: _mpFg('#e0e7ff') } }, nameStr.trim() ? (nameStr + '’s MAP') : 'My MAP'),
                h('div', { style: { fontSize: 12, color: _mpFg('#94a3b8'), marginTop: 4 } },
                  doneCount + ' of ' + PROMPTS.length + ' sections filled',
                  updatedStr ? ' · updated ' + updatedStr : ''
                )
              ),
              h('button', { type: 'button', onClick: function() { goto('edit'); }, style: { padding: '10px 16px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _mpBd('#818cf8'), background: _mpSoftBg('rgba(129,140,248,0.18)', '#e0e7ff'), color: _mpFg('#e0e7ff'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✏️ Work on it')
            ),
            // Progress bar
            h('div', { style: { marginTop: 12, height: 8, borderRadius: 4, background: _mpBg('#1e293b'), border: _mpHC ? '1px solid #ffff00' : 'none', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-valuetext': doneCount + ' of ' + PROMPTS.length + ' sections filled (' + pct + '%)', 'aria-label': 'MAP completion' },
              h('div', { style: { height: '100%', width: pct + '%', background: _mpHC ? '#ffff00' : 'linear-gradient(90deg, #4f46e5, #818cf8)', transition: 'width 240ms ease' } })
            )
          ),

          // Cards for each prompt
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            PROMPTS.map(function(p) {
              var v = safeStr(responses[p.key]);
              var done = v.trim().length > 0;
              var cardEdge = '1px solid ' + (_mpHC ? '#ffff00' : (done ? p.color + 'aa' : _mpBd('#334155')));
              return h('button', { key: p.key, type: 'button',
                onClick: function() { setMAPS({ activeKey: p.key, view: 'edit' }); },
                'aria-label': p.label + (done ? ' (filled in)' : ' (empty)'),
                style: { textAlign: 'left', padding: 14, minHeight: 44, borderRadius: 10, borderTop: cardEdge, borderRight: cardEdge, borderBottom: cardEdge, borderLeft: '4px solid ' + _mpBd(p.color), background: _mpHC ? '#000000' : (done ? p.color + '14' : _mpBg('#0f172a')), cursor: 'pointer', color: _mpFg('#e2e8f0') } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 22 }, 'aria-hidden': true }, p.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, color: done ? _mpInk(p.color) : _mpFg('#e0e7ff') } }, p.label),
                  done ? h('span', { style: { marginLeft: 'auto', fontSize: 12, color: _mpInk(p.color), fontWeight: 700 } }, '✓ filled') : null
                ),
                h('div', { style: { fontSize: 12, color: _mpFg('#94a3b8'), lineHeight: 1.55 } },
                  done ? (v.length > 120 ? v.slice(0, 120) + '...' : v) : p.blurb
                )
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: function() { goto('print'); }, 'aria-label': 'Print my MAP',
              style: { padding: '10px 20px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 10, border: _mpBtnBd(), cursor: 'pointer', background: _mpGradBtn('linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'), color: _mpFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '🖨 Print my MAP')
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT — one prompt at a time with side nav
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        var responses = safeObj(d.responses);
        var activeKey = typeof d.activeKey === 'string' ? d.activeKey : 'story';
        var activeIdx = Math.max(0, PROMPTS.findIndex(function(p) { return p.key === activeKey; }));
        var active = PROMPTS[activeIdx];
        var resp = safeStr(responses[active.key]);

        function setActiveResponse(text) {
          var key = active.key;
          setMAPS(function(prior) {
            var nextResponses = Object.assign({}, safeObj(prior.responses));
            nextResponses[key] = text;
            return { responses: nextResponses };
          });
        }
        function selectPrompt(nextPrompt) {
          setMAPS({ activeKey: nextPrompt.key });
          announceMP('Moved to ' + nextPrompt.label + '.');
          if (typeof document === 'object' && document && typeof document.getElementById === 'function') {
            setTimeout(function() {
              try {
                var el = document.getElementById('maps-prompt-tab-' + nextPrompt.key);
                if (el && typeof el.focus === 'function') el.focus();
              } catch (_) {}
            }, 0);
          }
        }
        function goPrev() {
          if (activeIdx > 0) {
            var prevP = PROMPTS[activeIdx - 1];
            setMAPS({ activeKey: prevP.key });
            announceMP('Moved to ' + prevP.label + '.');
          }
        }
        function goNext() {
          if (activeIdx < PROMPTS.length - 1) {
            var nextP = PROMPTS[activeIdx + 1];
            setMAPS({ activeKey: nextP.key });
            announceMP('Moved to ' + nextP.label + '.');
          }
        }
        var panelEdge = '1px solid ' + (_mpHC ? '#ffff00' : active.color + '66');

        return h('div', null,
          // Name field once at top
          h('div', { style: { padding: 10, borderRadius: 8, background: _mpBg('#0f172a'), border: '1px solid ' + _mpBd('#1e293b'), marginBottom: 12 } },
            h('label', { htmlFor: 'maps-name', style: { display: 'block', fontSize: 12, color: _mpFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Whose MAP is this?'),
            h('input', { id: 'maps-name', type: 'text', value: safeStr(d.name),
              placeholder: 'Your name',
              onChange: function(e) { setMAPS({ name: e.target.value }); },
              onKeyDown: function(e) {
                if (isImeComposing(e)) return;
                if (e.key === 'Escape' && safeStr(d.name)) {
                  e.preventDefault();
                  setMAPS({ name: '' });
                  announceMP('Cleared name.');
                }
              },
              onBlur: function(e) { scanMapsText(e.target.value); },
              style: { width: '100%', minHeight: 44, padding: '8px 10px', boxSizing: 'border-box', borderRadius: 6, border: '1px solid ' + _mpBd('#334155'), background: _mpBg('#1e293b'), color: _mpFg('#e2e8f0'), fontSize: 13 } })
          ),

          // Step navigator
          h('div', { role: 'tablist', 'aria-label': 'MAPS prompts', style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 } },
            PROMPTS.map(function(p, i) {
              var act = p.key === active.key;
              var done = safeStr(responses[p.key]).trim().length > 0;
              return h('button', { key: p.key, id: 'maps-prompt-tab-' + p.key, type: 'button', role: 'tab', 'aria-selected': act, 'aria-controls': 'maps-prompt-panel', tabIndex: act ? 0 : -1,
                onClick: function() { setMAPS({ activeKey: p.key }); announceMP('Moved to ' + p.label + '.'); },
                onKeyDown: function(e) {
                  if (isImeComposing(e)) return;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectPrompt(PROMPTS[(i + 1) % PROMPTS.length]); }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectPrompt(PROMPTS[(i - 1 + PROMPTS.length) % PROMPTS.length]); }
                  else if (e.key === 'Home') { e.preventDefault(); selectPrompt(PROMPTS[0]); }
                  else if (e.key === 'End') { e.preventDefault(); selectPrompt(PROMPTS[PROMPTS.length - 1]); }
                },
                style: { padding: '8px 12px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 6, border: '1px solid ' + _mpBd(act ? p.color : '#334155'), background: act ? _mpSoftBg(p.color + '22', '#eef2ff') : _mpBg('#1e293b'), color: act ? _mpInk(p.color) : (done ? _mpFg('#cbd5e1') : _mpFg('#94a3b8')), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
                (done ? '✓' : (i + 1)) + ' · ' + p.label
              );
            })
          ),

          // Active prompt
          h('div', { role: 'tabpanel', id: 'maps-prompt-panel', 'aria-labelledby': 'maps-prompt-tab-' + active.key, style: { padding: 18, borderRadius: 12, background: _mpSoftBg('linear-gradient(135deg, ' + active.color + '14 0%, rgba(15,23,42,0.4) 60%)', '#f8fafc'), borderTop: panelEdge, borderRight: panelEdge, borderBottom: panelEdge, borderLeft: '4px solid ' + _mpBd(active.color), marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 32 }, 'aria-hidden': true }, active.icon),
              h('h3', { style: { margin: 0, color: _mpInk(active.color), fontSize: 20, fontWeight: 900 } }, active.label)
            ),
            h('p', { style: { margin: '0 0 12px', color: _mpFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } }, active.blurb),

            h('label', { htmlFor: 'maps-resp', style: { display: 'block', fontSize: 12, color: _mpFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, active.label),
            h('textarea', { id: 'maps-resp', value: resp,
              onChange: function(e) { setActiveResponse(e.target.value); },
              onBlur: function(e) { scanMapsText(e.target.value); },
              placeholder: 'Write here. Take as much room as you need.',
              style: { width: '100%', minHeight: 180, padding: 12, boxSizing: 'border-box', borderRadius: 8, border: '1px solid ' + _mpBd('#334155'), background: _mpBg('#1e293b'), color: _mpFg('#e2e8f0'), fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          // Step prev / next
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: goPrev, disabled: activeIdx === 0, 'aria-label': 'Previous prompt',
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _mpBd('#475569'), background: _mpBg('#1e293b'), color: activeIdx === 0 ? _mpFg('#475569') : _mpFg('#cbd5e1'), cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 } }, '← Previous'),
            h('div', { style: { flex: 1 } }),
            h('button', { type: 'button', onClick: function() { goto('overview'); }, style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _mpBd('#475569'), background: _mpBg('#1e293b'), color: _mpFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✓ Done for now'),
            h('button', { type: 'button', onClick: goNext, disabled: activeIdx === PROMPTS.length - 1, 'aria-label': 'Next prompt',
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: _mpBtnBd(), background: activeIdx === PROMPTS.length - 1 ? _mpBg('#1e293b') : _mpSolid(active.color), color: activeIdx === PROMPTS.length - 1 ? _mpFg('#475569') : _mpFg('#fff'), cursor: activeIdx === PROMPTS.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13 } }, 'Next →')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — full MAP, printable
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var responses = safeObj(d.responses);
        var nameStr = safeStr(d.name);
        var updatedStr = safeStr(d.lastUpdated);
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _mpSoftBg('rgba(129,140,248,0.10)', '#eef2ff'), borderRadius: 8, border: '1px solid ' + _mpBd('#818cf8') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _mpFg('#e0e7ff'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'
            ),
            h('button', { type: 'button', onClick: printNow, style: { padding: '10px 18px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: _mpBtnBd(), cursor: 'pointer', background: _mpGradBtn('linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'), color: _mpFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { type: 'button', onClick: function() { goto('overview'); }, 'aria-label': 'Back to overview',
              style: { padding: '10px 18px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _mpBd('#475569'), background: _mpBg('#1e293b'), color: _mpFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'maps-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _mpBg('#fff'), color: _mpFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _mpBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#maps-print-region, #maps-print-region * { visibility: visible !important; } ' +
              '#maps-print-region { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff !important; color: #0f172a !important; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            // Header
            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _mpBd('#4f46e5') } },
              h('div', { style: { fontSize: 12, color: _mpHC ? '#ffff00' : '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'MAPS · Making Action Plans'),
              h('h3', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, nameStr.trim() ? (nameStr + '’s MAP') : 'My MAP'),
              updatedStr ? h('div', { style: { fontSize: 12, color: _mpFg('#475569'), marginTop: 4 } }, 'Updated ' + updatedStr) : null
            ),

            // Each prompt section
            PROMPTS.map(function(p) {
              var v = safeStr(responses[p.key]);
              return h('div', { key: p.key, style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, marginBottom: 8, background: _mpSolid(p.color), border: _mpHC ? '1px solid #ffff00' : 'none', color: _mpFg('#fff') } },
                  h('span', { style: { fontSize: 18 }, 'aria-hidden': true }, p.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, p.label)
                ),
                v ? h('p', { style: { margin: '0 8px', color: _mpFg('#0f172a'), fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, v)
                  : h('div', { style: { margin: '0 8px', padding: 8, fontSize: 12, color: _mpFg('#475569'), fontStyle: 'italic' } }, '(not filled in)')
              );
            }),

            // Footer
            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid ' + _mpBd('#cbd5e1'), fontSize: 12, color: _mpFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'MAPS format developed by Pearpoint, O\'Brien, and Forest, Inclusion Press (inclusion.com). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT — lineage + sources + honest limits
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (typeof window === 'object' && window && window.SelHubStandards && typeof window.SelHubStandards.render === 'function' ? window.SelHubStandards.render('maps', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: _mpBg('#0f172a'), border: '1px solid ' + _mpBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _mpFg('#a5b4fc'), fontSize: 16 } }, 'What MAPS is'),
            h('p', { style: { margin: '0 0 10px', color: _mpFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'MAPS (Making Action Plans, originally "McGill Action Planning System") is a person-centered planning visual that walks a person and their allies through eight prompts in sequence. The point is not to fill out a form. The point is to gather a circle of people who know and care about you, and to think together about where you are coming from, where you want to go, and what it would take to get there.'
            ),
            h('p', { style: { margin: 0, color: _mpFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'You can do a MAP alone, but the tradition is to do it with a few trusted people present: a facilitator, a graphic recorder (someone who draws/writes responses on a large piece of paper), and the allies you choose. This digital version supports both solo work and prep for an in-person MAP meeting.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _mpBg('#0f172a'), border: '1px solid ' + _mpBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _mpFg('#a5b4fc'), fontSize: 16 } }, 'Where MAPS comes from'),
            h('p', { style: { margin: 0, color: _mpFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'MAPS was developed in the 1980s and 1990s by Jack Pearpoint, John O\'Brien, and Marsha Forest at Inclusion Press in Toronto. It grew out of the inclusion movement (closing institutions, integrating schools, building community for people with disabilities) and was designed as a visual, relational alternative to deficit-focused clinical assessment. It is now used worldwide in schools, transition planning, supported-living services, and family planning. Marsha Forest passed away in 2000; the Marsha Forest Centre continues the work.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: _mpBg('#0f172a'), border: '1px solid ' + _mpBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _mpFg('#a5b4fc'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _mpFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for MAPS or to learn more.'),
            sourceCard('Inclusion Press (Marsha Forest Centre)', 'inclusion.com', 'The original source. Workbooks, training, MAPS facilitator network. Materials are translated into many languages.', 'https://inclusion.com/'),
            sourceCard('Pearpoint, J., O\'Brien, J., and Forest, M. (1993)', 'PATH: A Workbook for Planning Possible Positive Futures', 'Companion volume that includes MAPS practice; the foundational text for both tools.', null),
            sourceCard('Falvey, M. A., Forest, M., Pearpoint, J., and Rosenberg, R. L. (1997)', 'All My Life\'s a Circle: Using the Tools - Circles, MAPS & PATHS', 'Accessible practitioner guide showing MAPS and PATHS in school and family contexts.', null),
            sourceCard('O\'Brien, J. and Mount, B. (2015)', 'Pathfinders: People with Developmental Disabilities and Their Allies Building Communities That Work Better for Everybody', 'Later reflection on the person-centered planning movement and its limits when uncoupled from systems change.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: _mpSoftBg('rgba(245,158,11,0.08)', '#fffbeb'), borderTop: '1px solid ' + _mpBd('#f59e0b'), borderRight: '1px solid ' + _mpBd('#f59e0b'), borderBottom: '1px solid ' + _mpBd('#f59e0b'), borderLeft: '3px solid ' + _mpBd('#f59e0b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _mpFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _mpFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A MAP is only useful if the people in the room actually follow through. John O\'Brien himself has written about how person-centered plans can become "planning theater" if not paired with real resource shifts.'),
              h('li', null, 'The Dream / Nightmare frame can land hard for students with significant trauma or for students who have been told their whole lives that their dreams are unrealistic. Pace it.'),
              h('li', null, 'MAPS works best with a circle of allies, not as an individual worksheet. The solo version (this tool) is preparation for, not a substitute for, a relational MAP.'),
              h('li', null, 'The action plan is the part that gets skipped most often, because it is the part that requires actual change from the system around the person. Watch for that.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: _mpSoftBg('rgba(129,140,248,0.10)', '#eef2ff'), borderTop: '1px solid ' + _mpBd('#818cf8'), borderRight: '1px solid ' + _mpBd('#818cf8'), borderBottom: '1px solid ' + _mpBd('#818cf8'), borderLeft: '3px solid ' + _mpBd('#818cf8'), fontSize: 12.5, color: _mpFg('#e0e7ff'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'MAPS works well as transition planning (8th to 9th, HS to post-secondary), at the start of an IEP cycle, or for any student who needs a circle of allies to plan with. A facilitator who is NOT the student\'s primary teacher generally works best, to avoid the "the teacher wants me to say X" dynamic. Inclusion Press offers facilitator training.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _mpBg('#1e293b'), border: '1px solid ' + _mpBd('#334155'), marginBottom: 8 } },
          h('div', { style: { fontSize: 12, color: _mpFg('#a5b4fc'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _mpFg('#e0e7ff'), fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _mpFg('#e0e7ff'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _mpFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderOverview();

      return h('div', { className: 'selh-maps', style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'MAPS' },
        header(),
        navTabs(),
        d._crisisTier >= 3
          ? ((typeof window === 'object' && window && window.SelHub && typeof window.SelHub.renderCrisisResources === 'function')
              ? window.SelHub.renderCrisisResources(h, _mpBand)
              : h('div', { role: 'alert', style: { marginBottom: 12, padding: 12, borderRadius: 10, background: _mpHC ? '#000000' : 'rgba(239,68,68,0.12)', border: '1px solid ' + (_mpHC ? '#ffff00' : '#ef4444'), color: _mpFg('#fde68a'), fontSize: 13, lineHeight: 1.6 } },
                  'You do not have to carry this alone. Call or text 988 (Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in immediate danger.'))
          : null,
        h('div', { role: 'tabpanel', id: 'maps-panel-' + view, 'aria-labelledby': 'maps-tab-' + view }, body)
      );
    }
  });

})();
