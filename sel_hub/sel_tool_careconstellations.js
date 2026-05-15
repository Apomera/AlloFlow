// ═══════════════════════════════════════════════════════════════
// sel_tool_careconstellations.js — Care Constellations
// A relational map of who cares for you and who you care for.
// Refuses the individualist / consumerist "self-care" frame.
// Builds in pedagogical content on Care of Self as a philosophical
// tradition (Foucault, Greek epimeleia heautou, Audre Lorde,
// eudaimonic vs hedonic, anti-consumerist framing).
// Registered tool ID: "careConstellations"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('careConstellations'))) {
(function() {
  'use strict';

  // WCAG 4.1.3 live region
  (function() {
    if (document.getElementById('allo-live-careconst')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-careconst';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ═══════════════════════════════════════════════════════════
  // CATEGORIES OF CARE
  // 8 sectors arranged around the user at the center. Each has its
  // own color and its own typical examples. Students can place
  // connections anywhere; the categories are scaffolding, not rules.
  // ═══════════════════════════════════════════════════════════
  var CARE_CATEGORIES = [
    { id: 'family', label: 'Family', icon: '🏠', color: '#f59e0b', angleDeg: 270, hint: 'Parents, siblings, grandparents, cousins, in-laws, extended family.' },
    { id: 'chosen', label: 'Chosen Family + Close Friends', icon: '💛', color: '#ec4899', angleDeg: 315, hint: 'The people who are family by choice rather than blood. Best friends, mentors, the friend\'s parent who is also yours now.' },
    { id: 'crew', label: 'Crew / School People', icon: '🎒', color: '#a855f7', angleDeg: 0, hint: 'Teachers, counselors, coaches, school psychs, the cafeteria worker who knows your name.' },
    { id: 'community', label: 'Community', icon: '🤝', color: '#0ea5e9', angleDeg: 45, hint: 'Neighbors, sports team, faith community, work, club, library, the regulars at the place you go.' },
    { id: 'practices', label: 'Practices + Habits', icon: '🌿', color: '#16a34a', angleDeg: 90, hint: 'Sleep, food, movement, hobbies, mindfulness, music, reading, prayer. The practices that hold you.' },
    { id: 'place', label: 'Place', icon: '🌲', color: '#0d9488', angleDeg: 135, hint: 'The trail you walk. The river. The tree. The kitchen. The seat by the window. Places that care for you.' },
    { id: 'nonhuman', label: 'Non-human Kin', icon: '🐾', color: '#dc2626', angleDeg: 180, hint: 'Pets, plants, wild animals you watch, the bird you feed. The non-human relationships in your life.' },
    { id: 'self', label: 'Future Self + Past Self', icon: '🌒', color: '#6366f1', angleDeg: 225, hint: 'The version of you a year from now you are tending toward. The version of you ten years ago whose care got you here.' }
  ];

  // ─── Reflection prompts ──────────────────────────────────
  var REFLECTION_PROMPTS = [
    { id: 'surprise', text: 'Look at your constellation. Who or what shows up that surprises you?' },
    { id: 'missing', text: 'Whose name should be here but is not yet? What does that mean?' },
    { id: 'unacknowledged', text: 'Where is care flowing toward you that you have not really acknowledged?' },
    { id: 'good-flow', text: 'Where are you flowing care that feels good and right to you?' },
    { id: 'depleting', text: 'Where are you giving care that is depleting you? What would you want to do about it?' },
    { id: 'practices-vs-people', text: 'Do the practices in your map outnumber the people? Or the other way around? What does that pattern tell you?' },
    { id: 'place', text: 'Have you put places or non-human kin on this map? If not, why not? They are caring for you whether you name them or not.' }
  ];

  // ─── State ──────────────────────────────────
  function defaultState() {
    return {
      view: 'map',                          // 'map' | 'add' | 'reflect' | 'about'
      connections: [],                       // [{ id, name, categoryId, direction ('to-me'/'from-me'/'mutual'), strength (1-5), notes }]
      selectedConnId: null,                 // for editing
      reflectionAnswers: {},                // { promptId: text }
      drafts: { name: '', categoryId: 'family', direction: 'mutual', strength: 3, notes: '' }
    };
  }

  function newId() { return 'c_' + Date.now() + '_' + Math.floor(Math.random() * 9999); }

  // ─── Tool registration ───
  window.SelHub.registerTool('careConstellations', {
    icon: '🌌',
    label: 'Care Constellations',
    desc: 'A relational map of who cares for you and who you care for. Refuses the individualist or consumerist "self-care" frame; treats care as something received and given through relationship. Includes a substantive pedagogical view on Care of Self as a practice rather than a product.',
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

      var d = labToolData.careConstellations || defaultState();
      function setCC(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.careConstellations) || defaultState();
          return Object.assign({}, prev, { careConstellations: Object.assign({}, prior, patch) });
        });
      }

      var view = d.view || 'map';
      function goto(v) { setCC({ view: v }); }

      // ─── Header + nav ───
      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fda4af', fontSize: 22, fontWeight: 900 } }, '🌌 Care Constellations'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A relational map of who cares for you and who you care for.')
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      function navTabs() {
        var tabs = [
          { id: 'map', label: 'My constellation', icon: '🌌' },
          { id: 'add', label: 'Add a connection', icon: '+' },
          { id: 'reflect', label: 'Reflect', icon: '🧭' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About: Care of Self', icon: '📜' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Care Constellations sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#fda4af' : '#334155'),
                background: active ? 'rgba(253,164,175,0.15)' : '#1e293b',
                color: active ? '#fecaca' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' }
        },
          'A map with few connections is information, not a verdict. Some people are in seasons of isolation; that is real. If your map feels thin and you want it to be fuller, the Friendship Builder, Peer Support Coach, and Crew Membership work in HOWL Tracker are places to start. If you are struggling, the Crisis Companion tool and Crisis Text Line (741741, text HOME) are here.'
        );
      }

      // ═══════════════════════════════════════════════════════
      // MAP VIEW — SVG constellation
      // ═══════════════════════════════════════════════════════
      function renderMap() {
        var conns = d.connections || [];
        var W = 600, Hgt = 580, cx = W / 2, cy = Hgt / 2;

        // Lay connections out: angle by category sector center, distance by strength
        // (closer to center = stronger). Multiple connections per category fan out
        // within their sector.
        var byCat = {};
        conns.forEach(function(c) {
          if (!byCat[c.categoryId]) byCat[c.categoryId] = [];
          byCat[c.categoryId].push(c);
        });
        var placed = [];
        CARE_CATEGORIES.forEach(function(cat) {
          var list = byCat[cat.id] || [];
          var baseAngle = (cat.angleDeg - 90) * Math.PI / 180;   // SVG: 0° = right
          var fanSpan = Math.PI / 4 * 0.7;                       // 45° sector × 0.7
          list.forEach(function(c, i) {
            var fanOffset = list.length === 1 ? 0 : (i / (list.length - 1) - 0.5) * fanSpan;
            var angle = baseAngle + fanOffset;
            // Strength: closer = stronger. 1 = far (240px), 5 = close (90px).
            var distance = 90 + (5 - (c.strength || 3)) * 32;
            var x = cx + distance * Math.cos(angle);
            var y = cy + distance * Math.sin(angle);
            placed.push({ c: c, cat: cat, x: x, y: y, angle: angle });
          });
        });

        function dirArrow(direction) {
          if (direction === 'to-me') return '→ me';
          if (direction === 'from-me') return 'me →';
          return '↔';
        }

        return h('div', null,
          // Empty-state framing
          conns.length === 0 ? h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(253,164,175,0.10)', border: '1px solid rgba(253,164,175,0.3)', borderLeft: '4px solid #fda4af', marginBottom: 14, fontSize: 13.5, color: '#fecaca', lineHeight: 1.65 } },
            h('strong', null, 'Your constellation is empty. '),
            'That is fine. Start with one connection that already exists in your life. The point is not to fill the map; the point is to make visible what is already there.',
            h('div', { style: { marginTop: 10 } },
              h('button', { onClick: function() { goto('add'); },
                style: { padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f43f5e', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add your first connection')
            )
          ) : h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(253,164,175,0.08)', border: '1px solid rgba(253,164,175,0.2)', borderLeft: '3px solid #fda4af', marginBottom: 14, fontSize: 12.5, color: '#fecaca', lineHeight: 1.55 } },
            h('strong', null, conns.length + ' connection' + (conns.length === 1 ? '' : 's') + ' mapped. '),
            'Distance from center shows strength. Color shows category. Click any connection to edit or remove it.'
          ),

          // SVG map
          h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 8, marginBottom: 14, border: '1px solid #1e293b' } },
            h('svg', { viewBox: '0 0 ' + W + ' ' + Hgt, style: { width: '100%', height: 'auto', display: 'block', maxHeight: 560 }, 'aria-label': 'Care constellation map. You are at the center; the people, practices, and places that care for you orbit at distances based on the strength you set.' },
              // Background gradient
              h('rect', { x: 0, y: 0, width: W, height: Hgt, fill: '#0a0a14', rx: 6 }),

              // Sector dividers (subtle radial lines)
              CARE_CATEGORIES.map(function(cat, i) {
                var angle = (cat.angleDeg - 90 - 22.5) * Math.PI / 180;
                return h('line', { key: 'div' + i,
                  x1: cx, y1: cy,
                  x2: cx + 280 * Math.cos(angle),
                  y2: cy + 280 * Math.sin(angle),
                  stroke: cat.color, strokeWidth: 0.5, opacity: 0.18, strokeDasharray: '2 4'
                });
              }),

              // Sector labels (around the edge)
              CARE_CATEGORIES.map(function(cat, i) {
                var angle = (cat.angleDeg - 90) * Math.PI / 180;
                var lx = cx + 270 * Math.cos(angle);
                var ly = cy + 270 * Math.sin(angle);
                return h('g', { key: 'lab' + i },
                  h('text', { x: lx, y: ly, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: cat.color, opacity: 0.7 }, cat.icon),
                  h('text', { x: lx, y: ly + 14, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: cat.color, opacity: 0.7, letterSpacing: 0.3 },
                    cat.label.length > 16 ? cat.label.split(' ').slice(0, 2).join(' ') : cat.label
                  )
                );
              }),

              // Strength rings (concentric circles for orientation)
              [90, 130, 170, 210, 250].map(function(r, i) {
                return h('circle', { key: 'ring' + i, cx: cx, cy: cy, r: r, fill: 'none', stroke: '#1e293b', strokeWidth: 0.5, opacity: 0.5 });
              }),

              // You at the center
              h('circle', { cx: cx, cy: cy, r: 18, fill: '#fda4af', opacity: 0.4 }),
              h('circle', { cx: cx, cy: cy, r: 10, fill: '#fda4af' }),
              h('text', { x: cx, y: cy + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#fff' }, 'you'),

              // Connections
              placed.map(function(p) {
                // Line from center to point
                var dashStyle = p.c.direction === 'to-me' ? '0' : (p.c.direction === 'from-me' ? '4 3' : '0');
                return h('g', { key: p.c.id,
                  onClick: function() { setCC({ selectedConnId: p.c.id, view: 'add', drafts: { name: p.c.name, categoryId: p.c.categoryId, direction: p.c.direction, strength: p.c.strength, notes: p.c.notes || '' } }); },
                  style: { cursor: 'pointer' },
                  role: 'button', tabIndex: 0,
                  'aria-label': p.c.name + ' (' + p.cat.label + ', strength ' + p.c.strength + ', ' + dirArrow(p.c.direction) + ')'
                },
                  h('line', { x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: p.cat.color, strokeWidth: 1.5, opacity: 0.5, strokeDasharray: dashStyle }),
                  h('circle', { cx: p.x, cy: p.y, r: 10 + (p.c.strength || 3), fill: p.cat.color, opacity: 0.25 }),
                  h('circle', { cx: p.x, cy: p.y, r: 6, fill: p.cat.color }),
                  h('text', { x: p.x, y: p.y - 14, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: '#fff' }, p.c.name)
                );
              })
            ),

            // Legend
            h('div', { style: { display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8', marginTop: 6, paddingLeft: 6, flexWrap: 'wrap' } },
              h('span', null, '· solid line: care flows to you'),
              h('span', null, '┄ dashed: care flows from you'),
              h('span', null, '↔ mutual: both directions'),
              h('span', null, 'Closer to center = stronger connection')
            )
          ),

          // Add CTA
          h('button', { onClick: function() { goto('add'); },
            style: { padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', color: '#fff', fontWeight: 700, fontSize: 13 } }, '+ Add a connection'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // ADD / EDIT VIEW
      // ═══════════════════════════════════════════════════════
      function renderAdd() {
        var drafts = d.drafts || { name: '', categoryId: 'family', direction: 'mutual', strength: 3, notes: '' };
        var editing = !!d.selectedConnId;
        function update(field, value) {
          setCC({ drafts: Object.assign({}, drafts, { [field]: value }) });
        }
        function save() {
          if (!drafts.name || !drafts.name.trim()) {
            if (addToast) addToast('Give the connection a name first.', 'warn');
            return;
          }
          if (editing) {
            var newConns = (d.connections || []).map(function(c) {
              if (c.id !== d.selectedConnId) return c;
              return Object.assign({}, c, { name: drafts.name.trim(), categoryId: drafts.categoryId, direction: drafts.direction, strength: drafts.strength, notes: drafts.notes });
            });
            setCC({ connections: newConns, selectedConnId: null, view: 'map', drafts: defaultState().drafts });
            if (announceToSR) announceToSR('Connection updated.');
          } else {
            var entry = { id: newId(), name: drafts.name.trim(), categoryId: drafts.categoryId, direction: drafts.direction, strength: drafts.strength, notes: drafts.notes };
            setCC({ connections: (d.connections || []).concat([entry]), view: 'map', drafts: defaultState().drafts });
            if (announceToSR) announceToSR('Connection added.');
            if (addToast) addToast('Added to your constellation.', 'success');
          }
        }
        function remove() {
          var newConns = (d.connections || []).filter(function(c) { return c.id !== d.selectedConnId; });
          setCC({ connections: newConns, selectedConnId: null, view: 'map', drafts: defaultState().drafts });
          if (addToast) addToast('Removed.', 'info');
        }
        function cancel() { setCC({ selectedConnId: null, view: 'map', drafts: defaultState().drafts }); }

        var cat = CARE_CATEGORIES.find(function(c) { return c.id === drafts.categoryId; }) || CARE_CATEGORIES[0];

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(253,164,175,0.08)', border: '1px solid rgba(253,164,175,0.25)', borderLeft: '3px solid #fda4af', marginBottom: 14, fontSize: 13, color: '#fecaca', lineHeight: 1.55 } },
            editing ? 'Editing a connection. Save changes when done, or remove it.' : 'Add a person, practice, place, or non-human kin to your constellation.'
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 12 } },
            // Name
            h('div', null,
              h('label', { htmlFor: 'cc-name', style: { display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, 'Who or what is this?'),
              h('input', { id: 'cc-name', type: 'text', value: drafts.name, onChange: function(e) { update('name', e.target.value); },
                placeholder: 'e.g. Mom, Ms. Carter, the river trail, my dog Lupin, mindful breathing, my future 22-year-old self',
                style: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5 }
              })
            ),

            // Category
            h('div', null,
              h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, 'Category'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 } },
                CARE_CATEGORIES.map(function(c) {
                  var picked = drafts.categoryId === c.id;
                  return h('button', { key: c.id, onClick: function() { update('categoryId', c.id); }, 'aria-pressed': picked,
                    style: { padding: 8, borderRadius: 6, border: '1.5px solid ' + (picked ? c.color : '#334155'),
                      background: picked ? c.color + '22' : '#1e293b',
                      color: picked ? c.color : '#cbd5e1', cursor: 'pointer', textAlign: 'left' } },
                    h('div', { style: { fontSize: 14 } }, c.icon + ' ' + h('span', null, '')),
                    h('div', { style: { fontSize: 11, fontWeight: 700, marginTop: 2 } }, c.label),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 } }, c.hint)
                  );
                })
              )
            ),

            // Direction
            h('div', null,
              h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, 'Direction of care'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 } },
                [
                  { id: 'to-me', label: 'Care flows TO me', desc: 'This is something/someone that cares for me. I receive from them.' },
                  { id: 'from-me', label: 'Care flows FROM me', desc: 'This is something/someone I care for. I give to them.' },
                  { id: 'mutual', label: 'Mutual', desc: 'Care flows both ways. We tend to each other.' }
                ].map(function(opt) {
                  var picked = drafts.direction === opt.id;
                  return h('button', { key: opt.id, onClick: function() { update('direction', opt.id); }, 'aria-pressed': picked,
                    style: { padding: 8, borderRadius: 6, border: '1.5px solid ' + (picked ? cat.color : '#334155'),
                      background: picked ? cat.color + '22' : '#1e293b',
                      color: picked ? cat.color : '#cbd5e1', cursor: 'pointer', textAlign: 'left' } },
                    h('div', { style: { fontSize: 12, fontWeight: 800 } }, opt.label),
                    h('div', { style: { fontSize: 10.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 } }, opt.desc)
                  );
                })
              )
            ),

            // Strength
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, 'Strength: ' + drafts.strength + ' / 5'),
              h('input', { type: 'range', min: 1, max: 5, step: 1, value: drafts.strength,
                onChange: function(e) { update('strength', parseInt(e.target.value, 10)); },
                style: { width: '100%' }, 'aria-label': 'Strength of connection 1 to 5'
              }),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 2 } },
                h('span', null, 'Newer / distant'),
                h('span', null, 'Deep / sustaining')
              )
            ),

            // Notes
            h('div', null,
              h('label', { htmlFor: 'cc-notes', style: { display: 'block', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, 'How does this care show up? (optional)'),
              h('textarea', { id: 'cc-notes', value: drafts.notes, onChange: function(e) { update('notes', e.target.value); },
                placeholder: 'Specific examples: "always asks how I am and waits for the real answer." Or: "walking by the river clears my head when nothing else does."',
                style: { width: '100%', minHeight: 80, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }
              })
            )
          ),

          // Buttons
          h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { onClick: save, style: { padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f43f5e', color: '#fff', fontWeight: 700, fontSize: 13 } }, editing ? 'Save changes' : '+ Add to constellation'),
            h('button', { onClick: cancel, style: { padding: '10px 14px', borderRadius: 8, border: '1px solid #475569', cursor: 'pointer', background: '#1e293b', color: '#cbd5e1', fontWeight: 700, fontSize: 13 } }, 'Cancel'),
            editing ? h('button', { onClick: remove, style: { padding: '10px 14px', borderRadius: 8, border: '1px solid #ef4444', cursor: 'pointer', background: 'transparent', color: '#fca5a5', fontWeight: 700, fontSize: 12 } }, 'Remove from map') : null
          )
        );
      }

      // ═══════════════════════════════════════════════════════
      // REFLECT VIEW
      // ═══════════════════════════════════════════════════════
      function renderReflect() {
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(253,164,175,0.08)', border: '1px solid rgba(253,164,175,0.25)', borderLeft: '3px solid #fda4af', marginBottom: 14, fontSize: 13, color: '#fecaca', lineHeight: 1.55 } },
            h('strong', null, '🧭 Reflection prompts. '),
            'Sit with these one at a time. Write what comes up if it helps. There is no requirement to answer all of them.'
          ),
          REFLECTION_PROMPTS.map(function(p) {
            var current = (d.reflectionAnswers || {})[p.id] || '';
            return h('div', { key: p.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderLeft: '3px solid #fda4af', marginBottom: 10 } },
              h('p', { style: { margin: '0 0 8px', color: '#fecaca', fontSize: 13.5, lineHeight: 1.65, fontStyle: 'italic' } }, '“' + p.text + '”'),
              h('textarea', { value: current,
                onChange: function(e) {
                  var ra = Object.assign({}, d.reflectionAnswers || {}, { [p.id]: e.target.value });
                  setCC({ reflectionAnswers: ra });
                },
                placeholder: 'Write what comes up, or leave blank.',
                style: { width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }
              })
            );
          }),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // ABOUT: CARE OF SELF — the philosophy
      // ═══════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('careConstellations', h, ctx) : null),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(253,164,175,0.10)', border: '1px solid rgba(253,164,175,0.4)', borderLeft: '4px solid #fda4af', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fecaca', fontSize: 17, fontWeight: 800 } }, 'Why this is called Care of Self, not Self-Care'),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.75 } },
              'The grammar matters. ',
              h('strong', { style: { color: '#fda4af' } }, '"Self-care"'),
              ' is a noun, often a product: a face mask, a bath, a spa day, a candle, an app subscription. The marketplace is fluent in self-care. ',
              h('strong', { style: { color: '#fda4af' } }, '"Care of self"'),
              ' is a verb phrase: a practice you do, repeated over time, that shapes who you are becoming. The first is something you can buy; the second is something you have to actually do.'
            )
          ),

          // The philosophical lineage
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#a78bfa', fontSize: 16, fontWeight: 800 } }, 'The lineage: epimeleia heautou'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'Greek philosophers (Socrates, the Stoics, the Cynics, the Epicureans) used a phrase: ',
              h('em', { style: { color: '#fde68a' } }, 'epimeleia heautou'),
              ', usually translated as ',
              h('em', null, '"the care of the self."'),
              ' For them it was not a wellness trend. It was the central work of being human: examining your beliefs, training your attention, choosing your responses, building character through practice. Socrates told the Athenians at his trial that he had spent his life trying to "take care of himself" by examining whether his life was worth living. They executed him for it.'
            ),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'In the 1980s the French philosopher Michel Foucault wrote a book called ',
              h('em', null, '"The Care of the Self"'),
              ', recovering this Greek and Roman tradition. He argued the modern West had inherited a stripped-down version of ethics that was mostly about following rules. The Greek practice he traced was something different: ',
              h('strong', null, 'an ongoing practice of forming yourself into who you want to become'),
              ', through specific daily disciplines, conversation with friends and teachers, writing about what you noticed, examining what you assumed.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'This is closer to what Care Constellations is doing than the "self-care" of marketing language. You are not consuming a product. You are doing a slow, repeated, relational practice that, over time, builds who you are.'
            )
          ),

          // Audre Lorde
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#a78bfa', fontSize: 16, fontWeight: 800 } }, 'Audre Lorde: care as political warfare'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'Audre Lorde, Black lesbian poet and theorist, wrote in 1988 (while she was dying of cancer):'
            ),
            h('blockquote', { style: { margin: '0 0 10px', padding: '8px 14px', borderLeft: '3px solid #fbbf24', background: 'rgba(251,191,36,0.06)', fontSize: 14, lineHeight: 1.8, color: '#fde68a', fontStyle: 'italic' } },
              '"Caring for myself is not self-indulgence, it is self-preservation, and that is an act of political warfare."'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'For Lorde, care of the self was not a retreat from struggle. It was inseparable from struggle. A person who is sustained, rested, fed, and loved is a person who can fight for justice. A burned-out person cannot. This is the lineage that the marketplace cannot sell back to you in a face-mask bundle, because the marketplace cannot care whether you survive.'
            )
          ),

          // Eudaimonia vs hedonic
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#a78bfa', fontSize: 16, fontWeight: 800 } }, 'Eudaimonic care vs hedonic care'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'Aristotle distinguished two different ideas of well-being. ',
              h('strong', { style: { color: '#fda4af' } }, 'Hedonia'),
              ' is pleasure, comfort, the absence of pain. It is real and matters: rest, taste, joy, sex, beauty, laughter. ',
              h('strong', { style: { color: '#fda4af' } }, 'Eudaimonia'),
              ' is harder to translate. Usually rendered "flourishing" or "human good," it means the state of becoming who you are meant to be, exercising your specific human capacities at their best, in community.'
            ),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'The marketplace mostly sells hedonic care: a thing that will feel good for an hour. There is nothing wrong with hedonic care; sometimes you need a hot shower or a good piece of chocolate. But hedonic care alone tends to leave you empty. ',
              h('strong', null, 'Eudaimonic care'),
              ' is harder to buy because most of it is relational and practiced over time: rest that actually restores you, work that uses your real capacities, friendships that hold you, communities where you matter.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              'A useful question to bring to any "self-care" claim: ',
              h('em', { style: { color: '#fde68a' } }, '"Is this hedonic, eudaimonic, or both? And which does my life need right now?"'),
              ' Both kinds matter. The mistake is assuming hedonic care will deliver the eudaimonic kind.'
            )
          ),

          // The critique of consumerist self-care
          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 16, fontWeight: 800 } }, 'The critique to take seriously'),
            h('p', { style: { margin: '0 0 10px', color: '#fecaca', fontSize: 13, lineHeight: 1.75 } },
              'There is a real critique of modern "self-care" rhetoric, especially from disability scholars, Black feminist thinkers, and labor organizers:'
            ),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fecaca', fontSize: 12.5, lineHeight: 1.8 } },
              h('li', null, h('strong', null, 'It can replace structural change with personal coping.'), ' If your school is making you sick, "self-care" can be a way for the institution to hand the problem back to you.'),
              h('li', null, h('strong', null, 'It can be class-marked.'), ' Spa days, retreats, expensive supplements, therapy. Many of the rituals branded as self-care are not available to most working-class people.'),
              h('li', null, h('strong', null, 'It can be solitary in a way that worsens isolation.'), ' "You do you" is not the same as "we hold each other." The relational frame is the missing piece.'),
              h('li', null, h('strong', null, 'It can become an obligation.'), ' "Are you doing your self-care?" can become another item on the productivity-and-perfectionism list.')
            ),
            h('p', { style: { margin: '10px 0 0', color: '#fecaca', fontSize: 13, lineHeight: 1.75 } },
              'Care Constellations is built to resist these traps. The whole map is RELATIONAL. There is no checkbox you have to fill in. You can leave it empty if your life is empty of these things right now; that is honest information, not a personal failing.'
            )
          ),

          // Pointer toward the Orientations tool
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 13, color: '#e9d5ff', lineHeight: 1.6, marginBottom: 14 } },
            h('strong', { style: { color: '#a855f7' } }, '🧭 More philosophical orientations: '),
            'Care of self is one tradition among many. If you want to see how different philosophies answer "what is the good life," "how should I act," and "what do I do with suffering," the ',
            h('strong', null, 'Orientations'),
            ' tool in the Inner Work category compares eight traditions (Daoism, Zen, Stoicism, Existentialism, Confucian ethics, Ubuntu, Indigenous relationality, Care Ethics) without trying to convince you any single one is right.'
          ),

          softPointer()
        );
      }

      function renderPrintView() {
        var connections = d.connections || [];
        var byCategory = {};
        connections.forEach(function(c) {
          var key = c.categoryId || 'other';
          if (!byCategory[key]) byCategory[key] = [];
          byCategory[key].push(c);
        });
        var dirLabel = { 'to-me': 'cares for me', 'from-me': 'I care for', 'mutual': 'mutual care' };

        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(253,164,175,0.10)', border: '1px solid rgba(253,164,175,0.4)', borderLeft: '3px solid #fda4af', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
            h('strong', null, '🖨 My constellation map. '),
            'A relational artifact: who cares for me, who I care for, and the mutual care that runs both ways. Useful for IEPs, family meetings, intake with a new counselor, or just to remember on a thin day. Private; you decide who to share it with.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fda4af 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#cc-print-region, #cc-print-region * { visibility: visible !important; } ' +
            '#cc-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#cc-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'cc-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'My Care Constellation'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'Care Ethics · Noddings · Foucault')
            ),

            h('div', { style: { padding: 10, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#9f1239' } },
              h('strong', null, 'Care is something received and given through relationship, '),
              'not a product to consume alone. This map is the shape of that relationship in your life right now.'
            ),

            connections.length === 0 ? h('div', { style: { padding: 14, border: '2px dashed #cbd5e1', borderRadius: 10, fontSize: 12.5, color: '#475569', fontStyle: 'italic', textAlign: 'center' } },
              '(no connections yet — open the Add a connection tab to add them)'
            ) : null,

            CARE_CATEGORIES.map(function(cat) {
              var entries = byCategory[cat.id] || [];
              if (entries.length === 0) return null;
              return h('div', { key: cat.id, style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, cat.icon + ' ' + cat.label),
                h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 } },
                  entries.map(function(c) {
                    var dir = dirLabel[c.direction] || c.direction;
                    return h('li', { key: c.id, style: { marginBottom: 4 } },
                      h('strong', null, c.name || '(unnamed)'),
                      h('span', { style: { color: '#475569' } }, ' · ' + dir + ' · strength ' + (c.strength || '—') + '/5'),
                      c.notes ? h('div', { style: { fontSize: 11.5, color: '#475569', fontStyle: 'italic', marginTop: 2 } }, c.notes) : null
                    );
                  })
                )
              );
            }),

            d.reflectionAnswers && Object.keys(d.reflectionAnswers).length > 0 ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'My reflections'),
              Object.keys(d.reflectionAnswers).map(function(k, i) {
                var a = d.reflectionAnswers[k];
                if (!a) return null;
                return h('div', { key: k, style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 11.5, color: '#475569', fontStyle: 'italic', marginBottom: 2 } }, k),
                  h('div', { style: { fontSize: 12.5, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.55 } }, a)
                );
              })
            ) : null,

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: Noddings, N. (1984), Caring: A Relational Approach to Ethics and Moral Education · Foucault, M., The Care of the Self. Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      // ── Root ──
      var body;
      if (view === 'add') body = renderAdd();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderMap();

      return h('div', { style: { maxWidth: 860, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Care Constellations' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
