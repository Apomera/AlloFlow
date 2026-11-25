// ═══════════════════════════════════════════════════════════════
// sel_tool_ecomap.js — Ecomap
// A person-in-environment relationship map developed by Ann Hartman
// (1978). Standard tool in social work for 45+ years. The person
// sits in the center; major life systems (family, school, friends,
// work, faith, etc.) are mapped as outer nodes. Each connection has
// a strength rating, a stress rating, and a flow direction. The
// resulting visual makes patterns of energy, drain, and isolation
// readable at a glance.
// Registered tool ID: "ecomap"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';
  if (typeof window !== 'object' || !window) return;
  if (!window.SelHub || typeof window.SelHub !== 'object') {
    window.SelHub = {
      _registry: Object.create(null), _order: [],
      registerTool: function(id, config) {
        if (!id || typeof id !== 'string' || id === '__proto__' || id === 'constructor' || id === 'prototype' || !config || typeof config !== 'object') return;
        config.id = id; config.ready = config.ready !== false; this._registry[id] = config;
        if (this._order.indexOf(id) === -1) this._order.push(id);
      },
      isRegistered: function(id) { return !!(id && Object.prototype.hasOwnProperty.call(this._registry, id)); },
      renderTool: function(id, ctx) { var tool = (id && Object.prototype.hasOwnProperty.call(this._registry, id)) ? this._registry[id] : null; if (!tool || !tool.render) return null; return tool.render(ctx); }
    };
  }
  if (typeof window.SelHub.isRegistered === 'function' && window.SelHub.isRegistered('ecomap')) return;

  function ensureLiveRegion() {
    if (typeof document !== 'object' || !document || !document.body) return null;
    var existing = document.getElementById('allo-live-ecomap');
    if (existing) return existing;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-ecomap';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
    return liveRegion;
  }
  // WCAG 2.3.3 / 2.4.7 / forced-colors scoped styles for Ecomap
  (function() {
    if (typeof document !== 'object' || !document || !document.head || document.getElementById('allo-ecomap-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-ecomap-a11y-css';
    st.textContent = [
      '@media (prefers-reduced-motion: reduce) {',
      '  .selh-ecomap *, .selh-ecomap *::before, .selh-ecomap *::after {',
      '    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;',
      '    transition-duration: 0.01ms !important; scroll-behavior: auto !important;',
      '  }',
      '}',
      '.selh-ecomap button:focus-visible, .selh-ecomap input:focus-visible, .selh-ecomap select:focus-visible, .selh-ecomap textarea:focus-visible, .selh-ecomap summary:focus-visible, .selh-ecomap a:focus-visible, .selh-ecomap [tabindex]:focus-visible {',
      '  outline: 3px solid #fb7185 !important; outline-offset: 2px !important;',
      '}',
      '@media (forced-colors: active) {',
      '  .selh-ecomap button:focus-visible, .selh-ecomap input:focus-visible, .selh-ecomap select:focus-visible, .selh-ecomap textarea:focus-visible, .selh-ecomap summary:focus-visible, .selh-ecomap a:focus-visible, .selh-ecomap [tabindex]:focus-visible {',
      '    outline: 2px solid Highlight !important; outline-offset: 2px !important;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  var LOCAL_CRISIS_RE = /\b(?:kill\s+myself|end\s+my\s+life|want\s+to\s+die|commit\s+suicide|suicidal|hurt\s+myself|cut\s+myself|self[\s-]?harm|overdose)\b/i;

  function safeNodes(raw) {
    return (Array.isArray(raw) ? raw : []).filter(function(n) { return n && typeof n === 'object'; });
  }

  // The 12 standard life-system categories from Hartman's ecomap.
  var SYSTEMS = [
    { id: 'family',     icon: '🏠', label: 'Family / Household',       color: '#f59e0b' },
    { id: 'extended',   icon: '👵', label: 'Extended Family',          color: '#fb923c' },
    { id: 'friends',    icon: '🤝', label: 'Friends',                  color: '#16a34a' },
    { id: 'school',     icon: '🎓', label: 'School',                   color: '#0ea5e9' },
    { id: 'work',       icon: '💼', label: 'Work / Job',               color: '#0891b2' },
    { id: 'health',     icon: '🏥', label: 'Health / Medical',         color: '#ef4444' },
    { id: 'faith',      icon: '🕯️', label: 'Faith / Spirituality',     color: '#a855f7' },
    { id: 'recreation', icon: '🎨', label: 'Recreation / Interests',   color: '#ec4899' },
    { id: 'neighborhood', icon: '🌳', label: 'Neighborhood',           color: '#10b981' },
    { id: 'pets',       icon: '🐾', label: 'Pets / Animals',           color: '#84cc16' },
    { id: 'money',      icon: '💰', label: 'Money / Material',         color: '#eab308' },
    { id: 'services',   icon: '🛟', label: 'Services / Helpers',       color: '#6366f1' }
  ];

  // Hartman's notation: strength (strong/tenuous), stress level (calm/stressful), direction.
  var STRENGTHS = [
    { id: 'strong',  label: 'Strong / supportive', desc: 'Real energy comes from this connection.' },
    { id: 'medium',  label: 'Medium',              desc: 'Present, not central.' },
    { id: 'tenuous', label: 'Tenuous / distant',   desc: 'Weak, barely there.' }
  ];
  var STRESSES = [
    { id: 'calm',     label: 'Calm',     desc: 'Mostly peaceful.' },
    { id: 'mixed',    label: 'Mixed',    desc: 'Sometimes calm, sometimes not.' },
    { id: 'stressful',label: 'Stressful',desc: 'Frequent stress or conflict here.' }
  ];
  var DIRECTIONS = [
    { id: 'mutual',     label: 'Mutual',         desc: 'Energy flows both ways.' },
    { id: 'toMe',       label: 'Flows to me',    desc: 'I receive more than I give here.' },
    { id: 'fromMe',     label: 'Flows from me',  desc: 'I give more than I receive here.' }
  ];

  function defaultState() {
    return {
      view: 'map',
      personLabel: 'Me',
      nodes: [],                // [{id, systemId, label, strength, stress, direction, notes}]
      addingForSystem: null,    // when 'add' UI is open for a particular system
      editingNodeId: null,
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function uid() { return 'n' + Math.random().toString(36).slice(2, 9); }

  window.SelHub.registerTool('ecomap', {
    icon: '🕸️',
    label: 'Ecomap',
    desc: 'Person-in-environment relationship map. You sit at the center; the systems in your life (family, school, friends, work, faith, etc.) sit around you. Each connection is rated for strength, stress, and energy direction. Developed by Ann Hartman (1978); standard social-work tool for 45+ years.',
    color: 'rose',
    category: 'care-of-self',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _ecoT = (ctx && ctx.theme) || {};
      var _ecoHC = !!_ecoT.isContrast, _ecoL = !_ecoHC && !_ecoT.isDark;
      var _eco_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff','#0b1220':'#f1f5f9'}, _eco_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#0b1220':'#000000','#fff':'#000000'};
      var _eco_FGL = {'#cbd5e1':'#334155','#fda4af':'#9f1239','#fecdd3':'#9f1239','#fb7185':'#be123c','#f59e0b':'#b45309','#ef4444':'#b91c1c','#94a3b8':'#475569','#64748b':'#475569','#e2e8f0':'#1e293b','#fcd34d':'#78350f','#fde68a':'#92400e'}, _eco_FGH = {'#cbd5e1':'#ffff00','#fda4af':'#ffff00','#94a3b8':'#ffff00','#fecdd3':'#ffff00','#fff':'#ffff00','#e2e8f0':'#ffff00','#f59e0b':'#ffff00','#ef4444':'#ffff00','#64748b':'#ffff00','#0f172a':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00','#fde68a':'#ffff00'};
      var _eco_BDL = {'#334155':'#cbd5e1','#1e293b':'#e2e8f0','#475569':'#cbd5e1'}, _eco_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#475569':'#ffff00','#fb7185':'#ffff00','#cbd5e1':'#ffff00','#be123c':'#ffff00','#f59e0b':'#ffff00'};
      var _ecoBg = function(h){ return _ecoHC ? (Object.prototype.hasOwnProperty.call(_eco_BGH, h) ? _eco_BGH[h] : h) : (_ecoL ? (Object.prototype.hasOwnProperty.call(_eco_BGL, h) ? _eco_BGL[h] : h) : h); };
      var _ecoFg = function(h){ return _ecoHC ? (Object.prototype.hasOwnProperty.call(_eco_FGH, h) ? _eco_FGH[h] : h) : (_ecoL ? (Object.prototype.hasOwnProperty.call(_eco_FGL, h) ? _eco_FGL[h] : h) : h); };
      var _ecoBd = function(h){ return _ecoHC ? (Object.prototype.hasOwnProperty.call(_eco_BDH, h) ? _eco_BDH[h] : '#ffff00') : (_ecoL ? (Object.prototype.hasOwnProperty.call(_eco_BDL, h) ? _eco_BDL[h] : h) : h); };
      // accent text needs AA contrast in Dark, Light, and High Contrast (WCAG 1.4.3)
      var _ecoInkL = {'#fb7185':'#be123c','#0ea5e9':'#0369a1','#a855f7':'#7e22ce','#22c55e':'#15803d','#16a34a':'#15803d','#10b981':'#047857','#f59e0b':'#b45309','#eab308':'#a16207','#84cc16':'#4d7c0f','#fb923c':'#c2410c','#ef4444':'#b91c1c','#6366f1':'#4338ca','#3b82f6':'#1d4ed8','#ec4899':'#be185d','#14b8a6':'#0f766e','#06b6d4':'#0e7490'};
      var _ecoInkD = {'#6366f1':'#818cf8','#4f46e5':'#818cf8','#a855f7':'#c084fc','#9333ea':'#c084fc','#7c3aed':'#a78bfa','#8b5cf6':'#a78bfa','#3b82f6':'#60a5fa','#2563eb':'#60a5fa','#ef4444':'#f87171','#dc2626':'#f87171','#059669':'#34d399','#10b981':'#34d399','#16a34a':'#4ade80','#0891b2':'#22d3ee','#0284c7':'#38bdf8','#0d9488':'#2dd4bf','#ec4899':'#f472b6','#db2777':'#f472b6','#64748b':'#94a3b8','#475569':'#94a3b8','#a16207':'#fbbf24','#b45309':'#fbbf24'};
      var _ecoInk = function(c){
        if (_ecoHC) return '#ffff00';
        var lc = String(c).toLowerCase();
        if (_ecoL) return Object.prototype.hasOwnProperty.call(_ecoInkL, lc) ? _ecoInkL[lc] : c;
        return Object.prototype.hasOwnProperty.call(_ecoInkD, lc) ? _ecoInkD[lc] : c;
      };
      if (!ctx || !ctx.React) return null;
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx.toolData && typeof ctx.toolData === 'object') ? ctx.toolData : {};
      var setLabToolData = typeof ctx.setToolData === 'function' ? ctx.setToolData : function() {};
      var setSelHubTool = typeof ctx.setSelHubTool === 'function' ? ctx.setSelHubTool : function() {};
      var addToast = typeof ctx.addToast === 'function' ? ctx.addToast : null;
      var announceToSR = ctx.announceToSR;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var _ecoBand = (ctx && typeof ctx.gradeBand === 'string' && ctx.gradeBand) || 'high';
      function isImeComposing(e) {
        return !!(e && (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)));
      }
      function announceEM(msg) {
        if (!msg) return;
        if (typeof announceToSR === 'function') { try { announceToSR(msg); } catch (_) {} }
        var lr = ensureLiveRegion();
        if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 20); }
      }

      var rawD = labToolData.ecomap;
      var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : defaultState();
      function setEM(patch) {
        setLabToolData(function(prev) {
          var prevObj = (prev && typeof prev === 'object') ? prev : {};
          var priorRaw = prevObj.ecomap;
          var prior = (priorRaw && typeof priorRaw === 'object' && !Array.isArray(priorRaw)) ? priorRaw : defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.nodes || patch.personLabel !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prevObj, { ecomap: next });
        });
      }
      function scanEcomapText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed) return false;
        var blocked = false;
        if (window.SelHub && typeof window.SelHub.safeRehearseCheck === 'function') {
          try {
            var chk = window.SelHub.safeRehearseCheck(trimmed, { toolId: 'ecomap', onSafetyFlag: onSafetyFlag });
            if (chk && chk.action === 'block') blocked = true;
          } catch (_) {}
        }
        if (!blocked && window.SelHub && typeof window.SelHub.scanForCrisis === 'function') {
          try {
            var scan = window.SelHub.scanForCrisis(trimmed);
            if (scan && (scan.hasCrisis || scan.triggered)) {
              blocked = true;
              if (typeof onSafetyFlag === 'function') {
                try { onSafetyFlag({ toolId: 'ecomap', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
              }
            }
          } catch (_) {}
        }
        if (!blocked && LOCAL_CRISIS_RE.test(trimmed)) {
          blocked = true;
          if (typeof onSafetyFlag === 'function') {
            try { onSafetyFlag({ toolId: 'ecomap', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
          }
        }
        if (blocked) {
          setEM({ _crisisTier: 3 });
          if (window.SelHub && typeof window.SelHub.showCrisisModal === 'function') {
            try { window.SelHub.showCrisisModal({ toolName: 'Ecomap', contentSnippet: trimmed }); } catch (_) {}
          }
          announceEM('Support resources are available now: call or text 988, text HOME to 741741, or call 911 in an emergency.');
        }
        return blocked;
      }
      var VALID_VIEWS = ['map', 'list', 'reflect', 'print', 'about'];
      var view = VALID_VIEWS.indexOf(d.view) !== -1 ? d.view : 'map';
      function goto(v) { setEM({ view: VALID_VIEWS.indexOf(v) !== -1 ? v : 'map' }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: _ecoHC ? '#000000' : (_ecoL ? '#f1f5f9' : 'rgba(255,255,255,0.05)'), border: '1px solid ' + _ecoBd('#334155'), borderRadius: 8, padding: '10px 14px', minHeight: 44, cursor: 'pointer', color: _ecoFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _ecoFg('#fda4af'), fontSize: 22, fontWeight: 900 } }, '🕸️ Ecomap'),
            h('div', { style: { fontSize: 12, color: _ecoFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'A relationship map of you and the systems in your life.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'map', label: 'My Ecomap', icon: '🕸️' },
          { id: 'list', label: 'List / Edit', icon: '✏️' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        function onTabKeyDown(e, idx) {
          if (isImeComposing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = tabs.length - 1;
          if (next === null) return;
          e.preventDefault();
          var targetId = tabs[next].id;
          goto(targetId);
          setTimeout(function() {
            var el = (typeof document === 'object' && document) ? document.getElementById('eco-tab-' + targetId) : null;
            if (el && el.focus) el.focus();
          }, 0);
        }
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Ecomap sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, idx) {
            var active = view === t.id;
            return h('button', { key: t.id, type: 'button', id: 'eco-tab-' + t.id, onClick: function() { goto(t.id); },
              onKeyDown: function(e) { onTabKeyDown(e, idx); },
              role: 'tab', 'aria-selected': active, 'aria-controls': 'eco-panel-' + t.id, tabIndex: active ? 0 : -1,
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: (_ecoHC ? '2px' : '1px') + ' solid ' + _ecoBd(active ? '#fb7185' : '#334155'),
                background: active ? (_ecoHC ? '#000000' : (_ecoL ? '#ffe4e6' : 'rgba(251,113,133,0.18)')) : _ecoBg('#1e293b'),
                color: active ? _ecoFg('#fecdd3') : _ecoFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _ecoHC ? '#000000' : (_ecoL ? '#f8fafc' : 'rgba(15,23,42,0.5)'), border: '1px solid ' + _ecoBd('#334155'), fontSize: 11, color: _ecoFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Your ecomap is private to you. The patterns it shows can be intense; if seeing them stirs something heavy, that is information, bring it to a counselor or trusted adult. Call or text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in an emergency.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // MAP — SVG visualization
      // ═══════════════════════════════════════════════════════════
      function renderMap() {
        var nodes = safeNodes(d.nodes);
        // Center coords
        var cx = 320, cy = 320;
        var rOuter = 230;
        var rNode = 48;
        // Assign each SYSTEM with at least one node to a slot around the center.
        var systemsWithNodes = SYSTEMS.filter(function(s) {
          return nodes.some(function(n) { return n.systemId === s.id; });
        });
        // If no nodes, show empty state
        if (nodes.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: _ecoHC ? '#000000' : (_ecoL ? '#fff1f2' : 'linear-gradient(135deg, rgba(251,113,133,0.18) 0%, rgba(15,23,42,0.4) 60%)'), border: '1px solid ' + (_ecoHC ? '#ffff00' : 'rgba(251,113,133,0.4)'), textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 }, 'aria-hidden': 'true' }, '🕸️'),
              h('h3', { style: { margin: '0 0 8px', color: _ecoFg('#fecdd3'), fontSize: 18 } }, 'Your ecomap is empty'),
              h('p', { style: { margin: '0 0 14px', color: _ecoFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.65 } },
                'An ecomap is a picture of you in the middle, surrounded by the systems in your life. Start by adding some of the people, places, or services that take up real space in your week. You decide how many; you decide which ones.'),
              h('button', { type: 'button', onClick: function() { goto('list'); }, style: { padding: '10px 22px', minHeight: 44, borderRadius: 10, border: _ecoHC ? '2px solid #ffff00' : 'none', cursor: 'pointer', background: _ecoHC ? '#000000' : 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: _ecoHC ? '#ffff00' : '#ffffff', fontWeight: 800, fontSize: 14 } },
                '+ Add my first connection')
            ),
            softPointer()
          );
        }

        // Place each NODE on the circle (not the system — each individual node)
        var positioned = nodes.map(function(n, i) {
          var angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          return Object.assign({}, n, {
            angle: angle,
            x: cx + Math.cos(angle) * rOuter,
            y: cy + Math.sin(angle) * rOuter
          });
        });

        function strokeFor(strength) {
          if (strength === 'strong') return { dasharray: '', width: 4 };
          if (strength === 'tenuous') return { dasharray: '4 4', width: 2 };
          return { dasharray: '', width: 2.5 };
        }
        function strokeColorFor(stress) {
          if (_ecoHC) return '#ffff00';
          if (stress === 'stressful') return _ecoFg('#ef4444');
          if (stress === 'mixed') return _ecoFg('#f59e0b');
          return _ecoFg('#94a3b8');
        }
        function systemColor(systemId) {
          var s = SYSTEMS.find(function(s) { return s.id === systemId; });
          return s ? s.color : _ecoFg('#94a3b8');
        }
        function systemIcon(systemId) {
          var s = SYSTEMS.find(function(s) { return s.id === systemId; });
          return s ? s.icon : '◆';
        }

        // Accessibility description, computed from live data
        var sCount = nodes.filter(function(n) { return n.strength === 'strong'; }).length;
        var mCount = nodes.filter(function(n) { return n.strength === 'medium'; }).length;
        var tCount = nodes.filter(function(n) { return n.strength === 'tenuous'; }).length;
        var stressCount = nodes.filter(function(n) { return n.stress === 'stressful'; }).length;
        var mixCount = nodes.filter(function(n) { return n.stress === 'mixed'; }).length;
        var calmCount = nodes.filter(function(n) { return n.stress === 'calm'; }).length;
        var personDisplay = (d.personLabel || '').trim() || 'Me';
        var svgDesc = 'Ecomap centered on ' + personDisplay + ' with ' + nodes.length +
          ' connection' + (nodes.length === 1 ? '' : 's') + '. Strength: ' + sCount + ' strong, ' + mCount +
          ' medium, ' + tCount + ' tenuous. Stress level: ' + calmCount + ' calm, ' + mixCount + ' mixed, ' +
          stressCount + ' stressful.';

        return h('div', null,
          // Person identity
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: _ecoBg('#0f172a'), border: '1px solid ' + _ecoBd('#1e293b'), marginBottom: 12, flexWrap: 'wrap' } },
            h('label', { htmlFor: 'em-person', style: { fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700 } }, 'Center label:'),
            h('input', { id: 'em-person', type: 'text', value: d.personLabel != null ? d.personLabel : 'Me',
              onChange: function(e) { setEM({ personLabel: e.target.value }); },
              onKeyDown: function(e) { if (!isImeComposing(e) && e.key === 'Escape' && d.personLabel) { e.preventDefault(); setEM({ personLabel: '' }); } },
              onBlur: function(e) { scanEcomapText(e.target.value); },
              style: { padding: '10px 12px', minHeight: 44, boxSizing: 'border-box', borderRadius: 6, border: '1px solid ' + _ecoBd('#334155'), background: _ecoBg('#1e293b'), color: _ecoFg('#e2e8f0'), fontSize: 13, width: 180 } }),
            h('div', { style: { marginLeft: 'auto', fontSize: 11, color: _ecoFg('#94a3b8') } }, nodes.length + ' connection' + (nodes.length === 1 ? '' : 's'))
          ),

          // SVG
          h('div', { style: { padding: 10, borderRadius: 12, background: _ecoBg('#0b1220'), border: '1px solid ' + _ecoBd('#1e293b'), marginBottom: 12, overflowX: 'auto' } },
            h('svg', { width: '100%', viewBox: '0 0 640 640', style: { maxWidth: 640 }, 'aria-labelledby': 'ecomap-svg-title ecomap-svg-desc', role: 'img' },
              h('title', { id: 'ecomap-svg-title' }, 'Ecomap visualization'),
              h('desc', { id: 'ecomap-svg-desc' }, svgDesc),
              // Marker defs before lines
              h('defs', null,
                h('marker', { id: 'arrEnd', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' },
                  h('path', { d: 'M0,0 L10,5 L0,10 z', fill: _ecoHC ? '#ffff00' : _ecoFg('#94a3b8') })),
                h('marker', { id: 'arrStart', viewBox: '0 0 10 10', refX: 2, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                  h('path', { d: 'M0,0 L10,5 L0,10 z', fill: _ecoHC ? '#ffff00' : _ecoFg('#94a3b8') }))
              ),
              // Lines trimmed to circle perimeters so arrowheads remain visible
              positioned.map(function(n) {
                var st = strokeFor(n.strength);
                var col = strokeColorFor(n.stress);
                var sysCol = systemColor(n.systemId);
                var cosA = Math.cos(n.angle), sinA = Math.sin(n.angle);
                var lx1 = cx + cosA * 62, ly1 = cy + sinA * 62;
                var lx2 = cx + cosA * (rOuter - rNode - 2), ly2 = cy + sinA * (rOuter - rNode - 2);
                return h('g', { key: 'g_' + n.id },
                  h('line', { x1: lx1, y1: ly1, x2: lx2, y2: ly2,
                    stroke: col, strokeWidth: st.width, strokeDasharray: st.dasharray,
                    markerEnd: n.direction === 'toMe' ? '' : (n.direction === 'fromMe' || n.direction === 'mutual' ? 'url(#arrEnd)' : ''),
                    markerStart: n.direction === 'toMe' || n.direction === 'mutual' ? 'url(#arrStart)' : '' }),
                  // Node circle
                  h('circle', { cx: n.x, cy: n.y, r: rNode, fill: _ecoHC ? '#000000' : sysCol + '22', stroke: _ecoHC ? '#ffff00' : sysCol, strokeWidth: 2 }),
                  h('text', { x: n.x, y: n.y - 6, textAnchor: 'middle', fontSize: 20, fill: _ecoInk(sysCol) }, systemIcon(n.systemId)),
                  h('text', { x: n.x, y: n.y + 14, textAnchor: 'middle', fontSize: 11, fill: _ecoFg('#e2e8f0'), style: { fontWeight: 700 } },
                    (n.label || '').slice(0, 14))
                );
              }),
              // Center person
              h('circle', { cx: cx, cy: cy, r: 60, fill: _ecoHC ? '#000000' : '#be123c', stroke: _ecoHC ? '#ffff00' : _ecoFg('#fda4af'), strokeWidth: 3 }),
              h('text', { x: cx, y: cy + 6, textAnchor: 'middle', fontSize: 16, fill: _ecoHC ? '#ffff00' : '#ffffff', style: { fontWeight: 800 } }, personDisplay)
            )
          ),

          // Text-equivalent (accessible to all users; required for WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: _ecoFg('#fda4af'), fontWeight: 700, padding: '10px 12px', minHeight: 44, boxSizing: 'border-box', borderRadius: 6, background: _ecoBg('#0f172a'), border: '1px solid #1e293b' } }, '🔤 Read this ecomap as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: _ecoBg('#0f172a'), border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: _ecoFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } }, svgDesc),
              SYSTEMS.map(function(sys) {
                var sysNodes = nodes.filter(function(n) { return n.systemId === sys.id; });
                if (sysNodes.length === 0) return null;
                return h('div', { key: sys.id, style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 12, color: _ecoInk(sys.color), fontWeight: 700, marginBottom: 4 } }, sys.icon + ' ' + sys.label + ' (' + sysNodes.length + ')'),
                  h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _ecoFg('#e2e8f0'), fontSize: 12, lineHeight: 1.6 } },
                    sysNodes.map(function(n) {
                      var strengthLbl = (STRENGTHS.find(function(s) { return s.id === n.strength; }) || {}).label || '';
                      var stressLbl = (STRESSES.find(function(s) { return s.id === n.stress; }) || {}).label || '';
                      var directionLbl = (DIRECTIONS.find(function(s) { return s.id === n.direction; }) || {}).label || '';
                      return h('li', { key: n.id }, n.label + ' — ' + strengthLbl + ', ' + stressLbl + ', ' + directionLbl);
                    })
                  )
                );
              })
            )
          ),

          // Legend
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 12 } },
            h('div', { style: { padding: 10, borderRadius: 8, background: _ecoBg('#0f172a'), border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Line thickness'),
              h('div', { style: { fontSize: 12, color: _ecoFg('#cbd5e1'), lineHeight: 1.7 } },
                h('div', null, 'Thick line: strong / supportive'),
                h('div', null, 'Thin line: medium'),
                h('div', null, 'Dashed line: tenuous / distant')
              )
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: _ecoBg('#0f172a'), border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Line color'),
              h('div', { style: { fontSize: 12, color: _ecoFg('#cbd5e1'), lineHeight: 1.7 } },
                h('span', { style: { color: _ecoFg('#94a3b8') } }, 'Grey: calm'), '. ',
                h('span', { style: { color: _ecoFg('#f59e0b') } }, 'Amber: mixed'), '. ',
                h('span', { style: { color: _ecoFg('#ef4444') } }, 'Red: stressful'), '.'
              )
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: _ecoBg('#0f172a'), border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Arrows'),
              h('div', { style: { fontSize: 12, color: _ecoFg('#cbd5e1'), lineHeight: 1.7 } },
                h('div', null, 'Out-arrow only: energy from me'),
                h('div', null, 'In-arrow only: energy to me'),
                h('div', null, 'Both arrows: mutual')
              )
            )
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: function() { goto('list'); }, 'aria-label': 'Add or edit connections',
              style: { padding: '10px 20px', minHeight: 44, borderRadius: 10, border: _ecoHC ? '2px solid #ffff00' : 'none', cursor: 'pointer', background: _ecoHC ? '#000000' : 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: _ecoHC ? '#ffff00' : '#ffffff', fontWeight: 800, fontSize: 14 } },
              '✏️ Add or edit connections'),
            h('button', { type: 'button', onClick: function() { goto('reflect'); }, 'aria-label': 'Reflect on patterns',
              style: { padding: '10px 20px', minHeight: 44, borderRadius: 10, border: '1px solid ' + _ecoBd('#475569'), background: _ecoBg('#1e293b'), color: _ecoFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Reflect'),
            h('button', { type: 'button', onClick: function() { goto('print'); }, 'aria-label': 'Print ecomap',
              style: { padding: '10px 20px', minHeight: 44, borderRadius: 10, border: '1px solid ' + _ecoBd('#475569'), background: _ecoBg('#1e293b'), color: _ecoFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // LIST / EDIT — add/edit connections via form
      // ═══════════════════════════════════════════════════════════
      function renderList() {
        var nodes = safeNodes(d.nodes);

        function startAdd(systemId) { setEM({ addingForSystem: systemId, editingNodeId: null }); }
        function startEdit(id) { setEM({ editingNodeId: id, addingForSystem: null }); }
        function cancelForm() { setEM({ addingForSystem: null, editingNodeId: null }); }
        function deleteNode(id) {
          setLabToolData(function(prev) {
            var prevObj = (prev && typeof prev === 'object') ? prev : {};
            var priorRaw = prevObj.ecomap;
            var prior = (priorRaw && typeof priorRaw === 'object' && !Array.isArray(priorRaw)) ? priorRaw : defaultState();
            var prevNodes = safeNodes(prior.nodes);
            var nx = prevNodes.filter(function(n) { return n.id !== id; });
            return Object.assign({}, prevObj, {
              ecomap: Object.assign({}, prior, {
                nodes: nx,
                editingNodeId: prior.editingNodeId === id ? null : prior.editingNodeId,
                lastUpdated: todayISO()
              })
            });
          });
          announceEM('Connection removed.');
        }

        function saveForm() {
          if (typeof document !== 'object' || !document) return;
          var lbl = document.getElementById('em-form-label');
          var strength = document.getElementById('em-form-strength');
          var stress = document.getElementById('em-form-stress');
          var direction = document.getElementById('em-form-direction');
          var notes = document.getElementById('em-form-notes');
          if (!lbl || !lbl.value.trim()) { if (typeof addToast === 'function') addToast('Add a few words first, then press the button again.', 'info'); return; }
          var entry = {
            label: lbl.value.trim(),
            strength: strength ? strength.value : 'medium',
            stress: stress ? stress.value : 'calm',
            direction: direction ? direction.value : 'mutual',
            notes: notes ? notes.value.trim() : ''
          };
          var isCrisis = scanEcomapText([entry.label, entry.notes].filter(Boolean).join(' '));
          var wasEditing = !!d.editingNodeId;
          setLabToolData(function(prev) {
            var prevObj = (prev && typeof prev === 'object') ? prev : {};
            var priorRaw = prevObj.ecomap;
            var prior = (priorRaw && typeof priorRaw === 'object' && !Array.isArray(priorRaw)) ? priorRaw : defaultState();
            var prevNodes = safeNodes(prior.nodes);
            var tierPatch = isCrisis ? { _crisisTier: 3 } : {};
            if (prior.editingNodeId) {
              var nx = prevNodes.map(function(n) { return n.id === prior.editingNodeId ? Object.assign({}, n, entry) : n; });
              return Object.assign({}, prevObj, { ecomap: Object.assign({}, prior, tierPatch, { nodes: nx, editingNodeId: null, lastUpdated: todayISO() }) });
            }
            var created = Object.assign({}, entry, { id: uid(), systemId: prior.addingForSystem });
            return Object.assign({}, prevObj, { ecomap: Object.assign({}, prior, tierPatch, { nodes: prevNodes.concat([created]), addingForSystem: null, lastUpdated: todayISO() }) });
          });
          if (addToast) addToast(wasEditing ? 'Updated.' : 'Added.', 'success');
          if (!isCrisis) announceEM(wasEditing ? ('Updated ' + entry.label + '.') : ('Added ' + entry.label + ' to ecomap.'));
        }

        function renderForm() {
          var systemId = d.addingForSystem || (d.editingNodeId && (nodes.find(function(n) { return n.id === d.editingNodeId; }) || {}).systemId);
          var sys = SYSTEMS.find(function(s) { return s.id === systemId; });
          var editing = d.editingNodeId ? nodes.find(function(n) { return n.id === d.editingNodeId; }) : null;
          if (!sys) return null;
          var formKey = d.editingNodeId ? ('edit-' + d.editingNodeId) : ('add-' + d.addingForSystem);

          return h('div', { key: formKey,
            onKeyDown: function(e) { if (!isImeComposing(e) && e.key === 'Escape') { e.preventDefault(); cancelForm(); } },
            style: { padding: 16, borderRadius: 12, background: _ecoBg('#0f172a'), border: '2px solid ' + _ecoBd(sys.color), marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, sys.icon),
              h('h3', { style: { margin: 0, color: _ecoInk(sys.color), fontSize: 18, fontWeight: 800 } }, (editing ? 'Edit' : 'Add to') + ' ' + sys.label)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 } },
              h('div', null,
                h('label', { htmlFor: 'em-form-label', style: { display: 'block', fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Who / what is this connection?'),
                h('input', { id: 'em-form-label', type: 'text', defaultValue: editing ? editing.label : '',
                  placeholder: 'e.g. Mom, soccer team, Dr. Singh',
                  onBlur: function(e) { scanEcomapText(e.target.value); },
                  style: { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 12px', borderRadius: 6, border: '1px solid ' + _ecoBd('#334155'), background: _ecoBg('#1e293b'), color: _ecoFg('#e2e8f0'), fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'em-form-strength', style: { display: 'block', fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Strength'),
                h('select', { id: 'em-form-strength', defaultValue: editing ? editing.strength : 'medium',
                  style: { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 12px', borderRadius: 6, border: '1px solid ' + _ecoBd('#334155'), background: _ecoBg('#1e293b'), color: _ecoFg('#e2e8f0'), fontSize: 13 } },
                  STRENGTHS.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'em-form-stress', style: { display: 'block', fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Stress level'),
                h('select', { id: 'em-form-stress', defaultValue: editing ? editing.stress : 'calm',
                  style: { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 12px', borderRadius: 6, border: '1px solid ' + _ecoBd('#334155'), background: _ecoBg('#1e293b'), color: _ecoFg('#e2e8f0'), fontSize: 13 } },
                  STRESSES.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'em-form-direction', style: { display: 'block', fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Energy direction'),
                h('select', { id: 'em-form-direction', defaultValue: editing ? editing.direction : 'mutual',
                  style: { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 12px', borderRadius: 6, border: '1px solid ' + _ecoBd('#334155'), background: _ecoBg('#1e293b'), color: _ecoFg('#e2e8f0'), fontSize: 13 } },
                  DIRECTIONS.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              )
            ),
            h('div', null,
              h('label', { htmlFor: 'em-form-notes', style: { display: 'block', fontSize: 11, color: _ecoFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'Notes (optional)'),
              h('textarea', { id: 'em-form-notes', defaultValue: editing ? editing.notes : '',
                placeholder: 'Anything you want to remember about this connection.',
                onBlur: function(e) { scanEcomapText(e.target.value); },
                style: { width: '100%', boxSizing: 'border-box', minHeight: 60, padding: 10, borderRadius: 6, border: '1px solid ' + _ecoBd('#334155'), background: _ecoBg('#1e293b'), color: _ecoFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', resize: 'vertical' } })
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
              h('button', { type: 'button', onClick: saveForm, 'aria-label': editing ? 'Save changes' : 'Add connection',
                style: { padding: '10px 18px', minHeight: 44, borderRadius: 8, border: _ecoHC ? '2px solid #ffff00' : 'none', cursor: 'pointer', background: _ecoHC ? '#000000' : '#be123c', color: _ecoHC ? '#ffff00' : '#ffffff', fontWeight: 800, fontSize: 13 } }, editing ? '✓ Save' : '+ Add'),
              h('button', { type: 'button', onClick: cancelForm, 'aria-label': 'Cancel',
                style: { padding: '10px 18px', minHeight: 44, borderRadius: 8, border: '1px solid ' + _ecoBd('#475569'), background: _ecoBg('#1e293b'), color: _ecoFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, 'Cancel')
            )
          );
        }

        return h('div', null,
          (d.addingForSystem || d.editingNodeId) ? renderForm() : null,

          // System grid; each shows nodes + "add" button
          SYSTEMS.map(function(sys) {
            var sysNodes = nodes.filter(function(n) { return n.systemId === sys.id; });
            return h('div', { key: sys.id, style: { padding: 12, borderRadius: 10, background: _ecoBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + sys.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, sys.icon),
                h('div', { style: { fontSize: 13, fontWeight: 800, color: _ecoInk(sys.color), flex: 1 } }, sys.label),
                h('button', { type: 'button', onClick: function() { startAdd(sys.id); }, 'aria-label': 'Add a connection in ' + sys.label,
                  style: { padding: '8px 14px', minHeight: 44, minWidth: 44, borderRadius: 6, border: '1px solid ' + sys.color, background: 'transparent', color: _ecoInk(sys.color), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '+ Add')
              ),
              sysNodes.length === 0
                ? h('div', { style: { fontSize: 11, color: _ecoFg('#94a3b8'), fontStyle: 'italic', paddingLeft: 30 } }, '(nothing in this system yet)')
                : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, paddingLeft: 30 } },
                    sysNodes.map(function(n) {
                      var strengthLbl = (STRENGTHS.find(function(s) { return s.id === n.strength; }) || {}).label || '';
                      var stressLbl = (STRESSES.find(function(s) { return s.id === n.stress; }) || {}).label || '';
                      var directionLbl = (DIRECTIONS.find(function(s) { return s.id === n.direction; }) || {}).label || '';
                      return h('div', { key: n.id, style: { padding: 8, borderRadius: 6, background: _ecoBg('#1e293b'), display: 'flex', flexDirection: 'column', gap: 4 } },
                        h('div', { style: { fontSize: 12, fontWeight: 700, color: _ecoFg('#e2e8f0') } }, n.label),
                        h('div', { style: { fontSize: 10, color: _ecoFg('#94a3b8'), lineHeight: 1.5 } },
                          strengthLbl + ' · ' + stressLbl + ' · ' + directionLbl),
                        h('div', { style: { display: 'flex', gap: 6, marginTop: 4 } },
                          h('button', { type: 'button', onClick: function() { startEdit(n.id); }, 'aria-label': 'Edit ' + n.label,
                            style: { padding: '8px 12px', minHeight: 44, minWidth: 44, borderRadius: 6, border: '1px solid #475569', background: 'transparent', color: _ecoFg('#cbd5e1'), cursor: 'pointer', fontSize: 12 } }, '✏️ Edit'),
                          h('button', { type: 'button', onClick: function() { deleteNode(n.id); }, 'aria-label': 'Remove ' + n.label,
                            style: { padding: '8px 12px', minHeight: 44, minWidth: 44, borderRadius: 6, border: '1px solid #475569', background: 'transparent', color: _ecoFg('#94a3b8'), cursor: 'pointer', fontSize: 12 } }, '✕'))
                      );
                    })
                  )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT — pattern questions
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var nodes = safeNodes(d.nodes);
        var stressful = nodes.filter(function(n) { return n.stress === 'stressful'; });
        var fromMe = nodes.filter(function(n) { return n.direction === 'fromMe'; });
        var toMe = nodes.filter(function(n) { return n.direction === 'toMe'; });
        var tenuous = nodes.filter(function(n) { return n.strength === 'tenuous'; });
        var strong = nodes.filter(function(n) { return n.strength === 'strong'; });
        var missingSystems = SYSTEMS.filter(function(s) {
          return !nodes.some(function(n) { return n.systemId === s.id; });
        });

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(251,113,133,0.08)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', marginBottom: 14, fontSize: 13, color: _ecoFg('#fecdd3'), lineHeight: 1.65 } },
            h('strong', null, '💭 The point of reflecting is not to fix anything yet. '),
            'It is to see what is here, with honesty. Some patterns will be a relief to notice; some will be uncomfortable. Both are useful information.'
          ),

          patternCard('🟢 Strong, supportive connections', strong, _ecoInk('#16a34a'),
            'These are the lines that have real energy in them. Notice who and what these are; they are part of how you are still here.'),
          patternCard('🟠 Stressful connections', stressful, _ecoFg('#ef4444'),
            'These are the lines where the stress meter is high. Some are unavoidable (you do not get to pick your immune system or your bus route). Some you have more agency over than you think. Some are work systems can fix, not you.'),
          patternCard('↗ Where my energy flows out', fromMe, _ecoFg('#f59e0b'),
            'These are the people, places, or systems you give to. If this list is long and the in-list is short, that is real information about the season you are in.'),
          patternCard('↙ Where energy flows toward me', toMe, _ecoInk('#0ea5e9'),
            'These are who is feeding you. If this list is thin, the question to sit with is: who could be on it, and what is in the way of letting them in?'),
          patternCard('⋯ Tenuous / distant connections', tenuous, _ecoFg('#94a3b8'),
            'Lines that are barely there. Some are barely there on purpose; some are barely there because the relationship has drifted and you miss it. Different question for each.'),

          missingSystems.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: _ecoBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _ecoFg('#94a3b8'), fontWeight: 700, marginBottom: 6 } }, '🔲 Systems you did not include'),
            h('div', { style: { fontSize: 12, color: _ecoFg('#cbd5e1'), lineHeight: 1.6, marginBottom: 8 } },
              'You did not add anything in these systems: ',
              h('strong', null, missingSystems.map(function(s) { return s.label; }).join(', '))),
            h('div', { style: { fontSize: 12, color: _ecoFg('#94a3b8'), fontStyle: 'italic', lineHeight: 1.55 } },
              'Sometimes a system is empty because it really is not part of your life right now. Sometimes a system is empty because we forget to count it. Worth a second look.')
          ) : null,

          softPointer()
        );
      }

      function patternCard(title, list, color, blurb) {
        return h('div', { style: { padding: 12, borderRadius: 10, background: _ecoBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
          h('div', { style: { fontSize: 12, color: color, fontWeight: 700, marginBottom: 6 } }, title + '  (' + list.length + ')'),
          list.length > 0
            ? h('div', { style: { fontSize: 12.5, color: _ecoFg('#e2e8f0'), lineHeight: 1.65, marginBottom: 6 } },
                list.map(function(n, i) {
                  var sys = SYSTEMS.find(function(s) { return s.id === n.systemId; });
                  return h('span', { key: n.id }, (sys ? sys.icon + ' ' : '') + n.label + (i < list.length - 1 ? '  ·  ' : ''));
                })
              )
            : h('div', { style: { fontSize: 11, color: _ecoFg('#94a3b8'), fontStyle: 'italic', marginBottom: 6 } }, '(none)'),
          h('div', { style: { fontSize: 11.5, color: _ecoFg('#94a3b8'), lineHeight: 1.55, fontStyle: 'italic' } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var nodes = safeNodes(d.nodes);
        var pl = String(d.personLabel || '').trim();
        var printTitle = (!pl || pl === 'Me' || pl === 'My') ? 'My Ecomap' : (pl + '’s Ecomap');
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _ecoHC ? '#000000' : (_ecoL ? '#fff1f2' : 'rgba(251,113,133,0.10)'), borderRadius: 8, border: '1px solid ' + (_ecoHC ? '#ffff00' : 'rgba(251,113,133,0.3)') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _ecoFg('#fecdd3'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Includes the visual map and a summary list. Use your browser\'s print dialog.'
            ),
            h('button', { type: 'button', onClick: printNow, style: { padding: '10px 18px', minHeight: 44, borderRadius: 8, border: _ecoHC ? '2px solid #ffff00' : 'none', cursor: 'pointer', background: _ecoHC ? '#000000' : 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: _ecoHC ? '#ffff00' : '#ffffff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { type: 'button', onClick: function() { goto('map'); }, 'aria-label': 'Back to map',
              style: { padding: '10px 18px', minHeight: 44, borderRadius: 8, border: '1px solid ' + _ecoBd('#475569'), background: _ecoBg('#1e293b'), color: _ecoFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'ecomap-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _ecoBg('#fff'), color: _ecoFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _ecoBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#ecomap-print-region, #ecomap-print-region * { visibility: visible !important; background: #fff !important; color: #0f172a !important; border-color: #cbd5e1 !important; } ' +
              '#ecomap-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _ecoBd('#be123c') } },
              h('div', { style: { fontSize: 10, color: _ecoFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Ecomap'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, printTitle),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _ecoFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Print the list of nodes grouped by system
            SYSTEMS.map(function(sys) {
              var sysNodes = nodes.filter(function(n) { return n.systemId === sys.id; });
              if (sysNodes.length === 0) return null;
              var hdrEdge = _ecoHC ? '1px solid #ffff00' : '1px solid #e2e8f0';
              return h('div', { key: sys.id, style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, marginBottom: 6, background: _ecoHC ? '#000000' : '#f1f5f9', borderTop: hdrEdge, borderRight: hdrEdge, borderBottom: hdrEdge, borderLeft: '4px solid ' + _ecoBd(sys.color), color: _ecoHC ? '#ffff00' : '#0f172a' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, sys.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, sys.label)
                ),
                sysNodes.map(function(n) {
                  var strengthLbl = (STRENGTHS.find(function(s) { return s.id === n.strength; }) || {}).label || '';
                  var stressLbl = (STRESSES.find(function(s) { return s.id === n.stress; }) || {}).label || '';
                  var directionLbl = (DIRECTIONS.find(function(s) { return s.id === n.direction; }) || {}).label || '';
                  return h('div', { key: n.id, style: { marginBottom: 8, paddingLeft: 12 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: _ecoFg('#0f172a') } }, n.label),
                    h('div', { style: { fontSize: 11, color: _ecoFg('#475569') } }, strengthLbl + '  ·  ' + stressLbl + '  ·  ' + directionLbl),
                    n.notes ? h('div', { style: { fontSize: 11.5, color: _ecoFg('#0f172a'), marginTop: 2, fontStyle: 'italic' } }, n.notes) : null
                  );
                })
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _ecoFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'Ecomap format from Hartman, A. (1978), "Diagrammatic Assessment of Family Relationships," Social Casework. ',
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
          (window.SelHubStandards && typeof window.SelHubStandards.render === 'function' ? window.SelHubStandards.render('ecomap', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: _ecoBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _ecoFg('#fda4af'), fontSize: 16 } }, 'What an ecomap is'),
            h('p', { style: { margin: '0 0 10px', color: _ecoFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'An ecomap is a relationship map. You sit at the center. The 12 major systems that shape a person\'s life sit around you. For each connection, you record three things: how strong the connection is, how stressful it is, and which way the energy flows. The visual that comes out makes patterns readable that lists do not show.'
            ),
            h('p', { style: { margin: 0, color: _ecoFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Ecomaps are used by social workers, school psychologists, family therapists, hospice teams, and case managers. They are also useful as a private self-portrait, to see at a glance what your week is actually made of.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _ecoBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _ecoFg('#fda4af'), fontSize: 16 } }, 'Where the ecomap comes from'),
            h('p', { style: { margin: 0, color: _ecoFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The ecomap was developed by social worker Ann Hartman in 1978 ("Diagrammatic Assessment of Family Relationships," Social Casework). Hartman wanted a way to make a family\'s ecological context visible during assessment, complementing the older Bowen-tradition genogram. The form has changed almost not at all in 45 years; the notation Hartman published (solid lines for strong, dashed for tenuous, jagged or hashed lines for stressful, arrows for energy flow) is still the convention.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: _ecoBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _ecoFg('#fda4af'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _ecoFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for ecomaps or to learn more.'),
            sourceCard('Hartman, A. (1978)', '"Diagrammatic Assessment of Family Relationships," Social Casework, 59(8), 465-476', 'The original publication that introduced the ecomap notation. Foundational text.', null),
            sourceCard('Hartman, A. (1995)', '"Diagrammatic Assessment of Family Relationships," Families in Society, 76(2), 111-122', 'Hartman\'s own revision of the original article, widely cited. Reflects 17 years of practice with the tool.', null),
            sourceCard('McGoldrick, M., Gerson, R., and Petry, S. (2020)', 'Genograms: Assessment and Treatment (4th ed.), W. W. Norton', 'The standard practitioner reference. Includes ecomap notation and integration with genograms.', null),
            sourceCard('National Association of Social Workers', 'socialworkers.org', 'Professional standards and practice resources, including practice guides that use ecomaps in family assessment.', 'https://www.socialworkers.org/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _ecoFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _ecoFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'An ecomap is a snapshot. The shape of your life right now is not the shape it will have in three months. Redrawing it every few months is more useful than treating any single map as the answer.'),
              h('li', null, 'The strength and stress ratings are your perception, not measurement. Someone else could draw their version of your ecomap and disagree on every line.'),
              h('li', null, 'The 12-system list is a useful starting point, not a definitive list. If a category that matters to your life is missing (a recovery program, a sport, a fandom, a chosen-family group), you can write it into one of the existing systems or use the notes.'),
              h('li', null, 'Ecomaps can show that a system is stressful or extracting, but they cannot fix that. Some stressful connections are unjust (a workplace, a school, a landlord) and the visual makes that clearer; the work of changing them is its own thing.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: _ecoFg('#fecdd3'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Ecomaps work well as a beginning-of-year inventory, alongside an entry interview or as a private student artifact. For students whose home life is complicated, do NOT require sharing of the ecomap with the class or with families; let it be private to the student, or shared only with a school counselor. The act of drawing the map is often valuable even if no one else ever sees it.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _ecoBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _ecoFg('#fda4af'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _ecoFg('#fecdd3'), fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _ecoFg('#fecdd3'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _ecoFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'list') body = renderList();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderMap();

      var crisisBanner = null;
      if (d._crisisTier >= 3) {
        if (window.SelHub && typeof window.SelHub.renderCrisisResources === 'function') {
          crisisBanner = window.SelHub.renderCrisisResources(h, _ecoBand);
        } else {
          crisisBanner = h('div', { role: 'alert', style: { marginBottom: 14, padding: 14, borderRadius: 10, background: _ecoHC ? '#000000' : (_ecoL ? '#fef2f2' : 'rgba(239,68,68,0.14)'), border: '2px solid ' + (_ecoHC ? '#ffff00' : '#dc2626'), color: _ecoFg('#fecdd3'), fontSize: 12.5, lineHeight: 1.6 } },
            h('strong', null, 'Immediate support is available: '),
            'Call or text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), call 911 in an emergency, or reach out to a trusted adult.'
          );
        }
      }

      return h('div', { className: 'selh-ecomap', style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Ecomap' },
        header(),
        navTabs(),
        crisisBanner,
        h('div', { role: 'tabpanel', id: 'eco-panel-' + view, 'aria-labelledby': 'eco-tab-' + view }, body)
      );
    }
  });

})();
