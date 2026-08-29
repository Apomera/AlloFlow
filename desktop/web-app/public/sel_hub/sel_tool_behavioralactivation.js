// ═══════════════════════════════════════════════════════════════
// sel_tool_behavioralactivation.js — Behavioral Activation
// Behavioral Activation (BA) is one of the most-evidenced
// treatments for depression (Lewinsohn, Jacobson, Martell). The
// core observation: when mood drops, activity drops; when activity
// drops, mood drops further. BA interrupts that loop by scheduling
// activities deliberately, rated for MASTERY (felt competent) and
// PLEASURE (enjoyed). The student learns which activities lift
// mood and which deplete it.
// Registered tool ID: "behavioralActivation"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('behavioralActivation'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-ba')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-ba';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Starter list of activity categories for the planning view.
  var ACTIVITY_STARTERS = {
    movement: [
      'Walk for 15 minutes',
      'Stretch / yoga',
      'Bike ride',
      'Dance to one song',
      'Play a sport with someone',
      'Swim',
      'Hike a trail'
    ],
    connection: [
      'Text a specific friend',
      'Call a family member',
      'Eat lunch with someone (not phone)',
      'Hug or pet an animal',
      'Help someone with something',
      'Have a real conversation, not just emoji'
    ],
    accomplishment: [
      'Finish one chore I have been avoiding',
      'Do 10 minutes of homework I dread',
      'Make my bed',
      'Tidy a small space',
      'Take a shower',
      'Eat a real meal'
    ],
    pleasure: [
      'Listen to a song I love',
      'Watch one episode of a comfort show',
      'Draw, paint, or doodle',
      'Cook or bake something',
      'Read for 20 minutes',
      'Play a game I enjoy',
      'Sit outside without a screen'
    ],
    meaning: [
      'Spend time with a pet',
      'Pray or sit in silence',
      'Volunteer or help someone',
      'Practice an instrument',
      'Write in a journal',
      'Be in nature'
    ]
  };
  var CAT_LABELS = {
    movement: { label: 'Movement', icon: '🏃', color: '#22c55e' },
    connection: { label: 'Connection', icon: '🤝', color: '#f59e0b' },
    accomplishment: { label: 'Accomplishment', icon: '✓', color: '#3b82f6' },
    pleasure: { label: 'Pleasure', icon: '🌟', color: '#a855f7' },
    meaning: { label: 'Meaning', icon: '🌱', color: '#16a34a' }
  };

  // Energy-matched starters keep the first choice small enough to be usable.
  var ENERGY_LEVELS = [
    { id: 'tiny', label: 'Very low', cue: 'About 1 minute', icon: '·', color: '#38bdf8' },
    { id: 'low', label: 'Low', cue: 'About 5 minutes', icon: '◔', color: '#22c55e' },
    { id: 'some', label: 'Some energy', cue: '10–15 minutes', icon: '◑', color: '#f59e0b' },
    { id: 'ready', label: 'More available', cue: 'A fuller step', icon: '●', color: '#a855f7' }
  ];
  var ENERGY_STARTERS = {
    tiny: [
      { label: 'Stand and roll my shoulders once', category: 'movement' },
      { label: 'Send one “thinking of you” text', category: 'connection' },
      { label: 'Put away one item', category: 'accomplishment' },
      { label: 'Listen to one favorite song', category: 'pleasure' },
      { label: 'Notice three things outside a window', category: 'meaning' }
    ],
    low: [
      { label: 'Stretch gently for 5 minutes', category: 'movement' },
      { label: 'Check in with one safe person', category: 'connection' },
      { label: 'Tidy one small surface', category: 'accomplishment' },
      { label: 'Sit outside for 5 minutes', category: 'pleasure' },
      { label: 'Write one honest journal sentence', category: 'meaning' }
    ],
    some: [
      { label: 'Walk for 10 minutes', category: 'movement' },
      { label: 'Call or sit with someone I trust', category: 'connection' },
      { label: 'Do 10 minutes of one avoided task', category: 'accomplishment' },
      { label: 'Draw, read, or play for 15 minutes', category: 'pleasure' },
      { label: 'Spend 10 minutes in nature', category: 'meaning' }
    ],
    ready: [
      { label: 'Take a longer walk or bike ride', category: 'movement' },
      { label: 'Share a meal or activity with someone', category: 'connection' },
      { label: 'Finish one clearly defined task', category: 'accomplishment' },
      { label: 'Cook, make, or create something', category: 'pleasure' },
      { label: 'Help with something that matters to me', category: 'meaning' }
    ]
  };

  function defaultState() {
    return {
      view: 'home',
      plannedActivities: [],   // [{id, label, category, day, done, mastery, pleasure, moodBefore, moodAfter}]
      energyLevel: null,
      focusActivityId: null,
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function uid() { return 'a' + Math.random().toString(36).slice(2, 9); }

  window.SelHub.registerTool('behavioralActivation', {
    icon: '📅',
    label: 'Behavioral Activation',
    desc: 'Plan small activities, do them, rate them for mastery (felt competent) and pleasure (enjoyed). Mood follows action more than action follows mood. One of the most-evidenced treatments for low mood and depression. From Lewinsohn, Jacobson, and Martell.',
    color: 'emerald',
    category: 'self-regulation',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _beaT = (ctx && ctx.theme) || {};
      var _beaHC = !!_beaT.isContrast, _beaL = !_beaHC && !_beaT.isDark;
      var _bea_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _bea_BGH = {'#0f172a':'#000000','#10b981':'#000000','#b45309':'#000000','#a855f7':'#000000','#1e293b':'#000000','#fff':'#000000'};
      var _bea_FGL = {'#cbd5e1':'#334155','#86efac':'#166534','#94a3b8':'#64748b','#a7f3d0':'#047857','#fde68a':'#92400e','#e9d5ff':'#581c87','#e2e8f0':'#1e293b','#fecaca':'#b91c1c','#bfdbfe':'#1e40af','#fcd34d':'#78350f'}, _bea_FGH = {'#a855f7':'#ffff00','#cbd5e1':'#ffff00','#86efac':'#ffff00','#94a3b8':'#ffff00','#a7f3d0':'#ffff00','#fff':'#ffff00','#fde68a':'#ffff00','#e9d5ff':'#ffff00','#64748b':'#ffff00','#e2e8f0':'#ffff00','#bbf7d0':'#ffff00','#22c55e':'#ffff00','#fecaca':'#ffff00','#ef4444':'#ffff00','#bfdbfe':'#ffff00','#0f172a':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00'};
      var _bea_BGD = {'#10b981':'#047857'}, _bea_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _bea_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#10b981':'#ffff00','#f59e0b':'#ffff00','#a855f7':'#ffff00','#475569':'#ffff00','#22c55e':'#ffff00','#ef4444':'#ffff00','#3b82f6':'#ffff00','#cbd5e1':'#ffff00','#059669':'#ffff00'};
      var _beaBg = function(h){ return _beaHC ? (_bea_BGH[h]||h) : (_beaL ? (_bea_BGL[h]||h) : (_bea_BGD[h]||h)); };
      var _beaFg = function(h){ return _beaHC ? (_bea_FGH[h]||h) : (_beaL ? (_bea_FGL[h]||h) : h); };
      var _beaBd = function(h){ return _beaHC ? (_bea_BDH[h]||h) : (_beaL ? (_bea_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.behavioralActivation || defaultState();
      function setBA(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.behavioralActivation) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { behavioralActivation: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setBA({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _beaFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _beaFg('#86efac'), fontSize: 22, fontWeight: 900 } }, '📅 Behavioral Activation'),
            h('div', { style: { fontSize: 12, color: _beaFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'Action first; mood follows.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '📅' },
          { id: 'plan', label: 'Plan', icon: '➕' },
          { id: 'log', label: 'Log + rate', icon: '⭐' },
          { id: 'patterns', label: 'Patterns', icon: '📈' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Behavioral Activation sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? _beaBg('#10b981') : '#334155'),
                background: active ? 'rgba(16,185,129,0.18)' : _beaBg('#1e293b'),
                color: active ? _beaFg('#a7f3d0') : _beaFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: _beaFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Behavioral Activation helps with low mood and mild-to-moderate depression. For severe depression, suicidal thoughts, or trauma, this is NOT enough on its own; bring it to a counselor, therapist, or call 988 (Suicide and Crisis Lifeline). Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        var activities = d.plannedActivities || [];
        var planned = activities.filter(function(a) { return !a.done; }).length;
        var doneCount = activities.filter(function(a) { return a.done; }).length;
        var focused = activities.filter(function(a) { return !a.done && a.id === d.focusActivityId; })[0] || null;
        var focusedCat = focused ? (CAT_LABELS[focused.category] || { label: focused.category, icon: '◆', color: '#64748b' }) : null;
        var focusedEnergy = focused ? ENERGY_LEVELS.filter(function(item) { return item.id === focused.energy; })[0] : null;

        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(16,185,129,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _beaFg('#a7f3d0'), marginBottom: 4 } }, 'Mood follows action.'),
            h('p', { style: { margin: 0, color: _beaFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.65 } },
              'When mood is low, the body does not want to do anything, and not doing anything makes mood drop further. That loop is what Behavioral Activation interrupts. The move: do small activities you do not feel like doing, rate them, and learn what actually lifts you.'
            )
          ),

          // Stats
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 } },
            statCard('Planned', planned, '#3b82f6'),
            statCard('Done', doneCount, _beaFg('#22c55e')),
            statCard('Total tracked', activities.length, '#a855f7')
          ),

          // One clear next action
          h('div', { style: { padding: 14, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #10b981', marginBottom: 10 } },
            h('div', { style: { fontSize: 11, color: _beaFg('#94a3b8'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 } }, focused ? 'Your next doable action' : 'Find one doable next action'),
            focused ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, padding: 10, borderRadius: 9, background: _beaBg('#1e293b'), borderLeft: '3px solid ' + focusedCat.color, marginBottom: 10 } },
              h('span', { 'aria-hidden': true, style: { fontSize: 20 } }, focusedCat.icon),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { color: _beaFg('#e2e8f0'), fontWeight: 800, fontSize: 14, lineHeight: 1.35 } }, focused.label),
                h('div', { style: { color: _beaFg('#94a3b8'), fontSize: 10, marginTop: 2 } }, focusedCat.label + (focusedEnergy ? ' · ' + focusedEnergy.label + ' match' : ''))
              )
            ) : h('div', { style: { fontSize: 11.5, color: _beaFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Check your available energy first. The tool will narrow the library to a few realistic options.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: function() { goto('plan'); }, 'aria-label': 'Plan activities',
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: _beaBg('#10b981'), color: _beaFg('#fff'), fontWeight: 800, fontSize: 13 } }, focused ? 'Open action →' : 'Check energy →')
            )
          ),

          activities.length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _beaFg('#fde68a'), marginBottom: 8 } }, '⭐ Log what you have done and how it went'),
            h('button', { onClick: function() { goto('log'); }, 'aria-label': 'Rate completed activities',
              style: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: _beaBg('#b45309'), color: _beaFg('#fff'), fontWeight: 800, fontSize: 13 } }, '→ Log + rate')
          ) : null,

          doneCount >= 3 ? h('div', { style: { padding: 14, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _beaFg('#e9d5ff'), marginBottom: 8 } }, '📈 You have enough data to see patterns'),
            h('button', { onClick: function() { goto('patterns'); }, 'aria-label': 'See patterns',
              style: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: _beaBg('#a855f7'), color: _beaFg('#fff'), fontWeight: 800, fontSize: 13 } }, '→ See patterns')
          ) : null,

          softPointer()
        );
      }

      function statCard(label, value, color) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color } },
          h('div', { style: { fontSize: 10, color: _beaFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
          h('div', { style: { fontSize: 22, color: _beaFg(color), fontWeight: 900 } }, value)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PLAN — add new activities
      // ═══════════════════════════════════════════════════════════
      function renderPlan() {
        function addActivity(label, category, energy) {
          if (!label || !label.trim()) return;
          var entry = { id: uid(), label: label.trim(), category: category, day: todayISO(), done: false, energy: energy || d.energyLevel || null };
          setBA({ plannedActivities: (d.plannedActivities || []).concat([entry]), focusActivityId: entry.id });
          if (announceToSR) announceToSR('Activity added and set as your next action.');
        }
        function removeActivity(id) {
          var patch = { plannedActivities: (d.plannedActivities || []).filter(function(a) { return a.id !== id; }) };
          if (d.focusActivityId === id) patch.focusActivityId = null;
          setBA(patch);
          if (announceToSR) announceToSR('Activity removed.');
        }

        var planned = (d.plannedActivities || []).filter(function(a) { return !a.done; });
        var energy = ENERGY_LEVELS.filter(function(item) { return item.id === d.energyLevel; })[0] || null;
        var focused = planned.filter(function(a) { return a.id === d.focusActivityId; })[0] || null;
        var focusCat = focused ? (CAT_LABELS[focused.category] || { label: focused.category, icon: '◆', color: '#64748b' }) : null;
        var focusEnergy = focused ? ENERGY_LEVELS.filter(function(item) { return item.id === focused.energy; })[0] : null;

        function finishFocused() {
          if (!focused) return;
          var nx = (d.plannedActivities || []).map(function(a) { return a.id === focused.id ? Object.assign({}, a, { done: true }) : a; });
          setBA({ plannedActivities: nx, focusActivityId: null, view: 'log' });
          if (announceToSR) announceToSR('Action marked done. Recheck and rate how it went.');
        }

        function renderEnergyPath() {
          var steps = [
            { n: '1', label: 'Notice', value: energy ? energy.label : 'Check available energy', done: !!energy },
            { n: '2', label: 'Choose', value: focused ? focused.label : 'Pick one small action', done: !!focused },
            { n: '3', label: 'Recheck', value: focused ? 'Notice what changed afterward' : 'After the action', done: false }
          ];
          var matches = energy ? (ENERGY_STARTERS[energy.id] || []) : [];
          return h('div', { style: { marginBottom: 14 } },
            h('section', { 'aria-labelledby': 'ba-loop-title', style: { padding: 14, borderRadius: 14, background: _beaBg('#0f172a'), border: '1px solid ' + _beaBd('#334155'), marginBottom: 10 } },
              h('div', { id: 'ba-loop-title', style: { color: _beaFg('#94a3b8'), fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 9 } }, 'One-action loop'),
              h('div', { role: 'list', 'aria-label': 'Behavioral activation action loop', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 7 } },
                steps.map(function(step) {
                  return h('div', { key: step.n, role: 'listitem', style: { minHeight: 76, padding: 9, borderRadius: 9, background: step.done ? 'rgba(16,185,129,0.12)' : _beaBg('#1e293b'), border: '1px solid ' + (step.done ? (_beaHC ? '#ffff00' : '#10b981') : _beaBd('#334155')) } },
                    h('div', { style: { color: step.done ? _beaFg('#a7f3d0') : _beaFg('#94a3b8'), fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 5 } }, (step.done ? '✓ ' : step.n + '. ') + step.label),
                    h('div', { style: { color: _beaFg('#e2e8f0'), fontSize: 12, fontWeight: 750, lineHeight: 1.35 } }, step.value)
                  );
                })
              )
            ),
            h('section', { 'aria-labelledby': 'ba-energy-title', style: { padding: 14, borderRadius: 12, background: 'rgba(56,189,248,0.07)', border: '1px solid ' + (_beaHC ? '#ffff00' : 'rgba(56,189,248,0.32)'), marginBottom: 10 } },
              h('div', { id: 'ba-energy-title', style: { color: _beaFg('#bfdbfe'), fontSize: 14, fontWeight: 900, marginBottom: 3 } }, '1. What energy is actually available?'),
              h('div', { style: { color: _beaFg('#94a3b8'), fontSize: 11, lineHeight: 1.5, marginBottom: 9 } }, 'Choose the closest fit right now. This is a capacity check, not a score.'),
              h('div', { role: 'group', 'aria-label': 'Available energy', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 7 } },
                ENERGY_LEVELS.map(function(item) {
                  var selected = d.energyLevel === item.id;
                  return h('button', { key: item.id, type: 'button', onClick: function() { setBA({ energyLevel: item.id }); if (announceToSR) announceToSR(item.label + ' energy selected.'); }, 'aria-pressed': selected,
                    style: { minHeight: 68, padding: 8, borderRadius: 9, cursor: 'pointer', textAlign: 'left', background: selected ? (_beaHC ? '#000' : item.color + '22') : _beaBg('#1e293b'), border: '2px solid ' + (selected ? (_beaHC ? '#ffff00' : item.color) : _beaBd('#334155')), color: _beaFg('#e2e8f0') } },
                    h('div', { style: { fontSize: 12, fontWeight: 900 } }, h('span', { 'aria-hidden': true, style: { color: selected ? (_beaHC ? '#ffff00' : item.color) : _beaFg('#94a3b8'), fontSize: 16, marginRight: 5 } }, item.icon), item.label),
                    h('div', { style: { color: _beaFg('#94a3b8'), fontSize: 10, marginTop: 4 } }, item.cue)
                  );
                })
              )
            ),
            energy && !focused ? h('section', { 'aria-labelledby': 'ba-match-title', style: { padding: 14, borderRadius: 12, background: _beaBg('#0f172a'), borderLeft: '3px solid ' + energy.color, borderTop: '1px solid ' + _beaBd('#334155'), borderRight: '1px solid ' + _beaBd('#334155'), borderBottom: '1px solid ' + _beaBd('#334155'), marginBottom: 10 } },
              h('div', { id: 'ba-match-title', style: { color: _beaFg('#e2e8f0'), fontSize: 14, fontWeight: 900, marginBottom: 3 } }, '2. Choose one ' + energy.cue.toLowerCase() + ' action'),
              h('div', { style: { color: _beaFg('#94a3b8'), fontSize: 11, marginBottom: 9 } }, 'One matched idea per category. Choose only one for now.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 7 } }, matches.map(function(s) {
                var cat = CAT_LABELS[s.category];
                return h('button', { key: s.category, type: 'button', onClick: function() { addActivity(s.label, s.category, energy.id); }, 'aria-label': 'Choose ' + s.label,
                  style: { minHeight: 64, padding: 9, borderRadius: 9, cursor: 'pointer', textAlign: 'left', background: _beaBg('#1e293b'), borderLeft: '3px solid ' + cat.color, borderTop: '1px solid ' + _beaBd('#334155'), borderRight: '1px solid ' + _beaBd('#334155'), borderBottom: '1px solid ' + _beaBd('#334155'), color: _beaFg('#e2e8f0') } },
                  h('div', { style: { color: _beaFg(cat.color), fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 } }, cat.icon + ' ' + cat.label),
                  h('div', { style: { fontSize: 12, fontWeight: 750, lineHeight: 1.35 } }, s.label)
                );
              }))
            ) : null,
            focused ? h('section', { 'aria-labelledby': 'ba-next-title', style: { padding: 15, borderRadius: 13, background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.08))', border: '2px solid ' + (_beaHC ? '#ffff00' : '#10b981') } },
              h('div', { id: 'ba-next-title', style: { color: _beaFg('#a7f3d0'), fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 } }, '2. Your next action'),
              h('div', { style: { display: 'flex', gap: 9, alignItems: 'center', marginBottom: 11 } }, h('span', { 'aria-hidden': true, style: { fontSize: 25 } }, focusCat.icon), h('div', null,
                h('div', { style: { color: _beaFg('#e2e8f0'), fontSize: 17, fontWeight: 900, lineHeight: 1.3 } }, focused.label),
                h('div', { style: { color: _beaFg('#94a3b8'), fontSize: 10, marginTop: 3 } }, focusCat.label + (focusEnergy ? ' · ' + focusEnergy.label + ' match' : ''))
              )),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
                h('button', { type: 'button', onClick: finishFocused, style: { padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: _beaBg('#10b981'), color: _beaFg('#fff'), fontSize: 12, fontWeight: 900 } }, 'I did this — recheck →'),
                h('button', { type: 'button', onClick: function() { setBA({ focusActivityId: null }); }, style: { padding: '9px 12px', borderRadius: 8, border: '1px solid ' + _beaBd('#475569'), cursor: 'pointer', background: 'transparent', color: _beaFg('#cbd5e1'), fontSize: 11, fontWeight: 750 } }, 'Choose another')
              )
            ) : null
          );
        }

        return h('div', null,
          renderEnergyPath(),
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.08)', borderTop: '1px solid rgba(16,185,129,0.3)', borderRight: '1px solid rgba(16,185,129,0.3)', borderBottom: '1px solid rgba(16,185,129,0.3)', borderLeft: '3px solid #10b981', marginBottom: 14, fontSize: 12.5, color: _beaFg('#a7f3d0'), lineHeight: 1.65 } },
            h('strong', null, 'Build variety over time. '),
            'One action is enough for this check-in. When you want more options, open a category in the full library below.'
          ),

          // Currently planned
          planned.length > 0 ? h('details', { style: { padding: 12, borderRadius: 10, background: _beaBg('#0f172a'), border: '1px solid ' + _beaBd('#334155'), marginBottom: 14 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: _beaFg('#cbd5e1'), fontWeight: 850, marginBottom: 8 } }, 'Saved plan (' + planned.length + ')'),
            planned.map(function(a) {
              var cat = CAT_LABELS[a.category] || { label: a.category, icon: '◆', color: _beaFg('#64748b') };
              return h('div', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, background: _beaBg('#1e293b'), marginBottom: 4, borderLeft: '3px solid ' + cat.color } },
                h('span', { style: { fontSize: 16 } }, cat.icon),
                h('span', { style: { flex: 1, fontSize: 13, color: _beaFg('#e2e8f0') } }, a.label),
                h('button', { onClick: function() { setBA({ focusActivityId: a.id }); if (announceToSR) announceToSR('Next action selected.'); }, 'aria-label': 'Set ' + a.label + ' as next action', 'aria-pressed': d.focusActivityId === a.id,
                  style: { background: d.focusActivityId === a.id ? 'rgba(16,185,129,0.18)' : 'transparent', border: '1px solid ' + (d.focusActivityId === a.id ? '#10b981' : _beaBd('#475569')), color: d.focusActivityId === a.id ? _beaFg('#a7f3d0') : _beaFg('#94a3b8'), borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontSize: 10, fontWeight: 800 } }, d.focusActivityId === a.id ? 'Next' : 'Make next'),
                h('button', { onClick: function() { removeActivity(a.id); }, 'aria-label': 'Remove ' + a.label,
                  style: { background: 'transparent', border: '1px solid #475569', color: _beaFg('#94a3b8'), borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          // Categories with starters
          Object.keys(ACTIVITY_STARTERS).map(function(catId) {
            var cat = CAT_LABELS[catId];
            var inputId = 'ba-input-' + catId;
            function submit() {
              var el = document.getElementById(inputId);
              if (!el || !el.value.trim()) return;
              addActivity(el.value, catId);
              el.value = '';
            }
            return h('details', { key: catId, style: { padding: 14, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid ' + _beaBd('#334155'), borderRight: '1px solid ' + _beaBd('#334155'), borderBottom: '1px solid ' + _beaBd('#334155'), borderLeft: '3px solid ' + cat.color, marginBottom: 10 } },
              h('summary', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 } },
                h('span', { style: { fontSize: 22 } }, cat.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: _beaFg(cat.color) } }, cat.label),
                h('span', { style: { marginLeft: 'auto', color: _beaFg('#94a3b8'), fontSize: 10 } }, 'Open options')
              ),
              h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
                h('label', { htmlFor: inputId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add ' + cat.label + ' activity'),
                h('input', { id: inputId, type: 'text', placeholder: 'Add a small ' + cat.label.toLowerCase() + ' activity...',
                  onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                  style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _beaBg('#1e293b'), color: _beaFg('#e2e8f0'), fontSize: 13 } }),
                h('button', { onClick: submit, 'aria-label': 'Add activity',
                  style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: cat.color, color: _beaFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
              ),
              h('details', null,
                h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _beaFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                  ACTIVITY_STARTERS[catId].map(function(s, si) {
                    return h('button', { key: si, onClick: function() { addActivity(s, catId); }, 'aria-label': 'Add starter: ' + s,
                      style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + cat.color + '66', background: 'rgba(15,23,42,0.6)', color: _beaFg('#cbd5e1'), cursor: 'pointer', fontSize: 11 } }, '+ ' + s);
                  })
                )
              )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // LOG — mark done + rate mastery/pleasure
      // ═══════════════════════════════════════════════════════════
      function renderLog() {
        var activities = d.plannedActivities || [];
        if (activities.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: _beaBg('#0f172a'), border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '➕'),
              h('div', { style: { color: _beaFg('#cbd5e1'), fontSize: 14, marginBottom: 4 } }, 'No activities planned yet'),
              h('button', { onClick: function() { goto('plan'); }, 'aria-label': 'Plan activities',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.18)', color: _beaFg('#a7f3d0'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Plan activities')
            )
          );
        }

        function update(id, patch) {
          var nx = activities.slice().map(function(a) { return a.id === id ? Object.assign({}, a, patch) : a; });
          setBA({ plannedActivities: nx });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: _beaFg('#fde68a'), lineHeight: 1.65 } },
            h('strong', null, '⭐ Rate each activity after you do it. '),
            'Mastery: 0-10, how competent did doing it make you feel? Pleasure: 0-10, how much did you enjoy it? Both matter; activities can score high on one and low on the other.'
          ),

          activities.map(function(a) {
            var cat = CAT_LABELS[a.category] || { label: a.category, icon: '◆', color: _beaFg('#64748b') };
            return h('div', { key: a.id, style: { padding: 12, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + cat.color, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 18 } }, cat.icon),
                h('span', { style: { flex: 1, minWidth: 180, fontSize: 13, color: _beaFg('#e2e8f0'), fontWeight: 700 } }, a.label),
                h('button', { onClick: function() { update(a.id, { done: !a.done }); }, 'aria-label': a.done ? 'Mark not done' : 'Mark done', 'aria-pressed': a.done,
                  style: { padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (a.done ? _beaFg('#22c55e') : _beaFg('#475569')), background: a.done ? _beaFg('#22c55e') : 'transparent', color: a.done ? '#fff' : _beaFg('#94a3b8'), cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, a.done ? '✓ Done' : '○ Not done')
              ),
              a.done ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                h('div', null,
                  h('label', { htmlFor: 'ba-mastery-' + a.id, style: { display: 'block', fontSize: 10, color: _beaFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Mastery: ' + (a.mastery !== undefined ? a.mastery : 5) + '/10'),
                  h('input', { id: 'ba-mastery-' + a.id, type: 'range', min: 0, max: 10, value: a.mastery !== undefined ? a.mastery : 5,
                    onChange: function(e) { update(a.id, { mastery: parseInt(e.target.value, 10) }); },
                    style: { width: '100%' }, 'aria-label': 'Mastery rating' })
                ),
                h('div', null,
                  h('label', { htmlFor: 'ba-pleasure-' + a.id, style: { display: 'block', fontSize: 10, color: _beaFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Pleasure: ' + (a.pleasure !== undefined ? a.pleasure : 5) + '/10'),
                  h('input', { id: 'ba-pleasure-' + a.id, type: 'range', min: 0, max: 10, value: a.pleasure !== undefined ? a.pleasure : 5,
                    onChange: function(e) { update(a.id, { pleasure: parseInt(e.target.value, 10) }); },
                    style: { width: '100%' }, 'aria-label': 'Pleasure rating' })
                )
              ) : null
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PATTERNS — what is lifting you, what is depleting you
      // ═══════════════════════════════════════════════════════════
      function renderPatterns() {
        var doneActs = (d.plannedActivities || []).filter(function(a) { return a.done && a.mastery !== undefined && a.pleasure !== undefined; });
        if (doneActs.length < 3) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: _beaBg('#0f172a'), border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📈'),
              h('div', { style: { color: _beaFg('#cbd5e1'), fontSize: 14, marginBottom: 4 } }, 'Need more rated activities'),
              h('div', { style: { color: _beaFg('#94a3b8'), fontSize: 12 } }, 'Complete and rate at least 3 activities to see patterns.'),
              h('button', { onClick: function() { goto('log'); }, 'aria-label': 'Log + rate',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: _beaFg('#fde68a'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Log + rate')
            )
          );
        }

        var sortedByMastery = doneActs.slice().sort(function(a, b) { return b.mastery - a.mastery; });
        var sortedByPleasure = doneActs.slice().sort(function(a, b) { return b.pleasure - a.pleasure; });
        var sortedByBoth = doneActs.slice().sort(function(a, b) { return (b.mastery + b.pleasure) - (a.mastery + a.pleasure); });

        // Category averages
        var byCat = {};
        doneActs.forEach(function(a) {
          byCat[a.category] = byCat[a.category] || { mastery: [], pleasure: [] };
          byCat[a.category].mastery.push(a.mastery);
          byCat[a.category].pleasure.push(a.pleasure);
        });

        function avg(arr) { return arr.reduce(function(s, n) { return s + n; }, 0) / arr.length; }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.08)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: _beaFg('#e9d5ff'), lineHeight: 1.65 } },
            h('strong', null, '📈 Pattern reading: '),
            'You have rated ', doneActs.length, ' activities. Below: which lifted you most (high mastery + pleasure), which were depleting, and which categories are doing the work.'
          ),

          // Top combined activities
          h('div', { style: { padding: 12, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: _beaFg('#bbf7d0'), marginBottom: 8 } }, '🌟 Most lifting (mastery + pleasure combined)'),
            sortedByBoth.slice(0, 3).map(function(a, i) {
              var cat = CAT_LABELS[a.category] || { icon: '◆' };
              return h('div', { key: a.id, style: { fontSize: 13, color: _beaFg('#e2e8f0'), marginBottom: 3 } }, cat.icon + ' ' + a.label + ' · ', h('strong', { style: { color: _beaFg('#22c55e') } }, 'M:' + a.mastery + ' P:' + a.pleasure));
            })
          ),

          // Lowest (which to do less of)
          sortedByBoth.length > 3 ? h('div', { style: { padding: 12, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: _beaFg('#fecaca'), marginBottom: 8 } }, '⚠ Least lifting'),
            h('div', { style: { fontSize: 11, color: _beaFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic' } }, 'Activities that scored lowest. Worth asking: are these doing depleting work that you cannot drop, or could you shift?'),
            sortedByBoth.slice(-3).reverse().map(function(a) {
              var cat = CAT_LABELS[a.category] || { icon: '◆' };
              return h('div', { key: a.id, style: { fontSize: 13, color: _beaFg('#e2e8f0'), marginBottom: 3 } }, cat.icon + ' ' + a.label + ' · ', h('strong', { style: { color: _beaFg('#ef4444') } }, 'M:' + a.mastery + ' P:' + a.pleasure));
            })
          ) : null,

          // By category
          h('div', { style: { padding: 12, borderRadius: 10, background: _beaBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #3b82f6', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: _beaFg('#bfdbfe'), marginBottom: 8 } }, '📊 By category average'),
            Object.keys(byCat).map(function(catId) {
              var cat = CAT_LABELS[catId];
              var m = avg(byCat[catId].mastery).toFixed(1);
              var p = avg(byCat[catId].pleasure).toFixed(1);
              return h('div', { key: catId, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' } },
                h('span', { style: { fontSize: 16 } }, cat ? cat.icon : '◆'),
                h('span', { style: { flex: 1, fontSize: 13, color: _beaFg('#e2e8f0'), fontWeight: 700 } }, cat ? cat.label : catId),
                h('span', { style: { fontSize: 12, color: _beaFg('#cbd5e1') } }, 'Mastery: ' + m + '  ·  Pleasure: ' + p),
                h('span', { style: { fontSize: 10, color: _beaFg('#94a3b8'), minWidth: 50, textAlign: 'right' } }, '(' + byCat[catId].mastery.length + ' rated)')
              );
            })
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', fontSize: 12.5, color: _beaFg('#bbf7d0'), lineHeight: 1.65 } },
            h('strong', null, '💡 The BA insight: '),
            'Most people discover they have been doing a lot of one category and very little of another. Often the thin category is the one that would actually lift their mood. The next move: in your next planning round, weight toward the thin categories.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var acts = d.plannedActivities || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(16,185,129,0.10)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _beaFg('#a7f3d0'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: _beaFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: _beaBg('#1e293b'), color: _beaFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'ba-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _beaBg('#fff'), color: _beaFg('#0f172a'), borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#ba-print-region, #ba-print-region * { visibility: visible !important; } ' +
              '#ba-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #059669' } },
              h('div', { style: { fontSize: 10, color: _beaFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Behavioral Activation · Activity Log'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My activities'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _beaFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            Object.keys(CAT_LABELS).map(function(catId) {
              var cat = CAT_LABELS[catId];
              var inCat = acts.filter(function(a) { return a.category === catId; });
              if (inCat.length === 0) return null;
              return h('div', { key: catId, style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, marginBottom: 6, background: cat.color, color: _beaFg('#fff') } },
                  h('span', { style: { fontSize: 16 } }, cat.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, cat.label)
                ),
                h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _beaFg('#0f172a'), fontSize: 12.5, lineHeight: 1.7 } },
                  inCat.map(function(a) {
                    var ratings = (a.done && a.mastery !== undefined) ? '  (Mastery ' + a.mastery + ' / Pleasure ' + (a.pleasure !== undefined ? a.pleasure : '–') + ')' : '';
                    return h('li', { key: a.id }, (a.done ? '✓ ' : '☐ ') + a.label + ratings);
                  })
                )
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _beaFg('#94a3b8'), textAlign: 'center', lineHeight: 1.5 } },
              'Behavioral Activation from Lewinsohn (1974), Jacobson et al. (1996), and Martell et al. (2010). ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('behavioralActivation', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: _beaBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _beaFg('#86efac'), fontSize: 16 } }, 'What Behavioral Activation is'),
            h('p', { style: { margin: '0 0 10px', color: _beaFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'The core observation behind Behavioral Activation: when mood drops, activity drops; when activity drops, mood drops further. The body says "I do not feel like doing anything," but doing nothing is what keeps the mood down. BA interrupts the loop by doing small activities deliberately, BEFORE mood has lifted, and noticing which ones actually help.'
            ),
            h('p', { style: { margin: 0, color: _beaFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'The two ratings BA uses are deliberate. Mastery captures "did I feel competent doing this?" (which lifts mood by reducing learned helplessness). Pleasure captures "did I enjoy this?" (which lifts mood by reintroducing reward). Both matter; activities can score high on one and low on the other. Over a few weeks of tracking, students discover what actually lifts them, which is often surprising.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _beaBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _beaFg('#86efac'), fontSize: 16 } }, 'Where BA comes from'),
            h('p', { style: { margin: 0, color: _beaFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'Behavioral Activation was developed by Peter Lewinsohn in the 1970s as a behavioral model of depression. Neil Jacobson and colleagues in the 1990s reformulated it and ran a landmark dismantling study (1996) that found BA alone was as effective as full Cognitive Behavioral Therapy for depression. Christopher Martell, Sona Dimidjian, and others further developed it as a freestanding treatment. BA is now one of the most evidence-supported treatments for depression, particularly for adolescents and adults where motivation is low and pure cognitive work feels too abstract.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _beaBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _beaFg('#86efac'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _beaFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for BA.'),
            sourceCard('Lewinsohn, P. M. (1974)', '"A behavioral approach to depression," in The Psychology of Depression: Contemporary Theory and Research', 'The original BA hypothesis: depression follows from a decrease in response-contingent positive reinforcement.', null),
            sourceCard('Jacobson, N. S. et al. (1996)', '"A component analysis of cognitive-behavioral treatment for depression," Journal of Consulting and Clinical Psychology, 64(2), 295-304', 'The landmark dismantling study showing BA alone was as effective as full CBT.', null),
            sourceCard('Martell, C. R., Dimidjian, S., and Herman-Dunn, R. (2010)', 'Behavioral Activation for Depression: A Clinician\'s Guide, Guilford Press', 'The standard clinical manual for BA. Widely used in training.', null),
            sourceCard('Dimidjian, S. et al. (2011)', '"The Origins and Current Status of Behavioral Activation Treatments for Depression," Annual Review of Clinical Psychology, 7, 1-38', 'Open-access review of BA outcomes and current practice.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _beaFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _beaFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'BA is for low mood and mild-to-moderate depression. For severe depression, suicidality, or trauma, BA is part of a treatment plan, not a standalone fix. A counselor or therapist is needed.'),
              h('li', null, 'The "just do small things" framing can land hard for students who are exhausted, overwhelmed, or in genuinely hard circumstances. BA does not say "your problems are not real"; it says "doing nothing makes them feel bigger, and small action can interrupt that."'),
              h('li', null, 'Activities chosen should be actually doable. A list of "go to the gym" you never do is worse than a list of "walk for 10 minutes" you actually do.'),
              h('li', null, 'BA presumes some baseline of resources and safety. A student who has no quiet space, no autonomy over their schedule, or basic-needs insecurity cannot do BA the way the manual describes. The structural barriers matter; do not let BA imply that mood is a personal failure.'),
              h('li', null, 'Some students discover their highest-mastery activities are ones they have been told are not real "activities" (gaming, fan creative work, certain crafts). Those count. The data is what the data is.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.10)', borderTop: '1px solid rgba(16,185,129,0.3)', borderRight: '1px solid rgba(16,185,129,0.3)', borderBottom: '1px solid rgba(16,185,129,0.3)', borderLeft: '3px solid #10b981', fontSize: 12.5, color: _beaFg('#a7f3d0'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'BA works well as a 4-week individual project, often paired with a counselor or therapist. For Crew, a lighter version: each student picks one small activity from each of the 5 categories, does them across the week, reports back what was surprising. Pair with the Wheel of Life and Window of Tolerance tools for richer self-tracking.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _beaBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _beaFg('#86efac'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _beaFg('#a7f3d0'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _beaFg('#a7f3d0'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _beaFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'plan') body = renderPlan();
      else if (view === 'log') body = renderLog();
      else if (view === 'patterns') body = renderPatterns();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Behavioral Activation' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
