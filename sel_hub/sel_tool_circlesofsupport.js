// ═══════════════════════════════════════════════════════════════
// sel_tool_circlesofsupport.js — Circles of Support
// Four concentric rings of relationship: intimate, friends,
// acquaintances and allies, paid professionals. A common
// observation in special education: students with significant
// disabilities often have a "closest" circle populated almost
// entirely by paid professionals. This visual makes that pattern
// visible. Developed by Marsha Forest and Judith Snow at Inclusion
// Press; widely used in person-centered planning.
// Registered tool ID: "circlesOfSupport"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('circlesOfSupport'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-circlesofsupport')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-circlesofsupport';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The four rings, from closest to outermost.
  var RINGS = [
    { id: 'intimate',     label: 'Intimacy',      color: '#dc2626',
      blurb: 'The people closest to me. Family I would tell anything to, my best one or two friends, the people I cannot imagine my life without.' },
    { id: 'friends',      label: 'Friendship',    color: '#f59e0b',
      blurb: 'People I really like, who really like me back. We choose each other and we keep showing up.' },
    { id: 'allies',       label: 'Participation', color: '#16a34a',
      blurb: 'People I see and do things with, but who are not central friends. Teammates, classmates, neighbors, mentors, acquaintances who are good to me.' },
    { id: 'paid',         label: 'Exchange (paid)', color: '#0ea5e9',
      blurb: 'People who are part of my life because it is their job: teachers, coaches, doctors, therapists, case managers, support staff. They can be wonderful people; they are still paid to be there.' }
  ];

  function defaultState() {
    return {
      view: 'circles',
      personLabel: 'Me',
      rings: { intimate: [], friends: [], allies: [], paid: [] },
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('circlesOfSupport', {
    icon: '🎯',
    label: 'Circles of Support',
    desc: 'Four concentric rings of relationship: Intimacy, Friendship, Participation, Exchange (paid). A way to see at a glance who is actually close. From Forest and Snow at Inclusion Press; widely used in person-centered planning, particularly with disabled students whose closest circle is often filled with paid staff.',
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

      var d = labToolData.circlesOfSupport || defaultState();
      function setCOS(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.circlesOfSupport) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.rings || patch.personLabel !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { circlesOfSupport: next });
        });
      }
      var view = d.view || 'circles';
      function goto(v) { setCOS({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function rings() { return d.rings || { intimate: [], friends: [], allies: [], paid: [] }; }
      function totalCount() { var r = rings(); return r.intimate.length + r.friends.length + r.allies.length + r.paid.length; }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fda4af', fontSize: 22, fontWeight: 900 } }, '🎯 Circles of Support'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Four concentric rings of relationship around the center of your life.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'circles', label: 'My Circles', icon: '🎯' },
          { id: 'edit', label: 'Edit', icon: '✏️' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Circles of Support sections',
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
          'This is yours. If the picture is thinner than you wished it would be, that is real information; bring it to a counselor or trusted adult if you want to talk about it. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CIRCLES — SVG visualization
      // ═══════════════════════════════════════════════════════════
      function renderCircles() {
        var r = rings();
        if (totalCount() === 0) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,113,133,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(251,113,133,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🎯'),
              h('h3', { style: { margin: '0 0 8px', color: '#fecdd3', fontSize: 18 } }, 'Your circles are empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'Four rings around you. Closest ring is the people you would tell anything to. The next ring is friends. The next is people you do things with. The outer ring is people who are part of your life because it is their job. Add a few names and see what your picture looks like.'),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Start adding people',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start my circles')
            ),
            softPointer()
          );
        }

        // SVG rings
        var cx = 280, cy = 280;
        var radii = [70, 130, 200, 270];

        function placeOn(ringIdx, names) {
          if (!names || names.length === 0) return [];
          var ringR = ringIdx === 0 ? 35 : (radii[ringIdx - 1] + radii[ringIdx]) / 2;
          return names.map(function(name, i) {
            var angle = (i / Math.max(1, names.length)) * Math.PI * 2 - Math.PI / 2;
            return { name: name, x: cx + Math.cos(angle) * ringR, y: cy + Math.sin(angle) * ringR };
          });
        }

        // Accessibility description
        var svgDesc = 'Circles of Support centered on ' + (d.personLabel || 'Me') + ': ' +
          r.intimate.length + ' in Intimacy ring, ' + r.friends.length + ' in Friendship ring, ' +
          r.allies.length + ' in Participation ring, ' + r.paid.length + ' in Exchange (paid) ring.';

        return h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12, flexWrap: 'wrap' } },
            h('label', { htmlFor: 'cos-person', style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Center label:'),
            h('input', { id: 'cos-person', type: 'text', value: d.personLabel || 'Me',
              onChange: function(e) { setCOS({ personLabel: e.target.value }); },
              style: { padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, width: 160 } }),
            h('div', { style: { marginLeft: 'auto', fontSize: 11, color: '#94a3b8' } }, totalCount() + ' total')
          ),

          h('div', { style: { padding: 10, borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto' } },
            h('svg', { width: '100%', viewBox: '0 0 560 560', style: { maxWidth: 560 }, 'aria-labelledby': 'cos-svg-title cos-svg-desc', role: 'img' },
              h('title', { id: 'cos-svg-title' }, 'Circles of Support visualization'),
              h('desc', { id: 'cos-svg-desc' }, svgDesc),
              // Outer to inner: paid, allies, friends, intimate
              h('circle', { cx: cx, cy: cy, r: radii[3], fill: '#0ea5e911', stroke: '#0ea5e966', strokeWidth: 1.5 }),
              h('circle', { cx: cx, cy: cy, r: radii[2], fill: '#16a34a14', stroke: '#16a34a66', strokeWidth: 1.5 }),
              h('circle', { cx: cx, cy: cy, r: radii[1], fill: '#f59e0b18', stroke: '#f59e0b66', strokeWidth: 1.5 }),
              h('circle', { cx: cx, cy: cy, r: radii[0], fill: '#dc262624', stroke: '#dc262688', strokeWidth: 2 }),
              // Ring labels (placed at top of each ring)
              h('text', { x: cx, y: cy - radii[3] + 14, textAnchor: 'middle', fontSize: 11, fill: '#0ea5e9', style: { fontWeight: 800 } }, 'Exchange (paid)'),
              h('text', { x: cx, y: cy - radii[2] + 14, textAnchor: 'middle', fontSize: 11, fill: '#16a34a', style: { fontWeight: 800 } }, 'Participation'),
              h('text', { x: cx, y: cy - radii[1] + 14, textAnchor: 'middle', fontSize: 11, fill: '#f59e0b', style: { fontWeight: 800 } }, 'Friendship'),
              h('text', { x: cx, y: cy - radii[0] + 14, textAnchor: 'middle', fontSize: 11, fill: '#dc2626', style: { fontWeight: 800 } }, 'Intimacy'),
              // Names placed around each ring
              placeOn(0, r.intimate).map(function(p, i) {
                return h('g', { key: 'i_' + i },
                  h('circle', { cx: p.x, cy: p.y, r: 5, fill: '#dc2626' }),
                  h('text', { x: p.x, y: p.y + 16, textAnchor: 'middle', fontSize: 10, fill: '#fecaca', style: { fontWeight: 700 } }, p.name.slice(0, 16))
                );
              }),
              placeOn(1, r.friends).map(function(p, i) {
                return h('g', { key: 'f_' + i },
                  h('circle', { cx: p.x, cy: p.y, r: 5, fill: '#f59e0b' }),
                  h('text', { x: p.x, y: p.y + 16, textAnchor: 'middle', fontSize: 10, fill: '#fde68a', style: { fontWeight: 700 } }, p.name.slice(0, 16))
                );
              }),
              placeOn(2, r.allies).map(function(p, i) {
                return h('g', { key: 'a_' + i },
                  h('circle', { cx: p.x, cy: p.y, r: 5, fill: '#16a34a' }),
                  h('text', { x: p.x, y: p.y + 16, textAnchor: 'middle', fontSize: 10, fill: '#bbf7d0', style: { fontWeight: 700 } }, p.name.slice(0, 16))
                );
              }),
              placeOn(3, r.paid).map(function(p, i) {
                return h('g', { key: 'p_' + i },
                  h('circle', { cx: p.x, cy: p.y, r: 5, fill: '#0ea5e9' }),
                  h('text', { x: p.x, y: p.y + 16, textAnchor: 'middle', fontSize: 10, fill: '#bae6fd', style: { fontWeight: 700 } }, p.name.slice(0, 16))
                );
              }),
              // Center person
              h('circle', { cx: cx, cy: cy, r: 28, fill: '#fb7185', stroke: '#fda4af', strokeWidth: 3 }),
              h('text', { x: cx, y: cy + 5, textAnchor: 'middle', fontSize: 13, fill: '#fff', style: { fontWeight: 800 } }, (d.personLabel || 'Me').slice(0, 8))
            )
          ),

          // Text-equivalent (accessible to all users; WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#fda4af', fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b' } }, '🔤 Read these circles as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, svgDesc),
              RINGS.map(function(ring) {
                var items = r[ring.id];
                if (items.length === 0) return null;
                return h('div', { key: ring.id, style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 12, color: ring.color, fontWeight: 700, marginBottom: 4 } }, ring.label + ' (' + items.length + ')'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, paddingLeft: 12 } }, items.join(', '))
                );
              })
            )
          ),

          // Ring counts grid
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 12 } },
            RINGS.map(function(ring) {
              var ct = r[ring.id].length;
              return h('div', { key: ring.id, style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + ring.color } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, ring.label),
                h('div', { style: { fontSize: 22, color: ring.color, fontWeight: 900 } }, ct),
                h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, ct === 1 ? '1 person' : ct + ' people')
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Add or remove people',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✏️ Add or remove people'),
            h('button', { onClick: function() { goto('reflect'); }, 'aria-label': 'Reflect',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Reflect'),
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
        var r = rings();
        function addTo(ringId, name) {
          if (!name || !name.trim()) return;
          var nx = Object.assign({}, r);
          nx[ringId] = nx[ringId].concat([name.trim()]);
          setCOS({ rings: nx });
          if (announceToSR) announceToSR('Added.');
        }
        function removeFrom(ringId, idx) {
          var nx = Object.assign({}, r);
          nx[ringId] = nx[ringId].slice();
          nx[ringId].splice(idx, 1);
          setCOS({ rings: nx });
        }
        function moveTo(fromRingId, idx, toRingId) {
          var nx = Object.assign({}, r);
          nx[fromRingId] = nx[fromRingId].slice();
          nx[toRingId] = nx[toRingId].slice();
          var name = nx[fromRingId][idx];
          nx[fromRingId].splice(idx, 1);
          nx[toRingId].push(name);
          setCOS({ rings: nx });
        }

        return h('div', null,
          RINGS.map(function(ring) {
            var items = r[ring.id];
            var inputId = 'cos-input-' + ring.id;
            function submit() {
              var el = document.getElementById(inputId);
              if (!el || !el.value.trim()) return;
              addTo(ring.id, el.value);
              el.value = '';
            }
            return h('div', { key: ring.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + ring.color, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: ring.color, flex: 1 } }, ring.label + '  (' + items.length + ')')
              ),
              h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55, marginBottom: 8, fontStyle: 'italic' } }, ring.blurb),

              // Items
              items.length > 0 ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, marginBottom: 10 } },
                items.map(function(name, i) {
                  return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', { style: { flex: 1, fontSize: 12.5, color: '#e2e8f0' } }, name),
                    h('select', { 'aria-label': 'Move ' + name + ' to a different ring',
                      onChange: function(e) {
                        if (e.target.value && e.target.value !== ring.id) {
                          moveTo(ring.id, i, e.target.value);
                        }
                      },
                      style: { padding: 2, borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#cbd5e1', fontSize: 10 } },
                      h('option', { value: ring.id }, 'Move to...'),
                      RINGS.filter(function(rr) { return rr.id !== ring.id; }).map(function(rr) {
                        return h('option', { key: rr.id, value: rr.id }, rr.label);
                      })
                    ),
                    h('button', { onClick: function() { removeFrom(ring.id, i); }, 'aria-label': 'Remove ' + name,
                      style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10 } }, '✕')
                  );
                })
              ) : null,

              // Add input
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('label', { htmlFor: inputId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to ' + ring.label),
                h('input', { id: inputId, type: 'text',
                  placeholder: 'Add a name to ' + ring.label + '...',
                  onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                  style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
                h('button', { onClick: submit, 'aria-label': 'Add to ' + ring.label,
                  style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: ring.color, color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
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
        var r = rings();
        var heaviestPaid = r.paid.length >= r.intimate.length + r.friends.length;

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(251,113,133,0.08)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', marginBottom: 14, fontSize: 13, color: '#fecdd3', lineHeight: 1.65 } },
            h('strong', null, '💭 What to do with this picture: '),
            'Circles of Support is not a scoreboard. A sparse picture is not a failure of yours; it often is information about your season, your life circumstances, or the systems you have moved through. Take it gently.'
          ),

          // Heaviest-paid alert (Forest and Snow\'s key observation)
          heaviestPaid && r.paid.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: '#7dd3fc', fontWeight: 800, marginBottom: 6 } }, '🛟 Heaviest ring is Exchange (paid)'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'You have ' + r.paid.length + ' people in the Exchange ring and ' + (r.intimate.length + r.friends.length) + ' across Intimacy + Friendship. Marsha Forest and Judith Snow specifically named this pattern: when paid people outweigh chosen people, the system is doing relationship work that should be done by community. The work then is twofold: appreciate the paid people who are good to you, AND build pathways into the inner two rings. That is not your job alone; it is a structural problem about how community is built around people.'
            )
          ) : null,

          patternCard('🔴 Intimacy ring', r.intimate, '#dc2626',
            r.intimate.length === 0
              ? 'Empty intimacy ring is hard. Sometimes it is true for a season, sometimes it has been true a long time. Worth a conversation with a counselor about what would have to be true to let someone in here.'
              : 'These are the people who get to know everything. Notice who they are; notice if the list is shorter than you wished or longer than you realized.'),
          patternCard('🟠 Friendship ring', r.friends, '#f59e0b',
            r.friends.length === 0
              ? 'A thin friendship ring can be a temporary thing (just moved schools, just left a friend group) or a longer thing. What would it take to grow this ring by one person?'
              : 'These are the people you choose and who choose you back. Even one or two is meaningful.'),
          patternCard('🟢 Participation ring', r.allies, '#16a34a',
            'The participation ring is often easier to grow than the inner rings. Joining a club, a team, a creative group, a volunteer site, a discord. People migrate from this ring inward over time.'),
          patternCard('🔵 Exchange (paid) ring', r.paid, '#0ea5e9',
            r.paid.length === 0
              ? 'No paid people in your life right now is actually unusual; even teachers count if they really are part of how you get through your week. Worth a second look.'
              : 'Paid people can be wonderful, and a good counselor or coach or teacher matters. They are still paid; if a paid relationship ends because the funding ends or the job ends, it is real grief, and it does not mean the relationship was not real.'),

          softPointer()
        );
      }

      function patternCard(title, list, color, blurb) {
        return h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
          h('div', { style: { fontSize: 12, color: color, fontWeight: 700, marginBottom: 6 } }, title + '  (' + list.length + ')'),
          list.length > 0
            ? h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 6 } }, list.join('  ·  '))
            : null,
          h('div', { style: { fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var r = rings();
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fecdd3', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('circles'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'circles-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#circles-print-region, #circles-print-region * { visibility: visible !important; } ' +
              '#circles-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #be123c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Circles of Support'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, (d.personLabel || 'My') + '’s Circles'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            RINGS.map(function(ring) {
              var items = r[ring.id];
              return h('div', { key: ring.id, style: { marginBottom: 16, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, marginBottom: 6, background: ring.color, color: '#fff' } },
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, ring.label + '  (' + items.length + ')')
                ),
                items.length > 0
                  ? h('div', { style: { padding: '0 12px', fontSize: 13, color: '#0f172a', lineHeight: 1.7 } }, items.join('  ·  '))
                  : h('div', { style: { padding: '0 12px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(empty)')
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Circles of Support from Forest, M. and Snow, J., Inclusion Press (inclusion.com). ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('circlesOfSupport', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Circles of Support is a visual of who is close to you, in four concentric rings. You sit in the middle. The closest ring is intimacy: people you would tell anything. The next is friendship: people you choose and who choose you. The next is participation: people you do things with. The outer ring is exchange: people who are part of your life because it is their job.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Drawing the four rings makes a pattern visible that is hard to see in a list of names: where you are full, where you are thin, and where the people closest to you are being paid to be there.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'Where it comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Circle of Friends format was developed by Marsha Forest and Judith Snow at Inclusion Press in the 1980s, originally as a way to help disabled children build community in school settings where they had been isolated. Snow, who was a brilliant disabled activist and writer, observed that her own closest ring as an adult was almost entirely populated by paid staff, which she described as a kind of structural loneliness produced by how community is built (or not) around disabled people. The tool now spans far beyond disability work, but its origin matters: it was a tool of love and protest.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for Circles of Support or to learn more.'),
            sourceCard('Forest, M. and Snow, J. (1989)', 'The Circle of Friends, Inclusion Press', 'The foundational text introducing the four-circle format. From the original developers at Inclusion Press.', null),
            sourceCard('Snow, J. (1998)', 'What\'s Really Worth Doing and How to Do It: A Book for People Who Love Someone Labeled Disabled, Inclusion Press', 'Snow\'s own deeper reflection on what the inner rings mean and why they matter; the source of the observation about paid people in disabled lives.', null),
            sourceCard('Falvey, M. A., Forest, M., Pearpoint, J., and Rosenberg, R. L. (1997)', 'All My Life\'s a Circle: Using the Tools - Circles, MAPS & PATHS, Inclusion Press', 'Accessible practitioner guide pairing Circles of Support with MAPS and PATH.', null),
            sourceCard('Inclusion Press', 'inclusion.com', 'The original publisher; workshops, books, and a facilitator network.', 'https://inclusion.com/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A sparse circle is not a moral failure. Some seasons of life are sparse on purpose (recovery, moving, transition); some are sparse because of structural isolation that you did not choose. Reading the picture as "I should have more friends by now" is not how to use this tool.'),
              h('li', null, 'The rings are not perfectly bounded categories. Some teachers do become real friends; some friends fade to acquaintances; the same person can move rings across years. Redraw it once or twice a year.'),
              h('li', null, 'Putting a name in a ring is your call, not theirs. Other people may put you in different rings than you put them.'),
              h('li', null, 'For students with significant disabilities, the visual can be confronting and should be facilitated with care, not used as a "see how alone you are" exercise. The point of the original tool was to mobilize community around the person, not to grade them.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: '#fecdd3', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Used well, Circles of Support is a tool for community-building: a teacher or counselor sees a student\'s thin inner rings and works with the student and their family to invite specific people into the participation ring (a club, a coach, a peer mentor). Used poorly, it is a private grief that no one acts on. Make sure the drawing leads somewhere.'
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
      if (view === 'edit') body = renderEdit();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderCircles();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Circles of Support' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
