// ═══════════════════════════════════════════════════════════════
// sel_tool_stressbucket.js — Stress Bucket
// A CBT-tradition visual: stressors pour INTO a bucket; coping
// practices act as TAPS that drain it. When inflow exceeds outflow,
// the bucket overflows, and overflow shows up as sleep changes,
// mood, body, or behavior.
//
// Honest framing: this is a useful capacity metaphor; it does NOT
// imply that all stress is individually removable through coping.
// Structural stressors require structural responses.
//
// Originally Brabban & Turkington (2002) in CBT for psychosis;
// adapted broadly via NHS IAPT and Mind UK for general mental
// health education.
// Registered tool ID: "stressBucket"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('stressBucket'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-stressbucket')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-stressbucket';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  var WEIGHTS = [
    { value: 1, label: 'Light',  color: '#22c55e' },
    { value: 2, label: 'Medium', color: '#facc15' },
    { value: 3, label: 'Heavy',  color: '#f97316' },
    { value: 4, label: 'Crushing', color: '#ef4444' }
  ];
  var CAPACITIES = [
    { value: 1, label: 'A little drain' },
    { value: 2, label: 'Medium drain' },
    { value: 3, label: 'Big drain' }
  ];

  var STRESSOR_STARTERS = [
    'School workload right now',
    'A specific class or teacher',
    'A friendship or social conflict',
    'Family stress or conflict at home',
    'Financial pressure',
    'Not enough sleep',
    'Health stuff (mine or someone I love)',
    'A worry about the future',
    'Living with [identity that the world treats badly]',
    'A job',
    'Caretaking for someone',
    'Anniversary or grief',
    'Sensory load (commute, crowds, lights)',
    'Big change happening (move, breakup, new school)'
  ];
  var TAP_STARTERS = [
    'Sleep (real sleep, not phone-in-bed)',
    'Movement / exercise',
    'Time outside',
    'Talking to a specific person',
    'A creative practice (drawing, writing, music)',
    'A specific pet or animal',
    'My faith / spiritual practice',
    'Cooking / eating well',
    'Therapy or counseling',
    'Time alone to recharge',
    'A specific friend group activity',
    'A specific hobby that absorbs me'
  ];
  var OVERFLOW_STARTERS = [
    'Trouble falling asleep, or sleeping too much',
    'Crying more easily',
    'Snapping at people I love',
    'Shutting down, ghosting',
    'Headaches, stomachaches, body pain',
    'Eating too much or too little',
    'Avoiding everything',
    'Drinking, using, scrolling for hours',
    'Cannot focus, grades slipping',
    'Self-critical voice gets loud',
    'Catastrophizing thoughts',
    'Numbness, going through motions'
  ];

  function defaultState() {
    return {
      view: 'bucket',
      stressors: [],     // [{label, weight}]
      taps: [],          // [{label, capacity}]
      overflowSigns: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('stressBucket', {
    icon: '🪣',
    label: 'Stress Bucket',
    desc: 'A visual capacity model. Stressors pour into a bucket; coping practices drain it. When inflow exceeds outflow, the bucket overflows. Useful for seeing whether your current stressors and taps are balanced. CBT-tradition tool (Brabban and Turkington 2002), widely used in NHS IAPT and Mind UK. NOT a claim that all stress is individually removable.',
    color: 'teal',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.stressBucket || defaultState();
      function setSB(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.stressBucket) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.stressors || patch.taps || patch.overflowSigns) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { stressBucket: next });
        });
      }
      var view = d.view || 'bucket';
      function goto(v) { setSB({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#5eead4', fontSize: 22, fontWeight: 900 } }, '🪣 Stress Bucket'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A visual of what is filling your bucket and what is draining it.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'bucket', label: 'My Bucket', icon: '🪣' },
          { id: 'edit', label: 'Edit', icon: '✏️' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Stress Bucket sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#14b8a6' : '#334155'),
                background: active ? 'rgba(20,184,166,0.18)' : '#1e293b',
                color: active ? '#99f6e4' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'The bucket model is one way to see your capacity. It does not say every stressor is yours to fix; some inflows are structural and require structural responses. If your bucket is consistently overflowing, that is worth bringing to a counselor. Crisis Text Line: text HOME to 741741.'
        );
      }

      function totalInflow() {
        return (d.stressors || []).reduce(function(sum, s) { return sum + (s.weight || 0); }, 0);
      }
      function totalOutflow() {
        return (d.taps || []).reduce(function(sum, t) { return sum + (t.capacity || 0); }, 0);
      }
      function bucketFill() {
        var net = totalInflow() - totalOutflow();
        // Clamp 0-100 percentage
        return Math.max(0, Math.min(100, net * 8));
      }

      // ═══════════════════════════════════════════════════════════
      // BUCKET — SVG visualization
      // ═══════════════════════════════════════════════════════════
      function renderBucket() {
        var stressors = d.stressors || [];
        var taps = d.taps || [];
        var overflow = d.overflowSigns || [];
        var inflow = totalInflow();
        var outflow = totalOutflow();
        var net = inflow - outflow;
        var fill = bucketFill();
        var overflowing = fill >= 100;

        if (stressors.length === 0 && taps.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(20,184,166,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🪣'),
              h('h3', { style: { margin: '0 0 8px', color: '#99f6e4', fontSize: 18 } }, 'Your bucket is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'Add what is currently pouring INTO your bucket (stressors) and what is draining it OUT (the practices, people, and time that help). The visual will show whether you are net-filling or net-draining.'),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Start filling my bucket',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start filling my bucket')
            ),
            softPointer()
          );
        }

        // SVG bucket
        var bucketW = 220, bucketH = 280;
        var bucketX = 200, bucketY = 100;
        // Fill rectangle inside the bucket
        var fillH = (fill / 100) * (bucketH - 30);
        var fillY = bucketY + (bucketH - fillH) - 10;
        var fillColor = overflowing ? '#ef4444' : (fill > 70 ? '#f97316' : (fill > 40 ? '#facc15' : '#14b8a6'));

        // Accessibility description, computed from live data
        var svgDesc = 'Stress bucket showing capacity at ' + Math.round(fill) + ' percent. ' +
          'Inflow total: ' + inflow + ' from ' + stressors.length + ' stressor' + (stressors.length === 1 ? '' : 's') + '. ' +
          'Outflow total: ' + outflow + ' from ' + taps.length + ' tap' + (taps.length === 1 ? '' : 's') + '. ' +
          (overflowing ? 'The bucket is overflowing.' :
            (net > 5 ? 'Filling faster than draining.' :
              (net > 0 ? 'Slightly more in than out.' :
                (net === 0 ? 'Roughly balanced.' : 'Draining faster than filling.'))));

        return h('div', null,
          // Summary line
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: overflowing ? 'rgba(239,68,68,0.15)' : '#0f172a', border: '1px solid ' + (overflowing ? '#ef4444' : '#1e293b'), marginBottom: 12, flexWrap: 'wrap' } },
            h('div', { style: { flex: 1, minWidth: 200 } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Right now'),
              h('div', { style: { fontSize: 16, color: overflowing ? '#fca5a5' : '#e2e8f0', fontWeight: 800 } },
                overflowing ? '⚠️ Your bucket is overflowing' :
                  (net > 5 ? 'Your bucket is filling faster than it is draining' :
                    (net > 0 ? 'Slightly more in than out right now' :
                      (net === 0 ? 'Roughly balanced today' : 'Draining faster than filling'))))
            ),
            h('div', { style: { fontSize: 12, color: '#94a3b8', textAlign: 'right' } },
              h('div', null, 'Inflow: ' + inflow),
              h('div', null, 'Outflow: ' + outflow)
            )
          ),

          // SVG bucket
          h('div', { style: { padding: 10, borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto', textAlign: 'center' } },
            h('svg', { width: '100%', viewBox: '0 0 620 480', style: { maxWidth: 620 }, 'aria-labelledby': 'stressbucket-svg-title stressbucket-svg-desc', role: 'img' },
              h('title', { id: 'stressbucket-svg-title' }, 'Stress Bucket visualization'),
              h('desc', { id: 'stressbucket-svg-desc' }, svgDesc),
              // Stressor inflows (top, pouring in)
              stressors.slice(0, 8).map(function(s, i) {
                var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                var x = 230 + (i % 4) * 40;
                var y = 30 + Math.floor(i / 4) * 30;
                return h('g', { key: 's_' + i },
                  h('text', { x: x, y: y, textAnchor: 'middle', fontSize: 18, fill: w.color }, '💧'),
                  h('line', { x1: x, y1: y + 6, x2: x, y2: 95, stroke: w.color, strokeWidth: w.value * 1.2, strokeDasharray: '2 4', opacity: 0.7 })
                );
              }),

              // Bucket outline
              h('path', {
                d: 'M ' + bucketX + ' ' + bucketY +
                   ' L ' + (bucketX + bucketW) + ' ' + bucketY +
                   ' L ' + (bucketX + bucketW - 20) + ' ' + (bucketY + bucketH) +
                   ' L ' + (bucketX + 20) + ' ' + (bucketY + bucketH) +
                   ' Z',
                fill: '#1e293b', stroke: '#5eead4', strokeWidth: 3
              }),

              // Fill
              fill > 0 ? h('rect', {
                x: bucketX + 24, y: fillY,
                width: bucketW - 48, height: fillH,
                fill: fillColor, opacity: 0.75,
                clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)'
              }) : null,

              // Overflow drips
              overflowing ? h('g', null,
                h('text', { x: bucketX + 30, y: bucketY - 10, fontSize: 22 }, '💧'),
                h('text', { x: bucketX + bucketW - 50, y: bucketY - 10, fontSize: 22 }, '💧'),
                h('text', { x: bucketX + bucketW / 2 - 10, y: bucketY - 14, fontSize: 24 }, '💧')
              ) : null,

              // Bucket label
              h('text', { x: bucketX + bucketW / 2, y: bucketY + bucketH / 2, textAnchor: 'middle', fontSize: 12, fill: '#0f172a', style: { fontWeight: 800 } },
                Math.round(fill) + '%'),

              // Taps (right side, draining out)
              taps.slice(0, 4).map(function(t, i) {
                var tapY = bucketY + 40 + i * 50;
                var capW = (t.capacity || 1) * 2;
                return h('g', { key: 't_' + i },
                  h('rect', { x: bucketX + bucketW - 8, y: tapY, width: 30, height: 10, fill: '#a78bfa' }),
                  h('rect', { x: bucketX + bucketW + 22, y: tapY - 4, width: 8, height: 18, fill: '#a78bfa' }),
                  h('line', { x1: bucketX + bucketW + 26, y1: tapY + 14, x2: bucketX + bucketW + 26, y2: tapY + 50, stroke: '#a78bfa', strokeWidth: capW, opacity: 0.7, strokeDasharray: '2 3' }),
                  h('text', { x: bucketX + bucketW + 35, y: tapY + 6, fontSize: 11, fill: '#a78bfa', style: { fontWeight: 700 } }, (t.label || '').slice(0, 18))
                );
              }),

              // Title labels
              h('text', { x: bucketX + bucketW / 2, y: 18, textAnchor: 'middle', fontSize: 12, fill: '#fb7185', style: { fontWeight: 800 } }, 'Stressors pour in'),
              h('text', { x: bucketX + bucketW + 80, y: bucketY + 30, textAnchor: 'middle', fontSize: 12, fill: '#a78bfa', style: { fontWeight: 800 } }, 'Taps drain')
            )
          ),

          // Text-equivalent (accessible to all users; WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#5eead4', fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b' } }, '🔤 Read this bucket as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, svgDesc),
              stressors.length > 0 ? h('div', { style: { marginBottom: 8 } },
                h('div', { style: { fontSize: 12, color: '#fb7185', fontWeight: 700, marginBottom: 4 } }, '💧 Stressors flowing in'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.6 } },
                  stressors.map(function(s, i) {
                    var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                    return h('li', { key: i }, s.label + ' (' + w.label + ', weight ' + s.weight + ')');
                  })
                )
              ) : null,
              taps.length > 0 ? h('div', null,
                h('div', { style: { fontSize: 12, color: '#a78bfa', fontWeight: 700, marginBottom: 4 } }, '🛟 Taps draining'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.6 } },
                  taps.map(function(t, i) {
                    var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                    return h('li', { key: i }, t.label + ' (' + c.label + ', capacity ' + t.capacity + ')');
                  })
                )
              ) : null
            )
          ),

          // Lists
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 12 } },
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fb7185', marginBottom: 8 } }, '💧 Inflow ' + '(' + inflow + ')'),
              stressors.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 16px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
                    stressors.map(function(s, i) {
                      var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                      return h('li', { key: i }, s.label, h('span', { style: { color: w.color, marginLeft: 6 } }, '(' + w.label + ')'));
                    }))
                : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(none added)')
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a78bfa' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a78bfa', marginBottom: 8 } }, '🛟 Outflow ' + '(' + outflow + ')'),
              taps.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 16px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
                    taps.map(function(t, i) {
                      var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                      return h('li', { key: i }, t.label, h('span', { style: { color: '#a78bfa', marginLeft: 6 } }, '(' + c.label + ')'));
                    }))
                : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(none added)')
            )
          ),

          overflow.length > 0 && overflowing ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, '⚠️ How my overflow shows up'),
            h('div', { style: { fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } }, overflow.join('  ·  '))
          ) : null,

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Edit bucket',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✏️ Edit'),
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
        function addStressor() {
          var lbl = document.getElementById('sb-stressor-input');
          var w = document.getElementById('sb-stressor-weight');
          if (!lbl || !lbl.value.trim()) return;
          var entry = { label: lbl.value.trim(), weight: parseInt(w ? w.value : '2', 10) };
          setSB({ stressors: (d.stressors || []).concat([entry]) });
          lbl.value = '';
        }
        function addTap() {
          var lbl = document.getElementById('sb-tap-input');
          var c = document.getElementById('sb-tap-capacity');
          if (!lbl || !lbl.value.trim()) return;
          var entry = { label: lbl.value.trim(), capacity: parseInt(c ? c.value : '2', 10) };
          setSB({ taps: (d.taps || []).concat([entry]) });
          lbl.value = '';
        }
        function addOverflow(value) {
          if (!value || !value.trim()) return;
          var current = (d.overflowSigns || []).slice();
          if (current.indexOf(value.trim()) === -1) current.push(value.trim());
          setSB({ overflowSigns: current });
        }
        function addOverflowFromInput() {
          var el = document.getElementById('sb-overflow-input');
          if (!el) return;
          addOverflow(el.value);
          el.value = '';
        }
        function removeStressor(i) {
          var nx = (d.stressors || []).slice();
          nx.splice(i, 1);
          setSB({ stressors: nx });
        }
        function removeTap(i) {
          var nx = (d.taps || []).slice();
          nx.splice(i, 1);
          setSB({ taps: nx });
        }
        function removeOverflow(i) {
          var nx = (d.overflowSigns || []).slice();
          nx.splice(i, 1);
          setSB({ overflowSigns: nx });
        }

        return h('div', null,
          // Stressors
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fb7185', marginBottom: 8 } }, '💧 Stressors pouring INTO my bucket'),
            (d.stressors || []).length > 0 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 } },
              (d.stressors || []).map(function(s, i) {
                var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, background: '#1e293b' } },
                  h('span', { style: { width: 50, fontSize: 11, color: w.color, fontWeight: 700, textTransform: 'uppercase' } }, w.label),
                  h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, s.label),
                  h('button', { onClick: function() { removeStressor(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                );
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sb-stressor-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add stressor'),
              h('input', { id: 'sb-stressor-input', type: 'text', placeholder: 'A stressor...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addStressor(); } },
                style: { flex: 2, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('select', { id: 'sb-stressor-weight', defaultValue: '2',
                style: { padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                WEIGHTS.map(function(w) { return h('option', { key: w.value, value: w.value }, w.label); })),
              h('button', { onClick: addStressor, 'aria-label': 'Add stressor',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#fb7185', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8' } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                STRESSOR_STARTERS.map(function(s, si) {
                  return h('button', { key: si, onClick: function() { setSB({ stressors: (d.stressors || []).concat([{ label: s, weight: 2 }]) }); }, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #fb718566', background: 'rgba(15,23,42,0.6)', color: '#cbd5e1', cursor: 'pointer', fontSize: 11 } }, '+ ' + s);
                })
              )
            )
          ),

          // Taps
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a78bfa', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a78bfa', marginBottom: 8 } }, '🛟 Taps draining my bucket'),
            (d.taps || []).length > 0 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 } },
              (d.taps || []).map(function(t, i) {
                var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, background: '#1e293b' } },
                  h('span', { style: { width: 80, fontSize: 11, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' } }, c.label),
                  h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, t.label),
                  h('button', { onClick: function() { removeTap(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                );
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sb-tap-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add tap'),
              h('input', { id: 'sb-tap-input', type: 'text', placeholder: 'A practice or person that drains the bucket...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addTap(); } },
                style: { flex: 2, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('select', { id: 'sb-tap-capacity', defaultValue: '2',
                style: { padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                CAPACITIES.map(function(c) { return h('option', { key: c.value, value: c.value }, c.label); })),
              h('button', { onClick: addTap, 'aria-label': 'Add tap',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#a78bfa', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8' } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                TAP_STARTERS.map(function(s, si) {
                  return h('button', { key: si, onClick: function() { setSB({ taps: (d.taps || []).concat([{ label: s, capacity: 2 }]) }); }, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #a78bfa66', background: 'rgba(15,23,42,0.6)', color: '#cbd5e1', cursor: 'pointer', fontSize: 11 } }, '+ ' + s);
                })
              )
            )
          ),

          // Overflow signs
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, '⚠️ How overflow shows up in me'),
            h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 } }, 'These are the early signs that your bucket is overflowing, so you can catch it earlier next time.'),
            (d.overflowSigns || []).length > 0
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
                  d.overflowSigns.map(function(s, i) {
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: '#1e293b', border: '1px solid rgba(239,68,68,0.4)', fontSize: 12, color: '#fecaca' } },
                      h('span', null, s),
                      h('button', { onClick: function() { removeOverflow(i); }, 'aria-label': 'Remove',
                        style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 } }, '✕')
                    );
                  })
                )
              : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sb-overflow-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add overflow sign'),
              h('input', { id: 'sb-overflow-input', type: 'text', placeholder: 'How does overflow show up in YOU?',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addOverflowFromInput(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: addOverflowFromInput, 'aria-label': 'Add overflow sign',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8' } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                OVERFLOW_STARTERS.map(function(s, si) {
                  var already = (d.overflowSigns || []).indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addOverflow(s); }, disabled: already, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.5)', background: already ? '#1e293b' : 'rgba(15,23,42,0.6)', color: already ? '#64748b' : '#cbd5e1', cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var stressors = d.stressors || [];
        var taps = d.taps || [];
        var inflow = totalInflow();
        var outflow = totalOutflow();
        var crushing = stressors.filter(function(s) { return s.weight === 4; });
        var heavy = stressors.filter(function(s) { return s.weight === 3; });
        var bigTaps = taps.filter(function(t) { return t.capacity === 3; });

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(20,184,166,0.08)', borderTop: '1px solid rgba(20,184,166,0.3)', borderRight: '1px solid rgba(20,184,166,0.3)', borderBottom: '1px solid rgba(20,184,166,0.3)', borderLeft: '3px solid #14b8a6', marginBottom: 14, fontSize: 13, color: '#99f6e4', lineHeight: 1.65 } },
            h('strong', null, '💭 The bucket model is descriptive, not prescriptive. '),
            'It does not say "drain your bucket better." It says "see clearly what is in there, and decide what is yours to act on."'
          ),

          inflow > outflow + 5 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: '#fca5a5', fontWeight: 800, marginBottom: 6 } }, '⚠️ Inflow is significantly higher than outflow'),
            h('p', { style: { margin: 0, color: '#fecaca', fontSize: 13, lineHeight: 1.65 } },
              'Your inflow is ' + inflow + ' and your outflow is ' + outflow + '. That is the kind of imbalance that runs people down over time. Two questions worth sitting with: (1) Is there a stressor on the inflow list that an adult could actually help reduce? (a workload, a conflict, a financial thing.) (2) Is there a tap you used to use that has fallen out of your week, that you could bring back?'
            )
          ) : null,

          crushing.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: '#fca5a5', fontWeight: 800, marginBottom: 6 } }, '🔴 Crushing-weight stressors'),
            h('p', { style: { margin: '0 0 6px', color: '#fecaca', fontSize: 13, lineHeight: 1.65 } },
              'You marked ' + crushing.length + ' stressor' + (crushing.length === 1 ? '' : 's') + ' as crushing-weight: ' + crushing.map(function(s) { return s.label; }).join('; ') + '.'),
            h('p', { style: { margin: 0, color: '#fde68a', fontSize: 12.5, lineHeight: 1.65, fontStyle: 'italic' } },
              'A crushing-weight stressor is the kind that does not get solved by adding more taps. It usually needs an adult on it with you (counselor, parent, mentor, school psych). If you have not told anyone about a crushing-weight stressor, that is the most useful single move.')
          ) : null,

          taps.length === 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.3)', borderRight: '1px solid rgba(167,139,250,0.3)', borderBottom: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, '💭 No taps listed'),
            h('p', { style: { margin: 0, color: '#e9d5ff', fontSize: 13, lineHeight: 1.65 } },
              'You have not added anything to the outflow side. Sometimes that is because you do not have any practices that help; sometimes it is because they do not feel "big enough" to count. They count. A 10-minute walk counts. Texting one friend counts. Watching one episode of a show that makes you feel like yourself counts. Add what is actually there.')
          ) : null,

          bigTaps.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, '🛟 Your biggest taps'),
            h('p', { style: { margin: 0, color: '#e9d5ff', fontSize: 13, lineHeight: 1.65 } },
              'These are doing the most work for you right now: ' + bigTaps.map(function(t) { return t.label; }).join('; ') + '. Worth noticing. If one of these is taken away (e.g. a sport season ends, a friend moves), you will probably need to find a new big tap, not just hope.')
          ) : null,

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: '#fcd34d', fontWeight: 800, marginBottom: 6 } }, '⚖️ Honest reflection question'),
            h('p', { style: { margin: 0, color: '#fde68a', fontSize: 13, lineHeight: 1.65 } },
              'Looking at your inflow side: which of those stressors is yours to act on, and which is structural? Structural stressors (a school policy, a family situation, a financial reality) are not your fault to "cope better" with. The bucket model is honest about this; if a structural stressor is pouring in at a heavy rate, the only real fix is at the source, not at your taps.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var stressors = d.stressors || [];
        var taps = d.taps || [];
        var overflow = d.overflowSigns || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(20,184,166,0.10)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#99f6e4', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('bucket'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'stressbucket-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#stressbucket-print-region, #stressbucket-print-region * { visibility: visible !important; } ' +
              '#stressbucket-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #0d9488' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Stress Bucket'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Stress Bucket'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null,
              h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Inflow total: ' + totalInflow() + '  ·  Outflow total: ' + totalOutflow())
            ),

            // Stressors
            h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#fb7185', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Stressors (inflow)'),
              stressors.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.65 } },
                    stressors.map(function(s, i) {
                      var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                      return h('li', { key: i }, s.label + '  (' + w.label + ')');
                    }))
                : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(none added)')
            ),

            // Taps
            h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#7c3aed', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Taps (outflow)'),
              taps.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.65 } },
                    taps.map(function(t, i) {
                      var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                      return h('li', { key: i }, t.label + '  (' + c.label + ')');
                    }))
                : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(none added)')
            ),

            // Overflow
            h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#dc2626', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'How overflow shows up in me'),
              overflow.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.65 } },
                    overflow.map(function(s, i) { return h('li', { key: i }, s); }))
                : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(none added)')
            ),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Stress Bucket model from Brabban, A. and Turkington, D. (2002), adapted widely in NHS IAPT and Mind UK practice. ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('stressBucket', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#5eead4', fontSize: 16 } }, 'What the Stress Bucket is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The Stress Bucket is a capacity model. You picture yourself carrying a bucket. Stressors pour in from the top, sized by how heavy each one is. Coping practices, supports, sleep, and time function as taps that drain the bucket out the side. When inflow exceeds outflow, the bucket overflows, and overflow shows up as the early-warning signs you already know about yourself (sleep changes, mood, body, behavior).'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The point of the visual is to see capacity clearly. Two students can be carrying the same workload and one is fine because the rest of their bucket is light; the other is overflowing because of what is happening at home. The bucket is not graded; it is a picture.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#5eead4', fontSize: 16 } }, 'Where the model comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Stress Bucket is part of the wider Cognitive Behavioral Therapy (CBT) tradition. The version most commonly used in mental-health education comes from Alison Brabban and Douglas Turkington (2002), originally developed for cognitive therapy of psychosis. The metaphor was adopted broadly by NHS Improving Access to Psychological Therapies (IAPT) self-help materials and by Mind UK as an accessible explanation of the relationship between stressors, coping resources, and symptom onset. The visual you are looking at is the same one used in many UK secondary schools and community mental-health services.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#5eead4', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for the Stress Bucket model.'),
            sourceCard('Brabban, A. and Turkington, D. (2002)', '"The Search for Meaning: Detecting Congruence Between Symptom Content and Personal Meaning in Psychosis," in A. Morrison (Ed.), A Casebook of Cognitive Therapy for Psychosis, Routledge', 'The clinical chapter where the Stress Bucket as taught today is presented in CBT for psychosis. Foundational publication.', null),
            sourceCard('Turkington, D., Kingdon, D., and Weiden, P. J. (2006)', '"Cognitive Behavior Therapy for Schizophrenia," American Journal of Psychiatry, 163(3), 365-373', 'Peer-reviewed overview of CBT for psychosis including the bucket model in clinical practice.', null),
            sourceCard('NHS Mental Health Self-Help', 'nhs.uk/mental-health/self-help', 'UK NHS resources, including the Stress Bucket framing in Improving Access to Psychological Therapies (IAPT) self-help materials.', 'https://www.nhs.uk/mental-health/self-help/'),
            sourceCard('Mind UK', 'mind.org.uk', 'UK mental-health charity; Stress Bucket adapted for accessible public-facing mental health education. Free resources.', 'https://www.mind.org.uk/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The bucket model can be used to imply that all stress is individually drainable through better coping. It is not. Many inflows are structural: poverty, racism, ableism, housing instability, oppressive school environments, family violence. Adding more "taps" does not fix a structural inflow; the source has to change.'),
              h('li', null, 'The model is helpful for self-awareness and for naming overflow signs early. It is not a clinical diagnostic.'),
              h('li', null, 'The weight ratings (light/medium/heavy/crushing) and the capacity ratings (little drain/medium drain/big drain) are subjective. Two people in the same situation may weight the same stressor differently. Your weights are honest data; they are not measurements.'),
              h('li', null, 'If your bucket overflows constantly, that is information; it deserves a counselor or therapist on it with you, not just more taps.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(20,184,166,0.10)', borderTop: '1px solid rgba(20,184,166,0.3)', borderRight: '1px solid rgba(20,184,166,0.3)', borderBottom: '1px solid rgba(20,184,166,0.3)', borderLeft: '3px solid #14b8a6', fontSize: 12.5, color: '#99f6e4', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'The Stress Bucket pairs well with the Window of Tolerance: the Window is about real-time arousal, the Bucket is about accumulated load. A student whose bucket is overflowing is more likely to live outside their Window. The pair gives students two complementary self-knowledge tools without overcomplicating things.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#5eead4', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#99f6e4', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#99f6e4', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderBucket();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Stress Bucket' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
