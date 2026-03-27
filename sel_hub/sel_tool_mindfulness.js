// ═══════════════════════════════════════════════════════════════
// sel_tool_mindfulness.js — Mindfulness Corner Plugin (v1.0)
// Guided breathing with animated visuals, body scan walkthrough,
// 5-4-3-2-1 grounding exercise, gratitude journal with AI coach,
// mindful moments activity library, and practice log/stats.
// Registered tool ID: "mindfulness"
// Category: self-management
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
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxBowl() { playTone(264, 0.8, 'sine', 0.06); setTimeout(function() { playTone(396, 0.6, 'sine', 0.04); }, 100); setTimeout(function() { playTone(528, 0.5, 'sine', 0.03); }, 200); }
  function sfxChime() { playTone(784, 0.3, 'sine', 0.05); setTimeout(function() { playTone(988, 0.25, 'sine', 0.04); }, 150); setTimeout(function() { playTone(1175, 0.3, 'sine', 0.03); }, 300); }
  function sfxComplete() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxSave() { playTone(440, 0.15, 'sine', 0.06); setTimeout(function() { playTone(554, 0.15, 'sine', 0.06); }, 100); setTimeout(function() { playTone(659, 0.2, 'sine', 0.08); }, 200); }

  // Ambient tone generator for meditation
  function playAmbient(freq, dur, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(vol || 0.03, ac.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════
  // ── Breathing Patterns ──
  // ══════════════════════════════════════════════════════════════
  var BREATH_PATTERNS = [
    {
      id: 'box', name: 'Box Breathing', emoji: '\u2B1C', color: '#3b82f6',
      desc: { elementary: 'Breathe like a square — in, hold, out, hold, all the same!', middle: 'Equal-count breathing used by Navy SEALs to stay calm under pressure.', high: 'Equalizing inhale, hold, exhale, and post-exhale pause activates the vagal brake.' },
      inhale: 4, hold: 4, exhale: 4, holdOut: 4, cycles: 4
    },
    {
      id: 'relax478', name: '4-7-8 Relaxation', emoji: '\uD83C\uDF19', color: '#8b5cf6',
      desc: { elementary: 'Breathe in for 4, hold for 7, breathe out for a loooong 8!', middle: 'The "relaxing breath" technique — the long exhale triggers deep calm.', high: 'Extended exhale shifts autonomic balance toward parasympathetic dominance.' },
      inhale: 4, hold: 7, exhale: 8, holdOut: 0, cycles: 4
    },
    {
      id: 'belly', name: 'Belly Breathing', emoji: '\uD83C\uDF08', color: '#22c55e',
      desc: { elementary: 'Fill your belly like a balloon, then let it slowly go flat!', middle: 'Deep diaphragmatic breathing — your belly moves, not your chest.', high: 'Diaphragmatic breathing increases tidal volume and stimulates the vagus nerve.' },
      inhale: 4, hold: 1, exhale: 6, holdOut: 1, cycles: 5
    },
    {
      id: 'triangle', name: 'Triangle Breathing', emoji: '\uD83D\uDD3A', color: '#f59e0b',
      desc: { elementary: 'Like a triangle — three sides: breathe in, breathe out, rest!', middle: 'Three-phase breathing cycle for focus and calm.', high: 'Simplified cyclic pattern suitable for beginners; reduces cognitive load.' },
      inhale: 3, hold: 3, exhale: 3, holdOut: 0, cycles: 5
    },
    {
      id: 'ocean', name: 'Ocean Breath', emoji: '\uD83C\uDF0A', color: '#06b6d4',
      desc: { elementary: 'Breathe like the ocean waves — in and out, nice and slow!', middle: 'Long, flowing breaths that sound like ocean waves rolling in and out.', high: 'Ujjayi-inspired breathing — slight throat constriction creates auditory feedback.' },
      inhale: 5, hold: 0, exhale: 5, holdOut: 2, cycles: 5
    },
    {
      id: 'bumblebee', name: 'Bumblebee Breath', emoji: '\uD83D\uDC1D', color: '#eab308',
      desc: { elementary: 'Breathe in, then hum like a bumblebee when you breathe out! Bzzzzz!', middle: 'Inhale normally, then hum on the exhale — the vibration is naturally calming.', high: 'Bhramari pranayama — humming on exhale produces nitric oxide and vagal stimulation.' },
      inhale: 4, hold: 0, exhale: 6, holdOut: 1, cycles: 4
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Body Scan Sequences ──
  // ══════════════════════════════════════════════════════════════
  var BODY_SCAN_STEPS = {
    elementary: [
      { area: 'Feet & Toes',   emoji: '\uD83E\uDDB6', instruction: 'Wiggle your toes. Can you feel them? Squeeze them tight, then let them relax like noodles.', seconds: 15 },
      { area: 'Legs',          emoji: '\uD83E\uDDB5', instruction: 'Tighten your leg muscles — make them hard like a rock! Now let them go soft and floppy.', seconds: 15 },
      { area: 'Tummy',        emoji: '\uD83E\uDEF4', instruction: 'Put your hand on your belly. Feel it rise and fall like a balloon with each breath.', seconds: 15 },
      { area: 'Hands',        emoji: '\u270B',       instruction: 'Make tight fists — squeeze! Now open them up and let your fingers spread out like starfish.', seconds: 12 },
      { area: 'Arms & Shoulders', emoji: '\uD83D\uDCAA', instruction: 'Lift your shoulders up to your ears, hold them there... now drop them down. Ahhhh!', seconds: 12 },
      { area: 'Face',         emoji: '\uD83D\uDE0A', instruction: 'Scrunch up your face like you bit a lemon! Now relax it. Make a big yawn if you want to!', seconds: 12 },
      { area: 'Whole Body',   emoji: '\u2728',       instruction: 'Take one big deep breath. Your whole body is relaxed and calm. You did it!', seconds: 10 }
    ],
    middle: [
      { area: 'Feet & Ankles', emoji: '\uD83E\uDDB6', instruction: 'Notice your feet on the floor. Gently press down, then release. Notice the difference between tension and relaxation.', seconds: 18 },
      { area: 'Legs & Knees',  emoji: '\uD83E\uDDB5', instruction: 'Tense your calf and thigh muscles. Hold for a moment. Now release and notice the warmth as tension drains away.', seconds: 18 },
      { area: 'Core & Back',   emoji: '\uD83E\uDEF4', instruction: 'Engage your core — tighten your stomach and lower back. Hold for 5 seconds. Now slowly release and breathe.', seconds: 18 },
      { area: 'Hands & Arms',  emoji: '\u270B',       instruction: 'Make fists and bend your arms. Notice the tension climbing from fingers to biceps. Now unfold and let your arms hang heavy.', seconds: 15 },
      { area: 'Shoulders & Neck', emoji: '\uD83D\uDCAA', instruction: 'Roll your shoulders up, squeeze them toward your ears, hold. Now drop them. Slowly tilt your head side to side.', seconds: 18 },
      { area: 'Jaw & Face',   emoji: '\uD83D\uDE0A', instruction: 'Unclench your jaw. Let your tongue fall from the roof of your mouth. Soften the muscles around your eyes.', seconds: 15 },
      { area: 'Breath & Mind', emoji: '\u2728',       instruction: 'Take three slow breaths. With each exhale, imagine sending relaxation to any spot that still holds tension.', seconds: 20 }
    ],
    high: [
      { area: 'Foundation (Feet)', emoji: '\uD83E\uDDB6', instruction: 'Ground through your feet. Notice pressure, temperature, texture. Contract the intrinsic foot muscles, then release — observe the parasympathetic rebound.', seconds: 20 },
      { area: 'Lower Body',       emoji: '\uD83E\uDDB5', instruction: 'Scan from ankles to hips. Sequentially tense and release each muscle group: calves, quadriceps, hamstrings, glutes. Notice the contrast between effortful contraction and effortless release.', seconds: 25 },
      { area: 'Core & Viscera',   emoji: '\uD83E\uDEF4', instruction: 'Turn attention inward to your abdominal cavity. Notice your diaphragm\'s movement. Observe without judgment: heartbeat, digestion, any held tension in the psoas or lower back.', seconds: 25 },
      { area: 'Upper Extremities', emoji: '\u270B',       instruction: 'Scan from fingertips to shoulders. Notice micro-tensions — grip patterns, wrist flexion, shoulder elevation. Progressively release each layer.', seconds: 20 },
      { area: 'Cervical & Cranial', emoji: '\uD83D\uDCAA', instruction: 'Release the deep cervical flexors. Soften the masseter (jaw), temporalis (temples), and orbicularis oculi (eye) muscles. Let the weight of your head be fully supported.', seconds: 20 },
      { area: 'Interoceptive Check', emoji: '\uD83D\uDE0A', instruction: 'Shift from exteroceptive to interoceptive awareness. What do you notice from the inside? Heart rate, breath rhythm, emotional tone — observe without narrative.', seconds: 20 },
      { area: 'Integration',       emoji: '\u2728',       instruction: 'Hold awareness of the whole body simultaneously — one unified field. Three breaths here. When ready, gently expand awareness back outward.', seconds: 25 }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── 5-4-3-2-1 Grounding Senses ──
  // ══════════════════════════════════════════════════════════════
  var GROUNDING_SENSES = [
    { sense: 'See',   count: 5, emoji: '\uD83D\uDC41\uFE0F', color: '#3b82f6', prompt: { elementary: '5 things you can SEE right now', middle: '5 things you can see around you', high: '5 visual stimuli in your environment' } },
    { sense: 'Touch', count: 4, emoji: '\u270B',       color: '#22c55e', prompt: { elementary: '4 things you can TOUCH or feel', middle: '4 things you can physically feel', high: '4 tactile sensations you can identify' } },
    { sense: 'Hear',  count: 3, emoji: '\uD83D\uDC42', color: '#f59e0b', prompt: { elementary: '3 things you can HEAR', middle: '3 sounds you can hear', high: '3 auditory stimuli you can detect' } },
    { sense: 'Smell', count: 2, emoji: '\uD83D\uDC43', color: '#ec4899', prompt: { elementary: '2 things you can SMELL', middle: '2 things you can smell', high: '2 olfactory stimuli in your vicinity' } },
    { sense: 'Taste', count: 1, emoji: '\uD83D\uDC45', color: '#8b5cf6', prompt: { elementary: '1 thing you can TASTE', middle: '1 thing you can taste', high: '1 gustatory sensation you can identify' } }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Mindful Moments Activity Library ──
  // ══════════════════════════════════════════════════════════════
  var MINDFUL_ACTIVITIES = [
    {
      id: 'mindful_listen', name: 'Mindful Listening', emoji: '\uD83C\uDFB5', duration: '2 min', category: 'focus',
      color: '#3b82f6',
      desc: { elementary: 'Close your eyes and listen to all the sounds around you. How many can you count?', middle: 'Sit quietly for 2 minutes and notice every sound — near and far, loud and soft.', high: 'Practice open monitoring meditation focused on the auditory channel. Notice sounds arising and passing without labeling.' },
      steps: { elementary: ['Close your eyes (or look down)', 'Listen carefully for 1 minute', 'Try to hear sounds that are far away', 'Try to hear sounds that are close', 'How many different sounds did you count?'], middle: ['Find a comfortable position and close your eyes', 'For 2 minutes, just listen — don\'t judge, just notice', 'Notice sounds you usually ignore (AC hum, distant traffic)', 'When your mind wanders, gently return to listening', 'Open your eyes. How many sounds did you notice?'], high: ['Settle into a comfortable posture. Close your eyes.', 'Practice open auditory monitoring for 2 minutes', 'Notice the arising and passing of sounds without narrative', 'Observe the space between sounds — the silence', 'Notice any urge to label or evaluate. Let it pass.'] }
    },
    {
      id: 'mindful_eat', name: 'Mindful Eating', emoji: '\uD83C\uDF4E', duration: '3 min', category: 'awareness',
      color: '#22c55e',
      desc: { elementary: 'Eat one tiny bite REALLY slowly and notice everything about it!', middle: 'Experience a single bite of food with full attention — texture, flavor, temperature.', high: 'Full sensory engagement with a single morsel — a classic mindfulness induction.' },
      steps: { elementary: ['Pick one small piece of food (raisin, cracker, grape)', 'Look at it closely — what colors and shapes do you see?', 'Feel it — is it smooth? rough? squishy?', 'Smell it — what does it smell like?', 'Put it in your mouth but don\'t chew yet! Just feel it on your tongue.', 'Now chew very slowly and notice all the flavors!'], middle: ['Choose a small piece of food', 'Examine it visually for 30 seconds — notice colors, textures, imperfections', 'Hold it and notice weight, temperature, surface texture', 'Smell it — notice what happens in your mouth', 'Place it on your tongue. Notice the initial sensation before chewing.', 'Chew slowly — 15-20 times. Notice how taste and texture change.', 'Swallow and notice the aftertaste. How do you feel?'], high: ['Select a single morsel. Hold it as if you\'ve never seen food before.', 'Visual examination: color gradients, surface topology, light refraction', 'Tactile exploration: weight, temperature, compliance under pressure', 'Olfactory: notice retronasal vs. orthonasal aroma differences', 'Oral: proprioceptive awareness as you place it on the tongue', 'Mastication: track the transformation of texture and flavor compounds', 'Post-ingestive: observe the full swallowing reflex chain and aftertaste'] }
    },
    {
      id: 'cloud_watching', name: 'Thought Clouds', emoji: '\u2601\uFE0F', duration: '3 min', category: 'defusion',
      color: '#64748b',
      desc: { elementary: 'Imagine your thoughts are clouds floating by in the sky. Just watch them go!', middle: 'Visualize thoughts as clouds drifting across the sky — you\'re the sky, not the clouds.', high: 'Cognitive defusion exercise: observe thoughts as mental events, not facts.' },
      steps: { elementary: ['Sit comfortably and close your eyes', 'Imagine a big blue sky inside your mind', 'When a thought pops up, put it on a cloud', 'Watch the cloud float away across the sky', 'You don\'t have to chase it! Just let it go.', 'Keep watching for 2-3 minutes'], middle: ['Close your eyes and take three deep breaths', 'Visualize a vast open sky', 'Notice when a thought appears — any thought', 'Place it gently on a cloud and watch it drift', 'You are the sky. Thoughts are just weather.', 'Notice: some clouds are dark, some light. Both pass.', 'Continue for 3 minutes'], high: ['Settle into metacognitive awareness', 'Observe the arising of each thought without engagement', 'Practice cognitive defusion: "I notice I\'m having the thought that..."', 'Thoughts are mental events, not reality. Observe them like a scientist.', 'Notice attachment to certain thoughts. Can you release the grip?', 'Return to the metaphor: you are the sky. Always present, always spacious.', 'Continue for 3-5 minutes. This is decentering — a core mindfulness skill.'] }
    },
    {
      id: 'kind_thoughts', name: 'Loving-Kindness', emoji: '\uD83D\uDC9C', duration: '3 min', category: 'compassion',
      color: '#ec4899',
      desc: { elementary: 'Send happy wishes to yourself, then to someone you love, then to everyone!', middle: 'Practice sending kind wishes to yourself, a friend, a neutral person, and all beings.', high: 'Metta meditation: systematically cultivate benevolent intention across expanding circles.' },
      steps: { elementary: ['Put your hand on your heart', 'Say to yourself: "May I be happy. May I be safe."', 'Think of someone you love. Say: "May you be happy. May you be safe."', 'Think of your whole class. Say: "May everyone be happy."', 'Take a deep breath. Feel the warm feelings inside!'], middle: ['Close your eyes and breathe deeply', 'Focus on yourself: "May I be happy, healthy, safe, and at ease."', 'Think of someone you care about. Send them the same wishes.', 'Think of someone neutral (a classmate you don\'t know well). Send them the wishes.', 'Expand to your whole school, city, world: "May all beings be happy."', 'Sit with the feeling of universal goodwill for 30 seconds.'], high: ['Settle into stillness. Generate metta (loving-kindness) toward yourself.', '"May I be free from suffering. May I be at ease. May I find peace."', 'Extend to a beloved: repeat the phrases with them in mind.', 'Extend to a neutral person — someone whose inner life you know nothing about.', 'If possible, extend to a difficult person — start small. This is the edge of practice.', 'Radiate outward: all beings, everywhere, without exception.', 'Rest in the field of open-hearted awareness. Notice how it feels in your body.'] }
    },
    {
      id: 'finger_breathing', name: 'Finger Breathing', emoji: '\u270B', duration: '1 min', category: 'regulation',
      color: '#f59e0b',
      desc: { elementary: 'Trace up and down each finger while breathing in and out. Easy and calming!', middle: 'Trace the outline of your hand — breathe in going up, out going down each finger.', high: 'Tactile-kinesthetic breath entrainment using finger tracing as an anchor.' },
      steps: { elementary: ['Hold up one hand with fingers spread wide', 'With your other pointer finger, start at the bottom of your thumb', 'Breathe IN as you trace UP the thumb', 'Breathe OUT as you trace DOWN the other side', 'Keep going! Breathe in going up, out going down each finger', 'When you reach the pinky, go back the other way!'], middle: ['Spread one hand wide. Use the index finger of the other hand to trace.', 'Start at the base of the thumb. Inhale as you trace up.', 'Exhale as you trace down the other side.', 'Continue across all five fingers without pausing.', 'Match your breath to the movement — slow and steady.', 'Reverse direction and trace back. Do 2 full rounds.'], high: ['This exercise combines proprioceptive attention with respiratory entrainment.', 'Trace each finger: inhale ascending, exhale descending.', 'Focus on the tactile sensation at the point of contact.', 'Maintain consistent breath-to-movement synchronization.', 'Notice how external physical anchoring calms internal chatter.', 'Complete two full passes. This technique is portable — useful anywhere.'] }
    },
    {
      id: 'gratitude_pause', name: 'Gratitude Pause', emoji: '\uD83D\uDE4F', duration: '2 min', category: 'wellbeing',
      color: '#22c55e',
      desc: { elementary: 'Think of 3 things that make you say "thank you!" today.', middle: 'Pause and name three specific things you\'re grateful for right now.', high: 'Deliberate gratitude practice — a well-evidenced positive psychology intervention.' },
      steps: { elementary: ['Close your eyes and smile', 'Think of one thing that made you happy today. What was it?', 'Think of one person who was kind to you. Who was it?', 'Think of one thing about your body that works great!', 'Say "thank you" to each one inside your heart', 'Open your eyes. Do you feel a little warmer inside?'], middle: ['Take a moment of stillness', 'Name one specific thing today you\'re grateful for (not generic — specific)', 'Name one person and what they did that you appreciate', 'Name one quality about yourself you\'re grateful for', 'Sit with the feeling of appreciation for 30 seconds', 'Notice: does gratitude change how your body feels?'], high: ['Engage in deliberate gratitude reflection', 'Identify something specific from today — not a generality, but a particular moment', 'Identify an interpersonal connection you value — what specifically about it?', 'Identify a personal capacity or resource you often take for granted', 'Research shows regular gratitude practice increases well-being by ~25%', 'Hold the composite feeling of appreciation. Where do you feel it somatically?'] }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Gratitude Prompts ──
  // ══════════════════════════════════════════════════════════════
  var GRATITUDE_PROMPTS = {
    elementary: [
      'What made you smile today?',
      'Who is someone who helps you?',
      'What is your favorite thing about your family?',
      'What food are you thankful for?',
      'What is something fun you did today?',
      'Who made you laugh recently?',
      'What is something nice someone did for you?',
      'What is your favorite place to go?',
      'What is something about yourself that you like?',
      'What animal or pet are you thankful for?'
    ],
    middle: [
      'What challenge taught you something valuable this week?',
      'Who is someone outside your family that you appreciate?',
      'What is a skill you have that you\'re grateful for?',
      'What moment today was better than expected?',
      'What about your school or community are you thankful for?',
      'When did someone show you kindness recently?',
      'What is something you often take for granted but are glad to have?',
      'What opportunity are you grateful to have?',
      'Who inspires you, and why?',
      'What part of your daily routine do you actually enjoy?'
    ],
    high: [
      'What adversity has shaped you in a positive way?',
      'Who has believed in you when you struggled to believe in yourself?',
      'What aspect of your identity are you growing to appreciate?',
      'What intellectual or creative ability brings you satisfaction?',
      'What relationship has deepened recently, and what made that possible?',
      'What systemic privilege or resource do you benefit from?',
      'What mistake led to unexpected growth?',
      'What value or principle guides you, and who helped you form it?',
      'What about the present moment is enough, as it is?',
      'What part of your mental health journey are you grateful for?'
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_breath',     icon: '\uD83C\uDF2C\uFE0F', name: 'First Breath',        desc: 'Complete your first guided breathing session' },
    { id: 'breath_3',         icon: '\uD83D\uDCAA',       name: 'Breath Athlete',       desc: 'Complete 3 breathing sessions' },
    { id: 'all_patterns',     icon: '\uD83C\uDFC6',       name: 'Pattern Master',       desc: 'Try all 6 breathing patterns' },
    { id: 'first_scan',       icon: '\uD83E\uDEC0',       name: 'Body Explorer',        desc: 'Complete your first body scan' },
    { id: 'scan_3',           icon: '\uD83E\uDDD8',       name: 'Scan Veteran',         desc: 'Complete 3 body scans' },
    { id: 'grounding_done',   icon: '\uD83C\uDF0D',       name: 'Grounded',             desc: 'Complete a full 5-4-3-2-1 grounding exercise' },
    { id: 'grounding_3',      icon: '\u2693',             name: 'Anchor Master',        desc: 'Complete 3 grounding exercises' },
    { id: 'gratitude_1',      icon: '\uD83D\uDE4F',       name: 'Grateful Heart',       desc: 'Write your first gratitude entry' },
    { id: 'gratitude_5',      icon: '\uD83C\uDF1F',       name: 'Gratitude Gardener',   desc: 'Write 5 gratitude entries' },
    { id: 'gratitude_15',     icon: '\uD83C\uDF3B',       name: 'Gratitude Bloom',      desc: 'Write 15 gratitude entries' },
    { id: 'activity_3',       icon: '\uD83D\uDCDA',       name: 'Mindful Explorer',     desc: 'Try 3 different mindful activities' },
    { id: 'activity_all',     icon: '\uD83C\uDF08',       name: 'Mindfulness Master',   desc: 'Try every mindful activity' },
    { id: 'streak_3',         icon: '\uD83D\uDD25',       name: 'Streak Starter',       desc: 'Practice 3 days in a row' },
    { id: 'streak_7',         icon: '\u2B50',             name: 'Mindful Week',         desc: 'Practice 7 days in a row' },
    { id: 'total_10',         icon: '\uD83E\uDDE0',       name: 'Dedicated Practitioner', desc: 'Complete 10 total mindfulness practices' },
    { id: 'ai_coach',         icon: '\u2728',             name: 'Inner Guide',          desc: 'Get a reflection from the AI mindfulness coach' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Closure-Scoped Timers ──
  // ══════════════════════════════════════════════════════════════
  var _breathTimerId = null;
  function stopBreathTimer() { if (_breathTimerId) { clearInterval(_breathTimerId); _breathTimerId = null; } }
  var _scanTimerId = null;
  function stopScanTimer() { if (_scanTimerId) { clearInterval(_scanTimerId); _scanTimerId = null; } }

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('mindfulness', {
    icon: '\uD83E\uDDD8',
    label: 'Mindfulness Corner',
    desc: 'Guided breathing, body scans, grounding, and gratitude \u2014 find your calm.',
    color: 'purple',
    category: 'self-management',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.mindfulness) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('mindfulness', key); }
        else { if (ctx.update) ctx.update('mindfulness', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'breathe';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Breathing state
      var breathPatternIdx = d.breathPatternIdx || 0;
      var breathPhase      = d.breathPhase || null; // 'inhale','hold','exhale','holdOut',null
      var breathTimeLeft   = d.breathTimeLeft || 0;
      var breathCycle      = d.breathCycle || 0;
      var breathActive     = d.breathActive || false;
      var breathSessions   = d.breathSessions || 0;
      var breathPatternsUsed = d.breathPatternsUsed || {};

      // Body Scan state
      var scanStep         = d.scanStep != null ? d.scanStep : -1; // -1 = not started
      var scanTimeLeft     = d.scanTimeLeft || 0;
      var scanActive       = d.scanActive || false;
      var scanSessions     = d.scanSessions || 0;

      // Grounding state
      var groundStep       = d.groundStep || 0; // 0-4 = senses, 5 = done
      var groundInputs     = d.groundInputs || ['','','','',''];
      var groundCompleted  = d.groundCompleted || 0;

      // Gratitude state
      var gratEntries      = d.gratEntries || [];
      var gratDraft        = d.gratDraft || '';
      var gratPrompt       = d.gratPrompt || null;
      var gratAiResp       = d.gratAiResp || null;
      var gratAiLoading    = d.gratAiLoading || false;

      // Activities state
      var activityDone     = d.activityDone || {}; // { activityId: true }
      var activeActivity   = d.activeActivity || null;
      var activityStep     = d.activityStep || 0;

      // Practice log
      var practiceLog      = d.practiceLog || []; // { type, id, timestamp }

      // Badge state
      var earnedBadges     = d.earnedBadges || {};
      var showBadgePopup   = d.showBadgePopup || null;
      var showBadgesPanel  = d.showBadgesPanel || false;

      // ── Helpers ──
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

      function logPractice(type, id) {
        var entry = { type: type, id: id, timestamp: Date.now() };
        var newLog = practiceLog.concat([entry]);
        upd('practiceLog', newLog);

        // Streak check
        var daySet = {};
        newLog.forEach(function(e) { daySet[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
        var today = new Date();
        var streak = 0;
        for (var si = 0; si < 30; si++) {
          var chk = new Date(today);
          chk.setDate(chk.getDate() - si);
          if (daySet[chk.toISOString().slice(0,10)]) { streak++; } else if (si > 0) { break; }
        }
        if (streak >= 3) tryAwardBadge('streak_3');
        if (streak >= 7) tryAwardBadge('streak_7');
        if (newLog.length >= 10) tryAwardBadge('total_10');
      }

      function todayStr() { return new Date().toISOString().slice(0,10); }

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'breathe',   label: '\uD83C\uDF2C\uFE0F Breathe' },
        { id: 'scan',      label: '\uD83E\uDEC0 Body Scan' },
        { id: 'ground',    label: '\uD83C\uDF0D Grounding' },
        { id: 'gratitude', label: '\uD83D\uDE4F Gratitude' },
        { id: 'moments',   label: '\uD83C\uDF3F Moments' },
        { id: 'log',       label: '\uD83D\uDCCA Practice Log' }
      ];

      var tabBar = h('div', {
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', {
            key: tab.id,
            onClick: function() {
              stopBreathTimer(); stopScanTimer();
              upd({ activeTab: tab.id, breathActive: false, breathPhase: null, scanActive: false });
              if (soundEnabled) sfxClick();
            },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#8b5cf6' : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontWeight: isActive ? 700 : 500, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
            }
          }, tab.label);
        }),
        h('button', {
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          title: soundEnabled ? 'Mute sounds' : 'Enable sounds',
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', {
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#8b5cf633' : 'transparent', color: '#64748b', fontSize: 14, flexShrink: 0 }
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
            onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', {
              style: { background: 'linear-gradient(135deg, #0c1631 0%, #1e293b 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid #8b5cf6', maxWidth: 320 },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, popBadge.icon),
              h('p', { style: { fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Badge Earned!'),
              h('h3', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 20 } }, popBadge.name),
              h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 13 } }, popBadge.desc),
              h('p', { style: { margin: '12px 0 0 0', color: '#8b5cf6', fontSize: 12, fontWeight: 700 } }, '+25 XP')
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
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#0c1631' : '#1e293b', border: '1px solid ' + (earned ? '#8b5cf6' : '#334155'), opacity: earned ? 1 : 0.4 }
                },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, badge.icon),
                  h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#e2e8f0' : '#64748b' } }, badge.name),
                  h('div', { style: { fontSize: 9, color: '#64748b', marginTop: 2 } }, badge.desc)
                );
              })
            ),
            h('button', {
              onClick: function() { upd('showBadgesPanel', false); },
              style: { display: 'block', margin: '16px auto 0', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }
            }, 'Close')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Guided Breathing ──
      // ══════════════════════════════════════════════════════════
      var breatheContent = null;
      if (activeTab === 'breathe') {
        var bp = BREATH_PATTERNS[breathPatternIdx];

        breatheContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83C\uDF2C\uFE0F Let\'s Breathe Together!' : '\uD83C\uDF2C\uFE0F Guided Breathing'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            band === 'elementary' ? 'Pick a breathing pattern and follow the circle!' :
            band === 'middle' ? 'Choose a pattern and sync your breath to the visual guide.' :
            'Select a respiratory entrainment pattern. Follow the visual pacer.'
          ),

          // Pattern selector (3x2 grid)
          !breathActive && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 } },
            BREATH_PATTERNS.map(function(pat, i) {
              var isSel = breathPatternIdx === i;
              var used = breathPatternsUsed[pat.id];
              return h('button', {
                key: pat.id,
                onClick: function() { upd('breathPatternIdx', i); if (soundEnabled) sfxClick(); },
                style: {
                  padding: '12px 8px', borderRadius: 12, border: isSel ? '2px solid ' + pat.color : '1px solid #334155',
                  background: isSel ? pat.color + '18' : '#1e293b', cursor: 'pointer', textAlign: 'center'
                }
              },
                h('div', { style: { fontSize: 22, marginBottom: 2 } }, pat.emoji),
                h('div', { style: { fontSize: 11, fontWeight: 700, color: isSel ? pat.color : '#e2e8f0' } }, pat.name),
                used && h('div', { style: { fontSize: 8, color: '#22c55e', marginTop: 2 } }, '\u2713 tried')
              );
            })
          ),

          // Pattern description
          !breathActive && h('div', { style: { padding: 14, borderRadius: 12, background: bp.color + '12', border: '1px solid ' + bp.color + '33', marginBottom: 16, textAlign: 'center' } },
            h('p', { style: { fontSize: 13, color: '#e2e8f0', margin: 0, lineHeight: 1.5 } }, bp.desc[band]),
            h('p', { style: { fontSize: 10, color: '#64748b', margin: '6px 0 0' } },
              'In ' + bp.inhale + 's' + (bp.hold ? ' \u2022 Hold ' + bp.hold + 's' : '') + ' \u2022 Out ' + bp.exhale + 's' + (bp.holdOut ? ' \u2022 Rest ' + bp.holdOut + 's' : '') + ' \u2022 ' + bp.cycles + ' cycles'
            )
          ),

          // Start button
          !breathActive && h('button', {
            onClick: function() {
              stopBreathTimer();
              upd({ breathActive: true, breathPhase: 'inhale', breathTimeLeft: bp.inhale, breathCycle: 1 });
              if (soundEnabled) sfxBowl();
              // Start timer
              _breathTimerId = setInterval(function() {
                var st = (ctx.toolData && ctx.toolData.mindfulness) || {};
                var tl = (st.breathTimeLeft || 1) - 1;
                var phase = st.breathPhase;
                var cycle = st.breathCycle || 1;
                var pat = BREATH_PATTERNS[st.breathPatternIdx || 0];

                if (tl <= 0) {
                  // Advance phase
                  if (phase === 'inhale' && pat.hold > 0) { upd({ breathPhase: 'hold', breathTimeLeft: pat.hold }); }
                  else if (phase === 'inhale' || phase === 'hold') { upd({ breathPhase: 'exhale', breathTimeLeft: pat.exhale }); }
                  else if (phase === 'exhale' && pat.holdOut > 0) { upd({ breathPhase: 'holdOut', breathTimeLeft: pat.holdOut }); }
                  else {
                    // End of cycle
                    if (cycle >= pat.cycles) {
                      // Done!
                      stopBreathTimer();
                      var newSessions = (st.breathSessions || 0) + 1;
                      var newUsed = Object.assign({}, st.breathPatternsUsed || {});
                      newUsed[pat.id] = true;
                      upd({ breathActive: false, breathPhase: null, breathSessions: newSessions, breathPatternsUsed: newUsed });
                      if (soundEnabled) sfxComplete();
                      celebrate();
                      addToast('\uD83C\uDF2C\uFE0F Breathing session complete!', 'success');
                      awardXP(15);
                      tryAwardBadge('first_breath');
                      if (newSessions >= 3) tryAwardBadge('breath_3');
                      if (Object.keys(newUsed).length >= BREATH_PATTERNS.length) tryAwardBadge('all_patterns');
                      logPractice('breathe', pat.id);
                    } else {
                      upd({ breathPhase: 'inhale', breathTimeLeft: pat.inhale, breathCycle: cycle + 1 });
                    }
                  }
                } else {
                  upd('breathTimeLeft', tl);
                }
              }, 1000);
            },
            style: { width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: bp.color, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
          }, '\uD83C\uDF2C\uFE0F Begin Breathing'),

          // Active breathing display
          breathActive && h('div', { style: { textAlign: 'center' } },
            // Animated circle
            h('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0' } },
              h('div', {
                style: {
                  width: breathPhase === 'inhale' || breathPhase === 'hold' ? 180 : 100,
                  height: breathPhase === 'inhale' || breathPhase === 'hold' ? 180 : 100,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, ' + bp.color + '33, ' + bp.color + '11)',
                  border: '3px solid ' + bp.color,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  transition: 'width ' + (breathPhase === 'inhale' ? bp.inhale : breathPhase === 'exhale' ? bp.exhale : 0.3) + 's ease-in-out, height ' + (breathPhase === 'inhale' ? bp.inhale : breathPhase === 'exhale' ? bp.exhale : 0.3) + 's ease-in-out',
                  boxShadow: '0 0 30px ' + bp.color + '44'
                }
              },
                h('div', { style: { fontSize: 24, fontWeight: 800, color: bp.color } }, breathTimeLeft),
                h('div', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 600, marginTop: 2 } },
                  breathPhase === 'inhale' ? (band === 'elementary' ? 'Breathe In...' : 'Inhale') :
                  breathPhase === 'hold' ? (band === 'elementary' ? 'Hold it...' : 'Hold') :
                  breathPhase === 'exhale' ? (band === 'elementary' ? 'Breathe Out...' : 'Exhale') :
                  (band === 'elementary' ? 'Rest...' : 'Pause')
                )
              )
            ),

            // Cycle indicator
            h('p', { style: { fontSize: 11, color: '#64748b', marginBottom: 16 } },
              'Cycle ' + breathCycle + ' of ' + bp.cycles + ' \u2022 ' + bp.name
            ),

            // Stop button
            h('button', {
              onClick: function() {
                stopBreathTimer();
                upd({ breathActive: false, breathPhase: null });
              },
              style: { padding: '10px 24px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
            }, '\u25A0 Stop')
          ),

          // Sessions counter
          breathSessions > 0 && !breathActive && h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 12 } },
            '\uD83C\uDF2C\uFE0F ' + breathSessions + ' session' + (breathSessions !== 1 ? 's' : '') + ' completed'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Body Scan ──
      // ══════════════════════════════════════════════════════════
      var scanContent = null;
      if (activeTab === 'scan') {
        var scanSteps = BODY_SCAN_STEPS[band] || BODY_SCAN_STEPS.elementary;
        var currentScanStep = scanStep >= 0 && scanStep < scanSteps.length ? scanSteps[scanStep] : null;

        scanContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83E\uDEC0 Body Check-Up!' : '\uD83E\uDEC0 Body Scan'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'We\'ll check in with each part of your body, from toes to head!' :
            band === 'middle' ? 'Progressive body scan — notice tension and release it, one area at a time.' :
            'Progressive muscle relaxation meets interoceptive awareness. Scan systematically.'
          ),

          // Not started yet
          scanStep === -1 && h('div', { style: { textAlign: 'center' } },
            h('div', { style: { fontSize: 64, marginBottom: 16 } }, '\uD83E\uDDD8'),
            h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 16, lineHeight: 1.5 } },
              band === 'elementary'
                ? 'Find a comfortable seat. You can close your eyes if you want to. Ready?'
                : 'Find a comfortable position. Close your eyes when ready. You\'ll spend about ' + scanSteps.reduce(function(s,st) { return s + st.seconds; }, 0) + ' seconds total.'
            ),
            h('p', { style: { color: '#64748b', fontSize: 11, marginBottom: 20 } },
              scanSteps.length + ' body areas \u2022 ~' + Math.round(scanSteps.reduce(function(s,st) { return s + st.seconds; }, 0) / 60) + ' minutes'
            ),
            h('button', {
              onClick: function() {
                upd({ scanStep: 0, scanTimeLeft: scanSteps[0].seconds, scanActive: true });
                if (soundEnabled) sfxBowl();
                // Start scan timer
                _scanTimerId = setInterval(function() {
                  var st = (ctx.toolData && ctx.toolData.mindfulness) || {};
                  var tl = (st.scanTimeLeft || 1) - 1;
                  var step = st.scanStep || 0;
                  var steps = BODY_SCAN_STEPS[band] || BODY_SCAN_STEPS.elementary;

                  if (tl <= 0) {
                    // Next step
                    var nextStep = step + 1;
                    if (nextStep >= steps.length) {
                      // Done!
                      stopScanTimer();
                      var newSessions = (st.scanSessions || 0) + 1;
                      upd({ scanStep: -1, scanActive: false, scanSessions: newSessions });
                      if (soundEnabled) sfxComplete();
                      celebrate();
                      addToast('\uD83E\uDEC0 Body scan complete! You did great.', 'success');
                      awardXP(20);
                      tryAwardBadge('first_scan');
                      if (newSessions >= 3) tryAwardBadge('scan_3');
                      logPractice('scan', 'body_scan');
                    } else {
                      upd({ scanStep: nextStep, scanTimeLeft: steps[nextStep].seconds });
                      if (soundEnabled) sfxChime();
                    }
                  } else {
                    upd('scanTimeLeft', tl);
                  }
                }, 1000);
              },
              style: { padding: '14px 32px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
            }, '\uD83E\uDEC0 Start Body Scan')
          ),

          // Active scan
          scanStep >= 0 && currentScanStep && h('div', null,
            // Progress bar
            h('div', { style: { display: 'flex', gap: 3, marginBottom: 20 } },
              scanSteps.map(function(_, i) {
                return h('div', {
                  key: i,
                  style: { flex: 1, height: 6, borderRadius: 3, background: i < scanStep ? '#8b5cf6' : i === scanStep ? '#a78bfa' : '#334155', transition: 'background 0.3s' }
                });
              })
            ),

            // Current area
            h('div', { style: { textAlign: 'center', padding: 24, borderRadius: 16, background: '#8b5cf612', border: '1px solid #8b5cf644', marginBottom: 16 } },
              h('div', { style: { fontSize: 48, marginBottom: 8 } }, currentScanStep.emoji),
              h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 } },
                'Area ' + (scanStep + 1) + ' of ' + scanSteps.length
              ),
              h('h4', { style: { margin: '0 0 12px', color: '#f1f5f9', fontSize: 18 } }, currentScanStep.area),
              h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, margin: '0 0 16px' } }, currentScanStep.instruction),

              // Timer circle
              h('div', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: '50%', background: '#0f172a', border: '2px solid #8b5cf6' } },
                h('span', { style: { fontSize: 20, fontWeight: 800, color: '#a78bfa' } }, scanTimeLeft)
              )
            ),

            // Stop button
            h('div', { style: { textAlign: 'center' } },
              h('button', {
                onClick: function() {
                  stopScanTimer();
                  upd({ scanStep: -1, scanActive: false });
                },
                style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\u25A0 Stop Scan')
            )
          ),

          // Sessions counter
          scanSessions > 0 && scanStep === -1 && h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 12 } },
            '\uD83E\uDEC0 ' + scanSessions + ' scan' + (scanSessions !== 1 ? 's' : '') + ' completed'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: 5-4-3-2-1 Grounding ──
      // ══════════════════════════════════════════════════════════
      var groundContent = null;
      if (activeTab === 'ground') {
        groundContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83C\uDF0D Use Your Senses!' : '\uD83C\uDF0D 5-4-3-2-1 Grounding'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'When you feel worried, use your senses to come back to right here, right now!' :
            band === 'middle' ? 'Anchor yourself to the present using your five senses \u2014 a powerful anxiety reduction technique.' :
            'Sensory grounding disrupts anxious rumination by redirecting attentional resources to the present moment.'
          ),

          // Progress through senses
          groundStep < 5 && (function() {
            var sense = GROUNDING_SENSES[groundStep];
            return h('div', null,
              // Progress dots
              h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 } },
                GROUNDING_SENSES.map(function(s, i) {
                  var isDone = i < groundStep;
                  var isCurrent = i === groundStep;
                  return h('div', {
                    key: i,
                    style: {
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? s.color + '33' : isCurrent ? s.color + '22' : '#1e293b',
                      border: '2px solid ' + (isDone ? s.color : isCurrent ? s.color : '#334155'),
                      fontSize: 16, transition: 'all 0.3s'
                    }
                  }, isDone ? '\u2713' : s.emoji);
                })
              ),

              // Current sense card
              h('div', { style: { padding: 24, borderRadius: 16, background: sense.color + '10', border: '1px solid ' + sense.color + '33', marginBottom: 16, textAlign: 'center' } },
                h('div', { style: { fontSize: 48, marginBottom: 8 } }, sense.emoji),
                h('h4', { style: { margin: '0 0 4px', color: sense.color, fontSize: 20 } },
                  sense.count + ' things you can ' + sense.sense
                ),
                h('p', { style: { fontSize: 13, color: '#94a3b8', margin: '0 0 16px' } }, sense.prompt[band])
              ),

              // Input area
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
                Array.from({ length: sense.count }, function(_, i) {
                  return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { style: { fontSize: 14, color: sense.color, fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0 } }, i + 1),
                    h('input', {
                      type: 'text',
                      placeholder: sense.sense.toLowerCase() + ' #' + (i + 1) + '...',
                      value: (groundInputs[groundStep] && typeof groundInputs[groundStep] === 'object' ? groundInputs[groundStep][i] : '') || '',
                      onChange: function(e) {
                        var newInputs = groundInputs.slice();
                        if (!newInputs[groundStep] || typeof newInputs[groundStep] !== 'object') {
                          newInputs[groundStep] = {};
                        }
                        var stepInputs = Object.assign({}, newInputs[groundStep]);
                        stepInputs[i] = e.target.value;
                        newInputs[groundStep] = stepInputs;
                        upd('groundInputs', newInputs);
                      },
                      style: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit' }
                    })
                  );
                })
              ),

              // Next sense button
              h('button', {
                onClick: function() {
                  var nextStep = groundStep + 1;
                  upd('groundStep', nextStep);
                  if (soundEnabled) sfxChime();
                  awardXP(5);

                  if (nextStep >= 5) {
                    // Complete!
                    var nc = groundCompleted + 1;
                    upd('groundCompleted', nc);
                    celebrate();
                    addToast('\uD83C\uDF0D You\'re grounded! Great job using your senses.', 'success');
                    awardXP(15);
                    tryAwardBadge('grounding_done');
                    if (nc >= 3) tryAwardBadge('grounding_3');
                    logPractice('grounding', '54321');
                  }
                },
                style: { width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: sense.color, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
              }, groundStep < 4 ? 'Next Sense \u2192' : '\u2705 Complete Grounding!')
            );
          })(),

          // Completion screen
          groundStep >= 5 && h('div', { style: { textAlign: 'center', padding: 20 } },
            h('div', { style: { fontSize: 64, marginBottom: 12 } }, '\uD83C\uDF0D'),
            h('h4', { style: { color: '#22c55e', fontSize: 20, marginBottom: 8 } },
              band === 'elementary' ? 'You Did It!' : 'Grounding Complete'
            ),
            h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 20, lineHeight: 1.5 } },
              band === 'elementary' ? 'You used all 5 senses to come back to the present moment. You\'re a grounding superstar!'
              : 'You\'ve re-anchored yourself to the present moment through sensory awareness. Notice how you feel compared to before.'
            ),
            h('button', {
              onClick: function() { upd({ groundStep: 0, groundInputs: ['','','','',''] }); if (soundEnabled) sfxClick(); },
              style: { padding: '12px 24px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, '\uD83D\uDD04 Do Another Round'),
            groundCompleted > 0 && h('p', { style: { color: '#64748b', fontSize: 11, marginTop: 12 } },
              '\uD83C\uDF0D ' + groundCompleted + ' grounding exercise' + (groundCompleted !== 1 ? 's' : '') + ' completed'
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Gratitude Journal ──
      // ══════════════════════════════════════════════════════════
      var gratitudeContent = null;
      if (activeTab === 'gratitude') {
        var prompts = GRATITUDE_PROMPTS[band] || GRATITUDE_PROMPTS.elementary;

        gratitudeContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDE4F What Are You Thankful For?' : '\uD83D\uDE4F Gratitude Journal'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Write down things that make you feel thankful. Even small things count!' :
            band === 'middle' ? 'Regular gratitude practice is scientifically proven to increase happiness.' :
            'Gratitude interventions show robust effects on subjective well-being (Emmons & McCullough, 2003).'
          ),

          // Prompt inspiration
          h('div', { style: { marginBottom: 16 } },
            h('button', {
              onClick: function() {
                var idx = Math.floor(Math.random() * prompts.length);
                upd('gratPrompt', prompts[idx]);
                if (soundEnabled) sfxClick();
              },
              style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: 12, margin: '0 auto' }
            }, '\uD83D\uDCA1 Give Me a Prompt'),
            gratPrompt && h('div', { style: { marginTop: 10, padding: 14, borderRadius: 12, background: '#22c55e12', border: '1px solid #22c55e33', textAlign: 'center' } },
              h('p', { style: { fontSize: 14, color: '#e2e8f0', fontStyle: 'italic', margin: 0 } }, '"' + gratPrompt + '"')
            )
          ),

          // Writing area
          h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
            h('textarea', {
              value: gratDraft,
              onChange: function(e) { upd('gratDraft', e.target.value); },
              placeholder: band === 'elementary'
                ? 'I am thankful for...'
                : 'What are you grateful for today? Be specific — details matter.',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),

            h('div', { style: { display: 'flex', gap: 8 } },
              gratDraft.trim() && h('button', {
                onClick: function() {
                  var entry = { text: gratDraft, prompt: gratPrompt, timestamp: Date.now(), aiResp: gratAiResp };
                  var newEntries = gratEntries.concat([entry]);
                  upd({ gratEntries: newEntries, gratDraft: '', gratPrompt: null, gratAiResp: null });
                  if (soundEnabled) sfxSave();
                  addToast('\uD83D\uDE4F Gratitude saved!', 'success');
                  awardXP(10);
                  tryAwardBadge('gratitude_1');
                  if (newEntries.length >= 5) tryAwardBadge('gratitude_5');
                  if (newEntries.length >= 15) tryAwardBadge('gratitude_15');
                  logPractice('gratitude', 'journal');
                },
                style: { flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCBE Save Entry'),

              callGemini && gratDraft.trim().length > 10 && h('button', {
                onClick: function() {
                  upd('gratAiLoading', true);
                  var prompt = 'You are a warm mindfulness coach. A ' + band + ' school student wrote this gratitude entry:\n\n"' + gratDraft + '"\n\n' +
                    'In 2-3 sentences, reflect back what you notice about their gratitude. ' +
                    (band === 'elementary' ? 'Use simple, encouraging language. Help them see why this gratitude matters.' :
                     band === 'middle' ? 'Be genuine and affirming. Help them deepen the gratitude by noticing a detail they might have missed.' :
                     'Use evidence-based positive psychology language. Connect their gratitude to broader themes of well-being, meaning, or connection.') +
                    ' End with a gentle question to deepen their reflection.';
                  callGemini(prompt).then(function(resp) {
                    upd({ gratAiResp: resp, gratAiLoading: false });
                    tryAwardBadge('ai_coach');
                    if (soundEnabled) sfxChime();
                  }).catch(function() {
                    upd({ gratAiResp: 'What a thoughtful reflection! Gratitude grows stronger the more you practice it. Keep noticing the good.', gratAiLoading: false });
                  });
                },
                disabled: gratAiLoading,
                style: { flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: gratAiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }
              },
                Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                gratAiLoading ? 'Reflecting...' : 'AI Reflection'
              )
            ),

            // AI response
            gratAiResp && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 12, background: '#8b5cf618', border: '1px solid #8b5cf644' } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 6 } }, '\u2728 Mindfulness Coach'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, gratAiResp)
            )
          ),

          // Past entries
          gratEntries.length > 0 && h('div', null,
            h('p', { style: { fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 } },
              '\uD83D\uDE4F Past Gratitude (' + gratEntries.length + ')'
            ),
            gratEntries.slice().reverse().slice(0, 5).map(function(entry, i) {
              return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  h('span', { style: { fontSize: 12, fontWeight: 600, color: '#22c55e' } }, '\uD83D\uDE4F Gratitude'),
                  h('span', { style: { fontSize: 10, color: '#64748b' } }, new Date(entry.timestamp).toLocaleDateString())
                ),
                h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: 0 } },
                  entry.text.length > 150 ? entry.text.substring(0, 150) + '...' : entry.text
                ),
                entry.aiResp && h('p', { style: { fontSize: 11, color: '#a78bfa', marginTop: 6, fontStyle: 'italic' } },
                  '\u2728 ' + (entry.aiResp.length > 100 ? entry.aiResp.substring(0, 100) + '...' : entry.aiResp)
                )
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Mindful Moments ──
      // ══════════════════════════════════════════════════════════
      var momentsContent = null;
      if (activeTab === 'moments') {
        momentsContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83C\uDF3F Mindful Activities' : '\uD83C\uDF3F Mindful Moments'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Quick activities to help you feel calm and present!' :
            'Short mindfulness exercises you can do anywhere, anytime.'
          ),

          // Activity detail view
          activeActivity && (function() {
            var act = MINDFUL_ACTIVITIES.find(function(a) { return a.id === activeActivity; });
            if (!act) return null;
            var steps = act.steps[band] || act.steps.elementary;

            return h('div', null,
              h('button', {
                onClick: function() { upd({ activeActivity: null, activityStep: 0 }); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 12, marginBottom: 16 }
              }, '\u2190 All Activities'),

              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('span', { style: { fontSize: 48 } }, act.emoji),
                h('h4', { style: { margin: '8px 0 4px', color: act.color, fontSize: 20 } }, act.name),
                h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 4 } }, act.desc[band]),
                h('span', { style: { fontSize: 10, color: '#64748b' } }, act.duration)
              ),

              // Steps
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                steps.map(function(step, i) {
                  var isDone = i < activityStep;
                  var isCurrent = i === activityStep;
                  return h('div', {
                    key: i,
                    onClick: function() {
                      if (i === activityStep) {
                        upd('activityStep', activityStep + 1);
                        if (soundEnabled) sfxClick();
                        awardXP(3);
                        // Complete if last step
                        if (i === steps.length - 1) {
                          var newDone = Object.assign({}, activityDone);
                          newDone[act.id] = true;
                          upd('activityDone', newDone);
                          if (soundEnabled) sfxComplete();
                          celebrate();
                          addToast(act.emoji + ' ' + act.name + ' complete!', 'success');
                          awardXP(10);
                          var doneCount = Object.keys(newDone).length;
                          if (doneCount >= 3) tryAwardBadge('activity_3');
                          if (doneCount >= MINDFUL_ACTIVITIES.length) tryAwardBadge('activity_all');
                          logPractice('activity', act.id);
                        }
                      }
                    },
                    style: {
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12,
                      background: isCurrent ? act.color + '12' : isDone ? '#22c55e08' : '#1e293b',
                      border: '1px solid ' + (isCurrent ? act.color + '44' : isDone ? '#22c55e33' : '#334155'),
                      cursor: isCurrent ? 'pointer' : 'default', opacity: !isDone && !isCurrent ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }
                  },
                    h('div', {
                      style: {
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? '#22c55e' : isCurrent ? act.color : '#334155',
                        color: '#fff', fontSize: 12, fontWeight: 700
                      }
                    }, isDone ? '\u2713' : (i + 1)),
                    h('p', { style: { fontSize: 13, color: isDone ? '#94a3b8' : '#e2e8f0', margin: 0, lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none' } }, step)
                  );
                })
              ),

              activityStep < steps.length && h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 12 } },
                band === 'elementary' ? 'Tap each step when you\'re done with it!' : 'Click the current step to mark it complete.'
              )
            );
          })(),

          // Activity grid
          !activeActivity && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
            MINDFUL_ACTIVITIES.map(function(act) {
              var done = activityDone[act.id];
              return h('button', {
                key: act.id,
                onClick: function() { upd({ activeActivity: act.id, activityStep: 0 }); if (soundEnabled) sfxClick(); },
                style: {
                  padding: 16, borderRadius: 14, border: '1px solid ' + (done ? '#22c55e44' : '#334155'),
                  background: done ? '#22c55e08' : '#1e293b', cursor: 'pointer', textAlign: 'left'
                },
                onMouseEnter: function(e) { e.currentTarget.style.borderColor = act.color + '66'; },
                onMouseLeave: function(e) { e.currentTarget.style.borderColor = done ? '#22c55e44' : '#334155'; }
              },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                  h('span', { style: { fontSize: 28 } }, act.emoji),
                  done && h('span', { style: { fontSize: 10, color: '#22c55e', fontWeight: 700 } }, '\u2713 Done')
                ),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, act.name),
                h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.3, marginBottom: 4 } },
                  act.desc[band].length > 60 ? act.desc[band].substring(0, 60) + '...' : act.desc[band]
                ),
                h('span', { style: { fontSize: 10, color: '#64748b', padding: '2px 6px', borderRadius: 4, background: '#0f172a' } }, act.duration)
              );
            })
          ),

          // Progress
          !activeActivity && h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 16 } },
            Object.keys(activityDone).length + '/' + MINDFUL_ACTIVITIES.length + ' activities completed'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Practice Log / Stats ──
      // ══════════════════════════════════════════════════════════
      var logContent = null;
      if (activeTab === 'log') {
        var totalPractices = practiceLog.length;

        // Count by type
        var typeCounts = { breathe: 0, scan: 0, grounding: 0, gratitude: 0, activity: 0 };
        practiceLog.forEach(function(e) { if (typeCounts[e.type] !== undefined) typeCounts[e.type]++; });

        // Compute streak
        var daySet = {};
        practiceLog.forEach(function(e) { daySet[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
        var today = new Date();
        var streak = 0;
        for (var si = 0; si < 60; si++) {
          var chk = new Date(today);
          chk.setDate(chk.getDate() - si);
          if (daySet[chk.toISOString().slice(0,10)]) { streak++; } else if (si > 0) { break; }
        }

        // Calendar (last 21 days)
        var calDays = [];
        for (var ci = 20; ci >= 0; ci--) {
          var cd = new Date(today);
          cd.setDate(cd.getDate() - ci);
          var cds = cd.toISOString().slice(0,10);
          calDays.push({ date: cds, dayNum: cd.getDate(), practiced: !!daySet[cds], isToday: ci === 0 });
        }

        logContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Mindfulness Practice Log'),

          totalPractices === 0
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#64748b' } },
                h('p', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83E\uDDD8'),
                h('p', { style: { fontWeight: 600 } }, 'No practices yet'),
                h('p', { style: { fontSize: 12 } }, 'Try a breathing exercise, body scan, or grounding activity to get started!')
              )
            : h('div', null,
                // Stats row
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 } },
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#8b5cf6' } }, streak),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Day Streak')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#22c55e' } }, totalPractices),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Total Practices')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#f59e0b' } }, Object.keys(daySet).length),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Days Active')
                  )
                ),

                // Practice calendar
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 } }, '\uD83D\uDCC5 Last 21 Days'),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 } },
                    calDays.map(function(day) {
                      return h('div', {
                        key: day.date, title: day.date,
                        style: {
                          textAlign: 'center', padding: '6px 0', borderRadius: 6,
                          background: day.practiced ? '#8b5cf633' : '#0f172a',
                          border: day.isToday ? '2px solid #8b5cf6' : '1px solid ' + (day.practiced ? '#8b5cf644' : '#1e293b'),
                          fontSize: 10, color: day.practiced ? '#e2e8f0' : '#475569', fontWeight: day.isToday ? 800 : 500
                        }
                      }, day.dayNum);
                    })
                  )
                ),

                // Type breakdown
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 } }, 'Practice Types'),
                  [
                    { key: 'breathe', label: 'Breathing', emoji: '\uD83C\uDF2C\uFE0F', color: '#3b82f6' },
                    { key: 'scan', label: 'Body Scan', emoji: '\uD83E\uDEC0', color: '#8b5cf6' },
                    { key: 'grounding', label: 'Grounding', emoji: '\uD83C\uDF0D', color: '#22c55e' },
                    { key: 'gratitude', label: 'Gratitude', emoji: '\uD83D\uDE4F', color: '#f59e0b' },
                    { key: 'activity', label: 'Activities', emoji: '\uD83C\uDF3F', color: '#ec4899' }
                  ].map(function(typ) {
                    var count = typeCounts[typ.key] || 0;
                    var pct = totalPractices > 0 ? (count / totalPractices * 100) : 0;
                    return h('div', { key: typ.key, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                      h('span', { style: { fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 } }, typ.emoji),
                      h('span', { style: { fontSize: 11, color: '#94a3b8', width: 70, flexShrink: 0 } }, typ.label),
                      h('div', { style: { flex: 1, height: 12, borderRadius: 6, background: '#0f172a', overflow: 'hidden' } },
                        h('div', { style: { height: '100%', width: pct + '%', background: typ.color, borderRadius: 6, transition: 'width 0.3s', minWidth: count > 0 ? 4 : 0 } })
                      ),
                      h('span', { style: { fontSize: 11, color: '#64748b', width: 24, textAlign: 'right', flexShrink: 0 } }, count)
                    );
                  })
                ),

                // Recent practices
                h('div', null,
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Recent Practices'),
                  practiceLog.slice().reverse().slice(0, 8).map(function(entry, i) {
                    var typeLabels = { breathe: '\uD83C\uDF2C\uFE0F Breathing', scan: '\uD83E\uDEC0 Body Scan', grounding: '\uD83C\uDF0D Grounding', gratitude: '\uD83D\uDE4F Gratitude', activity: '\uD83C\uDF3F Activity' };
                    var time = new Date(entry.timestamp);
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#0f172a', marginBottom: 4 } },
                      h('span', { style: { flex: 1, fontSize: 12, color: '#e2e8f0', fontWeight: 600 } }, typeLabels[entry.type] || entry.type),
                      h('span', { style: { fontSize: 11, color: '#64748b', flexShrink: 0 } }, entry.id),
                      h('span', { style: { fontSize: 10, color: '#475569', flexShrink: 0 } }, time.toLocaleDateString())
                    );
                  })
                )
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      return h('div', { style: { minHeight: '100%' } },
        tabBar,
        badgePopup,
        breatheContent,
        scanContent,
        groundContent,
        gratitudeContent,
        momentsContent,
        logContent
      );
    }
  });
})();
