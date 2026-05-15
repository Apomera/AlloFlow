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

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('path'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-path')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-path';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

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
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.path || defaultState();
      function setPATH(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.path) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.responses || patch.name !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { path: next });
        });
      }
      var view = d.view || 'overview';
      function goto(v) { setPATH({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 22, fontWeight: 900 } }, '🧭 PATH'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Planning Alternative Tomorrows with Hope: a futures-planning visual.')
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
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'PATH sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#818cf8' : '#334155'),
                background: active ? 'rgba(129,140,248,0.18)' : '#1e293b',
                color: active ? '#e0e7ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Your PATH is yours. If a prompt brings up something heavy, that is information; bring it to a counselor or trusted adult. Crisis Text Line: text HOME to 741741.'
        );
      }

      function completedCount() {
        var n = 0;
        for (var i = 0; i < STAGES.length; i++) {
          var v = (d.responses || {})[STAGES[i].key];
          if (v && v.trim()) n++;
        }
        return n;
      }

      // ═══════════════════════════════════════════════════════════
      // OVERVIEW — show 8 stages as a left-to-right journey
      // ═══════════════════════════════════════════════════════════
      function renderOverview() {
        var pct = Math.round((completedCount() / STAGES.length) * 100);
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(129,140,248,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e0e7ff' } }, d.name ? (d.name + '’s PATH') : 'My PATH'),
                h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } },
                  completedCount() + ' of ' + STAGES.length + ' stages filled',
                  d.lastUpdated ? ' · updated ' + d.lastUpdated : ''
                )
              ),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Work on my PATH',
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #818cf8', background: 'rgba(129,140,248,0.18)', color: '#e0e7ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✏️ Work on it')
            ),
            h('div', { style: { marginTop: 12, height: 8, borderRadius: 4, background: '#1e293b', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'PATH completion' },
              h('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #4f46e5, #fbbf24)', transition: 'width 240ms ease' } })
            )
          ),

          // Backward-first guidance
          h('div', { style: { padding: 12, borderRadius: 8, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)', borderLeft: '3px solid #fbbf24', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '⭐ Start with the North Star. '),
            'PATH is filled out BACKWARDS in the original practice: you begin with where you want to go (the North Star) and work back toward what you can do tomorrow. The reason is that small first steps make a lot more sense once you know what you are walking toward.'
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            STAGES.map(function(s, i) {
              var v = (d.responses || {})[s.key] || '';
              var done = v && v.trim();
              return h('button', { key: s.key,
                onClick: function() { setPATH({ activeKey: s.key, view: 'edit' }); },
                'aria-label': s.label + (done ? ' (filled in)' : ' (empty)'),
                style: { textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid ' + (done ? s.color + 'aa' : '#334155'), borderLeft: '4px solid ' + s.color, background: done ? s.color + '14' : '#0f172a', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 22 } }, s.icon),
                  h('div', null,
                    h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Stage ' + (i + 1)),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: done ? s.color : '#e0e7ff' } }, s.label)
                  ),
                  done ? h('span', { style: { marginLeft: 'auto', fontSize: 10, color: s.color, fontWeight: 700 } }, '✓') : null
                ),
                h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } },
                  done ? (v.length > 120 ? v.slice(0, 120) + '...' : v) : s.blurb
                )
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print my PATH',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '🖨 Print my PATH')
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        var activeKey = d.activeKey || 'northStar';
        var activeIdx = Math.max(0, STAGES.findIndex(function(s) { return s.key === activeKey; }));
        var active = STAGES[activeIdx];
        var resp = (d.responses || {})[active.key] || '';

        function setActiveResponse(text) {
          var responses = Object.assign({}, (d.responses || {}));
          responses[active.key] = text;
          setPATH({ responses: responses });
        }
        function goPrev() {
          if (activeIdx > 0) setPATH({ activeKey: STAGES[activeIdx - 1].key });
        }
        function goNext() {
          if (activeIdx < STAGES.length - 1) setPATH({ activeKey: STAGES[activeIdx + 1].key });
        }

        return h('div', null,
          h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('label', { htmlFor: 'path-name', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Whose PATH is this?'),
            h('input', { id: 'path-name', type: 'text', value: d.name || '',
              placeholder: 'Your name',
              onChange: function(e) { setPATH({ name: e.target.value }); },
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
          ),

          h('div', { role: 'tablist', 'aria-label': 'PATH stages', style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 } },
            STAGES.map(function(s, i) {
              var act = s.key === activeKey;
              var done = ((d.responses || {})[s.key] || '').trim().length > 0;
              return h('button', { key: s.key, role: 'tab', 'aria-selected': act,
                onClick: function() { setPATH({ activeKey: s.key }); },
                style: { padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (act ? s.color : '#334155'), background: act ? s.color + '22' : '#1e293b', color: act ? s.color : (done ? '#cbd5e1' : '#64748b'), cursor: 'pointer', fontSize: 11, fontWeight: 700 } },
                (done ? '✓' : (i + 1)) + ' · ' + s.label
              );
            })
          ),

          h('div', { style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, ' + active.color + '14 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid ' + active.color + '66', borderLeft: '4px solid ' + active.color, marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 32 } }, active.icon),
              h('div', null,
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Stage ' + (activeIdx + 1) + ' of ' + STAGES.length),
                h('h3', { style: { margin: 0, color: active.color, fontSize: 20, fontWeight: 900 } }, active.label)
              )
            ),
            h('p', { style: { margin: '0 0 12px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } }, active.blurb),

            h('label', { htmlFor: 'path-resp', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, active.label),
            h('textarea', { id: 'path-resp', value: resp,
              onChange: function(e) { setActiveResponse(e.target.value); },
              placeholder: 'Write here. Take as much room as you need.',
              style: { width: '100%', minHeight: 180, padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          h('div', { style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { onClick: goPrev, disabled: activeIdx === 0, 'aria-label': 'Previous stage',
              style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: activeIdx === 0 ? '#475569' : '#cbd5e1', cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 } }, '← Previous'),
            h('div', { style: { flex: 1 } }),
            h('button', { onClick: function() { goto('overview'); }, 'aria-label': 'Done editing',
              style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✓ Done for now'),
            h('button', { onClick: goNext, disabled: activeIdx === STAGES.length - 1, 'aria-label': 'Next stage',
              style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: activeIdx === STAGES.length - 1 ? '#1e293b' : active.color, color: activeIdx === STAGES.length - 1 ? '#475569' : '#fff', cursor: activeIdx === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13 } }, 'Next →')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(129,140,248,0.10)', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('overview'); }, 'aria-label': 'Back to overview',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'path-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#path-print-region, #path-print-region * { visibility: visible !important; } ' +
              '#path-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #4f46e5' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'PATH · Planning Alternative Tomorrows with Hope'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, d.name ? (d.name + '’s PATH') : 'My PATH'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            STAGES.map(function(s, i) {
              var v = (d.responses || {})[s.key] || '';
              return h('div', { key: s.key, style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, marginBottom: 8, background: s.color, color: '#fff' } },
                  h('span', { style: { fontSize: 18 } }, s.icon),
                  h('span', { style: { fontSize: 11, fontWeight: 700, opacity: 0.85 } }, 'Stage ' + (i + 1) + ' ·'),
                  h('span', { style: { fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label)
                ),
                v ? h('p', { style: { margin: '0 8px', color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, v)
                  : h('div', { style: { margin: '0 8px', padding: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(not filled in)')
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('path', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'What PATH is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'PATH (Planning Alternative Tomorrows with Hope) is a futures-planning visual that helps a person imagine a hopeful, long-horizon future and then plan backward through eight stages to first steps they can take in the next two weeks. The point is to make the dream concrete enough to move toward, while still letting it be a dream.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'PATH is filled out in reverse: start with the North Star, then the Positive Possible (one year), then where you are now, then who is on the journey, then strengths in place and strengths to build, then milestones, then first steps. Working backward keeps the small first steps connected to the bigger vision.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'PATH and MAPS'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'PATH and MAPS were developed together at Inclusion Press by Jack Pearpoint, John O\'Brien, and Marsha Forest. They are often paired: MAPS gives a picture of who the person is right now (story, gifts, needs); PATH points them toward where they are going. You can do them in either order, but many facilitators use MAPS first, PATH second.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for PATH or to learn more.'),
            sourceCard('Pearpoint, J., O\'Brien, J., and Forest, M. (1993)', 'PATH: A Workbook for Planning Possible Positive Futures', 'The original PATH workbook from Inclusion Press. Step-by-step facilitator guidance.', null),
            sourceCard('Inclusion Press (PATH section)', 'inclusion.com/path', 'Books, training, and facilitator network. Templates and translated materials.', 'https://inclusion.com/path/'),
            sourceCard('Falvey, M. A., Forest, M., Pearpoint, J., and Rosenberg, R. L. (1997)', 'All My Life\'s a Circle: Using the Tools - Circles, MAPS & PATHS', 'Accessible practitioner guide showing PATH alongside MAPS and Circles of Support in school and family contexts.', null),
            sourceCard('Wells, J. and Sheehey, P. H. (2012)', 'Person-Centered Planning: Strategies to Encourage Participation and Facilitate Communication', 'Teaching Exceptional Children article on PATH and MAPS in special education. Cites the evidence base for student-led PCP.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'PATH puts a lot of weight on individual hope and effort. A student in a system that does not invest in them can do a beautiful PATH and still not be able to take the first steps. The system carries part of the work.'),
              h('li', null, 'The "Positive Possible" frame can land hard for students who have learned that hope is dangerous. Some students need permission to NOT plan a year out yet.'),
              h('li', null, 'Like MAPS, PATH works best with allies present, not as a worksheet. The solo version (this tool) is preparation for, not a substitute for, a circle.'),
              h('li', null, 'PATH was developed in the context of disability inclusion, where hope was specifically being denied. Used in other contexts it can drift toward a generic "vision board" exercise; the original was sharper.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'PATH works well at transition points (entering a new school, leaving high school, a major life change). For an in-person PATH meeting, plan 90-120 minutes; bring a large piece of paper and markers if you want to make the visual; have a facilitator who is not the student\'s direct teacher. Inclusion Press offers facilitator training.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e0e7ff', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e0e7ff', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderOverview();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'PATH' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
