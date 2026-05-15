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

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('ecomap'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-ecomap')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-ecomap';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

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
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.ecomap || defaultState();
      function setEM(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.ecomap) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.nodes || patch.personLabel !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { ecomap: next });
        });
      }
      var view = d.view || 'map';
      function goto(v) { setEM({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fda4af', fontSize: 22, fontWeight: 900 } }, '🕸️ Ecomap'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A relationship map of you and the systems in your life.')
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
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Ecomap sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#fb7185' : '#334155'),
                background: active ? 'rgba(251,113,133,0.18)' : '#1e293b',
                color: active ? '#fecdd3' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Your ecomap is private to you. The patterns it shows can be intense; if seeing them stirs something heavy, that is information, bring it to a counselor or trusted adult. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // MAP — SVG visualization
      // ═══════════════════════════════════════════════════════════
      function renderMap() {
        var nodes = d.nodes || [];
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
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,113,133,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(251,113,133,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🕸️'),
              h('h3', { style: { margin: '0 0 8px', color: '#fecdd3', fontSize: 18 } }, 'Your ecomap is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'An ecomap is a picture of you in the middle, surrounded by the systems in your life. Start by adding some of the people, places, or services that take up real space in your week. You decide how many; you decide which ones.'),
              h('button', { onClick: function() { goto('list'); }, 'aria-label': 'Start adding connections',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Add my first connection')
            ),
            softPointer()
          );
        }

        // Place each NODE on the circle (not the system — each individual node)
        var positioned = nodes.map(function(n, i) {
          var angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          return Object.assign({}, n, {
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
          if (stress === 'stressful') return '#ef4444';
          if (stress === 'mixed') return '#f59e0b';
          return '#94a3b8';
        }
        function systemColor(systemId) {
          var s = SYSTEMS.find(function(s) { return s.id === systemId; });
          return s ? s.color : '#94a3b8';
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
        var svgDesc = 'Ecomap centered on ' + (d.personLabel || 'Me') + ' with ' + nodes.length +
          ' connection' + (nodes.length === 1 ? '' : 's') + '. Strength: ' + sCount + ' strong, ' + mCount +
          ' medium, ' + tCount + ' tenuous. Stress level: ' + calmCount + ' calm, ' + mixCount + ' mixed, ' +
          stressCount + ' stressful.';

        return h('div', null,
          // Person identity
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12, flexWrap: 'wrap' } },
            h('label', { htmlFor: 'em-person', style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Center label:'),
            h('input', { id: 'em-person', type: 'text', value: d.personLabel || 'Me',
              onChange: function(e) { setEM({ personLabel: e.target.value }); },
              style: { padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, width: 160 } }),
            h('div', { style: { marginLeft: 'auto', fontSize: 11, color: '#94a3b8' } }, nodes.length + ' connection' + (nodes.length === 1 ? '' : 's'))
          ),

          // SVG
          h('div', { style: { padding: 10, borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto' } },
            h('svg', { width: '100%', viewBox: '0 0 640 640', style: { maxWidth: 640 }, 'aria-labelledby': 'ecomap-svg-title ecomap-svg-desc', role: 'img' },
              h('title', { id: 'ecomap-svg-title' }, 'Ecomap visualization'),
              h('desc', { id: 'ecomap-svg-desc' }, svgDesc),
              // Lines
              positioned.map(function(n) {
                var st = strokeFor(n.strength);
                var col = strokeColorFor(n.stress);
                var sysCol = systemColor(n.systemId);
                // Arrowhead marker id per direction
                return h('g', { key: 'g_' + n.id },
                  h('line', { x1: cx, y1: cy, x2: n.x, y2: n.y,
                    stroke: col, strokeWidth: st.width, strokeDasharray: st.dasharray,
                    markerEnd: n.direction === 'toMe' ? '' : (n.direction === 'fromMe' || n.direction === 'mutual' ? 'url(#arrEnd)' : ''),
                    markerStart: n.direction === 'toMe' || n.direction === 'mutual' ? 'url(#arrStart)' : '' }),
                  // Node circle
                  h('circle', { cx: n.x, cy: n.y, r: rNode, fill: sysCol + '22', stroke: sysCol, strokeWidth: 2 }),
                  h('text', { x: n.x, y: n.y - 6, textAnchor: 'middle', fontSize: 20, fill: sysCol }, systemIcon(n.systemId)),
                  h('text', { x: n.x, y: n.y + 14, textAnchor: 'middle', fontSize: 11, fill: '#e2e8f0', style: { fontWeight: 700 } },
                    (n.label || '').slice(0, 14))
                );
              }),
              // Marker defs
              h('defs', null,
                h('marker', { id: 'arrEnd', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' },
                  h('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#94a3b8' })),
                h('marker', { id: 'arrStart', viewBox: '0 0 10 10', refX: 2, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                  h('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#94a3b8' }))
              ),
              // Center person
              h('circle', { cx: cx, cy: cy, r: 60, fill: '#fb7185', stroke: '#fda4af', strokeWidth: 3 }),
              h('text', { x: cx, y: cy + 6, textAnchor: 'middle', fontSize: 16, fill: '#fff', style: { fontWeight: 800 } }, d.personLabel || 'Me')
            )
          ),

          // Text-equivalent (accessible to all users; required for WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#fda4af', fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b' } }, '🔤 Read this ecomap as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, svgDesc),
              SYSTEMS.map(function(sys) {
                var sysNodes = nodes.filter(function(n) { return n.systemId === sys.id; });
                if (sysNodes.length === 0) return null;
                return h('div', { key: sys.id, style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 12, color: sys.color, fontWeight: 700, marginBottom: 4 } }, sys.icon + ' ' + sys.label + ' (' + sysNodes.length + ')'),
                  h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 12, lineHeight: 1.6 } },
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
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Line thickness'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
                h('div', null, 'Thick line: strong / supportive'),
                h('div', null, 'Thin line: medium'),
                h('div', null, 'Dashed line: tenuous / distant')
              )
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Line color'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
                h('span', { style: { color: '#94a3b8' } }, 'Grey: calm'), '. ',
                h('span', { style: { color: '#f59e0b' } }, 'Amber: mixed'), '. ',
                h('span', { style: { color: '#ef4444' } }, 'Red: stressful'), '.'
              )
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Arrows'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
                h('div', null, 'Out-arrow only: energy from me'),
                h('div', null, 'In-arrow only: energy to me'),
                h('div', null, 'Both arrows: mutual')
              )
            )
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('list'); }, 'aria-label': 'Add or edit connections',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✏️ Add or edit connections'),
            h('button', { onClick: function() { goto('reflect'); }, 'aria-label': 'Reflect on patterns',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Reflect'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print ecomap',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // LIST / EDIT — add/edit connections via form
      // ═══════════════════════════════════════════════════════════
      function renderList() {
        var nodes = d.nodes || [];

        function startAdd(systemId) { setEM({ addingForSystem: systemId, editingNodeId: null }); }
        function startEdit(id) { setEM({ editingNodeId: id, addingForSystem: null }); }
        function cancelForm() { setEM({ addingForSystem: null, editingNodeId: null }); }
        function deleteNode(id) {
          var nx = nodes.filter(function(n) { return n.id !== id; });
          setEM({ nodes: nx });
          if (announceToSR) announceToSR('Connection removed.');
        }

        function saveForm() {
          var lbl = document.getElementById('em-form-label');
          var strength = document.getElementById('em-form-strength');
          var stress = document.getElementById('em-form-stress');
          var direction = document.getElementById('em-form-direction');
          var notes = document.getElementById('em-form-notes');
          if (!lbl || !lbl.value.trim()) return;
          var entry = {
            label: lbl.value.trim(),
            strength: strength ? strength.value : 'medium',
            stress: stress ? stress.value : 'calm',
            direction: direction ? direction.value : 'mutual',
            notes: notes ? notes.value.trim() : ''
          };
          if (d.editingNodeId) {
            var nx = nodes.map(function(n) { return n.id === d.editingNodeId ? Object.assign({}, n, entry) : n; });
            setEM({ nodes: nx, editingNodeId: null });
            if (addToast) addToast('Updated.', 'success');
          } else {
            entry.id = uid();
            entry.systemId = d.addingForSystem;
            setEM({ nodes: nodes.concat([entry]), addingForSystem: null });
            if (addToast) addToast('Added.', 'success');
          }
        }

        function renderForm() {
          var systemId = d.addingForSystem || (d.editingNodeId && (nodes.find(function(n) { return n.id === d.editingNodeId; }) || {}).systemId);
          var sys = SYSTEMS.find(function(s) { return s.id === systemId; });
          var editing = d.editingNodeId ? nodes.find(function(n) { return n.id === d.editingNodeId; }) : null;
          if (!sys) return null;

          return h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '2px solid ' + sys.color, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 28 } }, sys.icon),
              h('h3', { style: { margin: 0, color: sys.color, fontSize: 18, fontWeight: 800 } }, (editing ? 'Edit' : 'Add to ') + ' ' + sys.label)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 } },
              h('div', null,
                h('label', { htmlFor: 'em-form-label', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Who / what is this connection?'),
                h('input', { id: 'em-form-label', type: 'text', defaultValue: editing ? editing.label : '',
                  placeholder: 'e.g. Mom, soccer team, Dr. Singh',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'em-form-strength', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Strength'),
                h('select', { id: 'em-form-strength', defaultValue: editing ? editing.strength : 'medium',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  STRENGTHS.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'em-form-stress', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Stress level'),
                h('select', { id: 'em-form-stress', defaultValue: editing ? editing.stress : 'calm',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  STRESSES.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'em-form-direction', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Energy direction'),
                h('select', { id: 'em-form-direction', defaultValue: editing ? editing.direction : 'mutual',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  DIRECTIONS.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              )
            ),
            h('div', null,
              h('label', { htmlFor: 'em-form-notes', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Notes (optional)'),
              h('textarea', { id: 'em-form-notes', defaultValue: editing ? editing.notes : '',
                placeholder: 'Anything you want to remember about this connection.',
                style: { width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' } })
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
              h('button', { onClick: saveForm, 'aria-label': editing ? 'Save changes' : 'Add connection',
                style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: sys.color, color: '#fff', fontWeight: 800, fontSize: 13 } }, editing ? '✓ Save' : '+ Add'),
              h('button', { onClick: cancelForm, 'aria-label': 'Cancel',
                style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, 'Cancel')
            )
          );
        }

        return h('div', null,
          (d.addingForSystem || d.editingNodeId) ? renderForm() : null,

          // System grid; each shows nodes + "add" button
          SYSTEMS.map(function(sys) {
            var sysNodes = nodes.filter(function(n) { return n.systemId === sys.id; });
            return h('div', { key: sys.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + sys.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 22 } }, sys.icon),
                h('div', { style: { fontSize: 13, fontWeight: 800, color: sys.color, flex: 1 } }, sys.label),
                h('button', { onClick: function() { startAdd(sys.id); }, 'aria-label': 'Add a connection in ' + sys.label,
                  style: { padding: '4px 10px', borderRadius: 6, border: '1px solid ' + sys.color, background: 'transparent', color: sys.color, cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '+ Add')
              ),
              sysNodes.length === 0
                ? h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic', paddingLeft: 30 } }, '(nothing in this system yet)')
                : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, paddingLeft: 30 } },
                    sysNodes.map(function(n) {
                      var strengthLbl = (STRENGTHS.find(function(s) { return s.id === n.strength; }) || {}).label || '';
                      var stressLbl = (STRESSES.find(function(s) { return s.id === n.stress; }) || {}).label || '';
                      var directionLbl = (DIRECTIONS.find(function(s) { return s.id === n.direction; }) || {}).label || '';
                      return h('div', { key: n.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', display: 'flex', flexDirection: 'column', gap: 4 } },
                        h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, n.label),
                        h('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.5 } },
                          strengthLbl + ' · ' + stressLbl + ' · ' + directionLbl),
                        h('div', { style: { display: 'flex', gap: 4 } },
                          h('button', { onClick: function() { startEdit(n.id); }, 'aria-label': 'Edit ' + n.label,
                            style: { padding: '2px 8px', borderRadius: 4, border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 10 } }, '✏️ Edit'),
                          h('button', { onClick: function() { deleteNode(n.id); }, 'aria-label': 'Remove ' + n.label,
                            style: { padding: '2px 8px', borderRadius: 4, border: '1px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 10 } }, '✕'))
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
        var nodes = d.nodes || [];
        var stressful = nodes.filter(function(n) { return n.stress === 'stressful'; });
        var fromMe = nodes.filter(function(n) { return n.direction === 'fromMe'; });
        var toMe = nodes.filter(function(n) { return n.direction === 'toMe'; });
        var tenuous = nodes.filter(function(n) { return n.strength === 'tenuous'; });
        var strong = nodes.filter(function(n) { return n.strength === 'strong'; });
        var missingSystems = SYSTEMS.filter(function(s) {
          return !nodes.some(function(n) { return n.systemId === s.id; });
        });

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', marginBottom: 14, fontSize: 13, color: '#fecdd3', lineHeight: 1.65 } },
            h('strong', null, '💭 The point of reflecting is not to fix anything yet. '),
            'It is to see what is here, with honesty. Some patterns will be a relief to notice; some will be uncomfortable. Both are useful information.'
          ),

          patternCard('🟢 Strong, supportive connections', strong, '#16a34a',
            'These are the lines that have real energy in them. Notice who and what these are; they are part of how you are still here.'),
          patternCard('🟠 Stressful connections', stressful, '#ef4444',
            'These are the lines where the stress meter is high. Some are unavoidable (you do not get to pick your immune system or your bus route). Some you have more agency over than you think. Some are work systems can fix, not you.'),
          patternCard('↗ Where my energy flows out', fromMe, '#f59e0b',
            'These are the people, places, or systems you give to. If this list is long and the in-list is short, that is real information about the season you are in.'),
          patternCard('↙ Where energy flows toward me', toMe, '#0ea5e9',
            'These are who is feeding you. If this list is thin, the question to sit with is: who could be on it, and what is in the way of letting them in?'),
          patternCard('⋯ Tenuous / distant connections', tenuous, '#94a3b8',
            'Lines that are barely there. Some are barely there on purpose; some are barely there because the relationship has drifted and you miss it. Different question for each.'),

          missingSystems.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, '🔲 Systems you did not include'),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 } },
              'You did not add anything in these systems: ',
              h('strong', null, missingSystems.map(function(s) { return s.label; }).join(', '))),
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.55 } },
              'Sometimes a system is empty because it really is not part of your life right now. Sometimes a system is empty because we forget to count it. Worth a second look.')
          ) : null,

          softPointer()
        );
      }

      function patternCard(title, list, color, blurb) {
        return h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
          h('div', { style: { fontSize: 12, color: color, fontWeight: 700, marginBottom: 6 } }, title + '  (' + list.length + ')'),
          list.length > 0
            ? h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65, marginBottom: 6 } },
                list.map(function(n, i) {
                  var sys = SYSTEMS.find(function(s) { return s.id === n.systemId; });
                  return h('span', { key: n.id }, (sys ? sys.icon + ' ' : '') + n.label + (i < list.length - 1 ? '  ·  ' : ''));
                })
              )
            : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 6 } }, '(none)'),
          h('div', { style: { fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var nodes = d.nodes || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fecdd3', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Includes the visual map and a summary list. Use your browser\'s print dialog.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('map'); }, 'aria-label': 'Back to map',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'ecomap-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#ecomap-print-region, #ecomap-print-region * { visibility: visible !important; } ' +
              '#ecomap-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #be123c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Ecomap'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, (d.personLabel || 'My') + '’s Ecomap'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Print the list of nodes grouped by system
            SYSTEMS.map(function(sys) {
              var sysNodes = nodes.filter(function(n) { return n.systemId === sys.id; });
              if (sysNodes.length === 0) return null;
              return h('div', { key: sys.id, style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, marginBottom: 6, background: sys.color, color: '#fff' } },
                  h('span', { style: { fontSize: 16 } }, sys.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, sys.label)
                ),
                sysNodes.map(function(n) {
                  var strengthLbl = (STRENGTHS.find(function(s) { return s.id === n.strength; }) || {}).label || '';
                  var stressLbl = (STRESSES.find(function(s) { return s.id === n.stress; }) || {}).label || '';
                  var directionLbl = (DIRECTIONS.find(function(s) { return s.id === n.direction; }) || {}).label || '';
                  return h('div', { key: n.id, style: { marginBottom: 8, paddingLeft: 12 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: '#0f172a' } }, n.label),
                    h('div', { style: { fontSize: 11, color: '#475569' } }, strengthLbl + '  ·  ' + stressLbl + '  ·  ' + directionLbl),
                    n.notes ? h('div', { style: { fontSize: 11.5, color: '#0f172a', marginTop: 2, fontStyle: 'italic' } }, n.notes) : null
                  );
                })
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('ecomap', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'What an ecomap is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'An ecomap is a relationship map. You sit at the center. The 12 major systems that shape a person\'s life sit around you. For each connection, you record three things: how strong the connection is, how stressful it is, and which way the energy flows. The visual that comes out makes patterns readable that lists do not show.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Ecomaps are used by social workers, school psychologists, family therapists, hospice teams, and case managers. They are also useful as a private self-portrait, to see at a glance what your week is actually made of.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'Where the ecomap comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The ecomap was developed by social worker Ann Hartman in 1978 ("Diagrammatic Assessment of Family Relationships," Social Casework). Hartman wanted a way to make a family\'s ecological context visible during assessment, complementing the older Bowen-tradition genogram. The form has changed almost not at all in 45 years; the notation Hartman published (solid lines for strong, dashed for tenuous, jagged or hashed lines for stressful, arrows for energy flow) is still the convention.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for ecomaps or to learn more.'),
            sourceCard('Hartman, A. (1978)', '"Diagrammatic Assessment of Family Relationships," Social Casework, 59(8), 465-476', 'The original publication that introduced the ecomap notation. Foundational text.', null),
            sourceCard('Hartman, A. (1995)', '"Diagrammatic Assessment of Family Relationships," Families in Society, 76(2), 111-122', 'Hartman\'s own revision of the original article, widely cited. Reflects 17 years of practice with the tool.', null),
            sourceCard('McGoldrick, M., Gerson, R., and Petry, S. (2020)', 'Genograms: Assessment and Treatment (4th ed.), W. W. Norton', 'The standard practitioner reference. Includes ecomap notation and integration with genograms.', null),
            sourceCard('National Association of Social Workers', 'socialworkers.org', 'Professional standards and practice resources, including practice guides that use ecomaps in family assessment.', 'https://www.socialworkers.org/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'An ecomap is a snapshot. The shape of your life right now is not the shape it will have in three months. Redrawing it every few months is more useful than treating any single map as the answer.'),
              h('li', null, 'The strength and stress ratings are your perception, not measurement. Someone else could draw their version of your ecomap and disagree on every line.'),
              h('li', null, 'The 12-system list is a useful starting point, not a definitive list. If a category that matters to your life is missing (a recovery program, a sport, a fandom, a chosen-family group), you can write it into one of the existing systems or use the notes.'),
              h('li', null, 'Ecomaps can show that a system is stressful or extracting, but they cannot fix that. Some stressful connections are unjust (a workplace, a school, a landlord) and the visual makes that clearer; the work of changing them is its own thing.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', border: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: '#fecdd3', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Ecomaps work well as a beginning-of-year inventory, alongside an entry interview or as a private student artifact. For students whose home life is complicated, do NOT require sharing of the ecomap with the class or with families; let it be private to the student, or shared only with a school counselor. The act of drawing the map is often valuable even if no one else ever sees it.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fda4af', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'list') body = renderList();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderMap();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Ecomap' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
