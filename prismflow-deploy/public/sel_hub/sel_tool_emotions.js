// ═══════════════════════════════════════════════════════════════
// sel_tool_emotions.js — Emotions Explorer Plugin (v1.0)
// Interactive emotion wheel, feelings vocabulary builder,
// facial expression matching, intensity scaling, emotion
// journal with AI coach, and mood history/insights.
// Registered tool ID: "emotions"
// Category: self-awareness
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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-emotions')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-emotions';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


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
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxCheckin() { playTone(440, 0.15, 'sine', 0.06); setTimeout(function() { playTone(554, 0.15, 'sine', 0.06); }, 100); setTimeout(function() { playTone(659, 0.2, 'sine', 0.08); }, 200); }
  function sfxReveal() { playTone(392, 0.1, 'sine', 0.06); setTimeout(function() { playTone(494, 0.1, 'sine', 0.06); }, 80); setTimeout(function() { playTone(588, 0.15, 'sine', 0.08); }, 160); }

  // ══════════════════════════════════════════════════════════════
  // ── Emotion Wheel Data ──
  // Each primary emotion has secondary/nuanced emotions beneath it
  // ══════════════════════════════════════════════════════════════
  var EMOTION_FAMILIES = [
    {
      id: 'happy', label: 'Happy', emoji: '\uD83D\uDE04', color: '#22c55e', bgLight: '#dcfce7',
      desc: { elementary: 'Feeling good inside!', middle: 'Positive, upbeat feelings', high: 'States of well-being and positive affect' },
      feelings: {
        elementary: [
          { word: 'happy', emoji: '\uD83D\uDE04', def: 'Feeling good and smiley' },
          { word: 'excited', emoji: '\uD83E\uDD29', def: 'So happy you can\'t sit still!' },
          { word: 'proud', emoji: '\uD83D\uDE0A', def: 'Feeling great about something you did' },
          { word: 'grateful', emoji: '\uD83D\uDE4F', def: 'Thankful for something nice' },
          { word: 'silly', emoji: '\uD83E\uDD2A', def: 'Wanting to laugh and be goofy' },
          { word: 'loved', emoji: '\uD83E\uDD70', def: 'Feeling warm because someone cares about you' },
          { word: 'calm', emoji: '\uD83D\uDE0C', def: 'Peaceful and relaxed' },
          { word: 'hopeful', emoji: '\uD83C\uDF1F', def: 'Believing something good will happen' }
        ],
        middle: [
          { word: 'content', emoji: '\uD83D\uDE0C', def: 'Satisfied and at peace with how things are' },
          { word: 'enthusiastic', emoji: '\uD83E\uDD29', def: 'Eager and full of energy about something' },
          { word: 'accomplished', emoji: '\uD83C\uDFC6', def: 'Proud of achieving a goal' },
          { word: 'grateful', emoji: '\uD83D\uDE4F', def: 'Deeply thankful for people or experiences' },
          { word: 'amused', emoji: '\uD83D\uDE04', def: 'Finding something entertaining or funny' },
          { word: 'inspired', emoji: '\u2728', def: 'Motivated by an idea or person' },
          { word: 'relieved', emoji: '\uD83D\uDE2E\u200D\uD83D\uDCA8', def: 'Stress lifted after something went well' },
          { word: 'confident', emoji: '\uD83D\uDCAA', def: 'Trusting in your own ability' }
        ],
        high: [
          { word: 'euphoric', emoji: '\uD83E\uDD29', def: 'Intense happiness or elation' },
          { word: 'fulfilled', emoji: '\uD83D\uDE0C', def: 'Deep satisfaction from meaningful engagement' },
          { word: 'empowered', emoji: '\uD83D\uDCAA', def: 'Feeling capable and in control of your life' },
          { word: 'serene', emoji: '\uD83C\uDF3F', def: 'Profound calm and inner peace' },
          { word: 'awestruck', emoji: '\uD83E\uDD2F', def: 'Overwhelmed by wonder or beauty' },
          { word: 'nostalgic', emoji: '\uD83D\uDE0A', def: 'Warm, bittersweet longing for the past' },
          { word: 'validated', emoji: '\u2705', def: 'Feeling acknowledged and affirmed by others' },
          { word: 'liberated', emoji: '\uD83D\uDD4A\uFE0F', def: 'Freed from a burden or constraint' }
        ]
      }
    },
    {
      id: 'sad', label: 'Sad', emoji: '\uD83D\uDE22', color: '#3b82f6', bgLight: '#dbeafe',
      desc: { elementary: 'Feeling down or blue', middle: 'Low, heavy feelings', high: 'States of loss, grief, or emotional pain' },
      feelings: {
        elementary: [
          { word: 'sad', emoji: '\uD83D\uDE22', def: 'Feeling unhappy or down' },
          { word: 'lonely', emoji: '\uD83D\uDE14', def: 'Wanting someone to be with' },
          { word: 'disappointed', emoji: '\uD83D\uDE1E', def: 'Something didn\'t go the way you wanted' },
          { word: 'left out', emoji: '\uD83D\uDE1F', def: 'Not included when others are having fun' },
          { word: 'hurt', emoji: '\uD83E\uDD15', def: 'Someone said or did something that made you feel bad' },
          { word: 'homesick', emoji: '\uD83C\uDFE0', def: 'Missing home or family' },
          { word: 'bored', emoji: '\uD83D\uDE11', def: 'Nothing feels interesting right now' },
          { word: 'guilty', emoji: '\uD83D\uDE16', def: 'Bad feeling because you did something wrong' }
        ],
        middle: [
          { word: 'melancholy', emoji: '\uD83D\uDE14', def: 'A deep, lingering sadness without a clear cause' },
          { word: 'rejected', emoji: '\uD83D\uDE1E', def: 'Feeling unwanted or turned away by someone' },
          { word: 'isolated', emoji: '\uD83E\uDDD1', def: 'Cut off from others, even in a crowd' },
          { word: 'grief', emoji: '\uD83D\uDE22', def: 'Deep sadness from losing someone or something important' },
          { word: 'regretful', emoji: '\uD83D\uDE16', def: 'Wishing you had done something differently' },
          { word: 'empty', emoji: '\uD83D\uDD73\uFE0F', def: 'Feeling hollow or numb inside' },
          { word: 'nostalgic', emoji: '\uD83D\uDE0A', def: 'Missing how things used to be' },
          { word: 'helpless', emoji: '\uD83D\uDE1F', def: 'Feeling like nothing you do will change things' }
        ],
        high: [
          { word: 'despondent', emoji: '\uD83D\uDE1E', def: 'Loss of hope and motivation to continue' },
          { word: 'bereft', emoji: '\uD83D\uDE22', def: 'Deprived of something deeply valued' },
          { word: 'disillusioned', emoji: '\uD83D\uDE14', def: 'Discovering reality doesn\'t match expectations' },
          { word: 'alienated', emoji: '\uD83E\uDDD1', def: 'Fundamentally disconnected from others or systems' },
          { word: 'remorseful', emoji: '\uD83D\uDE16', def: 'Profound regret accompanied by a desire to make amends' },
          { word: 'desolate', emoji: '\uD83C\uDF2B\uFE0F', def: 'Bleak emptiness, stripped of comfort' },
          { word: 'wistful', emoji: '\uD83D\uDE0A', def: 'Gentle sadness about something gone but cherished' },
          { word: 'resigned', emoji: '\uD83D\uDE10', def: 'Accepting an undesirable outcome without resistance' }
        ]
      }
    },
    {
      id: 'angry', label: 'Angry', emoji: '\uD83D\uDE21', color: '#ef4444', bgLight: '#fee2e2',
      desc: { elementary: 'Feeling mad or upset', middle: 'Frustrated, irritated, or furious', high: 'Responses to perceived injustice, threat, or boundary violation' },
      feelings: {
        elementary: [
          { word: 'angry', emoji: '\uD83D\uDE21', def: 'Feeling really mad inside' },
          { word: 'frustrated', emoji: '\uD83D\uDE24', def: 'Trying hard but it isn\'t working' },
          { word: 'annoyed', emoji: '\uD83D\uDE12', def: 'Something small is bugging you' },
          { word: 'jealous', emoji: '\uD83D\uDE12', def: 'Wanting what someone else has' },
          { word: 'grumpy', emoji: '\uD83D\uDE20', def: 'In a bad mood about everything' },
          { word: 'impatient', emoji: '\u23F3', def: 'Can\'t wait and it\'s making you mad' },
          { word: 'furious', emoji: '\uD83E\uDD2C', def: 'Super duper mad — the most angry' },
          { word: 'offended', emoji: '\uD83D\uDE20', def: 'Someone said something mean or unfair' }
        ],
        middle: [
          { word: 'resentful', emoji: '\uD83D\uDE20', def: 'Lingering anger about being treated unfairly' },
          { word: 'bitter', emoji: '\uD83D\uDE12', def: 'Hardened anger from repeated disappointment' },
          { word: 'exasperated', emoji: '\uD83D\uDE24', def: 'Completely fed up after many frustrations' },
          { word: 'envious', emoji: '\uD83D\uDE12', def: 'Uncomfortable wanting what others have' },
          { word: 'hostile', emoji: '\uD83D\uDE21', def: 'Ready to fight or push back aggressively' },
          { word: 'indignant', emoji: '\uD83D\uDE20', def: 'Angry because something is genuinely unfair' },
          { word: 'irritated', emoji: '\uD83D\uDE12', def: 'Low-level anger from small annoyances building up' },
          { word: 'betrayed', emoji: '\uD83D\uDC94', def: 'Hurt-anger from someone you trusted' }
        ],
        high: [
          { word: 'contemptuous', emoji: '\uD83D\uDE12', def: 'Disgust mixed with anger — feeling superior to the target' },
          { word: 'indignant', emoji: '\uD83D\uDE20', def: 'Righteous anger in response to injustice' },
          { word: 'vindictive', emoji: '\uD83D\uDE21', def: 'Desire for revenge or to inflict consequences' },
          { word: 'embittered', emoji: '\uD83D\uDE24', def: 'Chronic resentment that has become part of one\'s worldview' },
          { word: 'incensed', emoji: '\uD83E\uDD2C', def: 'White-hot fury that demands immediate expression' },
          { word: 'exasperated', emoji: '\uD83D\uDE24', def: 'Exhausted frustration at repeated failures or obstacles' },
          { word: 'disrespected', emoji: '\uD83D\uDE20', def: 'Anger from perceived dismissal of your worth or status' },
          { word: 'provoked', emoji: '\uD83D\uDE21', def: 'Anger intentionally triggered by another\'s actions' }
        ]
      }
    },
    {
      id: 'scared', label: 'Scared', emoji: '\uD83D\uDE28', color: '#a855f7', bgLight: '#f3e8ff',
      desc: { elementary: 'Feeling afraid or worried', middle: 'Fear, anxiety, or dread', high: 'Threat-response emotions — from unease to terror' },
      feelings: {
        elementary: [
          { word: 'scared', emoji: '\uD83D\uDE28', def: 'Afraid something bad might happen' },
          { word: 'worried', emoji: '\uD83D\uDE1F', def: 'Thinking about bad things that could happen' },
          { word: 'nervous', emoji: '\uD83D\uDE2C', def: 'Butterflies in your stomach before something new' },
          { word: 'shy', emoji: '\uD83D\uDE33', def: 'Afraid to talk or be around new people' },
          { word: 'startled', emoji: '\uD83D\uDE31', def: 'Surprised and scared at the same time' },
          { word: 'unsafe', emoji: '\u26A0\uFE0F', def: 'Feeling like you\'re in danger' },
          { word: 'panicked', emoji: '\uD83D\uDE30', def: 'So scared you can\'t think straight' },
          { word: 'confused', emoji: '\uD83D\uDE15', def: 'Not understanding and it feels scary' }
        ],
        middle: [
          { word: 'anxious', emoji: '\uD83D\uDE1F', def: 'Ongoing worry that\'s hard to control' },
          { word: 'dread', emoji: '\uD83D\uDE28', def: 'Heavy fear about something coming' },
          { word: 'insecure', emoji: '\uD83D\uDE2C', def: 'Doubting yourself and your place' },
          { word: 'overwhelmed', emoji: '\uD83E\uDD2F', def: 'Too much to handle — drowning in demands' },
          { word: 'vulnerable', emoji: '\uD83D\uDC94', def: 'Exposed and at risk of being hurt' },
          { word: 'paranoid', emoji: '\uD83D\uDC40', def: 'Suspecting others are working against you' },
          { word: 'apprehensive', emoji: '\uD83D\uDE30', def: 'Uneasy anticipation of something difficult' },
          { word: 'intimidated', emoji: '\uD83D\uDE33', def: 'Feeling small or powerless in someone\'s presence' }
        ],
        high: [
          { word: 'existential dread', emoji: '\uD83C\uDF11', def: 'Deep anxiety about meaning, mortality, or identity' },
          { word: 'hypervigilant', emoji: '\uD83D\uDC40', def: 'Heightened alertness from sustained threat perception' },
          { word: 'dissociated', emoji: '\uD83C\uDF2B\uFE0F', def: 'Disconnection from reality as a protective response' },
          { word: 'catastrophizing', emoji: '\uD83D\uDE30', def: 'Mind spiraling to worst-case scenarios' },
          { word: 'vulnerable', emoji: '\uD83D\uDC94', def: 'Exposed emotional state that requires trust to hold' },
          { word: 'phobic', emoji: '\uD83D\uDE28', def: 'Intense, irrational fear triggered by specific stimuli' },
          { word: 'paralyzed', emoji: '\uD83E\uDDCA', def: 'Freeze response — too afraid to act or decide' },
          { word: 'anticipatory anxiety', emoji: '\uD83D\uDE1F', def: 'Worrying about a future event that may or may not occur' }
        ]
      }
    },
    {
      id: 'surprised', label: 'Surprised', emoji: '\uD83D\uDE32', color: '#f59e0b', bgLight: '#fef3c7',
      desc: { elementary: 'Something you didn\'t expect!', middle: 'Unexpected, shocking, or startling', high: 'Reactions to events that violate expectation' },
      feelings: {
        elementary: [
          { word: 'surprised', emoji: '\uD83D\uDE32', def: 'Didn\'t expect that to happen!' },
          { word: 'amazed', emoji: '\uD83E\uDD29', def: 'Something is SO cool or SO big!' },
          { word: 'shocked', emoji: '\uD83D\uDE31', def: 'Something really unexpected happened' },
          { word: 'curious', emoji: '\uD83E\uDD14', def: 'Wanting to know more about something' },
          { word: 'confused', emoji: '\uD83D\uDE15', def: 'Not sure what just happened' },
          { word: 'wonder', emoji: '\u2728', def: 'Amazed by something beautiful or cool' }
        ],
        middle: [
          { word: 'astonished', emoji: '\uD83D\uDE32', def: 'Completely taken aback by something' },
          { word: 'bewildered', emoji: '\uD83D\uDE15', def: 'Confused and disoriented by the unexpected' },
          { word: 'intrigued', emoji: '\uD83E\uDD14', def: 'Deeply curious — wanting to investigate' },
          { word: 'awestruck', emoji: '\uD83E\uDD29', def: 'Overwhelmed by something amazing' },
          { word: 'caught off guard', emoji: '\uD83D\uDE31', def: 'Unprepared for what just happened' },
          { word: 'perplexed', emoji: '\uD83E\uDD28', def: 'Confused in a way that makes you think hard' }
        ],
        high: [
          { word: 'flabbergasted', emoji: '\uD83D\uDE32', def: 'So surprised you literally cannot respond' },
          { word: 'disconcerted', emoji: '\uD83D\uDE15', def: 'Unsettled by something that doesn\'t fit your model of the world' },
          { word: 'galvanized', emoji: '\u26A1', def: 'Shocked into sudden action or awareness' },
          { word: 'disillusioned', emoji: '\uD83D\uDE14', def: 'Unpleasantly surprised by reality vs. expectation' },
          { word: 'epiphanic', emoji: '\uD83D\uDCA1', def: 'A sudden, clarifying realization that reframes everything' },
          { word: 'stupefied', emoji: '\uD83D\uDE31', def: 'So shocked that cognitive processing temporarily halts' }
        ]
      }
    },
    {
      id: 'disgusted', label: 'Disgusted', emoji: '\uD83E\uDD22', color: '#84cc16', bgLight: '#ecfccb',
      desc: { elementary: 'Yucky or icky feelings', middle: 'Revulsion, disapproval, or being grossed out', high: 'Rejection response — physical or moral revulsion' },
      feelings: {
        elementary: [
          { word: 'disgusted', emoji: '\uD83E\uDD22', def: 'Something is gross or yucky' },
          { word: 'grossed out', emoji: '\uD83E\uDD2E', def: 'Eww! That\'s really icky!' },
          { word: 'uncomfortable', emoji: '\uD83D\uDE16', def: 'Something doesn\'t feel right' },
          { word: 'embarrassed', emoji: '\uD83D\uDE33', def: 'Feeling like everyone is watching you mess up' },
          { word: 'ashamed', emoji: '\uD83D\uDE14', def: 'Feeling really bad about something you did' }
        ],
        middle: [
          { word: 'repulsed', emoji: '\uD83E\uDD22', def: 'Strong physical or emotional rejection' },
          { word: 'contemptuous', emoji: '\uD83D\uDE12', def: 'Looking down on someone\'s behavior' },
          { word: 'revolted', emoji: '\uD83E\uDD2E', def: 'Deeply disturbed by something morally wrong' },
          { word: 'humiliated', emoji: '\uD83D\uDE33', def: 'Publicly embarrassed to a painful degree' },
          { word: 'mortified', emoji: '\uD83D\uDE14', def: 'Shame so intense you want to disappear' },
          { word: 'appalled', emoji: '\uD83D\uDE32', def: 'Shocked and disgusted by something unacceptable' }
        ],
        high: [
          { word: 'moral revulsion', emoji: '\uD83E\uDD22', def: 'Disgust at ethical violations — injustice, cruelty, hypocrisy' },
          { word: 'visceral repulsion', emoji: '\uD83E\uDD2E', def: 'Bodily disgust that bypasses conscious thought' },
          { word: 'self-loathing', emoji: '\uD83D\uDE14', def: 'Disgust directed inward — harsh self-rejection' },
          { word: 'indignation', emoji: '\uD83D\uDE20', def: 'Disgust + anger at unfairness or wrongdoing' },
          { word: 'disenfranchised', emoji: '\uD83D\uDE10', def: 'Repelled by systems that exclude or dehumanize' }
        ]
      }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Facial Expression Challenge Data ──
  // ══════════════════════════════════════════════════════════════
  var FACE_CHALLENGES = [
    { emotion: 'happy',     face: '\uD83D\uDE04', options: ['happy', 'sad', 'angry', 'scared'] },
    { emotion: 'sad',       face: '\uD83D\uDE22', options: ['angry', 'sad', 'surprised', 'happy'] },
    { emotion: 'angry',     face: '\uD83D\uDE21', options: ['scared', 'happy', 'angry', 'disgusted'] },
    { emotion: 'scared',    face: '\uD83D\uDE28', options: ['sad', 'angry', 'surprised', 'scared'] },
    { emotion: 'surprised', face: '\uD83D\uDE32', options: ['surprised', 'happy', 'scared', 'angry'] },
    { emotion: 'disgusted', face: '\uD83E\uDD22', options: ['happy', 'sad', 'disgusted', 'angry'] },
    { emotion: 'worried',   face: '\uD83D\uDE1F', options: ['angry', 'worried', 'happy', 'surprised'] },
    { emotion: 'shy',       face: '\uD83D\uDE33', options: ['sad', 'scared', 'shy', 'happy'] },
    { emotion: 'proud',     face: '\uD83D\uDE0A', options: ['angry', 'proud', 'sad', 'disgusted'] },
    { emotion: 'frustrated',face: '\uD83D\uDE24', options: ['happy', 'scared', 'frustrated', 'sad'] },
    { emotion: 'confused',  face: '\uD83D\uDE15', options: ['confused', 'angry', 'happy', 'scared'] },
    { emotion: 'excited',   face: '\uD83E\uDD29', options: ['sad', 'angry', 'scared', 'excited'] },
    { emotion: 'nervous',   face: '\uD83D\uDE2C', options: ['nervous', 'happy', 'angry', 'sad'] },
    { emotion: 'loved',     face: '\uD83E\uDD70', options: ['angry', 'sad', 'loved', 'scared'] },
    { emotion: 'bored',     face: '\uD83D\uDE11', options: ['happy', 'bored', 'angry', 'surprised'] },
    { emotion: 'lonely',    face: '\uD83D\uDE14', options: ['proud', 'lonely', 'excited', 'angry'] }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Emotion Scenarios (for "What Would You Feel?") ──
  // ══════════════════════════════════════════════════════════════
  var SCENARIOS = {
    elementary: [
      { situation: 'Your best friend shares their lunch with you.', likely: ['happy', 'grateful', 'loved'], family: 'happy' },
      { situation: 'You can\'t find your favorite toy anywhere.', likely: ['sad', 'worried', 'frustrated'], family: 'sad' },
      { situation: 'Someone cuts in front of you in line.', likely: ['angry', 'annoyed', 'frustrated'], family: 'angry' },
      { situation: 'You hear a loud noise in the dark.', likely: ['scared', 'startled', 'nervous'], family: 'scared' },
      { situation: 'Your teacher says you got the highest grade!', likely: ['surprised', 'proud', 'happy'], family: 'surprised' },
      { situation: 'You see someone being mean to an animal.', likely: ['disgusted', 'angry', 'sad'], family: 'disgusted' },
      { situation: 'It\'s your birthday and everyone forgot.', likely: ['sad', 'lonely', 'disappointed'], family: 'sad' },
      { situation: 'You\'re about to go on stage for a play.', likely: ['nervous', 'excited', 'scared'], family: 'scared' }
    ],
    middle: [
      { situation: 'Your friend group is hanging out without you — you found out through social media.', likely: ['left out', 'jealous', 'hurt', 'angry'], family: 'sad' },
      { situation: 'You studied hard and aced a test you were worried about.', likely: ['proud', 'relieved', 'confident'], family: 'happy' },
      { situation: 'Someone shares a rumor about you that isn\'t true.', likely: ['angry', 'hurt', 'embarrassed', 'betrayed'], family: 'angry' },
      { situation: 'You have a huge project due tomorrow and you haven\'t started.', likely: ['anxious', 'overwhelmed', 'panicked'], family: 'scared' },
      { situation: 'A classmate you don\'t know well gives you a genuine compliment.', likely: ['surprised', 'happy', 'shy'], family: 'surprised' },
      { situation: 'You see someone cheating on a test while you studied hard.', likely: ['angry', 'disgusted', 'frustrated'], family: 'disgusted' },
      { situation: 'Your parents are arguing loudly downstairs.', likely: ['scared', 'worried', 'helpless', 'sad'], family: 'scared' },
      { situation: 'You make the team / get the part you tried out for.', likely: ['excited', 'proud', 'relieved', 'grateful'], family: 'happy' }
    ],
    high: [
      { situation: 'You receive a rejection letter from a college you really wanted to attend.', likely: ['disappointed', 'sad', 'anxious', 'resigned'], family: 'sad' },
      { situation: 'A close friend comes to you for help with a serious personal problem.', likely: ['concerned', 'empathetic', 'valued', 'overwhelmed'], family: 'scared' },
      { situation: 'You discover a teacher graded you unfairly compared to others.', likely: ['indignant', 'frustrated', 'disrespected'], family: 'angry' },
      { situation: 'You stand up for someone being bullied and others join you.', likely: ['proud', 'empowered', 'nervous', 'fulfilled'], family: 'happy' },
      { situation: 'Your social media post gets a lot of negative comments.', likely: ['hurt', 'anxious', 'embarrassed', 'angry'], family: 'sad' },
      { situation: 'You witness someone being treated differently because of their identity.', likely: ['angry', 'disgusted', 'sad', 'motivated'], family: 'disgusted' },
      { situation: 'You complete a challenging project you almost gave up on.', likely: ['accomplished', 'proud', 'relieved', 'empowered'], family: 'happy' },
      { situation: 'A relationship you valued ends unexpectedly.', likely: ['grief', 'confused', 'hurt', 'rejected'], family: 'sad' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Body Sensations Map ──
  // Where emotions are felt in the body
  // ══════════════════════════════════════════════════════════════
  var BODY_SENSATIONS = {
    happy: [
      { area: 'Face', icon: '\uD83D\uDE04', desc: { elementary: 'Big smile! Cheeks go up!', middle: 'Facial muscles relax, a natural smile appears', high: 'Zygomatic major activation \u2014 genuine Duchenne smile engages eyes + mouth' } },
      { area: 'Chest', icon: '\u2764\uFE0F', desc: { elementary: 'Warm fuzzy feeling in your chest', middle: 'Warmth spreading through your chest, heart feels open', high: 'Cardiovascular warmth \u2014 increased heart rate variability and blood flow' } },
      { area: 'Whole Body', icon: '\u2728', desc: { elementary: 'Feeling light like a balloon!', middle: 'Light, energized, open posture \u2014 you take up more space', high: 'Reduced muscular tension, expansive posture, increased parasympathetic tone' } }
    ],
    sad: [
      { area: 'Eyes', icon: '\uD83D\uDCA7', desc: { elementary: 'Stingy eyes, want to cry', middle: 'Tears forming, eyes feel heavy and tired', high: 'Lacrimal activation, periorbital heaviness \u2014 tears contain stress hormones' } },
      { area: 'Throat', icon: '\uD83E\uDEE8', desc: { elementary: 'Lump in your throat', middle: 'Throat feels tight, hard to swallow or speak', high: 'Globus sensation \u2014 vagus nerve response to emotional distress' } },
      { area: 'Chest', icon: '\uD83D\uDDA4', desc: { elementary: 'Heavy feeling like a rock on your chest', middle: 'Tightness or weight pressing on your chest', high: 'Thoracic constriction \u2014 the literal "heavy heart" phenomenon' } }
    ],
    angry: [
      { area: 'Head', icon: '\uD83D\uDD25', desc: { elementary: 'Face feels HOT and red!', middle: 'Blood rushes to your face, head feels like it\'s burning', high: 'Sympathetic flush \u2014 vasodilation in facial capillaries from adrenaline surge' } },
      { area: 'Hands', icon: '\u270A', desc: { elementary: 'Hands want to squeeze tight!', middle: 'Fists clench automatically, muscles tense up', high: 'Isometric muscle contraction \u2014 fight-response motor preparation' } },
      { area: 'Stomach', icon: '\uD83D\uDCA2', desc: { elementary: 'Tummy gets tight and hard', middle: 'Stomach knots up, jaw clenches, body braces', high: 'Cortisol spike redirects blood from digestion to skeletal muscles' } }
    ],
    scared: [
      { area: 'Heart', icon: '\uD83D\uDC93', desc: { elementary: 'Heart goes BOOM BOOM BOOM really fast!', middle: 'Heart pounds hard, breathing gets fast and shallow', high: 'Tachycardia \u2014 amygdala triggers adrenaline release for fight-or-flight' } },
      { area: 'Stomach', icon: '\uD83E\uDD8B', desc: { elementary: 'Butterflies in your tummy!', middle: 'Stomach drops or flutters, might feel sick', high: 'Enteric nervous system response \u2014 the "gut feeling" is physiologically literal' } },
      { area: 'Legs', icon: '\uD83E\uDDB5', desc: { elementary: 'Legs feel shaky and wobbly', middle: 'Legs feel weak or jittery, urge to run', high: 'Blood redirected to large muscle groups \u2014 flight preparation via vasodilation' } }
    ],
    surprised: [
      { area: 'Eyes', icon: '\uD83D\uDC40', desc: { elementary: 'Eyes go WIDE open!', middle: 'Eyes widen, eyebrows shoot up automatically', high: 'Orbicularis oculi release \u2014 increased visual aperture for rapid threat assessment' } },
      { area: 'Chest', icon: '\uD83D\uDCA8', desc: { elementary: 'Quick gasp! Suck in air!', middle: 'Sharp intake of breath, chest expands suddenly', high: 'Diaphragmatic spasm \u2014 the autonomic gasp reflex for rapid oxygenation' } },
      { area: 'Whole Body', icon: '\u26A1', desc: { elementary: 'Body freezes for a second!', middle: 'Momentary freeze, then hyper-alert \u2014 everything sharpens', high: 'Orienting response \u2014 0.5s freeze while amygdala evaluates novelty vs. threat' } }
    ],
    disgusted: [
      { area: 'Nose', icon: '\uD83D\uDC43', desc: { elementary: 'Nose scrunches up! Eww!', middle: 'Nose wrinkles, upper lip curls involuntarily', high: 'Levator labii superioris contraction \u2014 evolved to reduce nasal intake of contaminants' } },
      { area: 'Stomach', icon: '\uD83E\uDD22', desc: { elementary: 'Tummy feels yucky and sick', middle: 'Queasy, nauseated feeling in the pit of your stomach', high: 'Vagal nausea response \u2014 evolved to prevent ingestion of harmful substances' } },
      { area: 'Throat', icon: '\uD83D\uDE16', desc: { elementary: 'Throat feels gaggy', middle: 'Gag reflex sensation, want to push away', high: 'Pharyngeal constriction \u2014 physical rejection response to perceived contamination' } }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Empathy Scenarios (perspective-taking) ──
  // ══════════════════════════════════════════════════════════════
  var EMPATHY_SCENARIOS = {
    elementary: [
      { situation: 'A new kid starts at your school. They don\'t know anyone and sit alone at lunch.', person: 'the new kid', likely: ['lonely', 'scared', 'nervous', 'shy'], family: 'scared' },
      { situation: 'Your classmate\'s drawing wins the art contest after they worked really hard.', person: 'your classmate', likely: ['proud', 'happy', 'surprised', 'excited'], family: 'happy' },
      { situation: 'Someone accidentally breaks their friend\'s favorite pencil.', person: 'the person who broke it', likely: ['guilty', 'worried', 'embarrassed'], family: 'sad' },
      { situation: 'A kid gets picked last for teams at recess again.', person: 'the kid picked last', likely: ['sad', 'left out', 'angry', 'embarrassed'], family: 'sad' },
      { situation: 'Your friend\'s pet hamster got sick and might not get better.', person: 'your friend', likely: ['sad', 'scared', 'worried'], family: 'sad' },
      { situation: 'A student gets called on in class and gives the wrong answer. Some kids giggle.', person: 'the student', likely: ['embarrassed', 'ashamed', 'angry', 'hurt'], family: 'disgusted' }
    ],
    middle: [
      { situation: 'A classmate posts a group photo on social media, but one friend was deliberately cropped out.', person: 'the cropped-out friend', likely: ['hurt', 'rejected', 'angry', 'confused'], family: 'sad' },
      { situation: 'A student shares a personal poem in class and the room goes totally silent.', person: 'the student', likely: ['vulnerable', 'anxious', 'brave', 'exposed'], family: 'scared' },
      { situation: 'Your teammate makes a mistake that costs the game, and other players yell at them.', person: 'the teammate', likely: ['ashamed', 'angry', 'helpless', 'frustrated'], family: 'sad' },
      { situation: 'A friend just found out they\'re moving to a different city next month.', person: 'your friend', likely: ['sad', 'scared', 'anxious', 'angry'], family: 'sad' },
      { situation: 'Someone notices a classmate eating alone every day and decides to sit with them.', person: 'the classmate who was alone', likely: ['surprised', 'grateful', 'relieved', 'happy'], family: 'happy' },
      { situation: 'A student works incredibly hard on a project but gets a lower grade than someone who barely tried.', person: 'the hard-working student', likely: ['frustrated', 'resentful', 'disappointed', 'angry'], family: 'angry' }
    ],
    high: [
      { situation: 'A student comes out to their friend group and the room goes quiet before anyone responds.', person: 'the student who came out', likely: ['vulnerable', 'anxious', 'brave', 'terrified'], family: 'scared' },
      { situation: 'Someone discovers their close friend has been talking about them behind their back.', person: 'the person who found out', likely: ['betrayed', 'hurt', 'angry', 'confused'], family: 'angry' },
      { situation: 'A peer gives up a leadership position to help another student who needs the experience more.', person: 'the peer who stepped aside', likely: ['conflicted', 'proud', 'generous', 'wistful'], family: 'happy' },
      { situation: 'A student with a learning disability gets accommodations, and others complain it\'s "unfair."', person: 'the student with the disability', likely: ['ashamed', 'frustrated', 'angry', 'isolated'], family: 'angry' },
      { situation: 'After a school incident, a student who witnessed it keeps replaying it in their mind.', person: 'the witness', likely: ['anxious', 'helpless', 'overwhelmed'], family: 'scared' },
      { situation: 'A graduating senior realizes they might never see some of their friends regularly again.', person: 'the senior', likely: ['nostalgic', 'sad', 'grateful', 'anxious'], family: 'sad' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Emotion Mixer Data ──
  // Two emotions combine into complex feelings
  // ══════════════════════════════════════════════════════════════
  var EMOTION_MIXES = [
    { emotion1: 'happy', emotion2: 'scared', result: 'Nervous Excitement', emoji: '\uD83C\uDFA2', desc: { elementary: 'Like when you\'re about to ride a roller coaster \u2014 scared AND excited!', middle: 'That butterflies feeling before a big performance or trying something new.', high: 'Anticipatory arousal where threat and reward circuits activate simultaneously.' } },
    { emotion1: 'sad', emotion2: 'happy', result: 'Nostalgia', emoji: '\uD83D\uDCF7', desc: { elementary: 'Missing something fun that happened \u2014 happy it happened, sad it\'s over.', middle: 'Looking at old photos and smiling while feeling a gentle ache.', high: 'Bittersweet affect \u2014 simultaneous appreciation and loss processing.' } },
    { emotion1: 'angry', emotion2: 'sad', result: 'Frustration', emoji: '\uD83D\uDE24', desc: { elementary: 'When you try SO hard but it still doesn\'t work and you want to cry AND yell.', middle: 'Repeated effort without results creates a mix of grief and rage.', high: 'Goal-blockage distress \u2014 anger at the obstacle fused with grief over the desired outcome.' } },
    { emotion1: 'scared', emotion2: 'angry', result: 'Defensiveness', emoji: '\uD83D\uDEE1\uFE0F', desc: { elementary: 'When you\'re scared so you act tough and push people away.', middle: 'Fear disguised as anger \u2014 protecting yourself by going on the offensive.', high: 'Fight response masking threat perception \u2014 aggression as a fear-management strategy.' } },
    { emotion1: 'happy', emotion2: 'sad', result: 'Gratitude', emoji: '\uD83D\uDE4F', desc: { elementary: 'Feeling SO thankful it almost makes you cry happy tears!', middle: 'Deep appreciation that touches something tender inside.', high: 'Gratitude lives at the intersection of joy and awareness of impermanence.' } },
    { emotion1: 'surprised', emotion2: 'happy', result: 'Delight', emoji: '\u2728', desc: { elementary: 'When something AMAZING happens that you didn\'t expect at all!', middle: 'Unexpected joy \u2014 the pleasant shock of something wonderful.', high: 'Positive violation of expectation \u2014 dopamine surge from unpredicted reward.' } },
    { emotion1: 'angry', emotion2: 'disgusted', result: 'Contempt', emoji: '\uD83D\uDE12', desc: { elementary: 'Thinking someone is being really unfair AND really icky about it.', middle: 'Looking down on someone while feeling angry at their behavior.', high: 'Moral superiority fused with indignation \u2014 one of the most corrosive emotional blends.' } },
    { emotion1: 'sad', emotion2: 'scared', result: 'Hopelessness', emoji: '\uD83C\uDF27\uFE0F', desc: { elementary: 'Feeling like nothing good is coming and you can\'t fix it.', middle: 'When sadness about now meets fear about the future.', high: 'Learned helplessness \u2014 grief over present circumstances amplified by anticipated future loss.' } },
    { emotion1: 'happy', emotion2: 'angry', result: 'Passion', emoji: '\uD83D\uDD25', desc: { elementary: 'Caring SO much about something that it makes you both excited and fierce!', middle: 'That fire when you love something and fight hard to protect it.', high: 'High-arousal approach motivation \u2014 joy in purpose combined with fierce protectiveness.' } },
    { emotion1: 'surprised', emotion2: 'scared', result: 'Shock', emoji: '\u26A1', desc: { elementary: 'When something happens SO fast your brain can\'t catch up!', middle: 'Overwhelmed by something sudden \u2014 frozen between fear and disbelief.', high: 'Acute stress response to unexpected threat \u2014 cognitive processing temporarily suspended.' } },
    { emotion1: 'disgusted', emotion2: 'sad', result: 'Shame', emoji: '\uD83D\uDE14', desc: { elementary: 'Feeling really bad about yourself \u2014 like YOU are the problem.', middle: 'Self-directed disgust combined with sadness about who you are.', high: 'Self-evaluation failure \u2014 disgust turned inward, often accompanied by withdrawal motivation.' } },
    { emotion1: 'scared', emotion2: 'sad', result: 'Vulnerability', emoji: '\uD83D\uDC94', desc: { elementary: 'Feeling open and easily hurt, like you have no armor on.', middle: 'Being emotionally exposed \u2014 scary, but also the only way to connect deeply.', high: 'Emotional exposure without guaranteed safety \u2014 the prerequisite for authentic connection.' } }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Body Language Challenges (harder Face Reader difficulty) ──
  // ══════════════════════════════════════════════════════════════
  var BODY_LANGUAGE_CHALLENGES = [
    { emotion: 'happy', desc: 'Their eyes crinkle at the corners, shoulders are relaxed and open, leaning slightly forward.', options: ['happy', 'surprised', 'scared', 'angry'] },
    { emotion: 'sad', desc: 'Shoulders slumped, looking down at the floor, speaking very quietly, moving slowly.', options: ['angry', 'sad', 'disgusted', 'scared'] },
    { emotion: 'angry', desc: 'Jaw clenched tight, standing very rigid, arms crossed, speaking through gritted teeth.', options: ['scared', 'sad', 'angry', 'disgusted'] },
    { emotion: 'scared', desc: 'Eyes darting around the room, body pressed against the wall, hands trembling slightly.', options: ['angry', 'surprised', 'sad', 'scared'] },
    { emotion: 'surprised', desc: 'Mouth hanging open, eyebrows raised high, stepped backward suddenly, hand on chest.', options: ['surprised', 'scared', 'happy', 'angry'] },
    { emotion: 'disgusted', desc: 'Nose wrinkled, upper lip curled, leaning away, turning their head to the side.', options: ['sad', 'disgusted', 'angry', 'surprised'] },
    { emotion: 'nervous', desc: 'Fidgeting with their hands, bouncing their leg, checking the clock repeatedly, biting their lip.', options: ['happy', 'nervous', 'angry', 'sad'] },
    { emotion: 'embarrassed', desc: 'Face turning red, avoiding eye contact, covering their face with their hand, nervous laugh.', options: ['angry', 'scared', 'embarrassed', 'sad'] },
    { emotion: 'proud', desc: 'Standing tall, chin slightly raised, broad smile, making eye contact with everyone.', options: ['proud', 'surprised', 'angry', 'happy'] },
    { emotion: 'frustrated', desc: 'Sighing repeatedly, running hands through hair, pushing things around on the desk, muttering.', options: ['sad', 'scared', 'frustrated', 'disgusted'] },
    { emotion: 'lonely', desc: 'Sitting apart from the group, watching others interact, hugging themselves, quiet and still.', options: ['angry', 'lonely', 'disgusted', 'surprised'] },
    { emotion: 'excited', desc: 'Bouncing on their toes, talking fast, gesturing wildly, can\'t sit still, voice getting louder.', options: ['scared', 'angry', 'surprised', 'excited'] }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_checkin',     icon: '\uD83C\uDF1F', name: 'Emotion Check',       desc: 'Log your first emotion check-in' },
    { id: 'checkin_5',         icon: '\u2B50',       name: 'Self-Aware',           desc: 'Complete 5 emotion check-ins' },
    { id: 'checkin_20',        icon: '\uD83C\uDFC6', name: 'Emotion Expert',       desc: 'Complete 20 emotion check-ins' },
    { id: 'wheel_explorer',    icon: '\uD83C\uDF08', name: 'Wheel Explorer',       desc: 'Explore all 6 emotion families' },
    { id: 'vocab_10',          icon: '\uD83D\uDCDA', name: 'Word Builder',         desc: 'Learn 10 emotion vocabulary words' },
    { id: 'vocab_30',          icon: '\uD83E\uDDE0', name: 'Emotion Scholar',      desc: 'Learn 30 emotion vocabulary words' },
    { id: 'face_5',            icon: '\uD83D\uDE04', name: 'Face Reader',          desc: 'Correctly identify 5 facial expressions' },
    { id: 'face_streak_5',     icon: '\uD83D\uDD25', name: 'Streak Spotter',       desc: 'Get 5 face matches in a row' },
    { id: 'scenario_5',        icon: '\uD83C\uDFAD', name: 'Scenario Thinker',     desc: 'Respond to 5 emotion scenarios' },
    { id: 'journal_3',         icon: '\uD83D\uDCD3', name: 'Reflective Writer',    desc: 'Write 3 emotion journal entries' },
    { id: 'journal_10',        icon: '\u270D\uFE0F', name: 'Journal Master',       desc: 'Write 10 emotion journal entries' },
    { id: 'ai_coach',          icon: '\u2728',       name: 'Coached',              desc: 'Get advice from the AI Emotion Coach' },
    { id: 'intensity_range',   icon: '\uD83D\uDCCA', name: 'Range Finder',         desc: 'Log emotions at 3 different intensity levels' },
    { id: 'mixed_feelings',    icon: '\uD83C\uDF00', name: 'Complex Feeler',       desc: 'Identify mixed emotions in a scenario' },
    { id: 'all_families',      icon: '\uD83C\uDFA8', name: 'Full Spectrum',        desc: 'Check in with all 6 emotion families' },
    { id: 'body_map',          icon: '\uD83E\uDEC0', name: 'Body Mapper',          desc: 'Explore where an emotion lives in your body' },
    { id: 'quiz_10',           icon: '\uD83E\uDDE9', name: 'Vocab Whiz',           desc: 'Answer 10 vocab quiz questions correctly' },
    { id: 'body_lang_5',       icon: '\uD83D\uDD0D', name: 'Body Language Pro',    desc: 'Read 5 body language descriptions correctly' },
    { id: 'empathy_5',         icon: '\uD83E\uDD1D', name: 'Empathy Champion',     desc: 'Complete 5 empathy perspective scenarios' },
    { id: 'mixer_3',           icon: '\uD83E\uDDEA', name: 'Emotion Chemist',      desc: 'Discover 3 emotion mixes' },
    { id: 'calendar_week',     icon: '\uD83D\uDCC5', name: 'Week Tracker',         desc: 'Check in on 7 different days' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('emotions', {
    icon: '\uD83D\uDE0A',
    label: 'Emotions Explorer',
    desc: 'Build emotional vocabulary \u2014 identify, name, and understand feelings.',
    color: 'blue',
    category: 'self-awareness',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var t = ctx.t;
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.emotions) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('emotions', key); }
        else { if (ctx.update) ctx.update('emotions', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'wheel';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Wheel state
      var selectedFamily  = d.selectedFamily || null;
      var expandedFeeling = d.expandedFeeling || null;
      var learnedWords    = d.learnedWords || {};
      var exploredFamilies = d.exploredFamilies || {};

      // Check-in state
      var checkinFamily   = d.checkinFamily || null;
      var checkinFeeling  = d.checkinFeeling || null;
      var checkinIntensity = d.checkinIntensity != null ? d.checkinIntensity : 5;
      var checkinNote     = d.checkinNote || '';
      var checkinHistory  = d.checkinHistory || [];

      // Face Reader state
      var faceIdx         = d.faceIdx || 0;
      var faceScore       = d.faceScore || 0;
      var faceStreak      = d.faceStreak || 0;
      var faceBestStreak  = d.faceBestStreak || 0;
      var faceTotal       = d.faceTotal || 0;
      var faceRevealed    = d.faceRevealed || null; // 'correct' or 'wrong'
      var faceOrder       = d.faceOrder || null;

      // Scenarios state
      var scenarioIdx     = d.scenarioIdx || 0;
      var scenarioAnswer  = d.scenarioAnswer || null;
      var scenarioRevealed = d.scenarioRevealed || false;
      var scenariosCompleted = d.scenariosCompleted || 0;

      // Journal state
      var journalEntries  = d.journalEntries || [];
      var journalDraft    = d.journalDraft || '';
      var journalEmotion  = d.journalEmotion || '';
      var journalAiResp   = d.journalAiResp || null;
      var journalAiLoading = d.journalAiLoading || false;

      // Quiz state (Vocab Quiz in Wheel tab)
      var wheelMode        = d.wheelMode || 'explore'; // 'explore' or 'quiz'
      var quizDef          = d.quizDef || null;     // current definition shown
      var quizWord         = d.quizWord || null;     // correct answer word
      var quizOptions      = d.quizOptions || [];    // 4 word choices
      var quizAnswer       = d.quizAnswer || null;
      var quizRevealed     = d.quizRevealed || false;
      var quizScore        = d.quizScore || 0;
      var quizTotal        = d.quizTotal || 0;

      // Face Reader difficulty
      var faceDifficulty   = d.faceDifficulty || 'emoji'; // 'emoji' or 'body'
      var bodyLangIdx      = d.bodyLangIdx || 0;
      var bodyLangScore    = d.bodyLangScore || 0;
      var bodyLangTotal    = d.bodyLangTotal || 0;
      var bodyLangRevealed = d.bodyLangRevealed || null;
      var bodyLangOrder    = d.bodyLangOrder || null;

      // Empathy Scenarios
      var scenarioMode     = d.scenarioMode || 'self'; // 'self' or 'empathy'
      var empathyIdx       = d.empathyIdx || 0;
      var empathyAnswer    = d.empathyAnswer || null;
      var empathyRevealed  = d.empathyRevealed || false;
      var empathyCompleted = d.empathyCompleted || 0;

      // Emotion Mixer
      var mixEmotion1      = d.mixEmotion1 || null;
      var mixEmotion2      = d.mixEmotion2 || null;
      var mixResult        = d.mixResult || null;
      var mixHistory       = d.mixHistory || [];
      var mixAiLoading     = d.mixAiLoading || false;
      var mixAiCustom      = d.mixAiCustom || null;

      // Body map viewed families
      var bodyMapViewed    = d.bodyMapViewed || {};

      // Badge state
      var earnedBadges    = d.earnedBadges || {};
      var showBadgePopup  = d.showBadgePopup || null;
      var showBadgesPanel = d.showBadgesPanel || false;

      // ── Initialize face challenge order (shuffle, deferred to useEffect) ──
      React.useEffect(function() {
        var fd = (ctx.toolData && ctx.toolData.emotions) || {};
        if (!fd.faceOrder) {
          var order = FACE_CHALLENGES.map(function(_, i) { return i; });
          for (var i = order.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
          }
          if (ctx.update) ctx.update('emotions', 'faceOrder', order);
        }
      }, []);

      // ── Initialize body language challenge order (deferred to useEffect) ──
      React.useEffect(function() {
        var fd = (ctx.toolData && ctx.toolData.emotions) || {};
        if (!fd.bodyLangOrder) {
          var blOrder = BODY_LANGUAGE_CHALLENGES.map(function(_, i) { return i; });
          for (var bi = blOrder.length - 1; bi > 0; bi--) {
            var bj = Math.floor(Math.random() * (bi + 1));
            var btmp = blOrder[bi]; blOrder[bi] = blOrder[bj]; blOrder[bj] = btmp;
          }
          if (ctx.update) ctx.update('emotions', 'bodyLangOrder', blOrder);
        }
      }, []);

      // ── Vocab Quiz generator ──
      function generateQuiz() {
        // Gather all feelings from all families for current grade band
        var allFeelings = [];
        EMOTION_FAMILIES.forEach(function(fam) {
          var feelings = fam.feelings[band] || fam.feelings.elementary;
          feelings.forEach(function(f) { allFeelings.push({ word: f.word, def: f.def, family: fam.id }); });
        });
        // Pick a random target
        var targetIdx = Math.floor(Math.random() * allFeelings.length);
        var target = allFeelings[targetIdx];
        // Pick 3 distractors (different words)
        var distractors = [];
        var used = {}; used[target.word] = true;
        while (distractors.length < 3 && Object.keys(used).length < allFeelings.length) {
          var ri = Math.floor(Math.random() * allFeelings.length);
          if (!used[allFeelings[ri].word]) {
            used[allFeelings[ri].word] = true;
            distractors.push(allFeelings[ri].word);
          }
        }
        // Shuffle options
        var opts = distractors.concat([target.word]);
        for (var qi = opts.length - 1; qi > 0; qi--) {
          var qj = Math.floor(Math.random() * (qi + 1));
          var qtmp = opts[qi]; opts[qi] = opts[qj]; opts[qj] = qtmp;
        }
        upd({ quizDef: target.def, quizWord: target.word, quizOptions: opts, quizAnswer: null, quizRevealed: false });
      }

      // ── Badge helper ──
      function tryAwardBadge(badgeId) {
        if (earnedBadges[badgeId]) return;
        var newBadges = Object.assign({}, earnedBadges);
        newBadges[badgeId] = Date.now();
        upd('earnedBadges', newBadges);
        var badge = BADGES.find(function(b) { return b.id === badgeId; });
        if (badge) {
          upd('showBadgePopup', badgeId);
          if (soundEnabled) sfxBadge();
          addToast(badge.icon + ' Badge earned: ' + badge.name + '!', 'success');
          awardXP(25);
          setTimeout(function() { upd('showBadgePopup', null); }, 3000);
        }
      }

      function readAloud(text) {
        if (callTTS && band === 'elementary') callTTS(text);
      }

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'wheel',     label: '\uD83C\uDF08 Emotion Wheel' },
        { id: 'checkin',   label: '\uD83D\uDCDD Check-In' },
        { id: 'faces',     label: '\uD83D\uDE04 Face Reader' },
        { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' },
        { id: 'journal',   label: '\uD83D\uDCD3 Journal' },
        { id: 'mixer',    label: '\uD83E\uDDEA Mixer' },
        { id: 'history',   label: '\uD83D\uDCCA History' }
      ];

      var tabBar = h('div', {
        role: 'tablist', 'aria-label': 'Emotions Wheel tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', { 'aria-label': tab.label,
            key: tab.id,
            role: 'tab', 'aria-selected': isActive,
            onClick: function() { upd('activeTab', tab.id); if (soundEnabled) sfxClick(); },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#3b82f6' : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontWeight: isActive ? 700 : 500, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
            }
          }, tab.label);
        }),
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          title: soundEnabled ? 'Mute sounds' : 'Enable sounds',
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#9ca3af', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#3b82f633' : 'transparent', color: '#9ca3af', fontSize: 14, flexShrink: 0 }
        }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length)
      );

      // ══════════════════════════════════════════════════════════
      // ── Badge Popup ──
      // ══════════════════════════════════════════════════════════
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', {
            style: { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' },
            onKeyDown: function(e) { if (e.key === 'Escape') e.currentTarget.click(); }, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Badge details', tabIndex: -1, onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', {
              style: { background: 'linear-gradient(135deg, #0c1631 0%, #1e293b 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid #3b82f6', maxWidth: 320 },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, popBadge.icon),
              h('p', { style: { fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Badge Earned!'),
              h('h3', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 20 } }, popBadge.name),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13 } }, popBadge.desc),
              h('p', { style: { margin: '12px 0 0 0', color: '#3b82f6', fontSize: 12, fontWeight: 700 } }, '+25 XP')
            )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── Badges Panel ──
      // ══════════════════════════════════════════════════════════
      if (showBadgesPanel) {
        return h('div', { style: { minHeight: '100%' } },
          tabBar, badgePopup,
          h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 } },
              BADGES.map(function(badge) {
                var earned = !!earnedBadges[badge.id];
                return h('div', {
                  key: badge.id, title: badge.name + ': ' + badge.desc,
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#0c1631' : '#1e293b', border: '1px solid ' + (earned ? '#3b82f6' : '#334155'), opacity: earned ? 1 : 0.4 }
                },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, badge.icon),
                  h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#e2e8f0' : '#64748b' } }, badge.name),
                  h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 2 } }, badge.desc)
                );
              })
            ),
            h('button', { 'aria-label': 'Close',
              onClick: function() { upd('showBadgesPanel', false); },
              style: { display: 'block', margin: '16px auto 0', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }
            }, 'Close')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Emotion Wheel ──
      // ══════════════════════════════════════════════════════════
      var wheelContent = null;
      if (activeTab === 'wheel') {
        // Mode toggle: Explore vs Quiz
        var wheelToggle = h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 } },
          h('button', { 'aria-label': 'Explore',
            onClick: function() { upd('wheelMode', 'explore'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '8px 0 0 8px', border: '1px solid #334155', background: wheelMode === 'explore' ? '#3b82f6' : '#1e293b', color: wheelMode === 'explore' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83C\uDF08 Explore'),
          h('button', { 'aria-label': 'Vocab Quiz',
            onClick: function() { upd('wheelMode', 'quiz'); if (!quizDef) generateQuiz(); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '0 8px 8px 0', border: '1px solid #334155', background: wheelMode === 'quiz' ? '#8b5cf6' : '#1e293b', color: wheelMode === 'quiz' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83E\uDDE9 Vocab Quiz')
        );

        // Quiz mode content
        var quizContent = null;
        if (wheelMode === 'quiz') {
          quizContent = h('div', { style: { maxWidth: 480, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? '\uD83E\uDDE9 Feelings Word Quiz!' : '\uD83E\uDDE9 Vocabulary Quiz'
            ),
            h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 4 } },
              band === 'elementary' ? 'Read the meaning, then pick the right feelings word!' : 'Match the definition to the correct emotion word.'
            ),
            h('p', { style: { textAlign: 'center', color: '#9ca3af', fontSize: 11, marginBottom: 20 } },
              'Score: ' + quizScore + '/' + quizTotal
            ),

            // Definition card
            quizDef && h('div', { style: { padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid #8b5cf644', marginBottom: 20, textAlign: 'center' } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Definition'),
              h('p', { style: { fontSize: 16, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } }, '"' + quizDef + '"')
            ),

            // Answer options
            quizDef && !quizRevealed && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              quizOptions.map(function(opt) {
                return h('button', { 'aria-label': 'Toggle sound',
                  key: opt,
                  onClick: function() {
                    var correct = opt === quizWord;
                    var newTotal = quizTotal + 1;
                    var newScore = correct ? quizScore + 1 : quizScore;
                    upd({ quizAnswer: opt, quizRevealed: true, quizTotal: newTotal, quizScore: newScore });
                    if (correct) {
                      if (soundEnabled) sfxCorrect();
                      awardXP(5);
                      if (newScore >= 10) tryAwardBadge('quiz_10');
                    } else {
                      if (soundEnabled) sfxWrong();
                    }
                  },
                  style: {
                    padding: '14px 10px', borderRadius: 10, border: '1px solid #334155',
                    background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', textTransform: 'capitalize'
                  },
                  onMouseEnter: function(e) { e.currentTarget.style.borderColor = '#8b5cf6'; },
                  onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#334155'; }
                }, opt);
              })
            ),

            // Revealed answer
            quizRevealed && h('div', null,
              h('div', {
                style: {
                  padding: 20, borderRadius: 14, marginBottom: 16,
                  background: quizAnswer === quizWord ? '#22c55e18' : '#ef444418',
                  border: '1px solid ' + (quizAnswer === quizWord ? '#22c55e44' : '#ef444444')
                }
              },
                h('p', { style: { fontSize: 18, fontWeight: 700, color: quizAnswer === quizWord ? '#22c55e' : '#ef4444', marginBottom: 4 } },
                  quizAnswer === quizWord
                    ? (band === 'elementary' ? '\u2B50 You got it!' : '\u2705 Correct!')
                    : (band === 'elementary' ? 'Not quite!' : 'Not this time')
                ),
                quizAnswer !== quizWord && h('p', { style: { fontSize: 13, color: '#cbd5e1' } },
                  'The answer was: ' + quizWord
                )
              ),
              h('button', { 'aria-label': 'Next Question',
                onClick: function() { generateQuiz(); },
                style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
              }, 'Next Question \u2192')
            ),

            // Start quiz if no question loaded
            !quizDef && h('button', { 'aria-label': 'Start Quiz!',
              onClick: function() { generateQuiz(); },
              style: { display: 'block', margin: '20px auto', padding: '14px 32px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'Start Quiz!')
          );
        }

        wheelContent = h('div', { style: { padding: 20 } },
          wheelToggle,
          quizContent,

          wheelMode === 'explore' && h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? 'How Do Feelings Work?' : 'Emotion Wheel'
          ),
          wheelMode === 'explore' && h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Tap a color to explore that feeling family!' :
            band === 'middle' ? 'Explore emotion families and build your feelings vocabulary.' :
            'Map the landscape of human emotion \u2014 from primary affects to nuanced states.'
          ),

          // Emotion family wheel (circular layout)
          wheelMode === 'explore' && !selectedFamily && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 400, margin: '0 auto 20px' } },
            EMOTION_FAMILIES.map(function(fam) {
              var explored = exploredFamilies[fam.id];
              return h('button', { 'aria-label': 'Toggle sound',
                key: fam.id,
                onClick: function() {
                  upd('selectedFamily', fam.id);
                  var newExplored = Object.assign({}, exploredFamilies);
                  newExplored[fam.id] = true;
                  upd('exploredFamilies', newExplored);
                  if (Object.keys(newExplored).length >= EMOTION_FAMILIES.length) tryAwardBadge('wheel_explorer');
                  if (soundEnabled) sfxClick();
                },
                style: {
                  padding: 20, borderRadius: 16, border: '2px solid ' + fam.color + '66',
                  background: fam.color + '15', cursor: 'pointer', textAlign: 'center',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                },
                onMouseEnter: function(e) { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 20px ' + fam.color + '33'; },
                onMouseLeave: function(e) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }
              },
                h('div', { style: { fontSize: 36, marginBottom: 6 } }, fam.emoji),
                h('div', { style: { fontWeight: 700, color: fam.color, fontSize: 14, marginBottom: 2 } }, fam.label),
                h('div', { style: { fontSize: 10, color: '#cbd5e1', lineHeight: 1.3 } }, fam.desc[band]),
                explored && h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 4 } }, '\u2713 explored')
              );
            })
          ),

          // Feelings vocabulary (selected family)
          wheelMode === 'explore' && selectedFamily && (function() {
            var fam = EMOTION_FAMILIES.find(function(f) { return f.id === selectedFamily; });
            if (!fam) return null;
            var feelings = fam.feelings[band] || fam.feelings.elementary;

            return h('div', null,
              h('button', { 'aria-label': 'All Emotions',
                onClick: function() { upd({ selectedFamily: null, expandedFeeling: null }); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#334155', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, marginBottom: 16 }
              }, '\u2190 All Emotions'),

              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('span', { style: { fontSize: 36 } }, fam.emoji),
                h('h4', { style: { margin: '4px 0', color: fam.color, fontSize: 20 } }, fam.label + ' Family'),
                h('p', { style: { color: '#cbd5e1', fontSize: 12 } }, fam.desc[band])
              ),

              // Vocabulary cards
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
                feelings.map(function(feeling) {
                  var isExpanded = expandedFeeling === feeling.word;
                  var isLearned = learnedWords[feeling.word];
                  return h('div', {
                    key: feeling.word,
                    style: {
                      borderRadius: 14, border: '1px solid ' + (isExpanded ? fam.color + '66' : '#334155'),
                      background: isExpanded ? fam.color + '12' : '#1e293b', overflow: 'hidden',
                      gridColumn: isExpanded ? '1 / -1' : 'auto'
                    }
                  },
                    h('button', { 'aria-label': 'Toggle sound',
                      onClick: function() {
                        var newExpanded = isExpanded ? null : feeling.word;
                        upd('expandedFeeling', newExpanded);
                        if (!isLearned && newExpanded) {
                          var newLearned = Object.assign({}, learnedWords);
                          newLearned[feeling.word] = true;
                          upd('learnedWords', newLearned);
                          awardXP(5);
                          var total = Object.keys(newLearned).length;
                          if (total >= 10) tryAwardBadge('vocab_10');
                          if (total >= 30) tryAwardBadge('vocab_30');
                        }
                        if (soundEnabled) sfxClick();
                      },
                      style: {
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', width: '100%',
                        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#f1f5f9'
                      }
                    },
                      h('span', { style: { fontSize: 22, flexShrink: 0 } }, feeling.emoji),
                      h('div', { style: { flex: 1 } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                          h('span', { style: { fontWeight: 700, fontSize: 14, color: isExpanded ? fam.color : '#f1f5f9', textTransform: 'capitalize' } }, feeling.word),
                          isLearned && h('span', { style: { fontSize: 10, color: '#22c55e' } }, '\u2713')
                        )
                      )
                    ),
                    isExpanded && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #334155' } },
                      h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, marginTop: 10, marginBottom: 10 } }, feeling.def),
                      band === 'elementary' && callTTS && h('button', { 'aria-label': 'Read Aloud',
                        onClick: function() { readAloud(feeling.word + '. ' + feeling.def); },
                        style: { padding: '5px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 11, marginRight: 6 }
                      }, '\uD83D\uDD0A Read Aloud'),
                      h('button', { 'aria-label': 'I’m feeling this',
                        onClick: function() {
                          upd({ activeTab: 'checkin', checkinFamily: fam.id, checkinFeeling: feeling.word });
                          if (soundEnabled) sfxClick();
                        },
                        style: { padding: '5px 12px', borderRadius: 6, border: 'none', background: fam.color, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }
                      }, 'I\'m feeling this \u2192')
                    )
                  );
                })
              ),

              // Learned count
              h('p', { style: { textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 16 } },
                '\uD83D\uDCDA ' + Object.keys(learnedWords).length + ' words learned'
              )
            );
          })()
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Check-In ──
      // ══════════════════════════════════════════════════════════
      var checkinContent = null;
      if (activeTab === 'checkin') {
        checkinContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? 'How Are You Feeling?' : 'Emotion Check-In'
          ),
          h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Pick the color that matches your feeling, then tell me more!' :
            'Identify your current emotional state with precision.'
          ),

          // Step 1: Pick emotion family
          h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
              '1. ' + (band === 'elementary' ? 'What\'s the main feeling?' : 'Primary emotion family')
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' } },
              EMOTION_FAMILIES.map(function(fam) {
                var isSel = checkinFamily === fam.id;
                return h('button', { 'aria-label': fam.emoji,
                  key: fam.id,
                  onClick: function() { upd({ checkinFamily: fam.id, checkinFeeling: null }); if (soundEnabled) sfxClick(); },
                  style: {
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 14px',
                    borderRadius: 12, border: isSel ? '2px solid ' + fam.color : '1px solid #334155',
                    background: isSel ? fam.color + '18' : '#1e293b', cursor: 'pointer', minWidth: 70
                  }
                },
                  h('span', { style: { fontSize: 24 } }, fam.emoji),
                  h('span', { style: { fontSize: 10, color: isSel ? fam.color : '#94a3b8', fontWeight: isSel ? 700 : 500 } }, fam.label)
                );
              })
            )
          ),

          // Step 2: Pick specific feeling
          checkinFamily && (function() {
            var fam = EMOTION_FAMILIES.find(function(f) { return f.id === checkinFamily; });
            if (!fam) return null;
            var feelings = fam.feelings[band] || fam.feelings.elementary;
            return h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
                '2. ' + (band === 'elementary' ? 'Which kind of ' + fam.label.toLowerCase() + '?' : 'Specific feeling')
              ),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                feelings.map(function(f) {
                  var isSel = checkinFeeling === f.word;
                  return h('button', { 'aria-label': 'Toggle sound',
                    key: f.word,
                    onClick: function() { upd('checkinFeeling', f.word); if (soundEnabled) sfxClick(); },
                    style: {
                      padding: '6px 14px', borderRadius: 20, border: isSel ? '2px solid ' + fam.color : '1px solid #334155',
                      background: isSel ? fam.color + '22' : '#1e293b', color: isSel ? fam.color : '#94a3b8',
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                    }
                  }, h('span', null, f.emoji), f.word);
                })
              ),
              h('input', {
                type: 'text', value: checkinFeeling || '',
                'aria-label': 'Type your own feeling word',
                onChange: function(e) { upd('checkinFeeling', e.target.value); },
                placeholder: 'Or type your own word...',
                style: { width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              })
            );
          })(),

          // Step 3: Intensity
          checkinFeeling && h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
              '3. ' + (band === 'elementary' ? 'How BIG is the feeling? (1 = tiny, 10 = huge)' : 'Intensity (1-10)')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
              h('span', { style: { fontSize: 11, color: '#9ca3af' } }, band === 'elementary' ? 'tiny' : '1'),
              h('input', {
                type: 'range', min: 1, max: 10, value: checkinIntensity,
                'aria-label': 'Emotion intensity',
                onChange: function(e) { upd('checkinIntensity', parseInt(e.target.value)); },
                style: { flex: 1, accentColor: '#3b82f6' }
              }),
              h('span', { style: { fontSize: 11, color: '#9ca3af' } }, band === 'elementary' ? 'HUGE' : '10'),
              h('span', { style: { fontSize: 20, fontWeight: 800, color: '#3b82f6', minWidth: 30, textAlign: 'center' } }, checkinIntensity)
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 } },
              h('span', { style: { fontSize: 16 } }, '\uD83E\uDD0F'),
              h('span', { style: { fontSize: 16 } }, checkinIntensity <= 3 ? '\uD83D\uDE42' : checkinIntensity <= 6 ? '\uD83D\uDE10' : checkinIntensity <= 8 ? '\uD83D\uDE1F' : '\uD83E\uDD2F')
            )
          ),

          // Step 4: Optional note
          checkinFeeling && h('div', { style: { marginBottom: 20 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
              '4. ' + (band === 'elementary' ? 'What made you feel this way? (you can skip this)' : 'What triggered this? (optional)')
            ),
            h('textarea', {
              value: checkinNote,
              'aria-label': 'Emotion check-in note',
              onChange: function(e) { upd('checkinNote', e.target.value); },
              placeholder: band === 'elementary' ? 'My friend said something mean...' : 'Describe the situation briefly...',
              rows: 2,
              style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            })
          ),

          // Save check-in
          checkinFamily && checkinFeeling && h('button', { 'aria-label': 'Save check-in',
            onClick: function() {
              var entry = {
                family: checkinFamily,
                feeling: checkinFeeling,
                intensity: checkinIntensity,
                note: checkinNote,
                timestamp: Date.now()
              };
              var newHistory = checkinHistory.concat([entry]);
              upd({
                checkinHistory: newHistory,
                checkinFamily: null, checkinFeeling: null, checkinIntensity: 5, checkinNote: ''
              });
              if (soundEnabled) sfxCheckin();
              celebrate();
              addToast('\uD83D\uDE0A Emotion logged!', 'success');
              awardXP(10);
              tryAwardBadge('first_checkin');
              if (newHistory.length >= 5) tryAwardBadge('checkin_5');
              if (newHistory.length >= 20) tryAwardBadge('checkin_20');
              // Check if all families used
              var familiesUsed = {};
              newHistory.forEach(function(e) { familiesUsed[e.family] = true; });
              if (Object.keys(familiesUsed).length >= EMOTION_FAMILIES.length) tryAwardBadge('all_families');
              // Check intensity range
              var intensities = {};
              newHistory.forEach(function(e) {
                if (e.intensity <= 3) intensities.low = true;
                else if (e.intensity <= 7) intensities.mid = true;
                else intensities.high = true;
              });
              if (Object.keys(intensities).length >= 3) tryAwardBadge('intensity_range');
            },
            style: { width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
          }, '\u2705 Log This Feeling'),

          // Body Sensations Map (shows when a family is selected)
          checkinFamily && BODY_SENSATIONS[checkinFamily] && h('div', { style: { marginTop: 16, padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #334155' } },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
              h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', margin: 0 } },
                '\uD83E\uDEC0 ' + (band === 'elementary' ? 'Where Do You Feel It?' : 'Body Sensations Map')
              ),
              !bodyMapViewed[checkinFamily] && h('span', { style: { fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#3b82f622', color: '#60a5fa', fontWeight: 600 } }, 'NEW')
            ),
            h('p', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.4 } },
              band === 'elementary' ? 'Feelings live in your body too! See where this feeling shows up:' :
              band === 'middle' ? 'Emotions create physical sensations. Here\'s where this one often shows up:' :
              'Emotions are embodied experiences. These are common somatic markers for this affect:'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              BODY_SENSATIONS[checkinFamily].map(function(sens, si) {
                var fam = EMOTION_FAMILIES.find(function(f) { return f.id === checkinFamily; });
                return h('div', { key: si, style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, background: (fam ? fam.color : '#3b82f6') + '10', border: '1px solid ' + (fam ? fam.color : '#3b82f6') + '22' } },
                  h('span', { style: { fontSize: 24, flexShrink: 0, lineHeight: 1 } }, sens.icon),
                  h('div', { style: { flex: 1 } },
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: fam ? fam.color : '#f1f5f9' } }, sens.area),
                    h('p', { style: { fontSize: 12, color: '#cbd5e1', margin: '2px 0 0', lineHeight: 1.4 } }, sens.desc[band])
                  )
                );
              })
            ),
            h('button', { 'aria-label': 'Toggle sound',
              onClick: function() {
                var newViewed = Object.assign({}, bodyMapViewed);
                newViewed[checkinFamily] = true;
                upd('bodyMapViewed', newViewed);
                if (Object.keys(newViewed).length >= 1) tryAwardBadge('body_map');
                if (soundEnabled) sfxClick();
                addToast('\uD83E\uDEC0 Body map explored!', 'info');
                awardXP(5);
              },
              disabled: !!bodyMapViewed[checkinFamily],
              style: { marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: bodyMapViewed[checkinFamily] ? '#334155' : '#3b82f6', color: bodyMapViewed[checkinFamily] ? '#64748b' : '#fff', fontWeight: 600, fontSize: 11, cursor: bodyMapViewed[checkinFamily] ? 'default' : 'pointer' }
            }, bodyMapViewed[checkinFamily] ? '\u2713 Explored' : '\uD83E\uDEC0 I notice these sensations!')
          ),

          // Recent check-ins
          checkinHistory.length > 0 && h('div', { style: { marginTop: 20 } },
            h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, 'Recent Check-Ins'),
            checkinHistory.slice().reverse().slice(0, 3).map(function(entry, i) {
              var fam = EMOTION_FAMILIES.find(function(f) { return f.id === entry.family; });
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 6 } },
                h('span', { style: { fontSize: 20 } }, fam ? fam.emoji : '\uD83D\uDE0A'),
                h('div', { style: { flex: 1 } },
                  h('span', { style: { fontSize: 13, fontWeight: 600, color: fam ? fam.color : '#f1f5f9', textTransform: 'capitalize' } }, entry.feeling),
                  h('span', { style: { fontSize: 10, color: '#9ca3af', marginLeft: 8 } }, 'Intensity: ' + entry.intensity + '/10')
                ),
                h('span', { style: { fontSize: 10, color: '#9ca3af' } }, new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Face Reader ──
      // ══════════════════════════════════════════════════════════
      var facesContent = null;
      if (activeTab === 'faces') {
        // Difficulty toggle
        var diffToggle = h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 } },
          h('button', { 'aria-label': 'Emoji Faces',
            onClick: function() { upd('faceDifficulty', 'emoji'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 16px', borderRadius: '8px 0 0 8px', border: '1px solid #334155', background: faceDifficulty === 'emoji' ? '#3b82f6' : '#1e293b', color: faceDifficulty === 'emoji' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83D\uDE04 Emoji Faces'),
          h('button', { 'aria-label': 'Body Language',
            onClick: function() { upd('faceDifficulty', 'body'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 16px', borderRadius: '0 8px 8px 0', border: '1px solid #334155', background: faceDifficulty === 'body' ? '#f59e0b' : '#1e293b', color: faceDifficulty === 'body' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83D\uDD0D Body Language')
        );

        if (faceDifficulty === 'emoji') {
          // Original emoji mode
          var currentFaceIdx = faceOrder ? faceOrder[faceIdx % faceOrder.length] : faceIdx % FACE_CHALLENGES.length;
          var challenge = FACE_CHALLENGES[currentFaceIdx];

          facesContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } },
              band === 'elementary' ? '\uD83D\uDE04 What Face Is This?' : '\uD83D\uDE04 Facial Expression Reader'
            ),
            h('p', { style: { color: '#cbd5e1', fontSize: 12, marginBottom: 4 } },
              band === 'elementary' ? 'Look at the face and pick the right feeling!' :
              'Identify the emotion shown in each facial expression.'
            ),
            diffToggle,
            h('p', { style: { color: '#9ca3af', fontSize: 11, marginBottom: 20 } },
              'Score: ' + faceScore + '/' + faceTotal + ' \u2022 Streak: ' + faceStreak + ' \u2022 Best: ' + faceBestStreak
            ),

            // Face display
            h('div', { style: { fontSize: 80, marginBottom: 20, transition: 'transform 0.2s' } }, challenge.face),

            // Options
            !faceRevealed
              ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 300, margin: '0 auto' } },
                  challenge.options.map(function(opt) {
                    return h('button', { 'aria-label': 'Toggle sound',
                      key: opt,
                      onClick: function() {
                        var correct = opt === challenge.emotion;
                        var newTotal = faceTotal + 1;
                        var newScore = correct ? faceScore + 1 : faceScore;
                        var newStreak = correct ? faceStreak + 1 : 0;
                        var newBest = Math.max(faceBestStreak, newStreak);
                        upd({ faceRevealed: correct ? 'correct' : 'wrong', faceTotal: newTotal, faceScore: newScore, faceStreak: newStreak, faceBestStreak: newBest });
                        if (correct) {
                          if (soundEnabled) sfxCorrect();
                          awardXP(5);
                          if (newScore >= 5) tryAwardBadge('face_5');
                          if (newStreak >= 5) tryAwardBadge('face_streak_5');
                        } else {
                          if (soundEnabled) sfxWrong();
                        }
                      },
                      style: {
                        padding: '14px 0', borderRadius: 10, border: '1px solid #334155',
                        background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: 14,
                        cursor: 'pointer', textTransform: 'capitalize'
                      },
                      onMouseEnter: function(e) { e.currentTarget.style.borderColor = '#3b82f6'; },
                      onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#334155'; }
                    }, opt);
                  })
                )
              : h('div', null,
                  h('div', {
                    style: {
                      padding: 20, borderRadius: 14, marginBottom: 16,
                      background: faceRevealed === 'correct' ? '#22c55e18' : '#ef444418',
                      border: '1px solid ' + (faceRevealed === 'correct' ? '#22c55e44' : '#ef444444')
                    }
                  },
                    h('p', { style: { fontSize: 18, fontWeight: 700, color: faceRevealed === 'correct' ? '#22c55e' : '#ef4444', marginBottom: 4 } },
                      faceRevealed === 'correct'
                        ? (band === 'elementary' ? 'Yes! Great job!' : 'Correct!')
                        : (band === 'elementary' ? 'Not quite!' : 'Not this time')
                    ),
                    faceRevealed === 'wrong' && h('p', { style: { fontSize: 13, color: '#cbd5e1' } },
                      'This face shows: ' + challenge.emotion
                    )
                  ),
                  h('button', { 'aria-label': 'Next Face',
                    onClick: function() {
                      upd({ faceIdx: faceIdx + 1, faceRevealed: null });
                    },
                    style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                  }, 'Next Face \u2192')
                )
          );
        } else {
          // Body Language difficulty mode
          var blIdx = bodyLangOrder ? bodyLangOrder[bodyLangIdx % bodyLangOrder.length] : bodyLangIdx % BODY_LANGUAGE_CHALLENGES.length;
          var blChallenge = BODY_LANGUAGE_CHALLENGES[blIdx];

          facesContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } },
              '\uD83D\uDD0D Body Language Reader'
            ),
            h('p', { style: { color: '#cbd5e1', fontSize: 12, marginBottom: 4 } },
              band === 'elementary' ? 'Read how the person is acting. What are they feeling?' :
              'Read the body language description and identify the emotion.'
            ),
            diffToggle,
            h('p', { style: { color: '#9ca3af', fontSize: 11, marginBottom: 20 } },
              'Score: ' + bodyLangScore + '/' + bodyLangTotal
            ),

            // Description card
            h('div', { style: { padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid #f59e0b44', marginBottom: 20 } },
              h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Body Language Clue'),
              h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } }, '"' + blChallenge.desc + '"')
            ),

            // Options
            !bodyLangRevealed
              ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 300, margin: '0 auto' } },
                  blChallenge.options.map(function(opt) {
                    return h('button', { 'aria-label': 'Toggle sound',
                      key: opt,
                      onClick: function() {
                        var correct = opt === blChallenge.emotion;
                        var newTotal = bodyLangTotal + 1;
                        var newScore = correct ? bodyLangScore + 1 : bodyLangScore;
                        upd({ bodyLangRevealed: correct ? 'correct' : 'wrong', bodyLangTotal: newTotal, bodyLangScore: newScore });
                        if (correct) {
                          if (soundEnabled) sfxCorrect();
                          awardXP(8);
                          if (newScore >= 5) tryAwardBadge('body_lang_5');
                        } else {
                          if (soundEnabled) sfxWrong();
                        }
                      },
                      style: {
                        padding: '14px 0', borderRadius: 10, border: '1px solid #334155',
                        background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: 14,
                        cursor: 'pointer', textTransform: 'capitalize'
                      },
                      onMouseEnter: function(e) { e.currentTarget.style.borderColor = '#f59e0b'; },
                      onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#334155'; }
                    }, opt);
                  })
                )
              : h('div', null,
                  h('div', {
                    style: {
                      padding: 20, borderRadius: 14, marginBottom: 16,
                      background: bodyLangRevealed === 'correct' ? '#22c55e18' : '#ef444418',
                      border: '1px solid ' + (bodyLangRevealed === 'correct' ? '#22c55e44' : '#ef444444')
                    }
                  },
                    h('p', { style: { fontSize: 18, fontWeight: 700, color: bodyLangRevealed === 'correct' ? '#22c55e' : '#ef4444', marginBottom: 4 } },
                      bodyLangRevealed === 'correct' ? '\u2705 Correct!' : 'Not this time'
                    ),
                    bodyLangRevealed !== 'correct' && h('p', { style: { fontSize: 13, color: '#cbd5e1' } },
                      'The answer was: ' + blChallenge.emotion
                    )
                  ),
                  h('button', { 'aria-label': 'Next Clue',
                    onClick: function() { upd({ bodyLangIdx: bodyLangIdx + 1, bodyLangRevealed: null }); },
                    style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                  }, 'Next Clue \u2192')
                )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Scenarios ──
      // ══════════════════════════════════════════════════════════
      var scenariosContent = null;
      if (activeTab === 'scenarios') {
        // Mode toggle: Self vs Empathy
        var scenModeToggle = h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 } },
          h('button', { 'aria-label': 'What Would I Feel?',
            onClick: function() { upd('scenarioMode', 'self'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '8px 0 0 8px', border: '1px solid #334155', background: scenarioMode === 'self' ? '#3b82f6' : '#1e293b', color: scenarioMode === 'self' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83C\uDFAD What Would I Feel?'),
          h('button', { 'aria-label': 'What Do They Feel?',
            onClick: function() { upd('scenarioMode', 'empathy'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '0 8px 8px 0', border: '1px solid #334155', background: scenarioMode === 'empathy' ? '#ec4899' : '#1e293b', color: scenarioMode === 'empathy' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83E\uDD1D What Do They Feel?')
        );

        if (scenarioMode === 'empathy') {
          // Empathy perspective-taking mode
          var empScens = EMPATHY_SCENARIOS[band] || EMPATHY_SCENARIOS.elementary;
          var currentEmpathy = empScens[empathyIdx % empScens.length];

          scenariosContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', color: '#f1f5f9', fontSize: 18, marginBottom: 4 } },
              band === 'elementary' ? '\uD83E\uDD1D How Would They Feel?' : '\uD83E\uDD1D Empathy Perspective'
            ),
            h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 4 } },
              band === 'elementary' ? 'Think about how the OTHER person feels in this story!' :
              band === 'middle' ? 'Step into someone else\'s shoes. What might they be experiencing?' :
              'Practice cognitive empathy \u2014 infer another person\'s emotional state from context.'
            ),
            scenModeToggle,
            h('p', { style: { textAlign: 'center', color: '#9ca3af', fontSize: 11, marginBottom: 20 } },
              'Empathy scenarios completed: ' + empathyCompleted
            ),

            // Scenario card
            h('div', { style: { padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid #ec489944', marginBottom: 16, textAlign: 'center' } },
              h('p', { style: { fontSize: 10, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } },
                'Empathy Scenario ' + ((empathyIdx % empScens.length) + 1) + ' of ' + empScens.length
              ),
              h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } },
                '"' + currentEmpathy.situation + '"'
              )
            ),

            // Question prompt
            h('div', { style: { padding: 12, borderRadius: 10, background: '#ec489912', border: '1px solid #ec489922', marginBottom: 16, textAlign: 'center' } },
              h('p', { style: { fontSize: 13, fontWeight: 700, color: '#ec4899', margin: 0 } },
                band === 'elementary'
                  ? 'How do you think ' + currentEmpathy.person + ' feels?'
                  : 'What is ' + currentEmpathy.person + ' most likely feeling?'
              )
            ),

            // Answer options
            !empathyRevealed && h('div', null,
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 } },
                EMOTION_FAMILIES.map(function(fam) {
                  var isSel = empathyAnswer === fam.id;
                  return h('button', { 'aria-label': fam.emoji,
                    key: fam.id,
                    onClick: function() { upd('empathyAnswer', fam.id); if (soundEnabled) sfxClick(); },
                    style: {
                      padding: '10px 16px', borderRadius: 12, border: isSel ? '2px solid ' + fam.color : '1px solid #334155',
                      background: isSel ? fam.color + '22' : '#1e293b', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }
                  },
                    h('span', { style: { fontSize: 18 } }, fam.emoji),
                    h('span', { style: { fontSize: 12, color: isSel ? fam.color : '#94a3b8', fontWeight: isSel ? 700 : 500 } }, fam.label)
                  );
                })
              ),
              empathyAnswer && h('button', { 'aria-label': 'See Their Perspective',
                onClick: function() {
                  upd('empathyRevealed', true);
                  var nc = empathyCompleted + 1;
                  upd('empathyCompleted', nc);
                  if (nc >= 5) tryAwardBadge('empathy_5');
                  if (soundEnabled) sfxReveal();
                  awardXP(15);
                },
                style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#ec4899', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
              }, 'See Their Perspective \u2192')
            ),

            // Revealed
            empathyRevealed && h('div', null,
              h('div', { style: { padding: 20, borderRadius: 14, background: '#ec489918', border: '1px solid #ec489944', marginBottom: 16 } },
                h('p', { style: { fontSize: 11, fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
                  currentEmpathy.person + ' might feel:'
                ),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 } },
                  currentEmpathy.likely.map(function(word) {
                    return h('span', { key: word, style: { padding: '4px 12px', borderRadius: 20, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 12, textTransform: 'capitalize' } }, word);
                  })
                ),
                empathyAnswer === currentEmpathy.family
                  ? h('p', { style: { fontSize: 13, color: '#22c55e', fontWeight: 600 } },
                      '\u2705 ' + (band === 'elementary' ? 'Great empathy! You understood how they might feel!' : 'Strong perspective-taking! You identified their likely emotional state.')
                    )
                  : h('p', { style: { fontSize: 13, color: '#f59e0b' } },
                      '\uD83D\uDCA1 ' + (band === 'elementary' ? 'That\'s a thoughtful guess! Empathy means trying to understand \u2014 even when we guess differently.' :
                      'Different perspective, but the effort to understand matters most. Empathy is a skill that grows with practice.')
                    ),
                h('p', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 } },
                  band === 'elementary'
                    ? 'Putting yourself in someone else\'s shoes is a superpower! The more you practice, the better you get at understanding others.'
                    : band === 'middle'
                    ? 'Perspective-taking is the foundation of empathy. Even when we can\'t know exactly how someone feels, the attempt to understand builds connection.'
                    : 'Cognitive empathy \u2014 modeling another\'s internal state \u2014 is distinct from emotional empathy (feeling with them). Both are essential social-emotional competencies.'
                )
              ),
              h('button', { 'aria-label': 'Next Empathy Scenario',
                onClick: function() { upd({ empathyIdx: empathyIdx + 1, empathyAnswer: null, empathyRevealed: false }); },
                style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#ec4899', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
              }, 'Next Empathy Scenario \u2192')
            )
          );
        } else {
        // Original "self" scenario mode
        var scens = SCENARIOS[band] || SCENARIOS.elementary;
        var currentScenario = scens[scenarioIdx % scens.length];

        scenariosContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', color: '#f1f5f9', fontSize: 18, marginBottom: 4 } },
            band === 'elementary' ? '\uD83C\uDFAD What Would You Feel?' : '\uD83C\uDFAD Emotion Scenarios'
          ),
          h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Read what happens and pick how you\'d feel!' :
            'Consider each situation. What emotions might arise?'
          ),
          scenModeToggle,
          h('p', { style: { textAlign: 'center', color: '#9ca3af', fontSize: 11, marginBottom: 20 } },
            'Scenarios completed: ' + scenariosCompleted
          ),

          // Scenario card
          h('div', { style: { padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 20, textAlign: 'center' } },
            h('p', { style: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
              'Scenario ' + ((scenarioIdx % scens.length) + 1) + ' of ' + scens.length
            ),
            h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } },
              '"' + currentScenario.situation + '"'
            )
          ),

          // Answer options (emotion families)
          !scenarioRevealed && h('div', null,
            h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 } },
              band === 'elementary' ? 'I would feel...' : 'Primary emotion:'
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 } },
              EMOTION_FAMILIES.map(function(fam) {
                var isSel = scenarioAnswer === fam.id;
                return h('button', { 'aria-label': fam.emoji,
                  key: fam.id,
                  onClick: function() { upd('scenarioAnswer', fam.id); if (soundEnabled) sfxClick(); },
                  style: {
                    padding: '10px 16px', borderRadius: 12, border: isSel ? '2px solid ' + fam.color : '1px solid #334155',
                    background: isSel ? fam.color + '22' : '#1e293b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }
                },
                  h('span', { style: { fontSize: 18 } }, fam.emoji),
                  h('span', { style: { fontSize: 12, color: isSel ? fam.color : '#94a3b8', fontWeight: isSel ? 700 : 500 } }, fam.label)
                );
              })
            ),
            scenarioAnswer && h('button', { 'aria-label': 'See What Others Feel',
              onClick: function() {
                upd('scenarioRevealed', true);
                var nc = scenariosCompleted + 1;
                upd('scenariosCompleted', nc);
                if (nc >= 5) tryAwardBadge('scenario_5');
                if (soundEnabled) sfxReveal();
                awardXP(10);
              },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'See What Others Feel \u2192')
          ),

          // Revealed
          scenarioRevealed && h('div', null,
            h('div', { style: { padding: 20, borderRadius: 14, background: '#3b82f618', border: '1px solid #3b82f644', marginBottom: 16 } },
              h('p', { style: { fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
                'Common responses:'
              ),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 } },
                currentScenario.likely.map(function(word) {
                  return h('span', { key: word, style: { padding: '4px 12px', borderRadius: 20, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 12, textTransform: 'capitalize' } }, word);
                })
              ),
              scenarioAnswer === currentScenario.family
                ? h('p', { style: { fontSize: 13, color: '#22c55e', fontWeight: 600 } },
                    '\u2705 ' + (band === 'elementary' ? 'You picked the same family! Great emotional awareness!' : 'Your response aligns with common reactions!')
                  )
                : h('p', { style: { fontSize: 13, color: '#f59e0b' } },
                    '\uD83D\uDCA1 ' + (band === 'elementary' ? 'Different people feel different things \u2014 and that\'s okay! There\'s no wrong answer.' :
                    'Everyone reacts differently. Your response is valid \u2014 emotional responses are personal.')
                  ),
              h('p', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 } },
                band === 'elementary' ? 'Many people might feel ' + currentScenario.likely.slice(0, 3).join(', ') + ' in this situation. Did you think of a different feeling? That\'s okay too!' :
                band === 'middle' ? 'This situation commonly triggers ' + currentScenario.likely.join(', ') + '. Notice: most situations produce multiple emotions at once.' :
                'Common affective responses include ' + currentScenario.likely.join(', ') + '. Note the complexity \u2014 real emotional experiences are rarely mono-dimensional.'
              )
            ),
            currentScenario.likely.length > 2 && !earnedBadges['mixed_feelings'] && h('button', { 'aria-label': 'I see there can be mixed emotions!',
              onClick: function() { tryAwardBadge('mixed_feelings'); addToast('You noticed that situations can cause mixed feelings!', 'success'); },
              style: { width: '100%', padding: '10px 0', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', fontWeight: 600, fontSize: 12, cursor: 'pointer', marginBottom: 12 }
            }, '\uD83C\uDF00 I see \u2014 there can be mixed emotions!'),
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() { upd({ scenarioIdx: scenarioIdx + 1, scenarioAnswer: null, scenarioRevealed: false }); },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
        } // end else (self mode)
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Journal ──
      // ══════════════════════════════════════════════════════════
      var journalContent = null;
      if (activeTab === 'journal') {
        journalContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDCD3 My Feelings Journal' : '\uD83D\uDCD3 Emotion Journal'
          ),
          h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Write about your feelings. You can ask the AI helper for advice!' :
            'Reflect on your emotional experiences. The AI coach can help you process.'
          ),

          // New entry
          h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 20 } },
            h('div', { style: { marginBottom: 10 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 } },
                band === 'elementary' ? 'What feeling do you want to write about?' : 'Emotion to reflect on'
              ),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
                EMOTION_FAMILIES.map(function(fam) {
                  return h('button', { 'aria-label': fam.emoji + ' ' + fam.label,
                    key: fam.id,
                    onClick: function() { upd('journalEmotion', fam.label); if (soundEnabled) sfxClick(); },
                    style: {
                      padding: '4px 10px', borderRadius: 8, border: journalEmotion === fam.label ? '2px solid ' + fam.color : '1px solid #334155',
                      background: journalEmotion === fam.label ? fam.color + '18' : 'transparent',
                      color: journalEmotion === fam.label ? fam.color : '#94a3b8', cursor: 'pointer', fontSize: 11
                    }
                  }, fam.emoji + ' ' + fam.label);
                })
              ),
              h('input', {
                type: 'text', value: journalEmotion,
                'aria-label': 'Type an emotion for journaling',
                onChange: function(e) { upd('journalEmotion', e.target.value); },
                placeholder: 'Or type any emotion...',
                style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              })
            ),
            h('textarea', {
              value: journalDraft,
              'aria-label': 'Emotion journal entry',
              onChange: function(e) { upd('journalDraft', e.target.value); },
              placeholder: band === 'elementary'
                ? 'Today I felt ___ because ___. It made my body feel ___.'
                : 'What happened? How did it make you feel? What did you notice in your body and thoughts?',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),

            h('div', { style: { display: 'flex', gap: 8 } },
              journalDraft.trim() && h('button', { 'aria-label': 'Save Entry',
                onClick: function() {
                  var entry = { emotion: journalEmotion, text: journalDraft, timestamp: Date.now(), aiResponse: journalAiResp };
                  var newEntries = journalEntries.concat([entry]);
                  upd({ journalEntries: newEntries, journalDraft: '', journalEmotion: '', journalAiResp: null });
                  if (soundEnabled) sfxCorrect();
                  addToast('Journal entry saved!', 'success');
                  awardXP(15);
                  if (newEntries.length >= 3) tryAwardBadge('journal_3');
                  if (newEntries.length >= 10) tryAwardBadge('journal_10');
                },
                style: { flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCBE Save Entry'),

              callGemini && journalDraft.trim().length > 10 && h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  upd('journalAiLoading', true);
                  var prompt = 'You are a warm, supportive school counselor. A ' + band + ' school student wrote this emotion journal entry about feeling ' + (journalEmotion || 'something') + ':\n\n"' + journalDraft + '"\n\n' +
                    'Respond in 3-4 sentences. ' +
                    (band === 'elementary' ? 'Use simple, warm language. Validate their feeling, name what you notice, and suggest one small thing they could try.' :
                     band === 'middle' ? 'Be genuine and relatable. Validate, reflect back what you notice, and offer a perspective shift or coping suggestion.' :
                     'Use evidence-based language. Validate with empathy, identify the emotion pattern, and offer a reframe or regulation strategy rooted in CBT/DBT principles.') +
                    ' Never minimize their experience.';
                  callGemini(prompt).then(function(resp) {
                    upd({ journalAiResp: resp, journalAiLoading: false });
                    tryAwardBadge('ai_coach');
                    if (soundEnabled) sfxReveal();
                  }).catch(function() {
                    upd({ journalAiResp: 'I couldn\'t respond right now, but your feelings are valid and it\'s great that you\'re writing about them.', journalAiLoading: false });
                  });
                },
                disabled: journalAiLoading,
                style: { flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: journalAiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }
              },
                Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                journalAiLoading ? 'Thinking...' : 'Ask AI Coach'
              )
            ),

            // AI response
            journalAiResp && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 12, background: '#8b5cf618', border: '1px solid #8b5cf644' } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 6 } }, '\u2728 Emotion Coach'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, journalAiResp)
            )
          ),

          // Past entries
          journalEntries.length > 0 && h('div', null,
            h('p', { style: { fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 } },
              'Past Entries (' + journalEntries.length + ')'
            ),
            journalEntries.slice().reverse().slice(0, 5).map(function(entry, i) {
              return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  h('span', { style: { fontSize: 12, fontWeight: 600, color: '#60a5fa', textTransform: 'capitalize' } }, entry.emotion || 'Reflection'),
                  h('span', { style: { fontSize: 10, color: '#9ca3af' } }, new Date(entry.timestamp).toLocaleDateString())
                ),
                h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: 0 } },
                  entry.text.length > 150 ? entry.text.substring(0, 150) + '...' : entry.text
                ),
                entry.aiResponse && h('p', { style: { fontSize: 11, color: '#a78bfa', marginTop: 6, fontStyle: 'italic' } },
                  '\u2728 ' + (entry.aiResponse.length > 100 ? entry.aiResponse.substring(0, 100) + '...' : entry.aiResponse)
                )
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: History / Insights ──
      // ══════════════════════════════════════════════════════════
      var historyContent = null;
      if (activeTab === 'history') {
        var hist = checkinHistory || [];

        // Compute stats
        var familyCounts = {};
        EMOTION_FAMILIES.forEach(function(f) { familyCounts[f.id] = 0; });
        hist.forEach(function(e) { if (familyCounts[e.family] !== undefined) familyCounts[e.family]++; });
        var totalCheckins = hist.length;

        // Average intensity
        var avgIntensity = totalCheckins > 0 ? (hist.reduce(function(sum, e) { return sum + (e.intensity || 5); }, 0) / totalCheckins) : 0;

        // Intensity over time (last 20)
        var recentHist = hist.slice(-20);

        // Most frequent feeling
        var feelingCounts = {};
        hist.forEach(function(e) { feelingCounts[e.feeling] = (feelingCounts[e.feeling] || 0) + 1; });
        var topFeeling = null; var topCount = 0;
        Object.keys(feelingCounts).forEach(function(f) {
          if (feelingCounts[f] > topCount) { topCount = feelingCounts[f]; topFeeling = f; }
        });

        historyContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Emotion Insights'),

          // ── Mood Calendar (last 28 days) ──
          totalCheckins > 0 && (function() {
            // Build a map of date -> most recent emotion family
            var dayMap = {};
            var dayIntensity = {};
            hist.forEach(function(e) {
              var dateStr = new Date(e.timestamp).toISOString().slice(0, 10);
              dayMap[dateStr] = e.family; // last one wins
              dayIntensity[dateStr] = e.intensity;
            });

            // Generate last 28 days
            var today = new Date();
            var days = [];
            for (var di = 27; di >= 0; di--) {
              var d2 = new Date(today);
              d2.setDate(d2.getDate() - di);
              var ds = d2.toISOString().slice(0, 10);
              days.push({ date: ds, dayNum: d2.getDate(), dayName: ['S','M','T','W','T','F','S'][d2.getDay()], family: dayMap[ds] || null, intensity: dayIntensity[ds] || 0 });
            }

            // Calendar week badge check
            var uniqueDays = Object.keys(dayMap).length;
            if (uniqueDays >= 7) tryAwardBadge('calendar_week');

            return h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
              h('p', { style: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 } }, '\uD83D\uDCC5 Mood Calendar (Last 28 Days)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 } },
                // Day-of-week headers
                ['S','M','T','W','T','F','S'].map(function(dn, di) {
                  return h('div', { key: 'hdr-' + di, style: { textAlign: 'center', fontSize: 11, color: '#9ca3af', fontWeight: 700, paddingBottom: 2 } }, dn);
                }),
                // Pad first week to correct day alignment
                (function() {
                  var firstDay = new Date(days[0].date);
                  var pad = firstDay.getDay();
                  var pads = [];
                  for (var pi = 0; pi < pad; pi++) {
                    pads.push(h('div', { key: 'pad-' + pi }));
                  }
                  return pads;
                })(),
                // Calendar cells
                days.map(function(day) {
                  var fam = day.family ? EMOTION_FAMILIES.find(function(f) { return f.id === day.family; }) : null;
                  var bgColor = fam ? fam.color + '44' : '#0f172a';
                  var borderColor = fam ? fam.color + '66' : '#1e293b';
                  var isToday = day.date === today.toISOString().slice(0, 10);
                  return h('div', {
                    key: day.date,
                    title: day.date + (fam ? ' \u2014 ' + fam.label + ' (' + day.intensity + '/10)' : ''),
                    style: {
                      textAlign: 'center', padding: '4px 0', borderRadius: 6,
                      background: bgColor, border: '1px solid ' + (isToday ? '#3b82f6' : borderColor),
                      fontSize: 10, color: fam ? '#f1f5f9' : '#475569', fontWeight: isToday ? 800 : 500,
                      cursor: 'default', minHeight: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }
                  },
                    h('span', null, day.dayNum),
                    fam && h('span', { style: { fontSize: 8, lineHeight: 1 } }, fam.emoji)
                  );
                })
              ),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 } },
                EMOTION_FAMILIES.map(function(fam) {
                  return h('div', { key: fam.id, style: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9ca3af' } },
                    h('div', { style: { width: 8, height: 8, borderRadius: 2, background: fam.color } }),
                    fam.label
                  );
                })
              )
            );
          })(),

          totalCheckins === 0
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#9ca3af' } },
                h('p', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83D\uDCCA'),
                h('p', { style: { fontWeight: 600 } }, 'No check-ins yet'),
                h('p', { style: { fontSize: 12 } }, 'Use the Check-In tab to start tracking your emotions!')
              )
            : h('div', null,
                // Stats row
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 } },
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#3b82f6' } }, totalCheckins),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Check-Ins')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#f59e0b' } }, avgIntensity.toFixed(1)),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Avg Intensity')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#22c55e' } }, Object.keys(learnedWords).length),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, 'Words Learned')
                  )
                ),

                // Most frequent feeling
                topFeeling && h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: '#3b82f612', border: '1px solid #3b82f633', marginBottom: 20 } },
                  h('span', { style: { fontSize: 28 } }, '\uD83D\uDCCA'),
                  h('div', { style: { flex: 1 } },
                    h('p', { style: { fontSize: 10, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' } }, 'Most Frequent Feeling'),
                    h('p', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0, textTransform: 'capitalize' } }, topFeeling),
                    h('p', { style: { fontSize: 11, color: '#cbd5e1', margin: '2px 0 0 0' } }, topCount + ' time' + (topCount !== 1 ? 's' : ''))
                  )
                ),

                // Emotion family distribution
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 10 } }, 'Emotion Family Distribution'),
                  EMOTION_FAMILIES.map(function(fam) {
                    var count = familyCounts[fam.id] || 0;
                    var pct = totalCheckins > 0 ? (count / totalCheckins * 100) : 0;
                    return h('div', { key: fam.id, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                      h('span', { style: { fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 } }, fam.emoji),
                      h('span', { style: { fontSize: 11, color: '#cbd5e1', width: 60, flexShrink: 0 } }, fam.label),
                      h('div', { style: { flex: 1, height: 12, borderRadius: 6, background: '#0f172a', overflow: 'hidden' } },
                        h('div', { style: { height: '100%', width: pct + '%', background: fam.color, borderRadius: 6, transition: 'width 0.3s', minWidth: count > 0 ? 4 : 0 } })
                      ),
                      h('span', { style: { fontSize: 11, color: '#9ca3af', width: 30, textAlign: 'right', flexShrink: 0 } }, count)
                    );
                  })
                ),

                // Intensity trend
                recentHist.length >= 2 && h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, 'Intensity Trend (last ' + recentHist.length + ')'),
                  h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 } },
                    recentHist.map(function(entry, i) {
                      var pct = (entry.intensity / 10) * 100;
                      var fam = EMOTION_FAMILIES.find(function(f) { return f.id === entry.family; });
                      var barColor = fam ? fam.color : '#64748b';
                      return h('div', {
                        key: i, title: entry.feeling + ': ' + entry.intensity + '/10',
                        style: { flex: 1, height: pct + '%', borderRadius: '3px 3px 0 0', background: barColor, minHeight: 4, transition: 'height 0.3s' }
                      });
                    })
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 } },
                    h('span', { style: { fontSize: 11, color: '#9ca3af' } }, 'Oldest'),
                    h('span', { style: { fontSize: 11, color: '#9ca3af' } }, 'Recent')
                  )
                ),

                // Recent log
                h('div', null,
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, 'Recent Log'),
                  hist.slice().reverse().slice(0, 8).map(function(entry, i) {
                    var fam = EMOTION_FAMILIES.find(function(f) { return f.id === entry.family; });
                    var time = new Date(entry.timestamp);
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#0f172a', marginBottom: 4 } },
                      h('span', { style: { fontSize: 16, flexShrink: 0 } }, fam ? fam.emoji : '\uD83D\uDE0A'),
                      h('span', { style: { flex: 1, fontSize: 12, color: fam ? fam.color : '#f1f5f9', fontWeight: 600, textTransform: 'capitalize' } }, entry.feeling),
                      h('span', { style: { fontSize: 11, color: '#9ca3af', flexShrink: 0 } }, entry.intensity + '/10'),
                      h('span', { style: { fontSize: 10, color: '#475569', flexShrink: 0 } }, time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                    );
                  })
                )
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Emotion Mixer ──
      // ══════════════════════════════════════════════════════════
      var mixerContent = null;
      if (activeTab === 'mixer') {
        // Find a mix result for the selected pair
        function findMix(e1, e2) {
          return EMOTION_MIXES.find(function(m) {
            return (m.emotion1 === e1 && m.emotion2 === e2) || (m.emotion1 === e2 && m.emotion2 === e1);
          });
        }

        mixerContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83E\uDDEA Emotion Mixing Lab!' : '\uD83E\uDDEA Emotion Mixer'
          ),
          h('p', { style: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Pick two feelings and see what happens when they mix together!' :
            band === 'middle' ? 'Combine two emotions to discover complex feelings. Real emotions are rarely simple!' :
            'Explore how primary emotions blend into complex affective states. Plutchik\'s wheel meets experiential learning.'
          ),

          // Emotion selector 1
          h('div', { style: { marginBottom: 12 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
              band === 'elementary' ? '\uD83E\uDDEA Feeling #1' : 'First Emotion'
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' } },
              EMOTION_FAMILIES.map(function(fam) {
                var isSel = mixEmotion1 === fam.id;
                return h('button', { 'aria-label': fam.emoji,
                  key: fam.id,
                  onClick: function() {
                    upd({ mixEmotion1: fam.id, mixResult: null, mixAiCustom: null });
                    if (soundEnabled) sfxClick();
                  },
                  style: {
                    padding: '10px 14px', borderRadius: 12, border: isSel ? '2px solid ' + fam.color : '1px solid #334155',
                    background: isSel ? fam.color + '22' : '#1e293b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4
                  }
                },
                  h('span', { style: { fontSize: 18 } }, fam.emoji),
                  h('span', { style: { fontSize: 11, color: isSel ? fam.color : '#94a3b8', fontWeight: isSel ? 700 : 500 } }, fam.label)
                );
              })
            )
          ),

          // Plus sign
          mixEmotion1 && h('div', { style: { textAlign: 'center', fontSize: 24, color: '#9ca3af', margin: '4px 0' } }, '+'),

          // Emotion selector 2
          mixEmotion1 && h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
              band === 'elementary' ? '\uD83E\uDDEA Feeling #2' : 'Second Emotion'
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' } },
              EMOTION_FAMILIES.filter(function(f) { return f.id !== mixEmotion1; }).map(function(fam) {
                var isSel = mixEmotion2 === fam.id;
                return h('button', { 'aria-label': fam.emoji,
                  key: fam.id,
                  onClick: function() {
                    upd({ mixEmotion2: fam.id, mixResult: null, mixAiCustom: null });
                    if (soundEnabled) sfxClick();
                  },
                  style: {
                    padding: '10px 14px', borderRadius: 12, border: isSel ? '2px solid ' + fam.color : '1px solid #334155',
                    background: isSel ? fam.color + '22' : '#1e293b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4
                  }
                },
                  h('span', { style: { fontSize: 18 } }, fam.emoji),
                  h('span', { style: { fontSize: 11, color: isSel ? fam.color : '#94a3b8', fontWeight: isSel ? 700 : 500 } }, fam.label)
                );
              })
            )
          ),

          // Mix button
          mixEmotion1 && mixEmotion2 && !mixResult && h('button', { 'aria-label': 'Mix These Emotions!',
            onClick: function() {
              var found = findMix(mixEmotion1, mixEmotion2);
              if (found) {
                upd('mixResult', found);
                var newHist = mixHistory.concat([{ e1: mixEmotion1, e2: mixEmotion2, result: found.result, timestamp: Date.now() }]);
                upd('mixHistory', newHist);
                if (soundEnabled) sfxReveal();
                awardXP(10);
                celebrate();
                // Count unique mixes
                var uniqueMixes = {};
                newHist.forEach(function(m) { uniqueMixes[m.result] = true; });
                if (Object.keys(uniqueMixes).length >= 3) tryAwardBadge('mixer_3');
              } else {
                // No predefined mix — offer AI generation
                upd('mixResult', 'custom');
              }
            },
            style: { width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 16 }
          }, '\uD83E\uDDEA Mix These Emotions!'),

          // Mix result (predefined)
          mixResult && mixResult !== 'custom' && h('div', { style: { padding: 24, borderRadius: 16, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '2px solid #8b5cf666', textAlign: 'center', marginBottom: 20 } },
            h('div', { style: { fontSize: 48, marginBottom: 8 } }, mixResult.emoji),
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontWeight: 700 } }, 'Emotion Mix Result'),
            h('h4', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 22 } }, mixResult.result),
            (function() {
              var fam1 = EMOTION_FAMILIES.find(function(f) { return f.id === mixEmotion1; });
              var fam2 = EMOTION_FAMILIES.find(function(f) { return f.id === mixEmotion2; });
              return h('p', { style: { fontSize: 12, color: '#9ca3af', marginBottom: 12 } },
                (fam1 ? fam1.emoji + ' ' + fam1.label : mixEmotion1) + ' + ' + (fam2 ? fam2.emoji + ' ' + fam2.label : mixEmotion2)
              );
            })(),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 } }, mixResult.desc[band]),
            h('button', { 'aria-label': 'Try Another Mix',
              onClick: function() { upd({ mixEmotion1: null, mixEmotion2: null, mixResult: null, mixAiCustom: null }); if (soundEnabled) sfxClick(); },
              style: { marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
            }, 'Try Another Mix')
          ),

          // Custom mix (no predefined result) — use AI
          mixResult === 'custom' && h('div', { style: { padding: 20, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', textAlign: 'center', marginBottom: 20 } },
            (function() {
              var fam1 = EMOTION_FAMILIES.find(function(f) { return f.id === mixEmotion1; });
              var fam2 = EMOTION_FAMILIES.find(function(f) { return f.id === mixEmotion2; });
              return h('div', null,
                h('p', { style: { fontSize: 24, marginBottom: 8 } }, (fam1 ? fam1.emoji : '') + ' + ' + (fam2 ? fam2.emoji : '')),
                h('p', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 } },
                  (fam1 ? fam1.label : mixEmotion1) + ' + ' + (fam2 ? fam2.label : mixEmotion2)
                ),
                !mixAiCustom && !mixAiLoading && callGemini && h('button', { 'aria-label': 'Toggle sound',
                  onClick: function() {
                    upd('mixAiLoading', true);
                    var prompt = 'You are an emotion scientist explaining to a ' + band + ' school student. When the emotions ' + (fam1 ? fam1.label : mixEmotion1) + ' and ' + (fam2 ? fam2.label : mixEmotion2) + ' combine, what complex feeling results? Give a creative name (2-3 words), then explain in 2 sentences what it feels like. ' +
                      (band === 'elementary' ? 'Use simple, fun language a young child would understand.' : band === 'middle' ? 'Use relatable middle-school examples.' : 'Use psychology terminology appropriately.') +
                      ' Format: NAME: explanation';
                    callGemini(prompt).then(function(resp) {
                      upd({ mixAiCustom: resp, mixAiLoading: false });
                      var newHist = mixHistory.concat([{ e1: mixEmotion1, e2: mixEmotion2, result: resp.split(':')[0] || 'Custom Mix', timestamp: Date.now() }]);
                      upd('mixHistory', newHist);
                      var uniqueMixes = {};
                      newHist.forEach(function(m) { uniqueMixes[m.result] = true; });
                      if (Object.keys(uniqueMixes).length >= 3) tryAwardBadge('mixer_3');
                      if (soundEnabled) sfxReveal();
                      awardXP(10);
                      celebrate();
                    }).catch(function() {
                      upd({ mixAiCustom: 'This is a unique emotional blend! When these feelings combine, they create something complex and personal to you.', mixAiLoading: false });
                    });
                  },
                  style: { padding: '12px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }
                },
                  Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                  'AI: What Does This Mix Create?'
                ),
                mixAiLoading && h('p', { style: { color: '#a78bfa', fontSize: 13, fontStyle: 'italic' } }, 'Analyzing this emotional blend...'),
                !callGemini && !mixAiCustom && h('p', { style: { color: '#cbd5e1', fontSize: 13 } },
                  'This is a unique combination! Think about what it would feel like to experience both ' + (fam1 ? fam1.label.toLowerCase() : mixEmotion1) + ' and ' + (fam2 ? fam2.label.toLowerCase() : mixEmotion2) + ' at the same time.'
                ),
                mixAiCustom && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 12, background: '#8b5cf618', border: '1px solid #8b5cf644' } },
                  h('p', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 6 } }, '\u2728 AI Emotion Scientist'),
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 } }, mixAiCustom)
                )
              );
            })(),
            h('button', { 'aria-label': 'Try Another Mix',
              onClick: function() { upd({ mixEmotion1: null, mixEmotion2: null, mixResult: null, mixAiCustom: null }); if (soundEnabled) sfxClick(); },
              style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
            }, 'Try Another Mix')
          ),

          // Mix history
          mixHistory.length > 0 && h('div', { style: { marginTop: 8 } },
            h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, '\uD83E\uDDEA Discoveries (' + mixHistory.length + ')'),
            mixHistory.slice().reverse().slice(0, 6).map(function(m, i) {
              var fam1 = EMOTION_FAMILIES.find(function(f) { return f.id === m.e1; });
              var fam2 = EMOTION_FAMILIES.find(function(f) { return f.id === m.e2; });
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#0f172a', marginBottom: 4 } },
                h('span', { style: { fontSize: 14, flexShrink: 0 } }, (fam1 ? fam1.emoji : '') + '+' + (fam2 ? fam2.emoji : '')),
                h('span', { style: { flex: 1, fontSize: 12, fontWeight: 600, color: '#e2e8f0' } }, m.result),
                h('span', { style: { fontSize: 10, color: '#475569' } }, new Date(m.timestamp).toLocaleDateString())
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      return h('div', { style: { minHeight: '100%' } },
        tabBar,
        badgePopup,
        wheelContent,
        checkinContent,
        facesContent,
        scenariosContent,
        journalContent,
        mixerContent,
        historyContent
      );
    }
  });
})();
