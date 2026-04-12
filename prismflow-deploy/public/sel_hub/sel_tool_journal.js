// ═══════════════════════════════════════════════════════════════
// sel_tool_journal.js — Feelings Journal Plugin (v3.0)
// Daily mood check-ins, free-write journaling, mood analytics,
// AI-powered insight generation, coping strategies, mood calendar,
// weekly summaries, sub-emotions, emotion vocabulary builder,
// mood playlist generator, letter-to-self, AI pattern analysis,
// and achievement badges.
// Registered tool ID: "journal"
// Category: responsible-decision-making
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

  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxSave() { playTone(440, 0.08, 'sine', 0.06); setTimeout(function() { playTone(554, 0.08, 'sine', 0.06); }, 60); setTimeout(function() { playTone(659, 0.12, 'sine', 0.08); }, 130); }

  // ══════════════════════════════════════════════════════════════
  // ── Mood Definitions ──
  // ══════════════════════════════════════════════════════════════
  var MOODS = [
    { id: 5, emoji: '\uD83D\uDE04', label: 'Great',       color: '#22c55e' },
    { id: 4, emoji: '\uD83D\uDE42', label: 'Good',        color: '#84cc16' },
    { id: 3, emoji: '\uD83D\uDE10', label: 'Okay',        color: '#eab308' },
    { id: 2, emoji: '\uD83D\uDE15', label: 'Not Great',   color: '#f97316' },
    { id: 1, emoji: '\uD83D\uDE22', label: 'Struggling',  color: '#ef4444' }
  ];

  var TRIGGER_TAGS = ['School', 'Friends', 'Family', 'Health', 'Future', 'Other'];

  // ══════════════════════════════════════════════════════════════
  // ── Sub-Emotions (tap mood → see specific feelings) ──
  // ══════════════════════════════════════════════════════════════
  var SUB_EMOTIONS = {
    5: [
      { emoji: '\uD83E\uDD29', label: 'Excited' },
      { emoji: '\uD83E\uDD70', label: 'Loved' },
      { emoji: '\uD83D\uDE0E', label: 'Confident' },
      { emoji: '\uD83E\uDD73', label: 'Celebratory' }
    ],
    4: [
      { emoji: '\uD83D\uDE0C', label: 'Peaceful' },
      { emoji: '\uD83D\uDE0A', label: 'Content' },
      { emoji: '\uD83D\uDE07', label: 'Hopeful' },
      { emoji: '\uD83E\uDD17', label: 'Grateful' }
    ],
    3: [
      { emoji: '\uD83E\uDD14', label: 'Unsure' },
      { emoji: '\uD83D\uDE36', label: 'Numb' },
      { emoji: '\uD83D\uDE11', label: 'Bored' },
      { emoji: '\uD83D\uDE14', label: 'Distracted' }
    ],
    2: [
      { emoji: '\uD83D\uDE1F', label: 'Worried' },
      { emoji: '\uD83D\uDE24', label: 'Frustrated' },
      { emoji: '\uD83D\uDE1E', label: 'Disappointed' },
      { emoji: '\uD83D\uDE29', label: 'Overwhelmed' }
    ],
    1: [
      { emoji: '\uD83D\uDE30', label: 'Anxious' },
      { emoji: '\uD83D\uDE2D', label: 'Heartbroken' },
      { emoji: '\uD83D\uDE28', label: 'Scared' },
      { emoji: '\uD83D\uDE16', label: 'Hopeless' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Coping Strategies (mood-based) ──
  // ══════════════════════════════════════════════════════════════
  var COPING_STRATEGIES = {
    5: [
      { icon: '\uD83D\uDE4F', title: 'Gratitude List', desc: 'Write 3 things you\u2019re grateful for to remember this feeling.' },
      { icon: '\uD83E\uDD1D', title: 'Share Your Joy', desc: 'Tell a friend or family member what made your day great.' },
      { icon: '\uD83C\uDFAF', title: 'Set a New Goal', desc: 'Ride this positive energy \u2014 pick something to work toward!' }
    ],
    4: [
      { icon: '\u2600\uFE0F', title: 'Savor the Moment', desc: 'Pause and appreciate what\u2019s going well right now.' },
      { icon: '\uD83D\uDCDD', title: 'Capture It', desc: 'Write about what\u2019s contributing to this good feeling.' },
      { icon: '\uD83C\uDF31', title: 'Pay It Forward', desc: 'Do something kind for someone \u2014 it multiplies good vibes.' }
    ],
    3: [
      { icon: '\uD83D\uDEB6', title: 'Take a Short Walk', desc: 'Moving your body can help shift your mood and clear your mind.' },
      { icon: '\uD83C\uDFB5', title: 'Listen to Music', desc: 'Put on a song you love \u2014 music can be a powerful mood booster.' },
      { icon: '\uD83D\uDCAC', title: 'Talk to a Friend', desc: 'Sometimes just chatting with someone helps you feel more connected.' }
    ],
    2: [
      { icon: '\uD83C\uDF2C\uFE0F', title: 'Deep Breathing (4-7-8)', desc: 'Breathe in 4 sec, hold 7 sec, breathe out 8 sec. Repeat 3x.' },
      { icon: '\uD83D\uDCD3', title: 'Journal About It', desc: 'Writing about what happened can help you process and release it.' },
      { icon: '\uD83E\uDDE1', title: 'Talk to a Trusted Adult', desc: 'Reach out to someone you trust \u2014 you don\u2019t have to carry this alone.' }
    ],
    1: [
      { icon: '\uD83D\uDCDE', title: 'Talk to a Trusted Adult', desc: 'Please reach out to someone you trust. You matter.' },
      { icon: '\u2764\uFE0F', title: 'Call 988 Lifeline', desc: 'Free, confidential support 24/7. Call or text 988.' },
      { icon: '\uD83D\uDCF1', title: 'Text HOME to 741741', desc: 'Crisis Text Line \u2014 free 24/7 support via text. You are not alone.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Mood Playlist Activities (post check-in activity cards) ──
  // ══════════════════════════════════════════════════════════════
  var MOOD_PLAYLIST = {
    5: {
      header: 'Celebrate!',
      headerIcon: '\uD83C\uDF89',
      activities: [
        { icon: '\uD83C\uDF1F', label: 'Share your joy with someone', desc: 'Tell a friend, teacher, or family member what made your day great.' },
        { icon: '\uD83C\uDFAF', label: 'Set a new goal', desc: 'Channel this great energy into something you want to achieve.' },
        { icon: '\uD83E\uDD1D', label: 'Help someone else', desc: 'Pay it forward \u2014 your positive energy can lift others too.' },
        { icon: '\uD83D\uDCF8', label: 'Capture the moment', desc: 'Write or draw what made today amazing so you can remember it.' },
        { icon: '\uD83C\uDFB6', label: 'Create a victory playlist', desc: 'Add a song that captures this feeling to a playlist.' },
        { icon: '\uD83D\uDE4F', label: 'Practice gratitude', desc: 'Name 3 specific things that contributed to this great day.' }
      ]
    },
    4: {
      header: 'Ride the Wave!',
      headerIcon: '\uD83C\uDF0A',
      activities: [
        { icon: '\uD83C\uDFA8', label: 'Try something creative', desc: 'Draw, write, build \u2014 good moods fuel creativity!' },
        { icon: '\uD83D\uDE4F', label: 'Practice gratitude', desc: 'Jot down 3 things you appreciate right now.' },
        { icon: '\uD83D\uDCF1', label: 'Reach out to a friend', desc: 'Send a kind message to someone you care about.' },
        { icon: '\uD83D\uDCDA', label: 'Learn something new', desc: 'Watch a documentary, read an article, or explore a topic.' },
        { icon: '\uD83C\uDF31', label: 'Plan something fun', desc: 'Give yourself something to look forward to this week.' },
        { icon: '\uD83D\uDCDD', label: 'Journal about it', desc: 'Writing about good days helps you remember what works.' }
      ]
    },
    3: {
      header: 'Gentle Boost',
      headerIcon: '\u2600\uFE0F',
      activities: [
        { icon: '\uD83D\uDEB6', label: 'Take a walk', desc: 'Even 5 minutes of movement can shift your mood.' },
        { icon: '\uD83C\uDFB5', label: 'Listen to favorite music', desc: 'Put on songs that make you feel something.' },
        { icon: '\u270D\uFE0F', label: 'Draw or doodle', desc: 'No rules \u2014 just let your hand move on paper.' },
        { icon: '\uD83D\uDCA7', label: 'Drink some water', desc: 'Hydration matters more than you think for mood.' },
        { icon: '\uD83E\uDDD8', label: 'Stretch for 2 minutes', desc: 'Release tension in your shoulders, neck, and back.' },
        { icon: '\uD83D\uDE34', label: 'Take a rest', desc: 'Sometimes \u201Cokay\u201D just means you need a pause.' }
      ]
    },
    2: {
      header: 'Self-Care Time',
      headerIcon: '\uD83D\uDC9C',
      activities: [
        { icon: '\uD83C\uDF2C\uFE0F', label: 'Deep breathing exercise', desc: 'Try 4-7-8 breathing: in for 4, hold for 7, out for 8.' },
        { icon: '\uD83D\uDCD3', label: 'Journal about it', desc: 'Writing can help you process and release difficult feelings.' },
        { icon: '\uD83D\uDCAC', label: 'Talk to someone you trust', desc: 'You don\u2019t have to carry this alone \u2014 reach out.' },
        { icon: '\uD83D\uDECB\uFE0F', label: 'Do something comforting', desc: 'A warm drink, a cozy blanket, a favorite show.' },
        { icon: '\uD83C\uDFB6', label: 'Listen to calming music', desc: 'Music can soothe your nervous system.' },
        { icon: '\uD83D\uDC3E', label: 'Spend time with a pet', desc: 'Animals provide comfort without judgment.' }
      ]
    },
    1: {
      header: 'You Matter',
      headerIcon: '\u2764\uFE0F',
      activities: [
        { icon: '\uD83D\uDCDE', label: 'Reach out to a trusted adult NOW', desc: 'A parent, teacher, counselor \u2014 someone who cares about you.' },
        { icon: '\uD83D\uDCF1', label: 'Call 988 Suicide & Crisis Lifeline', desc: 'Free, confidential support 24/7. Call or text 988.' },
        { icon: '\uD83D\uDCAC', label: 'Text HOME to 741741', desc: 'Crisis Text Line \u2014 free 24/7 support via text.' },
        { icon: '\uD83E\uDDE1', label: 'Remember: this feeling is temporary', desc: 'Hard moments pass. You have survived every bad day so far.' },
        { icon: '\uD83C\uDF2C\uFE0F', label: 'Try grounding (5-4-3-2-1)', desc: '5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.' },
        { icon: '\uD83D\uDCA7', label: 'It\u2019s okay to cry', desc: 'Tears are not weakness. They are your body processing pain.' }
      ]
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Expanded Emotion Vocabulary (6 per mood level) ──
  // ══════════════════════════════════════════════════════════════
  var EXPANDED_EMOTIONS = {
    5: [
      { emoji: '\uD83E\uDD29', label: 'Ecstatic' },
      { emoji: '\uD83D\uDE0E', label: 'Proud' },
      { emoji: '\uD83D\uDE4F', label: 'Grateful' },
      { emoji: '\u26A1',       label: 'Energized' },
      { emoji: '\uD83E\uDD70', label: 'Loved' },
      { emoji: '\u2728',       label: 'Inspired' }
    ],
    4: [
      { emoji: '\uD83D\uDE0C', label: 'Content' },
      { emoji: '\uD83D\uDE0C', label: 'Relieved' },
      { emoji: '\uD83C\uDF1F', label: 'Optimistic' },
      { emoji: '\uD83D\uDE04', label: 'Amused' },
      { emoji: '\uD83E\uDDD8', label: 'Calm' },
      { emoji: '\uD83D\uDCAA', label: 'Motivated' }
    ],
    3: [
      { emoji: '\uD83E\uDD14', label: 'Uncertain' },
      { emoji: '\uD83D\uDE15', label: 'Restless' },
      { emoji: '\uD83D\uDE36', label: 'Numb' },
      { emoji: '\uD83D\uDE14', label: 'Distracted' },
      { emoji: '\uD83D\uDE11', label: 'Meh' },
      { emoji: '\u2696\uFE0F', label: 'Ambivalent' }
    ],
    2: [
      { emoji: '\uD83D\uDE30', label: 'Anxious' },
      { emoji: '\uD83D\uDE14', label: 'Lonely' },
      { emoji: '\uD83D\uDE24', label: 'Frustrated' },
      { emoji: '\uD83D\uDE33', label: 'Embarrassed' },
      { emoji: '\uD83D\uDE12', label: 'Jealous' },
      { emoji: '\uD83D\uDE1E', label: 'Guilty' }
    ],
    1: [
      { emoji: '\uD83D\uDE16', label: 'Hopeless' },
      { emoji: '\uD83D\uDE28', label: 'Panicked' },
      { emoji: '\uD83D\uDE2D', label: 'Devastated' },
      { emoji: '\uD83D\uDE30', label: 'Trapped' },
      { emoji: '\uD83D\uDE1E', label: 'Worthless' },
      { emoji: '\uD83D\uDE21', label: 'Enraged' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Writing Prompts (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var PROMPTS = {
    elementary: [
      'What made me smile today?',
      'If I could have any superpower, it would be...',
      'My favorite memory this week is...',
      'Something kind I did for someone else...',
      'A time I felt really brave was...',
      'If I could talk to any animal, I would pick...',
      'The best part of my day was...',
      'Something new I learned recently is...',
      'A friend who makes me feel happy is...',
      'If I could go anywhere in the world, I would go to...',
      'Something I\u2019m proud of is...',
      'My favorite thing about myself is...',
      'Draw or describe your happy place \u2014 what does it look like?',
      'What animal are you feeling like today and why?',
      'Write a letter to your future self \u2014 what would you say?',
      'What would you tell a friend who feels the way you do right now?',
      'If my feelings were colors today, what colors would they be?',
      'Something that makes me feel safe and cozy is...',
      'A time someone made me feel really special was...',
      'If I could invent a new holiday, it would celebrate...',
      'What is the nicest thing someone has ever said to me?',
      'If I could teach the whole world one thing, it would be...'
    ],
    middle: [
      'Something that challenged me today and how I handled it...',
      'A person who inspires me and why...',
      'If I could change one thing about my school, it would be...',
      'A time I stood up for myself or someone else...',
      'Something I wish more people understood about me...',
      'A goal I\u2019m working toward right now is...',
      'How I deal with stress when things get overwhelming...',
      'A mistake I learned something important from...',
      'Something I\u2019m looking forward to and why...',
      'A boundary I set recently and how it felt...',
      'What does being a good friend mean to me?',
      'How do I feel when I compare myself to others on social media?',
      'What song matches your mood today and why?',
      'Describe a time you surprised yourself with what you could do.',
      'What boundary do you need to set right now?',
      'If your emotions were weather, what\u2019s today\u2019s forecast?',
      'A moment this week when I felt truly seen or heard...',
      'What does courage look like in my everyday life?',
      'How do I recharge when I\u2019m emotionally drained?',
      'Something I\u2019m learning about myself this year is...',
      'If I could have an honest conversation with anyone, who and why?',
      'What\u2019s one thing I do well that I don\u2019t give myself credit for?'
    ],
    high: [
      'What pattern do I notice in my moods this week?',
      'How have my values evolved over the past year?',
      'A belief I used to hold that I\u2019ve changed my mind about...',
      'How do I respond to criticism, and is that working for me?',
      'What does emotional maturity mean to me?',
      'A relationship that has shaped who I am becoming...',
      'When I feel most authentic vs. when I feel like I\u2019m performing...',
      'How do I define success differently now than when I was younger?',
      'Something I need to forgive myself for...',
      'How do I want to be remembered by the people in my life?',
      'What role does vulnerability play in my relationships?',
      'How do I balance taking care of others and taking care of myself?',
      'How does your environment affect your emotional state?',
      'What societal pressure weighs on you most right now?',
      'Write about a belief you\u2019ve changed \u2014 what shifted your perspective?',
      'What does emotional intelligence mean to you?',
      'How do I differentiate between what I want and what I need?',
      'What would radical self-acceptance look like in my life?',
      'How do my relationships reflect my relationship with myself?',
      'What unspoken expectations am I carrying from others?',
      'When did I last feel truly at peace, and what made it possible?',
      'How do I want to grow as a person in the next year?'
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_checkin',    icon: '\u2705',       name: 'First Check-In',     desc: 'Complete your first mood check-in' },
    { id: 'streak_3',         icon: '\uD83D\uDD25', name: '3-Day Streak',       desc: 'Check in 3 days in a row' },
    { id: 'streak_7',         icon: '\u2B50',       name: '7-Day Streak',       desc: 'Check in 7 days in a row' },
    { id: 'streak_14',        icon: '\uD83C\uDFC6', name: '14-Day Streak',      desc: 'Check in 14 days in a row' },
    { id: 'first_journal',    icon: '\uD83D\uDCDD', name: 'First Journal Entry', desc: 'Write your first journal entry' },
    { id: 'deep_writer',      icon: '\uD83D\uDCD6', name: 'Deep Writer',        desc: 'Write 3 journal entries' },
    { id: 'gratitude_5',      icon: '\uD83D\uDE4F', name: 'Gratitude Practice', desc: 'Record 5 gratitude entries' },
    { id: 'self_aware',       icon: '\uD83E\uDDE0', name: 'Self-Aware',         desc: 'Identify 3 different triggers' },
    { id: 'pattern_spotter',  icon: '\uD83D\uDD0D', name: 'Pattern Spotter',    desc: 'View your mood insights' },
    { id: 'ai_reflector',     icon: '\uD83E\uDD16', name: 'AI Reflector',       desc: 'Get an AI-powered insight about your patterns' },
    { id: 'mood_mapper',      icon: '\uD83C\uDF08', name: 'Mood Mapper',        desc: 'Use all 5 mood levels at least once' },
    { id: 'consistent_10',    icon: '\uD83D\uDCAA', name: 'Consistent',         desc: 'Complete 10 total check-ins' },
    { id: 'calendar_viewer',  icon: '\uD83D\uDCC5', name: 'Calendar Viewer',    desc: 'View your mood calendar for the first time' },
    { id: 'coping_practitioner', icon: '\uD83E\uDDD8', name: 'Coping Practitioner', desc: 'Tap 3 different coping strategy cards' },
    { id: 'weekly_reviewer',  icon: '\uD83D\uDCCB', name: 'Weekly Reviewer',    desc: 'View your first weekly mood summary' },
    { id: 'streak_30',        icon: '\uD83D\uDC8E', name: '30-Day Streak',      desc: 'Check in 30 days in a row \u2014 incredible!' },
    { id: 'prompt_master',    icon: '\uD83C\uDFA8', name: 'Prompt Master',      desc: 'Use 10 or more different writing prompts' },
    { id: 'emotion_wordsmith', icon: '\uD83D\uDCDA', name: 'Emotion Wordsmith', desc: 'Use 10+ unique emotion vocabulary words' },
    { id: 'letter_writer',    icon: '\u2709\uFE0F', name: 'Letter Writer',     desc: 'Write a letter to your past or future self' },
    { id: 'mood_detective',    icon: '\uD83D\uDD0E', name: 'Mood Detective',    desc: 'View AI mood pattern analysis' },
    { id: 'selfcare_practitioner', icon: '\uD83C\uDF3F', name: 'Self-Care Practitioner', desc: 'Complete 5 mood playlist activities' },
    { id: 'consistent_journaler', icon: '\uD83D\uDCD6', name: 'Consistent Journaler', desc: 'Write 20 total journal entries (including letters)' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Helpers ──
  // ══════════════════════════════════════════════════════════════
  function dateKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function calcStreak(checkIns) {
    if (!checkIns || checkIns.length === 0) return 0;
    var days = {};
    checkIns.forEach(function(ci) { days[dateKey(ci.timestamp)] = true; });
    var sorted = Object.keys(days).sort().reverse();
    var today = dateKey(Date.now());
    var yesterday = dateKey(Date.now() - 86400000);
    if (!days[today] && !days[yesterday]) return 0;
    var streak = 0;
    var cur = days[today] ? new Date() : new Date(Date.now() - 86400000);
    while (true) {
      var key = dateKey(cur.getTime());
      if (!days[key]) break;
      streak++;
      cur = new Date(cur.getTime() - 86400000);
    }
    return streak;
  }

  function uniqueMoods(checkIns) {
    var seen = {};
    (checkIns || []).forEach(function(ci) { seen[ci.mood] = true; });
    return Object.keys(seen).length;
  }

  function uniqueTriggers(checkIns) {
    var seen = {};
    (checkIns || []).forEach(function(ci) {
      (ci.triggers || []).forEach(function(t) { seen[t] = true; });
    });
    return Object.keys(seen).length;
  }

  function gratitudeCount(checkIns) {
    var count = 0;
    (checkIns || []).forEach(function(ci) {
      if (ci.gratitude && ci.gratitude.trim()) count++;
    });
    return count;
  }

  function uniquePromptsUsed(journalEntries) {
    var seen = {};
    (journalEntries || []).forEach(function(je) {
      if (je.prompt) seen[je.prompt] = true;
    });
    return Object.keys(seen).length;
  }

  function countUniqueEmotionWords(checkIns) {
    var seen = {};
    (checkIns || []).forEach(function(ci) {
      if (ci.subEmotion) seen[ci.subEmotion] = true;
      if (ci.expandedEmotion) seen[ci.expandedEmotion] = true;
    });
    return Object.keys(seen).length;
  }

  function getEmotionWordsList(checkIns) {
    var seen = {};
    (checkIns || []).forEach(function(ci) {
      if (ci.subEmotion) seen[ci.subEmotion] = true;
      if (ci.expandedEmotion) seen[ci.expandedEmotion] = true;
    });
    return Object.keys(seen);
  }

  function countPlaylistCompleted(completedActivities) {
    var count = 0;
    var keys = Object.keys(completedActivities || {});
    keys.forEach(function(k) { if (completedActivities[k]) count++; });
    return count;
  }

  function generateMoodPatternAnalysis(checkIns) {
    if (!checkIns || checkIns.length < 5) return null;
    var analysis = [];

    // 1. Weekday vs weekend comparison
    var weekdayTotal = 0, weekdayCount = 0;
    var weekendTotal = 0, weekendCount = 0;
    checkIns.forEach(function(ci) {
      var day = new Date(ci.timestamp).getDay();
      if (day === 0 || day === 6) { weekendTotal += ci.mood; weekendCount++; }
      else { weekdayTotal += ci.mood; weekdayCount++; }
    });
    if (weekdayCount > 0 && weekendCount > 0) {
      var wdAvg = Math.round(weekdayTotal / weekdayCount * 10) / 10;
      var weAvg = Math.round(weekendTotal / weekendCount * 10) / 10;
      if (Math.abs(wdAvg - weAvg) >= 0.3) {
        if (wdAvg > weAvg) {
          analysis.push({ icon: '\uD83D\uDCBC', text: 'You tend to feel better on weekdays (avg ' + wdAvg.toFixed(1) + ') than weekends (avg ' + weAvg.toFixed(1) + ').' });
        } else {
          analysis.push({ icon: '\uD83C\uDFD6\uFE0F', text: 'You tend to feel better on weekends (avg ' + weAvg.toFixed(1) + ') than weekdays (avg ' + wdAvg.toFixed(1) + ').' });
        }
      }
    }

    // 2. Trigger correlation
    var trigMoods = {};
    checkIns.forEach(function(ci) {
      (ci.triggers || []).forEach(function(t) {
        if (!trigMoods[t]) trigMoods[t] = { total: 0, count: 0 };
        trigMoods[t].total += ci.mood;
        trigMoods[t].count++;
      });
    });
    var trigKeys = Object.keys(trigMoods).filter(function(k) { return trigMoods[k].count >= 2; });
    trigKeys.sort(function(a, b) { return (trigMoods[b].total / trigMoods[b].count) - (trigMoods[a].total / trigMoods[a].count); });
    if (trigKeys.length >= 2) {
      var best = trigKeys[0];
      var worst = trigKeys[trigKeys.length - 1];
      var bestAvg = Math.round(trigMoods[best].total / trigMoods[best].count * 10) / 10;
      var worstAvg = Math.round(trigMoods[worst].total / trigMoods[worst].count * 10) / 10;
      if (bestAvg !== worstAvg) {
        analysis.push({ icon: '\uD83C\uDFF7\uFE0F', text: 'When you tag \u201C' + best + '\u201D your mood averages ' + bestAvg.toFixed(1) + '. When you tag \u201C' + worst + '\u201D it averages ' + worstAvg.toFixed(1) + '.' });
      }
    }

    // 3. Growth recognition (last 2 weeks vs previous 2 weeks)
    var now = Date.now();
    var twoWeeks = 14 * 86400000;
    var recent = checkIns.filter(function(ci) { return ci.timestamp > now - twoWeeks; });
    var older = checkIns.filter(function(ci) { return ci.timestamp <= now - twoWeeks && ci.timestamp > now - (twoWeeks * 2); });
    if (recent.length >= 3 && older.length >= 3) {
      var recentAvg = 0;
      recent.forEach(function(ci) { recentAvg += ci.mood; });
      recentAvg = recentAvg / recent.length;
      var olderAvg = 0;
      older.forEach(function(ci) { olderAvg += ci.mood; });
      olderAvg = olderAvg / older.length;
      var changePct = Math.round((recentAvg - olderAvg) / olderAvg * 100);
      if (changePct > 5) {
        analysis.push({ icon: '\uD83D\uDCC8', text: 'Your mood has improved ' + changePct + '% over the last 2 weeks. Keep it up!' });
      } else if (changePct < -5) {
        analysis.push({ icon: '\uD83D\uDCC9', text: 'Your mood has dipped ' + Math.abs(changePct) + '% over the last 2 weeks. Be extra kind to yourself.' });
      } else {
        analysis.push({ icon: '\u2696\uFE0F', text: 'Your mood has been steady over the last 2 weeks \u2014 stability is a strength.' });
      }
    }

    // 4. Time-of-day pattern
    var morningTotal = 0, morningCount = 0;
    var afternoonTotal = 0, afternoonCount = 0;
    var eveningTotal = 0, eveningCount = 0;
    checkIns.forEach(function(ci) {
      var hr = new Date(ci.timestamp).getHours();
      if (hr < 12) { morningTotal += ci.mood; morningCount++; }
      else if (hr < 17) { afternoonTotal += ci.mood; afternoonCount++; }
      else { eveningTotal += ci.mood; eveningCount++; }
    });
    var timeParts = [];
    if (morningCount >= 2) timeParts.push({ name: 'mornings', avg: morningTotal / morningCount });
    if (afternoonCount >= 2) timeParts.push({ name: 'afternoons', avg: afternoonTotal / afternoonCount });
    if (eveningCount >= 2) timeParts.push({ name: 'evenings', avg: eveningTotal / eveningCount });
    if (timeParts.length >= 2) {
      timeParts.sort(function(a, b) { return b.avg - a.avg; });
      if (timeParts[0].avg - timeParts[timeParts.length - 1].avg >= 0.4) {
        analysis.push({ icon: '\u23F0', text: 'You tend to feel best during ' + timeParts[0].name + ' (avg ' + timeParts[0].avg.toFixed(1) + ').' });
      }
    }

    // 5. Energy-mood correlation
    var highEnergyMood = 0, highEnergyCount = 0;
    var lowEnergyMood = 0, lowEnergyCount = 0;
    checkIns.forEach(function(ci) {
      var e = ci.energy || 3;
      if (e >= 4) { highEnergyMood += ci.mood; highEnergyCount++; }
      else if (e <= 2) { lowEnergyMood += ci.mood; lowEnergyCount++; }
    });
    if (highEnergyCount >= 2 && lowEnergyCount >= 2) {
      var heAvg = Math.round(highEnergyMood / highEnergyCount * 10) / 10;
      var leAvg = Math.round(lowEnergyMood / lowEnergyCount * 10) / 10;
      if (heAvg - leAvg >= 0.5) {
        analysis.push({ icon: '\u26A1', text: 'When your energy is high, your mood averages ' + heAvg.toFixed(1) + ' vs ' + leAvg.toFixed(1) + ' on low-energy days.' });
      }
    }

    return analysis.length > 0 ? analysis : null;
  }

  function getWeekBounds(dateObj) {
    var d = new Date(dateObj);
    var day = d.getDay();
    var start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    var end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }

  function getWeeklySummary(checkIns) {
    var week = getWeekBounds(new Date());
    var weekEntries = (checkIns || []).filter(function(ci) {
      return ci.timestamp >= week.start && ci.timestamp <= week.end;
    });
    if (weekEntries.length < 3) return null;

    var totalMood = 0;
    var totalEnergy = 0;
    var trigCount = {};
    weekEntries.forEach(function(ci) {
      totalMood += ci.mood;
      totalEnergy += (ci.energy || 3);
      (ci.triggers || []).forEach(function(t) { trigCount[t] = (trigCount[t] || 0) + 1; });
    });
    var avgMood = Math.round(totalMood / weekEntries.length * 10) / 10;
    var avgEnergy = Math.round(totalEnergy / weekEntries.length * 10) / 10;

    var sortedTrigs = Object.keys(trigCount).sort(function(a, b) { return trigCount[b] - trigCount[a]; });
    var topTriggers = sortedTrigs.slice(0, 3);

    // Trajectory: compare first-half avg to second-half avg
    var mid = Math.floor(weekEntries.length / 2);
    var firstHalf = weekEntries.slice(0, mid || 1);
    var secondHalf = weekEntries.slice(mid);
    var firstAvg = 0;
    var secondAvg = 0;
    firstHalf.forEach(function(ci) { firstAvg += ci.mood; });
    firstAvg = firstAvg / firstHalf.length;
    secondHalf.forEach(function(ci) { secondAvg += ci.mood; });
    secondAvg = secondAvg / secondHalf.length;
    var diff = secondAvg - firstAvg;
    var trajectory = 'stable';
    if (diff > 0.5) trajectory = 'improving';
    else if (diff < -0.5) trajectory = 'declining';

    var encouragement = '';
    if (trajectory === 'improving') encouragement = 'Your mood is trending upward \u2014 keep it up!';
    else if (trajectory === 'declining') encouragement = 'It\u2019s okay to have tough stretches. Remember to use your coping strategies.';
    else if (avgMood >= 4) encouragement = 'You\u2019re doing great this week! Keep nurturing what\u2019s working.';
    else if (avgMood >= 3) encouragement = 'A steady week. Small positive choices add up over time.';
    else encouragement = 'Tough week \u2014 but you\u2019re showing up. That takes real courage.';

    return {
      count: weekEntries.length,
      avgMood: avgMood,
      avgEnergy: avgEnergy,
      topTriggers: topTriggers,
      trajectory: trajectory,
      encouragement: encouragement
    };
  }

  function getMonthDays(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay();
  }

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('journal', {
    icon: '\uD83D\uDCD3',
    label: 'Feelings Journal',
    desc: 'Track your moods, write reflections, discover emotional patterns, and earn badges for consistent self-awareness practice.',
    color: 'pink',
    category: 'responsible-decision-making',
    render: function(ctx) {
      return (function() {
        var React = ctx.React;
        var h = React.createElement;
        var addToast = ctx.addToast;
        var awardXP = ctx.awardXP;
        var announceToSR = ctx.announceToSR;
        var a11yClick = ctx.a11yClick;
        var celebrate = ctx.celebrate;
        var callGemini = ctx.callGemini;
        var callTTS = ctx.callTTS;
        var band = ctx.gradeBand || 'elementary';

        // ── Tool-scoped state ──
        var d = (ctx.toolData && ctx.toolData.journal) || {};
        var upd = function(key, val) {
          if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('journal', key); }
          else { if (ctx.update) ctx.update('journal', key, val); }
        };

        var activeTab     = d.activeTab || 'checkin';
        var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

        // Check-in state
        var checkIns       = d.checkIns || [];
        var ciMood         = d.ciMood != null ? d.ciMood : null;
        var ciEnergy       = d.ciEnergy != null ? d.ciEnergy : 3;
        var ciThoughts     = d.ciThoughts || '';
        var ciTriggers     = d.ciTriggers || [];
        var ciGratitude    = d.ciGratitude || '';

        // Journal state
        var journalEntries = d.journalEntries || [];
        var jPromptIdx     = d.jPromptIdx || 0;
        var jText          = d.jText || '';
        var jViewingPast   = d.jViewingPast || false;

        // Insights state
        var aiInsight      = d.aiInsight || '';
        var aiLoading      = d.aiLoading || false;

        // Badges state
        var earnedBadges   = d.earnedBadges || {};
        var showBadgePopup = d.showBadgePopup || null;
        var showBadgesPanel = d.showBadgesPanel || false;

        // Sub-emotion state
        var ciSubEmotion   = d.ciSubEmotion || null;

        // Coping state
        var showCoping     = d.showCoping || false;
        var copingTapped   = d.copingTapped || {};

        // Calendar state
        var calYear        = d.calYear != null ? d.calYear : new Date().getFullYear();
        var calMonth       = d.calMonth != null ? d.calMonth : new Date().getMonth();

        // Weekly summary state
        var showWeekly     = d.showWeekly || false;

        // Expanded emotion vocabulary state
        var ciExpandedEmotion = d.ciExpandedEmotion || null;

        // Mood playlist state
        var playlistCompleted = d.playlistCompleted || {};

        // Letter to Self state
        var letterMode       = d.letterMode || null; // 'future' | 'past' | null
        var letterText       = d.letterText || '';
        var letterTimePeriod = d.letterTimePeriod || '1month';
        var letterEntries    = d.letterEntries || [];
        var letterViewingPast = d.letterViewingPast || false;

        // Mood pattern analysis state
        var moodPatterns     = d.moodPatterns || null;

        var ACCENT = '#ec4899';
        var ACCENT_DIM = '#ec489922';
        var ACCENT_MED = '#ec489944';

        // ── Badge logic ──
        function tryAwardBadge(badgeId) {
          if (earnedBadges[badgeId]) return;
          var newBadges = Object.assign({}, earnedBadges);
          newBadges[badgeId] = Date.now();
          upd('earnedBadges', newBadges);
          var badge = BADGES.find(function(b) { return b.id === badgeId; });
          if (badge) {
            upd('showBadgePopup', badgeId);
            if (soundEnabled) sfxBadge();
            if (celebrate) celebrate();
            awardXP(25);
            setTimeout(function() { upd('showBadgePopup', null); }, 3000);
          }
        }

        // ── TTS helper ──
        function speak(text) {
          if (callTTS) callTTS(text);
        }

        // ── Streak calculation ──
        var streak = calcStreak(checkIns);

        // ══════════════════════════════════════════════════════
        // ── Tab Bar ──
        // ══════════════════════════════════════════════════════
        var TABS = [
          { id: 'checkin',  icon: '\uD83D\uDE42', label: 'Check-In' },
          { id: 'journal',  icon: '\u270D\uFE0F', label: 'Journal' },
          { id: 'calendar', icon: '\uD83D\uDCC5', label: 'Calendar' },
          { id: 'insights', icon: '\uD83D\uDCCA', label: 'Insights' },
          { id: 'badges',   icon: '\uD83C\uDFC5', label: 'Badges' }
        ];

        var tabBar = h('div', { role: 'tablist', 'aria-label': 'Journal tabs', style: { display: 'flex', borderBottom: '1px solid #1e293b', padding: '0 8px', alignItems: 'center', flexShrink: 0 } },
          TABS.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', { 'aria-label': t.icon + ' ' + t.label,
              key: t.id,
              role: 'tab', 'aria-selected': isActive,
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: {
                padding: '10px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500,
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8', transition: 'all 0.15s',
                borderBottom: isActive ? '2px solid ' + ACCENT : '2px solid transparent', borderRadius: 0
              }
            }, t.icon + ' ' + t.label);
          }),
          h('button', { 'aria-label': popBadge.icon, onClick: function() { upd('soundEnabled', !soundEnabled); }, style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#9ca3af' }, title: soundEnabled ? 'Mute' : 'Unmute' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        );

        // ══════════════════════════════════════════════════════
        // ── Badge Popup Overlay ──
        // ══════════════════════════════════════════════════════
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' }, onClick: function() { upd('showBadgePopup', null); } },
              h('div', { style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 300 } },
                h('div', { style: { fontSize: 48, marginBottom: 8 } }, popBadge.icon),
                h('div', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 700 } }, 'Badge Earned!'),
                h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, popBadge.name),
                h('div', { style: { fontSize: 12, color: '#cbd5e1' } }, popBadge.desc)
              )
            );
          }
        }

        // ══════════════════════════════════════════════════════
        // ── TAB: Check-In ──
        // ══════════════════════════════════════════════════════
        var checkinContent = null;
        if (activeTab === 'checkin') {
          var todayKey = dateKey(Date.now());
          var checkedInToday = checkIns.some(function(ci) { return dateKey(ci.timestamp) === todayKey; });

          var energyLabels = ['Exhausted', 'Tired', 'Okay', 'Energized', 'Supercharged'];

          checkinContent = h('div', { style: { padding: 20, maxWidth: 520, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? '\uD83D\uDE42 How Are You Feeling?' : '\uD83D\uDE42 Daily Mood Check-In'
            ),
            streak > 0 && h('div', { style: { textAlign: 'center', marginBottom: 12, fontSize: 12, color: '#f59e0b' } },
              '\uD83D\uDD25 ' + streak + '-day streak!'
            ),
            checkedInToday && h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 10, background: '#22c55e22', border: '1px solid #22c55e44', marginBottom: 16, fontSize: 12, color: '#22c55e' } },
              '\u2705 You already checked in today! You can still add another entry.'
            ),

            // Mood selector
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'Pick the face that matches how you feel:' : 'Select your current mood:'
              ),
              h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10 } },
                MOODS.map(function(m) {
                  var isSelected = ciMood === m.id;
                  return h('button', { 'aria-label': m.emoji,
                    key: m.id,
                    onClick: function() {
                      upd({ ciMood: m.id, ciSubEmotion: null });
                      if (soundEnabled) sfxClick();
                    },
                    style: {
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px',
                      borderRadius: 12, border: isSelected ? '2px solid ' + m.color : '2px solid #334155',
                      background: isSelected ? m.color + '22' : '#1e293b', cursor: 'pointer', transition: 'all 0.15s',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                    }
                  },
                    h('span', { style: { fontSize: 28 } }, m.emoji),
                    h('span', { style: { fontSize: 10, color: isSelected ? m.color : '#64748b', fontWeight: 600 } }, m.label)
                  );
                })
              ),

              // Sub-emotion picker (appears when a mood is selected)
              ciMood != null && SUB_EMOTIONS[ciMood] && h('div', { style: { marginTop: 12, padding: 12, borderRadius: 12, background: '#0f172a', border: '1px solid #334155' } },
                h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 8, textAlign: 'center', fontWeight: 500 } },
                  band === 'elementary' ? 'Can you pick a more specific feeling? (optional)' : 'More specifically, you feel... (optional)'
                ),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
                  SUB_EMOTIONS[ciMood].map(function(sub) {
                    var isSel = ciSubEmotion === sub.label;
                    var moodColor = MOODS.find(function(m) { return m.id === ciMood; });
                    var col = moodColor ? moodColor.color : ACCENT;
                    return h('button', { 'aria-label': sub.emoji,
                      key: sub.label,
                      onClick: function() {
                        upd('ciSubEmotion', isSel ? null : sub.label);
                        if (soundEnabled) sfxClick();
                      },
                      style: {
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '8px 14px', borderRadius: 10,
                        border: isSel ? '2px solid ' + col : '1px solid #334155',
                        background: isSel ? col + '22' : '#1e293b',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }
                    },
                      h('span', { style: { fontSize: 20 } }, sub.emoji),
                      h('span', { style: { fontSize: 10, color: isSel ? col : '#94a3b8', fontWeight: 600 } }, sub.label)
                    );
                  })
                ),

                // ── Emotion Vocabulary Builder (expanded sub-emotions) ──
                ciSubEmotion && EXPANDED_EMOTIONS[ciMood] && h('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #334155' } },
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 8, textAlign: 'center', fontWeight: 500 } },
                    band === 'elementary' ? '\uD83D\uDCDA Can you get even more specific? Build your feelings vocabulary!' : '\uD83D\uDCDA Expand your emotion vocabulary \u2014 pick a more precise word:'
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' } },
                    EXPANDED_EMOTIONS[ciMood].map(function(exp) {
                      var isSel = ciExpandedEmotion === exp.label;
                      var moodColor = MOODS.find(function(m) { return m.id === ciMood; });
                      var col = moodColor ? moodColor.color : ACCENT;
                      return h('button', { 'aria-label': exp.emoji,
                        key: exp.label,
                        onClick: function() {
                          upd('ciExpandedEmotion', isSel ? null : exp.label);
                          if (soundEnabled) sfxClick();
                        },
                        style: {
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          padding: '6px 10px', borderRadius: 10,
                          border: isSel ? '2px solid ' + col : '1px solid #334155',
                          background: isSel ? col + '22' : '#1e293b',
                          cursor: 'pointer', transition: 'all 0.15s', minWidth: 60
                        }
                      },
                        h('span', { style: { fontSize: 18 } }, exp.emoji),
                        h('span', { style: { fontSize: 11, color: isSel ? col : '#94a3b8', fontWeight: 600 } }, exp.label)
                      );
                    })
                  ),
                  // Emotion vocabulary tracker
                  (function() {
                    var usedWords = getEmotionWordsList(checkIns);
                    var currentCount = countUniqueEmotionWords(checkIns);
                    // Include current selections in display count
                    var pending = {};
                    if (ciSubEmotion) pending[ciSubEmotion] = true;
                    if (ciExpandedEmotion) pending[ciExpandedEmotion] = true;
                    usedWords.forEach(function(w) { pending[w] = true; });
                    var displayCount = Object.keys(pending).length;
                    return h('div', { style: { marginTop: 10, textAlign: 'center', fontSize: 11, color: '#9ca3af' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),
                      '\uD83D\uDCDA Your Emotion Vocabulary: ' + displayCount + ' word' + (displayCount !== 1 ? 's' : '') + ' used',
                      displayCount >= 10 && h('span', { style: { color: '#22c55e', marginLeft: 6, fontWeight: 600 } }, '\u2605 Wordsmith!')
                    );
                  })()
                )
              )
            ),

            // Energy slider
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'How much energy do you have?' : 'Energy level:'
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 11, color: '#9ca3af', minWidth: 50 } }, '\uD83D\uDCA4 Low'),
                h('input', {
                  type: 'range', min: 1, max: 5, value: ciEnergy,
                  'aria-label': 'Energy level',
                  onChange: function(e) { upd('ciEnergy', parseInt(e.target.value)); },
                  style: { flex: 1, accentColor: ACCENT }
                }),
                h('span', { style: { fontSize: 11, color: '#9ca3af', minWidth: 50, textAlign: 'right' } }, '\u26A1 High')
              ),
              h('div', { style: { textAlign: 'center', fontSize: 11, color: ACCENT, marginTop: 4 } }, energyLabels[ciEnergy - 1])
            ),

            // Thoughts input
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'What\u2019s on your mind right now?' : 'What\u2019s on your mind?'
              ),
              h('textarea', {
                value: ciThoughts,
                'aria-label': 'Check-in thoughts',
                onChange: function(e) { upd('ciThoughts', e.target.value); },
                placeholder: band === 'elementary' ? 'I feel this way because...' : 'Describe what\u2019s going on...',
                rows: 3,
                style: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }
              })
            ),

            // Trigger tags
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'What is this about? (pick any that fit)' : 'Context / triggers (select all that apply):'
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                TRIGGER_TAGS.map(function(tag) {
                  var isOn = ciTriggers.indexOf(tag) !== -1;
                  return h('button', { 'aria-label': 'Toggle sound',
                    key: tag,
                    onClick: function() {
                      var newArr = isOn ? ciTriggers.filter(function(t) { return t !== tag; }) : ciTriggers.concat([tag]);
                      upd('ciTriggers', newArr);
                      if (soundEnabled) sfxClick();
                    },
                    style: {
                      padding: '6px 14px', borderRadius: 20, border: isOn ? '1px solid ' + ACCENT : '1px solid #334155',
                      background: isOn ? ACCENT_DIM : '#1e293b', color: isOn ? ACCENT : '#94a3b8',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s'
                    }
                  }, tag);
                })
              )
            ),

            // Gratitude prompt
            h('div', { style: { marginBottom: 20 } },
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? '\uD83D\uDE4F One thing I\u2019m grateful for today:' : '\uD83D\uDE4F One thing I\u2019m grateful for today...'
              ),
              h('input', {
                type: 'text', value: ciGratitude,
                'aria-label': 'Gratitude entry',
                onChange: function(e) { upd('ciGratitude', e.target.value); },
                placeholder: band === 'elementary' ? 'I\u2019m thankful for...' : 'Something I appreciate...',
                style: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }
              })
            ),

            // Save button
            h('button', { 'aria-label': 'Save button',
              onClick: function() {
                if (ciMood == null) { addToast('Please select a mood first!', 'warning'); return; }
                var entry = {
                  timestamp: Date.now(),
                  mood: ciMood,
                  energy: ciEnergy,
                  thoughts: ciThoughts,
                  triggers: ciTriggers.slice(),
                  gratitude: ciGratitude,
                  subEmotion: ciSubEmotion || null,
                  expandedEmotion: ciExpandedEmotion || null
                };
                var newCheckIns = checkIns.concat([entry]);
                upd({
                  checkIns: newCheckIns,
                  ciMood: null, ciEnergy: 3, ciThoughts: '', ciTriggers: [], ciGratitude: '',
                  ciSubEmotion: null, ciExpandedEmotion: null, showCoping: ciMood
                });
                if (soundEnabled) sfxSave();
                awardXP(10);
                addToast('Check-in saved!', 'success');

                // Badge checks
                tryAwardBadge('first_checkin');
                if (newCheckIns.length >= 10) tryAwardBadge('consistent_10');
                if (gratitudeCount(newCheckIns) >= 5) tryAwardBadge('gratitude_5');
                if (uniqueTriggers(newCheckIns) >= 3) tryAwardBadge('self_aware');
                if (uniqueMoods(newCheckIns) >= 5) tryAwardBadge('mood_mapper');
                var newStreak = calcStreak(newCheckIns);
                if (newStreak >= 3) tryAwardBadge('streak_3');
                if (newStreak >= 7) tryAwardBadge('streak_7');
                if (newStreak >= 14) tryAwardBadge('streak_14');
                if (newStreak >= 30) tryAwardBadge('streak_30');
                // Emotion vocabulary badge
                if (countUniqueEmotionWords(newCheckIns) >= 10) tryAwardBadge('emotion_wordsmith');
              },
              disabled: ciMood == null,
              style: {
                width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
                background: ciMood != null ? ACCENT : '#334155', color: '#fff', fontWeight: 700,
                fontSize: 14, cursor: ciMood != null ? 'pointer' : 'not-allowed', transition: 'all 0.15s'
              }
            }, '\uD83D\uDCBE Save Check-In'),

            // ── Coping Strategy Cards (shown after save) ──
            showCoping && COPING_STRATEGIES[showCoping] && h('div', { style: { marginTop: 20 } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#f1f5f9' } },
                  showCoping <= 1 ? '\uD83D\uDC9C Please Reach Out' :
                  showCoping <= 2 ? '\uD83E\uDDE1 Suggested Coping Strategies' :
                  '\u2728 Keep the Momentum Going'
                ),
                h('button', { 'aria-label': 'You are not alone. These resources are here for you.',
                  onClick: function() { upd('showCoping', false); },
                  style: { background: 'none', border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }
                }, '\u2715')
              ),
              showCoping <= 1 && h('div', { style: { fontSize: 12, color: '#ef4444', marginBottom: 10, fontWeight: 600 } },
                'You are not alone. These resources are here for you.'
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                COPING_STRATEGIES[showCoping].map(function(strat, idx) {
                  return h('button', { 'aria-label': 'Toggle sound',
                    key: idx,
                    onClick: function() {
                      var newTapped = Object.assign({}, copingTapped);
                      newTapped[strat.title] = true;
                      upd('copingTapped', newTapped);
                      if (soundEnabled) sfxClick();
                      addToast(strat.title + ' \u2014 ' + strat.desc, 'info');
                      // Badge: coping_practitioner after tapping 3 different strategies
                      if (Object.keys(newTapped).length >= 3) tryAwardBadge('coping_practitioner');
                    },
                    style: {
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderRadius: 12, border: '1px solid ' + ACCENT_MED, background: '#0f172a',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                    }
                  },
                    h('span', { style: { fontSize: 24, flexShrink: 0 } }, strat.icon),
                    h('div', null,
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, strat.title),
                      h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 } }, strat.desc)
                    )
                  );
                })
              )
            ),

            // ══════════════════════════════════════════════════
            // ── Mood Playlist Generator (shown after save) ──
            // ══════════════════════════════════════════════════
            showCoping && MOOD_PLAYLIST[showCoping] && h('div', { style: { marginTop: 16, padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
                h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' } },
                  MOOD_PLAYLIST[showCoping].headerIcon + ' ' + MOOD_PLAYLIST[showCoping].header
                ),
                h('div', { style: { fontSize: 10, color: '#9ca3af' } },
                  countPlaylistCompleted(playlistCompleted) + ' activities completed'
                )
              ),
              showCoping <= 1 && h('div', { style: { fontSize: 12, color: '#ef4444', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444422', fontWeight: 600, lineHeight: 1.5 } },
                '\u26A0\uFE0F If you are in crisis, please reach out to a trusted adult, call 988, or text HOME to 741741. This feeling is temporary.'
              ),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 12 } },
                band === 'elementary' ? 'Try some of these activities to feel even better:' : 'Suggested activities based on your mood:'
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                MOOD_PLAYLIST[showCoping].activities.map(function(act, idx) {
                  var actKey = showCoping + '_' + act.label;
                  var isDone = !!playlistCompleted[actKey];
                  return h('div', {
                    key: idx,
                    style: {
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderRadius: 12, border: isDone ? '1px solid #22c55e44' : '1px solid #334155',
                      background: isDone ? '#22c55e11' : '#1e293b', transition: 'all 0.2s'
                    }
                  },
                    h('button', { 'aria-label': 'Toggle sound',
                      onClick: function() {
                        var newCompleted = Object.assign({}, playlistCompleted);
                        if (isDone) {
                          delete newCompleted[actKey];
                        } else {
                          newCompleted[actKey] = Date.now();
                        }
                        upd('playlistCompleted', newCompleted);
                        if (!isDone) {
                          if (soundEnabled) sfxCorrect();
                          awardXP(5);
                          addToast('Nice! Activity completed.', 'success');
                          // Badge: selfcare_practitioner after 5 completed
                          if (countPlaylistCompleted(newCompleted) >= 5) tryAwardBadge('selfcare_practitioner');
                        }
                      },
                      style: {
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        border: isDone ? '2px solid #22c55e' : '2px solid #475569',
                        background: isDone ? '#22c55e' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700, padding: 0
                      }
                    }, isDone ? '\u2713' : ''),
                    h('span', { style: { fontSize: 20, flexShrink: 0 } }, act.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 12, fontWeight: 600, color: isDone ? '#22c55e' : '#f1f5f9', marginBottom: 2, textDecoration: isDone ? 'line-through' : 'none' } }, act.label),
                      h('div', { style: { fontSize: 10, color: '#cbd5e1', lineHeight: 1.4 } }, act.desc)
                    )
                  );
                })
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════
        // ── TAB: Journal ──
        // ══════════════════════════════════════════════════════
        var journalContent = null;
        if (activeTab === 'journal') {
          var prompts = PROMPTS[band] || PROMPTS.elementary;
          var currentPrompt = prompts[jPromptIdx % prompts.length];

          // ── Journal sub-mode selector ──
          var LETTER_TIME_OPTIONS = [
            { id: '1week', label: '1 Week' },
            { id: '1month', label: '1 Month' },
            { id: '3months', label: '3 Months' }
          ];

          var journalSubTabs = h('div', { style: { display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { 'aria-label': 'Free Write',
              onClick: function() { upd({ letterMode: null, letterViewingPast: false }); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: !letterMode && !letterViewingPast ? '1px solid ' + ACCENT : '1px solid #334155',
                background: !letterMode && !letterViewingPast ? ACCENT_DIM : '#1e293b',
                color: !letterMode && !letterViewingPast ? ACCENT : '#94a3b8'
              }
            }, '\u270D\uFE0F Free Write'),
            h('button', { 'aria-label': 'Letter to Future Self',
              onClick: function() { upd({ letterMode: 'future', jViewingPast: false, letterViewingPast: false }); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: letterMode === 'future' ? '1px solid #22c55e' : '1px solid #334155',
                background: letterMode === 'future' ? '#22c55e22' : '#1e293b',
                color: letterMode === 'future' ? '#22c55e' : '#94a3b8'
              }
            }, '\uD83D\uDD2E Letter to Future Self'),
            h('button', { 'aria-label': 'Letter to Past Self',
              onClick: function() { upd({ letterMode: 'past', jViewingPast: false, letterViewingPast: false }); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: letterMode === 'past' ? '1px solid #f59e0b' : '1px solid #334155',
                background: letterMode === 'past' ? '#f59e0b22' : '#1e293b',
                color: letterMode === 'past' ? '#f59e0b' : '#94a3b8'
              }
            }, '\uD83D\uDC8C Letter to Past Self'),
            letterEntries.length > 0 && h('button', { 'aria-label': 'My Letters ( )',
              onClick: function() { upd({ letterViewingPast: true, letterMode: null, jViewingPast: false }); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: letterViewingPast ? '1px solid #8b5cf6' : '1px solid #334155',
                background: letterViewingPast ? '#8b5cf622' : '#1e293b',
                color: letterViewingPast ? '#8b5cf6' : '#94a3b8'
              }
            }, '\u2709\uFE0F My Letters (' + letterEntries.length + ')')
          );

          // ── Letter to Self UI ──
          var letterContent = null;
          if (letterMode === 'future' || letterMode === 'past') {
            var isFuture = letterMode === 'future';
            var letterColor = isFuture ? '#22c55e' : '#f59e0b';
            var letterPromptText = isFuture
              ? (band === 'elementary'
                ? 'Write a letter to the you of the future! What do you want to remember? What are you hoping for?'
                : 'Write a letter to your future self. What advice would you give? What do you want to remember about how you feel right now?')
              : (band === 'elementary'
                ? 'Write a letter to the younger you. What would you say to help yourself feel better?'
                : 'Write a letter to your past self. What encouragement, wisdom, or compassion would you offer?');

            letterContent = h('div', null,
              h('div', { style: { padding: 16, borderRadius: 14, background: letterColor + '11', border: '1px solid ' + letterColor + '44', marginBottom: 16, textAlign: 'center' } },
                h('div', { style: { fontSize: 28, marginBottom: 8 } }, isFuture ? '\uD83D\uDD2E' : '\uD83D\uDC8C'),
                h('div', { style: { fontSize: 14, fontWeight: 700, color: letterColor, marginBottom: 6 } },
                  isFuture ? 'Letter to Your Future Self' : 'Letter to Your Past Self'
                ),
                h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, letterPromptText)
              ),

              // Date picker for future letters
              isFuture && h('div', { style: { marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, fontWeight: 600 } }, 'When should future-you read this?'),
                h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
                  LETTER_TIME_OPTIONS.map(function(opt) {
                    var isActive = letterTimePeriod === opt.id;
                    return h('button', { 'aria-label': opt.label,
                      key: opt.id,
                      onClick: function() { upd('letterTimePeriod', opt.id); if (soundEnabled) sfxClick(); },
                      style: {
                        padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: isActive ? '2px solid ' + letterColor : '1px solid #334155',
                        background: isActive ? letterColor + '22' : '#1e293b',
                        color: isActive ? letterColor : '#94a3b8'
                      }
                    }, opt.label);
                  })
                )
              ),

              // Letter text area
              h('textarea', {
                value: letterText,
                'aria-label': 'Letter to self',
                onChange: function(e) { upd('letterText', e.target.value); },
                placeholder: isFuture ? 'Dear future me,...' : 'Dear younger me,...',
                rows: 10,
                style: { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid ' + letterColor + '44', background: '#0f172a', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }
              }),

              h('button', { 'aria-label': '1month',
                onClick: function() {
                  if (!letterText.trim()) { addToast('Write your letter first!', 'warning'); return; }
                  var readDate = null;
                  if (isFuture) {
                    var now = new Date();
                    if (letterTimePeriod === '1week') readDate = new Date(now.getTime() + 7 * 86400000).getTime();
                    else if (letterTimePeriod === '1month') readDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime();
                    else readDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).getTime();
                  }
                  var letterEntry = {
                    timestamp: Date.now(),
                    type: letterMode,
                    text: letterText,
                    readDate: readDate,
                    timePeriod: isFuture ? letterTimePeriod : null
                  };
                  var newLetters = letterEntries.concat([letterEntry]);
                  var totalJournalCount = journalEntries.length + newLetters.length;
                  upd({ letterEntries: newLetters, letterText: '', letterMode: null });
                  if (soundEnabled) sfxSave();
                  awardXP(20);
                  addToast(isFuture ? 'Letter sealed for future you!' : 'Letter to your past self saved!', 'success');
                  tryAwardBadge('letter_writer');
                  tryAwardBadge('first_journal');
                  if (totalJournalCount >= 20) tryAwardBadge('consistent_journaler');
                },
                disabled: !letterText.trim(),
                style: {
                  width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
                  background: letterText.trim() ? letterColor : '#334155', color: '#fff', fontWeight: 700,
                  fontSize: 14, cursor: letterText.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s'
                }
              }, isFuture ? '\uD83D\uDD12 Seal & Save Letter' : '\uD83D\uDCBE Save Letter')
            );
          }

          // ── Letter Viewer ──
          var letterViewerContent = null;
          if (letterViewingPast && letterEntries.length > 0) {
            letterViewerContent = h('div', null,
              letterEntries.slice().reverse().map(function(letter, i) {
                var isFutureLetter = letter.type === 'future';
                var letterCol = isFutureLetter ? '#22c55e' : '#f59e0b';
                var canRead = !isFutureLetter || !letter.readDate || Date.now() >= letter.readDate;
                var readDateStr = letter.readDate ? new Date(letter.readDate).toLocaleDateString() : null;

                return h('div', { key: i, style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + letterCol + '33', marginBottom: 12 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 18 } }, isFutureLetter ? '\uD83D\uDD2E' : '\uD83D\uDC8C'),
                      h('span', { style: { fontSize: 11, fontWeight: 700, color: letterCol } },
                        isFutureLetter ? 'To Future Self' : 'To Past Self'
                      )
                    ),
                    h('span', { style: { fontSize: 10, color: '#9ca3af' } }, new Date(letter.timestamp).toLocaleDateString())
                  ),
                  isFutureLetter && readDateStr && h('div', { style: { fontSize: 10, color: canRead ? '#22c55e' : '#f59e0b', marginBottom: 8, fontStyle: 'italic' } },
                    canRead ? '\uD83D\uDD13 Unlocked! (scheduled for ' + readDateStr + ')' : '\uD83D\uDD12 Sealed until ' + readDateStr
                  ),
                  canRead
                    ? h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 } }, letter.text)
                    : h('div', { style: { padding: 20, textAlign: 'center', borderRadius: 10, background: '#1e293b' } },
                        h('div', { style: { fontSize: 28, marginBottom: 8 } }, '\uD83D\uDD12'),
                        h('div', { style: { fontSize: 12, color: '#cbd5e1' } }, 'This letter is sealed until ' + readDateStr + '.'),
                        h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 4 } }, 'Be patient \u2014 future you will appreciate the wait!')
                      )
                );
              })
            );
          }

          journalContent = h('div', { style: { padding: 20, maxWidth: 520, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? '\u270D\uFE0F Write About Your Feelings' : '\u270D\uFE0F Free-Write Journal'
            ),

            // Sub-tab navigation
            journalSubTabs,

            // Letter viewing mode
            letterViewingPast && letterEntries.length > 0 ? letterViewerContent :

            // Letter writing mode
            (letterMode === 'future' || letterMode === 'past') ? letterContent :

            // Standard journal mode
            (!jViewingPast ? h('div', null,

              // Prompt carousel
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'center' } },
                h('div', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Writing Prompt'),
                h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' } }, '\u201C' + currentPrompt + '\u201D'),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8 } },
                  h('button', { 'aria-label': 'Prev',
                    onClick: function() { upd('jPromptIdx', (jPromptIdx - 1 + prompts.length) % prompts.length); if (soundEnabled) sfxClick(); },
                    style: { padding: '4px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }
                  }, '\u2190 Prev'),
                  h('button', { 'aria-label': 'Next',
                    onClick: function() { upd('jPromptIdx', (jPromptIdx + 1) % prompts.length); if (soundEnabled) sfxClick(); },
                    style: { padding: '4px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }
                  }, 'Next \u2192')
                ),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function() { speak(currentPrompt); },
                  style: { marginTop: 8, background: 'none', border: 'none', color: ACCENT, fontSize: 10, cursor: 'pointer' }
                }, '\uD83D\uDD0A Read aloud')
              ),

              // Text area
              h('textarea', {
                value: jText,
                'aria-label': 'Journal entry',
                onChange: function(e) { upd('jText', e.target.value); },
                placeholder: band === 'elementary' ? 'Start writing here... You can use the prompt above or write about anything!' : 'Write freely. Use the prompt above as a starting point, or write about whatever is on your mind...',
                rows: 8,
                style: { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }
              }),

              h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
                h('button', { 'aria-label': 'Save Entry',
                  onClick: function() {
                    if (!jText.trim()) { addToast('Write something first!', 'warning'); return; }
                    var entry = { timestamp: Date.now(), prompt: currentPrompt, text: jText };
                    var newEntries = journalEntries.concat([entry]);
                    var totalJournalCount = newEntries.length + letterEntries.length;
                    upd({ journalEntries: newEntries, jText: '', jPromptIdx: (jPromptIdx + 1) % prompts.length });
                    if (soundEnabled) sfxSave();
                    awardXP(15);
                    addToast('Journal entry saved!', 'success');
                    tryAwardBadge('first_journal');
                    if (newEntries.length >= 3) tryAwardBadge('deep_writer');
                    if (uniquePromptsUsed(newEntries) >= 10) tryAwardBadge('prompt_master');
                    if (totalJournalCount >= 20) tryAwardBadge('consistent_journaler');
                  },
                  disabled: !jText.trim(),
                  style: {
                    flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
                    background: jText.trim() ? ACCENT : '#334155', color: '#fff', fontWeight: 700,
                    fontSize: 13, cursor: jText.trim() ? 'pointer' : 'not-allowed'
                  }
                }, '\uD83D\uDCBE Save Entry'),
                journalEntries.length > 0 && h('button', { 'aria-label': 'Past ( )',
                  onClick: function() { upd('jViewingPast', true); if (soundEnabled) sfxClick(); },
                  style: { padding: '12px 16px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: 'transparent', color: ACCENT, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, '\uD83D\uDCC3 Past (' + journalEntries.length + ')')
              )
            ) :

            // Past entries viewer
            h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 16 } },
                h('button', { 'aria-label': 'Past Journal Entries ( )',
                  onClick: function() { upd('jViewingPast', false); if (soundEnabled) sfxClick(); },
                  style: { background: 'none', border: 'none', color: ACCENT, fontSize: 14, cursor: 'pointer', marginRight: 8 }
                }, '\u2190'),
                h('h3', { style: { color: '#f1f5f9', fontSize: 16, margin: 0 } }, 'Past Journal Entries (' + journalEntries.length + ')')
              ),
              journalEntries.slice().reverse().map(function(entry, i) {
                return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                    h('span', { style: { fontSize: 10, color: ACCENT, fontWeight: 600 } }, new Date(entry.timestamp).toLocaleDateString()),
                    h('span', { style: { fontSize: 10, color: '#9ca3af' } }, new Date(entry.timestamp).toLocaleTimeString())
                  ),
                  h('p', { style: { fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', marginBottom: 6 } }, 'Prompt: \u201C' + entry.prompt + '\u201D'),
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, entry.text)
                );
              })
            ))
          );
        }

        // ══════════════════════════════════════════════════════
        // ── TAB: Calendar ──
        // ══════════════════════════════════════════════════════
        var calendarContent = null;
        if (activeTab === 'calendar') {
          // Badge: calendar_viewer on first visit
          if (!earnedBadges['calendar_viewer']) {
            tryAwardBadge('calendar_viewer');
          }

          var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          var DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          var daysInMonth = getMonthDays(calYear, calMonth);
          var firstDay = getFirstDayOfWeek(calYear, calMonth);

          // Build mood map for month: dayNum -> avgMood
          var monthMoodMap = {};
          checkIns.forEach(function(ci) {
            var ciDate = new Date(ci.timestamp);
            if (ciDate.getFullYear() === calYear && ciDate.getMonth() === calMonth) {
              var dayNum = ciDate.getDate();
              if (!monthMoodMap[dayNum]) monthMoodMap[dayNum] = [];
              monthMoodMap[dayNum].push(ci.mood);
            }
          });

          // Build calendar grid cells
          var calCells = [];
          // Empty cells before first day
          for (var ei = 0; ei < firstDay; ei++) {
            calCells.push(h('div', { key: 'empty-' + ei, style: { width: 36, height: 36 } }));
          }
          // Day cells
          var todayDate = new Date();
          for (var dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            (function(dn) {
              var moods = monthMoodMap[dn] || [];
              var avgMood = 0;
              if (moods.length > 0) {
                var s = 0;
                moods.forEach(function(m) { s += m; });
                avgMood = Math.round(s / moods.length);
              }
              var moodObj = avgMood > 0 ? MOODS.find(function(m) { return m.id === avgMood; }) : null;
              var isToday = calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth() && dn === todayDate.getDate();

              calCells.push(h('div', {
                key: 'day-' + dn,
                style: {
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', fontSize: 11, fontWeight: isToday ? 700 : 400, position: 'relative',
                  background: moodObj ? moodObj.color + '33' : 'transparent',
                  border: isToday ? '2px solid ' + ACCENT : '1px solid transparent',
                  color: moodObj ? moodObj.color : '#64748b'
                },
                title: moodObj ? moodObj.label + ' (' + moods.length + ' check-in' + (moods.length > 1 ? 's' : '') + ')' : 'No check-in'
              },
                moodObj ? h('span', { style: { fontSize: 18 } }, moodObj.emoji) : String(dn)
              ));
            })(dayNum);
          }

          // Weekly Summary
          var weeklySummary = getWeeklySummary(checkIns);

          calendarContent = h('div', { style: { padding: 20, maxWidth: 520, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCC5 Mood Calendar'),

            // Month navigation
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
              h('button', { 'aria-label': MONTH_NAMES[calMonth] + ' ' + calYear,
                onClick: function() {
                  var nm = calMonth - 1;
                  var ny = calYear;
                  if (nm < 0) { nm = 11; ny--; }
                  upd({ calMonth: nm, calYear: ny });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', fontSize: 14, cursor: 'pointer' }
              }, '\u2190'),
              h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, MONTH_NAMES[calMonth] + ' ' + calYear),
              h('button', { 'aria-label': m.label,
                onClick: function() {
                  var nm = calMonth + 1;
                  var ny = calYear;
                  if (nm > 11) { nm = 0; ny++; }
                  upd({ calMonth: nm, calYear: ny });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', fontSize: 14, cursor: 'pointer' }
              }, '\u2192')
            ),

            // Legend
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
              MOODS.map(function(m) {
                return h('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: 4 } },
                  h('div', { style: { width: 10, height: 10, borderRadius: '50%', background: m.color } }),
                  h('span', { style: { fontSize: 10, color: '#cbd5e1' } }, m.label)
                );
              })
            ),

            // Calendar grid
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
              // Day headers
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 } },
                DAY_HEADERS.map(function(dh) {
                  return h('div', { key: dh, style: { textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, padding: 4 } }, dh);
                })
              ),
              // Day cells
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, justifyItems: 'center' } },
                calCells
              )
            ),

            // Monthly Stats
            h('div', { style: { padding: 14, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
              h('div', { style: { fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginBottom: 8 } }, 'Monthly Stats'),
              h('div', { style: { display: 'flex', justifyContent: 'space-around' } },
                h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' } }, Object.keys(monthMoodMap).length),
                  h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Days Tracked')
                ),
                h('div', { style: { textAlign: 'center' } },
                  (function() {
                    var totalM = 0; var countM = 0;
                    Object.keys(monthMoodMap).forEach(function(k) {
                      monthMoodMap[k].forEach(function(m) { totalM += m; countM++; });
                    });
                    var avgM = countM > 0 ? Math.round(totalM / countM * 10) / 10 : 0;
                    var avgObj = avgM > 0 ? MOODS.find(function(m) { return m.id === Math.round(avgM); }) : null;
                    return [
                      h('div', { key: 'avg', style: { fontSize: 20, fontWeight: 700, color: avgObj ? avgObj.color : '#64748b' } }, avgM > 0 ? avgM.toFixed(1) : '\u2014'),
                      h('div', { key: 'lbl', style: { fontSize: 10, color: '#cbd5e1' } }, 'Avg Mood')
                    ];
                  })()
                ),
                h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' } },
                    (function() {
                      var c = 0;
                      Object.keys(monthMoodMap).forEach(function(k) { c += monthMoodMap[k].length; });
                      return c;
                    })()
                  ),
                  h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Check-Ins')
                )
              )
            ),

            // Weekly Summary
            h('div', { style: { padding: 14, borderRadius: 14, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 8 } }, '\uD83D\uDCCB Weekly Summary'),
              weeklySummary ? h('div', null,
                (function() {
                  if (!earnedBadges['weekly_reviewer']) tryAwardBadge('weekly_reviewer');
                  return null;
                })(),
                h('div', { style: { display: 'flex', justifyContent: 'space-around', marginBottom: 12 } },
                  h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, weeklySummary.avgMood.toFixed(1)),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Avg Mood')
                  ),
                  h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, weeklySummary.avgEnergy.toFixed(1)),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Avg Energy')
                  ),
                  h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 16, fontWeight: 700, color: weeklySummary.trajectory === 'improving' ? '#22c55e' : weeklySummary.trajectory === 'declining' ? '#f97316' : '#eab308' } },
                      weeklySummary.trajectory === 'improving' ? '\u2197\uFE0F' : weeklySummary.trajectory === 'declining' ? '\u2198\uFE0F' : '\u2192\uFE0F'
                    ),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, weeklySummary.trajectory.charAt(0).toUpperCase() + weeklySummary.trajectory.slice(1))
                  )
                ),
                weeklySummary.topTriggers.length > 0 && h('div', { style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, 'Top triggers:'),
                  h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                    weeklySummary.topTriggers.map(function(t) {
                      return h('span', { key: t, style: { padding: '3px 10px', borderRadius: 12, background: '#1e293b', color: ACCENT, fontSize: 11, fontWeight: 500 } }, t);
                    })
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 10, background: '#0f172a', marginTop: 8 } },
                  h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.5, margin: 0, fontStyle: 'italic' } }, weeklySummary.encouragement)
                )
              ) :
              h('div', { style: { fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: 12 } },
                'Check in at least 3 times this week to see your summary!'
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════
        // ── TAB: Insights ──
        // ══════════════════════════════════════════════════════
        var insightsContent = null;
        if (activeTab === 'insights') {
          // Badge: pattern_spotter on first visit
          if (!earnedBadges['pattern_spotter'] && checkIns.length > 0) {
            tryAwardBadge('pattern_spotter');
          }

          // Last 7 days mood data
          var last7 = [];
          for (var di = 6; di >= 0; di--) {
            var dayTs = Date.now() - (di * 86400000);
            var dayStr = dateKey(dayTs);
            var dayDate = new Date(dayTs);
            var dayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayDate.getDay()];
            var dayEntries = checkIns.filter(function(ci) { return dateKey(ci.timestamp) === dayStr; });
            var avgMood = 0;
            if (dayEntries.length > 0) {
              var sum = 0;
              dayEntries.forEach(function(ci) { sum += ci.mood; });
              avgMood = Math.round(sum / dayEntries.length);
            }
            last7.push({ label: dayLabel, mood: avgMood, count: dayEntries.length });
          }

          // Trigger frequency
          var triggerFreq = {};
          checkIns.forEach(function(ci) {
            (ci.triggers || []).forEach(function(t) { triggerFreq[t] = (triggerFreq[t] || 0) + 1; });
          });
          var sortedTriggers = Object.keys(triggerFreq).sort(function(a, b) { return triggerFreq[b] - triggerFreq[a]; });

          // Mood distribution
          var moodDist = {};
          MOODS.forEach(function(m) { moodDist[m.id] = 0; });
          checkIns.forEach(function(ci) { moodDist[ci.mood] = (moodDist[ci.mood] || 0) + 1; });

          insightsContent = h('div', { style: { padding: 20, maxWidth: 520, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Mood Insights'),

            checkIns.length === 0 ? h('div', { style: { textAlign: 'center', padding: 40, color: '#9ca3af' } },
              h('div', { style: { fontSize: 40, marginBottom: 12 } }, '\uD83D\uDCCA'),
              h('p', { style: { fontSize: 13 } }, 'No data yet! Complete your first check-in to see insights here.')
            ) :

            h('div', null,
              // Streak counter
              h('div', { style: { textAlign: 'center', padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
                h('div', { style: { fontSize: 32, fontWeight: 700, color: streak > 0 ? '#f59e0b' : '#64748b' } },
                  streak > 0 ? '\uD83D\uDD25 ' + streak : '0'
                ),
                h('div', { style: { fontSize: 12, color: '#cbd5e1' } }, 'Day Streak'),
                h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 4 } }, checkIns.length + ' total check-ins')
              ),

              // 7-day mood trend
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginBottom: 12 } }, 'Last 7 Days'),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingBottom: 4 } },
                  last7.map(function(day, i) {
                    var barH = day.mood > 0 ? (day.mood / 5 * 80) : 4;
                    var moodObj = MOODS.find(function(m) { return m.id === day.mood; });
                    var barColor = moodObj ? moodObj.color : '#334155';
                    return h('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 } },
                      day.mood > 0 && h('span', { style: { fontSize: 16 } }, moodObj ? moodObj.emoji : ''),
                      h('div', { style: { width: 24, height: barH, borderRadius: 6, background: barColor, transition: 'height 0.3s' } }),
                      h('span', { style: { fontSize: 10, color: '#9ca3af' } }, day.label)
                    );
                  })
                )
              ),

              // Mood distribution
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginBottom: 10 } }, 'Mood Distribution'),
                MOODS.map(function(m) {
                  var count = moodDist[m.id] || 0;
                  var pct = checkIns.length > 0 ? Math.round(count / checkIns.length * 100) : 0;
                  return h('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { style: { fontSize: 18, width: 28, textAlign: 'center' } }, m.emoji),
                    h('div', { style: { flex: 1, height: 16, borderRadius: 8, background: '#1e293b', overflow: 'hidden' } },
                      h('div', { style: { width: pct + '%', height: '100%', borderRadius: 8, background: m.color, transition: 'width 0.3s' } })
                    ),
                    h('span', { style: { fontSize: 11, color: '#cbd5e1', minWidth: 40, textAlign: 'right' } }, count + ' (' + pct + '%)')
                  );
                })
              ),

              // Trigger frequency
              sortedTriggers.length > 0 && h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginBottom: 10 } }, 'Most Common Triggers'),
                sortedTriggers.map(function(tag) {
                  return h('div', { key: tag, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' } },
                    h('span', { style: { fontSize: 13, color: '#e2e8f0' } }, tag),
                    h('span', { style: { fontSize: 12, color: ACCENT, fontWeight: 600 } }, triggerFreq[tag] + 'x')
                  );
                })
              ),

              // ── Mood Patterns AI Analysis ──
              (function() {
                var patterns = generateMoodPatternAnalysis(checkIns);
                if (!patterns) {
                  var needed = 5 - checkIns.length;
                  if (needed > 0) {
                    return h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                      h('div', { style: { fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginBottom: 8 } }, '\uD83D\uDD0E Mood Pattern Analysis'),
                      h('div', { style: { textAlign: 'center', padding: 12, fontSize: 12, color: '#9ca3af' } },
                        'Need ' + needed + ' more check-in' + (needed !== 1 ? 's' : '') + ' to unlock pattern analysis!'
                      )
                    );
                  }
                  return null;
                }
                // Badge: mood_detective on first view of patterns
                if (!earnedBadges['mood_detective']) tryAwardBadge('mood_detective');

                return h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #8b5cf644', marginBottom: 16 } },
                  h('div', { style: { fontSize: 12, color: '#8b5cf6', fontWeight: 700, marginBottom: 12 } }, '\uD83D\uDD0E Mood Pattern Analysis'),
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                    patterns.map(function(p, idx) {
                      return h('div', { key: idx, style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155' } },
                        h('span', { style: { fontSize: 18, flexShrink: 0, marginTop: 2 } }, p.icon),
                        h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.5, margin: 0 } }, p.text)
                      );
                    })
                  ),
                  h('div', { style: { marginTop: 10, fontSize: 10, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' } },
                    'Based on ' + checkIns.length + ' check-ins. More data = better patterns!'
                  )
                );
              })(),

              // ── Emotion Vocabulary Summary ──
              (function() {
                var vocabWords = getEmotionWordsList(checkIns);
                var vocabCount = vocabWords.length;
                if (vocabCount === 0) return null;
                return h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginBottom: 10 } },
                    '\uD83D\uDCDA Emotion Vocabulary (' + vocabCount + ' word' + (vocabCount !== 1 ? 's' : '') + ')'
                  ),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                    vocabWords.map(function(word) {
                      return h('span', { key: word, style: { padding: '4px 10px', borderRadius: 12, background: ACCENT_DIM, color: ACCENT, fontSize: 11, fontWeight: 500 } }, word);
                    })
                  ),
                  vocabCount >= 10 && h('div', { style: { marginTop: 8, fontSize: 11, color: '#22c55e', fontWeight: 600, textAlign: 'center' } },
                    '\u2605 Emotion Wordsmith! You\u2019ve used 10+ feeling words.'
                  ),
                  vocabCount < 10 && h('div', { style: { marginTop: 8 } },
                    h('div', { style: { width: '100%', height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' } },
                      h('div', { style: { width: Math.round(vocabCount / 10 * 100) + '%', height: '100%', borderRadius: 3, background: ACCENT, transition: 'width 0.3s' } })
                    ),
                    h('div', { style: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 4 } },
                      vocabCount + '/10 words toward Emotion Wordsmith badge'
                    )
                  )
                );
              })(),

              // AI Insight
              h('div', { style: { padding: 16, borderRadius: 14, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 8 } }, '\uD83E\uDD16 AI-Powered Insight'),
                aiInsight ? h('div', null,
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, aiInsight),
                  callTTS && h('button', { 'aria-label': 'Read aloud',
                    onClick: function() { speak(aiInsight); },
                    style: { marginTop: 6, background: 'none', border: 'none', color: ACCENT, fontSize: 10, cursor: 'pointer' }
                  }, '\uD83D\uDD0A Read aloud')
                ) :
                h('button', { 'aria-label': 'thoughtful and empowering',
                  onClick: function() {
                    if (!callGemini || aiLoading || checkIns.length < 2) {
                      if (checkIns.length < 2) addToast('Need at least 2 check-ins for AI insights!', 'warning');
                      return;
                    }
                    upd('aiLoading', true);
                    var moodSummary = checkIns.slice(-10).map(function(ci) {
                      var mObj = MOODS.find(function(m) { return m.id === ci.mood; });
                      return (mObj ? mObj.label : 'Unknown') + ' (triggers: ' + (ci.triggers || []).join(', ') + ')';
                    }).join('; ');
                    var prompt = 'You are a supportive SEL coach for a ' + band + ' school student. Based on their recent mood check-ins: [' + moodSummary + ']. Provide a brief, warm, ' +
                      (band === 'elementary' ? 'simple and encouraging' : band === 'middle' ? 'relatable and supportive' : 'thoughtful and empowering') +
                      ' insight about patterns you notice. Keep it to 2-3 sentences. Be specific about what you observe. Do NOT diagnose or give medical advice.';
                    callGemini(prompt, false, false, 0.8).then(function(resp) {
                      upd({ aiInsight: resp, aiLoading: false });
                      awardXP(10);
                      tryAwardBadge('ai_reflector');
                      addToast('Insight generated!', 'success');
                    }).catch(function() {
                      upd('aiLoading', false);
                      addToast('Could not generate insight. Try again.', 'error');
                    });
                  },
                  disabled: aiLoading || checkIns.length < 2,
                  style: {
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: checkIns.length >= 2 ? ACCENT : '#334155', color: '#fff',
                    fontWeight: 600, fontSize: 12, cursor: checkIns.length >= 2 ? 'pointer' : 'not-allowed'
                  }
                }, aiLoading ? '\u23F3 Analyzing patterns...' : '\u2728 Generate Insight')
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════
        // ── TAB: Badges ──
        // ══════════════════════════════════════════════════════
        var badgesContent = null;
        if (activeTab === 'badges') {
          var earnedCount = Object.keys(earnedBadges).length;

          badgesContent = h('div', { style: { padding: 20, maxWidth: 520, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFC5 Badges'),
            h('div', { style: { textAlign: 'center', marginBottom: 16, fontSize: 12, color: '#cbd5e1' } },
              earnedCount + ' of ' + BADGES.length + ' earned'
            ),
            h('div', { style: { textAlign: 'center', marginBottom: 20 } },
              h('div', { style: { width: '100%', height: 8, borderRadius: 4, background: '#1e293b', overflow: 'hidden' } },
                h('div', { style: { width: Math.round(earnedCount / BADGES.length * 100) + '%', height: '100%', borderRadius: 4, background: ACCENT, transition: 'width 0.3s' } })
              )
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', { key: b.id, style: {
                  padding: 16, borderRadius: 14, textAlign: 'center',
                  background: earned ? '#0f172a' : '#0f172a88',
                  border: '1px solid ' + (earned ? ACCENT_MED : '#334155'),
                  opacity: earned ? 1 : 0.5,
                  transition: 'all 0.2s'
                } },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, b.icon),
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: earned ? '#f1f5f9' : '#64748b', marginBottom: 2 } }, b.name),
                  h('div', { style: { fontSize: 10, color: earned ? '#94a3b8' : '#475569', lineHeight: 1.4 } }, b.desc),
                  earned && h('div', { style: { fontSize: 11, color: ACCENT, marginTop: 4 } }, '\u2713 ' + new Date(earnedBadges[b.id]).toLocaleDateString())
                );
              })
            )
          );
        }

        // ══════════════════════════════════════════════════════
        // ── Final Render ──
        // ══════════════════════════════════════════════════════
        var content = checkinContent || journalContent || calendarContent || insightsContent || badgesContent;

        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
          tabBar,
          badgePopup,
          h('div', { style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });
})();

console.log('[SelHub] sel_tool_journal.js loaded');
