// ═══════════════════════════════════════════════════════════════
// sel_tool_journal.js — Feelings Journal Plugin (v2.0)
// Daily mood check-ins, free-write journaling, mood analytics,
// AI-powered insight generation, coping strategies, mood calendar,
// weekly summaries, sub-emotions, and achievement badges.
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
    { id: 'prompt_master',    icon: '\uD83C\uDFA8', name: 'Prompt Master',      desc: 'Use 10 or more different writing prompts' }
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
          if (callTTS) callTTS(text).then(function(url) { if (url) { var a = new Audio(url); a.play().catch(function() {}); } }).catch(function() {});
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

        var tabBar = h('div', { style: { display: 'flex', borderBottom: '1px solid #1e293b', padding: '0 8px', alignItems: 'center', flexShrink: 0 } },
          TABS.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', {
              key: t.id,
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: {
                padding: '10px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500,
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8', transition: 'all 0.15s',
                borderBottom: isActive ? '2px solid ' + ACCENT : '2px solid transparent', borderRadius: 0
              }
            }, t.icon + ' ' + t.label);
          }),
          h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b' }, title: soundEnabled ? 'Mute' : 'Unmute' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
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
                h('div', { style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
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
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'Pick the face that matches how you feel:' : 'Select your current mood:'
              ),
              h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10 } },
                MOODS.map(function(m) {
                  var isSelected = ciMood === m.id;
                  return h('button', {
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
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textAlign: 'center', fontWeight: 500 } },
                  band === 'elementary' ? 'Can you pick a more specific feeling? (optional)' : 'More specifically, you feel... (optional)'
                ),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
                  SUB_EMOTIONS[ciMood].map(function(sub) {
                    var isSel = ciSubEmotion === sub.label;
                    var moodColor = MOODS.find(function(m) { return m.id === ciMood; });
                    var col = moodColor ? moodColor.color : ACCENT;
                    return h('button', {
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
                )
              )
            ),

            // Energy slider
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'How much energy do you have?' : 'Energy level:'
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 11, color: '#64748b', minWidth: 50 } }, '\uD83D\uDCA4 Low'),
                h('input', {
                  type: 'range', min: 1, max: 5, value: ciEnergy,
                  onChange: function(e) { upd('ciEnergy', parseInt(e.target.value)); },
                  style: { flex: 1, accentColor: ACCENT }
                }),
                h('span', { style: { fontSize: 11, color: '#64748b', minWidth: 50, textAlign: 'right' } }, '\u26A1 High')
              ),
              h('div', { style: { textAlign: 'center', fontSize: 11, color: ACCENT, marginTop: 4 } }, energyLabels[ciEnergy - 1])
            ),

            // Thoughts input
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'What\u2019s on your mind right now?' : 'What\u2019s on your mind?'
              ),
              h('textarea', {
                value: ciThoughts,
                onChange: function(e) { upd('ciThoughts', e.target.value); },
                placeholder: band === 'elementary' ? 'I feel this way because...' : 'Describe what\u2019s going on...',
                rows: 3,
                style: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
              })
            ),

            // Trigger tags
            h('div', { style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? 'What is this about? (pick any that fit)' : 'Context / triggers (select all that apply):'
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                TRIGGER_TAGS.map(function(tag) {
                  var isOn = ciTriggers.indexOf(tag) !== -1;
                  return h('button', {
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
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 } },
                band === 'elementary' ? '\uD83D\uDE4F One thing I\u2019m grateful for today:' : '\uD83D\uDE4F One thing I\u2019m grateful for today...'
              ),
              h('input', {
                type: 'text', value: ciGratitude,
                onChange: function(e) { upd('ciGratitude', e.target.value); },
                placeholder: band === 'elementary' ? 'I\u2019m thankful for...' : 'Something I appreciate...',
                style: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
              })
            ),

            // Save button
            h('button', {
              onClick: function() {
                if (ciMood == null) { addToast('Please select a mood first!', 'warning'); return; }
                var entry = {
                  timestamp: Date.now(),
                  mood: ciMood,
                  energy: ciEnergy,
                  thoughts: ciThoughts,
                  triggers: ciTriggers.slice(),
                  gratitude: ciGratitude,
                  subEmotion: ciSubEmotion || null
                };
                var newCheckIns = checkIns.concat([entry]);
                upd({
                  checkIns: newCheckIns,
                  ciMood: null, ciEnergy: 3, ciThoughts: '', ciTriggers: [], ciGratitude: '',
                  ciSubEmotion: null, showCoping: ciMood
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
                h('button', {
                  onClick: function() { upd('showCoping', false); },
                  style: { background: 'none', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer' }
                }, '\u2715')
              ),
              showCoping <= 1 && h('div', { style: { fontSize: 12, color: '#ef4444', marginBottom: 10, fontWeight: 600 } },
                'You are not alone. These resources are here for you.'
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                COPING_STRATEGIES[showCoping].map(function(strat, idx) {
                  return h('button', {
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
                      h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4 } }, strat.desc)
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

          journalContent = h('div', { style: { padding: 20, maxWidth: 520, margin: '0 auto' } },
            !jViewingPast ? h('div', null,
              h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } },
                band === 'elementary' ? '\u270D\uFE0F Write About Your Feelings' : '\u270D\uFE0F Free-Write Journal'
              ),

              // Prompt carousel
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'center' } },
                h('div', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Writing Prompt'),
                h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' } }, '\u201C' + currentPrompt + '\u201D'),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8 } },
                  h('button', {
                    onClick: function() { upd('jPromptIdx', (jPromptIdx - 1 + prompts.length) % prompts.length); if (soundEnabled) sfxClick(); },
                    style: { padding: '4px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
                  }, '\u2190 Prev'),
                  h('button', {
                    onClick: function() { upd('jPromptIdx', (jPromptIdx + 1) % prompts.length); if (soundEnabled) sfxClick(); },
                    style: { padding: '4px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
                  }, 'Next \u2192')
                ),
                callTTS && h('button', {
                  onClick: function() { speak(currentPrompt); },
                  style: { marginTop: 8, background: 'none', border: 'none', color: ACCENT, fontSize: 10, cursor: 'pointer' }
                }, '\uD83D\uDD0A Read aloud')
              ),

              // Text area
              h('textarea', {
                value: jText,
                onChange: function(e) { upd('jText', e.target.value); },
                placeholder: band === 'elementary' ? 'Start writing here... You can use the prompt above or write about anything!' : 'Write freely. Use the prompt above as a starting point, or write about whatever is on your mind...',
                rows: 8,
                style: { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }
              }),

              h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
                h('button', {
                  onClick: function() {
                    if (!jText.trim()) { addToast('Write something first!', 'warning'); return; }
                    var entry = { timestamp: Date.now(), prompt: currentPrompt, text: jText };
                    var newEntries = journalEntries.concat([entry]);
                    upd({ journalEntries: newEntries, jText: '', jPromptIdx: (jPromptIdx + 1) % prompts.length });
                    if (soundEnabled) sfxSave();
                    awardXP(15);
                    addToast('Journal entry saved!', 'success');
                    tryAwardBadge('first_journal');
                    if (newEntries.length >= 3) tryAwardBadge('deep_writer');
                    if (uniquePromptsUsed(newEntries) >= 10) tryAwardBadge('prompt_master');
                  },
                  disabled: !jText.trim(),
                  style: {
                    flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
                    background: jText.trim() ? ACCENT : '#334155', color: '#fff', fontWeight: 700,
                    fontSize: 13, cursor: jText.trim() ? 'pointer' : 'not-allowed'
                  }
                }, '\uD83D\uDCBE Save Entry'),
                journalEntries.length > 0 && h('button', {
                  onClick: function() { upd('jViewingPast', true); if (soundEnabled) sfxClick(); },
                  style: { padding: '12px 16px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: 'transparent', color: ACCENT, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, '\uD83D\uDCC3 Past (' + journalEntries.length + ')')
              )
            ) :

            // Past entries viewer
            h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 16 } },
                h('button', {
                  onClick: function() { upd('jViewingPast', false); if (soundEnabled) sfxClick(); },
                  style: { background: 'none', border: 'none', color: ACCENT, fontSize: 14, cursor: 'pointer', marginRight: 8 }
                }, '\u2190'),
                h('h3', { style: { color: '#f1f5f9', fontSize: 16, margin: 0 } }, 'Past Journal Entries (' + journalEntries.length + ')')
              ),
              journalEntries.slice().reverse().map(function(entry, i) {
                return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                    h('span', { style: { fontSize: 10, color: ACCENT, fontWeight: 600 } }, new Date(entry.timestamp).toLocaleDateString()),
                    h('span', { style: { fontSize: 10, color: '#64748b' } }, new Date(entry.timestamp).toLocaleTimeString())
                  ),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 } }, 'Prompt: \u201C' + entry.prompt + '\u201D'),
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, entry.text)
                );
              })
            )
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
              h('button', {
                onClick: function() {
                  var nm = calMonth - 1;
                  var ny = calYear;
                  if (nm < 0) { nm = 11; ny--; }
                  upd({ calMonth: nm, calYear: ny });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 14, cursor: 'pointer' }
              }, '\u2190'),
              h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, MONTH_NAMES[calMonth] + ' ' + calYear),
              h('button', {
                onClick: function() {
                  var nm = calMonth + 1;
                  var ny = calYear;
                  if (nm > 11) { nm = 0; ny++; }
                  upd({ calMonth: nm, calYear: ny });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 14, cursor: 'pointer' }
              }, '\u2192')
            ),

            // Legend
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
              MOODS.map(function(m) {
                return h('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: 4 } },
                  h('div', { style: { width: 10, height: 10, borderRadius: '50%', background: m.color } }),
                  h('span', { style: { fontSize: 10, color: '#94a3b8' } }, m.label)
                );
              })
            ),

            // Calendar grid
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
              // Day headers
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 } },
                DAY_HEADERS.map(function(dh) {
                  return h('div', { key: dh, style: { textAlign: 'center', fontSize: 10, color: '#64748b', fontWeight: 600, padding: 4 } }, dh);
                })
              ),
              // Day cells
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, justifyItems: 'center' } },
                calCells
              )
            ),

            // Monthly Stats
            h('div', { style: { padding: 14, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 } }, 'Monthly Stats'),
              h('div', { style: { display: 'flex', justifyContent: 'space-around' } },
                h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' } }, Object.keys(monthMoodMap).length),
                  h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Days Tracked')
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
                      h('div', { key: 'lbl', style: { fontSize: 10, color: '#94a3b8' } }, 'Avg Mood')
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
                  h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Check-Ins')
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
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Avg Mood')
                  ),
                  h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, weeklySummary.avgEnergy.toFixed(1)),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Avg Energy')
                  ),
                  h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 16, fontWeight: 700, color: weeklySummary.trajectory === 'improving' ? '#22c55e' : weeklySummary.trajectory === 'declining' ? '#f97316' : '#eab308' } },
                      weeklySummary.trajectory === 'improving' ? '\u2197\uFE0F' : weeklySummary.trajectory === 'declining' ? '\u2198\uFE0F' : '\u2192\uFE0F'
                    ),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, weeklySummary.trajectory.charAt(0).toUpperCase() + weeklySummary.trajectory.slice(1))
                  )
                ),
                weeklySummary.topTriggers.length > 0 && h('div', { style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Top triggers:'),
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
              h('div', { style: { fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 12 } },
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

            checkIns.length === 0 ? h('div', { style: { textAlign: 'center', padding: 40, color: '#64748b' } },
              h('div', { style: { fontSize: 40, marginBottom: 12 } }, '\uD83D\uDCCA'),
              h('p', { style: { fontSize: 13 } }, 'No data yet! Complete your first check-in to see insights here.')
            ) :

            h('div', null,
              // Streak counter
              h('div', { style: { textAlign: 'center', padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
                h('div', { style: { fontSize: 32, fontWeight: 700, color: streak > 0 ? '#f59e0b' : '#64748b' } },
                  streak > 0 ? '\uD83D\uDD25 ' + streak : '0'
                ),
                h('div', { style: { fontSize: 12, color: '#94a3b8' } }, 'Day Streak'),
                h('div', { style: { fontSize: 11, color: '#64748b', marginTop: 4 } }, checkIns.length + ' total check-ins')
              ),

              // 7-day mood trend
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 12 } }, 'Last 7 Days'),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingBottom: 4 } },
                  last7.map(function(day, i) {
                    var barH = day.mood > 0 ? (day.mood / 5 * 80) : 4;
                    var moodObj = MOODS.find(function(m) { return m.id === day.mood; });
                    var barColor = moodObj ? moodObj.color : '#334155';
                    return h('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 } },
                      day.mood > 0 && h('span', { style: { fontSize: 16 } }, moodObj ? moodObj.emoji : ''),
                      h('div', { style: { width: 24, height: barH, borderRadius: 6, background: barColor, transition: 'height 0.3s' } }),
                      h('span', { style: { fontSize: 10, color: '#64748b' } }, day.label)
                    );
                  })
                )
              ),

              // Mood distribution
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 10 } }, 'Mood Distribution'),
                MOODS.map(function(m) {
                  var count = moodDist[m.id] || 0;
                  var pct = checkIns.length > 0 ? Math.round(count / checkIns.length * 100) : 0;
                  return h('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { style: { fontSize: 18, width: 28, textAlign: 'center' } }, m.emoji),
                    h('div', { style: { flex: 1, height: 16, borderRadius: 8, background: '#1e293b', overflow: 'hidden' } },
                      h('div', { style: { width: pct + '%', height: '100%', borderRadius: 8, background: m.color, transition: 'width 0.3s' } })
                    ),
                    h('span', { style: { fontSize: 11, color: '#94a3b8', minWidth: 40, textAlign: 'right' } }, count + ' (' + pct + '%)')
                  );
                })
              ),

              // Trigger frequency
              sortedTriggers.length > 0 && h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 10 } }, 'Most Common Triggers'),
                sortedTriggers.map(function(tag) {
                  return h('div', { key: tag, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' } },
                    h('span', { style: { fontSize: 13, color: '#e2e8f0' } }, tag),
                    h('span', { style: { fontSize: 12, color: ACCENT, fontWeight: 600 } }, triggerFreq[tag] + 'x')
                  );
                })
              ),

              // AI Insight
              h('div', { style: { padding: 16, borderRadius: 14, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
                h('div', { style: { fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 8 } }, '\uD83E\uDD16 AI-Powered Insight'),
                aiInsight ? h('div', null,
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, aiInsight),
                  callTTS && h('button', {
                    onClick: function() { speak(aiInsight); },
                    style: { marginTop: 6, background: 'none', border: 'none', color: ACCENT, fontSize: 10, cursor: 'pointer' }
                  }, '\uD83D\uDD0A Read aloud')
                ) :
                h('button', {
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
            h('div', { style: { textAlign: 'center', marginBottom: 16, fontSize: 12, color: '#94a3b8' } },
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
                  earned && h('div', { style: { fontSize: 9, color: ACCENT, marginTop: 4 } }, '\u2713 ' + new Date(earnedBadges[b.id]).toLocaleDateString())
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
