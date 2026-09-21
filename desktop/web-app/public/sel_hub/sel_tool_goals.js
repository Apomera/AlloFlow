// ═══════════════════════════════════════════════════════════════
// sel_tool_goals.js — Goal Setter Plugin (v4.0)
// SMART goals builder, progress tracker, milestone celebrations,
// habit streak counter, AI goal coach, vision board,
// goal reflection journal, habit tracker, goal buddy system,
// motivational boosts, achievement badges, weekly check-ins,
// category dashboard, goal milestones, daily nudges,
// accountability partner enhancements, goal journaling with
// celebration screens, SMART examples library, goal difficulty
// rating, progress celebration milestones, habit categories
// with weekly chart, habit of the week spotlight, and expanded
// badge system.
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

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-goals')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-goals'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

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
      {"cat": "social", "text": "Choose a way to ask to join an activity", "hint": "An adult can help; a yes or a new friendship is not required."},
      {"cat": "social", "text": "Offer help and respect the answer", "hint": "Ask first. Someone working alone may want space."},
      {"cat": "social", "text": "Practice asking for a turn or for adult help", "hint": "Words, pictures and gestures all count as communication."},
      {"cat": "personal", "text": "Choose a small new activity with support", "hint": "You can ask about it, try a part, or decide it does not fit."},
      {"cat": "personal", "text": "Choose a comfortable pause or ask for help", "hint": "Movement, looking around or a different support can fit; calmness is not required."},
      {"cat": "personal", "text": "Reflect in a way that works for me", "hint": "Draw, think or use a few words; personal sharing and daily writing are optional."},
      {"cat": "personal", "text": "Plan how to use or save something available to me", "hint": "A trusted adult can help; having an allowance is not assumed."},
      {"cat": "health", "text": "Ask for help getting drinking water at school", "hint": "An adult can help with water, a cup and access; owning a bottle is not required."},
      {"cat": "health", "text": "Choose a way to move or join in that fits me", "hint": "You can ask for changes, try a smaller part or rest."},
      {"cat": "health", "text": "Ask for help getting ready to rest", "hint": "Choose one step together; falling asleep is not a test."},
      {"cat": "creative", "text": "Try two ways to show an idea in art", "hint": "Use materials and support available to you; notice what each choice shows."},
      {"cat": "creative", "text": "Explore a short musical pattern with a helpful cue", "hint": "Choose a comfortable way to take part and ask for a model if needed."},
      { cat: 'community', text: 'Help with one chore at home without being asked', hint: 'Being helpful makes everyone\'s day better!' },
      { cat: 'community', text: 'Pick up 5 pieces of litter at school or outside', hint: 'Small actions make a big difference!' }
    ],
    middle: [
      { cat: 'academic', text: 'Study for ___ minutes each day using a timer', hint: 'Consistency beats cramming!' },
      { cat: 'academic', text: 'Complete all homework before ___ PM', hint: 'A deadline keeps you focused.' },
      { cat: 'academic', text: 'Ask at least one question in class this week', hint: 'Curiosity is a strength, not a weakness.' },
      { cat: 'academic', text: 'Build a portfolio of my best work this semester', hint: 'Tracking your growth builds confidence!' },
      { cat: 'academic', text: 'Read 1 book per month outside of school assignments', hint: 'Readers are leaders!' },
      {"cat": "social", "text": "Try a connection opportunity that fits my interests and access needs", "hint": "Choose a suitable setting; another person's response is not your score."},
      {"cat": "social", "text": "Ask what support a friend wants before giving advice", "hint": "Respect space and your own limits; involve an adult when more help is needed."},
      {"cat": "social", "text": "Practice a request or boundary with support", "hint": "Agreement is not guaranteed, and you can ask for adult help."},
      {"cat": "personal", "text": "Try a reflection format that fits my privacy and time", "hint": "There is no page quota or daily streak to keep."},
      {"cat": "personal", "text": "Notice what I need during one chosen moment", "hint": "An uncertain or mixed feeling is allowed; a label does not have to change it."},
      {"cat": "personal", "text": "Choose a manageable part of a project I care about", "hint": "Check time, materials and support before deciding when to try."},
      {"cat": "health", "text": "Plan one practical change for drinking access", "hint": "Consider a usable refill point and bathroom access; no intake total is required."},
      {"cat": "health", "text": "Explore an accessible movement option I enjoy", "hint": "Check space, energy and support; minutes and repetitions are optional."},
      {"cat": "health", "text": "Ask for support with one barrier to preparing for sleep", "hint": "Shared space and workload matter; you do not have to solve them alone."},
      {"cat": "creative", "text": "Revise one part of a creative project for a reason", "hint": "Compare what changed and whether it fits your intention; sharing is optional."},
      {"cat": "creative", "text": "Practise one creative skill with a model or support", "hint": "Choose a manageable part and review what the strategy helps you do."},
      { cat: 'community', text: 'Volunteer for ___ hours this month', hint: 'Helping others helps you find purpose.' },
      { cat: 'community', text: 'Organize a study group for a difficult class', hint: 'Teaching others helps you learn too!' }
    ],
    high: [
      { cat: 'academic', text: 'Maintain a ___ GPA this semester through daily study habits', hint: 'Systems > willpower.' },
      { cat: 'academic', text: 'Research 3 colleges/programs aligned with my interests', hint: 'Clarity reduces anxiety.' },
      { cat: 'academic', text: 'Develop a study system (Cornell notes, spaced repetition, etc.)', hint: 'How you study matters more than how long.' },
      {"cat": "social", "text": "Try a listening support that helps mutual understanding", "hint": "Notes, pauses and clarification can help; eye contact is not required."},
      {"cat": "social", "text": "Prepare a boundary that fits my responsibilities", "hint": "Choose the format and how much to explain; support is available if pressure continues."},
      {"cat": "social", "text": "Explore a connection opportunity with privacy and access in mind", "hint": "Choose a school-supported route if it fits; replies and popularity are not the measure."},
      {"cat": "personal", "text": "Try a routine with a flexible review point", "hint": "There is no fixed number of days that proves a routine is right for you."},
      {"cat": "personal", "text": "Name a barrier and consider a strategy or support change", "hint": "Concerns can reflect real constraints; positive reframing is not always the answer."},
      {"cat": "personal", "text": "Adapt a routine to my current responsibilities", "hint": "Consider a smaller option, practical help or a pause."},
      {"cat": "personal", "text": "Choose work to keep in a private or shared portfolio", "hint": "Public branding and disclosure are optional; choose the purpose and audience."},
      {"cat": "health", "text": "Arrange drinking access that fits my day and individual needs", "hint": "Choose a setting and practical support; this tool does not set fluid targets."},
      {"cat": "health", "text": "Plan a suitable movement opportunity with room to adapt", "hint": "Check access and any individual guidance; stopping or resting is allowed."},
      {"cat": "health", "text": "Request one feasible change to support preparation for rest", "hint": "Consider schedules, responsibilities and shared space; sleep data is optional."},
      {"cat": "creative", "text": "Test an artistic choice and use focused feedback", "hint": "Decide what effect you want and what to keep or revise; public sharing is a separate choice."},
      {"cat": "creative", "text": "Develop a creative piece for an audience I choose", "hint": "A private draft can be worthwhile; choose a format, support and review point that fit."},
      { cat: 'community', text: 'Organize or participate in a community service project', hint: 'Leadership is action, not title.' },
      { cat: 'community', text: 'Mentor a younger student in something I\'m good at', hint: 'Teaching is the highest form of understanding.' },
      { cat: 'community', text: 'Start or join a club aligned with my passions', hint: 'Find your people.' }
    ]
  };

  // Date-only habit records use the device calendar, including DST transitions.
  function goalHabitWeekDates(now) {
    var anchor = new Date(now);
    anchor.setHours(12, 0, 0, 0);
    var dates = [];
    for (var offset = 6; offset >= 0; offset--) {
      var day = new Date(anchor.getTime());
      day.setDate(anchor.getDate() - offset);
      dates.push(day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0'));
    }
    return dates;
  }

  // ── Weekly review record helpers ──
  function goalReviewSnapshot(goals, now) {
    var start = now - 7 * 86400000;
    return (goals || []).map(function(goal) {
      var steps = goal.steps || [];
      var done = steps.filter(function(step) { return step.done; });
      var dated = done.filter(function(step) { return typeof step.completedAt === 'number' && isFinite(step.completedAt) && step.completedAt > 0; });
      var recent = dated.filter(function(step) { return step.completedAt >= start && step.completedAt <= now; });
      return { goalId: goal.id, text: goal.text || 'Unnamed goal', progress: goal.progress || 0, stepsComplete: recent.length, totalSteps: steps.length, totalComplete: done.length, undatedComplete: done.length - dated.length };
    });
  }

  function goalReviewRating(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
  }

  function goalReviewRatingText(checkins) {
    var ratings = (checkins || []).map(function(entry) { return goalReviewRating(entry.rating); }).filter(function(value) { return value != null; });
    if (!ratings.length) return 'No weekly ratings recorded.';
    var average = ratings.reduce(function(sum, value) { return sum + value; }, 0) / ratings.length;
    return 'Average recorded rating: ' + average.toFixed(1) + '/5 from ' + ratings.length + ' rated check-in' + (ratings.length === 1 ? '' : 's') + '. This is not a measure of learning or wellbeing.';
  }

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
    habitFormer: { icon: '\uD83D\uDD01', name: 'Habit Former', desc: 'Historical award for seven recorded days; new checks do not earn this award' },
    visionCreator: { icon: '\uD83C\uDF1F', name: 'Vision Creator', desc: 'Create a vision board entry' },
    reflectiveAchiever: { icon: '\uD83E\uDE9E', name: 'Reflective Achiever', desc: 'Write a reflection on a completed goal' },
    accountabilityPartner: { icon: '\uD83E\uDD1D', name: 'Accountability Partner', desc: 'Share a goal with a buddy' },
    habitMaster: { icon: '\uD83C\uDFC5', name: 'Habit Master', desc: 'Historical award for a full week of records; new checks do not earn this award' },
    weeklyReviewer: { icon: '\uD83D\uDCDD', name: 'Weekly Reviewer', desc: 'Complete 3 weekly check-ins' },
    milestoneMaker: { icon: '\uD83D\uDDFC', name: 'Milestone Maker', desc: 'Reach a 50% milestone on any goal' },
    categoryExplorer: { icon: '\uD83E\uDDED', name: 'Category Explorer', desc: 'Set goals in 4+ categories' },
    habitHero: { icon: '\uD83E\uDDB8', name: 'Habit Hero', desc: '14-day accountability streak' },
    visionAchiever: { icon: '\uD83C\uDF20', name: 'Vision Achiever', desc: 'Fill all vision board sections' },
    // v4.0 badges
    habitChampion: { icon: '\uD83E\uDD47', name: 'Habit Champion', desc: 'Historical award for three days of records; new checks do not earn this award' },
    difficultySeeker: { icon: '\uD83D\uDD25', name: 'Difficulty Seeker', desc: 'Complete a hard goal (difficulty 4+)' },
    smartExampleUser: { icon: '\uD83D\uDCD6', name: 'SMART Learner', desc: 'Use a SMART example as template' },
    journey25: { icon: '\uD83D\uDEA9', name: 'Journey 25%', desc: 'Complete 25% of all goals' },
    journey50: { icon: '\uD83C\uDFD4\uFE0F', name: 'Halfway There', desc: 'Complete 50% of all goals' },
    journey75: { icon: '\uD83C\uDF05', name: 'Almost There', desc: 'Complete 75% of all goals' },
    journey100: { icon: '\uD83C\uDF1F', name: 'Journey Complete', desc: 'Complete 100% of all goals' },
    habitCategorist: { icon: '\uD83D\uDDC2\uFE0F', name: 'Habit Organizer', desc: 'Add habits in 3+ categories' }
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
  "elementary": [
    "A blank day does not erase earlier tries. You can ask what would help next.",
    "You can restart at a time that fits, choose a smaller try or take a break.",
    "If the routine is hard to use, an adult can help change the plan.",
    "A plan can change when your day changes.",
    "You do not need to catch up on every missed day."
  ],
  "middle": [
    "A missing record does not explain what happened. Consider time, access and support.",
    "Restarting can wait until the plan fits; a smaller option or pause is available.",
    "If the same barrier keeps returning, change the strategy or ask for support.",
    "You can keep useful learning even when you stop a routine.",
    "Review what matters now before deciding to continue."
  ],
  "high": [
    "A streak is a record pattern, not a measure of your worth or learning.",
    "Consider the fit, resources and costs before restarting a routine.",
    "A pause, changed scope or different goal can be a deliberate decision.",
    "Recurring barriers may call for practical support or changed conditions.",
    "Review what the routine contributes, not just how often it is recorded."
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
  "You can review whether this goal still matters to you.",
  "Consider one manageable action, a support request or a pause.",
  "Check whether the time and resources you need are available.",
  "A smaller option can help you test whether a plan fits.",
  "A missing record is not a judgment about your day.",
  "You can revise the plan before deciding to restart.",
  "Notice what has helped, including people and changes in the setting.",
  "If a barrier keeps returning, consider a different strategy or more support.",
  "Rest and other responsibilities can be part of the plan.",
  "You do not need daily action for every goal. Choose a review point that fits."
];

  // ── SMART Goal Examples Library (3 per category, grade-adaptive) ──
  var SMART_EXAMPLES = {
    academic: [
      {
        title: 'Reading Challenge',
        smart: {
          S: { elementary: 'I will read 2 chapter books this month.', middle: 'I will read 3 books from my teacher\'s recommended list this month.', high: 'I will read 4 non-fiction books related to my AP course topics this semester.' },
          M: { elementary: 'I will finish 2 books and tell my teacher about each one.', middle: 'I\'ll track each book in my reading log and write a 1-paragraph summary.', high: 'I\'ll annotate key passages and maintain a reading journal with 5+ entries per book.' },
          A: { elementary: 'I can read for 15 minutes every day after school.', middle: 'I have 30 minutes of free reading time daily and access to the library.', high: 'I have consistent evening study time and a curated reading list already prepared.' },
          R: { elementary: 'Reading helps me learn new words and cool stories!', middle: 'Reading builds vocabulary and critical thinking that helps across all subjects.', high: 'Extensive reading strengthens analytical skills essential for college-level coursework.' },
          T: { elementary: 'I will finish both books by the last day of this month.', middle: 'I will complete all 3 books by the 28th of this month.', high: 'I will finish all 4 books by the end of this semester with journal entries submitted weekly.' }
        }
      },
      {
        title: 'Grade Improvement',
        smart: {
          S: { elementary: 'I will practice math for 10 minutes every day.', middle: 'I will raise my science grade from a C to a B this quarter.', high: 'I will raise my GPA from 3.2 to 3.5 by focusing on my two weakest subjects.' },
          M: { elementary: 'I will do 10 practice problems every day and check my answers.', middle: 'I\'ll track my test scores and homework grades weekly in a spreadsheet.', high: 'I\'ll track grades bi-weekly and meet with each teacher once a month for feedback.' },
          A: { elementary: 'I can ask my mom or dad to help me if I get stuck.', middle: 'I can attend tutoring on Tuesdays and Thursdays after school.', high: 'I have access to office hours, study groups, and online resources like Khan Academy.' },
          R: { elementary: 'Getting better at math makes me feel proud!', middle: 'Better grades open doors for the programs I want to join.', high: 'A higher GPA strengthens my college applications and scholarship opportunities.' },
          T: { elementary: 'I will do this every day for the next 4 weeks.', middle: 'I will reach a B by the end of this grading quarter (10 weeks).', high: 'I will achieve the 3.5 GPA by the end of this academic semester.' }
        }
      },
      {
        title: 'Study Habits',
        smart: {
          S: { elementary: 'I will organize my backpack every night before bed.', middle: 'I will use a planner to write down all assignments and due dates daily.', high: 'I will implement the Pomodoro technique for all study sessions this month.' },
          M: { elementary: 'I will check that I have all my books and folders every night.', middle: 'I\'ll check off each assignment in my planner and review weekly.', high: 'I\'ll log study sessions, breaks, and productivity ratings in a tracker app.' },
          A: { elementary: 'I can do this right after dinner each night.', middle: 'I already have a planner from school and 5 minutes at the end of each class.', high: 'I have a timer app and a dedicated study space with minimal distractions.' },
          R: { elementary: 'Being organized means I won\'t forget my homework!', middle: 'Staying organized reduces stress and helps me manage my time.', high: 'Effective study systems are proven to improve retention and reduce burnout.' },
          T: { elementary: 'I will do this every school night for 3 weeks.', middle: 'I will use my planner consistently for the full month of April.', high: 'I will follow this system for 30 consecutive days starting Monday.' }
        }
      }
    ],
    social: [
  {
    "id": "invitation",
    "title": "Connection with choice",
    "smart": {
      "S": {
        "elementary": "I will choose a way to ask whether I can join a game I am interested in.",
        "middle": "I will choose a setting that works for me and offer a greeting or shared activity when it seems welcome.",
        "high": "I will explore one interest-based connection opportunity that fits my time, access and privacy preferences."
      },
      "M": {
        "elementary": "I will notice whether I made my request or asked an adult to help; I do not need a yes to count my chosen action.",
        "middle": "I will note whether I tried my chosen approach and whether the setting supported participation, without recording another person's private details.",
        "high": "I will review whether I took a chosen action and respected contact boundaries, without measuring success by replies or popularity."
      },
      "A": {
        "elementary": "I can use words, a gesture or a communication aid, with an adult nearby if needed.",
        "middle": "I can ask staff about a quieter activity and choose speech, writing or another communication method.",
        "high": "I can ask an adviser about an accessible school-hosted option and decline to exchange personal contact details."
      },
      "R": {
        "elementary": "I want a chance to enjoy a shared activity while respecting my choice and other people's responses.",
        "middle": "I want connection that fits my interests and comfort, rather than a required number of friends.",
        "high": "I value shared interests and reciprocal connection while keeping room for my other priorities."
      },
      "T": {
        "elementary": "I will try at one suitable recess this week and review the plan with an adult afterward.",
        "middle": "I will review after one chosen opportunity this week and adjust or pause if the setting does not fit.",
        "high": "I will review after the first opportunity or in two weeks, whichever comes first, and decide whether to continue, adapt or stop."
      }
    },
    "context": {
      "elementary": {
        "situation": "A child wants to join a playground game but does not know whether there is room.",
        "agency": "The child can choose a way to ask. Other children can answer; a yes or a new friendship is not something the child can guarantee.",
        "support": "A playground adult can help explain the game, offer another activity, or address repeated exclusion. Speech, a gesture or a communication aid can all be used.",
        "review": "If joining is not possible, consider another activity or adult help. Review whether there was a fair opportunity, not whether everyone became friends."
      },
      "middle": {
        "situation": "A learner wants more connection at school but finds the cafeteria too noisy for conversation.",
        "agency": "The learner can choose a setting and offer a greeting or shared activity. They cannot set a deadline for another person to become a friend.",
        "support": "A quieter club or supported activity may fit better. Staff should address access barriers or repeated exclusion rather than requiring more social effort.",
        "review": "After a trial, consider keeping the setting, choosing a different one, requesting access support or pausing. Count a chosen attempt, not conversations collected."
      },
      "high": {
        "situation": "A student wants to connect with peers around an interest but has limited time and does not want to share personal contact information.",
        "agency": "The student can choose one opportunity and a contact boundary. They cannot control replies or how quickly trust develops.",
        "support": "A school-hosted activity may avoid travel costs or sharing personal accounts. An adviser can clarify access and expectations.",
        "review": "If the opportunity requires unwanted disclosure or unavailable time, change the route. A lack of replies is information about fit, not a personal deficit."
      }
    }
  },
  {
    "id": "support",
    "title": "Support that respects preferences",
    "smart": {
      "S": {
        "elementary": "I will ask whether a classmate wants help before joining in or touching their work.",
        "middle": "I will ask what kind of support, if any, a friend wants before offering advice.",
        "high": "I will try one listening support, such as a pause, written notes or a clarification question, during a suitable group discussion."
      },
      "M": {
        "elementary": "I will notice whether I offered a choice and respected the answer, including no.",
        "middle": "I will notice whether I listened to the preference and stayed within my own limits, without keeping a record of their private story.",
        "high": "I will check my understanding in a way that works for me, rather than rating my eye contact or how still I sat."
      },
      "A": {
        "elementary": "I can practice a short offer with an adult and keep my own materials and needs in mind.",
        "middle": "I can offer a short check-in, respect a request for space and involve a trusted adult when the concern needs more support.",
        "high": "I can ask the group or teacher to allow processing time and shared notes, and invite others to name access needs without disclosure pressure."
      },
      "R": {
        "elementary": "I want to show care in a way the other child can choose.",
        "middle": "I want to be supportive without taking responsibility for someone else's feelings or becoming their only support.",
        "high": "I want mutual understanding and accessible participation, not a performance of looking attentive."
      },
      "T": {
        "elementary": "I will try at one suitable moment and think with an adult about what to keep or change.",
        "middle": "After one appropriate check-in this week, I will review whether the approach fit and whether more adult support is needed.",
        "high": "I will review after the next group discussion and keep or change the support based on what helped understanding."
      }
    },
    "context": {
      "elementary": {
        "situation": "A child sees a classmate working alone and wants to help, but does not know whether help is wanted.",
        "agency": "The child can offer help once and listen to the answer. Working alone does not automatically mean someone is lonely or needs help.",
        "support": "An adult can help find words or a gesture for an offer. The classmate can say no; the child can choose a different kind action or return to their own work.",
        "review": "Check whether the offer left room for a real choice. A smile, thank-you or shared activity is not required."
      },
      "middle": {
        "situation": "A learner wants to support a friend who seems upset, but the friend has not explained what happened.",
        "agency": "The learner can offer company, listening or space. They cannot make the friend disclose, accept advice or feel better.",
        "support": "Ask whether the friend wants listening or practical help, and keep personal limits. A serious safety concern needs appropriate adult support.",
        "review": "Check whether both people had choices and manageable boundaries. Do not judge the effort by how quickly the friend feels better."
      },
      "high": {
        "situation": "A student wants to listen well during group work. The group often talks quickly, and the student processes speech more easily with pauses or written notes.",
        "agency": "Listening can involve clarification, notes and extra processing time. Eye contact, stillness and an immediate spoken response are not proof of attention.",
        "support": "Agree on pauses or shared notes and ask what would help others participate too. A teacher can address a format that excludes people.",
        "review": "Check whether the group understood one another and whether supports were available. If the format still blocks access, revise it rather than demanding more masking."
      }
    }
  },
  {
    "id": "boundary",
    "title": "Communicate a need or boundary",
    "smart": {
      "S": {
        "elementary": "I will use a way that works for me to ask for a turn or ask an adult to help.",
        "middle": "I will practice a specific request about dividing the project, then choose whether to use it or ask the teacher to help.",
        "high": "I will prepare a brief limit on extra club duties and choose a suitable way to communicate it or get adviser support."
      },
      "M": {
        "elementary": "I will notice whether I communicated my need or got support, not whether I felt calm the whole time.",
        "middle": "I will check whether I expressed my concern or sought support, without requiring the teammate to agree.",
        "high": "I will review whether I stated my limit or requested support, not whether the organizer approved."
      },
      "A": {
        "elementary": "I can use words, a picture or a gesture; an adult can help arrange fair turns.",
        "middle": "I can rehearse in writing, ask for time, or bring the request to the teacher if direct discussion does not fit.",
        "high": "I can use a written message, a supported conversation or the adviser, and keep my reasons private."
      },
      "R": {
        "elementary": "I want to share access while making room for my needs and feelings.",
        "middle": "I want a fair, workable way to participate without having to hide disagreement.",
        "high": "I want sustainable participation that fits my responsibilities and boundaries."
      },
      "T": {
        "elementary": "I will practice with an adult once this week and review what support I might need in the classroom.",
        "middle": "I will review before the next project checkpoint and adjust the plan if the division or support is still unclear.",
        "high": "I will review after the next request or club meeting and seek further support if the pressure continues."
      }
    },
    "context": {
      "elementary": {
        "situation": "Two children want the same classroom material. One child needs help asking for a turn.",
        "agency": "The child can ask for a turn or adult help. They do not have to stop feeling upset before they deserve support.",
        "support": "An adult can help arrange fair turns and support words, pictures or gestures. A learner is not responsible for settling an unsafe situation alone.",
        "review": "Check whether there was a fair way to use the material. If a child is being threatened or repeatedly targeted, ask an adult to respond."
      },
      "middle": {
        "situation": "A learner disagrees with a teammate about dividing a project. There are no threats, but the learner is unsure how to ask for a change.",
        "agency": "The learner can describe a concern and request. Agreement depends on others too; resolving the disagreement is not a task the learner can guarantee.",
        "support": "The teacher can clarify fair expectations or support separate input. If threats, repeated targeting or unequal power emerge, stop treating it as a shared negotiation.",
        "review": "Review whether the request was understood and whether the task division is workable. A need for adult help is not failed communication."
      },
      "high": {
        "situation": "A student wants to decline extra club duties while staying involved. They worry that an organizer may keep pushing after a refusal.",
        "agency": "The student can set a limit in a suitable form and decide how much to explain. They cannot guarantee approval or prevent another person's disappointment.",
        "support": "An adviser can clarify expectations and address pressure or retaliation. The student need not repeatedly negotiate a boundary or disclose personal circumstances.",
        "review": "Check whether the limit was respected and participation remained accessible. If pressure continues, seek support or reconsider involvement rather than treating persistence as a communication test."
      }
    }
  }
],
    personal: [
  {
    "id": "example-0",
    "title": "Reflection in a form that fits",
    "smart": {
      "S": {
        "elementary": "I will choose a way to notice one part of my day, such as a drawing, a few words or quiet thought.",
        "middle": "I will try a brief reflection in a form and setting that fit my privacy and access needs.",
        "high": "I will choose one question about the week and a reflection format that fits my time and privacy preferences."
      },
      "M": {
        "elementary": "I will notice whether the way I chose helped me reflect; there is no required amount to write.",
        "middle": "I will review whether it helped me notice something useful, without counting pages or collecting a streak.",
        "high": "I will consider whether the reflection clarified a choice, a support need or something still uncertain."
      },
      "A": {
        "elementary": "I can ask for materials or a little time and choose what I keep private.",
        "middle": "I can choose quiet thought, a drawing or a short note, and ask for an appropriate time or space.",
        "high": "I can use a short note or unrecorded thought without a paid app, fixed daily time or disclosure requirement."
      },
      "R": {
        "elementary": "I want a way to remember or understand something that matters to me.",
        "middle": "I want room to reflect without pressure to disclose personal experiences.",
        "high": "I value understanding my experience while keeping reflection manageable."
      },
      "T": {
        "elementary": "I will try at one suitable time this week and decide with support whether to keep, change or pause it.",
        "middle": "I will review after two chosen opportunities, or at the end of next week, and adapt or pause if it does not fit.",
        "high": "I will review the fit after one week and decide whether to continue, simplify or pause."
      }
    },
    "context": {
      "elementary": {
        "situation": "A child wants to remember something from the day but does not enjoy writing long pages.",
        "agency": "The child can draw, use a few words, talk with someone they choose, or think without making a record.",
        "support": "An adult can help find materials or time. The child does not have to describe private events.",
        "review": "If the activity feels too long or unhelpful, try another form or pause; a full page is not the goal."
      },
      "middle": {
        "situation": "A learner wants time to reflect but does not have a reliably quiet evening or a private place to keep a journal.",
        "agency": "The learner can choose an unrecorded reflection or a brief note without names. Daily writing is not required.",
        "support": "A school space or another time may fit better. Do not assume a device, notebook or conversation is private.",
        "review": "Check whether the format and privacy arrangements work. Change the plan rather than treating missing entries as a failure."
      },
      "high": {
        "situation": "A student wants to review a demanding week but finds a structured daily journal burdensome.",
        "agency": "The student can choose one useful question and leave other topics alone. More detail is not necessarily more useful.",
        "support": "A brief unrecorded review, a private note or a chosen conversation can be options; access and privacy need checking.",
        "review": "Look for a useful decision or question, not a required positive feeling. Reduce the task, change format or stop if it is not helping."
      }
    }
  },
  {
    "id": "example-1",
    "title": "A pause with options",
    "smart": {
      "S": {
        "elementary": "I will choose a short pause that feels comfortable, such as looking around, moving gently or asking for help.",
        "middle": "I will try one comfortable transition option, such as noticing my surroundings, stretching or asking what comes next.",
        "high": "I will choose one comfortable break or attention shift that fits a work period."
      },
      "M": {
        "elementary": "I will notice whether the option was comfortable and useful, even if my feelings stayed the same.",
        "middle": "I will check comfort and usefulness rather than a number of minutes or a target calmness score.",
        "high": "I will review whether it supported participation or clarified a need for another kind of help."
      },
      "A": {
        "elementary": "I can keep my eyes open and breathe normally; an adult can help me choose a different option.",
        "middle": "I can keep breathing normally, stop an uncomfortable option and ask staff for transition support.",
        "high": "I can use a brief movement or external focus without a paid app, breath exercise or requirement to close my eyes."
      },
      "R": {
        "elementary": "I want a little room to get ready in a way that works for me.",
        "middle": "I want transitions that allow me to participate with the support I need.",
        "high": "I want a workable way to notice my needs during a demanding task."
      },
      "T": {
        "elementary": "I will try before one suitable activity and review the choice with an adult afterward.",
        "middle": "After one chosen transition this week, I will consider what to keep, change or ask for.",
        "high": "I will review after two suitable opportunities and choose whether to keep, adapt or stop the approach."
      }
    },
    "context": {
      "elementary": {
        "situation": "A child wants a pause between activities but does not like being told to close their eyes or take deep breaths.",
        "agency": "The child can choose a comfortable pause, movement or asking for help. They do not have to feel calm afterward.",
        "support": "An adult can help make a little space, explain the next activity or offer a different option.",
        "review": "Stop or change an option that feels uncomfortable. More quiet sitting is not automatically better."
      },
      "middle": {
        "situation": "A learner wants a transition pause, but the usual breathing exercise feels uncomfortable and the hallway is crowded.",
        "agency": "The learner can decline that exercise and try a different action. A pause does not require breath control or a particular feeling.",
        "support": "A staff member can help with transition time, a clearer next step or a more suitable place.",
        "review": "If access or comfort is still poor, change the environment or support rather than extending the exercise."
      },
      "high": {
        "situation": "A student wants a brief pause during work but does not find silent meditation useful.",
        "agency": "The student can try movement, an external focus or a practical break. They do not need to adopt meditation to have a valid plan.",
        "support": "Break timing, task demands and access to a suitable space can be discussed with the relevant adult or team.",
        "review": "If a pause does not address the barrier, revise workload, instructions or support. Do not interpret unchanged feelings as failed practice."
      }
    }
  },
  {
    "id": "example-2",
    "title": "Change the strategy, not just the words",
    "smart": {
      "S": {
        "elementary": "I will name one part that is hard and choose a clue, a different approach or a break with support.",
        "middle": "I will identify one difficult step and try a different strategy or request a specific support.",
        "high": "I will identify one project barrier and compare a strategy change with a request for practical support."
      },
      "M": {
        "elementary": "I will notice what helped me try or understand a step; using a special word is not the measure.",
        "middle": "I will compare what I could understand or do before and after the change, without rating my attitude.",
        "high": "I will review whether the change improved access, understanding or a concrete next step, not whether I felt positive."
      },
      "A": {
        "elementary": "An adult can show one step or help change the task, materials or timing.",
        "middle": "I can ask for an example, clearer directions or accessible materials and allow time for a response.",
        "high": "I can discuss scope, timing or resources with an appropriate adult and keep personal details limited to what support needs."
      },
      "R": {
        "elementary": "I want help with learning while making room for how I feel.",
        "middle": "I want a workable learning approach without blaming myself for every barrier.",
        "high": "I want to make an informed choice about learning and my other responsibilities."
      },
      "T": {
        "elementary": "I will review after one supported try and decide what to do next.",
        "middle": "I will review at the next work session and choose whether to keep the strategy, change it or ask for more help.",
        "high": "I will review at the next agreed checkpoint and decide whether to continue, adjust scope or pause."
      }
    },
    "context": {
      "elementary": {
        "situation": "A child says a puzzle is too hard. They are being encouraged to say yet, but they still do not know what to try.",
        "agency": "The child can describe the difficulty, ask for a clue or take a break. They do not have to replace an honest feeling with a cheerful phrase.",
        "support": "An adult can model a step, provide a different puzzle or help find another way to join in.",
        "review": "Check whether the support helped with the task. If it did not, ask for a different explanation or adjust the task."
      },
      "middle": {
        "situation": "A learner keeps rereading instructions without understanding them and thinks they are simply bad at the subject.",
        "agency": "The learner can name a specific difficulty without forcing a positive belief. Access barriers and unclear teaching can be part of the problem.",
        "support": "Ask for an example, chunked directions, accessible materials or another explanation. Practice does not replace needed support.",
        "review": "Check whether the new strategy helped with the actual task. If it did not, revise it or seek more help rather than repeating reassuring words."
      },
      "high": {
        "situation": "A student is struggling with a project while balancing other responsibilities. Reframing the problem as a limiting belief has not made the workload manageable.",
        "agency": "The student can examine what is known, choose a next action and name constraints. Not every concern is a distorted thought.",
        "support": "A teacher or adviser can help clarify priorities, adjust scope or address missing resources. Effort alone cannot provide unavailable time or access.",
        "review": "Review both the strategy and the conditions. A different goal, reduced scope or a pause can be a reasoned choice."
      }
    }
  }
],
    health: [
      {
        "id": "example-0",
        "title": "Make drinking water easier to access",
        "smart": {
          "S": {
            "elementary": "At a class check-in this week, I will ask how I can get drinking water when I need it.",
            "middle": "This week I will ask a trusted school adult to help arrange a workable way to get drinking water and use the bathroom.",
            "high": "By Friday I will identify one obstacle to drinking access in a chosen setting and request or arrange one practical change."
          },
          "M": {
            "elementary": "I can name or point to the agreed place and way to ask, or say that I still need help. I do not need to count drinks.",
            "middle": "I will check whether we agreed on a usable option, or whether another adult needs to help. No intake total is required.",
            "high": "I will note whether the change is available, still pending or needs revision. I will not use a universal volume target."
          },
          "A": {
            "elementary": "My teacher can help find an option I can use. Any drinking instructions in my care plan stay in place.",
            "middle": "I can use a private note or conversation. The arrangement needs to fit my access needs and any individual care instructions.",
            "high": "I can choose a low-cost option and ask for permission or access support. I will keep any individual fluid guidance already in place."
          },
          "R": {
            "elementary": "I want it to be easier to ask for what my body needs during school.",
            "middle": "I want school routines to make meeting my needs easier.",
            "high": "I want a practical way to meet my needs without adding unnecessary monitoring."
          },
          "T": {
            "elementary": "At our next class check-in, I will say whether the plan works or needs a change. I can ask for help sooner.",
            "middle": "At the next agreed check-in, I will review what worked and what still needs support; I can revise or pause this goal.",
            "high": "I will review the arrangement after the next opportunity to use it, or at a check-in next week if that opportunity does not happen."
          }
        },
        "context": {
          "elementary": {
            "situation": "A learner wants a drink during school, but the nearest fountain or class rule makes that difficult.",
            "agency": "Choose words, a picture or a trusted adult to help ask. Owning a bottle is not required.",
            "support": "An adult helps find safe drinking water, a usable cup and a way to take a drink when needed.",
            "review": "Check whether the access plan works; an unavailable drink is a problem adults need to help solve."
          },
          "middle": {
            "situation": "A learner skips drinking at school because the refill point is hard to reach or bathroom access is uncertain.",
            "agency": "Choose which access problem to discuss and how much to share; a daily intake log is optional.",
            "support": "A teacher or school nurse can help coordinate drinking and bathroom access without requiring a special bottle.",
            "review": "Review the arrangement, rather than scoring the amount consumed or blaming the learner for an access barrier."
          },
          "high": {
            "situation": "A learner wants more reliable drinking access across classes, work or travel, without turning it into a tracking challenge.",
            "agency": "Choose one setting and an optional reminder; body measurements and health details do not need to go in this tool.",
            "support": "A responsible adult or relevant health professional can help with access or individual fluid instructions.",
            "review": "An access plan can be successful even if a location or schedule still needs changes from someone else."
          }
        }
      },
      {
        "id": "example-1",
        "title": "Movement that fits me",
        "smart": {
          "S": {
            "elementary": "Before our next activity time, I will choose one way I might like to move or join in and ask for help if I need it.",
            "middle": "This week I will explore one accessible movement option I am interested in, starting with a part that feels manageable.",
            "high": "By the end of this week I will choose one suitable movement opportunity and plan the support or adaptations it needs."
          },
          "M": {
            "elementary": "I can say, draw or point to what fit and what needs changing. Choosing to stop is allowed.",
            "middle": "I can record one thing that fit and one change I want, or discuss them privately. Minutes and repetitions are optional.",
            "high": "I will review whether the opportunity was accessible and worthwhile for my chosen purpose. I do not need a fitness score or body measurements."
          },
          "A": {
            "elementary": "An adult can help change the space, rules or activity. I can rest and follow any activity guidance I already have.",
            "middle": "I will check space, cost and support first. I can stop, rest or ask for an adaptation, and keep any existing activity guidance.",
            "high": "I will check time, space and cost, follow existing individual guidance, and ask for qualified support if suitability is unclear. I can stop or rest."
          },
          "R": {
            "elementary": "I want a way to take part that fits me and something I enjoy.",
            "middle": "I want to find an activity that fits my interests and needs; a particular mood afterward is not required.",
            "high": "I want movement to fit my life and interests without treating it as a test of willpower or a promised mental-health treatment."
          },
          "T": {
            "elementary": "After that activity time, I will choose whether to try it again, change it or pause.",
            "middle": "After one opportunity, or at the end of the week if none is available, I will decide whether to continue, adapt or pause.",
            "high": "After the first opportunity, or at a check-in next week, I will decide what to keep, change or pause based on access and fit."
          }
        },
        "context": {
          "elementary": {
            "situation": "A learner wants to join a movement activity, but the space, rules or equipment may not fit.",
            "agency": "Choose an activity, a smaller part, an adapted role or a pause. Playing outside is not required.",
            "support": "An adult can help find a safe space and adaptations that fit the learner; equipment is not assumed.",
            "review": "Review access and comfort. Finishing a timer or feeling happier is not the measure."
          },
          "middle": {
            "situation": "A learner wants a movement option but has changing energy, access needs or no sports equipment.",
            "agency": "Choose the setting, duration and adaptations; rest or a different activity can be part of the plan.",
            "support": "A teacher, caregiver or qualified professional can help when suitability or adaptations are uncertain.",
            "review": "Consider whether the activity fits the learner, without ranking effort, appearance or classmates."
          },
          "high": {
            "situation": "A learner wants a workable movement routine alongside fluctuating energy, responsibilities or disability-related access needs.",
            "agency": "Choose a purpose and suitable activity; intensity, competition and public tracking are optional.",
            "support": "Check practical access and seek qualified advice when unsure what activity or adaptation is appropriate.",
            "review": "A review can lead to a smaller plan, more support, rest or a different choice without a failed-streak label."
          }
        }
      },
      {
        "id": "example-2",
        "title": "Support for getting ready to rest",
        "smart": {
          "S": {
            "elementary": "This week I will ask a trusted adult to help choose one step that could make getting ready to rest easier.",
            "middle": "This week I will choose one barrier to preparing for sleep and ask a trusted adult about a realistic change.",
            "high": "By Friday I will identify one barrier to preparing for rest and request or try one feasible change with appropriate support."
          },
          "M": {
            "elementary": "I can say whether we found a helpful step or still need help. I do not have to prove when I fell asleep.",
            "middle": "I will check whether we found a workable support or next step. I will not grade myself on how quickly I fall asleep.",
            "high": "I will review whether the change was workable and what support is still missing. A sleep app, exact bedtime or sleep-quality score is not required."
          },
          "A": {
            "elementary": "We can choose something that fits our home, like preparing a needed item or asking about light or noise. I do not have to change the household alone.",
            "middle": "I can ask about workload, light or noise and choose a step that fits my circumstances. A private bedroom or removing an assistive device is not assumed.",
            "high": "I will consider responsibilities, shared space and access needs before choosing a step. I can ask for workload or schedule support and keep assistive technology I need."
          },
          "R": {
            "elementary": "I want help making rest easier to prepare for.",
            "middle": "I want support for rest that takes my actual circumstances seriously.",
            "high": "I want a realistic plan for rest without blaming myself for circumstances I cannot control."
          },
          "T": {
            "elementary": "At our next check-in this week, I will say what fit or what needs changing. If sleep keeps being hard, I will tell a trusted adult.",
            "middle": "At an agreed check-in next week, I will review the change; if sleep problems continue, I will ask for help contacting a healthcare professional.",
            "high": "At a check-in next week I will keep, revise or pause the plan. If sleep problems persist, I will seek healthcare support rather than extend a tracking challenge."
          }
        },
        "context": {
          "elementary": {
            "situation": "A learner wants help getting ready to rest, but shares a room or cannot choose the household schedule.",
            "agency": "Choose one comfortable preparation step or ask for help; falling asleep on command is not a goal.",
            "support": "A trusted adult helps with the setting and routine. Repeated sleep trouble needs adult and health-professional support.",
            "review": "Notice whether the step fits. Stars for falling asleep and a fixed bedtime are not needed."
          },
          "middle": {
            "situation": "A learner has trouble preparing for sleep because of homework, a shared room or a changing family schedule.",
            "agency": "Choose one part within reach; sleep times, apps and detailed sleep records are not required here.",
            "support": "A trusted adult can help address noise, workload or other barriers; ongoing sleep problems can be discussed with a healthcare professional.",
            "review": "Review the support and preparation step. Lying awake does not mean the learner failed."
          },
          "high": {
            "situation": "A learner wants to prepare for rest while managing work, caregiving, school demands or a shared sleeping space.",
            "agency": "Choose one feasible change and a private review format. Wearable data and disclosure of household details are optional.",
            "support": "Support may involve schedule changes, workload adjustments or healthcare advice for ongoing sleep problems.",
            "review": "Separate what the learner can influence from changes requiring other people; falling asleep is not a performance target."
          }
        }
      }
    ],
    creative: [
      {
        "id": "example-0",
        "title": "Explore an artistic choice",
        "smart": {
          "S": {
            "elementary": "At my next art time, I will try two ways to show wind, such as swirly lines and torn-paper shapes.",
            "middle": "During my next project session, I will make two small versions of a poster detail, changing its size or contrast.",
            "high": "In my next available studio session, I will make two brief studies that vary one feature, such as framing, texture or color, for a chosen effect."
          },
          "M": {
            "elementary": "I will point to or describe a difference and choose which way I want to use. Both trials can be small.",
            "middle": "I will compare where my attention goes in each version and name one choice to keep or revise.",
            "high": "I will compare the studies against that effect and identify a feature to retain, revise or investigate. I can keep brief notes or explain the comparison."
          },
          "A": {
            "elementary": "I can use available materials, ask someone to help place pieces, or try one part first.",
            "middle": "I can use paper scraps or an available digital tool and ask for support with access. I will keep the comparison small enough for the time available.",
            "high": "I will use materials and access supports available to me, limit the study size and ask for a model if the technique is unfamiliar."
          },
          "R": {
            "elementary": "I want to find a way to show an idea I chose.",
            "middle": "I want to understand how a visual choice helps communicate my idea.",
            "high": "I want my artistic decisions to serve my purpose while leaving room for exploration."
          },
          "T": {
            "elementary": "After the trials, I will choose a next step or ask for another art time if I need it.",
            "middle": "At the end of that session, I will decide whether to develop one version, try another contrast or revise the scope.",
            "high": "After the studies, or at a check-in next week if access delays them, I will choose the next experiment, a revision or a pause."
          }
        },
        "context": {
          "elementary": {
            "situation": "A learner wants to show a windy day in a picture and is unsure which marks to use.",
            "agency": "Choose drawing, collage or another usable tool. The picture can be imagined and kept private.",
            "support": "A teacher can offer materials or model different marks; using adapted tools or help is welcome.",
            "review": "Compare what the marks show. If the tools make trying difficult, change the tool or ask for support."
          },
          "middle": {
            "situation": "A learner wants a poster to draw attention to one detail but has limited materials and time.",
            "agency": "Choose the subject and a visual feature to explore; a finished poster or online portfolio is optional.",
            "support": "Borrow materials, use an accessible digital tool or ask for a model. The comparison can use small rough versions.",
            "review": "Review whether the chosen feature serves the idea, rather than counting finished pieces or likes."
          },
          "high": {
            "situation": "A learner is developing a visual piece and wants to test an expressive choice before investing in a finished version.",
            "agency": "Choose the medium, intended effect and audience, including private study. Personal disclosure is optional.",
            "support": "A model, accessible materials or a mentor can help isolate one artistic variable without requiring new equipment.",
            "review": "An unexpected effect can inform the next experiment; popularity and daily output do not establish artistic quality."
          }
        },
        "feedback": {
          "elementary": {
            "question": "Which part looks windy to you? Can you point to what gave you that idea?",
            "response": "I can compare their answer with my idea and choose a mark to keep or change. Different people may notice different things."
          },
          "middle": {
            "question": "What did you notice first in these versions, and what drew your attention?",
            "response": "I can use a specific observation to make a revision. A preference without a reason is only one opinion; I can also review the versions myself."
          },
          "high": {
            "question": "What effect do you notice, and which specific choice creates it? I am looking for feedback on this feature today.",
            "response": "I can compare observations with my intention, try a suggestion or keep a deliberate choice. I decide the next step and whether to seek another perspective."
          }
        }
      },
      {
        "id": "example-1",
        "title": "Practise a musical passage",
        "smart": {
          "S": {
            "elementary": "At my next music time, I will try a short rhythm with a cue that helps me find the pauses.",
            "middle": "At my next available music session, I will practise one short transition using a slower pace or a cue from a model.",
            "high": "In my next available practice session, I will explore one passage with a chosen focus, such as phrasing, articulation or rhythmic clarity."
          },
          "M": {
            "elementary": "I will show or point to where a pause belongs and choose one part to try again or ask about.",
            "middle": "I will compare an early and a later attempt on the chosen transition and identify what became clearer or still needs help.",
            "high": "I will compare an early and later attempt against that focus and describe one effect of the strategy, including uncertainty or an unresolved difficulty."
          },
          "A": {
            "elementary": "I can use an available instrument, a comfortable tapping surface or visual rhythm cards, with help if needed.",
            "middle": "I will arrange access to an instrument or an appropriate adapted tool and choose a comfortable amount of practice. I can ask for a demonstration.",
            "high": "I will check instrument and space access, use an appropriate model or support, and keep the passage manageable. Recording is optional and I can take breaks."
          },
          "R": {
            "elementary": "I want to explore a musical pattern I enjoy.",
            "middle": "I want to understand a part of the music I chose, rather than only accumulate practice minutes.",
            "high": "I want to make a more deliberate musical choice in a piece that matters to me."
          },
          "T": {
            "elementary": "At the end of music time, I will choose whether to repeat the pattern, change a cue or try a smaller part.",
            "middle": "After that session, I will choose a next step; if equipment is unavailable this week, I will review the access plan with my teacher.",
            "high": "After the session, or at a check-in next week if access is delayed, I will retain, adapt or replace the strategy before expanding the passage."
          }
        },
        "context": {
          "elementary": {
            "situation": "A learner wants to try a short rhythm but the whole song feels too big.",
            "agency": "Choose a short pattern and a comfortable way to take part. Recording and performing for a group are optional.",
            "support": "A teacher can model the pattern with sound, movement, visual cues or an adapted instrument.",
            "review": "Check whether the pattern and support fit. A shorter pattern or another cue may help more than a longer timer."
          },
          "middle": {
            "situation": "A learner wants to play a phrase but gets stuck at one transition and has limited access to an instrument.",
            "agency": "Choose the phrase and one feature to practise. The evidence can be a live check, a private note or an optional recording.",
            "support": "A teacher or model can demonstrate the transition; shared equipment, visual cues or a smaller section may fit.",
            "review": "Review the strategy and available access before adding more practice time. A break or changed support is an option."
          },
          "high": {
            "situation": "A learner wants a more intentional musical interpretation but a whole-piece mastery target hides the specific challenge.",
            "agency": "Choose a passage, a musical intention and a review method. A public performance is a separate choice.",
            "support": "A teacher, accessible score, model or adapted instrument can support the selected technique; private lessons are not assumed.",
            "review": "Compare the effect of a strategy, not just repetitions. Access, comfort and competing commitments can change the plan."
          }
        },
        "feedback": {
          "elementary": {
            "question": "Can you show me where the pause goes in this part?",
            "response": "I can try the cue in a way that works for me or ask for a different example. I do not need to perform for a group."
          },
          "middle": {
            "question": "At this transition, what stayed steady and where could a cue help?",
            "response": "I can ask for a demonstration and test one suggestion. If the feedback is too broad, I can ask to focus on the transition I chose."
          },
          "high": {
            "question": "Where does the intended phrase or rhythm come through, and which specific moment could I explore differently?",
            "response": "I can test one suggestion against my intention. I can ask for accessible, specific feedback and decide whether further practice or a different support would be useful."
          }
        }
      },
      {
        "id": "example-2",
        "title": "Revise a story with purpose",
        "smart": {
          "S": {
            "elementary": "At my next story time, I will show one thing my character wants and one thing they do about it.",
            "middle": "During my next writing session, I will revise one scene so a chosen character motive or turning point is easier to follow.",
            "high": "In my next available drafting session, I will revise one passage to explore a chosen effect, such as tension, voice or a clearer shift in perspective."
          },
          "M": {
            "elementary": "I will point to the want and the action in my story, then choose one detail to add or change if the link is unclear.",
            "middle": "I will compare before and after, pointing to one changed detail and explaining how it serves the scene. I can ask a trusted reader or review it myself.",
            "high": "I will compare the original and revision, identify one consequential change and explain whether it serves my intention. I can keep the evidence private."
          },
          "A": {
            "elementary": "I can draw, use symbols, tell an adult what to write or use another communication tool. My story can be short and imagined.",
            "middle": "I can use words, images, audio or supported dictation, and request a model or a smaller task if time or access is limited.",
            "high": "I will choose an accessible composing method and manageable passage. I can request focused feedback from a willing reader or compare the versions myself."
          },
          "R": {
            "elementary": "I want someone, or my future self, to understand my character idea.",
            "middle": "I want the choices in my story to create the effect I intend.",
            "high": "I want to make purposeful choices about how my piece works for its intended audience, including an audience of one."
          },
          "T": {
            "elementary": "After story time, I will decide whether this part says what I want or needs another supported try.",
            "middle": "At the end of the session, I will keep the change, try a different detail or schedule another supported review. Sharing with the class is optional.",
            "high": "After the revision, or at a check-in next week if access is delayed, I will keep, undo or extend the change. Any submission or public sharing needs a separate decision."
          }
        },
        "context": {
          "elementary": {
            "situation": "A learner has an idea for a story but is unsure how to show why a character does something.",
            "agency": "Choose an invented character and tell the story through words, pictures, symbols or speech with support.",
            "support": "An adult can scribe, offer story cards or ask a question while keeping the learner in charge of the idea.",
            "review": "Check whether the character choice makes sense in the story. More sentences are not automatically more helpful."
          },
          "middle": {
            "situation": "A learner has a story scene but feedback such as make it better gives no clear direction for revision.",
            "agency": "Choose a scene and intended effect. A comic, audio story or written draft can work; class sharing is optional.",
            "support": "A model scene, speech-to-text, a scribe or a trusted reader can support revision without requiring a quiet home workspace.",
            "review": "Review the effect of a change. A useful revision may shorten a scene or retain a deliberate ambiguity."
          },
          "high": {
            "situation": "A learner is developing a creative piece and wants useful revision without treating publication or word count as the goal.",
            "agency": "Choose the piece, language, form and intended effect; submission and public sharing are separate decisions.",
            "support": "A peer, mentor, accessible composing tool or model can support a focused revision. Feedback on voice should consider the intended audience and language choices.",
            "review": "A revision can improve clarity, preserve deliberate ambiguity or reveal a new question. Acceptance by a publisher is outside the learner's control."
          }
        },
        "feedback": {
          "elementary": {
            "question": "What do you think my character wants? What part of the story helped you know?",
            "response": "I can add a clue, explain my choice or leave the question open on purpose. I choose whether to show the story to anyone."
          },
          "middle": {
            "question": "What do you think changed for the character in this scene, and what detail led you to that idea?",
            "response": "I can compare that reading with my intention and decide what to revise. I can request feedback on the scene instead of spelling or presentation at this stage."
          },
          "high": {
            "question": "What effect did this passage have for you, and which detail shaped that response? Please focus on the feature I am revising.",
            "response": "I can weigh the response against my purpose and audience, ask for clarification, or test a suggestion. Feedback is information to consider; it does not transfer authorship."
          }
        }
      }
    ],
    community: [
      {
        title: 'Volunteer Service',
        smart: {
          S: { elementary: 'I will help clean up my classroom every day this week.', middle: 'I will volunteer 2 hours this month at a local food bank or shelter.', high: 'I will complete 10 hours of community service this quarter in an area aligned with my values.' },
          M: { elementary: 'My teacher will give me a helper sticker each day I help.', middle: 'I\'ll log each volunteer session with date, hours, and what I did.', high: 'I\'ll maintain a service log with hours, skills used, and impact reflections.' },
          A: { elementary: 'I can pick up supplies, wipe tables, and organize books!', middle: 'I have a parent who can drive me and I\'ve found nearby volunteer opportunities.', high: 'I\'ve researched organizations, have transportation, and have cleared my schedule.' },
          R: { elementary: 'Helping my classroom makes it a nicer place for everyone!', middle: 'Volunteering builds empathy and helps me understand my community better.', high: 'Service deepens my understanding of social issues and strengthens my college applications.' },
          T: { elementary: 'I will help every day for 5 school days.', middle: 'I will complete both volunteer sessions within this calendar month.', high: 'I will complete 10 hours by the end of this quarter, logging weekly.' }
        }
      },
      {
        title: 'Mentoring',
        smart: {
          S: { elementary: 'I will help a younger student with reading once a week.', middle: 'I will tutor a younger student in math for 30 minutes once a week.', high: 'I will mentor an underclassman weekly, covering academics and college prep.' },
          M: { elementary: 'I will read with my buddy and we will count the books we finish.', middle: 'I\'ll track each session: topic covered, problems solved, and progress made.', high: 'I\'ll document session plans, outcomes, and mentee feedback monthly.' },
          A: { elementary: 'My teacher set up a reading buddy program and I signed up!', middle: 'My school has a peer tutoring program I can join.', high: 'I have subject expertise, a regular meeting time, and mentoring resources.' },
          R: { elementary: 'Helping little kids feel smart makes me feel smart too!', middle: 'Teaching someone else is the best way to deepen my own understanding.', high: 'Mentoring develops leadership, communication, and reinforces my own knowledge.' },
          T: { elementary: 'I will meet my reading buddy once a week for 4 weeks.', middle: 'I will tutor every week for the next 6 weeks.', high: 'I will mentor weekly for the full semester with a mid-semester check-in.' }
        }
      },
      {
        title: 'Environmental Action',
        smart: {
          S: { elementary: 'I will pick up 5 pieces of trash every day at recess.', middle: 'I will organize a school recycling awareness campaign this month.', high: 'I will lead a campus sustainability initiative reducing single-use plastic.' },
          M: { elementary: 'I will count the trash I pick up and write the number on my chart.', middle: 'I\'ll track: posters made, announcements given, and recycling bin usage before/after.', high: 'I\'ll measure plastic waste reduction %, student participation, and media coverage.' },
          A: { elementary: 'I can bring gloves and a bag to recess every day!', middle: 'I have permission from my teacher and materials from the office to make posters.', high: 'I have admin approval, a team of 4 students, and a budget from student council.' },
          R: { elementary: 'Picking up trash keeps animals and nature safe!', middle: 'Taking care of our planet is everyone\'s responsibility and I want to lead.', high: 'Environmental advocacy develops leadership, project management, and civic engagement.' },
          T: { elementary: 'I will pick up trash every recess for 2 weeks.', middle: 'I will launch the campaign within 2 weeks and run it for the full month.', high: 'I will implement the initiative over 6 weeks with measurable results by week 8.' }
        }
      }
    ]
  };

  // ── Habit Categories ──
  var HABIT_CATEGORIES = [
    { id: 'health', label: 'Health', emoji: '\uD83D\uDCAA', color: '#ef4444' },
    { id: 'academic', label: 'Academic', emoji: '\uD83D\uDCDA', color: '#6366f1' },
    { id: 'social', label: 'Social', emoji: '\uD83E\uDD1D', color: '#f59e0b' },
    { id: 'creative', label: 'Creative', emoji: '\uD83C\uDFA8', color: '#a855f7' }
  ];

  // ── Difficulty labels & XP multipliers ──
  var DIFFICULTY_LABELS = [
    { level: 1, label: 'Easy', flames: 1, xpMult: 1 },
    { level: 2, label: 'Moderate', flames: 2, xpMult: 1.25 },
    { level: 3, label: 'Challenging', flames: 3, xpMult: 1.5 },
    { level: 4, label: 'Hard', flames: 4, xpMult: 1.75 },
    { level: 5, label: 'Extreme', flames: 5, xpMult: 2 }
  ];

  // ── Journey milestone messages ──
  var JOURNEY_MESSAGES = {
    25: { emoji: '\uD83D\uDEA9', msg: 'You\'ve completed 25% of your goals! Great start!' },
    50: { emoji: '\uD83C\uDFD4\uFE0F', msg: 'Halfway through your goals! You\'re building serious momentum!' },
    75: { emoji: '\uD83C\uDF05', msg: '75% of goals complete! The finish line is in sight!' },
    100: { emoji: '\uD83C\uDF1F', msg: 'ALL goals complete! You are an absolute legend!' }
  };

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
    // v4.0 badges
    if (d.habitChampion3Day) award('habitChampion');
    if (d.completedHardGoal) award('difficultySeeker');
    if (d.usedSmartExample) award('smartExampleUser');
    // Journey milestones (percentage of ALL goals completed)
    if (goals.length >= 3) {
      var journeyPct = Math.round((completedGoals.length / goals.length) * 100);
      if (journeyPct >= 25) award('journey25');
      if (journeyPct >= 50) award('journey50');
      if (journeyPct >= 75) award('journey75');
      if (journeyPct >= 100) award('journey100');
    }
    // Habit categorist: habits in 3+ categories
    var habitCats = {};
    var habs = d.habits || [];
    habs.forEach(function(hab) {
      if (hab && typeof hab === 'object' && hab.category) habitCats[hab.category] = true;
    });
    if (Object.keys(habitCats).length >= 3) award('habitCategorist');
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
    category: 'self-direction',

    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _goaT = (ctx && ctx.theme) || {};
      var _goaHC = !!_goaT.isContrast, _goaL = !_goaHC && !_goaT.isDark;
      var _goa_BGL = {'#0f172a':'#f8fafc'}, _goa_BGH = {'#0f172a':'#000000','#15803d':'#000000','#6366f1':'#000000'};
      var _goa_FGL = {'#e2e8f0':'#1e293b','#c7d2fe':'#312e81','#fbbf24':'#854d0e','#a5b4fc':'#3730a3','#c4b5fd':'#5b21b6','#cbd5e1':'#334155','#34d399':'#047857','#f87171':'#b91c1c','#94a3b8':'#64748b','#818cf8':'#4338ca','#6ee7b7':'#065f46'}, _goa_FGH = {'#e2e8f0':'#ffff00','#c7d2fe':'#ffff00','#fbbf24':'#ffff00','#a5b4fc':'#ffff00','#c4b5fd':'#ffff00','#cbd5e1':'#ffff00','#34d399':'#ffff00','#f87171':'#ffff00','#94a3b8':'#ffff00','#fff':'#ffff00','#818cf8':'#ffff00','#6366f1':'#ffff00','#a855f7':'#ffff00','#6ee7b7':'#ffff00','#ef4444':'#ffff00','#22c55e':'#ffff00','#f59e0b':'#ffff00'};
      var _goa_BGD = {'#6366f1':'#4f46e5'}, _goa_BDL = {}, _goa_BDH = {};
      var _goaBg = function(h){ return _goaHC ? (_goa_BGH[h]||h) : (_goaL ? (_goa_BGL[h]||h) : (_goa_BGD[h]||h)); };
      var _goaFg = function(h){ return _goaHC ? (_goa_FGH[h]||h) : (_goaL ? (_goa_FGL[h]||h) : h); };
      var _goaBd = function(h){ return _goaHC ? (_goa_BDH[h]||h) : (_goaL ? (_goa_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var toolData = ctx.toolData;
      var setToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
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

        // ── Vision Board state ──
        var visionBoard = d.visionBoard || { thisYear: '', thisMonth: '', thisWeek: '' };

        // ── Goal Reflection state ──
        var reflectingGoalId = d.reflectingGoalId || null;
        var goalNotesDrafts = d.goalNotesDrafts || {};
        var reflectionFields = [
          { key: 'whatWorked', label: 'What helped? (optional)', hint: 'Think about a strategy, person, tool, or change in the environment.' },
          { key: 'hardestPart', label: 'What got in the way? (optional)', hint: 'You can name a task or access barrier without sharing personal details.' },
          { key: 'doDifferently', label: 'What might I keep or change? (optional)', hint: 'You could change the task, ask for support, or try a different way.' },
          { key: 'nextGoal', label: 'What might come next? (optional)', hint: 'A small step, more practice, a different goal, or a break are all options.' }
        ];
        var noteFieldStyle = { width: '100%', minHeight: 88, padding: 12, borderRadius: 8, border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), background: _goaBg('#0f172a'), color: _goaFg('#e2e8f0'), font: 'inherit', fontSize: 16, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 };
        var noteButtonStyle = { minHeight: 44, padding: '10px 14px', borderRadius: 8, background: _goaBg('#0f172a'), border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), color: _goaFg('#e2e8f0'), font: 'inherit', fontSize: 14, cursor: 'pointer' };
        var noteSaveStyle = Object.assign({}, noteButtonStyle, { background: _goaHC ? '#ffff00' : '#4338ca', color: _goaHC ? '#000000' : '#ffffff', fontWeight: 700 });

        // ── Accountability state ──
        var accountabilityLog = d.accountabilityLog || {};
        var accountabilityStreak = d.accountabilityStreak || 0;

        // ── Weekly Check-in state ──
        var weeklyCheckins = d.weeklyCheckins || [];
        var weeklyDraft = d.weeklyDraft || { obstacles: '', focus: '', rating: 0 };

        // ── Milestone tracking state ──
        var milestonesShown = d.milestonesShown || {};

        // ── v4.0 Celebration & SMART Examples state ──
        var celebratingGoalId = d.celebratingGoalId || null;
        var showSmartExamples = d.showSmartExamples || false;
        var smartExampleCat = typeof d.smartExampleCat === 'string' && Object.prototype.hasOwnProperty.call(SMART_EXAMPLES, d.smartExampleCat) ? d.smartExampleCat : 'academic';
        var smartBuildMode = d.smartBuildMode === 'all' ? 'all' : 'guided';
        var parsedSmartStep = parseInt(d.smartStep, 10);
        var smartStep = isNaN(parsedSmartStep) ? 0 : Math.max(0, Math.min(4, parsedSmartStep));
        var expandedGoalCandidate = d.expandedGoalId || null;
        if (!goals.some(function(goal) { return goal.id === expandedGoalCandidate && !goal.completed; })) {
          expandedGoalCandidate = goals.some(function(goal) { return goal.id === editingGoal && !goal.completed; }) ? editingGoal : null;
        }
        var expandedGoalId = expandedGoalCandidate;
        var renamingGoalId = typeof d.renamingGoalId === 'string' && goals.some(function(goal) { return goal.id === d.renamingGoalId && !goal.completed; }) ? d.renamingGoalId : null;
        var habitCategoryFilter = d.habitCategoryFilter || 'all';
        var journeyMilestonesShown = d.journeyMilestonesShown || {};

        // ── Badge check ──
        React.useEffect(function() {
          var newBadges = checkBadges(d, awardXP, addToast);
          if (newBadges) upd({ badges: newBadges });
        }, [goals.length, streak, d.aiAsked, d.hasReflection, d.habitStreak7, d.hasVision, d.hasGoalReflection, d.hasSharedGoal, d.habitWeekComplete, weeklyCheckins.length, d.hasMilestone50, accountabilityStreak, d.habitChampion3Day, d.completedHardGoal, d.usedSmartExample]);

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
          if (callTTS) callTTS(text);
        };

        var getGoalDomId = function(goalId) {
          return String(goalId).replace(/[^a-zA-Z0-9_-]/g, '-');
        };

        var focusGoalName = function(goalId) {
          setTimeout(function() {
            var field = document.getElementById('goal-name-input-' + getGoalDomId(goalId));
            if (field) field.focus();
          }, 0);
        };

        var focusGoalDisclosure = function(goalId) {
          setTimeout(function() {
            var button = document.getElementById('goal-disclosure-' + getGoalDomId(goalId));
            if (button) button.focus();
          }, 0);
        };

        var focusGoalStepInput = function(goalId) {
          setTimeout(function() {
            var field = document.getElementById('goal-step-input-' + getGoalDomId(goalId));
            if (field) field.focus();
          }, 0);
        };

        var focusCompletedGoal = function(goalId) {
          setTimeout(function() {
            var card = document.getElementById('goal-completed-' + getGoalDomId(goalId));
            if (card) card.focus();
          }, 0);
        };

        var focusGoalNote = function(goalId, field) {
          setTimeout(function() {
            var input = document.getElementById('goal-note-' + getGoalDomId(goalId) + '-' + field);
            if (input) input.focus();
          }, 0);
        };

        var goalNoteValue = function(goalId, field) {
          var draft = goalNotesDrafts[goalId] || {};
          return typeof draft[field] === 'string' ? draft[field] : '';
        };

        var updateGoalNote = function(goalId, field, value) {
          setToolData(function(prev) {
            var current = (prev && prev.goals_tool) || {};
            if (!(current.goals || []).some(function(goal) { return goal.id === goalId; })) return prev;
            var drafts = Object.assign({}, current.goalNotesDrafts || {});
            drafts[goalId] = Object.assign({}, drafts[goalId] || {});
            drafts[goalId][field] = value;
            return Object.assign({}, prev, { goals_tool: Object.assign({}, current, { goalNotesDrafts: drafts, goalNotesNotice: '' }) });
          });
        };

        var withoutGoalNoteFields = function(goalId, fields) {
          var drafts = Object.assign({}, goalNotesDrafts);
          var draft = Object.assign({}, drafts[goalId] || {});
          fields.forEach(function(field) { delete draft[field]; });
          if (Object.keys(draft).length) drafts[goalId] = draft;
          else delete drafts[goalId];
          return drafts;
        };

        var updateGoal = function(goalId, patch) {
          var next = goals.map(function(g) { return g.id === goalId ? Object.assign({}, g, patch) : g; });
          upd({ goals: next });
        };

        var deleteGoal = function(goalId) {
          var drafts = Object.assign({}, goalNotesDrafts);
          delete drafts[goalId];
          var patch = { goals: goals.filter(function(g) { return g.id !== goalId; }), goalNotesDrafts: drafts };
          if (expandedGoalId === goalId) patch.expandedGoalId = null;
          if (editingGoal === goalId) patch.editingGoal = null;
          if (renamingGoalId === goalId) patch.renamingGoalId = null;
          upd(patch);
        };

        var addGoal = function(text, category, difficulty, smartData) {
          sfxAdd();
          var newGoal = {
            id: 'goal-' + Date.now(),
            text: text || '',
            category: category || 'personal',
            smart: smartData || { S: '', M: '', A: '', R: '', T: '' },
            steps: [],
            progress: 0,
            completed: false,
            createdAt: Date.now(),
            completedAt: null,
            difficulty: difficulty || 1,
            reflections: [],
            completionJournal: null
          };
          upd({ goals: goals.concat([newGoal]), editingGoal: newGoal.id, expandedGoalId: newGoal.id, renamingGoalId: newGoal.id });
          focusGoalName(newGoal.id);
          return newGoal.id;
        };

        var toggleGoalDetails = function(goalId) {
          var opening = expandedGoalId !== goalId;
          var patch = { expandedGoalId: opening ? goalId : null };
          if (!opening || renamingGoalId !== goalId) patch.renamingGoalId = null;
          upd(patch);
        };

        var openGoalForEditing = function(goalId) {
          upd({ expandedGoalId: goalId, renamingGoalId: goalId, tab: 'goals' });
          focusGoalName(goalId);
        };

        var openGoalDetails = function(goalId) {
          upd({ expandedGoalId: goalId, renamingGoalId: null, tab: 'goals' });
          focusGoalDisclosure(goalId);
        };

        var toggleStep = function(goalId, stepIdx) {
          sfxStep();
          var milestoneUpdates = {};
          var completedHardGoalFlag = false;
          var showCelebrationGoalId = null;
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            var steps = g.steps.map(function(s, i) { return i === stepIdx ? Object.assign({}, s, { done: !s.done, completedAt: s.done ? null : Date.now() }) : s; });
            var doneCount = steps.filter(function(s) { return s.done; }).length;
            var progress = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
            var oldProgress = g.progress || 0;
            var completed = progress === 100 && steps.length > 0;
            var goalDiff = g.difficulty || 1;
            if (completed && !g.completed) {
              sfxComplete();
              var baseXP = 20;
              var diffInfo = DIFFICULTY_LABELS[goalDiff - 1] || DIFFICULTY_LABELS[0];
              var earnedXP = Math.round(baseXP * diffInfo.xpMult);
              if (awardXP) awardXP(earnedXP);
              if (addToast) addToast('\uD83C\uDF89 Goal completed: ' + g.text + '! +' + earnedXP + ' XP' + (goalDiff >= 4 ? ' (Hard bonus!)' : ''), 'success');
              if (goalDiff >= 4) completedHardGoalFlag = true;
              showCelebrationGoalId = g.id;
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
            return Object.assign({}, g, { steps: steps, progress: progress, completed: completed, completedAt: completed && !g.completed ? Date.now() : (g.completedAt || null) });
          });
          var updObj = { goals: next };
          if (Object.keys(milestoneUpdates).length > 0) {
            var newShown = Object.assign({}, milestonesShown);
            Object.keys(milestoneUpdates).forEach(function(k) { if (k !== '_hasMilestone50') newShown[k] = true; });
            updObj.milestonesShown = newShown;
            if (milestoneUpdates._hasMilestone50) updObj.hasMilestone50 = true;
          }
          if (completedHardGoalFlag) updObj.completedHardGoal = true;
          if (showCelebrationGoalId) updObj.celebratingGoalId = showCelebrationGoalId;
          // Check journey milestones (percentage of ALL goals completed)
          var allCompleted = next.filter(function(g) { return g.completed; }).length;
          var totalGoals = next.length;
          if (totalGoals >= 3) {
            var journeyPct = Math.round((allCompleted / totalGoals) * 100);
            var journeyMilestonesShown = d.journeyMilestonesShown || {};
            [25, 50, 75, 100].forEach(function(jp) {
              if (journeyPct >= jp && !journeyMilestonesShown[jp]) {
                var jm = JOURNEY_MESSAGES[jp];
                if (jm) {
                  sfxBadge();
                  if (awardXP) awardXP(15);
                  if (addToast) addToast(jm.emoji + ' Journey Milestone: ' + jm.msg + ' +15 XP', 'success');
                  journeyMilestonesShown = Object.assign({}, journeyMilestonesShown);
                  journeyMilestonesShown[jp] = true;
                }
              }
            });
            updObj.journeyMilestonesShown = journeyMilestonesShown;
          }
          upd(updObj);
          if (showCelebrationGoalId) setTimeout(function() {
            var review = document.getElementById('goal-completion-review-' + getGoalDomId(showCelebrationGoalId));
            if (review) review.focus();
          }, 0);
        };

        var addStep = function(goalId, text) {
          if (!text.trim()) { if (typeof addToast === 'function') addToast('Write something first, then press the button again.', 'info'); return; }
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
          // Safety pre-check on free-text question.
          var gSafety = (window.SelHub && window.SelHub.safeRehearseCheck)
            ? window.SelHub.safeRehearseCheck(question, { toolId: 'goals_coach', onSafetyFlag: (ctx && ctx.onSafetyFlag) || null })
            : { action: 'continue' };
          if (gSafety.action === 'block') {
            upd({ aiResponse: window.SelHub.rehearseBreakCharacterText(gSafety.severity), aiLoading: false, aiAsked: true, _lastTier: 3 });
            return;
          }
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
        var weekDates = goalHabitWeekDates(Date.now());

        var toggleHabit = function(habitIdx, dateStr) {
          if (!Number.isInteger(habitIdx) || habitIdx < 0 || habitIdx >= habits.length || weekDates.indexOf(dateStr) < 0) return;
          sfxClick();
          var key = habitIdx + '-' + dateStr;
          var newLog = Object.assign({}, habitLog);
          newLog[key] = !newLog[key];
          // Recording is optional; it does not establish a habit or earn a streak reward.
          upd({ habitLog: newLog });
        };

        var addHabit = function(name, category) {
          if (!name || !name.trim() || habits.length >= 7) return;
          sfxAdd();
          var habitObj = { name: name.trim(), category: category || 'health' };
          upd({ habits: habits.concat([habitObj]), habitNameDraft: '', pendingHabitRemoval: null, habitCategoryFilter: 'all', habitNotice: 'Routine added. You choose which days to record.' });
          setTimeout(function() { var card = document.getElementById('goal-habit-' + habits.length); if (card) card.focus(); }, 0);
        };

        // Helper to get habit display name (supports old string format and new object format)
        var getHabitName = function(hab) {
          if (typeof hab === 'string') return hab;
          return (hab && hab.name) || '';
        };

        var getHabitCategory = function(hab) {
          if (typeof hab === 'string') return 'health';
          return (hab && hab.category) || 'health';
        };

        var getRoutinePlan = function(habit) {
          var plan = habit && typeof habit === 'object' && habit.plan;
          return plan && typeof plan === 'object' && !Array.isArray(plan) ? plan : {};
        };

        var updateRoutinePlan = function(index, key, value) {
          if (!Number.isInteger(index) || index < 0 || index >= habits.length) return;
          var next = habits.map(function(habit, i) {
            if (i !== index) return habit;
            var base = habit && typeof habit === 'object' && !Array.isArray(habit) ? habit : { name: getHabitName(habit), category: getHabitCategory(habit) };
            var plan = Object.assign({}, getRoutinePlan(habit));
            plan[key] = value;
            return Object.assign({}, base, { plan: plan });
          });
          upd({ habits: next });
        };

        var renderRoutinePlan = function(habit, index) {
          var plan = getRoutinePlan(habit), name = getHabitName(habit) || 'Unnamed routine';
          var statuses = { trying: 'Trying it', paused: 'Paused', reviewing: 'Reviewing the fit' };
          var status = typeof plan.status === 'string' && Object.prototype.hasOwnProperty.call(statuses, plan.status) ? plan.status : '';
          var surface = _goaHC ? '#000000' : _goaL ? '#ffffff' : '#0f172a';
          var ink = _goaHC ? '#ffff00' : _goaL ? '#0f172a' : '#e2e8f0';
          var edge = _goaHC ? '#ffff00' : '#64748b';
          var fieldStyle = { width: '100%', minHeight: 44, boxSizing: 'border-box', padding: 10, border: '1px solid ' + edge, borderRadius: 8, background: surface, color: ink, font: 'inherit', fontSize: 16, lineHeight: 1.6 };
          var fields = [
            { key: 'purpose', label: 'Why this routine matters (optional)', hint: 'Choose a reason that matters to you. Keeping a routine is not the goal by itself.' },
            { key: 'opportunity', label: 'When it might fit (optional)', hint: band === 'elementary' ? 'Choose a moment with an adult. It does not have to be every day.' : 'Name a suitable opportunity or a cue you can notice. Check whether the time and setting are available.' },
            { key: 'support', label: 'Supports or changes needed (optional)', hint: 'Consider a person, materials, a reminder or a change to the setting. You do not need to share private reasons.' },
            { key: 'alternative', label: 'A smaller or different option (optional)', hint: band === 'elementary' ? 'You could try one part, ask for help, choose another way or take a break.' : 'Plan for a day with less time or energy. A smaller action, another method, support or a pause can fit.' },
            { key: 'review', label: 'What to check next, and when (optional)', hint: 'Check usefulness, comfort and access at a chosen time. Decide whether to keep, change or stop the routine.' }
          ];
          return h('section', { role: 'region', 'aria-label': 'Routine planning: ' + name, style: { margin: '12px 0', padding: 12, border: '1px solid ' + edge, borderRadius: 10, background: surface, color: ink, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
            h('p', { style: { margin: '0 0 8px' } }, 'Plan status: ' + (statuses[status] || 'Not chosen')),
            h('details', null,
              h('summary', { style: { minHeight: 44, padding: '10px 0', fontWeight: 700, cursor: 'pointer' } }, 'Plan and review this routine'),
              h('p', null, 'This plan is optional. A routine can be useful without happening every day. A pause keeps your plan and records; it does not create missed-day entries or a catch-up task.'),
              h('label', { htmlFor: 'routine-status-' + index, style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, 'How this plan fits now (optional)'),
              h('select', { id: 'routine-status-' + index, value: status, style: fieldStyle, onChange: function(event) { updateRoutinePlan(index, 'status', event.target.value); } },
                h('option', { value: '' }, 'Not chosen'),
                Object.keys(statuses).map(function(key) { return h('option', { key: key, value: key }, statuses[key]); })),
              h('p', null, 'Status is a planning note. You can still correct dated records while paused. Recording a day does not change this status.'),
              fields.map(function(field) {
                var id = 'routine-plan-' + index + '-' + field.key;
                return h('div', { key: field.key, style: { marginTop: 16 } },
                  h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, field.label),
                  h('p', { id: id + '-help', style: { margin: '0 0 8px' } }, field.hint),
                  h('textarea', { id: id, 'aria-describedby': id + '-help', rows: 3, value: typeof plan[field.key] === 'string' ? plan[field.key] : '', style: Object.assign({}, fieldStyle, { resize: 'vertical' }), onChange: function(event) { updateRoutinePlan(index, field.key, event.target.value); } }));
              }),
              h('p', null, 'Notes stay with this routine in your project. Use the Hub save/export controls to keep a copy and review personal details before sharing.')
            )
          );
        };

        var focusHabitControl = function(id) {
          setTimeout(function() { var control = document.getElementById(id); if (control) control.focus(); }, 0);
        };

        var requestHabitRemoval = function(idx) {
          upd({ pendingHabitRemoval: { index: idx, snapshot: JSON.stringify(habits) } });
          focusHabitControl('goal-habit-remove-cancel-' + idx);
        };

        var removeHabit = function(idx) {
          if (!d.pendingHabitRemoval || d.pendingHabitRemoval.index !== idx || d.pendingHabitRemoval.snapshot !== JSON.stringify(habits)) {
            upd({ pendingHabitRemoval: null, habitNotice: 'The routine list changed. Choose the routine to remove again.' });
            return;
          }
          var next = habits.filter(function(h, i) { return i !== idx; });
          // Clean up log entries for removed habit
          var newLog = {};
          Object.keys(habitLog).forEach(function(k) {
            var parts = k.split('-');
            var hi = parseInt(parts[0]);
            if (hi < idx) { newLog[k] = habitLog[k]; }
            else if (hi > idx) { newLog[(hi - 1) + '-' + parts.slice(1).join('-')] = habitLog[k]; }
          });
          upd({ habits: next, habitLog: newLog, pendingHabitRemoval: null, habitNotice: 'Routine, plan and dated records removed. Other routine records are unchanged.' });
          focusHabitControl('goal-habits-heading');
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
          if (!goals.some(function(goal) { return goal.id === goalId && goal.completed; })) return;
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            var reflections = (g.reflections || []).concat([Object.assign({ date: Date.now() }, reflectionData)]);
            return Object.assign({}, g, { reflections: reflections });
          });
          sfxComplete();
          if (awardXP) awardXP(10);
          if (addToast) addToast('\uD83D\uDCDD Reflection saved! +10 XP', 'success');
          upd({ goals: next, hasGoalReflection: true, reflectingGoalId: null, hasReflection: true, goalNotesDrafts: withoutGoalNoteFields(goalId, reflectionFields.map(function(field) { return field.key; })), goalNotesNotice: 'Reflection added to this activity. Use the Hub save/export controls to keep a project copy.' });
          focusCompletedGoal(goalId);
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
          if (window.SelHub && window.SelHub.copyText) {
            window.SelHub.copyText(text).then(function(ok) { if (!ok) { if (typeof addToast === 'function') addToast(window.SelHub.COPY_UNAVAILABLE, 'info'); return; }
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
          return goalReviewSnapshot(goals, Date.now());
        };

        var saveWeeklyCheckin = function() {
          var reviewNow = Date.now();
          var summary = goalReviewSnapshot(goals, reviewNow);
          var checkin = {
            summaryVersion: 2, periodStart: reviewNow - 7 * 86400000, periodEnd: reviewNow,
            id: 'wci-' + Date.now(),
            date: Date.now(),
            weekOf: new Date().toISOString().slice(0, 10),
            progressSummary: summary,
            obstacles: weeklyDraft.obstacles || '',
            focus: weeklyDraft.focus || '',
            support: weeklyDraft.support || '',
            rating: goalReviewRating(weeklyDraft.rating)
          };
          var newCheckins = weeklyCheckins.concat([checkin]);
          sfxComplete();
          if (awardXP) awardXP(10);
          if (addToast) addToast('\uD83D\uDCDD Weekly check-in saved! +10 XP', 'success');
          upd({ weeklyCheckins: newCheckins, weeklyDraft: { obstacles: '', support: '', focus: '', rating: null }, weeklyNotice: 'Review added to this activity. Use the Hub save/export controls to keep a project copy.' });
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

        // ── Completion Celebration helpers ──
        var getTimeToDays = function(startMs, endMs) {
          if (!startMs || !endMs) return 0;
          return Math.max(1, Math.round((endMs - startMs) / 86400000));
        };

        var getCompletedStepCount = function(goal) {
          return (goal.steps || []).filter(function(s) { return s.done; }).length;
        };

        var dismissCelebration = function() {
          upd({ celebratingGoalId: null, goalNotesNotice: 'Completion note paused. Your draft stays with this goal in this activity.' });
          focusCompletedGoal(celebratingGoalId);
        };

        var saveCompletionJournal = function(goalId, learnedText) {
          if (!goals.some(function(goal) { return goal.id === goalId && goal.completed; })) return;
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            return Object.assign({}, g, { completionJournal: { whatLearned: learnedText, savedAt: Date.now() } });
          });
          sfxComplete();
          if (awardXP) awardXP(10);
          if (addToast) addToast('\uD83D\uDCDD Completion journal saved! +10 XP', 'success');
          upd({ goals: next, celebratingGoalId: null, hasGoalReflection: true, goalNotesDrafts: withoutGoalNoteFields(goalId, ['whatLearned']), goalNotesNotice: 'Completion note added to this activity. Use the Hub save/export controls to keep a project copy.' });
          focusCompletedGoal(goalId);
        };

        var shareAchievement = function(goal) {
          var days = getTimeToDays(goal.createdAt, goal.completedAt || Date.now());
          var steps = getCompletedStepCount(goal);
          var diffLabel = DIFFICULTY_LABELS[(goal.difficulty || 1) - 1] || DIFFICULTY_LABELS[0];
          var text = '\uD83C\uDF89 Achievement Unlocked!\n\n';
          text += '\uD83C\uDFAF Goal: ' + (goal.text || 'My Goal') + '\n';
          text += '\u23F1\uFE0F Time to Complete: ' + days + ' day' + (days !== 1 ? 's' : '') + '\n';
          text += '\uD83D\uDC63 Steps Completed: ' + steps + '\n';
          text += '\uD83D\uDD25 Difficulty: ' + diffLabel.label + '\n';
          if (goal.completionJournal && goal.completionJournal.whatLearned) {
            text += '\uD83D\uDCA1 What I Learned: ' + goal.completionJournal.whatLearned + '\n';
          }
          text += '\n\u2014 Set with Goal Setter by AlloFlow';
          if (window.SelHub && window.SelHub.copyText) {
            window.SelHub.copyText(text).then(function(ok) { if (!ok) { if (typeof addToast === 'function') addToast(window.SelHub.COPY_UNAVAILABLE, 'info'); return; }
              if (addToast) addToast('\uD83D\uDCCB Achievement copied to clipboard!', 'success');
            }).catch(function() {
              if (addToast) addToast('Could not copy \u2014 try selecting the text manually.', 'warning');
            });
          }
        };

        // Browse one worked plan at a time; creating a copy is an explicit action.
        var renderSmartExamples = function() {
          var surface = _goaHC ? '#000000' : _goaL ? '#ffffff' : '#0f172a';
          var ink = _goaHC ? '#ffff00' : _goaL ? '#0f172a' : '#e2e8f0';
          var edge = _goaHC ? '#ffff00' : '#64748b';
          var control = { minHeight: 44, padding: '10px 12px', border: '1px solid ' + edge, borderRadius: 8, background: surface, color: ink, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var selections = d.smartExampleSelections && typeof d.smartExampleSelections === 'object' && !Array.isArray(d.smartExampleSelections) ? d.smartExampleSelections : {};
          var selectionKey = band + ':' + smartExampleCat;
          var items = SMART_EXAMPLES[smartExampleCat];
          function exampleId(item, index) { return item.id || 'example-' + index; }
          var index = items.findIndex(function(item, i) { return exampleId(item, i) === selections[selectionKey]; });
          if (index < 0) index = 0;
          var selected = items[index], context = selected.context && selected.context[band];
          return h('div', { style: { marginBottom: 16 } },
            h('button', { type: 'button', 'aria-label': 'SMART Goal Examples Library', 'aria-expanded': !!showSmartExamples, 'aria-controls': 'goal-example-library-body', onClick: function() { upd({ showSmartExamples: !showSmartExamples }); }, style: Object.assign({}, control, { width: '100%', textAlign: 'left', cursor: 'pointer', fontWeight: 700 }) }, 'SMART Goal Examples Library'),
            h('div', { id: 'goal-example-library-body', hidden: !showSmartExamples }, showSmartExamples &&
              h('section', { role: 'region', 'aria-label': 'SMART example library', style: { padding: 16, marginTop: 10, border: '1px solid ' + edge, borderRadius: 12, background: surface, color: ink, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
                h('h2', { style: { fontSize: 22, lineHeight: 1.3, margin: '0 0 8px' } }, 'Explore a plan, then make it yours'),
                h('p', null, 'Examples are starting points. Change the action, evidence, support and review time to fit what matters to you. Reading an example does not add a goal.'),
                h('div', { role: 'group', 'aria-label': 'Example categories', style: { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' } }, GOAL_CATEGORIES.map(function(cat) {
                  var active = smartExampleCat === cat.id;
                  return h('button', { type: 'button', key: cat.id, 'aria-label': 'Filter SMART examples by ' + cat.label, 'aria-pressed': active, onClick: function() { upd({ smartExampleCat: cat.id }); }, style: Object.assign({}, control, { fontSize: 14, cursor: 'pointer', fontWeight: active ? 700 : 400, background: active ? (_goaHC ? '#ffff00' : '#4338ca') : surface, color: active ? (_goaHC ? '#000000' : '#ffffff') : ink }) }, cat.label);
                })),
                h('label', { htmlFor: 'goal-example-choice', style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, 'Choose a worked goal example'),
                h('select', { id: 'goal-example-choice', style: Object.assign({}, control, { width: '100%' }), value: exampleId(selected, index), onChange: function(e) { var next = Object.assign({}, selections); next[selectionKey] = e.target.value; upd({ smartExampleSelections: next }); } }, items.map(function(item, i) { return h('option', { key: exampleId(item, i), value: exampleId(item, i) }, item.title); })),
                h('div', { key: selectionKey + ':' + exampleId(selected, index) },
                  h('h3', { style: { fontSize: 18, lineHeight: 1.4 } }, selected.title),
                  context && h('p', null, context.situation),
                  context && h('details', { open: true, style: { borderTop: '1px solid ' + edge } },
                    h('summary', { style: { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 } }, 'Choices, support and a review point'),
                    h('p', null, h('strong', null, 'What the learner can choose: '), context.agency),
                    h('p', null, h('strong', null, 'Support and access: '), context.support),
                    h('p', null, h('strong', null, 'When to adapt the plan: '), context.review)),
                  selected.feedback && selected.feedback[band] && h('details', { style: { borderTop: '1px solid ' + edge } },
                    h('summary', { style: { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 } }, 'Ask for useful feedback (optional)'),
                    h('p', null, 'Choose someone willing to respond, or use the question to review your own work. You decide what to share and which suggestions to try.'),
                    h('p', null, h('strong', null, 'A question to try: '), selected.feedback[band].question),
                    h('p', null, h('strong', null, 'What to do with the response: '), selected.feedback[band].response)),
                  h('details', { open: true, style: { borderTop: '1px solid ' + edge } },
                    h('summary', { style: { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 } }, 'Read the SMART plan'),
                    h('dl', null, ['S', 'M', 'A', 'R', 'T'].map(function(key) {
                      return h('div', { key: key, style: { marginBottom: 14 } },
                        h('dt', { style: { fontWeight: 700 } }, key + ' — ' + SMART_LABELS[key].label),
                        h('dd', { style: { margin: '4px 0 0' } }, selected.smart[key][band] || selected.smart[key].elementary));
                    })))
                ),
                smartExampleCat === 'social' && h('p', null, 'For social goals, another person\'s response is not your score. You can choose support, a different approach or a pause. Threats, repeated targeting or unsafe pressure need adult support, not a communication deadline.'),
                smartExampleCat === 'personal' && h('p', null, 'These are optional ways to explore a goal. A daily streak, a positive feeling or a fixed amount of writing does not prove that a plan fits. You can change the support, choose another approach or pause.'),
                smartExampleCat === 'health' && h('p', null, 'These examples help you plan access, support and choices. They do not set medical targets. Keep individual care guidance in place; health details and tracking are optional. Review what fits, what needs help and whether to change or pause the plan.'),
                smartExampleCat === 'creative' && h('p', null, 'Choose what you want to explore, a manageable practice step and a way to review it. Feedback can guide a revision; you decide what to keep. Recording, publishing and public performance are optional choices.'),
                h('p', null, 'Use as Template creates a new editable goal with these five SMART fields. It keeps your existing goals. Review the copied wording before using or sharing it.'),
                h('button', { type: 'button', 'aria-label': 'Use as Template', onClick: function() { loadSmartExample(smartExampleCat, index); }, style: Object.assign({}, control, { width: '100%', cursor: 'pointer', fontWeight: 700 }) }, 'Use as Template')
              )
            )
          );
        };

        // ── SMART Example helper ──
        var loadSmartExample = function(catId, exampleIdx) {
          var examples = SMART_EXAMPLES[catId];
          if (!examples || !examples[exampleIdx]) return;
          var ex = examples[exampleIdx];
          var smartData = {};
          ['S', 'M', 'A', 'R', 'T'].forEach(function(key) {
            smartData[key] = ex.smart[key][band] || ex.smart[key].elementary || '';
          });
          sfxAdd();
          var createdGoalId = addGoal(ex.title, catId, 1, smartData);
          upd({ usedSmartExample: true, showSmartExamples: false, tab: 'smart', smartBuildMode: 'guided', smartStep: 0 });
          focusSmartField(createdGoalId, 'S');
          if (addToast) addToast('New goal created from the example. Change any field to fit your plan.', 'info');
        };

        var getSmartFieldId = function(goalId, key) {
          return 'smart-field-' + String(goalId).replace(/[^a-zA-Z0-9_-]/g, '-') + '-' + key;
        };

        var focusSmartField = function(goalId, key) {
          setTimeout(function() {
            var field = document.getElementById(getSmartFieldId(goalId, key));
            if (field) field.focus();
          }, 0);
        };

        var moveSmartStep = function(goal, nextStep) {
          var boundedStep = Math.max(0, Math.min(4, nextStep));
          upd({ smartStep: boundedStep });
          focusSmartField(goal.id, ['S', 'M', 'A', 'R', 'T'][boundedStep]);
        };

        var firstIncompleteSmartStep = function(goal) {
          var keys = ['S', 'M', 'A', 'R', 'T'];
          var firstMissing = keys.findIndex(function(key) {
            return !(goal.smart && goal.smart[key] && goal.smart[key].trim());
          });
          return firstMissing === -1 ? 0 : firstMissing;
        };

        var renderSmartField = function(goal, key) {
          var info = SMART_LABELS[key];
          var val = (goal.smart && goal.smart[key]) || '';
          var fieldId = getSmartFieldId(goal.id, key);
          return h('div', { key: key, style: { marginBottom: 12, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
              h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, info.emoji),
              h('label', { htmlFor: fieldId, style: { fontSize: 13, fontWeight: 'bold', color: _goaFg('#a5b4fc') } }, key + ' — ' + info.label),
              val ? h('span', { style: { marginLeft: 'auto', color: _goaFg('#34d399'), fontSize: 10 } }, '✓ Complete') : null
            ),
            h('p', { id: fieldId + '-help', style: { fontSize: 11, color: _goaFg('#94a3b8'), marginBottom: 6 } }, info.desc),
            h('textarea', { id: fieldId, value: val, 'aria-describedby': fieldId + '-help', onChange: function(e) {
              var newSmart = Object.assign({}, goal.smart || {});
              newSmart[key] = e.target.value;
              updateGoal(goal.id, { smart: newSmart });
            }, placeholder: info.placeholder[band] || info.placeholder.elementary, style: { width: '100%', minHeight: 76, padding: 10, borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.4)', color: _goaFg('#e2e8f0'), fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 } })
          );
        };

        // ── Difficulty helper ──
        var getDifficultyFlames = function(level) {
          var flames = '';
          for (var i = 0; i < (level || 1); i++) flames += '\uD83D\uDD25';
          return flames;
        };

        // ── Weekly Habit Completion Chart data ──
        var getWeeklyHabitChartData = function() {
          if (habits.length === 0) return [];
          return weekDates.map(function(wd) {
            var completed = 0;
            habits.forEach(function(hab, hi) {
              if (habitLog[hi + '-' + wd]) completed++;
            });
            var pct = Math.round((completed / habits.length) * 100);
            return { date: wd, pct: pct, completed: completed, total: habits.length };
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
        var totalSteps = goals.reduce(function(sum, goal) {
          return sum + (goal.steps || []).length;
        }, 0);
        var completedSteps = goals.reduce(function(sum, goal) {
          return sum + (goal.steps || []).filter(function(step) { return step.done; }).length;
        }, 0);
        var goalProgressText = goals.length === 0
          ? 'No goals yet. Start with one small goal.'
          : completedGoals.length + ' of ' + goals.length + ' goals complete; ' + completedSteps + ' of ' + totalSteps + ' steps complete.';
        var categoryStats = getCategoryStats();

        var goalTabs = [
          { id: 'goals', label: '\uD83C\uDFAF Goals' },
          { id: 'habits', label: '\uD83D\uDD01 Habits' },
          { id: 'vision', label: '\uD83C\uDF1F Vision' },
          { id: 'smart', label: '\uD83E\uDDE0 SMART' },
          { id: 'coach', label: '\uD83E\uDD16 Coach' },
          { id: 'checkin', label: '\uD83D\uDCDD Check-In' },
          { id: 'progress', label: '\uD83D\uDCCA Progress' }
        ];
        // ═══════════════════════════════════════════════════════════
        // ── UI ──
        // ═══════════════════════════════════════════════════════════
        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', background: _goaBg('#0f172a'), color: _goaFg('#e2e8f0'), fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, typeof d._srMsg === 'string' ? d._srMsg : ''),
          // Surface 988 / Crisis Text Line block when any AI-input turn was tier-3.
          (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(135deg, #312e81, #4338ca)', borderBottom: '1px solid rgba(99,102,241,0.3)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', { 'aria-label': 'Back', onClick: function() { ctx.setSelHubTool && ctx.setSelHubTool(null); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: _goaFg('#c7d2fe'), cursor: 'pointer', fontSize: 12, fontWeight: 'bold' } }, '\u2190 Back'),
              h('div', { style: { fontWeight: 'bold', fontSize: 16, color: _goaFg('#c7d2fe') } }, '\uD83D\uDCCB Goal Setter'),
              streak > 0 ? h('span', { style: { background: 'rgba(245,158,11,0.2)', color: _goaFg('#fbbf24'), padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.3)' } }, '\uD83D\uDD25 ' + streak + '-day streak') : null
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { background: 'rgba(99,102,241,0.2)', color: _goaFg('#a5b4fc'), padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 'bold' } }, '\uD83C\uDFAF ' + activeGoals.length + ' active'),
              h('button', { 'aria-label': 'Toggle badges', onClick: function() { upd({ showBadges: !showBadges }); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '3px 8px', color: _goaFg('#c4b5fd'), fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFC5 ' + badgeCount)
            )
          ),

          // Tabs
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('goals', h, ctx) : null),
          h('div', { role: 'tablist', 'aria-label': 'Goal Setter sections', style: { display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.8)', overflowX: 'auto' } },
            goalTabs.map(function(tb) {
              var active = tab === tb.id;
              var tabIndex = goalTabs.indexOf(tb);
              return h('button', {
                id: 'goal-tab-' + tb.id,
                'aria-label': tb.label,
                'aria-controls': 'goal-panel-' + tb.id,
                'aria-selected': active,
                key: tb.id,
                role: 'tab',
                tabIndex: active ? 0 : -1,
                onClick: function() { sfxClick(); upd({ tab: tb.id }); },
                onKeyDown: function(event) {
                  var nextIndex = tabIndex;
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (tabIndex + 1) % goalTabs.length;
                  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (tabIndex - 1 + goalTabs.length) % goalTabs.length;
                  else if (event.key === 'Home') nextIndex = 0;
                  else if (event.key === 'End') nextIndex = goalTabs.length - 1;
                  else return;
                  event.preventDefault();
                  upd({ tab: goalTabs[nextIndex].id });
                  setTimeout(function() {
                    var nextTab = document.getElementById('goal-tab-' + goalTabs[nextIndex].id);
                    if (nextTab) nextTab.focus();
                  }, 0);
                },
                style: { flex: 1, padding: '10px 4px', fontSize: 10, fontWeight: 'bold', color: active ? _goaFg('#a5b4fc') : _goaFg('#94a3b8'), background: active ? 'rgba(99,102,241,0.1)' : 'transparent', borderTop: 'none', borderRight: 'none', borderLeft: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 0 }
              }, tb.label);
            })
          ),

          // ── Topic-accent hero band per tab ──
          (function() {
            var TAB_META = {
              goals:    { accent: '#6366f1', soft: 'rgba(99,102,241,0.14)',  icon: '\uD83C\uDFAF', title: 'Goals - choose a useful next step', hint: 'Choose a goal that matters to you, then make the first step manageable. You can adjust the goal or ask for support as you learn.' },
              habits:   { accent: '#10b981', soft: 'rgba(16,185,129,0.14)',  icon: '\uD83D\uDD01', title: 'Habits - try a routine that fits', hint: 'Choose a routine and record the days you tried it. A missed day is information, not a failure; change the routine or its supports when needed.' },
              vision:   { accent: _goaFg('#fbbf24'), soft: 'rgba(251,191,36,0.14)',  icon: '\uD83C\uDF1F', title: 'Vision - explore what matters', hint: 'Describe something you would like to work toward. Start with this week if a longer view is hard to imagine; your priorities can change.' },
              smart:    { accent: _goaFg('#a855f7'), soft: 'rgba(168,85,247,0.14)',  icon: '\uD83E\uDDE0', title: 'SMART - make a plan you can adjust', hint: 'Use these questions to make your plan clearer. A useful plan fits your situation and available supports; you can revise it after trying a step.' },
              coach:    { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)',  icon: '\uD83E\uDD16', title: 'Coach - explore a next step', hint: 'When an AI connection is available, you can ask for planning ideas. Check suggestions for fit with your situation; you choose what to try or share.' },
              checkin:  { accent: '#ec4899', soft: 'rgba(236,72,153,0.14)',  icon: '\uD83D\uDCDD', title: 'Check-In - a weekly goal review', hint: 'Look back at the last seven days, notice barriers and supports, and choose what might come next. Writing and ratings are optional.' },
              progress: { accent: '#d97706', soft: 'rgba(217,119,6,0.14)',   icon: '\uD83D\uDCCA', title: 'Progress - your recorded activity', hint: 'These records show checked steps and saved activity. They do not measure learning or wellbeing, and they may leave out progress made away from the tool.' }
            };
            var meta = TAB_META[tab] || TAB_META.goals;
            return h('div', {
              style: {
                margin: '8px 12px 0',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%), #0f172a',
                border: '1px solid ' + meta.accent + '55',
                borderLeft: '4px solid ' + meta.accent,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }
            },
              h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                h('p', { style: { margin: '3px 0 0', color: _goaFg('#cbd5e1'), fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            );
          })(),

          // Badge panel
          showBadges ? h('div', { style: { padding: 12, background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.15)' } },
            h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#c4b5fd'), marginBottom: 8 } }, '\uD83C\uDFC5 Badges \u2014 ' + badgeCount + '/' + Object.keys(BADGES).length),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(BADGES).map(function(id) {
                var b = BADGES[id]; var e = !!badges[id];
                return h('div', { key: id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: e ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', border: e ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(99,102,241,0.1)', opacity: e ? 1 : 0.5, fontSize: 10 } },
                  h('span', null, e ? b.icon : '\uD83D\uDD12'), h('span', { style: { fontWeight: 'bold', color: e ? _goaFg('#c4b5fd') : _goaFg('#94a3b8') } }, b.name)
                );
              })
            )
          ) : null,

          // Content
          h('div', { id: 'goal-panel-' + tab, role: 'tabpanel', 'aria-labelledby': 'goal-tab-' + tab, tabIndex: 0, style: { flex: 1, overflow: 'auto', padding: 16 } },
            h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'aria-label': 'Goal progress summary', style: { marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', color: _goaFg('#c7d2fe'), fontSize: 11, lineHeight: 1.5 } }, goalProgressText),

            // ── GOALS TAB ──
            tab === 'goals' ? h('div', null,
              h('p', { role: 'status', 'aria-live': 'polite', style: { fontSize: 14, lineHeight: 1.6, color: _goaFg('#e2e8f0') } }, typeof d.goalNotesNotice === 'string' ? d.goalNotesNotice : ''),
              // Motivational boost banner
              motivationalBoost ? h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 18 } }, '\uD83D\uDCAB'),
                h('span', { style: { fontSize: 12, color: _goaFg('#fbbf24'), lineHeight: 1.5, fontStyle: 'italic' } }, motivationalBoost)
              ) : null,
              // Daily Nudge — shows if no steps completed today
              dailyNudge ? h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.20)', display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 18 } }, '\uD83D\uDC4B'),
                h('span', { style: { fontSize: 12, color: _goaFg('#c7d2fe'), lineHeight: 1.5 } }, dailyNudge)
              ) : null,
              // Goal of the Week spotlight
              goalOfTheWeek ? h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(52,211,153,0.06))', border: '1px solid rgba(34,197,94,0.20)', display: 'flex', alignItems: 'center', gap: 10 } },
                h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
                  h('div', { style: { fontSize: 11, fontWeight: 'bold', color: _goaFg('#34d399'), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, '\u2B50 Goal of the Week'),
                  h('div', { style: { fontSize: 12, color: _goaFg('#e2e8f0'), fontWeight: 'bold' } }, goalOfTheWeek.text || '(unnamed)'),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } },
                    h('div', { style: { flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', maxWidth: 120 } },
                      h('div', { style: { width: (goalOfTheWeek.progress || 0) + '%', height: '100%', background: _goaBg('#15803d'), borderRadius: 3 } })
                    ),
                    h('span', { style: { fontSize: 10, color: _goaFg('#34d399'), fontWeight: 'bold' } }, (goalOfTheWeek.progress || 0) + '%')
                  )
                ),
                h('button', { 'aria-label': 'Focus on goal: ' + (goalOfTheWeek.text || 'unnamed goal'), onClick: function() { if ((goalOfTheWeek.text || '').trim()) openGoalDetails(goalOfTheWeek.id); else openGoalForEditing(goalOfTheWeek.id); }, style: { minHeight: 44, padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: _goaFg('#34d399'), fontSize: 10, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' } }, '\uD83C\uDFAF Focus')
              ) : null,
              // Accountability check
              (function() {
                var today = new Date().toISOString().slice(0, 10);
                if (accountabilityLog[today] !== undefined) return null;
                if (goals.length === 0) return null;
                return h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', { style: { fontSize: 12, color: _goaFg('#a5b4fc'), flex: 1 } }, band === 'elementary' ? 'Did you work on your goal today?' : 'Accountability check: did you work toward a goal today?'),
                  h('button', { onClick: function() { logAccountability(true); }, style: { padding: '5px 14px', borderRadius: 8, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: _goaFg('#34d399'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u2705 Yes'),
                  h('button', { 'aria-label': 'Not yet', onClick: function() { logAccountability(false); }, style: { padding: '5px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: _goaFg('#f87171'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u274C Not yet')
                );
              })(),
              accountabilityStreak > 0 ? h('div', { style: { fontSize: 10, color: _goaFg('#94a3b8'), marginBottom: 8, textAlign: 'center' } }, '\uD83D\uDCAA Accountability streak: ' + accountabilityStreak + ' day' + (accountabilityStreak !== 1 ? 's' : '')) : null,
              // Add goal button + templates toggle
              h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
                h('button', { 'aria-label': '+ New Goal', onClick: function() { addGoal('', 'personal'); }, style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: _goaBg('#6366f1'), color: _goaFg('#fff'), border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' } }, '+ New Goal'),
                h('button', { 'aria-label': 'Templates', onClick: function() { upd({ showTemplates: !showTemplates }); }, style: { padding: '10px 16px', borderRadius: 10, background: showTemplates ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: showTemplates ? _goaFg('#a5b4fc') : _goaFg('#94a3b8'), border: '1px solid rgba(99,102,241,0.2)', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDCA1 Templates')
              ),
              // Templates
              showTemplates ? h('div', { style: { marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' } },
                h('div', { style: { fontSize: 11, fontWeight: 'bold', color: _goaFg('#818cf8'), marginBottom: 8 } }, 'Goal Templates \u2014 tap to add'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  templates.map(function(tmpl, ti) {
                    var cat = GOAL_CATEGORIES.find(function(c) { return c.id === tmpl.cat; }) || GOAL_CATEGORIES[0];
                    return h('button', { 'aria-label': 'Add goal template: ' + tmpl.text, key: ti, onClick: function() { addGoal(tmpl.text, tmpl.cat); upd({ showTemplates: false }); }, title: tmpl.hint, style: { padding: '6px 12px', borderRadius: 8, background: cat.color + '15', border: '1px solid ' + cat.color + '33', color: cat.color, fontSize: 11, cursor: 'pointer', textAlign: 'left' } },
                      cat.emoji + ' ' + tmpl.text
                    );
                  })
                )
              ) : null,
              // Active goals
              activeGoals.length === 0 && completedGoals.length === 0 ?
                h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83C\uDFAF'),
                  h('p', { style: { fontSize: 14, color: _goaFg('#94a3b8') } }, band === 'elementary' ? 'No goals yet! Tap the button above to set your first goal.' : 'Ready to set meaningful goals? Start above or use a template.'),
                  h('p', { style: { fontSize: 11, color: _goaFg('#94a3b8'), marginTop: 4 } }, 'Goals with steps are easier to achieve!')
                ) : null,
              activeGoals.map(function(goal) {
                var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                var isExpanded = expandedGoalId === goal.id;
                var isEditing = renamingGoalId === goal.id && isExpanded;
                var goalDiff = goal.difficulty || 1;
                var goalDomId = getGoalDomId(goal.id);
                var goalLabel = (goal.text || '').trim() || 'unnamed goal';
                var goalSteps = goal.steps || [];
                var completedStepCount = goalSteps.filter(function(step) { return step.done; }).length;
                var goalProgressValue = goalSteps.length > 0 ? Math.round(completedStepCount / goalSteps.length * 100) : 0;
                var goalProgressText = goalSteps.length > 0 ? completedStepCount + ' of ' + goalSteps.length + ' steps complete' : 'No steps added yet';
                var firstIncompleteStep = goalSteps.find(function(step) { return !step.done && (step.text || '').trim(); });
                var nextActionText = !(goal.text || '').trim() ? 'Next: name this goal.' : goalSteps.length === 0 ? 'Next: add a first step.' : firstIncompleteStep ? 'Next: ' + firstIncompleteStep.text.trim() : 'All listed steps are complete.';
                var stepInputId = 'goal-step-input-' + goalDomId;
                var detailsId = 'goal-details-' + goalDomId;
                var disclosureId = 'goal-disclosure-' + goalDomId;
                return h('div', { key: goal.id, id: 'goal-card-' + goalDomId, style: { padding: 14, marginBottom: 10, borderRadius: 12, background: isExpanded ? 'rgba(99,102,241,0.09)' : 'rgba(99,102,241,0.04)', border: '1px solid ' + cat.color + (isExpanded ? '66' : '33'), transition: 'all 0.15s' } },
                  // Goal header
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, cat.emoji),
                    isEditing ?
                      h('input', { id: 'goal-name-input-' + goalDomId, type: 'text', 'aria-label': 'Goal name', value: goal.text, onChange: function(e) { updateGoal(goal.id, { text: e.target.value }); }, autoFocus: true, style: { flex: '1 1 180px', minHeight: 44, padding: '6px 8px', borderRadius: 6, border: '1px solid ' + cat.color + '44', background: 'rgba(15,23,42,0.6)', color: _goaFg('#e2e8f0'), fontSize: 13 } }) :
                      h('button', { 'aria-label': (goal.text ? 'Rename goal: ' + goal.text : 'Name your goal'), onClick: function() { openGoalForEditing(goal.id); }, style: { flex: '1 1 180px', minHeight: 44, padding: '4px 0', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, fontWeight: 'bold', color: _goaFg('#e2e8f0'), cursor: 'pointer' } }, goal.text || 'Name this goal...'),
                    // Difficulty indicator (flames)
                    h('span', { 'aria-label': 'Difficulty: ' + (DIFFICULTY_LABELS[goalDiff - 1] || DIFFICULTY_LABELS[0]).label, title: 'Difficulty: ' + (DIFFICULTY_LABELS[goalDiff - 1] || DIFFICULTY_LABELS[0]).label, style: { fontSize: 10, letterSpacing: -2, cursor: 'default' } }, getDifficultyFlames(goalDiff)),
                    h('select', { value: goal.category, 'aria-label': 'Category for goal: ' + (goal.text || 'unnamed goal'), onChange: function(e) { updateGoal(goal.id, { category: e.target.value }); }, style: { padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: _goaFg('#94a3b8'), fontSize: 10, cursor: 'pointer' } },
                      GOAL_CATEGORIES.map(function(c) { return h('option', { key: c.id, value: c.id }, c.emoji + ' ' + c.label); })
                    ),
                    h('button', { 'aria-label': 'Share goal: ' + goalLabel, onClick: function() { shareGoalToClipboard(goal); }, title: 'Share goal with buddy', style: { minWidth: 44, minHeight: 44, background: 'none', border: 'none', color: _goaFg('#818cf8'), cursor: 'pointer', fontSize: 14, padding: 4 } }, '\uD83D\uDCE4'),
                    h('button', { 'aria-label': 'Delete goal: ' + goalLabel, onClick: function() { deleteGoal(goal.id); }, style: { minWidth: 44, minHeight: 44, background: 'none', border: 'none', color: _goaFg('#94a3b8'), cursor: 'pointer', fontSize: 14, padding: 4 } }, '\u2715')
                  ),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('div', { role: 'progressbar', 'aria-label': 'Progress for ' + goalLabel, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': goalProgressValue, 'aria-valuetext': goalProgressText, style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      h('div', { style: { width: goalProgressValue + '%', height: '100%', background: 'linear-gradient(90deg, ' + cat.color + ', ' + cat.color + 'cc)', borderRadius: 4, transition: 'width 0.3s' } })
                    ),
                    h('span', { style: { fontSize: 11, fontWeight: 'bold', color: cat.color, minWidth: 32, textAlign: 'right' } }, goalProgressValue + '%')
                  ),
                  h('p', { style: { margin: '0 0 8px', color: _goaFg('#cbd5e1'), fontSize: 11, lineHeight: 1.5, fontWeight: 600 } }, nextActionText),
                  h('button', { id: disclosureId, 'aria-label': (isExpanded ? 'Collapse goal details: ' : 'Expand goal details: ') + goalLabel, 'aria-expanded': isExpanded, 'aria-controls': detailsId, onClick: function() { toggleGoalDetails(goal.id); }, style: { width: '100%', minHeight: 44, padding: '8px 12px', marginBottom: isExpanded ? 10 : 0, borderRadius: 8, border: '1px solid ' + cat.color + '44', background: isExpanded ? cat.color + '18' : 'rgba(255,255,255,0.03)', color: isExpanded ? cat.color : _goaFg('#94a3b8'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    h('span', null, isExpanded ? 'Hide goal details' : 'Show goal details'),
                    h('span', { 'aria-hidden': 'true' }, isExpanded ? '\u25B2' : '\u25BC')
                  ),
                  h('div', { id: detailsId, role: 'region', 'aria-labelledby': disclosureId, hidden: !isExpanded, style: { display: isExpanded ? 'block' : 'none', paddingTop: 2 } },
                  // Difficulty selector (shown when editing)
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 10, color: _goaFg('#94a3b8'), fontWeight: 'bold' } }, 'Difficulty:'),
                    [1, 2, 3, 4, 5].map(function(lvl) {
                      var info = DIFFICULTY_LABELS[lvl - 1];
                      var active = goalDiff === lvl;
                      return h('button', { 'aria-label': 'Set difficulty: ' + info.label, key: lvl, onClick: function() { updateGoal(goal.id, { difficulty: lvl }); sfxClick(); }, title: info.label + ' (' + info.xpMult + 'x XP)', style: { padding: '2px 8px', borderRadius: 12, background: active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)', border: active ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(99,102,241,0.1)', color: active ? _goaFg('#fbbf24') : _goaFg('#94a3b8'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, getDifficultyFlames(lvl) + ' ' + info.label);
                    })
                  ),
                  // Progress bar with milestone markers
                  (function() {
                    var milestones = getGoalMilestones(goal);
                    var hasMilestones = milestones.length > 0;
                    return hasMilestones ? h('div', { style: { marginBottom: 10, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)' } },
                      h('div', { style: { marginBottom: 5, fontSize: 10, fontWeight: 'bold', color: _goaFg('#94a3b8') } }, 'Milestones'),
                      h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                        milestones.map(function(ms) {
                          return h('div', { key: ms.threshold, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 } },
                            h('div', { style: { width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ms.isCurrent ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)', border: ms.isCurrent ? '2px solid #34d399' : '1px solid rgba(99,102,241,0.2)', fontSize: 7, color: ms.isCurrent ? _goaFg('#34d399') : '#475569' } }, ms.isCurrent ? '\u2713' : ms.threshold === 100 ? '\u2605' : '\u25CB'),
                            h('span', { style: { fontSize: 7, color: ms.isCurrent ? _goaFg('#34d399') : '#475569', marginTop: 1 } }, ms.threshold + '%')
                          );
                        })
                      )
                    ) : null;
                  })(),
                  // Steps
                  (goal.steps || []).map(function(step, si) {
                    return h('div', Object.assign({
                      key: si,
                      'aria-label': (step.done ? 'Mark incomplete: ' : 'Mark complete: ') + step.text,
                      'aria-pressed': step.done ? 'true' : 'false',
                      style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 4, borderRadius: 6, background: step.done ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }
                    }, a11yClick(function() { toggleStep(goal.id, si); })),
                      h('span', { style: { fontSize: 14 }, 'aria-hidden': 'true' }, step.done ? '\u2705' : '\u2B1C'),
                      h('span', { style: { fontSize: 12, color: step.done ? _goaFg('#6ee7b7') : _goaFg('#cbd5e1'), textDecoration: step.done ? 'line-through' : 'none' } }, step.text)
                    );
                  }),
                  // Add step input
                  h('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
                    h('input', { id: stepInputId, type: 'text', 'aria-label': 'Add a step to goal: ' + goalLabel, placeholder: band === 'elementary' ? 'Add a step...' : 'Add a step toward this goal...', onKeyDown: function(e) { if (e.key === 'Enter' && e.target.value.trim()) { addStep(goal.id, e.target.value); e.target.value = ''; } }, style: { flex: 1, minHeight: 44, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: _goaFg('#e2e8f0'), fontSize: 11 } }),
                    h('button', { 'aria-label': 'Add step to goal: ' + goalLabel, onClick: function() { var inp = document.getElementById(stepInputId); if (inp && inp.value.trim()) { addStep(goal.id, inp.value); inp.value = ''; } }, style: { minWidth: 44, minHeight: 44, padding: '6px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: _goaFg('#a5b4fc'), border: 'none', fontSize: 15, fontWeight: 'bold', cursor: 'pointer' } }, '+')
                  )
                )
                );
              }),
              // ── Celebration Screen (shown when a goal is just completed) ──
              celebratingGoalId ? (function() {
                var celebGoal = goals.find(function(g) { return g.id === celebratingGoalId; });
                if (!celebGoal) return null;
                var celebCat = GOAL_CATEGORIES.find(function(c) { return c.id === celebGoal.category; }) || GOAL_CATEGORIES[2];
                var daysTaken = getTimeToDays(celebGoal.createdAt, celebGoal.completedAt || Date.now());
                var stepsCount = getCompletedStepCount(celebGoal);
                var diffInfo = DIFFICULTY_LABELS[(celebGoal.difficulty || 1) - 1] || DIFFICULTY_LABELS[0];
                return h('section', { id: 'goal-completion-review-' + getGoalDomId(celebGoal.id), tabIndex: -1, 'aria-label': 'Completion note for ' + (celebGoal.text || 'unnamed goal'), style: { padding: 16, marginBottom: 16, borderRadius: 16, background: _goaHC ? '#000000' : '#0f172a', border: '2px solid ' + (_goaHC ? '#ffff00' : '#64748b'), textAlign: 'center', position: 'relative', overflowWrap: 'anywhere', fontSize: 14, lineHeight: 1.6 } },
                  // Confetti burst at top
                  h('div', { style: { fontSize: 28, marginBottom: 8, letterSpacing: 4 } }, '\uD83C\uDF89\uD83C\uDF8A\u2728\uD83C\uDF86\uD83C\uDF89\uD83C\uDF8A\u2728\uD83C\uDF86'),
                  h('div', { style: { fontSize: 18, fontWeight: 'bold', color: _goaFg('#34d399'), marginBottom: 4 } }, '\uD83C\uDFC6 Goal Completed!'),
                  h('div', { style: { fontSize: 14, color: _goaFg('#e2e8f0'), fontWeight: 'bold', marginBottom: 12 } }, celebCat.emoji + ' ' + (celebGoal.text || 'Your Goal')),
                  // Stats row
                  h('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14 } },
                    h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 20, fontWeight: 'bold', color: _goaFg('#6366f1') } }, String(daysTaken)),
                      h('div', { style: { fontSize: 11, color: _goaFg('#94a3b8') } }, 'Day' + (daysTaken !== 1 ? 's' : ''))
                    ),
                    h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 20, fontWeight: 'bold', color: _goaFg('#a855f7') } }, String(stepsCount)),
                      h('div', { style: { fontSize: 11, color: _goaFg('#94a3b8') } }, 'Steps Done')
                    ),
                    h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 14, fontWeight: 'bold', color: _goaFg('#fbbf24') } }, getDifficultyFlames(celebGoal.difficulty || 1)),
                      h('div', { style: { fontSize: 11, color: _goaFg('#94a3b8') } }, diffInfo.label)
                    )
                  ),
                  h('p', null, 'You can notice what helped, what you learned, or what you would change. Finishing the listed steps does not require a written reflection or another goal.'),
                  h('p', null, 'Think, draw, speak, sign, or use AAC if you prefer. Only what you enter here is saved in this note; sharing is your choice.'),
                  h('div', { style: { textAlign: 'left', marginBottom: 12 } },
                    h('label', { htmlFor: 'goal-note-' + getGoalDomId(celebGoal.id) + '-whatLearned', style: { display: 'block', fontWeight: 700, marginBottom: 8 } }, 'What would I like to remember? (optional)'),
                    h('textarea', { id: 'goal-note-' + getGoalDomId(celebGoal.id) + '-whatLearned', value: goalNoteValue(celebGoal.id, 'whatLearned'), onChange: function(event) { updateGoalNote(celebGoal.id, 'whatLearned', event.target.value); }, rows: 3, style: noteFieldStyle })
                  ),
                  h('p', null, 'Your unfinished note stays with this goal when you switch tabs or pause. Use the Hub save/export controls to keep a project copy.'),
                  h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                    h('button', { onClick: function() { saveCompletionJournal(celebGoal.id, goalNoteValue(celebGoal.id, 'whatLearned')); }, style: noteSaveStyle }, 'Save completion note'),
                    h('button', { onClick: dismissCelebration, style: noteButtonStyle }, 'Pause for now'),
                    h('button', { onClick: function() { shareAchievement(celebGoal); }, style: noteButtonStyle }, 'Copy achievement'),
                    h('button', { onClick: function() { dismissCelebration(); addGoal('', 'personal'); }, style: noteButtonStyle }, 'Set another goal')
                  )
                );
              })() : null,
              // Completed goals with reflection journal
              completedGoals.length > 0 ? h('div', { style: { marginTop: 20 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#34d399'), marginBottom: 8 } }, '\u2705 Completed (' + completedGoals.length + ')'),
                completedGoals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  var isReflecting = reflectingGoalId === goal.id;
                  var hasReflections = goal.reflections && goal.reflections.length > 0;
                  var goalDiffLvl = goal.difficulty || 1;
                  return h('section', { key: goal.id, id: 'goal-completed-' + getGoalDomId(goal.id), tabIndex: -1, 'aria-label': 'Completed goal: ' + (goal.text || 'unnamed goal'), style: { padding: 12, marginBottom: 8, borderRadius: 10, background: _goaHC ? '#000000' : '#0f172a', border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), overflowWrap: 'anywhere', fontSize: 14, lineHeight: 1.6, scrollMarginTop: 100 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      h('span', null, cat.emoji),
                      h('span', { style: { flex: '1 1 180px', fontSize: 16, color: _goaFg('#6ee7b7'), textDecoration: 'line-through' } }, goal.text),
                      h('span', { style: { fontSize: 10, letterSpacing: -2 } }, getDifficultyFlames(goalDiffLvl)),
                      h('span', { style: { fontSize: 10, color: _goaFg('#34d399') } }, '\uD83C\uDF89 Done!'),
                      !goal.completionJournal ? h('button', { 'aria-label': 'Completion note for ' + (goal.text || 'unnamed goal'), onClick: function() { upd({ celebratingGoalId: goal.id, goalNotesNotice: '' }); focusGoalNote(goal.id, 'whatLearned'); }, style: noteButtonStyle }, 'Completion note') : null,
                      !hasReflections ? h('button', { 'aria-label': (isReflecting ? 'Pause reflection for ' : 'Reflect on ') + (goal.text || 'unnamed goal'), onClick: function() { upd({ reflectingGoalId: isReflecting ? null : goal.id, goalNotesNotice: '' }); if (!isReflecting) focusGoalNote(goal.id, 'whatWorked'); }, style: noteButtonStyle }, isReflecting ? 'Pause reflection' : 'Reflect') : null,
                      h('button', { 'aria-label': 'Copy goal: ' + (goal.text || 'unnamed goal'), onClick: function() { shareGoalToClipboard(goal); }, style: noteButtonStyle }, 'Copy goal')
                    ),
                    // Completion stats line
                    (goal.completedAt || goal.completionJournal) ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, paddingLeft: 22, fontSize: 10, color: _goaFg('#94a3b8') } },
                      goal.completedAt ? h('span', null, '\u23F1\uFE0F ' + getTimeToDays(goal.createdAt, goal.completedAt) + ' days') : null,
                      h('span', null, '\uD83D\uDC63 ' + getCompletedStepCount(goal) + ' steps'),
                      goal.completionJournal ? h('span', { style: { color: _goaFg('#a5b4fc') } }, '\uD83D\uDCA1 Journal saved') : null
                    ) : null,
                    goal.completionJournal ? h('div', { style: { marginTop: 8, fontSize: 14, lineHeight: 1.6 } },
                      h('h4', { style: { fontSize: 16, margin: '0 0 4px' } }, 'Saved completion note'),
                      h('p', { style: { whiteSpace: 'pre-wrap' } }, goal.completionJournal.whatLearned || 'No written note recorded.')
                    ) : null,
                    // Goal-specific controlled drafts survive tab changes and project restore.
                    isReflecting ? h('section', { 'aria-label': 'Reflection for ' + (goal.text || 'unnamed goal'), style: { marginTop: 12, padding: 12, borderRadius: 8, border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b') } },
                      h('h4', { style: { fontSize: 16, margin: '0 0 8px' } }, 'Reflect on this goal'),
                      h('p', null, 'Choose any question or leave them blank. You can think, draw, speak, sign, or use AAC away from this form. You do not need to share personal details.'),
                      reflectionFields.map(function(field) {
                        var fieldId = 'goal-note-' + getGoalDomId(goal.id) + '-' + field.key;
                        return h('div', { key: field.key, style: { marginBottom: 16 } },
                          h('label', { htmlFor: fieldId, style: { display: 'block', fontWeight: 700 } }, field.label),
                          h('p', { id: fieldId + '-help', style: { margin: '4px 0 8px' } }, field.hint),
                          h('textarea', { id: fieldId, 'aria-describedby': fieldId + '-help', value: goalNoteValue(goal.id, field.key), onChange: function(event) { updateGoalNote(goal.id, field.key, event.target.value); }, rows: 3, style: noteFieldStyle })
                        );
                      }),
                      h('p', null, 'Your draft stays with this goal when you switch tabs or pause. Use the Hub save/export controls to keep a project copy. Sharing is your choice.'),
                      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                        h('button', { onClick: function() {
                          var reflection = {};
                          reflectionFields.forEach(function(field) { reflection[field.key] = goalNoteValue(goal.id, field.key); });
                          saveReflection(goal.id, reflection);
                        }, style: noteSaveStyle }, 'Save reflection'),
                        h('button', { onClick: function() { upd({ reflectingGoalId: null, goalNotesNotice: 'Reflection paused. Your draft stays with this goal in this activity.' }); focusCompletedGoal(goal.id); }, style: noteButtonStyle }, 'Pause for now')
                      )
                    ) : null,
                    hasReflections ? h('details', { style: { marginTop: 12, fontSize: 14, lineHeight: 1.6 } },
                      h('summary', { style: { minHeight: 44, cursor: 'pointer', fontWeight: 700 } }, 'Saved reflections (' + goal.reflections.length + ')'),
                      goal.reflections.map(function(ref, ri) {
                        return h('article', { key: ri, 'aria-label': 'Saved reflection ' + (ri + 1), style: { marginTop: 12 } },
                          h('p', null, typeof ref.date === 'number' && isFinite(ref.date) && ref.date > 0 ? 'Saved ' + new Date(ref.date).toLocaleString() : 'Saved reflection (date not recorded)'),
                          reflectionFields.some(function(field) { return ref[field.key]; }) ? reflectionFields.map(function(field) {
                            return ref[field.key] ? h('p', { key: field.key, style: { whiteSpace: 'pre-wrap' } }, h('strong', null, field.label.replace(' (optional)', '') + ' '), ref[field.key]) : null;
                          }) : h('p', null, 'No written responses recorded.')
                        );
                      })
                    ) : null
                  );
                })
              ) : null
            ) : null,

            // ── HABITS TAB ──
            tab === 'habits' ? h('section', { 'aria-label': 'Habit tracker', style: { fontSize: 14, lineHeight: 1.6, color: _goaFg('#e2e8f0'), overflowWrap: 'anywhere' } },
              h('h3', { id: 'goal-habits-heading', tabIndex: -1, style: { fontSize: 18, margin: '0 0 8px', scrollMarginTop: 100 } }, 'Routines that fit your day'),
              h('p', null, 'Choose a routine that is useful to you. You can change your plan, ask for support, or take a break. An unchecked day means not recorded; it does not tell us whether you tried or how the day went.'),
              h('p', null, 'Dates follow this device’s local calendar. Earlier dated records keep their original date labels. Use the Hub save/export controls to keep a project copy.'),
              h('p', { role: 'status', 'aria-live': 'polite' }, d.habitNotice || ''),
              habits.length < 7 ? h('form', { 'aria-label': 'Add a routine', onSubmit: function(event) { event.preventDefault(); addHabit(d.habitNameDraft || '', d.habitCategoryDraft || 'health'); }, style: { marginBottom: 16 } },
                h('label', { htmlFor: 'habit-input', style: { display: 'block', fontWeight: 700 } }, 'Routine to try'),
                h('input', { id: 'habit-input', value: d.habitNameDraft || '', onChange: function(event) { upd({ habitNameDraft: event.target.value }); }, style: Object.assign({}, noteFieldStyle, { minHeight: 44, marginBottom: 12 }) }),
                h('label', { htmlFor: 'habit-cat-select', style: { display: 'block', fontWeight: 700 } }, 'Routine category'),
                h('select', { id: 'habit-cat-select', value: d.habitCategoryDraft || 'health', onChange: function(event) { upd({ habitCategoryDraft: event.target.value }); }, style: Object.assign({}, noteFieldStyle, { minHeight: 44, marginBottom: 12 }) },
                  HABIT_CATEGORIES.map(function(hc) { return h('option', { key: hc.id, value: hc.id }, hc.label); })
                ),
                h('button', { type: 'submit', style: noteSaveStyle }, 'Add routine')
              ) : h('p', null, 'You have seven routines, the limit for this tracker. You can keep these or remove one before adding another.'),
              habits.length < 7 && h('details', { style: { marginBottom: 16 } },
                h('summary', { style: { minHeight: 44, cursor: 'pointer', fontWeight: 700 } }, 'Try a suggested routine'),
                h('p', null, 'These are starting points. Choose an amount and a way of participating that fit your situation.'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                  [{ n: 'Read or listen to a short section', c: 'academic' }, { n: 'Check my plan and supports', c: 'health' }, { n: 'Make time to create', c: 'creative' }].map(function(sug) {
                    return h('button', { 'aria-label': 'Add suggested habit: ' + sug.n, key: sug.n, onClick: function() { addHabit(sug.n, sug.c); }, style: noteButtonStyle }, sug.n);
                  })
                )
              ),
              habits.length > 0 && h('div', { role: 'group', 'aria-label': 'Filter routines', style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 } },
                h('button', { 'aria-pressed': habitCategoryFilter === 'all', onClick: function() { upd({ habitCategoryFilter: 'all' }); }, style: habitCategoryFilter === 'all' ? noteSaveStyle : noteButtonStyle }, 'All routines'),
                HABIT_CATEGORIES.map(function(hc) { return h('button', { key: hc.id, 'aria-label': 'Filter habits by ' + hc.label, 'aria-pressed': habitCategoryFilter === hc.id, onClick: function() { upd({ habitCategoryFilter: hc.id }); }, style: habitCategoryFilter === hc.id ? noteSaveStyle : noteButtonStyle }, hc.label); })
              ),
              habits.length === 0 ? h('p', null, 'No routines recorded yet. You can start with one manageable action.') : !habits.some(function(hab) { return habitCategoryFilter === 'all' || getHabitCategory(hab) === habitCategoryFilter; }) ? h('p', null, 'No routines in this category. Choose All routines to see your other records.') : null,
              habits.map(function(hab, hi) {
                if (habitCategoryFilter !== 'all' && getHabitCategory(hab) !== habitCategoryFilter) return null;
                var name = getHabitName(hab) || 'Unnamed routine';
                var recorded = weekDates.filter(function(date) { return !!habitLog[hi + '-' + date]; }).length;
                var pending = d.pendingHabitRemoval && d.pendingHabitRemoval.index === hi && d.pendingHabitRemoval.snapshot === JSON.stringify(habits);
                return h('section', { key: hi, id: 'goal-habit-' + hi, tabIndex: -1, 'aria-label': 'Routine: ' + name, style: { marginBottom: 16, padding: 12, border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), borderRadius: 12, scrollMarginTop: 100 } },
                  h('h4', { id: 'goal-habit-name-' + hi, style: { fontSize: 16, margin: '0 0 8px' } }, name),
                  renderRoutinePlan(hab, hi),
                  h('p', null, recorded + ' of 7 displayed days recorded.'),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 } },
                    weekDates.map(function(date) {
                      var checked = !!habitLog[hi + '-' + date];
                      var dateText = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                      var today = date === weekDates[6];
                      return h('button', { key: date, 'data-habit-date': date, 'aria-labelledby': 'goal-habit-day-' + hi + '-' + date + ' goal-habit-name-' + hi, 'aria-pressed': checked, onClick: function() { toggleHabit(hi, date); }, style: Object.assign({}, checked ? noteSaveStyle : noteButtonStyle, { minWidth: 0, padding: 8, textAlign: 'left' }) },
                        h('span', { id: 'goal-habit-day-' + hi + '-' + date },
                          h('span', { style: { display: 'block' } }, dateText), ' ',
                          today && h('span', { style: { display: 'block', fontWeight: 700 } }, 'Today'), ' ',
                          h('span', { style: { display: 'block', fontWeight: 700 } }, checked ? 'Recorded' : 'Not recorded')
                        )
                      );
                    })
                  ),
                  pending ? h('div', { role: 'group', 'aria-label': 'Confirm removal of ' + name, style: { marginTop: 12 } },
                    h('p', null, 'Remove this routine, its plan and all its dated records? This cannot be undone here. Other routine records will stay.'),
                    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                      h('button', { id: 'goal-habit-remove-cancel-' + hi, onClick: function() { upd({ pendingHabitRemoval: null }); focusHabitControl('goal-habit-remove-' + hi); }, style: noteButtonStyle }, 'Keep routine'),
                      h('button', { onClick: function() { removeHabit(hi); }, style: noteButtonStyle }, 'Remove routine and records')
                    )
                  ) : h('button', { id: 'goal-habit-remove-' + hi, 'aria-label': 'Remove routine: ' + name, onClick: function() { requestHabitRemoval(hi); }, style: Object.assign({}, noteButtonStyle, { marginTop: 12 }) }, 'Remove routine')
                );
              }),
              habits.length > 0 && h('details', { style: { marginTop: 16 } },
                h('summary', { style: { minHeight: 44, cursor: 'pointer', fontWeight: 700 } }, 'Daily record totals'),
                h('p', null, 'Totals include all current routines, including those hidden by the category filter. They count recorded checks, not effort or learning. Adding or removing a routine changes the current list used for these totals.'),
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 14 } },
                  h('caption', null, 'Records across current routines'),
                  h('thead', null, h('tr', null, h('th', { scope: 'col', style: { textAlign: 'left', padding: 8 } }, 'Date'), h('th', { scope: 'col', style: { textAlign: 'left', padding: 8 } }, 'Recorded'))),
                  h('tbody', null, getWeeklyHabitChartData().map(function(day) { return h('tr', { key: day.date },
                    h('th', { scope: 'row', style: { textAlign: 'left', padding: 8, fontWeight: 400 } }, day.date),
                    h('td', { style: { padding: 8 } }, day.completed + ' of ' + day.total)
                  ); }))
                )
              )
            ) : null,

            // ── VISION BOARD TAB ──
            tab === 'vision' ? h('div', null,
              h('div', { style: { fontSize: 14, fontWeight: 'bold', color: _goaFg('#a5b4fc'), marginBottom: 4 } }, '\uD83C\uDF1F Vision Board'),
              h('p', { style: { fontSize: 11, color: _goaFg('#94a3b8'), marginBottom: 14, lineHeight: 1.5 } },
                band === 'elementary' ? 'Write down your dreams and wishes! What do you want to do or become?' :
                band === 'middle' ? 'Map out your aspirations across different timeframes. Dream big, then plan small.' :
                'Clarify your vision across timeframes. Vision without action is a daydream \u2014 action without vision is a nightmare.'
              ),
              // Motivational quote
              h('div', { style: { padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' } },
                h('div', { style: { fontSize: 10, color: _goaFg('#818cf8'), fontWeight: 'bold', marginBottom: 4 } }, '\u2728 Motivational Quote'),
                h('div', { style: { fontSize: 13, color: _goaFg('#c7d2fe'), fontStyle: 'italic', lineHeight: 1.6 } }, d.currentQuote || getRandomQuote()),
                h('button', { 'aria-label': 'New quote', onClick: function() { upd({ currentQuote: getRandomQuote() }); }, style: { marginTop: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '3px 12px', color: _goaFg('#a5b4fc'), fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD04 New quote')
              ),
              // Vision sections
              [
                { key: 'thisWeek', label: 'This Week', emoji: '\uD83D\uDCC5', hint: band === 'elementary' ? 'What do you want to do this week?' : 'What will you accomplish this week?', color: _goaFg('#22c55e') },
                { key: 'thisMonth', label: 'This Month', emoji: '\uD83D\uDCC6', hint: band === 'elementary' ? 'What do you want to do this month?' : 'Where do you want to be by month\'s end?', color: _goaFg('#6366f1') },
                { key: 'thisYear', label: 'This Year', emoji: '\uD83C\uDF1F', hint: band === 'elementary' ? 'What\'s your big dream for this year?' : band === 'middle' ? 'What does your ideal year look like?' : 'What is your overarching vision for this year?', color: _goaFg('#a855f7') }
              ].map(function(section) {
                return h('div', { key: section.key, style: { marginBottom: 14, padding: 14, borderRadius: 12, background: section.color + '08', border: '1px solid ' + section.color + '22' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 } },
                    h('span', { style: { fontSize: 16 } }, section.emoji),
                    h('span', { style: { fontSize: 13, fontWeight: 'bold', color: section.color } }, section.label)
                  ),
                  h('textarea', { value: visionBoard[section.key] || '', 'aria-label': section.label + ' vision', onChange: function(e) { updateVision(section.key, e.target.value); }, placeholder: section.hint, style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid ' + section.color + '22', background: 'rgba(15,23,42,0.4)', color: _goaFg('#e2e8f0'), fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 } })
                );
              }),
              // Vision board preview
              (visionBoard.thisWeek || visionBoard.thisMonth || visionBoard.thisYear) ? h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(99,102,241,0.15)', marginTop: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#a5b4fc'), marginBottom: 8, textAlign: 'center' } }, '\uD83D\uDDBC\uFE0F My Vision Board'),
                visionBoard.thisWeek ? h('div', { style: { marginBottom: 6 } },
                  h('span', { style: { fontSize: 10, fontWeight: 'bold', color: _goaFg('#22c55e') } }, '\uD83D\uDCC5 This Week: '),
                  h('span', { style: { fontSize: 11, color: _goaFg('#cbd5e1') } }, visionBoard.thisWeek)
                ) : null,
                visionBoard.thisMonth ? h('div', { style: { marginBottom: 6 } },
                  h('span', { style: { fontSize: 10, fontWeight: 'bold', color: _goaFg('#6366f1') } }, '\uD83D\uDCC6 This Month: '),
                  h('span', { style: { fontSize: 11, color: _goaFg('#cbd5e1') } }, visionBoard.thisMonth)
                ) : null,
                visionBoard.thisYear ? h('div', { style: { marginBottom: 6 } },
                  h('span', { style: { fontSize: 10, fontWeight: 'bold', color: _goaFg('#a855f7') } }, '\uD83C\uDF1F This Year: '),
                  h('span', { style: { fontSize: 11, color: _goaFg('#cbd5e1') } }, visionBoard.thisYear)
                ) : null
              ) : null
            ) : null,

            // ── SMART BUILDER TAB ──
            tab === 'smart' ? h('div', null,
              h('p', { style: { fontSize: 12, color: _goaFg('#94a3b8'), marginBottom: 12, lineHeight: 1.6 } },
                band === 'elementary' ? 'SMART goals help you think clearly about what you want to do. Fill in each section!' :
                'SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound. Select a goal and build it out.'
              ),
              renderSmartExamples(),
              goals.length === 0 && !showSmartExamples ?
                h('div', { style: { textAlign: 'center', padding: 30 } },
                  h('p', { style: { color: _goaFg('#94a3b8') } }, 'Create a goal first, then come here to make it SMART!'),
                  h('button', { 'aria-label': '+ Create Goal', onClick: function() { upd({ tab: 'goals' }); addGoal('', 'personal'); }, style: { marginTop: 8, padding: '8px 20px', borderRadius: 8, background: _goaBg('#6366f1'), color: _goaFg('#fff'), border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '+ Create Goal')
                ) :
                h('div', null,
                  // Goal selector
                  h('select', { value: editingGoal || '', 'aria-label': 'Select a goal for SMART planning', onChange: function(e) { upd({ editingGoal: e.target.value, smartStep: 0 }); }, style: { width: '100%', padding: '10px 12px', minHeight: 44, borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: _goaFg('#e2e8f0'), fontSize: 12, marginBottom: 12 } },
                    h('option', { value: '' }, '-- Select a goal --'),
                    goals.map(function(g) { return h('option', { key: g.id, value: g.id }, g.text || '(unnamed goal)'); })
                  ),
                  editGoal ? h('div', null,
                    h('div', { style: { fontSize: 14, fontWeight: 'bold', color: _goaFg('#a5b4fc'), marginBottom: 12 } }, '\uD83E\uDDE0 SMART Breakdown: ' + (editGoal.text || '(unnamed)')),
                    h('div', { role: 'group', 'aria-label': 'SMART builder view', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, marginBottom: 14, borderRadius: 10, background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(99,102,241,0.15)' } },
                      h('button', { 'aria-pressed': smartBuildMode === 'guided', onClick: function() {
                        var nextStep = firstIncompleteSmartStep(editGoal);
                        upd({ smartBuildMode: 'guided', smartStep: nextStep });
                        focusSmartField(editGoal.id, ['S', 'M', 'A', 'R', 'T'][nextStep]);
                      }, style: { minHeight: 44, padding: '8px 10px', borderRadius: 8, border: smartBuildMode === 'guided' ? '1px solid rgba(168,85,247,0.55)' : '1px solid transparent', background: smartBuildMode === 'guided' ? 'rgba(168,85,247,0.18)' : 'transparent', color: smartBuildMode === 'guided' ? _goaFg('#ddd6fe') : _goaFg('#94a3b8'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, 'Guided steps'),
                      h('button', { 'aria-pressed': smartBuildMode === 'all', onClick: function() { upd({ smartBuildMode: 'all' }); }, style: { minHeight: 44, padding: '8px 10px', borderRadius: 8, border: smartBuildMode === 'all' ? '1px solid rgba(168,85,247,0.55)' : '1px solid transparent', background: smartBuildMode === 'all' ? 'rgba(168,85,247,0.18)' : 'transparent', color: smartBuildMode === 'all' ? _goaFg('#ddd6fe') : _goaFg('#94a3b8'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, 'All fields')
                    ),
                    smartBuildMode === 'guided' ? (function() {
                      var smartKeys = ['S', 'M', 'A', 'R', 'T'];
                      var currentKey = smartKeys[smartStep];
                      var currentInfo = SMART_LABELS[currentKey];
                      return h('div', null,
                        h('div', { style: { marginBottom: 12 } },
                          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: 11 } },
                            h('span', { style: { color: _goaFg('#c4b5fd'), fontWeight: 'bold' } }, 'Step ' + (smartStep + 1) + ' of 5'),
                            h('span', { style: { color: _goaFg('#94a3b8') } }, currentKey + ' — ' + currentInfo.label)
                          ),
                          h('div', { role: 'progressbar', 'aria-label': 'SMART builder position', 'aria-valuemin': 1, 'aria-valuemax': 5, 'aria-valuenow': smartStep + 1, 'aria-valuetext': 'Step ' + (smartStep + 1) + ' of 5: ' + currentInfo.label, style: { height: 6, borderRadius: 999, background: 'rgba(99,102,241,0.12)', overflow: 'hidden' } },
                            h('div', { style: { width: ((smartStep + 1) / 5 * 100) + '%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #7c3aed, #a855f7)', transition: 'width 0.2s ease' } })
                          )
                        ),
                        h('div', { 'aria-label': 'Choose a SMART step', style: { display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 12 } },
                          smartKeys.map(function(key, index) {
                            var done = !!(editGoal.smart && editGoal.smart[key] && editGoal.smart[key].trim());
                            var current = index === smartStep;
                            return h('button', { key: key, 'aria-label': key + ': ' + SMART_LABELS[key].label + (done ? ', complete' : ', not complete'), 'aria-current': current ? 'step' : undefined, onClick: function() { moveSmartStep(editGoal, index); }, style: { minWidth: 44, minHeight: 44, borderRadius: '50%', border: current ? '2px solid #a855f7' : done ? '2px solid #22c55e' : '1px solid rgba(99,102,241,0.2)', background: current ? 'rgba(168,85,247,0.18)' : done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)', color: current ? _goaFg('#ddd6fe') : done ? _goaFg('#86efac') : _goaFg('#94a3b8'), fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, done && !current ? '\u2713' : key);
                          })
                        ),
                        renderSmartField(editGoal, currentKey),
                        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between' } },
                          h('button', { disabled: smartStep === 0, onClick: function() { moveSmartStep(editGoal, smartStep - 1); }, style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(255,255,255,0.03)', color: _goaFg('#cbd5e1'), fontSize: 11, fontWeight: 'bold', cursor: smartStep === 0 ? 'not-allowed' : 'pointer', opacity: smartStep === 0 ? 0.45 : 1 } }, '\u2190 Previous'),
                          h('button', { onClick: function() { if (smartStep === 4) upd({ smartBuildMode: 'all' }); else moveSmartStep(editGoal, smartStep + 1); }, style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.35)', background: _goaBg('#7c3aed'), color: _goaFg('#fff'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, smartStep === 4 ? 'Review all fields' : 'Next: ' + smartKeys[smartStep + 1] + ' \u2192')
                        )
                      );
                    })() : h('div', null,
                      ['S', 'M', 'A', 'R', 'T'].map(function(key) { return renderSmartField(editGoal, key); })
                    ),
                    // SMART completeness indicator
                    (function() {
                      var filled = ['S','M','A','R','T'].filter(function(k) { return editGoal.smart && editGoal.smart[k] && editGoal.smart[k].trim(); }).length;
                      return h('div', { role: 'status', 'aria-live': 'polite', style: { textAlign: 'center', padding: 12, borderRadius: 8, background: filled === 5 ? 'rgba(52,211,153,0.1)' : 'rgba(99,102,241,0.06)', border: '1px solid ' + (filled === 5 ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.1)') } },
                        h('div', { style: { fontSize: 12, fontWeight: 'bold', color: filled === 5 ? _goaFg('#34d399') : _goaFg('#94a3b8') } }, filled === 5 ? '\u2705 SMART goal complete!' : filled + '/5 SMART fields filled'),
                        h('div', { style: { display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 } },
                          ['S','M','A','R','T'].map(function(k) {
                            var done = editGoal.smart && editGoal.smart[k] && editGoal.smart[k].trim();
                            return h('div', { key: k, style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#22c55e22' : 'rgba(255,255,255,0.04)', border: done ? '2px solid #22c55e' : '1px solid rgba(99,102,241,0.15)', color: done ? _goaFg('#22c55e') : _goaFg('#94a3b8'), fontSize: 11, fontWeight: 'bold' } }, k);
                          })
                        ),
                        filled === 5 ? h('div', { style: { marginTop: 10 } },
                          h('p', { style: { margin: '0 0 8px', color: _goaFg('#a7f3d0'), fontSize: 11, lineHeight: 1.5 } }, 'Your plan is clear. Turn it into one small action you can start.'),
                          h('button', { onClick: function() { upd({ tab: 'goals', editingGoal: editGoal.id, expandedGoalId: editGoal.id, renamingGoalId: null }); focusGoalStepInput(editGoal.id); }, style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.16)', color: _goaFg('#a7f3d0'), fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, 'Add the first action step \u2192')
                        ) : h('p', { style: { margin: '8px 0 0', color: _goaFg('#94a3b8'), fontSize: 10, lineHeight: 1.5 } }, 'Use guided steps or view everything at once. Your work is saved either way.')
                      );
                    })()
                  ) : null
                )
            ) : null,

            // ── COACH TAB ──
            tab === 'coach' ? h('div', null,
              h('div', { style: { textAlign: 'center', padding: 16 } },
                h('div', { style: { fontSize: 40, marginBottom: 8 } }, '\uD83E\uDD16'),
                h('p', { style: { fontSize: 12, color: _goaFg('#94a3b8'), maxWidth: 400, margin: '0 auto 12px', lineHeight: 1.6 } },
                  band === 'elementary' ? 'I\'m your Goal Coach! Ask me for help making plans and staying on track!' :
                  'AI Goal Coach \u2014 get personalized advice on setting, tracking, and achieving your goals.'
                )
              ),
              h('div', { role: 'region', 'aria-label': 'Goal coach response', 'aria-live': 'polite', 'aria-busy': aiLoading ? 'true' : 'false' },
                aiResponse ? h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: _goaFg('#c7d2fe') } },
                  h('div', { style: { fontSize: 10, color: _goaFg('#818cf8'), fontWeight: 'bold', marginBottom: 4 } }, '\uD83E\uDD16 Goal Coach'),
                  aiResponse,
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: _goaFg('#818cf8'), fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
                ) : null
              ),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', { type: 'text', value: aiInput, 'aria-label': 'Ask the goal coach', onChange: function(e) { upd({ aiInput: e.target.value }); }, onKeyDown: function(e) { if (e.key === 'Enter') askAI(); }, placeholder: 'Ask about your goals...', style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: _goaFg('#e2e8f0'), fontSize: 12 } }),
                h('button', { onClick: askAI, disabled: aiLoading, style: { padding: '10px 16px', borderRadius: 8, background: _goaBg('#6366f1'), color: _goaFg('#fff'), border: 'none', fontWeight: 'bold', fontSize: 12, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3' : '\u2191')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 } },
                (band === 'elementary' ? ['How do I start?', 'I\'m stuck on my goal', 'Make my goal easier', 'Give me a fun challenge'] :
                 ['Break my goal into smaller steps', 'I keep procrastinating', 'Is my goal realistic?', 'How do I stay motivated?', 'Help me reframe my goal as SMART']).map(function(q) {
                  return h('button', { 'aria-label': q, key: q, onClick: function() { upd({ aiInput: q }); }, style: { padding: '5px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: _goaFg('#a5b4fc'), fontSize: 10, cursor: 'pointer' } }, q);
                })
              )
            ) : null,

            // ── WEEKLY CHECK-IN TAB ──
            tab === 'checkin' ? h('section', { 'aria-label': 'Weekly goal review', style: { color: _goaFg('#e2e8f0'), overflowWrap: 'anywhere', fontSize: 14, lineHeight: 1.6 } },
              h('h3', { style: { fontSize: 18, margin: '0 0 8px' } }, 'Weekly goal review'),
              h('p', null, 'Reflect on what fit, what got in the way, and what you might change. Writing and ratings are optional. You can think, draw, speak, sign, or use AAC away from this form; only what you save here becomes a review.'),
              h('p', { role: 'status', 'aria-live': 'polite' }, d.weeklyNotice || ''),
              h('div', { role: 'region', 'aria-label': 'Goal step records', style: { padding: 14, borderRadius: 12, border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), marginBottom: 16 } },
                h('h4', { style: { margin: '0 0 8px', fontSize: 16 } }, 'Step records from the last 7 days'),
                h('p', null, 'Only currently checked steps with a completion date in the last 7 days count here. Older undated steps stay in the overall count. Records do not capture every kind of progress or support you needed.'),
                goals.length === 0 ? h('p', null, 'No goals recorded yet. You can still reflect or plan a small next step.') : h('ul', { style: { paddingLeft: 20 } }, getWeekProgressSummary().map(function(goal) {
                  return h('li', { key: goal.goalId, style: { marginBottom: 12 } }, h('strong', null, goal.text),
                    h('div', null, goal.stepsComplete + (goal.stepsComplete === 1 ? ' step' : ' steps') + ' dated in the last 7 days; ' + goal.totalComplete + ' of ' + goal.totalSteps + ' steps checked overall.'),
                    goal.undatedComplete > 0 && h('div', null, goal.undatedComplete + (goal.undatedComplete === 1 ? ' checked step has' : ' checked steps have') + ' no completion date and ' + (goal.undatedComplete === 1 ? 'is' : 'are') + ' not assigned to this week.')
                  );
                }))
              ),
              h('details', { style: { marginBottom: 16 } },
                h('summary', { style: { minHeight: 44, cursor: 'pointer', fontWeight: 700 } }, 'Try a fictional example'),
                h('p', null, 'A learner planned to read in a busy room. They tried one page, then asked for a quieter place and an audio version. Next time, they could start with a short section and check whether those supports help. Changing a plan or asking for support can be a useful next step.')
              ),
              [
                { key: 'obstacles', label: 'What got in the way? (optional)', hint: 'You can name a barrier in the task or environment. You do not need to share personal details.' },
                { key: 'support', label: 'What helped, or what support could help? (optional)', hint: 'For example: a model, more time, a quieter space, accessible materials, or help from someone you choose.' },
                { key: 'focus', label: 'What might I try or change next? (optional)', hint: 'Choose a small step, adjust the plan, ask for support, or take a break.' }
              ].map(function(field) {
                return h('div', { key: field.key, style: { marginBottom: 16 } },
                  h('label', { htmlFor: 'goal-weekly-' + field.key, style: { display: 'block', fontWeight: 700 } }, field.label),
                  h('p', { id: 'goal-weekly-' + field.key + '-help', style: { margin: '4px 0 8px' } }, field.hint),
                  h('textarea', { id: 'goal-weekly-' + field.key, 'aria-describedby': 'goal-weekly-' + field.key + '-help', value: weeklyDraft[field.key] || '', onChange: function(event) { updateWeeklyDraft(field.key, event.target.value); }, rows: 3, style: { width: '100%', boxSizing: 'border-box', minHeight: 80, padding: 12, borderRadius: 10, border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), background: _goaHC ? '#000000' : '#0f172a', color: _goaFg('#e2e8f0'), font: 'inherit', fontSize: 16, resize: 'vertical' } })
                );
              }),
              h('label', { htmlFor: 'goal-weekly-rating', style: { display: 'block', fontWeight: 700 } }, 'How did the week feel to you? (optional)'),
              h('select', { id: 'goal-weekly-rating', value: goalReviewRating(weeklyDraft.rating) || '', onChange: function(event) { updateWeeklyDraft('rating', event.target.value ? Number(event.target.value) : null); }, style: { width: '100%', minHeight: 44, padding: 10, borderRadius: 8, font: 'inherit', fontSize: 16, background: _goaHC ? '#000000' : '#0f172a', color: _goaFg('#e2e8f0'), border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b') } },
                h('option', { value: '' }, 'Not recorded'),
                ['Very difficult', 'Difficult', 'Mixed or in between', 'Mostly positive', 'Very positive'].map(function(label, index) { return h('option', { key: index, value: index + 1 }, (index + 1) + ' - ' + label); })
              ),
              h('p', null, 'Your rating describes your experience. There is no preferred answer, and a missing rating is not zero.'),
              h('button', { 'aria-label': 'Save weekly review', onClick: saveWeeklyCheckin, style: { width: '100%', minHeight: 44, padding: 12, borderRadius: 10, border: 'none', background: _goaHC ? '#ffff00' : '#4338ca', color: _goaHC ? '#000000' : '#ffffff', font: 'inherit', fontWeight: 700, cursor: 'pointer' } }, 'Save weekly review'),
              h('p', null, 'Saving adds a review to this activity. Use the Hub save/export controls to keep a project copy. Sharing is your choice.'),
              weeklyCheckins.length > 0 && h('details', { 'aria-label': 'Saved weekly goal reviews' },
                h('summary', { style: { minHeight: 44, cursor: 'pointer', fontWeight: 700 } }, 'Saved reviews (' + weeklyCheckins.length + ')'),
                h('p', null, goalReviewRatingText(weeklyCheckins)),
                weeklyCheckins.slice().reverse().map(function(review, index) {
                  return h('article', { key: review.id || index, 'aria-label': 'Saved goal review ' + (weeklyCheckins.length - index), style: { padding: 12, margin: '12px 0', border: '1px solid ' + (_goaHC ? '#ffff00' : '#64748b'), borderRadius: 10 } },
                    h('h4', { style: { fontSize: 16, margin: 0 } }, 'Saved ' + new Date(review.date).toLocaleString()),
                    h('p', null, review.summaryVersion === 2 ? 'Record window: ' + new Date(review.periodStart).toLocaleString() + ' – ' + new Date(review.periodEnd).toLocaleString() : 'Earlier review: its saved progress is an overall snapshot; completion dates were not tracked.'),
                    h('p', null, 'Rating: ' + (goalReviewRating(review.rating) == null ? 'Not recorded' : review.rating + ' / 5')),
                    (review.progressSummary || []).map(function(goal, i) { return h('p', { key: i }, h('strong', null, goal.text + ': '), review.summaryVersion === 2 ? goal.stepsComplete + (goal.stepsComplete === 1 ? ' step' : ' steps') + ' in the recorded window; ' + goal.totalComplete + ' of ' + goal.totalSteps + ' checked overall; ' + goal.undatedComplete + ' undated.' : (goal.progress || 0) + '% overall progress recorded at that time.'); }),
                    review.obstacles && h('p', null, h('strong', null, 'Barriers: '), review.obstacles),
                    review.support && h('p', null, h('strong', null, 'Support: '), review.support),
                    review.focus && h('p', null, h('strong', null, 'Next step or change: '), review.focus)
                  );
                })
              )
            ) : null,

            // ── PROGRESS TAB ──
            tab === 'progress' ? h('div', null,
              h('div', { style: { fontSize: 14, fontWeight: 'bold', color: _goaFg('#a5b4fc'), marginBottom: 12 } }, '\uD83D\uDCCA Your Progress'),
              // Stats grid
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 } },
                [
                  { val: goals.length, label: 'Total Goals', color: _goaFg('#6366f1'), emoji: '\uD83C\uDFAF' },
                  { val: completedGoals.length, label: 'Completed', color: _goaFg('#22c55e'), emoji: '\u2705' },
                  { val: streak, label: 'Day Streak', color: _goaFg('#f59e0b'), emoji: '\uD83D\uDD25' },
                  { val: badgeCount, label: 'Badges', color: _goaFg('#a855f7'), emoji: '\uD83C\uDFC5' }
                ].map(function(s, si) {
                  return h('div', { key: si, style: { textAlign: 'center', padding: 12, borderRadius: 10, background: s.color + '11', border: '1px solid ' + s.color + '33' } },
                    h('div', { style: { fontSize: 10, marginBottom: 4 } }, s.emoji),
                    h('div', { style: { fontSize: 22, fontWeight: 'bold', color: s.color } }, String(s.val)),
                    h('div', { style: { fontSize: 11, color: _goaFg('#94a3b8') } }, s.label)
                  );
                })
              ),
              // ── Category Visual Dashboard ──
              h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#c4b5fd'), marginBottom: 10 } }, '\uD83C\uDFC6 Category Dashboard'),
              categoryStats.map(function(cs) {
                if (cs.count === 0) return null;
                return h('div', { key: cs.id, style: { padding: 12, marginBottom: 10, borderRadius: 12, background: cs.color + '08', border: '1px solid ' + cs.color + '22' } },
                  // Category header row
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('span', { style: { fontSize: 18 } }, cs.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 'bold', color: cs.color } }, cs.label),
                      h('div', { style: { fontSize: 10, color: _goaFg('#94a3b8') } }, cs.count + ' goal' + (cs.count !== 1 ? 's' : '') + ' \u2022 ' + cs.completedCount + ' completed')
                    )
                  ),
                  // Completion rate bar
                  h('div', { style: { marginBottom: 6 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                      h('span', { style: { fontSize: 10, color: _goaFg('#94a3b8') } }, 'Completion Rate'),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: cs.completionRate >= 75 ? _goaFg('#34d399') : cs.completionRate >= 40 ? _goaFg('#fbbf24') : cs.color } }, cs.completionRate + '%')
                    ),
                    h('div', { style: { height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      h('div', { style: { width: cs.completionRate + '%', height: '100%', background: cs.completionRate >= 75 ? _goaFg('#22c55e') : cs.completionRate >= 40 ? _goaFg('#f59e0b') : cs.color, borderRadius: 4, transition: 'width 0.3s' } })
                    )
                  ),
                  // Avg step completion bar
                  h('div', { style: { marginBottom: 8 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                      h('span', { style: { fontSize: 10, color: _goaFg('#94a3b8') } }, 'Avg Step Progress'),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: cs.avgStepCompletion >= 75 ? _goaFg('#34d399') : cs.avgStepCompletion >= 40 ? _goaFg('#fbbf24') : _goaFg('#94a3b8') } }, cs.avgStepCompletion + '%')
                    ),
                    h('div', { style: { height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      h('div', { style: { width: cs.avgStepCompletion + '%', height: '100%', background: cs.avgStepCompletion >= 75 ? _goaFg('#34d399') : cs.avgStepCompletion >= 40 ? _goaFg('#fbbf24') : cs.color + '88', borderRadius: 3, transition: 'width 0.3s' } })
                    )
                  ),
                  // AI motivational tip
                  cs.tip ? h('div', { style: { padding: '8px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.10)', display: 'flex', alignItems: 'flex-start', gap: 6 } },
                    h('span', { style: { fontSize: 12 } }, '\uD83E\uDD16'),
                    h('span', { style: { fontSize: 10, color: _goaFg('#a5b4fc'), lineHeight: 1.5, fontStyle: 'italic' } }, cs.tip)
                  ) : null
                );
              }),

              // Category distribution (simple bar view)
              h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#94a3b8'), marginBottom: 8, marginTop: 16 } }, 'Goals by Category'),
              GOAL_CATEGORIES.map(function(cat) {
                var count = goals.filter(function(g) { return g.category === cat.id; }).length;
                if (count === 0) return null;
                return h('div', { key: cat.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 14, width: 24 } }, cat.emoji),
                  h('span', { style: { fontSize: 11, color: _goaFg('#94a3b8'), width: 80 } }, cat.label),
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
                    h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#c4b5fd') } }, 'Milestones Reached: ' + msCount),
                    h('div', { style: { fontSize: 10, color: _goaFg('#94a3b8') } }, 'You earned ' + (msCount * 5) + ' bonus XP from milestones!')
                  )
                );
              })(),

              // Weekly check-in summary in progress
              weeklyCheckins.length > 0 ? h('div', { style: { marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 18 } }, '\uD83D\uDCDD'),
                h('div', null,
                  h('div', { style: { fontSize: 11, fontWeight: 'bold', color: _goaFg('#a5b4fc') } }, weeklyCheckins.length + ' Weekly Check-In' + (weeklyCheckins.length !== 1 ? 's' : '') + ' Completed'),
                  (function() {
                    return h('div', { style: { fontSize: 14, color: _goaFg('#94a3b8') } }, goalReviewRatingText(weeklyCheckins));
                  })()
                )
              ) : null,

              // Goal progress list
              goals.length > 0 ? h('div', { style: { marginTop: 16 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: _goaFg('#94a3b8'), marginBottom: 8 } }, 'Individual Goal Progress'),
                goals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  var milestones = getGoalMilestones(goal);
                  return h('div', { key: goal.id, style: { padding: '8px 10px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.02)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: milestones.length > 0 ? 4 : 0 } },
                      h('span', null, cat.emoji),
                      h('span', { style: { flex: 1, fontSize: 11, color: goal.completed ? _goaFg('#6ee7b7') : _goaFg('#cbd5e1'), textDecoration: goal.completed ? 'line-through' : 'none' } }, goal.text || '(unnamed)'),
                      h('div', { style: { width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' } },
                        h('div', { style: { width: goal.progress + '%', height: '100%', background: goal.completed ? _goaFg('#22c55e') : cat.color, borderRadius: 3 } })
                      ),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: goal.completed ? _goaFg('#22c55e') : cat.color, width: 28, textAlign: 'right' } }, goal.progress + '%')
                    ),
                    milestones.length > 0 ? h('div', { style: { display: 'flex', gap: 4, paddingLeft: 28, marginTop: 2 } },
                      milestones.map(function(ms) {
                        return h('span', { key: ms.threshold, style: { fontSize: 8, padding: '1px 5px', borderRadius: 4, background: ms.isCurrent ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (ms.isCurrent ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.08)'), color: ms.isCurrent ? _goaFg('#34d399') : '#475569' } }, ms.threshold + '%' + (ms.isCurrent ? ' \u2713' : ''));
                      })
                    ) : null
                  );
                })
              ) : null
            ) : null
          ),

          // \u2500\u2500 Print my action plan (take-home artifact) \u2500\u2500
          (goals && goals.length > 0) ? h('div', { style: { padding: '10px 16px', textAlign: 'center', borderTop: '1px solid rgba(99,102,241,0.15)' } },
            h('button', {
              onClick: function() {
                if (!window.SelHub || !window.SelHub.printDoc) return;
                var sections = goals.map(function(g) {
                  var cat = (GOAL_CATEGORIES.find(function(c) { return c.id === g.category; }) || { name: '' }).name;
                  var lines = [];
                  lines.push('Goal: ' + (g.text || '(unnamed)'));
                  if (cat) lines.push('Category: ' + cat);
                  if (typeof g.progress === 'number') lines.push('Progress: ' + g.progress + '%');
                  if (g.completed) lines.push('Status: Completed');
                  if (g.smart) {
                    if (g.smart.S) lines.push('Specific: ' + g.smart.S);
                    if (g.smart.M) lines.push('Measurable: ' + g.smart.M);
                    if (g.smart.A) lines.push('Achievable: ' + g.smart.A);
                    if (g.smart.R) lines.push('Relevant: ' + g.smart.R);
                    if (g.smart.T) lines.push('Time-bound: ' + g.smart.T);
                  }
                  return { heading: g.text || '(unnamed goal)', items: lines };
                });
                window.SelHub.printDoc({
                  title: 'My Action Plan',
                  subtitle: 'Bring this to a mentor, advisor, or family member to talk through your next steps.',
                  sections: sections
                });
              },
              style: { padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)', color: _goaFg('#c7d2fe'), fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, '\ud83d\udda8 Print my action plan')
          ) : null
        );
      })();
    }
  });

  console.log('[SelHub] sel_tool_goals.js loaded \u2014 Goal Setter');
})();
