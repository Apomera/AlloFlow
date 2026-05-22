// ═══════════════════════════════════════════════════════════════
// sel_tool_execfunction.js — Executive Function Workshop (v1.0)
// Concrete, skills-based EF instruction for middle-school students,
// especially those with ADHD, anxiety-driven planning paralysis,
// working-memory weakness, or perfectionism. Maps to the Russell
// Barkley + Peg Dawson EF framework. Six tabs: Map (assessment),
// Start (task initiation), Hold (working memory), Plan (backward
// planning), Time (time awareness + Pomodoro), Coach (AI).
// Registered tool ID: "execfunction"
// Category: self-management
// Grade-adaptive: uses ctx.gradeBand for vocabulary & depth
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // Reduced-motion CSS (WCAG 2.3.3) — guards Pomodoro animations and transitions.
  (function() {
    if (document.getElementById('allo-execfunction-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-execfunction-a11y-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { .selh-execfunction *, .selh-execfunction *::before, .selh-execfunction *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-live-execfunction')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-execfunction';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Sound ──
  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (d || 0.15)); } catch(e) {} }
  function sfxClick() { tone(880, 0.04, 'sine', 0.05); }
  function sfxStart() { tone(523, 0.08, 'sine', 0.06); setTimeout(function() { tone(784, 0.12, 'sine', 0.07); }, 80); }
  function sfxDone()  { tone(659, 0.1, 'sine', 0.08); setTimeout(function() { tone(784, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { tone(988, 0.18, 'sine', 0.09); }, 160); }

  // ══════════════════════════════════════════════════════════════
  // ── Content ──
  // ══════════════════════════════════════════════════════════════

  // EF self-assessment: 5 domains, each with 2 statements rated 0-3
  var DOMAINS = [
    { id: 'init',  icon: '🚀', label: 'Starting',
      desc: 'How hard is it to begin a task once you sit down?',
      items: [
        'I sit down to start, then end up on my phone instead.',
        'Starting feels harder than the actual work.'
      ],
      strategy: 'start',
      pitch: 'Task initiation strategies. The 5-minute rule and the future-self letter live here.'
    },
    { id: 'hold',  icon: '🧠', label: 'Working Memory',
      desc: 'How well does your brain hold the thing you are doing?',
      items: [
        'I forget what I was doing mid-task.',
        'If I do not write it down right now, it is gone.'
      ],
      strategy: 'hold',
      pitch: 'Brain dump, capture system, and re-cuing. Externalize everything.'
    },
    { id: 'plan',  icon: '🗺️', label: 'Planning',
      desc: 'How do you handle big projects with multiple steps?',
      items: [
        'Big projects feel like a wall I cannot get past.',
        'I usually start with whatever is loudest, not what is most important.'
      ],
      strategy: 'plan',
      pitch: 'Backward planning workbench. Pick a deadline, break it into chunks.'
    },
    { id: 'time',  icon: '⏱️', label: 'Time',
      desc: 'How accurate is your sense of time passing?',
      items: [
        'I think 30 minutes have passed and it has been 2 hours.',
        'I underestimate how long things actually take.'
      ],
      strategy: 'time',
      pitch: 'Time estimation game and a built-in Pomodoro. Calibrate your inner clock.'
    },
    { id: 'flex',  icon: '🔀', label: 'Flexibility',
      desc: 'How well do you switch between tasks or adjust to changes?',
      items: [
        'When my plan changes, I shut down.',
        'Switching between tasks is exhausting, even when both are easy.'
      ],
      strategy: 'coach',
      pitch: 'Talk it through with the coach. Flexibility is built one shift at a time.'
    }
  ];

  // Task initiation strategies
  var INIT_STRATEGIES = [
    {
      id: '5min', icon: '⏳', title: '5-Minute Rule',
      when: 'You know what to do but cannot start.',
      how: 'Promise yourself only 5 minutes. Set a timer. After 5, you can stop with no guilt. (Most of the time, you keep going.)',
      why: 'The hardest part of any task is the first minute. Once you are in motion, momentum does the work. The promise of "only 5 minutes" lowers the cost of starting until your brain stops resisting.',
      hasTimer: true
    },
    {
      id: 'futureself', icon: '✉️', title: 'Future-Self Letter',
      when: 'You have to start tomorrow morning. You are dreading it.',
      how: 'Write a 2-line note to yourself for tomorrow that says exactly where to start. "Open the math doc. Click on problem 3. Just read it."',
      why: 'Decision-making is the most expensive part of starting. Removing the decision (because past-you already made it) makes initiation almost automatic.',
      hasNote: true
    },
    {
      id: 'lower', icon: '🪜', title: 'Lower the Bar',
      when: 'Perfectionism is freezing you.',
      how: 'Promise yourself you will do it BADLY first. "I will write one bad sentence." "I will do problem 1 wrong." Permission to fail removes the threat.',
      why: 'Your brain treats high-stakes tasks like predator attacks. Lowering the bar tells your nervous system that this is safe. You can edit terrible work; you cannot edit a blank page.'
    },
    {
      id: 'trigger', icon: '🔗', title: 'Stack the Habit',
      when: 'You keep forgetting to start, or putting it off.',
      how: 'Tie the task to something you already do automatically. "After I close my last class tab, I open the homework doc." "After I drink water at my desk, I start problem 1."',
      why: 'Existing habits are wired into your brain like train tracks. Hooking a new task onto an old habit lets you ride those tracks instead of building new ones from scratch.'
    },
    {
      id: 'predecide', icon: '🎯', title: 'Pre-Decide',
      when: 'You have time, but you keep choosing other things.',
      how: 'Make the decision the night before, in writing. "Tomorrow at 4:00 I sit at my desk and open the science doc. No deciding required." Then follow the instructions like a person who is not you.',
      why: 'Willpower is a limited budget that runs out by 4 PM. Past-you with full willpower can spend it for present-you who has none left.'
    },
    {
      id: 'doubling', icon: '👥', title: 'Body Doubling',
      when: 'You cannot make yourself work alone.',
      how: 'Work in the same room as someone else, even silently. A parent at the kitchen table. A friend on a video call who is also doing homework. The presence is the point.',
      why: 'For ADHD brains and anxious brains, the presence of another person quiet alongside you makes initiation easier. This is not a weakness; it is how a lot of human work has always gotten done.'
    }
  ];

  // Working memory tools
  var HOLD_STRATEGIES = [
    {
      id: 'capture', icon: '📥', title: 'The Capture System',
      summary: 'One inbox for every loose thought.',
      body: 'Pick ONE place where every loose thought goes: phone notes, paper notebook, sticky pad on your desk. When something pings your brain ("oh I need to email the teacher"), it goes into the inbox immediately. The brain is for thinking, not storing.'
    },
    {
      id: 'dump', icon: '🌪️', title: 'Brain Dump',
      summary: 'When you feel scattered, externalize everything.',
      body: 'Set a 5-minute timer. Write down EVERY task on your mind. Don\'t organize, don\'t filter. Get it all out of your head and onto paper. The relief is the point. Once it is all visible, you can pick the next thing without your brain running 47 background processes.',
      interactive: true
    },
    {
      id: 'threelists', icon: '📋', title: 'Three Lists',
      summary: 'Today, This Week, Someday.',
      body: 'Most people try to keep one master list. It always gets too long. Instead: TODAY (3 things, max), THIS WEEK (a handful), SOMEDAY (everything else, no pressure). Most things live on Someday forever, and that is fine.'
    },
    {
      id: 'anchor', icon: '⚓', title: 'Mid-Task Anchor',
      summary: 'When interrupted, write down where you are.',
      body: 'About to be pulled away from a task? Before you stand up, write down literally where you stopped. "Step 3, looking up x in chapter 2." "Last sentence I wrote was about the second cause of WWI." When you sit back down, your past-self left a map.'
    },
    {
      id: 'recue', icon: '🔄', title: 'Re-Cue Aloud',
      summary: 'Say what you are doing before you stand up.',
      body: 'Before standing up to get water or grab a charger, say out loud what you will do when you sit back down. "I am coming back to write the third paragraph." Saying it engages a different memory system than thinking it. The cue stays louder.'
    }
  ];

  // Time estimation game items (with typical actual ranges in minutes)
  var TIME_GAME = {
    elementary: [
      { id: 't1', task: 'Brush your teeth (well)', actualMin: 2, actualMax: 3 },
      { id: 't2', task: 'Read one chapter of a chapter book', actualMin: 15, actualMax: 25 },
      { id: 't3', task: 'Get dressed for school', actualMin: 5, actualMax: 10 },
      { id: 't4', task: 'Eat breakfast (sit-down meal)', actualMin: 10, actualMax: 20 },
      { id: 't5', task: 'Do 10 math problems', actualMin: 15, actualMax: 25 }
    ],
    middle: [
      { id: 'm1', task: 'Write one rough paragraph (5 sentences)', actualMin: 10, actualMax: 20 },
      { id: 'm2', task: 'Read one chapter of a textbook (carefully)', actualMin: 25, actualMax: 45 },
      { id: 'm3', task: 'Do 20 math problems', actualMin: 30, actualMax: 60 },
      { id: 'm4', task: 'Start, distract, refocus, finish a homework set', actualMin: 60, actualMax: 120 },
      { id: 'm5', task: 'Make and pack lunch from scratch', actualMin: 10, actualMax: 20 },
      { id: 'm6', task: 'Take a "quick" shower', actualMin: 8, actualMax: 15 }
    ],
    high: [
      { id: 'h1', task: 'Write a polished one-page essay (planning + drafting + editing)', actualMin: 60, actualMax: 180 },
      { id: 'h2', task: 'Read 30 pages of a novel and take notes', actualMin: 45, actualMax: 90 },
      { id: 'h3', task: 'Solve a calculus problem set of 10 problems', actualMin: 60, actualMax: 150 },
      { id: 'h4', task: 'Make and submit a college application essay', actualMin: 240, actualMax: 600 },
      { id: 'h5', task: 'Drive to a place you have never been (suburban distance)', actualMin: 25, actualMax: 50 }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('execfunction', {
    icon: '🧠',
    label: 'Executive Function',
    desc: 'Strategies for the harder parts of getting things done: starting, holding, planning, and tracking time.',
    color: 'cyan',
    category: 'self-direction',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'middle';

      var d = (ctx.toolData && ctx.toolData.execfunction) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('execfunction', key); }
        else { if (ctx.update) ctx.update('execfunction', key, val); }
      };

      // State
      var activeTab    = d.activeTab || 'map';
      var soundOn      = d.soundOn != null ? d.soundOn : true;
      var mapAnswers   = d.mapAnswers || {}; // { domainId: [score0, score1] }
      var mapDone      = d.mapDone || false;
      var initIdx      = d.initIdx || 0;
      var futureNote   = d.futureNote || '';
      var savedNotes   = d.savedNotes || [];
      var fiveMinStart = d.fiveMinStart || 0; // timestamp
      var holdIdx      = d.holdIdx || 0;
      var brainDump    = d.brainDump || '';
      var brainDumps   = d.brainDumps || [];
      var planGoal     = d.planGoal || '';
      var planDeadline = d.planDeadline || '';
      var planChunks   = d.planChunks || [''];
      var timeGameIdx  = d.timeGameIdx || 0;
      var timeGuess    = d.timeGuess || '';
      var timeRevealed = d.timeRevealed || false;
      var timeScore    = d.timeScore || 0;
      var pomoStart    = d.pomoStart || 0;
      var pomoMode     = d.pomoMode || 'work'; // 'work' | 'break'
      var coachInput   = d.coachInput || '';
      var coachHistory = d.coachHistory || [];
      var coachLoading = d.coachLoading || false;

      var CYAN = '#0891b2'; var CYAN_LIGHT = '#ecfeff'; var CYAN_DARK = '#155e75';

      var TABS = [
        { id: 'map',   icon: '🗺️', label: 'Map' },
        { id: 'start', icon: '🚀', label: 'Start' },
        { id: 'hold',  icon: '🧠', label: 'Hold' },
        { id: 'plan',  icon: '📐', label: 'Plan' },
        { id: 'time',  icon: '⏱️', label: 'Time' },
        { id: 'coach', icon: '🤖', label: 'Coach' }
      ];

      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #cffafe', background: 'linear-gradient(180deg, #f0fdfa, #ecfeff)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + CYAN + ', #06b6d4)', transition: 'width 0.5s ease' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Executive Function sections'
        },
          TABS.map(function(t) {
            var a = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id, role: 'tab',
              'aria-selected': a ? 'true' : 'false',
              'aria-label': t.label,
              onClick: function() { upd('activeTab', t.id); if (soundOn) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? '#cffafe' : 'transparent'), background: a ? 'linear-gradient(135deg, ' + CYAN + ', #0e7490)' : explored ? 'rgba(8,145,178,0.06)' : 'transparent', color: a ? '#fff' : explored ? CYAN_DARK : '#475569', fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(8,145,178,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#67e8f9', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { style: { marginLeft: '8px', fontSize: '10px', color: CYAN, fontWeight: 700, whiteSpace: 'nowrap', background: '#cffafe', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundOn', !soundOn); }, 'aria-label': soundOn ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundOn ? '🔊' : '🔇')
        )
      );

      // ── Map (self-assessment) ──
      var mapContent = null;
      if (activeTab === 'map') {
        var totalQs = DOMAINS.length * 2;
        var answeredQs = 0;
        DOMAINS.forEach(function(dom) { var arr = mapAnswers[dom.id] || []; arr.forEach(function(v) { if (v != null) answeredQs++; }); });
        var allAnswered = answeredQs >= totalQs;

        // Compute domain scores
        var scoreFor = function(dom) {
          var arr = mapAnswers[dom.id] || [];
          var s = 0; arr.forEach(function(v) { if (v != null) s += v; });
          return s; // 0-6
        };
        var sortedByDifficulty = DOMAINS.slice().sort(function(a, b) { return scoreFor(b) - scoreFor(a); });

        mapContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '8px' } }, '🗺️'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Map Your EF'),
            h('p', { style: { fontSize: '13px', color: '#475569', margin: 0 } }, 'Five domains, two questions each. Honest answers point to which strategies will help YOU most.')
          ),

          // Questions
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' } },
            DOMAINS.map(function(dom) {
              var arr = mapAnswers[dom.id] || [];
              return h('div', { key: dom.id, style: { background: '#fff', border: '2px solid #cffafe', borderRadius: '14px', padding: '14px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                  h('span', { style: { fontSize: '22px' } }, dom.icon),
                  h('h4', { style: { fontSize: '14px', fontWeight: 800, color: CYAN_DARK, margin: 0 } }, dom.label)
                ),
                h('p', { style: { fontSize: '11px', color: '#475569', margin: '0 0 10px', fontStyle: 'italic' } }, dom.desc),
                dom.items.map(function(stmt, qi) {
                  return h('div', { key: qi, style: { marginBottom: '10px' } },
                    h('p', { style: { fontSize: '13px', color: '#374151', margin: '0 0 6px', lineHeight: 1.5 } }, stmt),
                    h('div', { style: { display: 'flex', gap: '4px' } },
                      ['Rarely', 'Sometimes', 'Often', 'Always'].map(function(lbl, vi) {
                        var sel = arr[qi] === vi;
                        return h('button', {
                          key: vi,
                          'aria-label': stmt + ': ' + lbl,
                          onClick: function() {
                            var na = mapAnswers[dom.id] ? mapAnswers[dom.id].slice() : [];
                            na[qi] = vi;
                            var nm = Object.assign({}, mapAnswers); nm[dom.id] = na;
                            upd('mapAnswers', nm);
                            if (soundOn) sfxClick();
                          },
                          style: { flex: 1, padding: '6px 4px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', border: sel ? '2px solid ' + CYAN : '1px solid #e5e7eb', background: sel ? CYAN_LIGHT : '#fff', color: sel ? CYAN_DARK : '#475569' }
                        }, lbl);
                      })
                    )
                  );
                })
              );
            })
          ),

          // Results (when all answered)
          allAnswered && h('div', { style: { background: 'linear-gradient(135deg, #ecfeff, #cffafe)', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '16px', marginBottom: '14px' } },
            h('h4', { style: { fontSize: '14px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 10px' } }, '🎯 Your strategy menu'),
            sortedByDifficulty.slice(0, 3).map(function(dom, ri) {
              var s = scoreFor(dom);
              return h('button', {
                key: dom.id,
                onClick: function() { upd('activeTab', dom.strategy); if (soundOn) sfxStart(); if (!mapDone) { upd('mapDone', true); if (awardXP) awardXP(15, 'Mapped your EF profile!'); } },
                'aria-label': 'Open strategies for ' + dom.label,
                style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '10px 12px', background: '#fff', border: '1px solid #cffafe', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer' }
              },
                h('span', { style: { fontSize: '20px' } }, dom.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: CYAN_DARK } }, (ri + 1) + '. ' + dom.label + ' (score: ' + s + '/6)'),
                  h('div', { style: { fontSize: '11px', color: '#475569', marginTop: '2px' } }, dom.pitch)
                ),
                h('span', { style: { fontSize: '14px', color: CYAN } }, '→')
              );
            })
          ),

          !allAnswered && h('p', { style: { fontSize: '11px', color: '#475569', textAlign: 'center', fontStyle: 'italic' } }, 'Answered: ' + answeredQs + ' / ' + totalQs)
        );
      }

      // ── Start (task initiation) ──
      var startContent = null;
      if (activeTab === 'start') {
        var curS = INIT_STRATEGIES[initIdx % INIT_STRATEGIES.length];
        var fiveMinSeconds = fiveMinStart > 0 ? Math.max(0, 300 - Math.floor((Date.now() - fiveMinStart) / 1000)) : 0;
        var fiveMinDone = fiveMinStart > 0 && fiveMinSeconds === 0;
        startContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '🚀'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Get Started'),
            h('p', { style: { fontSize: '13px', color: '#475569', margin: 0 } }, 'Six strategies for the moment between "I should start" and "I am starting."')
          ),
          // Strategy selector pills
          h('div', { style: { display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' } },
            INIT_STRATEGIES.map(function(s, i) {
              var sel = i === initIdx % INIT_STRATEGIES.length;
              return h('button', {
                key: s.id,
                'aria-label': s.title,
                onClick: function() { upd('initIdx', i); if (soundOn) sfxClick(); },
                style: { flexShrink: 0, padding: '8px 12px', borderRadius: '8px', border: sel ? '2px solid ' + CYAN : '1px solid #cffafe', background: sel ? CYAN_LIGHT : '#fff', color: sel ? CYAN_DARK : '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
              }, s.icon + ' ' + s.title);
            })
          ),
          // Strategy detail
          h('div', { style: { background: '#fff', border: '2px solid #cffafe', borderRadius: '14px', padding: '18px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
              h('span', { style: { fontSize: '32px' } }, curS.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: CYAN_DARK, margin: 0 } }, curS.title)
            ),
            h('div', { style: { background: CYAN_LIGHT, borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', borderLeft: '4px solid ' + CYAN } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: CYAN, marginBottom: '2px', textTransform: 'uppercase' } }, 'When this fits:'),
              h('p', { style: { fontSize: '13px', color: CYAN_DARK, margin: 0 } }, curS.when)
            ),
            h('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', borderLeft: '4px solid #4ade80' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a', marginBottom: '2px', textTransform: 'uppercase' } }, 'How to do it:'),
              h('p', { style: { fontSize: '13px', color: '#166534', margin: 0, lineHeight: 1.6 } }, curS.how)
            ),
            h('div', { style: { background: '#fef9c3', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #facc15' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a16207', marginBottom: '2px', textTransform: 'uppercase' } }, 'Why it works:'),
              h('p', { style: { fontSize: '12px', color: '#713f12', margin: 0, lineHeight: 1.6 } }, curS.why)
            )
          ),
          // 5-Minute timer interactive
          curS.hasTimer && h('div', { style: { background: '#fff', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '18px', textAlign: 'center', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Try it now'),
            fiveMinStart === 0 ? h('button', {
              onClick: function() { upd('fiveMinStart', Date.now()); if (soundOn) sfxStart(); if (addToast) addToast('Timer started. 5 minutes only.', 'info'); },
              'aria-label': 'Start 5-minute timer',
              style: { padding: '12px 28px', background: CYAN, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }
            }, '▶ Start 5 minutes') : h('div', null,
              h('div', { style: { fontSize: '36px', fontWeight: 800, color: fiveMinDone ? '#16a34a' : CYAN_DARK, fontVariantNumeric: 'tabular-nums', marginBottom: '6px' } },
                Math.floor(fiveMinSeconds / 60) + ':' + String(fiveMinSeconds % 60).padStart(2, '0')
              ),
              h('p', { style: { fontSize: '11px', color: '#475569', margin: '0 0 10px' } }, fiveMinDone ? '5 minutes done. Stop now or keep going.' : 'Just keep going. The timer is doing the deciding.'),
              h('button', {
                onClick: function() {
                  upd('fiveMinStart', 0);
                  if (fiveMinDone) { if (soundOn) sfxDone(); if (awardXP) awardXP(10, 'You started.'); }
                },
                style: { padding: '8px 18px', background: fiveMinDone ? '#16a34a' : '#e5e7eb', color: fiveMinDone ? '#fff' : '#374151', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, fiveMinDone ? '✓ Done' : 'Stop timer')
            )
          ),
          // Future-self note interactive
          curS.hasNote && h('div', { style: { background: '#fff', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '14px', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Write your future-self note'),
            h('textarea', {
              value: futureNote,
              onChange: function(ev) { upd('futureNote', ev.target.value); },
              'aria-label': 'A 2-line note for tomorrow morning',
              placeholder: 'Tomorrow morning at 8am: open the science doc. Click problem 1. Read it.',
              style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', minHeight: '60px', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('button', {
              onClick: function() {
                if (!futureNote.trim()) return;
                var n = { id: Date.now().toString(), text: futureNote.trim(), date: new Date().toLocaleDateString(), ts: Date.now() };
                upd({ savedNotes: [n].concat(savedNotes), futureNote: '' });
                if (soundOn) sfxStart();
                if (awardXP) awardXP(8, 'Saved a future-self note');
              },
              disabled: !futureNote.trim(),
              style: { marginTop: '8px', padding: '8px 16px', background: futureNote.trim() ? CYAN : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: futureNote.trim() ? 'pointer' : 'not-allowed' }
            }, '💾 Save for tomorrow'),
            savedNotes.length > 0 && h('div', { style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' } },
              savedNotes.slice(0, 5).map(function(n) {
                return h('div', { key: n.id, style: { background: CYAN_LIGHT, padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: CYAN_DARK, position: 'relative' } },
                  h('div', { style: { fontSize: '10px', color: '#475569', marginBottom: '2px' } }, n.date),
                  h('p', { style: { margin: 0, lineHeight: 1.5 } }, n.text),
                  h('button', { onClick: function() { upd('savedNotes', savedNotes.filter(function(s) { return s.id !== n.id; })); }, 'aria-label': 'Delete note', style: { position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '12px' } }, '✕')
                );
              })
            )
          )
        );
      }

      // ── Hold (working memory) ──
      var holdContent = null;
      if (activeTab === 'hold') {
        var curH = HOLD_STRATEGIES[holdIdx % HOLD_STRATEGIES.length];
        holdContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '🧠'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Hold It'),
            h('p', { style: { fontSize: '13px', color: '#475569', margin: 0 } }, 'Working-memory tools. The brain is for thinking, not storing.')
          ),
          h('div', { style: { display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' } },
            HOLD_STRATEGIES.map(function(s, i) {
              var sel = i === holdIdx % HOLD_STRATEGIES.length;
              return h('button', {
                key: s.id,
                'aria-label': s.title,
                onClick: function() { upd('holdIdx', i); if (soundOn) sfxClick(); },
                style: { flexShrink: 0, padding: '8px 12px', borderRadius: '8px', border: sel ? '2px solid ' + CYAN : '1px solid #cffafe', background: sel ? CYAN_LIGHT : '#fff', color: sel ? CYAN_DARK : '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
              }, s.icon + ' ' + s.title);
            })
          ),
          h('div', { style: { background: '#fff', border: '2px solid #cffafe', borderRadius: '14px', padding: '18px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
              h('span', { style: { fontSize: '32px' } }, curH.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: CYAN_DARK, margin: 0 } }, curH.title)
            ),
            h('p', { style: { fontSize: '12px', color: CYAN, fontWeight: 700, fontStyle: 'italic', margin: '0 0 12px' } }, curH.summary),
            h('p', { style: { fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.7 } }, curH.body)
          ),
          curH.interactive && h('div', { style: { background: '#fff', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '14px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Brain dump zone'),
            h('textarea', {
              value: brainDump,
              onChange: function(ev) { upd('brainDump', ev.target.value); },
              'aria-label': 'Brain dump',
              placeholder: 'Every loose thought. Don\'t organize. Don\'t filter. Just dump.',
              style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', minHeight: '120px', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
              h('button', {
                onClick: function() {
                  if (!brainDump.trim()) return;
                  var entry = { id: Date.now().toString(), text: brainDump.trim(), date: new Date().toLocaleDateString(), ts: Date.now() };
                  upd({ brainDumps: [entry].concat(brainDumps), brainDump: '' });
                  if (soundOn) sfxDone();
                  if (awardXP) awardXP(10, 'Brain dumped! Relief.');
                  if (addToast) addToast('Out of your head. Onto the page.', 'success');
                },
                disabled: !brainDump.trim(),
                style: { padding: '8px 16px', background: brainDump.trim() ? CYAN : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: brainDump.trim() ? 'pointer' : 'not-allowed' }
              }, '💾 Save dump'),
              h('button', {
                onClick: function() { upd('brainDump', ''); },
                disabled: !brainDump,
                style: { padding: '8px 12px', background: 'transparent', color: '#475569', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: brainDump ? 'pointer' : 'not-allowed' }
              }, 'Clear')
            ),
            brainDumps.length > 0 && h('div', { style: { marginTop: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN_DARK, marginBottom: '6px' } }, '📥 Past dumps (' + brainDumps.length + ')'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' } },
                brainDumps.slice(0, 10).map(function(b) {
                  return h('div', { key: b.id, style: { background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#374151' } },
                    h('div', { style: { fontSize: '10px', color: '#475569', marginBottom: '2px' } }, b.date),
                    h('p', { style: { margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' } }, b.text.length > 200 ? b.text.slice(0, 200) + '…' : b.text)
                  );
                })
              )
            )
          )
        );
      }

      // ── Plan (backward planning workbench) ──
      var planContent = null;
      if (activeTab === 'plan') {
        var validChunks = planChunks.filter(function(c) { return c.trim().length > 0; });
        var deadlineDate = planDeadline ? new Date(planDeadline + 'T17:00:00') : null;
        var schedule = [];
        if (deadlineDate && validChunks.length > 0) {
          var daysBack = validChunks.length;
          for (var ci = 0; ci < validChunks.length; ci++) {
            var dueOffset = daysBack - 1 - ci; // last chunk = deadline; others walk backward
            var due = new Date(deadlineDate.getTime() - dueOffset * 86400000);
            schedule.push({ chunk: validChunks[ci], due: due });
          }
        }
        planContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '📐'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Backward Planning'),
            h('p', { style: { fontSize: '13px', color: '#475569', margin: 0 } }, 'Start from the deadline. Walk back. Each chunk should be one hour or less.')
          ),
          // Goal
          h('label', { style: { fontSize: '12px', fontWeight: 700, color: CYAN_DARK, display: 'block', marginBottom: '4px' } }, 'The goal'),
          h('input', {
            type: 'text', value: planGoal,
            onChange: function(ev) { upd('planGoal', ev.target.value); },
            'aria-label': 'The goal',
            placeholder: 'Submit science fair project',
            style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '10px' }
          }),
          // Deadline
          h('label', { style: { fontSize: '12px', fontWeight: 700, color: CYAN_DARK, display: 'block', marginBottom: '4px' } }, 'The deadline'),
          h('input', {
            type: 'date', value: planDeadline,
            onChange: function(ev) { upd('planDeadline', ev.target.value); },
            'aria-label': 'Deadline date',
            style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '14px' }
          }),
          // Chunks
          h('label', { style: { fontSize: '12px', fontWeight: 700, color: CYAN_DARK, display: 'block', marginBottom: '4px' } }, 'The chunks (in order)'),
          h('p', { style: { fontSize: '11px', color: '#475569', fontStyle: 'italic', margin: '0 0 8px' } }, 'Last chunk = the deadline. First chunk = today. Each chunk should be one sit-down session, ≤1 hour.'),
          planChunks.map(function(ch, ci) {
            return h('div', { key: ci, style: { display: 'flex', gap: '6px', marginBottom: '6px' } },
              h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '32px', background: CYAN_LIGHT, color: CYAN_DARK, borderRadius: '6px', fontSize: '12px', fontWeight: 800, flexShrink: 0 } }, ci + 1),
              h('input', {
                type: 'text', value: ch,
                onChange: function(ev) { var nc = planChunks.slice(); nc[ci] = ev.target.value; upd('planChunks', nc); },
                'aria-label': 'Chunk ' + (ci + 1),
                placeholder: 'e.g. Read 3 articles, take notes',
                style: { flex: 1, border: '1px solid #cffafe', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              planChunks.length > 1 && h('button', {
                onClick: function() { upd('planChunks', planChunks.filter(function(_, j) { return j !== ci; })); },
                'aria-label': 'Remove chunk',
                style: { padding: '0 10px', background: 'transparent', border: '1px solid #e5e7eb', color: '#9ca3af', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }
              }, '✕')
            );
          }),
          h('button', {
            onClick: function() { upd('planChunks', planChunks.concat([''])); },
            'aria-label': 'Add chunk',
            style: { padding: '6px 12px', background: 'transparent', border: '1px dashed ' + CYAN, color: CYAN_DARK, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, marginBottom: '14px' }
          }, '+ Add chunk'),

          // Schedule output
          schedule.length > 0 && h('div', { style: { background: 'linear-gradient(135deg, #ecfeff, #cffafe)', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '14px' } },
            h('h4', { style: { fontSize: '13px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 10px' } }, '🗓️ Your schedule'),
            h('p', { style: { fontSize: '11px', color: '#475569', fontStyle: 'italic', margin: '0 0 10px' } }, 'Goal: ' + (planGoal || '(name your goal above)')),
            schedule.map(function(s, si) {
              var isLast = si === schedule.length - 1;
              var dt = s.due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return h('div', { key: si, style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: '8px', marginBottom: '6px', border: isLast ? '2px solid ' + CYAN : '1px solid #e5e7eb' } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: isLast ? CYAN : '#475569', flexShrink: 0, minWidth: '90px' } }, dt + (isLast ? ' (deadline)' : '')),
                h('div', { style: { fontSize: '13px', color: '#374151' } }, s.chunk)
              );
            }),
            h('button', {
              onClick: function() {
                var txt = 'Goal: ' + planGoal + '\n' + schedule.map(function(s) { return s.due.toLocaleDateString() + '  ' + s.chunk; }).join('\n');
                try { navigator.clipboard.writeText(txt); if (addToast) addToast('Schedule copied to clipboard.', 'success'); if (awardXP) awardXP(10, 'Made a backward plan!'); } catch(e) {}
              },
              'aria-label': 'Copy schedule',
              style: { marginTop: '6px', padding: '8px 14px', background: CYAN, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
            }, '📋 Copy schedule')
          )
        );
      }

      // ── Time (estimation game + Pomodoro) ──
      var timeContent = null;
      if (activeTab === 'time') {
        var games = TIME_GAME[band] || TIME_GAME.middle;
        var curT = games[timeGameIdx % games.length];
        var pomoRunning = pomoStart > 0;
        var pomoDuration = pomoMode === 'work' ? 25 * 60 : 5 * 60;
        var pomoSeconds = pomoRunning ? Math.max(0, pomoDuration - Math.floor((Date.now() - pomoStart) / 1000)) : pomoDuration;
        var pomoDone = pomoRunning && pomoSeconds === 0;

        timeContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '⏱️'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Time'),
            h('p', { style: { fontSize: '13px', color: '#475569', margin: 0 } }, 'Calibrate your inner clock. Then work in 25-minute chunks.')
          ),
          // Estimation game
          h('div', { style: { background: '#fff', border: '2px solid #cffafe', borderRadius: '14px', padding: '16px', marginBottom: '14px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '8px', textTransform: 'uppercase' } }, 'Estimation game'),
            timeScore > 0 && h('div', { style: { textAlign: 'center', marginBottom: '8px' } },
              h('span', { style: { background: CYAN_LIGHT, color: CYAN_DARK, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 } }, '🎯 ' + timeScore + ' calibrated')
            ),
            h('p', { style: { fontSize: '15px', fontWeight: 700, color: '#374151', margin: '0 0 10px' } }, 'How long does it take to: ' + curT.task + '?'),
            !timeRevealed && h('div', null,
              h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' } },
                h('input', {
                  type: 'number', value: timeGuess,
                  onChange: function(ev) { upd('timeGuess', ev.target.value); },
                  'aria-label': 'Your time estimate in minutes',
                  placeholder: '?',
                  min: '1', max: '600',
                  style: { width: '80px', border: '1px solid #cffafe', borderRadius: '6px', padding: '8px', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }
                }),
                h('span', { style: { fontSize: '13px', color: '#475569' } }, 'minutes'),
                h('button', {
                  onClick: function() {
                    if (!timeGuess) return;
                    var g = parseInt(timeGuess, 10);
                    var inRange = g >= curT.actualMin && g <= curT.actualMax;
                    upd({ timeRevealed: true, timeScore: timeScore + (inRange ? 1 : 0) });
                    if (soundOn) inRange ? sfxDone() : sfxClick();
                    if (inRange && awardXP) awardXP(5, 'Calibrated!');
                  },
                  disabled: !timeGuess,
                  'aria-label': 'Submit estimate',
                  style: { padding: '8px 16px', background: timeGuess ? CYAN : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: timeGuess ? 'pointer' : 'not-allowed' }
                }, 'Reveal')
              )
            ),
            timeRevealed && h('div', null,
              h('div', { style: { background: CYAN_LIGHT, padding: '10px 12px', borderRadius: '8px', marginBottom: '8px' } },
                h('p', { style: { fontSize: '12px', color: CYAN_DARK, margin: '0 0 4px' } }, 'Your guess: ' + timeGuess + ' min'),
                h('p', { style: { fontSize: '12px', color: CYAN_DARK, margin: 0, fontWeight: 700 } }, 'Typical actual: ' + curT.actualMin + '–' + curT.actualMax + ' min')
              ),
              h('button', {
                onClick: function() { upd({ timeGameIdx: (timeGameIdx + 1) % games.length, timeGuess: '', timeRevealed: false }); if (soundOn) sfxClick(); },
                'aria-label': 'Next estimation',
                style: { padding: '8px 16px', background: CYAN, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, 'Next →')
            )
          ),
          // Pomodoro
          h('div', { style: { background: '#fff', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '18px', textAlign: 'center' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Pomodoro: ' + (pomoMode === 'work' ? '25-min work' : '5-min break')),
            h('div', { style: { fontSize: '48px', fontWeight: 800, color: pomoDone ? '#16a34a' : CYAN_DARK, fontVariantNumeric: 'tabular-nums', marginBottom: '10px', letterSpacing: '0.05em' } },
              Math.floor(pomoSeconds / 60) + ':' + String(pomoSeconds % 60).padStart(2, '0')
            ),
            !pomoRunning ? h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
              h('button', {
                onClick: function() { upd({ pomoStart: Date.now(), pomoMode: 'work' }); if (soundOn) sfxStart(); },
                'aria-label': 'Start 25-minute work session',
                style: { padding: '10px 18px', background: CYAN, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }
              }, '▶ Start work (25)'),
              h('button', {
                onClick: function() { upd({ pomoStart: Date.now(), pomoMode: 'break' }); if (soundOn) sfxStart(); },
                'aria-label': 'Start 5-minute break',
                style: { padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }
              }, '☕ Start break (5)')
            ) : h('button', {
              onClick: function() { upd('pomoStart', 0); if (pomoDone) { if (soundOn) sfxDone(); if (awardXP) awardXP(pomoMode === 'work' ? 15 : 5, 'Pomodoro done.'); } },
              'aria-label': 'Stop pomodoro',
              style: { padding: '10px 18px', background: pomoDone ? '#16a34a' : '#e5e7eb', color: pomoDone ? '#fff' : '#374151', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
            }, pomoDone ? '✓ Done' : 'Stop')
          )
        );
      }

      // ── Coach (AI) ──
      var coachContent = null;
      if (activeTab === 'coach') {
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;
        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now());
          });
        } else {
          coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
              h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '🤖'),
              h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'EF Coach'),
              h('p', { style: { fontSize: '13px', color: '#475569', margin: 0 } }, 'Tell me what is hard right now. I will name the EF domain and give you ONE thing to try.')
            ),
            coachHistory.length > 0 && h('div', {
              role: 'log', 'aria-label': 'Coach conversation', 'aria-live': 'polite',
              'aria-busy': coachLoading ? 'true' : 'false',
              style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }
            },
              coachHistory.map(function(msg, i) {
                var isUser = msg.role === 'user';
                return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                  h('div', { style: { maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? '#f1f5f9' : CYAN_LIGHT, border: '1px solid ' + (isUser ? '#e2e8f0' : '#cffafe'), fontSize: '13px', lineHeight: 1.6, color: '#1f2937' } },
                    isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '4px' } }, '🗣️ You'),
                    !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: CYAN, marginBottom: '4px' } }, '🤖 EF Coach'),
                    msg.text
                  )
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('input', {
                type: 'text', value: coachInput,
                onChange: function(ev) { upd('coachInput', ev.target.value); },
                onKeyDown: function(ev) {
                  if (ev.key === 'Enter' && coachInput.trim() && !coachLoading && callGemini) {
                    var msg = coachInput.trim();
                    var hist = (coachHistory || []).concat([{ role: 'user', text: msg }]);
                    upd({ coachHistory: hist, coachInput: '', coachLoading: true });
                    var p = 'You are an executive function coach for a ' + band + ' school student. They said: "' + msg + '"\n\nDo three things, briefly:\n1. Name the EF domain at play (initiation, working memory, planning, time, or flexibility) in one sentence.\n2. Validate that this is a common EF struggle (not a character flaw).\n3. Offer ONE specific, concrete thing they can try in the next 10 minutes. Pick from: 5-minute rule, brain dump, lower-the-bar, future-self note, body doubling, Pomodoro, or backward planning. Be specific to their situation.\n\nWarm and direct. Max 4 sentences total.';
                    if (window.SelHub && window.SelHub.safeCoach) {
                      window.SelHub.safeCoach({ studentMessage: msg, coachPrompt: p, toolId: 'execfunction', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: hist }).then(function(result) { upd({ coachHistory: hist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); if (awardXP) awardXP(5, 'Asked for EF help'); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'I am having trouble connecting. But here is the thing: noticing that something is hard is itself an EF skill. That awareness is the start of any strategy.' }]), coachLoading: false }); });
                    } else {
                      callGemini(p, false).then(function(r) { upd({ coachHistory: hist.concat([{ role: 'coach', text: r }]), coachLoading: false }); if (awardXP) awardXP(5, 'Asked for EF help'); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'I am having trouble connecting. But here is the thing: noticing that something is hard is itself an EF skill. That awareness is the start of any strategy.' }]), coachLoading: false }); });
                    }
                  }
                },
                disabled: coachLoading || !callGemini,
                placeholder: coachLoading ? 'Coach is thinking...' : 'What is hard right now?',
                'aria-label': 'Tell the coach what is hard',
                style: { flex: 1, border: '2px solid #cffafe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                onClick: function() {
                  if (!coachInput.trim() || coachLoading || !callGemini) return;
                  var msg = coachInput.trim();
                  var hist = (coachHistory || []).concat([{ role: 'user', text: msg }]);
                  upd({ coachHistory: hist, coachInput: '', coachLoading: true });
                  var p = 'EF coach for ' + band + ' student. They said: "' + msg + '" Name the EF domain, validate it is common, offer ONE specific 10-minute strategy. Max 4 sentences.';
                  if (window.SelHub && window.SelHub.safeCoach) {
                    window.SelHub.safeCoach({ studentMessage: msg, coachPrompt: p, toolId: 'execfunction', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: hist }).then(function(result) { upd({ coachHistory: hist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'Connection issue. Notice: you reached out for help. That alone is an EF win.' }]), coachLoading: false }); });
                  } else {
                    callGemini(p, false).then(function(r) { upd({ coachHistory: hist.concat([{ role: 'coach', text: r }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'Connection issue. Notice: you reached out for help. That alone is an EF win.' }]), coachLoading: false }); });
                  }
                },
                disabled: coachLoading || !coachInput.trim() || !callGemini,
                'aria-label': 'Send to coach',
                style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? CYAN : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
              }, coachLoading ? '⏳' : '→')
            ),
            coachHistory.length === 0 && h('div', { style: { marginTop: '14px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' } }, 'Try one of these:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                [
                  'I have a project due Friday and I cannot start',
                  'I lose track of what I was doing every 5 minutes',
                  'My plan changed and now I am frozen'
                ].map(function(p) {
                  return h('button', {
                    key: p, 'aria-label': 'Use prompt: ' + p, onClick: function() { upd('coachInput', p); },
                    style: { padding: '5px 10px', background: CYAN_LIGHT, border: '1px solid #cffafe', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: CYAN_DARK, fontWeight: 500 }
                  }, p);
                })
              )
            )
          );
        }
      }

      var content = mapContent || startContent || holdContent || planContent || timeContent || coachContent;
      return h('div', { className: 'selh-execfunction', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
