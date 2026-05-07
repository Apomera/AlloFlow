// ═══════════════════════════════════════════════════════════════
// sel_tool_coping.js — Coping Toolkit Plugin (v1.0)
// Interactive coping strategy library, guided practice modes
// (PMR, I-statements, thought flipper, calm counting),
// personal calm plan builder, AI strategy matcher, practice
// log with effectiveness tracking, and achievement badges.
// Registered tool ID: "coping"
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
    if (document.getElementById('allo-live-coping')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-coping';
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
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxCalm() { playTone(330, 0.4, 'sine', 0.05); setTimeout(function() { playTone(392, 0.4, 'sine', 0.05); }, 300); setTimeout(function() { playTone(440, 0.5, 'sine', 0.06); }, 600); }
  function sfxTense() { playTone(220, 0.3, 'sawtooth', 0.04); }
  function sfxRelease() { playTone(440, 0.5, 'sine', 0.06); setTimeout(function() { playTone(523, 0.4, 'sine', 0.05); }, 200); }
  function sfxCheckin() { playTone(440, 0.15, 'sine', 0.06); setTimeout(function() { playTone(554, 0.15, 'sine', 0.06); }, 100); setTimeout(function() { playTone(659, 0.2, 'sine', 0.08); }, 200); }

  // ══════════════════════════════════════════════════════════════
  // ── Strategy Categories & Definitions ──
  // ══════════════════════════════════════════════════════════════
  var STRATEGY_TYPES = [
    { id: 'breathing',  label: 'Breathing',  icon: '\uD83C\uDF2C\uFE0F', color: '#3b82f6', desc: 'Slow your body down with breath' },
    { id: 'movement',   label: 'Movement',   icon: '\uD83C\uDFC3',       color: '#22c55e', desc: 'Use your body to release energy' },
    { id: 'sensory',    label: 'Sensory',    icon: '\uD83D\uDC40',       color: '#eab308', desc: 'Use your senses to ground yourself' },
    { id: 'cognitive',  label: 'Thinking',   icon: '\uD83E\uDDE0',       color: '#8b5cf6', desc: 'Change the way you think about it' },
    { id: 'social',     label: 'Social',     icon: '\uD83D\uDDE3\uFE0F', color: '#f97316', desc: 'Connect with others for support' },
    { id: 'creative',   label: 'Creative',   icon: '\uD83C\uDFA8',       color: '#ec4899', desc: 'Express yourself through art or words' }
  ];

  var STRATEGIES = [
    // ── Breathing ──
    {
      id: 'belly_breathing', type: 'breathing', icon: '\uD83E\uDEBB',
      bestFor: ['yellow', 'red'],
      name: { elementary: 'Belly Breathing', middle: 'Diaphragmatic Breathing', high: 'Diaphragmatic Breathing' },
      desc: {
        elementary: 'Put your hand on your belly and feel it fill up like a balloon!',
        middle: 'Breathe deeply into your belly instead of your chest. Feel your diaphragm push down.',
        high: 'Engage the diaphragm to activate the parasympathetic nervous system, slowing heart rate and reducing cortisol.'
      },
      steps: {
        elementary: ['Put one hand on your chest and one on your belly', 'Breathe in slowly through your nose \u2014 feel your belly push out like a balloon', 'Breathe out slowly through your mouth \u2014 feel your belly go flat', 'Your chest hand should barely move!', 'Do this 5 times'],
        middle: ['Place one hand on your chest and one on your abdomen', 'Inhale slowly through your nose for 4 counts, expanding your belly', 'Pause for 1 second at the top', 'Exhale slowly through pursed lips for 6 counts', 'Repeat for 2 minutes'],
        high: ['Sit or lie in a comfortable position. Place one hand on your upper chest and one on your abdomen', 'Inhale slowly through your nose (4 counts), directing the breath downward so your diaphragm expands', 'Notice: your chest hand should remain still while your abdominal hand rises', 'Exhale through pursed lips (6 counts), engaging your abdominals to push air out', 'Continue for 3-5 minutes, gradually lengthening the exhale']
      },
      practiceable: true
    },
    {
      id: 'smell_flower_candle', type: 'breathing', icon: '\uD83C\uDF38',
      bestFor: ['yellow', 'red'],
      name: { elementary: 'Smell the Flower, Blow the Candle', middle: 'Inhale-Exhale Visualization', high: 'Paced Breathing with Imagery' },
      desc: {
        elementary: 'Pretend to smell a flower (breathe in) then blow out a candle (breathe out)!',
        middle: 'Pair your breathing with calming mental images to make it easier to focus.',
        high: 'Combining paced breathing with visualization engages multiple calming pathways.'
      },
      steps: {
        elementary: ['Hold up one finger like a flower', 'Smell the flower \u2014 breathe in through your nose slowly', 'Now hold up your other finger like a candle', 'Blow out the candle \u2014 breathe out through your mouth slowly', 'Do it 5 times!'],
        middle: ['Picture a beautiful flower in your mind', 'Inhale through your nose for 4 counts, imagining smelling the flower', 'Picture a candle flame flickering', 'Exhale through your mouth for 4 counts, imagining gently blowing the candle out', 'Repeat 5 times, trying to make the exhale longer each time'],
        high: ['Choose a calming mental image for inhalation (a garden, ocean breeze)', 'Inhale for 4 counts through your nose, fully engaging with the image', 'Choose an image for exhalation (a candle flame, a leaf on water)', 'Exhale for 6-8 counts, visualizing tension leaving with your breath', 'Continue for 2-3 minutes, deepening the imagery each cycle']
      },
      practiceable: true
    },
    // ── Movement ──
    {
      id: 'wall_pushups', type: 'movement', icon: '\uD83E\uDDF1',
      bestFor: ['yellow', 'red'],
      name: { elementary: 'Wall Push-Ups', middle: 'Wall Push-Ups', high: 'Isometric Pressure Exercise' },
      desc: {
        elementary: 'Push against the wall as hard as you can, then let go and feel the calm!',
        middle: 'Use heavy work against a wall to release tension and reset your body.',
        high: 'Isometric exercises provide proprioceptive input that helps regulate the nervous system.'
      },
      steps: {
        elementary: ['Stand facing a wall with your hands flat on it', 'Push as hard as you can for 10 seconds', 'Stop and let your arms hang \u2014 feel how different they are!', 'Shake out your hands', 'Do it 3 more times'],
        middle: ['Stand arm\u2019s length from a wall, palms flat at shoulder height', 'Push firmly into the wall for 15 seconds \u2014 notice the tension building', 'Release and drop your arms. Notice the contrast between tension and relaxation', 'Take a slow breath', 'Repeat 3-5 times'],
        high: ['Position yourself arm\u2019s length from a wall, palms at shoulder height', 'Apply maximum isometric force for 15-20 seconds, engaging your full upper body', 'Release abruptly and observe the proprioceptive feedback \u2014 warmth, tingling, relaxation', 'This contrast between tension and release is the same principle behind Progressive Muscle Relaxation', 'Repeat 3-5 times, pairing each release with a slow exhale']
      },
      practiceable: true
    },
    {
      id: 'shake_it_off', type: 'movement', icon: '\uD83D\uDD7A',
      bestFor: ['blue', 'yellow'],
      name: { elementary: 'Shake It Off', middle: 'Body Shake Reset', high: 'Somatic Shaking (TRE-Inspired)' },
      desc: {
        elementary: 'Shake your whole body like a wet dog! Shake out the yucky feelings!',
        middle: 'Shake your body vigorously to release stored tension and shift your energy.',
        high: 'Therapeutic tremoring and somatic shaking release muscular tension stored from stress responses.'
      },
      steps: {
        elementary: ['Start by shaking your hands really fast', 'Now shake your arms!', 'Shake your legs \u2014 stomp your feet!', 'Shake your whole body like a wet dog for 10 seconds', 'Stop \u2014 stand still and notice how your body feels'],
        middle: ['Start with your hands, shaking them vigorously for 10 seconds', 'Add your arms, letting them flop and shake loosely', 'Bend your knees slightly and bounce/shake your legs', 'Shake your whole body freely for 30 seconds \u2014 no rules, just let it go', 'Stop completely and stand still. Take 3 slow breaths. Notice the shift.'],
        high: ['Begin with your extremities \u2014 shake hands and feet for 15 seconds', 'Progressively engage larger muscle groups: arms, legs, shoulders, torso', 'Allow the shaking to become involuntary if it wants to \u2014 your body knows what to release', 'Continue full-body shaking for 60-90 seconds', 'Stop and stand in stillness. Observe your internal state without judgment. Notice the parasympathetic rebound.']
      },
      practiceable: true
    },
    {
      id: 'cross_crawl', type: 'movement', icon: '\u274C',
      bestFor: ['blue', 'yellow'],
      name: { elementary: 'Cross-Body Moves', middle: 'Cross-Lateral Movement', high: 'Bilateral Integration Exercise' },
      desc: {
        elementary: 'Touch your opposite knee with your hand \u2014 left hand to right knee!',
        middle: 'Cross-body movements help connect both sides of your brain and refocus.',
        high: 'Cross-lateral movements integrate the brain hemispheres, improving executive function and emotional regulation.'
      },
      steps: {
        elementary: ['Stand up with space around you', 'Touch your right knee with your left hand', 'Now touch your left knee with your right hand', 'Keep going \u2014 right hand to left knee, left hand to right knee!', 'Do 10 on each side!'],
        middle: ['Stand with feet shoulder-width apart', 'Lift your right knee and touch it with your left elbow', 'Return to standing, then lift your left knee to your right elbow', 'Maintain a steady rhythm \u2014 like slow marching', 'Do 20 total (10 per side), then stand still and notice your focus'],
        high: ['This exercise activates the corpus callosum, integrating hemispheric processing', 'Standing, bring right knee to left elbow in a controlled cross-lateral pattern', 'Alternate: left knee to right elbow', 'Maintain 20-30 repetitions at a moderate, mindful pace', 'Variation: Add a cognitive task (count backwards by 3s while doing the movements) to amplify the integrative effect']
      },
      practiceable: true
    },
    // ── Sensory ──
    {
      id: 'cold_water', type: 'sensory', icon: '\uD83D\uDCA7',
      bestFor: ['red'],
      name: { elementary: 'Cold Water Splash', middle: 'Cold Water Reset', high: 'Dive Reflex Activation' },
      desc: {
        elementary: 'Splash cold water on your face to feel better fast!',
        middle: 'Cold water on your face triggers your body to calm down automatically.',
        high: 'Cold water on the face activates the mammalian dive reflex, stimulating the vagus nerve and rapidly lowering heart rate.'
      },
      steps: {
        elementary: ['Go to a sink', 'Turn on cold water', 'Splash cold water on your cheeks and forehead', 'Hold a cold wet paper towel on your face for 10 seconds', 'Take a deep breath \u2014 notice how you feel'],
        middle: ['Run cold water at a sink (or get a cold water bottle)', 'Splash cold water on your face, especially your forehead and cheeks', 'Alternatively, hold a cold wet cloth against your face for 15 seconds', 'Take slow breaths while the cold is on your face', 'This triggers an automatic calming reflex \u2014 your body can\u2019t help but slow down'],
        high: ['Fill a bowl with cold water or prepare a cold, wet cloth', 'Apply cold to the area around your eyes, temples, and forehead (trigeminal nerve territory)', 'Hold for 15-30 seconds while taking slow, paced breaths', 'The mammalian dive reflex activates: heart rate drops, blood pressure lowers, your parasympathetic system engages', 'This is one of the fastest physiological calming techniques available \u2014 part of the DBT TIPP skill']
      },
      practiceable: false
    },
    {
      id: 'texture_touch', type: 'sensory', icon: '\u270B',
      bestFor: ['yellow', 'red'],
      name: { elementary: 'Touch and Feel', middle: 'Texture Grounding', high: 'Tactile Anchoring' },
      desc: {
        elementary: 'Find something soft, something bumpy, and something smooth \u2014 really feel them!',
        middle: 'Focusing on textures pulls your brain out of spiraling thoughts and into the present moment.',
        high: 'Tactile sensory engagement redirects attentional resources from the amygdala to the somatosensory cortex.'
      },
      steps: {
        elementary: ['Find something SOFT (a blanket, stuffed animal, sweater)', 'Touch it slowly \u2014 how does it feel?', 'Now find something ROUGH or BUMPY', 'Touch it slowly \u2014 is it different?', 'Find something SMOOTH \u2014 touch it and take 3 slow breaths'],
        middle: ['Without looking, reach into your pocket or bag and find an object', 'Close your eyes and explore it with your fingertips: texture, edges, weight, temperature', 'Describe 5 details about how it feels to yourself', 'Try another object and compare', 'Notice how your mind has shifted from whatever was bothering you to the present moment'],
        high: ['Select 2-3 objects with distinct textures in your environment', 'Close your eyes. Explore each one for 30 seconds using only touch', 'Narrate the sensory details internally: temperature, weight, texture gradient, edges', 'Notice how directed attention to somatosensory input naturally decreases rumination', 'This technique is a form of informal mindfulness \u2014 anchoring awareness in physical reality']
      },
      practiceable: false
    },
    // ── Cognitive ──
    {
      id: 'thought_flip', type: 'cognitive', icon: '\uD83D\uDD04',
      bestFor: ['blue', 'yellow'],
      name: { elementary: 'Thought Flipper', middle: 'Thought Reframing', high: 'Cognitive Restructuring' },
      desc: {
        elementary: 'Turn a mean thought into a kind thought!',
        middle: 'Challenge negative thoughts by finding a more balanced way to look at things.',
        high: 'Identify cognitive distortions and restructure automatic negative thoughts (ANTs) into adaptive alternatives.'
      },
      steps: {
        elementary: ['Think of a thought that makes you feel bad (like "Nobody likes me")', 'Ask: "Is this really true? ALWAYS true?"', 'Think of one time it WASN\u2019T true', 'Now make a kinder thought: "Some people like me and I\u2019m a good friend"', 'Say the kind thought to yourself 3 times!'],
        middle: ['Identify the negative thought (write it down if possible)', 'Ask: What evidence supports this? What evidence goes against it?', 'Is there another way to look at this situation?', 'Write a more balanced thought that accounts for both sides', 'Rate: How much do you believe the new thought? (The goal isn\u2019t 100% \u2014 even 30% is progress)'],
        high: ['Identify the automatic negative thought (ANT)', 'Name the cognitive distortion: catastrophizing? mind reading? all-or-nothing? overgeneralization?', 'Examine the evidence for and against the thought objectively', 'Generate an alternative thought that is realistic (not just positive)', 'Rate your belief in the original thought now (0-100%). Notice the shift.']
      },
      practiceable: true
    },
    {
      id: 'positive_self_talk', type: 'cognitive', icon: '\uD83D\uDCAC',
      bestFor: ['blue', 'yellow', 'red'],
      name: { elementary: 'Talk Nice to Yourself', middle: 'Positive Self-Talk', high: 'Adaptive Self-Dialogue' },
      desc: {
        elementary: 'Say something nice to yourself like a good friend would!',
        middle: 'Replace your inner critic with a supportive inner coach.',
        high: 'Replace maladaptive self-talk patterns with evidence-based, compassion-focused internal dialogue.'
      },
      steps: {
        elementary: ['Think about what you\u2019d say to a friend who felt this way', 'Now say that same thing to yourself!', 'Try: "I can do hard things" or "It\u2019s okay to make mistakes"', 'Put your hand on your heart when you say it', 'Say it 3 times and really mean it!'],
        middle: ['Notice what your inner voice is saying right now', 'If it\u2019s harsh, imagine what a supportive coach would say instead', 'Rewrite the message: "You always fail" becomes "You\u2019re learning and that takes time"', 'Speak it quietly to yourself or write it down', 'Practice this swap every time you catch a harsh inner voice'],
        high: ['Monitor your internal dialogue \u2014 what is the tone? Judgmental? Catastrophic?', 'Apply the "best friend test": would you say this to someone you care about?', 'Construct a compassion-focused alternative that acknowledges difficulty without amplifying it', 'Example: "I\u2019m pathetic" \u2192 "I\u2019m struggling right now, and that\u2019s a human experience"', 'Research shows self-compassion activates the same neural soothing system as receiving compassion from others']
      },
      practiceable: true
    },
    {
      id: 'calm_counting', type: 'cognitive', icon: '\uD83D\uDD22',
      bestFor: ['yellow', 'red'],
      name: { elementary: 'Calm Counting', middle: 'Countdown to Calm', high: 'Attentional Redirection via Counting' },
      desc: {
        elementary: 'Count backwards from 10 slowly to cool down!',
        middle: 'Counting backwards forces your brain to focus on the count instead of the anger.',
        high: 'Sequential reverse counting engages prefrontal executive function, interrupting amygdala-driven reactivity.'
      },
      steps: {
        elementary: ['Stop what you\u2019re doing', 'Close your eyes if you want to', 'Count backwards slowly: 10... 9... 8... 7... 6... 5... 4... 3... 2... 1...', 'Take a big breath', 'Now think: what should I do next?'],
        middle: ['Pause and close your eyes', 'Count backwards from 20, taking a breath between each number', 'If you lose your place, start over from 20 (that\u2019s okay!)', 'When you reach 1, take 3 more slow breaths', 'Open your eyes. You\u2019ve given your logical brain time to catch up.'],
        high: ['Interrupt the emotional cascade by engaging your prefrontal cortex with a demanding counting task', 'Count backwards from 50 by 3s (50, 47, 44, 41...) while breathing slowly', 'The dual task (counting + breathing) redirects cognitive resources away from the amygdala', 'If you lose your place, notice the frustration without judgment and restart', 'By the time you finish, your physiological arousal will have measurably decreased']
      },
      practiceable: true
    },
    // ── Social ──
    {
      id: 'i_statement', type: 'social', icon: '\uD83D\uDDE3\uFE0F',
      bestFor: ['yellow', 'red'],
      name: { elementary: 'I-Statements', middle: 'I-Statements', high: 'Assertive Communication with I-Statements' },
      desc: {
        elementary: 'Tell people how YOU feel without being mean: "I feel ___ when ___"',
        middle: 'Express your feelings clearly without blaming, using the I-statement formula.',
        high: 'Assertive communication using I-statements reduces defensiveness and promotes constructive dialogue.'
      },
      steps: {
        elementary: ['Start with "I feel..."', 'Add the feeling: "I feel sad"', 'Add when: "I feel sad when you take my toy"', 'DON\u2019T say "You always..." or "You never..."', 'Practice: "I feel ___ when ___ because ___"'],
        middle: ['Formula: "I feel [emotion] when [situation] because [reason]."', 'Example: "I feel frustrated when plans change last minute because I need time to adjust."', 'Avoid "you" accusations \u2014 focus on YOUR experience', 'End with what you need: "I would like ___"', 'Practice with small situations first, then work up to harder ones'],
        high: ['The I-statement framework: "I feel [emotion] when [observable behavior] because [impact on me]. I would like [specific request]."', 'This separates observation from evaluation \u2014 a core principle of Nonviolent Communication (NVC)', 'Example: "I feel dismissed when my ideas are interrupted because I want to contribute. I\u2019d like a chance to finish my point."', 'Key: describe behavior, not character. "When you interrupt" not "When you\u2019re rude."', 'Practice in low-stakes situations to build the neural pathways before high-stakes ones']
      },
      practiceable: true
    },
    {
      id: 'ask_for_help', type: 'social', icon: '\uD83D\uDE4B',
      bestFor: ['blue', 'yellow', 'red'],
      name: { elementary: 'Ask for Help', middle: 'Reaching Out', high: 'Support-Seeking Behavior' },
      desc: {
        elementary: 'It\u2019s brave to ask a grown-up or friend for help!',
        middle: 'Knowing when and how to ask for help is a strength, not a weakness.',
        high: 'Effective help-seeking is a core resilience skill associated with better outcomes across all domains.'
      },
      steps: {
        elementary: ['Think: who are my safe adults? (teacher, parent, counselor)', 'Walk to them and say: "I need help with something"', 'Tell them how you feel and what happened', 'Listen to their ideas', 'Say thank you!'],
        middle: ['Identify 3 trusted people you can go to (at school, at home, in your community)', 'Practice saying: "I\u2019m struggling with ___ and I could use your help/advice"', 'Remember: asking for help is a sign of self-awareness, not weakness', 'Be specific about what kind of help you need (listening, advice, action)', 'Follow up to let them know how things turned out'],
        high: ['Map your support network: who can you go to for emotional support? Practical help? Professional guidance?', 'Identify barriers to help-seeking: pride, fear of judgment, not wanting to be a burden', 'Reframe: research consistently shows that help-seeking is correlated with resilience, not dependence', 'Practice the ask: "I\u2019m dealing with [situation] and I value your perspective. Can we talk?"', 'Know your escalation path: peer \u2192 trusted adult \u2192 counselor \u2192 crisis line if needed']
      },
      practiceable: false
    },
    // ── Creative ──
    {
      id: 'draw_feelings', type: 'creative', icon: '\uD83C\uDFA8',
      bestFor: ['blue', 'yellow'],
      name: { elementary: 'Draw Your Feelings', middle: 'Emotion Art', high: 'Expressive Arts Processing' },
      desc: {
        elementary: 'Draw a picture of how you feel! Use any colors you want!',
        middle: 'Express emotions through art when words aren\u2019t enough.',
        high: 'Visual-spatial expression of emotions engages right-hemisphere processing, bypassing verbal rumination loops.'
      },
      steps: {
        elementary: ['Get paper and crayons/markers', 'Think about how you feel right now', 'Pick colors that match your feeling', 'Draw anything you want \u2014 shapes, scribbles, or a picture', 'Tell someone about your drawing if you want to!'],
        middle: ['Choose your medium: paper, tablet, or even just a scrap of paper', 'Don\u2019t plan \u2014 just start with whatever colors and shapes feel right', 'Let the emotion guide your hand: angry? Press hard. Sad? Use flowing lines.', 'There\u2019s no right or wrong. This is for YOU, not for a grade.', 'When you\u2019re done, look at what you made. What does it tell you about how you feel?'],
        high: ['Select a medium (drawing, painting, digital, collage \u2014 anything visual)', 'Set a timer for 5-10 minutes. No planning, no judgment.', 'Allow the emotional content to express itself non-verbally through color, form, pressure, and movement', 'This activates right-hemisphere processing, which can access emotional material that verbal processing misses', 'After: observe your creation with curiosity. What patterns emerged? What surprised you?']
      },
      practiceable: false
    },
    {
      id: 'journal_write', type: 'creative', icon: '\uD83D\uDCD3',
      bestFor: ['blue', 'yellow'],
      name: { elementary: 'Write It Out', middle: 'Emotion Journaling', high: 'Expressive Writing' },
      desc: {
        elementary: 'Write or draw about what happened and how you feel!',
        middle: 'Getting thoughts out of your head and onto paper can make them feel more manageable.',
        high: 'Pennebaker\u2019s expressive writing paradigm shows that writing about emotional experiences reduces physiological stress markers.'
      },
      steps: {
        elementary: ['Get a piece of paper or a notebook', 'Write or draw what happened', 'Write how it made you feel', 'Write what you wish would happen', 'You can keep it, share it, or throw it away \u2014 it\u2019s your choice!'],
        middle: ['Set a timer for 5 minutes', 'Write continuously about what you\u2019re feeling \u2014 don\u2019t stop to edit or fix spelling', 'Include: what happened, how you feel, what you\u2019re thinking, what you need', 'When the timer ends, reread what you wrote', 'Ask: what\u2019s the most important thing I wrote? What can I do about it?'],
        high: ['Set a timer for 10-15 minutes (Pennebaker protocol)', 'Write continuously about your deepest thoughts and feelings regarding the current emotional experience', 'Don\u2019t censor, edit, or worry about grammar \u2014 this is not for an audience', 'Research shows that 3-4 sessions of expressive writing significantly reduces rumination and physiological stress', 'After writing, you may destroy the writing or keep it. The therapeutic value is in the process, not the product.']
      },
      practiceable: false
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Progressive Muscle Relaxation (PMR) Muscle Groups ──
  // ══════════════════════════════════════════════════════════════
  var PMR_GROUPS = [
    {
      id: 'hands',
      name: 'Hands & Fists',
      emoji: '\u270A',
      tense: { elementary: 'Squeeze your fists as tight as you can!', middle: 'Clench both fists tightly.', high: 'Contract the flexor muscles of both hands, making tight fists.' },
      release: { elementary: 'Let go and let your fingers be floppy like noodles!', middle: 'Release and let your hands go completely limp.', high: 'Release abruptly and observe the contrast between tension and relaxation in the forearm flexors.' }
    },
    {
      id: 'arms',
      name: 'Arms & Biceps',
      emoji: '\uD83D\uDCAA',
      tense: { elementary: 'Make your muscles big and strong like a superhero!', middle: 'Bend your arms and flex your biceps hard.', high: 'Flex both biceps isometrically, pressing your forearms toward your shoulders.' },
      release: { elementary: 'Now be a jellyfish \u2014 all wiggly and loose!', middle: 'Straighten your arms and let them hang heavy.', high: 'Extend and release, allowing the arms to hang with gravity. Note the warmth spreading through the muscles.' }
    },
    {
      id: 'shoulders',
      name: 'Shoulders',
      emoji: '\uD83E\uDDB7',
      tense: { elementary: 'Push your shoulders up to your ears like a turtle!', middle: 'Shrug your shoulders up as high as they can go.', high: 'Elevate both shoulders toward your ears, engaging the trapezius muscles maximally.' },
      release: { elementary: 'Now drop them down \u2014 let them melt like butter!', middle: 'Drop them down and back. Feel the difference.', high: 'Release and allow the shoulders to descend fully. Notice the trapezius deactivation and the sensation of weight.' }
    },
    {
      id: 'face',
      name: 'Face',
      emoji: '\uD83D\uDE16',
      tense: { elementary: 'Scrunch up your face like you bit a sour lemon!', middle: 'Scrunch every part of your face \u2014 eyes, nose, mouth \u2014 as tight as possible.', high: 'Contract all facial muscles simultaneously: squeeze eyes, wrinkle nose, press lips together, clench jaw.' },
      release: { elementary: 'Now make a big open face \u2014 mouth open, eyes wide \u2014 then relax!', middle: 'Relax everything. Let your jaw drop slightly open. Soften your brow.', high: 'Release all facial tension. Let the jaw fall slightly open, the tongue rest on the palate, the brow smooth. The face holds enormous tension that we rarely notice.' }
    },
    {
      id: 'stomach',
      name: 'Stomach',
      emoji: '\uD83E\uDEBB',
      tense: { elementary: 'Make your tummy hard like a rock!', middle: 'Tighten your stomach muscles as if someone were going to poke your belly.', high: 'Engage the rectus abdominis and obliques, bracing as if for impact.' },
      release: { elementary: 'Now make it soft like a pillow. Ahhhh!', middle: 'Release and let your belly be completely soft and relaxed.', high: 'Release the abdominal wall fully. Allow the breath to naturally deepen as core tension dissolves.' }
    },
    {
      id: 'legs',
      name: 'Legs & Feet',
      emoji: '\uD83E\uDDB5',
      tense: { elementary: 'Point your toes and squeeze your legs tight!', middle: 'Push your legs straight out, point your toes, and squeeze all leg muscles.', high: 'Extend both legs, dorsiflex the feet, and contract the quadriceps, hamstrings, and calves simultaneously.' },
      release: { elementary: 'Now let them go all floppy. Wiggle your toes!', middle: 'Let your legs go completely limp. Let your feet fall to the sides.', high: 'Release all lower extremity tension. Let the legs fall naturally. Notice the warmth and heaviness \u2014 this is the parasympathetic relaxation response.' }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── I-Statement Templates ──
  // ══════════════════════════════════════════════════════════════
  var I_STATEMENT_FEELINGS = {
    elementary: ['sad', 'mad', 'scared', 'worried', 'left out', 'confused', 'frustrated', 'embarrassed', 'hurt', 'lonely'],
    middle: ['frustrated', 'anxious', 'disappointed', 'overwhelmed', 'disrespected', 'excluded', 'betrayed', 'pressured', 'embarrassed', 'jealous'],
    high: ['invalidated', 'marginalized', 'overwhelmed', 'dismissed', 'microaggressed', 'unsupported', 'conflicted', 'vulnerable', 'undermined', 'demoralized']
  };

  var I_STATEMENT_SITUATIONS = {
    elementary: ['you take my things', 'you don\'t listen to me', 'I get called names', 'I\'m not included', 'someone yells at me', 'I can\'t do something'],
    middle: ['my ideas get dismissed', 'plans change without telling me', 'someone talks behind my back', 'I\'m left out of the group chat', 'I\'m compared to others', 'someone borrows my stuff without asking'],
    high: ['my boundaries are crossed', 'my perspective isn\'t considered', 'expectations aren\'t communicated clearly', 'I receive criticism without constructive feedback', 'my workload isn\'t acknowledged', 'decisions that affect me are made without my input']
  };

  // ══════════════════════════════════════════════════════════════
  // ── Thought Flipper Data ──
  // ══════════════════════════════════════════════════════════════
  var NEGATIVE_THOUGHTS = {
    elementary: [
      { thought: 'Nobody likes me.', distortion: 'all-or-nothing', flip: 'Some people like me. I have friends who care about me.' },
      { thought: 'I can\'t do anything right.', distortion: 'overgeneralization', flip: 'I make mistakes sometimes, but I also do lots of things well!' },
      { thought: 'This is the worst day ever.', distortion: 'catastrophizing', flip: 'Today has been hard, but not everything was bad.' },
      { thought: 'Everyone is looking at me.', distortion: 'mind reading', flip: 'Most people are thinking about their own stuff, not about me.' },
      { thought: 'I\'ll never be good at this.', distortion: 'fortune telling', flip: 'I\'m still learning. The more I practice, the better I\'ll get!' },
      { thought: 'It\'s all my fault.', distortion: 'personalization', flip: 'Lots of things caused this, not just me.' }
    ],
    middle: [
      { thought: 'If I fail this test, my life is over.', distortion: 'catastrophizing', flip: 'One test doesn\'t define my future. I can learn from it and do better next time.' },
      { thought: 'She didn\'t text back \u2014 she must hate me.', distortion: 'mind reading', flip: 'There are many reasons someone might not text back. She could be busy.' },
      { thought: 'I always mess up in social situations.', distortion: 'overgeneralization', flip: 'I\'ve had awkward moments, but I\'ve also had plenty of good conversations.' },
      { thought: 'Everyone else has it figured out except me.', distortion: 'comparison', flip: 'Everyone is figuring things out. Most people just hide their struggles.' },
      { thought: 'If I ask for help, people will think I\'m weak.', distortion: 'mind reading', flip: 'Asking for help shows self-awareness and courage. Most people respect that.' },
      { thought: 'I should be over this by now.', distortion: 'should statement', flip: 'Healing takes time. There\'s no "should" timeline for feelings.' }
    ],
    high: [
      { thought: 'If I don\'t get into a good college, I\'m a failure.', distortion: 'all-or-nothing', flip: 'Success has many paths. One outcome doesn\'t define my worth or trajectory.' },
      { thought: 'Nobody actually cares \u2014 they\'re just being polite.', distortion: 'discounting the positive', flip: 'Some people genuinely care. Dismissing that doesn\'t protect me \u2014 it isolates me.' },
      { thought: 'I\'m fundamentally broken.', distortion: 'labeling', flip: 'I\'m a person having a difficult experience. Difficulty isn\'t deficiency.' },
      { thought: 'Feeling this way means I\'m weak.', distortion: 'emotional reasoning', flip: 'Feeling pain means I\'m human. Acknowledging it takes strength, not weakness.' },
      { thought: 'Things will never get better.', distortion: 'fortune telling', flip: 'I can\'t predict the future. What I can do is take one small step today.' },
      { thought: 'I should be able to handle this on my own.', distortion: 'should statement', flip: 'Interdependence is healthy. Even therapists have therapists.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_practice',    icon: '\uD83C\uDF1F', name: 'First Steps',          desc: 'Practice your first coping strategy' },
    { id: 'try_3_types',       icon: '\uD83C\uDF08', name: 'Variety Pack',          desc: 'Try strategies from 3 different types' },
    { id: 'try_all_types',     icon: '\uD83C\uDFC6', name: 'Full Spectrum',         desc: 'Try strategies from all 6 types' },
    { id: 'pmr_complete',      icon: '\uD83E\uDDD8', name: 'Muscle Master',         desc: 'Complete a full PMR exercise' },
    { id: 'thought_flip_5',    icon: '\uD83D\uDD04', name: 'Thought Turner',        desc: 'Flip 5 negative thoughts' },
    { id: 'i_statement_3',     icon: '\uD83D\uDDE3\uFE0F', name: 'Assertive Speaker', desc: 'Build 3 I-statements' },
    { id: 'calm_plan_built',   icon: '\uD83D\uDCCB', name: 'Plan Maker',            desc: 'Build your personal calm plan' },
    { id: 'practice_5',        icon: '\u2B50',       name: 'Dedicated Practicer',    desc: 'Log 5 strategy practices' },
    { id: 'practice_15',       icon: '\uD83D\uDD25', name: 'Coping Champion',        desc: 'Log 15 strategy practices' },
    { id: 'rate_3',            icon: '\uD83D\uDCCA', name: 'Self-Evaluator',         desc: 'Rate the effectiveness of 3 strategies' },
    { id: 'ai_match',          icon: '\u2728',       name: 'Smart Matcher',          desc: 'Use the AI Strategy Matcher' },
    { id: 'counting_complete', icon: '\uD83D\uDD22', name: 'Countdown Pro',          desc: 'Complete a calm counting exercise' },
    { id: 'explore_all',       icon: '\uD83D\uDD0D', name: 'Strategy Scholar',       desc: 'Read through all strategies in the library' },
    { id: 'breathing_3',       icon: '\uD83C\uDF2C\uFE0F', name: 'Deep Breather',    desc: 'Complete 3 guided breathing sessions' },
    { id: 'movement_3',        icon: '\uD83C\uDFC3', name: 'Moving & Grooving',      desc: 'Complete 3 guided movement sessions' },
    { id: 'fav_3',             icon: '\u2764\uFE0F', name: 'Strategy Fan',           desc: 'Mark 3 favorite strategies' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: '3-Day Streak',           desc: 'Practice 3 days in a row' },
    { id: 'streak_7',          icon: '\u26A1',       name: 'Week Warrior',           desc: 'Practice 7 days in a row' },
    { id: 'checkin_done',      icon: '\uD83C\uDF24\uFE0F', name: 'Self-Aware',       desc: 'Complete a daily coping check-in' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Guided Breathing Patterns ──
  // ══════════════════════════════════════════════════════════════
  var BREATH_PATTERNS = [
    { id: 'box',      name: 'Box Breathing',      inhale: 4, hold: 4, exhale: 4, holdOut: 4, cycles: 4, color: '#3b82f6', desc: 'Equal parts \u2014 calming and focusing' },
    { id: '478',      name: '4-7-8 Relaxation',   inhale: 4, hold: 7, exhale: 8, holdOut: 0, cycles: 3, color: '#8b5cf6', desc: 'Extended exhale for deep calm' },
    { id: 'belly',    name: 'Belly Breathing',     inhale: 4, hold: 1, exhale: 6, holdOut: 0, cycles: 5, color: '#22c55e', desc: 'Slow diaphragmatic breathing' },
    { id: 'triangle', name: 'Triangle Breathing',  inhale: 3, hold: 3, exhale: 3, holdOut: 0, cycles: 6, color: '#14b8a6', desc: 'Simple \u2014 great for beginners' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Guided Movement Exercises ──
  // ══════════════════════════════════════════════════════════════
  var MOVEMENT_EXERCISES = [
    {
      id: 'wall_pushups', icon: '\uD83E\uDDF1', name: 'Wall Push-Ups', color: '#ef4444',
      steps: {
        elementary: [
          { instruction: 'Stand facing a wall with your hands flat on it', timed: false },
          { instruction: 'Push as hard as you can!', timed: true, seconds: 10, label: 'Push!' },
          { instruction: 'Let go and let your arms hang \u2014 feel the difference!', timed: true, seconds: 5, label: 'Relax...' },
          { instruction: 'Shake out your hands', timed: true, seconds: 5, label: 'Shake!' },
          { instruction: 'Do it again! Push hard!', timed: true, seconds: 10, label: 'Push!' },
          { instruction: 'Release... feel the calm wash over you', timed: true, seconds: 5, label: 'Relax...' }
        ],
        middle: [
          { instruction: 'Stand arm\u2019s length from a wall, palms flat at shoulder height', timed: false },
          { instruction: 'Push firmly into the wall \u2014 notice the tension building', timed: true, seconds: 15, label: 'PUSH' },
          { instruction: 'Release! Drop your arms. Feel the contrast.', timed: true, seconds: 8, label: 'Release...' },
          { instruction: 'Take a slow breath', timed: true, seconds: 5, label: 'Breathe' },
          { instruction: 'Push again \u2014 even harder this time', timed: true, seconds: 15, label: 'PUSH' },
          { instruction: 'Release and notice the warmth in your muscles', timed: true, seconds: 8, label: 'Release...' },
          { instruction: 'One more round \u2014 push!', timed: true, seconds: 15, label: 'PUSH' },
          { instruction: 'Final release. Scan your body \u2014 how does it feel now?', timed: true, seconds: 10, label: 'Release...' }
        ],
        high: [
          { instruction: 'Position yourself arm\u2019s length from a wall, palms at shoulder height', timed: false },
          { instruction: 'Apply maximum isometric force, engaging your full upper body', timed: true, seconds: 20, label: 'TENSE' },
          { instruction: 'Release abruptly. Observe the proprioceptive feedback \u2014 warmth, tingling', timed: true, seconds: 10, label: 'Release' },
          { instruction: 'Pair a slow exhale with the relaxation', timed: true, seconds: 5, label: 'Breathe' },
          { instruction: 'Second round: maximum force', timed: true, seconds: 20, label: 'TENSE' },
          { instruction: 'Release. Notice the parasympathetic shift.', timed: true, seconds: 10, label: 'Release' },
          { instruction: 'Final round: full engagement', timed: true, seconds: 20, label: 'TENSE' },
          { instruction: 'Release. Full body scan. This is PMR in action.', timed: true, seconds: 15, label: 'Release' }
        ]
      }
    },
    {
      id: 'shake_it_off', icon: '\uD83D\uDD7A', name: 'Shake It Off', color: '#22c55e',
      steps: {
        elementary: [
          { instruction: 'Shake your hands really fast!', timed: true, seconds: 8, label: 'Shake!' },
          { instruction: 'Now shake your arms too!', timed: true, seconds: 8, label: 'Shake!' },
          { instruction: 'Shake your legs \u2014 stomp your feet!', timed: true, seconds: 8, label: 'Stomp!' },
          { instruction: 'Shake your WHOLE BODY like a wet dog!', timed: true, seconds: 10, label: 'SHAKE!' },
          { instruction: 'STOP! Stand very still. How does your body feel?', timed: true, seconds: 8, label: 'Still...' }
        ],
        middle: [
          { instruction: 'Start with your hands, shaking vigorously', timed: true, seconds: 10, label: 'Hands' },
          { instruction: 'Add your arms \u2014 let them flop and shake loosely', timed: true, seconds: 10, label: 'Arms' },
          { instruction: 'Bounce and shake your legs', timed: true, seconds: 10, label: 'Legs' },
          { instruction: 'Full body! No rules, just let it all go!', timed: true, seconds: 20, label: 'FULL BODY!' },
          { instruction: 'Stop completely. 3 slow breaths. Notice the shift.', timed: true, seconds: 15, label: 'Stillness' }
        ],
        high: [
          { instruction: 'Shake hands and feet \u2014 extremities first', timed: true, seconds: 15, label: 'Extremities' },
          { instruction: 'Engage larger groups: arms, legs, shoulders, torso', timed: true, seconds: 15, label: 'Full limbs' },
          { instruction: 'Allow shaking to become involuntary \u2014 your body knows what to release', timed: true, seconds: 20, label: 'Somatic' },
          { instruction: 'Full-body tremoring \u2014 this is TRE-inspired release', timed: true, seconds: 30, label: 'RELEASE' },
          { instruction: 'Stillness. Observe your internal state without judgment.', timed: true, seconds: 20, label: 'Parasympathetic rebound' }
        ]
      }
    },
    {
      id: 'cross_crawl', icon: '\u274C', name: 'Cross-Body Moves', color: '#3b82f6',
      steps: {
        elementary: [
          { instruction: 'Stand up with space around you!', timed: false },
          { instruction: 'Touch your RIGHT knee with your LEFT hand', timed: true, seconds: 2, label: '1' },
          { instruction: 'Touch your LEFT knee with your RIGHT hand', timed: true, seconds: 2, label: '2' },
          { instruction: 'Keep going! Right-left, left-right!', timed: true, seconds: 15, label: 'Keep going!' },
          { instruction: 'Great job! Pause and notice your focus.', timed: true, seconds: 5, label: 'Done!' }
        ],
        middle: [
          { instruction: 'Stand with feet shoulder-width apart', timed: false },
          { instruction: 'Right knee to left elbow \u2014 steady rhythm', timed: true, seconds: 15, label: 'Cross!' },
          { instruction: 'Left knee to right elbow \u2014 keep the pace', timed: true, seconds: 15, label: 'Cross!' },
          { instruction: 'Speed it up \u2014 20 total reps, steady rhythm', timed: true, seconds: 20, label: 'Faster!' },
          { instruction: 'Stand still. Notice your focus and clarity.', timed: true, seconds: 8, label: 'Notice' }
        ],
        high: [
          { instruction: 'Standing, prepare for bilateral integration', timed: false },
          { instruction: 'Right knee to left elbow, controlled cross-lateral pattern', timed: true, seconds: 20, label: 'Cross-lateral' },
          { instruction: 'Alternate: left knee to right elbow, maintain pace', timed: true, seconds: 20, label: 'Alternate' },
          { instruction: 'Challenge: count backwards by 3s from 30 while moving', timed: true, seconds: 25, label: 'Dual-task' },
          { instruction: 'Stillness. The corpus callosum has been activated.', timed: true, seconds: 10, label: 'Integration' }
        ]
      }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Daily Check-In Moods ──
  // ══════════════════════════════════════════════════════════════
  var CHECKIN_MOODS = [
    { id: 'great',     emoji: '\uD83D\uDE04', label: 'Great',       zone: 'green',  color: '#22c55e' },
    { id: 'okay',      emoji: '\uD83D\uDE42', label: 'Okay',        zone: 'green',  color: '#86efac' },
    { id: 'meh',       emoji: '\uD83D\uDE10', label: 'Meh',         zone: 'blue',   color: '#3b82f6' },
    { id: 'stressed',  emoji: '\uD83D\uDE1F', label: 'Stressed',    zone: 'yellow', color: '#eab308' },
    { id: 'upset',     emoji: '\uD83D\uDE21', label: 'Upset',       zone: 'red',    color: '#ef4444' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Breathing & Movement Timers (closure-scoped) ──
  // ══════════════════════════════════════════════════════════════
  var _breathTimerId = null;
  function stopBreathTimer() { if (_breathTimerId) { clearInterval(_breathTimerId); _breathTimerId = null; } }

  var _moveTimerId = null;
  function stopMoveTimer() { if (_moveTimerId) { clearInterval(_moveTimerId); _moveTimerId = null; } }

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('coping', {
    icon: '\uD83E\uDDE8',
    label: 'Coping Toolkit',
    desc: 'Explore and practice coping strategies \u2014 breathing, grounding, movement, and more.',
    color: 'teal',
    category: 'self-management',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
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
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.coping) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('coping', key); }
        else { if (ctx.update) ctx.update('coping', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'library';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Library state
      var selectedType    = d.selectedType || null;    // filter by strategy type
      var expandedStrat   = d.expandedStrat || null;   // which strategy is expanded
      var viewedStrats    = d.viewedStrats || {};       // track which have been read

      // Practice mode state
      var practiceMode    = d.practiceMode || null;     // 'pmr', 'thought_flip', 'i_statement', 'calm_counting', 'self_talk'
      // PMR
      var pmrStep         = d.pmrStep || 0;
      var pmrPhase        = d.pmrPhase || 'tense';     // 'tense' or 'release'
      var pmrComplete     = d.pmrComplete || 0;
      // Thought Flipper
      var tfIdx           = d.tfIdx || 0;
      var tfRevealed      = d.tfRevealed || false;
      var tfCustomThought = d.tfCustomThought || '';
      var tfCustomFlip    = d.tfCustomFlip || null;
      var tfFlipCount     = d.tfFlipCount || 0;
      // I-Statement
      var iFeeling        = d.iFeeling || '';
      var iSituation      = d.iSituation || '';
      var iReason         = d.iReason || '';
      var iNeed           = d.iNeed || '';
      var iHistory        = d.iHistory || [];
      // Calm Counting
      var countFrom       = d.countFrom || (band === 'elementary' ? 10 : band === 'middle' ? 20 : 50);
      var countCurrent    = d.countCurrent != null ? d.countCurrent : null;
      var countActive     = d.countActive || false;
      var countComplete   = d.countComplete || 0;
      // Self-talk
      var stInput         = d.stInput || '';
      var stGenerated     = d.stGenerated || null;
      var stLoading       = d.stLoading || false;
      var stSaved         = d.stSaved || [];

      // Calm Plan state
      var calmPlan        = d.calmPlan || { steps: [], trustedAdults: [], warningsSigns: [] };
      var planEditing     = d.planEditing || false;

      // AI Matcher state
      var matcherFeeling  = d.matcherFeeling || '';
      var matcherResult   = d.matcherResult || null;
      var matcherLoading  = d.matcherLoading || false;

      // Practice log state
      var practiceLog     = d.practiceLog || []; // { strategyId, type, timestamp, rating, note }

      // Badge state
      var earnedBadges    = d.earnedBadges || {};
      var showBadgePopup  = d.showBadgePopup || null;
      var showBadgesPanel = d.showBadgesPanel || false;

      // Favorites
      var favorites = d.favorites || {};

      // Breathing practice state
      var breathPatternIdx = d.breathPatternIdx || 0;
      var breathPhase      = d.breathPhase || null;
      var breathTimeLeft   = d.breathTimeLeft != null ? d.breathTimeLeft : 0;
      var breathCycle      = d.breathCycle || 0;
      var breathActive     = d.breathActive || false;
      var breathSessions   = d.breathSessions || 0;

      // Movement practice state
      var moveExIdx        = d.moveExIdx || 0;
      var moveStep         = d.moveStep || 0;
      var moveTimeLeft     = d.moveTimeLeft != null ? d.moveTimeLeft : null;
      var moveActive       = d.moveActive || false;
      var moveSessions     = d.moveSessions || 0;

      // Daily check-in state
      var dailyMood        = d.dailyMood || null;
      var dailyMoodDate    = d.dailyMoodDate || null;
      var dailyRec         = d.dailyRec || null;
      var dailyRecLoading  = d.dailyRecLoading || false;

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

      // ── Log a practice ──
      function logPractice(strategyId, stratType) {
        var entry = { strategyId: strategyId, type: stratType, timestamp: Date.now(), rating: null, note: '' };
        var newLog = (practiceLog || []).concat([entry]);
        upd('practiceLog', newLog);
        awardXP(10);
        tryAwardBadge('first_practice');
        if (newLog.length >= 5) tryAwardBadge('practice_5');
        if (newLog.length >= 15) tryAwardBadge('practice_15');
        // Check type variety
        var typesUsed = {};
        newLog.forEach(function(e) { typesUsed[e.type] = true; });
        if (Object.keys(typesUsed).length >= 3) tryAwardBadge('try_3_types');
        if (Object.keys(typesUsed).length >= 6) tryAwardBadge('try_all_types');
        // Streak check
        var streak = computeStreak(newLog);
        if (streak >= 3) tryAwardBadge('streak_3');
        if (streak >= 7) tryAwardBadge('streak_7');
      }

      function readAloud(text) {
        if (callTTS && band === 'elementary') callTTS(text);
      }

      // ── Streak computation ──
      function computeStreak(log) {
        if (!log || log.length === 0) return 0;
        var daySet = {};
        log.forEach(function(e) {
          var dt = new Date(e.timestamp);
          daySet[dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate()] = true;
        });
        var today = new Date();
        var check = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var streak = 0;
        for (var i = 0; i < 365; i++) {
          var key = check.getFullYear() + '-' + (check.getMonth() + 1) + '-' + check.getDate();
          if (daySet[key]) { streak++; check.setDate(check.getDate() - 1); }
          else if (i === 0) { check.setDate(check.getDate() - 1); }
          else break;
        }
        return streak;
      }

      function getMostEffective(log) {
        if (!log || log.length === 0) return null;
        var ratings = {}; var counts = {};
        log.forEach(function(e) {
          if (e.rating) {
            ratings[e.strategyId] = (ratings[e.strategyId] || 0) + e.rating;
            counts[e.strategyId] = (counts[e.strategyId] || 0) + 1;
          }
        });
        var best = null; var bestAvg = 0;
        Object.keys(ratings).forEach(function(id) {
          var avg = ratings[id] / counts[id];
          if (avg > bestAvg) { bestAvg = avg; best = id; }
        });
        return best ? { id: best, avg: Math.round(bestAvg * 10) / 10 } : null;
      }

      // ── Favorite toggle ──
      function toggleFav(stratId) {
        var newFavs = Object.assign({}, favorites);
        if (newFavs[stratId]) delete newFavs[stratId];
        else { newFavs[stratId] = true; if (soundEnabled) sfxClick(); }
        upd('favorites', newFavs);
        if (Object.keys(newFavs).length >= 3) tryAwardBadge('fav_3');
      }

      // ── Today check for daily check-in ──
      var todayStr = new Date().toDateString();
      var checkinDoneToday = dailyMoodDate === todayStr;

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'library',  label: '\uD83D\uDCDA Library' },
        { id: 'practice', label: '\uD83C\uDFAF Practice' },
        { id: 'plan',     label: '\uD83D\uDCCB My Calm Plan' },
        { id: 'matcher',  label: '\u2728 Matcher' },
        { id: 'log',      label: '\uD83D\uDCCA Practice Log' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Coping Skills tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', { 'aria-label': tab.label,
            key: tab.id,
            role: 'tab', 'aria-selected': isActive,
            onClick: function() { if (tab.id !== 'practice') { stopBreathTimer(); stopMoveTimer(); } upd({ activeTab: tab.id, practiceMode: tab.id !== 'practice' ? null : d.practiceMode }); if (soundEnabled) sfxClick(); },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#14b8a6' : 'transparent',
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
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#14b8a633' : 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
        }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length)
      );

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
            h('div', {               style: { background: 'linear-gradient(135deg, #042f2e 0%, #134e4a 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid #14b8a6', maxWidth: 320 },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, popBadge.icon),
              h('p', { style: { fontSize: 11, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Badge Earned!'),
              h('h3', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 20 } }, popBadge.name),
              h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 13 } }, popBadge.desc),
              h('p', { style: { margin: '12px 0 0 0', color: '#14b8a6', fontSize: 12, fontWeight: 700 } }, '+25 XP')
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
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#042f2e' : '#1e293b', border: '1px solid ' + (earned ? '#14b8a6' : '#334155'), opacity: earned ? 1 : 0.4 }
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
      // ── TAB: Library ──
      // ══════════════════════════════════════════════════════════
      var libraryContent = null;
      if (activeTab === 'library') {
        var filteredStrats = selectedType === '_fav' ? STRATEGIES.filter(function(s) { return favorites[s.id]; }) :
          selectedType ? STRATEGIES.filter(function(s) { return s.type === selectedType; }) : STRATEGIES;

        libraryContent = h('div', { style: { padding: 20 } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? 'Ways to Feel Better!' : 'Coping Strategy Library'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            band === 'elementary' ? 'Tap a card to learn more. Try the ones with a star!' :
            'Browse strategies by type. Expand to see step-by-step instructions.'
          ),

          // Type filter chips
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 } },
            h('button', { 'aria-label': 'All',
              onClick: function() { upd('selectedType', null); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: 20, border: selectedType === null ? '2px solid #14b8a6' : '1px solid #334155',
                background: selectedType === null ? '#14b8a622' : '#1e293b', color: selectedType === null ? '#5eead4' : '#94a3b8',
                cursor: 'pointer', fontWeight: selectedType === null ? 700 : 500, fontSize: 12
              }
            }, 'All'),
            Object.keys(favorites).length > 0 && h('button', { 'aria-label': 'Favorites ( )',
              onClick: function() { upd('selectedType', selectedType === '_fav' ? null : '_fav'); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: 20, border: selectedType === '_fav' ? '2px solid #ef4444' : '1px solid #334155',
                background: selectedType === '_fav' ? '#ef444422' : '#1e293b', color: selectedType === '_fav' ? '#ef4444' : '#94a3b8',
                cursor: 'pointer', fontWeight: selectedType === '_fav' ? 700 : 500, fontSize: 12
              }
            }, '\u2764\uFE0F Favorites (' + Object.keys(favorites).length + ')'),
            STRATEGY_TYPES.map(function(type) {
              var isActive = selectedType === type.id;
              return h('button', { 'aria-label': 'Toggle sound',
                key: type.id,
                onClick: function() { upd('selectedType', isActive ? null : type.id); if (soundEnabled) sfxClick(); },
                style: {
                  padding: '6px 14px', borderRadius: 20, border: isActive ? '2px solid ' + type.color : '1px solid #334155',
                  background: isActive ? type.color + '22' : '#1e293b', color: isActive ? type.color : '#94a3b8',
                  cursor: 'pointer', fontWeight: isActive ? 700 : 500, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                }
              }, h('span', null, type.icon), type.label);
            })
          ),

          // Strategy cards
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            filteredStrats.map(function(strat) {
              var typeObj = STRATEGY_TYPES.find(function(t) { return t.id === strat.type; });
              var isExpanded = expandedStrat === strat.id;
              var steps = strat.steps[band] || strat.steps.elementary;
              var wasViewed = viewedStrats[strat.id];
              var zoneColors = { blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', red: '#ef4444' };

              return h('div', {                 key: strat.id,
                style: { borderRadius: 14, border: '1px solid ' + (typeObj ? typeObj.color + '44' : '#334155'), background: '#1e293b', overflow: 'hidden' }
              },
                // Header (always visible)
                h('button', { 'aria-label': 'Toggle sound',
                  onClick: function() {
                    var newExpanded = isExpanded ? null : strat.id;
                    var newViewed = Object.assign({}, viewedStrats);
                    if (strat.id) newViewed[strat.id] = true;
                    upd({ expandedStrat: newExpanded, viewedStrats: newViewed });
                    if (soundEnabled) sfxClick();
                    // Check if all viewed
                    if (Object.keys(newViewed).length >= STRATEGIES.length) tryAwardBadge('explore_all');
                  },
                  style: {
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%',
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#f1f5f9'
                  }
                },
                  h('span', { style: { fontSize: 24, flexShrink: 0 } }, strat.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                      h('span', { style: { fontWeight: 700, fontSize: 14 } }, strat.name[band] || strat.name.elementary),
                      strat.practiceable && h('span', { style: { fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#14b8a622', color: '#14b8a6', fontWeight: 600 } }, 'Interactive'),
                      wasViewed && h('span', { style: { fontSize: 10, color: '#94a3b8' } }, '\u2713')
                    ),
                    h('p', { style: { margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3 } }, strat.desc[band] || strat.desc.elementary)
                  ),
                  h('span', { style: { color: '#94a3b8', fontSize: 16, flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' } }, '\u25BC')
                ),
                // Expanded content
                isExpanded && h('div', { style: { padding: '0 16px 16px', borderTop: '1px solid #334155' } },
                  // Best-for zones
                  h('div', { style: { display: 'flex', gap: 6, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 11, color: '#94a3b8', marginRight: 4 } }, 'Best for:'),
                    strat.bestFor.map(function(zoneId) {
                      return h('span', { key: zoneId, style: { fontSize: 10, padding: '2px 8px', borderRadius: 6, background: (zoneColors[zoneId] || '#94a3b8') + '22', color: zoneColors[zoneId] || '#94a3b8', fontWeight: 600 } },
                        zoneId.charAt(0).toUpperCase() + zoneId.slice(1) + ' Zone'
                      );
                    }),
                    h('span', { style: { fontSize: 10, padding: '2px 8px', borderRadius: 6, background: (typeObj ? typeObj.color : '#94a3b8') + '22', color: typeObj ? typeObj.color : '#94a3b8' } }, typeObj ? typeObj.label : strat.type)
                  ),
                  // Steps
                  h('div', { style: { marginBottom: 12 } },
                    h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, 'How to do it:'),
                    h('ol', { style: { margin: 0, paddingLeft: 20 } },
                      steps.map(function(step, i) {
                        return h('li', { key: i, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 6, lineHeight: 1.5 } }, step);
                      })
                    )
                  ),
                  // Read aloud (elementary)
                  band === 'elementary' && callTTS && h('button', { 'aria-label': 'Read Aloud',
                    onClick: function() { readAloud(strat.name.elementary + '. ' + steps.join('. ')); },
                    style: { marginBottom: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }
                  }, '\uD83D\uDD0A Read Aloud'),
                  // Practice button (if practiceable)
                  strat.practiceable && h('button', { 'aria-label': 'Practice This Strategy',
                    onClick: function() {
                      var modeMap = {
                        'thought_flip': 'thought_flip', 'positive_self_talk': 'self_talk', 'calm_counting': 'calm_counting', 'i_statement': 'i_statement',
                        'belly_breathing': 'breathing', 'smell_flower_candle': 'breathing',
                        'wall_pushups': 'movement', 'shake_it_off': 'movement', 'cross_crawl': 'movement'
                      };
                      var mode = modeMap[strat.id] || 'pmr';
                      upd({ activeTab: 'practice', practiceMode: mode });
                      if (soundEnabled) sfxClick();
                    },
                    style: {
                      width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                      background: '#14b8a6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                    }
                  }, '\uD83C\uDFAF Practice This Strategy'),
                  // Log it + Favorite
                  h('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
                    h('button', { 'aria-label': 'Log it',
                      onClick: function() {
                        logPractice(strat.id, strat.type);
                        addToast('Logged to your practice history!', 'success');
                        if (soundEnabled) sfxCorrect();
                      },
                      style: {
                        flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #334155',
                        background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer'
                      }
                    }, '\uD83D\uDCDD Log it'),
                    h('button', { 'aria-label': favorites[strat.id] ? '\u2764\uFE0F' : '\u2661',
                      onClick: function(e) { e.stopPropagation(); toggleFav(strat.id); },
                      style: {
                        padding: '8px 14px', borderRadius: 8, border: '1px solid #334155',
                        background: favorites[strat.id] ? '#ef444418' : 'transparent',
                        color: favorites[strat.id] ? '#ef4444' : '#94a3b8', fontSize: 14, cursor: 'pointer'
                      }
                    }, favorites[strat.id] ? '\u2764\uFE0F' : '\u2661')
                  )
                )
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Practice ──
      // ══════════════════════════════════════════════════════════
      var practiceContent = null;
      if (activeTab === 'practice') {

        // ── Practice Mode Selector (no mode chosen yet) ──
        if (!practiceMode) {
          practiceContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? 'Let\'s Practice!' : 'Interactive Practice'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              'Choose a guided activity to practice'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
              [
                { id: 'breathing', icon: '\uD83C\uDF2C\uFE0F', title: 'Guided Breathing', desc: 'Follow animated breathing patterns to calm your body', color: '#3b82f6' },
                { id: 'pmr', icon: '\uD83E\uDDD8', title: 'Progressive Muscle Relaxation', desc: 'Tense and release muscle groups to melt away stress', color: '#22c55e' },
                { id: 'movement', icon: '\uD83C\uDFC3', title: 'Guided Movement', desc: 'Follow step-by-step movement exercises with timers', color: '#ef4444' },
                { id: 'thought_flip', icon: '\uD83D\uDD04', title: 'Thought Flipper', desc: 'Turn negative thoughts into balanced, helpful ones', color: '#8b5cf6' },
                { id: 'i_statement', icon: '\uD83D\uDDE3\uFE0F', title: 'I-Statement Builder', desc: 'Practice expressing feelings assertively', color: '#f97316' },
                { id: 'calm_counting', icon: '\uD83D\uDD22', title: 'Calm Counting', desc: 'Count backwards to engage your thinking brain', color: '#3b82f6' },
                { id: 'self_talk', icon: '\uD83D\uDCAC', title: 'Positive Self-Talk Generator', desc: 'Turn harsh inner critic into a supportive inner coach', color: '#ec4899' }
              ].map(function(mode) {
                return h('button', { 'aria-label': mode.icon,
                  key: mode.id,
                  onClick: function() { upd('practiceMode', mode.id); if (soundEnabled) sfxClick(); },
                  style: {
                    display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 14,
                    border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'left'
                  },
                  onMouseEnter: function(e) { e.currentTarget.style.borderColor = mode.color; },
                  onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#334155'; }
                },
                  h('span', { style: { fontSize: 32 } }, mode.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 2 } }, mode.title),
                    h('div', { style: { fontSize: 12, color: '#94a3b8' } }, mode.desc)
                  )
                );
              })
            )
          );
        }

        // ── PMR Mode ──
        if (practiceMode === 'pmr') {
          var group = PMR_GROUPS[pmrStep];
          var isLastGroup = pmrStep >= PMR_GROUPS.length - 1;
          var pmrDone = pmrStep >= PMR_GROUPS.length;

          practiceContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, 'Progressive Muscle Relaxation'),
            !pmrDone && h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 8 } },
              'Muscle group ' + (pmrStep + 1) + ' of ' + PMR_GROUPS.length
            ),
            // Progress bar
            h('div', { style: { height: 4, borderRadius: 2, background: '#1e293b', marginBottom: 24, overflow: 'hidden' } },
              h('div', { style: { height: '100%', width: ((pmrDone ? PMR_GROUPS.length : pmrStep) / PMR_GROUPS.length * 100) + '%', background: '#14b8a6', transition: 'width 0.3s' } })
            ),

            !pmrDone ? h('div', null,
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, group.emoji),
              h('h4', { style: { color: '#f1f5f9', fontSize: 20, marginBottom: 16 } }, group.name),
              // Phase display
              h('div', {
                style: {
                  padding: 24, borderRadius: 16, marginBottom: 20,
                  background: pmrPhase === 'tense' ? '#ef444418' : '#22c55e18',
                  border: '2px solid ' + (pmrPhase === 'tense' ? '#ef444444' : '#22c55e44')
                }
              },
                h('p', { style: { fontSize: 13, fontWeight: 700, color: pmrPhase === 'tense' ? '#ef4444' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
                  pmrPhase === 'tense' ? '\uD83D\uDCA5 Tense!' : '\uD83C\uDF3F Release...'
                ),
                h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6 } },
                  pmrPhase === 'tense'
                    ? (group.tense[band] || group.tense.elementary)
                    : (group.release[band] || group.release.elementary)
                ),
                h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 8 } },
                  pmrPhase === 'tense' ? 'Hold for 5-10 seconds...' : 'Notice the difference. Enjoy the relaxation.'
                )
              ),
              // Controls
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                pmrPhase === 'tense' && h('button', { 'aria-label': 'Release',
                  onClick: function() {
                    upd('pmrPhase', 'release');
                    if (soundEnabled) sfxRelease();
                  },
                  style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                }, '\uD83C\uDF3F Release'),
                pmrPhase === 'release' && h('button', { 'aria-label': 'Back',
                  onClick: function() {
                    if (isLastGroup) {
                      upd({ pmrStep: PMR_GROUPS.length, pmrPhase: 'tense', pmrComplete: pmrComplete + 1 });
                      tryAwardBadge('pmr_complete');
                      logPractice('pmr', 'movement');
                      celebrate();
                      if (soundEnabled) sfxCorrect();
                    } else {
                      upd({ pmrStep: pmrStep + 1, pmrPhase: 'tense' });
                      if (soundEnabled) sfxTense();
                    }
                  },
                  style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                }, isLastGroup ? '\u2705 Finish' : 'Next Muscle Group \u2192'),
                h('button', { 'aria-label': 'Back',
                  onClick: function() { upd({ practiceMode: null, pmrStep: 0, pmrPhase: 'tense' }); },
                  style: { padding: '12px 20px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
                }, '\u2190 Back')
              )
            ) : h('div', { style: { padding: 30 } },
              h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83C\uDF1F'),
              h('p', { style: { fontWeight: 700, color: '#22c55e', fontSize: 18, marginBottom: 8 } },
                band === 'elementary' ? 'You did it! Your body should feel like jelly!' : 'PMR Complete!'
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 20 } },
                band === 'elementary' ? 'Notice how relaxed your body feels now.' :
                'Scan your body. Notice the warmth, heaviness, and relaxation. This is your parasympathetic nervous system at work.'
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 12 } }, 'Sessions completed: ' + (pmrComplete + 1)),
              h('button', { 'aria-label': 'Back to Practice Menu',
                onClick: function() { upd({ practiceMode: null, pmrStep: 0, pmrPhase: 'tense' }); },
                style: { marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, cursor: 'pointer' }
              }, '\u2190 Back to Practice Menu')
            )
          );
        }

        // ── Guided Breathing Mode ──
        if (practiceMode === 'breathing') {
          var bp = BREATH_PATTERNS[breathPatternIdx] || BREATH_PATTERNS[0];
          var phaseLabels = { inhale: 'Breathe In...', hold: 'Hold...', exhale: 'Breathe Out...', holdOut: 'Hold...' };
          var phaseColors = { inhale: '#22c55e', hold: '#eab308', exhale: '#3b82f6', holdOut: '#8b5cf6' };
          var circleScale = breathPhase === 'inhale' ? 1.0 : breathPhase === 'hold' ? 1.0 : breathPhase === 'exhale' ? 0.5 : breathPhase === 'holdOut' ? 0.5 : 0.7;
          var phaseTime = breathPhase === 'inhale' ? bp.inhale : breathPhase === 'hold' ? bp.hold : breathPhase === 'exhale' ? bp.exhale : breathPhase === 'holdOut' ? bp.holdOut : 0;

          practiceContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83C\uDF2C\uFE0F Guided Breathing'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Follow the circle and breathe along!' : 'Select a pattern and follow the visual guide'
            ),

            // Pattern selector (only when not active)
            !breathActive && breathPhase !== 'done' && h('div', { style: { marginBottom: 24 } },
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
                BREATH_PATTERNS.map(function(pat, idx) {
                  var isSel = breathPatternIdx === idx;
                  return h('button', { 'aria-label': pat.name,
                    key: pat.id,
                    onClick: function() { upd('breathPatternIdx', idx); if (soundEnabled) sfxClick(); },
                    style: {
                      padding: 14, borderRadius: 12, textAlign: 'left',
                      border: isSel ? '2px solid ' + pat.color : '1px solid #334155',
                      background: isSel ? pat.color + '18' : '#1e293b', cursor: 'pointer'
                    }
                  },
                    h('div', { style: { fontWeight: 700, color: isSel ? pat.color : '#f1f5f9', fontSize: 13, marginBottom: 2 } }, pat.name),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, pat.desc),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4 } },
                      pat.inhale + 's in / ' + (pat.hold > 0 ? pat.hold + 's hold / ' : '') + pat.exhale + 's out' + (pat.holdOut > 0 ? ' / ' + pat.holdOut + 's hold' : '') + ' \u00D7 ' + pat.cycles
                    )
                  );
                })
              ),
              h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  stopBreathTimer();
                  var pat = BREATH_PATTERNS[breathPatternIdx] || BREATH_PATTERNS[0];
                  upd({ breathActive: true, breathPhase: 'inhale', breathTimeLeft: pat.inhale, breathCycle: 1 });
                  if (soundEnabled) sfxCalm();
                  // Build phase sequence
                  var phases = [{ name: 'inhale', dur: pat.inhale }];
                  if (pat.hold > 0) phases.push({ name: 'hold', dur: pat.hold });
                  phases.push({ name: 'exhale', dur: pat.exhale });
                  if (pat.holdOut > 0) phases.push({ name: 'holdOut', dur: pat.holdOut });
                  var phaseIdx = 0; var cycle = 0; var timeLeft = pat.inhale;
                  _breathTimerId = setInterval(function() {
                    timeLeft--;
                    if (timeLeft > 0) {
                      upd('breathTimeLeft', timeLeft);
                    } else {
                      phaseIdx++;
                      if (phaseIdx >= phases.length) { phaseIdx = 0; cycle++; }
                      if (cycle >= pat.cycles) {
                        stopBreathTimer();
                        var ns = (d.breathSessions || 0) + 1;
                        upd({ breathPhase: 'done', breathActive: false, breathCycle: cycle, breathSessions: ns });
                        logPractice('breathing', 'breathing');
                        if (ns >= 3) tryAwardBadge('breathing_3');
                        celebrate();
                        if (soundEnabled) sfxCorrect();
                        return;
                      }
                      var nextPhase = phases[phaseIdx];
                      upd({ breathPhase: nextPhase.name, breathTimeLeft: nextPhase.dur, breathCycle: cycle + 1 });
                      if (soundEnabled && nextPhase.name === 'inhale') playTone(396, 0.3, 'sine', 0.03);
                      if (soundEnabled && nextPhase.name === 'exhale') playTone(330, 0.3, 'sine', 0.03);
                      timeLeft = nextPhase.dur;
                    }
                  }, 1000);
                },
                style: { padding: '14px 40px', borderRadius: 12, border: 'none', background: bp.color, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
              }, 'Start Breathing')
            ),

            // Active breathing display
            breathActive && h('div', null,
              h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 4 } },
                'Cycle ' + breathCycle + ' of ' + bp.cycles + ' \u2022 ' + bp.name
              ),
              // Animated circle
              h('div', { style: { position: 'relative', width: 200, height: 200, margin: '0 auto 20px' } },
                h('div', {
                  style: {
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: (phaseColors[breathPhase] || '#14b8a6') + '15',
                    border: '3px solid ' + (phaseColors[breathPhase] || '#14b8a6'),
                    transform: 'scale(' + circleScale + ')',
                    transition: 'transform ' + phaseTime + 's ease-in-out, border-color 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }
                },
                  h('div', { style: { textAlign: 'center' } },
                    h('div', { style: { fontSize: 36, fontWeight: 800, color: phaseColors[breathPhase] || '#14b8a6' } }, breathTimeLeft),
                    h('div', { style: { fontSize: 14, fontWeight: 600, color: phaseColors[breathPhase] || '#14b8a6', marginTop: 4 } }, phaseLabels[breathPhase] || '')
                  )
                )
              ),
              h('button', { 'aria-label': 'Stop',
                onClick: function() { stopBreathTimer(); upd({ breathActive: false, breathPhase: null }); },
                style: { padding: '10px 24px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
              }, 'Stop')
            ),

            // Done state
            breathPhase === 'done' && !breathActive && h('div', { style: { padding: 30 } },
              h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83C\uDF1F'),
              h('p', { style: { fontWeight: 700, color: '#22c55e', fontSize: 18, marginBottom: 8 } },
                band === 'elementary' ? 'Amazing breathing!' : 'Breathing session complete!'
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 12 } },
                band === 'elementary' ? 'Your body is so calm right now. Nice job!' :
                'Notice how your body feels. Your heart rate has slowed and your nervous system is calmer.'
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 12 } }, 'Total sessions: ' + breathSessions),
              h('button', { 'aria-label': 'Try Another Pattern',
                onClick: function() { upd({ breathPhase: null }); },
                style: { marginTop: 12, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, cursor: 'pointer' }
              }, 'Try Another Pattern')
            ),

            h('div', { style: { marginTop: 20 } },
              h('button', { 'aria-label': 'Back to Practice Menu',
                onClick: function() { stopBreathTimer(); upd({ practiceMode: null, breathActive: false, breathPhase: null }); },
                style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
              }, '\u2190 Back to Practice Menu')
            )
          );
        }

        // ── Guided Movement Mode ──
        if (practiceMode === 'movement') {
          var exercise = MOVEMENT_EXERCISES[moveExIdx] || MOVEMENT_EXERCISES[0];
          var exSteps = exercise.steps[band] || exercise.steps.elementary;
          var curStep = exSteps[moveStep] || exSteps[0];
          var isLastMoveStep = moveStep >= exSteps.length - 1;
          var moveDone = moveStep >= exSteps.length;

          practiceContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83C\uDFC3 Guided Movement'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Move your body to feel better!' : 'Follow the guided movement exercise'
            ),

            // Exercise selector (only before starting)
            !moveActive && !moveDone && h('div', { style: { marginBottom: 20 } },
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
                MOVEMENT_EXERCISES.map(function(ex, idx) {
                  var isSel = moveExIdx === idx;
                  return h('button', { 'aria-label': ex.icon,
                    key: ex.id,
                    onClick: function() { upd('moveExIdx', idx); if (soundEnabled) sfxClick(); },
                    style: {
                      display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, textAlign: 'left',
                      border: isSel ? '2px solid ' + ex.color : '1px solid #334155',
                      background: isSel ? ex.color + '18' : '#1e293b', cursor: 'pointer'
                    }
                  },
                    h('span', { style: { fontSize: 28 } }, ex.icon),
                    h('div', null,
                      h('div', { style: { fontWeight: 700, color: isSel ? ex.color : '#f1f5f9', fontSize: 14 } }, ex.name),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, (ex.steps[band] || ex.steps.elementary).length + ' steps')
                    )
                  );
                })
              ),
              h('button', { 'aria-label': 'Start Exercise',
                onClick: function() { upd({ moveActive: true, moveStep: 0, moveTimeLeft: null }); if (soundEnabled) sfxClick(); },
                style: { padding: '14px 40px', borderRadius: 12, border: 'none', background: exercise.color, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
              }, 'Start Exercise')
            ),

            // Active movement display
            moveActive && !moveDone && h('div', null,
              h('div', { style: { height: 4, borderRadius: 2, background: '#1e293b', marginBottom: 16, overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: ((moveStep + 1) / exSteps.length * 100) + '%', background: exercise.color, transition: 'width 0.3s' } })
              ),
              h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8 } }, exercise.icon + ' ' + exercise.name + ' \u2022 Step ' + (moveStep + 1) + '/' + exSteps.length),

              h('div', {
                style: {
                  padding: 28, borderRadius: 16, marginBottom: 20,
                  background: exercise.color + '15', border: '2px solid ' + exercise.color + '44'
                }
              },
                curStep.timed && curStep.label && h('p', { style: { fontSize: 11, fontWeight: 700, color: exercise.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, curStep.label),
                h('p', { style: { fontSize: 16, color: '#f1f5f9', lineHeight: 1.6, fontWeight: 500 } }, curStep.instruction),
                curStep.timed && moveTimeLeft !== null && moveTimeLeft > 0 && h('div', { style: { marginTop: 16 } },
                  h('div', { style: { fontSize: 40, fontWeight: 800, color: exercise.color } }, moveTimeLeft),
                  h('div', { style: { height: 4, borderRadius: 2, background: '#1e293b33', marginTop: 8, overflow: 'hidden' } },
                    h('div', { style: { height: '100%', width: (moveTimeLeft / curStep.seconds * 100) + '%', background: exercise.color, transition: 'width 1s linear' } })
                  )
                ),
                curStep.timed && moveTimeLeft === 0 && h('p', { style: { marginTop: 12, fontSize: 14, fontWeight: 700, color: '#22c55e' } }, '\u2705 Done!')
              ),

              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                curStep.timed && moveTimeLeft === null && h('button', { 'aria-label': 'Start Timer',
                  onClick: function() {
                    upd('moveTimeLeft', curStep.seconds);
                    if (soundEnabled) sfxTense();
                    stopMoveTimer();
                    var tl = curStep.seconds;
                    _moveTimerId = setInterval(function() {
                      tl--;
                      if (tl >= 0) upd('moveTimeLeft', tl);
                      if (tl <= 0) { stopMoveTimer(); if (soundEnabled) sfxRelease(); }
                    }, 1000);
                  },
                  style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: exercise.color, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                }, '\u25B6 Start Timer'),
                (!curStep.timed || moveTimeLeft === 0) && h('button', { 'aria-label': 'Back',
                  onClick: function() {
                    stopMoveTimer();
                    if (isLastMoveStep) {
                      var ns = (d.moveSessions || 0) + 1;
                      upd({ moveStep: exSteps.length, moveActive: false, moveTimeLeft: null, moveSessions: ns });
                      logPractice(exercise.id, 'movement');
                      if (ns >= 3) tryAwardBadge('movement_3');
                      celebrate();
                      if (soundEnabled) sfxCorrect();
                    } else {
                      upd({ moveStep: moveStep + 1, moveTimeLeft: null });
                      if (soundEnabled) sfxClick();
                    }
                  },
                  style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: isLastMoveStep ? '#22c55e' : '#14b8a6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                }, isLastMoveStep ? '\u2705 Finish!' : 'Next Step \u2192'),
                h('button', { 'aria-label': 'Back',
                  onClick: function() { stopMoveTimer(); upd({ moveActive: false, moveStep: 0, moveTimeLeft: null }); },
                  style: { padding: '12px 20px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
                }, '\u2190 Back')
              )
            ),

            // Done state
            moveDone && h('div', { style: { padding: 30 } },
              h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83C\uDF1F'),
              h('p', { style: { fontWeight: 700, color: '#22c55e', fontSize: 18, marginBottom: 8 } },
                band === 'elementary' ? 'You moved your body! Great job!' : 'Exercise complete!'
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 12 } },
                band === 'elementary' ? 'Notice how your body feels different now!' :
                'Your body has released physical tension. Notice the shift in your energy and focus.'
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 12 } }, 'Sessions completed: ' + moveSessions),
              h('button', { 'aria-label': 'Try Another Exercise',
                onClick: function() { upd({ moveStep: 0, moveActive: false, moveTimeLeft: null }); },
                style: { marginTop: 12, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, cursor: 'pointer' }
              }, 'Try Another Exercise')
            ),

            h('div', { style: { marginTop: 20 } },
              h('button', { 'aria-label': 'Back to Practice Menu',
                onClick: function() { stopMoveTimer(); upd({ practiceMode: null, moveActive: false, moveStep: 0, moveTimeLeft: null }); },
                style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
              }, '\u2190 Back to Practice Menu')
            )
          );
        }

        // ── Thought Flipper Mode ──
        if (practiceMode === 'thought_flip') {
          var thoughts = NEGATIVE_THOUGHTS[band] || NEGATIVE_THOUGHTS.elementary;
          var currentThought = thoughts[tfIdx % thoughts.length];
          var distortionColors = {
            'all-or-nothing': '#ef4444', 'overgeneralization': '#f97316', 'catastrophizing': '#eab308',
            'mind reading': '#8b5cf6', 'fortune telling': '#3b82f6', 'personalization': '#ec4899',
            'comparison': '#06b6d4', 'discounting the positive': '#f59e0b', 'should statement': '#f43f5e',
            'labeling': '#ef4444', 'emotional reasoning': '#eab308'
          };

          practiceContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83D\uDD04 Thought Flipper'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
              band === 'elementary' ? 'Turn mean thoughts into kind thoughts!' : 'Identify and restructure negative thinking patterns'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 20 } }, 'Thoughts flipped: ' + tfFlipCount),

            // Negative thought card
            h('div', { style: { padding: 24, borderRadius: 14, background: '#ef444418', border: '1px solid #ef444444', marginBottom: 16, textAlign: 'center' } },
              h('p', { style: { fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
                band === 'elementary' ? 'Mean Thought' : 'Negative Thought'
              ),
              h('p', { style: { fontSize: 17, color: '#fca5a5', fontWeight: 500, lineHeight: 1.5, fontStyle: 'italic' } }, '"' + currentThought.thought + '"'),
              band !== 'elementary' && h('span', {                 style: { display: 'inline-block', marginTop: 8, fontSize: 10, padding: '3px 10px', borderRadius: 8, background: (distortionColors[currentThought.distortion] || '#94a3b8') + '22', color: distortionColors[currentThought.distortion] || '#94a3b8', fontWeight: 600 }
              }, 'Distortion: ' + currentThought.distortion)
            ),

            // Flip button or revealed flip
            !tfRevealed
              ? h('button', { 'aria-label': 'Flip This Thought!',
                  onClick: function() {
                    upd('tfRevealed', true);
                    if (soundEnabled) sfxCorrect();
                    var newCount = tfFlipCount + 1;
                    upd('tfFlipCount', newCount);
                    if (newCount >= 5) tryAwardBadge('thought_flip_5');
                  },
                  style: { display: 'block', width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 16 }
                }, '\uD83D\uDD04 Flip This Thought!')
              : h('div', { style: { padding: 24, borderRadius: 14, background: '#22c55e18', border: '1px solid #22c55e44', marginBottom: 16, textAlign: 'center' } },
                  h('p', { style: { fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
                    band === 'elementary' ? 'Kind Thought' : 'Balanced Thought'
                  ),
                  h('p', { style: { fontSize: 17, color: '#86efac', fontWeight: 500, lineHeight: 1.5, fontStyle: 'italic' } }, '"' + currentThought.flip + '"')
                ),

            // Next button
            tfRevealed && h('button', { 'aria-label': 'Next Thought',
              onClick: function() {
                upd({ tfIdx: tfIdx + 1, tfRevealed: false });
                logPractice('thought_flip', 'cognitive');
              },
              style: { display: 'block', width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, cursor: 'pointer', marginBottom: 16 }
            }, 'Next Thought \u2192'),

            // Custom thought input
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
              h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
                band === 'elementary' ? 'Or type your own mean thought to flip:' : 'Or enter your own thought:'
              ),
              h('input', {
                type: 'text', value: tfCustomThought,
                'aria-label': 'Enter a negative thought to reframe',
                onChange: function(e) { upd('tfCustomThought', e.target.value); },
                placeholder: band === 'elementary' ? 'Type a mean thought here...' : 'Enter a negative thought...',
                style: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }
              }),
              callGemini && tfCustomThought.trim() && h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  upd({ stLoading: true, tfCustomFlip: null });
                  var prompt = 'A ' + band + ' school student has this negative thought: "' + tfCustomThought + '". ' +
                    'Provide a balanced, realistic reframe of this thought (not just a positive spin). ' +
                    'Use ' + (band === 'elementary' ? 'simple, warm language for a young child' : band === 'middle' ? 'relatable language for a teen' : 'mature, evidence-based language') + '. ' +
                    'Respond with ONLY the reframed thought in 1-2 sentences. No quotes.';
                  callGemini(prompt).then(function(resp) {
                    upd({ tfCustomFlip: resp, stLoading: false });
                    var newCount = tfFlipCount + 1;
                    upd('tfFlipCount', newCount);
                    if (newCount >= 5) tryAwardBadge('thought_flip_5');
                    if (soundEnabled) sfxCorrect();
                  }).catch(function() {
                    upd({ tfCustomFlip: 'Hmm, I couldn\'t reframe that right now. Try writing a kinder version yourself!', stLoading: false });
                  });
                },
                disabled: stLoading,
                style: { width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, cursor: stLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
              },
                Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                stLoading ? 'Thinking...' : 'AI Flip It'
              ),
              tfCustomFlip && h('div', { style: { marginTop: 10, padding: 12, borderRadius: 10, background: '#22c55e18', border: '1px solid #22c55e44', fontSize: 13, color: '#86efac', lineHeight: 1.5 } },
                '\uD83D\uDD04 ' + tfCustomFlip
              )
            ),
            h('button', { 'aria-label': 'Back to Practice Menu',
              onClick: function() { upd('practiceMode', null); },
              style: { display: 'block', width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
            }, '\u2190 Back to Practice Menu')
          );
        }

        // ── I-Statement Builder Mode ──
        if (practiceMode === 'i_statement') {
          var feelings = I_STATEMENT_FEELINGS[band] || I_STATEMENT_FEELINGS.elementary;
          var situations = I_STATEMENT_SITUATIONS[band] || I_STATEMENT_SITUATIONS.elementary;
          var preview = 'I feel ' + (iFeeling || '___') + ' when ' + (iSituation || '___') + (iReason ? ' because ' + iReason : '') + (iNeed ? '. I would like ' + iNeed : '') + '.';

          practiceContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83D\uDDE3\uFE0F I-Statement Builder'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              band === 'elementary' ? 'Practice telling people how YOU feel!' : 'Construct assertive, non-blaming statements'
            ),

            // Live preview
            h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '2px solid #f9731644', marginBottom: 20, textAlign: 'center' } },
              h('p', { style: { fontSize: 10, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'Your I-Statement'),
              h('p', { style: { fontSize: 16, color: '#f1f5f9', fontWeight: 500, lineHeight: 1.6, fontStyle: 'italic' } }, '"' + preview + '"')
            ),

            // Feeling picker
            h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, '1. I feel...'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 } },
                feelings.map(function(f) {
                  return h('button', { 'aria-label': 'Select feeling ' + f,
                    key: f,
                    onClick: function() { upd('iFeeling', f); if (soundEnabled) sfxClick(); },
                    style: {
                      padding: '6px 12px', borderRadius: 20, border: iFeeling === f ? '2px solid #f97316' : '1px solid #334155',
                      background: iFeeling === f ? '#f9731622' : '#1e293b', color: iFeeling === f ? '#fb923c' : '#94a3b8',
                      cursor: 'pointer', fontSize: 12
                    }
                  }, f);
                })
              ),
              h('input', {
                type: 'text', value: iFeeling, 'aria-label': 'I feel...', onChange: function(e) { upd('iFeeling', e.target.value); },
                placeholder: 'Or type your own feeling...',
                style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              })
            ),

            // Situation picker
            h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, '2. When...'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 } },
                situations.map(function(s) {
                  return h('button', { 'aria-label': 'Select situation',
                    key: s,
                    onClick: function() { upd('iSituation', s); if (soundEnabled) sfxClick(); },
                    style: {
                      padding: '6px 12px', borderRadius: 20, border: iSituation === s ? '2px solid #f97316' : '1px solid #334155',
                      background: iSituation === s ? '#f9731622' : '#1e293b', color: iSituation === s ? '#fb923c' : '#94a3b8',
                      cursor: 'pointer', fontSize: 12
                    }
                  }, s);
                })
              ),
              h('input', {
                type: 'text', value: iSituation, 'aria-label': 'When...', onChange: function(e) { upd('iSituation', e.target.value); },
                placeholder: 'Or type your own situation...',
                style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              })
            ),

            // Reason (optional)
            h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, '3. Because... (optional)'),
              h('input', {
                type: 'text', value: iReason, 'aria-label': 'Because...', onChange: function(e) { upd('iReason', e.target.value); },
                placeholder: band === 'elementary' ? 'Why does it make you feel that way?' : 'The impact or reason...',
                style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              })
            ),

            // Need (optional)
            h('div', { style: { marginBottom: 20 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, '4. I would like... (optional)'),
              h('input', {
                type: 'text', value: iNeed, 'aria-label': 'I need...', onChange: function(e) { upd('iNeed', e.target.value); },
                placeholder: band === 'elementary' ? 'What do you need?' : 'Your specific request...',
                style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              })
            ),

            // Save button
            iFeeling && iSituation && h('button', { 'aria-label': 'Save This I-Statement',
              onClick: function() {
                var newHistory = iHistory.concat([{ statement: preview, timestamp: Date.now() }]);
                upd({ iHistory: newHistory, iFeeling: '', iSituation: '', iReason: '', iNeed: '' });
                logPractice('i_statement', 'social');
                if (soundEnabled) sfxCorrect();
                celebrate();
                addToast('I-Statement saved!', 'success');
                if (newHistory.length >= 3) tryAwardBadge('i_statement_3');
              },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8 }
            }, '\u2705 Save This I-Statement'),

            // History
            iHistory.length > 0 && h('div', { style: { marginTop: 12, marginBottom: 12 } },
              h('p', { style: { fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Your I-Statements (' + iHistory.length + ')'),
              iHistory.slice().reverse().slice(0, 5).map(function(entry, i) {
                return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 6, fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' } },
                  '"' + entry.statement + '"'
                );
              })
            ),

            h('button', { 'aria-label': 'Back to Practice Menu',
              onClick: function() { upd('practiceMode', null); },
              style: { display: 'block', width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
            }, '\u2190 Back to Practice Menu')
          );
        }

        // ── Calm Counting Mode ──
        if (practiceMode === 'calm_counting') {
          practiceContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83D\uDD22 Calm Counting'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              band === 'elementary' ? 'Count backwards slowly. Take a breath with each number.' :
              band === 'middle' ? 'Count backwards, breathing between each number. Your thinking brain takes over.' :
              'Reverse counting engages prefrontal executive function, interrupting amygdala reactivity.'
            ),

            // Count display
            countCurrent === null
              ? h('div', null,
                  h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 12 } }, 'Count from:'),
                  h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 } },
                    [10, 20, 50].map(function(n) {
                      return h('button', { 'aria-label': 'Count from ' + n,
                        key: n,
                        onClick: function() { upd('countFrom', n); },
                        style: {
                          width: 56, height: 56, borderRadius: 12, border: countFrom === n ? '2px solid #3b82f6' : '1px solid #334155',
                          background: countFrom === n ? '#3b82f622' : '#1e293b', color: countFrom === n ? '#60a5fa' : '#94a3b8',
                          cursor: 'pointer', fontWeight: 700, fontSize: 18
                        }
                      }, n);
                    })
                  ),
                  band === 'high' && h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 16 } }, 'Challenge: count by 3s (50, 47, 44...)'),
                  h('button', { 'aria-label': 'Start',
                    onClick: function() {
                      upd({ countCurrent: countFrom, countActive: true });
                      if (soundEnabled) sfxClick();
                    },
                    style: { padding: '14px 40px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
                  }, 'Start \u2192')
                )
              : h('div', null,
                  // Big number display
                  h('div', {
                    style: {
                      width: 160, height: 160, borderRadius: '50%', margin: '0 auto 20px',
                      background: countCurrent <= 0 ? '#22c55e22' : '#3b82f622',
                      border: '3px solid ' + (countCurrent <= 0 ? '#22c55e' : '#3b82f6'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }
                  },
                    h('span', { style: { fontSize: 56, fontWeight: 800, color: countCurrent <= 0 ? '#22c55e' : '#60a5fa' } },
                      countCurrent <= 0 ? '\u2705' : countCurrent
                    )
                  ),
                  countCurrent > 0 && h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 20 } },
                    band === 'elementary' ? 'Take a breath... then tap the number.' : 'Breathe slowly... tap to count down.'
                  ),
                  countCurrent > 0 && h('button', { 'aria-label': 'Count down',
                    onClick: function() {
                      var next = band === 'high' && countFrom === 50 ? countCurrent - 3 : countCurrent - 1;
                      if (next <= 0) next = 0;
                      upd('countCurrent', next);
                      if (soundEnabled) playTone(300 + (countFrom - next) * 10, 0.1, 'sine', 0.05);
                      if (next <= 0) {
                        var nc = countComplete + 1;
                        upd({ countComplete: nc, countActive: false });
                        tryAwardBadge('counting_complete');
                        logPractice('calm_counting', 'cognitive');
                        if (soundEnabled) sfxCorrect();
                        celebrate();
                      }
                    },
                    style: { padding: '14px 40px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 16 }
                  }, band === 'high' && countFrom === 50 ? '-3' : 'Next'),
                  countCurrent <= 0 && h('div', null,
                    h('p', { style: { fontWeight: 700, color: '#22c55e', fontSize: 16, marginBottom: 8 } },
                      band === 'elementary' ? 'You did it!' : 'Countdown complete.'
                    ),
                    h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 16 } },
                      band === 'elementary' ? 'Take 3 more deep breaths. How do you feel?' :
                      'Notice: your heart rate has slowed. Your prefrontal cortex is back in charge.'
                    ),
                    h('p', { style: { color: '#94a3b8', fontSize: 12 } }, 'Sessions completed: ' + countComplete)
                  ),
                  h('button', { 'aria-label': 'Reset',
                    onClick: function() { upd({ countCurrent: null, countActive: false }); },
                    style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', marginTop: 8 }
                  }, '\u2190 Reset')
                ),

            h('div', { style: { marginTop: 20 } },
              h('button', { 'aria-label': 'Back to Practice Menu',
                onClick: function() { upd({ practiceMode: null, countCurrent: null, countActive: false }); },
                style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
              }, '\u2190 Back to Practice Menu')
            )
          );
        }

        // ── Self-Talk Generator Mode ──
        if (practiceMode === 'self_talk') {
          practiceContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83D\uDCAC Positive Self-Talk Generator'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              band === 'elementary' ? 'What is your inner voice saying? Let\'s make it kinder!' :
              'Transform your inner critic into a supportive inner coach.'
            ),
            // Input
            h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
                band === 'elementary' ? 'What mean thing are you saying to yourself?' : 'What is your inner critic saying?'
              ),
              h('textarea', {
                value: stInput,
                'aria-label': 'Self-talk reframe response',
                onChange: function(e) { upd('stInput', e.target.value); },
                placeholder: band === 'elementary' ? 'Example: I\'m so stupid...' : 'Example: I always mess everything up...',
                rows: 3,
                style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            ),
            // Generate button
            callGemini && stInput.trim() && h('button', { 'aria-label': 'Generate button',
              onClick: function() {
                upd({ stLoading: true, stGenerated: null });
                var prompt = 'A ' + band + ' school student is being harsh on themselves. Their inner critic says: "' + stInput + '". ' +
                  'Generate 3 compassionate, realistic self-talk replacements (not toxic positivity \u2014 acknowledge the difficulty). ' +
                  'Use ' + (band === 'elementary' ? 'simple, warm language for ages 5-10. Start each with a heart emoji.' :
                            band === 'middle' ? 'relatable teen-friendly language. Be genuine, not cheesy.' :
                            'mature, evidence-based language rooted in self-compassion theory.') + ' ' +
                  'Format: number each one (1. 2. 3.) on separate lines.';
                callGemini(prompt).then(function(resp) {
                  upd({ stGenerated: resp, stLoading: false });
                  if (soundEnabled) sfxCorrect();
                  tryAwardBadge('ai_match');
                }).catch(function() {
                  upd({ stGenerated: 'I couldn\'t generate alternatives right now. Try asking: "What would I say to my best friend right now?"', stLoading: false });
                });
              },
              disabled: stLoading,
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#ec4899', color: '#fff', fontWeight: 700, fontSize: 14, cursor: stLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }
            },
              Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
              stLoading ? 'Generating kind words...' : 'Generate Kind Self-Talk'
            ),
            // Result
            stGenerated && h('div', { style: { padding: 16, borderRadius: 14, background: '#ec489918', border: '1px solid #ec489944', marginBottom: 16 } },
              h('p', { style: { fontSize: 11, color: '#ec4899', fontWeight: 700, marginBottom: 8 } }, 'Your Inner Coach Says:'),
              h('p', { style: { fontSize: 13, color: '#f1f5f9', lineHeight: 1.7, whiteSpace: 'pre-line' } }, stGenerated),
              h('button', { 'aria-label': 'Save This',
                onClick: function() {
                  var newSaved = stSaved.concat([{ critic: stInput, coach: stGenerated, timestamp: Date.now() }]);
                  upd({ stSaved: newSaved, stInput: '', stGenerated: null });
                  logPractice('positive_self_talk', 'cognitive');
                  addToast('Saved to your self-talk collection!', 'success');
                },
                style: { marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ec4899', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\uD83D\uDCBE Save This')
            ),
            // Saved collection
            stSaved.length > 0 && h('div', { style: { marginBottom: 16 } },
              h('p', { style: { fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Saved Self-Talk (' + stSaved.length + ')'),
              stSaved.slice().reverse().slice(0, 3).map(function(entry, i) {
                return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 6 } },
                  h('p', { style: { fontSize: 11, color: '#ef4444', marginBottom: 4 } }, '\u274C "' + entry.critic + '"'),
                  h('p', { style: { fontSize: 11, color: '#22c55e' } }, '\u2705 ' + entry.coach.split('\n')[0])
                );
              })
            ),

            h('button', { 'aria-label': 'Back to Practice Menu',
              onClick: function() { upd('practiceMode', null); },
              style: { display: 'block', width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }
            }, '\u2190 Back to Practice Menu')
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: My Calm Plan ──
      // ══════════════════════════════════════════════════════════
      var planContent = null;
      if (activeTab === 'plan') {
        var plan = calmPlan || { steps: [], trustedAdults: [], warningSigns: [] };

        planContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDCCB My Calm-Down Plan' : '\uD83D\uDCCB My Personal Calm Plan'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Make a plan for when you\'re in the yellow or red zone!' :
            'Build a personal regulation plan you can follow when emotions escalate.'
          ),

          // Warning signs
          h('div', { style: { marginBottom: 20, padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
            h('h4', { style: { margin: '0 0 8px 0', fontSize: 14, color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 } },
              '\u26A0\uFE0F',
              band === 'elementary' ? 'I know I\'m getting upset when...' : 'My Warning Signs'
            ),
            (plan.warningSigns || []).map(function(sign, i) {
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { style: { color: '#eab308', fontSize: 14 } }, '\u2022'),
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, sign),
                h('button', { 'aria-label': 'Add a warning sign...',
                  onClick: function() {
                    var newSigns = (plan.warningSigns || []).filter(function(_, j) { return j !== i; });
                    upd('calmPlan', Object.assign({}, plan, { warningSigns: newSigns }));
                  },
                  style: { padding: '2px 6px', borderRadius: 4, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 10 }
                }, '\u2715')
              );
            }),
            h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
              h('input', {
                type: 'text', id: 'cp-warning', 'aria-label': 'Warning sign',
                placeholder: band === 'elementary' ? 'My fists get tight, my face gets hot...' : 'Add a warning sign...',
                style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              }),
              h('button', { 'aria-label': 'Add warning sign',
                onClick: function() {
                  var input = document.getElementById('cp-warning');
                  if (input && input.value.trim()) {
                    var newSigns = (plan.warningSigns || []).concat([input.value.trim()]);
                    upd('calmPlan', Object.assign({}, plan, { warningSigns: newSigns }));
                    input.value = '';
                  }
                },
                style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#eab308', color: '#0f172a', fontWeight: 700, cursor: 'pointer', fontSize: 12 }
              }, '+')
            )
          ),

          // Calm-down steps
          h('div', { style: { marginBottom: 20, padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
            h('h4', { style: { margin: '0 0 8px 0', fontSize: 14, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: 6 } },
              '\uD83D\uDCCB',
              band === 'elementary' ? 'My calm-down steps (in order):' : 'My Regulation Steps'
            ),
            (plan.steps || []).map(function(step, i) {
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { style: { width: 24, height: 24, borderRadius: '50%', background: '#14b8a633', color: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, i + 1),
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, step),
                h('button', { 'aria-label': 'Add a step...',
                  onClick: function() {
                    var newSteps = (plan.steps || []).filter(function(_, j) { return j !== i; });
                    upd('calmPlan', Object.assign({}, plan, { steps: newSteps }));
                  },
                  style: { padding: '2px 6px', borderRadius: 4, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 10 }
                }, '\u2715')
              );
            }),
            h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
              h('input', {
                type: 'text', id: 'cp-step', 'aria-label': 'Coping step',
                placeholder: band === 'elementary' ? 'Take 5 deep breaths, go to calm corner...' : 'Add a step...',
                style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              }),
              h('button', { 'aria-label': 'Add calm step',
                onClick: function() {
                  var input = document.getElementById('cp-step');
                  if (input && input.value.trim()) {
                    var newSteps = (plan.steps || []).concat([input.value.trim()]);
                    upd('calmPlan', Object.assign({}, plan, { steps: newSteps }));
                    input.value = '';
                    if (newSteps.length >= 3 && !earnedBadges['calm_plan_built']) {
                      tryAwardBadge('calm_plan_built');
                    }
                  }
                },
                style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }
              }, '+')
            ),
            // Quick-add from strategies
            h('p', { style: { fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 6 } }, 'Quick-add:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
              ['Take 5 deep breaths', 'Count backwards from 10', 'Squeeze a stress ball', 'Walk away from the situation', 'Talk to a trusted adult', 'Use an I-statement'].map(function(quick) {
                return h('button', { 'aria-label': 'Quick add: ' + quick,
                  key: quick,
                  onClick: function() {
                    var newSteps = (plan.steps || []).concat([quick]);
                    upd('calmPlan', Object.assign({}, plan, { steps: newSteps }));
                    if (soundEnabled) sfxClick();
                    if (newSteps.length >= 3) tryAwardBadge('calm_plan_built');
                  },
                  style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 10 }
                }, '+ ' + quick);
              })
            )
          ),

          // Trusted adults
          h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
            h('h4', { style: { margin: '0 0 8px 0', fontSize: 14, color: '#f97316', display: 'flex', alignItems: 'center', gap: 6 } },
              '\uD83D\uDE4B',
              band === 'elementary' ? 'My safe grown-ups:' : 'My Trusted Adults'
            ),
            (plan.trustedAdults || []).map(function(adult, i) {
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 16 } }, '\uD83E\uDDD1'),
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, adult),
                h('button', { 'aria-label': 'Name and relationship...',
                  onClick: function() {
                    var newAdults = (plan.trustedAdults || []).filter(function(_, j) { return j !== i; });
                    upd('calmPlan', Object.assign({}, plan, { trustedAdults: newAdults }));
                  },
                  style: { padding: '2px 6px', borderRadius: 4, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 10 }
                }, '\u2715')
              );
            }),
            h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
              h('input', {
                type: 'text', id: 'cp-adult', 'aria-label': 'Trusted adult',
                placeholder: band === 'elementary' ? 'Mom, Mr. Smith, Counselor Jones...' : 'Name and relationship...',
                style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, boxSizing: 'border-box' }
              }),
              h('button', { 'aria-label': 'Add trusted adult',
                onClick: function() {
                  var input = document.getElementById('cp-adult');
                  if (input && input.value.trim()) {
                    var newAdults = (plan.trustedAdults || []).concat([input.value.trim()]);
                    upd('calmPlan', Object.assign({}, plan, { trustedAdults: newAdults }));
                    input.value = '';
                  }
                },
                style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }
              }, '+')
            )
          ),

          // ── AI Calm Plan Suggestions ──
          callGemini && h('div', { style: { marginTop: 20, padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, #14b8a612 0%, #8b5cf612 100%)', border: '1px solid #14b8a633' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
              Sparkles ? h(Sparkles, { size: 14 }) : h('span', null, '\u2728'),
              h('span', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 13 } },
                band === 'elementary' ? 'Need help with your plan?' : 'AI Plan Assistant'
              )
            ),
            h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 12 } },
              band === 'elementary' ? 'I can help you think of warning signs and calm-down steps!' :
              'Generate personalized suggestions based on your practice history and preferences.'
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'aria-label': 'Suggest warning signs',
                onClick: function() {
                  upd('planEditing', true);
                  var practiced = (practiceLog || []).map(function(e) { return e.strategyId; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
                  var practicedNames = practiced.map(function(id) { var s = STRATEGIES.find(function(x) { return x.id === id; }); return s ? s.name[band] : id; }).join(', ');
                  var prompt = 'You are a school counselor helping a ' + band + ' school student build a calm-down plan. ' +
                    (practicedNames ? 'They have practiced: ' + practicedNames + '. ' : '') +
                    'Suggest 4 warning signs that a student might experience when they are getting dysregulated (physical + emotional). ' +
                    'Use ' + (band === 'elementary' ? 'simple kid-friendly language' : band === 'middle' ? 'teen-friendly language' : 'mature language') + '. ' +
                    'Format as a numbered list, one per line. Just the signs, no extra text.';
                  callGemini(prompt).then(function(resp) {
                    var signs = resp.split('\n').map(function(s) { return s.replace(/^\d+[\.\)]\s*/, '').trim(); }).filter(function(s) { return s.length > 0; });
                    var currentSigns = plan.warningSigns || [];
                    upd({ calmPlan: Object.assign({}, plan, { warningSigns: currentSigns.concat(signs) }), planEditing: false });
                    addToast('Added ' + signs.length + ' warning signs!', 'success');
                    if (soundEnabled) sfxCorrect();
                  }).catch(function() { upd('planEditing', false); addToast('Could not generate suggestions', 'error'); });
                },
                disabled: planEditing,
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#eab308', color: '#0f172a', fontWeight: 700, cursor: planEditing ? 'wait' : 'pointer', fontSize: 12 }
              }, '\u26A0\uFE0F ' + (planEditing ? 'Generating...' : 'Suggest Warning Signs')),
              h('button', { 'aria-label': 'Select strategy',
                onClick: function() {
                  upd('planEditing', true);
                  var practiced = (practiceLog || []).map(function(e) { return e.strategyId; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
                  var practicedNames = practiced.map(function(id) { var s = STRATEGIES.find(function(x) { return x.id === id; }); return s ? s.name[band] : id; }).join(', ');
                  var favNames = Object.keys(favorites).map(function(id) { var s = STRATEGIES.find(function(x) { return x.id === id; }); return s ? s.name[band] : id; }).join(', ');
                  var prompt = 'You are a school counselor helping a ' + band + ' school student build a personal calm-down plan. ' +
                    (practicedNames ? 'They have practiced these strategies: ' + practicedNames + '. ' : '') +
                    (favNames ? 'Their favorites: ' + favNames + '. ' : '') +
                    'Suggest 5 ordered calm-down steps they can follow when they feel upset. ' +
                    'Mix physical (breathing, movement) and cognitive (thinking, talking) strategies. ' +
                    'Use ' + (band === 'elementary' ? 'simple, action-oriented language for a young child' : band === 'middle' ? 'practical teen-friendly language' : 'evidence-based, actionable language') + '. ' +
                    'Format as a numbered list. Just the steps, no extra text.';
                  callGemini(prompt).then(function(resp) {
                    var steps = resp.split('\n').map(function(s) { return s.replace(/^\d+[\.\)]\s*/, '').trim(); }).filter(function(s) { return s.length > 0; });
                    var currentSteps = plan.steps || [];
                    upd({ calmPlan: Object.assign({}, plan, { steps: currentSteps.concat(steps) }), planEditing: false });
                    addToast('Added ' + steps.length + ' calm-down steps!', 'success');
                    if (soundEnabled) sfxCorrect();
                    if (currentSteps.concat(steps).length >= 3) tryAwardBadge('calm_plan_built');
                  }).catch(function() { upd('planEditing', false); addToast('Could not generate suggestions', 'error'); });
                },
                disabled: planEditing,
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, cursor: planEditing ? 'wait' : 'pointer', fontSize: 12 }
              }, '\uD83D\uDCCB ' + (planEditing ? 'Generating...' : 'Suggest Steps'))
            )
          ),

          // ── Print my calm plan (take-home artifact) ──
          h('div', { style: { marginTop: 16, textAlign: 'center' } },
            h('button', {
              'aria-label': 'Print my calm plan',
              onClick: function() {
                if (!window.SelHub || !window.SelHub.printDoc) return;
                window.SelHub.printDoc({
                  title: band === 'elementary' ? 'My Calm-Down Plan' : 'My Personal Calm Plan',
                  subtitle: 'Bring this with you. Share it with a counselor, parent, or trusted adult so they can help you follow it.',
                  sections: [
                    { heading: band === 'elementary' ? 'How I know I’m getting upset' : 'My warning signs', items: plan.warningSigns || [] },
                    { heading: band === 'elementary' ? 'Steps that help me calm down' : 'My calming steps (in order)', items: plan.steps || [] },
                    { heading: 'Trusted adults I can talk to', items: plan.trustedAdults || [] }
                  ]
                });
              },
              style: { padding: '8px 18px', borderRadius: 10, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, '🖨 Print my calm plan')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Matcher (AI Strategy Recommender) ──
      // ══════════════════════════════════════════════════════════
      var matcherContent = null;
      if (activeTab === 'matcher') {
        matcherContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 8, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\u2728 What Should I Try?' : '\u2728 Strategy Matcher'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Tell me how you feel and I\'ll help you pick a way to feel better!' :
            'Describe what you\'re experiencing and get personalized strategy recommendations.'
          ),

          // Input
          h('textarea', {
            value: matcherFeeling,
            'aria-label': 'Describe how you are feeling for coping matcher',
            onChange: function(e) { upd('matcherFeeling', e.target.value); },
            placeholder: band === 'elementary' ? 'I feel really mad because my brother broke my toy...' :
                         band === 'middle' ? 'I\'m feeling overwhelmed with homework and social drama...' :
                         'Describe your current emotional state, triggers, and what you\'ve already tried...',
            rows: 4,
            style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }
          }),

          callGemini && matcherFeeling.trim() && h('button', { 'aria-label': 'Match coping strategies',
            onClick: function() {
              upd({ matcherLoading: true, matcherResult: null });
              tryAwardBadge('ai_match');
              var stratList = STRATEGIES.map(function(s) { return s.name[band] + ' (' + s.type + ')'; }).join(', ');
              var prompt = 'You are a school counselor helping a ' + band + ' school student. ' +
                'They describe their situation: "' + matcherFeeling + '"\n\n' +
                'From this list of coping strategies, recommend the top 3 that would be most helpful: ' + stratList + '\n\n' +
                'For each recommendation:\n' +
                '1. Name the strategy\n' +
                '2. Explain in 1-2 sentences WHY it fits their situation\n' +
                '3. Give one quick tip to get started\n\n' +
                'Use ' + (band === 'elementary' ? 'simple, warm language for ages 5-10' : band === 'middle' ? 'relatable teen language' : 'mature, evidence-based language') + '. ' +
                'Format each as a numbered item. Be specific to their situation, not generic.';
              callGemini(prompt).then(function(resp) {
                upd({ matcherResult: resp, matcherLoading: false });
                if (soundEnabled) sfxCorrect();
              }).catch(function() {
                upd({ matcherResult: 'I couldn\'t match strategies right now. Try browsing the Library tab and picking what feels right!', matcherLoading: false });
              });
            },
            disabled: matcherLoading,
            style: { width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: '#14b8a6', color: '#fff', fontWeight: 700, fontSize: 15, cursor: matcherLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }
          },
            Sparkles ? h(Sparkles, { size: 16 }) : '\u2728',
            matcherLoading ? 'Finding the best strategies...' : 'Match Me!'
          ),

          matcherResult && h('div', { style: { padding: 20, borderRadius: 14, background: '#14b8a611', border: '1px solid #14b8a633' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 } },
              h('span', null, '\u2728'),
              h('span', { style: { fontWeight: 700, color: '#14b8a6', fontSize: 13 } }, 'Recommended for You')
            ),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-line' } }, matcherResult)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Practice Log ──
      // ══════════════════════════════════════════════════════════
      var logContent = null;
      if (activeTab === 'log') {
        var pLog = practiceLog || [];
        var typeCount = {};
        pLog.forEach(function(e) { typeCount[e.type] = (typeCount[e.type] || 0) + 1; });

        logContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Practice Log'),
          pLog.length === 0
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#94a3b8' } },
                h('p', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83D\uDCDD'),
                h('p', { style: { fontWeight: 600 } }, 'No practices logged yet'),
                h('p', { style: { fontSize: 12 } }, 'Try a strategy from the Library or Practice tab!')
              )
            : h('div', null,
                // ── Streak & Stats Row ──
                (function() {
                  var streak = computeStreak(pLog);
                  var ratedEntries = pLog.filter(function(e) { return e.rating; });
                  var avgRating = ratedEntries.length > 0 ? (ratedEntries.reduce(function(sum, e) { return sum + e.rating; }, 0) / ratedEntries.length) : null;
                  return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 } },
                    h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: streak >= 3 ? '#f9731618' : '#1e293b', border: '1px solid ' + (streak >= 3 ? '#f9731644' : '#334155') } },
                      h('div', { style: { fontSize: 24, fontWeight: 800, color: streak >= 3 ? '#f97316' : '#94a3b8' } }, streak),
                      h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Day Streak'),
                      streak >= 3 && h('div', { style: { fontSize: 12, marginTop: 2 } }, '\uD83D\uDD25')
                    ),
                    h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { fontSize: 24, fontWeight: 800, color: '#14b8a6' } }, pLog.length),
                      h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Total Practices')
                    ),
                    h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: avgRating ? '#eab30818' : '#1e293b', border: '1px solid ' + (avgRating ? '#eab30844' : '#334155') } },
                      h('div', { style: { fontSize: 24, fontWeight: 800, color: avgRating ? '#eab308' : '#94a3b8' } }, avgRating ? avgRating.toFixed(1) : '-'),
                      h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Avg Rating'),
                      avgRating && h('div', { style: { display: 'flex', justifyContent: 'center', gap: 1, marginTop: 2 } },
                        Array.from({ length: 5 }, function(_, i) {
                          return h('span', { key: i, style: { fontSize: 8, color: i < Math.round(avgRating) ? '#eab308' : '#334155' } }, '\u2605');
                        })
                      )
                    )
                  );
                })(),
                // ── Most Effective Strategy ──
                (function() {
                  var best = getMostEffective(pLog);
                  if (!best) return null;
                  var strat = STRATEGIES.find(function(s) { return s.id === best.id; });
                  if (!strat) return null;
                  var typeObj = STRATEGY_TYPES.find(function(tp) { return tp.id === strat.type; });
                  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: '#22c55e12', border: '1px solid #22c55e33', marginBottom: 20 } },
                    h('span', { style: { fontSize: 24 } }, strat.icon),
                    h('div', { style: { flex: 1 } },
                      h('p', { style: { fontSize: 10, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' } }, '\u2B50 Most Effective'),
                      h('p', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 } }, strat.name[band] || strat.name.elementary),
                      h('p', { style: { fontSize: 11, color: '#94a3b8', margin: '2px 0 0 0' } }, 'Avg rating: ' + best.avg + '/5')
                    ),
                    typeObj && h('span', { style: { fontSize: 10, padding: '3px 8px', borderRadius: 6, background: typeObj.color + '22', color: typeObj.color } }, typeObj.label)
                  );
                })(),
                // ── Effectiveness Trend ──
                (function() {
                  var rated = pLog.filter(function(e) { return e.rating; }).slice(-10);
                  if (rated.length < 2) return null;
                  return h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Effectiveness Trend (last ' + rated.length + ' rated)'),
                    h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 } },
                      rated.map(function(entry, i) {
                        var pct = (entry.rating / 5) * 100;
                        var barColor = entry.rating >= 4 ? '#22c55e' : entry.rating >= 3 ? '#eab308' : entry.rating >= 2 ? '#f97316' : '#ef4444';
                        return h('div', {
                          key: i, title: entry.rating + '/5',
                          style: { flex: 1, height: pct + '%', borderRadius: '4px 4px 0 0', background: barColor, minHeight: 4, transition: 'height 0.3s' }
                        });
                      })
                    ),
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 } },
                      h('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Oldest'),
                      h('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Recent')
                    )
                  );
                })(),
                // Type distribution
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 } },
                  STRATEGY_TYPES.map(function(type) {
                    var count = typeCount[type.id] || 0;
                    return h('div', {
                      key: type.id,
                      style: { textAlign: 'center', padding: '8px 14px', borderRadius: 10, background: count > 0 ? type.color + '18' : '#1e293b', border: '1px solid ' + (count > 0 ? type.color + '44' : '#334155'), minWidth: 70 }
                    },
                      h('div', { style: { fontSize: 18 } }, type.icon),
                      h('div', { style: { fontSize: 14, fontWeight: 700, color: count > 0 ? type.color : '#94a3b8' } }, count),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, type.label)
                    );
                  })
                ),
                h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
                  pLog.length + ' total practice' + (pLog.length !== 1 ? 's' : '') + ' logged'
                ),
                // Log entries (newest first)
                pLog.slice().reverse().map(function(entry, i) {
                  var strat = STRATEGIES.find(function(s) { return s.id === entry.strategyId; });
                  var typeObj = STRATEGY_TYPES.find(function(t) { return t.id === entry.type; });
                  var time = new Date(entry.timestamp);
                  var hasRating = entry.rating != null;

                  return h('div', {
                    key: i,
                    style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 }
                  },
                    h('span', { style: { fontSize: 20, flexShrink: 0 } }, strat ? strat.icon : (typeObj ? typeObj.icon : '\uD83C\uDFAF')),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                        h('span', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 13 } },
                          strat ? (strat.name[band] || strat.name.elementary) : entry.strategyId
                        ),
                        typeObj && h('span', { style: { fontSize: 11, padding: '2px 6px', borderRadius: 6, background: typeObj.color + '22', color: typeObj.color } }, typeObj.label),
                        h('span', { style: { fontSize: 10, color: '#94a3b8' } }, time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                      ),
                      // Effectiveness rating
                      !hasRating
                        ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 } },
                            h('span', { style: { fontSize: 10, color: '#94a3b8', marginRight: 4 } }, 'How helpful was it?'),
                            [1, 2, 3, 4, 5].map(function(star) {
                              return h('button', { 'aria-label': 'Rate ' + star + ' stars',
                                key: star,
                                onClick: function() {
                                  var newLog = pLog.map(function(e, j) {
                                    if (j === pLog.length - 1 - i) return Object.assign({}, e, { rating: star });
                                    return e;
                                  });
                                  upd('practiceLog', newLog);
                                  addToast('Rating saved!', 'success');
                                  // Count rated entries
                                  var ratedCount = newLog.filter(function(e) { return e.rating != null; }).length;
                                  if (ratedCount >= 3) tryAwardBadge('rate_3');
                                },
                                style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, color: '#94a3b8' }
                              }, '\u2606');
                            })
                          )
                        : h('div', { style: { display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 } },
                            Array.from({ length: 5 }, function(_, j) {
                              return h('span', { key: j, style: { fontSize: 14, color: j < entry.rating ? '#eab308' : '#334155' } }, '\u2605');
                            }),
                            h('span', { style: { fontSize: 10, color: '#94a3b8', marginLeft: 4 } }, entry.rating + '/5')
                          )
                    )
                  );
                })
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Daily Check-In Banner ──
      // ══════════════════════════════════════════════════════════
      var dailyCheckin = null;
      if (!checkinDoneToday && !showBadgesPanel) {
        dailyCheckin = h('div', {           style: { padding: '12px 16px', margin: '10px 12px', borderRadius: 14, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155' }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
            h('span', { style: { fontSize: 13, fontWeight: 700, color: '#f1f5f9' } },
              band === 'elementary' ? '\uD83C\uDF24\uFE0F How are you feeling right now?' : '\uD83C\uDF24\uFE0F Quick Check-In'
            ),
            h('button', { 'aria-label': 'Toggle sound',
              onClick: function() { upd({ dailyMoodDate: todayStr, dailyMood: 'skip' }); },
              style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }
            }, '\u2715')
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
            CHECKIN_MOODS.map(function(mood) {
              return h('button', { 'aria-label': 'info',
                key: mood.id,
                onClick: function() {
                  upd({ dailyMood: mood.id, dailyMoodDate: todayStr });
                  tryAwardBadge('checkin_done');
                  if (soundEnabled) sfxCheckin();
                  addToast(mood.emoji + ' Got it! ' + (mood.zone === 'green' ? 'Glad you\'re in a good place!' : 'Let\'s find something to help.'), 'info');
                  // Auto-recommend based on zone
                  if (mood.zone !== 'green' && callGemini) {
                    upd('dailyRecLoading', true);
                    var stratNames = STRATEGIES.filter(function(s) { return s.bestFor.indexOf(mood.zone) !== -1; }).map(function(s) { return s.name[band]; }).join(', ');
                    callGemini('A ' + band + ' school student is feeling ' + mood.label.toLowerCase() + ' today (' + mood.zone + ' zone). ' +
                      'In 2-3 warm sentences, suggest ONE coping strategy from this list that would help right now: ' + stratNames + '. ' +
                      'Use ' + (band === 'elementary' ? 'simple, encouraging language' : 'relatable, supportive language') + '.'
                    ).then(function(resp) {
                      upd({ dailyRec: resp, dailyRecLoading: false });
                    }).catch(function() { upd('dailyRecLoading', false); });
                  }
                },
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px',
                  borderRadius: 12, border: '1px solid #334155', background: '#0f172a', cursor: 'pointer', minWidth: 52
                },
                onMouseEnter: function(e) { e.currentTarget.style.borderColor = mood.color; },
                onMouseLeave: function(e) { e.currentTarget.style.borderColor = '#334155'; }
              },
                h('span', { style: { fontSize: 22 } }, mood.emoji),
                h('span', { style: { fontSize: 11, color: '#94a3b8' } }, mood.label)
              );
            })
          )
        );
      }

      // Show recommendation after check-in
      var dailyRecBanner = null;
      if (checkinDoneToday && dailyMood && dailyMood !== 'skip' && dailyRec) {
        var moodObj = CHECKIN_MOODS.find(function(m) { return m.id === dailyMood; });
        dailyRecBanner = h('div', {           style: { padding: '10px 16px', margin: '10px 12px 0', borderRadius: 12, background: (moodObj ? moodObj.color : '#14b8a6') + '12', border: '1px solid ' + (moodObj ? moodObj.color : '#14b8a6') + '33' }
        },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
            h('span', { style: { fontSize: 18, flexShrink: 0 } }, moodObj ? moodObj.emoji : '\u2728'),
            h('div', { style: { flex: 1 } },
              h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.5, margin: 0 } }, dailyRec),
              h('button', { 'aria-label': 'Dismiss',
                onClick: function() { upd({ dailyRec: null }); },
                style: { marginTop: 6, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 10 }
              }, 'Dismiss')
            )
          )
        );
      }
      if (checkinDoneToday && dailyRecLoading) {
        dailyRecBanner = h('div', {
          style: { padding: '10px 16px', margin: '10px 12px 0', borderRadius: 12, background: '#14b8a612', border: '1px solid #14b8a633', textAlign: 'center' }
        },
          h('span', { style: { fontSize: 12, color: '#94a3b8' } }, '\u2728 Finding a strategy for you...')
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── CSS Keyframes ──
      // ══════════════════════════════════════════════════════════
      React.useEffect && React.useEffect(function() {
        if (document.getElementById('sel-coping-keyframes')) return;
        var s = document.createElement('style');
        s.id = 'sel-coping-keyframes';
        s.textContent = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
        document.head.appendChild(s);
        return function() { var el = document.getElementById('sel-coping-keyframes'); if (el) el.remove(); };
      }, []);

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      return h('div', { style: { minHeight: '100%' } },
        tabBar,
        dailyCheckin,
        dailyRecBanner,
        badgePopup,
        libraryContent,
        practiceContent,
        planContent,
        matcherContent,
        logContent,
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });
})();
