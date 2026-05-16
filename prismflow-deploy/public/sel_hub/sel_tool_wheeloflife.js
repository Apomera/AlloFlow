// ═══════════════════════════════════════════════════════════════
// sel_tool_wheeloflife.js — Wheel of Life
// A spider/radar chart of 8 life domains, each rated 1-10. A
// coaching tradition tool (commonly attributed to Paul J. Meyer,
// Success Motivation Institute, 1960s); standardized in Co-Active
// Coaching. Heuristic, not a validated psychometric.
// Registered tool ID: "wheelOfLife"
// Category: self-awareness
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('wheelOfLife'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-wol')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-wol';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // 8 life domains (the most common Wheel of Life set).
  var DOMAINS = [
    { id: 'health',     icon: '🏃', label: 'Health and body',      color: '#ef4444' },
    { id: 'family',     icon: '👨‍👩‍👧', label: 'Family and home',      color: '#f59e0b' },
    { id: 'friends',    icon: '🤝', label: 'Friends and social',   color: '#22c55e' },
    { id: 'romance',    icon: '💛', label: 'Romance and partnership', color: '#ec4899' },
    { id: 'learning',   icon: '📚', label: 'Learning and growth',  color: '#0ea5e9' },
    { id: 'work',       icon: '🎯', label: 'Work and school',      color: '#6366f1' },
    { id: 'fun',        icon: '🎮', label: 'Fun and recreation',   color: '#a855f7' },
    { id: 'money',      icon: '💰', label: 'Money and resources',  color: '#eab308' }
  ];

  function defaultState() {
    return {
      view: 'wheel',
      ratings: {},        // domainId -> 1-10
      notes: {},          // domainId -> string
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('wheelOfLife', {
    icon: '🛞',
    label: 'Wheel of Life',
    desc: 'A spider chart of 8 life domains, each rated 1-10. Shows where your life is fuller and where it is thinner right now. From the coaching tradition (Meyer, 1960s; Co-Active Coaching). Useful self-portrait; not a validated psychometric.',
    color: 'amber',
    category: 'self-awareness',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.wheelOfLife || defaultState();
      function setWOL(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.wheelOfLife) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.ratings || patch.notes) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { wheelOfLife: next });
        });
      }
      var view = d.view || 'wheel';
      function goto(v) { setWOL({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fcd34d', fontSize: 22, fontWeight: 900 } }, '🛞 Wheel of Life'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A self-portrait of 8 life domains, each rated 1 to 10.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'wheel', label: 'My Wheel', icon: '🛞' },
          { id: 'rate', label: 'Rate', icon: '✏️' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Wheel of Life sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#f59e0b' : '#334155'),
                background: active ? 'rgba(245,158,11,0.18)' : '#1e293b',
                color: active ? '#fde68a' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'A low score on a domain is information, not a failure. The Wheel is a snapshot of right now; in three months your shape will look different. Crisis Text Line: text HOME to 741741.'
        );
      }

      function ratingOf(id) { return (d.ratings || {})[id] || 0; }

      // ═══════════════════════════════════════════════════════════
      // WHEEL — SVG radar chart
      // ═══════════════════════════════════════════════════════════
      function renderWheel() {
        var hasAny = DOMAINS.some(function(d2) { return ratingOf(d2.id) > 0; });
        if (!hasAny) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(245,158,11,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🛞'),
              h('h3', { style: { margin: '0 0 8px', color: '#fde68a', fontSize: 18 } }, 'Your Wheel is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'Rate each of the 8 life domains from 1 (very thin) to 10 (very full). The shape of your wheel will show you where life is rich and where it is hungry right now. There are no right answers.'),
              h('button', { onClick: function() { goto('rate'); }, 'aria-label': 'Start rating',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start rating')
            ),
            softPointer()
          );
        }

        // Radar chart points
        var cx = 280, cy = 280, maxR = 220;
        var n = DOMAINS.length;
        function pointFor(idx, value) {
          var angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
          var r = (value / 10) * maxR;
          return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
        }
        function labelPoint(idx) {
          var angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
          var r = maxR + 40;
          return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
        }

        // Build the polygon path
        var poly = DOMAINS.map(function(dom, i) {
          var p = pointFor(i, ratingOf(dom.id));
          return p.x + ',' + p.y;
        }).join(' ');

        // Accessibility description
        var ratedDomains = DOMAINS.filter(function(dom) { return ratingOf(dom.id) > 0; });
        var avg = ratedDomains.length > 0 ? (ratedDomains.reduce(function(sum, dom) { return sum + ratingOf(dom.id); }, 0) / ratedDomains.length).toFixed(1) : '0';
        var svgDesc = 'Wheel of Life radar chart, ' + ratedDomains.length + ' of ' + DOMAINS.length +
          ' domains rated. Average: ' + avg + ' out of 10. ' +
          DOMAINS.map(function(dom) { return dom.label + ': ' + (ratingOf(dom.id) || '0') + '/10'; }).join('; ') + '.';

        return h('div', null,
          h('div', { style: { padding: 10, borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto' } },
            h('svg', { width: '100%', viewBox: '0 0 560 560', style: { maxWidth: 560 }, 'aria-labelledby': 'wol-svg-title wol-svg-desc', role: 'img' },
              h('title', { id: 'wol-svg-title' }, 'Wheel of Life radar chart'),
              h('desc', { id: 'wol-svg-desc' }, svgDesc),
              // Gridlines
              [2, 4, 6, 8, 10].map(function(level) {
                var poly = DOMAINS.map(function(_, i) {
                  var p = pointFor(i, level);
                  return p.x + ',' + p.y;
                }).join(' ');
                return h('polygon', { key: 'grid_' + level, points: poly, fill: 'none', stroke: '#334155', strokeWidth: 1, opacity: 0.4 });
              }),
              // Spokes
              DOMAINS.map(function(_, i) {
                var p = pointFor(i, 10);
                return h('line', { key: 'spoke_' + i, x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: '#334155', strokeWidth: 1 });
              }),
              // Data polygon
              h('polygon', { points: poly, fill: '#f59e0b66', stroke: '#f59e0b', strokeWidth: 3 }),
              // Data points
              DOMAINS.map(function(dom, i) {
                var v = ratingOf(dom.id);
                var p = pointFor(i, v);
                return h('g', { key: 'pt_' + dom.id },
                  h('circle', { cx: p.x, cy: p.y, r: 5, fill: dom.color, stroke: '#fff', strokeWidth: 1.5 })
                );
              }),
              // Labels
              DOMAINS.map(function(dom, i) {
                var lp = labelPoint(i);
                var v = ratingOf(dom.id);
                return h('g', { key: 'lbl_' + dom.id },
                  h('text', { x: lp.x, y: lp.y - 6, textAnchor: 'middle', fontSize: 16, fill: dom.color }, dom.icon),
                  h('text', { x: lp.x, y: lp.y + 10, textAnchor: 'middle', fontSize: 11, fill: '#e2e8f0', style: { fontWeight: 700 } }, dom.label.slice(0, 18)),
                  h('text', { x: lp.x, y: lp.y + 24, textAnchor: 'middle', fontSize: 13, fill: dom.color, style: { fontWeight: 900 } }, v || '0')
                );
              })
            )
          ),

          // Text-equivalent (accessible to all users; WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#fcd34d', fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b' } }, '🔤 Read this wheel as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, 'Ratings 0-10, where 0 means thin/empty in this area and 10 means full/thriving:'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
                DOMAINS.map(function(dom) {
                  var v = ratingOf(dom.id);
                  return h('li', { key: dom.id, style: { marginBottom: 2 } },
                    h('strong', { style: { color: dom.color } }, dom.label),
                    ': ' + (v || '0') + '/10'
                  );
                })
              )
            )
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('rate'); }, 'aria-label': 'Adjust ratings',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✏️ Adjust ratings'),
            h('button', { onClick: function() { goto('reflect'); }, 'aria-label': 'Reflect',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Reflect'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RATE
      // ═══════════════════════════════════════════════════════════
      function renderRate() {
        function setRating(id, value) {
          var ratings = Object.assign({}, (d.ratings || {}));
          ratings[id] = value;
          setWOL({ ratings: ratings });
        }
        function setNote(id, val) {
          var notes = Object.assign({}, (d.notes || {}));
          notes[id] = val;
          setWOL({ notes: notes });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '✏️ Rate each from 1 to 10. '),
            '1 means thin / empty in this area; 10 means full / thriving. Use your gut, not your math.'
          ),

          DOMAINS.map(function(dom) {
            var v = ratingOf(dom.id);
            var note = (d.notes || {})[dom.id] || '';
            var noteId = 'wol-note-' + dom.id;
            return h('div', { key: dom.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + dom.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 26 } }, dom.icon),
                h('div', { style: { flex: 1, minWidth: 140 } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: dom.color } }, dom.label)
                ),
                h('div', { style: { fontSize: 22, fontWeight: 900, color: v > 0 ? dom.color : '#475569' } }, v || '–')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }, role: 'radiogroup', 'aria-label': 'Rate ' + dom.label },
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function(n) {
                  var active = v === n;
                  return h('button', { key: n, onClick: function() { setRating(dom.id, n); }, role: 'radio', 'aria-checked': active, 'aria-label': 'Rate ' + n,
                    style: { padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (active ? dom.color : '#475569'), background: active ? dom.color : '#1e293b', color: active ? '#0f172a' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700, minWidth: 32 } }, n);
                })
              ),
              h('label', { htmlFor: noteId, style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Note (optional)'),
              h('textarea', { id: noteId, value: note,
                placeholder: 'What is true about this area right now? Why this number?',
                onChange: function(e) { setNote(dom.id, e.target.value); },
                style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical' } })
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var rated = DOMAINS.filter(function(d2) { return ratingOf(d2.id) > 0; });
        if (rated.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Rate at least a few domains first'),
              h('button', { onClick: function() { goto('rate'); }, 'aria-label': 'Go to rate',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: '#fde68a', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Rate')
            )
          );
        }
        var sorted = rated.slice().sort(function(a, b) { return ratingOf(b.id) - ratingOf(a.id); });
        var top = sorted.slice(0, 3);
        var bottom = sorted.slice(-3).reverse();
        var avg = rated.reduce(function(sum, d2) { return sum + ratingOf(d2.id); }, 0) / rated.length;

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '💭 What to do with this shape: '),
            'A round wheel is not the goal. The goal is honesty about right now, and one or two intentional moves toward something that matters. Average across rated domains: ', h('strong', null, avg.toFixed(1)), '.'
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 8 } }, '🟢 Where my wheel is fullest'),
            top.map(function(d2) {
              return h('div', { key: d2.id, style: { fontSize: 13, color: '#e2e8f0', marginBottom: 4 } },
                d2.icon + ' ' + d2.label + ' · ', h('strong', { style: { color: d2.color } }, ratingOf(d2.id)));
            }),
            h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55, marginTop: 6, fontStyle: 'italic' } },
              'These are doing well. Notice them. They are part of how you are holding the rest.')
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fecaca', marginBottom: 8 } }, '🔴 Where my wheel is thinnest'),
            bottom.map(function(d2) {
              return h('div', { key: d2.id, style: { fontSize: 13, color: '#e2e8f0', marginBottom: 4 } },
                d2.icon + ' ' + d2.label + ' · ', h('strong', { style: { color: d2.color } }, ratingOf(d2.id)));
            }),
            h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55, marginTop: 6, fontStyle: 'italic' } },
              'A low score is not a moral judgment. Sometimes a domain is intentionally thin right now (you are pouring into work for a season, or family is intense and there is no room for romance). The question worth sitting with: which of these would you actually want to move from a 3 to a 5 in the next month? Only one. Pick one.')
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)', borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', fontSize: 12.5, color: '#c7d2fe', lineHeight: 1.6 } },
            h('strong', null, '🎯 One-move-at-a-time: '),
            'Coaching tradition wisdom on this tool: do not try to raise three numbers at once. Pick ONE domain. What is one small thing you could do this week that would move it by half a point? Half-point moves are what builds wheels over time. Big-leap moves usually do not stick.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(245,158,11,0.10)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fde68a', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('wheel'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'wol-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#wol-print-region, #wol-print-region * { visibility: visible !important; } ' +
              '#wol-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #d97706' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Wheel of Life'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Wheel of Life'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            DOMAINS.map(function(dom) {
              var v = ratingOf(dom.id);
              var note = (d.notes || {})[dom.id] || '';
              return h('div', { key: dom.id, style: { marginBottom: 12, pageBreakInside: 'avoid', padding: 10, borderLeft: '3px solid ' + dom.color, background: '#f8fafc' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { style: { fontSize: 18 } }, dom.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, color: '#0f172a', flex: 1 } }, dom.label),
                  h('span', { style: { fontSize: 22, fontWeight: 900, color: dom.color } }, v || '–')
                ),
                note ? h('p', { style: { margin: 0, color: '#0f172a', fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } }, note) : null
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Wheel of Life format from the coaching tradition (commonly attributed to Paul J. Meyer, Success Motivation Institute, 1960s; standardized in Co-Active Coaching). ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('wheelOfLife', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, 'What the Wheel of Life is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A self-portrait: eight life domains, each rated 1 to 10. The shape of your wheel makes visible where life is rich and where it is hungry right now. The point is not to have a perfectly round wheel; the point is honesty.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Drawing it once a quarter and comparing across versions shows how life shifts. Domains that were thin sometimes get full; full domains sometimes thin out for a season. Tracking the shape over time tells a story that a snapshot does not.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, 'Where the format comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Wheel of Life is from the coaching tradition. The most common attribution is Paul J. Meyer, founder of the Success Motivation Institute in the 1960s, though similar life-balance wheel exercises appear in earlier self-improvement and personal development literature. The form was standardized in Whitworth, Kimsey-House, and Sandahl\'s Co-Active Coaching (1998 and later editions), which is the foundational text of the International Coaching Federation\'s coaching profession. The tool is now widely used in coaching, counseling, and personal-development contexts.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for the Wheel of Life.'),
            sourceCard('Whitworth, L., Kimsey-House, K., Kimsey-House, H., and Sandahl, P. (2007)', 'Co-Active Coaching: Changing Business, Transforming Lives (3rd edition), Nicholas Brealey', 'The standardization of the Wheel of Life as a coaching tool. Foundational text of the modern coaching profession.', null),
            sourceCard('International Coaching Federation', 'coachingfederation.org', 'The profession\'s standard-setting body. Resources on coaching frameworks, including life-balance tools.', 'https://coachingfederation.org/'),
            sourceCard('MindTools (free resources)', 'mindtools.com', 'Free template and detailed walkthrough of the Wheel of Life exercise.', 'https://www.mindtools.com/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The Wheel of Life is a heuristic, not a validated psychometric instrument. There is no scientific evidence that a 1-10 self-rating across 8 domains predicts anything; the point is reflection, not measurement.'),
              h('li', null, 'The 8 domains are conventional, not natural. Different versions use 6, 10, or 12 domains; some add a "spirituality" or "purpose" domain; some split work and school. Your version can use the domains that fit your life.'),
              h('li', null, 'A low rating in a domain is information, not a deficiency. Some seasons of life have an intentionally thin domain (recovery, focused work, intense family caretaking). The wheel does not say "balance every spoke"; it shows you what is true so you can choose.'),
              h('li', null, 'For students dealing with significant structural inequities (poverty, housing instability, family violence), the Wheel can land as "look at all the ways your life is failing." Use with care; pair with a counselor if needed.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 12.5, color: '#fde68a', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'The Wheel works well as a beginning-of-quarter Crew activity, with a follow-up at the end of the quarter ("how did your wheel shift?"). For students whose home life is complicated, do NOT require them to share their wheel publicly; private reflection followed by an optional pair-share at the student\'s choosing is much safer.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fcd34d', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fde68a', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fde68a', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'rate') body = renderRate();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderWheel();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Wheel of Life' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
