// ═══════════════════════════════════════════════════════════════
// sel_tool_journal.js — Feelings Journal Plugin (v1.0)
// Daily mood check-ins, free-write journaling, mood analytics,
// AI-powered insight generation, and achievement badges.
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
      'My favorite thing about myself is...'
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
      'How do I feel when I compare myself to others on social media?'
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
      'How do I balance taking care of others and taking care of myself?'
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
    { id: 'consistent_10',    icon: '\uD83D\uDCAA', name: 'Consistent',         desc: 'Complete 10 total check-ins' }
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
                    onClick: function() { upd('ciMood', m.id); if (soundEnabled) sfxClick(); },
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
                  gratitude: ciGratitude
                };
                var newCheckIns = checkIns.concat([entry]);
                upd({
                  checkIns: newCheckIns,
                  ciMood: null, ciEnergy: 3, ciThoughts: '', ciTriggers: [], ciGratitude: ''
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
              },
              disabled: ciMood == null,
              style: {
                width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
                background: ciMood != null ? ACCENT : '#334155', color: '#fff', fontWeight: 700,
                fontSize: 14, cursor: ciMood != null ? 'pointer' : 'not-allowed', transition: 'all 0.15s'
              }
            }, '\uD83D\uDCBE Save Check-In')
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
        var content = checkinContent || journalContent || insightsContent || badgesContent;

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
