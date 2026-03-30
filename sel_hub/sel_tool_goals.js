// ═══════════════════════════════════════════════════════════════
// sel_tool_goals.js — Goal Setter Plugin (v3.0)
// SMART goals builder, progress tracker, milestone celebrations,
// habit streak counter, AI goal coach, vision board,
// goal reflection journal, habit tracker, goal buddy system,
// motivational boosts, achievement badges, weekly check-ins,
// category dashboard, goal milestones, daily nudges,
// and accountability partner enhancements.
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
      { cat: 'academic', text: 'Learn 5 new vocabulary words each week', hint: 'Big words start small!' },
      { cat: 'social', text: 'Make a new friend by saying hi to someone new', hint: 'One hello can change a whole day!' },
      { cat: 'social', text: 'Say something kind to someone every day this week', hint: 'Kindness is a superpower!' },
      { cat: 'social', text: 'Include someone who is sitting alone at lunch', hint: 'Everyone deserves a friend!' },
      { cat: 'personal', text: 'Try one new thing I\'ve never done before', hint: 'Trying new things helps your brain grow!' },
      { cat: 'personal', text: 'Take 3 deep breaths when I feel frustrated', hint: 'Deep breaths help your brain calm down.' },
      { cat: 'personal', text: 'Write in my journal every day for a week', hint: 'Writing helps you understand your feelings!' },
      { cat: 'personal', text: 'Save $___ from my allowance this month', hint: 'Saving is a grown-up superpower!' },
      { cat: 'health', text: 'Drink ___ glasses of water every day', hint: 'Your brain works better when you\'re hydrated!' },
      { cat: 'health', text: 'Go outside and play for 30 minutes every day', hint: 'Movement makes you feel happier!' },
      { cat: 'health', text: 'Learn to cook one new recipe with a grown-up', hint: 'Cooking is a life skill and it\'s fun!' },
      { cat: 'creative', text: 'Draw or color for 15 minutes every day', hint: 'Art helps you express feelings!' },
      { cat: 'creative', text: 'Learn a new song or dance this week', hint: 'Music and movement are brain boosters!' },
      { cat: 'community', text: 'Help with one chore at home without being asked', hint: 'Being helpful makes everyone\'s day better!' },
      { cat: 'community', text: 'Pick up 5 pieces of litter at school or outside', hint: 'Small actions make a big difference!' }
    ],
    middle: [
      { cat: 'academic', text: 'Study for ___ minutes each day using a timer', hint: 'Consistency beats cramming!' },
      { cat: 'academic', text: 'Complete all homework before ___ PM', hint: 'A deadline keeps you focused.' },
      { cat: 'academic', text: 'Ask at least one question in class this week', hint: 'Curiosity is a strength, not a weakness.' },
      { cat: 'academic', text: 'Build a portfolio of my best work this semester', hint: 'Tracking your growth builds confidence!' },
      { cat: 'academic', text: 'Read 1 book per month outside of school assignments', hint: 'Readers are leaders!' },
      { cat: 'social', text: 'Start a conversation with someone outside my friend group', hint: 'Expanding your circle builds empathy.' },
      { cat: 'social', text: 'Compliment someone genuinely every day', hint: 'Specific compliments mean more than generic ones.' },
      { cat: 'social', text: 'Practice saying no when I\'m uncomfortable', hint: 'Your voice matters.' },
      { cat: 'personal', text: 'Journal for 5 minutes before bed each night', hint: 'Writing clarifies thinking.' },
      { cat: 'personal', text: 'Identify my emotion 3 times a day using the Emotion Zones', hint: 'Naming it tames it!' },
      { cat: 'personal', text: 'Start a side project I\'m excited about', hint: 'Passion projects build skills and confidence!' },
      { cat: 'health', text: 'Get 8+ hours of sleep on school nights', hint: 'Sleep is when your brain processes what you learned.' },
      { cat: 'health', text: 'Limit screen time to ___ hours on weekdays', hint: 'Balance is key.' },
      { cat: 'health', text: 'Try a new healthy recipe each week', hint: 'You are what you eat!' },
      { cat: 'creative', text: 'Start a creative project (art, music, writing, coding)', hint: 'Creating something from nothing is powerful!' },
      { cat: 'creative', text: 'Learn a new skill on YouTube (coding, drawing, music)', hint: 'Free learning is everywhere!' },
      { cat: 'community', text: 'Volunteer for ___ hours this month', hint: 'Helping others helps you find purpose.' },
      { cat: 'community', text: 'Organize a study group for a difficult class', hint: 'Teaching others helps you learn too!' }
    ],
    high: [
      { cat: 'academic', text: 'Maintain a ___ GPA this semester through daily study habits', hint: 'Systems > willpower.' },
      { cat: 'academic', text: 'Research 3 colleges/programs aligned with my interests', hint: 'Clarity reduces anxiety.' },
      { cat: 'academic', text: 'Develop a study system (Cornell notes, spaced repetition, etc.)', hint: 'How you study matters more than how long.' },
      { cat: 'social', text: 'Practice active listening in one conversation per day', hint: 'Listen to understand, not to respond.' },
      { cat: 'social', text: 'Set a healthy boundary with someone this week', hint: 'Boundaries are acts of self-respect.' },
      { cat: 'social', text: 'Build a professional network by connecting with 3 adults in my field', hint: 'Your network is your net worth.' },
      { cat: 'personal', text: 'Develop a morning routine and follow it for 21 days', hint: 'Habits compound. Small + consistent = transformative.' },
      { cat: 'personal', text: 'Identify one limiting belief and actively challenge it', hint: 'Your narrative shapes your reality.' },
      { cat: 'personal', text: 'Develop a morning/evening routine that supports my goals', hint: 'Routines reduce decision fatigue.' },
      { cat: 'personal', text: 'Create a personal brand (portfolio, LinkedIn, website)', hint: 'Start building your reputation now.' },
      { cat: 'health', text: 'Exercise 3+ times per week for 30+ minutes', hint: 'Exercise is the most underused antidepressant.' },
      { cat: 'health', text: 'Practice one mindfulness technique daily for 2 weeks', hint: 'Meditation rewires your brain for resilience.' },
      { cat: 'health', text: 'Track sleep, water, and exercise for 30 days', hint: 'What gets measured gets managed.' },
      { cat: 'creative', text: 'Complete and share one creative project this month', hint: 'Shipping beats perfecting.' },
      { cat: 'creative', text: 'Start a blog, podcast, or YouTube channel about something I care about', hint: 'Your perspective is unique and valuable.' },
      { cat: 'community', text: 'Organize or participate in a community service project', hint: 'Leadership is action, not title.' },
      { cat: 'community', text: 'Mentor a younger student in something I\'m good at', hint: 'Teaching is the highest form of understanding.' },
      { cat: 'community', text: 'Start or join a club aligned with my passions', hint: 'Find your people.' }
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
    fiveGoals: { icon: '\uD83D\uDCDA', name: '5 Goals Completed', desc: 'Complete 5 goals' },
    firstComplete: { icon: '\u2705', name: 'Goal Crusher', desc: 'Complete your first goal' },
    threeComplete: { icon: '\uD83C\uDFC6', name: 'Achiever', desc: 'Complete 3 goals' },
    smartGoal: { icon: '\uD83E\uDDE0', name: 'SMART Thinker', desc: 'Fill all 5 SMART fields' },
    firstStep: { icon: '\uD83D\uDC63', name: 'First Step', desc: 'Complete a step toward a goal' },
    tenSteps: { icon: '\uD83D\uDE80', name: 'Momentum', desc: 'Complete 10 total steps' },
    streak3: { icon: '\uD83D\uDD25', name: 'On Fire', desc: 'Check in 3 days in a row' },
    streak7: { icon: '\u2B50', name: 'Unstoppable', desc: '7-day check-in streak' },
    allCategories: { icon: '\uD83C\uDF08', name: 'Balanced Life', desc: 'Goals in 3+ categories' },
    aiCoach: { icon: '\uD83E\uDD16', name: 'Coach Chat', desc: 'Ask the AI goal coach' },
    reflection: { icon: '\uD83D\uDCDD', name: 'Reflector', desc: 'Write a goal reflection' },
    habitFormer: { icon: '\uD83D\uDD01', name: 'Habit Former', desc: '7-day habit streak' },
    visionCreator: { icon: '\uD83C\uDF1F', name: 'Vision Creator', desc: 'Create a vision board entry' },
    reflectiveAchiever: { icon: '\uD83E\uDE9E', name: 'Reflective Achiever', desc: 'Write a reflection on a completed goal' },
    accountabilityPartner: { icon: '\uD83E\uDD1D', name: 'Accountability Partner', desc: 'Share a goal with a buddy' },
    habitMaster: { icon: '\uD83C\uDFC5', name: 'Habit Master', desc: 'Complete all habits for a full week' },
    weeklyReviewer: { icon: '\uD83D\uDCDD', name: 'Weekly Reviewer', desc: 'Complete 3 weekly check-ins' },
    milestoneMaker: { icon: '\uD83D\uDDFC', name: 'Milestone Maker', desc: 'Reach a 50% milestone on any goal' },
    categoryExplorer: { icon: '\uD83E\uDDED', name: 'Category Explorer', desc: 'Set goals in 4+ categories' },
    habitHero: { icon: '\uD83E\uDDB8', name: 'Habit Hero', desc: '14-day accountability streak' },
    visionAchiever: { icon: '\uD83C\uDF20', name: 'Vision Achiever', desc: 'Fill all vision board sections' }
  };

  // ── Motivational Quotes (grade-adaptive) ──
  var MOTIVATIONAL_QUOTES = {
    elementary: [
      'You can do hard things! \uD83D\uDCAA',
      'Every expert was once a beginner. \uD83C\uDF1F',
      'Mistakes help your brain grow! \uD83E\uDDE0',
      'Be the reason someone smiles today. \uD83D\uDE0A',
      'You are braver than you believe. \uD83E\uDDB8',
      'One step at a time gets you there! \uD83D\uDC63',
      'Believe in yourself \u2014 you are amazing! \u2728',
      'Today is a great day to try something new! \uD83C\uDF08'
    ],
    middle: [
      'Progress, not perfection. \uD83C\uDFAF',
      'The only limit is the one you set for yourself. \uD83D\uDE80',
      'Discipline is choosing between what you want now and what you want most. \u2B50',
      'Your future self will thank you for starting today. \uD83D\uDD25',
      'Small daily improvements lead to staggering long-term results. \uD83D\uDCC8',
      'You don\'t have to be great to start, but you have to start to be great. \uD83C\uDF31',
      'Comparison is the thief of joy \u2014 run your own race. \uD83C\uDFC3',
      'Courage isn\'t the absence of fear; it\'s action despite fear. \uD83E\uDDB8'
    ],
    high: [
      'The obstacle is the way. \u2014 Marcus Aurelius \uD83D\uDDFF',
      'What you do every day matters more than what you do once in a while. \uD83D\uDD04',
      'Atomic habits: 1% better each day = 37x better in a year. \uD83D\uDCCA',
      'Your comfort zone is a beautiful place, but nothing ever grows there. \uD83C\uDF31',
      'The best time to plant a tree was 20 years ago. The second best time is now. \uD83C\uDF33',
      'Success is not final, failure is not fatal: it is the courage to continue that counts. \uD83C\uDFC6',
      'Be so good they can\'t ignore you. \u2014 Steve Martin \u2B50',
      'Vision without execution is hallucination. \u2014 Thomas Edison \uD83D\uDCA1'
    ]
  };

  // ── Motivational Boost Messages (for streak breaks / stalls) ──
  var MOTIVATIONAL_BOOSTS = {
    elementary: [
      'Missing a day doesn\'t erase your progress! You still did great! \uD83C\uDF1F',
      'The best time to restart is right now! Let\'s go! \uD83D\uDE80',
      'Even superheroes take a break sometimes. You\'ve got this! \uD83E\uDDB8',
      'Every day is a new chance to try again! \uD83C\uDF08',
      'It\'s okay to go slow \u2014 you\'re still going! \uD83D\uDC22'
    ],
    middle: [
      'Missing a day doesn\'t erase your progress! \uD83D\uDCAA',
      'The best time to restart is right now. \uD83D\uDD25',
      'Setbacks are setups for comebacks. Keep pushing! \uD83C\uDFC3',
      'You don\'t need motivation to start \u2014 just start, and motivation follows. \u2B50',
      'One bad day doesn\'t define your journey. Tomorrow is fresh. \uD83C\uDF05'
    ],
    high: [
      'Missing a day doesn\'t erase your progress. Consistency isn\'t perfection. \uD83D\uDCCA',
      'The best time to restart is right now. No guilt, just action. \uD83C\uDFAF',
      'Resilience isn\'t about never falling \u2014 it\'s about always getting back up. \uD83D\uDDFF',
      'Even the most successful people have off days. What matters is the trend line. \uD83D\uDCC8',
      'Progress is non-linear. Trust the process. \uD83C\uDF31'
    ]
  };

  // ── Category AI Tips (per category, grade-adaptive) ──
  var CATEGORY_TIPS = {
    academic: {
      elementary: 'Break big homework into tiny bites \u2014 you\u2019ll be done before you know it!',
      middle: 'Use spaced repetition: review notes 1 day, 3 days, and 7 days after learning.',
      high: 'Build a study system (Cornell notes, Anki, etc.) \u2014 systems beat willpower.'
    },
    social: {
      elementary: 'Smile and say hi \u2014 that\u2019s how friendships start!',
      middle: 'Quality over quantity: focus on deepening a few friendships.',
      high: 'Practice active listening \u2014 put away your phone and be fully present.'
    },
    personal: {
      elementary: 'Try something new every week \u2014 your brain loves learning!',
      middle: 'Journal for 5 minutes daily \u2014 writing clarifies your thoughts.',
      high: 'Identify one limiting belief and challenge it with evidence this week.'
    },
    health: {
      elementary: 'Drink a glass of water every time you take a break!',
      middle: 'Sleep 8+ hours \u2014 your brain processes everything you learned while you sleep.',
      high: 'Exercise is the most underused antidepressant \u2014 move for 30 min daily.'
    },
    creative: {
      elementary: 'Draw, sing, or dance for 10 minutes \u2014 it makes your brain happy!',
      middle: 'Start before you feel ready \u2014 creativity comes from doing, not waiting.',
      high: 'Ship imperfect work. Perfectionism is the enemy of creativity.'
    },
    community: {
      elementary: 'Do one nice thing for someone without being asked today!',
      middle: 'Organize something small: a study group, a cleanup, or a fundraiser.',
      high: 'Mentoring a younger student is the highest form of understanding a subject.'
    }
  };

  // ── Daily Nudge Messages ──
  var DAILY_NUDGE_MESSAGES = [
    'Hey! You haven\u2019t completed any steps today. Even one small step counts! \uD83D\uDC63',
    'Just 5 minutes on your goal can build unstoppable momentum. Start now! \uD83D\uDE80',
    'Your future self is cheering you on. Take one step today! \uD83C\uDF1F',
    'Progress isn\u2019t always big leaps \u2014 tiny steps add up. What can you do right now? \uD83C\uDFAF',
    'You\u2019ve got goals waiting for you! Pick one step and crush it! \uD83D\uDCAA',
    'Consistency beats intensity. Even 2 minutes on your goal matters today! \u23F0',
    'Remember why you started. One step closer is still closer! \u2764\uFE0F',
    'The hardest part is starting. Once you begin, momentum takes over! \uD83C\uDFC3',
    'You\u2019re building something amazing, one step at a time. Don\u2019t stop now! \uD83C\uDFD7\uFE0F',
    'A goal without daily action is just a wish. Make it real today! \u2728'
  ];

  // ── Milestone thresholds ──
  var MILESTONE_THRESHOLDS = [25, 50, 75, 100];

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
    if (completedGoals.length >= 5) award('fiveGoals');
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
    // New badges
    if (d.habitStreak7) award('habitFormer');
    if (d.hasVision) award('visionCreator');
    if (d.hasGoalReflection) award('reflectiveAchiever');
    if (d.hasSharedGoal) award('accountabilityPartner');
    if (d.habitWeekComplete) award('habitMaster');
    // New v3 badges
    if ((d.weeklyCheckins || []).length >= 3) award('weeklyReviewer');
    if (d.hasMilestone50) award('milestoneMaker');
    var catCount = {};
    goals.forEach(function(g) { if (g.category) catCount[g.category] = true; });
    if (Object.keys(catCount).length >= 4) award('categoryExplorer');
    if ((d.accountabilityStreak || 0) >= 14) award('habitHero');
    var vb = d.visionBoard || {};
    if (vb.thisYear && vb.thisYear.trim() && vb.thisMonth && vb.thisMonth.trim() && vb.thisWeek && vb.thisWeek.trim()) award('visionAchiever');
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

        // ── Habit Tracker state ──
        var habits = d.habits || [];
        var habitLog = d.habitLog || {};
        var habitEditMode = d.habitEditMode || false;

        // ── Vision Board state ──
        var visionBoard = d.visionBoard || { thisYear: '', thisMonth: '', thisWeek: '' };

        // ── Goal Reflection state ──
        var reflectingGoalId = d.reflectingGoalId || null;

        // ── Accountability state ──
        var accountabilityLog = d.accountabilityLog || {};
        var accountabilityStreak = d.accountabilityStreak || 0;

        // ── Weekly Check-in state ──
        var weeklyCheckins = d.weeklyCheckins || [];
        var weeklyDraft = d.weeklyDraft || { obstacles: '', focus: '', rating: 0 };

        // ── Milestone tracking state ──
        var milestonesShown = d.milestonesShown || {};

        // ── Badge check ──
        React.useEffect(function() {
          var newBadges = checkBadges(d, awardXP, addToast);
          if (newBadges) upd({ badges: newBadges });
        }, [goals.length, streak, d.aiAsked, d.hasReflection, d.habitStreak7, d.hasVision, d.hasGoalReflection, d.hasSharedGoal, d.habitWeekComplete, weeklyCheckins.length, d.hasMilestone50, accountabilityStreak]);

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
          var milestoneUpdates = {};
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            var steps = g.steps.map(function(s, i) { return i === stepIdx ? Object.assign({}, s, { done: !s.done }) : s; });
            var doneCount = steps.filter(function(s) { return s.done; }).length;
            var progress = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
            var oldProgress = g.progress || 0;
            var completed = progress === 100 && steps.length > 0;
            if (completed && !g.completed) {
              sfxComplete();
              if (awardXP) awardXP(20);
              if (addToast) addToast('\uD83C\uDF89 Goal completed: ' + g.text + '! +20 XP', 'success');
            }
            // Milestone checks for goals with 5+ steps
            if (steps.length >= 5 && progress > oldProgress) {
              MILESTONE_THRESHOLDS.forEach(function(threshold) {
                var msKey = g.id + '-' + threshold;
                if (progress >= threshold && oldProgress < threshold && !milestonesShown[msKey]) {
                  milestoneUpdates[msKey] = true;
                  sfxBadge();
                  if (awardXP) awardXP(5);
                  if (addToast) addToast('\uD83C\uDFC6 Milestone! ' + g.text + ' reached ' + threshold + '%! +5 XP', 'success');
                  if (threshold === 50) milestoneUpdates._hasMilestone50 = true;
                }
              });
            }
            return Object.assign({}, g, { steps: steps, progress: progress, completed: completed });
          });
          var updObj = { goals: next };
          if (Object.keys(milestoneUpdates).length > 0) {
            var newShown = Object.assign({}, milestonesShown);
            Object.keys(milestoneUpdates).forEach(function(k) { if (k !== '_hasMilestone50') newShown[k] = true; });
            updObj.milestonesShown = newShown;
            if (milestoneUpdates._hasMilestone50) updObj.hasMilestone50 = true;
          }
          upd(updObj);
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

        // ── Habit Tracker helpers ──
        var getWeekDates = function() {
          var dates = [];
          var today = new Date();
          for (var i = 6; i >= 0; i--) {
            var d2 = new Date(today.getTime() - i * 86400000);
            dates.push(d2.toISOString().slice(0, 10));
          }
          return dates;
        };

        var weekDates = getWeekDates();
        var dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        var toggleHabit = function(habitIdx, dateStr) {
          sfxClick();
          var key = habitIdx + '-' + dateStr;
          var newLog = Object.assign({}, habitLog);
          newLog[key] = !newLog[key];
          // Check for 7-day streak on any habit
          var hasStreak7 = false;
          var allHabitsComplete = habits.length > 0;
          habits.forEach(function(hab, hi) {
            var consecutive = 0;
            var allWeek = true;
            weekDates.forEach(function(wd) {
              if (newLog[hi + '-' + wd]) { consecutive++; } else { consecutive = 0; allWeek = false; }
            });
            if (consecutive >= 7) hasStreak7 = true;
            if (!allWeek) allHabitsComplete = false;
          });
          var updates = { habitLog: newLog };
          if (hasStreak7) updates.habitStreak7 = true;
          if (allHabitsComplete && habits.length > 0) updates.habitWeekComplete = true;
          upd(updates);
        };

        var addHabit = function(name) {
          if (!name || !name.trim() || habits.length >= 5) return;
          sfxAdd();
          upd({ habits: habits.concat([name.trim()]) });
        };

        var removeHabit = function(idx) {
          var next = habits.filter(function(h, i) { return i !== idx; });
          // Clean up log entries for removed habit
          var newLog = {};
          Object.keys(habitLog).forEach(function(k) {
            var parts = k.split('-');
            var hi = parseInt(parts[0]);
            if (hi < idx) { newLog[k] = habitLog[k]; }
            else if (hi > idx) { newLog[(hi - 1) + '-' + parts.slice(1).join('-')] = habitLog[k]; }
          });
          upd({ habits: next, habitLog: newLog });
        };

        var getHabitCompletion = function(habitIdx) {
          var done = 0;
          weekDates.forEach(function(wd) { if (habitLog[habitIdx + '-' + wd]) done++; });
          return Math.round((done / 7) * 100);
        };

        // ── Vision Board helpers ──
        var updateVision = function(field, value) {
          var newVision = Object.assign({}, visionBoard);
          newVision[field] = value;
          var hasContent = newVision.thisYear || newVision.thisMonth || newVision.thisWeek;
          upd({ visionBoard: newVision, hasVision: !!hasContent });
        };

        var getRandomQuote = function() {
          var quotes = MOTIVATIONAL_QUOTES[band] || MOTIVATIONAL_QUOTES.elementary;
          return quotes[Math.floor(Math.random() * quotes.length)];
        };

        // ── Goal Reflection helpers ──
        var saveReflection = function(goalId, reflectionData) {
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            var reflections = (g.reflections || []).concat([Object.assign({ date: Date.now() }, reflectionData)]);
            return Object.assign({}, g, { reflections: reflections });
          });
          sfxComplete();
          if (awardXP) awardXP(10);
          if (addToast) addToast('\uD83D\uDCDD Reflection saved! +10 XP', 'success');
          upd({ goals: next, hasGoalReflection: true, reflectingGoalId: null, hasReflection: true });
        };

        // ── Goal Buddy / Accountability helpers ──
        var shareGoalToClipboard = function(goal) {
          var text = '\uD83C\uDFAF Goal: ' + goal.text + '\n';
          if (goal.steps && goal.steps.length > 0) {
            text += '\nSteps:\n';
            goal.steps.forEach(function(s, i) { text += (s.done ? '\u2705' : '\u2B1C') + ' ' + s.text + '\n'; });
          }
          text += '\nProgress: ' + goal.progress + '%';
          if (goal.smart && goal.smart.S) text += '\nWhy: ' + goal.smart.R;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
              if (addToast) addToast('\uD83D\uDCCB Goal copied to clipboard! Share with your buddy!', 'success');
              upd({ hasSharedGoal: true });
            }).catch(function() {
              if (addToast) addToast('Could not copy \u2014 try selecting the text manually.', 'warning');
            });
          }
        };

        var logAccountability = function(didWork) {
          var today = new Date().toISOString().slice(0, 10);
          var newLog = Object.assign({}, accountabilityLog);
          newLog[today] = didWork;
          // Calculate streak
          var s = 0;
          var checkDate = new Date();
          for (var i = 0; i < 30; i++) {
            var ds = checkDate.toISOString().slice(0, 10);
            if (newLog[ds]) { s++; } else { break; }
            checkDate = new Date(checkDate.getTime() - 86400000);
          }
          sfxClick();
          if (didWork && addToast) addToast('\uD83D\uDCAA Nice! Accountability streak: ' + s + ' day' + (s !== 1 ? 's' : '') + '!', 'info');
          upd({ accountabilityLog: newLog, accountabilityStreak: s });
        };

        // ── Motivational boost (check for stalls) ──
        var getMotivationalBoost = function() {
          var boosts = MOTIVATIONAL_BOOSTS[band] || MOTIVATIONAL_BOOSTS.elementary;
          // Show boost if streak broke or no progress in a while
          var needsBoost = false;
          if (streak === 1 && lastCheckin) needsBoost = true; // streak just reset
          if (activeGoals.length > 0 && activeGoals.every(function(g) { return g.progress < 20; })) needsBoost = true;
          if (!needsBoost) return null;
          return boosts[Math.floor(Math.random() * boosts.length)];
        };

        // ── Weekly Check-in helpers ──
        var getWeekProgressSummary = function() {
          var oneWeekAgo = Date.now() - 7 * 86400000;
          var progressGoals = [];
          goals.forEach(function(g) {
            var recentSteps = (g.steps || []).filter(function(s) { return s.done; });
            if (recentSteps.length > 0) {
              progressGoals.push({ text: g.text, progress: g.progress, stepsComplete: recentSteps.length, totalSteps: (g.steps || []).length });
            }
          });
          return progressGoals;
        };

        var saveWeeklyCheckin = function() {
          var summary = getWeekProgressSummary();
          var checkin = {
            id: 'wci-' + Date.now(),
            date: Date.now(),
            weekOf: new Date().toISOString().slice(0, 10),
            progressSummary: summary,
            obstacles: weeklyDraft.obstacles || '',
            focus: weeklyDraft.focus || '',
            rating: weeklyDraft.rating || 0
          };
          var newCheckins = weeklyCheckins.concat([checkin]);
          sfxComplete();
          if (awardXP) awardXP(10);
          if (addToast) addToast('\uD83D\uDCDD Weekly check-in saved! +10 XP', 'success');
          upd({ weeklyCheckins: newCheckins, weeklyDraft: { obstacles: '', focus: '', rating: 0 } });
        };

        var updateWeeklyDraft = function(field, value) {
          var newDraft = Object.assign({}, weeklyDraft);
          newDraft[field] = value;
          upd({ weeklyDraft: newDraft });
        };

        // ── Daily Nudge helper ──
        var getDailyNudge = function() {
          if (goals.length === 0) return null;
          var today = new Date().toISOString().slice(0, 10);
          // Check if any steps were completed today (use accountability log as proxy)
          if (accountabilityLog[today] === true) return null;
          var dayIndex = Math.floor(Date.now() / 86400000) % DAILY_NUDGE_MESSAGES.length;
          return DAILY_NUDGE_MESSAGES[dayIndex];
        };

        // ── Goal of the Week helper ──
        var getGoalOfTheWeek = function() {
          if (activeGoals.length === 0) return null;
          // Pick the goal with the most progress that isn't complete, to encourage finishing it
          var sorted = activeGoals.slice().sort(function(a, b) { return (b.progress || 0) - (a.progress || 0); });
          // Prefer one with some progress but not done
          var candidate = sorted.find(function(g) { return g.progress > 0 && g.progress < 100; });
          return candidate || sorted[0];
        };

        // ── Category Dashboard helper ──
        var getCategoryStats = function() {
          return GOAL_CATEGORIES.map(function(cat) {
            var catGoals = goals.filter(function(g) { return g.category === cat.id; });
            var catCompleted = catGoals.filter(function(g) { return g.completed; });
            var completionRate = catGoals.length > 0 ? Math.round((catCompleted.length / catGoals.length) * 100) : 0;
            var avgStepCompletion = 0;
            if (catGoals.length > 0) {
              var totalPct = 0;
              catGoals.forEach(function(g) { totalPct += (g.progress || 0); });
              avgStepCompletion = Math.round(totalPct / catGoals.length);
            }
            var tip = CATEGORY_TIPS[cat.id] ? (CATEGORY_TIPS[cat.id][band] || CATEGORY_TIPS[cat.id].elementary) : '';
            return {
              id: cat.id,
              label: cat.label,
              emoji: cat.emoji,
              color: cat.color,
              count: catGoals.length,
              completedCount: catCompleted.length,
              completionRate: completionRate,
              avgStepCompletion: avgStepCompletion,
              tip: tip
            };
          });
        };

        // ── Milestone markers helper ──
        var getGoalMilestones = function(goal) {
          if (!goal.steps || goal.steps.length < 5) return [];
          return MILESTONE_THRESHOLDS.map(function(threshold) {
            var msKey = goal.id + '-' + threshold;
            return {
              threshold: threshold,
              reached: !!(milestonesShown[msKey]),
              isCurrent: (goal.progress || 0) >= threshold
            };
          });
        };

        var templates = GOAL_TEMPLATES[band] || GOAL_TEMPLATES.elementary;
        var activeGoals = goals.filter(function(g) { return !g.completed; });
        var completedGoals = goals.filter(function(g) { return g.completed; });
        var editGoal = editingGoal ? goals.find(function(g) { return g.id === editingGoal; }) : null;
        var accentColor = '#6366f1';
        var motivationalBoost = getMotivationalBoost();
        var dailyNudge = getDailyNudge();
        var goalOfTheWeek = getGoalOfTheWeek();
        var categoryStats = getCategoryStats();

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
          h('div', { style: { display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.8)', overflowX: 'auto' } },
            [{ id: 'goals', label: '\uD83C\uDFAF Goals' }, { id: 'habits', label: '\uD83D\uDD01 Habits' }, { id: 'vision', label: '\uD83C\uDF1F Vision' }, { id: 'smart', label: '\uD83E\uDDE0 SMART' }, { id: 'coach', label: '\uD83E\uDD16 Coach' }, { id: 'checkin', label: '\uD83D\uDCDD Check-In' }, { id: 'progress', label: '\uD83D\uDCCA Progress' }].map(function(tb) {
              var active = tab === tb.id;
              return h('button', { key: tb.id, onClick: function() { sfxClick(); upd({ tab: tb.id }); }, style: { flex: 1, padding: '10px 4px', fontSize: 10, fontWeight: 'bold', color: active ? '#a5b4fc' : '#64748b', background: active ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 0 } }, tb.label);
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
              // Motivational boost banner
              motivationalBoost ? h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 18 } }, '\uD83D\uDCAB'),
                h('span', { style: { fontSize: 12, color: '#fbbf24', lineHeight: 1.5, fontStyle: 'italic' } }, motivationalBoost)
              ) : null,
              // Daily Nudge — shows if no steps completed today
              dailyNudge ? h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.20)', display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 18 } }, '\uD83D\uDC4B'),
                h('span', { style: { fontSize: 12, color: '#c7d2fe', lineHeight: 1.5 } }, dailyNudge)
              ) : null,
              // Goal of the Week spotlight
              goalOfTheWeek ? h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(52,211,153,0.06))', border: '1px solid rgba(34,197,94,0.20)', display: 'flex', alignItems: 'center', gap: 10 } },
                h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
                  h('div', { style: { fontSize: 9, fontWeight: 'bold', color: '#34d399', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, '\u2B50 Goal of the Week'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 'bold' } }, goalOfTheWeek.text || '(unnamed)'),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } },
                    h('div', { style: { flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', maxWidth: 120 } },
                      h('div', { style: { width: (goalOfTheWeek.progress || 0) + '%', height: '100%', background: '#22c55e', borderRadius: 3 } })
                    ),
                    h('span', { style: { fontSize: 10, color: '#34d399', fontWeight: 'bold' } }, (goalOfTheWeek.progress || 0) + '%')
                  )
                ),
                h('button', { onClick: function() { upd({ editingGoal: goalOfTheWeek.id, tab: 'goals' }); }, style: { padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#34d399', fontSize: 10, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' } }, '\uD83C\uDFAF Focus')
              ) : null,
              // Accountability check
              (function() {
                var today = new Date().toISOString().slice(0, 10);
                if (accountabilityLog[today] !== undefined) return null;
                if (goals.length === 0) return null;
                return h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', { style: { fontSize: 12, color: '#a5b4fc', flex: 1 } }, band === 'elementary' ? 'Did you work on your goal today?' : 'Accountability check: did you work toward a goal today?'),
                  h('button', { onClick: function() { logAccountability(true); }, style: { padding: '5px 14px', borderRadius: 8, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u2705 Yes'),
                  h('button', { onClick: function() { logAccountability(false); }, style: { padding: '5px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u274C Not yet')
                );
              })(),
              accountabilityStreak > 0 ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 8, textAlign: 'center' } }, '\uD83D\uDCAA Accountability streak: ' + accountabilityStreak + ' day' + (accountabilityStreak !== 1 ? 's' : '')) : null,
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
                    h('button', { onClick: function() { shareGoalToClipboard(goal); }, title: 'Share goal with buddy', style: { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 12, padding: 4 } }, '\uD83D\uDCE4'),
                    h('button', { onClick: function() { deleteGoal(goal.id); }, style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 4 } }, '\u2715')
                  ),
                  // Progress bar with milestone markers
                  (function() {
                    var milestones = getGoalMilestones(goal);
                    var hasMilestones = milestones.length > 0;
                    return h('div', { style: { marginBottom: 8 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                        h('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' } },
                          h('div', { style: { width: goal.progress + '%', height: '100%', background: 'linear-gradient(90deg, ' + cat.color + ', ' + cat.color + 'cc)', borderRadius: 4, transition: 'width 0.3s' } })
                        ),
                        h('span', { style: { fontSize: 11, fontWeight: 'bold', color: cat.color, minWidth: 32, textAlign: 'right' } }, goal.progress + '%')
                      ),
                      hasMilestones ? h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 3, paddingRight: 40 } },
                        milestones.map(function(ms) {
                          return h('div', { key: ms.threshold, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 } },
                            h('div', { style: { width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ms.isCurrent ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)', border: ms.isCurrent ? '2px solid #34d399' : '1px solid rgba(99,102,241,0.2)', fontSize: 7, color: ms.isCurrent ? '#34d399' : '#475569' } }, ms.isCurrent ? '\u2713' : ms.threshold === 100 ? '\u2605' : '\u25CB'),
                            h('span', { style: { fontSize: 7, color: ms.isCurrent ? '#34d399' : '#475569', marginTop: 1 } }, ms.threshold + '%')
                          );
                        })
                      ) : null
                    );
                  })(),
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
              // Completed goals with reflection journal
              completedGoals.length > 0 ? h('div', { style: { marginTop: 20 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#34d399', marginBottom: 8 } }, '\u2705 Completed (' + completedGoals.length + ')'),
                completedGoals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  var isReflecting = reflectingGoalId === goal.id;
                  var hasReflections = goal.reflections && goal.reflections.length > 0;
                  return h('div', { key: goal.id, style: { padding: 10, marginBottom: 8, borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', null, cat.emoji),
                      h('span', { style: { flex: 1, fontSize: 12, color: '#6ee7b7', textDecoration: 'line-through' } }, goal.text),
                      h('span', { style: { fontSize: 10, color: '#34d399' } }, '\uD83C\uDF89 Done!'),
                      !hasReflections ? h('button', { onClick: function() { upd({ reflectingGoalId: isReflecting ? null : goal.id }); }, style: { background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6, padding: '3px 8px', color: '#c4b5fd', fontSize: 9, fontWeight: 'bold', cursor: 'pointer', marginLeft: 4 } }, '\uD83D\uDCDD Reflect') : null,
                      h('button', { onClick: function() { shareGoalToClipboard(goal); }, style: { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 11, padding: 2 } }, '\uD83D\uDCE4')
                    ),
                    // Reflection form
                    isReflecting ? h('div', { style: { marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' } },
                      h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 8 } }, '\uD83D\uDCDD Goal Reflection Journal'),
                      h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } }, band === 'elementary' ? 'Think about how you reached your goal!' : 'Reflect on your journey to completing this goal.'),
                      ['What worked well?', 'What was the hardest part?', 'What would I do differently?', 'What\'s my next goal?'].map(function(prompt, pi) {
                        return h('div', { key: pi, style: { marginBottom: 8 } },
                          h('label', { style: { display: 'block', fontSize: 11, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 3 } }, prompt),
                          h('textarea', { id: 'reflect-' + pi, placeholder: band === 'elementary' ? 'Write your thoughts...' : 'Share your reflection...', style: { width: '100%', minHeight: 40, padding: 6, borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' } })
                        );
                      }),
                      h('button', { onClick: function() {
                        var r0 = document.getElementById('reflect-0');
                        var r1 = document.getElementById('reflect-1');
                        var r2 = document.getElementById('reflect-2');
                        var r3 = document.getElementById('reflect-3');
                        saveReflection(goal.id, {
                          whatWorked: r0 ? r0.value : '',
                          hardestPart: r1 ? r1.value : '',
                          doDifferently: r2 ? r2.value : '',
                          nextGoal: r3 ? r3.value : ''
                        });
                      }, style: { padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', marginTop: 4 } }, '\u2705 Save Reflection')
                    ) : null,
                    // Show saved reflections
                    hasReflections ? h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' } },
                      h('div', { style: { fontSize: 10, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 6 } }, '\uD83D\uDCDD Reflection'),
                      goal.reflections.map(function(ref, ri) {
                        return h('div', { key: ri, style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
                          ref.whatWorked ? h('div', null, h('strong', { style: { color: '#a5b4fc' } }, 'What worked: '), ref.whatWorked) : null,
                          ref.hardestPart ? h('div', null, h('strong', { style: { color: '#a5b4fc' } }, 'Hardest part: '), ref.hardestPart) : null,
                          ref.doDifferently ? h('div', null, h('strong', { style: { color: '#a5b4fc' } }, 'Do differently: '), ref.doDifferently) : null,
                          ref.nextGoal ? h('div', null, h('strong', { style: { color: '#a5b4fc' } }, 'Next goal: '), ref.nextGoal) : null
                        );
                      })
                    ) : null
                  );
                })
              ) : null
            ) : null,

            // ── HABITS TAB ──
            tab === 'habits' ? h('div', null,
              h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 4 } }, '\uD83D\uDD01 Daily Habit Tracker'),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 } },
                band === 'elementary' ? 'Track your daily habits! Check off each one you do every day.' :
                band === 'middle' ? 'Build consistency by tracking up to 5 daily habits over the week.' :
                'Atomic habits: track small daily actions that compound over time. Up to 5 habits.'
              ),
              // Add habit input
              habits.length < 5 ? h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
                h('input', { type: 'text', id: 'habit-input', placeholder: band === 'elementary' ? 'Add a habit (e.g., Drink water)...' : 'Add a daily habit (e.g., Read 15 min, Exercise, Journal)...', onKeyDown: function(e) { if (e.key === 'Enter' && e.target.value.trim()) { addHabit(e.target.value); e.target.value = ''; } }, style: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, outline: 'none' } }),
                h('button', { onClick: function() { var inp = document.getElementById('habit-input'); if (inp && inp.value.trim()) { addHabit(inp.value); inp.value = ''; } }, style: { padding: '8px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '+ Add')
              ) : h('p', { style: { fontSize: 10, color: '#64748b', marginBottom: 10 } }, 'Maximum 5 habits reached. Remove one to add a new one.'),
              // Habit suggestion chips
              habits.length === 0 ? h('div', { style: { marginBottom: 14 } },
                h('div', { style: { fontSize: 10, color: '#64748b', marginBottom: 6 } }, 'Suggested habits \u2014 tap to add:'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  (band === 'elementary' ?
                    ['Drink water \uD83D\uDCA7', 'Read 15 min \uD83D\uDCDA', 'Exercise \uD83C\uDFC3', 'Be kind \uD83D\uDC9B', 'Clean up \uD83E\uDDF9'] :
                    band === 'middle' ?
                    ['Read 15 min \uD83D\uDCDA', 'Exercise 20 min \uD83C\uDFC3', 'Journal \uD83D\uDCDD', 'No phone at dinner \uD83D\uDCF1', 'Practice instrument \uD83C\uDFB5'] :
                    ['Read 30 min \uD83D\uDCDA', 'Exercise \uD83D\uDCAA', 'Meditate \uD83E\uDDD8', 'Journal \uD83D\uDCDD', 'Study review \uD83D\uDCDA']
                  ).map(function(sug) {
                    return h('button', { key: sug, onClick: function() { addHabit(sug); }, style: { padding: '4px 10px', borderRadius: 16, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, sug);
                  })
                )
              ) : null,
              // 7-day grid
              habits.length > 0 ? h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                  h('thead', null,
                    h('tr', null,
                      h('th', { style: { textAlign: 'left', padding: '6px 8px', color: '#94a3b8', fontWeight: 'bold', fontSize: 10, borderBottom: '1px solid rgba(99,102,241,0.1)' } }, 'Habit'),
                      weekDates.map(function(wd, wi) {
                        var dt = new Date(wd + 'T12:00:00');
                        var dayName = dayLabels[dt.getDay()];
                        var isToday = wd === new Date().toISOString().slice(0, 10);
                        return h('th', { key: wd, style: { padding: '6px 4px', color: isToday ? '#a5b4fc' : '#64748b', fontWeight: isToday ? 'bold' : 'normal', fontSize: 9, textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.1)', minWidth: 32 } },
                          h('div', null, dayName),
                          h('div', { style: { fontSize: 8 } }, wd.slice(5))
                        );
                      }),
                      h('th', { style: { padding: '6px 4px', color: '#94a3b8', fontSize: 9, textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.1)' } }, '%')
                    )
                  ),
                  h('tbody', null,
                    habits.map(function(hab, hi) {
                      var pct = getHabitCompletion(hi);
                      return h('tr', { key: hi },
                        h('td', { style: { padding: '8px', color: '#e2e8f0', fontSize: 11, borderBottom: '1px solid rgba(99,102,241,0.05)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                          h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                            h('span', null, hab),
                            habitEditMode ? h('button', { onClick: function() { removeHabit(hi); }, style: { background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer', padding: 0, marginLeft: 4 } }, '\u2715') : null
                          )
                        ),
                        weekDates.map(function(wd) {
                          var checked = !!habitLog[hi + '-' + wd];
                          return h('td', { key: wd, style: { textAlign: 'center', padding: '4px', borderBottom: '1px solid rgba(99,102,241,0.05)' } },
                            h('button', { onClick: function() { toggleHabit(hi, wd); }, style: { width: 26, height: 26, borderRadius: 6, border: 'none', background: checked ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)', color: checked ? '#34d399' : '#475569', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 } }, checked ? '\u2705' : '\u2B1C')
                          );
                        }),
                        h('td', { style: { textAlign: 'center', padding: '4px 6px', borderBottom: '1px solid rgba(99,102,241,0.05)' } },
                          h('span', { style: { fontSize: 11, fontWeight: 'bold', color: pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#64748b', padding: '2px 6px', borderRadius: 4, background: pct >= 80 ? 'rgba(52,211,153,0.1)' : pct >= 50 ? 'rgba(245,158,11,0.1)' : 'transparent' } }, pct + '%')
                        )
                      );
                    })
                  )
                ),
                // Edit/manage habits button
                h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 } },
                  h('button', { onClick: function() { upd({ habitEditMode: !habitEditMode }); }, style: { padding: '4px 10px', borderRadius: 6, background: habitEditMode ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (habitEditMode ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.1)'), color: habitEditMode ? '#f87171' : '#64748b', fontSize: 10, cursor: 'pointer' } }, habitEditMode ? 'Done editing' : '\u270F\uFE0F Edit habits')
                ),
                // Habit streak info
                (function() {
                  var bestStreak = 0;
                  habits.forEach(function(hab, hi) {
                    var s = 0;
                    for (var i = weekDates.length - 1; i >= 0; i--) {
                      if (habitLog[hi + '-' + weekDates[i]]) { s++; } else { break; }
                    }
                    if (s > bestStreak) bestStreak = s;
                  });
                  return bestStreak > 0 ? h('div', { style: { textAlign: 'center', marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' } },
                    h('span', { style: { fontSize: 11, color: '#fbbf24' } }, '\uD83D\uDD25 Best current habit streak: ' + bestStreak + ' day' + (bestStreak !== 1 ? 's' : ''))
                  ) : null;
                })()
              ) : h('div', { style: { textAlign: 'center', padding: 30 } },
                h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83D\uDD01'),
                h('p', { style: { fontSize: 13, color: '#94a3b8' } }, band === 'elementary' ? 'Add a habit above to start tracking!' : 'Define your daily habits above to begin tracking consistency.'),
                h('p', { style: { fontSize: 11, color: '#64748b', marginTop: 4 } }, 'Tip: Start with just 1-2 habits and build up over time.')
              )
            ) : null,

            // ── VISION BOARD TAB ──
            tab === 'vision' ? h('div', null,
              h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 4 } }, '\uD83C\uDF1F Vision Board'),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 } },
                band === 'elementary' ? 'Write down your dreams and wishes! What do you want to do or become?' :
                band === 'middle' ? 'Map out your aspirations across different timeframes. Dream big, then plan small.' :
                'Clarify your vision across timeframes. Vision without action is a daydream \u2014 action without vision is a nightmare.'
              ),
              // Motivational quote
              h('div', { style: { padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' } },
                h('div', { style: { fontSize: 10, color: '#818cf8', fontWeight: 'bold', marginBottom: 4 } }, '\u2728 Motivational Quote'),
                h('div', { style: { fontSize: 13, color: '#c7d2fe', fontStyle: 'italic', lineHeight: 1.6 } }, d.currentQuote || getRandomQuote()),
                h('button', { onClick: function() { upd({ currentQuote: getRandomQuote() }); }, style: { marginTop: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '3px 12px', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD04 New quote')
              ),
              // Vision sections
              [
                { key: 'thisWeek', label: 'This Week', emoji: '\uD83D\uDCC5', hint: band === 'elementary' ? 'What do you want to do this week?' : 'What will you accomplish this week?', color: '#22c55e' },
                { key: 'thisMonth', label: 'This Month', emoji: '\uD83D\uDCC6', hint: band === 'elementary' ? 'What do you want to do this month?' : 'Where do you want to be by month\'s end?', color: '#6366f1' },
                { key: 'thisYear', label: 'This Year', emoji: '\uD83C\uDF1F', hint: band === 'elementary' ? 'What\'s your big dream for this year?' : band === 'middle' ? 'What does your ideal year look like?' : 'What is your overarching vision for this year?', color: '#a855f7' }
              ].map(function(section) {
                return h('div', { key: section.key, style: { marginBottom: 14, padding: 14, borderRadius: 12, background: section.color + '08', border: '1px solid ' + section.color + '22' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 } },
                    h('span', { style: { fontSize: 16 } }, section.emoji),
                    h('span', { style: { fontSize: 13, fontWeight: 'bold', color: section.color } }, section.label)
                  ),
                  h('textarea', { value: visionBoard[section.key] || '', onChange: function(e) { updateVision(section.key, e.target.value); }, placeholder: section.hint, style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid ' + section.color + '22', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 } })
                );
              }),
              // Vision board preview
              (visionBoard.thisWeek || visionBoard.thisMonth || visionBoard.thisYear) ? h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(99,102,241,0.15)', marginTop: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 8, textAlign: 'center' } }, '\uD83D\uDDBC\uFE0F My Vision Board'),
                visionBoard.thisWeek ? h('div', { style: { marginBottom: 6 } },
                  h('span', { style: { fontSize: 10, fontWeight: 'bold', color: '#22c55e' } }, '\uD83D\uDCC5 This Week: '),
                  h('span', { style: { fontSize: 11, color: '#cbd5e1' } }, visionBoard.thisWeek)
                ) : null,
                visionBoard.thisMonth ? h('div', { style: { marginBottom: 6 } },
                  h('span', { style: { fontSize: 10, fontWeight: 'bold', color: '#6366f1' } }, '\uD83D\uDCC6 This Month: '),
                  h('span', { style: { fontSize: 11, color: '#cbd5e1' } }, visionBoard.thisMonth)
                ) : null,
                visionBoard.thisYear ? h('div', { style: { marginBottom: 6 } },
                  h('span', { style: { fontSize: 10, fontWeight: 'bold', color: '#a855f7' } }, '\uD83C\uDF1F This Year: '),
                  h('span', { style: { fontSize: 11, color: '#cbd5e1' } }, visionBoard.thisYear)
                ) : null
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

            // ── WEEKLY CHECK-IN TAB ──
            tab === 'checkin' ? h('div', null,
              h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 4 } }, '\uD83D\uDCDD Weekly Check-In'),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 } },
                band === 'elementary' ? 'Look back at your week! What did you work on? What will you do next?' :
                band === 'middle' ? 'Take a few minutes to reflect on your week. Honest reflection builds self-awareness.' :
                'Structured weekly review: assess progress, acknowledge obstacles, and set intentions for next week.'
              ),

              // Section 1: Auto-populated progress summary
              h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#34d399', marginBottom: 8 } }, '\u2705 Goals I Made Progress On This Week'),
                (function() {
                  var summary = getWeekProgressSummary();
                  if (summary.length === 0) {
                    return h('p', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, 'No goal progress recorded this week yet. Keep going!');
                  }
                  return h('div', null,
                    summary.map(function(g, gi) {
                      return h('div', { key: gi, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 4, borderRadius: 6, background: 'rgba(52,211,153,0.06)' } },
                        h('span', { style: { fontSize: 12 } }, '\uD83C\uDFAF'),
                        h('span', { style: { flex: 1, fontSize: 11, color: '#e2e8f0' } }, g.text),
                        h('span', { style: { fontSize: 10, color: '#34d399', fontWeight: 'bold' } }, g.stepsComplete + '/' + g.totalSteps + ' steps'),
                        h('span', { style: { fontSize: 10, color: '#94a3b8' } }, g.progress + '%')
                      );
                    })
                  );
                })()
              ),

              // Section 2: Obstacles text input
              h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#f87171', marginBottom: 8 } }, '\uD83E\uDEA8 What Obstacles Did I Face?'),
                h('textarea', { value: weeklyDraft.obstacles || '', onChange: function(e) { updateWeeklyDraft('obstacles', e.target.value); }, placeholder: band === 'elementary' ? 'What was hard this week? What got in the way?' : 'Describe any challenges, distractions, or setbacks you faced this week...', style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 } })
              ),

              // Section 3: Next week focus
              h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#818cf8', marginBottom: 8 } }, '\uD83C\uDFAF What Will I Focus On Next Week?'),
                h('textarea', { value: weeklyDraft.focus || '', onChange: function(e) { updateWeeklyDraft('focus', e.target.value); }, placeholder: band === 'elementary' ? 'What do you want to work on next week?' : 'Set your intention: what specific goal or step will you prioritize?', style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 } })
              ),

              // Section 4: Star rating
              h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', textAlign: 'center' } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#fbbf24', marginBottom: 10 } }, '\u2B50 Rate Your Week'),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6 } },
                  [1, 2, 3, 4, 5].map(function(star) {
                    var filled = (weeklyDraft.rating || 0) >= star;
                    return h('button', { key: star, onClick: function() { updateWeeklyDraft('rating', star); sfxClick(); }, style: { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: filled ? '#fbbf24' : '#334155', transition: 'transform 0.15s', padding: 2 } }, filled ? '\u2B50' : '\u2606');
                  })
                ),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } },
                  (weeklyDraft.rating || 0) === 0 ? 'Tap a star to rate' :
                  (weeklyDraft.rating || 0) <= 2 ? 'Tough week \u2014 that\u2019s okay! Next week is a fresh start.' :
                  (weeklyDraft.rating || 0) <= 3 ? 'Solid week! Room to grow.' :
                  (weeklyDraft.rating || 0) <= 4 ? 'Great week! You\u2019re building momentum!' :
                  'Amazing week! You\u2019re unstoppable!'
                )
              ),

              // Weekly check-in streak / count
              weeklyCheckins.length > 0 ? h('div', { style: { padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' } },
                h('span', { style: { fontSize: 14 } }, '\uD83D\uDCCA'),
                h('span', { style: { fontSize: 11, color: '#c4b5fd' } }, 'You\u2019ve completed ' + weeklyCheckins.length + ' weekly check-in' + (weeklyCheckins.length !== 1 ? 's' : '') + '!'),
                weeklyCheckins.length >= 4 ? h('span', { style: { fontSize: 10, color: '#a855f7', fontWeight: 'bold', marginLeft: 4 } }, '\uD83C\uDFC6 Consistent Reviewer!') : null
              ) : null,

              // Average weekly rating
              weeklyCheckins.length >= 2 ? (function() {
                var totalRating = 0;
                weeklyCheckins.forEach(function(ci) { totalRating += (ci.rating || 0); });
                var avgRating = (totalRating / weeklyCheckins.length).toFixed(1);
                return h('div', { style: { padding: '8px 14px', marginBottom: 14, borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', textAlign: 'center' } },
                  h('span', { style: { fontSize: 10, color: '#fbbf24' } }, '\u2B50 Average weekly rating: ' + avgRating + '/5 across ' + weeklyCheckins.length + ' weeks')
                );
              })() : null,

              // Save button
              h('button', { onClick: function() {
                if (!weeklyDraft.rating) {
                  if (addToast) addToast('Please rate your week before saving.', 'warning');
                  return;
                }
                saveWeeklyCheckin();
              }, style: { width: '100%', padding: '12px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', marginBottom: 20 } }, '\u2705 Save Weekly Check-In'),

              // Past check-ins
              weeklyCheckins.length > 0 ? h('div', { style: { marginTop: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10 } }, '\uD83D\uDCC5 Past Weekly Check-Ins (' + weeklyCheckins.length + ')'),
                weeklyCheckins.slice().reverse().map(function(ci, idx) {
                  var dateStr = new Date(ci.date).toLocaleDateString();
                  var stars = '';
                  for (var si = 0; si < 5; si++) { stars += si < (ci.rating || 0) ? '\u2B50' : '\u2606'; }
                  return h('div', { key: ci.id || idx, style: { padding: 12, marginBottom: 8, borderRadius: 10, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.10)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                      h('span', { style: { fontSize: 11, fontWeight: 'bold', color: '#a5b4fc' } }, 'Week of ' + (ci.weekOf || dateStr)),
                      h('span', { style: { fontSize: 12 } }, stars)
                    ),
                    ci.progressSummary && ci.progressSummary.length > 0 ? h('div', { style: { marginBottom: 6 } },
                      h('div', { style: { fontSize: 10, fontWeight: 'bold', color: '#34d399', marginBottom: 3 } }, 'Progress:'),
                      ci.progressSummary.map(function(ps, psi) {
                        return h('div', { key: psi, style: { fontSize: 10, color: '#94a3b8', paddingLeft: 8 } }, '\u2022 ' + ps.text + ' (' + ps.progress + '%)');
                      })
                    ) : null,
                    ci.obstacles ? h('div', { style: { marginBottom: 4 } },
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: '#f87171' } }, 'Obstacles: '),
                      h('span', { style: { fontSize: 10, color: '#94a3b8' } }, ci.obstacles)
                    ) : null,
                    ci.focus ? h('div', null,
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: '#818cf8' } }, 'Next focus: '),
                      h('span', { style: { fontSize: 10, color: '#94a3b8' } }, ci.focus)
                    ) : null
                  );
                })
              ) : null
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
              // ── Category Visual Dashboard ──
              h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 10 } }, '\uD83C\uDFC6 Category Dashboard'),
              categoryStats.map(function(cs) {
                if (cs.count === 0) return null;
                return h('div', { key: cs.id, style: { padding: 12, marginBottom: 10, borderRadius: 12, background: cs.color + '08', border: '1px solid ' + cs.color + '22' } },
                  // Category header row
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('span', { style: { fontSize: 18 } }, cs.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 'bold', color: cs.color } }, cs.label),
                      h('div', { style: { fontSize: 10, color: '#94a3b8' } }, cs.count + ' goal' + (cs.count !== 1 ? 's' : '') + ' \u2022 ' + cs.completedCount + ' completed')
                    )
                  ),
                  // Completion rate bar
                  h('div', { style: { marginBottom: 6 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                      h('span', { style: { fontSize: 10, color: '#94a3b8' } }, 'Completion Rate'),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: cs.completionRate >= 75 ? '#34d399' : cs.completionRate >= 40 ? '#fbbf24' : cs.color } }, cs.completionRate + '%')
                    ),
                    h('div', { style: { height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      h('div', { style: { width: cs.completionRate + '%', height: '100%', background: cs.completionRate >= 75 ? '#22c55e' : cs.completionRate >= 40 ? '#f59e0b' : cs.color, borderRadius: 4, transition: 'width 0.3s' } })
                    )
                  ),
                  // Avg step completion bar
                  h('div', { style: { marginBottom: 8 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                      h('span', { style: { fontSize: 10, color: '#94a3b8' } }, 'Avg Step Progress'),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: cs.avgStepCompletion >= 75 ? '#34d399' : cs.avgStepCompletion >= 40 ? '#fbbf24' : '#64748b' } }, cs.avgStepCompletion + '%')
                    ),
                    h('div', { style: { height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      h('div', { style: { width: cs.avgStepCompletion + '%', height: '100%', background: cs.avgStepCompletion >= 75 ? '#34d399' : cs.avgStepCompletion >= 40 ? '#fbbf24' : cs.color + '88', borderRadius: 3, transition: 'width 0.3s' } })
                    )
                  ),
                  // AI motivational tip
                  cs.tip ? h('div', { style: { padding: '8px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.10)', display: 'flex', alignItems: 'flex-start', gap: 6 } },
                    h('span', { style: { fontSize: 12 } }, '\uD83E\uDD16'),
                    h('span', { style: { fontSize: 10, color: '#a5b4fc', lineHeight: 1.5, fontStyle: 'italic' } }, cs.tip)
                  ) : null
                );
              }),

              // Category distribution (simple bar view)
              h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, marginTop: 16 } }, 'Goals by Category'),
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
              // Milestone summary
              (function() {
                var msCount = Object.keys(milestonesShown).length;
                if (msCount === 0) return null;
                return h('div', { style: { marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', { style: { fontSize: 22 } }, '\uD83D\uDDFC'),
                  h('div', null,
                    h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd' } }, 'Milestones Reached: ' + msCount),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'You earned ' + (msCount * 5) + ' bonus XP from milestones!')
                  )
                );
              })(),

              // Weekly check-in summary in progress
              weeklyCheckins.length > 0 ? h('div', { style: { marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 18 } }, '\uD83D\uDCDD'),
                h('div', null,
                  h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#a5b4fc' } }, weeklyCheckins.length + ' Weekly Check-In' + (weeklyCheckins.length !== 1 ? 's' : '') + ' Completed'),
                  (function() {
                    var totalR = 0;
                    weeklyCheckins.forEach(function(c) { totalR += (c.rating || 0); });
                    var avgR = weeklyCheckins.length > 0 ? (totalR / weeklyCheckins.length).toFixed(1) : '0';
                    return h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Average rating: ' + avgR + '/5 \u2B50');
                  })()
                )
              ) : null,

              // Goal progress list
              goals.length > 0 ? h('div', { style: { marginTop: 16 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, 'Individual Goal Progress'),
                goals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  var milestones = getGoalMilestones(goal);
                  return h('div', { key: goal.id, style: { padding: '8px 10px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: milestones.length > 0 ? 4 : 0 } },
                      h('span', null, cat.emoji),
                      h('span', { style: { flex: 1, fontSize: 11, color: goal.completed ? '#6ee7b7' : '#cbd5e1', textDecoration: goal.completed ? 'line-through' : 'none' } }, goal.text || '(unnamed)'),
                      h('div', { style: { width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' } },
                        h('div', { style: { width: goal.progress + '%', height: '100%', background: goal.completed ? '#22c55e' : cat.color, borderRadius: 3 } })
                      ),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: goal.completed ? '#22c55e' : cat.color, width: 28, textAlign: 'right' } }, goal.progress + '%')
                    ),
                    milestones.length > 0 ? h('div', { style: { display: 'flex', gap: 4, paddingLeft: 28, marginTop: 2 } },
                      milestones.map(function(ms) {
                        return h('span', { key: ms.threshold, style: { fontSize: 8, padding: '1px 5px', borderRadius: 4, background: ms.isCurrent ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (ms.isCurrent ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.08)'), color: ms.isCurrent ? '#34d399' : '#475569' } }, ms.threshold + '%' + (ms.isCurrent ? ' \u2713' : ''));
                      })
                    ) : null
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
