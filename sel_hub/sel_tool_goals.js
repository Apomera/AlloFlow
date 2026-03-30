// ═══════════════════════════════════════════════════════════════
// sel_tool_goals.js — Goal Setter Plugin (v1.0)
// SMART goals builder, progress tracker, milestone celebrations,
// habit streak counter, AI goal coach, vision board,
// and achievement badges.
// Registered tool ID: "goals"
// Category: self-management
// Grade-adaptive: elementary/middle/high
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _audioCtx; }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try { var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol || 0.1, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.15)); } catch(e) {}
  }
  function sfxAdd() { playTone(523, 0.08, 'sine', 0.07); setTimeout(function() { playTone(659, 0.1, 'sine', 0.07); }, 70); }
  function sfxComplete() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.12); }, 160); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.1); }, 280); }
  function sfxBadge() { playTone(784, 0.1, 'sine', 0.1); setTimeout(function() { playTone(988, 0.1, 'sine', 0.12); }, 100); setTimeout(function() { playTone(1175, 0.2, 'sine', 0.14); }, 220); setTimeout(function() { playTone(1568, 0.3, 'sine', 0.1); }, 360); }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxStep() { playTone(440, 0.06, 'triangle', 0.06); setTimeout(function() { playTone(554, 0.08, 'triangle', 0.06); }, 50); }
  function sfxStreak() { playTone(660, 0.08, 'sine', 0.08); setTimeout(function() { playTone(880, 0.1, 'sine', 0.1); }, 70); }

  // ═══════════════════════════════════════════════════════════════
  // ── Goal Categories & Templates ──
  // ═══════════════════════════════════════════════════════════════
  var GOAL_CATEGORIES = [
    { id: 'academic', label: 'Academic', emoji: '\uD83D\uDCDA', color: '#6366f1' },
    { id: 'social', label: 'Social & Friendship', emoji: '\uD83E\uDD1D', color: '#f59e0b' },
    { id: 'personal', label: 'Personal Growth', emoji: '\uD83C\uDF31', color: '#22c55e' },
    { id: 'health', label: 'Health & Wellness', emoji: '\uD83D\uDCAA', color: '#ef4444' },
    { id: 'creative', label: 'Creative', emoji: '\uD83C\uDFA8', color: '#a855f7' },
    { id: 'community', label: 'Community', emoji: '\uD83C\uDF0D', color: '#06b6d4' }
  ];

  var GOAL_TEMPLATES = {
    elementary: [
      { cat: 'academic', text: 'Read ___ books this month', hint: 'Pick a number you can reach!' },
      { cat: 'academic', text: 'Raise my ___ grade by practicing every day', hint: 'What subject do you want to improve?' },
      { cat: 'social', text: 'Make a new friend by saying hi to someone new', hint: 'One hello can change a whole day!' },
      { cat: 'social', text: 'Say something kind to someone every day this week', hint: 'Kindness is a superpower!' },
      { cat: 'personal', text: 'Try one new thing I\'ve never done before', hint: 'Trying new things helps your brain grow!' },
      { cat: 'personal', text: 'Take 3 deep breaths when I feel frustrated', hint: 'Deep breaths help your brain calm down.' },
      { cat: 'health', text: 'Drink ___ glasses of water every day', hint: 'Your brain works better when you\'re hydrated!' },
      { cat: 'health', text: 'Go outside and play for 30 minutes every day', hint: 'Movement makes you feel happier!' },
      { cat: 'creative', text: 'Draw or color for 15 minutes every day', hint: 'Art helps you express feelings!' },
      { cat: 'community', text: 'Help with one chore at home without being asked', hint: 'Being helpful makes everyone\'s day better!' }
    ],
    middle: [
      { cat: 'academic', text: 'Study for ___ minutes each day using a timer', hint: 'Consistency beats cramming!' },
      { cat: 'academic', text: 'Complete all homework before ___ PM', hint: 'A deadline keeps you focused.' },
      { cat: 'academic', text: 'Ask at least one question in class this week', hint: 'Curiosity is a strength, not a weakness.' },
      { cat: 'social', text: 'Start a conversation with someone outside my friend group', hint: 'Expanding your circle builds empathy.' },
      { cat: 'social', text: 'Compliment someone genuinely every day', hint: 'Specific compliments mean more than generic ones.' },
      { cat: 'personal', text: 'Journal for 5 minutes before bed each night', hint: 'Writing clarifies thinking.' },
      { cat: 'personal', text: 'Identify my emotion 3 times a day using the Emotion Zones', hint: 'Naming it tames it!' },
      { cat: 'health', text: 'Get 8+ hours of sleep on school nights', hint: 'Sleep is when your brain processes what you learned.' },
      { cat: 'health', text: 'Limit screen time to ___ hours on weekdays', hint: 'Balance is key.' },
      { cat: 'creative', text: 'Start a creative project (art, music, writing, coding)', hint: 'Creating something from nothing is powerful!' },
      { cat: 'community', text: 'Volunteer for ___ hours this month', hint: 'Helping others helps you find purpose.' }
    ],
    high: [
      { cat: 'academic', text: 'Maintain a ___ GPA this semester through daily study habits', hint: 'Systems > willpower.' },
      { cat: 'academic', text: 'Research 3 colleges/programs aligned with my interests', hint: 'Clarity reduces anxiety.' },
      { cat: 'social', text: 'Practice active listening in one conversation per day', hint: 'Listen to understand, not to respond.' },
      { cat: 'social', text: 'Set a healthy boundary with someone this week', hint: 'Boundaries are acts of self-respect.' },
      { cat: 'personal', text: 'Develop a morning routine and follow it for 21 days', hint: 'Habits compound. Small + consistent = transformative.' },
      { cat: 'personal', text: 'Identify one limiting belief and actively challenge it', hint: 'Your narrative shapes your reality.' },
      { cat: 'health', text: 'Exercise 3+ times per week for 30+ minutes', hint: 'Exercise is the most underused antidepressant.' },
      { cat: 'health', text: 'Practice one mindfulness technique daily for 2 weeks', hint: 'Meditation rewires your brain for resilience.' },
      { cat: 'creative', text: 'Complete and share one creative project this month', hint: 'Shipping beats perfecting.' },
      { cat: 'community', text: 'Organize or participate in a community service project', hint: 'Leadership is action, not title.' },
      { cat: 'community', text: 'Mentor a younger student in something I\'m good at', hint: 'Teaching is the highest form of understanding.' }
    ]
  };

  // ── SMART criteria for the builder ──
  var SMART_LABELS = {
    S: { label: 'Specific', desc: 'What exactly will you do?', emoji: '\uD83C\uDFAF', placeholder: { elementary: 'I will...', middle: 'I will specifically...', high: 'The precise action I\'ll take is...' } },
    M: { label: 'Measurable', desc: 'How will you know you did it?', emoji: '\uD83D\uDCCF', placeholder: { elementary: 'I will know because...', middle: 'I\'ll measure success by...', high: 'The measurable indicator of success is...' } },
    A: { label: 'Achievable', desc: 'Is this realistic for you right now?', emoji: '\u2705', placeholder: { elementary: 'I can do this because...', middle: 'This is achievable because...', high: 'Resources and capabilities I have...' } },
    R: { label: 'Relevant', desc: 'Why does this matter to you?', emoji: '\u2764\uFE0F', placeholder: { elementary: 'This matters because...', middle: 'This connects to my values because...', high: 'This aligns with my larger purpose because...' } },
    T: { label: 'Time-bound', desc: 'When will you complete it?', emoji: '\u23F0', placeholder: { elementary: 'I will finish by...', middle: 'My deadline is...', high: 'Target completion date and milestones...' } }
  };

  // ── Badges ──
  var BADGES = {
    firstGoal: { icon: '\uD83C\uDFAF', name: 'Goal Setter', desc: 'Create your first goal' },
    threeGoals: { icon: '\uD83D\uDCCB', name: 'Planner', desc: 'Create 3 goals' },
    firstComplete: { icon: '\u2705', name: 'Goal Crusher', desc: 'Complete your first goal' },
    threeComplete: { icon: '\uD83C\uDFC6', name: 'Achiever', desc: 'Complete 3 goals' },
    smartGoal: { icon: '\uD83E\uDDE0', name: 'SMART Thinker', desc: 'Fill all 5 SMART fields' },
    firstStep: { icon: '\uD83D\uDC63', name: 'First Step', desc: 'Complete a step toward a goal' },
    tenSteps: { icon: '\uD83D\uDE80', name: 'Momentum', desc: 'Complete 10 total steps' },
    streak3: { icon: '\uD83D\uDD25', name: 'On Fire', desc: 'Check in 3 days in a row' },
    streak7: { icon: '\u2B50', name: 'Unstoppable', desc: '7-day check-in streak' },
    allCategories: { icon: '\uD83C\uDF08', name: 'Balanced Life', desc: 'Goals in 3+ categories' },
    aiCoach: { icon: '\uD83E\uDD16', name: 'Coach Chat', desc: 'Ask the AI goal coach' },
    reflection: { icon: '\uD83D\uDCDD', name: 'Reflector', desc: 'Write a goal reflection' }
  };

  function checkBadges(d, awardXP, addToast) {
    var earned = d.badges || {};
    var goals = d.goals || [];
    var completedGoals = goals.filter(function(g) { return g.completed; });
    var totalSteps = 0;
    goals.forEach(function(g) { (g.steps || []).forEach(function(s) { if (s.done) totalSteps++; }); });
    var changed = false;
    function award(id) {
      if (!BADGES[id] || earned[id]) return;
      earned[id] = true; changed = true;
      sfxBadge();
      if (awardXP) awardXP(10);
      if (addToast) addToast(BADGES[id].icon + ' Badge: ' + BADGES[id].name + ' \u2014 ' + BADGES[id].desc, 'success');
    }
    if (goals.length >= 1) award('firstGoal');
    if (goals.length >= 3) award('threeGoals');
    if (completedGoals.length >= 1) award('firstComplete');
    if (completedGoals.length >= 3) award('threeComplete');
    if (goals.some(function(g) { return g.smart && g.smart.S && g.smart.M && g.smart.A && g.smart.R && g.smart.T; })) award('smartGoal');
    if (totalSteps >= 1) award('firstStep');
    if (totalSteps >= 10) award('tenSteps');
    if ((d.streak || 0) >= 3) award('streak3');
    if ((d.streak || 0) >= 7) award('streak7');
    var cats = {};
    goals.forEach(function(g) { if (g.category) cats[g.category] = true; });
    if (Object.keys(cats).length >= 3) award('allCategories');
    if (d.aiAsked) award('aiCoach');
    if (d.hasReflection) award('reflection');
    return changed ? earned : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ═══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('goals', {
    icon: '\uD83D\uDCCB',
    label: 'Goal Setter',
    desc: 'Set SMART goals, track progress, and celebrate milestones.',
    color: 'indigo',
    category: 'self-management',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var toolData = ctx.toolData;
      var setToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var t = ctx.t || function(k) { return k; };

      return (function() {
        var d = (toolData && toolData.goals_tool) || {};
        var upd = function(obj) {
          setToolData(function(prev) {
            var s = Object.assign({}, (prev && prev.goals_tool) || {}, obj);
            return Object.assign({}, prev, { goals_tool: s });
          });
        };

        var band = (function() {
          var g = parseInt(gradeLevel) || 5;
          if (g <= 5) return 'elementary';
          if (g <= 8) return 'middle';
          return 'high';
        })();

        var tab = d.tab || 'goals';
        var goals = d.goals || [];
        var editingGoal = d.editingGoal || null;
        var showTemplates = d.showTemplates || false;
        var badges = d.badges || {};
        var badgeCount = Object.keys(badges).length;
        var showBadges = d.showBadges || false;
        var streak = d.streak || 0;
        var lastCheckin = d.lastCheckin || null;
        var aiResponse = d.aiResponse || '';
        var aiLoading = d.aiLoading || false;
        var aiInput = d.aiInput || '';

        // ── Badge check ──
        React.useEffect(function() {
          var newBadges = checkBadges(d, awardXP, addToast);
          if (newBadges) upd({ badges: newBadges });
        }, [goals.length, streak, d.aiAsked, d.hasReflection]);

        // ── Streak check on mount ──
        React.useEffect(function() {
          var today = new Date().toDateString();
          if (lastCheckin === today) return;
          var yesterday = new Date(Date.now() - 86400000).toDateString();
          if (lastCheckin === yesterday) {
            upd({ streak: streak + 1, lastCheckin: today });
            sfxStreak();
            if (addToast) addToast('\uD83D\uDD25 Day ' + (streak + 1) + ' streak! Keep going!', 'info');
          } else if (lastCheckin) {
            upd({ streak: 1, lastCheckin: today });
          } else {
            upd({ streak: 1, lastCheckin: today });
          }
        }, []);

        // ── Helpers ──
        var speak = function(text) {
          if (callTTS) callTTS(text).then(function(url) { if (url) { var a = new Audio(url); a.play().catch(function() {}); } }).catch(function() {});
        };

        var updateGoal = function(goalId, patch) {
          var next = goals.map(function(g) { return g.id === goalId ? Object.assign({}, g, patch) : g; });
          upd({ goals: next });
        };

        var deleteGoal = function(goalId) {
          upd({ goals: goals.filter(function(g) { return g.id !== goalId; }) });
        };

        var addGoal = function(text, category) {
          sfxAdd();
          var newGoal = {
            id: 'goal-' + Date.now(),
            text: text || '',
            category: category || 'personal',
            smart: { S: '', M: '', A: '', R: '', T: '' },
            steps: [],
            progress: 0,
            completed: false,
            createdAt: Date.now(),
            reflections: []
          };
          upd({ goals: goals.concat([newGoal]), editingGoal: newGoal.id });
        };

        var toggleStep = function(goalId, stepIdx) {
          sfxStep();
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            var steps = g.steps.map(function(s, i) { return i === stepIdx ? Object.assign({}, s, { done: !s.done }) : s; });
            var doneCount = steps.filter(function(s) { return s.done; }).length;
            var progress = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
            var completed = progress === 100 && steps.length > 0;
            if (completed && !g.completed) {
              sfxComplete();
              if (awardXP) awardXP(20);
              if (addToast) addToast('\uD83C\uDF89 Goal completed: ' + g.text + '! +20 XP', 'success');
            }
            return Object.assign({}, g, { steps: steps, progress: progress, completed: completed });
          });
          upd({ goals: next });
        };

        var addStep = function(goalId, text) {
          if (!text.trim()) return;
          sfxClick();
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            return Object.assign({}, g, { steps: g.steps.concat([{ text: text.trim(), done: false }]) });
          });
          upd({ goals: next });
        };

        var askAI = function() {
          if (!callGemini || aiLoading) return;
          sfxClick();
          var question = aiInput.trim() || 'Help me with my goals.';
          var goalSummary = goals.length > 0 ? goals.map(function(g) { return g.text + ' (' + g.progress + '% done, ' + (g.steps || []).length + ' steps)'; }).join('; ') : 'No goals yet';
          var prompt = 'You are an encouraging, practical goal coach for a ' + band + ' school student (grade: ' + gradeLevel + '). ' +
            'Their current goals: ' + goalSummary + '. Streak: ' + streak + ' days. ' +
            'Their question: "' + question + '"\n\n' +
            'Respond in 2-3 sentences. Be specific and actionable. ' +
            (band === 'elementary' ? 'Use simple, warm language.' : band === 'middle' ? 'Be relatable and motivating.' : 'Be thoughtful and strategic.');
          upd({ aiLoading: true, aiInput: '' });
          callGemini(prompt, false, false, 0.8).then(function(resp) {
            upd({ aiResponse: resp || 'Keep going! Every step counts.', aiLoading: false, aiAsked: true });
          }).catch(function() {
            upd({ aiResponse: 'Coach unavailable. Remember: progress > perfection!', aiLoading: false });
          });
        };

        var templates = GOAL_TEMPLATES[band] || GOAL_TEMPLATES.elementary;
        var activeGoals = goals.filter(function(g) { return !g.completed; });
        var completedGoals = goals.filter(function(g) { return g.completed; });
        var editGoal = editingGoal ? goals.find(function(g) { return g.id === editingGoal; }) : null;
        var accentColor = '#6366f1';

        // ═══════════════════════════════════════════════════════════
        // ── UI ──
        // ═══════════════════════════════════════════════════════════
        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(135deg, #312e81, #4338ca)', borderBottom: '1px solid rgba(99,102,241,0.3)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', { onClick: function() { ctx.setSelHubTool && ctx.setSelHubTool(null); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' } }, '\u2190 Back'),
              h('div', { style: { fontWeight: 'bold', fontSize: 16, color: '#c7d2fe' } }, '\uD83D\uDCCB Goal Setter'),
              streak > 0 ? h('span', { style: { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.3)' } }, '\uD83D\uDD25 ' + streak + '-day streak') : null
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 'bold' } }, '\uD83C\uDFAF ' + activeGoals.length + ' active'),
              h('button', { onClick: function() { upd({ showBadges: !showBadges }); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '3px 8px', color: '#c4b5fd', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFC5 ' + badgeCount)
            )
          ),

          // Tabs
          h('div', { style: { display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.8)' } },
            [{ id: 'goals', label: '\uD83C\uDFAF Goals' }, { id: 'smart', label: '\uD83E\uDDE0 SMART Builder' }, { id: 'coach', label: '\uD83E\uDD16 Coach' }, { id: 'progress', label: '\uD83D\uDCCA Progress' }].map(function(tb) {
              var active = tab === tb.id;
              return h('button', { key: tb.id, onClick: function() { sfxClick(); upd({ tab: tb.id }); }, style: { flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 'bold', color: active ? '#a5b4fc' : '#64748b', background: active ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent', cursor: 'pointer' } }, tb.label);
            })
          ),

          // Badge panel
          showBadges ? h('div', { style: { padding: 12, background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.15)' } },
            h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 8 } }, '\uD83C\uDFC5 Badges \u2014 ' + badgeCount + '/' + Object.keys(BADGES).length),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(BADGES).map(function(id) {
                var b = BADGES[id]; var e = !!badges[id];
                return h('div', { key: id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: e ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', border: e ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(99,102,241,0.1)', opacity: e ? 1 : 0.5, fontSize: 10 } },
                  h('span', null, e ? b.icon : '\uD83D\uDD12'), h('span', { style: { fontWeight: 'bold', color: e ? '#c4b5fd' : '#64748b' } }, b.name)
                );
              })
            )
          ) : null,

          // Content
          h('div', { style: { flex: 1, overflow: 'auto', padding: 16 } },

            // ── GOALS TAB ──
            tab === 'goals' ? h('div', null,
              // Add goal button + templates toggle
              h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
                h('button', { onClick: function() { addGoal('', 'personal'); }, style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' } }, '+ New Goal'),
                h('button', { onClick: function() { upd({ showTemplates: !showTemplates }); }, style: { padding: '10px 16px', borderRadius: 10, background: showTemplates ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: showTemplates ? '#a5b4fc' : '#94a3b8', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDCA1 Templates')
              ),
              // Templates
              showTemplates ? h('div', { style: { marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' } },
                h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#818cf8', marginBottom: 8 } }, 'Goal Templates \u2014 tap to add'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  templates.map(function(tmpl, ti) {
                    var cat = GOAL_CATEGORIES.find(function(c) { return c.id === tmpl.cat; }) || GOAL_CATEGORIES[0];
                    return h('button', { key: ti, onClick: function() { addGoal(tmpl.text, tmpl.cat); upd({ showTemplates: false }); }, title: tmpl.hint, style: { padding: '6px 12px', borderRadius: 8, background: cat.color + '15', border: '1px solid ' + cat.color + '33', color: cat.color, fontSize: 11, cursor: 'pointer', textAlign: 'left' } },
                      cat.emoji + ' ' + tmpl.text
                    );
                  })
                )
              ) : null,
              // Active goals
              activeGoals.length === 0 && completedGoals.length === 0 ?
                h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83C\uDFAF'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, band === 'elementary' ? 'No goals yet! Tap the button above to set your first goal.' : 'Ready to set meaningful goals? Start above or use a template.'),
                  h('p', { style: { fontSize: 11, color: '#64748b', marginTop: 4 } }, 'Goals with steps are easier to achieve!')
                ) : null,
              activeGoals.map(function(goal) {
                var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                var isEditing = editingGoal === goal.id;
                return h('div', { key: goal.id, style: { padding: 14, marginBottom: 10, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid ' + cat.color + '33', transition: 'all 0.15s' } },
                  // Goal header
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('span', { style: { fontSize: 18 } }, cat.emoji),
                    isEditing ?
                      h('input', { type: 'text', value: goal.text, onChange: function(e) { updateGoal(goal.id, { text: e.target.value }); }, autoFocus: true, style: { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid ' + cat.color + '44', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, outline: 'none' } }) :
                      h('span', { style: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#e2e8f0', cursor: 'pointer' }, onClick: function() { upd({ editingGoal: goal.id }); } }, goal.text || 'Tap to name your goal...'),
                    h('select', { value: goal.category, onChange: function(e) { updateGoal(goal.id, { category: e.target.value }); }, style: { padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#94a3b8', fontSize: 10, cursor: 'pointer' } },
                      GOAL_CATEGORIES.map(function(c) { return h('option', { key: c.id, value: c.id }, c.emoji + ' ' + c.label); })
                    ),
                    h('button', { onClick: function() { deleteGoal(goal.id); }, style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 4 } }, '\u2715')
                  ),
                  // Progress bar
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      h('div', { style: { width: goal.progress + '%', height: '100%', background: 'linear-gradient(90deg, ' + cat.color + ', ' + cat.color + 'cc)', borderRadius: 4, transition: 'width 0.3s' } })
                    ),
                    h('span', { style: { fontSize: 11, fontWeight: 'bold', color: cat.color, minWidth: 32, textAlign: 'right' } }, goal.progress + '%')
                  ),
                  // Steps
                  (goal.steps || []).map(function(step, si) {
                    return h('div', { key: si, onClick: function() { toggleStep(goal.id, si); }, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 4, borderRadius: 6, background: step.done ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' } },
                      h('span', { style: { fontSize: 14 } }, step.done ? '\u2705' : '\u2B1C'),
                      h('span', { style: { fontSize: 12, color: step.done ? '#6ee7b7' : '#cbd5e1', textDecoration: step.done ? 'line-through' : 'none' } }, step.text)
                    );
                  }),
                  // Add step input
                  h('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
                    h('input', { type: 'text', placeholder: band === 'elementary' ? 'Add a step...' : 'Add a step toward this goal...', onKeyDown: function(e) { if (e.key === 'Enter' && e.target.value.trim()) { addStep(goal.id, e.target.value); e.target.value = ''; } }, style: { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 11, outline: 'none' } }),
                    h('button', { onClick: function() { var inp = document.querySelector('[placeholder*="step"]'); if (inp && inp.value.trim()) { addStep(goal.id, inp.value); inp.value = ''; } }, style: { padding: '6px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: 'none', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '+')
                  )
                );
              }),
              // Completed goals
              completedGoals.length > 0 ? h('div', { style: { marginTop: 20 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#34d399', marginBottom: 8 } }, '\u2705 Completed (' + completedGoals.length + ')'),
                completedGoals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  return h('div', { key: goal.id, style: { padding: 10, marginBottom: 6, borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', opacity: 0.8 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', null, cat.emoji),
                      h('span', { style: { fontSize: 12, color: '#6ee7b7', textDecoration: 'line-through' } }, goal.text),
                      h('span', { style: { marginLeft: 'auto', fontSize: 10, color: '#34d399' } }, '\uD83C\uDF89 Done!')
                    )
                  );
                })
              ) : null
            ) : null,

            // ── SMART BUILDER TAB ──
            tab === 'smart' ? h('div', null,
              h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 } },
                band === 'elementary' ? 'SMART goals help you think clearly about what you want to do. Fill in each section!' :
                'SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound. Select a goal and build it out.'
              ),
              goals.length === 0 ?
                h('div', { style: { textAlign: 'center', padding: 30 } },
                  h('p', { style: { color: '#64748b' } }, 'Create a goal first, then come here to make it SMART!'),
                  h('button', { onClick: function() { upd({ tab: 'goals' }); addGoal('', 'personal'); }, style: { marginTop: 8, padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '+ Create Goal')
                ) :
                h('div', null,
                  // Goal selector
                  h('select', { value: editingGoal || '', onChange: function(e) { upd({ editingGoal: e.target.value }); }, style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, marginBottom: 12 } },
                    h('option', { value: '' }, '-- Select a goal --'),
                    goals.map(function(g) { return h('option', { key: g.id, value: g.id }, g.text || '(unnamed goal)'); })
                  ),
                  editGoal ? h('div', null,
                    h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 12 } }, '\uD83E\uDDE0 SMART Breakdown: ' + (editGoal.text || '(unnamed)')),
                    ['S', 'M', 'A', 'R', 'T'].map(function(key) {
                      var info = SMART_LABELS[key];
                      var val = (editGoal.smart && editGoal.smart[key]) || '';
                      return h('div', { key: key, style: { marginBottom: 12, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                          h('span', { style: { fontSize: 16 } }, info.emoji),
                          h('span', { style: { fontSize: 13, fontWeight: 'bold', color: '#a5b4fc' } }, key + ' \u2014 ' + info.label),
                          val ? h('span', { style: { marginLeft: 'auto', color: '#34d399', fontSize: 10 } }, '\u2713') : null
                        ),
                        h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, info.desc),
                        h('textarea', { value: val, onChange: function(e) {
                          var newSmart = Object.assign({}, editGoal.smart || {});
                          newSmart[key] = e.target.value;
                          updateGoal(editGoal.id, { smart: newSmart });
                        }, placeholder: info.placeholder[band] || info.placeholder.elementary, style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' } })
                      );
                    }),
                    // SMART completeness indicator
                    (function() {
                      var filled = ['S','M','A','R','T'].filter(function(k) { return editGoal.smart && editGoal.smart[k] && editGoal.smart[k].trim(); }).length;
                      return h('div', { style: { textAlign: 'center', padding: 10, borderRadius: 8, background: filled === 5 ? 'rgba(52,211,153,0.1)' : 'rgba(99,102,241,0.06)', border: '1px solid ' + (filled === 5 ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.1)') } },
                        h('div', { style: { fontSize: 12, fontWeight: 'bold', color: filled === 5 ? '#34d399' : '#94a3b8' } }, filled === 5 ? '\u2705 SMART goal complete!' : filled + '/5 SMART fields filled'),
                        h('div', { style: { display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 } },
                          ['S','M','A','R','T'].map(function(k) {
                            var done = editGoal.smart && editGoal.smart[k] && editGoal.smart[k].trim();
                            return h('div', { key: k, style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#22c55e22' : 'rgba(255,255,255,0.04)', border: done ? '2px solid #22c55e' : '1px solid rgba(99,102,241,0.15)', color: done ? '#22c55e' : '#64748b', fontSize: 11, fontWeight: 'bold' } }, k);
                          })
                        )
                      );
                    })()
                  ) : null
                )
            ) : null,

            // ── COACH TAB ──
            tab === 'coach' ? h('div', null,
              h('div', { style: { textAlign: 'center', padding: 16 } },
                h('div', { style: { fontSize: 40, marginBottom: 8 } }, '\uD83E\uDD16'),
                h('p', { style: { fontSize: 12, color: '#94a3b8', maxWidth: 400, margin: '0 auto 12px', lineHeight: 1.6 } },
                  band === 'elementary' ? 'I\'m your Goal Coach! Ask me for help making plans and staying on track!' :
                  'AI Goal Coach \u2014 get personalized advice on setting, tracking, and achieving your goals.'
                )
              ),
              aiResponse ? h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: '#c7d2fe' } },
                h('div', { style: { fontSize: 10, color: '#818cf8', fontWeight: 'bold', marginBottom: 4 } }, '\uD83E\uDD16 Goal Coach'),
                aiResponse,
                callTTS ? h('button', { onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: '#818cf8', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
              ) : null,
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', { type: 'text', value: aiInput, onChange: function(e) { upd({ aiInput: e.target.value }); }, onKeyDown: function(e) { if (e.key === 'Enter') askAI(); }, placeholder: 'Ask about your goals...', style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, outline: 'none' } }),
                h('button', { onClick: askAI, disabled: aiLoading, style: { padding: '10px 16px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3' : '\u2191')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 } },
                (band === 'elementary' ? ['How do I start?', 'I\'m stuck on my goal', 'Make my goal easier', 'Give me a fun challenge'] :
                 ['Break my goal into smaller steps', 'I keep procrastinating', 'Is my goal realistic?', 'How do I stay motivated?', 'Help me reframe my goal as SMART']).map(function(q) {
                  return h('button', { key: q, onClick: function() { upd({ aiInput: q }); }, style: { padding: '5px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, q);
                })
              )
            ) : null,

            // ── PROGRESS TAB ──
            tab === 'progress' ? h('div', null,
              h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 12 } }, '\uD83D\uDCCA Your Progress'),
              // Stats grid
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 } },
                [
                  { val: goals.length, label: 'Total Goals', color: '#6366f1', emoji: '\uD83C\uDFAF' },
                  { val: completedGoals.length, label: 'Completed', color: '#22c55e', emoji: '\u2705' },
                  { val: streak, label: 'Day Streak', color: '#f59e0b', emoji: '\uD83D\uDD25' },
                  { val: badgeCount, label: 'Badges', color: '#a855f7', emoji: '\uD83C\uDFC5' }
                ].map(function(s, si) {
                  return h('div', { key: si, style: { textAlign: 'center', padding: 12, borderRadius: 10, background: s.color + '11', border: '1px solid ' + s.color + '33' } },
                    h('div', { style: { fontSize: 10, marginBottom: 4 } }, s.emoji),
                    h('div', { style: { fontSize: 22, fontWeight: 'bold', color: s.color } }, String(s.val)),
                    h('div', { style: { fontSize: 9, color: '#64748b' } }, s.label)
                  );
                })
              ),
              // Category distribution
              h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, 'Goals by Category'),
              GOAL_CATEGORIES.map(function(cat) {
                var count = goals.filter(function(g) { return g.category === cat.id; }).length;
                if (count === 0) return null;
                return h('div', { key: cat.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 14, width: 24 } }, cat.emoji),
                  h('span', { style: { fontSize: 11, color: '#94a3b8', width: 80 } }, cat.label),
                  h('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' } },
                    h('div', { style: { width: Math.round(count / Math.max(1, goals.length) * 100) + '%', height: '100%', background: cat.color, borderRadius: 4 } })
                  ),
                  h('span', { style: { fontSize: 11, fontWeight: 'bold', color: cat.color, width: 20, textAlign: 'right' } }, String(count))
                );
              }),
              // Goal progress list
              goals.length > 0 ? h('div', { style: { marginTop: 16 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, 'Individual Goal Progress'),
                goals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  return h('div', { key: goal.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)' } },
                    h('span', null, cat.emoji),
                    h('span', { style: { flex: 1, fontSize: 11, color: goal.completed ? '#6ee7b7' : '#cbd5e1', textDecoration: goal.completed ? 'line-through' : 'none' } }, goal.text || '(unnamed)'),
                    h('div', { style: { width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' } },
                      h('div', { style: { width: goal.progress + '%', height: '100%', background: goal.completed ? '#22c55e' : cat.color, borderRadius: 3 } })
                    ),
                    h('span', { style: { fontSize: 10, fontWeight: 'bold', color: goal.completed ? '#22c55e' : cat.color, width: 28, textAlign: 'right' } }, goal.progress + '%')
                  );
                })
              ) : null
            ) : null
          )
        );
      })();
    }
  });

  console.log('[SelHub] sel_tool_goals.js loaded \u2014 Goal Setter');
})();
