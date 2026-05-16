// ═══════════════════════════════════════════════════════════════
// sel_tool_howl.js — Habits of Work and Learning (HOWL) Tracker
// Quarterly self-assessment tool aligned with EL Education's Habits
// of Work and Learning framework. Designed for Crew time at middle
// schools. Supports configurable HOWL sets (default 4: Active
// Engagement, Effective Effort, Crew Membership, Habits of Mind).
// Registered tool ID: "howlTracker"
// Category: self-direction
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('howlTracker'))) {
(function() {
  'use strict';

  // WCAG 4.1.3: status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-howl')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-howl';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Reduced motion CSS
  (function() {
    if (document.getElementById('allo-howl-motion-reduce')) return;
    var st = document.createElement('style');
    st.id = 'allo-howl-motion-reduce';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    if (document.head) document.head.appendChild(st);
  })();

  // ═══════════════════════════════════════════════════════════
  // HOWL definitions: aligned with EL Education's Habits of Work
  // and Learning framework. Many EL schools customize the exact
  // labels; this default set reflects the most common middle-school
  // configuration. The data is read out of state, not hard-coded
  // into the UI, so a teacher could swap the HOWL set per class.
  // ═══════════════════════════════════════════════════════════

  var DEFAULT_HOWLS = [
    {
      id: 'activeEngagement', name: 'Active Engagement', icon: '👀', color: '#0ea5e9',
      tagline: 'Present, participating, contributing',
      rubric: {
        1: 'Disengaged: rarely present in body or mind. Not contributing to the work or to Crew.',
        2: 'Developing: present some of the time but inconsistent. Sometimes distracted; sometimes contributing.',
        3: 'Proficient: present, attentive, and contributing regularly. Brings curiosity to most learning.',
        4: 'Exemplary: actively shaping the learning for self and others. Asks good questions; helps Crew stay engaged.'
      },
      crewPrompts: [
        'Describe a moment this week when you were really engaged in your learning. What made it possible?',
        'What pulls you OUT of engagement? Phones, social stuff, hunger, tiredness, the work itself?',
        'How does it feel when someone in your Crew is checked out? How does it affect the rest of you?'
      ]
    },
    {
      id: 'effectiveEffort', name: 'Effective Effort', icon: '💪', color: '#f59e0b',
      tagline: 'Perseverance, growth mindset, use of feedback',
      rubric: {
        1: 'Avoidant: quits when work is hard. Sees feedback as criticism. Rarely revises.',
        2: 'Developing: tries when the work is easy; gives up on hard parts. Uses feedback inconsistently.',
        3: 'Proficient: persists through difficulty. Revises based on feedback. Sees mistakes as part of learning.',
        4: 'Exemplary: seeks out challenge. Uses feedback to push further. Models growth mindset for others.'
      },
      crewPrompts: [
        'Tell us about something hard you stuck with this week. What helped you keep going?',
        'When you get feedback that stings a little, what happens in your head? What helps you use it instead of dismiss it?',
        'Where in your life do you already have a growth mindset? Where do you have a fixed one?'
      ]
    },
    {
      id: 'crewMembership', name: 'Crew Membership', icon: '🤝', color: '#16a34a',
      tagline: 'Collaboration, inclusive community, care',
      rubric: {
        1: 'Disconnected: rarely contributes to Crew. May exclude or be excluded.',
        2: 'Developing: contributes to Crew with familiar people. Inconsistent about inclusion or care.',
        3: 'Proficient: contributes regularly. Includes others. Takes care of the Crew when it needs care.',
        4: 'Exemplary: strengthens Crew. Notices when someone is struggling. Builds inclusive practice as a habit.'
      },
      crewPrompts: [
        'Who in this Crew helped you this week? Be specific.',
        'When did you put the group ahead of yourself this week? When did you NOT?',
        'What would make this Crew safer for everyone to take risks in?'
      ]
    },
    {
      id: 'habitsOfMind', name: 'Habits of Mind', icon: '🧠', color: '#a855f7',
      tagline: 'Curiosity, evidence, careful thinking',
      rubric: {
        1: 'Surface: accepts first answers. Does not ask why. Avoids evidence-seeking.',
        2: 'Developing: asks questions sometimes. Uses evidence when prompted. Critical thinking is uneven.',
        3: 'Proficient: regularly asks why and how. Uses evidence to support claims. Considers multiple perspectives.',
        4: 'Exemplary: drives the inquiry. Tracks evidence carefully. Names assumptions. Open to changing position.'
      },
      crewPrompts: [
        'What question are you sitting with right now that you do not have a clean answer to?',
        'When did you change your mind this week because of evidence? What did it feel like?',
        'How do you know what you know? Pick something you said this week and trace the evidence.'
      ]
    }
  ];

  // Compute the current "Quarter" id from the date. EL middle schools
  // typically run on quarters; we default to that. Q1 = Aug-Oct,
  // Q2 = Nov-Jan, Q3 = Feb-Apr, Q4 = May-Jul.
  function currentQuarterId(now) {
    now = now || new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;   // 1-12
    if (month >= 8 && month <= 10) return year + '-Q1';
    if (month >= 11 || month === 1)  return (month === 1 ? (year - 1) : year) + '-Q2';
    if (month >= 2 && month <= 4)    return year + '-Q3';
    return year + '-Q4';
  }
  function quarterLabel(qid) {
    if (!qid) return 'Quarter';
    var parts = qid.split('-');
    var labels = { Q1: 'Q1 (Aug-Oct)', Q2: 'Q2 (Nov-Jan)', Q3: 'Q3 (Feb-Apr)', Q4: 'Q4 (May-Jul)' };
    return (labels[parts[1]] || parts[1]) + ' ' + parts[0];
  }

  // Compute the current "week" within the active quarter. Mostly used
  // to label check-ins; persistence is by date so weeks need not be
  // exact academic weeks.
  function currentWeekISO(now) {
    now = now || new Date();
    // ISO-like week: year-week. Use Jan 1 + 7-day buckets for simplicity.
    var start = new Date(now.getFullYear(), 0, 1);
    var diffDays = Math.floor((now - start) / 86400000);
    var week = Math.floor(diffDays / 7) + 1;
    return now.getFullYear() + '-W' + (week < 10 ? '0' + week : week);
  }
  function weekLabel(wid) {
    if (!wid) return 'Week';
    var parts = wid.split('-W');
    return 'Week ' + parts[1] + ' of ' + parts[0];
  }

  function defaultHowlState() {
    var qid = currentQuarterId();
    return {
      view: 'home',                    // 'home' | 'goals' | 'checkin' | 'history' | 'crew'
      howls: DEFAULT_HOWLS,            // editable later via class config
      activeHowls: DEFAULT_HOWLS.map(function(h) { return h.id; }),  // which to focus on (default: all)
      currentQuarter: qid,
      goalsByQuarter: {},              // { qid: { howlId: 'goal text' } }
      weeklyCheckins: [],              // [{ week: 'YYYY-Wnn', quarter: qid, perHowl: { howlId: { rating, evidence, intention } } }]
      reflections: {},                 // { qid: 'narrative' } end-of-quarter narrative
      crewFocus: null,                 // currently selected howlId for crew prompts
      crewPromptIndex: 0               // which prompt within the focused HOWL
    };
  }

  // ─── Rubric color by rating ───
  function rubricColor(r) {
    if (r === 4) return '#16a34a';
    if (r === 3) return '#22c55e';
    if (r === 2) return '#f59e0b';
    if (r === 1) return '#ef4444';
    return '#64748b';
  }

  // ─── Tool registration ───
  window.SelHub.registerTool('howlTracker', {
    icon: '🧭',
    label: 'HOWL Tracker',
    desc: 'Track your Habits of Work and Learning across the quarter. Weekly self-assessment, goal setting, Crew conversation prompts. Aligned with EL Education\'s HOWL framework; designed for Crew time at middle schools.',
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
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      // ─── State plumbing ───
      var d = labToolData.howlTracker || defaultHowlState();
      function setHowl(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.howlTracker) || defaultHowlState();
          return Object.assign({}, prev, { howlTracker: Object.assign({}, prior, patch) });
        });
      }

      var howls = (d.howls || DEFAULT_HOWLS);
      var activeIds = d.activeHowls || howls.map(function(h2) { return h2.id; });
      var activeHowls = howls.filter(function(h2) { return activeIds.indexOf(h2.id) >= 0; });
      var qid = d.currentQuarter || currentQuarterId();
      var goals = (d.goalsByQuarter && d.goalsByQuarter[qid]) || {};
      var checkins = d.weeklyCheckins || [];
      var quarterCheckins = checkins.filter(function(c) { return c.quarter === qid; });
      var view = d.view || 'home';

      function goto(v) { setHowl({ view: v }); }

      // ─── Common header ───
      function header(title, subtitle) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
          ArrowLeft ? h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back') : null,
          h('div', { style: { flex: 1, minWidth: 240 } },
            h('h2', { style: { margin: 0, color: '#a78bfa', fontSize: 22, fontWeight: 900 } }, '🧭 ' + (title || 'HOWL Tracker')),
            subtitle ? h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, subtitle) : null
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      // ─── Nav tabs ───
      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Home', icon: '🏠' },
          { id: 'goals', label: 'Goals', icon: '🎯' },
          { id: 'checkin', label: 'Weekly check-in', icon: '✏️' },
          { id: 'history', label: 'History', icon: '📈' },
          { id: 'crew', label: 'Crew prompts', icon: '🤝' },
          { id: 'print', label: 'Print', icon: '🖨' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'HOWL Tracker sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 14px', borderRadius: 8, border: '1px solid ' + (active ? '#a78bfa' : '#334155'),
                background: active ? 'rgba(167,139,250,0.18)' : '#1e293b',
                color: active ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      // ─── Soft mental-health pointer (always rendered, low-key) ───
      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This is a self-tracking tool, not a substitute for talking with your counselor, school psych, or a trusted adult. If something is sitting heavy, the Crisis Companion tool in SEL Hub is here, and the Crisis Text Line is 741741 (text HOME).'
        );
      }

      // ═══════════════════════════════════════════════════════
      // HOME VIEW
      // ═══════════════════════════════════════════════════════
      function renderHome() {
        var wid = currentWeekISO();
        var thisWeekCheckin = quarterCheckins.find(function(c) { return c.week === wid; });
        var hasGoals = Object.keys(goals).length > 0;
        var howlsHit = activeHowls.length;
        var avgThisQuarter = (function() {
          if (quarterCheckins.length === 0) return null;
          var sum = 0, n = 0;
          quarterCheckins.forEach(function(c) {
            activeHowls.forEach(function(hw) {
              var entry = (c.perHowl || {})[hw.id];
              if (entry && typeof entry.rating === 'number') { sum += entry.rating; n++; }
            });
          });
          return n > 0 ? (sum / n).toFixed(1) : null;
        })();

        return h('div', null,
          // Quarter banner
          h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(56,189,248,0.06) 100%)', borderTop: '1px solid rgba(167,139,250,0.4)', borderRight: '1px solid rgba(167,139,250,0.4)', borderBottom: '1px solid rgba(167,139,250,0.4)', borderLeft: '4px solid #a78bfa', marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 24 } }, '📅'),
              h('div', null,
                h('div', { style: { fontWeight: 800, color: '#e9d5ff', fontSize: 16 } }, 'Current quarter: ' + quarterLabel(qid)),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 2 } }, weekLabel(wid) + ' · Tracking ' + howlsHit + ' HOWL' + (howlsHit === 1 ? '' : 's'))
              )
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 10 } },
              h('div', { style: { padding: 8, background: 'rgba(15,23,42,0.5)', borderRadius: 8 } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Check-ins this quarter'),
                h('div', { style: { fontSize: 22, fontWeight: 900, color: '#86efac' } }, quarterCheckins.length)
              ),
              h('div', { style: { padding: 8, background: 'rgba(15,23,42,0.5)', borderRadius: 8 } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Average rating'),
                h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbbf24' } }, avgThisQuarter || 'n/a')
              ),
              h('div', { style: { padding: 8, background: 'rgba(15,23,42,0.5)', borderRadius: 8 } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'This week'),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: thisWeekCheckin ? '#86efac' : '#fbbf24', marginTop: 4 } }, thisWeekCheckin ? '✓ Check-in saved' : 'Not done yet')
              )
            )
          ),

          // Calls to action
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
            !hasGoals ? h('button', { onClick: function() { goto('goals'); },
              style: { padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', fontWeight: 800, fontSize: 14, textAlign: 'left' } },
              h('div', { style: { fontSize: 24, marginBottom: 4 } }, '🎯'),
              h('div', null, 'Set your quarter goals'),
              h('div', { style: { fontSize: 11, fontWeight: 400, marginTop: 4, opacity: 0.9 } }, 'Start here. One goal per HOWL.')
            ) : null,

            !thisWeekCheckin ? h('button', { onClick: function() { goto('checkin'); },
              style: { padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', color: '#fff', fontWeight: 800, fontSize: 14, textAlign: 'left' } },
              h('div', { style: { fontSize: 24, marginBottom: 4 } }, '✏️'),
              h('div', null, 'Do this week\'s check-in'),
              h('div', { style: { fontSize: 11, fontWeight: 400, marginTop: 4, opacity: 0.9 } }, 'Rate yourself 1 to 4 on each HOWL.')
            ) : h('button', { onClick: function() { goto('checkin'); },
              style: { padding: 14, borderRadius: 12, border: '1px solid #334155', cursor: 'pointer', background: '#1e293b', color: '#cbd5e1', fontWeight: 700, fontSize: 13, textAlign: 'left' } },
              h('div', { style: { fontSize: 22, marginBottom: 4 } }, '✓'),
              h('div', null, 'Edit this week\'s check-in'),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, 'You already saved one this week.')
            ),

            h('button', { onClick: function() { goto('history'); },
              style: { padding: 14, borderRadius: 12, border: '1px solid #334155', cursor: 'pointer', background: '#1e293b', color: '#cbd5e1', fontWeight: 700, fontSize: 13, textAlign: 'left' } },
              h('div', { style: { fontSize: 22, marginBottom: 4 } }, '📈'),
              h('div', null, 'See your trend'),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, 'How are your HOWLs moving across the quarter?')
            )
          ),

          // Current goals preview
          hasGoals ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'This quarter\'s goals'),
            activeHowls.map(function(hw) {
              var g = goals[hw.id];
              return g ? h('div', { key: hw.id, style: { padding: '6px 0', borderTop: '1px solid #1e293b' } },
                h('strong', { style: { color: hw.color, fontSize: 13 } }, hw.icon + ' ' + hw.name),
                h('div', { style: { color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.5, marginTop: 2 } }, g)
              ) : null;
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // GOALS VIEW
      // ═══════════════════════════════════════════════════════
      function renderGoals() {
        function setGoal(howlId, text) {
          var byQ = Object.assign({}, d.goalsByQuarter || {});
          byQ[qid] = Object.assign({}, byQ[qid] || {});
          byQ[qid][howlId] = text;
          setHowl({ goalsByQuarter: byQ });
        }
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: '#fde68a', lineHeight: 1.55 } },
            h('strong', null, '🎯 Goal-setting for ' + quarterLabel(qid)),
            h('div', { style: { marginTop: 6, color: '#fde68a' } }, 'Write one concrete goal for each HOWL you want to focus on. Strong goals name a specific behavior, not a feeling. Examples below.')
          ),
          activeHowls.map(function(hw) {
            var current = goals[hw.id] || '';
            return h('div', { key: hw.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderLeft: '3px solid ' + hw.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 22 } }, hw.icon),
                h('div', null,
                  h('strong', { style: { color: hw.color, fontSize: 14 } }, hw.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, hw.tagline)
                )
              ),
              h('textarea', {
                value: current,
                onChange: function(e) { setGoal(hw.id, e.target.value); },
                placeholder: 'Example: I will ask one question per class period instead of waiting to be called on.',
                'aria-label': 'Goal for ' + hw.name,
                style: { width: '100%', minHeight: 70, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            );
          }),
          h('button', { onClick: function() { goto('home'); if (announceToSR) announceToSR('Goals saved'); },
            style: { padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#fff', fontWeight: 800, fontSize: 13 } }, 'Save and return to home →')
        );
      }

      // ═══════════════════════════════════════════════════════
      // WEEKLY CHECK-IN VIEW
      // ═══════════════════════════════════════════════════════
      function renderCheckin() {
        var wid = currentWeekISO();
        var existing = quarterCheckins.find(function(c) { return c.week === wid; });
        var current = existing || { week: wid, quarter: qid, perHowl: {} };

        function updateEntry(howlId, field, value) {
          var newPerHowl = Object.assign({}, current.perHowl);
          newPerHowl[howlId] = Object.assign({}, newPerHowl[howlId] || {}, { [field]: value });
          var newEntry = Object.assign({}, current, { perHowl: newPerHowl });
          var newCheckins = (d.weeklyCheckins || []).filter(function(c) { return !(c.week === wid && c.quarter === qid); });
          newCheckins.push(newEntry);
          setHowl({ weeklyCheckins: newCheckins });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.3)', borderRight: '1px solid rgba(167,139,250,0.3)', borderBottom: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.55 } },
            h('strong', null, '✏️ ' + weekLabel(wid) + ' check-in'),
            h('div', { style: { marginTop: 6 } }, 'For each HOWL: pick the rubric level (1 to 4) that fits best this week. Add a specific example, then name one concrete intention for next week.')
          ),
          activeHowls.map(function(hw) {
            var entry = current.perHowl[hw.id] || {};
            var rating = entry.rating || 0;
            return h('div', { key: hw.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderLeft: '3px solid ' + hw.color, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                h('span', { style: { fontSize: 22 } }, hw.icon),
                h('div', null,
                  h('strong', { style: { color: hw.color, fontSize: 14 } }, hw.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, hw.tagline)
                )
              ),
              // Rating buttons
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 } },
                [1, 2, 3, 4].map(function(r) {
                  var picked = rating === r;
                  return h('button', { key: r, onClick: function() { updateEntry(hw.id, 'rating', r); },
                    'aria-pressed': picked, 'aria-label': 'Rate ' + r,
                    style: { padding: '8px 4px', borderRadius: 6, border: '2px solid ' + (picked ? rubricColor(r) : '#334155'),
                      background: picked ? rubricColor(r) + '22' : '#1e293b',
                      color: picked ? rubricColor(r) : '#cbd5e1', cursor: 'pointer', fontWeight: 800, fontSize: 18 } }, r);
                })
              ),
              // Active rubric description
              rating > 0 ? h('div', { style: { fontSize: 12, color: '#cbd5e1', padding: 8, background: '#1e293b', borderRadius: 6, marginBottom: 8, fontStyle: 'italic', borderLeft: '2px solid ' + rubricColor(rating) } },
                h('strong', { style: { color: rubricColor(rating) } }, 'Level ' + rating + ': '),
                hw.rubric[rating]
              ) : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 8 } }, 'Pick a rubric level.'),
              // Evidence
              h('label', { style: { display: 'block', marginBottom: 4, fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Specific example from this week'),
              h('textarea', {
                value: entry.evidence || '',
                onChange: function(e) { updateEntry(hw.id, 'evidence', e.target.value); },
                placeholder: 'What happened? Where? Who? When did you notice this in yourself?',
                style: { width: '100%', minHeight: 50, padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical', marginBottom: 8 }
              }),
              // Intention
              h('label', { style: { display: 'block', marginBottom: 4, fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Next-week intention'),
              h('textarea', {
                value: entry.intention || '',
                onChange: function(e) { updateEntry(hw.id, 'intention', e.target.value); },
                placeholder: 'One concrete thing you will try next week.',
                style: { width: '100%', minHeight: 40, padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            );
          }),
          h('button', { onClick: function() { goto('home'); if (addToast) addToast('Check-in saved', 'success'); if (announceToSR) announceToSR('Weekly check-in saved'); },
            style: { padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#a78bfa', color: '#fff', fontWeight: 800, fontSize: 13 } }, '✓ Save and return to home')
        );
      }

      // ═══════════════════════════════════════════════════════
      // HISTORY VIEW
      // ═══════════════════════════════════════════════════════
      function renderHistory() {
        // Sort check-ins by week for trend chart
        var sorted = quarterCheckins.slice().sort(function(a, b) { return a.week < b.week ? -1 : 1; });
        if (sorted.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 24, borderRadius: 12, background: '#0f172a', textAlign: 'center', color: '#94a3b8' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📈'),
              h('div', { style: { fontSize: 14, marginBottom: 4 } }, 'No check-ins yet this quarter.'),
              h('div', { style: { fontSize: 12 } }, 'Do a weekly check-in to start seeing your trend.')
            )
          );
        }

        // Build a simple SVG line chart
        var w = 600, hgt = 240, padL = 40, padR = 110, padT = 12, padB = 32;
        var ix = w - padL - padR;
        var iy = hgt - padT - padB;
        function ptsFor(howlId) {
          return sorted.map(function(c, i) {
            var entry = (c.perHowl || {})[howlId];
            var v = entry && typeof entry.rating === 'number' ? entry.rating : 0;
            var x = padL + (sorted.length === 1 ? ix / 2 : (i / (sorted.length - 1)) * ix);
            var y = padT + iy - ((v - 1) / 3) * iy;   // map 1-4 to chart
            return { x: x, y: y, v: v };
          });
        }
        function pathStr(pts) { return pts.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p.x + ',' + p.y; }).join(' '); }

        return h('div', null,
          // Chart
          h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 14, border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 } }, '📈 ' + quarterLabel(qid) + ' trends'),
            h('svg', { viewBox: '0 0 ' + w + ' ' + hgt, style: { width: '100%', height: 'auto', display: 'block' }, 'aria-label': 'HOWL rating trend chart' },
              // Y gridlines (1, 2, 3, 4)
              [1, 2, 3, 4].map(function(g, gi) {
                var y = padT + iy - ((g - 1) / 3) * iy;
                return h('g', { key: 'g' + gi },
                  h('line', { x1: padL, y1: y, x2: padL + ix, y2: y, stroke: '#1e293b', strokeWidth: 1 }),
                  h('text', { x: padL - 4, y: y + 3, fontSize: 10, fill: rubricColor(g), textAnchor: 'end', fontWeight: 700 }, g)
                );
              }),
              // X labels (week numbers)
              sorted.map(function(c, i) {
                if (sorted.length > 8 && i % 2 !== 0 && i !== sorted.length - 1) return null;
                var x = padL + (sorted.length === 1 ? ix / 2 : (i / (sorted.length - 1)) * ix);
                return h('text', { key: 'xl' + i, x: x, y: hgt - 8, fontSize: 9, fill: '#64748b', textAnchor: 'middle' }, c.week.split('-W')[1] || c.week);
              }),
              // HOWL lines
              activeHowls.map(function(hw) {
                var pts = ptsFor(hw.id).filter(function(p) { return p.v > 0; });
                if (pts.length === 0) return null;
                return h('g', { key: hw.id },
                  h('path', { d: pathStr(pts), stroke: hw.color, strokeWidth: 2.5, fill: 'none', strokeLinejoin: 'round' }),
                  pts.map(function(p, i) { return h('circle', { key: i, cx: p.x, cy: p.y, r: 3, fill: hw.color }); })
                );
              }),
              // Legend
              activeHowls.map(function(hw, hi) {
                return h('g', { key: 'leg' + hw.id },
                  h('line', { x1: w - padR + 6, y1: padT + 8 + hi * 18, x2: w - padR + 20, y2: padT + 8 + hi * 18, stroke: hw.color, strokeWidth: 2.5 }),
                  h('text', { x: w - padR + 24, y: padT + 12 + hi * 18, fontSize: 10, fill: '#cbd5e1' }, hw.icon + ' ' + hw.name.split(' ')[0])
                );
              })
            )
          ),

          // Check-in list (most recent first)
          h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Recent check-ins'),
          sorted.slice().reverse().slice(0, 6).map(function(c) {
            return h('details', { key: c.week,
              style: { background: '#0f172a', borderRadius: 8, padding: '8px 12px', marginBottom: 6, border: '1px solid #1e293b' } },
              h('summary', { style: { cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#e2e8f0' } },
                weekLabel(c.week)
              ),
              h('div', { style: { marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                activeHowls.map(function(hw) {
                  var entry = (c.perHowl || {})[hw.id];
                  if (!entry) return null;
                  return h('div', { key: hw.id, style: { padding: 8, background: '#1e293b', borderRadius: 6, borderLeft: '2px solid ' + hw.color } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: hw.color, marginBottom: 4 } },
                      hw.icon + ' ' + hw.name + (entry.rating ? ' · ' : ''),
                      entry.rating ? h('span', { style: { color: rubricColor(entry.rating) } }, 'Level ' + entry.rating) : null
                    ),
                    entry.evidence ? h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, '“' + entry.evidence + '”') : null,
                    entry.intention ? h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '→ ' + entry.intention) : null
                  );
                })
              )
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════
      // CREW PROMPTS VIEW
      // ═══════════════════════════════════════════════════════
      function renderCrew() {
        var focusId = d.crewFocus || activeHowls[0].id;
        var focusHowl = howls.find(function(h2) { return h2.id === focusId; }) || activeHowls[0];
        var promptIdx = d.crewPromptIndex || 0;
        var prompts = focusHowl.crewPrompts || [];
        if (promptIdx >= prompts.length) promptIdx = 0;
        var prompt = prompts[promptIdx] || 'No prompt available.';

        function pickHowl(id) { setHowl({ crewFocus: id, crewPromptIndex: 0 }); }
        function nextPrompt() {
          var next = (promptIdx + 1) % prompts.length;
          setHowl({ crewPromptIndex: next });
        }
        function prevPrompt() {
          var prev = (promptIdx - 1 + prompts.length) % prompts.length;
          setHowl({ crewPromptIndex: prev });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(22,163,74,0.10)', borderTop: '1px solid rgba(22,163,74,0.3)', borderRight: '1px solid rgba(22,163,74,0.3)', borderBottom: '1px solid rgba(22,163,74,0.3)', borderLeft: '3px solid #16a34a', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.55 } },
            h('strong', null, '🤝 Crew time prompts'),
            h('div', { style: { marginTop: 6 } }, 'Discussion prompts tied to each HOWL. Pick one for today\'s Crew gathering. Good Crew conversations move from generic ("what is engagement") to specific ("when were YOU engaged this week, and why").')
          ),

          // HOWL picker
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
            activeHowls.map(function(hw) {
              var picked = focusId === hw.id;
              return h('button', { key: hw.id, onClick: function() { pickHowl(hw.id); },
                style: { padding: 10, borderRadius: 10, border: '2px solid ' + (picked ? hw.color : '#334155'),
                  background: picked ? hw.color + '22' : '#0f172a',
                  cursor: 'pointer', textAlign: 'left', color: picked ? hw.color : '#cbd5e1' } },
                h('div', { style: { fontSize: 22, marginBottom: 4 } }, hw.icon),
                h('div', { style: { fontSize: 12, fontWeight: 800 } }, hw.name),
                h('div', { style: { fontSize: 10.5, color: '#94a3b8', marginTop: 2 } }, hw.tagline)
              );
            })
          ),

          // Prompt card
          h('div', { style: { padding: 18, borderRadius: 14, background: '#0f172a', borderLeft: '4px solid ' + focusHowl.color, marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
              h('span', { style: { fontSize: 24 } }, focusHowl.icon),
              h('div', null,
                h('div', { style: { fontSize: 11, color: focusHowl.color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } }, 'Prompt ' + (promptIdx + 1) + ' of ' + prompts.length + ' · ' + focusHowl.name),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, focusHowl.tagline)
              )
            ),
            h('p', { style: { margin: '8px 0 0', color: '#fff', fontSize: 17, lineHeight: 1.6, fontWeight: 500 } }, '“' + prompt + '”')
          ),

          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { onClick: prevPrompt, 'aria-label': 'Previous prompt',
              style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', background: '#1e293b', color: '#cbd5e1', fontWeight: 700, fontSize: 12 } }, '← Previous'),
            h('button', { onClick: nextPrompt, 'aria-label': 'Next prompt',
              style: { padding: '8px 14px', borderRadius: 8, border: '1px solid ' + focusHowl.color, cursor: 'pointer', background: focusHowl.color + '22', color: focusHowl.color, fontWeight: 700, fontSize: 12 } }, 'Next →')
          ),

          h('details', { style: { marginTop: 14, padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#94a3b8' } }, '📝 Notes for educators'),
            h('div', { style: { marginTop: 8, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 } },
              h('p', { style: { margin: '0 0 6px' } }, 'Crew protocols vary by school. A few patterns that work in EL middle schools:'),
              h('ul', { style: { margin: '0 0 6px 18px', padding: 0 } },
                h('li', null, 'Open with a 60-second silent reflection on the prompt.'),
                h('li', null, 'Pair-share for 90 seconds before opening to the full Crew.'),
                h('li', null, 'Norm: "specific over general." Push students from category-level claims ("I am engaged") to instances ("Tuesday in science when we built the catapult").'),
                h('li', null, 'Norm: "no fixing." Crew listens; it does not solve.')
              ),
              h('p', { style: { margin: 0, fontStyle: 'italic', color: '#94a3b8' } }, 'These are starter prompts. The strongest Crew conversations are the ones a student or facilitator brings from real classroom moments that week.')
            )
          )
        );
      }

      // ═══════════════════════════════════════════════════════
      // PRINT VIEW — quarter snapshot for Crew binders + IEP meetings
      // ═══════════════════════════════════════════════════════
      function renderPrint() {
        // Latest check-in per HOWL
        var latestPerHowl = {};
        quarterCheckins.forEach(function(c) {
          activeHowls.forEach(function(hw) {
            var entry = (c.perHowl || {})[hw.id];
            if (entry && typeof entry.rating === 'number') {
              if (!latestPerHowl[hw.id] || c.week > latestPerHowl[hw.id].week) {
                latestPerHowl[hw.id] = { week: c.week, rating: entry.rating, note: entry.note || '' };
              }
            }
          });
        });
        var avgPerHowl = {};
        activeHowls.forEach(function(hw) {
          var sum = 0, n = 0;
          quarterCheckins.forEach(function(c) {
            var entry = (c.perHowl || {})[hw.id];
            if (entry && typeof entry.rating === 'number') { sum += entry.rating; n++; }
          });
          if (n > 0) avgPerHowl[hw.id] = { avg: (sum / n).toFixed(1), n: n };
        });

        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.4)', borderRight: '1px solid rgba(167,139,250,0.4)', borderBottom: '1px solid rgba(167,139,250,0.4)', borderLeft: '3px solid #a78bfa', marginBottom: 12, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.65 } },
            h('strong', null, '🖨 Quarter snapshot. '),
            'Print or save as PDF for your Crew binder, student-led conference, or IEP meeting. Includes your goals, your most recent rating per HOWL, and your quarter average per HOWL.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),

          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#howl-print-region, #howl-print-region * { visibility: visible !important; } ' +
            '#howl-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#howl-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),

          h('div', { id: 'howl-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'HOWL Tracker · ' + quarterLabel(qid)),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'Habits of Work and Learning · EL Education')
            ),

            // Goals section
            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'My goals this quarter'),
              Object.keys(goals).length === 0
                ? h('div', { style: { fontSize: 13, fontStyle: 'italic', color: '#475569' } }, '(no goals set yet)')
                : activeHowls.map(function(hw) {
                    var g = goals[hw.id];
                    if (!g) return null;
                    return h('div', { key: hw.id, style: { marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed #cbd5e1' } },
                      h('div', { style: { fontSize: 11, color: '#6b21a8', fontWeight: 700 } }, hw.label),
                      h('div', { style: { fontSize: 13, color: '#0f172a', lineHeight: 1.55 } }, g)
                    );
                  })
            ),

            // Per-HOWL ratings
            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12 } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'My ratings this quarter'),
              activeHowls.map(function(hw) {
                var latest = latestPerHowl[hw.id];
                var avg = avgPerHowl[hw.id];
                return h('div', { key: hw.id, style: { marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed #cbd5e1', pageBreakInside: 'avoid' } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: '#0f172a' } }, hw.label),
                    h('div', { style: { fontSize: 11, color: '#475569' } }, avg ? 'avg ' + avg.avg + ' / 5 over ' + avg.n + ' check-ins' : 'no check-ins yet')
                  ),
                  latest ? h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.55 } },
                    'Most recent (' + latest.week + '): ' + latest.rating + ' / 5' + (latest.note ? ' — ' + latest.note : '')
                  ) : null
                );
              })
            ),

            // Footer
            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5, textAlign: 'center' } },
              'A HOWL snapshot is a starting point for conversation, not a final grade. Bring this to Crew check-ins, student-led conferences, IEP meetings. Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      // ═══════════════════════════════════════════════════════
      // ROOT RENDER
      // ═══════════════════════════════════════════════════════
      var subtitle = 'Habits of Work and Learning · ' + quarterLabel(qid) + ' · Weekly self-assessment for Crew time.';
      var body;
      if (view === 'goals') body = renderGoals();
      else if (view === 'checkin') body = renderCheckin();
      else if (view === 'history') body = renderHistory();
      else if (view === 'crew') body = renderCrew();
      else if (view === 'print') body = renderPrint();
      else body = renderHome();

      return h('div', { style: { maxWidth: 820, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'HOWL Tracker' },
        header(null, subtitle),
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('howlTracker', h, ctx) : null),
        navTabs(),
        body
      );
    }
  });

})();
}
