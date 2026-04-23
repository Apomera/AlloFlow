// ═══════════════════════════════════════════
// stem_tool_typingpractice.js — Typing Practice: Disability-first keyboarding
// Four pillars: (1) accommodations AS the product (dyslexia font, motor-planning
// timing windows, large-key visual keyboard, high-contrast, error-tolerant modes),
// (2) AI-personalized passages via ctx.callGemini — no "quick brown fox",
// (3) clinician/IEP workflow — baseline + trend + exportable progress report,
// (4) hub integration — passages importable from WriteCraft / Simplified View (Phase 2).
// Gamification rules: NO leaderboards, NO timer-pressure default, NO streak-guilt,
// NO racing (Nitrotype style), NO loot-box, NO ads. YES mastery tree (personal growth),
// YES personal-best, YES accommodation-usage badges, YES AlloBot Sage spell unlocks.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('typingPractice'))) {

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // SECTION 1: DEFAULT STATE SHAPE
  // ─────────────────────────────────────────────────────────
  // Lives in ctx.toolData.typingPractice. Hub persists it across sessions.

  var DEFAULT_STATE = {
    view: 'menu',              // 'menu' | 'drill' | 'summary' | 'progress' | 'settings' | 'passage-setup'
    currentDrill: null,        // drill id currently active (e.g. 'home-row')
    sessions: [],              // array of completed session records
    personalBest: {},          // { drillId: { wpm, accuracy, date } }
    accommodations: {
      dyslexiaFont: false,
      largeKeys: false,
      highContrast: false,
      paceTargetWpm: null,     // null = no pace target (motor-planning-safe default)
      audioCues: false,
      errorTolerant: false,
      predictiveAssist: false, // emerging-typist scaffold: highlight next 1-3 chars
      restBreakMinutes: null   // null = no nudge; otherwise toast after N active minutes
    },
    accommodationBadges: [],   // badge ids earned for TRYING an accommodation
    masteryLevel: 0,           // progression tier: 0=home-row, 1=top-row, 2=bottom-row, 3=words, 4=passages
    baseline: null,            // first-ever session snapshot — anchor for IEP trend
    iepGoal: null,             // { targetWpm, targetAccuracy, notes } set by clinician
    aiPassage: null,           // { text, gradeLevel, topic, generatedAt }
    passagePrefs: {            // remembered choices for next generation
      gradeLevel: '2-3',       // K, 1, 2-3, 4-5, 6-8, 9-12
      topic: '',
      difficulty: 'on-level'   // 'easier' | 'on-level' | 'stretch'
    },
    studentName: '',           // optional; appears on IEP report when set
    // drillRunId increments when student STARTS a fresh drill from the menu
    // (new text). It does NOT increment on "Drill again" from summary, so
    // retries use the same sample — fair before/after comparison on identical
    // text is the point of a retry.
    drillRunId: 0,
    audioTheme: 'chime',       // 'chime' (default) | 'soft' | 'mute'
    // Lifetime totals survive session-array capping, so the IEP report stays
    // accurate for long-term students even after the 200-session cap trims
    // the oldest records.
    lifetime: { totalSessions: 0, totalCharsTyped: 0, totalErrorsLogged: 0 },
    onboardingSeen: false,
    // aggregateErrors: { 'a': 5, 'd': 12, ... } — all-time per-char error counts
    // for the heatmap. Updated at session save so we don't recompute from the
    // capped sessions array.
    aggregateErrors: {}
  };

  // Accommodation presets — single-click bundles of common accommodation combos.
  // Applying a preset overwrites the student's current accommodation settings.
  // Each bundle is informed by the relevant disability literature:
  //   Dyslexia-friendly — OpenDyslexic font + high-contrast + error tolerance +
  //                       audio cues help students with visual processing and
  //                       phonemic-spelling correlation issues.
  //   Low vision       — big keys + high-contrast palette + audio reinforcement.
  //   Motor planning   — pace reference + error tolerance + predictive scaffold +
  //                       large-key visible keyboard for finger-color memory.
  //   Focus / ADHD     — soft audio cues + pace reference + rest-break nudge.
  var ACC_PRESETS = [
    {
      id: 'dyslexia',
      label: '🧠 Dyslexia-friendly',
      hint: 'OpenDyslexic font, high contrast, audio, error-tolerant',
      apply: {
        dyslexiaFont: true,
        highContrast: true,
        audioCues: true,
        errorTolerant: true,
        largeKeys: false,
        predictiveAssist: false,
        paceTargetWpm: null,
        restBreakMinutes: null
      }
    },
    {
      id: 'low-vision',
      label: '👓 Low vision',
      hint: 'Large keys, high contrast, audio cues',
      apply: {
        dyslexiaFont: false,
        highContrast: true,
        audioCues: true,
        largeKeys: true,
        errorTolerant: false,
        predictiveAssist: false,
        paceTargetWpm: null,
        restBreakMinutes: null
      }
    },
    {
      id: 'motor-planning',
      label: '🤲 Motor planning',
      hint: 'Pace ref 15 WPM, error-tolerant, predictive, large keys',
      apply: {
        dyslexiaFont: false,
        highContrast: false,
        audioCues: false,
        largeKeys: true,
        errorTolerant: true,
        predictiveAssist: true,
        paceTargetWpm: 15,
        restBreakMinutes: 10
      }
    },
    {
      id: 'focus',
      label: '🎯 Focus / ADHD',
      hint: 'Soft audio, pace ref 20 WPM, rest-break nudge at 10 min',
      apply: {
        dyslexiaFont: false,
        highContrast: false,
        audioCues: true,
        largeKeys: false,
        errorTolerant: false,
        predictiveAssist: false,
        paceTargetWpm: 20,
        restBreakMinutes: 10
      }
    }
  ];

  // Grade-level complexity guides lifted from AlloFlowANTI.txt's handleGenerate
  // 'simplified' branch. Keeps voice consistent with other AlloFlow text outputs.
  var GRADE_COMPLEXITY = {
    'K': 'Kindergarten. Use only the most common sight words and simple CVC words. Sentences 3 to 5 words. Subject-verb-object only. Avoid digraphs where possible. No commas.',
    '1': '1st grade. 5 to 7 word sentences. High-frequency words. Common digraphs okay (th, sh, ch). Avoid multi-syllable words unless they are sight words (like "something"). No semicolons or dashes.',
    '2-3': '2nd to 3rd grade. 7 to 10 word sentences. Mostly decodable vocabulary with common prefixes and suffixes (un-, re-, -ing, -ed). Simple compound sentences with "and" or "but" allowed. Target CCSS.ELA-LITERACY.RF.2.3 phonics patterns.',
    '4-5': '4th to 5th grade. 10 to 15 word sentences. Varied sentence structure. Academic vocabulary introduced with clear context. Common figurative language allowed. Target CCSS.ELA-LITERACY.RF.5.3.',
    '6-8': '6th to 8th grade. 12 to 20 word sentences. Academic and domain-specific vocabulary. Compound and complex sentences. Transitional phrases. Target CCSS.ELA-LITERACY.RF.9-10 (middle school literacy).',
    '9-12': 'High school. Sophisticated vocabulary and varied complex sentence structures. Subordinate clauses, appositives, participial phrases allowed. Domain-specific academic content.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: DRILL CATALOG (minimal for skeleton — expanded in later steps)
  // ─────────────────────────────────────────────────────────

  var DRILLS = {
    'home-row': {
      id: 'home-row',
      name: 'Home Row',
      icon: '⌨️',
      tier: 0,
      description: 'Start here. Fingers rest on a, s, d, f · j, k, l, ;',
      samples: [
        // Pure finger-position drills (left-hand, right-hand, both)
        'asdf jkl; asdf jkl; asdf jkl; asdf jkl; asdf',
        'fj fj dk dk sl sl a; a; fj dk sl a; fj dk sl a;',
        'fjdk slas djfk lska fjdk slas djfk lska fjdk',
        'aa ss dd ff gg hh jj kk ll ;; aa ss dd ff gg',
        // Short home-row words
        'a lad; a dad; a flask; a dash; a glass; a hall',
        'all lads had a sad dad; all lads had a sad dad',
        'a gala had half a flag; a gala had half a flag',
        'dads ask lads; dads ask lads; dads ask lads',
        'hash flash gash; dash slash lash; alfalfa falls',
        // Slightly longer home-row sentences
        'a glad lad had a flask; a flash; a dash; all adds',
        'ask if dad had a gala; all lads dash; a sad lass',
        'a ladda had half a lash; dads had glass; fads fall',
        'all fall; all had salads; a half had a gas flash',
        'a lass had a half dash; dads had salads at a gala',
        'hall; falls; ash; dad; had; lad; ask; sad; glass'
      ],
      // Thresholds are disability-first: LOW bars. Clearing is about consistency,
      // not speed competition. A dysgraphic 3rd-grader who clears 10 WPM at 80%
      // has shown real skill — reward it.
      masteryWpm: 10,
      masteryAcc: 80
    },
    'top-row': {
      id: 'top-row',
      name: 'Top Row',
      icon: '🔤',
      tier: 1,
      description: 'Reach up to q w e r t y u i o p',
      samples: [
        // Letter combos that reach to the top row
        'quiet power youth write terry opus; yet put',
        'we try to write; they are quite quiet; route',
        'the puppet plays; yellow trees; quiet forest',
        'your report is due; we quote the poet; typed',
        'we write, we edit, we repeat; quiet typewriter',
        // Short sentences with mostly top-row and home-row
        'we hope you try; pretty sure; just write it out',
        'they were quiet; the poet wrote a quirky story',
        'route 5 was quiet; we watched the sunset twice',
        'you have three options; type them out patiently',
        'try your very best; the report is due tomorrow',
        // More variety
        'a typewriter types; you type; we type together',
        'peace, quiet, rest; peace, quiet, rest; repeat',
        'the puppy had a toy; she tried to hide it twice',
        'pretty petals; yellow teapots; patient reporter',
        'who wrote this? your sister? the teacher? you?'
      ],
      locked: true,
      masteryWpm: 12,
      masteryAcc: 80
    },
    'bottom-row': {
      id: 'bottom-row',
      name: 'Bottom Row',
      icon: '🔡',
      tier: 2,
      description: 'Reach down to z x c v b n m',
      samples: [
        'zebra vex cab numb box vivid many; max bent',
        'the brown cat can mix many cubs in the cave',
        'move the box; climb the branch; next to the van',
        'my neighbor bakes muffins; very nice; we came',
        'bring a vest; the black cat meows; buzz buzz',
        // Simple bottom-row-heavy content
        'bob had a box; max saw a mouse; nate came back',
        'zip the bag; zap the bug; zoom the van; buzz off',
        'seven cubs came; many moved; none were harmed',
        'the bee made honey; the van moved; many smiled',
        'come back soon; bring the book; move the bench',
        // Longer mixed-row content that stresses bottom row
        'my cousin can bake; victor came by for a minute',
        'never give up; bravely climb; calmly breathe on',
        'the movers came by van; carry the box; mind it',
        'zebras have black and brown stripes; very clever',
        'bring me seven boxes of marbles before we leave'
      ],
      locked: true,
      masteryWpm: 15,
      masteryAcc: 80
    },
    'common-words': {
      id: 'common-words',
      name: 'Common Words',
      icon: '📝',
      tier: 3,
      description: 'High-frequency words build real reading fluency.',
      samples: [
        'the and of a to in is you that it he for was on',
        'she said that she was not going to the store with him',
        'we are all going to have a good time at the park today',
        'if you want to know, you can ask me and I will tell you',
        'there are many ways to do this, but this one is the best',
        // More sight-word-rich sentences
        'it was a good day for a walk in the park with the dog',
        'she looked up at the sky and saw the clouds move by',
        'all of the students got ready for the end of the day',
        'he would have gone if he knew, but no one told him',
        'do you want to come with us, or will you stay home today',
        // Fluency-building sentences
        'we had to wait for a long time before the bus came back',
        'my mom said that it was time for us to leave the house',
        'they were all very happy to be home after the long trip',
        'there is a little cat in the yard that comes every day',
        'we put our things away and then we got ready for bed'
      ],
      locked: true,
      masteryWpm: 18,
      masteryAcc: 85
    },
    'capitalization': {
      id: 'capitalization',
      name: 'Capitalization',
      icon: '🔠',
      tier: 4,
      description: 'Shift-key practice. Capitals at sentence starts and proper nouns.',
      // Shift-key adds real motor load. Thresholds drop slightly to reflect that.
      samples: [
        'The cat sat on the mat. Maine is a state in the USA.',
        'Samantha and Jordan went to Portland on Friday.',
        'My dog is named Baxter. He loves to play in the snow.',
        'Mrs. Lee teaches Math and Science at Roosevelt School.',
        'I saw an Eagle on the way to Bangor. It was huge.',
        // Proper nouns + sentence starts
        'On Monday, Ms. Park drove from Augusta to Bar Harbor.',
        'The Atlantic Ocean is cold in April, even near Camden.',
        'Did you read The Giver? Lois Lowry wrote it in 1993.',
        'Please meet Dr. Chen and Mr. Vega at the library.',
        'Washington, Oregon, and Idaho are in the Pacific Northwest.',
        // Mixed sentence-case practice
        'My brother Noah goes to Portland High School. He is fifteen.',
        'Today is Tuesday. Tomorrow is Wednesday. Soon it will be May.',
        'We drove through Lewiston, Auburn, and finally reached Orono.',
        'Ms. Okonkwo said, "Read Chapter Three tonight. Bring questions."',
        'In September the leaves in Maine turn red, orange, and gold.'
      ],
      locked: true,
      masteryWpm: 14,
      masteryAcc: 82
    },
    'number-row': {
      id: 'number-row',
      name: 'Number Row',
      icon: '🔢',
      tier: 5,
      description: 'Reach up to 1 2 3 4 5 6 7 8 9 0. Same finger-color map as letters.',
      samples: [
        '123 456 789 0; 135 246 789 024; 135 2468 13579',
        'call 555 1234 now; 202 555 0199; 207 555 0142',
        '12 plus 34 is 46; 100 minus 25 is 75; 7 times 8',
        'room 304 at 2:15; exit 27; mile 182; route 95',
        'year 2026; born 2014; grade 5; age 11; score 98',
        // Number drills paired with context
        '7 dogs, 8 cats, 9 rabbits, 10 mice, 3 birds, 42 fish',
        'apt 4b on 12th street; call 207 555 0123 to confirm',
        'ages 5 and 8 and 11; scores 92 and 87 and 100 and 74',
        'meeting at 3:30; test on 11/15; due 12/01; break 12/23',
        'zip codes 04101, 04102, 04103; plus 04104 and 04105',
        // Longer number practice
        'from mile 1 to mile 203; that is 202 miles in 3 hours',
        'room 105 is next to room 104 which is near room 103',
        'price: 29 dollars for 1, 55 dollars for 2, 80 for 3',
        'bus 9 arrives at 7:45, bus 14 at 8:12, bus 21 at 9:04',
        '50 50 40 40 30 30 20 20 10 10; 15 25 35 45 55 65 75'
      ],
      locked: true,
      masteryWpm: 14,
      masteryAcc: 80
    },
    'symbols': {
      id: 'symbols',
      name: 'Symbols',
      icon: '⁂',
      tier: 6,
      description: 'Shift + numbers for ! @ # $ % & ( ) and other punctuation.',
      samples: [
        'email me at test@example.com; use a #tag; (yes!)',
        'half-price today! 50% off all items; $3.99 each',
        'call (207) 555-0199 or email info@school.org',
        'question: what is 2 + 2? answer: 4! simple, right?',
        'use & not + when you mean and; "quotes" matter; go!',
        // Symbol-rich practical samples
        '#summer2026 #MaineLife #TypingPractice (try more!)',
        '$5.00 + $3.25 = $8.25 (with tax: ~$8.75)',
        'She said "hello!" and I said "hi!" (so polite)',
        'email: student@school.edu, phone: 207-555-0199',
        'Q&A: Who? What? When? Where? Why? & How? (the 5 Ws + H)',
        // Mixed sentence + symbols
        'Use @ for email addresses (like jane@example.com)',
        'The discount is 50% off! (limit 3 items per customer)',
        '#1 in the state! #2 nationally! We are proud & loud!',
        '"Type me!" she said, & I did (quite carefully, twice)',
        'Price range: $10 - $25 (average: ~$18; median: $17.50)'
      ],
      locked: true,
      masteryWpm: 12,
      masteryAcc: 80
    },
    'passage': {
      id: 'passage',
      name: 'Personalized Passage',
      icon: '✨',
      tier: 7,
      description: 'AI-generated passage for your grade level and interests. Not locked — anyone can use it.',
      samples: null,             // populated from state.aiPassage at drill-start
      locked: false,             // always available; progression is for structured drills
      requiresAI: true,
      masteryWpm: 20,
      masteryAcc: 90
    }
  };

  // Tier progression ordering for the skill tree and mastery-advance logic.
  // Change this list if you reorder tiers; don't compute from Object.keys(DRILLS)
  // since that's insertion-order and easy to mis-read.
  var TIER_ORDER = ['home-row', 'top-row', 'bottom-row', 'common-words', 'capitalization', 'number-row', 'symbols', 'passage'];

  // Stable-random sample picker: seeded on drillRunId which increments ONLY
  // when the student starts a fresh drill from the menu. "Drill again" from
  // summary keeps drillRunId the same so the retry uses identical text —
  // fair before/after comparison is the whole point of retrying.
  function pickDrillSample(drill, drillRunId) {
    if (!drill || !drill.samples || drill.samples.length === 0) return '';
    // xorshift-lite for a tiny bit of variety without a real RNG import
    var seed = (drillRunId || 0) + drill.id.length * 7;
    var idx = Math.abs(seed ^ (seed >> 3)) % drill.samples.length;
    return drill.samples[idx];
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 2b: KEYBOARD LAYOUT + FINGER MAP (on-screen keyboard accommodation)
  // ─────────────────────────────────────────────────────────
  // Standard US QWERTY. Each row is an array of key objects. Finger codes:
  // LP=left pinky, LR=left ring, LM=left middle, LI=left index,
  // RI=right index, RM=right middle, RR=right ring, RP=right pinky, T=thumb.
  // Finger colors teach motor-planning by color association.

  var KB_LAYOUT = [
    [
      { k: '`', f: 'LP' }, { k: '1', f: 'LP' }, { k: '2', f: 'LR' }, { k: '3', f: 'LM' },
      { k: '4', f: 'LI' }, { k: '5', f: 'LI' }, { k: '6', f: 'RI' }, { k: '7', f: 'RI' },
      { k: '8', f: 'RM' }, { k: '9', f: 'RR' }, { k: '0', f: 'RP' }, { k: '-', f: 'RP' }, { k: '=', f: 'RP' }
    ],
    [
      { k: 'q', f: 'LP' }, { k: 'w', f: 'LR' }, { k: 'e', f: 'LM' }, { k: 'r', f: 'LI' },
      { k: 't', f: 'LI' }, { k: 'y', f: 'RI' }, { k: 'u', f: 'RI' }, { k: 'i', f: 'RM' },
      { k: 'o', f: 'RR' }, { k: 'p', f: 'RP' }, { k: '[', f: 'RP' }, { k: ']', f: 'RP' }
    ],
    [
      { k: 'a', f: 'LP' }, { k: 's', f: 'LR' }, { k: 'd', f: 'LM' }, { k: 'f', f: 'LI' },
      { k: 'g', f: 'LI' }, { k: 'h', f: 'RI' }, { k: 'j', f: 'RI' }, { k: 'k', f: 'RM' },
      { k: 'l', f: 'RR' }, { k: ';', f: 'RP' }, { k: "'", f: 'RP' }
    ],
    [
      { k: 'z', f: 'LP' }, { k: 'x', f: 'LR' }, { k: 'c', f: 'LM' }, { k: 'v', f: 'LI' },
      { k: 'b', f: 'LI' }, { k: 'n', f: 'RI' }, { k: 'm', f: 'RI' }, { k: ',', f: 'RM' },
      { k: '.', f: 'RR' }, { k: '/', f: 'RP' }
    ],
    [
      { k: ' ', f: 'T', label: 'space', wide: 6 }
    ]
  ];

  var FINGER_COLOR = {
    LP: '#f87171', LR: '#fb923c', LM: '#fbbf24', LI: '#34d399',
    T:  '#60a5fa',
    RI: '#34d399', RM: '#fbbf24', RR: '#fb923c', RP: '#f87171'
  };

  function findKeyMeta(char) {
    var lower = (char || '').toLowerCase();
    for (var r = 0; r < KB_LAYOUT.length; r++) {
      for (var c = 0; c < KB_LAYOUT[r].length; c++) {
        if (KB_LAYOUT[r][c].k === lower) return KB_LAYOUT[r][c];
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 2c: AUDIO CUES — Web Audio API, lazy-initialized
  // ─────────────────────────────────────────────────────────
  // Pleasant tone on correct keypress; softer lower tone on error.
  // Initialized on first use (browsers require user-interaction before audio).

  var _audioCtx = null;

  function getAudioCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _audioCtx = new AC();
    } catch (e) { return null; }
    return _audioCtx;
  }

  function playTone(freq, durationMs, type) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      // Gentle envelope: attack 5ms, sustain, release
      var now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
      gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationMs / 1000 + 0.02);
    } catch (e) { /* audio failures must not break typing */ }
  }

  // Audio themes — each maps a "correct" and "error" tone spec.
  // Themes are procedural (Web Audio) so no external assets load.
  var AUDIO_THEMES = {
    chime: {
      correct: { freq: 880, ms: 40,  type: 'sine' },     // bright A5 chime
      error:   { freq: 200, ms: 100, type: 'triangle' }  // low thunk
    },
    soft: {
      correct: { freq: 523, ms: 55,  type: 'sine' },     // C5 gentle
      error:   { freq: 330, ms: 70,  type: 'sine' }      // E4 gentle, no contrast alarm
    },
    mute: null
  };

  function audioCorrect(themeName) {
    var theme = AUDIO_THEMES[themeName || 'chime'];
    if (!theme) return; // mute
    playTone(theme.correct.freq, theme.correct.ms, theme.correct.type);
  }
  function audioError(themeName) {
    var theme = AUDIO_THEMES[themeName || 'chime'];
    if (!theme) return; // mute
    playTone(theme.error.freq, theme.error.ms, theme.error.type);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3: STYLE HELPERS
  // ─────────────────────────────────────────────────────────
  // Palette matches other STEM Lab tools (roadready-style dark UI).

  var PALETTE = {
    bg:        '#0f172a',
    surface:   '#1e293b',
    surface2:  '#334155',
    border:    '#334155',
    text:      '#e2e8f0',
    textDim:   '#cbd5e1',
    textMute:  '#a3a3a3',
    accent:    '#60a5fa',
    accentDim: '#3b82f6',
    success:   '#34d399',
    warn:      '#fbbf24',
    danger:    '#f87171'
  };

  var HIGH_CONTRAST_PALETTE = {
    bg:        '#000000',
    surface:   '#111111',
    surface2:  '#1a1a1a',
    border:    '#ffffff',
    text:      '#ffffff',
    textDim:   '#ffffff',
    textMute:  '#ffff00',
    accent:    '#ffff00',
    accentDim: '#ffee00',
    success:   '#00ff00',
    warn:      '#ffaa00',
    danger:    '#ff4444'
  };

  function getPalette(accommodations) {
    return (accommodations && accommodations.highContrast) ? HIGH_CONTRAST_PALETTE : PALETTE;
  }

  function getFontFamily(accommodations) {
    if (accommodations && accommodations.dyslexiaFont) {
      // OpenDyslexic preferred; fallback to system safe-list with increased letter spacing.
      return '"OpenDyslexic", "Comic Sans MS", "Lexend", system-ui, sans-serif';
    }
    return 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3b: GLOBAL FOCUS-RING STYLE (WCAG AA)
  // ─────────────────────────────────────────────────────────
  // Inject once on module load. Uses :focus-visible so mouse clicks don't
  // leave persistent outlines but keyboard tab navigation always shows a
  // clear ring. Scoped via a data attribute so it doesn't affect the rest
  // of AlloFlow.

  (function injectFocusStyles() {
    if (document.getElementById('tp-focus-styles')) return;
    var style = document.createElement('style');
    style.id = 'tp-focus-styles';
    // Scoped to .tp-root so we don't affect the rest of AlloFlow.
    // :focus-visible means mouse clicks don't leave persistent outlines,
    // but keyboard tab always shows a clear accessible ring.
    style.textContent = [
      '.tp-root button:focus-visible,',
      '.tp-root [tabindex]:focus-visible,',
      '.tp-root input:focus-visible,',
      '.tp-root textarea:focus-visible,',
      '.tp-root [role="switch"]:focus-visible {',
      '  outline: 3px solid #fbbf24;',
      '  outline-offset: 2px;',
      '  border-radius: 8px;',
      '}',
      '.tp-root button:focus:not(:focus-visible),',
      '.tp-root [tabindex]:focus:not(:focus-visible) { outline: none; }'
    ].join('\n');
    document.head.appendChild(style);
  })();

  // ─────────────────────────────────────────────────────────
  // SECTION 4: REGISTER TOOL
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('typingPractice', {
    name: 'Typing Practice',
    icon: '⌨️',
    category: 'life-skills',
    description: 'Keyboarding designed for students with disabilities — accommodations are the product, not a menu. AI-personalized passages, IEP-ready progress, no ads or racing.',
    tags: ['typing', 'keyboarding', 'life-skills', 'accessibility', 'dyslexia', 'dysgraphia', 'motor-planning', 'iep'],

    render: function(ctx) {
      try {
        var React = ctx.React;
        var h = React.createElement;
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useRef = React.useRef;
        var useCallback = React.useCallback;

        // Pull persistent state, merged with defaults for forward-compatibility
        var rawState = (ctx.toolData && ctx.toolData['typingPractice']) || {};
        var state = Object.assign({}, DEFAULT_STATE, rawState);
        state.accommodations = Object.assign({}, DEFAULT_STATE.accommodations, rawState.accommodations || {});

        var upd = function(key, val) { ctx.update('typingPractice', key, val); };
        var updMulti = function(obj) { ctx.updateMulti ? ctx.updateMulti('typingPractice', obj) : Object.keys(obj).forEach(function(k) { upd(k, obj[k]); }); };
        var addToast = ctx.addToast || function(msg) { console.log('[TypingPractice]', msg); };

        var palette = getPalette(state.accommodations);
        var fontFamily = getFontFamily(state.accommodations);

        // ── Drill-local state (hooks must be called unconditionally every render) ──
        var typedTuple = useState('');
        var typed = typedTuple[0], setTyped = typedTuple[1];

        var startTimeTuple = useState(null);
        var startTime = startTimeTuple[0], setStartTime = startTimeTuple[1];

        var errorsTuple = useState(0);
        var errorCount = errorsTuple[0], setErrorCount = errorsTuple[1];

        var lastWasWrongTuple = useState(false);
        var lastWasWrong = lastWasWrongTuple[0], setLastWasWrong = lastWasWrongTuple[1];

        var nowTickTuple = useState(0);  // forces re-render for live WPM clock
        var _nowTick = nowTickTuple[0], setNowTick = nowTickTuple[1];

        var lastSummaryTuple = useState(null);
        var lastSummary = lastSummaryTuple[0], setLastSummary = lastSummaryTuple[1];

        // Pause/resume — disability-aware. Paused time doesn't count against
        // WPM. No session-breaking if the student needs to step away.
        var pausedTuple = useState(false);
        var paused = pausedTuple[0], setPaused = pausedTuple[1];
        var pausedMsTuple = useState(0);  // cumulative paused duration in ms
        var pausedMs = pausedMsTuple[0], setPausedMs = pausedMsTuple[1];

        // Per-character error counts for this drill (reset on drill entry)
        var errorCharsTuple = useState({});
        var errorChars = errorCharsTuple[0], setErrorChars = errorCharsTuple[1];
        var pauseStartedAtTuple = useState(null);
        var pauseStartedAt = pauseStartedAtTuple[0], setPauseStartedAt = pauseStartedAtTuple[1];

        // Announcer for screen readers. Setting this string renders into an
        // aria-live region so assistive tech reads milestones aloud.
        var announceTuple = useState('');
        var announceText = announceTuple[0], setAnnounceText = announceTuple[1];

        var startBtnRef = useRef(null);

        // Local note draft for the summary view's "add a note" field.
        // Persists into the session record when student/clinician clicks Save.
        var noteDraftTuple = useState('');
        var noteDraft = noteDraftTuple[0], setNoteDraft = noteDraftTuple[1];
        var noteSavedTuple = useState(false);
        var noteSaved = noteSavedTuple[0], setNoteSaved = noteSavedTuple[1];

        // Selected session in the progress-view sparkline (for click-to-expand detail)
        var selectedDetailTuple = useState(null);
        var selectedDetailIdx = selectedDetailTuple[0], setSelectedDetailIdx = selectedDetailTuple[1];

        // Report filters: date range + drill type. UI-only, not persisted.
        // Affects IEP report, CSV export, and the trend sparkline. Baseline /
        // skill-tree / lifetime totals stay all-time on purpose (milestones).
        var filterStartTuple = useState('');
        var filterStart = filterStartTuple[0], setFilterStart = filterStartTuple[1];
        var filterEndTuple = useState('');
        var filterEnd = filterEndTuple[0], setFilterEnd = filterEndTuple[1];
        var filterDrillTuple = useState('');
        var filterDrill = filterDrillTuple[0], setFilterDrill = filterDrillTuple[1];
        var restNudgeShownRef = useRef(false);

        // Passage-generation-local state (separate from persistent state so
        // loading flag and draft topic don't get written to ctx.toolData)
        var draftTopicTuple = useState((state.passagePrefs && state.passagePrefs.topic) || '');
        var draftTopic = draftTopicTuple[0], setDraftTopic = draftTopicTuple[1];
        var draftGradeTuple = useState((state.passagePrefs && state.passagePrefs.gradeLevel) || '2-3');
        var draftGrade = draftGradeTuple[0], setDraftGrade = draftGradeTuple[1];
        var draftDifficultyTuple = useState((state.passagePrefs && state.passagePrefs.difficulty) || 'on-level');
        var draftDifficulty = draftDifficultyTuple[0], setDraftDifficulty = draftDifficultyTuple[1];
        var genLoadingTuple = useState(false);
        var genLoading = genLoadingTuple[0], setGenLoading = genLoadingTuple[1];
        var genErrorTuple = useState(null);
        var genError = genErrorTuple[0], setGenError = genErrorTuple[1];

        var captureRef = useRef(null);
        var completionSavedRef = useRef(false);

        // ── Active drill and target text ──
        var activeDrill = state.currentDrill ? DRILLS[state.currentDrill] : null;
        var targetStr;
        if (activeDrill && activeDrill.id === 'passage' && state.aiPassage && state.aiPassage.text) {
          targetStr = state.aiPassage.text;
        } else if (activeDrill) {
          // Seeded on drillRunId — same text on "Drill again" retries,
          // different text when student re-enters the drill from the menu.
          targetStr = pickDrillSample(activeDrill, state.drillRunId);
        } else {
          targetStr = '';
        }

        var drillComplete = state.view === 'drill' && targetStr && typed.length >= targetStr.length;

        // ── Reset drill state when entering the drill view with a new drill ──
        useEffect(function() {
          if (state.view === 'drill') {
            setTyped('');
            setStartTime(null);
            setErrorCount(0);
            setErrorChars({});
            setLastWasWrong(false);
            setPaused(false);
            setPausedMs(0);
            setPauseStartedAt(null);
            completionSavedRef.current = false;
            restNudgeShownRef.current = false;
            // Clear any stale note draft from a prior summary
            setNoteDraft('');
            setNoteSaved(false);
            // Focus the capture surface so keystrokes flow in
            setTimeout(function() {
              if (captureRef.current && captureRef.current.focus) captureRef.current.focus();
            }, 50);
          }
        // eslint-disable-next-line
        }, [state.view, state.currentDrill]);

        // ── Live clock: tick rapidly during drill so WPM + pace beat stay smooth ──
        useEffect(function() {
          if (state.view !== 'drill' || drillComplete) return;
          // 100ms is cheap and keeps the pace-target beat dot fluid even at 40 WPM.
          var iv = setInterval(function() { setNowTick(Date.now()); }, 100);
          return function() { clearInterval(iv); };
        }, [state.view, drillComplete]);

        // ── Handle drill completion: save session, update best, route to summary ──
        useEffect(function() {
          if (!drillComplete || !startTime) return;
          if (completionSavedRef.current) return;
          completionSavedRef.current = true;
          var endMs = Date.now();
          // Subtract any accumulated paused time so breaks don't tank WPM.
          // If the student is currently paused (unusual at completion), include
          // that final pause-so-far too.
          var pausedTotal = pausedMs + (pauseStartedAt ? (endMs - pauseStartedAt) : 0);
          var activeMs = Math.max(endMs - startTime - pausedTotal, 1000); // 1s minimum
          var minutes = activeMs / 60000;
          var wpm = Math.round((typed.length / 5) / minutes);
          var totalKeystrokes = typed.length + errorCount;
          var accuracy = totalKeystrokes > 0 ? Math.round((typed.length / totalKeystrokes) * 100) : 100;
          var summary = {
            drillId: activeDrill.id,
            drillName: activeDrill.name,
            wpm: wpm,
            accuracy: accuracy,
            durationSec: Math.round(activeMs / 1000),  // active time excludes paused breaks
            pausedSec: Math.round(pausedTotal / 1000),
            errors: errorCount,
            errorChars: errorChars,  // per-char error map: { 'a': 2, 'd': 1, ... }
            charCount: typed.length,
            date: new Date().toISOString(),
            accommodationsUsed: Object.keys(state.accommodations).filter(function(k) { return state.accommodations[k] === true || (state.accommodations[k] && state.accommodations[k] !== false); })
          };

          // Persist session, capped at MAX_SESSIONS most recent.
          // Also track cumulative lifetime totals that don't decay with capping
          // (so the IEP report stays accurate even if older sessions drop).
          var MAX_SESSIONS = 200;
          var priorSessions = state.sessions || [];
          var allSessions = priorSessions.concat([summary]);
          var sessions = allSessions.length > MAX_SESSIONS
            ? allSessions.slice(allSessions.length - MAX_SESSIONS)
            : allSessions;
          var lifetime = state.lifetime || { totalSessions: 0, totalCharsTyped: 0, totalErrorsLogged: 0 };
          lifetime = {
            totalSessions: (lifetime.totalSessions || 0) + 1,
            totalCharsTyped: (lifetime.totalCharsTyped || 0) + (summary.charCount || 0),
            totalErrorsLogged: (lifetime.totalErrorsLogged || 0) + (summary.errors || 0)
          };
          // Aggregate per-char errors across all sessions — cheaper than
          // recomputing from the (capped) session array on every render.
          var aggregateErrors = Object.assign({}, state.aggregateErrors || {});
          Object.keys(errorChars).forEach(function(ch) {
            aggregateErrors[ch] = (aggregateErrors[ch] || 0) + errorChars[ch];
          });
          var nextUpdates = { sessions: sessions, lifetime: lifetime, aggregateErrors: aggregateErrors };

          // Set baseline if first-ever session
          if (!state.baseline) {
            nextUpdates.baseline = { wpm: wpm, accuracy: accuracy, date: summary.date, drillId: activeDrill.id };
          }

          // Personal best (per drill)
          var pb = Object.assign({}, state.personalBest || {});
          var prev = pb[activeDrill.id];
          var isNewBest = false;
          if (!prev || wpm > prev.wpm || (wpm === prev.wpm && accuracy > prev.accuracy)) {
            pb[activeDrill.id] = { wpm: wpm, accuracy: accuracy, date: summary.date };
            nextUpdates.personalBest = pb;
            isNewBest = !!prev;
          }

          summary.isNewBest = isNewBest;
          summary.isBaseline = !state.baseline;

          // ── Mastery advancement ──
          // If this drill's mastery threshold is met AND the student is currently
          // at a mastery level equal to this drill's tier, advance their mastery.
          // Advancement unlocks the next structured drill.
          var masteryAdvanced = false;
          // Only advance if: threshold met + currently at this drill's tier
          // + there's a next tier to advance to. Passage (tier 7) is terminal
          // for mastery but doesn't gate anything.
          var maxAdvanceableTier = 6; // above symbols tier; passage is terminal
          if (activeDrill.masteryWpm && activeDrill.masteryAcc &&
              wpm >= activeDrill.masteryWpm && accuracy >= activeDrill.masteryAcc &&
              state.masteryLevel === activeDrill.tier && activeDrill.tier <= maxAdvanceableTier) {
            nextUpdates.masteryLevel = state.masteryLevel + 1;
            masteryAdvanced = true;
          }
          summary.masteryAdvanced = masteryAdvanced;
          summary.newMasteryLevel = masteryAdvanced ? state.masteryLevel + 1 : state.masteryLevel;

          // ── AlloBot Sage spell unlocks: no push hook needed ──
          // AlloBot Sage uses a PULL architecture: each spell declares an
          // `unlock(d)` predicate that reads `toolData` directly (see
          // stem_tool_allobotsage.js). For typing-practice spells to work,
          // future entries in that file predicate on fields we already store:
          //   (d.typingPractice || {}).masteryLevel          → tier gating
          //   ((d.typingPractice || {}).sessions || []).length → volume gating
          //   (((d.typingPractice || {}).personalBest || {})['home-row'] || {}).wpm → speed gating
          // No hook call required here. Writing to ctx.toolData (via updMulti
          // below) is the contract.

          nextUpdates.view = 'summary';
          updMulti(nextUpdates);
          setLastSummary(summary);

          if (masteryAdvanced) {
            addToast('🌟 Mastery tier advanced! ' + DRILLS[activeDrill.id].name + ' cleared.');
            setAnnounceText('Mastery tier advanced. ' + DRILLS[activeDrill.id].name + ' cleared. New tier: ' + nextUpdates.masteryLevel + ' of 7.');
          } else if (isNewBest) {
            setAnnounceText('New personal best on ' + activeDrill.name + '. ' + wpm + ' words per minute at ' + accuracy + ' percent accuracy.');
          } else if (summary.isBaseline) {
            setAnnounceText('Baseline session saved. ' + wpm + ' words per minute at ' + accuracy + ' percent accuracy.');
          }
        // eslint-disable-next-line
        }, [drillComplete]);

        // ── Pause toggle ──
        var togglePause = function() {
          if (paused) {
            // Resume: add this paused chunk to total, then clear the marker
            if (pauseStartedAt) setPausedMs(pausedMs + (Date.now() - pauseStartedAt));
            setPauseStartedAt(null);
            setPaused(false);
            setTimeout(function() {
              if (captureRef.current) captureRef.current.focus();
            }, 20);
          } else {
            // Pause: mark start-of-pause
            setPauseStartedAt(Date.now());
            setPaused(true);
          }
        };

        // ── Keystroke handler ──
        var onKeyDown = useCallback(function(e) {
          if (state.view !== 'drill' || drillComplete || !targetStr) return;
          // Swallow modifier-only keys
          if (e.ctrlKey || e.metaKey || e.altKey) return;

          var key = e.key;

          if (key === 'Escape') {
            e.preventDefault();
            upd('view', 'menu');
            return;
          }

          // Pause / resume on space when student hasn't started typing yet?
          // No — space is a valid typing char. Instead, pause is a click-button.
          // But allow keyboard users to pause via "P" only while NOT actively
          // typing in an AI passage (unlikely overlap) and NOT in a structured
          // drill where P is a target char. Actually skip keyboard shortcut:
          // make pause button the sole entry point so it can't collide.

          // If paused, swallow all keystrokes so breaks are true breaks
          if (paused) { e.preventDefault(); return; }

          if (key === 'Backspace') {
            e.preventDefault();
            if (typed.length > 0) {
              setTyped(typed.slice(0, -1));
              setLastWasWrong(false);
            }
            return;
          }

          // Only accept printable single-char keys
          if (key.length !== 1) return;
          e.preventDefault();

          // Start the clock on the first keystroke
          if (startTime === null) setStartTime(Date.now());

          var expected = targetStr[typed.length];
          if (key === expected) {
            setTyped(typed + key);
            setLastWasWrong(false);
            if (state.accommodations.audioCues) audioCorrect(state.audioTheme);
          } else {
            // Wrong key: count error. In error-tolerant mode, we STILL advance
            // so dysgraphic students don't get stuck — the error is logged but
            // progress continues. Default mode blocks.
            setErrorCount(errorCount + 1);
            setLastWasWrong(true);
            // Track per-character error: index by the EXPECTED char (lowercased)
            // so 'A' and 'a' aggregate together. Skip space — errors on space
            // aren't about a specific key needing practice.
            if (expected && expected !== ' ') {
              var expLower = expected.toLowerCase();
              var nextErrors = Object.assign({}, errorChars);
              nextErrors[expLower] = (nextErrors[expLower] || 0) + 1;
              setErrorChars(nextErrors);
            }
            if (state.accommodations.audioCues) audioError(state.audioTheme);
            if (state.accommodations.errorTolerant) {
              setTyped(typed + expected); // auto-advance with the correct char
            }
          }
        }, [state.view, drillComplete, targetStr, typed, startTime, errorCount, errorChars, state.accommodations.errorTolerant, state.accommodations.audioCues, state.audioTheme, paused]);

        // ── Navigation helpers ──
        var go = function(view) { upd('view', view); };
        var startDrill = function(drillId) {
          var drill = DRILLS[drillId];
          if (!drill) return;
          if (drill.locked && state.masteryLevel < drill.tier) {
            addToast('🔒 Reach tier ' + drill.tier + ' to unlock ' + drill.name);
            return;
          }
          // AI passages go through setup first (grade + topic), then generate, then drill.
          if (drill.requiresAI) {
            updMulti({ view: 'passage-setup', currentDrill: drillId });
            return;
          }
          // Increment drillRunId so a fresh text is picked. Route to the intro
          // screen so the student can see what they're about to type and get
          // ready — motor-planning and attention accommodation. Entry point to
          // the actual capture-typing surface is inside the intro screen.
          // "Drill again" from summary does NOT call startDrill — it directly
          // restores view='drill' without bumping drillRunId, so retries use
          // the same text AND skip the intro.
          updMulti({ view: 'drill-intro', currentDrill: drillId, drillRunId: (state.drillRunId || 0) + 1 });
        };

        // ═════════════════════════════════════════════════════
        // VIEW: MENU (landing screen) — step 1 scaffold
        // ═════════════════════════════════════════════════════
        function renderMenu() {
          var badgeCount = (state.accommodationBadges || []).length;
          var sessionCount = (state.sessions || []).length;

          return h('div', {
            role: 'region',
            'aria-label': 'Typing Practice menu',
            style: {
              padding: '20px',
              maxWidth: '960px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            // Header
            h('div', { style: { marginBottom: '24px' } },
              h('h2', {
                style: {
                  margin: '0 0 6px 0',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: palette.text,
                  letterSpacing: '-0.01em'
                }
              }, '⌨️  Typing Practice'),
              h('p', {
                style: {
                  margin: 0,
                  fontSize: '13px',
                  color: palette.textMute,
                  lineHeight: '1.5',
                  maxWidth: '640px'
                }
              }, 'Built for learners with dysgraphia, dyslexia, ADHD, motor-planning differences, and low vision. Go at your own pace — there are no timers, leaderboards, or streak punishments here.')
            ),

            // First-run welcome card — dismissible, once-only.
            !state.onboardingSeen && sessionCount === 0 ? h('div', {
              role: 'region',
              'aria-label': 'Welcome',
              style: {
                marginBottom: '20px',
                padding: '18px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderLeft: '3px solid ' + palette.success,
                borderRadius: '10px'
              }
            },
              h('div', { style: { fontSize: '12px', color: palette.success, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' } }, '👋 Welcome'),
              h('ul', { style: { margin: '0 0 14px 0', padding: '0 0 0 18px', fontSize: '13px', color: palette.textDim, lineHeight: '1.7' } },
                h('li', null, 'Pick a drill below. ', h('strong', null, 'Home Row'), ' is where most people start — fingers rest on a, s, d, f  ·  j, k, l, ;'),
                h('li', null, 'Turn on accommodations from the ', h('strong', null, 'Accommodations'), ' button. Dyslexia font, audio cues, high-contrast, large-key keyboard, and more — they\'re the product, not a fallback.'),
                h('li', null, 'No timers, no races, no streak punishments. Go at your pace. Pause whenever.'),
                h('li', null, 'A clinician or teacher can set an IEP goal and export progress from the ', h('strong', null, 'Progress & Goals'), ' view.')
              ),
              h('button', {
                onClick: function() { upd('onboardingSeen', true); },
                style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '12px', padding: '7px 14px' })
              }, 'Got it, thanks')
            ) : null,

            // Quick stats strip (only if student has activity)
            sessionCount > 0 ? h('div', {
              style: {
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }
            },
              h('div', { style: statCardStyle(palette) },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Sessions'),
                h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.accent } }, sessionCount)
              ),
              h('div', { style: statCardStyle(palette) },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Mastery Tier'),
                h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.success } }, state.masteryLevel + ' / 7')
              ),
              badgeCount > 0 ? h('div', { style: statCardStyle(palette) },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Badges'),
                h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.warn } }, badgeCount)
              ) : null
            ) : null,

            // Practice recommendations — pattern-based nudges (no guilt, just hints)
            (function() {
              var rec = computePracticeRecommendation(state);
              if (!rec) return null;
              return h('div', {
                role: 'note',
                style: {
                  marginBottom: '16px',
                  padding: '12px 14px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderLeft: '3px solid ' + palette.accent,
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }
              },
                h('div', { style: { fontSize: '11px', color: palette.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } }, '💡 Suggestion'),
                h('div', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.5', flex: '1 1 240px' } }, rec.text),
                rec.drillId ? h('button', {
                  onClick: function() { startDrill(rec.drillId); },
                  style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '11px', padding: '6px 12px' })
                }, 'Try it') : null
              );
            })(),

            // Drill cards
            h('div', { style: { marginBottom: '24px' } },
              h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                  fontWeight: 700
                }
              }, 'Choose a drill'),
              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px'
                }
              },
                Object.keys(DRILLS).map(function(drillId) {
                  var drill = DRILLS[drillId];
                  var unlocked = !drill.locked || state.masteryLevel >= drill.tier;
                  return renderDrillCard(drill, unlocked, palette, startDrill);
                })
              )
            ),

            // Secondary navigation
            h('div', {
              style: {
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                borderTop: '1px solid ' + palette.border,
                paddingTop: '16px'
              }
            },
              renderNavButton('📊 Progress & Goals', function() { go('progress'); }, palette, (state.sessions || []).length === 0),
              renderNavButton('⚙️ Accommodations', function() { go('settings'); }, palette, false),
              state.iepGoal ? h('div', {
                style: {
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: palette.textMute,
                  alignSelf: 'center',
                  fontStyle: 'italic'
                }
              }, '🎯 IEP goal active') : null
            )
          );
        }

        // ═════════════════════════════════════════════════════
        // VIEW: DRILL-INTRO — "Ready?" screen between menu and typing.
        // Gives the student a moment to prepare (motor-planning/attention
        // accommodation). Space key OR Start button advances.
        // ═════════════════════════════════════════════════════
        function renderDrillIntro() {
          var drill = activeDrill || DRILLS['home-row'];
          var preview = targetStr ? (targetStr.length > 80 ? targetStr.slice(0, 80) + '…' : targetStr) : '';
          var acc = state.accommodations || {};
          var activeAccLabels = [];
          if (acc.dyslexiaFont)  activeAccLabels.push('dyslexia font');
          if (acc.largeKeys)     activeAccLabels.push('on-screen keyboard');
          if (acc.highContrast)  activeAccLabels.push('high contrast');
          if (acc.audioCues)     activeAccLabels.push('audio cues (' + (state.audioTheme || 'chime') + ')');
          if (acc.errorTolerant) activeAccLabels.push('error-tolerant');
          if (acc.paceTargetWpm) activeAccLabels.push('pace target ' + acc.paceTargetWpm + ' WPM');

          var startNow = function() {
            updMulti({ view: 'drill' });
          };

          return h('div', {
            style: {
              padding: '20px',
              maxWidth: '760px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            renderBackButton(function() { go('menu'); }, palette),

            h('div', {
              style: {
                marginTop: '14px',
                padding: '28px 24px',
                background: palette.surface,
                borderRadius: '14px',
                border: '1px solid ' + palette.border,
                textAlign: 'center'
              }
            },
              h('div', { style: { fontSize: '44px', marginBottom: '10px' } }, drill.icon),
              h('h3', { style: { margin: '0 0 6px 0', color: palette.text, fontSize: '22px', fontWeight: 700 } }, drill.name),
              h('p', { style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' } }, drill.description),

              // Preview pane
              preview ? h('div', {
                style: {
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  padding: '18px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: state.accommodations.largeKeys ? '20px' : '16px',
                  color: palette.textDim,
                  letterSpacing: '0.04em',
                  lineHeight: '1.8',
                  marginBottom: '20px',
                  textAlign: 'left'
                }
              }, preview) : null,

              // IEP goal reminder (if set)
              state.iepGoal && state.iepGoal.targetWpm ? h('div', {
                style: {
                  marginBottom: '16px',
                  padding: '8px 14px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderLeft: '3px solid ' + palette.success,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: palette.textDim
                }
              },
                h('span', { style: { color: palette.success, fontWeight: 700 } }, '🎯 Working toward: '),
                state.iepGoal.targetWpm + ' WPM at ' + state.iepGoal.targetAccuracy + '%'
              ) : null,

              // Active accommodations chip row
              activeAccLabels.length > 0 ? h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  marginBottom: '18px',
                  lineHeight: '1.6'
                }
              }, '🏅 On: ' + activeAccLabels.join(' · ')) : h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  marginBottom: '18px',
                  fontStyle: 'italic'
                }
              }, 'Tip: Visit Accommodations from the menu to turn on supports that help you.'),

              // Start button (primary) + hint — useEffect below auto-focuses
              h('button', {
                ref: startBtnRef,
                onClick: startNow,
                style: Object.assign({}, primaryBtnStyle(palette), {
                  padding: '14px 32px',
                  fontSize: '16px'
                })
              }, '▶ Start drill'),

              h('div', {
                style: { fontSize: '11px', color: palette.textMute, marginTop: '14px' }
              }, 'Or press Space or Enter to begin. Press Esc any time during the drill to exit.')
            )
          );
        }

        // ── Keyboard shortcut: space/enter on the intro screen starts the drill ──
        useEffect(function() {
          if (state.view !== 'drill-intro') return;
          // Focus the Start button once on entry so keyboard users can
          // immediately press Enter/Space without tabbing first.
          setTimeout(function() {
            if (startBtnRef.current && startBtnRef.current.focus) {
              try { startBtnRef.current.focus(); } catch (e) { /* ignore */ }
            }
          }, 60);
          var handler = function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
              // Don't hijack keystrokes inside inputs/textareas (defensive —
              // the intro screen has neither, but future-proof)
              var tag = e.target && e.target.tagName;
              if (tag === 'INPUT' || tag === 'TEXTAREA') return;
              e.preventDefault();
              updMulti({ view: 'drill' });
            } else if (e.key === 'Escape') {
              e.preventDefault();
              upd('view', 'menu');
            }
          };
          window.addEventListener('keydown', handler);
          return function() { window.removeEventListener('keydown', handler); };
        // eslint-disable-next-line
        }, [state.view]);

        // ═════════════════════════════════════════════════════
        // AI PASSAGE GENERATION — uses ctx.callGemini with jsonMode=FALSE
        // (per project memory: jsonMode=true wraps HTML/text output and breaks it)
        // ═════════════════════════════════════════════════════
        var generatePassage = function() {
          var callGemini = ctx.callGemini;
          if (!callGemini) {
            setGenError('AI generation is not available in this context. Please reload and try again.');
            return;
          }
          var grade = draftGrade;
          var topic = (draftTopic || '').trim();
          var difficulty = draftDifficulty || 'on-level';
          var complexityLine = GRADE_COMPLEXITY[grade] || GRADE_COMPLEXITY['2-3'];

          // Within-grade difficulty modifier appended to the base grade guidance.
          // Easier = more scaffolded than the grade default; Stretch = reaching up.
          // We deliberately keep these gentle — this is typing practice, not a
          // cognitive load test.
          var difficultyLine;
          if (difficulty === 'easier') {
            difficultyLine = 'DIFFICULTY MODIFIER: Target slightly BELOW the stated grade level. Use shorter sentences (reduce by 1-2 words per sentence from the grade guidance). Prefer the most common words. This student is building confidence or recovering after a hard session.';
          } else if (difficulty === 'stretch') {
            difficultyLine = 'DIFFICULTY MODIFIER: Target slightly ABOVE the stated grade level. Include 1-2 more challenging vocabulary words introduced with clear context. Slightly longer sentences allowed. This student is ready for a gentle reach.';
          } else {
            difficultyLine = 'DIFFICULTY MODIFIER: Target exactly the stated grade level. No reduction or stretch.';
          }

          var prompt = [
            'You are generating a typing-practice passage for a student.',
            '',
            'Student grade level guidance: ' + complexityLine,
            '',
            difficultyLine,
            '',
            topic
              ? 'The student chose this topic: "' + topic + '". Write a passage that is genuinely about this topic.'
              : 'The student did not choose a topic. Pick a wholesome, age-appropriate topic suitable for this grade (animals, weather, space, sports, a story about a character doing something kind, etc.).',
            '',
            'CRITICAL RULES FOR A TYPING-PRACTICE PASSAGE:',
            '- Length: 30 to 55 words total. Count your words.',
            '- Use ONLY standard ASCII punctuation: period, comma, question mark, exclamation mark, apostrophe, and hyphen. NO curly/smart quotes. NO em-dashes. NO ellipsis character (use three periods). NO accented letters. NO emoji.',
            '- Lowercase is fine. Capital letters only at the start of sentences or for proper nouns.',
            '- No numbers unless essential (typing digits requires reaching up to the number row, which is advanced).',
            '- No lists, no headers, no markdown, no HTML. Plain sentences only.',
            '- This is for a student with possible disabilities (dyslexia, dysgraphia, motor planning). Keep it encouraging and calm. No pressure, no competition framing.',
            '',
            'Output ONLY the passage text, nothing else. No preamble, no title, no explanation. Just the sentences.'
          ].join('\n');

          setGenLoading(true);
          setGenError(null);

          // jsonMode=FALSE is critical — we want plain text.
          Promise.resolve(callGemini(prompt, false, false, 0.8, null))
            .then(function(result) {
              var text = (result || '').toString().trim();
              if (!text) throw new Error('No text returned.');
              // Light cleanup: strip surrounding quotes if the model wrapped it.
              text = text.replace(/^["']+|["']+$/g, '').trim();
              // Replace any fancy quotes/dashes that slipped through.
              text = text
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2013\u2014]/g, '-')
                .replace(/\u2026/g, '...');
              var passage = {
                text: text,
                gradeLevel: grade,
                topic: topic,
                difficulty: difficulty,
                generatedAt: new Date().toISOString()
              };
              updMulti({
                aiPassage: passage,
                passagePrefs: { gradeLevel: grade, topic: topic, difficulty: difficulty },
                view: 'drill',
                currentDrill: 'passage'
              });
              setGenLoading(false);
            })
            .catch(function(err) {
              console.error('[TypingPractice] Passage generation failed:', err);
              setGenError('Could not generate a passage. ' + (err && err.message ? err.message : 'Please try again.'));
              setGenLoading(false);
            });
        };

        // ═════════════════════════════════════════════════════
        // VIEW: PASSAGE-SETUP — grade + topic picker, then generate
        // ═════════════════════════════════════════════════════
        function renderPassageSetup() {
          var cached = state.aiPassage;
          var gradeOptions = ['K', '1', '2-3', '4-5', '6-8', '9-12'];

          return h('div', {
            style: {
              padding: '20px',
              maxWidth: '720px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            renderBackButton(function() { go('menu'); }, palette),
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, '✨  Personalized Passage'),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, 'Generate a passage at your grade level about something you care about. Passages are always age-appropriate and disability-aware.'),

            // Grade selector
            h('div', { style: { marginBottom: '18px' } },
              h('div', { style: { fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: palette.text } }, 'Grade level'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                gradeOptions.map(function(g) {
                  var isActive = draftGrade === g;
                  return h('button', {
                    key: 'grade-' + g,
                    onClick: function() { setDraftGrade(g); },
                    style: {
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? '#0f172a' : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      font: 'inherit'
                    }
                  }, g);
                })
              )
            ),

            // Within-grade difficulty picker — fine-tune the prompt beyond
            // the grade band. Keeps options few; on-level is the default.
            h('div', { style: { marginBottom: '18px' } },
              h('div', { style: { fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: palette.text } }, 'Difficulty within grade'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                [
                  { id: 'easier',   label: '🌱 Easier',    hint: 'shorter, simpler words' },
                  { id: 'on-level', label: '📘 On-level',  hint: 'exactly the grade' },
                  { id: 'stretch',  label: '🌿 Stretch',   hint: 'a gentle reach up' }
                ].map(function(opt) {
                  var isActive = draftDifficulty === opt.id;
                  return h('button', {
                    key: 'diff-' + opt.id,
                    onClick: function() { setDraftDifficulty(opt.id); },
                    title: opt.hint,
                    style: {
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? '#0f172a' : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      font: 'inherit'
                    }
                  }, opt.label);
                })
              )
            ),

            // Topic input
            h('div', { style: { marginBottom: '18px' } },
              h('div', { style: { fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: palette.text } }, 'Topic (optional)'),
              h('input', {
                type: 'text',
                value: draftTopic,
                onChange: function(e) { setDraftTopic(e.target.value); },
                placeholder: 'e.g., space, dogs, Minecraft, the ocean, Maine winters',
                maxLength: 80,
                style: {
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  color: palette.text,
                  fontSize: '14px',
                  fontFamily: fontFamily,
                  boxSizing: 'border-box'
                }
              }),
              h('div', { style: { fontSize: '11px', color: palette.textMute, marginTop: '6px' } },
                'Leave blank and the AI will pick something kind and age-appropriate.')
            ),

            // Error message
            genError ? h('div', {
              role: 'alert',
              style: {
                padding: '10px 14px',
                borderRadius: '8px',
                background: palette.surface,
                border: '1px solid ' + palette.danger,
                color: palette.danger,
                fontSize: '12px',
                marginBottom: '14px'
              }
            }, '⚠️ ' + genError) : null,

            // Actions
            h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
              h('button', {
                onClick: genLoading ? null : generatePassage,
                disabled: genLoading,
                style: Object.assign({}, primaryBtnStyle(palette), {
                  opacity: genLoading ? 0.6 : 1,
                  cursor: genLoading ? 'wait' : 'pointer'
                })
              }, genLoading ? '✨ Generating…' : (cached ? 'Generate a NEW passage' : 'Generate my passage')),

              (cached && !genLoading) ? h('button', {
                onClick: function() { updMulti({ view: 'drill', currentDrill: 'passage' }); },
                style: secondaryBtnStyle(palette)
              }, 'Use last passage') : null
            ),

            // Cached preview
            (cached && !genLoading) ? h('div', {
              style: {
                marginTop: '20px',
                padding: '14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '10px'
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '6px' } },
                'Last passage: grade ' + cached.gradeLevel + (cached.topic ? ' · ' + cached.topic : '')),
              h('div', { style: { fontSize: '13px', color: palette.textDim, fontStyle: 'italic', lineHeight: '1.5' } },
                '"' + (cached.text.length > 140 ? cached.text.slice(0, 140) + '…' : cached.text) + '"')
            ) : null
          );
        }

        // ═════════════════════════════════════════════════════
        // VIEW: DRILL — real typing surface with keystroke capture
        // ═════════════════════════════════════════════════════
        function renderDrill() {
          var drill = activeDrill || DRILLS['home-row'];
          if (!targetStr) {
            return h('div', { style: { padding: '20px', color: palette.text, fontFamily: fontFamily } },
              renderBackButton(function() { go('menu'); }, palette),
              h('div', { style: { marginTop: '16px' } }, 'No text loaded for this drill.')
            );
          }

          // ── Live metrics ──
          // Subtract accumulated pauses + any in-progress pause from the elapsed
          // active time so WPM stays honest.
          var pausedActive = pausedMs + (paused && pauseStartedAt ? (Date.now() - pauseStartedAt) : 0);
          var activeMs = startTime ? Math.max(Date.now() - startTime - pausedActive, 0) : 0;
          var minutes = Math.max(activeMs / 60000, 1 / 60);
          var liveWpm = (startTime && typed.length > 0 && activeMs > 0) ? Math.round((typed.length / 5) / minutes) : 0;
          var liveAcc = (typed.length + errorCount) > 0 ? Math.round((typed.length / (typed.length + errorCount)) * 100) : 100;
          var liveSec = Math.round(activeMs / 1000);

          // Rest-break nudge: fire once per drill if active time crosses the threshold.
          // Async via setTimeout so we don't side-effect during render.
          var restMins = state.accommodations.restBreakMinutes;
          if (restMins && !restNudgeShownRef.current && activeMs >= restMins * 60000 && !paused && !drillComplete) {
            restNudgeShownRef.current = true;
            setTimeout(function() {
              addToast('⏸ ' + restMins + ' minutes of typing — consider a short break. Your WPM won\'t be affected.');
            }, 0);
          }

          // ── Predictive-assist: how many upcoming chars to highlight ──
          // Fades as accuracy climbs: 3 by default, 2 at >=85%, 1 at >=92%, 0 at >=96%.
          var predictiveCount = 0;
          if (state.accommodations.predictiveAssist) {
            var pbAcc = (((state.personalBest || {})[activeDrill.id]) || {}).accuracy || 0;
            if      (pbAcc >= 96) predictiveCount = 0;
            else if (pbAcc >= 92) predictiveCount = 1;
            else if (pbAcc >= 85) predictiveCount = 2;
            else                  predictiveCount = 3;
          }

          // ── Character rendering: already-typed / current / preview / upcoming ──
          var chars = [];
          for (var i = 0; i < targetStr.length; i++) {
            var ch = targetStr[i];
            var charState;
            if (i < typed.length) charState = 'done';
            else if (i === typed.length) charState = lastWasWrong ? 'wrong-current' : 'current';
            else if (predictiveCount > 0 && i > typed.length && i <= typed.length + predictiveCount) charState = 'preview';
            else charState = 'upcoming';

            var charStyle = {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: state.accommodations.largeKeys ? '28px' : '22px',
              padding: '2px 1px',
              letterSpacing: '0.04em',
              transition: 'background-color 80ms ease, color 80ms ease'
            };
            if (charState === 'done') { charStyle.color = palette.success; charStyle.opacity = 0.85; }
            else if (charState === 'current') { charStyle.color = palette.text; charStyle.background = palette.accentDim; charStyle.borderRadius = '3px'; }
            else if (charState === 'wrong-current') { charStyle.color = palette.text; charStyle.background = palette.danger; charStyle.borderRadius = '3px'; }
            else if (charState === 'preview') {
              // Soft scaffolding: dotted underline + slightly brighter than upcoming.
              // Fades progressively across the preview window so the 3rd preview
              // char is dimmest.
              var distance = i - typed.length;
              charStyle.color = palette.textDim;
              charStyle.opacity = Math.max(0.35, 0.8 - 0.15 * distance);
              charStyle.borderBottom = '2px dotted ' + palette.accent;
              charStyle.borderRadius = '3px';
            }
            else { charStyle.color = palette.textMute; charStyle.opacity = 0.55; }

            // Render space as a visible middle-dot at ALL states (not just current)
            // so students can see word boundaries and count remaining words.
            // Opacity varies by state so the dots stay subtle.
            var display;
            if (ch === ' ') {
              display = '·';
              // Space-dot opacity: done=0.3, current=1, preview=0.5, upcoming=0.25
              if (charState === 'done') charStyle.opacity = 0.35;
              else if (charState === 'preview') charStyle.opacity = 0.5;
              else if (charState === 'upcoming') charStyle.opacity = 0.3;
              // For spaces in 'done' state, color them accent-dim so they don't
              // blend into the success green stream
              if (charState === 'done') charStyle.color = palette.textMute;
            } else {
              display = ch;
            }
            chars.push(h('span', { key: 'c' + i, style: charStyle }, display));
          }

          var paceHint = state.accommodations.paceTargetWpm
            ? '🎯 Pace target: ' + state.accommodations.paceTargetWpm + ' WPM (reference rhythm, not a deadline)'
            : 'No pace target — go at your speed.';

          // Next-target char for keyboard highlighting
          var nextChar = targetStr[typed.length] || '';
          var nextKeyMeta = findKeyMeta(nextChar);

          // Pace-target beat dot: soft sinusoidal pulse at the target cadence
          var beatOpacity = 1;
          if (state.accommodations.paceTargetWpm) {
            var msPerChar = 60000 / (state.accommodations.paceTargetWpm * 5);
            var phase = (Date.now() % msPerChar) / msPerChar;
            beatOpacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(phase * 2 * Math.PI));
          }

          return h('div', {
            style: {
              padding: '20px',
              maxWidth: '960px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            // Top bar: back + drill title + pause + live chip
            h('div', {
              style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }
            },
              renderBackButton(function() { go('menu'); }, palette),
              h('div', { style: { fontSize: '16px', fontWeight: 700, color: palette.text } },
                drill.icon + '  ' + drill.name
              ),
              // Pause / Resume button. Disability-aware: paused time doesn't
              // count against WPM, and keystrokes are ignored while paused.
              startTime ? h('button', {
                onClick: togglePause,
                'aria-pressed': paused ? 'true' : 'false',
                style: {
                  background: paused ? palette.warn : 'transparent',
                  color: paused ? '#0f172a' : palette.textDim,
                  border: '1px solid ' + (paused ? palette.warn : palette.border),
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: paused ? 700 : 500,
                  cursor: 'pointer',
                  font: 'inherit'
                }
              }, paused ? '▶ Resume' : '⏸ Pause') : null,
              h('div', {
                style: {
                  marginLeft: 'auto',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: palette.textDim,
                  fontVariantNumeric: 'tabular-nums'
                }
              },
                h('span', null, liveWpm + ' WPM'),
                h('span', { style: { color: palette.textMute } }, '·'),
                h('span', null, liveAcc + '% acc'),
                h('span', { style: { color: palette.textMute } }, '·'),
                h('span', null, formatDuration(liveSec))
              )
            ),

            // Paused overlay notice — non-modal, student can still click Resume
            paused ? h('div', {
              role: 'status',
              'aria-live': 'polite',
              style: {
                marginBottom: '12px',
                padding: '12px 16px',
                background: palette.warn,
                color: '#0f172a',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center'
              }
            }, '⏸ Paused — take your time. Your WPM won\'t be affected. Click Resume when ready.') : null,

            // Description
            h('p', {
              style: { margin: '0 0 14px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, drill.description),

            // Optional IEP-goal banner: reminds student of their personal goal.
            // Framed supportively ("working toward"), NOT as a countdown.
            state.iepGoal && state.iepGoal.targetWpm ? h('div', {
              'aria-label': 'IEP goal',
              style: {
                marginBottom: '14px',
                padding: '10px 14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderLeft: '3px solid ' + palette.success,
                borderRadius: '8px',
                fontSize: '12px',
                color: palette.textDim,
                lineHeight: '1.5'
              }
            },
              h('span', { style: { color: palette.success, fontWeight: 700 } }, '🎯 Working toward: '),
              state.iepGoal.targetWpm + ' WPM at ' + state.iepGoal.targetAccuracy + '% accuracy',
              state.iepGoal.notes ? h('div', {
                style: { fontSize: '11px', color: palette.textMute, marginTop: '4px', fontStyle: 'italic' }
              }, state.iepGoal.notes) : null
            ) : null,

            // Target text surface (focusable capture div)
            h('div', {
              ref: captureRef,
              tabIndex: 0,
              role: 'textbox',
              'aria-label': 'Typing target. Focus and begin typing.',
              'aria-multiline': 'false',
              onKeyDown: onKeyDown,
              onBlur: function(e) {
                // Only re-focus if focus went nowhere (e.g., user clicked on
                // empty space). If the user is tabbing to another focusable
                // (Back button, accommodation toggle, etc.), DO NOT steal focus
                // back — that would be a keyboard trap.
                var nextTarget = e.relatedTarget;
                if (nextTarget) return; // focus is moving somewhere legitimate
                setTimeout(function() {
                  if (!captureRef.current) return;
                  if (state.view !== 'drill' || drillComplete) return;
                  // Double-check focus didn't land somewhere meaningful during
                  // the timeout (relatedTarget is null for mouse clicks on body).
                  var active = document.activeElement;
                  if (active && active !== document.body && active !== captureRef.current) return;
                  captureRef.current.focus();
                }, 10);
              },
              style: {
                background: palette.surface,
                border: '2px solid ' + (lastWasWrong ? palette.danger : palette.border),
                borderRadius: '14px',
                padding: state.accommodations.largeKeys ? '28px 22px' : '22px 18px',
                lineHeight: '1.8',
                letterSpacing: '0.04em',
                outline: 'none',
                cursor: 'text',
                minHeight: '100px',
                transition: 'border-color 120ms ease',
                userSelect: 'none'
              },
              onFocus: function(e) { e.currentTarget.style.borderColor = palette.accent; },
              onMouseDown: function(e) {
                // Prevent default so clicking doesn't blur the capture div
                // when the user wants to re-focus.
                if (captureRef.current) { e.preventDefault(); captureRef.current.focus(); }
              }
            }, chars),

            // Hint row + pace beat dot
            h('div', {
              style: {
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: palette.textMute,
                flexWrap: 'wrap',
                gap: '8px'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                state.accommodations.paceTargetWpm ? h('span', {
                  'aria-hidden': 'true',
                  style: {
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: palette.accent,
                    opacity: beatOpacity,
                    transition: 'opacity 100ms linear'
                  }
                }) : null,
                h('span', null, paceHint + '  ·  Press Esc to exit (progress won\'t save).')
              ),
              h('div', null, typed.length + ' / ' + targetStr.length + ' chars')
            ),

            // On-screen keyboard (large-keys accommodation)
            state.accommodations.largeKeys ? renderOnScreenKeyboard(nextKeyMeta, palette) : null
          );
        }

        // ═════════════════════════════════════════════════════
        // VIEW: SUMMARY — session summary + baseline / personal-best framing
        // ═════════════════════════════════════════════════════
        function renderSummary() {
          var s = lastSummary;
          if (!s) {
            // If we landed on summary with no in-memory summary (e.g. page reload),
            // fall back to the most recent session.
            s = (state.sessions && state.sessions.length > 0) ? state.sessions[state.sessions.length - 1] : null;
          }
          if (!s) { go('menu'); return null; }

          var headline = s.masteryAdvanced
            ? '🌟 Mastery tier cleared! Reached tier ' + s.newMasteryLevel + '.'
            : (s.isBaseline
                ? 'First session saved — this is your baseline.'
                : (s.isNewBest
                    ? 'New personal best!'
                    : 'Session saved.'));

          return h('div', {
            style: {
              padding: '20px',
              maxWidth: '720px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            h('div', {
              style: {
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '14px',
                padding: '28px',
                textAlign: 'center'
              }
            },
              h('div', { style: { fontSize: '13px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' } }, s.drillName),
              h('div', { style: { fontSize: '20px', fontWeight: 700, color: s.isNewBest || s.isBaseline ? palette.success : palette.text, marginBottom: '20px' } }, headline),

              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }
              },
                renderMetric('WPM', s.wpm, palette),
                renderMetric('Accuracy', s.accuracy + '%', palette),
                renderMetric('Time', formatDuration(s.durationSec), palette),
                renderMetric('Errors', s.errors, palette)
              ),

              (s.accommodationsUsed && s.accommodationsUsed.length > 0) ? h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }
              }, '🏅 Accommodations used this session: ' + s.accommodationsUsed.join(', ')) : null,

              // Session reflection — student voice in their own progress.
              // Tagging how a session FELT is qualitatively valuable and loops
              // into the IEP report so clinicians can see when "numbers were good
              // but it felt hard" vs "numbers were rough but it felt fine".
              h('div', {
                style: {
                  marginBottom: '16px',
                  padding: '12px 14px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  textAlign: 'left'
                }
              },
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'How did that feel?'),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  [
                    { id: 'too-easy',   label: '🌱 Too easy' },
                    { id: 'just-right', label: '😌 Just right' },
                    { id: 'hard',       label: '💪 Hard' }
                  ].map(function(opt) {
                    var isActive = s.reflection === opt.id;
                    return h('button', {
                      key: 'refl-' + opt.id,
                      onClick: function() {
                        var sessions = (state.sessions || []).slice();
                        for (var i = sessions.length - 1; i >= 0; i--) {
                          if (sessions[i].date === s.date) {
                            sessions[i] = Object.assign({}, sessions[i], { reflection: opt.id });
                            break;
                          }
                        }
                        upd('sessions', sessions);
                        setLastSummary(Object.assign({}, s, { reflection: opt.id }));
                      },
                      style: {
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: '1px solid ' + (isActive ? palette.accent : palette.border),
                        background: isActive ? palette.accent : 'transparent',
                        color: isActive ? '#0f172a' : palette.textDim,
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        font: 'inherit'
                      }
                    }, opt.label);
                  })
                ),
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
                  'Your answer helps teachers see when the numbers don\'t tell the whole story.')
              ),

              // ── Session note field (student or clinician) ──
              // Lives on the summary so context is fresh. Saves into the session
              // record so it surfaces in CSV + IEP report later.
              h('div', {
                style: {
                  marginBottom: '20px',
                  padding: '12px 14px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  textAlign: 'left'
                }
              },
                h('label', {
                  htmlFor: 'tp-session-note',
                  style: { display: 'block', fontSize: '11px', fontWeight: 700, color: palette.textMute, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }
                }, 'Session note (optional)'),
                h('textarea', {
                  id: 'tp-session-note',
                  value: s.note || noteDraft,
                  onChange: function(e) {
                    if (s.note) return; // already saved, treat as read-only
                    setNoteDraft(e.target.value);
                    setNoteSaved(false);
                  },
                  readOnly: !!s.note,
                  placeholder: 'How did this session go? "Started slow, persisted, used slow-motion mode..."',
                  maxLength: 400,
                  rows: 2,
                  style: {
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: s.note ? palette.surface : palette.bg,
                    border: '1px solid ' + palette.border,
                    color: palette.text,
                    fontSize: '12px',
                    fontFamily: fontFamily,
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }
                }),
                !s.note ? h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' } },
                  h('button', {
                    onClick: function() {
                      var trimmed = (noteDraft || '').trim();
                      if (!trimmed) return;
                      var sessions = (state.sessions || []).slice();
                      // Match by date since session records are immutable after save
                      for (var i = sessions.length - 1; i >= 0; i--) {
                        if (sessions[i].date === s.date) {
                          sessions[i] = Object.assign({}, sessions[i], { note: trimmed });
                          break;
                        }
                      }
                      upd('sessions', sessions);
                      setNoteSaved(true);
                      // Also mutate the local `lastSummary` for immediate UI reflection
                      setLastSummary(Object.assign({}, s, { note: trimmed }));
                    },
                    disabled: !(noteDraft || '').trim(),
                    style: Object.assign({}, primaryBtnStyle(palette), {
                      fontSize: '11px',
                      padding: '6px 12px',
                      opacity: (noteDraft || '').trim() ? 1 : 0.5,
                      cursor: (noteDraft || '').trim() ? 'pointer' : 'not-allowed'
                    })
                  }, '💾 Save note'),
                  noteSaved ? h('span', { style: { fontSize: '11px', color: palette.success } }, '✓ Saved') : null
                ) : h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
                  'Note saved with this session. It will appear in the IEP report and CSV export.'
                )
              ),

              h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', {
                  onClick: function() { updMulti({ view: 'drill', currentDrill: s.drillId }); },
                  style: primaryBtnStyle(palette),
                  title: 'Retry the same text to beat your score'
                }, 'Drill again'),
                // Structured drills (not AI passages): let the student shuffle
                // to a different sample if they want variety instead of retry.
                s.drillId !== 'passage' ? h('button', {
                  onClick: function() {
                    updMulti({
                      view: 'drill',
                      currentDrill: s.drillId,
                      drillRunId: (state.drillRunId || 0) + 1
                    });
                  },
                  style: secondaryBtnStyle(palette),
                  title: 'Pick a different sample'
                }, '🔀 Different sample') : null,
                // For AI passages: offer generating a fresh passage instead of
                // re-drilling the same cached text.
                s.drillId === 'passage' ? h('button', {
                  onClick: function() { updMulti({ view: 'passage-setup', currentDrill: 'passage' }); },
                  style: secondaryBtnStyle(palette)
                }, '✨ New passage') : null,
                h('button', {
                  onClick: function() { go('menu'); },
                  style: secondaryBtnStyle(palette)
                }, 'Menu')
              )
            )
          );
        }

        // ═════════════════════════════════════════════════════
        // VIEW: SETTINGS (accommodations) — partial; expanded in step 5
        // ═════════════════════════════════════════════════════
        function renderSettings() {
          var acc = state.accommodations;
          var toggle = function(key) {
            var newAcc = Object.assign({}, acc);
            newAcc[key] = !acc[key];
            upd('accommodations', newAcc);
            // Badge: first time turning an accommodation ON earns a badge
            if (newAcc[key] && !acc[key]) {
              var badgeId = 'tried-' + key;
              var earned = state.accommodationBadges || [];
              if (earned.indexOf(badgeId) === -1) {
                var updated = earned.concat([badgeId]);
                upd('accommodationBadges', updated);
                addToast('🏅 Badge earned: tried ' + key + ' — these tools are your teammates.');
              }
            }
          };

          return h('div', {
            style: {
              padding: '20px',
              maxWidth: '720px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            renderBackButton(function() { go('menu'); }, palette),
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, '⚙️  Accommodations'),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, 'These aren\'t fallbacks — they\'re the design. Using them is the point.'),

            // Presets: one-click bundles of typical disability-profile combinations
            h('div', {
              style: {
                marginBottom: '20px',
                padding: '12px 14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '10px'
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: 700 } },
                '✨ Quick presets'),
              h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                'One-click common combos. Tap any toggle below to customize after applying.'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                ACC_PRESETS.map(function(preset) {
                  return h('button', {
                    key: 'preset-' + preset.id,
                    onClick: function() {
                      upd('accommodations', Object.assign({}, preset.apply));
                      var earned = state.accommodationBadges || [];
                      var badgeId = 'preset-' + preset.id;
                      if (earned.indexOf(badgeId) === -1) {
                        upd('accommodationBadges', earned.concat([badgeId]));
                      }
                      addToast(preset.label + ' applied. Tap any toggle to customize.');
                    },
                    title: preset.hint,
                    style: {
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid ' + palette.border,
                      background: 'transparent',
                      color: palette.textDim,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      font: 'inherit',
                      textAlign: 'left'
                    },
                    onMouseOver: function(e) { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.color = palette.text; },
                    onMouseOut: function(e) { e.currentTarget.style.borderColor = palette.border; e.currentTarget.style.color = palette.textDim; }
                  }, preset.label);
                })
              )
            ),

            renderToggleRow('Dyslexia-friendly font', 'Switches to a font designed to reduce letter-confusion (b/d, p/q).', acc.dyslexiaFont, function() { toggle('dyslexiaFont'); }, palette),
            renderToggleRow('Large-key visual keyboard', 'Shows an on-screen keyboard with finger-color coding and the next-key highlighted.', acc.largeKeys, function() { toggle('largeKeys'); }, palette),
            renderToggleRow('High-contrast mode', 'Black / yellow / white palette that works for low vision.', acc.highContrast, function() { toggle('highContrast'); }, palette),
            renderToggleRow('Audio cues', 'Soft chime on correct keypress, low tone on errors. Non-alarming.', acc.audioCues, function() { toggle('audioCues'); }, palette),

            // Audio theme picker — only visible when audio cues are on.
            acc.audioCues ? h('div', {
              style: { padding: '10px 0 14px 0', borderBottom: '1px solid ' + palette.border, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }
            },
              h('div', { style: { fontSize: '12px', color: palette.textMute, marginRight: '6px' } }, 'Sound theme:'),
              ['chime', 'soft', 'mute'].map(function(themeId) {
                var isActive = (state.audioTheme || 'chime') === themeId;
                var themeLabel = themeId === 'chime' ? '🔔 Chime (default)'
                              : themeId === 'soft'  ? '🎵 Soft'
                              : '🔇 Mute';
                return h('button', {
                  key: 'theme-' + themeId,
                  onClick: function() {
                    upd('audioTheme', themeId);
                    // Preview: play the correct tone immediately so student can hear it
                    if (themeId !== 'mute') setTimeout(function() { audioCorrect(themeId); }, 50);
                  },
                  style: {
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid ' + (isActive ? palette.accent : palette.border),
                    background: isActive ? palette.accent : 'transparent',
                    color: isActive ? '#0f172a' : palette.textDim,
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    font: 'inherit'
                  }
                }, themeLabel);
              })
            ) : null,
            renderToggleRow('Error-tolerant mode', 'Errors don\'t block progress — great for dysgraphia. The target advances with the correct character so the student can keep going.', acc.errorTolerant, function() { toggle('errorTolerant'); }, palette),
            renderToggleRow('Predictive assist', 'Shows the next 1–3 characters with a soft highlight so emerging typists can plan the next move. Auto-fades as your accuracy on this drill improves.', acc.predictiveAssist, function() { toggle('predictiveAssist'); }, palette),

            // ── Rest-break nudge: non-intrusive toast after N active minutes ──
            h('div', {
              style: { padding: '14px 0', borderBottom: '1px solid ' + palette.border }
            },
              h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, 'Rest-break nudge'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4', marginBottom: '10px' } },
                'After this many minutes of active typing (paused time not counted), show a gentle reminder to take a break. Fires once per drill. Off by default.'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
                [null, 5, 10, 15, 20].map(function(opt) {
                  var isActive = acc.restBreakMinutes === opt;
                  return h('button', {
                    key: 'rest-' + opt,
                    onClick: function() {
                      var newAcc = Object.assign({}, acc);
                      newAcc.restBreakMinutes = opt;
                      upd('accommodations', newAcc);
                    },
                    style: {
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? '#0f172a' : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      font: 'inherit'
                    }
                  }, opt === null ? 'Off' : (opt + ' min'));
                })
              )
            ),

            // ── Pace target: stepper, NOT a timer ──
            h('div', {
              style: { padding: '14px 0', borderBottom: '1px solid ' + palette.border }
            },
              h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, 'Pace target (optional rhythm reference)'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4', marginBottom: '10px' } },
                'A soft pulsing dot on the drill screen marks a steady rhythm. There is NO penalty for going slower — this is a reference, not a deadline. Helpful for motor-planning. Off by default.'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
                [null, 10, 15, 20, 25, 30, 40].map(function(opt) {
                  var isActive = acc.paceTargetWpm === opt;
                  return h('button', {
                    key: 'pace-' + opt,
                    onClick: function() {
                      var newAcc = Object.assign({}, acc);
                      newAcc.paceTargetWpm = opt;
                      upd('accommodations', newAcc);
                    },
                    style: {
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? '#0f172a' : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      font: 'inherit'
                    }
                  }, opt === null ? 'Off' : (opt + ' WPM'));
                })
              )
            ),

            // ═══ Clinician section: student identity + IEP goal ═══
            h('div', {
              style: {
                marginTop: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '10px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', {
                style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 }
              }, 'Clinician / teacher'),
              h('p', {
                style: { fontSize: '11px', color: palette.textMute, margin: '0 0 14px 0', lineHeight: '1.5' }
              }, 'Set an IEP-style goal here. It shows up on the drill screen and pre-fills the progress report. Only needed if you\'re generating formal progress notes.'),

              // Student name
              h('div', { style: { marginBottom: '14px' } },
                h('label', {
                  htmlFor: 'tp-student-name',
                  style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                }, 'Student name (optional)'),
                h('input', {
                  id: 'tp-student-name',
                  type: 'text',
                  value: state.studentName || '',
                  onChange: function(e) { upd('studentName', e.target.value); },
                  placeholder: 'e.g., J.D. (initials only, FERPA-safe)',
                  maxLength: 60,
                  style: {
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    color: palette.text,
                    fontSize: '13px',
                    fontFamily: fontFamily,
                    boxSizing: 'border-box'
                  }
                }),
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '4px' } },
                  'Use initials or a pseudonym — AlloFlow is designed to stay FERPA-safe.')
              ),

              // IEP goal fields
              h('div', { style: { display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' } },
                h('div', { style: { flex: '1 1 140px' } },
                  h('label', {
                    htmlFor: 'tp-iep-wpm',
                    style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                  }, 'Target WPM'),
                  h('input', {
                    id: 'tp-iep-wpm',
                    type: 'number',
                    min: 1,
                    max: 120,
                    value: state.iepGoal ? state.iepGoal.targetWpm : '',
                    onChange: function(e) {
                      var v = parseInt(e.target.value, 10);
                      var newGoal = Object.assign({}, state.iepGoal || { targetAccuracy: 85, notes: '' });
                      newGoal.targetWpm = isNaN(v) ? null : v;
                      upd('iepGoal', newGoal);
                    },
                    placeholder: '15',
                    style: {
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: palette.bg,
                      border: '1px solid ' + palette.border,
                      color: palette.text,
                      fontSize: '13px',
                      fontFamily: fontFamily,
                      boxSizing: 'border-box'
                    }
                  })
                ),
                h('div', { style: { flex: '1 1 140px' } },
                  h('label', {
                    htmlFor: 'tp-iep-acc',
                    style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                  }, 'Target accuracy %'),
                  h('input', {
                    id: 'tp-iep-acc',
                    type: 'number',
                    min: 50,
                    max: 100,
                    value: state.iepGoal ? state.iepGoal.targetAccuracy : '',
                    onChange: function(e) {
                      var v = parseInt(e.target.value, 10);
                      var newGoal = Object.assign({}, state.iepGoal || { targetWpm: 15, notes: '' });
                      newGoal.targetAccuracy = isNaN(v) ? null : v;
                      upd('iepGoal', newGoal);
                    },
                    placeholder: '85',
                    style: {
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: palette.bg,
                      border: '1px solid ' + palette.border,
                      color: palette.text,
                      fontSize: '13px',
                      fontFamily: fontFamily,
                      boxSizing: 'border-box'
                    }
                  })
                )
              ),

              // IEP notes
              h('div', null,
                h('label', {
                  htmlFor: 'tp-iep-notes',
                  style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                }, 'Notes (optional)'),
                h('textarea', {
                  id: 'tp-iep-notes',
                  value: (state.iepGoal && state.iepGoal.notes) || '',
                  onChange: function(e) {
                    var newGoal = Object.assign({}, state.iepGoal || { targetWpm: 15, targetAccuracy: 85 });
                    newGoal.notes = e.target.value;
                    upd('iepGoal', newGoal);
                  },
                  placeholder: 'e.g., Prefers home-row with large-key keyboard; reduce errors before increasing speed.',
                  maxLength: 400,
                  rows: 3,
                  style: {
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    color: palette.text,
                    fontSize: '12px',
                    fontFamily: fontFamily,
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }
                })
              ),

              state.iepGoal && state.iepGoal.targetWpm ? h('button', {
                onClick: function() { upd('iepGoal', null); },
                style: Object.assign({}, secondaryBtnStyle(palette), {
                  marginTop: '10px', fontSize: '11px', padding: '6px 10px'
                })
              }, 'Clear IEP goal') : null
            )
          );
        }

        // ═════════════════════════════════════════════════════
        // VIEW: PROGRESS — skill tree, baseline, trend, IEP-ready export,
        // accommodation-usage badges.
        // ═════════════════════════════════════════════════════
        function renderProgress() {
          var allSessions = state.sessions || [];

          // Apply filters: date range + drill type
          var filterOpts = {
            startDate: filterStart || null,
            endDate: filterEnd || null,
            drillId: filterDrill || null
          };
          var filteredSessions = applySessionFilters(allSessions, filterOpts);
          var filterActive = !!(filterOpts.startDate || filterOpts.endDate || filterOpts.drillId);

          // Build trend data from FILTERED sessions: chronologically ordered WPM/accuracy
          var sessions = filteredSessions;
          var trend = sessions.slice(-12); // last 12 matching sessions
          var trendMax = trend.reduce(function(m, s) { return Math.max(m, s.wpm || 0); }, 10);

          return h('div', {
            style: {
              padding: '20px',
              maxWidth: '820px',
              margin: '0 auto',
              color: palette.text,
              fontFamily: fontFamily,
              background: palette.bg,
              minHeight: '60vh'
            }
          },
            renderBackButton(function() { go('menu'); }, palette),
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, '📊  Progress & Goals'),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, 'Your personal growth path. No peer comparison — this is just you, over time.'),

            // Skill tree: tier progression visual
            h('div', {
              style: {
                marginBottom: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '12px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 700 } }, 'Mastery tree'),
              h('div', {
                style: {
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  alignItems: 'stretch'
                }
              },
                TIER_ORDER.map(function(drillId, idx) {
                  var drill = DRILLS[drillId];
                  var cleared = state.masteryLevel > drill.tier;
                  var current = state.masteryLevel === drill.tier;
                  var locked  = state.masteryLevel < drill.tier && drill.locked;
                  var pb = (state.personalBest || {})[drillId];
                  var nodeColor = cleared ? palette.success : (current ? palette.accent : palette.border);
                  return h('div', {
                    key: 'tier-node-' + drillId,
                    style: {
                      flex: '1 1 110px',
                      minWidth: '110px',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid ' + nodeColor,
                      background: cleared || current ? palette.bg : 'transparent',
                      opacity: locked ? 0.55 : 1,
                      position: 'relative'
                    }
                  },
                    h('div', { style: { fontSize: '18px', marginBottom: '4px' } }, drill.icon),
                    h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.text, marginBottom: '2px' } }, drill.name),
                    h('div', { style: { fontSize: '10px', color: palette.textMute } },
                      cleared ? '✓ cleared' : (current ? 'in progress' : (locked ? 'locked' : 'available'))
                    ),
                    pb ? h('div', {
                      style: { fontSize: '10px', color: palette.textDim, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }
                    }, 'best: ' + pb.wpm + ' WPM · ' + pb.accuracy + '%') : null,
                    (drill.masteryWpm && !cleared) ? h('div', {
                      style: { fontSize: '10px', color: palette.textMute, marginTop: '4px' }
                    }, 'goal: ' + drill.masteryWpm + ' WPM @ ' + drill.masteryAcc + '%') : null
                  );
                })
              )
            ),

            // Baseline + current snapshot (ALL-TIME, not filter-affected — the
            // baseline is a milestone anchor and shouldn't move with a filter).
            state.baseline ? h('div', {
              style: {
                marginBottom: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '12px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 700 } }, 'Baseline → current · all-time'),
              h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
                renderMetric('Baseline WPM', state.baseline.wpm, palette),
                renderMetric('Best WPM', getBestWpm(state), palette),
                renderMetric('Recent avg', getRecentAvg(allSessions, 'wpm'), palette),
                renderMetric('Recent acc', getRecentAvg(allSessions, 'accuracy') + '%', palette)
              )
            ) : null,

            // Filter bar — affects trend sparkline, IEP report, CSV export.
            allSessions.length > 0 ? h('div', {
              style: {
                marginBottom: '16px',
                padding: '12px 14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '10px'
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: 700 } },
                'Report filters ' + (filterActive ? ('(' + sessions.length + ' of ' + allSessions.length + ' sessions)') : '(all sessions)')),
              h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' } },
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                  h('label', { htmlFor: 'tp-filter-start', style: { fontSize: '10px', color: palette.textMute } }, 'From'),
                  h('input', {
                    id: 'tp-filter-start',
                    type: 'date',
                    value: filterStart,
                    onChange: function(e) { setFilterStart(e.target.value); },
                    style: {
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: palette.bg,
                      border: '1px solid ' + palette.border,
                      color: palette.text,
                      fontSize: '12px',
                      fontFamily: fontFamily
                    }
                  })
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                  h('label', { htmlFor: 'tp-filter-end', style: { fontSize: '10px', color: palette.textMute } }, 'To'),
                  h('input', {
                    id: 'tp-filter-end',
                    type: 'date',
                    value: filterEnd,
                    onChange: function(e) { setFilterEnd(e.target.value); },
                    style: {
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: palette.bg,
                      border: '1px solid ' + palette.border,
                      color: palette.text,
                      fontSize: '12px',
                      fontFamily: fontFamily
                    }
                  })
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 140px' } },
                  h('label', { htmlFor: 'tp-filter-drill', style: { fontSize: '10px', color: palette.textMute } }, 'Drill'),
                  h('select', {
                    id: 'tp-filter-drill',
                    value: filterDrill,
                    onChange: function(e) { setFilterDrill(e.target.value); },
                    style: {
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: palette.bg,
                      border: '1px solid ' + palette.border,
                      color: palette.text,
                      fontSize: '12px',
                      fontFamily: fontFamily
                    }
                  },
                    h('option', { value: '' }, 'All drills'),
                    TIER_ORDER.map(function(dId) {
                      var d = DRILLS[dId];
                      return h('option', { key: 'opt-' + dId, value: dId }, d.name);
                    })
                  )
                ),
                filterActive ? h('button', {
                  onClick: function() {
                    setFilterStart('');
                    setFilterEnd('');
                    setFilterDrill('');
                    setSelectedDetailIdx(null);
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    fontSize: '11px', padding: '6px 12px'
                  })
                }, '✕ Clear') : null,
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginLeft: 'auto', fontStyle: 'italic' } },
                  'Affects trend, report, CSV. Skill tree stays all-time.')
              )
            ) : null,

            // Trend sparkline (last 12 sessions)
            trend.length > 0 ? h('div', {
              style: {
                marginBottom: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '12px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 700 } }, 'Recent sessions — last ' + trend.length + ' · tap a bar for details'),
              h('div', {
                style: {
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  height: '100px',
                  padding: '6px 0'
                }
              },
                trend.map(function(s, i) {
                  var h_ = Math.max(4, Math.round((s.wpm / Math.max(trendMax, 1)) * 90));
                  var isSelected = selectedDetailIdx === i;
                  return h('button', {
                    key: 'bar-' + i,
                    onClick: function() {
                      setSelectedDetailIdx(isSelected ? null : i);
                    },
                    'aria-label': 'Session ' + (i + 1) + ': ' + s.drillName + ', ' + s.wpm + ' WPM, ' + s.accuracy + ' percent accuracy' + (isSelected ? ' (selected)' : ''),
                    title: s.drillName + ': ' + s.wpm + ' WPM / ' + s.accuracy + '%',
                    style: {
                      flex: 1,
                      minWidth: '8px',
                      height: h_ + 'px',
                      background: isSelected ? palette.warn : palette.accent,
                      border: 'none',
                      borderRadius: '3px 3px 0 0',
                      opacity: isSelected ? 1 : (0.6 + (i / Math.max(trend.length - 1, 1)) * 0.4),
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'background 120ms ease, opacity 120ms ease'
                    }
                  });
                })
              ),

              // Session-detail panel when a bar is selected
              selectedDetailIdx !== null && trend[selectedDetailIdx] ? (function() {
                var d = trend[selectedDetailIdx];
                var accs = d.accommodationsUsed || [];
                return h('div', {
                  style: {
                    marginTop: '12px',
                    padding: '12px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: '1.6'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                    h('span', { style: { fontWeight: 700, color: palette.text } }, d.drillName),
                    h('button', {
                      onClick: function() { setSelectedDetailIdx(null); },
                      'aria-label': 'Close detail',
                      style: {
                        background: 'none',
                        border: 'none',
                        color: palette.textMute,
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '0 4px',
                        lineHeight: 1,
                        font: 'inherit'
                      }
                    }, '✕')
                  ),
                  h('div', { style: { color: palette.textMute, fontSize: '11px', marginBottom: '8px' } },
                    new Date(d.date).toLocaleString()
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '8px' } },
                    h('div', null, h('span', { style: { color: palette.textMute } }, 'WPM: '), h('span', { style: { color: palette.text, fontWeight: 700 } }, d.wpm)),
                    h('div', null, h('span', { style: { color: palette.textMute } }, 'Accuracy: '), h('span', { style: { color: palette.text, fontWeight: 700 } }, d.accuracy + '%')),
                    h('div', null, h('span', { style: { color: palette.textMute } }, 'Duration: '), h('span', { style: { color: palette.text, fontWeight: 700 } }, formatDuration(d.durationSec))),
                    h('div', null, h('span', { style: { color: palette.textMute } }, 'Errors: '), h('span', { style: { color: palette.text, fontWeight: 700 } }, d.errors || 0))
                  ),
                  d.pausedSec ? h('div', { style: { color: palette.textMute, fontSize: '11px', marginBottom: '4px' } },
                    'Paused breaks: ' + formatDuration(d.pausedSec) + ' (excluded from WPM)'
                  ) : null,
                  accs.length > 0 ? h('div', { style: { color: palette.textMute, fontSize: '11px', marginBottom: '4px' } },
                    '🏅 Accommodations: ' + accs.join(', ')
                  ) : null,
                  d.isNewBest ? h('div', { style: { color: palette.success, fontSize: '11px', fontWeight: 600 } }, '⭐ Personal best') : null,
                  d.masteryAdvanced ? h('div', { style: { color: palette.success, fontSize: '11px', fontWeight: 600 } }, '🌟 Mastery tier advanced to ' + d.newMasteryLevel) : null,
                  d.note ? h('div', {
                    style: { marginTop: '8px', padding: '8px', background: palette.surface, borderRadius: '6px', borderLeft: '3px solid ' + palette.accent, color: palette.textDim, fontStyle: 'italic' }
                  }, '"' + d.note + '"') : null
                );
              })() : null
            ) : null,

            // Per-key error heatmap — surfaces which keys need practice
            (function() {
              var agg = state.aggregateErrors || {};
              var keys = Object.keys(agg);
              if (keys.length === 0) return null;
              var maxErr = keys.reduce(function(m, k) { return Math.max(m, agg[k] || 0); }, 1);
              return h('div', {
                style: {
                  marginBottom: '24px',
                  padding: '16px',
                  background: palette.surface,
                  borderRadius: '12px',
                  border: '1px solid ' + palette.border
                }
              },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 } },
                  'Error heatmap · all-time'),
                h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                  'Darker red = more errors on that key. This isn\'t shame data — it\'s the map that shows where practice pays off.'),
                renderErrorHeatmap(agg, maxErr, palette)
              );
            })(),

            // Accommodation badges
            (state.accommodationBadges && state.accommodationBadges.length > 0) ? h('div', {
              style: {
                marginBottom: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '12px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 } }, 'Accommodation badges'),
              h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                'These celebrate trying accommodations — not hiding them. Using what helps is strength, not weakness.'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                state.accommodationBadges.map(function(b) {
                  return h('span', {
                    key: 'badge-' + b,
                    style: {
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: palette.warn,
                      color: '#0f172a',
                      fontWeight: 600
                    }
                  }, '🏅 ' + b.replace('tried-', '').replace(/([A-Z])/g, ' $1').toLowerCase());
                })
              )
            ) : null,

            // IEP-style exportable block
            sessions.length > 0 ? h('div', {
              style: {
                marginBottom: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '12px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 } }, 'Progress report (IEP-ready)'),
              h('textarea', {
                readOnly: true,
                value: buildIEPReport(state, filterOpts),
                style: {
                  width: '100%',
                  minHeight: '180px',
                  background: palette.bg,
                  color: palette.textDim,
                  border: '1px solid ' + palette.border,
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                },
                onFocus: function(e) { e.target.select(); }
              }),
              h('div', {
                style: {
                  fontSize: '10px',
                  color: palette.textMute,
                  marginTop: '8px',
                  fontStyle: 'italic',
                  lineHeight: '1.5'
                }
              }, 'Tap the report to select all, or use the buttons below.'),

              // Report actions: copy + download CSV
              h('div', {
                style: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }
              },
                h('button', {
                  onClick: function() {
                    var report = buildIEPReport(state, filterOpts);
                    copyTextToClipboard(report, addToast);
                  },
                  style: Object.assign({}, primaryBtnStyle(palette), {
                    fontSize: '11px',
                    padding: '7px 12px'
                  })
                }, '📋 Copy report'),
                h('button', {
                  onClick: function() { downloadSessionsCSV(state, filterOpts); },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    fontSize: '11px',
                    padding: '7px 12px'
                  })
                }, '📥 Download CSV')
              )
            ) : null,

            sessions.length === 0 ? h('div', {
              style: {
                background: palette.surface,
                border: '1px dashed ' + palette.border,
                borderRadius: '10px',
                padding: '20px',
                color: palette.textMute,
                fontSize: '13px',
                textAlign: 'center'
              }
            }, 'Complete your first drill to see your baseline, trend, and IEP report here.') : null
          );
        }

        // ═════════════════════════════════════════════════════
        // ROUTER
        // ═════════════════════════════════════════════════════
        var viewContent;
        switch (state.view) {
          case 'drill':          viewContent = renderDrill(); break;
          case 'drill-intro':    viewContent = renderDrillIntro(); break;
          case 'summary':        viewContent = renderSummary(); break;
          case 'settings':       viewContent = renderSettings(); break;
          case 'progress':       viewContent = renderProgress(); break;
          case 'passage-setup':  viewContent = renderPassageSetup(); break;
          case 'menu':
          default:               viewContent = renderMenu();
        }
        // Single .tp-root wrapper so CSS focus-ring targeting hits every
        // interactive descendant without per-element annotation. Also hosts
        // a visually-hidden aria-live region for milestone announcements.
        return h('div', { className: 'tp-root' },
          h('div', {
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true',
            style: {
              position: 'absolute',
              left: '-10000px',
              top: 'auto',
              width: '1px',
              height: '1px',
              overflow: 'hidden'
            }
          }, announceText),
          viewContent
        );

      } catch (err) {
        console.error('[TypingPractice] Render error:', err);
        return ctx.React.createElement('div', {
          style: { padding: '20px', color: '#f87171', fontFamily: 'system-ui', fontSize: '13px' }
        }, '⚠️ Typing Practice failed to render: ' + (err && err.message ? err.message : 'unknown error'));
      }
    }
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 5: RENDER HELPERS (pure functions — no hooks, no ctx needed)
  // ─────────────────────────────────────────────────────────

  function statCardStyle(palette) {
    return {
      flex: '1 1 120px',
      background: palette.surface,
      border: '1px solid ' + palette.border,
      borderRadius: '10px',
      padding: '12px 16px'
    };
  }

  function formatDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderMetric(label, value, palette) {
    var React = window.React;
    var h = React.createElement;
    return h('div', {
      style: {
        background: palette.bg,
        border: '1px solid ' + palette.border,
        borderRadius: '10px',
        padding: '14px 10px'
      }
    },
      h('div', { style: { fontSize: '10px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' } }, label),
      h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.text, fontVariantNumeric: 'tabular-nums' } }, value)
    );
  }

  function primaryBtnStyle(palette) {
    return {
      background: palette.accent,
      color: '#0f172a',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      font: 'inherit'
    };
  }

  function secondaryBtnStyle(palette) {
    return {
      background: 'transparent',
      color: palette.textDim,
      border: '1px solid ' + palette.border,
      borderRadius: '8px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      font: 'inherit'
    };
  }

  // ─────────────────────────────────────────────────────────
  // On-screen keyboard — finger-color coded, next-key highlighted.
  // Rendered below the drill target when large-keys accommodation is on.
  // Teaches motor planning through consistent finger-key color mapping.
  // ─────────────────────────────────────────────────────────
  function renderOnScreenKeyboard(nextKeyMeta, palette) {
    var React = window.React;
    var h = React.createElement;
    var highlightKey = nextKeyMeta ? nextKeyMeta.k : null;

    return h('div', {
      'aria-hidden': 'true',  // keyboard is visual-only; real typing is via real keys
      style: {
        marginTop: '18px',
        padding: '14px',
        background: palette.surface,
        borderRadius: '12px',
        border: '1px solid ' + palette.border,
        userSelect: 'none'
      }
    },
      h('div', {
        style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textAlign: 'center' }
      }, nextKeyMeta
          ? ('Next key: ' + (nextKeyMeta.label || nextKeyMeta.k.toUpperCase()) + ' · use your ' + fingerLabel(nextKeyMeta.f))
          : 'Keep going!'),

      KB_LAYOUT.map(function(row, rowIdx) {
        return h('div', {
          key: 'row-' + rowIdx,
          style: {
            display: 'flex',
            justifyContent: 'center',
            gap: '4px',
            marginBottom: '4px',
            marginLeft: rowIdx === 2 ? '16px' : (rowIdx === 3 ? '32px' : '0')
          }
        },
          row.map(function(keyObj) {
            var isNext = keyObj.k === highlightKey;
            var finger = keyObj.f;
            var fingerColor = FINGER_COLOR[finger] || palette.textMute;
            return h('div', {
              key: 'k-' + keyObj.k,
              style: {
                width: keyObj.wide ? ((keyObj.wide * 32) + (keyObj.wide - 1) * 4) + 'px' : '32px',
                height: '32px',
                borderRadius: '6px',
                background: isNext ? fingerColor : palette.bg,
                border: '1.5px solid ' + (isNext ? '#ffffff' : palette.border),
                color: isNext ? '#0f172a' : palette.textDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '13px',
                fontWeight: isNext ? 800 : 500,
                textTransform: 'uppercase',
                boxShadow: isNext ? '0 0 0 2px ' + fingerColor + '66' : 'none',
                // Left border slim color-band shows finger color even when not next
                borderLeft: '3px solid ' + fingerColor,
                transition: 'background 120ms ease, box-shadow 120ms ease'
              }
            }, keyObj.label ? keyObj.label : keyObj.k);
          })
        );
      })
    );
  }

  // Render a mini-keyboard heatmap showing per-key error counts. Intensity of
  // red increases with error count (relative to the student's max). Keys with
  // zero errors stay in the base palette.bg so there's clear signal contrast.
  function renderErrorHeatmap(errorMap, maxErr, palette) {
    var React = window.React;
    var h = React.createElement;
    return h('div', { 'aria-label': 'Error heatmap', style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' } },
      KB_LAYOUT.map(function(row, rowIdx) {
        return h('div', {
          key: 'heat-row-' + rowIdx,
          style: {
            display: 'flex',
            gap: '4px',
            marginLeft: rowIdx === 2 ? '16px' : (rowIdx === 3 ? '32px' : '0')
          }
        },
          row.map(function(keyObj) {
            var err = errorMap[keyObj.k] || 0;
            var intensity = maxErr > 0 ? err / maxErr : 0;
            // Base bg for zero-error; blend toward danger for higher intensity
            var bg = err === 0 ? palette.bg : mixColor(palette.bg, palette.danger, Math.min(1, 0.15 + intensity * 0.75));
            var textColor = intensity > 0.5 ? '#ffffff' : palette.textDim;
            return h('div', {
              key: 'heat-k-' + keyObj.k,
              title: (keyObj.label || keyObj.k) + ': ' + err + ' error' + (err === 1 ? '' : 's'),
              style: {
                width: keyObj.wide ? ((keyObj.wide * 28) + (keyObj.wide - 1) * 4) + 'px' : '28px',
                height: '28px',
                borderRadius: '4px',
                background: bg,
                border: '1px solid ' + palette.border,
                color: textColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '10px',
                fontWeight: err > 0 ? 700 : 400,
                textTransform: 'uppercase',
                position: 'relative'
              }
            },
              keyObj.label ? keyObj.label : keyObj.k,
              err > 0 ? h('span', {
                style: { position: 'absolute', bottom: '-12px', fontSize: '9px', color: palette.textMute }
              }, err) : null
            );
          })
        );
      })
    );
  }

  // Simple hex-color blend. Expects "#rrggbb" strings. t=0 returns a, t=1 returns b.
  function mixColor(a, b, t) {
    var pa = parseHex(a);
    var pb = parseHex(b);
    if (!pa || !pb) return a;
    var mix = function(ca, cb) { return Math.round(ca + (cb - ca) * t); };
    return '#' +
      toHex(mix(pa.r, pb.r)) +
      toHex(mix(pa.g, pb.g)) +
      toHex(mix(pa.b, pb.b));
  }
  function parseHex(c) {
    if (!c || c[0] !== '#' || (c.length !== 7 && c.length !== 4)) return null;
    if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return { r: parseInt(c.slice(1,3),16), g: parseInt(c.slice(3,5),16), b: parseInt(c.slice(5,7),16) };
  }
  function toHex(n) { var s = n.toString(16); return s.length === 1 ? '0' + s : s; }

  function fingerLabel(code) {
    switch (code) {
      case 'LP': return 'left pinky';
      case 'LR': return 'left ring finger';
      case 'LM': return 'left middle finger';
      case 'LI': return 'left index finger';
      case 'T':  return 'either thumb';
      case 'RI': return 'right index finger';
      case 'RM': return 'right middle finger';
      case 'RR': return 'right ring finger';
      case 'RP': return 'right pinky';
      default:   return 'any finger';
    }
  }

  // ─────────────────────────────────────────────────────────
  // Progress / IEP helpers
  // ─────────────────────────────────────────────────────────

  function getBestWpm(state) {
    var best = 0;
    var pb = state.personalBest || {};
    Object.keys(pb).forEach(function(k) {
      if (pb[k] && pb[k].wpm > best) best = pb[k].wpm;
    });
    return best || (state.baseline ? state.baseline.wpm : 0);
  }

  function getRecentAvg(sessions, key) {
    if (!sessions || sessions.length === 0) return 0;
    var recent = sessions.slice(-5);
    var sum = recent.reduce(function(acc, s) { return acc + (s[key] || 0); }, 0);
    return Math.round(sum / recent.length);
  }

  // Filter sessions by date range (ISO strings) and/or drill id.
  // Empty/null filter fields = no filter on that dimension.
  function applySessionFilters(sessions, opts) {
    if (!sessions || sessions.length === 0) return [];
    opts = opts || {};
    var startMs = opts.startDate ? new Date(opts.startDate + 'T00:00:00').getTime() : null;
    // End date is inclusive — add a day of slack so sessions on the end date count
    var endMs = opts.endDate ? (new Date(opts.endDate + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000 - 1) : null;
    return sessions.filter(function(s) {
      if (opts.drillId && s.drillId !== opts.drillId) return false;
      if (startMs || endMs) {
        var t = new Date(s.date).getTime();
        if (startMs && t < startMs) return false;
        if (endMs && t > endMs) return false;
      }
      return true;
    });
  }

  // Copy arbitrary text to clipboard. Uses the async Clipboard API when
  // available, falls back to a hidden textarea + execCommand for older browsers.
  // Fires a toast through `notify` when given (typically ctx.addToast).
  function copyTextToClipboard(text, notify) {
    var notifyOk = function() { if (notify) notify('📋 Copied to clipboard'); };
    var notifyFail = function() { if (notify) notify('⚠️ Copy failed — select the report text and copy manually'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(notifyOk).catch(function() {
          legacyCopy(text, notifyOk, notifyFail);
        });
        return;
      }
    } catch (e) { /* fall through */ }
    legacyCopy(text, notifyOk, notifyFail);
  }

  function legacyCopy(text, ok, fail) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok_ = false;
      try { ok_ = document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      if (ok_) ok(); else fail();
    } catch (e) { fail(); }
  }

  // Build a CSV blob of sessions and trigger a browser download.
  // Columns are Excel / Google-Sheets-friendly: one row per session.
  // Optional `opts` = { startDate, endDate, drillId } filters the session set.
  function downloadSessionsCSV(state, opts) {
    var allSessions = (state && state.sessions) || [];
    var sessions = opts ? applySessionFilters(allSessions, opts) : allSessions;
    if (sessions.length === 0) return;
    var esc = function(v) {
      if (v === null || v === undefined) return '';
      var s = String(v);
      // Escape double-quotes and wrap in quotes if value contains comma/quote/newline
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    var headers = ['date', 'drill_id', 'drill_name', 'wpm', 'accuracy_pct', 'duration_sec', 'paused_sec', 'errors', 'chars_typed', 'accommodations_used', 'is_new_best', 'is_baseline', 'mastery_advanced', 'new_mastery_level', 'reflection', 'error_chars', 'note'];
    var rows = sessions.map(function(s) {
      // Serialize per-char errors as "a:2|d:1|k:3" for compact CSV consumption
      var errorChars = s.errorChars ? Object.keys(s.errorChars).map(function(k) {
        return k + ':' + s.errorChars[k];
      }).join('|') : '';
      return [
        s.date, s.drillId, s.drillName, s.wpm, s.accuracy,
        s.durationSec, (s.pausedSec || 0), s.errors, s.charCount,
        (s.accommodationsUsed || []).join('|'),
        s.isNewBest ? 'yes' : '', s.isBaseline ? 'yes' : '',
        s.masteryAdvanced ? 'yes' : '', (s.newMasteryLevel || ''),
        s.reflection || '', errorChars,
        s.note || ''
      ].map(esc).join(',');
    });
    var csv = headers.join(',') + '\n' + rows.join('\n') + '\n';
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var student = (state.studentName || 'student').replace(/[^a-z0-9_-]/gi, '_');
      var stamp = new Date().toISOString().slice(0, 10);
      a.download = 'typing_practice_' + student + '_' + stamp + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    } catch (e) { console.warn('[TypingPractice] CSV export failed:', e); }
  }

  // Compute a single, highest-value practice recommendation for the menu.
  // Pattern priority (first match wins so the student sees the most relevant):
  //   1) Close to clearing current-tier mastery — encourage one more session
  //   2) A drill hasn't been touched in 10+ days — nudge to revisit
  //   3) Recent accuracy dip on a specific drill — flag for focused practice
  //   4) Student just finished 3+ sessions in one day — suggest a rest
  // Returns { text, drillId } or null if nothing stands out.
  function computePracticeRecommendation(state) {
    var sessions = state.sessions || [];
    if (sessions.length < 2) return null;
    var now = Date.now();

    // (4) Same-day fatigue — 5+ sessions in last 2 hours
    var recentHour = sessions.filter(function(s) {
      return (now - new Date(s.date).getTime()) < 2 * 60 * 60 * 1000;
    });
    if (recentHour.length >= 5) {
      return { text: 'You\'ve done ' + recentHour.length + ' sessions in the last 2 hours — solid work. A longer rest will usually help more than another session right now.', drillId: null };
    }

    // (1) Close to clearing current tier
    var currentTierDrill = null;
    for (var i = 0; i < TIER_ORDER.length; i++) {
      var d = DRILLS[TIER_ORDER[i]];
      if (d && d.tier === state.masteryLevel) { currentTierDrill = d; break; }
    }
    if (currentTierDrill && currentTierDrill.masteryWpm) {
      var pb = (state.personalBest || {})[currentTierDrill.id];
      if (pb) {
        var wpmGap = currentTierDrill.masteryWpm - pb.wpm;
        var accGap = currentTierDrill.masteryAcc - pb.accuracy;
        if (wpmGap > 0 && wpmGap <= 3 && accGap <= 5) {
          return { text: 'You\'re close to clearing ' + currentTierDrill.name + ' — just ' + wpmGap + ' WPM away from mastery. One more focused session might do it.', drillId: currentTierDrill.id };
        }
      }
    }

    // (2) Stale drill — unlocked, not practiced in 10+ days
    var staleCandidate = null;
    var staleDays = 0;
    TIER_ORDER.forEach(function(dId) {
      var drill = DRILLS[dId];
      if (!drill) return;
      if (drill.locked && state.masteryLevel < drill.tier) return; // not unlocked yet
      var mostRecent = null;
      for (var j = sessions.length - 1; j >= 0; j--) {
        if (sessions[j].drillId === dId) { mostRecent = sessions[j]; break; }
      }
      if (!mostRecent) return; // never practiced; skip (not stale, just unused)
      var ageDays = (now - new Date(mostRecent.date).getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays >= 10 && ageDays > staleDays) {
        staleDays = ageDays;
        staleCandidate = drill;
      }
    });
    if (staleCandidate) {
      return {
        text: 'It\'s been ' + Math.round(staleDays) + ' days since you practiced ' + staleCandidate.name + '. A short refresh can lock in the muscle memory.',
        drillId: staleCandidate.id
      };
    }

    // (3) Accuracy dip — last 3 sessions of a drill have noticeably lower accuracy than its personal best
    for (var k = 0; k < TIER_ORDER.length; k++) {
      var did = TIER_ORDER[k];
      var drl = DRILLS[did];
      if (!drl) continue;
      var recent3 = sessions.filter(function(s) { return s.drillId === did; }).slice(-3);
      if (recent3.length < 3) continue;
      var pb3 = (state.personalBest || {})[did];
      if (!pb3) continue;
      var recentAccAvg = recent3.reduce(function(a, s) { return a + (s.accuracy || 0); }, 0) / 3;
      if (recentAccAvg < pb3.accuracy - 8) {
        return {
          text: 'Your accuracy on ' + drl.name + ' has dipped recently (from ' + pb3.accuracy + '% best to ' + Math.round(recentAccAvg) + '% average). Slow down, aim for precision — speed follows.',
          drillId: did
        };
      }
    }

    return null;
  }

  // Aggregate WPM/accuracy delta per accommodation. Only returns rows where
  // the student has at least one session with AND one session without that
  // accommodation — otherwise a delta is meaningless.
  function computeAccommodationEfficacy(sessions) {
    if (!sessions || sessions.length < 2) return [];
    var KEYS = [
      { key: 'dyslexiaFont',   label: 'dyslexia-friendly font' },
      { key: 'largeKeys',      label: 'on-screen keyboard' },
      { key: 'highContrast',   label: 'high contrast' },
      { key: 'audioCues',      label: 'audio cues' },
      { key: 'errorTolerant',  label: 'error-tolerant mode' },
      { key: 'paceTargetWpm',  label: 'pace target' }
    ];
    var avg = function(arr, k) {
      if (arr.length === 0) return 0;
      return arr.reduce(function(a, s) { return a + (s[k] || 0); }, 0) / arr.length;
    };
    var out = [];
    KEYS.forEach(function(k) {
      var withIt = sessions.filter(function(s) {
        return (s.accommodationsUsed || []).indexOf(k.key) !== -1;
      });
      var withoutIt = sessions.filter(function(s) {
        return (s.accommodationsUsed || []).indexOf(k.key) === -1;
      });
      if (withIt.length === 0 || withoutIt.length === 0) return;
      out.push({
        key: k.key,
        label: k.label,
        sessionsWith: withIt.length,
        sessionsWithout: withoutIt.length,
        wpmDelta: Math.round(avg(withIt, 'wpm') - avg(withoutIt, 'wpm')),
        accDelta: Math.round(avg(withIt, 'accuracy') - avg(withoutIt, 'accuracy'))
      });
    });
    return out;
  }

  // Build a clinician-ready IEP progress block. Plain text so it can paste into
  // any report template, IEP drafting tool, or parent email. Deliberately avoids
  // claiming growth that isn't there — reports only what the data shows.
  // Optional `opts` = { startDate, endDate, drillId } filters the session set.
  function buildIEPReport(state, opts) {
    var allSessions = state.sessions || [];
    var sessions = opts ? applySessionFilters(allSessions, opts) : allSessions;
    var pb = state.personalBest || {};
    var badges = state.accommodationBadges || [];
    var accommodations = state.accommodations || {};
    var filtered = sessions.length !== allSessions.length;

    var lines = [];
    lines.push('TYPING PRACTICE — PROGRESS SUMMARY');
    if (state.studentName) lines.push('Student: ' + state.studentName);
    lines.push('Generated: ' + new Date().toLocaleDateString());
    if (filtered && opts) {
      var rangeBits = [];
      if (opts.startDate) rangeBits.push('from ' + opts.startDate);
      if (opts.endDate)   rangeBits.push('to ' + opts.endDate);
      if (opts.drillId)   rangeBits.push('drill = ' + (DRILLS[opts.drillId] ? DRILLS[opts.drillId].name : opts.drillId));
      lines.push('Report filter: ' + rangeBits.join(', '));
      lines.push('Sessions in range: ' + sessions.length + ' of ' + allSessions.length + ' total');
    } else {
      lines.push('Total sessions: ' + sessions.length);
    }
    lines.push('');

    if (state.baseline) {
      lines.push('BASELINE (first session)');
      lines.push('  Date: ' + new Date(state.baseline.date).toLocaleDateString());
      lines.push('  WPM: ' + state.baseline.wpm + '   Accuracy: ' + state.baseline.accuracy + '%');
      lines.push('  Drill: ' + (DRILLS[state.baseline.drillId] ? DRILLS[state.baseline.drillId].name : state.baseline.drillId));
      lines.push('');
    }

    if (sessions.length > 0) {
      lines.push('CURRENT PERFORMANCE (last 5 sessions)');
      lines.push('  Average WPM: ' + getRecentAvg(sessions, 'wpm'));
      lines.push('  Average accuracy: ' + getRecentAvg(sessions, 'accuracy') + '%');
      lines.push('');
    }

    if (Object.keys(pb).length > 0) {
      lines.push('PERSONAL BEST BY DRILL');
      Object.keys(pb).forEach(function(drillId) {
        var drill = DRILLS[drillId];
        var best = pb[drillId];
        lines.push('  ' + (drill ? drill.name : drillId) + ': ' + best.wpm + ' WPM, ' + best.accuracy + '% (' + new Date(best.date).toLocaleDateString() + ')');
      });
      lines.push('');
    }

    // Top error-prone keys — concrete coaching target for the clinician
    var agg = state.aggregateErrors || {};
    var sortedErrorKeys = Object.keys(agg).sort(function(a, b) { return agg[b] - agg[a]; }).slice(0, 5);
    if (sortedErrorKeys.length > 0 && agg[sortedErrorKeys[0]] > 0) {
      lines.push('TOP ERROR-PRONE KEYS (all-time)');
      sortedErrorKeys.forEach(function(k) {
        if (agg[k] > 0) lines.push('  ' + k.toUpperCase() + ': ' + agg[k] + ' error' + (agg[k] === 1 ? '' : 's'));
      });
      lines.push('');
    }

    lines.push('MASTERY PROGRESSION');
    lines.push('  Current tier: ' + state.masteryLevel + ' / 7');
    TIER_ORDER.forEach(function(drillId) {
      var drill = DRILLS[drillId];
      if (!drill) return;
      var status = state.masteryLevel > drill.tier ? 'cleared'
                 : state.masteryLevel === drill.tier ? 'in progress'
                 : 'not yet reached';
      lines.push('  Tier ' + drill.tier + ' — ' + drill.name + ': ' + status);
    });
    if (state.lifetime && state.lifetime.totalSessions) {
      lines.push('  Lifetime sessions: ' + state.lifetime.totalSessions);
      lines.push('  Lifetime characters typed: ' + state.lifetime.totalCharsTyped);
    }
    lines.push('');

    var accUsed = Object.keys(accommodations).filter(function(k) {
      var v = accommodations[k];
      return v === true || (v !== false && v !== null && typeof v !== 'undefined');
    });
    if (accUsed.length > 0 || badges.length > 0) {
      lines.push('ACCOMMODATIONS IN USE');
      accUsed.forEach(function(k) {
        var label = k.replace(/([A-Z])/g, ' $1').toLowerCase();
        var detail = (k === 'paceTargetWpm' && accommodations[k]) ? ' (' + accommodations[k] + ' WPM)' : '';
        lines.push('  - ' + label + detail);
      });
      if (badges.length > 0) {
        lines.push('  Accommodation exploration badges: ' + badges.length);
      }
      lines.push('');
    }

    // Per-accommodation efficacy: compare sessions WITH vs WITHOUT each
    // accommodation key. Only includes accommodations the student has tried
    // both ways. Delta = WPM (with) - WPM (without). Positive = helped speed.
    // NOTE: aggregates across all drill types; drill mix can confound.
    var efficacy = computeAccommodationEfficacy(sessions);
    if (efficacy.length > 0) {
      lines.push('ACCOMMODATION EFFICACY (data-only, no clinical interpretation)');
      lines.push('  Format: with-vs-without sessions; WPM delta; accuracy delta');
      efficacy.forEach(function(row) {
        lines.push('  ' + row.label + ': ' +
          row.sessionsWith + ' with / ' + row.sessionsWithout + ' without · ' +
          (row.wpmDelta >= 0 ? '+' : '') + row.wpmDelta + ' WPM · ' +
          (row.accDelta >= 0 ? '+' : '') + row.accDelta + '% acc');
      });
      lines.push('  Caveat: aggregate across drill types. Drill mix may confound.');
      lines.push('');
    }

    if (state.iepGoal) {
      lines.push('IEP GOAL');
      lines.push('  Target: ' + state.iepGoal.targetWpm + ' WPM at ' + state.iepGoal.targetAccuracy + '% accuracy');
      if (state.iepGoal.notes) lines.push('  Notes: ' + state.iepGoal.notes);
      lines.push('');
    }

    // Surface session notes in chronological order — even one per session can
    // be powerful context ("J.D. was tired today but persisted"). Limit to the
    // most recent 10 to keep the report readable.
    var notedSessions = sessions.filter(function(s) { return s.note && s.note.trim(); });
    if (notedSessions.length > 0) {
      lines.push('SESSION NOTES (most recent first, up to 10)');
      notedSessions.slice(-10).reverse().forEach(function(s) {
        var reflTag = s.reflection ? ' · felt: ' + s.reflection : '';
        lines.push('  ' + new Date(s.date).toLocaleDateString() + ' · ' + (s.drillName || s.drillId) +
                   ' (' + s.wpm + ' WPM, ' + s.accuracy + '%' + reflTag + ')');
        lines.push('    ' + s.note);
      });
      lines.push('');
    }

    // Reflection roll-up: if student is tagging how sessions feel, summarize.
    // Surfaces the "numbers don't tell the whole story" signal in one line.
    var withRefl = sessions.filter(function(s) { return s.reflection; });
    if (withRefl.length >= 3) {
      var reflCounts = { 'too-easy': 0, 'just-right': 0, 'hard': 0 };
      withRefl.forEach(function(s) { if (reflCounts[s.reflection] !== undefined) reflCounts[s.reflection]++; });
      lines.push('STUDENT REFLECTION ROLL-UP');
      lines.push('  Too easy: ' + reflCounts['too-easy'] + '  ·  Just right: ' + reflCounts['just-right'] + '  ·  Hard: ' + reflCounts['hard']);
      lines.push('  (Self-rated feel of session, ' + withRefl.length + ' tagged of ' + sessions.length + ' total)');
      lines.push('');
    }

    lines.push('NOTES');
    lines.push('  This report summarizes data collected in AlloFlow Typing Practice,');
    lines.push('  a disability-first keyboarding tool. WPM calculated as standard');
    lines.push('  (characters typed / 5) / minutes. Accuracy = correct keystrokes /');
    lines.push('  total keystrokes. Student worked without peer comparison, timer');
    lines.push('  pressure, or streak punishments by design.');

    return lines.join('\n');
  }

  function renderDrillCard(drill, unlocked, palette, startDrill) {
    var React = window.React;
    var h = React.createElement;
    return h('button', {
      key: drill.id,
      onClick: unlocked ? function() { startDrill(drill.id); } : null,
      disabled: !unlocked,
      'aria-label': drill.name + (unlocked ? '' : ' (locked)'),
      style: {
        textAlign: 'left',
        background: unlocked ? palette.surface : palette.bg,
        border: '1px solid ' + (unlocked ? palette.border : palette.surface2),
        borderRadius: '12px',
        padding: '16px',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.5,
        color: palette.text,
        font: 'inherit',
        transition: 'border-color 120ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minHeight: '120px'
      },
      onMouseOver: function(e) { if (unlocked) e.currentTarget.style.borderColor = palette.accent; },
      onMouseOut: function(e) { if (unlocked) e.currentTarget.style.borderColor = palette.border; }
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('span', { style: { fontSize: '24px' } }, drill.icon),
        h('span', {
          style: {
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: unlocked ? palette.surface2 : 'transparent',
            color: palette.textMute,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }
        }, unlocked ? ('Tier ' + drill.tier) : '🔒 Locked')
      ),
      h('div', { style: { fontSize: '15px', fontWeight: 600, color: palette.text } }, drill.name),
      h('div', { style: { fontSize: '12px', color: palette.textMute, lineHeight: '1.4' } }, drill.description)
    );
  }

  function renderNavButton(label, onClick, palette, disabled) {
    var React = window.React;
    var h = React.createElement;
    return h('button', {
      onClick: disabled ? null : onClick,
      disabled: disabled,
      style: {
        background: 'transparent',
        border: '1px solid ' + palette.border,
        borderRadius: '8px',
        padding: '8px 14px',
        color: disabled ? palette.textMute : palette.textDim,
        fontSize: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        font: 'inherit'
      }
    }, label);
  }

  function renderBackButton(onClick, palette) {
    var React = window.React;
    var h = React.createElement;
    return h('button', {
      onClick: onClick,
      'aria-label': 'Back to menu',
      style: {
        background: 'none',
        border: 'none',
        color: palette.accent,
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        padding: '4px 0'
      }
    }, '← Menu');
  }

  function renderToggleRow(title, descr, isOn, onToggle, palette) {
    var React = window.React;
    var h = React.createElement;
    return h('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 0',
        borderBottom: '1px solid ' + palette.border
      }
    },
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, title),
        h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4' } }, descr)
      ),
      h('button', {
        onClick: onToggle,
        role: 'switch',
        'aria-checked': isOn ? 'true' : 'false',
        'aria-label': title,
        style: {
          width: '52px',
          height: '28px',
          borderRadius: '999px',
          background: isOn ? palette.success : palette.surface2,
          border: '1px solid ' + palette.border,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 120ms ease',
          flexShrink: 0
        }
      },
        h('span', {
          'aria-hidden': 'true',
          style: {
            position: 'absolute',
            top: '2px',
            left: isOn ? '26px' : '2px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#ffffff',
            transition: 'left 120ms ease',
            display: 'block'
          }
        })
      )
    );
  }

})();

} // end: if not already registered
