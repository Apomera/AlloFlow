// ═══════════════════════════════════════════════════════════════
// sel_tool_sfbt.js — Solution-Focused Brief Therapy
// SFBT (de Shazer, Berg, 1980s onward) flips the clinical script:
// instead of "what is wrong" it asks "what is already working." The
// two best-known SFBT techniques are surfaced here as guided
// exercises:
//   1. The Miracle Question — imagine the problem solved overnight
//   2. Scaling Questions — locate yourself on 0-10, name the smallest
//      step that would move you up half a point
// Plus exception-finding ("when has this NOT been a problem?") and
// pre-session change.
// Used heavily in school counseling because it fits 1-2 sessions.
// Registered tool ID: "sfbt"
// Category: inner-work
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('sfbt'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-sfbt')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-sfbt';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  function defaultState() {
    return {
      view: 'home',
      problem: '',                 // what they want help with
      miracle: '',                 // miracle question response
      miracleDifferences: '',      // what would be specifically different
      miracleAlreadyHappening: '', // pieces already happening
      scaleNow: 5,                 // 0-10 where am I now
      scaleGoal: 8,                // realistic goal (not 10)
      scaleEvidence: '',           // why this number, not lower
      scaleNextStep: '',           // smallest step up half a point
      exceptions: '',              // when has the problem NOT happened
      compliments: '',             // what already-working strengths
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('sfbt', {
    icon: '🔭',
    label: 'Solution-Focused',
    desc: 'Solution-Focused Brief Therapy exercises: the Miracle Question (imagine the problem solved overnight), Scaling Questions (0-10, smallest step up), exception-finding, and compliments. Used heavily in school counseling because it fits 1-2 sessions. From de Shazer and Berg.',
    color: 'purple',
    category: 'inner-work',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.sfbt || defaultState();
      function setSF(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.sfbt) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { sfbt: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setSF({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#c4b5fd', fontSize: 22, fontWeight: 900 } }, '🔭 Solution-Focused'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Look forward, not back. What is already working?')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🔭' },
          { id: 'miracle', label: 'Miracle question', icon: '✨' },
          { id: 'scaling', label: 'Scaling', icon: '📊' },
          { id: 'exceptions', label: 'Exceptions', icon: '🔍' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'SFBT sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#a855f7' : '#334155'),
                background: active ? 'rgba(168,85,247,0.18)' : '#1e293b',
                color: active ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'SFBT is a counseling technique, not therapy. If the problem you are working on is heavy, bring it to a counselor or school psych. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — name the problem + roadmap
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(168,85,247,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e9d5ff', marginBottom: 4 } }, 'Solution-focused work starts ahead, not behind.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'Most problem-solving asks "why is this happening?" Solution-Focused work asks two different questions: "what would it look like if it was already better?" and "when does the problem not happen?" Both are easier to act on than figuring out causes.'
            )
          ),

          // What are you working on
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 14 } },
            h('label', { htmlFor: 'sf-problem', style: { display: 'block', fontSize: 12, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, 'What is the thing you would like to be different?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.5, fontStyle: 'italic' } }, 'No need to diagnose it; name it however it feels true to you.'),
            h('textarea', { id: 'sf-problem', value: d.problem || '',
              placeholder: 'e.g. I have been arguing with my mom every day after school.',
              onChange: function(e) { setSF({ problem: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          // Roadmap
          stepCard('✨ Miracle Question', 'Imagine you went to sleep tonight and a miracle solved the problem. When you woke up, what would be different? This question opens up a vision of what better looks like, in specifics.', function() { goto('miracle'); }, '#a855f7', d.miracle ? '✓ Started' : 'Start'),
          stepCard('📊 Scaling', 'On a 0-10 scale, where are you with this problem right now? Where would you LIKE to be (realistic, not 10)? What is the smallest step that would move you up half a point?', function() { goto('scaling'); }, '#3b82f6', d.scaleNow !== 5 || d.scaleNextStep ? '✓ Started' : 'Start'),
          stepCard('🔍 Exceptions', 'When has this problem NOT been happening? Even small windows. Those are clues about what already works.', function() { goto('exceptions'); }, '#22c55e', d.exceptions ? '✓ Started' : 'Start'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color, status) {
        return h('button', { onClick: onClick, 'aria-label': 'Go to ' + title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 10, color: '#e2e8f0' } },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
            h('span', { style: { fontSize: 14, fontWeight: 800, color: color, flex: 1 } }, title),
            h('span', { style: { fontSize: 11, color: color, fontWeight: 700 } }, status)
          ),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // MIRACLE QUESTION
      // ═══════════════════════════════════════════════════════════
      function renderMiracle() {
        return h('div', null,
          h('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(168,85,247,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '✨ The Miracle Question'),
            h('p', { style: { margin: 0, color: '#fff', fontSize: 15, lineHeight: 1.8, fontStyle: 'italic' } },
              '"Suppose tonight, while you are sleeping, a miracle happens, and the problem is solved. But because you are asleep, you do not know the miracle has happened. When you wake up tomorrow, what would be the first small sign that something is different? What would you notice?"'
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.08)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.65, marginBottom: 14 } },
            h('strong', null, '💡 The trick: '),
            'do not answer "the problem would be gone." Get specific. What time would you wake up? What would the first thing you do be? What would your face look like? What would someone watching you notice that is different?'
          ),

          // Response areas
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-miracle', style: { display: 'block', fontSize: 12, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, 'What would the first small sign be?'),
            h('textarea', { id: 'sf-miracle', value: d.miracle || '',
              placeholder: 'Tomorrow morning, when I wake up and the miracle has happened, the first thing I would notice is...',
              onChange: function(e) { setSF({ miracle: e.target.value }); },
              style: { width: '100%', minHeight: 110, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-miracle-diff', style: { display: 'block', fontSize: 12, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, 'Throughout that day, what would specifically be different?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'In your body, your mood, what you say, what others say to you, your interactions with the specific people involved...'),
            h('textarea', { id: 'sf-miracle-diff', value: d.miracleDifferences || '',
              placeholder: 'My mom and I would... I would feel... My body would... At school...',
              onChange: function(e) { setSF({ miracleDifferences: e.target.value }); },
              style: { width: '100%', minHeight: 110, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-miracle-already', style: { display: 'block', fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 6 } }, '🌱 What pieces of the miracle are ALREADY happening sometimes?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'The key SFBT move: look at your miracle description and find the parts that already happen, even occasionally. Those are the seeds.'),
            h('textarea', { id: 'sf-miracle-already', value: d.miracleAlreadyHappening || '',
              placeholder: 'Last Saturday morning, some of this was already...',
              onChange: function(e) { setSF({ miracleAlreadyHappening: e.target.value }); },
              style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SCALING
      // ═══════════════════════════════════════════════════════════
      function renderScaling() {
        return h('div', null,
          h('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(59,130,246,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '📊 Scaling questions'),
            h('p', { style: { margin: 0, color: '#fff', fontSize: 14, lineHeight: 1.7 } },
              'On a 0-to-10 scale, where 0 is the worst this problem has ever been and 10 is the miracle, where are you right now?'
            )
          ),

          // Where am I now
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #3b82f6', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-now', style: { display: 'block', fontSize: 12, color: '#93c5fd', fontWeight: 800, marginBottom: 8 } }, 'Right now I am at ' + (d.scaleNow !== undefined ? d.scaleNow : 5) + ' / 10'),
            h('input', { id: 'sf-now', type: 'range', min: 0, max: 10, value: d.scaleNow !== undefined ? d.scaleNow : 5,
              onChange: function(e) { setSF({ scaleNow: parseInt(e.target.value, 10) }); },
              style: { width: '100%' }, 'aria-label': 'Where am I now, 0 to 10' }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 4 } },
              h('span', null, '0 = worst it has ever been'),
              h('span', null, '10 = miracle')
            )
          ),

          // Where would I like to be (realistic)
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #3b82f6', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-goal', style: { display: 'block', fontSize: 12, color: '#93c5fd', fontWeight: 800, marginBottom: 8 } }, 'A realistic goal would be: ' + (d.scaleGoal !== undefined ? d.scaleGoal : 8) + ' / 10'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'NOT 10. The goal is "good enough that I can live with this," not perfection. Usually around 7 or 8.'),
            h('input', { id: 'sf-goal', type: 'range', min: 0, max: 10, value: d.scaleGoal !== undefined ? d.scaleGoal : 8,
              onChange: function(e) { setSF({ scaleGoal: parseInt(e.target.value, 10) }); },
              style: { width: '100%' }, 'aria-label': 'Realistic goal, 0 to 10' })
          ),

          // The key SFBT move: why this number not lower
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-evidence', style: { display: 'block', fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 6 } }, '🌱 Why a ' + (d.scaleNow !== undefined ? d.scaleNow : 5) + ' and not a 0?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'This is the SFBT signature move. You are not at 0; what is keeping you at ' + (d.scaleNow !== undefined ? d.scaleNow : 5) + '? What is already working, even a little? Those are the seeds.'),
            h('textarea', { id: 'sf-evidence', value: d.scaleEvidence || '',
              placeholder: 'I am not at 0 because...',
              onChange: function(e) { setSF({ scaleEvidence: e.target.value }); },
              style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          // The smallest next step
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-step', style: { display: 'block', fontSize: 12, color: '#e9d5ff', fontWeight: 800, marginBottom: 6 } }, '➕ The smallest step that would move you up HALF a point'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'Not a leap. A half-point. From ' + (d.scaleNow !== undefined ? d.scaleNow : 5) + ' to ' + ((d.scaleNow !== undefined ? d.scaleNow : 5) + 0.5) + '. What is the smallest thing you could do that would move the needle that much?'),
            h('textarea', { id: 'sf-step', value: d.scaleNextStep || '',
              placeholder: 'The smallest thing I could do is...',
              onChange: function(e) { setSF({ scaleNextStep: e.target.value }); },
              style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EXCEPTIONS
      // ═══════════════════════════════════════════════════════════
      function renderExceptions() {
        return h('div', null,
          h('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(34,197,94,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '🔍 Exception-finding'),
            h('p', { style: { margin: 0, color: '#fff', fontSize: 14, lineHeight: 1.7 } },
              'When has the problem NOT been happening, or been less intense? Even small windows count. Those are exceptions, and they hold information about what already works.'
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'sf-exceptions', style: { display: 'block', fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 6 } }, 'When does this NOT happen, or happen less?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'Think about: specific days, specific people you are with, specific times of day, places, activities. What is different about those moments?'),
            h('textarea', { id: 'sf-exceptions', value: d.exceptions || '',
              placeholder: 'The arguments happen less when... On Saturdays, ... When I am with...',
              onChange: function(e) { setSF({ exceptions: e.target.value }); },
              style: { width: '100%', minHeight: 130, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7' } },
            h('label', { htmlFor: 'sf-compliments', style: { display: 'block', fontSize: 12, color: '#e9d5ff', fontWeight: 800, marginBottom: 6 } }, '🌟 What strengths are you already using?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5, fontStyle: 'italic' } }, 'In SFBT this is called "compliments" — naming what is already strong in how you are handling things, even if imperfectly.'),
            h('textarea', { id: 'sf-compliments', value: d.compliments || '',
              placeholder: 'I am already... I have been...',
              onChange: function(e) { setSF({ compliments: e.target.value }); },
              style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(168,85,247,0.10)', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'sfbt-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#sfbt-print-region, #sfbt-print-region * { visibility: visible !important; } ' +
              '#sfbt-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #7c3aed' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Solution-Focused Reflection'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My Solution-Focused work'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            d.problem ? printSection('What I am working on', d.problem, '#7c3aed') : null,
            d.miracle || d.miracleDifferences || d.miracleAlreadyHappening
              ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                  h('div', { style: { background: '#a855f7', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '✨ The Miracle Question'),
                  d.miracle ? printSubLine('First small sign', d.miracle) : null,
                  d.miracleDifferences ? printSubLine('What would be different', d.miracleDifferences) : null,
                  d.miracleAlreadyHappening ? printSubLine('Already happening sometimes', d.miracleAlreadyHappening) : null
                )
              : null,

            h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📊 Scaling'),
              printSubLine('Right now', (d.scaleNow !== undefined ? d.scaleNow : '–') + ' / 10'),
              printSubLine('Realistic goal', (d.scaleGoal !== undefined ? d.scaleGoal : '–') + ' / 10'),
              d.scaleEvidence ? printSubLine('Why not lower', d.scaleEvidence) : null,
              d.scaleNextStep ? printSubLine('Smallest step up half a point', d.scaleNextStep) : null
            ),

            d.exceptions || d.compliments
              ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                  h('div', { style: { background: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🔍 Exceptions and Strengths'),
                  d.exceptions ? printSubLine('When the problem does not happen', d.exceptions) : null,
                  d.compliments ? printSubLine('Strengths I am already using', d.compliments) : null
                )
              : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Solution-Focused Brief Therapy techniques from de Shazer and Berg, Brief Family Therapy Center. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      function printSection(title, content, color) {
        return h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
          h('div', { style: { background: color, color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, title),
          h('p', { style: { margin: '0 8px', color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, content)
        );
      }
      function printSubLine(label, content) {
        return h('div', { style: { marginBottom: 6, paddingLeft: 8 } },
          h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 } }, label),
          h('div', { style: { fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6 } }, content)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('sfbt', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'What Solution-Focused work is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Solution-Focused Brief Therapy (SFBT) is a counseling approach that flips most clinical scripts. Instead of asking "what is wrong, and how did it get this way?", SFBT asks "what would it look like if it was better, and when does the problem not happen?" The questions sound small but they are doing real work: they point the brain forward instead of backward, and they make the goal concrete enough to recognize when you take a step toward it.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'SFBT was designed to be brief on purpose. The original research was on 1-to-5-session interventions. That is part of why it has become the most-used technique in US school counseling: counselors often only see a student once or twice, and SFBT is built for that.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'Where SFBT comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Solution-Focused Brief Therapy was developed by Steve de Shazer, Insoo Kim Berg, and colleagues at the Brief Family Therapy Center in Milwaukee starting in the late 1970s. They were puzzled by clients who came in with serious problems and got better quickly with what looked like very little therapy. Studying what was actually helping, they identified specific questioning patterns (the Miracle Question, Scaling, Exception-finding, Coping Questions) that consistently moved clients forward. SFBT was formalized in the 1980s and has been extensively evaluated since. It is the foundation of most US school counseling practice today.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for SFBT.'),
            sourceCard('de Shazer, S. (1988)', 'Clues: Investigating Solutions in Brief Therapy, W. W. Norton', 'One of de Shazer\'s foundational SFBT texts.', null),
            sourceCard('Berg, I. K. and Steiner, T. (2003)', 'Children\'s Solution Work, W. W. Norton', 'Co-founder Berg\'s book on SFBT specifically with children and adolescents.', null),
            sourceCard('Murphy, J. J. (2015)', 'Solution-Focused Counseling in Schools (3rd ed.), American Counseling Association', 'The school-counselor standard text. Widely used in US school counseling training.', null),
            sourceCard('Solution Focused Brief Therapy Association', 'sfbta.org', 'Professional organization. Open-access training and research.', 'https://www.sfbta.org/'),
            sourceCard('Franklin, C. et al. (2017)', '"Solution-Focused Brief Therapy in Schools: A Review of the Outcome Literature," Research on Social Work Practice', 'Meta-analytic review of SFBT in school settings.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'SFBT works best for problems where the student has some agency. For situations that are mostly being done TO the student (an abusive parent, an unsafe environment, an unjust school policy), SFBT can drift into "what can YOU do" framing that puts the burden on the wrong person.'),
              h('li', null, 'The Miracle Question can land flat with students who have been told their whole lives that what they want is unrealistic. Some students need permission to want, before they can imagine.'),
              h('li', null, 'SFBT is a counseling technique, not therapy. For severe depression, trauma, eating disorders, or suicidality, a single SFBT session is not enough.'),
              h('li', null, 'The "what is already working" frame is powerful but can be used to gloss over things that genuinely need to change. Use it to build hope, not to dismiss real problems.'),
              h('li', null, 'For students with significant cognitive or language differences, the abstraction in the Miracle Question can be hard. Concrete-step framing or visual representations may work better.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'SFBT pairs naturally with brief one-on-one counselor sessions. A simple protocol: introduce the problem in 2-3 minutes, do the Miracle Question or a Scaling sequence in 10-15 minutes, end with one concrete half-point step. For Crew, a lighter version: each student names one thing they want to be different by the end of the week, scales where they are now, and names one small step. Keeps Crew action-oriented.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e9d5ff', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e9d5ff', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'miracle') body = renderMiracle();
      else if (view === 'scaling') body = renderScaling();
      else if (view === 'exceptions') body = renderExceptions();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Solution-Focused Brief Therapy' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
