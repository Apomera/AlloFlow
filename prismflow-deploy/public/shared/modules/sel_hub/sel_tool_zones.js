// ═══════════════════════════════════════════════════════════════
// sel_tool_zones.js — Emotion Zones Plugin (Enhanced v2)
// Interactive zone identification, strategy explorer, check-in
// tracker, guided breathing, body map, grounding exercises,
// achievement badges, AI scenario coach, and personal toolbox.
// Registered tool ID: "zones"
// Category: self-awareness
// Grade-adaptive: uses ctx.gradeBand to scale vocabulary & scenarios
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
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { /* silent */ }
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
    } catch(e) { /* silent */ }
  }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxBreathe() { playTone(396, 0.6, 'sine', 0.04); } // calming G note
  function sfxCheckin() { playTone(440, 0.15, 'sine', 0.06); setTimeout(function() { playTone(554, 0.15, 'sine', 0.06); }, 100); setTimeout(function() { playTone(659, 0.2, 'sine', 0.08); }, 200); }

  // ══════════════════════════════════════════════════════════════
  // ── Zone Definitions ──
  // ══════════════════════════════════════════════════════════════
  var ZONES = [
    {
      id: 'blue',
      label: 'Blue Zone',
      color: '#3b82f6',
      bgLight: '#dbeafe',
      emoji: '\uD83D\uDE34',
      feeling: 'Low energy',
      bodyAreas: ['heavy shoulders', 'droopy eyes', 'slow movement', 'low voice'],
      descriptors: {
        elementary: ['tired', 'sad', 'bored', 'sick', 'slow'],
        middle:     ['lethargic', 'withdrawn', 'melancholy', 'disconnected', 'unmotivated'],
        high:       ['apathetic', 'despondent', 'emotionally drained', 'disengaged', 'fatigued']
      },
      strategies: {
        elementary: [
          { text: 'Take a walk', icon: '\uD83D\uDEB6', type: 'movement' },
          { text: 'Get a drink of water', icon: '\uD83D\uDCA7', type: 'sensory' },
          { text: 'Talk to a friend', icon: '\uD83D\uDDE3\uFE0F', type: 'social' },
          { text: 'Do jumping jacks', icon: '\uD83E\uDD38', type: 'movement' },
          { text: 'Listen to upbeat music', icon: '\uD83C\uDFB5', type: 'sensory' },
          { text: 'Draw a picture', icon: '\uD83C\uDFA8', type: 'creative' },
          { text: 'Stretch your body', icon: '\uD83E\uDDD8', type: 'movement' }
        ],
        middle: [
          { text: 'Go for a short walk outside', icon: '\uD83D\uDEB6', type: 'movement' },
          { text: 'Splash cold water on your face', icon: '\uD83D\uDCA7', type: 'sensory' },
          { text: 'Set a small goal to start', icon: '\uD83C\uDFAF', type: 'cognitive' },
          { text: 'Reach out to someone you trust', icon: '\uD83D\uDCF1', type: 'social' },
          { text: 'Change your environment', icon: '\uD83D\uDEAA', type: 'sensory' },
          { text: 'Listen to an energizing playlist', icon: '\uD83C\uDFA7', type: 'sensory' },
          { text: 'Do 10 push-ups or squats', icon: '\uD83D\uDCAA', type: 'movement' }
        ],
        high: [
          { text: 'Engage in light physical activity', icon: '\uD83D\uDEB6', type: 'movement' },
          { text: 'Practice behavioral activation', icon: '\uD83D\uDCCB', type: 'cognitive' },
          { text: 'Connect with your support network', icon: '\uD83E\uDD1D', type: 'social' },
          { text: 'Reframe with cognitive restructuring', icon: '\uD83E\uDDE0', type: 'cognitive' },
          { text: 'Break tasks into micro-steps', icon: '\uD83D\uDCC8', type: 'cognitive' },
          { text: 'Use opposite-action technique', icon: '\u21C4', type: 'cognitive' },
          { text: 'Practice gratitude journaling', icon: '\uD83D\uDCD3', type: 'creative' }
        ]
      }
    },
    {
      id: 'green',
      label: 'Green Zone',
      color: '#22c55e',
      bgLight: '#dcfce7',
      emoji: '\uD83D\uDE0A',
      feeling: 'Ready to learn',
      bodyAreas: ['relaxed shoulders', 'steady breathing', 'comfortable posture', 'clear mind'],
      descriptors: {
        elementary: ['calm', 'happy', 'focused', 'ready', 'okay'],
        middle:     ['content', 'engaged', 'balanced', 'motivated', 'at ease'],
        high:       ['centered', 'emotionally regulated', 'optimally aroused', 'present', 'self-assured']
      },
      strategies: {
        elementary: [
          { text: 'Keep going!', icon: '\u2B50', type: 'cognitive' },
          { text: 'Help a friend', icon: '\uD83E\uDD1D', type: 'social' },
          { text: 'Try something new', icon: '\uD83C\uDF1F', type: 'cognitive' },
          { text: 'Take a deep breath to stay calm', icon: '\uD83C\uDF2C\uFE0F', type: 'breathing' },
          { text: 'Smile at someone', icon: '\uD83D\uDE04', type: 'social' }
        ],
        middle: [
          { text: 'Maintain your routine', icon: '\uD83D\uDCCB', type: 'cognitive' },
          { text: 'Practice gratitude', icon: '\uD83D\uDE4F', type: 'cognitive' },
          { text: 'Set a stretch goal', icon: '\uD83C\uDFAF', type: 'cognitive' },
          { text: 'Mentor a peer', icon: '\uD83E\uDD1D', type: 'social' },
          { text: 'Reflect on what is going well', icon: '\uD83D\uDCAD', type: 'cognitive' }
        ],
        high: [
          { text: 'Sustain with mindful awareness', icon: '\uD83E\uDDD8', type: 'breathing' },
          { text: 'Journal about what\'s working', icon: '\uD83D\uDCD3', type: 'creative' },
          { text: 'Deepen focus with flow triggers', icon: '\u26A1', type: 'cognitive' },
          { text: 'Reinforce positive self-talk', icon: '\uD83D\uDCAC', type: 'cognitive' },
          { text: 'Practice active listening in conversation', icon: '\uD83D\uDC42', type: 'social' }
        ]
      }
    },
    {
      id: 'yellow',
      label: 'Yellow Zone',
      color: '#eab308',
      bgLight: '#fef9c3',
      emoji: '\uD83D\uDE1F',
      feeling: 'Heightened alertness',
      bodyAreas: ['tight chest', 'clenched fists', 'fast heartbeat', 'butterflies in stomach'],
      descriptors: {
        elementary: ['nervous', 'silly', 'excited', 'worried', 'wiggly'],
        middle:     ['anxious', 'frustrated', 'overstimulated', 'restless', 'stressed'],
        high:       ['hypervigilant', 'agitated', 'overwhelmed', 'emotionally escalating', 'cognitively overloaded']
      },
      strategies: {
        elementary: [
          { text: 'Take 5 deep breaths', icon: '\uD83C\uDF2C\uFE0F', type: 'breathing' },
          { text: 'Squeeze a stress ball', icon: '\uD83E\uDDE8', type: 'sensory' },
          { text: 'Count to 10', icon: '\uD83D\uDD22', type: 'cognitive' },
          { text: 'Use a fidget tool', icon: '\uD83E\uDE80', type: 'sensory' },
          { text: 'Ask for a break', icon: '\u270B', type: 'social' },
          { text: 'Color or draw', icon: '\uD83C\uDFA8', type: 'creative' },
          { text: 'Push against the wall', icon: '\uD83E\uDDF1', type: 'movement' }
        ],
        middle: [
          { text: 'Try box breathing (4-4-4-4)', icon: '\uD83C\uDF2C\uFE0F', type: 'breathing' },
          { text: 'Use progressive muscle relaxation', icon: '\uD83D\uDCAA', type: 'movement' },
          { text: 'Write down what\'s bothering you', icon: '\uD83D\uDCDD', type: 'creative' },
          { text: 'Take a sensory break', icon: '\uD83C\uDF3F', type: 'sensory' },
          { text: 'Talk to a trusted adult', icon: '\uD83D\uDDE3\uFE0F', type: 'social' },
          { text: 'Listen to calming sounds', icon: '\uD83C\uDFB6', type: 'sensory' },
          { text: 'Use positive self-talk', icon: '\uD83D\uDCAC', type: 'cognitive' }
        ],
        high: [
          { text: 'Practice 4-7-8 breathing technique', icon: '\uD83C\uDF2C\uFE0F', type: 'breathing' },
          { text: 'Apply cognitive defusion', icon: '\uD83E\uDDE0', type: 'cognitive' },
          { text: 'Use the STOP skill (DBT)', icon: '\uD83D\uDED1', type: 'cognitive' },
          { text: 'Identify the trigger and reappraise', icon: '\uD83D\uDD0D', type: 'cognitive' },
          { text: 'Engage your parasympathetic nervous system', icon: '\uD83E\uDDD8', type: 'breathing' },
          { text: 'Use the 5-4-3-2-1 grounding technique', icon: '\u270B', type: 'sensory' },
          { text: 'Journal about the emotion and its source', icon: '\uD83D\uDCD3', type: 'creative' }
        ]
      }
    },
    {
      id: 'red',
      label: 'Red Zone',
      color: '#ef4444',
      bgLight: '#fee2e2',
      emoji: '\uD83D\uDE21',
      feeling: 'Extremely heightened',
      bodyAreas: ['pounding heart', 'hot face', 'shaking hands', 'tight jaw', 'rapid breathing'],
      descriptors: {
        elementary: ['angry', 'scared', 'out of control', 'yelling', 'hitting'],
        middle:     ['enraged', 'panicked', 'explosive', 'terrified', 'losing control'],
        high:       ['dysregulated', 'in fight-or-flight', 'amygdala hijack', 'crisis state', 'emotionally flooded']
      },
      strategies: {
        elementary: [
          { text: 'STOP and freeze', icon: '\uD83D\uDED1', type: 'cognitive' },
          { text: 'Go to your calm corner', icon: '\uD83C\uDFE0', type: 'sensory' },
          { text: 'Hug a stuffed animal', icon: '\uD83E\uDDF8', type: 'sensory' },
          { text: 'Tell an adult', icon: '\uD83D\uDDE3\uFE0F', type: 'social' },
          { text: 'Use your calm-down plan', icon: '\uD83D\uDCCB', type: 'cognitive' },
          { text: 'Blow on a pinwheel', icon: '\uD83C\uDF80', type: 'breathing' },
          { text: 'Stomp your feet 10 times', icon: '\uD83E\uDDB6', type: 'movement' }
        ],
        middle: [
          { text: 'Remove yourself from the situation', icon: '\uD83D\uDEAA', type: 'movement' },
          { text: 'Use grounding technique (5-4-3-2-1)', icon: '\u270B', type: 'sensory' },
          { text: 'Cool down before talking', icon: '\u2744\uFE0F', type: 'cognitive' },
          { text: 'Use your crisis plan', icon: '\uD83D\uDCCB', type: 'cognitive' },
          { text: 'Deep pressure (push against a wall)', icon: '\uD83E\uDDF1', type: 'movement' },
          { text: 'Splash cold water on your face', icon: '\uD83D\uDCA7', type: 'sensory' },
          { text: 'Count backwards from 20', icon: '\uD83D\uDD22', type: 'cognitive' }
        ],
        high: [
          { text: 'Activate your safety plan', icon: '\uD83D\uDEE1\uFE0F', type: 'cognitive' },
          { text: 'Use TIPP skills (Temperature, Intense exercise, Paced breathing, Paired muscle relaxation)', icon: '\u26A1', type: 'movement' },
          { text: 'Practice radical acceptance', icon: '\uD83E\uDD32', type: 'cognitive' },
          { text: 'Seek immediate support', icon: '\uD83D\uDCDE', type: 'social' },
          { text: 'Use bilateral stimulation', icon: '\uD83D\uDC4F', type: 'sensory' },
          { text: 'Apply the RAIN technique (Recognize, Allow, Investigate, Nurture)', icon: '\uD83C\uDF27\uFE0F', type: 'cognitive' },
          { text: 'Dive reflex — cold on face + hold breath', icon: '\u2744\uFE0F', type: 'sensory' }
        ]
      }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Scenario Database (expanded, AI-enhanceable) ──
  // ══════════════════════════════════════════════════════════════
  var SCENARIOS = {
    elementary: [
      { text: 'Your friend won\'t share the crayons with you.', correctZone: 'yellow', followUp: 'What could you do to feel calmer?' },
      { text: 'You got a gold star on your homework!', correctZone: 'green', followUp: 'How can you keep up the great work?' },
      { text: 'You didn\'t sleep well and don\'t want to do anything.', correctZone: 'blue', followUp: 'What could help you feel more awake?' },
      { text: 'Someone knocked your blocks down on purpose!', correctZone: 'red', followUp: 'What should you do before reacting?' },
      { text: 'It\'s your birthday and you can\'t wait to open presents!', correctZone: 'yellow', followUp: 'Being excited is okay! How can you stay focused?' },
      { text: 'Your teacher says you did a great job reading today.', correctZone: 'green', followUp: 'How does it feel when someone notices your hard work?' },
      { text: 'Your pet fish died and you feel really sad.', correctZone: 'blue', followUp: 'It\'s okay to be sad. Who could you talk to?' },
      { text: 'Someone cut in line and pushed you!', correctZone: 'red', followUp: 'What can you tell yourself to calm down?' },
      { text: 'You are working on a puzzle and it\'s going well.', correctZone: 'green', followUp: 'What helps you stay in this good zone?' },
      { text: 'You forgot your lunch at home today.', correctZone: 'yellow', followUp: 'What could you do to solve this problem?' },
      { text: 'Recess was canceled because of rain.', correctZone: 'blue', followUp: 'What indoor activity might cheer you up?' },
      { text: 'A bigger kid keeps calling you names.', correctZone: 'red', followUp: 'Who is a safe adult you can tell?' }
    ],
    middle: [
      { text: 'You have a big test tomorrow and haven\'t studied yet.', correctZone: 'yellow', followUp: 'What strategies can help you manage test anxiety?' },
      { text: 'You just finished a great group project with friends.', correctZone: 'green', followUp: 'What made the teamwork successful?' },
      { text: 'Your best friend is moving to another school.', correctZone: 'blue', followUp: 'How can you process these feelings of loss?' },
      { text: 'Someone spread a rumor about you on social media.', correctZone: 'red', followUp: 'What steps should you take before responding?' },
      { text: 'You made the basketball team after tryouts!', correctZone: 'green', followUp: 'How can you use this positive energy in practice?' },
      { text: 'You studied hard but got a bad grade anyway.', correctZone: 'yellow', followUp: 'What can you tell yourself about effort vs. results?' },
      { text: 'It\'s been a rainy weekend and you feel sluggish.', correctZone: 'blue', followUp: 'What small action could shift your energy?' },
      { text: 'Your sibling read your private texts without permission.', correctZone: 'red', followUp: 'How can you set boundaries without escalating?' },
      { text: 'You\'re presenting in front of the class in 5 minutes.', correctZone: 'yellow', followUp: 'What quick technique can reduce your nervousness?' },
      { text: 'You helped a younger student with their homework.', correctZone: 'green', followUp: 'How did helping someone else make you feel?' },
      { text: 'Nobody sat with you at lunch today.', correctZone: 'blue', followUp: 'What is one thought that could help reframe this?' },
      { text: 'Someone tripped you in the hallway and laughed.', correctZone: 'red', followUp: 'What is the difference between reacting and responding?' }
    ],
    high: [
      { text: 'You received a college rejection letter you weren\'t expecting.', correctZone: 'blue', followUp: 'How might you reframe this setback?' },
      { text: 'You just nailed your presentation in front of the whole class.', correctZone: 'green', followUp: 'How can you internalize this success for future confidence?' },
      { text: 'You overheard your friends making plans without you.', correctZone: 'yellow', followUp: 'What cognitive distortions might be at play here?' },
      { text: 'Your parent just told you they\'re getting a divorce.', correctZone: 'red', followUp: 'What supports and coping skills can you access right now?' },
      { text: 'You got accepted into your dream internship.', correctZone: 'green', followUp: 'How can you leverage this momentum going forward?' },
      { text: 'Your partner broke up with you over text.', correctZone: 'red', followUp: 'What are healthy ways to process intense grief and anger?' },
      { text: 'You\'ve been scrolling your phone for 3 hours and feel numb.', correctZone: 'blue', followUp: 'What does this pattern tell you about your current needs?' },
      { text: 'Your college application essay is due tomorrow and you haven\'t started.', correctZone: 'yellow', followUp: 'How can you break down this overwhelming task?' },
      { text: 'You just had a meaningful conversation with your counselor.', correctZone: 'green', followUp: 'What insights from this conversation can you carry forward?' },
      { text: 'You see a peer being bullied and feel helpless.', correctZone: 'yellow', followUp: 'What is the difference between being a bystander and an upstander?' },
      { text: 'You\'re exhausted from working and doing school at the same time.', correctZone: 'blue', followUp: 'How do you distinguish burnout from normal tiredness?' },
      { text: 'Your coach yelled at you in front of the whole team.', correctZone: 'red', followUp: 'How can you process this without internalizing the shame?' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badge Definitions ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_checkin',    icon: '\uD83D\uDEA6', name: 'First Check-In',       desc: 'Complete your first zone check-in' },
    { id: 'all_zones',        icon: '\uD83C\uDF08', name: 'Rainbow Feeler',        desc: 'Check in from all 4 zones' },
    { id: 'checkin_5',        icon: '\uD83D\uDCCA', name: 'Self-Aware',            desc: 'Complete 5 check-ins' },
    { id: 'checkin_20',       icon: '\uD83C\uDFC5', name: 'Consistent Checker',    desc: 'Complete 20 check-ins' },
    { id: 'scenario_streak3', icon: '\uD83D\uDD25', name: 'On a Roll',             desc: '3 correct scenarios in a row' },
    { id: 'scenario_streak7', icon: '\u2B50',       name: 'Zone Expert',            desc: '7 correct scenarios in a row' },
    { id: 'scenario_10',      icon: '\uD83C\uDFAF', name: 'Scenario Pro',          desc: 'Answer 10 scenarios correctly' },
    { id: 'scenario_25',      icon: '\uD83C\uDFC6', name: 'Scenario Master',       desc: 'Answer 25 scenarios correctly' },
    { id: 'breathe_complete', icon: '\uD83C\uDF2C\uFE0F', name: 'Calm Breather',   desc: 'Complete a full breathing exercise' },
    { id: 'breathe_5',        icon: '\uD83E\uDDD8', name: 'Mindful Master',        desc: 'Complete 5 breathing exercises' },
    { id: 'grounding_done',   icon: '\u270B',       name: 'Grounded',              desc: 'Complete a 5-4-3-2-1 grounding exercise' },
    { id: 'toolbox_3',        icon: '\uD83E\uDDF0', name: 'Toolbox Builder',       desc: 'Save 3 strategies to your toolbox' },
    { id: 'ai_advice',        icon: '\u2728',       name: 'Advice Seeker',          desc: 'Get AI-powered advice for the first time' },
    { id: 'body_scan',        icon: '\uD83E\uDDD1', name: 'Body Aware',            desc: 'Complete a body scan' },
    { id: 'green_streak3',    icon: '\uD83D\uDE0A', name: 'Green Machine',         desc: 'Check in from the Green Zone 3 times' },
    { id: 'note_writer',      icon: '\uD83D\uDCDD', name: 'Reflective Writer',     desc: 'Write a note with 5 of your check-ins' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Breathing Exercise Patterns ──
  // ══════════════════════════════════════════════════════════════
  var BREATHING_PATTERNS = [
    {
      id: 'box',
      name: 'Box Breathing',
      desc: 'Breathe in a steady 4-count square pattern.',
      steps: [
        { label: 'Breathe In', duration: 4, color: '#3b82f6' },
        { label: 'Hold', duration: 4, color: '#8b5cf6' },
        { label: 'Breathe Out', duration: 4, color: '#22c55e' },
        { label: 'Hold', duration: 4, color: '#eab308' }
      ],
      cycles: 4,
      bestFor: ['yellow', 'red']
    },
    {
      id: '478',
      name: '4-7-8 Breathing',
      desc: 'A natural tranquilizer for the nervous system.',
      steps: [
        { label: 'Breathe In', duration: 4, color: '#3b82f6' },
        { label: 'Hold', duration: 7, color: '#8b5cf6' },
        { label: 'Breathe Out', duration: 8, color: '#22c55e' }
      ],
      cycles: 3,
      bestFor: ['yellow', 'red']
    },
    {
      id: 'star',
      name: 'Star Breathing',
      desc: 'Trace the points of a star as you breathe.',
      steps: [
        { label: 'Breathe In', duration: 3, color: '#3b82f6' },
        { label: 'Breathe Out', duration: 3, color: '#22c55e' }
      ],
      cycles: 5,
      bestFor: ['yellow']
    },
    {
      id: 'energize',
      name: 'Energizing Breath',
      desc: 'Quick breaths to increase alertness.',
      steps: [
        { label: 'Quick In', duration: 2, color: '#f97316' },
        { label: 'Quick Out', duration: 2, color: '#22c55e' }
      ],
      cycles: 5,
      bestFor: ['blue']
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Body Map Data ──
  // ══════════════════════════════════════════════════════════════
  var BODY_MAP_AREAS = [
    { id: 'head',      label: 'Head',       y: 8,   emoji: '\uD83E\uDDE0' },
    { id: 'face',      label: 'Face',       y: 15,  emoji: '\uD83D\uDE36' },
    { id: 'throat',    label: 'Throat',     y: 22,  emoji: '\uD83D\uDDE3\uFE0F' },
    { id: 'shoulders', label: 'Shoulders',  y: 28,  emoji: '\uD83E\uDDB7' },
    { id: 'chest',     label: 'Chest',      y: 36,  emoji: '\u2764\uFE0F' },
    { id: 'stomach',   label: 'Stomach',    y: 48,  emoji: '\uD83E\uDEBB' },
    { id: 'hands',     label: 'Hands',      y: 55,  emoji: '\u270B' },
    { id: 'legs',      label: 'Legs',       y: 70,  emoji: '\uD83E\uDDB5' },
    { id: 'feet',      label: 'Feet',       y: 85,  emoji: '\uD83E\uDDB6' }
  ];

  var BODY_SENSATIONS = {
    elementary: ['tight', 'heavy', 'warm', 'cold', 'tingly', 'shaky', 'calm', 'empty', 'buzzy', 'achy'],
    middle:     ['tense', 'weighted', 'flushed', 'numb', 'prickling', 'trembling', 'relaxed', 'hollow', 'restless', 'sore', 'knotted', 'fluttery'],
    high:       ['constricted', 'leaden', 'overheated', 'dissociated', 'hyperaware', 'tremulous', 'grounded', 'vacant', 'agitated', 'tender', 'compressed', 'effervescent']
  };

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('zones', {
    icon: '\uD83D\uDEA6',
    label: 'Emotion Zones',
    desc: 'Identify your zone and explore strategies to self-regulate.',
    color: 'emerald',
    category: 'self-awareness',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var t = ctx.t;
      var band = ctx.gradeBand || 'elementary'; // 'elementary', 'middle', 'high'

      // ── Tool-scoped state (via ctx.toolData.zones) ──
      var d = (ctx.toolData && ctx.toolData.zones) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('zones', key); }
        else { if (ctx.update) ctx.update('zones', key, val); }
      };

      // Navigation
      var activeTab      = d.activeTab || 'checkin';
      var soundEnabled   = d.soundEnabled != null ? d.soundEnabled : true;

      // Check-in state
      var selectedZone   = d.selectedZone || null;
      var checkInNote    = d.checkInNote || '';
      var checkInLog     = d.checkInLog || [];
      var intensityLevel = d.intensityLevel != null ? d.intensityLevel : 5; // 1-10 scale

      // Scenario state
      var scenarioIdx      = d.scenarioIdx || 0;
      var scenarioAnswer   = d.scenarioAnswer || null;
      var scenarioFeedback = d.scenarioFeedback || null;
      var scenarioScore    = d.scenarioScore || { correct: 0, total: 0 };
      var scenarioStreak   = d.scenarioStreak || 0;
      var scenarioBestStreak = d.scenarioBestStreak || 0;

      // AI state
      var aiAdvice   = d.aiAdvice || null;
      var aiLoading  = d.aiLoading || false;
      var aiScenario = d.aiScenario || null;
      var aiScenarioLoading = d.aiScenarioLoading || false;

      // Breathing exercise state
      var breathingPattern   = d.breathingPattern || null;
      var breathingActive    = d.breathingActive || false;
      var breathingStep      = d.breathingStep != null ? d.breathingStep : 0;
      var breathingCycle     = d.breathingCycle != null ? d.breathingCycle : 0;
      var breathingTimer     = d.breathingTimer != null ? d.breathingTimer : 0;
      var breathingComplete  = d.breathingComplete || 0; // total completed

      // Body map state
      var bodySelections = d.bodySelections || {}; // { head: { sensation: 'tight', zone: 'yellow' }, ... }
      var bodyScanActive = d.bodyScanActive || false;
      var bodyScanStep   = d.bodyScanStep || 0;

      // Toolbox state (saved favorite strategies)
      var myToolbox = d.myToolbox || [];

      // Badge state
      var earnedBadges    = d.earnedBadges || {};
      var showBadgePopup  = d.showBadgePopup || null; // badge id to show popup for
      var showBadgesPanel = d.showBadgesPanel || false;

      // Grounding exercise state
      var groundingActive   = d.groundingActive || false;
      var groundingStep     = d.groundingStep || 0; // 0-4 for 5-4-3-2-1
      var groundingInputs   = d.groundingInputs || {};
      var groundingComplete = d.groundingComplete || 0;

      var scenarios = SCENARIOS[band] || SCENARIOS.elementary;

      // ── Badge check helper ──
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

      // ── TTS read-aloud helper (for elementary) ──
      function readAloud(text) {
        if (callTTS && band === 'elementary') {
          callTTS(text);
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── Tab Navigation ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'checkin',   label: '\uD83D\uDEA6 Check-In' },
        { id: 'explore',   label: '\uD83D\uDD0D Explore' },
        { id: 'breathe',   label: '\uD83C\uDF2C\uFE0F Breathe' },
        { id: 'body',      label: '\uD83E\uDDD1 Body Map' },
        { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' },
        { id: 'toolbox',   label: '\uD83E\uDDF0 My Toolbox' },
        { id: 'history',   label: '\uD83D\uDCCA History' }
      ];

      var tabBar = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        role: 'tablist', 'aria-label': 'Zones of Regulation tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', { 'aria-label': tab.label,
            key: tab.id,
            role: 'tab', 'aria-selected': isActive,
            onClick: function() { upd('activeTab', tab.id); if (soundEnabled) sfxClick(); announceToSR('Switched to ' + tab.id + ' tab'); },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#7c3aed' : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontWeight: isActive ? 700 : 500, fontSize: 12,
              whiteSpace: 'nowrap', transition: 'background 0.15s', flexShrink: 0
            }
          }, tab.label);
        }),
        // Sound toggle
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          title: soundEnabled ? 'Mute sounds' : 'Enable sounds',
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        // Badges button
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          title: 'View badges',
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#7c3aed33' : 'transparent', color: '#64748b', fontSize: 14, flexShrink: 0 }
        }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length)
      );

      // ══════════════════════════════════════════════════════════
      // ── Badge Popup Overlay ──
      // ══════════════════════════════════════════════════════════
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
            style: {
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', animation: 'fadeIn 0.3s ease'
            },
            onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
              style: {
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                borderRadius: 20, padding: '32px 40px', textAlign: 'center',
                border: '2px solid #7c3aed', maxWidth: 320,
                animation: 'scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, popBadge.icon),
              h('p', { style: { fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Badge Earned!'),
              h('h3', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 20 } }, popBadge.name),
              h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 13 } }, popBadge.desc),
              h('p', { style: { margin: '12px 0 0 0', color: '#7c3aed', fontSize: 12, fontWeight: 700 } }, '+25 XP')
            )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── Badges Panel ──
      // ══════════════════════════════════════════════════════════
      var badgesPanel = null;
      if (showBadgesPanel) {
        badgesPanel = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } },
            '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 } },
            BADGES.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              return h('div', {
                key: badge.id,
                title: badge.name + ': ' + badge.desc,
                style: {
                  textAlign: 'center', padding: 12, borderRadius: 12,
                  background: earned ? '#1e1b4b' : '#1e293b',
                  border: '1px solid ' + (earned ? '#7c3aed' : '#334155'),
                  opacity: earned ? 1 : 0.4
                }
              },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 28, marginBottom: 4 } }, badge.icon),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, fontWeight: 600, color: earned ? '#e2e8f0' : '#64748b' } }, badge.name),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, badge.desc)
              );
            })
          ),
          h('button', { 'aria-label': 'Close',
            onClick: function() { upd('showBadgesPanel', false); },
            style: { display: 'block', margin: '16px auto 0', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }
          }, 'Close')
        );
      }

      // If badges panel is showing, render only that
      if (showBadgesPanel) {
        return h('div', { style: { minHeight: '100%' } }, tabBar, badgesPanel, badgePopup);
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Check-In ──
      // ══════════════════════════════════════════════════════════
      var checkinContent = null;
      if (activeTab === 'checkin') {
        checkinContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? 'How are you feeling right now?' :
            band === 'middle' ? 'Check in with yourself \u2014 what zone are you in?' :
            'Emotional self-assessment \u2014 identify your current state'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 24 } },
            'Tap the zone that best matches how you feel'
          ),

          // Zone cards
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } },
            ZONES.map(function(zone) {
              var isSelected = selectedZone === zone.id;
              var descriptors = zone.descriptors[band] || zone.descriptors.elementary;
              return h('button', {
                key: zone.id,
                onClick: function() {
                  upd('selectedZone', zone.id);
                  if (soundEnabled) sfxClick();
                  readAloud('You selected the ' + zone.label);
                },
                'aria-label': zone.label + ' - ' + zone.feeling,
                'aria-pressed': isSelected ? 'true' : 'false',
                style: {
                  padding: 16, borderRadius: 14,
                  border: isSelected ? '3px solid ' + zone.color : '2px solid #334155',
                  background: isSelected ? zone.color + '18' : '#1e293b',
                  cursor: 'pointer', textAlign: 'left',
                  transform: isSelected ? 'scale(1.03)' : 'none',
                  transition: 'all 0.2s', position: 'relative'
                }
              },
                isSelected && h('div', { style: { position: 'absolute', top: 8, right: 8, fontSize: 16 } }, '\u2705'),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 28 } }, zone.emoji),
                  h('div', null,
                    h('div', { style: { fontWeight: 700, color: zone.color, fontSize: 14 } }, zone.label),
                    h('div', { style: { fontSize: 11, color: '#94a3b8' } }, zone.feeling)
                  )
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                  descriptors.map(function(desc) {
                    return h('span', {
                      key: desc,
                      style: { fontSize: 10, padding: '2px 8px', borderRadius: 10, background: zone.color + '22', color: zone.color, fontWeight: 500 }
                    }, desc);
                  })
                ),
                // Body cues
                h('div', { style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 } },
                  zone.bodyAreas.slice(0, 2).map(function(area) {
                    return h('span', { key: area, style: { fontSize: 11, padding: '1px 6px', borderRadius: 6, background: '#334155', color: '#94a3b8' } }, area);
                  })
                )
              );
            })
          ),

          // Intensity slider + note field + submit (shown when zone is selected)
          selectedZone && h('div', { style: { marginTop: 20 } },
            // Intensity slider
            h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 } },
                band === 'elementary' ? 'How much are you feeling it? (1 = a little, 10 = a LOT)' :
                band === 'middle' ? 'Rate the intensity (1 = mild, 10 = extreme)' :
                'Intensity rating (1 = barely perceptible, 10 = overwhelming)'
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                h('span', { style: { fontSize: 11, color: '#64748b', minWidth: 24 } }, '1'),
                h('input', {
                  type: 'range', min: 1, max: 10, value: intensityLevel,
                  onChange: function(e) { upd('intensityLevel', parseInt(e.target.value)); },
                  'aria-label': 'Intensity level',
                  style: { flex: 1, accentColor: ZONES.find(function(z) { return z.id === selectedZone; }).color }
                }),
                h('span', { style: { fontSize: 11, color: '#64748b', minWidth: 24, textAlign: 'right' } }, '10'),
                h('span', {
                  style: {
                    fontSize: 20, fontWeight: 700, minWidth: 40, textAlign: 'center',
                    color: ZONES.find(function(z) { return z.id === selectedZone; }).color
                  }
                }, intensityLevel)
              )
            ),
            // Note field
            h('textarea', {
              placeholder: band === 'elementary' ? 'Want to say more about how you feel? (optional)' :
                           band === 'middle' ? 'What\'s contributing to this zone? (optional)' :
                           'Reflect on the factors influencing your current state (optional)',
              value: checkInNote,
              onChange: function(e) { upd('checkInNote', e.target.value); },
              'aria-label': 'Check-in notes',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            }),
            // Save button
            h('button', { 'aria-label': 'Save button',
              onClick: function() {
                var entry = { zone: selectedZone, note: checkInNote, intensity: intensityLevel, timestamp: Date.now() };
                var newLog = (checkInLog || []).concat([entry]);
                upd({
                  checkInLog: newLog,
                  selectedZone: null,
                  checkInNote: '',
                  intensityLevel: 5
                });
                if (soundEnabled) sfxCheckin();
                awardXP(10);
                celebrate();
                addToast('Check-in saved! Keep tracking your zones.', 'success');
                announceToSR('Check-in saved for ' + selectedZone + ' zone');

                // Badge checks
                tryAwardBadge('first_checkin');
                if (newLog.length >= 5) tryAwardBadge('checkin_5');
                if (newLog.length >= 20) tryAwardBadge('checkin_20');
                // Check if all 4 zones represented
                var zonesUsed = {};
                newLog.forEach(function(e) { zonesUsed[e.zone] = true; });
                if (zonesUsed.blue && zonesUsed.green && zonesUsed.yellow && zonesUsed.red) tryAwardBadge('all_zones');
                // Green streak
                var greenCount = newLog.filter(function(e) { return e.zone === 'green'; }).length;
                if (greenCount >= 3) tryAwardBadge('green_streak3');
                // Note writer
                var notesCount = newLog.filter(function(e) { return e.note && e.note.trim().length > 0; }).length;
                if (notesCount >= 5) tryAwardBadge('note_writer');

                // Suggest strategies if not green zone
                if (selectedZone !== 'green') {
                  var zoneObj = ZONES.find(function(z) { return z.id === selectedZone; });
                  if (zoneObj) {
                    var strats = zoneObj.strategies[band] || zoneObj.strategies.elementary;
                    var randomStrat = strats[Math.floor(Math.random() * strats.length)];
                    addToast('Try this: ' + randomStrat.icon + ' ' + randomStrat.text, 'info');
                  }
                }
              },
              style: { marginTop: 12, width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, '\u2705 Save Check-In'),

            // Quick navigate to strategies
            selectedZone !== 'green' && h('button', { 'aria-label': 'Need help calming down? Try a breathing exercise',
              onClick: function() { upd('activeTab', 'breathe'); },
              style: { marginTop: 8, width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
            }, '\uD83C\uDF2C\uFE0F Need help calming down? Try a breathing exercise')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Explore ──
      // ══════════════════════════════════════════════════════════
      var exploreContent = null;
      if (activeTab === 'explore') {
        exploreContent = h('div', { style: { padding: 20 } },
          h('h3', { style: { textAlign: 'center', marginBottom: 20, color: '#f1f5f9', fontSize: 18 } }, 'Explore the Zones'),
          ZONES.map(function(zone) {
            var descriptors = zone.descriptors[band] || zone.descriptors.elementary;
            var strategies = zone.strategies[band] || zone.strategies.elementary;
            return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
              key: zone.id,
              style: { marginBottom: 16, padding: 20, borderRadius: 14, border: '2px solid ' + zone.color + '44', background: '#1e293b' }
            },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 32 } }, zone.emoji),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { flex: 1 } },
                  h('h4', { style: { margin: 0, color: zone.color, fontSize: 16 } }, zone.label),
                  h('p', { style: { margin: 0, fontSize: 12, color: '#94a3b8' } }, zone.feeling)
                ),
                // Read aloud button (elementary)
                band === 'elementary' && callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function() { readAloud(zone.label + '. This is when you feel ' + zone.feeling + '. You might feel ' + descriptors.join(', ')); },
                  title: 'Read aloud',
                  style: { padding: '6px 10px', borderRadius: 8, border: 'none', background: zone.color + '22', color: zone.color, cursor: 'pointer', fontSize: 16 }
                }, '\uD83D\uDD0A')
              ),
              // Body cues
              h('div', { style: { marginBottom: 12 } },
                h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 } },
                  band === 'elementary' ? 'Your body might feel:' : 'Body cues:'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  zone.bodyAreas.map(function(area) {
                    return h('span', { key: area, style: { fontSize: 11, padding: '3px 10px', borderRadius: 8, background: zone.color + '15', color: zone.color, border: '1px solid ' + zone.color + '33' } }, area);
                  })
                )
              ),
              // Descriptors
              h('div', { style: { marginBottom: 12 } },
                h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 } },
                  band === 'elementary' ? 'You might feel:' : 'Associated states:'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  descriptors.map(function(desc) {
                    return h('span', { key: desc, style: { fontSize: 12, padding: '4px 10px', borderRadius: 10, background: zone.color + '22', color: zone.color } }, desc);
                  })
                )
              ),
              // Strategies (with type badges and add-to-toolbox)
              h('div', null,
                h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 } },
                  band === 'elementary' ? 'Things to try:' : 'Regulation strategies:'
                ),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  strategies.map(function(s, i) {
                    var typeColors = { movement: '#22c55e', breathing: '#3b82f6', sensory: '#eab308', cognitive: '#8b5cf6', social: '#f97316', creative: '#ec4899' };
                    var isInToolbox = myToolbox.some(function(t) { return t.text === s.text; });
                    return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                      key: i,
                      style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' }
                    },
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 16 } }, s.icon),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { flex: 1, fontSize: 12, color: '#e2e8f0' } }, s.text),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, padding: '2px 6px', borderRadius: 6, background: (typeColors[s.type] || '#64748b') + '22', color: typeColors[s.type] || '#64748b', fontWeight: 600 } }, s.type),
                      h('button', { 'aria-label': isInToolbox ? '\u2705' : '+',
                        onClick: function() {
                          if (isInToolbox) {
                            // Remove from toolbox
                            var newToolbox = myToolbox.filter(function(t) { return t.text !== s.text; });
                            upd('myToolbox', newToolbox);
                            addToast('Removed from your toolbox', 'info');
                          } else {
                            // Add to toolbox
                            var newToolbox2 = myToolbox.concat([{ text: s.text, icon: s.icon, type: s.type, zone: zone.id, zoneColor: zone.color }]);
                            upd('myToolbox', newToolbox2);
                            addToast('Added to your toolbox!', 'success');
                            if (soundEnabled) sfxClick();
                            if (newToolbox2.length >= 3) tryAwardBadge('toolbox_3');
                          }
                        },
                        title: isInToolbox ? 'Remove from toolbox' : 'Add to my toolbox',
                        style: { padding: '3px 8px', borderRadius: 6, border: 'none', background: isInToolbox ? '#7c3aed' : '#334155', color: isInToolbox ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 11, flexShrink: 0 }
                      }, isInToolbox ? '\u2705' : '+')
                    );
                  })
                )
              ),
              // AI advice button
              callGemini && h('button', { 'aria-label': 'AI advice button',
                onClick: function() {
                  upd({ aiLoading: true, aiAdvice: null });
                  tryAwardBadge('ai_advice');
                  var prompt = 'You are a school counselor helping a ' + band + ' school student. ' +
                    'They are in the ' + zone.label + ' (' + zone.feeling + '). ' +
                    'Give 2-3 short, encouraging, grade-appropriate tips to help them regulate. ' +
                    'Use ' + (band === 'elementary' ? 'simple, warm language a young child can understand' :
                              band === 'middle' ? 'relatable language for a middle schooler' :
                              'mature, validating language for a high school student') + '. ' +
                    'Keep it under 100 words. Do not use bullet points. Use short paragraphs.';
                  callGemini(prompt).then(function(resp) {
                    upd({ aiAdvice: resp, aiLoading: false });
                  }).catch(function() {
                    upd({ aiAdvice: 'Could not get advice right now. Try the strategies above!', aiLoading: false });
                  });
                },
                disabled: aiLoading,
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid ' + zone.color + '66', background: 'transparent', color: zone.color, fontSize: 12, fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: aiLoading ? 0.6 : 1 }
              },
                Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                aiLoading ? 'Thinking...' : 'Get personalized advice'
              ),
              aiAdvice && h('div', {
                style: { marginTop: 12, padding: 12, borderRadius: 10, background: zone.color + '11', border: '1px solid ' + zone.color + '33', fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 } },
                  h('span', null, '\u2728'),
                  h('span', { style: { fontWeight: 700, fontSize: 11, color: zone.color } }, 'AI Counselor')
                ),
                aiAdvice
              )
            );
          })
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Breathe ──
      // ══════════════════════════════════════════════════════════
      var breatheContent = null;
      if (activeTab === 'breathe') {
        // Pattern selection
        if (!breathingPattern) {
          breatheContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? 'Let\'s Breathe Together!' : 'Guided Breathing Exercises'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              band === 'elementary' ? 'Pick a breathing pattern to try!' : 'Choose a pattern to calm your nervous system'
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
              BREATHING_PATTERNS.map(function(pat) {
                var totalTime = pat.steps.reduce(function(sum, s) { return sum + s.duration; }, 0) * pat.cycles;
                return h('button', { 'aria-label': pat.name,
                  key: pat.id,
                  onClick: function() {
                    upd({ breathingPattern: pat.id, breathingActive: false, breathingStep: 0, breathingCycle: 0, breathingTimer: 0 });
                    if (soundEnabled) sfxClick();
                  },
                  style: {
                    display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 14,
                    border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'left',
                    transition: 'transform 0.15s'
                  },
                  onMouseEnter: function(e) { e.currentTarget.style.transform = 'translateY(-2px)'; },
                  onMouseLeave: function(e) { e.currentTarget.style.transform = 'none'; }
                },
                  h('div', { style: { fontSize: 36 } }, '\uD83C\uDF2C\uFE0F'),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 } }, pat.name),
                    h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 6, lineHeight: 1.4 } }, pat.desc),
                    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                      h('span', { style: { fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#334155', color: '#94a3b8' } }, pat.cycles + ' cycles'),
                      h('span', { style: { fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#334155', color: '#94a3b8' } }, '~' + totalTime + 's'),
                      pat.bestFor.map(function(zoneId) {
                        var z = ZONES.find(function(zz) { return zz.id === zoneId; });
                        return z && h('span', { key: zoneId, style: { fontSize: 10, padding: '2px 8px', borderRadius: 6, background: z.color + '22', color: z.color } }, 'Good for ' + z.label);
                      })
                    )
                  )
                );
              })
            ),
            // Completed count
            breathingComplete > 0 && h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 16 } },
              '\uD83E\uDDD8 You\'ve completed ' + breathingComplete + ' breathing exercise' + (breathingComplete > 1 ? 's' : '') + '!'
            )
          );
        } else {
          // Active breathing exercise
          var currentPattern = BREATHING_PATTERNS.find(function(p) { return p.id === breathingPattern; });
          if (currentPattern) {
            var currentStep = currentPattern.steps[breathingStep % currentPattern.steps.length];
            var stepDuration = currentStep.duration;
            var isComplete = breathingCycle >= currentPattern.cycles;
            var progressPct = isComplete ? 100 : ((breathingCycle * currentPattern.steps.length + breathingStep) / (currentPattern.cycles * currentPattern.steps.length) * 100);

            // Circle size for visual
            var circleSize = 120;
            if (currentStep.label.indexOf('In') !== -1) circleSize = 180;
            else if (currentStep.label.indexOf('Hold') !== -1) circleSize = 180;
            else circleSize = 120;

            breatheContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
              h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, currentPattern.name),
              h('p', { style: { color: '#64748b', fontSize: 12, marginBottom: 20 } },
                isComplete ? 'Exercise complete!' : 'Cycle ' + (breathingCycle + 1) + ' of ' + currentPattern.cycles
              ),

              // Visual breathing circle
              !isComplete && h('div', {
                style: {
                  width: 200, height: 200, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', background: currentStep.color + '15', border: '3px solid ' + currentStep.color + '44',
                  position: 'relative'
                }
              },
                h('div', {
                  style: {
                    width: breathingActive ? circleSize : 120, height: breathingActive ? circleSize : 120,
                    borderRadius: '50%', background: currentStep.color + '33',
                    transition: 'width ' + stepDuration + 's ease-in-out, height ' + stepDuration + 's ease-in-out',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }
                },
                  h('div', null,
                    h('div', { style: { fontSize: 14, fontWeight: 700, color: currentStep.color } }, currentStep.label),
                    h('div', { style: { fontSize: 32, fontWeight: 700, color: '#f1f5f9', marginTop: 4 } }, breathingTimer || stepDuration)
                  )
                )
              ),

              // Completion message
              isComplete && h('div', { style: { padding: 30 } },
                h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83C\uDF1F'),
                h('p', { style: { fontWeight: 700, color: '#22c55e', fontSize: 16 } },
                  band === 'elementary' ? 'Great breathing!' : 'Well done!'
                ),
                h('p', { style: { color: '#94a3b8', fontSize: 13 } },
                  band === 'elementary' ? 'Your body should feel calmer now.' :
                  'Notice how your body feels different from when you started.'
                )
              ),

              // Progress bar
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { height: 6, borderRadius: 3, background: '#1e293b', marginBottom: 20, overflow: 'hidden' } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { height: '100%', width: progressPct + '%', background: isComplete ? '#22c55e' : '#7c3aed', borderRadius: 3, transition: 'width 0.5s' } })
              ),

              // Controls
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                !isComplete && h('button', { 'aria-label': 'Toggle sound',
                  onClick: function() {
                    if (breathingActive) {
                      upd('breathingActive', false);
                    } else {
                      upd('breathingActive', true);
                      if (soundEnabled) sfxBreathe();
                      // Start the timer cycle
                      var pat = currentPattern;
                      var stepIdx = breathingStep;
                      var cycleIdx = breathingCycle;

                      function tick() {
                        var step = pat.steps[stepIdx % pat.steps.length];
                        var countdown = step.duration;
                        function countDown() {
                          upd('breathingTimer', countdown);
                          if (countdown <= 0) {
                            stepIdx++;
                            if (stepIdx >= pat.steps.length) {
                              stepIdx = 0;
                              cycleIdx++;
                              if (cycleIdx >= pat.cycles) {
                                // Done!
                                var newComplete = breathingComplete + 1;
                                upd({ breathingActive: false, breathingCycle: cycleIdx, breathingStep: 0, breathingTimer: 0, breathingComplete: newComplete });
                                if (soundEnabled) sfxCorrect();
                                awardXP(20);
                                tryAwardBadge('breathe_complete');
                                if (newComplete >= 5) tryAwardBadge('breathe_5');
                                return;
                              }
                            }
                            upd({ breathingStep: stepIdx, breathingCycle: cycleIdx });
                            if (soundEnabled) sfxBreathe();
                            tick();
                            return;
                          }
                          countdown--;
                          setTimeout(countDown, 1000);
                        }
                        countDown();
                      }
                      tick();
                    }
                  },
                  style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: breathingActive ? '#ef4444' : '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                }, breathingActive ? '\u23F8 Pause' : '\u25B6 Start'),
                h('button', { 'aria-label': 'Try Another',
                  onClick: function() {
                    upd({ breathingPattern: null, breathingActive: false, breathingStep: 0, breathingCycle: 0, breathingTimer: 0 });
                  },
                  style: { padding: '12px 24px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }
                }, isComplete ? 'Try Another' : '\u2190 Back')
              )
            );
          }
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Body Map ──
      // ══════════════════════════════════════════════════════════
      var bodyContent = null;
      if (activeTab === 'body') {
        var sensations = BODY_SENSATIONS[band] || BODY_SENSATIONS.elementary;

        // Guided body scan
        if (bodyScanActive) {
          var scanArea = BODY_MAP_AREAS[bodyScanStep];
          var scanIsLast = bodyScanStep >= BODY_MAP_AREAS.length - 1;
          var scanSelection = bodySelections[scanArea.id] || {};

          bodyContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } },
              band === 'elementary' ? 'Body Scan' : 'Guided Body Scan'
            ),
            h('p', { style: { color: '#64748b', fontSize: 12, marginBottom: 8 } },
              'Area ' + (bodyScanStep + 1) + ' of ' + BODY_MAP_AREAS.length
            ),
            // Progress
            h('div', { style: { height: 4, borderRadius: 2, background: '#1e293b', marginBottom: 24, overflow: 'hidden' } },
              h('div', { style: { height: '100%', width: ((bodyScanStep + 1) / BODY_MAP_AREAS.length * 100) + '%', background: '#7c3aed', transition: 'width 0.3s' } })
            ),
            // Current area
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 48, marginBottom: 8 } }, scanArea.emoji),
            h('h4', { style: { color: '#f1f5f9', fontSize: 20, marginBottom: 12 } }, scanArea.label),
            h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 20 } },
              band === 'elementary' ? 'How does your ' + scanArea.label.toLowerCase() + ' feel right now?' :
              'Notice any sensations in your ' + scanArea.label.toLowerCase() + '. What do you feel?'
            ),
            // Sensation chips
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 } },
              sensations.map(function(sens) {
                var isChosen = scanSelection.sensation === sens;
                return h('button', { 'aria-label': 'Toggle sound',
                  key: sens,
                  onClick: function() {
                    var newSelections = Object.assign({}, bodySelections);
                    newSelections[scanArea.id] = Object.assign({}, scanSelection, { sensation: sens });
                    upd('bodySelections', newSelections);
                    if (soundEnabled) sfxClick();
                  },
                  style: {
                    padding: '8px 16px', borderRadius: 20, border: isChosen ? '2px solid #7c3aed' : '1px solid #334155',
                    background: isChosen ? '#7c3aed22' : '#1e293b', color: isChosen ? '#c4b5fd' : '#94a3b8',
                    cursor: 'pointer', fontWeight: isChosen ? 700 : 500, fontSize: 13
                  }
                }, sens);
              }),
              h('button', { 'aria-label': ', gap: 8, justifyContent:',
                onClick: function() {
                  var newSelections = Object.assign({}, bodySelections);
                  newSelections[scanArea.id] = Object.assign({}, scanSelection, { sensation: 'nothing' });
                  upd('bodySelections', newSelections);
                },
                style: {
                  padding: '8px 16px', borderRadius: 20, border: (scanSelection.sensation === 'nothing') ? '2px solid #22c55e' : '1px solid #334155',
                  background: (scanSelection.sensation === 'nothing') ? '#22c55e22' : '#1e293b',
                  color: (scanSelection.sensation === 'nothing') ? '#22c55e' : '#64748b',
                  cursor: 'pointer', fontSize: 13
                }
              }, band === 'elementary' ? 'Nothing / I\'m fine here' : 'Neutral / No sensation')
            ),
            // Zone association (which zone does this feel like?)
            scanSelection.sensation && scanSelection.sensation !== 'nothing' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginBottom: 20 } },
              h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8 } },
                band === 'elementary' ? 'What color zone does this feel like?' : 'Which zone does this sensation align with?'
              ),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 8, justifyContent: 'center' } },
                ZONES.map(function(zone) {
                  var isChosen = scanSelection.zone === zone.id;
                  return h('button', { 'aria-label': 'Toggle sound',
                    key: zone.id,
                    onClick: function() {
                      var newSelections = Object.assign({}, bodySelections);
                      newSelections[scanArea.id] = Object.assign({}, scanSelection, { zone: zone.id });
                      upd('bodySelections', newSelections);
                      if (soundEnabled) sfxClick();
                    },
                    style: {
                      width: 48, height: 48, borderRadius: 12, border: isChosen ? '3px solid ' + zone.color : '1px solid #334155',
                      background: isChosen ? zone.color + '33' : '#1e293b', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                    }
                  }, zone.emoji);
                })
              )
            ),
            // Navigation
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 10, justifyContent: 'center' } },
              bodyScanStep > 0 && h('button', { 'aria-label': 'Back',
                onClick: function() { upd('bodyScanStep', bodyScanStep - 1); },
                style: { padding: '10px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
              }, '\u2190 Back'),
              h('button', { 'aria-label': 'Body Map',
                onClick: function() {
                  if (scanIsLast) {
                    upd({ bodyScanActive: false, bodyScanStep: 0 });
                    tryAwardBadge('body_scan');
                    awardXP(15);
                    celebrate();
                    addToast('Body scan complete! Great awareness.', 'success');
                  } else {
                    upd('bodyScanStep', bodyScanStep + 1);
                  }
                },
                style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' }
              }, scanIsLast ? '\u2705 Finish Scan' : 'Next \u2192')
            )
          );
        } else {
          // Body map overview
          bodyContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? 'Where Do You Feel It?' : 'Body Map'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              band === 'elementary' ? 'Our feelings live in our bodies! Tap a body part to say how it feels.' :
              'Emotions create physical sensations. Map where you feel them.'
            ),
            // Start guided scan button
            h('button', { 'aria-label': 'Start Guided Body Scan',
              onClick: function() {
                upd({ bodyScanActive: true, bodyScanStep: 0, bodySelections: {} });
                if (soundEnabled) sfxClick();
              },
              style: {
                display: 'block', margin: '0 auto 24px', padding: '12px 28px', borderRadius: 10,
                border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }
            }, '\uD83E\uDDD1 Start Guided Body Scan'),
            // Quick-tap body map
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 } },
              BODY_MAP_AREAS.map(function(area) {
                var selection = bodySelections[area.id];
                var zoneObj = selection && selection.zone ? ZONES.find(function(z) { return z.id === selection.zone; }) : null;
                return h('div', {
                  key: area.id,
                  style: {
                    padding: 12, borderRadius: 12, background: '#1e293b',
                    border: '1px solid ' + (zoneObj ? zoneObj.color + '66' : '#334155'),
                    textAlign: 'center'
                  }
                },
                  h('div', { style: { fontSize: 24, marginBottom: 4 } }, area.emoji),
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: '#f1f5f9' } }, area.label),
                  selection && selection.sensation && h('div', {
                    style: { fontSize: 10, marginTop: 4, padding: '2px 8px', borderRadius: 6, background: (zoneObj ? zoneObj.color : '#64748b') + '22', color: zoneObj ? zoneObj.color : '#94a3b8', display: 'inline-block' }
                  }, selection.sensation)
                );
              })
            )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Scenarios ──
      // ══════════════════════════════════════════════════════════
      var scenarioContent = null;
      if (activeTab === 'scenarios') {
        var useAiScenario = aiScenario && scenarioIdx >= scenarios.length;
        var currentScenario = useAiScenario ? aiScenario : scenarios[scenarioIdx % scenarios.length];

        scenarioContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, 'Zone Scenario Practice'),
          // Score + streak
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 } },
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#94a3b8' } }, 'Score: ' + scenarioScore.correct + '/' + scenarioScore.total),
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: scenarioStreak >= 3 ? '#f59e0b' : '#64748b' } },
              '\uD83D\uDD25 Streak: ' + scenarioStreak + (scenarioBestStreak > 0 ? ' (best: ' + scenarioBestStreak + ')' : '')
            )
          ),

          // Scenario card
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 24, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 20, textAlign: 'center' } },
            h('p', { style: { fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
              useAiScenario ? 'AI-Generated Scenario' : 'Scenario ' + ((scenarioIdx % scenarios.length) + 1) + ' of ' + scenarios.length
            ),
            h('p', { style: { fontSize: 16, color: '#f1f5f9', lineHeight: 1.6, fontWeight: 500 } }, currentScenario.text),
            // Read aloud (elementary)
            band === 'elementary' && callTTS && h('button', { 'aria-label': 'Read Aloud',
              onClick: function() { readAloud(currentScenario.text); },
              style: { marginTop: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }
            }, '\uD83D\uDD0A Read Aloud')
          ),

          // Zone answer buttons
          !scenarioFeedback && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
            ZONES.map(function(zone) {
              return h('button', { 'aria-label': 'incorrect',
                key: zone.id,
                onClick: function() {
                  var isCorrect = zone.id === currentScenario.correctZone;
                  var newScore = {
                    correct: scenarioScore.correct + (isCorrect ? 1 : 0),
                    total: scenarioScore.total + 1
                  };
                  var newStreak = isCorrect ? scenarioStreak + 1 : 0;
                  var newBest = Math.max(newStreak, scenarioBestStreak);
                  upd({
                    scenarioAnswer: zone.id,
                    scenarioScore: newScore,
                    scenarioFeedback: isCorrect ? 'correct' : 'incorrect',
                    scenarioStreak: newStreak,
                    scenarioBestStreak: newBest
                  });
                  if (isCorrect) {
                    if (soundEnabled) sfxCorrect();
                    awardXP(15);
                    celebrate();
                  } else {
                    if (soundEnabled) sfxWrong();
                  }
                  // Badge checks
                  if (newScore.correct >= 10) tryAwardBadge('scenario_10');
                  if (newScore.correct >= 25) tryAwardBadge('scenario_25');
                  if (newStreak >= 3) tryAwardBadge('scenario_streak3');
                  if (newStreak >= 7) tryAwardBadge('scenario_streak7');
                },
                style: {
                  padding: '14px 12px', borderRadius: 10, border: '2px solid ' + zone.color + '44',
                  background: '#0f172a', color: zone.color, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'transform 0.1s'
                },
                onMouseEnter: function(e) { e.currentTarget.style.transform = 'scale(1.04)'; },
                onMouseLeave: function(e) { e.currentTarget.style.transform = 'none'; }
              },
                h('span', null, zone.emoji),
                zone.label
              );
            })
          ),

          // Feedback
          scenarioFeedback && h('div', {
            style: {
              padding: 20, borderRadius: 14, marginTop: 16, textAlign: 'center',
              background: scenarioFeedback === 'correct' ? '#22c55e18' : '#ef444418',
              border: '1px solid ' + (scenarioFeedback === 'correct' ? '#22c55e44' : '#ef444444')
            }
          },
            h('p', { style: { fontSize: 24, marginBottom: 8 } }, scenarioFeedback === 'correct' ? '\u2705' : '\uD83D\uDCA1'),
            h('p', { style: { fontWeight: 700, color: scenarioFeedback === 'correct' ? '#22c55e' : '#f59e0b', marginBottom: 4 } },
              scenarioFeedback === 'correct'
                ? (scenarioStreak >= 3 ? '\uD83D\uDD25 ' + scenarioStreak + ' in a row!' : 'Great job!')
                : 'Not quite \u2014 this is a ' + ZONES.find(function(z) { return z.id === currentScenario.correctZone; }).label + ' situation.'
            ),
            // Explanation for wrong answer
            scenarioFeedback !== 'correct' && scenarioAnswer && h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8 } },
              'You chose ' + ZONES.find(function(z) { return z.id === scenarioAnswer; }).label + '. ' +
              (band === 'elementary' ? 'Think about how this person would feel in their body.' :
               band === 'middle' ? 'Consider the intensity and type of emotion in this situation.' :
               'Reflect on the arousal level and valence of the emotional response.')
            ),
            h('p', { style: { fontSize: 13, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 } }, currentScenario.followUp),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 10, justifyContent: 'center' } },
              h('button', { 'aria-label': 'Next Scenario',
                onClick: function() {
                  upd({
                    scenarioIdx: scenarioIdx + 1,
                    scenarioAnswer: null,
                    scenarioFeedback: null,
                    aiScenario: null
                  });
                },
                style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' }
              }, 'Next Scenario \u2192')
            )
          ),

          // AI scenario generation button
          callGemini && !scenarioFeedback && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginTop: 20, textAlign: 'center' } },
            h('button', { 'aria-label': 'Next scenario',
              onClick: function() {
                upd('aiScenarioLoading', true);
                var prompt = 'Generate a single short scenario (1-2 sentences) that a ' + band + ' school student might experience. ' +
                  'The scenario should clearly represent one of these emotional states: calm/happy (green zone), anxious/excited/nervous (yellow zone), sad/tired/bored (blue zone), or angry/out-of-control/panicked (red zone). ' +
                  'Use ' + (band === 'elementary' ? 'simple language for ages 5-10' : band === 'middle' ? 'relatable language for ages 11-14' : 'mature language for ages 14-18') + '. ' +
                  'Respond ONLY in this exact JSON format: {"text": "scenario text here", "correctZone": "blue/green/yellow/red", "followUp": "reflection question here"}';
                callGemini(prompt).then(function(resp) {
                  try {
                    var jsonMatch = resp.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      var parsed = JSON.parse(jsonMatch[0]);
                      upd({ aiScenario: parsed, aiScenarioLoading: false, scenarioIdx: scenarios.length });
                    } else {
                      upd('aiScenarioLoading', false);
                      addToast('Could not parse AI scenario. Try again!', 'error');
                    }
                  } catch(e) {
                    upd('aiScenarioLoading', false);
                    addToast('Could not parse AI scenario. Try again!', 'error');
                  }
                }).catch(function() {
                  upd('aiScenarioLoading', false);
                  addToast('Could not generate scenario. Try again!', 'error');
                });
              },
              disabled: aiScenarioLoading,
              style: { padding: '10px 20px', borderRadius: 8, border: '1px solid #7c3aed44', background: 'transparent', color: '#a78bfa', fontWeight: 600, fontSize: 12, cursor: aiScenarioLoading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
            },
              Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
              aiScenarioLoading ? 'Generating...' : 'Generate AI Scenario'
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: My Toolbox ──
      // ══════════════════════════════════════════════════════════
      var toolboxContent = null;
      if (activeTab === 'toolbox') {
        var typeColors = { movement: '#22c55e', breathing: '#3b82f6', sensory: '#eab308', cognitive: '#8b5cf6', social: '#f97316', creative: '#ec4899' };
        var typeIcons = { movement: '\uD83C\uDFC3', breathing: '\uD83C\uDF2C\uFE0F', sensory: '\uD83D\uDC40', cognitive: '\uD83E\uDDE0', social: '\uD83D\uDDE3\uFE0F', creative: '\uD83C\uDFA8' };

        // 5-4-3-2-1 grounding exercise
        var groundingSteps = [
          { count: 5, sense: 'SEE',   prompt: band === 'elementary' ? '5 things you can see' : '5 things you can see around you', emoji: '\uD83D\uDC41\uFE0F' },
          { count: 4, sense: 'TOUCH', prompt: band === 'elementary' ? '4 things you can touch' : '4 things you can physically feel', emoji: '\u270B' },
          { count: 3, sense: 'HEAR',  prompt: band === 'elementary' ? '3 things you can hear' : '3 sounds you can hear right now', emoji: '\uD83D\uDC42' },
          { count: 2, sense: 'SMELL', prompt: band === 'elementary' ? '2 things you can smell' : '2 things you can smell or remember the smell of', emoji: '\uD83D\uDC43' },
          { count: 1, sense: 'TASTE', prompt: band === 'elementary' ? '1 thing you can taste' : '1 thing you can taste or imagine tasting', emoji: '\uD83D\uDC45' }
        ];

        toolboxContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            '\uD83E\uDDF0 My Toolbox'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Your favorite ways to feel better!' : 'Your saved strategies and regulation tools'
          ),

          // Quick tools section
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginBottom: 24 } },
            h('h4', { style: { fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 } }, 'Quick Tools'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
              // Breathing shortcut
              h('button', { 'aria-label': 'Breathing',
                onClick: function() { upd('activeTab', 'breathe'); if (soundEnabled) sfxClick(); },
                style: { padding: 16, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'center' }
              },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 28, marginBottom: 6 } }, '\uD83C\uDF2C\uFE0F'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, fontWeight: 700, color: '#3b82f6' } }, 'Breathing'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, color: '#64748b' } }, 'Guided exercises')
              ),
              // Body scan shortcut
              h('button', { 'aria-label': 'Body Scan',
                onClick: function() { upd({ activeTab: 'body', bodyScanActive: true, bodyScanStep: 0 }); if (soundEnabled) sfxClick(); },
                style: { padding: 16, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'center' }
              },
                h('div', { style: { fontSize: 28, marginBottom: 6 } }, '\uD83E\uDDD1'),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#8b5cf6' } }, 'Body Scan'),
                h('div', { style: { fontSize: 10, color: '#64748b' } }, 'Check your body')
              )
            )
          ),

          // 5-4-3-2-1 Grounding Exercise
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginBottom: 24, padding: 20, borderRadius: 14, border: '1px solid #334155', background: '#1e293b' } },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
              h('h4', { style: { margin: 0, fontSize: 14, color: '#f1f5f9' } }, '\u270B 5-4-3-2-1 Grounding'),
              groundingComplete > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, color: '#64748b' } }, 'Completed ' + groundingComplete + 'x')
            ),
            h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 16 } },
              band === 'elementary' ? 'Use your senses to feel calm and safe!' : 'A sensory grounding technique to bring you back to the present moment.'
            ),
            !groundingActive
              ? h('button', { 'aria-label': 'Start Grounding Exercise',
                  onClick: function() { upd({ groundingActive: true, groundingStep: 0, groundingInputs: {} }); if (soundEnabled) sfxClick(); },
                  style: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer', width: '100%' }
                }, 'Start Grounding Exercise')
              : h('div', null,
                  // Progress
                  h('div', { style: { display: 'flex', gap: 4, marginBottom: 16 } },
                    groundingSteps.map(function(step, i) {
                      return h('div', {
                        key: i,
                        style: { flex: 1, height: 4, borderRadius: 2, background: i <= groundingStep ? '#7c3aed' : '#334155', transition: 'background 0.3s' }
                      });
                    })
                  ),
                  // Current step
                  (function() {
                    var step = groundingSteps[groundingStep];
                    var inputs = groundingInputs[groundingStep] || [];
                    return h('div', { style: { textAlign: 'center' } },
                      h('div', { style: { fontSize: 36, marginBottom: 8 } }, step.emoji),
                      h('div', { style: { fontSize: 24, fontWeight: 800, color: '#7c3aed', marginBottom: 4 } }, step.count),
                      h('p', { style: { fontSize: 14, color: '#f1f5f9', fontWeight: 600, marginBottom: 4 } }, step.sense),
                      h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 16 } }, step.prompt),
                      // Input fields
                      Array.from({ length: step.count }, function(_, i) {
                        return h('input', {
                          key: i,
                          type: 'text',
                          'aria-label': step.sense + ' item ' + (i + 1),
                          placeholder: (i + 1) + '...',
                          value: (inputs[i] || ''),
                          onChange: function(e) {
                            var newInputs = Object.assign({}, groundingInputs);
                            var arr = (newInputs[groundingStep] || []).slice();
                            arr[i] = e.target.value;
                            newInputs[groundingStep] = arr;
                            upd('groundingInputs', newInputs);
                          },
                          style: { display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, marginBottom: 6, boxSizing: 'border-box' }
                        });
                      }),
                      // Navigation
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 } },
                        groundingStep > 0 && h('button', { 'aria-label': 'Back',
                          onClick: function() { upd('groundingStep', groundingStep - 1); },
                          style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }
                        }, '\u2190 Back'),
                        h('button', { 'aria-label': groundingStep >= groundingSteps.length - 1 ? '\u2705 Done!' : 'Next \u2192',
                          onClick: function() {
                            if (groundingStep >= groundingSteps.length - 1) {
                              var newComplete = groundingComplete + 1;
                              upd({ groundingActive: false, groundingStep: 0, groundingComplete: newComplete });
                              tryAwardBadge('grounding_done');
                              awardXP(15);
                              if (soundEnabled) sfxCorrect();
                              celebrate();
                              addToast('Grounding exercise complete! How do you feel now?', 'success');
                            } else {
                              upd('groundingStep', groundingStep + 1);
                              if (soundEnabled) sfxClick();
                            }
                          },
                          style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' }
                        }, groundingStep >= groundingSteps.length - 1 ? '\u2705 Done!' : 'Next \u2192')
                      )
                    );
                  })()
                )
          ),

          // Saved strategies
          h('h4', { style: { fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 } },
            'Saved Strategies (' + myToolbox.length + ')'
          ),
          myToolbox.length === 0
            ? h('div', { style: { textAlign: 'center', padding: 32, color: '#64748b', background: '#1e293b', borderRadius: 14 } },
                h('p', { style: { fontSize: 28, marginBottom: 8 } }, '\uD83E\uDDF0'),
                h('p', { style: { fontWeight: 600, fontSize: 13 } }, 'Your toolbox is empty'),
                h('p', { style: { fontSize: 11 } }, 'Go to the Explore tab and tap + on strategies you like!')
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                // Group by type
                Object.keys(typeColors).map(function(type) {
                  var inType = myToolbox.filter(function(s) { return s.type === type; });
                  if (inType.length === 0) return null;
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: type },
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 8 } },
                      h('span', null, typeIcons[type] || ''),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, fontWeight: 700, color: typeColors[type], textTransform: 'uppercase', letterSpacing: '0.05em' } }, type)
                    ),
                    inType.map(function(s, i) {
                      return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                        key: i,
                        style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155' }
                      },
                        h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 18 } }, s.icon),
                        h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { flex: 1, fontSize: 12, color: '#e2e8f0' } }, s.text),
                        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { width: 8, height: 8, borderRadius: 4, background: s.zoneColor || '#64748b', flexShrink: 0 } }),
                        h('button', { 'aria-label': 'My Check-In History',
                          onClick: function() {
                            var newToolbox = myToolbox.filter(function(t) { return t.text !== s.text; });
                            upd('myToolbox', newToolbox);
                            addToast('Removed from toolbox', 'info');
                          },
                          style: { padding: '3px 8px', borderRadius: 6, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 10, flexShrink: 0 }
                        }, '\u2715')
                      );
                    })
                  );
                })
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: History ──
      // ══════════════════════════════════════════════════════════
      var historyContent = null;
      if (activeTab === 'history') {
        var log = checkInLog || [];
        historyContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, 'My Check-In History'),
          log.length === 0
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#64748b' } },
                h('p', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83D\uDCDD'),
                h('p', { style: { fontWeight: 600 } }, 'No check-ins yet'),
                h('p', { style: { fontSize: 12 } }, 'Go to the Check-In tab to log your first zone!')
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
                // Zone distribution bar chart
                h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
                  h('h4', { style: { margin: '0 0 12px 0', fontSize: 13, color: '#94a3b8' } }, 'Zone Distribution'),
                  h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 } },
                    ZONES.map(function(zone) {
                      var count = log.filter(function(e) { return e.zone === zone.id; }).length;
                      var pct = log.length > 0 ? Math.round((count / log.length) * 100) : 0;
                      return h('div', {
                        key: zone.id,
                        style: { textAlign: 'center', flex: 1 }
                      },
                        h('div', { style: { fontSize: 20, marginBottom: 4 } }, zone.emoji),
                        // Bar
                        h('div', { style: { height: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 } },
                          h('div', {
                            style: {
                              width: 24, borderRadius: '4px 4px 0 0',
                              height: Math.max(4, pct * 0.6) + 'px',
                              background: zone.color, transition: 'height 0.5s'
                            }
                          })
                        ),
                        h('div', { style: { fontSize: 14, fontWeight: 700, color: zone.color } }, count),
                        h('div', { style: { fontSize: 10, color: '#64748b' } }, pct + '%')
                      );
                    })
                  ),
                  h('p', { style: { textAlign: 'center', fontSize: 11, color: '#64748b', margin: 0 } },
                    log.length + ' total check-in' + (log.length !== 1 ? 's' : '')
                  )
                ),

                // Intensity trend (last 10)
                log.length >= 3 && h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
                  h('h4', { style: { margin: '0 0 12px 0', fontSize: 13, color: '#94a3b8' } }, 'Intensity Trend (recent)'),
                  h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 } },
                    log.slice(-10).map(function(entry, i) {
                      var zone = ZONES.find(function(z) { return z.id === entry.zone; }) || ZONES[1];
                      var intensity = entry.intensity || 5;
                      return h('div', {
                        key: i,
                        title: zone.label + ' - intensity ' + intensity,
                        style: {
                          flex: 1, height: (intensity * 10) + '%', minHeight: 4,
                          background: zone.color, borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s'
                        }
                      });
                    })
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 } },
                    h('span', { style: { fontSize: 11, color: '#64748b' } }, 'Older'),
                    h('span', { style: { fontSize: 11, color: '#64748b' } }, 'Recent')
                  )
                ),

                // Zone transition patterns (last 8)
                log.length >= 2 && h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
                  h('h4', { style: { margin: '0 0 12px 0', fontSize: 13, color: '#94a3b8' } }, 'Zone Flow'),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' } },
                    log.slice(-8).map(function(entry, i) {
                      var zone = ZONES.find(function(z) { return z.id === entry.zone; }) || ZONES[1];
                      return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('div', {
                          title: zone.label,
                          style: { width: 28, height: 28, borderRadius: '50%', background: zone.color + '33', border: '2px solid ' + zone.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }
                        }, zone.emoji),
                        i < Math.min(log.length, 8) - 1 && h('span', { style: { color: '#334155', fontSize: 14 } }, '\u2192')
                      );
                    })
                  ),
                  h('p', { style: { textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: 8 } },
                    band === 'elementary' ? 'This shows how your zones changed over time!' : 'Your emotional trajectory across recent check-ins'
                  )
                ),

                // Log entries (newest first)
                h('h4', { style: { fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0' } }, 'Log Entries'),
                log.slice().reverse().map(function(entry, i) {
                  var zone = ZONES.find(function(z) { return z.id === entry.zone; }) || ZONES[1];
                  var time = new Date(entry.timestamp);
                  return h('div', {
                    key: i,
                    style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155' }
                  },
                    h('span', { style: { fontSize: 24, flexShrink: 0 } }, zone.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                        h('span', { style: { fontWeight: 700, color: zone.color, fontSize: 13 } }, zone.label),
                        entry.intensity && h('span', { style: { fontSize: 10, padding: '1px 6px', borderRadius: 6, background: zone.color + '22', color: zone.color } }, 'Intensity: ' + entry.intensity + '/10'),
                        h('span', { style: { fontSize: 10, color: '#64748b' } }, time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                      ),
                      entry.note && h('p', { style: { margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 } }, entry.note)
                    )
                  );
                })
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── CSS Keyframes (injected once) ──
      // ══════════════════════════════════════════════════════════
      React.useEffect && React.useEffect(function() {
        if (document.getElementById('sel-zones-keyframes')) return;
        var s = document.createElement('style');
        s.id = 'sel-zones-keyframes';
        s.textContent = [
          '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
          '@keyframes scaleIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }',
          '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }'
        ].join('\n');
        document.head.appendChild(s);
        return function() { var el = document.getElementById('sel-zones-keyframes'); if (el) el.remove(); };
      }, []);

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      return h('div', { style: { minHeight: '100%' } },
        tabBar,
        badgePopup,
        checkinContent,
        exploreContent,
        breatheContent,
        bodyContent,
        scenarioContent,
        toolboxContent,
        historyContent
      );
    }
  });
})();
