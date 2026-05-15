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

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('maps'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-maps')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-maps';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

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
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.maps || defaultState();
      function setMAPS(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.maps) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.responses || patch.name !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { maps: next });
        });
      }
      var view = d.view || 'overview';
      function goto(v) { setMAPS({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      // ── Header ──
      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 22, fontWeight: 900 } }, '🗺️ MAPS'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Making Action Plans: a person-centered planning visual.')
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
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'MAPS sections',
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
          'Your MAP is yours. You decide who sees it. If a prompt brings up something heavy, that is information; bring it to a counselor or trusted adult. Crisis Text Line: text HOME to 741741.'
        );
      }

      function completedCount() {
        var n = 0;
        for (var i = 0; i < PROMPTS.length; i++) {
          var v = (d.responses || {})[PROMPTS[i].key];
          if (v && v.trim()) n++;
        }
        return n;
      }

      // ═══════════════════════════════════════════════════════════
      // OVERVIEW — show all 8 prompts as cards with progress
      // ═══════════════════════════════════════════════════════════
      function renderOverview() {
        var pct = Math.round((completedCount() / PROMPTS.length) * 100);
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(129,140,248,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e0e7ff' } }, d.name ? (d.name + '’s MAP') : 'My MAP'),
                h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } },
                  completedCount() + ' of ' + PROMPTS.length + ' sections filled',
                  d.lastUpdated ? ' · updated ' + d.lastUpdated : ''
                )
              ),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Work on my MAP',
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #818cf8', background: 'rgba(129,140,248,0.18)', color: '#e0e7ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✏️ Work on it')
            ),
            // Progress bar
            h('div', { style: { marginTop: 12, height: 8, borderRadius: 4, background: '#1e293b', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'MAP completion' },
              h('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #4f46e5, #818cf8)', transition: 'width 240ms ease' } })
            )
          ),

          // Cards for each prompt
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            PROMPTS.map(function(p) {
              var v = (d.responses || {})[p.key] || '';
              var done = v && v.trim();
              return h('button', { key: p.key,
                onClick: function() { setMAPS({ activeKey: p.key, view: 'edit' }); },
                'aria-label': p.label + (done ? ' (filled in)' : ' (empty)'),
                style: { textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid ' + (done ? p.color + 'aa' : '#334155'), borderLeft: '4px solid ' + p.color, background: done ? p.color + '14' : '#0f172a', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 22 } }, p.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, color: done ? p.color : '#e0e7ff' } }, p.label),
                  done ? h('span', { style: { marginLeft: 'auto', fontSize: 10, color: p.color, fontWeight: 700 } }, '✓ filled') : null
                ),
                h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } },
                  done ? (v.length > 120 ? v.slice(0, 120) + '...' : v) : p.blurb
                )
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print my MAP',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '🖨 Print my MAP')
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT — one prompt at a time with side nav
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        var activeKey = d.activeKey || 'story';
        var activeIdx = Math.max(0, PROMPTS.findIndex(function(p) { return p.key === activeKey; }));
        var active = PROMPTS[activeIdx];
        var resp = (d.responses || {})[active.key] || '';

        function setActiveResponse(text) {
          var responses = Object.assign({}, (d.responses || {}));
          responses[active.key] = text;
          setMAPS({ responses: responses });
        }
        function goPrev() {
          if (activeIdx > 0) setMAPS({ activeKey: PROMPTS[activeIdx - 1].key });
        }
        function goNext() {
          if (activeIdx < PROMPTS.length - 1) setMAPS({ activeKey: PROMPTS[activeIdx + 1].key });
        }

        return h('div', null,
          // Name field once at top
          h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('label', { htmlFor: 'maps-name', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Whose MAP is this?'),
            h('input', { id: 'maps-name', type: 'text', value: d.name || '',
              placeholder: 'Your name',
              onChange: function(e) { setMAPS({ name: e.target.value }); },
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
          ),

          // Step navigator
          h('div', { role: 'tablist', 'aria-label': 'MAPS prompts', style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 } },
            PROMPTS.map(function(p, i) {
              var act = p.key === activeKey;
              var done = ((d.responses || {})[p.key] || '').trim().length > 0;
              return h('button', { key: p.key, role: 'tab', 'aria-selected': act,
                onClick: function() { setMAPS({ activeKey: p.key }); },
                style: { padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (act ? p.color : '#334155'), background: act ? p.color + '22' : '#1e293b', color: act ? p.color : (done ? '#cbd5e1' : '#64748b'), cursor: 'pointer', fontSize: 11, fontWeight: 700 } },
                (done ? '✓' : (i + 1)) + ' · ' + p.label
              );
            })
          ),

          // Active prompt
          h('div', { style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, ' + active.color + '14 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid ' + active.color + '66', borderLeft: '4px solid ' + active.color, marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 32 } }, active.icon),
              h('h3', { style: { margin: 0, color: active.color, fontSize: 20, fontWeight: 900 } }, active.label)
            ),
            h('p', { style: { margin: '0 0 12px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } }, active.blurb),

            h('label', { htmlFor: 'maps-resp', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, active.label),
            h('textarea', { id: 'maps-resp', value: resp,
              onChange: function(e) { setActiveResponse(e.target.value); },
              placeholder: 'Write here. Take as much room as you need.',
              style: { width: '100%', minHeight: 180, padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          // Step prev / next
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { onClick: goPrev, disabled: activeIdx === 0, 'aria-label': 'Previous prompt',
              style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: activeIdx === 0 ? '#475569' : '#cbd5e1', cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 } }, '← Previous'),
            h('div', { style: { flex: 1 } }),
            h('button', { onClick: function() { goto('overview'); }, 'aria-label': 'Done editing',
              style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✓ Done for now'),
            h('button', { onClick: goNext, disabled: activeIdx === PROMPTS.length - 1, 'aria-label': 'Next prompt',
              style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: activeIdx === PROMPTS.length - 1 ? '#1e293b' : active.color, color: activeIdx === PROMPTS.length - 1 ? '#475569' : '#fff', cursor: activeIdx === PROMPTS.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13 } }, 'Next →')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — full MAP, printable
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
            id: 'maps-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#maps-print-region, #maps-print-region * { visibility: visible !important; } ' +
              '#maps-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            // Header
            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #4f46e5' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'MAPS · Making Action Plans'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, d.name ? (d.name + '’s MAP') : 'My MAP'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Each prompt section
            PROMPTS.map(function(p) {
              var v = (d.responses || {})[p.key] || '';
              return h('div', { key: p.key, style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, marginBottom: 8, background: p.color, color: '#fff' } },
                  h('span', { style: { fontSize: 18 } }, p.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, p.label)
                ),
                v ? h('p', { style: { margin: '0 8px', color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, v)
                  : h('div', { style: { margin: '0 8px', padding: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(not filled in)')
              );
            }),

            // Footer
            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('maps', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'What MAPS is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'MAPS (Making Action Plans, originally "McGill Action Planning System") is a person-centered planning visual that walks a person and their allies through eight prompts in sequence. The point is not to fill out a form. The point is to gather a circle of people who know and care about you, and to think together about where you are coming from, where you want to go, and what it would take to get there.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'You can do a MAP alone, but the tradition is to do it with a few trusted people present: a facilitator, a graphic recorder (someone who draws/writes responses on a large piece of paper), and the allies you choose. This digital version supports both solo work and prep for an in-person MAP meeting.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'Where MAPS comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'MAPS was developed in the 1980s and 1990s by Jack Pearpoint, John O\'Brien, and Marsha Forest at Inclusion Press in Toronto. It grew out of the inclusion movement (closing institutions, integrating schools, building community for people with disabilities) and was designed as a visual, relational alternative to deficit-focused clinical assessment. It is now used worldwide in schools, transition planning, supported-living services, and family planning. Marsha Forest passed away in 2000; the Marsha Forest Centre continues the work.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for MAPS or to learn more.'),
            sourceCard('Inclusion Press (Marsha Forest Centre)', 'inclusion.com', 'The original source. Workbooks, training, MAPS facilitator network. Materials are translated into many languages.', 'https://inclusion.com/'),
            sourceCard('Pearpoint, J., O\'Brien, J., and Forest, M. (1993)', 'PATH: A Workbook for Planning Possible Positive Futures', 'Companion volume that includes MAPS practice; the foundational text for both tools.', null),
            sourceCard('Falvey, M. A., Forest, M., Pearpoint, J., and Rosenberg, R. L. (1997)', 'All My Life\'s a Circle: Using the Tools - Circles, MAPS & PATHS', 'Accessible practitioner guide showing MAPS and PATHS in school and family contexts.', null),
            sourceCard('O\'Brien, J. and Mount, B. (2015)', 'Pathfinders: People with Developmental Disabilities and Their Allies Building Communities That Work Better for Everybody', 'Later reflection on the person-centered planning movement and its limits when uncoupled from systems change.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A MAP is only useful if the people in the room actually follow through. John O\'Brien himself has written about how person-centered plans can become "planning theater" if not paired with real resource shifts.'),
              h('li', null, 'The Dream / Nightmare frame can land hard for students with significant trauma or for students who have been told their whole lives that their dreams are unrealistic. Pace it.'),
              h('li', null, 'MAPS works best with a circle of allies, not as an individual worksheet. The solo version (this tool) is preparation for, not a substitute for, a relational MAP.'),
              h('li', null, 'The action plan is the part that gets skipped most often, because it is the part that requires actual change from the system around the person. Watch for that.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'MAPS works well as transition planning (8th to 9th, HS to post-secondary), at the start of an IEP cycle, or for any student who needs a circle of allies to plan with. A facilitator who is NOT the student\'s primary teacher generally works best, to avoid the "the teacher wants me to say X" dynamic. Inclusion Press offers facilitator training.'
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

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'MAPS' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
