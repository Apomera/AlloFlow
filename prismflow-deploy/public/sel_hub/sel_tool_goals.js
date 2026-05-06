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
    visionAchiever: { icon: '\uD83C\uDF20', name: 'Vision Achiever', desc: 'Fill all vision board sections' },
    // v4.0 badges
    habitChampion: { icon: '\uD83E\uDD47', name: 'Habit Champion', desc: 'Complete all habits 3 days in a row' },
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
        title: 'Making Friends',
        smart: {
          S: { elementary: 'I will say hi to one new person at recess every day this week.', middle: 'I will start a conversation with someone outside my friend group twice this week.', high: 'I will initiate one meaningful conversation per week with someone I don\'t know well.' },
          M: { elementary: 'I will tell my teacher the name of each new person I talk to.', middle: 'I\'ll journal about each conversation: who, what we talked about, how it felt.', high: 'I\'ll reflect weekly on the quality and depth of new connections made.' },
          A: { elementary: 'Recess is the perfect time because everyone is playing!', middle: 'I see new people in the cafeteria and before classes start each day.', high: 'I have opportunities in classes, clubs, and community activities to meet people.' },
          R: { elementary: 'Having more friends makes school more fun!', middle: 'Expanding my social circle builds empathy and communication skills.', high: 'Networking and relationship-building are critical life and career skills.' },
          T: { elementary: 'I will do this every day for 5 school days.', middle: 'I will do this twice per week for the next 3 weeks.', high: 'I will sustain this practice weekly for the remainder of the semester.' }
        }
      },
      {
        title: 'Kindness Practice',
        smart: {
          S: { elementary: 'I will give one compliment to a classmate every single day.', middle: 'I will perform one deliberate act of kindness each day this week.', high: 'I will practice active listening in every conversation for 2 weeks.' },
          M: { elementary: 'I will draw a star on my chart for each compliment I give.', middle: 'I\'ll keep a kindness log noting what I did and how the person reacted.', high: 'I\'ll self-assess my listening quality on a 1-5 scale after each key conversation.' },
          A: { elementary: 'I see my classmates every day so I can always find someone to compliment!', middle: 'There are small opportunities every day: holding doors, sharing supplies, helping.', high: 'I interact with peers, teachers, and family daily \u2014 plenty of practice opportunities.' },
          R: { elementary: 'Being kind makes everyone feel good, including me!', middle: 'Kindness strengthens relationships and makes me someone others trust.', high: 'Empathy and active listening are foundational to emotional intelligence and leadership.' },
          T: { elementary: 'I will do this every school day for 2 weeks.', middle: 'I will complete 7 acts of kindness in the next 7 days.', high: 'I will practice for 14 consecutive days and review my journal at the end.' }
        }
      },
      {
        title: 'Conflict Resolution',
        smart: {
          S: { elementary: 'I will use "I feel" words when I\'m upset instead of yelling.', middle: 'I will resolve one disagreement this week using I-statements and calm voice.', high: 'I will practice assertive communication techniques in 3 difficult conversations this month.' },
          M: { elementary: 'I will count how many times I used my calm words on my feelings chart.', middle: 'I\'ll write down what happened, what I said, and the outcome each time.', high: 'I\'ll document each interaction: trigger, my response, the result, and what I\'d improve.' },
          A: { elementary: 'My teacher taught me "I feel ___ when ___" and I can use it!', middle: 'I\'ve learned conflict resolution strategies in advisory and can apply them.', high: 'I have knowledge of NVC (nonviolent communication) and can practice deliberately.' },
          R: { elementary: 'Using calm words helps me keep my friends and feel better.', middle: 'Handling conflict well earns respect and strengthens friendships.', high: 'Conflict resolution is essential for healthy relationships and professional success.' },
          T: { elementary: 'I will practice this every day for 1 week.', middle: 'I will resolve at least 1 conflict this way within the next 7 days.', high: 'I will complete all 3 conversations within the next 30 days.' }
        }
      }
    ],
    personal: [
      {
        title: 'Journaling Habit',
        smart: {
          S: { elementary: 'I will draw or write about my day for 5 minutes before bed.', middle: 'I will journal for 10 minutes each evening about my thoughts and feelings.', high: 'I will maintain a structured daily journal with gratitude, reflection, and intention-setting.' },
          M: { elementary: 'I will fill one page in my journal every night.', middle: 'I\'ll write at least half a page each night and track my streak.', high: 'I\'ll complete 3 sections (gratitude, reflection, tomorrow\'s intention) each evening.' },
          A: { elementary: 'I have a journal and crayons on my nightstand!', middle: 'I have a dedicated journal and 10 minutes of quiet time each evening.', high: 'I have a structured template and a consistent pre-sleep routine already established.' },
          R: { elementary: 'Writing helps me understand my feelings better!', middle: 'Journaling reduces stress and helps me process my day.', high: 'Daily reflection builds self-awareness \u2014 the foundation of emotional intelligence.' },
          T: { elementary: 'I will journal every night for 7 days.', middle: 'I will journal for 21 consecutive days to build the habit.', high: 'I will maintain this practice for 30 days, then assess and refine my template.' }
        }
      },
      {
        title: 'Mindfulness Practice',
        smart: {
          S: { elementary: 'I will take 5 deep belly breaths every morning when I wake up.', middle: 'I will practice 5 minutes of guided mindfulness each morning.', high: 'I will meditate for 10 minutes daily using a mindfulness app.' },
          M: { elementary: 'I will color a box on my chart each day I do my breaths.', middle: 'I\'ll track each session in my habit tracker and note how I feel after.', high: 'I\'ll log session length, technique used, and subjective stress level pre/post.' },
          A: { elementary: 'I can do it right when my alarm goes off!', middle: 'I have 5 minutes before breakfast and a quiet spot in my room.', high: 'I have a meditation app (Headspace/Calm) and a consistent morning routine.' },
          R: { elementary: 'Deep breathing helps me start my day feeling calm and ready!', middle: 'Mindfulness helps me focus better in class and manage stress.', high: 'Meditation has evidence-based benefits for focus, stress reduction, and emotional regulation.' },
          T: { elementary: 'I will do this every morning for 5 days.', middle: 'I will practice for 14 consecutive mornings.', high: 'I will meditate daily for 30 days, then evaluate the impact on my wellbeing.' }
        }
      },
      {
        title: 'Growth Mindset',
        smart: {
          S: { elementary: 'I will say "I can\'t do it YET" instead of "I can\'t do it."', middle: 'I will reframe 1 negative thought per day into a growth mindset statement.', high: 'I will identify and challenge one limiting belief each week through journaling.' },
          M: { elementary: 'I will put a sticker on my chart each time I use the word "yet."', middle: 'I\'ll write each reframe in my journal: original thought \u2192 growth version.', high: 'I\'ll document the belief, evidence for/against, and the reframed version weekly.' },
          A: { elementary: 'I just need to remember the magic word "yet"!', middle: 'I notice negative thoughts throughout the day and have my journal nearby.', high: 'I have a CBT-informed framework and dedicated weekly reflection time.' },
          R: { elementary: 'The word "yet" reminds me that I\'m still learning and growing!', middle: 'A growth mindset helps me see challenges as opportunities, not threats.', high: 'Cognitive reframing is a proven technique for resilience and peak performance.' },
          T: { elementary: 'I will practice this every day for 2 weeks.', middle: 'I will reframe one thought daily for 21 days.', high: 'I will complete 8 weekly belief-challenge entries over the next 2 months.' }
        }
      }
    ],
    health: [
      {
        title: 'Water Intake',
        smart: {
          S: { elementary: 'I will drink 4 glasses of water every day.', middle: 'I will drink 6 glasses (48 oz) of water daily.', high: 'I will consume at least 64 oz of water daily, spread across the day.' },
          M: { elementary: 'I will mark each glass on my water tracker chart.', middle: 'I\'ll use a marked water bottle and log intake in my tracker.', high: 'I\'ll track daily intake in my health app and review weekly averages.' },
          A: { elementary: 'I have a water bottle and my teacher lets us drink water in class!', middle: 'I have a reusable water bottle and access to water fountains all day.', high: 'I own a 32 oz bottle with time markers and can refill it twice daily.' },
          R: { elementary: 'Water helps my brain work better for learning!', middle: 'Hydration improves focus, energy, and skin health.', high: 'Proper hydration is linked to improved cognitive function and physical performance.' },
          T: { elementary: 'I will drink 4 glasses every day for 1 week.', middle: 'I will hit 48 oz daily for 14 days straight.', high: 'I will maintain 64 oz daily for 30 days and track the impact on my energy.' }
        }
      },
      {
        title: 'Exercise Routine',
        smart: {
          S: { elementary: 'I will play outside for 30 minutes every day after school.', middle: 'I will exercise for 20 minutes 4 times a week (running, biking, or sports).', high: 'I will follow a structured workout plan 4x/week alternating cardio and strength.' },
          M: { elementary: 'I will set a timer for 30 minutes and play until it goes off.', middle: 'I\'ll log each session: type, duration, and how I felt afterward.', high: 'I\'ll track sets, reps, duration, and progressive overload in a fitness journal.' },
          A: { elementary: 'I have a yard and a bike and my neighborhood is safe to play in!', middle: 'I have PE class, after-school sports, and home workout videos available.', high: 'I have gym access, a workout plan from a reliable source, and a consistent schedule.' },
          R: { elementary: 'Playing outside makes me feel happy and strong!', middle: 'Exercise improves my mood, sleep, and energy for school.', high: 'Regular exercise is the most effective natural intervention for mental and physical health.' },
          T: { elementary: 'I will play outside every day for 2 weeks.', middle: 'I will complete 4 sessions per week for the next 4 weeks.', high: 'I will follow this plan for 8 weeks, then reassess and adjust.' }
        }
      },
      {
        title: 'Sleep Hygiene',
        smart: {
          S: { elementary: 'I will be in bed with lights off by 8:30 PM on school nights.', middle: 'I will get 8+ hours of sleep on school nights by setting a 9:30 PM bedtime.', high: 'I will establish a consistent sleep schedule (10:30 PM - 6:30 AM) with a 30-min wind-down routine.' },
          M: { elementary: 'My parent will check that I\'m in bed by 8:30 and put a star on my chart.', middle: 'I\'ll track bedtime, wake time, and sleep quality (1-5) daily.', high: 'I\'ll use a sleep tracking app to monitor sleep duration, quality, and consistency.' },
          A: { elementary: 'I can start getting ready for bed at 8:00 PM.', middle: 'I can set a phone alarm at 9:00 PM to start my bedtime routine.', high: 'I can remove screens from my bedroom and use blue-light blockers after 9 PM.' },
          R: { elementary: 'Good sleep helps me pay attention and be happy at school!', middle: 'Sleep is when my brain consolidates everything I learned that day.', high: 'Sleep is the single most impactful health behavior for cognitive performance and wellbeing.' },
          T: { elementary: 'I will be in bed on time every school night for 2 weeks.', middle: 'I will follow this sleep schedule for 21 consecutive school nights.', high: 'I will maintain this schedule for 30 days and review my sleep data weekly.' }
        }
      }
    ],
    creative: [
      {
        title: 'Daily Art',
        smart: {
          S: { elementary: 'I will draw one picture every day for 2 weeks.', middle: 'I will create one piece of art (drawing, painting, digital) every day for a month.', high: 'I will complete a 30-day creative challenge in my chosen medium.' },
          M: { elementary: 'I will put each drawing in my art folder and count them.', middle: 'I\'ll photograph each piece and post it in my digital portfolio.', high: 'I\'ll document each piece with date, medium, time spent, and a brief artist\'s statement.' },
          A: { elementary: 'I have crayons, paper, and markers at home!', middle: 'I have art supplies and 20 minutes of free time each evening.', high: 'I have materials, a workspace, and daily prompts from an art challenge list.' },
          R: { elementary: 'Drawing makes me happy and helps me show my feelings!', middle: 'Consistent practice is how skills grow \u2014 I want to get better at art.', high: 'Building a creative practice develops discipline, self-expression, and original thinking.' },
          T: { elementary: 'I will draw every day for 14 days straight.', middle: 'I will create one piece daily for 30 consecutive days.', high: 'I will complete all 30 days of the challenge and curate a final portfolio.' }
        }
      },
      {
        title: 'Learn an Instrument',
        smart: {
          S: { elementary: 'I will practice my instrument for 10 minutes every day.', middle: 'I will learn 2 new songs on my instrument this month.', high: 'I will master 3 pieces of increasing difficulty and perform one publicly.' },
          M: { elementary: 'I will set a timer and practice until it beeps!', middle: 'I\'ll track practice time daily and record myself playing each song when finished.', high: 'I\'ll log daily practice (scales, technique, repertoire) and record progress weekly.' },
          A: { elementary: 'I have my instrument at home and I know how to hold it!', middle: 'I have lessons, an instrument, and tutorial videos to help me learn.', high: 'I have an instrument, a teacher/online course, and a structured practice routine.' },
          R: { elementary: 'Music makes me feel awesome and I want to play songs!', middle: 'Learning music improves focus, math skills, and self-discipline.', high: 'Musical mastery develops grit, performance skills, and creative expression.' },
          T: { elementary: 'I will practice every day for 3 weeks.', middle: 'I will learn both songs within 4 weeks.', high: 'I will complete all 3 pieces in 8 weeks, with the performance in week 9.' }
        }
      },
      {
        title: 'Writing Project',
        smart: {
          S: { elementary: 'I will write a short story with a beginning, middle, and end.', middle: 'I will write a 5-page short story and share it with my class.', high: 'I will draft, revise, and submit a 10-page creative piece to a literary magazine.' },
          M: { elementary: 'My story will be at least 1 page long with pictures.', middle: 'I\'ll write 1 page per day and track my word count.', high: 'I\'ll hit 500 words/day minimum and track progress through outline, draft, and revision stages.' },
          A: { elementary: 'I know how to write sentences and my teacher helps me with spelling.', middle: 'I have a quiet writing space and story ideas in my brainstorm list.', high: 'I have writing experience, peer reviewers available, and submission guidelines researched.' },
          R: { elementary: 'I love making up stories and I want to make a real book!', middle: 'Creative writing builds communication skills and lets me express my ideas.', high: 'Publishing builds my portfolio and develops professional communication skills.' },
          T: { elementary: 'I will finish my story in 2 weeks.', middle: 'I will complete the 5-page story in 3 weeks: outline (week 1), draft (week 2), revision (week 3).', high: 'I will complete the draft in 4 weeks, revise in week 5-6, and submit by the end of month 2.' }
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
    category: 'self-management',

    render: function(ctx) {
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

        // ── v4.0 Celebration & SMART Examples state ──
        var celebratingGoalId = d.celebratingGoalId || null;
        var showSmartExamples = d.showSmartExamples || false;
        var smartExampleCat = d.smartExampleCat || 'academic';
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

        var updateGoal = function(goalId, patch) {
          var next = goals.map(function(g) { return g.id === goalId ? Object.assign({}, g, patch) : g; });
          upd({ goals: next });
        };

        var deleteGoal = function(goalId) {
          upd({ goals: goals.filter(function(g) { return g.id !== goalId; }) });
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
          upd({ goals: goals.concat([newGoal]), editingGoal: newGoal.id });
        };

        var toggleStep = function(goalId, stepIdx) {
          sfxStep();
          var milestoneUpdates = {};
          var completedHardGoalFlag = false;
          var showCelebrationGoalId = null;
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            var steps = g.steps.map(function(s, i) { return i === stepIdx ? Object.assign({}, s, { done: !s.done }) : s; });
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
          // Check for 3-day all-habits-complete champion badge
          var champion3Day = false;
          if (habits.length > 0) {
            var last3 = weekDates.slice(-3);
            var all3Done = true;
            last3.forEach(function(wd) {
              habits.forEach(function(hab, hi) {
                if (!newLog[hi + '-' + wd]) all3Done = false;
              });
            });
            if (all3Done) champion3Day = true;
          }
          var updates = { habitLog: newLog };
          if (hasStreak7) updates.habitStreak7 = true;
          if (allHabitsComplete && habits.length > 0) updates.habitWeekComplete = true;
          if (champion3Day) updates.habitChampion3Day = true;
          upd(updates);
        };

        var addHabit = function(name, category) {
          if (!name || !name.trim() || habits.length >= 7) return;
          sfxAdd();
          var habitObj = { name: name.trim(), category: category || 'health' };
          upd({ habits: habits.concat([habitObj]) });
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

        // ── Completion Celebration helpers ──
        var getTimeToDays = function(startMs, endMs) {
          if (!startMs || !endMs) return 0;
          return Math.max(1, Math.round((endMs - startMs) / 86400000));
        };

        var getCompletedStepCount = function(goal) {
          return (goal.steps || []).filter(function(s) { return s.done; }).length;
        };

        var dismissCelebration = function() {
          upd({ celebratingGoalId: null });
        };

        var saveCompletionJournal = function(goalId, learnedText) {
          var next = goals.map(function(g) {
            if (g.id !== goalId) return g;
            return Object.assign({}, g, { completionJournal: { whatLearned: learnedText, savedAt: Date.now() } });
          });
          sfxComplete();
          if (awardXP) awardXP(10);
          if (addToast) addToast('\uD83D\uDCDD Completion journal saved! +10 XP', 'success');
          upd({ goals: next, celebratingGoalId: null, hasGoalReflection: true });
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
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
              if (addToast) addToast('\uD83D\uDCCB Achievement copied to clipboard!', 'success');
            }).catch(function() {
              if (addToast) addToast('Could not copy \u2014 try selecting the text manually.', 'warning');
            });
          }
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
          addGoal(ex.title, catId, 1, smartData);
          upd({ usedSmartExample: true, showSmartExamples: false, tab: 'smart' });
          if (addToast) addToast('\uD83D\uDCD6 SMART template loaded! Customize it to fit you.', 'info');
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

        // ── Habit of the Week helper ──
        var getHabitOfTheWeek = function() {
          if (habits.length === 0) return null;
          var bestIdx = 0;
          var bestPct = 0;
          habits.forEach(function(hab, hi) {
            var pct = getHabitCompletion(hi);
            if (pct > bestPct) { bestPct = pct; bestIdx = hi; }
          });
          if (bestPct === 0) return null;
          return { name: getHabitName(habits[bestIdx]), category: getHabitCategory(habits[bestIdx]), pct: bestPct, idx: bestIdx };
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
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(135deg, #312e81, #4338ca)', borderBottom: '1px solid rgba(99,102,241,0.3)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', { 'aria-label': 'Back', onClick: function() { ctx.setSelHubTool && ctx.setSelHubTool(null); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' } }, '\u2190 Back'),
              h('div', { style: { fontWeight: 'bold', fontSize: 16, color: '#c7d2fe' } }, '\uD83D\uDCCB Goal Setter'),
              streak > 0 ? h('span', { style: { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.3)' } }, '\uD83D\uDD25 ' + streak + '-day streak') : null
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 'bold' } }, '\uD83C\uDFAF ' + activeGoals.length + ' active'),
              h('button', { 'aria-label': 'Toggle badges', onClick: function() { upd({ showBadges: !showBadges }); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '3px 8px', color: '#c4b5fd', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFC5 ' + badgeCount)
            )
          ),

          // Tabs
          h('div', { role: 'tablist', style: { display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.8)', overflowX: 'auto' } },
            [{ id: 'goals', label: '\uD83C\uDFAF Goals' }, { id: 'habits', label: '\uD83D\uDD01 Habits' }, { id: 'vision', label: '\uD83C\uDF1F Vision' }, { id: 'smart', label: '\uD83E\uDDE0 SMART' }, { id: 'coach', label: '\uD83E\uDD16 Coach' }, { id: 'checkin', label: '\uD83D\uDCDD Check-In' }, { id: 'progress', label: '\uD83D\uDCCA Progress' }].map(function(tb) {
              var active = tab === tb.id;
              return h('button', { 'aria-label': 'nowrap', key: tb.id, role: 'tab', 'aria-selected': active, onClick: function() { sfxClick(); upd({ tab: tb.id }); }, style: { flex: 1, padding: '10px 4px', fontSize: 10, fontWeight: 'bold', color: active ? '#a5b4fc' : '#94a3b8', background: active ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 0 } }, tb.label);
            })
          ),

          // Badge panel
          showBadges ? h('div', { style: { padding: 12, background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.15)' } },
            h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 8 } }, '\uD83C\uDFC5 Badges \u2014 ' + badgeCount + '/' + Object.keys(BADGES).length),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(BADGES).map(function(id) {
                var b = BADGES[id]; var e = !!badges[id];
                return h('div', { key: id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: e ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', border: e ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(99,102,241,0.1)', opacity: e ? 1 : 0.5, fontSize: 10 } },
                  h('span', null, e ? b.icon : '\uD83D\uDD12'), h('span', { style: { fontWeight: 'bold', color: e ? '#c4b5fd' : '#94a3b8' } }, b.name)
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
                  h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#34d399', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, '\u2B50 Goal of the Week'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 'bold' } }, goalOfTheWeek.text || '(unnamed)'),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } },
                    h('div', { style: { flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', maxWidth: 120 } },
                      h('div', { style: { width: (goalOfTheWeek.progress || 0) + '%', height: '100%', background: '#22c55e', borderRadius: 3 } })
                    ),
                    h('span', { style: { fontSize: 10, color: '#34d399', fontWeight: 'bold' } }, (goalOfTheWeek.progress || 0) + '%')
                  )
                ),
                h('button', { 'aria-label': 'Focus', onClick: function() { upd({ editingGoal: goalOfTheWeek.id, tab: 'goals' }); }, style: { padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#34d399', fontSize: 10, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' } }, '\uD83C\uDFAF Focus')
              ) : null,
              // Accountability check
              (function() {
                var today = new Date().toISOString().slice(0, 10);
                if (accountabilityLog[today] !== undefined) return null;
                if (goals.length === 0) return null;
                return h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', { style: { fontSize: 12, color: '#a5b4fc', flex: 1 } }, band === 'elementary' ? 'Did you work on your goal today?' : 'Accountability check: did you work toward a goal today?'),
                  h('button', { onClick: function() { logAccountability(true); }, style: { padding: '5px 14px', borderRadius: 8, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u2705 Yes'),
                  h('button', { 'aria-label': 'Not yet', onClick: function() { logAccountability(false); }, style: { padding: '5px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u274C Not yet')
                );
              })(),
              accountabilityStreak > 0 ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 8, textAlign: 'center' } }, '\uD83D\uDCAA Accountability streak: ' + accountabilityStreak + ' day' + (accountabilityStreak !== 1 ? 's' : '')) : null,
              // Add goal button + templates toggle
              h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
                h('button', { 'aria-label': '+ New Goal', onClick: function() { addGoal('', 'personal'); }, style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' } }, '+ New Goal'),
                h('button', { 'aria-label': 'Templates', onClick: function() { upd({ showTemplates: !showTemplates }); }, style: { padding: '10px 16px', borderRadius: 10, background: showTemplates ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: showTemplates ? '#a5b4fc' : '#94a3b8', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDCA1 Templates')
              ),
              // Templates
              showTemplates ? h('div', { style: { marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' } },
                h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#818cf8', marginBottom: 8 } }, 'Goal Templates \u2014 tap to add'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  templates.map(function(tmpl, ti) {
                    var cat = GOAL_CATEGORIES.find(function(c) { return c.id === tmpl.cat; }) || GOAL_CATEGORIES[0];
                    return h('button', { 'aria-label': 'left', key: ti, onClick: function() { addGoal(tmpl.text, tmpl.cat); upd({ showTemplates: false }); }, title: tmpl.hint, style: { padding: '6px 12px', borderRadius: 8, background: cat.color + '15', border: '1px solid ' + cat.color + '33', color: cat.color, fontSize: 11, cursor: 'pointer', textAlign: 'left' } },
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
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, 'Goals with steps are easier to achieve!')
                ) : null,
              activeGoals.map(function(goal) {
                var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                var isEditing = editingGoal === goal.id;
                var goalDiff = goal.difficulty || 1;
                return h('div', { key: goal.id, style: { padding: 14, marginBottom: 10, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid ' + cat.color + '33', transition: 'all 0.15s' } },
                  // Goal header
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('span', { style: { fontSize: 18 } }, cat.emoji),
                    isEditing ?
                      h('input', { type: 'text', 'aria-label': 'Goal name', value: goal.text, onChange: function(e) { updateGoal(goal.id, { text: e.target.value }); }, autoFocus: true, style: { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid ' + cat.color + '44', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13 } }) :
                      h('span', { style: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#e2e8f0', cursor: 'pointer' }, onClick: function() { upd({ editingGoal: goal.id }); } }, goal.text || 'Tap to name your goal...'),
                    // Difficulty indicator (flames)
                    h('span', { title: 'Difficulty: ' + (DIFFICULTY_LABELS[goalDiff - 1] || DIFFICULTY_LABELS[0]).label, style: { fontSize: 10, letterSpacing: -2, cursor: 'default' } }, getDifficultyFlames(goalDiff)),
                    h('select', { value: goal.category, 'aria-label': 'Goal category', onChange: function(e) { updateGoal(goal.id, { category: e.target.value }); }, style: { padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#94a3b8', fontSize: 10, cursor: 'pointer' } },
                      GOAL_CATEGORIES.map(function(c) { return h('option', { key: c.id, value: c.id }, c.emoji + ' ' + c.label); })
                    ),
                    h('button', { onClick: function() { shareGoalToClipboard(goal); }, title: 'Share goal with buddy', style: { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 12, padding: 4 } }, '\uD83D\uDCE4'),
                    h('button', { 'aria-label': 'Difficulty:', onClick: function() { deleteGoal(goal.id); }, style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 4 } }, '\u2715')
                  ),
                  // Difficulty selector (shown when editing)
                  isEditing ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 26 } },
                    h('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' } }, 'Difficulty:'),
                    [1, 2, 3, 4, 5].map(function(lvl) {
                      var info = DIFFICULTY_LABELS[lvl - 1];
                      var active = goalDiff === lvl;
                      return h('button', { 'aria-label': 'x XP)', key: lvl, onClick: function() { updateGoal(goal.id, { difficulty: lvl }); sfxClick(); }, title: info.label + ' (' + info.xpMult + 'x XP)', style: { padding: '2px 8px', borderRadius: 12, background: active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)', border: active ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(99,102,241,0.1)', color: active ? '#fbbf24' : '#94a3b8', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, getDifficultyFlames(lvl) + ' ' + info.label);
                    })
                  ) : null,
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
                    return h('div', Object.assign({
                      key: si,
                      'aria-label': (step.done ? 'Mark incomplete: ' : 'Mark complete: ') + step.text,
                      'aria-pressed': step.done ? 'true' : 'false',
                      style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 4, borderRadius: 6, background: step.done ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }
                    }, a11yClick(function() { toggleStep(goal.id, si); })),
                      h('span', { style: { fontSize: 14 }, 'aria-hidden': 'true' }, step.done ? '\u2705' : '\u2B1C'),
                      h('span', { style: { fontSize: 12, color: step.done ? '#6ee7b7' : '#cbd5e1', textDecoration: step.done ? 'line-through' : 'none' } }, step.text)
                    );
                  }),
                  // Add step input
                  h('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
                    h('input', { type: 'text', 'aria-label': 'Add a goal step', placeholder: band === 'elementary' ? 'Add a step...' : 'Add a step toward this goal...', onKeyDown: function(e) { if (e.key === 'Enter' && e.target.value.trim()) { addStep(goal.id, e.target.value); e.target.value = ''; } }, style: { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 11 } }),
                    h('button', { 'aria-label': 'Add step', onClick: function() { var inp = document.querySelector('[placeholder*="step"]'); if (inp && inp.value.trim()) { addStep(goal.id, inp.value); inp.value = ''; } }, style: { padding: '6px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: 'none', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '+')
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
                return h('div', { style: { padding: 20, marginBottom: 16, borderRadius: 16, background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(34,197,94,0.08))', border: '2px solid rgba(52,211,153,0.4)', textAlign: 'center', position: 'relative' } },
                  // Confetti burst at top
                  h('div', { style: { fontSize: 28, marginBottom: 8, letterSpacing: 4 } }, '\uD83C\uDF89\uD83C\uDF8A\u2728\uD83C\uDF86\uD83C\uDF89\uD83C\uDF8A\u2728\uD83C\uDF86'),
                  h('div', { style: { fontSize: 18, fontWeight: 'bold', color: '#34d399', marginBottom: 4 } }, '\uD83C\uDFC6 Goal Completed!'),
                  h('div', { style: { fontSize: 14, color: '#e2e8f0', fontWeight: 'bold', marginBottom: 12 } }, celebCat.emoji + ' ' + (celebGoal.text || 'Your Goal')),
                  // Stats row
                  h('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14 } },
                    h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 20, fontWeight: 'bold', color: '#6366f1' } }, String(daysTaken)),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Day' + (daysTaken !== 1 ? 's' : ''))
                    ),
                    h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 20, fontWeight: 'bold', color: '#a855f7' } }, String(stepsCount)),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Steps Done')
                    ),
                    h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24' } }, getDifficultyFlames(celebGoal.difficulty || 1)),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, diffInfo.label)
                    )
                  ),
                  // "What I Learned" textarea
                  h('div', { style: { textAlign: 'left', marginBottom: 12 } },
                    h('label', { style: { display: 'block', fontSize: 11, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 4 } }, '\uD83D\uDCA1 What I Learned'),
                    h('textarea', { id: 'celebration-journal', 'aria-label': 'Celebration journal', placeholder: band === 'elementary' ? 'What did you learn from reaching this goal?' : 'Reflect on what you learned during this journey...', style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 } })
                  ),
                  // Action buttons
                  h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                    h('button', { 'aria-label': 'Save Journal', onClick: function() {
                      var ta = document.getElementById('celebration-journal');
                      var text = ta ? ta.value : '';
                      saveCompletionJournal(celebGoal.id, text);
                    }, style: { padding: '8px 16px', borderRadius: 8, background: '#22c55e', color: '#fff', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\u2705 Save Journal'),
                    h('button', { onClick: function() { shareAchievement(celebGoal); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCE4 Share Achievement'),
                    h('button', { onClick: function() { dismissCelebration(); addGoal('', 'personal'); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c4b5fd', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFAF Set Next Goal'),
                    h('button', { 'aria-label': 'Dismiss', onClick: function() { dismissCelebration(); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.1)', color: '#94a3b8', fontSize: 11, cursor: 'pointer' } }, 'Dismiss')
                  )
                );
              })() : null,
              // Completed goals with reflection journal
              completedGoals.length > 0 ? h('div', { style: { marginTop: 20 } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#34d399', marginBottom: 8 } }, '\u2705 Completed (' + completedGoals.length + ')'),
                completedGoals.map(function(goal) {
                  var cat = GOAL_CATEGORIES.find(function(c) { return c.id === goal.category; }) || GOAL_CATEGORIES[2];
                  var isReflecting = reflectingGoalId === goal.id;
                  var hasReflections = goal.reflections && goal.reflections.length > 0;
                  var goalDiffLvl = goal.difficulty || 1;
                  return h('div', { key: goal.id, style: { padding: 10, marginBottom: 8, borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', null, cat.emoji),
                      h('span', { style: { flex: 1, fontSize: 12, color: '#6ee7b7', textDecoration: 'line-through' } }, goal.text),
                      h('span', { style: { fontSize: 10, letterSpacing: -2 } }, getDifficultyFlames(goalDiffLvl)),
                      h('span', { style: { fontSize: 10, color: '#34d399' } }, '\uD83C\uDF89 Done!'),
                      // Show celebration button if no journal yet
                      !goal.completionJournal ? h('button', { 'aria-label': 'Celebrate', onClick: function() { upd({ celebratingGoalId: goal.id }); }, style: { background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 6, padding: '3px 8px', color: '#34d399', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginLeft: 2 } }, '\uD83C\uDF89 Celebrate') : null,
                      !hasReflections ? h('button', { 'aria-label': 'Reflect', onClick: function() { upd({ reflectingGoalId: isReflecting ? null : goal.id }); }, style: { background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6, padding: '3px 8px', color: '#c4b5fd', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginLeft: 4 } }, '\uD83D\uDCDD Reflect') : null,
                      h('button', { 'aria-label': 'Share goal', onClick: function() { shareGoalToClipboard(goal); }, style: { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 11, padding: 2 } }, '\uD83D\uDCE4')
                    ),
                    // Completion stats line
                    (goal.completedAt || goal.completionJournal) ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, paddingLeft: 22, fontSize: 10, color: '#94a3b8' } },
                      goal.completedAt ? h('span', null, '\u23F1\uFE0F ' + getTimeToDays(goal.createdAt, goal.completedAt) + ' days') : null,
                      h('span', null, '\uD83D\uDC63 ' + getCompletedStepCount(goal) + ' steps'),
                      goal.completionJournal ? h('span', { style: { color: '#a5b4fc' } }, '\uD83D\uDCA1 Journal saved') : null
                    ) : null,
                    // Show completion journal if saved
                    goal.completionJournal && goal.completionJournal.whatLearned ? h('div', { style: { marginTop: 6, padding: 8, borderRadius: 6, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
                      h('div', { style: { fontSize: 10, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 3 } }, '\uD83D\uDCA1 What I Learned'),
                      h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, goal.completionJournal.whatLearned)
                    ) : null,
                    // Reflection form
                    isReflecting ? h('div', { style: { marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' } },
                      h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 8 } }, '\uD83D\uDCDD Goal Reflection Journal'),
                      h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } }, band === 'elementary' ? 'Think about how you reached your goal!' : 'Reflect on your journey to completing this goal.'),
                      ['What worked well?', 'What was the hardest part?', 'What would I do differently?', 'What\'s my next goal?'].map(function(prompt, pi) {
                        return h('div', { key: pi, style: { marginBottom: 8 } },
                          h('label', { style: { display: 'block', fontSize: 11, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 3 } }, prompt),
                          h('textarea', { id: 'reflect-' + pi, placeholder: band === 'elementary' ? 'Write your thoughts...' : 'Share your reflection...', style: { width: '100%', minHeight: 40, padding: 6, borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } })
                        );
                      }),
                      h('button', { 'aria-label': 'Save reflection', onClick: function() {
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
                band === 'middle' ? 'Build consistency by tracking up to 7 daily habits over the week.' :
                'Atomic habits: track small daily actions that compound over time. Up to 7 habits.'
              ),
              // Habit of the Week spotlight
              (function() {
                var hotw = getHabitOfTheWeek();
                if (!hotw) return null;
                var hCat = HABIT_CATEGORIES.find(function(c) { return c.id === hotw.category; }) || HABIT_CATEGORIES[0];
                return h('div', { style: { padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(234,179,8,0.06))', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', { style: { fontSize: 18 } }, '\u2B50'),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, 'Habit of the Week'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 'bold' } }, hotw.name),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 } },
                      h('span', { style: { fontSize: 10 } }, hCat.emoji),
                      h('span', { style: { fontSize: 10, color: '#94a3b8' } }, hCat.label),
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: hotw.pct >= 80 ? '#34d399' : '#fbbf24' } }, hotw.pct + '% this week')
                    )
                  )
                );
              })(),
              // Add habit input with category selector
              habits.length < 7 ? h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
                h('input', { type: 'text', id: 'habit-input', 'aria-label': 'Add a daily habit', placeholder: band === 'elementary' ? 'Add a habit (e.g., Drink water)...' : 'Add a daily habit...', onKeyDown: function(e) {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    var catSel = document.getElementById('habit-cat-select');
                    var cat = catSel ? catSel.value : 'health';
                    addHabit(e.target.value, cat); e.target.value = '';
                  }
                }, style: { flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12 } }),
                h('select', { id: 'habit-cat-select', style: { padding: '8px 6px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#94a3b8', fontSize: 11, cursor: 'pointer' } },
                  HABIT_CATEGORIES.map(function(hc) { return h('option', { key: hc.id, value: hc.id }, hc.emoji + ' ' + hc.label); })
                ),
                h('button', { 'aria-label': '+ Add', onClick: function() {
                  var inp = document.getElementById('habit-input');
                  var catSel = document.getElementById('habit-cat-select');
                  if (inp && inp.value.trim()) { addHabit(inp.value, catSel ? catSel.value : 'health'); inp.value = ''; }
                }, style: { padding: '8px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '+ Add')
              ) : h('p', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 10 } }, 'Maximum 7 habits reached. Remove one to add a new one.'),
              // Habit category filter
              habits.length > 0 ? h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() { upd({ habitCategoryFilter: 'all' }); }, style: { padding: '3px 10px', borderRadius: 12, background: habitCategoryFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (habitCategoryFilter === 'all' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.08)'), color: habitCategoryFilter === 'all' ? '#a5b4fc' : '#94a3b8', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, 'All'),
                HABIT_CATEGORIES.map(function(hc) {
                  var isActive = habitCategoryFilter === hc.id;
                  return h('button', { 'aria-label': 'Suggested habits  tap to add:', key: hc.id, onClick: function() { upd({ habitCategoryFilter: hc.id }); }, style: { padding: '3px 10px', borderRadius: 12, background: isActive ? hc.color + '22' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (isActive ? hc.color + '44' : 'rgba(99,102,241,0.08)'), color: isActive ? hc.color : '#94a3b8', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, hc.emoji + ' ' + hc.label);
                })
              ) : null,
              // Habit suggestion chips (with categories)
              habits.length === 0 ? h('div', { style: { marginBottom: 14 } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 6 } }, 'Suggested habits \u2014 tap to add:'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  (band === 'elementary' ?
                    [{ n: 'Drink water \uD83D\uDCA7', c: 'health' }, { n: 'Read 15 min \uD83D\uDCDA', c: 'academic' }, { n: 'Exercise \uD83C\uDFC3', c: 'health' }, { n: 'Be kind \uD83D\uDC9B', c: 'social' }, { n: 'Draw or color \uD83C\uDFA8', c: 'creative' }] :
                    band === 'middle' ?
                    [{ n: 'Read 15 min \uD83D\uDCDA', c: 'academic' }, { n: 'Exercise 20 min \uD83C\uDFC3', c: 'health' }, { n: 'Journal \uD83D\uDCDD', c: 'creative' }, { n: 'No phone at dinner \uD83D\uDCF1', c: 'social' }, { n: 'Practice instrument \uD83C\uDFB5', c: 'creative' }] :
                    [{ n: 'Read 30 min \uD83D\uDCDA', c: 'academic' }, { n: 'Exercise \uD83D\uDCAA', c: 'health' }, { n: 'Meditate \uD83E\uDDD8', c: 'health' }, { n: 'Journal \uD83D\uDCDD', c: 'creative' }, { n: 'Connect with a friend \uD83E\uDD1D', c: 'social' }]
                  ).map(function(sug) {
                    return h('button', { 'aria-label': '4px 10px', key: sug.n, onClick: function() { addHabit(sug.n, sug.c); }, style: { padding: '4px 10px', borderRadius: 16, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, sug.n);
                  })
                )
              ) : null,
              // 7-day grid
              habits.length > 0 ? h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                  h('caption', { className: 'sr-only' }, 'Read 30 min \uD83D\uDCDA'), h('thead', null,
                    h('tr', null,
                      h('th', { scope: 'col', style: { textAlign: 'left', padding: '6px 8px', color: '#94a3b8', fontWeight: 'bold', fontSize: 10, borderBottom: '1px solid rgba(99,102,241,0.1)' } }, 'Habit'),
                      weekDates.map(function(wd, wi) {
                        var dt = new Date(wd + 'T12:00:00');
                        var dayName = dayLabels[dt.getDay()];
                        var isToday = wd === new Date().toISOString().slice(0, 10);
                        return h('th', { scope: 'col', key: wd, style: { padding: '6px 4px', color: isToday ? '#a5b4fc' : '#94a3b8', fontWeight: isToday ? 'bold' : 'normal', fontSize: 11, textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.1)', minWidth: 32 } },
                          h('div', null, dayName),
                          h('div', { style: { fontSize: 8 } }, wd.slice(5))
                        );
                      }),
                      h('th', { scope: 'col', style: { padding: '6px 4px', color: '#94a3b8', fontSize: 11, textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.1)' } }, '%')
                    )
                  ),
                  h('tbody', null,
                    habits.map(function(hab, hi) {
                      var habCat = getHabitCategory(hab);
                      // Filter by category
                      if (habitCategoryFilter !== 'all' && habCat !== habitCategoryFilter) return null;
                      var pct = getHabitCompletion(hi);
                      var habCatObj = HABIT_CATEGORIES.find(function(c) { return c.id === habCat; }) || HABIT_CATEGORIES[0];
                      return h('tr', { key: hi },
                        h('td', { style: { padding: '8px', color: '#e2e8f0', fontSize: 11, borderBottom: '1px solid rgba(99,102,241,0.05)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                          h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                            h('span', { title: habCatObj.label, style: { fontSize: 10 } }, habCatObj.emoji),
                            h('span', null, getHabitName(hab)),
                            habitEditMode ? h('button', { 'aria-label': 'Remove habit', onClick: function() { removeHabit(hi); }, style: { background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer', padding: 0, marginLeft: 4 } }, '\u2715') : null
                          )
                        ),
                        weekDates.map(function(wd) {
                          var checked = !!habitLog[hi + '-' + wd];
                          return h('td', { key: wd, style: { textAlign: 'center', padding: '4px', borderBottom: '1px solid rgba(99,102,241,0.05)' } },
                            h('button', { 'aria-label': 'Toggle habit completion', onClick: function() { toggleHabit(hi, wd); }, style: { width: 26, height: 26, borderRadius: 6, border: 'none', background: checked ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)', color: checked ? '#34d399' : '#475569', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 } }, checked ? '\u2705' : '\u2B1C')
                          );
                        }),
                        h('td', { style: { textAlign: 'center', padding: '4px 6px', borderBottom: '1px solid rgba(99,102,241,0.05)' } },
                          h('span', { style: { fontSize: 11, fontWeight: 'bold', color: pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#94a3b8', padding: '2px 6px', borderRadius: 4, background: pct >= 80 ? 'rgba(52,211,153,0.1)' : pct >= 50 ? 'rgba(245,158,11,0.1)' : 'transparent' } }, pct + '%')
                        )
                      );
                    })
                  )
                ),
                // Edit/manage habits button
                h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 } },
                  h('button', { 'aria-label': 'Edit habits', onClick: function() { upd({ habitEditMode: !habitEditMode }); }, style: { padding: '4px 10px', borderRadius: 6, background: habitEditMode ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (habitEditMode ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.1)'), color: habitEditMode ? '#f87171' : '#94a3b8', fontSize: 10, cursor: 'pointer' } }, habitEditMode ? 'Done editing' : '\u270F\uFE0F Edit habits')
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
                })(),
                // ── Weekly Habit Completion Chart (7 bars) ──
                (function() {
                  var chartData = getWeeklyHabitChartData();
                  if (chartData.length === 0) return null;
                  var maxBarH = 80;
                  return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' } },
                    h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 10, textAlign: 'center' } }, '\uD83D\uDCCA Weekly Habit Completion'),
                    h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: maxBarH + 30 } },
                      chartData.map(function(cd, ci) {
                        var dt = new Date(cd.date + 'T12:00:00');
                        var dayName = dayLabels[dt.getDay()];
                        var isToday = cd.date === new Date().toISOString().slice(0, 10);
                        var barH = Math.max(4, Math.round((cd.pct / 100) * maxBarH));
                        var barColor = cd.pct >= 80 ? '#22c55e' : cd.pct >= 50 ? '#f59e0b' : cd.pct > 0 ? '#6366f1' : 'rgba(255,255,255,0.06)';
                        return h('div', { key: ci, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 } },
                          h('span', { style: { fontSize: 11, fontWeight: 'bold', color: cd.pct >= 80 ? '#34d399' : '#94a3b8' } }, cd.pct + '%'),
                          h('div', { style: { width: '100%', maxWidth: 28, height: barH, borderRadius: 4, background: barColor, transition: 'height 0.3s', border: isToday ? '2px solid #a5b4fc' : 'none' } }),
                          h('span', { style: { fontSize: 8, color: isToday ? '#a5b4fc' : '#94a3b8', fontWeight: isToday ? 'bold' : 'normal' } }, dayName)
                        );
                      })
                    ),
                    // Weekly average
                    (function() {
                      var totalPct = 0;
                      chartData.forEach(function(cd) { totalPct += cd.pct; });
                      var avgPct = Math.round(totalPct / chartData.length);
                      return h('div', { style: { textAlign: 'center', marginTop: 8, fontSize: 10, color: '#94a3b8' } },
                        'Weekly average: ',
                        h('span', { style: { fontWeight: 'bold', color: avgPct >= 80 ? '#34d399' : avgPct >= 50 ? '#fbbf24' : '#a5b4fc' } }, avgPct + '%')
                      );
                    })()
                  );
                })()
              ) : h('div', { style: { textAlign: 'center', padding: 30 } },
                h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83D\uDD01'),
                h('p', { style: { fontSize: 13, color: '#94a3b8' } }, band === 'elementary' ? 'Add a habit above to start tracking!' : 'Define your daily habits above to begin tracking consistency.'),
                h('p', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, 'Tip: Start with just 1-2 habits and build up over time.')
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
                h('button', { 'aria-label': 'New quote', onClick: function() { upd({ currentQuote: getRandomQuote() }); }, style: { marginTop: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '3px 12px', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD04 New quote')
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
                  h('textarea', { value: visionBoard[section.key] || '', 'aria-label': section.label + ' vision', onChange: function(e) { updateVision(section.key, e.target.value); }, placeholder: section.hint, style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid ' + section.color + '22', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 } })
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
              // ── SMART Examples Library ──
              h('div', { style: { marginBottom: 16 } },
                h('button', { 'aria-label': 'SMART Goal Examples Library', onClick: function() { upd({ showSmartExamples: !showSmartExamples }); sfxClick(); }, style: { width: '100%', padding: '10px 16px', borderRadius: 10, background: showSmartExamples ? 'rgba(168,85,247,0.15)' : 'rgba(99,102,241,0.08)', border: '1px solid ' + (showSmartExamples ? 'rgba(168,85,247,0.3)' : 'rgba(99,102,241,0.15)'), color: showSmartExamples ? '#c4b5fd' : '#a5b4fc', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', null, '\uD83D\uDCD6'),
                  h('span', { style: { flex: 1 } }, 'SMART Goal Examples Library'),
                  h('span', { style: { fontSize: 10, opacity: 0.7 } }, showSmartExamples ? '\u25B2' : '\u25BC')
                ),
                showSmartExamples ? h('div', { style: { marginTop: 10, padding: 14, borderRadius: 12, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' } },
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 } },
                    band === 'elementary' ? 'Pick an example to start with! You can change the words later.' :
                    'Browse fully-filled SMART examples by category. Tap "Use as Template" to pre-fill and customize.'
                  ),
                  // Category selector
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                    GOAL_CATEGORIES.map(function(cat) {
                      var isActive = smartExampleCat === cat.id;
                      var hasExamples = !!SMART_EXAMPLES[cat.id];
                      if (!hasExamples) return null;
                      return h('button', { 'aria-label': '44', key: cat.id, onClick: function() { upd({ smartExampleCat: cat.id }); sfxClick(); }, style: { padding: '5px 12px', borderRadius: 16, background: isActive ? cat.color + '22' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (isActive ? cat.color + '44' : 'rgba(99,102,241,0.1)'), color: isActive ? cat.color : '#94a3b8', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, cat.emoji + ' ' + cat.label);
                    })
                  ),
                  // Examples for selected category
                  (SMART_EXAMPLES[smartExampleCat] || []).map(function(ex, ei) {
                    return h('div', { key: ei, style: { padding: 12, marginBottom: 10, borderRadius: 10, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.10)' } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                        h('span', { style: { fontSize: 14, fontWeight: 'bold', color: '#a5b4fc' } }, ex.title),
                        h('button', { 'aria-label': 'Use as Template', onClick: function() { loadSmartExample(smartExampleCat, ei); }, style: { marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, background: '#6366f1', color: '#fff', border: 'none', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\u2192 Use as Template')
                      ),
                      // Preview SMART fields
                      ['S', 'M', 'A', 'R', 'T'].map(function(key) {
                        var info = SMART_LABELS[key];
                        var val = ex.smart[key][band] || ex.smart[key].elementary;
                        return h('div', { key: key, style: { display: 'flex', gap: 6, marginBottom: 3, fontSize: 10, lineHeight: 1.5 } },
                          h('span', { style: { fontWeight: 'bold', color: '#818cf8', minWidth: 14 } }, key + ':'),
                          h('span', { style: { color: '#94a3b8' } }, val)
                        );
                      })
                    );
                  })
                ) : null
              ),
              goals.length === 0 && !showSmartExamples ?
                h('div', { style: { textAlign: 'center', padding: 30 } },
                  h('p', { style: { color: '#94a3b8' } }, 'Create a goal first, then come here to make it SMART!'),
                  h('button', { 'aria-label': '+ Create Goal', onClick: function() { upd({ tab: 'goals' }); addGoal('', 'personal'); }, style: { marginTop: 8, padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '+ Create Goal')
                ) :
                h('div', null,
                  // Goal selector
                  h('select', { value: editingGoal || '', 'aria-label': 'Select a goal for SMART planning', onChange: function(e) { upd({ editingGoal: e.target.value }); }, style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, marginBottom: 12 } },
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
                        h('textarea', { value: val, 'aria-label': key + ' SMART goal field', onChange: function(e) {
                          var newSmart = Object.assign({}, editGoal.smart || {});
                          newSmart[key] = e.target.value;
                          updateGoal(editGoal.id, { smart: newSmart });
                        }, placeholder: info.placeholder[band] || info.placeholder.elementary, style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } })
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
                            return h('div', { key: k, style: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#22c55e22' : 'rgba(255,255,255,0.04)', border: done ? '2px solid #22c55e' : '1px solid rgba(99,102,241,0.15)', color: done ? '#22c55e' : '#94a3b8', fontSize: 11, fontWeight: 'bold' } }, k);
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
              h('div', { role: 'region', 'aria-label': 'Goal coach response', 'aria-live': 'polite', 'aria-busy': aiLoading ? 'true' : 'false' },
                aiResponse ? h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: '#c7d2fe' } },
                  h('div', { style: { fontSize: 10, color: '#818cf8', fontWeight: 'bold', marginBottom: 4 } }, '\uD83E\uDD16 Goal Coach'),
                  aiResponse,
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: '#818cf8', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
                ) : null
              ),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', { type: 'text', value: aiInput, 'aria-label': 'Ask the goal coach', onChange: function(e) { upd({ aiInput: e.target.value }); }, onKeyDown: function(e) { if (e.key === 'Enter') askAI(); }, placeholder: 'Ask about your goals...', style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12 } }),
                h('button', { onClick: askAI, disabled: aiLoading, style: { padding: '10px 16px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3' : '\u2191')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 } },
                (band === 'elementary' ? ['How do I start?', 'I\'m stuck on my goal', 'Make my goal easier', 'Give me a fun challenge'] :
                 ['Break my goal into smaller steps', 'I keep procrastinating', 'Is my goal realistic?', 'How do I stay motivated?', 'Help me reframe my goal as SMART']).map(function(q) {
                  return h('button', { 'aria-label': q, key: q, onClick: function() { upd({ aiInput: q }); }, style: { padding: '5px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, q);
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
                    return h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'No goal progress recorded this week yet. Keep going!');
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
                h('textarea', { value: weeklyDraft.obstacles || '', 'aria-label': 'Weekly obstacles', onChange: function(e) { updateWeeklyDraft('obstacles', e.target.value); }, placeholder: band === 'elementary' ? 'What was hard this week? What got in the way?' : 'Describe any challenges, distractions, or setbacks you faced this week...', style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 } })
              ),

              // Section 3: Next week focus
              h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#818cf8', marginBottom: 8 } }, '\uD83C\uDFAF What Will I Focus On Next Week?'),
                h('textarea', { value: weeklyDraft.focus || '', 'aria-label': 'Next week focus', onChange: function(e) { updateWeeklyDraft('focus', e.target.value); }, placeholder: band === 'elementary' ? 'What do you want to work on next week?' : 'Set your intention: what specific goal or step will you prioritize?', style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.4)', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 } })
              ),

              // Section 4: Star rating
              h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', textAlign: 'center' } },
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#fbbf24', marginBottom: 10 } }, '\u2B50 Rate Your Week'),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6 } },
                  [1, 2, 3, 4, 5].map(function(star) {
                    var filled = (weeklyDraft.rating || 0) >= star;
                    return h('button', { 'aria-label': 'Rate this week', key: star, onClick: function() { updateWeeklyDraft('rating', star); sfxClick(); }, style: { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: filled ? '#fbbf24' : '#334155', transition: 'transform 0.15s', padding: 2 } }, filled ? '\u2B50' : '\u2606');
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
              h('button', { 'aria-label': 'Save weekly check-in', onClick: function() {
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
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: '#818cf8' } }, 'Next  '),
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
                    h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.label)
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
                      h('span', { style: { fontSize: 10, fontWeight: 'bold', color: cs.avgStepCompletion >= 75 ? '#34d399' : cs.avgStepCompletion >= 40 ? '#fbbf24' : '#94a3b8' } }, cs.avgStepCompletion + '%')
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
