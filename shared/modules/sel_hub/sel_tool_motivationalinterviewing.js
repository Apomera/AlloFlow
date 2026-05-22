// ═══════════════════════════════════════════════════════════════
// sel_tool_motivationalinterviewing.js — Motivational Interviewing
// MI (Miller & Rollnick, 1991 onward) is a conversation style for
// helping someone change something they are ambivalent about. The
// core skills are OARS — Open questions, Affirmations, Reflections,
// Summaries. The core diagnostic tools are the three Rulers —
// Importance, Confidence, Readiness. Plus learning to hear Change
// Talk vs Sustain Talk.
//
// Useful as: a peer-support framework, a self-coaching tool,
// a counselor skill-builder.
//
// Registered tool ID: "motivationalInterviewing"
// Category: relationship-skills
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('motivationalInterviewing'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-mi')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-mi';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // OARS — the four core MI skills
  var OARS = [
    {
      id: 'open',
      letter: 'O',
      label: 'Open Questions',
      color: '#0ea5e9',
      icon: '❓',
      blurb: 'Open questions cannot be answered with yes/no. They invite the person to think and to talk. They give YOU information, and they give THEM a chance to hear themselves.',
      examples: [
        'What is it that is making you think about changing this?',
        'What would your life look like if this got better?',
        'How did you handle a hard thing like this before?',
        'What is the part of this that feels hardest right now?'
      ],
      antiExamples: [
        'Don\'t you think you should ___?',
        'You\'re going to ___, right?',
        'Are you ready to change?',
        'Have you tried ___?'
      ],
      whyAvoid: 'Closed questions feel like an interrogation. They make the conversation about what the helper thinks, not what the person thinks.'
    },
    {
      id: 'affirm',
      letter: 'A',
      label: 'Affirmations',
      color: '#22c55e',
      icon: '🌟',
      blurb: 'Affirmations name specific strengths or efforts you actually see. They are NOT compliments and NOT flattery. They are: "I notice this specific thing about you, and it matters."',
      examples: [
        '"It took something to come talk to me about this."',
        '"You\'ve been thinking about this for a while; that\'s not nothing."',
        '"Even when you slipped last week, you got back to it."',
        '"You really care about your sister. I see that."'
      ],
      antiExamples: [
        '"You\'re doing great!"',
        '"You\'re so strong!"',
        '"I\'m so proud of you!"',
        '"You can do anything!"'
      ],
      whyAvoid: 'Generic praise feels hollow and patronizing. Specific affirmations land because they are observation, not encouragement.'
    },
    {
      id: 'reflect',
      letter: 'R',
      label: 'Reflections',
      color: '#a855f7',
      icon: '🪞',
      blurb: 'Reflections are when you say back what you heard, in your own words. This is the single most important MI skill. It tells the person they were heard, and it lets them either confirm or correct.',
      examples: [
        '"So you want to change this, and you also love how it feels when you\'re doing it."',
        '"You\'re torn — part of you knows it\'s hurting you, and part of you doesn\'t want to give it up."',
        '"It sounds like the hardest part isn\'t the thing itself, it\'s feeling like a failure if you try and don\'t make it."',
        '"You\'re saying the relationship is fine, AND you haven\'t been sleeping for two months. Both can be true."'
      ],
      antiExamples: [
        '"I know exactly how you feel."',
        '"You should think about it this way..."',
        '"Have you tried ___?"',
        '(silence)'
      ],
      whyAvoid: 'Skipping reflection to give advice almost always ends the conversation. People who feel unheard stop talking.'
    },
    {
      id: 'summarize',
      letter: 'S',
      label: 'Summaries',
      color: '#f59e0b',
      icon: '📝',
      blurb: 'Summaries gather what the person has said into a paragraph and hand it back to them. Used periodically, especially at the end. They show you were listening AND they reflect the whole picture back, including contradictions.',
      examples: [
        '"Let me say back what I\'m hearing. You\'re ___, you\'re also ___, and the part you\'re wrestling with is ___. Is that close?"',
        '"So we\'ve been talking about ___, and you said three things matter most: ___, ___, and ___. Did I miss anything?"',
        '"Here\'s where it sounds like you are: you want ___, you\'re not sure about ___, and the smallest move that feels possible right now is ___."'
      ],
      antiExamples: [
        '(end the conversation without summary)',
        '"OK well good luck!"',
        '"So you\'re going to do ___, right?"'
      ],
      whyAvoid: 'Without a summary, the person leaves the conversation without a sense of what they discovered. Summarizing gives the work a shape.'
    }
  ];

  // The three rulers
  var RULERS = [
    { id: 'importance', label: 'Importance', color: '#0ea5e9', icon: '⭐',
      question: 'On a scale of 0 to 10, how important is it to you to change this?',
      followUp: 'Why a [your number] and not a [number - 2]? What makes it that important?' },
    { id: 'confidence', label: 'Confidence', color: '#22c55e', icon: '💪',
      question: 'On a scale of 0 to 10, how confident are you that you COULD change this if you decided to?',
      followUp: 'What would it take to bump that up by 1 or 2 points?' },
    { id: 'readiness',  label: 'Readiness',  color: '#a855f7', icon: '🚪',
      question: 'On a scale of 0 to 10, how READY are you to actually try changing this?',
      followUp: 'What would need to be in place before you would be ready to take a first step?' }
  ];

  function defaultState() {
    return {
      view: 'home',
      practiceScenarios: 0,  // count of practice exchanges
      personalChange: '',    // a change the user is working on themselves
      myRulers: {},          // {importance: 0-10, confidence, readiness}
      myReflection: '',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('motivationalInterviewing', {
    icon: '👂',
    label: 'Motivational Interviewing',
    desc: 'A conversation framework for helping someone (or yourself) think through a change. Learn OARS skills (Open questions, Affirmations, Reflections, Summaries), the three rulers (Importance, Confidence, Readiness), and how to hear Change Talk. From Miller and Rollnick; the most-evidenced behavior-change communication framework in mental health.',
    color: 'blue',
    category: 'relationship-skills',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.motivationalInterviewing || defaultState();
      function setMI(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.motivationalInterviewing) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { motivationalInterviewing: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setMI({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#93c5fd', fontSize: 22, fontWeight: 900 } }, '👂 Motivational Interviewing'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A conversation style for helping someone think through a change.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '👂' },
          { id: 'oars', label: 'OARS skills', icon: '🚣' },
          { id: 'rulers', label: 'The rulers', icon: '📏' },
          { id: 'changetalk', label: 'Change talk', icon: '🗣️' },
          { id: 'self', label: 'On myself', icon: '🪞' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Motivational Interviewing sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#3b82f6' : '#334155'),
                background: active ? 'rgba(59,130,246,0.18)' : '#1e293b',
                color: active ? '#bfdbfe' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'MI is a peer-support and self-coaching framework, not a substitute for counseling. If a peer is talking about hurting themselves, hurting someone else, or being unsafe — that goes to an adult, not into an MI conversation. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(59,130,246,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(59,130,246,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#bfdbfe', marginBottom: 4 } }, 'Help comes from listening, not from advice.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'Most well-meaning advice fails because people who are ambivalent about a change do not need MORE reasons — they need to hear themselves think out loud, with someone who is curious about THEIR reasons. That is what MI is. Practiced well, it sounds simple. It is one of the most powerful conversation skills there is.'
            )
          ),

          // The spirit
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #3b82f6', marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '🧭 The spirit of MI (the part underneath all the skills)'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, h('strong', null, 'Partnership'), ' — you are walking with them, not leading them.'),
              h('li', null, h('strong', null, 'Acceptance'), ' — they are whole, not broken; their experience is valid; their right to make their own choice is real.'),
              h('li', null, h('strong', null, 'Compassion'), ' — you actually want what is best for them, separate from what is best for you.'),
              h('li', null, h('strong', null, 'Evocation'), ' — what they need is already in them; you are drawing it out, not putting it in.')
            )
          ),

          // Roadmap
          stepCard('🚣 OARS — the four core skills', 'Open questions, Affirmations, Reflections, Summaries. The vocabulary of every MI conversation.', function() { goto('oars'); }, '#0ea5e9'),
          stepCard('📏 The three rulers', 'Importance, Confidence, Readiness. Quick diagnostic for where someone actually is.', function() { goto('rulers'); }, '#22c55e'),
          stepCard('🗣 Change talk vs sustain talk', 'Learn to hear when someone\'s words are pointing toward change. Then help them say more.', function() { goto('changetalk'); }, '#a855f7'),
          stepCard('🪞 MI on yourself', 'Use the framework to think through a change YOU are working on.', function() { goto('self'); }, '#f59e0b'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // OARS
      // ═══════════════════════════════════════════════════════════
      function renderOARS() {
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.10)', borderTop: '1px solid rgba(59,130,246,0.3)', borderRight: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', marginBottom: 14, fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.65 } },
            h('strong', null, '🚣 OARS '),
            'is the basic vocabulary of MI. Most of an MI conversation is OARS plus the rulers. Learning to recognize and use each is the single biggest skill upgrade.'
          ),

          OARS.map(function(skill) {
            return h('div', { key: skill.id, style: { padding: 16, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + skill.color, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 26 } }, skill.icon),
                h('span', { style: { fontSize: 22, fontWeight: 900, color: skill.color, fontFamily: 'ui-monospace, monospace' } }, skill.letter),
                h('span', { style: { fontSize: 17, fontWeight: 800, color: skill.color } }, skill.label)
              ),
              h('p', { style: { margin: '0 0 12px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } }, skill.blurb),

              // Examples
              h('div', { style: { padding: 12, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '✓ Good examples'),
                h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } },
                  skill.examples.map(function(ex, i) { return h('li', { key: i, style: { marginBottom: 4 } }, ex); })
                )
              ),

              // Anti-examples
              h('div', { style: { padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)' } },
                h('div', { style: { fontSize: 11, color: '#fecaca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '✕ NOT this'),
                h('ul', { style: { margin: '0 0 8px', padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } },
                  skill.antiExamples.map(function(ex, i) { return h('li', { key: i, style: { marginBottom: 4 } }, ex); })
                ),
                h('div', { style: { fontSize: 11.5, color: '#fde68a', lineHeight: 1.6, fontStyle: 'italic', paddingTop: 6, borderTop: '1px solid rgba(239,68,68,0.3)' } }, 'Why avoid: ' + skill.whyAvoid)
              )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RULERS
      // ═══════════════════════════════════════════════════════════
      function renderRulers() {
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.10)', borderTop: '1px solid rgba(59,130,246,0.3)', borderRight: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', marginBottom: 14, fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.65 } },
            h('strong', null, '📏 The three rulers '),
            'are quick diagnostics: where is this person, REALLY? They surface things that "do you want to change?" never surfaces. The KEY MOVE in all three: ask "why a [their number] and not [their number minus 2]?" The answer is gold.'
          ),

          RULERS.map(function(r) {
            return h('div', { key: r.id, style: { padding: 16, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + r.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 24 } }, r.icon),
                h('span', { style: { fontSize: 16, fontWeight: 800, color: r.color } }, r.label + ' ruler')
              ),
              h('div', { style: { padding: 12, borderRadius: 6, background: '#1e293b', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 1: ask'),
                h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 } }, r.question)
              ),
              h('div', { style: { padding: 12, borderRadius: 6, background: '#1e293b' } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 2: the magic follow-up'),
                h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 } }, r.followUp)
              )
            );
          }),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginTop: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '🔑 Why the follow-up matters: '),
            'If someone says "5 out of 10 important" and you ask "why a 5 and not a 3?" — they will tell you reasons FOR change (because they actually do care, hence the 5 and not the 3). If you ask "why a 5 and not an 8?" they will tell you reasons AGAINST change (sustain talk). MI deliberately asks the first question, because reasons FOR change strengthen the desire to change. The wording of the question is doing real work.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CHANGE TALK
      // ═══════════════════════════════════════════════════════════
      function renderChangeTalk() {
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.10)', borderTop: '1px solid rgba(59,130,246,0.3)', borderRight: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', marginBottom: 14, fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.65 } },
            h('strong', null, '🗣 Change talk '),
            'is when the person\'s OWN words are pointing toward change. Sustain talk is when they are pointing AWAY from change. The single biggest MI move: notice change talk, then ask them to say more about it.'
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 } },
            h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid #22c55e' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 8 } }, '✓ Change talk sounds like:'),
              h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } },
                h('li', null, '"I want to..."  (desire)'),
                h('li', null, '"I could..."  (ability)'),
                h('li', null, '"I should... / I need to..."  (reasons / need)'),
                h('li', null, '"I\'m going to..."  (commitment)'),
                h('li', null, '"I tried..."  (action)'),
                h('li', null, '"I started..."  (taking steps)')
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid #ef4444' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fecaca', marginBottom: 8 } }, '✕ Sustain talk sounds like:'),
              h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } },
                h('li', null, '"I can\'t..."'),
                h('li', null, '"It\'s not that bad..."'),
                h('li', null, '"I\'ve tried before, it didn\'t work."'),
                h('li', null, '"Now is not the right time."'),
                h('li', null, '"It\'s not my fault, it\'s ___\'s fault."'),
                h('li', null, '"Other people have it worse."')
              )
            )
          ),

          // The move
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 10, fontSize: 13.5, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', { style: { fontSize: 14 } }, '🎯 The MI move:'),
            h('p', { style: { margin: '6px 0 0' } },
              'When you hear change talk, RESPOND to it. Reflect it back. Ask for more. "You said you want to be more present with your family — tell me more about that." Change talk grows when it is reflected; it shrinks when it is ignored.'),
            h('p', { style: { margin: '6px 0 0', fontStyle: 'italic' } },
              'When you hear sustain talk, do NOT argue with it. That just hardens the position. Reflect it neutrally ("So part of you isn\'t ready"), then move on. The next change talk will come if you listen for it.')
          ),

          // Common trap
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', fontSize: 13, color: '#fecaca', lineHeight: 1.7 } },
            h('strong', null, '⚠️ The "righting reflex" — '),
            'when someone says "I shouldn\'t but I keep doing it," our instinct is to argue FOR the change. ("Yeah you really shouldn\'t! Here\'s why...") This usually makes them argue HARDER for sustain. Their internal debate flips because YOU took the change side, so they take the other. MI deliberately avoids this. You voice neither side; the person voices BOTH and works it out.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SELF — MI on yourself
      // ═══════════════════════════════════════════════════════════
      function renderSelf() {
        function setRuler(id, value) {
          var r = Object.assign({}, (d.myRulers || {}));
          r[id] = value;
          setMI({ myRulers: r });
        }

        var r = d.myRulers || {};

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '🪞 MI on yourself. '),
            'You can use this framework to think through a change you are working on. Three rulers, then write a reflection that uses the MI move: name change talk, do not argue with sustain talk.'
          ),

          // What are you working on
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #3b82f6', marginBottom: 14 } },
            h('label', { htmlFor: 'mi-change', style: { display: 'block', fontSize: 12, color: '#93c5fd', fontWeight: 800, marginBottom: 6 } }, 'A change I am thinking about'),
            h('input', { id: 'mi-change', type: 'text', value: d.personalChange || '',
              placeholder: 'e.g. I want to stop scrolling at night so I can sleep.',
              onChange: function(e) { setMI({ personalChange: e.target.value }); },
              style: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5 } })
          ),

          // Three rulers
          RULERS.map(function(rk) {
            var v = r[rk.id];
            return h('div', { key: rk.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + rk.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 18 } }, rk.icon),
                h('span', { style: { fontSize: 13, fontWeight: 800, color: rk.color } }, rk.label)
              ),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 6, fontStyle: 'italic' } }, rk.question),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                h('input', { type: 'range', min: 0, max: 10, value: v !== undefined ? v : 5,
                  onChange: function(e) { setRuler(rk.id, parseInt(e.target.value, 10)); },
                  style: { flex: 1, minWidth: 180 }, 'aria-label': rk.label + ' rating' }),
                h('span', { style: { fontSize: 18, fontWeight: 900, color: rk.color, minWidth: 50, textAlign: 'right' } }, v !== undefined ? v + '/10' : '–')
              ),
              v !== undefined ? h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginTop: 8, lineHeight: 1.6, fontStyle: 'italic' } },
                'Why a ' + v + ' and not a ' + Math.max(0, v - 2) + '? ' + rk.followUp.replace('[your number]', v)) : null
            );
          }),

          // Reflection
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('label', { htmlFor: 'mi-reflection', style: { display: 'block', fontSize: 12, color: '#fcd34d', fontWeight: 800, marginBottom: 6 } }, 'What I am noticing'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Try this structure: One sentence of WHY this matters to me. One sentence about what is making it hard. One sentence about what would be a small, doable first move.'),
            h('textarea', { id: 'mi-reflection', value: d.myReflection || '',
              placeholder: 'This matters to me because... It\'s hard because... A small first move would be...',
              onChange: function(e) { setMI({ myReflection: e.target.value }); },
              style: { width: '100%', minHeight: 120, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('motivationalInterviewing', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, 'What MI is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Motivational Interviewing is a conversation style designed for moments when someone is ambivalent about changing something. The core insight: when people are torn between two options, MORE pressure from outside (advice, warnings, threats) tends to make them dig in HARDER for the option they\'re already defending. MI works by getting OUT of the persuasion role and INTO the listening role, letting the person hear themselves think.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The skills (OARS) and the diagnostics (the rulers, change-talk recognition) are concrete and learnable. With practice, MI is a real change-conversation skill that\'s useful for school counseling, peer support, mentoring, and even self-coaching.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, 'Where MI comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Motivational Interviewing was developed by clinical psychologist William R. Miller in the 1980s, originally for working with people with alcohol use disorder. Miller and his collaborator Stephen Rollnick formalized MI in a series of books (1991, 2002, 2012, 2023). MI has accumulated one of the strongest evidence bases of any conversation-based intervention: hundreds of randomized controlled trials across addiction, smoking cessation, weight management, medication adherence, chronic disease, and adolescent risk behaviors. It is now used widely in school counseling, public health, social work, and primary care.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Miller, W. R. and Rollnick, S. (2023)', 'Motivational Interviewing: Helping People Change and Grow (4th ed.), Guilford Press', 'The foundational and current text on MI.', null),
            sourceCard('Naar, S. and Suarez, M. (2021)', 'Motivational Interviewing with Adolescents and Young Adults (2nd ed.), Guilford Press', 'MI adapted for youth contexts; widely used in school health and counseling.', null),
            sourceCard('Rosengren, D. B. (2017)', 'Building Motivational Interviewing Skills: A Practitioner Workbook (2nd ed.), Guilford Press', 'Practical workbook for learning OARS and reflective listening.', null),
            sourceCard('Motivational Interviewing Network of Trainers (MINT)', 'motivationalinterviewing.org', 'The international MI trainer network. Free resources and training listings.', 'https://motivationalinterviewing.org/'),
            sourceCard('SAMHSA TIP 35 (Substance Abuse and Mental Health Services Administration)', 'Enhancing Motivation for Change in Substance Use Disorder Treatment', 'Free US federal practice manual on MI; downloadable PDF.', 'https://store.samhsa.gov/product/TIP-35-Enhancing-Motivation-for-Change-in-Substance-Use-Disorder-Treatment/PEP19-02-01-003'),
            sourceCard('Lundahl, B. et al. (2013)', '"Motivational interviewing in medical care settings: A systematic review and meta-analysis of randomized controlled trials," Patient Education and Counseling, 93(2), 157-168', 'Meta-analytic review of MI outcomes.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'MI is for ambivalence. If someone is in genuine danger or unable to make a decision (crisis, severe intoxication, psychosis), MI is NOT the right tool. Safety first; MI later, if appropriate.'),
              h('li', null, 'MI presumes the person has SOME agency over the change. For changes that are not actually in their control (a family situation, a school placement, a chronic illness), MI can feel mismatched. It works better for behaviors than for circumstances.'),
              h('li', null, 'MI is harder than it looks. Reading about OARS is not the same as doing it well. Most clinicians take many supervised practice hours to become skilled. For students learning MI as a peer-support tool, plan on multiple practice sessions, not one.'),
              h('li', null, 'For some students, especially those with significant trauma histories, the open-question + reflection approach can feel intrusive. Pacing and consent ("would it be okay if I asked you about that?") matters.'),
              h('li', null, 'MI is not a substitute for clinical care for severe substance use, eating disorders, or suicidality. It is an adjunct.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.10)', borderTop: '1px solid rgba(59,130,246,0.3)', borderRight: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'MI is the strongest framework for any peer-helper training. A productive sequence for Crew or advisory: Week 1, OARS skills with examples. Week 2, the three rulers with practice partners. Week 3, change talk vs sustain talk. Week 4, role-play scenarios. Pair with the Peer Support tool in this SEL Hub. For counselors and school psychs, the SAMHSA TIP 35 is free and excellent.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#93c5fd', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#bfdbfe', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#bfdbfe', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — personal-change reflection, MI rulers + summary
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var r = d.myRulers || {};
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(59,130,246,0.10)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'MI self-reflection — useful for a counselor session, peer support practice, or your own records.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'mi-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#mi-print-region, #mi-print-region * { visibility: visible !important; } ' +
              '#mi-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #2563eb' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Motivational Interviewing · Self-Reflection'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, d.personalChange || 'My MI reflection'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            d.personalChange ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🎯 Change I am thinking about'),
              h('p', { style: { margin: '0 0 0 12px', color: '#0f172a', fontSize: 13.5, lineHeight: 1.7 } }, d.personalChange)
            ) : null,

            // Rulers
            (r.importance !== undefined || r.confidence !== undefined || r.readiness !== undefined) ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#0ea5e9', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📏 The three rulers'),
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: '#0f172a' } },
                h('tbody', null,
                  r.importance !== undefined ? h('tr', null,
                    h('td', { style: { padding: '6px 12px', fontWeight: 700, width: '40%' } }, '⭐ Importance'),
                    h('td', { style: { padding: '6px 12px', fontWeight: 800, color: '#0ea5e9' } }, r.importance + ' / 10')
                  ) : null,
                  r.confidence !== undefined ? h('tr', { style: { borderTop: '1px solid #e2e8f0' } },
                    h('td', { style: { padding: '6px 12px', fontWeight: 700 } }, '💪 Confidence (if I tried)'),
                    h('td', { style: { padding: '6px 12px', fontWeight: 800, color: '#22c55e' } }, r.confidence + ' / 10')
                  ) : null,
                  r.readiness !== undefined ? h('tr', { style: { borderTop: '1px solid #e2e8f0' } },
                    h('td', { style: { padding: '6px 12px', fontWeight: 700 } }, '🚪 Readiness'),
                    h('td', { style: { padding: '6px 12px', fontWeight: 800, color: '#a855f7' } }, r.readiness + ' / 10')
                  ) : null
                )
              )
            ) : null,

            d.myReflection ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#a855f7', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🪞 My reflection'),
              h('p', { style: { margin: '0 0 0 12px', color: '#0f172a', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, d.myReflection)
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Motivational Interviewing framework: Miller and Rollnick (2023). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'oars') body = renderOARS();
      else if (view === 'rulers') body = renderRulers();
      else if (view === 'changetalk') body = renderChangeTalk();
      else if (view === 'self') body = renderSelf();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Motivational Interviewing' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
