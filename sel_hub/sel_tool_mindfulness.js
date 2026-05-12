// ═══════════════════════════════════════════════════════════════
// sel_tool_mindfulness.js — Mindfulness Corner Plugin (v2.0)
// Guided breathing with animated visuals, body scan walkthrough,
// 5-4-3-2-1 grounding exercise, gratitude journal with AI coach,
// mindful moments activity library, practice log/stats,
// guided meditation scripts, mindful movement exercises,
// expanded grounding techniques, streak/log tracking.
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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-mindfulness')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-mindfulness';
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
      color: '#94a3b8',
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
  // ── Guided Meditation Scripts ──
  // ══════════════════════════════════════════════════════════════
  var MEDITATION_SCRIPTS = {
    elementary: [
      {
        id: 'cloud_watching', name: 'Cloud Watching', emoji: '\u2601\uFE0F', duration: '4 min', difficulty: 1,
        desc: 'Imagine floating on a soft, fluffy cloud high in the sky.',
        script: 'Close your eyes and take a big, deep breath. Imagine you are lying on the softest, fluffiest cloud you have ever seen. It is warm and cozy, like a giant pillow. Feel the cloud gently holding you up as you float across a bright blue sky. The sun is warm on your face, but not too hot \u2014 just right. You can hear birds singing far below. Look around \u2014 there are other clouds nearby, shaped like animals and fun things. Can you see one shaped like a bunny? How about one shaped like a star? Your cloud drifts slowly, gently rocking you like a hammock. With every breath in, your cloud floats a little higher. With every breath out, you feel more relaxed. Your arms are heavy and relaxed. Your legs are heavy and relaxed. Your whole body is calm and peaceful. Keep floating on your cloud for a little while longer. When you are ready, imagine your cloud slowly, gently floating back down to the ground. Wiggle your fingers and toes. Open your eyes. You feel calm and happy.'
      },
      {
        id: 'magic_garden', name: 'Magic Garden', emoji: '\uD83C\uDF3A', duration: '4 min', difficulty: 1,
        desc: 'Plant seeds of kindness and watch them grow in your imagination.',
        script: 'Take a deep breath and close your eyes. Imagine you have found a magical garden. The gate is sparkling with tiny lights. You push it open and step inside. The ground is soft under your feet. In your hand, you have a bag of special seeds \u2014 these are kindness seeds. You dig a small hole in the warm dirt and drop in a seed. Think of something kind you did today. As you think about it, a tiny sprout pops out of the ground! It grows into a beautiful flower, glowing with a warm light. Plant another seed. Think of someone you love. Another flower grows, even more beautiful than the first! Keep planting seeds \u2014 one for a friend, one for your family, one for yourself. Soon your garden is full of glowing, colorful flowers. Each one represents something good in your life. Take a deep breath and smell the flowers. They smell wonderful. This garden is always here for you, whenever you need it. Take one more deep breath. Wiggle your fingers. Open your eyes. You are a garden of kindness.'
      },
      {
        id: 'ocean_waves_elem', name: 'Ocean Waves', emoji: '\uD83C\uDF0A', duration: '3 min', difficulty: 1,
        desc: 'Breathe in and out with the gentle ocean waves.',
        script: 'Close your eyes and take a slow, deep breath. Imagine you are sitting on a warm, sandy beach. The sand is soft and warm between your toes. In front of you is a beautiful blue ocean. Watch the waves come in slowly toward you. As a wave comes in, breathe in slowly through your nose. As the wave goes back out, breathe out slowly through your mouth. In comes the wave, in comes your breath. Out goes the wave, out goes your breath. Feel the warm sun on your skin. Hear the seagulls calling. The waves keep coming and going, and your breathing keeps going with them. You are calm. You are peaceful. You are as steady as the ocean. Take three more breaths with the waves. One. Two. Three. Now imagine the ocean giving you a big, warm wave of happiness. It washes over you and makes you smile. Wiggle your toes in the sand. Open your eyes. You are calm and ready.'
      },
      {
        id: 'star_light', name: 'Star Light', emoji: '\u2B50', duration: '4 min', difficulty: 1,
        desc: 'A nighttime relaxation with twinkling stars.',
        script: 'Take a big breath and close your eyes. Imagine it is a beautiful, clear night. You are lying on a soft blanket in your backyard, looking up at the sky. The sky is dark and full of twinkling stars. Each star is a tiny light, blinking just for you. Pick one star and look at it. That star is sending you calm, peaceful feelings. Feel the calm travel from the star, down through the sky, and into the top of your head. It feels warm and tingly. Now the calm feeling moves down to your forehead, relaxing it. Down to your eyes, making them heavy and peaceful. Down to your cheeks and your jaw \u2014 let them go soft. The warm, starry feeling moves down your neck and into your shoulders. They drop down, relaxed. It flows down your arms to your fingertips. Down through your tummy, making it feel warm. Down through your legs, all the way to your toes. Your whole body is filled with starlight. You are glowing with calm. Rest here for a moment. When you are ready, take a deep breath. Wiggle your fingers and toes. Open your eyes. The stars are always there for you.'
      },
      {
        id: 'animal_friend', name: 'Animal Friend', emoji: '\uD83D\uDC3E', duration: '4 min', difficulty: 1,
        desc: 'Meet a gentle animal friend in your imagination.',
        script: 'Close your eyes and take three slow breaths. Imagine you are walking in a peaceful forest. The trees are tall and green. Sunlight is peeking through the leaves. The path is soft under your feet. As you walk, you hear a gentle rustling in the bushes. A friendly animal steps out! It can be any animal you like \u2014 a bunny, a deer, a puppy, a kitten, or even a baby bear. This animal is your special friend. It comes up to you and nuzzles your hand. You can feel its soft fur. It is so happy to see you. Sit down on the forest floor and let your animal friend curl up next to you. Feel its warmth against your side. Listen to it breathing slowly. Can you breathe with it? Breathe in together. Breathe out together. Your animal friend feels safe with you, and you feel safe with it. Pet your animal gently. Tell it something that is on your mind. It listens and understands. Spend a quiet moment together. When you are ready, give your animal friend a gentle hug. It will always be here in this forest, waiting for you. Take a deep breath. Wiggle your fingers. Open your eyes.'
      }
    ],
    middle: [
      {
        id: 'mountain_meditation', name: 'Mountain Meditation', emoji: '\uD83C\uDFD4\uFE0F', duration: '5 min', difficulty: 2,
        desc: 'Find your inner stability and strength like a mountain.',
        script: 'Sit comfortably and close your eyes. Take three slow, even breaths to settle in. Now picture the most magnificent mountain you can imagine. It could be snow-capped, covered in green forests, or rising red and rocky from a desert. See its wide base, firmly rooted in the earth. See its peak reaching high into the sky. This mountain has been here for millions of years. It is solid, strong, and unshakeable. Now imagine that you are this mountain. Your legs and hips are the base, rooted firmly to the ground. Your body is the solid core, strong and steady. Your head is the peak, reaching upward. Throughout the day, the weather changes around the mountain. The sun shines, clouds roll in, rain falls, wind blows, snow covers the peak, then melts away. But the mountain remains still through all of it. Like the mountain, emotions and events pass around you and through you \u2014 stress, excitement, worry, joy \u2014 but your core stays steady. You can feel the weather without becoming the weather. Take a moment to sit with this feeling of being unmovable, grounded, and strong. Three more breaths as the mountain. When you are ready, gently return your awareness to the room. Open your eyes. You carry the mountain\'s strength with you.'
      },
      {
        id: 'body_scan_express', name: 'Body Scan Express', emoji: '\uD83E\uDEC0', duration: '3 min', difficulty: 2,
        desc: 'A quick 3-minute body scan for when you need to reset fast.',
        script: 'Close your eyes. This is a quick scan, so we will move at a steady pace. Take one deep breath to start. Bring your attention to the top of your head. Notice any tension. Let it soften. Move to your forehead and eyes. Release any tightness. Soften your jaw. Let your tongue drop from the roof of your mouth. Notice your neck and shoulders. On your next exhale, let your shoulders drop an inch. Feel your arms. Let them get heavy. Let your hands relax completely \u2014 uncurl your fingers. Move to your chest. Notice your heartbeat. Take a slow breath here. Feel your stomach rise and fall. Let it be soft, not held in. Notice your lower back. If there is tension, breathe into it. Feel your hips, your thighs. Let them sink into whatever is supporting you. Move to your knees, your calves, your ankles. Finally, notice your feet. Feel the ground beneath them. Take one complete breath and scan your whole body at once from head to toes. Where is the most relaxed spot? Where is there still tension? Send one more breath to that tense spot. Open your eyes. That took about three minutes, and you have just reset your entire nervous system.'
      },
      {
        id: 'gratitude_glow', name: 'Gratitude Glow', emoji: '\u2728', duration: '4 min', difficulty: 2,
        desc: 'Focus on appreciation and feel the warmth of gratitude.',
        script: 'Close your eyes and take two settling breaths. Bring to mind one thing you are grateful for today. It can be big or small \u2014 a person, a moment, a meal, a feeling. Hold it in your mind and really see it. Notice how your body feels when you think about this thing. Is there warmth in your chest? A lightness? A smile starting to form? That is the gratitude glow. Now think of a second thing. Something about your day that went better than expected, even just slightly. Add that to the glow. Feel it getting brighter. Now think of someone who has helped you recently. Picture their face. Silently say thank you to them. Feel the glow expand. Think of one thing about yourself that you are grateful for \u2014 a quality, a talent, something you did that you are proud of. Add it to the glow. Imagine the glow filling your entire body now, from the top of your head to the tips of your toes. You are lit up with gratitude. Sit with this feeling for a few breaths. Gratitude does not ignore problems. It reminds you that good things exist alongside the hard things. Take one more deep breath. Open your eyes. Carry the glow with you.'
      },
      {
        id: 'stress_eraser', name: 'Stress Eraser', emoji: '\uD83E\uDEE7', duration: '5 min', difficulty: 2,
        desc: 'Progressive relaxation to erase tension from your body.',
        script: 'Sit or lie comfortably. Close your eyes. We are going to erase stress from your body one section at a time. Start with your hands. Make two tight fists. Squeeze them hard for five seconds. One, two, three, four, five. Now release. Feel the difference between tension and relaxation. That release is what we want. Now scrunch up your face \u2014 squeeze your eyes, scrunch your nose, clench your jaw. Hold for five seconds. One, two, three, four, five. Release. Feel everything soften. Raise your shoulders up toward your ears. Hold them tight. One, two, three, four, five. Drop them. Notice the relief. Tighten your stomach muscles like someone might poke your belly. Hold. One, two, three, four, five. Release. Let your belly be soft. Tighten both legs \u2014 flex your feet, squeeze your thighs. Hold. One, two, three, four, five. Let go completely. Now curl your toes tightly. Hold. One, two, three, four, five. Release. Your whole body has been tensed and released. Scan from head to toe \u2014 every area should feel looser, warmer, heavier. Imagine any remaining stress as a color. Watch it drain out through your feet and disappear. Take three peaceful breaths. Open your eyes. The stress has been erased.'
      },
      {
        id: 'future_self', name: 'Future Self', emoji: '\uD83D\uDD2E', duration: '5 min', difficulty: 2,
        desc: 'Visualize a positive future version of yourself.',
        script: 'Close your eyes and breathe deeply. Imagine a doorway in front of you. It is glowing with a warm, golden light. When you step through this doorway, you will meet your future self \u2014 the person you are becoming. Step through the doorway. On the other side, you see yourself one year from now. This future version of you looks confident and at peace. Notice how they stand, how they carry themselves. What are they wearing? Where are they? What does their life look like? Walk up to your future self. They smile at you \u2014 they have been expecting you. They want to tell you something important. Listen. What do they say about the challenges you are facing right now? Your future self knows you made it through. They are proof that you can handle what is happening. They might tell you to be patient, to keep going, to trust yourself, or to ask for help. Listen with your whole heart. Now ask your future self one question. Anything you want to know. Wait for the answer. It might come as words, a feeling, or an image. Thank your future self. They give you a small gift \u2014 something to remind you that this bright future is real. Hold it close. Step back through the doorway. Take a deep breath. Open your eyes. The future is something you are building every day.'
      }
    ],
    high: [
      {
        id: 'loving_kindness_hs', name: 'Loving-Kindness', emoji: '\uD83D\uDC9C', duration: '6 min', difficulty: 3,
        desc: 'Metta meditation \u2014 systematically cultivate unconditional goodwill.',
        script: 'Settle into a comfortable position. Close your eyes. Take several slow breaths, allowing each exhale to be slightly longer than the inhale. We will practice metta \u2014 loving-kindness \u2014 by directing benevolent intention in expanding circles. Begin with yourself. Place your hand on your chest if that helps you connect. Silently repeat: May I be safe. May I be healthy. May I be happy. May I live with ease. Stay with these phrases for several breaths. Notice any resistance \u2014 self-directed compassion is often the hardest. That is okay. Keep offering the words anyway. Now bring to mind someone you care about \u2014 a friend, family member, mentor. See their face clearly. Direct the phrases toward them: May you be safe. May you be healthy. May you be happy. May you live with ease. Feel the warmth of genuine care. Next, think of a neutral person \u2014 someone you neither like nor dislike. A cashier, a classmate you do not know well. Offer them the same phrases. Notice how it feels to wish well for someone you have no relationship with. This is the expansion of empathy beyond personal attachment. Now, if you are willing, bring to mind someone with whom you have difficulty. Start small \u2014 a minor irritation, not your greatest adversary. Offer the phrases. This is not about condoning behavior. It is about freeing yourself from the weight of ill will. Finally, radiate metta outward without limit \u2014 to all beings in your school, your city, your country, the entire world. May all beings everywhere be safe, healthy, happy, and live with ease. Rest in this open-hearted awareness. Notice how your body feels. Open your eyes when ready.'
      },
      {
        id: 'acceptance', name: 'Acceptance', emoji: '\uD83C\uDF3F', duration: '5 min', difficulty: 3,
        desc: 'Non-judgment practice \u2014 release the need to control experience.',
        script: 'Close your eyes. Settle your posture. Take three grounding breaths. In this meditation, we practice radical acceptance \u2014 the willingness to experience reality as it is, without trying to change it. Begin by noticing your body. Whatever sensations are present \u2014 comfort, discomfort, tension, ease \u2014 simply notice them. Do not try to fix or adjust anything. Just observe with curiosity. Say inwardly: This is what is here right now. Now notice your emotional state. Are you calm? Anxious? Bored? Frustrated? Peaceful? Whatever you find, do not judge it. There is no wrong way to feel right now. Say inwardly: This feeling is present. I do not need to push it away or hold onto it. Now notice your thoughts. They might be busy or quiet. Judgmental or neutral. Planning or remembering. Simply observe the pattern without engaging. Thoughts are mental events, not commands. Say inwardly: These are thoughts. They are not facts, and they are not me. Now expand your acceptance outward. Accept the sounds around you, the temperature, the light. Accept this moment exactly as it is, with all its imperfections. Acceptance does not mean approval. It means you stop fighting reality long enough to respond wisely instead of reactively. This is the foundation of emotional regulation. Sit with full acceptance for one more minute. When you are ready, take a deep breath and open your eyes. You have practiced one of the most powerful psychological skills there is.'
      },
      {
        id: 'observer_mind', name: 'Observer Mind', emoji: '\uD83D\uDC41\uFE0F', duration: '5 min', difficulty: 3,
        desc: 'Detach from thoughts by stepping into the role of the observer.',
        script: 'Close your eyes. Breathe normally. In this meditation, you will practice stepping back from your thoughts and becoming the observer. Imagine your mind is a movie theater. Usually, you are so absorbed in the movie that you forget you are watching one. Today, you are going to find your seat in the audience. Notice a thought arise. It might be a worry, a plan, a memory, a judgment. Instead of following it, simply label it: thinking. Do not engage. Do not analyze. Just note: thinking. And return to watching. Another thought comes. Maybe it is about this exercise. Label it: thinking. Return to watching. Now notice an emotion, if one is present. Label it without story: sadness, boredom, restlessness, contentment. You are not the emotion. You are the awareness that notices the emotion. This is what psychologists call decentering or defusion. You are creating space between stimulus and response. That space is where freedom lives. Try this: notice the thinker. Who is observing the thoughts? That awareness \u2014 steady, unchanged, always present \u2014 is what some traditions call your true self. It does not come and go like thoughts and feelings do. Rest in that awareness for a minute. You are the sky, not the weather. The screen, not the movie. The ocean, not the waves. When you are ready, take a deep breath. Open your eyes. You can access the observer at any time, in any situation. It is always available.'
      },
      {
        id: 'interconnection', name: 'Interconnection', emoji: '\uD83C\uDF10', duration: '6 min', difficulty: 3,
        desc: 'Cultivate compassion through awareness of our shared humanity.',
        script: 'Close your eyes. Settle in with three breaths. This meditation is about the web of connection that ties all living beings together. Start by noticing your own breath. This air has been breathed by countless beings before you and will be breathed by countless beings after. You are already interconnected through the most basic act of being alive. Think about the people in your immediate life \u2014 family, friends, teachers. Each of them is carrying their own hopes, fears, and struggles right now. Just like you. Silently acknowledge: just like me, they want to be happy. Just like me, they want to avoid suffering. Expand your awareness to people you do not know personally \u2014 people in your city, your country, across the world. Someone right now is laughing. Someone is crying. Someone is being born. Someone is taking their last breath. This is the full spectrum of the human experience, happening simultaneously, everywhere. You are part of this vast web. Now extend your awareness to all living things \u2014 animals, plants, ecosystems. Everything is interdependent. The food you ate today involved sunlight, soil, water, farmers, drivers, and store workers. Nothing exists in isolation. From this awareness, let compassion naturally arise. Not forced, not performative, but genuine. The recognition that we are all in this together. Say inwardly: May all beings know peace. May all beings be free from suffering. May we recognize our interconnection and act from that awareness. Sit with this expanded sense of belonging for a moment. Open your eyes when ready. You are never alone in this.'
      },
      {
        id: 'mindful_decision', name: 'Mindful Decision', emoji: '\uD83E\uDDE0', duration: '5 min', difficulty: 3,
        desc: 'Clarity meditation \u2014 approach a decision with calm awareness.',
        script: 'Close your eyes. Take five slow, deep breaths to create a foundation of calm. Think of a decision you are currently facing. It can be large or small. Hold it loosely in your mind \u2014 do not try to solve it yet. First, notice how your body responds when you think about this decision. Is there tension? Tightness? Openness? Your body often knows things before your conscious mind does. Now notice the emotions connected to this decision. Fear? Excitement? Obligation? Confusion? Name each one without judgment. They are data, not directives. Now examine the thoughts. What stories is your mind telling about each option? Are those stories based on evidence, or on assumptions and fears? Can you distinguish between what you know and what you are guessing? Imagine choosing option A. Sit with that choice for thirty seconds. How does it feel in your body? What emotion arises? Now imagine choosing option B. Sit with that choice for thirty seconds. Same questions. Which option aligns more closely with your values \u2014 not what is easiest, but what is most authentic to who you want to be? You do not need to decide right now. The goal of this meditation is not to reach an answer, but to approach the decision from a place of clarity rather than reactivity. The wisest decisions come from a calm mind, not an anxious one. Take three more breaths. Trust that clarity will come when you stop forcing it. Open your eyes.'
      }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Mindful Movement Exercises ──
  // ══════════════════════════════════════════════════════════════
  var MINDFUL_MOVEMENTS = [
    {
      id: 'mindful_walking', name: 'Mindful Walking', emoji: '\uD83D\uDEB6', duration: '3 min', color: '#3b82f6',
      desc: { elementary: 'Walk super slowly and count your steps while you breathe!', middle: 'Combine slow, intentional steps with rhythmic breathing.', high: 'Walking meditation \u2014 kinesthetic mindfulness through deliberate locomotion.' },
      steps: [
        { instruction: 'Stand up and find a space to take about 10 steps in a line.', breath: 'Take 3 deep breaths before starting.' },
        { instruction: 'Begin walking very slowly. Lift one foot, move it forward, place it down.', breath: 'Breathe in as you lift your foot.' },
        { instruction: 'Notice the feeling of your foot leaving the ground, moving through the air, and touching down.', breath: 'Breathe out as you place your foot down.' },
        { instruction: 'Continue walking, one slow step at a time. Count each step up to 10.', breath: 'Match one full breath to each step.' },
        { instruction: 'When you reach 10 steps, pause. Turn around slowly. Walk back the same way.', breath: 'Take a centering breath at the turn.' },
        { instruction: 'Do 2-3 full laps. Notice how your body feels more grounded and present.', breath: 'Let your breathing be natural and steady.' }
      ]
    },
    {
      id: 'standing_mountain', name: 'Standing Mountain', emoji: '\uD83C\uDFD4\uFE0F', duration: '2 min', color: '#8b5cf6',
      desc: { elementary: 'Stand tall like a mountain and feel strong and steady!', middle: 'A balance and breathing exercise rooted in mountain pose.', high: 'Tadasana-inspired postural awareness combined with diaphragmatic breathing.' },
      steps: [
        { instruction: 'Stand with your feet hip-width apart, arms at your sides.', breath: 'Breathe normally to start.' },
        { instruction: 'Press your feet firmly into the ground. Spread your toes wide.', breath: 'Inhale deeply as you root down.' },
        { instruction: 'Straighten your spine. Imagine a string pulling the top of your head toward the sky.', breath: 'Exhale and feel your shoulders drop.' },
        { instruction: 'Roll your shoulders back and down. Let your arms hang heavy.', breath: 'Inhale for 4 counts.' },
        { instruction: 'Close your eyes. Feel yourself standing solid like a mountain. Wind and rain cannot move you.', breath: 'Exhale for 6 counts.' },
        { instruction: 'Hold this pose for 30 seconds. Feel grounded, stable, and strong.', breath: 'Continue slow, steady breathing.' }
      ]
    },
    {
      id: 'gentle_stretching', name: 'Gentle Stretching', emoji: '\uD83E\uDDD8', duration: '4 min', color: '#22c55e',
      desc: { elementary: 'Stretch your body gently and breathe along with each stretch!', middle: 'A simple stretching sequence that pairs each stretch with a breath.', high: 'Somatic stretching sequence \u2014 mindful elongation of major muscle groups.' },
      steps: [
        { instruction: 'Stand or sit comfortably. Reach both arms overhead and stretch up tall.', breath: 'Inhale as you reach up.' },
        { instruction: 'Slowly lean to the right, stretching your left side. Hold for 3 breaths.', breath: 'Breathe into the stretch.' },
        { instruction: 'Return to center and lean to the left. Hold for 3 breaths.', breath: 'Breathe into the stretch.' },
        { instruction: 'Drop your chin to your chest. Slowly roll your head to the right, then left.', breath: 'Exhale as your chin drops, inhale as you roll.' },
        { instruction: 'Interlace your fingers behind your back. Gently lift your arms and open your chest.', breath: 'Inhale as you open your chest wide.' },
        { instruction: 'Release your arms. Roll your shoulders forward 5 times, then backward 5 times.', breath: 'Breathe smoothly throughout.' },
        { instruction: 'Shake out your hands, arms, and legs. Take a final deep breath.', breath: 'One big inhale, one long exhale.' }
      ]
    },
    {
      id: 'sun_salutation', name: 'Sun Salutation Basics', emoji: '\u2600\uFE0F', duration: '5 min', color: '#f59e0b',
      desc: { elementary: 'Say good morning to the sun with these fun moves!', middle: 'A simplified sun salutation flow linking breath to movement.', high: 'Adapted Surya Namaskar \u2014 a foundational vinyasa linking respiratory and motor rhythms.' },
      steps: [
        { instruction: 'Stand tall with palms together at your heart (Mountain Pose).', breath: 'Inhale deeply.' },
        { instruction: 'Reach your arms overhead, stretching up and slightly back (Upward Salute).', breath: 'Inhale as you reach up.' },
        { instruction: 'Fold forward at the hips, reaching toward the ground (Forward Fold).', breath: 'Exhale as you fold down.' },
        { instruction: 'Place your hands on your shins and lift halfway, flattening your back (Half Lift).', breath: 'Inhale as you lift.' },
        { instruction: 'Fold back down. Step or hop your feet back to a plank position. Hold for 3 breaths.', breath: 'Breathe steadily in plank.' },
        { instruction: 'Lower to the floor. Press up gently, opening your chest (Cobra or Low Cobra).', breath: 'Inhale as you lift your chest.' },
        { instruction: 'Press back to an inverted V shape (Downward Dog). Hold for 3 breaths.', breath: 'Breathe deeply.' },
        { instruction: 'Step your feet forward to your hands. Rise up to standing with arms overhead.', breath: 'Inhale as you rise.' },
        { instruction: 'Bring palms back to heart center. You completed one round!', breath: 'Exhale and feel centered.' }
      ]
    },
    {
      id: 'chair_stretches', name: 'Chair Stretches', emoji: '\uD83E\uDE91', duration: '3 min', color: '#ec4899',
      desc: { elementary: 'You can do these stretches right in your chair!', middle: 'Desk-friendly stretches to release tension without standing up.', high: 'Seated ergonomic stretches targeting common postural tension patterns.' },
      steps: [
        { instruction: 'Sit up tall. Place both feet flat on the floor. Roll your shoulders back.', breath: 'Take 3 settling breaths.' },
        { instruction: 'Interlace your fingers and stretch your arms straight in front of you, palms facing out.', breath: 'Inhale as you push forward, rounding your back.' },
        { instruction: 'Now reach your interlaced hands overhead. Stretch tall toward the ceiling.', breath: 'Inhale as you reach up, exhale and hold.' },
        { instruction: 'Place your right hand on your left knee. Gently twist to the left. Hold for 3 breaths.', breath: 'Exhale into the twist.' },
        { instruction: 'Repeat the twist on the other side. Left hand on right knee, twist right.', breath: 'Exhale into the twist.' },
        { instruction: 'Drop your right ear toward your right shoulder. Hold 3 breaths. Switch sides.', breath: 'Breathe into the stretch in your neck.' },
        { instruction: 'Place both hands on your knees. Round your back like a cat, then arch it. Repeat 3 times.', breath: 'Exhale to round, inhale to arch.' }
      ]
    },
    {
      id: 'pmr_exercise', name: 'Progressive Muscle Relaxation', emoji: '\uD83D\uDCAA', duration: '5 min', color: '#06b6d4',
      desc: { elementary: 'Squeeze your muscles tight, then let them go all floppy!', middle: 'Tense and release each muscle group to melt away stress.', high: 'Jacobson-style PMR \u2014 systematic isometric contraction and release for somatic stress reduction.' },
      steps: [
        { instruction: 'Sit or lie down comfortably. Close your eyes.', breath: 'Take 3 deep, slow breaths to prepare.' },
        { instruction: 'Make tight fists with both hands. Squeeze as hard as you can for 5 seconds. Then release.', breath: 'Inhale while squeezing, exhale as you release.' },
        { instruction: 'Bend your arms and flex your biceps. Hold tight for 5 seconds. Release.', breath: 'Inhale while flexing, exhale as you let go.' },
        { instruction: 'Raise your shoulders to your ears. Hold for 5 seconds. Drop them.', breath: 'Inhale as you raise, exhale as you drop.' },
        { instruction: 'Scrunch your face tightly \u2014 eyes, nose, mouth. Hold 5 seconds. Release into a blank expression.', breath: 'Inhale to scrunch, exhale to soften.' },
        { instruction: 'Tighten your stomach muscles. Hold 5 seconds. Let your belly go soft.', breath: 'Inhale to tighten, exhale to release.' },
        { instruction: 'Squeeze your legs together and flex your feet toward you. Hold 5 seconds. Release everything.', breath: 'Inhale to squeeze, exhale to let go completely.' },
        { instruction: 'Scan your whole body. Notice the difference between before and now. You are deeply relaxed.', breath: 'Take 3 final slow breaths.' }
      ]
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Grounding Techniques Library ──
  // ══════════════════════════════════════════════════════════════
  var GROUNDING_TECHNIQUES = [
    {
      id: 'box_breathing', name: 'Box Breathing', emoji: '\u2B1C', color: '#3b82f6',
      desc: { elementary: 'Breathe in a square pattern \u2014 in, hold, out, hold!', middle: 'A four-phase breathing technique used by first responders to stay calm.', high: 'Rhythmic equalizing of inhale, hold, exhale, and post-exhale pause phases.' },
      phases: [
        { label: 'Inhale', seconds: 4, icon: '\u2B06\uFE0F' },
        { label: 'Hold', seconds: 4, icon: '\u23F8\uFE0F' },
        { label: 'Exhale', seconds: 4, icon: '\u2B07\uFE0F' },
        { label: 'Hold', seconds: 4, icon: '\u23F8\uFE0F' }
      ],
      rounds: 4
    },
    {
      id: 'rain_technique', name: 'RAIN Technique', emoji: '\uD83C\uDF27\uFE0F', color: '#8b5cf6',
      desc: { elementary: 'Four steps to handle big feelings: Recognize, Allow, Investigate, Non-identify!', middle: 'A four-step process for working with difficult emotions mindfully.', high: 'RAIN \u2014 a structured mindfulness protocol for emotional processing (Brach, 2013).' },
      steps: [
        {
          letter: 'R', title: 'Recognize',
          prompt: { elementary: 'What feeling is here right now? Can you name it?', middle: 'What emotion or experience is calling for attention right now?', high: 'What is the dominant experience in this moment? Name it precisely.' },
          guidance: { elementary: 'Just notice the feeling. You might feel mad, sad, worried, or something else. Any feeling is okay!', middle: 'Pause and identify what is present. Naming an emotion reduces its intensity \u2014 this is called affect labeling.', high: 'Affect labeling activates prefrontal regulation of the amygdala. Simply naming the experience begins to shift your relationship with it.' }
        },
        {
          letter: 'A', title: 'Allow',
          prompt: { elementary: 'Can you let the feeling just be there, without pushing it away?', middle: 'Can you give this feeling permission to be here, just as it is?', high: 'Can you create space for this experience without resistance or avoidance?' },
          guidance: { elementary: 'You do not have to like the feeling. Just let it sit with you, like a cloud in the sky. It will pass.', middle: 'Allowing does not mean you approve of the feeling. It means you stop fighting it. Resistance amplifies distress.', high: 'Experiential avoidance paradoxically intensifies suffering. Willingness to contact the experience as it is reduces its hold.' }
        },
        {
          letter: 'I', title: 'Investigate',
          prompt: { elementary: 'Where do you feel it in your body? Is it big or small?', middle: 'What sensations accompany this emotion? What belief or story is behind it?', high: 'What are the somatic correlates? What core belief or schema does this emotion activate?' },
          guidance: { elementary: 'Put your hand where you feel it. Is it in your tummy? Your chest? Is it hot or cold? Tight or fluttery?', middle: 'Get curious. What triggered this? What is the worst-case story your mind is telling? Is that story actually true?', high: 'Investigate with non-judgmental curiosity. Trace the somatic signature. Identify the underlying cognitive schema without fusing with it.' }
        },
        {
          letter: 'N', title: 'Non-Identify',
          prompt: { elementary: 'Remember: you are not the feeling! You are YOU, and feelings come and go.', middle: 'This feeling is something you are experiencing. It is not who you are.', high: 'Dis-identification: you are the awareness in which this experience is arising, not the experience itself.' },
          guidance: { elementary: 'Feelings are like weather \u2014 they change! You might feel sad now, but you are not sadness. You are still you!', middle: 'Step back and see the feeling as temporary. You have felt differently before and will again. You are bigger than any single emotion.', high: 'This is cognitive defusion. The experience is real, but it does not define you. You are the context, not the content. Rest in the observing self.' }
        }
      ]
    },
    {
      id: 'butterfly_hug', name: 'Butterfly Hug', emoji: '\uD83E\uDD8B', color: '#ec4899',
      desc: { elementary: 'Cross your arms and tap your shoulders like butterfly wings!', middle: 'A bilateral stimulation technique that calms your nervous system.', high: 'Self-administered bilateral stimulation (BLS) \u2014 adapted from EMDR protocols for self-regulation.' },
      instructions: [
        { step: 1, text: 'Cross your arms over your chest so each hand rests on the opposite shoulder.', detail: 'Your arms should form an X across your chest, like you are giving yourself a hug.' },
        { step: 2, text: 'Close your eyes or look downward.', detail: 'Reducing visual input helps you focus on the bilateral rhythm.' },
        { step: 3, text: 'Gently tap your left shoulder with your right hand. Then your right shoulder with your left hand.', detail: 'Alternate sides slowly and rhythmically, like butterfly wings gently flapping.' },
        { step: 4, text: 'Continue tapping, alternating sides. Keep a slow, steady rhythm.', detail: 'Tap at a pace that feels comfortable \u2014 roughly one tap per second on each side.' },
        { step: 5, text: 'While tapping, think of a safe, calm place or simply focus on your breathing.', detail: 'The bilateral stimulation helps both hemispheres of your brain process and integrate.' },
        { step: 6, text: 'Continue for 1-2 minutes. When you feel calmer, slow the tapping and gently stop.', detail: 'Take a few deep breaths. Notice how you feel compared to when you started.' }
      ]
    },
    {
      id: 'five_senses_interactive', name: '5-4-3-2-1 Senses (Interactive)', emoji: '\uD83C\uDF0D', color: '#22c55e',
      desc: { elementary: 'Write down what you see, hear, touch, smell, and taste!', middle: 'An interactive version of the classic sensory grounding exercise.', high: 'Structured exteroceptive anchoring with written processing for enhanced engagement.' },
      senses: [
        { sense: 'See', count: 5, emoji: '\uD83D\uDC41\uFE0F', color: '#3b82f6' },
        { sense: 'Touch', count: 4, emoji: '\u270B', color: '#22c55e' },
        { sense: 'Hear', count: 3, emoji: '\uD83D\uDC42', color: '#f59e0b' },
        { sense: 'Smell', count: 2, emoji: '\uD83D\uDC43', color: '#ec4899' },
        { sense: 'Taste', count: 1, emoji: '\uD83D\uDC45', color: '#8b5cf6' }
      ]
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
    { id: 'ai_coach',         icon: '\u2728',             name: 'Inner Guide',          desc: 'Get a reflection from the AI mindfulness coach' },
    { id: 'meditation_5',     icon: '\uD83E\uDDD8\u200D\u2640\uFE0F', name: 'Meditation Master', desc: 'Complete 5 guided meditation scripts' },
    { id: 'mindful_mover',    icon: '\uD83D\uDEB6',       name: 'Mindful Mover',        desc: 'Complete 3 mindful movement exercises' },
    { id: 'streak_7_new',     icon: '\uD83D\uDD25',       name: '7-Day Streak',         desc: 'Practice mindfulness 7 days in a row' },
    { id: 'grounding_expert', icon: '\u2693',             name: 'Grounding Expert',     desc: 'Try all 4 grounding techniques' },
    { id: 'zen_master',       icon: '\uD83C\uDFAF',       name: 'Zen Master',           desc: 'Complete activities in every category' },
    { id: 'movement_all',     icon: '\uD83C\uDFC5',       name: 'Flex Champion',        desc: 'Complete all 6 movement exercises' },
    { id: 'meditation_10',    icon: '\uD83D\uDC8E',       name: 'Deep Practitioner',    desc: 'Complete 10 guided meditation scripts' }
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
    category: 'inner-work',
    cleanup: function() { stopBreathTimer(); stopScanTimer(); },
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

      // Meditation state
      var meditationIdx      = d.meditationIdx != null ? d.meditationIdx : -1;
      var meditationsDone    = d.meditationsDone || 0;
      var meditationFavs     = d.meditationFavs || {};
      var meditationPlaying  = d.meditationPlaying || false;

      // Movement state
      var movementActiveId   = d.movementActiveId || null;
      var movementStep       = d.movementStep || 0;
      var movementsDone      = d.movementsDone || {};

      // Grounding Techniques state
      var techActiveId       = d.techActiveId || null;
      var techStep           = d.techStep || 0;
      var techBoxPhase       = d.techBoxPhase || 0;
      var techBoxRound       = d.techBoxRound || 0;
      var techBoxTimer       = d.techBoxTimer || 0;
      var techBoxActive      = d.techBoxActive || false;
      var techRainStep       = d.techRainStep || 0;
      var techRainInputs     = d.techRainInputs || ['','','',''];
      var techButterflyDone  = d.techButterflyDone || false;
      var techsDone          = d.techsDone || {};

      // Streak & Log enhanced state
      var weeklyGoal         = d.weeklyGoal || 3;
      var totalMinutes       = d.totalMinutes || 0;

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
        { id: 'breathe',    label: '\uD83C\uDF2C\uFE0F Breathe' },
        { id: 'meditate',   label: '\uD83E\uDDD8 Meditate' },
        { id: 'scan',       label: '\uD83E\uDEC0 Body Scan' },
        { id: 'ground',     label: '\uD83C\uDF0D Grounding' },
        { id: 'techniques', label: '\u2693 Techniques' },
        { id: 'movement',   label: '\uD83D\uDEB6 Movement' },
        { id: 'gratitude',  label: '\uD83D\uDE4F Gratitude' },
        { id: 'moments',    label: '\uD83C\uDF3F Moments' },
        { id: 'log',        label: '\uD83D\uDCCA Log' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Mindfulness tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', { 'aria-label': tab.label,
            key: tab.id,
            role: 'tab', 'aria-selected': isActive,
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
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          title: soundEnabled ? 'Mute sounds' : 'Enable sounds',
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#8b5cf633' : 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
        }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length)
      );

      // ══════════════════════════════════════════════════════════
      // ── Topic-accent hero band per tab ──
      // ══════════════════════════════════════════════════════════
      var heroBand = (function() {
        var TAB_META = {
          breathe:    { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', icon: '\uD83C\uDF2C', title: 'Breathe \u2014 the slowest lever you have',                  hint: 'Slow + diaphragmatic breathing flips the parasympathetic switch in seconds. Box breathing (4-4-4-4) is what Navy SEALs use under fire. The ratio matters more than the count: longer exhale than inhale tells the vagus nerve \u201Csafe.\u201D' },
          meditate:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.14)', icon: '\uD83E\uDDD8', title: 'Meditate \u2014 attention training, not emptying',         hint: 'The skill isn\u2019t a quiet mind \u2014 it\u2019s noticing when you\u2019ve drifted and returning gently. 10-12 minutes/day for 8 weeks shows measurable structural changes (Hölzel 2011 fMRI of MBSR participants).' },
          scan:       { accent: '#ec4899', soft: 'rgba(236,72,153,0.14)', icon: '\uD83E\uDEC0', title: 'Body Scan \u2014 sweep attention head-to-toe',             hint: 'Noticing without changing. Tension you didn\u2019t know was there comes up first; just observing it often releases it. Foundational practice in MBSR (Kabat-Zinn 1979) and now in trauma-informed therapy.' },
          ground:     { accent: '#16a34a', soft: 'rgba(22,163,74,0.14)',  icon: '\uD83C\uDF0D', title: 'Grounding \u2014 5-4-3-2-1 senses',                          hint: '5 things you see, 4 hear, 3 touch, 2 smell, 1 taste. Pulls anxious attention out of the future + past and into the present sensory reality. The fastest research-backed way to shorten a panic spiral.' },
          techniques: { accent: '#0891b2', soft: 'rgba(8,145,178,0.14)',  icon: '\u2693',         title: 'Techniques \u2014 the toolkit beyond breathing',         hint: 'Loving-kindness (metta), open monitoring, focused attention, walking meditation, RAIN (recognize / allow / investigate / nurture). Different practices target different states; matching technique to need is the skill.' },
          movement:   { accent: '#f59e0b', soft: 'rgba(245,158,11,0.14)', icon: '\uD83D\uDEB6', title: 'Movement \u2014 mindfulness for non-sitters',              hint: 'Walking meditation, gentle yoga, qigong, simple stretches \u2014 same brain effects, less still. ADHD + anxious bodies often regulate BETTER while moving than seated. \u201CYou don\u2019t have to sit cross-legged\u201D is liberating to many.' },
          gratitude:  { accent: '#d97706', soft: 'rgba(217,119,6,0.14)',  icon: '\uD83D\uDE4F', title: 'Gratitude \u2014 attention training with a twist',         hint: 'Emmons + McCullough 2003: 3-times-a-week gratitude journaling \u2192 measurable mood + sleep + relationship gains in 10 weeks. Specifics work better than \u201CI\u2019m grateful for my family\u201D \u2014 name the moment, the gesture, the why.' },
          moments:    { accent: '#7c3aed', soft: 'rgba(124,58,237,0.14)', icon: '\uD83C\uDF3F', title: 'Moments \u2014 micro-mindfulness in the day',              hint: 'Bell rings? Breathe. Door opens? Notice the air. STOP technique: Stop / Take a breath / Observe / Proceed. 30-second resets, ten times a day, beat one 30-minute session most weeks. Frequency wins.' },
          log:        { accent: '#475569', soft: 'rgba(71,85,105,0.14)',  icon: '\uD83D\uDCCA', title: 'Log \u2014 streaks + what worked',                          hint: 'What you measured shows up; what you didn\u2019t fades. Track which practices actually helped, on which days, in which moods. Builds your personalized toolkit \u2014 not the one a book or app prescribed.' }
        };
        var meta = TAB_META[activeTab] || TAB_META.breathe;
        return h('div', {
          style: {
            margin: '8px 12px 12px',
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
            h('p', { style: { margin: '3px 0 0', color: '#cbd5e1', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })();

      // ══════════════════════════════════════════════════════════
      // ── Badge Popup ──
      // ══════════════════════════════════════════════════════════
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', {             style: { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' },
            onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', {               style: { background: 'linear-gradient(135deg, #0c1631 0%, #1e293b 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid #8b5cf6', maxWidth: 320 },
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
                return h('div', {                   key: badge.id, title: badge.name + ': ' + badge.desc,
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#0c1631' : '#1e293b', border: '1px solid ' + (earned ? '#8b5cf6' : '#334155'), opacity: earned ? 1 : 0.4 }
                },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, badge.icon),
                  h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#e2e8f0' : '#94a3b8' } }, badge.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, badge.desc)
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
              return h('button', { 'aria-label': pat.emoji,
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
            h('p', { style: { fontSize: 10, color: '#94a3b8', margin: '6px 0 0' } },
              'In ' + bp.inhale + 's' + (bp.hold ? ' \u2022 Hold ' + bp.hold + 's' : '') + ' \u2022 Out ' + bp.exhale + 's' + (bp.holdOut ? ' \u2022 Rest ' + bp.holdOut + 's' : '') + ' \u2022 ' + bp.cycles + ' cycles'
            )
          ),

          // Start button
          !breathActive && h('button', { 'aria-label': st.breathPatternsUsed || {},
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
            h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 16 } },
              'Cycle ' + breathCycle + ' of ' + bp.cycles + ' \u2022 ' + bp.name
            ),

            // Stop button
            h('button', { 'aria-label': 'Stop',
              onClick: function() {
                stopBreathTimer();
                upd({ breathActive: false, breathPhase: null });
              },
              style: { padding: '10px 24px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
            }, '\u25A0 Stop')
          ),

          // Sessions counter
          breathSessions > 0 && !breathActive && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
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
            h('p', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 20 } },
              scanSteps.length + ' body areas \u2022 ~' + Math.round(scanSteps.reduce(function(s,st) { return s + st.seconds; }, 0) / 60) + ' minutes'
            ),
            h('button', { 'aria-label': 'Toggle sound',
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
              h('button', { 'aria-label': 'Stop Scan',
                onClick: function() {
                  stopScanTimer();
                  upd({ scanStep: -1, scanActive: false });
                },
                style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\u25A0 Stop Scan')
            )
          ),

          // Sessions counter
          scanSessions > 0 && scanStep === -1 && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
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
                      'aria-label': sense.sense + ' item ' + (i + 1),
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
              h('button', { 'aria-label': 'Next sense button',
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
            h('button', { 'aria-label': 'Do Another Round',
              onClick: function() { upd({ groundStep: 0, groundInputs: ['','','','',''] }); if (soundEnabled) sfxClick(); },
              style: { padding: '12px 24px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, '\uD83D\uDD04 Do Another Round'),
            groundCompleted > 0 && h('p', { style: { color: '#94a3b8', fontSize: 11, marginTop: 12 } },
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
            h('button', { 'aria-label': 'Give Me a Prompt',
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
              'aria-label': 'Gratitude journal entry',
              onChange: function(e) { upd('gratDraft', e.target.value); },
              placeholder: band === 'elementary'
                ? 'I am thankful for...'
                : 'What are you grateful for today? Be specific — details matter.',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),

            h('div', { style: { display: 'flex', gap: 8 } },
              gratDraft.trim() && h('button', { 'aria-label': 'Save Entry',
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

              callGemini && gratDraft.trim().length > 10 && h('button', { 'aria-label': 'Toggle sound',
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
                  h('span', { style: { fontSize: 10, color: '#94a3b8' } }, new Date(entry.timestamp).toLocaleDateString())
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
              h('button', { 'aria-label': 'All Activities',
                onClick: function() { upd({ activeActivity: null, activityStep: 0 }); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 12, marginBottom: 16 }
              }, '\u2190 All Activities'),

              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('span', { style: { fontSize: 48 } }, act.emoji),
                h('h4', { style: { margin: '8px 0 4px', color: act.color, fontSize: 20 } }, act.name),
                h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 4 } }, act.desc[band]),
                h('span', { style: { fontSize: 10, color: '#94a3b8' } }, act.duration)
              ),

              // Steps
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                steps.map(function(step, i) {
                  var isDone = i < activityStep;
                  var isCurrent = i === activityStep;
                  return h('div', {                     key: i,
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

              activityStep < steps.length && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
                band === 'elementary' ? 'Tap each step when you\'re done with it!' : 'Click the current step to mark it complete.'
              )
            );
          })(),

          // Activity grid
          !activeActivity && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
            MINDFUL_ACTIVITIES.map(function(act) {
              var done = activityDone[act.id];
              return h('button', { 'aria-label': act.emoji,
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
                h('span', { style: { fontSize: 10, color: '#94a3b8', padding: '2px 6px', borderRadius: 4, background: '#0f172a' } }, act.duration)
              );
            })
          ),

          // Progress
          !activeActivity && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 16 } },
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

        // Count by type (expanded)
        var typeCounts = { breathe: 0, scan: 0, grounding: 0, gratitude: 0, activity: 0, meditation: 0, movement: 0, technique: 0 };
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

        // Weekly practice count (current week)
        var weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        var weekPractices = 0;
        practiceLog.forEach(function(e) { if (e.timestamp >= weekStart.getTime()) weekPractices++; });
        var weekDaysActive = {};
        practiceLog.forEach(function(e) { if (e.timestamp >= weekStart.getTime()) weekDaysActive[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
        var weekDays = Object.keys(weekDaysActive).length;

        // Calendar (last 28 days for 4 full weeks)
        var calDays = [];
        for (var ci = 27; ci >= 0; ci--) {
          var cd = new Date(today);
          cd.setDate(cd.getDate() - ci);
          var cds = cd.toISOString().slice(0,10);
          calDays.push({ date: cds, dayNum: cd.getDate(), practiced: !!daySet[cds], isToday: ci === 0 });
        }
        // Day labels
        var dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        logContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Mindfulness Practice Log'),

          totalPractices === 0
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#94a3b8' } },
                h('p', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83E\uDDD8'),
                h('p', { style: { fontWeight: 600 } }, 'No practices yet'),
                h('p', { style: { fontSize: 12 } }, 'Try a breathing exercise, body scan, or grounding activity to get started!')
              )
            : h('div', null,
                // Stats row (4 columns now)
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 } },
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 22, fontWeight: 800, color: '#8b5cf6' } }, streak),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Day Streak')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 22, fontWeight: 800, color: '#22c55e' } }, totalPractices),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Total Practices')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 22, fontWeight: 800, color: '#f59e0b' } }, totalMinutes),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Est. Minutes')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 22, fontWeight: 800, color: '#ec4899' } }, Object.keys(daySet).length),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Days Active')
                  )
                ),

                // Weekly Goal Tracker
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                    h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: 0 } }, '\uD83C\uDFAF Weekly Goal'),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Goal:'),
                      h('select', {
                        value: weeklyGoal,
                        'aria-label': 'Weekly mindfulness goal in minutes',
                        onChange: function(e) { upd('weeklyGoal', parseInt(e.target.value) || 3); },
                        style: { padding: '2px 6px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 11 }
                      },
                        [1,2,3,4,5,6,7].map(function(n) {
                          return h('option', { key: n, value: n }, n + ' day' + (n > 1 ? 's' : ''));
                        })
                      )
                    )
                  ),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('div', { style: { flex: 1, height: 16, borderRadius: 8, background: '#0f172a', overflow: 'hidden' } },
                      h('div', { style: {
                        height: '100%', width: Math.min(100, (weekDays / weeklyGoal * 100)) + '%',
                        background: weekDays >= weeklyGoal ? '#22c55e' : '#8b5cf6',
                        borderRadius: 8, transition: 'width 0.3s'
                      } })
                    ),
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: weekDays >= weeklyGoal ? '#22c55e' : '#94a3b8', flexShrink: 0 } },
                      weekDays + '/' + weeklyGoal
                    )
                  ),
                  weekDays >= weeklyGoal && h('p', { style: { fontSize: 11, color: '#22c55e', marginTop: 6, textAlign: 'center', fontWeight: 600 } },
                    '\u2705 Weekly goal reached! Great job staying consistent.'
                  )
                ),

                // Practice calendar (28 days with day labels)
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 } }, '\uD83D\uDCC5 Last 28 Days'),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 } },
                    dayLabels.map(function(lbl, i) {
                      return h('div', { key: 'lbl' + i, style: { textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: 700, padding: '2px 0' } }, lbl);
                    })
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 } },
                    calDays.map(function(day) {
                      return h('div', {
                        key: day.date, title: day.date,
                        style: {
                          textAlign: 'center', padding: '5px 0', borderRadius: 6,
                          background: day.practiced ? '#8b5cf633' : '#0f172a',
                          border: day.isToday ? '2px solid #8b5cf6' : '1px solid ' + (day.practiced ? '#8b5cf644' : '#1e293b'),
                          fontSize: 10, color: day.practiced ? '#e2e8f0' : '#475569', fontWeight: day.isToday ? 800 : 500
                        }
                      }, day.dayNum);
                    })
                  )
                ),

                // Type breakdown (expanded)
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 } }, 'Practice Types'),
                  [
                    { key: 'breathe', label: 'Breathing', emoji: '\uD83C\uDF2C\uFE0F', color: '#3b82f6' },
                    { key: 'meditation', label: 'Meditation', emoji: '\uD83E\uDDD8', color: '#a78bfa' },
                    { key: 'scan', label: 'Body Scan', emoji: '\uD83E\uDEC0', color: '#8b5cf6' },
                    { key: 'grounding', label: 'Grounding', emoji: '\uD83C\uDF0D', color: '#22c55e' },
                    { key: 'technique', label: 'Techniques', emoji: '\u2693', color: '#06b6d4' },
                    { key: 'movement', label: 'Movement', emoji: '\uD83D\uDEB6', color: '#f97316' },
                    { key: 'gratitude', label: 'Gratitude', emoji: '\uD83D\uDE4F', color: '#f59e0b' },
                    { key: 'activity', label: 'Activities', emoji: '\uD83C\uDF3F', color: '#ec4899' }
                  ].map(function(typ) {
                    var count = typeCounts[typ.key] || 0;
                    var pct = totalPractices > 0 ? (count / totalPractices * 100) : 0;
                    return h('div', { key: typ.key, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                      h('span', { style: { fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 } }, typ.emoji),
                      h('span', { style: { fontSize: 10, color: '#94a3b8', width: 68, flexShrink: 0 } }, typ.label),
                      h('div', { style: { flex: 1, height: 10, borderRadius: 5, background: '#0f172a', overflow: 'hidden' } },
                        h('div', { style: { height: '100%', width: pct + '%', background: typ.color, borderRadius: 5, transition: 'width 0.3s', minWidth: count > 0 ? 4 : 0 } })
                      ),
                      h('span', { style: { fontSize: 10, color: '#94a3b8', width: 20, textAlign: 'right', flexShrink: 0 } }, count)
                    );
                  })
                ),

                // Recent practices
                h('div', null,
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Recent Practices'),
                  practiceLog.slice().reverse().slice(0, 10).map(function(entry, i) {
                    var typeLabels = { breathe: '\uD83C\uDF2C\uFE0F Breathing', scan: '\uD83E\uDEC0 Body Scan', grounding: '\uD83C\uDF0D Grounding', gratitude: '\uD83D\uDE4F Gratitude', activity: '\uD83C\uDF3F Activity', meditation: '\uD83E\uDDD8 Meditation', movement: '\uD83D\uDEB6 Movement', technique: '\u2693 Technique' };
                    var time = new Date(entry.timestamp);
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#0f172a', marginBottom: 4 } },
                      h('span', { style: { flex: 1, fontSize: 12, color: '#e2e8f0', fontWeight: 600 } }, typeLabels[entry.type] || entry.type),
                      h('span', { style: { fontSize: 11, color: '#94a3b8', flexShrink: 0 } }, entry.id),
                      h('span', { style: { fontSize: 10, color: '#475569', flexShrink: 0 } }, time.toLocaleDateString())
                    );
                  })
                )
              ),

          // ── Print my practice log (take-home artifact) ──
          totalPractices > 0 ? h('div', { style: { marginTop: 16, textAlign: 'center' } },
            h('button', {
              'aria-label': 'Print my mindfulness practice log',
              onClick: function() {
                if (!window.SelHub || !window.SelHub.printDoc) return;
                var typeLabels = { breathe: 'Breathing', scan: 'Body scan', grounding: 'Grounding', gratitude: 'Gratitude', activity: 'Mindful activity', meditation: 'Meditation', movement: 'Mindful movement', technique: 'Technique' };
                var byTypeItems = Object.keys(typeCounts).filter(function(k) { return typeCounts[k] > 0; }).map(function(k) {
                  return (typeLabels[k] || k) + ': ' + typeCounts[k] + ' session' + (typeCounts[k] === 1 ? '' : 's');
                });
                var recent = practiceLog.slice().reverse().slice(0, 20).map(function(e) {
                  var d = new Date(e.timestamp);
                  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — ' + (typeLabels[e.type] || e.type) + (e.id ? ' (' + e.id + ')' : '');
                });
                window.SelHub.printDoc({
                  title: 'My Mindfulness Practice Log',
                  subtitle: 'Bring this to a counselor, parent, or coach to talk through what is helping.',
                  sections: [
                    { heading: 'Totals', items: [
                      'Total sessions: ' + totalPractices,
                      'Current daily streak: ' + streak + ' day' + (streak === 1 ? '' : 's'),
                      'This week: ' + weekPractices + ' session' + (weekPractices === 1 ? '' : 's') + ' across ' + weekDays + ' day' + (weekDays === 1 ? '' : 's')
                    ] },
                    { heading: 'Practice mix', items: byTypeItems },
                    { heading: 'Recent sessions (latest 20)', items: recent }
                  ]
                });
              },
              style: { padding: '8px 18px', borderRadius: 10, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, '🖨 Print my practice log')
          ) : null
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Guided Meditation Scripts ──
      // ══════════════════════════════════════════════════════════
      var meditateContent = null;
      if (activeTab === 'meditate') {
        var scripts = MEDITATION_SCRIPTS[band] || MEDITATION_SCRIPTS.elementary;

        meditateContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83E\uDDD8 Guided Meditations' : '\uD83E\uDDD8 Meditation Scripts'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Choose a meditation and listen to the story. Close your eyes and relax!' :
            band === 'middle' ? 'Select a guided meditation. Follow along with the text or use the read-aloud button.' :
            'Evidence-based guided meditation scripts. Use TTS read-aloud or follow the text at your own pace.'
          ),

          // Script list view
          meditationIdx === -1 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            scripts.map(function(script, i) {
              var isFav = !!meditationFavs[script.id];
              return h('div', Object.assign({
                key: script.id,
                'aria-label': 'Open meditation: ' + script.name,
                style: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }
              }, a11yClick(function() { upd('meditationIdx', i); if (soundEnabled) sfxClick(); })),
                h('div', { style: { fontSize: 32, flexShrink: 0 } }, script.emoji),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, script.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4 } }, script.desc),
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 6 } },
                    h('span', { style: { fontSize: 10, color: '#94a3b8', padding: '2px 6px', borderRadius: 4, background: '#0f172a' } }, '\u23F1 ' + script.duration),
                    h('span', { style: { fontSize: 10, color: '#94a3b8', padding: '2px 6px', borderRadius: 4, background: '#0f172a' } },
                      'Difficulty: ' + Array.from({ length: script.difficulty }, function() { return '\u2B50'; }).join('')
                    )
                  )
                ),
                h('button', { 'aria-label': 'Toggle sound',
                  onClick: function(e) {
                    e.stopPropagation();
                    var newFavs = Object.assign({}, meditationFavs);
                    if (newFavs[script.id]) { delete newFavs[script.id]; } else { newFavs[script.id] = true; }
                    upd('meditationFavs', newFavs);
                    if (soundEnabled) sfxClick();
                  },
                  title: isFav ? 'Remove from favorites' : 'Add to favorites',
                  style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, flexShrink: 0, padding: 4 }
                }, isFav ? '\u2764\uFE0F' : '\uD83E\uDD0D')
              );
            }),

            // Show favorites section
            Object.keys(meditationFavs).length > 0 && h('div', { style: { marginTop: 12, padding: 12, borderRadius: 12, background: '#8b5cf612', border: '1px solid #8b5cf633' } },
              h('p', { style: { fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 } }, '\u2764\uFE0F Favorites'),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                scripts.filter(function(s) { return meditationFavs[s.id]; }).map(function(s) {
                  return h('span', { key: s.id, style: { fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#8b5cf622', color: '#e2e8f0', border: '1px solid #8b5cf644' } }, s.emoji + ' ' + s.name);
                })
              )
            ),

            // Stats
            meditationsDone > 0 && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
              '\uD83E\uDDD8 ' + meditationsDone + ' meditation' + (meditationsDone !== 1 ? 's' : '') + ' completed'
            )
          ),

          // Script detail / reading view
          meditationIdx >= 0 && meditationIdx < scripts.length && (function() {
            var sc = scripts[meditationIdx];
            return h('div', null,
              h('button', { 'aria-label': 'All Scripts',
                onClick: function() { upd({ meditationIdx: -1, meditationPlaying: false }); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 12, marginBottom: 16 }
              }, '\u2190 All Scripts'),

              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('div', { style: { fontSize: 48 } }, sc.emoji),
                h('h4', { style: { margin: '8px 0 4px', color: '#f1f5f9', fontSize: 20 } }, sc.name),
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 10, color: '#94a3b8', padding: '2px 8px', borderRadius: 4, background: '#0f172a' } }, '\u23F1 ' + sc.duration),
                  h('span', { style: { fontSize: 10, color: '#94a3b8', padding: '2px 8px', borderRadius: 4, background: '#0f172a' } },
                    'Difficulty: ' + Array.from({ length: sc.difficulty }, function() { return '\u2B50'; }).join('')
                  )
                )
              ),

              // Script text
              h('div', { style: { padding: 20, borderRadius: 16, background: '#0f172a', border: '1px solid #334155', marginBottom: 16, lineHeight: 1.8 } },
                h('p', { style: { fontSize: 14, color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap' } }, sc.script)
              ),

              // Action buttons
              h('div', { style: { display: 'flex', gap: 8 } },
                callTTS && h('button', { 'aria-label': meditationPlaying ? '\uD83D\uDD0A Reading...' : '\uD83D\uDD0A Read Aloud',
                  onClick: function() {
                    upd('meditationPlaying', true);
                    callTTS(sc.script);
                    setTimeout(function() { upd('meditationPlaying', false); }, 5000);
                  },
                  style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
                }, meditationPlaying ? '\uD83D\uDD0A Reading...' : '\uD83D\uDD0A Read Aloud'),

                h('button', { 'aria-label': 'Mark Complete',
                  onClick: function() {
                    var newDone = meditationsDone + 1;
                    upd('meditationsDone', newDone);
                    // Estimate minutes from duration string
                    var mins = parseInt(sc.duration) || 4;
                    upd('totalMinutes', totalMinutes + mins);
                    if (soundEnabled) sfxComplete();
                    celebrate();
                    addToast(sc.emoji + ' Meditation complete: ' + sc.name + '!', 'success');
                    awardXP(20);
                    if (newDone >= 5) tryAwardBadge('meditation_5');
                    if (newDone >= 10) tryAwardBadge('meditation_10');
                    logPractice('meditation', sc.id);
                    // Check zen master
                    var st2 = (ctx.toolData && ctx.toolData.mindfulness) || {};
                    if ((st2.breathSessions || 0) > 0 && (st2.scanSessions || 0) > 0 && (st2.groundCompleted || 0) > 0 && newDone > 0 && Object.keys(st2.movementsDone || {}).length > 0 && Object.keys(st2.techsDone || {}).length > 0) {
                      tryAwardBadge('zen_master');
                    }
                  },
                  style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                }, '\u2705 Mark Complete')
              ),

              // Favorite toggle
              h('div', { style: { textAlign: 'center', marginTop: 12 } },
                h('button', { 'aria-label': 'Toggle sound',
                  onClick: function() {
                    var newFavs = Object.assign({}, meditationFavs);
                    if (newFavs[sc.id]) { delete newFavs[sc.id]; } else { newFavs[sc.id] = true; }
                    upd('meditationFavs', newFavs);
                    if (soundEnabled) sfxClick();
                  },
                  style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: meditationFavs[sc.id] ? '#ef4444' : '#94a3b8', cursor: 'pointer', fontSize: 13 }
                }, meditationFavs[sc.id] ? '\u2764\uFE0F Favorited' : '\uD83E\uDD0D Add to Favorites')
              )
            );
          })()
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Mindful Movement ──
      // ══════════════════════════════════════════════════════════
      var movementContent = null;
      if (activeTab === 'movement') {
        movementContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDEB6 Move Your Body Mindfully!' : '\uD83D\uDEB6 Mindful Movement'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Gentle exercises that combine moving with breathing. Fun and calming!' :
            band === 'middle' ? 'Simple exercises that combine physical movement with mindful breathing.' :
            'Somatic mindfulness \u2014 integrating kinesthetic awareness with respiratory entrainment.'
          ),

          // Exercise detail view
          movementActiveId && (function() {
            var ex = MINDFUL_MOVEMENTS.find(function(m) { return m.id === movementActiveId; });
            if (!ex) return null;
            var steps = ex.steps;
            var isDone = !!movementsDone[ex.id];

            return h('div', null,
              h('button', { 'aria-label': 'All Exercises',
                onClick: function() { upd({ movementActiveId: null, movementStep: 0 }); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 12, marginBottom: 16 }
              }, '\u2190 All Exercises'),

              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('div', { style: { fontSize: 48 } }, ex.emoji),
                h('h4', { style: { margin: '8px 0 4px', color: ex.color, fontSize: 20 } }, ex.name),
                h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 4 } }, ex.desc[band]),
                h('span', { style: { fontSize: 10, color: '#94a3b8' } }, '\u23F1 ' + ex.duration)
              ),

              // Steps with breathing cues
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                steps.map(function(step, i) {
                  var isStepDone = i < movementStep;
                  var isCurrent = i === movementStep;
                  return h('div', {                     key: i,
                    onClick: function() {
                      if (i === movementStep) {
                        var nextStep = movementStep + 1;
                        upd('movementStep', nextStep);
                        if (soundEnabled) sfxClick();
                        awardXP(3);
                        if (nextStep >= steps.length) {
                          var newDone = Object.assign({}, movementsDone);
                          newDone[ex.id] = true;
                          upd('movementsDone', newDone);
                          var mins = parseInt(ex.duration) || 3;
                          upd('totalMinutes', totalMinutes + mins);
                          if (soundEnabled) sfxComplete();
                          celebrate();
                          addToast(ex.emoji + ' ' + ex.name + ' complete!', 'success');
                          awardXP(15);
                          var doneCount = Object.keys(newDone).length;
                          if (doneCount >= 3) tryAwardBadge('mindful_mover');
                          if (doneCount >= MINDFUL_MOVEMENTS.length) tryAwardBadge('movement_all');
                          logPractice('movement', ex.id);
                        }
                      }
                    },
                    style: {
                      padding: 14, borderRadius: 12,
                      background: isCurrent ? ex.color + '12' : isStepDone ? '#22c55e08' : '#1e293b',
                      border: '1px solid ' + (isCurrent ? ex.color + '44' : isStepDone ? '#22c55e33' : '#334155'),
                      cursor: isCurrent ? 'pointer' : 'default', opacity: !isStepDone && !isCurrent ? 0.5 : 1
                    }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
                      h('div', {
                        style: {
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isStepDone ? '#22c55e' : isCurrent ? ex.color : '#334155',
                          color: '#fff', fontSize: 11, fontWeight: 700
                        }
                      }, isStepDone ? '\u2713' : (i + 1)),
                      h('div', { style: { flex: 1 } },
                        h('p', { style: { fontSize: 13, color: isStepDone ? '#94a3b8' : '#e2e8f0', margin: '0 0 4px', lineHeight: 1.5 } }, step.instruction),
                        h('p', { style: { fontSize: 11, color: ex.color, margin: 0, fontStyle: 'italic' } }, '\uD83C\uDF2C\uFE0F ' + step.breath)
                      )
                    )
                  );
                })
              ),

              movementStep < steps.length && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
                'Tap the current step when you have completed it.'
              )
            );
          })(),

          // Exercise grid
          !movementActiveId && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
            MINDFUL_MOVEMENTS.map(function(ex) {
              var done = movementsDone[ex.id];
              return h('button', { 'aria-label': ex.emoji,
                key: ex.id,
                onClick: function() { upd({ movementActiveId: ex.id, movementStep: 0 }); if (soundEnabled) sfxClick(); },
                style: {
                  padding: 16, borderRadius: 14, border: '1px solid ' + (done ? '#22c55e44' : '#334155'),
                  background: done ? '#22c55e08' : '#1e293b', cursor: 'pointer', textAlign: 'left'
                }
              },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                  h('span', { style: { fontSize: 28 } }, ex.emoji),
                  done && h('span', { style: { fontSize: 10, color: '#22c55e', fontWeight: 700 } }, '\u2713 Done')
                ),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, ex.name),
                h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.3, marginBottom: 4 } },
                  ex.desc[band].length > 55 ? ex.desc[band].substring(0, 55) + '...' : ex.desc[band]
                ),
                h('span', { style: { fontSize: 10, color: '#94a3b8', padding: '2px 6px', borderRadius: 4, background: '#0f172a' } }, '\u23F1 ' + ex.duration)
              );
            })
          ),

          !movementActiveId && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 16 } },
            Object.keys(movementsDone).length + '/' + MINDFUL_MOVEMENTS.length + ' exercises completed'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Grounding Techniques Library ──
      // ══════════════════════════════════════════════════════════
      var techniquesContent = null;
      if (activeTab === 'techniques') {
        techniquesContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\u2693 Grounding Toolkit' : '\u2693 Grounding Techniques'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Extra tools to help you feel calm and safe when big feelings come!' :
            band === 'middle' ? 'Advanced grounding techniques for managing stress and anxiety.' :
            'Empirically-supported grounding interventions for acute stress and emotional dysregulation.'
          ),

          // Technique detail view
          techActiveId && (function() {
            var tech = GROUNDING_TECHNIQUES.find(function(t) { return t.id === techActiveId; });
            if (!tech) return null;

            var backBtn = h('button', { 'aria-label': 'All Techniques',
              onClick: function() { upd({ techActiveId: null, techStep: 0, techBoxActive: false, techBoxPhase: 0, techBoxRound: 0, techRainStep: 0, techRainInputs: ['','','',''], techButterflyDone: false }); if (soundEnabled) sfxClick(); },
              style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 12, marginBottom: 16 }
            }, '\u2190 All Techniques');

            // ── Box Breathing Technique ──
            if (tech.id === 'box_breathing') {
              var phases = tech.phases;
              var currentPhase = phases[techBoxPhase % phases.length];
              var phaseLabels = ['\u2B06\uFE0F Inhale', '\u23F8\uFE0F Hold', '\u2B07\uFE0F Exhale', '\u23F8\uFE0F Hold'];
              // Box visual corners
              var boxSide = techBoxPhase % 4;

              return h('div', null,
                backBtn,
                h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                  h('div', { style: { fontSize: 48 } }, tech.emoji),
                  h('h4', { style: { margin: '8px 0 4px', color: tech.color, fontSize: 20 } }, tech.name),
                  h('p', { style: { fontSize: 12, color: '#94a3b8' } }, tech.desc[band])
                ),

                // Box visual
                !techBoxActive && h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                  h('div', { style: { display: 'inline-block', width: 160, height: 160, border: '3px solid #3b82f6', borderRadius: 8, position: 'relative', background: '#0f172a' } },
                    h('div', { style: { position: 'absolute', top: 8, left: 12, fontSize: 10, color: '#3b82f6', fontWeight: 700 } }, '\u2B06\uFE0F Inhale 4s'),
                    h('div', { style: { position: 'absolute', top: 8, right: 12, fontSize: 10, color: '#8b5cf6', fontWeight: 700 } }, '\u23F8\uFE0F Hold 4s'),
                    h('div', { style: { position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: '#22c55e', fontWeight: 700 } }, '\u2B07\uFE0F Exhale 4s'),
                    h('div', { style: { position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: '#f59e0b', fontWeight: 700 } }, '\u23F8\uFE0F Hold 4s'),
                    h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                      h('span', { style: { fontSize: 28 } }, '\u2B1C')
                    )
                  ),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginTop: 8 } }, tech.rounds + ' rounds \u2022 4 seconds each phase')
                ),

                // Active animation
                techBoxActive && h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                  h('div', {
                    style: {
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: boxSide === 0 || boxSide === 2 ? 120 : 160,
                      height: boxSide === 0 || boxSide === 2 ? 160 : 120,
                      border: '3px solid ' + tech.color, borderRadius: 12, background: tech.color + '11',
                      transition: 'all 1s ease-in-out', flexDirection: 'column'
                    }
                  },
                    h('div', { style: { fontSize: 28, fontWeight: 800, color: tech.color } }, techBoxTimer),
                    h('div', { style: { fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginTop: 4 } }, phaseLabels[boxSide])
                  ),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginTop: 8 } },
                    'Round ' + (techBoxRound + 1) + ' of ' + tech.rounds
                  )
                ),

                // Start / Stop button
                h('div', { style: { textAlign: 'center' } },
                  !techBoxActive && h('button', { 'aria-label': st.techsDone || {},
                    onClick: function() {
                      upd({ techBoxActive: true, techBoxPhase: 0, techBoxRound: 0, techBoxTimer: 4 });
                      if (soundEnabled) sfxBowl();
                      var boxIntv = setInterval(function() {
                        var st = (ctx.toolData && ctx.toolData.mindfulness) || {};
                        var timer = (st.techBoxTimer || 1) - 1;
                        if (timer <= 0) {
                          var nextPhase = (st.techBoxPhase || 0) + 1;
                          var nextRound = st.techBoxRound || 0;
                          if (nextPhase >= 4) {
                            nextPhase = 0;
                            nextRound = nextRound + 1;
                          }
                          if (nextRound >= tech.rounds) {
                            clearInterval(boxIntv);
                            var newTechs = Object.assign({}, st.techsDone || {});
                            newTechs['box_breathing'] = true;
                            upd({ techBoxActive: false, techBoxPhase: 0, techBoxRound: 0, techBoxTimer: 0, techsDone: newTechs });
                            var mins = Math.round((tech.rounds * 16) / 60) || 1;
                            upd('totalMinutes', (st.totalMinutes || 0) + mins);
                            if (soundEnabled) sfxComplete();
                            celebrate();
                            addToast('\u2B1C Box breathing complete!', 'success');
                            awardXP(15);
                            logPractice('technique', 'box_breathing');
                            if (Object.keys(newTechs).length >= GROUNDING_TECHNIQUES.length) tryAwardBadge('grounding_expert');
                          } else {
                            upd({ techBoxPhase: nextPhase, techBoxRound: nextRound, techBoxTimer: 4 });
                            if (soundEnabled) sfxChime();
                          }
                        } else {
                          upd('techBoxTimer', timer);
                        }
                      }, 1000);
                    },
                    style: { padding: '14px 32px', borderRadius: 10, border: 'none', background: tech.color, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
                  }, '\u25B6 Start Box Breathing'),
                  techBoxActive && h('button', { 'aria-label': 'Stop',
                    onClick: function() { upd({ techBoxActive: false }); },
                    style: { padding: '10px 24px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                  }, '\u25A0 Stop')
                )
              );
            }

            // ── RAIN Technique ──
            if (tech.id === 'rain_technique') {
              var rainSteps = tech.steps;
              var currentRainStep = rainSteps[techRainStep];

              return h('div', null,
                backBtn,
                h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                  h('div', { style: { fontSize: 48 } }, tech.emoji),
                  h('h4', { style: { margin: '8px 0 4px', color: tech.color, fontSize: 20 } }, tech.name),
                  h('p', { style: { fontSize: 12, color: '#94a3b8' } }, tech.desc[band])
                ),

                // RAIN letter progress
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 } },
                  rainSteps.map(function(rs, i) {
                    var isDone = i < techRainStep;
                    var isCurrent = i === techRainStep;
                    return h('div', {
                      key: i,
                      style: {
                        width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? tech.color + '33' : isCurrent ? tech.color + '22' : '#1e293b',
                        border: '2px solid ' + (isDone ? tech.color : isCurrent ? tech.color : '#334155'),
                        color: isDone || isCurrent ? '#e2e8f0' : '#94a3b8', fontSize: 20, fontWeight: 800
                      }
                    }, isDone ? '\u2713' : rs.letter);
                  })
                ),

                // Current step
                techRainStep < 4 && h('div', { style: { padding: 20, borderRadius: 16, background: tech.color + '10', border: '1px solid ' + tech.color + '33', marginBottom: 16 } },
                  h('h4', { style: { margin: '0 0 4px', color: tech.color, fontSize: 18 } }, currentRainStep.letter + ' \u2014 ' + currentRainStep.title),
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', marginBottom: 12 } }, currentRainStep.prompt[band]),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' } }, currentRainStep.guidance[band]),
                  h('textarea', {
                    value: techRainInputs[techRainStep] || '',
                    'aria-label': 'RAIN technique response',
                    onChange: function(e) {
                      var newInputs = techRainInputs.slice();
                      newInputs[techRainStep] = e.target.value;
                      upd('techRainInputs', newInputs);
                    },
                    placeholder: band === 'elementary' ? 'Write your thoughts here...' : 'Reflect and respond...',
                    rows: 3,
                    style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }
                  }),
                  h('button', { 'aria-label': 'Toggle sound',
                    onClick: function() {
                      var next = techRainStep + 1;
                      upd('techRainStep', next);
                      if (soundEnabled) sfxChime();
                      awardXP(5);
                      if (next >= 4) {
                        var newTechs = Object.assign({}, techsDone);
                        newTechs['rain_technique'] = true;
                        upd('techsDone', newTechs);
                        upd('totalMinutes', totalMinutes + 5);
                        celebrate();
                        addToast('\uD83C\uDF27\uFE0F RAIN technique complete!', 'success');
                        awardXP(15);
                        logPractice('technique', 'rain_technique');
                        if (Object.keys(newTechs).length >= GROUNDING_TECHNIQUES.length) tryAwardBadge('grounding_expert');
                      }
                    },
                    style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: tech.color, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                  }, techRainStep < 3 ? 'Next: ' + rainSteps[techRainStep + 1].letter + ' \u2014 ' + rainSteps[techRainStep + 1].title + ' \u2192' : '\u2705 Complete RAIN')
                ),

                // Completion
                techRainStep >= 4 && h('div', { style: { textAlign: 'center', padding: 24 } },
                  h('div', { style: { fontSize: 56, marginBottom: 8 } }, '\uD83C\uDF27\uFE0F'),
                  h('h4', { style: { color: '#22c55e', fontSize: 18, marginBottom: 8 } }, 'RAIN Complete'),
                  h('p', { style: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16 } },
                    band === 'elementary' ? 'Great job! You used all four steps to work through a big feeling.' :
                    'You have processed an emotional experience using the RAIN framework. This skill strengthens with practice.'
                  ),
                  h('button', { 'aria-label': 'Back to Techniques',
                    onClick: function() { upd({ techRainStep: 0, techRainInputs: ['','','',''], techActiveId: null }); },
                    style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }
                  }, '\u2190 Back to Techniques')
                )
              );
            }

            // ── Butterfly Hug ──
            if (tech.id === 'butterfly_hug') {
              var bfSteps = tech.instructions;
              return h('div', null,
                backBtn,
                h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                  h('div', { style: { fontSize: 48 } }, tech.emoji),
                  h('h4', { style: { margin: '8px 0 4px', color: tech.color, fontSize: 20 } }, tech.name),
                  h('p', { style: { fontSize: 12, color: '#94a3b8' } }, tech.desc[band])
                ),

                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                  bfSteps.map(function(step, i) {
                    var isStepDone = i < techStep;
                    var isCurrent = i === techStep;
                    return h('div', {                       key: i,
                      onClick: function() {
                        if (i === techStep) {
                          var next = techStep + 1;
                          upd('techStep', next);
                          if (soundEnabled) sfxClick();
                          awardXP(3);
                          if (next >= bfSteps.length) {
                            var newTechs = Object.assign({}, techsDone);
                            newTechs['butterfly_hug'] = true;
                            upd({ techsDone: newTechs, techButterflyDone: true });
                            upd('totalMinutes', totalMinutes + 2);
                            if (soundEnabled) sfxComplete();
                            celebrate();
                            addToast('\uD83E\uDD8B Butterfly Hug complete!', 'success');
                            awardXP(15);
                            logPractice('technique', 'butterfly_hug');
                            if (Object.keys(newTechs).length >= GROUNDING_TECHNIQUES.length) tryAwardBadge('grounding_expert');
                          }
                        }
                      },
                      style: {
                        padding: 14, borderRadius: 12,
                        background: isCurrent ? tech.color + '12' : isStepDone ? '#22c55e08' : '#1e293b',
                        border: '1px solid ' + (isCurrent ? tech.color + '44' : isStepDone ? '#22c55e33' : '#334155'),
                        cursor: isCurrent ? 'pointer' : 'default', opacity: !isStepDone && !isCurrent ? 0.5 : 1
                      }
                    },
                      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
                        h('div', {
                          style: {
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isStepDone ? '#22c55e' : isCurrent ? tech.color : '#334155',
                            color: '#fff', fontSize: 11, fontWeight: 700
                          }
                        }, isStepDone ? '\u2713' : step.step),
                        h('div', { style: { flex: 1 } },
                          h('p', { style: { fontSize: 13, color: isStepDone ? '#94a3b8' : '#e2e8f0', margin: '0 0 4px', lineHeight: 1.5 } }, step.text),
                          h('p', { style: { fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic' } }, step.detail)
                        )
                      )
                    );
                  })
                ),

                techStep < bfSteps.length && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
                  'Tap each step as you complete it.'
                )
              );
            }

            // ── 5-4-3-2-1 Interactive Senses ──
            if (tech.id === 'five_senses_interactive') {
              var senses = tech.senses;
              return h('div', null,
                backBtn,
                h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                  h('div', { style: { fontSize: 48 } }, tech.emoji),
                  h('h4', { style: { margin: '8px 0 4px', color: tech.color, fontSize: 20 } }, tech.name),
                  h('p', { style: { fontSize: 12, color: '#94a3b8' } }, tech.desc[band])
                ),

                techStep < 5 && (function() {
                  var sense = senses[techStep];
                  return h('div', null,
                    // Progress dots
                    h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 } },
                      senses.map(function(s, i) {
                        var isDone = i < techStep;
                        var isCurrent = i === techStep;
                        return h('div', {
                          key: i,
                          style: {
                            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isDone ? s.color + '33' : isCurrent ? s.color + '22' : '#1e293b',
                            border: '2px solid ' + (isDone ? s.color : isCurrent ? s.color : '#334155'),
                            fontSize: 16
                          }
                        }, isDone ? '\u2713' : s.emoji);
                      })
                    ),

                    h('div', { style: { padding: 20, borderRadius: 16, background: sense.color + '10', border: '1px solid ' + sense.color + '33', marginBottom: 16, textAlign: 'center' } },
                      h('div', { style: { fontSize: 48, marginBottom: 8 } }, sense.emoji),
                      h('h4', { style: { margin: '0 0 12px', color: sense.color, fontSize: 20 } },
                        'Name ' + sense.count + ' thing' + (sense.count > 1 ? 's' : '') + ' you can ' + sense.sense
                      )
                    ),

                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
                      Array.from({ length: sense.count }, function(_, i) {
                        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8 } },
                          h('span', { style: { fontSize: 14, color: sense.color, fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0 } }, i + 1),
                          h('input', {
                            type: 'text',
                            'aria-label': sense.sense + ' item ' + (i + 1),
                            placeholder: sense.sense.toLowerCase() + ' #' + (i + 1) + '...',
                            value: (techRainInputs[techStep] && typeof techRainInputs[techStep] === 'object' ? techRainInputs[techStep][i] : '') || '',
                            onChange: function(e) {
                              var newInputs = techRainInputs.slice();
                              if (!newInputs[techStep] || typeof newInputs[techStep] !== 'object') {
                                newInputs[techStep] = {};
                              }
                              var stepInputs = Object.assign({}, newInputs[techStep]);
                              stepInputs[i] = e.target.value;
                              newInputs[techStep] = stepInputs;
                              upd('techRainInputs', newInputs);
                            },
                            style: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit' }
                          })
                        );
                      })
                    ),

                    h('button', { 'aria-label': 'Toggle sound',
                      onClick: function() {
                        var next = techStep + 1;
                        upd('techStep', next);
                        if (soundEnabled) sfxChime();
                        awardXP(5);
                        if (next >= 5) {
                          var newTechs = Object.assign({}, techsDone);
                          newTechs['five_senses_interactive'] = true;
                          upd('techsDone', newTechs);
                          upd('totalMinutes', totalMinutes + 3);
                          celebrate();
                          addToast('\uD83C\uDF0D 5-4-3-2-1 senses exercise complete!', 'success');
                          awardXP(15);
                          logPractice('technique', 'five_senses_interactive');
                          if (Object.keys(newTechs).length >= GROUNDING_TECHNIQUES.length) tryAwardBadge('grounding_expert');
                        }
                      },
                      style: { width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: sense.color, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
                    }, techStep < 4 ? 'Next Sense \u2192' : '\u2705 Complete!')
                  );
                })(),

                techStep >= 5 && h('div', { style: { textAlign: 'center', padding: 24 } },
                  h('div', { style: { fontSize: 56, marginBottom: 8 } }, '\uD83C\uDF0D'),
                  h('h4', { style: { color: '#22c55e', fontSize: 18, marginBottom: 8 } }, 'Senses Grounding Complete!'),
                  h('p', { style: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6 } },
                    'You brought yourself back to the present moment using all five senses.'
                  ),
                  h('button', { 'aria-label': 'Back to Techniques',
                    onClick: function() { upd({ techStep: 0, techRainInputs: ['','','',''], techActiveId: null }); },
                    style: { marginTop: 12, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }
                  }, '\u2190 Back to Techniques')
                )
              );
            }

            return null;
          })(),

          // Technique grid (list view)
          !techActiveId && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            GROUNDING_TECHNIQUES.map(function(tech) {
              var done = techsDone[tech.id];
              return h('button', { 'aria-label': tech.emoji,
                key: tech.id,
                onClick: function() {
                  upd({ techActiveId: tech.id, techStep: 0, techBoxActive: false, techBoxPhase: 0, techBoxRound: 0, techRainStep: 0, techRainInputs: ['','','',''], techButterflyDone: false });
                  if (soundEnabled) sfxClick();
                },
                style: {
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14,
                  border: '1px solid ' + (done ? '#22c55e44' : '#334155'),
                  background: done ? '#22c55e08' : '#1e293b', cursor: 'pointer', textAlign: 'left'
                }
              },
                h('div', { style: { fontSize: 32, flexShrink: 0 } }, tech.emoji),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' } }, tech.name),
                    done && h('span', { style: { fontSize: 10, color: '#22c55e', fontWeight: 700 } }, '\u2713 Done')
                  ),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4, marginTop: 2 } }, tech.desc[band])
                ),
                h('span', { style: { fontSize: 16, color: '#94a3b8', flexShrink: 0 } }, '\u2192')
              );
            })
          ),

          !techActiveId && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 16 } },
            Object.keys(techsDone).length + '/' + GROUNDING_TECHNIQUES.length + ' techniques completed'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      return h('div', { style: { minHeight: '100%' } },
        tabBar,
        heroBand,
        badgePopup,
        breatheContent,
        meditateContent,
        scanContent,
        groundContent,
        techniquesContent,
        movementContent,
        gratitudeContent,
        momentsContent,
        logContent
      );
    }
  });
})();
