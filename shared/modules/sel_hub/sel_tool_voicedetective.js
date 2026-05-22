// ═══════════════════════════════════════════════════════════════
// sel_tool_voicedetective.js — Voice Detective Plugin (v1.0)
// Vocal prosody emotion recognition training — hear voices
// expressing different emotions and identify what they feel.
// Evidence-based intervention for ASD social communication.
// Uses Gemini TTS for dynamic emotional voice generation.
// Registered tool ID: "voicedetective"
// Category: social-awareness
// Grade-adaptive: uses ctx.gradeBand for vocabulary & complexity
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── WCAG: Live region for screen reader announcements ──
  (function() {
    if (document.getElementById('allo-live-voicedet')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-voicedet';
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ── WCAG 2.3.3: Reduced-motion guard ──
  (function() {
    if (document.getElementById('allo-voicedet-rm-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-voicedet-rm-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  function announceToSR(msg) {
    var el = document.getElementById('allo-live-voicedet');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _audioCtx; }
  function playTone(freq, dur, type, vol) { var ac = getAudioCtx(); if (!ac) return; try { var osc = ac.createOscillator(); var gain = ac.createGain(); osc.type = type || 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(vol || 0.1, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15)); osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + (dur || 0.15)); } catch(e) {} }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }

  // ── Emotion Definitions ──
  var EMOTIONS_BASIC = [
    { id: 'happy', label: 'Happy', emoji: '😊', color: '#22c55e', voice: 'Kore', desc: 'Bright, upbeat, energetic' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: '#3b82f6', voice: 'Charon', desc: 'Slow, quiet, low energy' },
    { id: 'angry', label: 'Angry', emoji: '😠', color: '#ef4444', voice: 'Fenrir', desc: 'Loud, sharp, forceful' },
    { id: 'scared', label: 'Scared', emoji: '😨', color: '#a855f7', voice: 'Puck', desc: 'Shaky, fast, high pitch' },
  ];
  var EMOTIONS_INTERMEDIATE = EMOTIONS_BASIC.concat([
    { id: 'surprised', label: 'Surprised', emoji: '😮', color: '#f59e0b', voice: 'Aoede', desc: 'Sudden, high, exclamatory' },
    { id: 'disgusted', label: 'Disgusted', emoji: '🤢', color: '#84cc16', voice: 'Orus', desc: 'Slow, low, pulling away' },
  ]);
  var EMOTIONS_ADVANCED = EMOTIONS_INTERMEDIATE.concat([
    { id: 'sarcastic', label: 'Sarcastic', emoji: '😏', color: '#ec4899', voice: 'Zephyr', desc: 'Flat, exaggerated, opposite meaning' },
    { id: 'nervous', label: 'Nervous', emoji: '😰', color: '#06b6d4', voice: 'Leda', desc: 'Hesitant, fast, unsteady' },
    { id: 'excited', label: 'Excited', emoji: '🤩', color: '#f97316', voice: 'Kore', desc: 'Fast, high, lots of energy' },
    { id: 'bored', label: 'Bored', emoji: '😑', color: '#94a3b8', voice: 'Charon', desc: 'Flat, slow, monotone' },
  ]);

  // Sentences that work well for emotion discrimination
  // The SAME sentence spoken in different tones sounds distinctly different
  var SENTENCES = {
    elementary: [
      "Oh, that's really nice.",
      "I can't believe it.",
      "Look at what happened.",
      "Are you coming with us?",
      "I don't want to go.",
      "That was my favorite one.",
      "Did you really do that?",
      "I have something to tell you.",
      "We're going to be late.",
      "It's finally here.",
    ],
    middle: [
      "Sure, that sounds like a great idea.",
      "I just found out the news.",
      "We need to talk about what happened.",
      "Everybody already knows about it.",
      "I wasn't expecting to see you here.",
      "So that's what they decided to do.",
      "I'm not sure that's going to work.",
      "You should have told me sooner.",
      "This changes everything, doesn't it?",
      "I've been thinking about it all day.",
    ],
    high: [
      "Well, that certainly turned out differently than I expected.",
      "I appreciate your concern, really.",
      "Apparently, nobody thought to mention it.",
      "I suppose we'll just have to figure it out ourselves.",
      "That's an interesting perspective you have there.",
      "I've heard that story before, actually.",
      "Of course, that makes perfect sense now.",
      "I'm beginning to understand the situation.",
    ],
  };

  // Emotional text modifiers — these alter the TTS prosody
  function emotionalizeText(sentence, emotionId) {
    switch (emotionId) {
      case 'happy': return sentence.replace(/\.$/, '!') + ' ';
      case 'sad': return sentence.replace(/!$/, '.').replace(/\?$/, '.') + '.. ';
      case 'angry': return sentence.toUpperCase().replace(/\.$/, '!') + ' ';
      case 'scared': return 'Oh no... ' + sentence.replace(/\.$/, '...') + ' ';
      case 'surprised': return 'Wait — ' + sentence.replace(/\.$/, '!') + ' Oh! ';
      case 'disgusted': return 'Ugh. ' + sentence + ' ';
      case 'sarcastic': return 'Oh, ' + sentence.charAt(0).toLowerCase() + sentence.slice(1).replace(/\.$/, '. Suuure.') + ' ';
      case 'nervous': return 'Um, well, ' + sentence.replace(/\.$/, '... I think.') + ' ';
      case 'excited': return 'Oh my gosh! ' + sentence.replace(/\.$/, '!!') + ' Yes! ';
      case 'bored': return sentence.replace(/!$/, '.') + '... whatever. ';
      default: return sentence;
    }
  }

  // ── Storage ──
  var STORAGE_KEY = 'alloSelVoiceDetective';
  function loadData() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e) { return {}; } }
  function saveData(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {} }

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('voicedetective', {
    title: 'Voice Detective',
    icon: '🔊',
    category: 'social-awareness',
    description: 'Listen to voices and identify emotions from tone — train your social listening skills',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    standards: ['CASEL: Social Awareness', 'CCSS SL.1: Participate in conversations'],
    ready: true,

    render: function(ctx) {
      var h = ctx.React.createElement;
      var useState = ctx.React.useState;
      var useCallback = ctx.React.useCallback;
      var useRef = ctx.React.useRef;

      var gradeBand = ctx.gradeBand || 'elementary';
      var callTTS = ctx.callTTS;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var update = ctx.update;
      var toolData = (ctx.toolData && ctx.toolData.voicedetective) || {};

      // Get emotion set based on difficulty
      var _difficulty = useState(toolData._difficulty || (gradeBand === 'elementary' ? 'basic' : gradeBand === 'middle' ? 'intermediate' : 'advanced'));
      var difficulty = _difficulty[0]; var setDifficulty = _difficulty[1];

      var emotions = difficulty === 'basic' ? EMOTIONS_BASIC : difficulty === 'intermediate' ? EMOTIONS_INTERMEDIATE : EMOTIONS_ADVANCED;
      var sentences = SENTENCES[gradeBand] || SENTENCES.elementary;

      // Activity state
      var _mode = useState('menu'); var mode = _mode[0]; var setMode = _mode[1];
      var _target = useState(null); var target = _target[0]; var setTarget = _target[1]; // { sentence, emotion, voice }
      var _options = useState([]); var options = _options[0]; var setOptions = _options[1];
      var _feedback = useState(null); var feedback = _feedback[0]; var setFeedback = _feedback[1];
      var _speaking = useState(false); var speaking = _speaking[0]; var setSpeaking = _speaking[1];
      var _score = useState(0); var score = _score[0]; var setScore = _score[1];
      var _total = useState(0); var total = _total[0]; var setTotal = _total[1];
      var _streak = useState(0); var streak = _streak[0]; var setStreak = _streak[1];
      var _round = useState(0); var round = _round[0]; var setRound = _round[1];
      // Mode 2 state (same words different feelings)
      var _variants = useState([]); var variants = _variants[0]; var setVariants = _variants[1];
      var _variantAnswers = useState({}); var variantAnswers = _variantAnswers[0]; var setVariantAnswers = _variantAnswers[1];
      // Mode 3 state (match the scene)
      var _scene = useState(null); var scene = _scene[0]; var setScene = _scene[1];
      var _sceneVoices = useState([]); var sceneVoices = _sceneVoices[0]; var setSceneVoices = _sceneVoices[1];
      // Stats
      var _confusionMatrix = useState(toolData._confusionMatrix || {}); var confusionMatrix = _confusionMatrix[0]; var setConfusionMatrix = _confusionMatrix[1];
      var _sessionHistory = useState([]); var sessionHistory = _sessionHistory[0]; var setSessionHistory = _sessionHistory[1];
      var audioRef = useRef(null);

      // ── Badges ──
      var BADGES = [
        { id: 'first_try', label: 'First Listen', emoji: '🎧', desc: 'Complete your first round', check: function() { return total >= 1; } },
        { id: 'streak_3', label: 'Hot Streak', emoji: '🔥', desc: 'Get 3 correct in a row', check: function() { return streak >= 3; } },
        { id: 'streak_5', label: 'On Fire!', emoji: '💫', desc: 'Get 5 correct in a row', check: function() { return streak >= 5; } },
        { id: 'ten_correct', label: 'Sharp Ears', emoji: '👂', desc: 'Get 10 correct total', check: function() { return score >= 10; } },
        { id: 'all_modes', label: 'Mode Master', emoji: '🏆', desc: 'Try all 3 activity modes', check: function() { return (toolData._triedModes || []).length >= 3; } },
        { id: 'perfect_5', label: 'Perfect Five', emoji: '⭐', desc: 'Get 5 in a row without a mistake', check: function() { return streak >= 5 && total === score; } },
      ];
      var earnedBadges = BADGES.filter(function(b) { return b.check(); });

      // Track which modes have been tried
      if (mode !== 'menu') {
        var triedModes = toolData._triedModes || [];
        if (triedModes.indexOf(mode) === -1) {
          update('voicedetective', '_triedModes', triedModes.concat([mode]));
        }
      }

      // ── TTS with emotion ──
      var speakEmotion = useCallback(function(sentence, emotionId, voiceId) {
        return new Promise(function(resolve) {
          setSpeaking(true);
          var emotionalText = emotionalizeText(sentence, emotionId);
          var voice = voiceId || (emotions.find(function(em) { return em.id === emotionId; }) || {}).voice || 'Kore';
          if (callTTS) {
            callTTS(emotionalText, voice, emotionId === 'sad' || emotionId === 'bored' ? 0.85 : emotionId === 'angry' || emotionId === 'excited' ? 1.15 : 1.0)
              .then(function(url) {
                if (url) {
                  var a = new Audio(url);
                  audioRef.current = a;
                  a.onended = function() { setSpeaking(false); resolve(); };
                  a.onerror = function() { setSpeaking(false); resolve(); };
                  a.play().catch(function() { setSpeaking(false); resolve(); });
                } else { setSpeaking(false); resolve(); }
              }).catch(function() { setSpeaking(false); resolve(); });
          } else if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(emotionalText);
            utt.rate = emotionId === 'sad' || emotionId === 'bored' ? 0.75 : emotionId === 'angry' || emotionId === 'excited' ? 1.2 : 1.0;
            utt.pitch = emotionId === 'happy' || emotionId === 'excited' || emotionId === 'surprised' ? 1.3 : emotionId === 'sad' ? 0.7 : 1.0;
            utt.onend = function() { setSpeaking(false); resolve(); };
            window.speechSynthesis.speak(utt);
          } else { setSpeaking(false); resolve(); }
        });
      }, [callTTS, emotions]);

      // ── Pick a round (Mode 1: What Am I Feeling?) ──
      function pickRound() {
        var sentence = sentences[Math.floor(Math.random() * sentences.length)];
        var targetEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        var numOptions = difficulty === 'basic' ? 3 : difficulty === 'intermediate' ? 4 : 5;
        var opts = [targetEmotion];
        while (opts.length < Math.min(numOptions, emotions.length)) {
          var r = emotions[Math.floor(Math.random() * emotions.length)];
          if (!opts.find(function(o) { return o.id === r.id; })) opts.push(r);
        }
        // Shuffle
        for (var i = opts.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
        }
        setTarget({ sentence: sentence, emotion: targetEmotion, voice: targetEmotion.voice });
        setOptions(opts);
        setFeedback(null);
        setRound(function(r) { return r + 1; });
        // Auto-play
        setTimeout(function() { speakEmotion(sentence, targetEmotion.id, targetEmotion.voice); }, 300);
      }

      // ── Check answer (Mode 1) ──
      function checkAnswer(picked) {
        var correct = picked.id === target.emotion.id;
        setTotal(function(t) { return t + 1; });
        // Update confusion matrix
        setConfusionMatrix(function(prev) {
          var key = target.emotion.id + '→' + picked.id;
          var n = Object.assign({}, prev);
          n[key] = (n[key] || 0) + 1;
          return n;
        });
        setSessionHistory(function(prev) { return prev.concat([{ target: target.emotion.id, picked: picked.id, correct: correct, sentence: target.sentence }]); });
        if (correct) {
          sfxCorrect();
          setScore(function(s) { return s + 1; });
          setStreak(function(s) { return s + 1; });
          var msg = 'Correct! The voice sounds ' + target.emotion.label.toLowerCase() + ' — ' + target.emotion.desc + '.';
          setFeedback({ ok: true, msg: msg });
          announceToSR('Correct! ' + target.emotion.label + '.');
          if (awardXP) awardXP('voicedetective', 10);
          setTimeout(pickRound, 1500);
        } else {
          sfxWrong();
          setStreak(0);
          var msg2 = 'That was ' + target.emotion.label.toLowerCase() + ', not ' + picked.label.toLowerCase() + '. ' + target.emotion.label + ' voices sound: ' + target.emotion.desc + '.';
          setFeedback({ ok: false, msg: msg2 });
          announceToSR('Incorrect. The answer was ' + target.emotion.label + '.');
          setTimeout(pickRound, 3000);
        }
      }

      // ── Mode 2: Same Words, Different Feelings ──
      function pickMode2Round() {
        var sentence = sentences[Math.floor(Math.random() * sentences.length)];
        var numVariants = difficulty === 'basic' ? 2 : 3;
        var chosen = [];
        while (chosen.length < Math.min(numVariants, emotions.length)) {
          var r = emotions[Math.floor(Math.random() * emotions.length)];
          if (!chosen.find(function(c) { return c.id === r.id; })) chosen.push(r);
        }
        setVariants(chosen.map(function(em, i) { return { id: 'v' + i, emotion: em, sentence: sentence }; }));
        setVariantAnswers({});
        setFeedback(null);
        setRound(function(r) { return r + 1; });
      }

      function checkMode2() {
        var allCorrect = true;
        variants.forEach(function(v) {
          if (variantAnswers[v.id] !== v.emotion.id) allCorrect = false;
        });
        setTotal(function(t) { return t + 1; });
        if (allCorrect) {
          sfxCorrect();
          setScore(function(s) { return s + 1; });
          setStreak(function(s) { return s + 1; });
          setFeedback({ ok: true, msg: 'Perfect! You matched all the emotions correctly!' });
          if (awardXP) awardXP('voicedetective', 15);
          setTimeout(pickMode2Round, 2000);
        } else {
          sfxWrong();
          setStreak(0);
          var corrections = variants.map(function(v) { return 'Voice ' + (variants.indexOf(v) + 1) + ' = ' + v.emotion.label; }).join(', ');
          setFeedback({ ok: false, msg: 'Not quite. The correct answers: ' + corrections + '.' });
          setTimeout(pickMode2Round, 3500);
        }
      }

      // ── Mode 3: Match the Scene ──
      function pickMode3Round() {
        var targetEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        var wrongEmotion = emotions.filter(function(e) { return e.id !== targetEmotion.id; })[Math.floor(Math.random() * (emotions.length - 1))];
        var scenes = {
          happy: ['Your friend just told you they\'re having a birthday party and you\'re invited!', 'You found out your team won the championship game!', 'Your teacher said your project was the best one in the class.'],
          sad: ['Your best friend is moving to another city next week.', 'Your pet goldfish didn\'t make it through the night.', 'You didn\'t get picked for the team you really wanted.'],
          angry: ['Someone cut in front of you in line after you waited for 20 minutes.', 'Your sibling broke your favorite toy and didn\'t even say sorry.', 'You got blamed for something you didn\'t do.'],
          scared: ['You hear a strange noise in the house and you\'re home alone.', 'Tomorrow is the big test and you forgot to study.', 'The roller coaster is about to go over the biggest drop.'],
          surprised: ['You walk into a dark room and everyone yells "SURPRISE!"', 'You open your lunchbox and find a note and your favorite treat.', 'Your teacher announces a field trip to the zoo tomorrow.'],
          disgusted: ['Someone shows you a container of food that\'s been in the fridge way too long.', 'You step in something slimy on the playground.'],
          sarcastic: ['Your friend says they "love" doing extra homework on weekends.', 'Someone just spilled their drink for the third time today.'],
          nervous: ['You\'re about to go on stage for the school play and the audience is huge.', 'The teacher is calling on people randomly and you didn\'t finish the reading.'],
          excited: ['You just found out you\'re going to an amusement park this weekend!', 'Your favorite author is coming to your school for a visit!'],
          bored: ['The lecture has been going on for an hour about something you already know.', 'It\'s a rainy day and there\'s nothing to do.'],
        };
        var sceneOptions = scenes[targetEmotion.id] || scenes.happy;
        var sceneText = sceneOptions[Math.floor(Math.random() * sceneOptions.length)];
        var sentence = sentences[Math.floor(Math.random() * sentences.length)];

        var voices = [
          { id: 'correct', emotion: targetEmotion, sentence: sentence },
          { id: 'wrong', emotion: wrongEmotion, sentence: sentence },
        ];
        // Shuffle
        if (Math.random() > 0.5) voices.reverse();

        setScene({ text: sceneText, targetEmotion: targetEmotion, sentence: sentence });
        setSceneVoices(voices);
        setFeedback(null);
        setRound(function(r) { return r + 1; });
      }

      function checkMode3(pickedId) {
        var correct = pickedId === 'correct';
        setTotal(function(t) { return t + 1; });
        if (correct) {
          sfxCorrect();
          setScore(function(s) { return s + 1; });
          setStreak(function(s) { return s + 1; });
          setFeedback({ ok: true, msg: 'Yes! That voice matches someone who feels ' + scene.targetEmotion.label.toLowerCase() + '.' });
          if (awardXP) awardXP('voicedetective', 10);
          setTimeout(pickMode3Round, 1500);
        } else {
          sfxWrong();
          setStreak(0);
          setFeedback({ ok: false, msg: 'Not quite. In this scene, the person would feel ' + scene.targetEmotion.label.toLowerCase() + '. ' + scene.targetEmotion.label + ' voices sound ' + scene.targetEmotion.desc.toLowerCase() + '.' });
          setTimeout(pickMode3Round, 3500);
        }
      }

      // ── Save stats on changes ──
      if (total > 0 && total !== (toolData._lastTotal || 0)) {
        update('voicedetective', '_confusionMatrix', confusionMatrix);
        update('voicedetective', '_difficulty', difficulty);
        update('voicedetective', '_lastTotal', total);
        update('voicedetective', '_totalCorrect', (toolData._totalCorrect || 0) + (score - (toolData._lastScore || 0)));
        update('voicedetective', '_totalTrials', (toolData._totalTrials || 0) + (total - (toolData._lastTotal || 0)));
        update('voicedetective', '_lastScore', score);
      }

      // ── Styles ──
      var card = { background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e5e7eb', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
      var btn = function(bg, fg, dis) { return { padding: '10px 18px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; };
      var PURPLE = '#7c3aed';

      // ═══ RENDER ═══

      // ── Menu ──
      if (mode === 'menu') {
        var allTimeAcc = (toolData._totalTrials || 0) > 0 ? Math.round(((toolData._totalCorrect || 0) / (toolData._totalTrials || 1)) * 100) : 0;
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('voicedetective', h, ctx) : null),
          h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🔊'),
            h('h2', { style: { fontSize: '24px', fontWeight: 900, color: '#1e293b' } }, 'Voice Detective'),
            h('p', { style: { color: '#94a3b8', fontSize: '14px', maxWidth: '400px', margin: '0 auto' } },
              'Listen carefully to how people say things — not just what they say. Can you tell how someone feels just from their voice?')
          ),
          // Difficulty selector
          h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '20px' }, role: 'radiogroup', 'aria-label': 'Difficulty level' },
            [['basic', '3 Emotions', '😊😢😠'], ['intermediate', '6 Emotions', '+ 😮😨🤢'], ['advanced', '10 Emotions', '+ 😏😰🤩😑']].map(function(d) {
              return h('button', { key: d[0], onClick: function() { setDifficulty(d[0]); },
                role: 'radio', 'aria-checked': difficulty === d[0], 'aria-label': d[1] + ' difficulty',
                style: { padding: '8px 16px', borderRadius: '10px', border: '2px solid ' + (difficulty === d[0] ? PURPLE : '#d1d5db'), background: difficulty === d[0] ? '#f5f3ff' : '#fff', color: difficulty === d[0] ? PURPLE : '#94a3b8', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, h('div', null, d[1]), h('div', { style: { fontSize: '16px', marginTop: '2px' } }, d[2]));
            })
          ),
          // All-time stats
          (toolData._totalTrials || 0) > 0 && h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' } },
            h('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '10px 16px', textAlign: 'center' } },
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#16a34a' } }, toolData._totalCorrect || 0),
              h('div', { style: { fontSize: '10px', color: '#94a3b8' } }, 'all-time correct')
            ),
            h('div', { style: { background: '#f5f3ff', borderRadius: '10px', padding: '10px 16px', textAlign: 'center' } },
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: PURPLE } }, allTimeAcc + '%'),
              h('div', { style: { fontSize: '10px', color: '#94a3b8' } }, 'accuracy')
            )
          ),
          // Badges
          earnedBadges.length > 0 && h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' } },
            earnedBadges.map(function(b) {
              return h('div', { key: b.id, title: b.desc, style: { background: '#fef3c7', borderRadius: '10px', padding: '4px 10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '4px' } },
                h('span', { style: { fontSize: '16px' }, 'aria-hidden': 'true' }, b.emoji),
                h('span', { style: { fontSize: '10px', fontWeight: 700, color: '#92400e' } }, b.label)
              );
            })
          ),
          // Prosody Cue Cards — teach what to listen for
          h('div', { style: { marginBottom: '20px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '14px', padding: '14px' } },
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: PURPLE, marginBottom: '8px' } }, '🎓 What to Listen For'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' } },
              emotions.map(function(em) {
                return h('div', { key: em.id, style: { background: '#fff', borderRadius: '10px', padding: '8px', border: '2px solid ' + em.color + '33', textAlign: 'center' } },
                  h('div', { style: { fontSize: '24px', marginBottom: '2px' } }, em.emoji),
                  h('div', { style: { fontSize: '11px', fontWeight: 700, color: em.color } }, em.label),
                  h('div', { style: { fontSize: '9px', color: '#94a3b8', lineHeight: 1.3 } },
                    em.id === 'happy' ? 'Voice goes UP. Fast & bright. Smiling sound.' :
                    em.id === 'sad' ? 'Voice goes DOWN. Slow & quiet. Like sighing.' :
                    em.id === 'angry' ? 'LOUD & sharp. Words come fast. Tight sound.' :
                    em.id === 'scared' ? 'Voice SHAKES. High & fast. Breath is quick.' :
                    em.id === 'surprised' ? 'Sudden JUMP in pitch. "Oh!" "Wow!"' :
                    em.id === 'disgusted' ? 'Voice pulls BACK. Low. "Ugh" sound.' :
                    em.id === 'sarcastic' ? 'Says one thing, MEANS another. Flat & slow.' :
                    em.id === 'nervous' ? 'Voice WOBBLES. "Um" and "uh." Hesitant.' :
                    em.id === 'excited' ? 'Like happy but BIGGER. Can\'t contain it!' :
                    em.id === 'bored' ? 'Totally FLAT. No energy. Monotone.' :
                    em.desc
                  )
                );
              })
            )
          ),
          // Confusion Matrix (if has data)
          Object.keys(confusionMatrix).length > 5 && h('div', { style: { marginBottom: '20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px' } },
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '📊 Your Emotion Confusion Patterns'),
            h('p', { style: { fontSize: '10px', color: '#94a3b8', marginBottom: '8px' } }, 'Shows which emotions you mix up most often. Brighter = more frequent.'),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { style: { borderCollapse: 'collapse', fontSize: '10px', width: '100%' } },
                h('thead', null,
                  h('tr', null,
                    h('th', { style: { padding: '4px 6px', border: '1px solid #e5e7eb', background: '#f8fafc', fontSize: '9px' } }, 'Target ↓ / Picked →'),
                    emotions.map(function(em) { return h('th', { key: em.id, style: { padding: '4px', border: '1px solid #e5e7eb', background: '#f8fafc', textAlign: 'center' } }, em.emoji); })
                  )
                ),
                h('tbody', null,
                  emotions.map(function(targetEm) {
                    return h('tr', { key: targetEm.id },
                      h('td', { style: { padding: '4px 6px', border: '1px solid #e5e7eb', fontWeight: 700, color: targetEm.color } }, targetEm.emoji + ' ' + targetEm.label),
                      emotions.map(function(pickedEm) {
                        var key = targetEm.id + '→' + pickedEm.id;
                        var count = confusionMatrix[key] || 0;
                        var isCorrect = targetEm.id === pickedEm.id;
                        var maxCount = Math.max.apply(null, Object.values(confusionMatrix).concat([1]));
                        var intensity = count / maxCount;
                        return h('td', { key: pickedEm.id, style: { padding: '4px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: count > 0 ? 700 : 400, color: isCorrect ? '#16a34a' : count > 0 ? '#dc2626' : '#d1d5db', background: isCorrect ? 'rgba(34,197,94,' + (intensity * 0.3) + ')' : count > 0 ? 'rgba(239,68,68,' + (intensity * 0.2) + ')' : 'transparent' } }, count || '·');
                      })
                    );
                  })
                )
              )
            ),
            // Top confusions summary
            (() => {
              var confusions = Object.entries(confusionMatrix).filter(function(p) { return !p[0].includes('→' + p[0].split('→')[0]) && p[1] > 0; }).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 3);
              if (confusions.length === 0) return null;
              return h('div', { style: { marginTop: '8px', fontSize: '10px', color: '#94a3b8' } },
                h('strong', null, 'Most common mix-ups: '),
                confusions.map(function(c, i) {
                  var parts = c[0].split('→');
                  var te = emotions.find(function(e) { return e.id === parts[0]; });
                  var pe = emotions.find(function(e) { return e.id === parts[1]; });
                  return (i > 0 ? ', ' : '') + (te ? te.emoji : '') + '→' + (pe ? pe.emoji : '') + ' (' + c[1] + 'x)';
                }).join('')
              );
            })()
          ),
          // Activity modes
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
            [
              ['identify', '🎧 What Am I Feeling?', 'Hear a voice and identify the emotion', '😊'],
              ['discriminate', '🔀 Same Words, Different Feelings', 'The same sentence spoken with different emotions — match each one', '🎭'],
              ['scene', '🎬 Match the Scene', 'Read a scenario, then pick the voice that matches how someone would feel', '🎯'],
            ].map(function(m) {
              return h('button', { key: m[0], onClick: function() {
                  setMode(m[0]); setScore(0); setTotal(0); setStreak(0); setRound(0); setSessionHistory([]);
                  if (m[0] === 'identify') pickRound();
                  else if (m[0] === 'discriminate') pickMode2Round();
                  else if (m[0] === 'scene') pickMode3Round();
                },
                style: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }
              },
                h('div', { style: { fontSize: '32px' } }, m[3]),
                h('div', null,
                  h('div', { style: { fontWeight: 800, fontSize: '15px', color: '#1e293b' } }, m[1]),
                  h('div', { style: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' } }, m[2])
                )
              );
            })
          ),
          // Clinical note
          h('div', { style: { marginTop: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#1e40af' } },
            h('strong', null, 'Clinical note: '),
            'Voice Detective trains vocal prosody recognition — the ability to identify emotions from tone of voice. ',
            'This is a core social communication skill targeted in ASD intervention (CASEL Social Awareness). ',
            'Session data tracks accuracy per emotion category and confusion patterns for IEP progress monitoring.'
          )
        );
      }

      // ── Score bar (shared across modes) ──
      var scoreBar = h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '10px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' } },
        h('button', { onClick: function() { setMode('menu'); if (audioRef.current) { audioRef.current.pause(); } if (window.speechSynthesis) window.speechSynthesis.cancel(); },
          style: btn('#f1f5f9', '#374151', false) }, '← Back'),
        h('span', { style: { fontWeight: 700, color: '#16a34a', fontSize: '13px' } }, '✅ ' + score + '/' + total),
        streak >= 3 && h('span', { style: { fontWeight: 700, color: '#f97316', fontSize: '13px' } }, '🔥 ' + streak + 'x streak'),
        h('span', { style: { fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' } }, 'Round ' + round)
      );

      var feedbackBar = feedback && h('div', { role: 'status', 'aria-live': 'assertive',
        style: { padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textAlign: 'center', marginBottom: '12px',
          background: feedback.ok ? '#dcfce7' : '#fee2e2', color: feedback.ok ? '#166534' : '#991b1b', border: '1px solid ' + (feedback.ok ? '#86efac' : '#fca5a5') }
      }, feedback.msg);

      // ── Mode 1: What Am I Feeling? ──
      if (mode === 'identify' && target) {
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          scoreBar,
          // Audio prompt
          h('div', { style: { textAlign: 'center', padding: '24px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: '16px', border: '2px solid #c4b5fd', marginBottom: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' } }, 'Listen carefully...'),
            h('button', { onClick: function() { speakEmotion(target.sentence, target.emotion.id, target.voice); }, disabled: speaking,
              style: { padding: '16px 32px', fontSize: '28px', background: speaking ? '#e5e7eb' : PURPLE, color: '#fff', border: 'none', borderRadius: '50%', cursor: speaking ? 'wait' : 'pointer', boxShadow: speaking ? 'none' : '0 4px 16px rgba(124,58,237,0.3)', width: '80px', height: '80px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
            }, speaking ? '🔊' : '▶'),
            h('p', { style: { marginTop: '10px', fontSize: '12px', color: '#7c3aed', fontWeight: 600 } }, speaking ? 'Playing...' : 'Tap to hear again'),
            // Animated face during playback
            speaking && h('div', { style: { marginTop: '10px', fontSize: '48px', animation: 'pulse 1s infinite' }, 'aria-hidden': 'true' }, '🗣️'),
            h('p', { style: { marginTop: '6px', fontSize: '13px', color: '#475569', fontStyle: 'italic' } }, '"' + target.sentence + '"'),
            // Listening tip for current emotion (shown after first wrong answer)
            total > 0 && score < total && h('div', { style: { marginTop: '8px', background: '#fef3c7', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#92400e', border: '1px solid #fde68a' } },
              h('strong', null, '💡 Listening tip: '),
              'Focus on the SPEED (fast or slow?), PITCH (high or low?), and VOLUME (loud or quiet?) of the voice.'
            )
          ),
          feedbackBar,
          // Emotion choices
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }, role: 'group', 'aria-label': 'Choose the emotion you hear' },
            options.map(function(em) {
              var isCorrect = feedback && feedback.ok && em.id === target.emotion.id;
              var isWrong = feedback && !feedback.ok && em.id !== target.emotion.id;
              var isAnswer = feedback && !feedback.ok && em.id === target.emotion.id;
              return h('button', { key: em.id, onClick: function() { if (!feedback) checkAnswer(em); }, disabled: !!feedback,
                'aria-label': em.label + (isCorrect ? ' - correct answer' : isAnswer ? ' - this was the correct answer' : isWrong ? ' - incorrect' : ''),
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '16px 12px', borderRadius: '14px', cursor: feedback ? 'default' : 'pointer',
                  border: '3px solid ' + (isCorrect || isAnswer ? '#22c55e' : isWrong ? '#fca5a5' : em.color + '66'), background: isCorrect || isAnswer ? '#dcfce7' : '#fff',
                  opacity: isWrong ? 0.4 : 1, transform: isCorrect ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.15s' }
              },
                h('span', { style: { fontSize: '32px' }, 'aria-hidden': 'true' }, em.emoji),
                h('span', { style: { fontSize: '13px', fontWeight: 700, color: em.color } }, em.label),
                // Text label for correct/wrong (non-color indicator)
                isCorrect && h('span', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a' } }, '✓ Correct'),
                isAnswer && h('span', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a' } }, '← Answer'),
                gradeBand !== 'elementary' && !isCorrect && !isAnswer && h('span', { style: { fontSize: '10px', color: '#9ca3af' } }, em.desc)
              );
            })
          )
        );
      }

      // ── Mode 2: Same Words, Different Feelings ──
      if (mode === 'discriminate' && variants.length > 0) {
        var allAnswered = variants.every(function(v) { return variantAnswers[v.id]; });
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          scoreBar,
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b' } }, '🔀 Same Words, Different Feelings'),
            h('p', { style: { color: '#94a3b8', fontSize: '13px' } }, 'Each voice says the same sentence — but with a different emotion. Match each one!')
          ),
          h('p', { style: { textAlign: 'center', fontSize: '14px', color: '#475569', fontStyle: 'italic', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '10px' } }, '"' + (variants[0] || {}).sentence + '"'),
          feedbackBar,
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' } },
            variants.map(function(v, vi) {
              return h('div', { key: v.id, style: Object.assign({}, card, { display: 'flex', alignItems: 'center', gap: '12px' }) },
                h('button', { onClick: function() { speakEmotion(v.sentence, v.emotion.id, v.emotion.voice); }, disabled: speaking,
                  style: { width: '48px', height: '48px', borderRadius: '50%', background: speaking ? '#e5e7eb' : PURPLE, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }
                }, speaking ? '🔊' : '▶'),
                h('span', { style: { fontSize: '14px', fontWeight: 700, color: '#374151', flexShrink: 0 } }, 'Voice ' + (vi + 1)),
                h('select', { value: variantAnswers[v.id] || '', onChange: function(ev) { setVariantAnswers(function(prev) { var n = Object.assign({}, prev); n[v.id] = ev.target.value; return n; }); },
                  style: { flex: 1, padding: '8px 12px', borderRadius: '10px', border: '2px solid #d1d5db', fontSize: '14px', fontWeight: 600 },
                  'aria-label': 'Emotion for voice ' + (vi + 1)
                },
                  h('option', { value: '' }, '— Select emotion —'),
                  emotions.map(function(em) { return h('option', { key: em.id, value: em.id }, em.emoji + ' ' + em.label); })
                )
              );
            })
          ),
          h('div', { style: { textAlign: 'center' } },
            h('button', { onClick: checkMode2, disabled: !allAnswered,
              style: btn(PURPLE, '#fff', !allAnswered) }, '✓ Check My Answers')
          )
        );
      }

      // ── Mode 3: Match the Scene ──
      if (mode === 'scene' && scene) {
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          scoreBar,
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b' } }, '🎬 Match the Scene'),
            h('p', { style: { color: '#94a3b8', fontSize: '13px' } }, 'Read what happened, then pick the voice that matches how the person would feel.')
          ),
          // Scene description
          h('div', { style: { background: 'linear-gradient(135deg, #fef3c7, #fef9c3)', border: '2px solid #fde68a', borderRadius: '14px', padding: '20px', marginBottom: '16px', textAlign: 'center' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: '6px' } }, 'The Scenario'),
            h('p', { style: { fontSize: '15px', color: '#1e293b', lineHeight: 1.6, fontWeight: 500 } }, scene.text)
          ),
          feedbackBar,
          h('p', { style: { textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginBottom: '12px' } }, 'Which voice matches how this person would sound?'),
          h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center' } },
            sceneVoices.map(function(sv, vi) {
              return h('div', { key: sv.id, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } },
                h('button', { onClick: function() { speakEmotion(sv.sentence, sv.emotion.id, sv.emotion.voice); }, disabled: speaking,
                  style: { width: '72px', height: '72px', borderRadius: '50%', background: speaking ? '#e5e7eb' : '#f1f5f9', border: '3px solid #d1d5db', cursor: 'pointer', fontSize: '24px', transition: 'all 0.15s' }
                }, '🔊'),
                h('span', { style: { fontSize: '13px', fontWeight: 600, color: '#374151' } }, 'Voice ' + (vi + 1)),
                h('button', { onClick: function() { if (!feedback) checkMode3(sv.id); }, disabled: !!feedback,
                  style: btn(feedback ? '#e5e7eb' : PURPLE, feedback ? '#9ca3af' : '#fff', !!feedback) }, 'This one!')
              );
            })
          )
        );
      }

      // Fallback
      return h('div', { style: { textAlign: 'center', padding: '40px', color: '#94a3b8' } }, 'Loading...');
    }
  });

  console.log('[SEL] Voice Detective tool registered');
})();
