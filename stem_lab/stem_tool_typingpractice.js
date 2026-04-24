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
      restBreakMinutes: null,  // null = no nudge; otherwise toast after N active minutes
      sightReadSeconds: null,  // null = off; read-first preview count-in before capture
      assessmentMode: false,   // when true: hide in-drill WPM/acc/timer for clean baseline
      focusKeyboard: false,    // when true (AND largeKeys on): heavily dim non-target keys
      speakWordsOnSpace: false, // TTS announces each completed word on space press
      sampleLength: null,      // null/any | 'short' | 'medium' | 'long' — preferred sample size
      // Visual-reward modes — opt-in image generation after certain drill types.
      storyModeImage: false,   // passage drills: generate an illustration of the passage
      promptModeImage: false   // custom drills: treat the text as an image prompt, refine on retry
    },
    accommodationBadges: [],   // badge ids earned for TRYING an accommodation
    masteryLevel: 0,           // progression tier: 0=home-row, 1=top-row, 2=bottom-row, 3=words, 4=passages
    baseline: null,            // first-ever session snapshot — anchor for IEP trend
    iepGoal: null,             // { targetWpm, targetAccuracy, notes } set by clinician
    dailyGoal: null,           // { targetSessions, targetWpm, date } — expires next day
    motivationStatement: '',   // student-authored "why I'm practicing" shown on menu + IEP
    aiPassage: null,           // { text, gradeLevel, topic, generatedAt } — currently active
    aiPassageLibrary: [],      // array of saved passages for reuse (capped at MAX_PASSAGE_LIBRARY)
    passagePrefs: {            // remembered choices for next generation
      gradeLevel: '2-3',       // K, 1, 2-3, 4-5, 6-8, 9-12
      topic: '',
      difficulty: 'on-level',  // 'easier' | 'on-level' | 'stretch'
      language: 'en',          // 'en' | 'es' | 'fr' | 'pt' | 'zh' | ...
      length: 'medium'         // 'short' (20-35 words) | 'medium' (35-55) | 'long' (55-80)
    },
    studentName: '',           // optional; appears on IEP report when set
    // drillRunId increments when student STARTS a fresh drill from the menu
    // (new text). It does NOT increment on "Drill again" from summary, so
    // retries use the same sample — fair before/after comparison on identical
    // text is the point of a retry.
    drillRunId: 0,
    audioTheme: 'chime',       // 'chime' (default) | 'soft' | 'mute'
    accentColor: 'blue',       // 'blue' (default) | 'teal' | 'violet' | 'amber' | 'rose'
    theme: 'default',          // named visual theme: default | steampunk | cyberpunk | kawaii | neutral
    // Lifetime totals survive session-array capping, so the IEP report stays
    // accurate for long-term students even after the 200-session cap trims
    // the oldest records.
    lifetime: { totalSessions: 0, totalCharsTyped: 0, totalErrorsLogged: 0, abandonments: 0 },
    onboardingSeen: false,
    // aggregateErrors: { 'a': 5, 'd': 12, ... } — all-time per-char error counts
    // for the heatmap. Updated at session save so we don't recompute from the
    // capped sessions array.
    aggregateErrors: {},
    // Last generated visual-mode image. Single slot (base64 blobs are heavy —
    // 200 capped sessions × ~80 KB each would blow localStorage). Stores the
    // most recent one so refine-via-image-to-image has a reference.
    //   { base64: 'data:image/png;base64,...', prompt, sessionDate, refinedCount }
    lastGeneratedImage: null,
    // Small gallery of prior visual-mode images (up to VISUAL_GALLERY_MAX).
    // Lets students see a history of their drill-driven image generation
    // without the infinite-growth risk of per-session storage. Newest first.
    visualGallery: [],
    // milestonesEarned — array of milestone IDs the student has crossed.
    // Additive only; we never un-earn to avoid guilt patterns.
    milestonesEarned: [],
    // favoriteDrills — drill IDs the student has starred. Sort first on menu.
    favoriteDrills: [],
    // Custom drill — teacher or student can author their own practice text
    // (spelling list, IEP-goal words, science vocab, etc.). Does NOT feed
    // mastery progression. `customDrill` is retained for backward compat with
    // earlier state shapes; new canonical field is the library.
    customDrill: null,         // (legacy) single-slot, auto-migrated into library
    customDrillLibrary: [],    // canonical: array of { id, text, label, savedAt }
    activeCustomDrillId: null  // which library entry is currently being drilled
  };

  // Max custom drills kept at once. Matches the passage library size — both are
  // per-student curated collections of authored content.
  var MAX_CUSTOM_LIBRARY = 5;

  // Lifetime milestones — positive-framing celebrations for cumulative work.
  // Each has a check(state) predicate that returns true when earned. Deliberately
  // not streak-based (avoids guilt patterns) and not visible as a "progress
  // toward" bar (avoids pressure). Student simply earns them by showing up.
  var MILESTONES = [
    { id: 'first',       label: '🌱 First session',         check: function(lt, ud) { return lt.totalSessions >= 1; } },
    { id: 'ten',         label: '📚 10 sessions',           check: function(lt, ud) { return lt.totalSessions >= 10; } },
    { id: 'fifty',       label: '📖 50 sessions',           check: function(lt, ud) { return lt.totalSessions >= 50; } },
    { id: 'hundred',     label: '🎓 100 sessions',          check: function(lt, ud) { return lt.totalSessions >= 100; } },
    { id: 'thousand',    label: '🏆 1000 characters typed', check: function(lt, ud) { return lt.totalCharsTyped >= 1000; } },
    { id: 'tenk',        label: '🗝 10000 characters typed',check: function(lt, ud) { return lt.totalCharsTyped >= 10000; } },
    { id: 'fiftyk',      label: '⭐ 50000 characters typed',check: function(lt, ud) { return lt.totalCharsTyped >= 50000; } },
    { id: 'days7',       label: '🌻 7 days of practice',    check: function(lt, ud) { return ud >= 7; } },
    { id: 'days30',      label: '🌳 30 days of practice',   check: function(lt, ud) { return ud >= 30; } }
  ];

  // Maximum size of the saved-passage library. Keep low to avoid clutter —
  // students who want more have Custom Drill for arbitrary text.
  var MAX_PASSAGE_LIBRARY = 8;

  // Visual-mode gallery cap. 3 images × ~80 KB base64 PNG = ~240 KB, well
  // within localStorage comfort. More than 3 and students lose track of
  // which image goes with which drill run; 3 is "recent work" without noise.
  var VISUAL_GALLERY_MAX = 3;

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

  // Language options for AI-generated passages. Code + human-facing label +
  // note for the prompt. English is the default; other languages support ELL
  // students and families practicing in a shared language. Keep the list
  // short and common — the LLM handles most of the language matter.
  var PASSAGE_LANGUAGES = [
    { code: 'en', label: 'English',         promptHint: 'Write the passage in English.' },
    { code: 'es', label: 'Español',         promptHint: 'Escribe el pasaje en español. Usa vocabulario apropiado para el nivel escolar indicado. SOLO usa caracteres ASCII estándar — NO uses tildes (á é í ó ú ñ) ni otros diacríticos; reemplázalos con las letras base correspondientes. Sin comillas especiales.' },
    { code: 'fr', label: 'Français',        promptHint: 'Écris le passage en français. Utilise du vocabulaire adapté au niveau scolaire. UTILISE UNIQUEMENT des caractères ASCII standard — PAS d\'accents (é è à ç etc.) ni de diacritiques; remplace-les par les lettres de base. Pas de guillemets spéciaux.' },
    { code: 'pt', label: 'Português',       promptHint: 'Escreva o texto em português. Use vocabulário apropriado para o nível escolar. USE APENAS caracteres ASCII padrão — NÃO use acentos (á ã ç etc.) nem diacríticos; substitua-os pelas letras base. Sem aspas especiais.' },
    { code: 'zh', label: '简体中文',         promptHint: 'Write the passage mostly in English but with 2-4 common Simplified Chinese vocabulary words integrated naturally for typing practice. Keep Chinese chars simple and common.' }
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
    },
    'custom': {
      id: 'custom',
      name: 'Custom Text',
      icon: '📋',
      tier: null,                // sits outside the mastery progression
      description: 'Your teacher or you can enter any text — spelling lists, IEP goals, science vocab. Not scored for mastery.',
      samples: null,             // populated from state.customDrill at drill-start
      locked: false,
      requiresCustom: true       // routes through custom-setup view
    },
    // One-handed drills — left-hand-only and right-hand-only practice for
    // students with limb differences, temporary injury, or motor-planning
    // challenges that make bimanual coordination hard. Always unlocked,
    // outside the mastery progression (not counted toward tier advancement).
    // Samples deliberately stay within the hand's reach (home + adjacent keys).
    'one-hand-left': {
      id: 'one-hand-left',
      name: 'Left Hand Only',
      icon: '🫲',
      tier: null,
      description: 'Practice with just the left hand. Keys: q w e r t · a s d f g · z x c v b · space.',
      samples: [
        'asdf asdf asdf; sad fad bad; ' +
          'a bad cat; a red car; a fast bag',
        'bat cat sat dad fed; grass trade; ' +
          'a vast craft; wave safe gaze',
        'we trade a fast car; brave cats; ' +
          'red stars; sweet bread; create',
        'a water bear; crate; grave; verse; ' +
          'address; stage; feast; safer; exact',
        'start a saved draft; gather facts; ' +
          'we saved a great seat; a secret'
      ],
      locked: false,
      oneHanded: 'left'
    },
    'one-hand-right': {
      id: 'one-hand-right',
      name: 'Right Hand Only',
      icon: '🫱',
      tier: null,
      description: 'Practice with just the right hand. Keys: y u i o p · h j k l ; · n m , . / · space.',
      samples: [
        'jkl; jkl; jkl; hi; in my mill; ' +
          'john; moon pool; milk lily; pink hymn',
        'phony nun hunt; loom loop; link pump; ' +
          'monk milk; noun noon; you hum him',
        'my pony junk; hymn hum; oily puppy; ' +
          'pink moon; huh; look up; unhook',
        'junk pilot; jumbo kiln; holly pooh; ' +
          'noisy nylon; monopoly; nominally',
        'minimum input; pup; upon; union; ' +
          'lip ink; pop; puppy; mulch on pool'
      ],
      locked: false,
      oneHanded: 'right'
    },
    // Focused practice — auto-generates a drill targeting the student's
    // current top-6 error keys (from state.aggregateErrors). samples: null
    // at registration time; populated dynamically by buildFocusedPracticeText()
    // at drill-start time so the content always reflects the latest error
    // pattern. Only surfaces on the menu when the student has error data.
    'focus-errors': {
      id: 'focus-errors',
      name: 'Focused Practice',
      icon: '🎯',
      tier: null,
      description: 'Auto-generated practice for YOUR top error keys. Updates after every session based on the heatmap.',
      samples: null,
      locked: false,
      requiresErrorData: true  // hidden from menu until aggregateErrors has entries
    }
  };

  // Build a dynamic practice text from aggregate error data. Interleaves the
  // top-N missed characters in short bursts so the student gets repeated
  // exposure without a single character dominating unrealistically.
  // Deterministic — same inputs always produce same output, so "Drill again"
  // on focus-errors gives a fair retry on identical text.
  function buildFocusedPracticeText(aggregateErrors, drillRunId) {
    if (!aggregateErrors) return '';
    var keys = Object.keys(aggregateErrors)
      .filter(function(k) { return aggregateErrors[k] > 0 && /^[a-z0-9;,\./\-']$/i.test(k); })
      .sort(function(a, b) { return aggregateErrors[b] - aggregateErrors[a]; })
      .slice(0, 6);
    if (keys.length === 0) return '';
    // Pad to at least 4 keys so the drill doesn't feel repetitive
    while (keys.length < 4) keys.push(['a','s','d','f','j','k','l'][keys.length]);
    // Emit burst groups — each group is "kkk " where k is one of the top keys.
    // Rotate through keys and adjust burst length based on error frequency
    // so the MOST-missed key gets slightly more practice.
    var maxErrors = Math.max.apply(null, keys.map(function(k) { return aggregateErrors[k] || 1; }));
    var chunks = [];
    keys.forEach(function(k) {
      var freq = aggregateErrors[k] || 1;
      var burstLen = Math.max(3, Math.round((freq / maxErrors) * 5)); // 3-5 chars per burst
      chunks.push(new Array(burstLen + 1).join(k));
    });
    // Add a second pass with pair combos (top 2 chars interleaved) so students
    // practice the transitions, not just isolated key presses.
    if (keys.length >= 2) {
      chunks.push(keys[0] + keys[1] + keys[0] + keys[1] + keys[0] + keys[1]);
      if (keys.length >= 4) {
        chunks.push(keys[2] + keys[3] + keys[2] + keys[3]);
      }
    }
    // xorshift-lite rotation so drillRunId varies the order slightly
    var seed = ((drillRunId || 0) * 7) % chunks.length;
    var rotated = chunks.slice(seed).concat(chunks.slice(0, seed));
    return rotated.join(' ');
  }

  // Tier progression ordering for the skill tree and mastery-advance logic.
  // Change this list if you reorder tiers; don't compute from Object.keys(DRILLS)
  // since that's insertion-order and easy to mis-read.
  var TIER_ORDER = ['home-row', 'top-row', 'bottom-row', 'common-words', 'capitalization', 'number-row', 'symbols', 'passage'];

  // Stable-random sample picker: seeded on drillRunId which increments ONLY
  // when the student starts a fresh drill from the menu. "Drill again" from
  // summary keeps drillRunId the same so the retry uses identical text —
  // fair before/after comparison is the whole point of retrying.
  // Optional lengthPref narrows the pool to samples in a preferred range:
  // 'short' = <40 chars, 'medium' = 40–70, 'long' = >70. If no samples match
  // the preference, falls back to the full pool (don't leave the student with
  // no drill just because they picked a mode that doesn't match this drill).
  function pickDrillSample(drill, drillRunId, lengthPref) {
    if (!drill || !drill.samples || drill.samples.length === 0) return '';
    var pool = drill.samples;
    if (lengthPref === 'short')       pool = pool.filter(function(s) { return s.length < 40; });
    else if (lengthPref === 'medium') pool = pool.filter(function(s) { return s.length >= 40 && s.length <= 70; });
    else if (lengthPref === 'long')   pool = pool.filter(function(s) { return s.length > 70; });
    if (pool.length === 0) pool = drill.samples; // fallback
    var seed = (drillRunId || 0) + drill.id.length * 7;
    var idx = Math.abs(seed ^ (seed >> 3)) % pool.length;
    return pool[idx];
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
  // Themes are procedural (Web Audio) so no external assets load. Three of
  // these pair with specific visual themes (clack ↔ steampunk, beep ↔
  // cyberpunk, pop ↔ kawaii) but students can mix any combo.
  var AUDIO_THEMES = {
    chime: {
      correct: { freq: 880, ms: 40,  type: 'sine' },     // bright A5 chime
      error:   { freq: 200, ms: 100, type: 'triangle' }  // low thunk
    },
    soft: {
      correct: { freq: 523, ms: 55,  type: 'sine' },     // C5 gentle
      error:   { freq: 330, ms: 70,  type: 'sine' }      // E4 gentle, no contrast alarm
    },
    clack: {
      correct: { freq: 160, ms: 28,  type: 'square' },   // low mechanical tick — typewriter key
      error:   { freq: 80,  ms: 60,  type: 'square' }    // deeper thud — jam
    },
    beep: {
      correct: { freq: 1400, ms: 32, type: 'square' },   // crisp high digital beep
      error:   { freq: 120,  ms: 90, type: 'sawtooth' }  // low buzzed error — terminal alarm
    },
    pop: {
      correct: { freq: 660, ms: 45,  type: 'sine' },     // soft mid-range pop
      error:   { freq: 440, ms: 60,  type: 'triangle' }  // kinder low tone, not alarming
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
    danger:    '#f87171',
    // onAccent = text color used when placed on top of accent/success/warn
    // backgrounds. For dark themes this is the bg color (creates inverse).
    // For light themes it's the darkest text color.
    onAccent:  '#0f172a'
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
    danger:    '#ff4444',
    onAccent:  '#000000'
  };

  // Named visual themes — each is a full palette override. High-contrast
  // still trumps them (it's an accessibility mode, not a style preference).
  // accentColor picker can further override accent + accentDim within a theme.
  var THEMES = {
    // Default · existing cool-dark palette.
    'default': PALETTE,

    // 🔩 Steampunk · warm brass + leather + copper + patina-green.
    // Evokes gears, typewriters, and Victorian industrial feel.
    'steampunk': {
      bg:        '#1a1108',   // deep espresso
      surface:   '#2d1f12',   // dark leather
      surface2:  '#3d2d1c',
      border:    '#5a4528',
      text:      '#f0e0c0',   // warm cream — parchment
      textDim:   '#d4bc8a',
      textMute:  '#a08868',
      accent:    '#d4884c',   // copper / brass
      accentDim: '#a66a35',
      success:   '#88a850',   // oxidized patina green
      warn:      '#e8a040',   // amber brass
      danger:    '#c85030',   // rust
      onAccent:  '#1a1108'
    },

    // 🌃 Cyberpunk · neon magenta + cyan + deep violet-black.
    // Evokes neon-lit night, terminal glow, retro-future.
    'cyberpunk': {
      bg:        '#0a0514',
      surface:   '#1a0f2a',
      surface2:  '#2a1f3a',
      border:    '#3d2a5a',
      text:      '#e0d8ff',
      textDim:   '#c0b0e8',
      textMute:  '#8070a0',
      accent:    '#ff00a8',   // neon magenta
      accentDim: '#c00080',
      success:   '#00ffc8',   // neon cyan-green
      warn:      '#ffd700',   // electric yellow
      danger:    '#ff4060',   // neon red
      onAccent:  '#0a0514'
    },

    // 🍓 Kawaii · pastel pink + cream + soft plum. LIGHT theme.
    // Explicitly-chosen text colors keep 4.5:1 contrast against a light bg.
    'kawaii': {
      bg:        '#fff5fa',   // warm cream-pink
      surface:   '#ffe8f2',   // pale pink
      surface2:  '#ffd6e5',
      border:    '#f5c2d7',
      text:      '#4a2838',   // warm dark plum — 4.5:1+ against bg
      textDim:   '#6a4858',
      textMute:  '#8a7080',
      accent:    '#e85a8a',   // saturated rose (not pastel — needs enough contrast)
      accentDim: '#c03868',
      success:   '#4a9a6a',   // mint-forest (saturated — contrast)
      warn:      '#d4740a',   // saturated peach
      danger:    '#c84038',
      onAccent:  '#ffffff'    // white text on accent in light themes
    },

    // 🪨 Neutral · warm gray dark palette, no blue cast.
    // For students/clinicians who find blue tones cool or overstimulating.
    'neutral': {
      bg:        '#1a1a1a',
      surface:   '#262626',
      surface2:  '#363636',
      border:    '#444444',
      text:      '#e8e8e8',
      textDim:   '#c8c8c8',
      textMute:  '#989898',
      accent:    '#b8a080',   // warm tan
      accentDim: '#8a7860',
      success:   '#8aa078',   // sage
      warn:      '#c89860',   // warm gold
      danger:    '#b07870',   // dusty rose
      onAccent:  '#1a1a1a'
    }
  };

  // Accent themes — swap just the accent pair (accent + accentDim) so the
  // base dark surface stays consistent. Some students find the default blue
  // too cold, some find warm tones easier to focus on. This isn't pure
  // aesthetic polish — for students with color-sensitivity or visual-
  // processing differences, swapping the accent meaningfully affects the
  // readability of highlighted characters.
  var ACCENT_THEMES = {
    blue:   { accent: '#60a5fa', accentDim: '#3b82f6' }, // default
    teal:   { accent: '#2dd4bf', accentDim: '#0d9488' },
    violet: { accent: '#a78bfa', accentDim: '#7c3aed' },
    amber:  { accent: '#fbbf24', accentDim: '#d97706' },
    rose:   { accent: '#fb7185', accentDim: '#e11d48' }
  };

  function getPalette(accommodations, accentChoice, themeName) {
    // Accessibility first: high-contrast mode trumps all style choices.
    if (accommodations && accommodations.highContrast) return HIGH_CONTRAST_PALETTE;

    // Base palette from selected named theme (default if unknown).
    var base = THEMES[themeName] || THEMES['default'];

    // Accent override: if the student has also picked an accent color,
    // overlay just the accent pair on top of the theme. This stacks so
    // they can pick 'Steampunk' + 'Violet' if they want (unusual but valid).
    var accent = ACCENT_THEMES[accentChoice];
    if (accent && accent !== ACCENT_THEMES.blue) {
      return Object.assign({}, base, { accent: accent.accent, accentDim: accent.accentDim });
    }
    return base;
  }

  // Theme-specific font stacks. Each theme's flavor extends to typography:
  // steampunk reads as formal serif, cyberpunk as monospace terminal, kawaii
  // as rounded friendly. Dyslexia-font accommodation still wins over theme
  // choice — accessibility beats aesthetics.
  var THEME_FONT_STACKS = {
    'default':   'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    'steampunk': '"Georgia", "Palatino Linotype", "Book Antiqua", "Hoefler Text", serif',
    'cyberpunk': '"JetBrains Mono", "Fira Code", "Source Code Pro", "Courier New", ui-monospace, monospace',
    'kawaii':    '"Nunito", "Varela Round", "Quicksand", "Comic Sans MS", ui-rounded, sans-serif',
    'neutral':   '"Inter", "Helvetica Neue", system-ui, sans-serif'
  };

  function getFontFamily(accommodations, themeName) {
    if (accommodations && accommodations.dyslexiaFont) {
      // OpenDyslexic preferred; fallback to system safe-list with increased letter spacing.
      return '"OpenDyslexic", "Comic Sans MS", "Lexend", system-ui, sans-serif';
    }
    return THEME_FONT_STACKS[themeName] || THEME_FONT_STACKS['default'];
  }

  // Subtle theme-specific background texture. Returned as a CSS string that
  // goes into the tool root's background property. Each theme gets a flavor
  // effect that reads as ambiance, not noise.
  function getThemeBackgroundTexture(palette, themeName) {
    switch (themeName) {
      case 'steampunk':
        // Warm radial: brighter at center, darker at edges. Evokes a
        // candle-lit workshop or the glow around a single reading lamp.
        return 'radial-gradient(ellipse at center, ' + palette.surface + ' 0%, ' + palette.bg + ' 75%)';
      case 'cyberpunk':
        // Faint scan-line overlay — thin horizontal lines like CRT / terminal.
        // 3px line spacing at 4% opacity keeps it subtle; stops short of being
        // a motion/accessibility problem.
        return 'repeating-linear-gradient(0deg, ' + palette.bg + ' 0px, ' + palette.bg + ' 2px, ' +
               palette.surface + ' 2px, ' + palette.surface + ' 3px)';
      case 'kawaii':
        // Soft vertical gradient from bg to surface (pale cream-pink to
        // slightly-pinker-cream). Gives depth without fighting the content.
        return 'linear-gradient(180deg, ' + palette.bg + ' 0%, ' + palette.surface + ' 100%)';
      case 'neutral':
        // No texture — neutral means quiet.
        return palette.bg;
      case 'default':
      default:
        return palette.bg;
    }
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3b: GLOBAL FOCUS-RING STYLE (WCAG AA)
  // ─────────────────────────────────────────────────────────
  // Inject once on module load. Uses :focus-visible so mouse clicks don't
  // leave persistent outlines but keyboard tab navigation always shows a
  // clear ring. Scoped via a data attribute so it doesn't affect the rest
  // of AlloFlow.

  // Theme-voiced loading copy used for AI passage generation + image
  // generation. Returns the label to show WHILE loading. Short enough that
  // it fits in a button.
  function getLoadingLabel(themeName, context) {
    var t = themeName || 'default';
    var c = context || 'generic';
    // context can be 'passage', 'image', or 'generic'
    if (t === 'cyberpunk') {
      return c === 'image'   ? '[RENDER] ...'
           : c === 'passage' ? '[GEN] ...'
           :                   '[PROC] ...';
    }
    if (t === 'steampunk') {
      return c === 'image'   ? '⚙ Etching…'
           : c === 'passage' ? '⚙ Composing…'
           :                   '⚙ Working…';
    }
    if (t === 'kawaii') {
      return c === 'image'   ? '✨ Drawing... 💕'
           : c === 'passage' ? '✨ Writing... 💕'
           :                   '✨ Making magic... 💕';
    }
    if (t === 'neutral') {
      return c === 'image'   ? 'Rendering.'
           : c === 'passage' ? 'Generating.'
           :                   'Working.';
    }
    return c === 'image'   ? '✨ Generating image…'
         : c === 'passage' ? '✨ Generating passage…'
         :                   '✨ Generating…';
  }

  (function injectFocusStyles() {
    if (document.getElementById('tp-focus-styles')) return;
    var style = document.createElement('style');
    style.id = 'tp-focus-styles';
    // Scoped to .tp-root so we don't affect the rest of AlloFlow.
    // :focus-visible means mouse clicks don't leave persistent outlines,
    // but keyboard tab always shows a clear accessible ring.
    //
    // Also contains per-theme visual "juice" — button shadows, hover
    // effects, drill-current-character treatments — all gated behind
    // .tp-root.tp-theme-<name> class selectors so they apply only to
    // the theme that opted in. Default + neutral stay clean by design.
    style.textContent = [
      /* ── Focus ring (WCAG AA) ─────────────────────────────────── */
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
      '.tp-root [tabindex]:focus:not(:focus-visible) { outline: none; }',

      /* ── Steampunk: brass-embossed buttons + warm hover glow ──── */
      '.tp-root.tp-theme-steampunk button:not([disabled]) {',
      '  box-shadow: 0 2px 0 rgba(60, 30, 10, 0.5), inset 0 1px 0 rgba(255, 220, 150, 0.18);',
      '  transition: box-shadow 120ms ease, transform 60ms ease, filter 120ms ease;',
      '}',
      '.tp-root.tp-theme-steampunk button:not([disabled]):hover {',
      '  box-shadow: 0 3px 10px rgba(212, 136, 76, 0.28), inset 0 1px 0 rgba(255, 220, 150, 0.28);',
      '  filter: brightness(1.06);',
      '}',
      '.tp-root.tp-theme-steampunk button:not([disabled]):active {',
      '  transform: translateY(1px);',
      '  box-shadow: 0 1px 0 rgba(60, 30, 10, 0.5);',
      '}',

      /* ── Cyberpunk: neon glow on hover, current-char pulse ───── */
      '.tp-root.tp-theme-cyberpunk button:not([disabled]) {',
      '  transition: box-shadow 160ms ease, text-shadow 160ms ease, filter 120ms ease;',
      '}',
      '.tp-root.tp-theme-cyberpunk button:not([disabled]):hover {',
      '  box-shadow: 0 0 14px rgba(255, 0, 168, 0.35), 0 0 24px rgba(255, 0, 168, 0.15);',
      '  text-shadow: 0 0 6px rgba(255, 0, 168, 0.4);',
      '  filter: brightness(1.1);',
      '}',
      '@keyframes tp-cyber-pulse {',
      '  0%, 100% { box-shadow: 0 0 6px rgba(255, 0, 168, 0.4); }',
      '  50%      { box-shadow: 0 0 14px rgba(255, 0, 168, 0.7); }',
      '}',
      '.tp-root.tp-theme-cyberpunk .tp-current-char {',
      '  animation: tp-cyber-pulse 1.4s ease-in-out infinite;',
      '}',

      /* ── Kawaii: soft lift on hover, gentle bounce on click ──── */
      '.tp-root.tp-theme-kawaii button:not([disabled]) {',
      '  box-shadow: 0 2px 5px rgba(232, 90, 138, 0.15);',
      '  transition: transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 140ms ease;',
      '}',
      '.tp-root.tp-theme-kawaii button:not([disabled]):hover {',
      '  transform: translateY(-1px);',
      '  box-shadow: 0 5px 10px rgba(232, 90, 138, 0.28);',
      '}',
      '.tp-root.tp-theme-kawaii button:not([disabled]):active {',
      '  transform: translateY(0) scale(0.98);',
      '}',
      '@keyframes tp-kawaii-breathe {',
      '  0%, 100% { transform: scale(1); }',
      '  50%      { transform: scale(1.04); }',
      '}',
      '.tp-root.tp-theme-kawaii .tp-current-char {',
      '  display: inline-block;',
      '  animation: tp-kawaii-breathe 1.8s ease-in-out infinite;',
      '  transform-origin: center;',
      '}',

      /* ── Steampunk drill-target: inset paper-roller feel ─────── */
      '.tp-root.tp-theme-steampunk [role="textbox"] {',
      '  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(255, 200, 120, 0.12);',
      '}',

      /* ── Cyberpunk drill-target: thin neon underline + inner glow ── */
      '.tp-root.tp-theme-cyberpunk [role="textbox"] {',
      '  box-shadow: inset 0 0 20px rgba(255, 0, 168, 0.08), 0 1px 0 rgba(255, 0, 168, 0.3);',
      '}',

      /* ── Kawaii drill-target: soft lifted card feel ──────────── */
      '.tp-root.tp-theme-kawaii [role="textbox"] {',
      '  box-shadow: 0 4px 14px rgba(232, 90, 138, 0.18);',
      '  border-radius: 18px !important;',
      '}',

      /* ── Loading spinner keyframes per theme ──────────────────── */
      '@keyframes tp-spin-gear { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
      '@keyframes tp-cyber-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.35; } }',
      '@keyframes tp-kawaii-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }',
      '@keyframes tp-neutral-dots { 0%, 25% { opacity: 0.3; } 50% { opacity: 1; } 75%, 100% { opacity: 0.3; } }',

      '.tp-root.tp-theme-steampunk .tp-loading-icon { display: inline-block; animation: tp-spin-gear 2.4s linear infinite; }',
      '.tp-root.tp-theme-cyberpunk .tp-loading-icon { display: inline-block; animation: tp-cyber-blink 0.9s steps(2, jump-none) infinite; font-family: ui-monospace, monospace; }',
      '.tp-root.tp-theme-kawaii    .tp-loading-icon { display: inline-block; animation: tp-kawaii-bounce 0.8s ease-in-out infinite; }',
      '.tp-root.tp-theme-neutral   .tp-loading-icon { display: inline-block; animation: tp-neutral-dots 1.2s ease-in-out infinite; }',

      /* ── Summary celebration animation (one-shot, not infinite) ─────────
         Applied to the summary headline when a PB / mastery / baseline /
         firstGoalMet event fires. Subtle — no confetti, no strobe.
         Each theme gets its own motion signature consistent with the
         broader palette personality. Reduced-motion users get nothing. */
      '@keyframes tp-celebrate-pulse { 0% { transform: scale(1); } 40% { transform: scale(1.04); } 100% { transform: scale(1); } }',
      '@keyframes tp-celebrate-glow  { 0% { text-shadow: 0 0 0 transparent; } 50% { text-shadow: 0 0 12px currentColor; } 100% { text-shadow: 0 0 0 transparent; } }',
      '@keyframes tp-celebrate-steam { 0% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-2px) rotate(-0.5deg); } 75% { transform: translateX(2px) rotate(0.5deg); } 100% { transform: translateX(0) rotate(0); } }',
      '@keyframes tp-celebrate-cyber { 0%, 20%, 40% { opacity: 1; transform: translateX(0); } 25% { opacity: 0.3; transform: translateX(2px); } 30% { opacity: 1; transform: translateX(-2px); } 60%, 100% { opacity: 1; transform: translateX(0); } }',
      '@keyframes tp-celebrate-kawaii { 0% { transform: scale(1) rotate(0); } 20% { transform: scale(1.08) rotate(-2deg); } 40% { transform: scale(1.06) rotate(2deg); } 60% { transform: scale(1.04) rotate(-1deg); } 100% { transform: scale(1) rotate(0); } }',

      '.tp-root .tp-celebrate { display: inline-block; animation: tp-celebrate-pulse 0.9s ease-out 1, tp-celebrate-glow 1.4s ease-out 1; }',
      '.tp-root.tp-theme-steampunk .tp-celebrate { animation: tp-celebrate-steam 0.8s ease-in-out 1, tp-celebrate-glow 1.4s ease-out 1; }',
      '.tp-root.tp-theme-cyberpunk .tp-celebrate { animation: tp-celebrate-cyber 0.7s steps(8, jump-none) 1; }',
      '.tp-root.tp-theme-kawaii    .tp-celebrate { animation: tp-celebrate-kawaii 1.1s ease-in-out 1; }',
      '.tp-root.tp-theme-neutral   .tp-celebrate { animation: tp-celebrate-pulse 0.8s ease-out 1; }',

      '@media (prefers-reduced-motion: reduce) {',
      '  .tp-root .tp-current-char,',
      '  .tp-root .tp-loading-icon,',
      '  .tp-root .tp-celebrate { animation: none !important; }',
      '  .tp-root button { transition: none !important; }',
      '}'
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

        // Migrate legacy single-slot customDrill into customDrillLibrary.
        // Non-destructive: only runs when library is empty and legacy slot has content.
        if ((!state.customDrillLibrary || state.customDrillLibrary.length === 0) &&
            state.customDrill && state.customDrill.text) {
          state.customDrillLibrary = [{
            id: 'cd' + (state.customDrill.savedAt ? new Date(state.customDrill.savedAt).getTime() : Date.now()),
            text: state.customDrill.text,
            label: state.customDrill.label || '',
            savedAt: state.customDrill.savedAt || new Date().toISOString()
          }];
        }

        var upd = function(key, val) { ctx.update('typingPractice', key, val); };
        var updMulti = function(obj) { ctx.updateMulti ? ctx.updateMulti('typingPractice', obj) : Object.keys(obj).forEach(function(k) { upd(k, obj[k]); }); };
        var addToast = ctx.addToast || function(msg) { console.log('[TypingPractice]', msg); };

        var palette = getPalette(state.accommodations, state.accentColor, state.theme);
        var fontFamily = getFontFamily(state.accommodations, state.theme);
        var rootBackground = getThemeBackgroundTexture(palette, state.theme);

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

        // Visual-mode image-generation state. Kept local so loading flags
        // and errors don't bloat persistent state. The generated image itself
        // still saves into state.lastGeneratedImage on success.
        var imgLoadingTuple = useState(false);
        var imgLoading = imgLoadingTuple[0], setImgLoading = imgLoadingTuple[1];
        var imgErrorTuple = useState(null);
        var imgError = imgErrorTuple[0], setImgError = imgErrorTuple[1];
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

        // Per-keystroke timestamps (ms offsets from startTime). Used to compute
        // intra-session pace graph on summary. Uses a ref to avoid one
        // setState per keystroke (which would also re-trigger the onKeyDown
        // useCallback's dependency chain). Reset on drill entry.
        var keystrokeTimesRef = useRef([]);

        // Sight-read countdown: when on, a N-second count-in shows the full
        // passage before typing is accepted. Reading-first scaffold.
        var sightReadLeftTuple = useState(0);
        var sightReadLeft = sightReadLeftTuple[0], setSightReadLeft = sightReadLeftTuple[1];

        // Warmup mode: this session will NOT be saved. Student checks the box
        // on drill-intro to practice without recording. Reduces all-or-nothing
        // stress. Flag lives in local state because it's per-drill-entry only.
        var isWarmupTuple = useState(false);
        var isWarmup = isWarmupTuple[0], setIsWarmup = isWarmupTuple[1];
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
        // Session comparison mode — when true, clicking a sparkline bar adds
        // that session to a small comparison selection (max 2). When 2 are
        // selected, a side-by-side comparison panel renders below the timeline.
        var compareModeTuple = useState(false);
        var compareMode = compareModeTuple[0], setCompareMode = compareModeTuple[1];
        var compareSelectionsTuple = useState([]);
        var compareSelections = compareSelectionsTuple[0], setCompareSelections = compareSelectionsTuple[1];

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
        // Note-search query — filters drill-history timeline by substring
        // match in session.note (case-insensitive). Useful for clinicians
        // finding specific past sessions: "when did I mention headache?"
        var noteQueryTuple = useState('');
        var noteQuery = noteQueryTuple[0], setNoteQuery = noteQueryTuple[1];
        var restNudgeShownRef = useRef(false);

        // Passage-generation-local state (separate from persistent state so
        // loading flag and draft topic don't get written to ctx.toolData)
        var draftTopicTuple = useState((state.passagePrefs && state.passagePrefs.topic) || '');
        var draftTopic = draftTopicTuple[0], setDraftTopic = draftTopicTuple[1];
        var draftGradeTuple = useState((state.passagePrefs && state.passagePrefs.gradeLevel) || '2-3');
        var draftGrade = draftGradeTuple[0], setDraftGrade = draftGradeTuple[1];
        var draftDifficultyTuple = useState((state.passagePrefs && state.passagePrefs.difficulty) || 'on-level');
        var draftLengthTuple = useState((state.passagePrefs && state.passagePrefs.length) || 'medium');
        var draftLength = draftLengthTuple[0], setDraftLength = draftLengthTuple[1];
        var draftDifficulty = draftDifficultyTuple[0], setDraftDifficulty = draftDifficultyTuple[1];
        var draftLanguageTuple = useState((state.passagePrefs && state.passagePrefs.language) || 'en');
        var draftLanguage = draftLanguageTuple[0], setDraftLanguage = draftLanguageTuple[1];
        var customTextDraftTuple = useState((state.customDrill && state.customDrill.text) || '');
        var customTextDraft = customTextDraftTuple[0], setCustomTextDraft = customTextDraftTuple[1];
        var customLabelDraftTuple = useState((state.customDrill && state.customDrill.label) || '');
        var customLabelDraft = customLabelDraftTuple[0], setCustomLabelDraft = customLabelDraftTuple[1];
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
        } else if (activeDrill && activeDrill.id === 'custom') {
          // Look up the active custom entry from the library; fall back to
          // the legacy singular slot if no id is set (e.g., right after migration).
          var lib = state.customDrillLibrary || [];
          var activeEntry = state.activeCustomDrillId
            ? lib.filter(function(e) { return e.id === state.activeCustomDrillId; })[0]
            : lib[0];
          targetStr = (activeEntry && activeEntry.text) || (state.customDrill && state.customDrill.text) || '';
        } else if (activeDrill && activeDrill.id === 'focus-errors') {
          // Generated fresh each time from the student's current aggregateErrors.
          // drillRunId threaded in so retries are deterministic but menu-entry
          // reflects the latest error pattern.
          targetStr = buildFocusedPracticeText(state.aggregateErrors, state.drillRunId);
        } else if (activeDrill) {
          // Seeded on drillRunId — same text on "Drill again" retries,
          // different text when student re-enters the drill from the menu.
          targetStr = pickDrillSample(activeDrill, state.drillRunId, state.accommodations.sampleLength);
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
            keystrokeTimesRef.current = [];
            // Clear any stale note draft from a prior summary
            setNoteDraft('');
            setNoteSaved(false);
            // Kick off sight-read countdown if accommodation is enabled.
            // Keystroke handler will reject input while sightReadLeft > 0.
            var sr = state.accommodations && state.accommodations.sightReadSeconds;
            setSightReadLeft(sr ? sr : 0);
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

        // ── Sight-read countdown tick: count down by 1 each second until 0 ──
        useEffect(function() {
          if (state.view !== 'drill' || sightReadLeft <= 0 || drillComplete) return;
          var iv = setInterval(function() {
            setSightReadLeft(function(prev) { return prev > 1 ? prev - 1 : 0; });
          }, 1000);
          return function() { clearInterval(iv); };
        }, [state.view, sightReadLeft, drillComplete]);

        // ── Handle drill completion: save session, update best, route to summary ──
        useEffect(function() {
          if (!drillComplete || !startTime) return;
          if (completionSavedRef.current) return;
          completionSavedRef.current = true;
          var endMs = Date.now();

          // Warmup mode: skip all persistence. Show summary with a notice
          // that nothing was saved, then route back to menu.
          if (isWarmup) {
            var wmPausedTotal = pausedMs + (pauseStartedAt ? (endMs - pauseStartedAt) : 0);
            var wmActiveMs = Math.max(endMs - startTime - wmPausedTotal, 1000);
            var wmMinutes = wmActiveMs / 60000;
            var wmWpm = Math.round((typed.length / 5) / wmMinutes);
            var wmTotalKs = typed.length + errorCount;
            var wmAcc = wmTotalKs > 0 ? Math.round((typed.length / wmTotalKs) * 100) : 100;
            setLastSummary({
              drillId: activeDrill.id,
              drillName: activeDrill.name,
              wpm: wmWpm,
              accuracy: wmAcc,
              durationSec: Math.round(wmActiveMs / 1000),
              errors: errorCount,
              charCount: typed.length,
              date: new Date().toISOString(),
              isWarmup: true,
              accommodationsUsed: []
            });
            upd('view', 'summary');
            return;
          }


          // Subtract any accumulated paused time so breaks don't tank WPM.
          // If the student is currently paused (unusual at completion), include
          // that final pause-so-far too.
          var pausedTotal = pausedMs + (pauseStartedAt ? (endMs - pauseStartedAt) : 0);
          var activeMs = Math.max(endMs - startTime - pausedTotal, 1000); // 1s minimum
          var minutes = activeMs / 60000;
          var wpm = Math.round((typed.length / 5) / minutes);
          var totalKeystrokes = typed.length + errorCount;
          var accuracy = totalKeystrokes > 0 ? Math.round((typed.length / totalKeystrokes) * 100) : 100;
          // Compute 10-second-bucket pace (chars-per-10s) for intra-session
          // visualization. Keeps only the bucket counts; ms offsets aren't
          // serialized to save storage for long-term students.
          var BUCKET_MS = 10000;
          var numBuckets = Math.max(1, Math.ceil(activeMs / BUCKET_MS));
          var paceBuckets = new Array(numBuckets).fill(0);
          keystrokeTimesRef.current.forEach(function(tMs) {
            var idx = Math.min(numBuckets - 1, Math.floor(tMs / BUCKET_MS));
            paceBuckets[idx]++;
          });

          var summary = {
            drillId: activeDrill.id,
            drillName: activeDrill.name,
            wpm: wpm,
            accuracy: accuracy,
            durationSec: Math.round(activeMs / 1000),  // active time excludes paused breaks
            pausedSec: Math.round(pausedTotal / 1000),
            errors: errorCount,
            errorChars: errorChars,  // per-char error map: { 'a': 2, 'd': 1, ... }
            paceBuckets: paceBuckets, // chars typed per 10-second bucket
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

          // ── IEP goal met tracking ──
          // When both WPM and accuracy thresholds from the clinician-set IEP
          // goal are met, flag the session. Also tag whether this is the
          // FIRST time the student has ever met the goal — dignified milestone.
          if (state.iepGoal && state.iepGoal.targetWpm && state.iepGoal.targetAccuracy) {
            var metNow = wpm >= state.iepGoal.targetWpm && accuracy >= state.iepGoal.targetAccuracy;
            if (metNow) {
              summary.goalMet = true;
              // First-ever goal-met across all sessions?
              var anyPriorMet = (state.sessions || []).some(function(s) { return s.goalMet; });
              summary.firstGoalMet = !anyPriorMet;
            }
          }

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

          // ── Milestone earning — scan MILESTONES predicates, append newly-earned ──
          // Stored as { id, date } objects so the achievement log can show when
          // each was earned. Backward-compatible with the old string-only format
          // via normalizeMilestonesEarned() at read time.
          var uniqueDays = {};
          sessions.forEach(function(s) { uniqueDays[new Date(s.date).toLocaleDateString()] = true; });
          var udCount = Object.keys(uniqueDays).length;
          var earnedList = normalizeMilestonesEarned(state.milestonesEarned);
          var earnedIds = earnedList.map(function(e) { return e.id; });
          var newMilestones = [];
          MILESTONES.forEach(function(m) {
            if (earnedIds.indexOf(m.id) === -1 && m.check(lifetime, udCount)) {
              newMilestones.push(m);
              earnedList.push({ id: m.id, date: summary.date });
            }
          });
          if (newMilestones.length > 0) {
            nextUpdates.milestonesEarned = earnedList;
            summary.newMilestones = newMilestones.map(function(m) { return m.label; });
          }

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

          var _tm = state.theme || 'default';
          if (newMilestones.length > 0) {
            var _mLabels = newMilestones.map(function(m) { return m.label; }).join(' · ');
            var _mToast;
            if (_tm === 'steampunk')      _mToast = '⚙ Achievement inscribed: ' + _mLabels;
            else if (_tm === 'cyberpunk') _mToast = '[MILESTONE ACQUIRED] ' + _mLabels;
            else if (_tm === 'kawaii')    _mToast = '🎉✨ New milestone unlocked! ' + _mLabels + ' 💕';
            else if (_tm === 'neutral')   _mToast = 'Milestone earned: ' + _mLabels;
            else                          _mToast = '🎉 Milestone: ' + _mLabels;
            addToast(_mToast);
          }
          if (masteryAdvanced) {
            var _drillName = DRILLS[activeDrill.id].name;
            var _masteryToast;
            if (_tm === 'steampunk')      _masteryToast = '⚙ Tier mastered: ' + _drillName + '. The next workbench awaits.';
            else if (_tm === 'cyberpunk') _masteryToast = '[TIER CLEARED] ' + _drillName.toUpperCase() + ' :: next node unlocked';
            else if (_tm === 'kawaii')    _masteryToast = '🌟✨ Yay! ' + _drillName + ' tier cleared — so proud! 💖';
            else if (_tm === 'neutral')   _masteryToast = 'Mastery tier advanced: ' + _drillName + '.';
            else                          _masteryToast = '🌟 Mastery tier advanced! ' + _drillName + ' cleared.';
            addToast(_masteryToast);
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
            // If the student had actually started typing (startTime set) AND
            // hadn't completed, count this as an abandonment. Diagnostic for
            // drills that are too hard or sessions that were set up wrong.
            // Fire-and-forget — does not block or prompt the student.
            if (startTime !== null && !drillComplete && !isWarmup) {
              var lt = state.lifetime || {};
              upd('lifetime', Object.assign({}, lt, { abandonments: (lt.abandonments || 0) + 1 }));
            }
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

          // Sight-read count-in: swallow keystrokes until countdown ends.
          // Escape still works (handled above) so student can abort.
          if (sightReadLeft > 0) { e.preventDefault(); return; }

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
            // Record timestamp relative to start for pace-graph computation.
            // Push via ref to avoid per-keystroke re-renders from state updates.
            if (startTime !== null) keystrokeTimesRef.current.push(Date.now() - startTime);
            else keystrokeTimesRef.current.push(0);
            if (state.accommodations.audioCues) audioCorrect(state.audioTheme);
            // Speak-words accommodation: when student completes a word (types
            // a space), speak the just-completed word. Rate-limited by space
            // presses so TTS doesn't spam on rapid typing.
            if (state.accommodations.speakWordsOnSpace && key === ' ' && ctx.callTTS) {
              // Walk backwards from the just-typed position to find the word
              var endIdx = typed.length;        // index after inserting new char
              var startIdx = endIdx - 1;        // position of the new space
              while (startIdx > 0 && typed[startIdx - 1] !== ' ') startIdx--;
              var word = typed.slice(startIdx, endIdx).trim();
              if (word && word.length >= 2) {
                try { ctx.callTTS(word, null, 1.1, { force: false }).catch(function() {}); }
                catch (e) { /* ignore */ }
              }
            }
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
        }, [state.view, drillComplete, targetStr, typed, startTime, errorCount, errorChars, state.accommodations.errorTolerant, state.accommodations.audioCues, state.accommodations.speakWordsOnSpace, state.audioTheme, paused, sightReadLeft]);

        // ── Session mutation helper — used by retrospective editing from
        // the history-timeline detail panel. Finds a session by its unique
        // `date` ISO string and updates one field in-place.
        var updateSessionField = function(sessionDate, field, value) {
          var sessions = (state.sessions || []).slice();
          for (var i = sessions.length - 1; i >= 0; i--) {
            if (sessions[i].date === sessionDate) {
              var updated = Object.assign({}, sessions[i]);
              if (value === null || value === undefined || value === '') delete updated[field];
              else updated[field] = value;
              sessions[i] = updated;
              upd('sessions', sessions);
              return;
            }
          }
        };

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
          // Custom drill: route to custom-setup for authoring text. If already
          // saved, setup offers "drill this" vs "edit" options.
          if (drill.requiresCustom) {
            updMulti({ view: 'custom-setup', currentDrill: drillId });
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
            // Header — theme-flavored title decoration. Same core text
            // ('Typing Practice') but theme-specific ornamental framing
            // around it. Keeps the identity while letting the theme speak.
            h('div', { style: { marginBottom: '24px' } },
              (function() {
                var tm = state.theme || 'default';
                var core = h('span', { style: { color: palette.text } }, ' Typing Practice ');
                var titleStyle = {
                  margin: '0 0 6px 0',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: palette.text,
                  letterSpacing: '-0.01em'
                };
                if (tm === 'cyberpunk') {
                  // [ NEON BRACKETS ]
                  return h('h2', { style: Object.assign({}, titleStyle, { letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '20px' }) },
                    h('span', { style: { color: palette.accent, fontWeight: 700 } }, '[ '),
                    '⌨ TYPING_PRACTICE',
                    h('span', { style: { color: palette.accent, fontWeight: 700 } }, ' ]')
                  );
                }
                if (tm === 'steampunk') {
                  // ornamental flourishes on either side
                  return h('h2', { style: titleStyle },
                    h('span', { style: { color: palette.accent, fontSize: '18px', marginRight: '6px' } }, '❦ ⚙'),
                    '⌨  Typing Practice',
                    h('span', { style: { color: palette.accent, fontSize: '18px', marginLeft: '6px' } }, '⚙ ❦')
                  );
                }
                if (tm === 'kawaii') {
                  // sparkles + heart (feel like a stickered badge)
                  return h('h2', { style: Object.assign({}, titleStyle, { fontSize: '26px' }) },
                    h('span', { style: { color: palette.accent, fontSize: '22px' } }, '✨ '),
                    '⌨️  Typing Practice',
                    h('span', { style: { color: palette.accent, fontSize: '22px' } }, ' ✨')
                  );
                }
                if (tm === 'neutral') {
                  // minimal — no decoration, just tighter tracking
                  return h('h2', { style: Object.assign({}, titleStyle, { fontWeight: 500 }) }, 'Typing Practice');
                }
                return h('h2', { style: titleStyle }, '⌨️  Typing Practice');
              })(),
              h('p', {
                style: {
                  margin: 0,
                  fontSize: '13px',
                  color: palette.textMute,
                  lineHeight: '1.5',
                  maxWidth: '640px'
                }
              }, (function() {
                var tm = state.theme || 'default';
                if (tm === 'steampunk') return 'A workshop for learners with dysgraphia, dyslexia, ADHD, motor-planning differences, and low vision. Set your own cadence — no hourglass, no ranks, no punishment for missed days.';
                if (tm === 'cyberpunk') return '[BUILT FOR] dysgraphia :: dyslexia :: ADHD :: motor-planning :: low-vision. [OFF] timers :: leaderboards :: streak-punish :: ads. user-pace :: always.';
                if (tm === 'kawaii')    return 'Made with love for learners with dysgraphia, dyslexia, ADHD, motor-planning differences, and low vision. 💕 Go at YOUR pace — no timers, no rankings, no streak guilt. Just you, being you. ✨';
                if (tm === 'neutral')   return 'For learners with dysgraphia, dyslexia, ADHD, motor-planning differences, low vision. Self-paced. No timers, rankings, or streak penalties.';
                return 'Built for learners with dysgraphia, dyslexia, ADHD, motor-planning differences, and low vision. Go at your own pace — there are no timers, leaderboards, or streak punishments here.';
              })())
            ),

            // Personalized greeting — reads the time of day, any absence gap,
            // and the student's first name (if set). Small but real engagement
            // lift: arriving at the tool and being acknowledged by name +
            // context is a different experience from a cold menu.
            (function() {
              var hr = new Date().getHours();
              var firstName = state.studentName ? state.studentName.split(' ')[0] : null;
              var allSessions = state.sessions || [];
              var daysSinceLast = null;
              if (allSessions.length > 0) {
                var lastMs = new Date(allSessions[allSessions.length - 1].date).getTime();
                daysSinceLast = Math.round((Date.now() - lastMs) / (24 * 60 * 60 * 1000));
              }
              // Theme-voiced greeting + context line. Same underlying facts
              // (time of day, recency); different register per theme. Names
              // get appended in the theme's punctuation style.
              var theme = state.theme || 'default';
              var timeOfDay, contextLine;
              if (theme === 'cyberpunk') {
                timeOfDay = hr < 5 ? '[SYSTEM] night-shift'
                          : hr < 12 ? '[SYSTEM] morning'
                          : hr < 17 ? '[SYSTEM] afternoon'
                          : hr < 22 ? '[SYSTEM] evening'
                          : '[SYSTEM] late';
                contextLine = daysSinceLast === null ? '// session.count = 0 :: ready to initialize'
                            : daysSinceLast >= 7   ? '// absent ' + daysSinceLast + 'd :: rejoining network'
                            : daysSinceLast >= 2   ? '// last.session = T-' + daysSinceLast + 'd'
                            :                        '// system nominal :: awaiting input';
              } else if (theme === 'steampunk') {
                timeOfDay = hr < 5 ? 'Burning the midnight oil'
                          : hr < 12 ? 'Good morrow'
                          : hr < 17 ? 'Good day'
                          : hr < 22 ? 'Good evening'
                          : 'Burning the midnight oil';
                contextLine = daysSinceLast === null ? 'Ready to begin your apprenticeship?'
                            : daysSinceLast >= 7   ? 'Welcome back to the workshop — ' + daysSinceLast + ' days hence.'
                            : daysSinceLast >= 2   ? '' + daysSinceLast + ' days since your last entry in the ledger.'
                            :                        'Shall we resume?';
              } else if (theme === 'kawaii') {
                timeOfDay = hr < 5 ? '🌙 Working late'
                          : hr < 12 ? '☀️ Good morning'
                          : hr < 17 ? '🌸 Good afternoon'
                          : hr < 22 ? '✨ Good evening'
                          : '🌙 Working late';
                contextLine = daysSinceLast === null ? 'Let\'s start your very first session! 💕'
                            : daysSinceLast >= 7   ? 'You\'re BACK! We missed you 💕 (' + daysSinceLast + ' days)'
                            : daysSinceLast >= 2   ? 'Hi again! ' + daysSinceLast + ' days since last time ✨'
                            :                        'Ready to practice? 🌱';
              } else if (theme === 'neutral') {
                timeOfDay = hr < 12 ? 'Morning'
                          : hr < 17 ? 'Afternoon'
                          : hr < 22 ? 'Evening'
                          : 'Late hours';
                contextLine = daysSinceLast === null ? 'First session.'
                            : daysSinceLast >= 7   ? '' + daysSinceLast + ' days since last.'
                            : daysSinceLast >= 2   ? 'Last session ' + daysSinceLast + ' days ago.'
                            :                        'Continuing.';
              } else {
                // default
                timeOfDay = hr < 5 ? 'Working late'
                          : hr < 12 ? 'Good morning'
                          : hr < 17 ? 'Good afternoon'
                          : hr < 22 ? 'Good evening'
                          : 'Working late';
                contextLine = daysSinceLast === null ? 'Ready to start your first session?'
                            : daysSinceLast >= 7   ? 'Welcome back — it\'s been ' + daysSinceLast + ' days. Glad you\'re here.'
                            : daysSinceLast >= 2   ? 'Welcome back — ' + daysSinceLast + ' days since your last session.'
                            :                        'Ready for today?';
              }
              return h('div', {
                style: {
                  marginBottom: state.motivationStatement ? '8px' : '16px',
                  fontSize: '14px',
                  color: palette.textDim,
                  lineHeight: '1.5'
                }
              },
                h('strong', { style: { color: palette.text } }, timeOfDay + (firstName ? ', ' + firstName : '') + '.'),
                ' ',
                h('span', { style: { color: palette.textMute } }, contextLine)
              );
            })(),

            // Motivation statement — student's own "why I'm practicing" shown on menu.
            // Renders as a personal anchor. Displays above recommendations so
            // the student sees their own purpose before any system nudge.
            state.motivationStatement ? h('div', {
              style: {
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'transparent',
                borderLeft: '3px solid ' + palette.success,
                fontSize: '13px',
                color: palette.textDim,
                fontStyle: 'italic',
                lineHeight: '1.5'
              }
            }, '"' + state.motivationStatement + '"') : null,

            // Daily goal prompt — gentle nudge to set a goal for today when
            // one isn't set (or yesterday's has expired). Only shows AFTER
            // the student has at least one session recorded (first-timers see
            // the welcome card instead). One-click chips for common session
            // counts; "Custom" jumps to Settings for the full form.
            (function() {
              var todayStr = new Date().toLocaleDateString();
              var dg = state.dailyGoal;
              var dgIsForToday = dg && dg.date && new Date(dg.date).toLocaleDateString() === todayStr;
              if (dgIsForToday) return null;
              if (sessionCount === 0) return null;
              return h('div', {
                style: {
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: '1px dashed ' + palette.border,
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                  color: palette.textDim
                }
              },
                h('span', null, '☀️ Set a goal for today?'),
                [1, 3, 5].map(function(n) {
                  return h('button', {
                    key: 'dgp-' + n,
                    onClick: function() {
                      upd('dailyGoal', { targetSessions: n, targetWpm: null, date: new Date().toISOString() });
                      addToast('Daily goal set · ' + n + ' session' + (n === 1 ? '' : 's') + '.');
                    },
                    style: {
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid ' + palette.border,
                      background: 'transparent',
                      color: palette.textDim,
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, n + ' session' + (n === 1 ? '' : 's'));
                }),
                h('button', {
                  onClick: function() { go('settings'); },
                  style: {
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid ' + palette.border,
                    background: 'transparent',
                    color: palette.textDim,
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }
                }, 'Custom…'),
                h('span', {
                  style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', marginLeft: 'auto' }
                }, 'Or skip — no pressure.')
              );
            })(),

            // Daily goal banner — today-only micro-target; expires at midnight.
            (function() {
              var dg = state.dailyGoal;
              if (!dg) return null;
              // Expire if set for a different calendar day
              var today = new Date().toLocaleDateString();
              var dgDate = dg.date ? new Date(dg.date).toLocaleDateString() : null;
              if (dgDate && dgDate !== today) return null;
              // Count today's sessions toward the target
              var todaySessions = (state.sessions || []).filter(function(s) {
                return new Date(s.date).toLocaleDateString() === today;
              });
              var progress = todaySessions.length;
              var target = dg.targetSessions || 1;
              var bestTodayWpm = todaySessions.reduce(function(m, s) { return Math.max(m, s.wpm || 0); }, 0);
              var met = progress >= target && (!dg.targetWpm || bestTodayWpm >= dg.targetWpm);
              return h('div', {
                style: {
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderLeft: '3px solid ' + (met ? palette.success : palette.accent),
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: palette.textDim
                }
              },
                h('span', { style: { color: met ? palette.success : palette.accent, fontWeight: 700 } },
                  met ? '✓ Daily goal met: ' : '☀️ Today\'s goal: '),
                target + ' session' + (target === 1 ? '' : 's') +
                (dg.targetWpm ? ' @ ' + dg.targetWpm + '+ WPM' : '') +
                ' · progress ' + progress + '/' + target
              );
            })(),

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

            // Week-at-a-glance card — 7-day rollup on menu. Sits above the
            // 30-day stats strip so students see recent activity first and
            // clinicians get a quick "how's this week going" read without
            // opening Progress & Goals.
            sessionCount > 0 ? (function() {
              var sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              var thisWeek = (state.sessions || []).filter(function(s) {
                return new Date(s.date).getTime() >= sevenDaysAgo;
              });
              if (thisWeek.length === 0) return null;
              var weekDays = {};
              thisWeek.forEach(function(s) { weekDays[new Date(s.date).toLocaleDateString()] = true; });
              var weekBestWpm = thisWeek.reduce(function(m, s) { return Math.max(m, s.wpm || 0); }, 0);
              var weekAvgAcc = Math.round(
                thisWeek.reduce(function(a, s) { return a + (s.accuracy || 0); }, 0) / thisWeek.length
              );
              return h('div', {
                style: {
                  marginBottom: '16px',
                  padding: '12px 16px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  display: 'flex',
                  gap: '18px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  fontVariantNumeric: 'tabular-nums'
                }
              },
                h('span', {
                  style: {
                    fontSize: '11px',
                    color: palette.textMute,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700
                  }
                }, '📅 This week'),
                h('span', { style: { fontSize: '12px', color: palette.textDim } },
                  h('strong', { style: { color: palette.text } }, thisWeek.length),
                  ' session', thisWeek.length === 1 ? '' : 's'
                ),
                h('span', { style: { fontSize: '12px', color: palette.textDim } },
                  h('strong', { style: { color: palette.text } }, Object.keys(weekDays).length),
                  ' day', Object.keys(weekDays).length === 1 ? '' : 's', ' practiced'
                ),
                h('span', { style: { fontSize: '12px', color: palette.textDim } },
                  'best ', h('strong', { style: { color: palette.success } }, weekBestWpm + ' WPM')
                ),
                h('span', { style: { fontSize: '12px', color: palette.textDim } },
                  'avg ', h('strong', { style: { color: palette.text } }, weekAvgAcc + '% acc')
                )
              );
            })() : null,

            // Quick stats strip (only if student has activity)
            sessionCount > 0 ? (function() {
              // Gentle practice-day count: unique CALENDAR DAYS in the last 30 with
              // at least one session. No guilt framing — missed days aren't surfaced,
              // only days practiced. "X days of practice" not "X/30 days".
              var now = Date.now();
              var thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
              var uniqueDays = {};
              (state.sessions || []).forEach(function(s) {
                var t = new Date(s.date).getTime();
                if (t >= thirtyDaysAgo) {
                  var dayKey = new Date(s.date).toLocaleDateString();
                  uniqueDays[dayKey] = true;
                }
              });
              var practiceDays = Object.keys(uniqueDays).length;

              return h('div', {
                style: {
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }
              },
                h('div', { style: statCardStyle(palette, state.theme) },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Sessions'),
                  h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.accent } }, sessionCount)
                ),
                h('div', { style: statCardStyle(palette, state.theme) },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Mastery Tier'),
                  h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.success } }, state.masteryLevel + ' / 7')
                ),
                // Positive-framing practice-days counter — "days you showed up"
                practiceDays > 0 ? h('div', { style: statCardStyle(palette, state.theme), title: 'Unique calendar days with at least one session in the last 30 days. No guilt for days off.' },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Practice days · 30d'),
                  h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.textDim } },
                    '🗓 ' + practiceDays
                  )
                ) : null,
                badgeCount > 0 ? h('div', { style: statCardStyle(palette, state.theme) },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Badges'),
                  h('div', { style: { fontSize: '22px', fontWeight: 700, color: palette.warn } }, badgeCount)
                ) : null
              );
            })() : null,

            // Drill of the day — deterministic daily rotation through unlocked
            // structured drills. Gives the student a 'there's something fresh
            // to try today' nudge without forcing it. Same pick for all visits
            // on the same day; rotates at midnight.
            (function() {
              // Build list of unlocked + structured drills the student CAN do.
              // Exclude passage (needs AI) and custom (needs setup) — we want
              // a drill the student can one-click-start.
              var todayStr = new Date().toLocaleDateString();
              var pool = TIER_ORDER.filter(function(id) {
                var d = DRILLS[id];
                if (!d) return false;
                if (id === 'passage') return false;
                if (d.locked && state.masteryLevel < d.tier) return false;
                return true;
              });
              if (pool.length === 0) return null;
              // Seed on calendar day: MM-DD-YYYY collapsed to integer
              var t = new Date();
              var seed = t.getFullYear() * 372 + (t.getMonth() + 1) * 31 + t.getDate();
              var pick = pool[seed % pool.length];
              var drill = DRILLS[pick];
              if (!drill) return null;
              // Don't show if this is the same drill the Continue card is already showing
              // (the Continue card appears separately below, no need to double-surface).
              var sessionsToday = (state.sessions || []).filter(function(s) {
                return new Date(s.date).toLocaleDateString() === todayStr && s.drillId === pick;
              });
              // Show different flavor if they've already done it today
              var done = sessionsToday.length > 0;
              return h('div', {
                role: 'region',
                'aria-label': 'Drill of the day',
                style: {
                  marginBottom: '16px',
                  padding: '14px 16px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderLeft: '3px solid ' + palette.warn,
                  borderRadius: '10px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }
              },
                h('span', { style: { fontSize: '28px', flexShrink: 0 } }, drill.icon),
                h('div', { style: { flex: '1 1 220px', minWidth: 0 } },
                  h('div', { style: { fontSize: '11px', color: palette.warn, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '2px' } },
                    done ? '🌟 Today\'s drill · done!' : '🌟 Drill of the day'),
                  h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, lineHeight: '1.3' } }, drill.name),
                  h('div', { style: { fontSize: '11px', color: palette.textMute, marginTop: '2px', lineHeight: '1.4' } },
                    done ? 'You already did this drill today. Try it again or pick another from the menu.' : drill.description)
                ),
                h('button', {
                  onClick: function() { startDrill(drill.id); },
                  style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '12px', padding: '8px 16px' })
                }, done ? '↻ Retry' : '▶ Start')
              );
            })(),

            // Quick-resume card — surfaces the last drill the student did so
            // they can re-enter with one click instead of hunting on the grid.
            (function() {
              var all = state.sessions || [];
              if (all.length === 0) return null;
              var last = all[all.length - 1];
              var lastDrill = DRILLS[last.drillId];
              if (!lastDrill) return null;
              // Skip resume card if it's a locked drill (can happen after
              // discarding a session that caused mastery advancement)
              var unlocked = !lastDrill.locked || state.masteryLevel >= lastDrill.tier;
              if (!unlocked) return null;
              var ageMins = Math.round((Date.now() - new Date(last.date).getTime()) / 60000);
              var ageLabel = ageMins < 1 ? 'moments ago'
                          : ageMins < 60 ? ageMins + ' min ago'
                          : ageMins < 1440 ? Math.round(ageMins / 60) + ' hr ago'
                          : Math.round(ageMins / 1440) + ' day' + (ageMins >= 2880 ? 's' : '') + ' ago';
              var resumeLabel = last.drillId === 'passage' && state.aiPassage
                ? state.aiPassage.topic ? 'Passage · ' + state.aiPassage.topic : 'Personalized passage'
                : last.drillId === 'custom' && state.activeCustomDrillId
                ? (function() {
                    var lib = state.customDrillLibrary || [];
                    var entry = lib.filter(function(e) { return e.id === state.activeCustomDrillId; })[0];
                    return entry && entry.label ? entry.label : 'Custom drill';
                  })()
                : lastDrill.name;
              return h('div', {
                role: 'region',
                'aria-label': 'Quick resume',
                style: {
                  marginBottom: '16px',
                  padding: '14px 16px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }
              },
                h('span', { style: { fontSize: '28px', flexShrink: 0 } }, lastDrill.icon),
                h('div', { style: { flex: '1 1 220px', minWidth: 0 } },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '2px' } }, 'Last session · ' + ageLabel),
                  h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, lineHeight: '1.3' } }, resumeLabel),
                  h('div', { style: { fontSize: '11px', color: palette.textMute, marginTop: '2px', fontVariantNumeric: 'tabular-nums' } },
                    last.wpm + ' WPM · ' + last.accuracy + '% acc')
                ),
                h('button', {
                  onClick: function() { startDrill(last.drillId); },
                  style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '12px', padding: '8px 16px' })
                }, '▶ Continue')
              );
            })(),

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
              (function() {
                // Theme-flavored section header with ornamental divider.
                var tm = state.theme || 'default';
                var baseStyle = {
                  fontSize: '11px',
                  color: palette.textMute,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                };
                var lineStyle = {
                  flex: 1,
                  height: '1px',
                  background: palette.border
                };
                var prefix, label, suffix;
                if (tm === 'cyberpunk') {
                  prefix = h('span', { style: { color: palette.accent, fontFamily: 'ui-monospace, monospace' } }, '::');
                  label = 'drills.available';
                  suffix = h('span', { style: Object.assign({}, lineStyle, { background: palette.accent, opacity: 0.5 }) });
                } else if (tm === 'steampunk') {
                  prefix = h('span', { style: { color: palette.accent, fontSize: '13px' } }, '⚙');
                  label = 'Choose Thy Drill';
                  suffix = h('span', { style: { color: palette.accent, fontSize: '13px' } }, '❦');
                } else if (tm === 'kawaii') {
                  prefix = h('span', { style: { color: palette.accent } }, '✿');
                  label = 'pick a drill';
                  suffix = h('span', { style: { color: palette.accent } }, '✿');
                } else if (tm === 'neutral') {
                  prefix = null;
                  label = 'drills';
                  suffix = null;
                } else {
                  prefix = null;
                  label = 'Choose a drill';
                  suffix = null;
                }
                return h('div', { style: baseStyle },
                  prefix,
                  h('span', null, label),
                  suffix || h('span', { style: lineStyle })
                );
              })(),
              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px'
                }
              },
                (function() {
                  var favoriteIds = state.favoriteDrills || [];
                  return Object.keys(DRILLS).filter(function(drillId) {
                    // Hide focus-errors until the student has error data — it'd
                    // be an empty drill otherwise.
                    if (drillId === 'focus-errors') {
                      var agg = state.aggregateErrors || {};
                      return Object.keys(agg).some(function(k) { return agg[k] > 0; });
                    }
                    return true;
                  }).sort(function(aId, bId) {
                    // Favorites first, preserving favorite-order; then default.
                    var aFav = favoriteIds.indexOf(aId);
                    var bFav = favoriteIds.indexOf(bId);
                    if (aFav !== -1 && bFav === -1) return -1;
                    if (aFav === -1 && bFav !== -1) return 1;
                    if (aFav !== -1 && bFav !== -1) return aFav - bFav;
                    return 0;
                  });
                })().map(function(drillId) {
                  var drill = DRILLS[drillId];
                  var unlocked = !drill.locked || state.masteryLevel >= drill.tier;
                  var isFavorite = (state.favoriteDrills || []).indexOf(drillId) !== -1;
                  var toggleFavorite = function(e) {
                    e.stopPropagation();
                    var favs = (state.favoriteDrills || []).slice();
                    var idx = favs.indexOf(drillId);
                    if (idx === -1) favs.unshift(drillId);
                    else favs.splice(idx, 1);
                    upd('favoriteDrills', favs);
                  };
                  // Compute the "needed-to-unlock" hint: which previous drill to clear
                  var unlockHint = null;
                  if (!unlocked) {
                    for (var ti = 0; ti < TIER_ORDER.length; ti++) {
                      var prevId = TIER_ORDER[ti];
                      var prevDrill = DRILLS[prevId];
                      if (prevDrill && prevDrill.tier === state.masteryLevel) {
                        unlockHint = 'Clear ' + prevDrill.name + ' first (' + prevDrill.masteryWpm + ' WPM @ ' + prevDrill.masteryAcc + '%)';
                        break;
                      }
                    }
                  }
                  // Inline per-drill stats for unlocked drills: best WPM + session count
                  var stats = null;
                  if (unlocked) {
                    var drillSessions = (state.sessions || []).filter(function(s) { return s.drillId === drillId; });
                    var pb = (state.personalBest || {})[drillId];
                    if (drillSessions.length > 0 || pb) {
                      stats = {
                        sessionCount: drillSessions.length,
                        bestWpm: pb ? pb.wpm : null,
                        bestAcc: pb ? pb.accuracy : null,
                        lastDate: drillSessions.length > 0 ? drillSessions[drillSessions.length - 1].date : null
                      };
                    }
                  }
                  // Preview snippet — first ~40 chars of the sample the student
                  // would see next (using current drillRunId + length pref) so
                  // they can see what they'd be typing before clicking.
                  // Only for structured drills; passage/custom show their own UI.
                  var preview = null;
                  if (unlocked && drill.samples && drill.samples.length > 0) {
                    var nextText = pickDrillSample(drill, state.drillRunId, state.accommodations.sampleLength);
                    if (nextText) {
                      preview = nextText.length > 42 ? nextText.slice(0, 42) + '…' : nextText;
                    }
                  } else if (unlocked && drillId === 'focus-errors') {
                    // Dynamic preview for the auto-generated focused-practice drill
                    var focusText = buildFocusedPracticeText(state.aggregateErrors, state.drillRunId);
                    if (focusText) preview = focusText.length > 42 ? focusText.slice(0, 42) + '…' : focusText;
                  }
                  return renderDrillCard(drill, unlocked, palette, startDrill, unlockHint, stats, preview, isFavorite, toggleFavorite);
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
              renderNavButton('🏅 Achievements', function() { go('achievements'); }, palette, false),
              renderNavButton('? Shortcuts', function() { go('shortcuts'); }, palette, false),
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
        // VIEW: CUSTOM-SETUP — author your own drill text (spelling list,
        // IEP-goal words, science vocab, etc.). Single-slot. Not scored for
        // mastery. Useful for clinicians adapting the tool to curriculum.
        // ═════════════════════════════════════════════════════
        function renderCustomSetup() {
          var library = state.customDrillLibrary || [];
          var draftTrimmed = (customTextDraft || '').trim();
          var isValidDraft = draftTrimmed.length >= 5 && draftTrimmed.length <= 500;
          var atCapacity = library.length >= MAX_CUSTOM_LIBRARY;

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
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } },
              (function() {
                var tm = state.theme || 'default';
                var counter = ' · ' + library.length + '/' + MAX_CUSTOM_LIBRARY;
                if (tm === 'steampunk') return '⚙  Custom drills' + counter;
                if (tm === 'cyberpunk') return '[CUSTOM DRILLS :: ' + library.length + '/' + MAX_CUSTOM_LIBRARY + ']';
                if (tm === 'kawaii')    return '📋💕 Custom drills' + counter;
                if (tm === 'neutral')   return 'Custom drills' + counter;
                return '📋  Custom drills' + counter;
              })()),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, (function() {
              var tm = state.theme || 'default';
              if (tm === 'steampunk') return 'Enter your own practice text — spelling ledgers, IEP sight words, verse, science lexicon — whatever the curriculum demands. Not judged against mastery; runs still enter the ledger.';
              if (tm === 'cyberpunk') return '[USER-TEXT] spelling :: IEP sight words :: sci-vocab :: verse :: any string → drill. [UNSCORED ON MASTERY] :: sessions still logged.';
              if (tm === 'kawaii')    return 'Your own words go here! 💕 Spelling lists, sight words, vocabulary, poems — anything you want to practice. ✨ Not graded for mastery, but sessions still get saved!';
              if (tm === 'neutral')   return 'User-authored practice text. Not mastery-scored; sessions recorded.';
              return 'Teacher- or student-authored practice text. Save spelling lists, IEP sight words, science vocabulary, poems — whatever your curriculum needs. Not scored for mastery; sessions still get recorded.';
            })()),

            // Saved library list
            library.length > 0 ? h('div', {
              role: 'list',
              style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }
            },
              library.map(function(entry) {
                var preview = entry.text.length > 80 ? entry.text.slice(0, 80) + '…' : entry.text;
                return h('div', {
                  key: 'cdlib-' + entry.id,
                  role: 'listitem',
                  style: {
                    padding: '12px 14px',
                    background: palette.surface,
                    border: '1px solid ' + palette.border,
                    borderRadius: '10px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }
                },
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: '12px', fontWeight: 700, color: palette.text, marginBottom: '4px' } },
                      entry.label || '(untitled)'),
                    h('div', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic', lineHeight: '1.5' } },
                      '"' + preview + '"'),
                    h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '4px' } },
                      'saved ' + new Date(entry.savedAt).toLocaleDateString() + ' · ' + entry.text.length + ' chars')
                  ),
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 } },
                    h('button', {
                      onClick: function() {
                        updMulti({
                          activeCustomDrillId: entry.id,
                          view: 'drill-intro',
                          currentDrill: 'custom',
                          drillRunId: (state.drillRunId || 0) + 1
                        });
                      },
                      style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '11px', padding: '5px 10px' })
                    }, 'Drill'),
                    h('button', {
                      onClick: function() {
                        setCustomTextDraft(entry.text);
                        setCustomLabelDraft(entry.label || '');
                        // Focus the editor by scrolling it into view — best-effort
                        setTimeout(function() {
                          var el = document.getElementById('tp-custom-text');
                          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          if (el && el.focus) el.focus();
                        }, 50);
                      },
                      style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '5px 10px' })
                    }, 'Edit'),
                    h('button', {
                      onClick: function() {
                        if (typeof window !== 'undefined' && window.confirm &&
                            !window.confirm('Remove "' + (entry.label || 'this custom drill') + '" from the library?')) return;
                        var filtered = library.filter(function(x) { return x.id !== entry.id; });
                        var updates = { customDrillLibrary: filtered };
                        if (state.activeCustomDrillId === entry.id) updates.activeCustomDrillId = null;
                        updMulti(updates);
                        addToast('Custom drill removed.');
                      },
                      'aria-label': 'Delete',
                      style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '5px 10px', color: palette.danger, borderColor: palette.border })
                    }, '🗑')
                  )
                );
              })
            ) : null,

            // New / edit form
            h('div', {
              style: {
                padding: '14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '10px'
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 700 } },
                customTextDraft || customLabelDraft ? '✏️ Draft' : '➕ Add a custom drill'),

              h('div', { style: { marginBottom: '12px' } },
                h('label', {
                  htmlFor: 'tp-custom-label',
                  style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                }, 'Label (optional)'),
                h('input', {
                  id: 'tp-custom-label',
                  type: 'text',
                  value: customLabelDraft,
                  onChange: function(e) { setCustomLabelDraft(e.target.value); },
                  placeholder: 'e.g., "Week 4 spelling list", "IEP sight words"',
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
                })
              ),

              h('div', { style: { marginBottom: '12px' } },
                h('label', {
                  htmlFor: 'tp-custom-text',
                  style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                }, 'Practice text  ', h('span', { style: { fontSize: '10px', color: palette.textMute, fontWeight: 400 } },
                  draftTrimmed.length + ' / 500 chars — minimum 5')),
                h('textarea', {
                  id: 'tp-custom-text',
                  value: customTextDraft,
                  onChange: function(e) { setCustomTextDraft(e.target.value); },
                  placeholder: 'Type or paste the text. Plain letters, numbers, and common punctuation work best.',
                  maxLength: 500,
                  rows: 5,
                  style: {
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    color: palette.text,
                    fontSize: '13px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }
                })
              ),

              (atCapacity && !isValidDraft) ? h('div', {
                style: { fontSize: '11px', color: palette.warn, marginBottom: '10px', fontStyle: 'italic' }
              }, 'Library is at capacity (' + MAX_CUSTOM_LIBRARY + '). Delete one above before adding another.') : null,

              h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                h('button', {
                  disabled: !isValidDraft || atCapacity,
                  onClick: function() {
                    var clean = (customTextDraft || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                    if (clean.length < 5) return;
                    var entry = {
                      id: 'cd' + Date.now(),
                      text: clean,
                      label: (customLabelDraft || '').trim(),
                      savedAt: new Date().toISOString()
                    };
                    // Dedupe by text — replace any entry with identical text
                    var filtered = library.filter(function(x) { return x.text !== entry.text; });
                    var nextLib = [entry].concat(filtered).slice(0, MAX_CUSTOM_LIBRARY);
                    updMulti({
                      customDrillLibrary: nextLib,
                      activeCustomDrillId: entry.id,
                      view: 'drill-intro',
                      currentDrill: 'custom',
                      drillRunId: (state.drillRunId || 0) + 1
                    });
                    setCustomTextDraft('');
                    setCustomLabelDraft('');
                  },
                  style: Object.assign({}, primaryBtnStyle(palette), {
                    opacity: (isValidDraft && !atCapacity) ? 1 : 0.5,
                    cursor: (isValidDraft && !atCapacity) ? 'pointer' : 'not-allowed'
                  })
                }, '💾 Save & drill'),

                (customTextDraft || customLabelDraft) ? h('button', {
                  onClick: function() {
                    setCustomTextDraft('');
                    setCustomLabelDraft('');
                  },
                  style: secondaryBtnStyle(palette)
                }, 'Clear draft') : null
              )
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

              // Pre-drill quick-toggles: high-frequency accommodations as
              // compact chips so clinicians / students can adjust without
              // round-tripping through the Accommodations page. Tapping a chip
              // toggles the underlying setting immediately. Header label is
              // theme-voiced; `onAccent` so Kawaii light theme stays legible.
              h('div', {
                style: {
                  marginBottom: '14px',
                  padding: '10px 12px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '8px'
                }
              },
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, textAlign: 'left' } },
                  (function() {
                    var tm = state.theme || 'default';
                    if (tm === 'steampunk') return '⚙ Workshop controls';
                    if (tm === 'cyberpunk') return '[QUICK CONFIG]';
                    if (tm === 'kawaii')    return '💕 Quick adjust';
                    if (tm === 'neutral')   return 'Quick adjust';
                    return 'Quick adjust';
                  })()),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } },
                  [
                    { key: 'dyslexiaFont',  label: '🔤 Font' },
                    { key: 'largeKeys',     label: '⌨️ Keyboard' },
                    { key: 'highContrast',  label: '🌓 Contrast' },
                    { key: 'audioCues',     label: '🔔 Audio' },
                    { key: 'errorTolerant', label: '🤝 Error-tolerant' },
                    { key: 'predictiveAssist', label: '🪄 Predict' }
                  ].map(function(opt) {
                    var isOn = !!acc[opt.key];
                    return h('button', {
                      key: 'qt-' + opt.key,
                      'aria-pressed': isOn ? 'true' : 'false',
                      onClick: function() {
                        var newAcc = Object.assign({}, acc);
                        newAcc[opt.key] = !acc[opt.key];
                        upd('accommodations', newAcc);
                      },
                      style: {
                        padding: '5px 10px',
                        borderRadius: '999px',
                        border: '1px solid ' + (isOn ? palette.accent : palette.border),
                        background: isOn ? palette.accent : 'transparent',
                        color: isOn ? (palette.onAccent || '#0f172a') : palette.textDim,
                        fontSize: '11px',
                        fontWeight: isOn ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }
                    }, opt.label);
                  })
                )
              ),

              // Warmup checkbox — "this one doesn't count"
              h('label', {
                htmlFor: 'tp-warmup',
                style: {
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: palette.textDim,
                  cursor: 'pointer',
                  userSelect: 'none'
                }
              },
                h('input', {
                  id: 'tp-warmup',
                  type: 'checkbox',
                  checked: isWarmup,
                  onChange: function(e) { setIsWarmup(e.target.checked); },
                  style: { cursor: 'pointer' }
                }),
                h('span', null,
                  h('strong', null, '🤸 Warmup mode'),
                  ' — this session won\'t be saved. No pressure, no record.'
                )
              ),

              // Active accommodations chip row (readonly summary) — theme-voiced
              activeAccLabels.length > 0 ? h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  marginBottom: '18px',
                  lineHeight: '1.6'
                }
              }, (function() {
                var tm = state.theme || 'default';
                if (tm === 'steampunk') return '⚙ Instruments engaged: ' + activeAccLabels.join(' · ');
                if (tm === 'cyberpunk') return '[LOADOUT] ' + activeAccLabels.join(' :: ');
                if (tm === 'kawaii')    return '🏅 Helpful friends on: ' + activeAccLabels.join(' · ') + ' 💕';
                if (tm === 'neutral')   return 'Active: ' + activeAccLabels.join(', ');
                return '🏅 On: ' + activeAccLabels.join(' · ');
              })()) : h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  marginBottom: '18px',
                  fontStyle: 'italic'
                }
              }, (function() {
                var tm = state.theme || 'default';
                if (tm === 'steampunk') return 'Additional workshop instruments await in Accommodations.';
                if (tm === 'cyberpunk') return '[INFO] extended mods available via Accommodations menu';
                if (tm === 'kawaii')    return '✨ Need more support? Peek at Accommodations from the menu! 💕';
                if (tm === 'neutral')   return 'More supports available in Accommodations.';
                return 'Tip: Visit Accommodations from the menu for more advanced supports.';
              })()),

              // Action row — Start (primary) + Listen (TTS) if available
              h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' } },
                h('button', {
                  ref: startBtnRef,
                  onClick: startNow,
                  style: Object.assign({}, primaryBtnStyle(palette), {
                    padding: '14px 32px',
                    fontSize: '16px'
                  })
                }, (function() {
                    // Theme-voiced Start button label. Kept short enough that
                    // layout doesn't shift between themes.
                    var tm = state.theme || 'default';
                    if (tm === 'cyberpunk') return '▶ ENGAGE';
                    if (tm === 'steampunk') return '⚙ Begin';
                    if (tm === 'kawaii')    return '✨ Let\'s go!';
                    if (tm === 'neutral')   return '▶ Start';
                    return '▶ Start drill';
                  })()),

                // "Listen first" — for students who benefit from hearing the
                // text before seeing/typing it. Uses ctx.callTTS if the hub
                // provides it; silently absent if not.
                (ctx.callTTS && preview) ? h('button', {
                  onClick: function() {
                    try {
                      ctx.callTTS(targetStr, null, 1.0, { force: true }).catch(function() { /* ignore */ });
                      addToast('🔊 Reading the passage aloud…');
                    } catch (e) { console.warn('[TypingPractice] TTS failed:', e); }
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    padding: '14px 20px',
                    fontSize: '14px'
                  })
                }, '🔊 Listen first') : null
              ),

              h('div', {
                style: { fontSize: '11px', color: palette.textMute, marginTop: '14px' }
              }, 'Or press Space or Enter to begin. Press Esc any time during the drill to exit.')
            )
          );
        }

        // ── Reset warmup flag when entering a new drill-intro (not on retries) ──
        useEffect(function() {
          if (state.view === 'drill-intro') setIsWarmup(false);
        // eslint-disable-next-line
        }, [state.view, state.currentDrill, state.drillRunId]);

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
          var language = draftLanguage || 'en';
          var complexityLine = GRADE_COMPLEXITY[grade] || GRADE_COMPLEXITY['2-3'];
          var langEntry = PASSAGE_LANGUAGES.filter(function(l) { return l.code === language; })[0]
                          || PASSAGE_LANGUAGES[0];

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
            'LANGUAGE: ' + langEntry.promptHint,
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
            (function() {
              var len = draftLength || 'medium';
              if (len === 'short') return '- Length: 20 to 35 words total. Count your words. Short and focused.';
              if (len === 'long')  return '- Length: 55 to 80 words total. Count your words. Fuller practice text — expect 3-4 sentences.';
              return '- Length: 35 to 55 words total. Count your words.';
            })(),
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
                id: 'p' + Date.now(),
                text: text,
                gradeLevel: grade,
                topic: topic,
                difficulty: difficulty,
                language: language,
                generatedAt: new Date().toISOString()
              };
              // Save into library — prepend newest, drop oldest past the cap.
              // Don't duplicate identical text (e.g., regenerating the same prompt).
              var existingLib = (state.aiPassageLibrary || []).slice();
              var dedup = existingLib.filter(function(p) { return p.text !== passage.text; });
              var nextLib = [passage].concat(dedup).slice(0, MAX_PASSAGE_LIBRARY);
              updMulti({
                aiPassage: passage,
                aiPassageLibrary: nextLib,
                passagePrefs: { gradeLevel: grade, topic: topic, difficulty: difficulty, language: language, length: draftLength || 'medium' },
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
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, (function() {
              var tm = state.theme || 'default';
              if (tm === 'steampunk') return '⚙  Bespoke Passage';
              if (tm === 'cyberpunk') return '[AI PASSAGE :: PERSONALIZED]';
              if (tm === 'kawaii')    return '✨💕 Personalized Passage 💕✨';
              if (tm === 'neutral')   return 'Personalized Passage';
              return '✨  Personalized Passage';
            })()),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, (function() {
              var tm = state.theme || 'default';
              if (tm === 'steampunk') return 'Have the workshop compose a passage in your grade and to your interests. Every draft is age-fitting and disability-aware.';
              if (tm === 'cyberpunk') return '[GEN] grade-pinned :: interest-weighted :: age-safe :: disability-aware by default';
              if (tm === 'kawaii')    return 'Let\'s make a passage just for you! 💕 At your grade level, about something you love. Always age-friendly and thoughtfully written. ✨';
              if (tm === 'neutral')   return 'Grade-pinned, interest-driven, age-appropriate, disability-aware.';
              return 'Generate a passage at your grade level about something you care about. Passages are always age-appropriate and disability-aware.';
            })()),

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
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, g);
                })
              )
            ),

            // Language picker — supports ELL students and bilingual homes.
            // Prompt notes request ASCII-only output (no accents) so keys
            // remain standard typing-practice targets.
            h('div', { style: { marginBottom: '18px' } },
              h('div', { style: { fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: palette.text } }, 'Language'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                PASSAGE_LANGUAGES.map(function(lang) {
                  var isActive = draftLanguage === lang.code;
                  return h('button', {
                    key: 'lang-' + lang.code,
                    onClick: function() { setDraftLanguage(lang.code); },
                    style: {
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, lang.label);
                })
              ),
              draftLanguage !== 'en' ? h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
                'Non-English passages use ASCII only (no accents / tildes) so standard keyboard keys remain the practice target.') : null
            ),

            // Within-grade difficulty picker — fine-tune the prompt beyond
            // the grade band. Keeps options few; on-level is the default.
            (function() {
              // Adaptive suggestion: look at recent passage-drill sessions and
              // quietly recommend a direction. Doesn't auto-apply — just hints
              // so the student/clinician stays in control.
              var passageSessions = (state.sessions || []).filter(function(s) { return s.drillId === 'passage'; });
              var recent = passageSessions.slice(-3);
              var suggestion = null;
              if (recent.length >= 2) {
                var avgAcc = recent.reduce(function(a, s) { return a + (s.accuracy || 0); }, 0) / recent.length;
                var avgWpm = recent.reduce(function(a, s) { return a + (s.wpm || 0); }, 0) / recent.length;
                if (avgAcc < 80)      suggestion = { to: 'easier',  reason: 'Recent accuracy has dipped below 80% — a lighter passage may rebuild confidence.' };
                else if (avgAcc >= 95 && avgWpm >= 18) suggestion = { to: 'stretch', reason: 'Recent accuracy ≥95% and WPM steady — you\'re ready for a gentle reach up.' };
              }
              return suggestion ? h('div', {
                style: {
                  marginBottom: '10px',
                  padding: '8px 12px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderLeft: '3px solid ' + palette.accent,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: palette.textDim,
                  lineHeight: '1.5'
                }
              },
                h('span', { style: { color: palette.accent, fontWeight: 700 } }, '💡 Adaptive suggestion: '),
                'try ',
                h('strong', null, suggestion.to === 'easier' ? '🌱 Easier' : '🌿 Stretch'),
                ' — ', suggestion.reason
              ) : null;
            })(),

            // Passage length preference — word-count range for the generated
            // passage. Complements the sample-length preference that affects
            // structured drills.
            h('div', { style: { marginBottom: '18px' } },
              h('div', { style: { fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: palette.text } }, 'Passage length'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                [
                  { id: 'short',  label: '✂️ Short',  hint: '20-35 words · quick focus' },
                  { id: 'medium', label: '📄 Medium', hint: '35-55 words · default' },
                  { id: 'long',   label: '📜 Long',   hint: '55-80 words · endurance' }
                ].map(function(opt) {
                  var isActive = draftLength === opt.id;
                  return h('button', {
                    key: 'plen-' + opt.id,
                    onClick: function() { setDraftLength(opt.id); },
                    title: opt.hint,
                    style: {
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, opt.label);
                })
              )
            ),

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
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
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
              }, genLoading
                  ? [
                      h('span', { key: 'ico', className: 'tp-loading-icon', 'aria-hidden': 'true', style: { marginRight: '6px' } },
                        (state.theme === 'steampunk') ? '⚙'
                        : (state.theme === 'cyberpunk') ? '▮'
                        : (state.theme === 'kawaii')    ? '💕'
                        : (state.theme === 'neutral')   ? '•'
                        : '✨'),
                      h('span', { key: 'lbl' }, getLoadingLabel(state.theme, 'passage'))
                    ]
                  : (cached ? 'Generate a NEW passage' : 'Generate my passage')),

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
            ) : null,

            // Saved passages library — reusable stash of previously generated
            // passages. Students/clinicians can drill against the same passage
            // over multiple sessions (fair comparison) or keep themed passages
            // for a curriculum unit.
            ((state.aiPassageLibrary || []).length > 1 && !genLoading) ? h('div', {
              style: {
                marginTop: '20px',
                padding: '14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '10px'
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 700 } },
                '📚 Saved passages · ' + state.aiPassageLibrary.length + '/' + MAX_PASSAGE_LIBRARY),
              h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                'Recently generated passages. Drill any of them to reuse. Oldest drops when you generate a 9th.'),
              h('div', {
                role: 'list',
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }
              },
                state.aiPassageLibrary.map(function(p) {
                  var langLabel = '';
                  if (p.language && p.language !== 'en') {
                    var lang = PASSAGE_LANGUAGES.filter(function(l) { return l.code === p.language; })[0];
                    langLabel = lang ? ' · ' + lang.label : '';
                  }
                  var isActive = state.aiPassage && state.aiPassage.id === p.id;
                  return h('div', {
                    key: 'lib-' + p.id,
                    role: 'listitem',
                    style: {
                      padding: '10px 12px',
                      background: palette.bg,
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      borderRadius: '8px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start'
                    }
                  },
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '4px' } },
                        'grade ' + p.gradeLevel + (p.topic ? ' · ' + p.topic : '') + langLabel +
                        (isActive ? ' · current' : '')),
                      h('div', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis' } },
                        '"' + (p.text.length > 100 ? p.text.slice(0, 100) + '…' : p.text) + '"')
                    ),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 } },
                      h('button', {
                        onClick: function() {
                          updMulti({
                            aiPassage: p,
                            view: 'drill',
                            currentDrill: 'passage',
                            drillRunId: (state.drillRunId || 0) + 1
                          });
                        },
                        style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '11px', padding: '5px 10px' })
                      }, 'Drill'),
                      h('button', {
                        onClick: function() {
                          if (typeof window !== 'undefined' && window.confirm &&
                              !window.confirm('Remove this passage from the library?')) return;
                          var filtered = (state.aiPassageLibrary || []).filter(function(x) { return x.id !== p.id; });
                          var updates = { aiPassageLibrary: filtered };
                          // If we're deleting the currently-active passage, clear it too
                          if (state.aiPassage && state.aiPassage.id === p.id) updates.aiPassage = null;
                          updMulti(updates);
                          addToast('Passage removed.');
                        },
                        'aria-label': 'Delete this passage',
                        style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '5px 10px', color: palette.danger, borderColor: palette.border })
                      }, '🗑')
                    )
                  );
                })
              )
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
            // tp-current-char class on the active character — theme CSS
            // hooks this for pulse/breathe animations (respecting
            // prefers-reduced-motion).
            chars.push(h('span', {
              key: 'c' + i,
              className: (charState === 'current' || charState === 'wrong-current') ? 'tp-current-char' : '',
              style: charStyle
            }, display));
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
              // Warmup chip — obvious visual indicator that this session won't save.
              isWarmup ? h('span', {
                'aria-label': 'Warmup mode — session will not be saved',
                style: {
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: palette.warn,
                  color: palette.onAccent,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }
              }, '🤸 warmup · not saving') : null,
              // Pause / Resume button. Disability-aware: paused time doesn't
              // count against WPM, and keystrokes are ignored while paused.
              startTime ? h('button', {
                onClick: togglePause,
                'aria-pressed': paused ? 'true' : 'false',
                style: {
                  background: paused ? palette.warn : 'transparent',
                  color: paused ? (palette.onAccent || '#0f172a') : palette.textDim,
                  border: '1px solid ' + (paused ? palette.warn : palette.border),
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: paused ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, paused ? '▶ Resume' : '⏸ Pause') : null,
              // Live metrics — HIDDEN in assessment mode so clock-watching
              // doesn't affect the baseline measurement. Still computed and
              // saved into the session record; just not shown until summary.
              state.accommodations.assessmentMode ? h('div', {
                style: {
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: palette.warn,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }
              }, '📊 Assessment · metrics hidden') : h('div', {
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

            // Sight-read count-in overlay: large number with "Reading…" label.
            // Keystroke handler is already blocking input while sightReadLeft > 0.
            sightReadLeft > 0 ? h('div', {
              role: 'status',
              'aria-live': 'polite',
              style: {
                marginBottom: '12px',
                padding: '12px 16px',
                background: palette.surface,
                border: '1px solid ' + palette.accent,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left'
              }
            },
              h('span', { style: { fontSize: '28px', fontWeight: 800, color: palette.accent, fontVariantNumeric: 'tabular-nums', minWidth: '36px', textAlign: 'center' } },
                sightReadLeft),
              h('div', null,
                h('div', { style: { fontSize: '13px', fontWeight: 600, color: palette.text } }, '📖 Reading time'),
                h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4' } },
                  'Take a moment to read through. Typing starts in ' + sightReadLeft + ' second' + (sightReadLeft === 1 ? '' : 's') + '.')
              ),
              h('button', {
                onClick: function() { setSightReadLeft(0); },
                style: Object.assign({}, secondaryBtnStyle(palette), {
                  marginLeft: 'auto', fontSize: '11px', padding: '6px 12px'
                })
              }, 'Skip')
            ) : null,

            // Paused overlay notice — theme-voiced copy + styling, still
            // aria-live='polite' so the pause state announces for screen
            // readers. Non-modal: student clicks Resume to continue.
            paused ? (function() {
              var tm = state.theme || 'default';
              var msg, extraStyle = {};
              if (tm === 'cyberpunk') {
                msg = '[PAUSE] :: input suspended :: click resume to rejoin stream';
                extraStyle = { fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em', borderRadius: '2px', borderLeft: '3px solid ' + palette.onAccent };
              } else if (tm === 'steampunk') {
                msg = '⏸ The gears are still, apprentice. Take your time — the ledger awaits your return.';
                extraStyle = { borderStyle: 'double', borderWidth: '3px', borderColor: palette.onAccent, borderRadius: '6px' };
              } else if (tm === 'kawaii') {
                msg = '💕 Break time! ✨ No rush, we\'ll wait for you 💕';
                extraStyle = { borderRadius: '18px', boxShadow: '0 3px 10px rgba(232,90,138,0.2)' };
              } else if (tm === 'neutral') {
                msg = 'Paused. WPM unaffected.';
                extraStyle = { borderRadius: '4px', fontWeight: 500 };
              } else {
                msg = '⏸ Paused — take your time. Your WPM won\'t be affected. Click Resume when ready.';
              }
              return h('div', {
                role: 'status',
                'aria-live': 'polite',
                style: Object.assign({
                  marginBottom: '12px',
                  padding: '12px 16px',
                  background: palette.warn,
                  color: palette.onAccent,
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center'
                }, extraStyle)
              }, msg);
            })() : null,

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
              'aria-label': 'Typing target: ' + (drill.name || 'drill') +
                '. Focus this area and begin typing. ' +
                (state.accommodations.errorTolerant ? 'Error-tolerant mode is on — wrong keystrokes advance anyway. ' : '') +
                'Press Escape to exit without saving.',
              'aria-multiline': targetStr && targetStr.length > 60 ? 'true' : 'false',
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

            // Thin progress bar — visual feedback on how far through the drill
            // text the student has typed. Theme-specific fill pattern adds
            // personality without getting in the way. Hidden in assessment
            // mode (along with other metrics).
            !state.accommodations.assessmentMode && targetStr.length > 0 ? (function() {
              var tm = state.theme || 'default';
              var done = typed.length >= targetStr.length;
              // Base fill color
              var fill = done ? palette.success : palette.accent;
              // Theme-specific fill treatment
              var fillStyle = {
                width: Math.min(100, (typed.length / targetStr.length) * 100) + '%',
                height: '100%',
                background: fill,
                transition: 'width 80ms ease, background 200ms ease'
              };
              if (tm === 'cyberpunk') {
                // Scan-line texture on top of accent fill — reads as terminal
                fillStyle.background = 'repeating-linear-gradient(90deg, ' +
                  fill + ' 0px, ' + fill + ' 4px, ' +
                  'rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 5px), ' + fill;
              } else if (tm === 'steampunk') {
                // Brass gradient — warm vertical sheen
                fillStyle.background = 'linear-gradient(180deg, ' + fill + ' 0%, #8a5024 100%)';
              } else if (tm === 'kawaii') {
                // Pastel rainbow — cream-pink to rose gradient
                fillStyle.background = 'linear-gradient(90deg, #ffd6e5 0%, ' + fill + ' 60%, #ff90b8 100%)';
              }
              // Neutral and default: solid fill (unchanged)
              return h('div', {
                'aria-hidden': 'true',
                style: {
                  marginTop: '6px',
                  height: tm === 'steampunk' ? '4px' : '3px',
                  background: palette.surface2,
                  borderRadius: tm === 'cyberpunk' ? '0' : (tm === 'kawaii' ? '999px' : '2px'),
                  overflow: 'hidden',
                  border: tm === 'steampunk' ? '1px solid rgba(90,69,40,0.6)' : 'none'
                }
              }, h('div', { style: fillStyle }));
            })() : null,

            // On-screen keyboard (large-keys accommodation)
            state.accommodations.largeKeys ? renderOnScreenKeyboard(nextKeyMeta, palette, state.accommodations.focusKeyboard) : null
          );
        }

        // ═════════════════════════════════════════════════════
        // VISUAL MODE helpers — image generation via ctx.callImagen and
        // image-to-image refinement via ctx.callGeminiImageEdit.
        // ═════════════════════════════════════════════════════
        var stripBase64Prefix = function(url) {
          if (!url) return '';
          var m = ('' + url).match(/^data:image\/[a-z]+;base64,(.*)$/);
          return m ? m[1] : ('' + url);
        };

        // Generate or refine an image based on the drill text.
        // - If we already have a prior image for this session context AND the
        //   caller asked for refinement, use callGeminiImageEdit.
        // - Otherwise use callImagen for a fresh generation.
        var generateVisualForSession = function(promptText, mode, allowRefine) {
          if (!ctx.callImagen) {
            setImgError('Image generation is not available in this context.');
            return;
          }
          if (!promptText || promptText.trim().length === 0) {
            setImgError('No text to illustrate.');
            return;
          }
          setImgLoading(true);
          setImgError(null);

          // Build the prompt with mode-specific framing so the model
          // produces child/school-appropriate, clinician-safe imagery.
          var fullPrompt;
          if (mode === 'story') {
            fullPrompt = 'A warm, illustrative scene that captures this passage for a student. ' +
              'Children\'s-book / editorial-illustration style, gentle colors, no text inside the image, no logos, no violence, no disturbing content, no real-person likenesses. ' +
              'Passage: "' + promptText + '"';
          } else {
            // prompt mode — student-authored text is the direct prompt.
            fullPrompt = promptText +
              '. Gentle, student-friendly style. No text inside the image. No real-person likenesses. No violence or disturbing content.';
          }

          var priorImage = state.lastGeneratedImage;
          var doRefine = allowRefine && priorImage && priorImage.base64;

          var run = doRefine && ctx.callGeminiImageEdit
            ? ctx.callGeminiImageEdit(fullPrompt, stripBase64Prefix(priorImage.base64), 512, 0.85)
            : ctx.callImagen(fullPrompt, 512, 0.85);

          Promise.resolve(run).then(function(result) {
            if (!result) throw new Error('Image generation returned nothing.');
            // Normalize to data-URL so <img src> works directly.
            var dataUrl = ('' + result).indexOf('data:') === 0
              ? result
              : 'data:image/png;base64,' + stripBase64Prefix(result);
            var newImage = {
              base64: dataUrl,
              prompt: fullPrompt,
              sessionDate: lastSummary ? lastSummary.date : new Date().toISOString(),
              refinedCount: doRefine ? ((priorImage && priorImage.refinedCount) || 0) + 1 : 0,
              mode: mode,
              drillText: promptText
            };
            // Gallery: newest first, dedupe by base64, cap at VISUAL_GALLERY_MAX.
            var prevGallery = (state.visualGallery || []).filter(function(g) {
              return g && g.base64 !== dataUrl;
            });
            var nextGallery = [newImage].concat(prevGallery).slice(0, VISUAL_GALLERY_MAX);
            updMulti({
              lastGeneratedImage: newImage,
              visualGallery: nextGallery
            });
            setImgLoading(false);
          }).catch(function(err) {
            setImgLoading(false);
            setImgError('Could not generate image: ' + (err && err.message ? err.message : 'unknown error'));
          });
        };

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

          // Theme-flavored success messages. Each theme has its own voice for
          // the same underlying event; falls back to neutral when the theme
          // doesn't define a specific category. Keeps content identity clear
          // (icons + numbers) while letting each theme bring personality.
          var THEMED_PHRASES = {
            'default': {
              warmup:       '🤸 Warmup complete — not saved.',
              firstGoalMet: '🎯 IEP goal met for the first time!',
              masteryUp:    '🌟 Mastery tier cleared! Reached tier ${tier}.',
              baseline:     'First session saved — this is your baseline.',
              personalBest: 'New personal best!',
              goalMet:      '🎯 IEP goal met this session.',
              plain:        'Session saved.'
            },
            'steampunk': {
              warmup:       '🤸 Warmup complete. Nothing entered into the ledger.',
              firstGoalMet: '🎯 By Jove — IEP goal reached for the first time!',
              masteryUp:    '⚙️ Mastery advanced to rank ${tier}. Well earned, apprentice.',
              baseline:     'Baseline entered into the ledger. All future runs compare against this page.',
              personalBest: '⚙️ A new personal best — your gearwork hums.',
              goalMet:      '🎯 IEP goal met. Duly noted in the books.',
              plain:        'Session committed to the ledger.'
            },
            'cyberpunk': {
              warmup:       '[SYSTEM] Warmup phase complete :: not logged',
              firstGoalMet: '[ACHIEVEMENT] First IEP-goal threshold crossed :: confirmed',
              masteryUp:    '[TIER-UP] mastery::${tier} :: level increased',
              baseline:     '[BASELINE] initial metrics captured :: reference set',
              personalBest: '[HIGHSCORE] pb.wpm overwritten :: new record',
              goalMet:      '[ACHIEVEMENT] IEP-goal :: met',
              plain:        '[LOG] session committed'
            },
            'kawaii': {
              warmup:       '🤸 Warmup done! This one doesn\'t count — just wiggly fingers ✨',
              firstGoalMet: '🎯✨ FIRST TIME hitting your goal! So proud of you! 💖',
              masteryUp:    '🌟 TIER ${tier} UNLOCKED! You did that! 💕',
              baseline:     '🌸 Your first session is saved as baseline — ready to grow!',
              personalBest: '✨ NEW PERSONAL BEST ✨ Yay!',
              goalMet:      '🎯 Goal met this session! Nicely done! 💕',
              plain:        '🌸 Session saved — nice work.'
            },
            'neutral': {
              warmup:       'Warmup complete. Not recorded.',
              firstGoalMet: 'IEP goal met for the first time.',
              masteryUp:    'Mastery tier ${tier} reached.',
              baseline:     'Baseline session recorded.',
              personalBest: 'Personal best.',
              goalMet:      'IEP goal met.',
              plain:        'Session recorded.'
            }
          };
          var phrases = THEMED_PHRASES[state.theme] || THEMED_PHRASES['default'];
          var headline;
          if (s.isWarmup) {
            headline = phrases.warmup;
          } else if (s.firstGoalMet) {
            headline = phrases.firstGoalMet;
          } else if (s.masteryAdvanced) {
            headline = phrases.masteryUp.replace('${tier}', s.newMasteryLevel);
          } else if (s.isBaseline) {
            headline = phrases.baseline;
          } else if (s.isNewBest) {
            headline = phrases.personalBest;
          } else if (s.goalMet) {
            headline = phrases.goalMet;
          } else {
            headline = phrases.plain;
          }

          // Specific next-step message on mastery advancement — names the new
          // tier that just unlocked so the student knows what they earned.
          // Dignified, not Nitrotype-style fanfare. Theme-voiced per palette.
          var _hintTm = state.theme || 'default';
          var nextStepHint = null;
          if (s.masteryAdvanced && s.newMasteryLevel) {
            var nextDrillId = null;
            for (var ti = 0; ti < TIER_ORDER.length; ti++) {
              if (DRILLS[TIER_ORDER[ti]] && DRILLS[TIER_ORDER[ti]].tier === s.newMasteryLevel) {
                nextDrillId = TIER_ORDER[ti];
                break;
              }
            }
            if (nextDrillId && DRILLS[nextDrillId]) {
              var _nd = DRILLS[nextDrillId];
              if (_hintTm === 'steampunk') {
                nextStepHint = _nd.icon + ' ' + _nd.name + ' — a new workbench has opened. Visit it from the menu when the hour suits you.';
              } else if (_hintTm === 'cyberpunk') {
                nextStepHint = '[UNLOCK] ' + _nd.icon + ' ' + _nd.name.toUpperCase() + ' :: node online :: jack in via menu when ready';
              } else if (_hintTm === 'kawaii') {
                nextStepHint = _nd.icon + ' ' + _nd.name + ' is unlocked! ✨ Pop by whenever you\'re ready — it\'ll be waiting on the menu! 💕';
              } else if (_hintTm === 'neutral') {
                nextStepHint = _nd.name + ' unlocked. Available from the menu.';
              } else {
                nextStepHint = _nd.icon + ' ' + _nd.name + ' is now unlocked. When you\'re ready, it\'s waiting on the menu.';
              }
            } else if (s.newMasteryLevel >= 7) {
              if (_hintTm === 'steampunk') {
                nextStepHint = 'Every tier on the mastery ladder stands cleared. Generate a personalised passage at your grade — the bridge between the workshop and real prose.';
              } else if (_hintTm === 'cyberpunk') {
                nextStepHint = '[ALL TIERS CLEARED] :: next-step :: AI-passage @ grade-level :: typing meets live reading';
              } else if (_hintTm === 'kawaii') {
                nextStepHint = '🏆✨ You cleared EVERY tier! Try generating a personalized passage at your grade level — where typing meets stories you actually want to read! 💕';
              } else if (_hintTm === 'neutral') {
                nextStepHint = 'All structured tiers cleared. Try an AI-generated grade-level passage next.';
              } else {
                nextStepHint = 'You\'ve cleared every structured tier. Try generating a personalized passage at your grade level — that\'s where typing meets real reading.';
              }
            }
          } else if (s.isNewBest && !s.isBaseline) {
            // Tiny context-aware nudge on personal best
            var drill = DRILLS[s.drillId];
            if (drill && drill.masteryWpm && s.wpm < drill.masteryWpm) {
              var gap = drill.masteryWpm - s.wpm;
              if (_hintTm === 'steampunk') {
                nextStepHint = gap + ' WPM from the next tier. Steady hands — the gearwork turns in your favour.';
              } else if (_hintTm === 'cyberpunk') {
                nextStepHint = '[Δ ' + gap + ' WPM] :: tier-clear within range :: push on';
              } else if (_hintTm === 'kawaii') {
                nextStepHint = 'You\'re just ' + gap + ' WPM from clearing this tier! 💪✨ Almost there!';
              } else if (_hintTm === 'neutral') {
                nextStepHint = gap + ' WPM below tier-clear threshold.';
              } else {
                nextStepHint = 'You\'re ' + gap + ' WPM from clearing this tier. Keep at it.';
              }
            }
          } else if (s.isBaseline) {
            if (_hintTm === 'steampunk') {
              nextStepHint = 'Your baseline is entered in the ledger. Every future run shall be measured against this first page.';
            } else if (_hintTm === 'cyberpunk') {
              nextStepHint = '[BASELINE SET] :: all future runs :: Δ from this reference';
            } else if (_hintTm === 'kawaii') {
              nextStepHint = '🌸 Your baseline is saved! Every session from now on is just about YOUR growth — no comparisons needed! 💕';
            } else if (_hintTm === 'neutral') {
              nextStepHint = 'Baseline recorded. All future sessions compared against it.';
            } else {
              nextStepHint = 'Your baseline is saved. Every future session is compared against today.';
            }
          }

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
              h('div', {
                className: (s.isNewBest || s.isBaseline || s.masteryAdvanced || s.firstGoalMet) ? 'tp-celebrate' : undefined,
                style: { fontSize: '20px', fontWeight: 700, color: s.isNewBest || s.isBaseline || s.masteryAdvanced ? palette.success : palette.text, marginBottom: nextStepHint ? '6px' : '20px' }
              }, headline),
              nextStepHint ? h('div', {
                style: { fontSize: '13px', color: palette.textDim, marginBottom: '20px', lineHeight: '1.5' }
              }, nextStepHint) : null,

              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }
              },
                renderMetric('WPM', s.wpm, palette, state.theme),
                renderMetric('Accuracy', s.accuracy + '%', palette, state.theme),
                renderMetric('Time', formatDuration(s.durationSec), palette, state.theme),
                renderMetric('Errors', s.errors, palette, state.theme)
              ),

              (s.accommodationsUsed && s.accommodationsUsed.length > 0) ? h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.textMute,
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }
              }, (function() {
                var tm = state.theme || 'default';
                var list = s.accommodationsUsed.join(', ');
                if (tm === 'steampunk') return '⚙ Instruments engaged this session: ' + list;
                if (tm === 'cyberpunk') return '[LOADOUT THIS RUN] ' + s.accommodationsUsed.join(' :: ');
                if (tm === 'kawaii')    return '🏅 Helpful friends that came along: ' + list + ' 💕';
                if (tm === 'neutral')   return 'Accommodations this session: ' + list;
                return '🏅 Accommodations used this session: ' + list;
              })()) : null,

              // Per-session top-missed keys — lightweight version of the
              // all-time heatmap, scoped to JUST this session. Surfaces the
              // 3-5 keys the student missed most during this run so they can
              // see actionable targets while the session is still fresh.
              (function() {
                if (!s.errorChars) return null;
                var keys = Object.keys(s.errorChars).filter(function(k) { return s.errorChars[k] > 0; });
                if (keys.length === 0) return null;
                keys.sort(function(a, b) { return s.errorChars[b] - s.errorChars[a]; });
                var top = keys.slice(0, 5);
                return h('div', {
                  style: {
                    marginBottom: '16px',
                    padding: '10px 14px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: palette.textDim
                  }
                },
                  h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
                    (function() {
                      var tm = state.theme || 'default';
                      if (tm === 'steampunk') return '⚙ Gearwork snags — keys that gave you pause';
                      if (tm === 'cyberpunk') return '[KEY ERRORS] this run';
                      if (tm === 'kawaii')    return '🌸 Tricky keys from this session 💕';
                      if (tm === 'neutral')   return 'Keys missed this session';
                      return '⌨️ Keys missed most this session';
                    })()),
                  h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
                    top.map(function(k) {
                      return h('span', {
                        key: 'tms-' + k,
                        style: {
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: palette.surface,
                          border: '1px solid ' + palette.border,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: '12px'
                        }
                      },
                        h('span', { style: { color: palette.text, fontWeight: 700, textTransform: 'uppercase' } }, k),
                        h('span', { style: { color: palette.textMute, fontSize: '10px' } }, s.errorChars[k] + '×')
                      );
                    })
                  ),
                  h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
                    (function() {
                      var tm = state.theme || 'default';
                      if (tm === 'steampunk') return 'These entries join the grand heatmap on the Progress ledger. A short pass on each tightens the gearwork.';
                      if (tm === 'cyberpunk') return '[INFO] aggregates into all-time heatmap :: targeted retry → compounding gain';
                      if (tm === 'kawaii')    return '💕 These add to your Progress heatmap. A quick retry with these keys adds up over time! ✨';
                      if (tm === 'neutral')   return 'Aggregated into all-time heatmap on Progress view.';
                      return 'These feed the all-time heatmap on the Progress view. A short retry focused on these keys can compound over time.';
                    })())
                );
              })(),

              // Pace graph — chars-per-10s over the session. Shows intra-session
              // variability (did the student slow down? speed up?). Helpful for
              // attention/fatigue analysis. Only renders if we have ≥2 buckets.
              (s.paceBuckets && s.paceBuckets.length >= 2) ? h('div', {
                style: {
                  marginBottom: '16px',
                  padding: '12px 14px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  textAlign: 'left'
                }
              },
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' } },
                  'Pace over time · 10-second buckets'),
                (function() {
                  var maxBucket = Math.max.apply(null, s.paceBuckets.concat([1]));
                  return h('div', {
                    style: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px', padding: '2px 0' }
                  },
                    s.paceBuckets.map(function(count, i) {
                      var h_ = Math.max(2, Math.round((count / maxBucket) * 56));
                      // Approximate WPM for this bucket: (count/5 chars-per-word) * 6 (10s → 60s)
                      var bucketWpm = Math.round((count / 5) * 6);
                      return h('div', {
                        key: 'pb-' + i,
                        title: 'Seconds ' + (i * 10) + '–' + ((i + 1) * 10) + ': ~' + bucketWpm + ' WPM',
                        style: {
                          flex: 1,
                          height: h_ + 'px',
                          background: palette.accent,
                          borderRadius: '2px 2px 0 0',
                          minWidth: '6px'
                        }
                      });
                    })
                  );
                })(),
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '4px', fontStyle: 'italic' } },
                  'Each bar = chars typed in a 10-second window. Hover for approx WPM.')
              ) : null,

              // Clinical session tag — lets a teacher/psych label this session
              // ("baseline" / "progress check" / "assessment" / "practice") so
              // the CSV + IEP can filter and aggregate by role. Saved into the
              // session record on click.
              h('div', {
                style: {
                  marginBottom: '12px',
                  padding: '12px 14px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px',
                  textAlign: 'left'
                }
              },
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Session tag (for clinicians)'),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  [
                    { id: null,             label: 'Untagged' },
                    { id: 'baseline',       label: '📍 Baseline' },
                    { id: 'progress-check', label: '📈 Progress check' },
                    { id: 'assessment',     label: '📊 Assessment' },
                    { id: 'practice',       label: '✏️ Practice' }
                  ].map(function(opt) {
                    var isActive = (s.tag || null) === opt.id;
                    return h('button', {
                      key: 'tag-' + (opt.id || 'none'),
                      onClick: function() {
                        var sessions = (state.sessions || []).slice();
                        for (var i = sessions.length - 1; i >= 0; i--) {
                          if (sessions[i].date === s.date) {
                            sessions[i] = Object.assign({}, sessions[i], { tag: opt.id });
                            break;
                          }
                        }
                        upd('sessions', sessions);
                        setLastSummary(Object.assign({}, s, { tag: opt.id }));
                      },
                      style: {
                        padding: '4px 10px',
                        borderRadius: '999px',
                        border: '1px solid ' + (isActive ? palette.accent : palette.border),
                        background: isActive ? palette.accent : 'transparent',
                        color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                        fontSize: '11px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }
                    }, opt.label);
                  })
                )
              ),

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
                        color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
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

              // Visual mode panel — shows only when the relevant accommodation
              // is on AND the drill type matches. Story mode illustrates a
              // passage on demand; prompt mode treats custom-drill text as
              // an image prompt and offers refine-via-image-to-image on retry.
              (function() {
                if (s.isWarmup) return null;
                var storyEligible = s.drillId === 'passage' && state.accommodations.storyModeImage;
                var promptEligible = s.drillId === 'custom' && state.accommodations.promptModeImage;
                if (!storyEligible && !promptEligible) return null;
                var mode = storyEligible ? 'story' : 'prompt';
                // Resolve the drill text that was typed — for passages that's
                // state.aiPassage.text; for custom it's the active library entry.
                var drillText = '';
                if (mode === 'story' && state.aiPassage) drillText = state.aiPassage.text || '';
                if (mode === 'prompt') {
                  var lib = state.customDrillLibrary || [];
                  var entry = state.activeCustomDrillId
                    ? lib.filter(function(e) { return e.id === state.activeCustomDrillId; })[0]
                    : lib[0];
                  drillText = (entry && entry.text) || (state.customDrill && state.customDrill.text) || '';
                }
                var existing = state.lastGeneratedImage;
                var existingMatchesSession = existing && existing.sessionDate === s.date;
                return h('div', {
                  style: {
                    marginBottom: '16px',
                    padding: '12px 14px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    borderRadius: '10px',
                    textAlign: 'left'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' } },
                    h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.accent, textTransform: 'uppercase', letterSpacing: '0.06em' } },
                      mode === 'story' ? '🎨 Story mode · illustrate this passage' : '🎨 Prompt mode · generate from your text'),
                    existingMatchesSession && existing.refinedCount ? h('span', {
                      style: { fontSize: '10px', color: palette.textMute }
                    }, 'refined ' + existing.refinedCount + '×') : null
                  ),

                  // Image display area — theme-voiced loading indicator.
                  imgLoading ? h('div', {
                    style: { padding: '40px 0', textAlign: 'center', color: palette.textMute, fontSize: '14px' }
                  },
                    h('div', { className: 'tp-loading-icon', 'aria-hidden': 'true', style: { fontSize: '28px', marginBottom: '8px' } },
                      (state.theme === 'steampunk') ? '⚙'
                      : (state.theme === 'cyberpunk') ? '▮▯▮'
                      : (state.theme === 'kawaii')    ? '💕'
                      : (state.theme === 'neutral')   ? '•••'
                      : '✨'),
                    h('div', null, getLoadingLabel(state.theme, 'image'))
                  ) : null,

                  (!imgLoading && existing && existing.base64) ? h('div', null,
                    h('img', {
                      src: existing.base64,
                      alt: 'Generated ' + (mode === 'story' ? 'illustration' : 'image') + ' based on the drill text',
                      style: {
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        border: '1px solid ' + palette.border,
                        display: 'block'
                      }
                    })
                  ) : null,

                  imgError ? h('div', {
                    role: 'alert',
                    style: { color: palette.danger, fontSize: '11px', marginTop: '8px' }
                  }, '⚠️ ' + imgError) : null,

                  // Actions
                  !imgLoading ? h('div', {
                    style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }
                  },
                    h('button', {
                      onClick: function() { generateVisualForSession(drillText, mode, false); },
                      style: Object.assign({}, primaryBtnStyle(palette), { fontSize: '11px', padding: '6px 12px' })
                    }, existing && existingMatchesSession ? '↻ New image' : '✨ Generate image'),

                    // Refine only available when we have a prior image AND the hub offers the edit API
                    (ctx.callGeminiImageEdit && existing && existing.base64) ? h('button', {
                      onClick: function() { generateVisualForSession(drillText, mode, true); },
                      style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '6px 12px' }),
                      title: 'Refine the last image using image-to-image instead of starting from scratch'
                    }, '🎨 Refine') : null,

                    // Download — students should be able to save their work
                    (existing && existing.base64) ? h('button', {
                      onClick: function() {
                        try {
                          var a = document.createElement('a');
                          a.href = existing.base64;
                          var stu = (state.studentName || 'student').replace(/[^a-z0-9_-]/gi, '_');
                          a.download = 'typing_' + mode + '_' + stu + '_' +
                            new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.png';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          addToast('Image saved to downloads.');
                        } catch (e) {
                          addToast('⚠️ Download failed — try right-click → Save image instead.');
                        }
                      },
                      style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '6px 12px' }),
                      title: 'Download this image as a PNG file'
                    }, '📥 Save') : null
                  ) : null,

                  // Gallery strip — up to VISUAL_GALLERY_MAX-1 PRIOR images
                  // shown as small thumbnails. Tapping a thumbnail restores
                  // it as the active image (so refine reuses it).
                  (function() {
                    var gallery = (state.visualGallery || []).filter(function(g) {
                      return !existing || g.base64 !== existing.base64;
                    });
                    if (gallery.length === 0) return null;
                    return h('div', {
                      style: { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid ' + palette.border }
                    },
                      h('div', {
                        style: { fontSize: '10px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 }
                      }, 'Recent · tap to restore'),
                      h('div', {
                        style: { display: 'flex', gap: '6px', flexWrap: 'wrap' }
                      },
                        gallery.map(function(g, i) {
                          return h('button', {
                            key: 'gal-' + i,
                            onClick: function() {
                              upd('lastGeneratedImage', g);
                              addToast('Restored prior image. Refine works from here now.');
                            },
                            'aria-label': 'Restore earlier image from ' + new Date(g.sessionDate).toLocaleString(),
                            title: new Date(g.sessionDate).toLocaleString() +
                                   (g.refinedCount ? ' · refined ' + g.refinedCount + '×' : ''),
                            style: {
                              padding: 0,
                              border: '1px solid ' + palette.border,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: 'transparent',
                              overflow: 'hidden'
                            }
                          },
                            h('img', {
                              src: g.base64,
                              alt: '',
                              style: { width: '72px', height: '72px', objectFit: 'cover', display: 'block' }
                            })
                          );
                        })
                      )
                    );
                  })(),

                  h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
                    mode === 'story'
                      ? 'Imagery reflects your passage. Educational illustration style.'
                      : 'Your drill text is the prompt. Refine reuses the last image as a starting point.')
                );
              })(),

              h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', {
                  onClick: function() { updMulti({ view: 'drill', currentDrill: s.drillId }); },
                  style: primaryBtnStyle(palette),
                  title: 'Retry the same text to beat your score'
                }, 'Drill again'),
                // Discard: lets the student undo an accidental session. Removes
                // the latest session, rewinds lifetime totals + mastery advance
                // + personal-best if it was set by this session. Only visible
                // for the most-recent session to keep the fix surgical.
                (state.sessions && state.sessions.length > 0 && state.sessions[state.sessions.length - 1].date === s.date) ? h('button', {
                  onClick: function() {
                    if (typeof window !== 'undefined' && window.confirm && !window.confirm('Discard this session? WPM, accuracy, and any mastery advancement from this run will be removed.')) return;
                    var sessions = (state.sessions || []).slice(0, -1);
                    var lifetime = Object.assign({}, state.lifetime || {});
                    lifetime.totalSessions = Math.max(0, (lifetime.totalSessions || 1) - 1);
                    lifetime.totalCharsTyped = Math.max(0, (lifetime.totalCharsTyped || 0) - (s.charCount || 0));
                    lifetime.totalErrorsLogged = Math.max(0, (lifetime.totalErrorsLogged || 0) - (s.errors || 0));
                    // Roll back aggregateErrors for this session's errorChars
                    var agg = Object.assign({}, state.aggregateErrors || {});
                    if (s.errorChars) {
                      Object.keys(s.errorChars).forEach(function(k) {
                        agg[k] = Math.max(0, (agg[k] || 0) - s.errorChars[k]);
                        if (agg[k] === 0) delete agg[k];
                      });
                    }
                    var updates = { sessions: sessions, lifetime: lifetime, aggregateErrors: agg, view: 'menu' };
                    // Roll back mastery advancement if this session caused it
                    if (s.masteryAdvanced && state.masteryLevel === s.newMasteryLevel) {
                      updates.masteryLevel = Math.max(0, state.masteryLevel - 1);
                    }
                    // Roll back personal best only if this session set it and it's the current best
                    if (s.isNewBest && state.personalBest && state.personalBest[s.drillId] &&
                        state.personalBest[s.drillId].date === s.date) {
                      // Recompute personal best from remaining sessions for this drill
                      var drillSessions = sessions.filter(function(x) { return x.drillId === s.drillId; });
                      var newPB = null;
                      drillSessions.forEach(function(x) {
                        if (!newPB || x.wpm > newPB.wpm || (x.wpm === newPB.wpm && x.accuracy > newPB.accuracy)) {
                          newPB = { wpm: x.wpm, accuracy: x.accuracy, date: x.date };
                        }
                      });
                      var pbCopy = Object.assign({}, state.personalBest);
                      if (newPB) pbCopy[s.drillId] = newPB;
                      else delete pbCopy[s.drillId];
                      updates.personalBest = pbCopy;
                    }
                    // Roll back baseline if this was the first-ever session
                    if (s.isBaseline) updates.baseline = null;
                    updMulti(updates);
                    addToast('Session discarded.');
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    borderColor: palette.danger,
                    color: palette.danger,
                    fontSize: '11px',
                    padding: '10px 14px'
                  }),
                  title: 'Undo this session entirely'
                }, '🗑 Discard this session') : null,
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
                var _bTm = state.theme || 'default';
                var _bToast;
                if (_bTm === 'steampunk')      _bToast = '⚙ Instrument logged: first use of ' + key + '. The workshop rewards every hand that reaches.';
                else if (_bTm === 'cyberpunk') _bToast = '[BADGE] ' + key.toUpperCase() + ' :: first-use logged :: mods are allies';
                else if (_bTm === 'kawaii')    _bToast = '🏅✨ Badge earned! You tried ' + key + ' — helpful friends are the best! 💕';
                else if (_bTm === 'neutral')   _bToast = 'Badge: first use of ' + key + '.';
                else                           _bToast = '🏅 Badge earned: tried ' + key + ' — these tools are your teammates.';
                addToast(_bToast);
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
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, (function() {
              var tm = state.theme || 'default';
              if (tm === 'steampunk') return '⚙  Workshop Instruments';
              if (tm === 'cyberpunk') return '[ACCOMMODATIONS]';
              if (tm === 'kawaii')    return '💕 Accommodations ✨';
              if (tm === 'neutral')   return 'Accommodations';
              return '⚙️  Accommodations';
            })()),
            h('p', {
              style: { margin: '0 0 14px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, (function() {
              var tm = state.theme || 'default';
              if (tm === 'steampunk') return 'These are not spare parts — they are the instruments themselves. Reaching for them is the craft.';
              if (tm === 'cyberpunk') return '[MODS] not fallbacks :: core rig :: equipping them = intended workflow';
              if (tm === 'kawaii')    return '✨ These aren\'t extra — they\'re the whole point! Using them is the best thing you can do. 💕';
              if (tm === 'neutral')   return 'Core supports, not fallbacks. Designed to be used.';
              return 'These aren\'t fallbacks — they\'re the design. Using them is the point.';
            })()),

            // Quick-jump table of contents — anchors to each major section of
            // the (long) Settings page. Small but real UX win: clinicians
            // configuring multi-accommodation profiles stop scrolling.
            h('div', {
              style: {
                marginBottom: '20px',
                padding: '10px 14px',
                background: 'transparent',
                border: '1px dashed ' + palette.border,
                borderRadius: '8px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
                fontSize: '11px'
              }
            },
              h('span', { style: { color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }, 'Jump to'),
              [
                { id: 'tp-s-presets',     label: '✨ Presets' },
                { id: 'tp-s-toggles',     label: 'Toggles' },
                { id: 'tp-s-appearance',  label: '🎨 Appearance' },
                { id: 'tp-s-sample-len',  label: '✂️ Sample length' },
                { id: 'tp-s-rest',        label: '☕ Rest break' },
                { id: 'tp-s-pace',        label: '🎯 Pace' },
                { id: 'tp-s-sight',       label: '📖 Sight-read' },
                { id: 'tp-s-student',     label: '🌱 Student goals' },
                { id: 'tp-s-clinician',   label: '👩‍⚕️ Clinician + IEP' },
                { id: 'tp-s-profile',     label: '📁 Profile + backup' }
              ].map(function(entry) {
                return h('a', {
                  key: 'toc-' + entry.id,
                  href: '#' + entry.id,
                  onClick: function(e) {
                    e.preventDefault();
                    var el = document.getElementById(entry.id);
                    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  },
                  style: {
                    padding: '3px 8px',
                    borderRadius: '999px',
                    border: '1px solid ' + palette.border,
                    background: 'transparent',
                    color: palette.textDim,
                    fontSize: '10px',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }
                }, entry.label);
              })
            ),

            // Presets: one-click bundles of typical disability-profile combinations
            h('div', {
              id: 'tp-s-presets',
              style: {
                marginBottom: '20px',
                padding: '12px 14px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '10px',
                scrollMarginTop: '20px'
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: 700 } },
                (function() {
                  var tm = state.theme || 'default';
                  if (tm === 'steampunk') return '⚙ Bench-ready rigs';
                  if (tm === 'cyberpunk') return '[PRESET LOADOUTS]';
                  if (tm === 'kawaii')    return '✨💕 Quick presets';
                  if (tm === 'neutral')   return 'Presets';
                  return '✨ Quick presets';
                })()),
              h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                (function() {
                  var tm = state.theme || 'default';
                  if (tm === 'steampunk') return 'Pre-assembled instrument sets for common profiles. Adjust any lever after fitting.';
                  if (tm === 'cyberpunk') return '[PRE-BUILT] common-profile bundles :: mutable post-apply :: no lock-in';
                  if (tm === 'kawaii')    return 'Pre-picked combos for you! 💕 Tap one, then tweak anything you like. ✨';
                  if (tm === 'neutral')   return 'Common-profile bundles. Editable after applying.';
                  return 'One-click common combos. Tap any toggle below to customize after applying.';
                })()),
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
                      fontFamily: 'inherit',
                      textAlign: 'left'
                    },
                    onMouseOver: function(e) { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.color = palette.text; },
                    onMouseOut: function(e) { e.currentTarget.style.borderColor = palette.border; e.currentTarget.style.color = palette.textDim; }
                  }, preset.label);
                })
              )
            ),

            h('div', { id: 'tp-s-toggles', style: { scrollMarginTop: '20px' } }),
            renderToggleRow('Dyslexia-friendly font', 'Switches to a font designed to reduce letter-confusion (b/d, p/q).', acc.dyslexiaFont, function() { toggle('dyslexiaFont'); }, palette),
            renderToggleRow('Large-key visual keyboard', 'Shows an on-screen keyboard with finger-color coding and the next-key highlighted.', acc.largeKeys, function() { toggle('largeKeys'); }, palette),
            // Focus-mode is a child toggle of largeKeys — only meaningful when
            // the keyboard is shown. Hide it otherwise to reduce clutter.
            acc.largeKeys ? renderToggleRow('Focus mode on keyboard', 'When the on-screen keyboard is on, heavily dims all keys except the next target. Same-finger keys stay slightly visible as a motor-planning hint.', acc.focusKeyboard, function() { toggle('focusKeyboard'); }, palette) : null,
            renderToggleRow('High-contrast mode', 'Black / yellow / white palette that works for low vision.', acc.highContrast, function() { toggle('highContrast'); }, palette),
            renderToggleRow('Audio cues', 'Soft chime on correct keypress, low tone on errors. Non-alarming.', acc.audioCues, function() { toggle('audioCues'); }, palette),
            renderToggleRow('Speak words as you type', 'After each space, the tool reads the just-completed word aloud. Supports auditory learners and low-vision typists. Requires the hub\'s text-to-speech to be available.', acc.speakWordsOnSpace, function() { toggle('speakWordsOnSpace'); }, palette),

            // Audio theme picker — only visible when audio cues are on.
            acc.audioCues ? h('div', {
              style: { padding: '10px 0 14px 0', borderBottom: '1px solid ' + palette.border, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }
            },
              h('div', { style: { fontSize: '12px', color: palette.textMute, marginRight: '6px' } }, 'Sound theme:'),
              ['chime', 'soft', 'clack', 'beep', 'pop', 'mute'].map(function(themeId) {
                var isActive = (state.audioTheme || 'chime') === themeId;
                var themeLabel = themeId === 'chime' ? '🔔 Chime (default)'
                              : themeId === 'soft'  ? '🎵 Soft'
                              : themeId === 'clack' ? '⌨️ Clack (typewriter)'
                              : themeId === 'beep'  ? '🖥 Beep (digital)'
                              : themeId === 'pop'   ? '🍬 Pop (soft)'
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
                    color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }
                }, themeLabel);
              })
            ) : null,
            renderToggleRow('Error-tolerant mode', 'Errors don\'t block progress — great for dysgraphia. The target advances with the correct character so the student can keep going.', acc.errorTolerant, function() { toggle('errorTolerant'); }, palette),
            renderToggleRow('Predictive assist', 'Shows the next 1–3 characters with a soft highlight so emerging typists can plan the next move. Auto-fades as your accuracy on this drill improves.', acc.predictiveAssist, function() { toggle('predictiveAssist'); }, palette),
            renderToggleRow('🎨 Story mode (illustrate passages)', 'After you finish a personalized-passage drill, offer a button to illustrate the passage with an AI-generated image. Educational-illustration style, student-friendly. Off by default.', acc.storyModeImage, function() { toggle('storyModeImage'); }, palette),
            renderToggleRow('🎨 Prompt mode (art from custom drills)', 'After you finish a custom-drill session, your drill text becomes an AI image prompt. Drill again and the image refines via image-to-image — typing becomes the brushstroke. Off by default.', acc.promptModeImage, function() { toggle('promptModeImage'); }, palette),
            renderToggleRow('Assessment mode', 'Hides WPM, accuracy, and timer during the drill. For clinicians running a clean baseline where clock-watching would affect the measurement. Metrics are still saved and shown at the end.', acc.assessmentMode, function() { toggle('assessmentMode'); }, palette),

            h('div', { id: 'tp-s-sight', style: { scrollMarginTop: '20px' } }),
            // ── Sight-read count-in: read the passage first, then type ──
            h('div', {
              style: { padding: '14px 0', borderBottom: '1px solid ' + palette.border }
            },
              h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, 'Sight-read count-in'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4', marginBottom: '10px' } },
                'Shows the full passage for this many seconds before typing starts. Helps students who benefit from reading first, then producing. The student can skip the countdown at any time.'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
                [null, 3, 5, 8, 12].map(function(opt) {
                  var isActive = acc.sightReadSeconds === opt;
                  return h('button', {
                    key: 'sight-' + opt,
                    onClick: function() {
                      var newAcc = Object.assign({}, acc);
                      newAcc.sightReadSeconds = opt;
                      upd('accommodations', newAcc);
                    },
                    style: {
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, opt === null ? 'Off' : (opt + ' sec'));
                })
              )
            ),

            h('div', { id: 'tp-s-rest', style: { scrollMarginTop: '20px' } }),
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
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, opt === null ? 'Off' : (opt + ' min'));
                })
              )
            ),

            h('div', { id: 'tp-s-appearance', style: { scrollMarginTop: '20px' } }),

            // ── Visual theme — full-palette override ──
            // High-contrast mode trumps themes. accentColor picker still works
            // within any theme. Kawaii is a LIGHT theme; others are dark.
            !acc.highContrast ? h('div', {
              style: { padding: '14px 0', borderBottom: '1px solid ' + palette.border }
            },
              h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, 'Visual theme'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4', marginBottom: '10px' } },
                'Swap the whole look of the tool. High-contrast mode overrides themes. Kawaii is a light theme; the others are dark variants.'),
              h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
                [
                  { id: 'default',   label: 'Default',   sub: 'cool dark blue',    bgSample: '#0f172a', accentSample: '#60a5fa' },
                  { id: 'steampunk', label: '🔩 Steampunk', sub: 'brass + leather',  bgSample: '#1a1108', accentSample: '#d4884c' },
                  { id: 'cyberpunk', label: '🌃 Cyberpunk', sub: 'neon magenta',     bgSample: '#0a0514', accentSample: '#ff00a8' },
                  { id: 'kawaii',    label: '🍓 Kawaii',    sub: 'pastel · LIGHT',   bgSample: '#fff5fa', accentSample: '#e85a8a' },
                  { id: 'neutral',   label: '🪨 Neutral',   sub: 'warm gray',        bgSample: '#1a1a1a', accentSample: '#b8a080' }
                ].map(function(opt) {
                  var isActive = (state.theme || 'default') === opt.id;
                  return h('button', {
                    key: 'theme-' + opt.id,
                    onClick: function() { upd('theme', opt.id); },
                    'aria-pressed': isActive ? 'true' : 'false',
                    'aria-label': opt.label + ' theme — ' + opt.sub,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '2px solid ' + (isActive ? palette.text : palette.border),
                      background: 'transparent',
                      color: palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left'
                    }
                  },
                    // Swatch showing bg + accent for the theme
                    h('span', {
                      'aria-hidden': 'true',
                      style: {
                        display: 'inline-flex',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid ' + palette.border,
                        overflow: 'hidden',
                        flexShrink: 0
                      }
                    },
                      h('span', { style: { flex: 1, background: opt.bgSample } }),
                      h('span', { style: { flex: 1, background: opt.accentSample } })
                    ),
                    h('span', null,
                      h('div', { style: { fontSize: '12px', fontWeight: isActive ? 700 : 600 } }, opt.label),
                      h('div', { style: { fontSize: '10px', color: palette.textMute, fontWeight: 400 } }, opt.sub)
                    )
                  );
                })
              )
            ) : null,

            // ── Accent color — cosmetic + accessibility (color-sensitivity) ──
            // Overrides only while high-contrast mode is OFF. In high-contrast,
            // the palette is intentionally fixed black/yellow/white.
            !acc.highContrast ? h('div', {
              style: { padding: '14px 0', borderBottom: '1px solid ' + palette.border }
            },
              h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, 'Accent color'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4', marginBottom: '10px' } },
                'Swap the highlight color used for the current character, buttons, and milestones. For students who find blue too cold or want warmer tones for focus. High-contrast mode overrides this.'),
              h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
                [
                  { id: 'blue',   label: 'Blue' },
                  { id: 'teal',   label: 'Teal' },
                  { id: 'violet', label: 'Violet' },
                  { id: 'amber',  label: 'Amber' },
                  { id: 'rose',   label: 'Rose' }
                ].map(function(opt) {
                  var isActive = (state.accentColor || 'blue') === opt.id;
                  var swatch = ACCENT_THEMES[opt.id].accent;
                  return h('button', {
                    key: 'accent-' + opt.id,
                    onClick: function() { upd('accentColor', opt.id); },
                    title: opt.label,
                    'aria-label': opt.label + ' accent',
                    'aria-pressed': isActive ? 'true' : 'false',
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.text : palette.border),
                      background: 'transparent',
                      color: palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  },
                    h('span', {
                      'aria-hidden': 'true',
                      style: {
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: swatch,
                        border: isActive ? '2px solid ' + palette.text : '1px solid ' + palette.border
                      }
                    }),
                    opt.label
                  );
                })
              )
            ) : null,

            h('div', { id: 'tp-s-sample-len', style: { scrollMarginTop: '20px' } }),
            // ── Sample length preference — filters drill.samples by length ──
            h('div', {
              style: { padding: '14px 0', borderBottom: '1px solid ' + palette.border }
            },
              h('div', { style: { fontSize: '14px', fontWeight: 600, color: palette.text, marginBottom: '2px' } }, 'Sample length preference'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.4', marginBottom: '10px' } },
                'Prefer shorter or longer drill texts. "Short" helps students with attention or fatigue; "Long" is for students building endurance. If a drill has no samples matching the preference, falls back to any.'),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
                [
                  { id: null,      label: 'Any' },
                  { id: 'short',   label: '✂️ Short (<40 chars)' },
                  { id: 'medium',  label: '📄 Medium (40-70)' },
                  { id: 'long',    label: '📜 Long (>70)' }
                ].map(function(opt) {
                  var isActive = acc.sampleLength === opt.id;
                  return h('button', {
                    key: 'slen-' + (opt.id || 'any'),
                    onClick: function() {
                      var newAcc = Object.assign({}, acc);
                      newAcc.sampleLength = opt.id;
                      upd('accommodations', newAcc);
                    },
                    style: {
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, opt.label);
                })
              )
            ),

            h('div', { id: 'tp-s-pace', style: { scrollMarginTop: '20px' } }),
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
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, opt === null ? 'Off' : (opt + ' WPM'));
                })
              )
            ),

            h('div', { id: 'tp-s-student', style: { scrollMarginTop: '20px' } }),
            // ═══ Student agency: personal motivation + daily goal ═══
            // Separate from the clinician-set IEP goal so it's clear which
            // targets are externally imposed vs student-owned.
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
              }, 'Your goals (student)'),
              h('p', {
                style: { fontSize: '11px', color: palette.textMute, margin: '0 0 14px 0', lineHeight: '1.5' }
              }, 'This is your space. Why are you practicing? What\'s your target for today? Separate from the clinician\'s IEP goal.'),

              // Motivation statement
              h('div', { style: { marginBottom: '16px' } },
                h('label', {
                  htmlFor: 'tp-motivation',
                  style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                }, 'Why I\'m practicing (shown on menu)'),
                h('textarea', {
                  id: 'tp-motivation',
                  value: state.motivationStatement || '',
                  onChange: function(e) { upd('motivationStatement', e.target.value); },
                  placeholder: 'e.g., "Typing feels hard now, but I\'m going to be able to write my own stories." · "I want to email my grandma without my mom helping." · "Faster typing = less homework time."',
                  maxLength: 200,
                  rows: 2,
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

              // Daily goal
              h('div', null,
                h('label', {
                  style: { display: 'block', fontSize: '12px', fontWeight: 600, color: palette.text, marginBottom: '6px' }
                }, 'Today\'s goal (resets tomorrow)'),
                h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } },
                  h('div', { style: { flex: '0 0 130px' } },
                    h('label', { htmlFor: 'tp-daily-sessions', style: { fontSize: '10px', color: palette.textMute, display: 'block', marginBottom: '2px' } }, 'Sessions'),
                    h('input', {
                      id: 'tp-daily-sessions',
                      type: 'number',
                      min: 1, max: 20,
                      value: (state.dailyGoal && state.dailyGoal.targetSessions) || '',
                      onChange: function(e) {
                        var v = parseInt(e.target.value, 10);
                        if (isNaN(v) || v < 1) { upd('dailyGoal', null); return; }
                        var cur = state.dailyGoal || {};
                        upd('dailyGoal', Object.assign({}, cur, { targetSessions: v, date: cur.date || new Date().toISOString() }));
                      },
                      placeholder: '3',
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
                  h('div', { style: { flex: '0 0 130px' } },
                    h('label', { htmlFor: 'tp-daily-wpm', style: { fontSize: '10px', color: palette.textMute, display: 'block', marginBottom: '2px' } }, 'Hit WPM ≥'),
                    h('input', {
                      id: 'tp-daily-wpm',
                      type: 'number',
                      min: 1, max: 150,
                      value: (state.dailyGoal && state.dailyGoal.targetWpm) || '',
                      onChange: function(e) {
                        var v = parseInt(e.target.value, 10);
                        var cur = state.dailyGoal || {};
                        var newGoal = Object.assign({}, cur, {
                          targetWpm: isNaN(v) ? null : v,
                          date: cur.date || new Date().toISOString()
                        });
                        // Don't save an empty daily goal
                        if (!newGoal.targetSessions && !newGoal.targetWpm) { upd('dailyGoal', null); return; }
                        upd('dailyGoal', newGoal);
                      },
                      placeholder: '(optional)',
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
                  state.dailyGoal ? h('button', {
                    onClick: function() { upd('dailyGoal', null); },
                    style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '8px 12px' })
                  }, 'Clear') : null
                ),
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
                  'Today\'s goal is yours — not counted against you if you miss it. Resets automatically tomorrow.')
              )
            ),

            h('div', { id: 'tp-s-clinician', style: { scrollMarginTop: '20px' } }),
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
            ),

            h('div', { id: 'tp-s-profile', style: { scrollMarginTop: '20px' } }),
            // ═══ Profile import/export ═══
            // Lets a clinician move an accommodation profile across devices
            // or between students. Exports settings + IEP goal + audio theme.
            // Does NOT export sessions, personalBest, or aggregate errors —
            // those are per-student data, not portable profile config.
            h('div', {
              style: {
                marginTop: '16px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '10px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', {
                style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 }
              }, 'Profile import / export'),
              h('p', {
                style: { fontSize: '11px', color: palette.textMute, margin: '0 0 14px 0', lineHeight: '1.5' }
              }, 'Save the accommodations + IEP goal + audio theme to JSON, or load a profile from another device. Does NOT copy session history — that stays per student.'),

              h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' } },
                h('button', {
                  onClick: function() {
                    var profile = {
                      _format: 'alloflow-typing-practice-profile',
                      _version: 1,
                      _exported: new Date().toISOString(),
                      studentName: state.studentName || '',
                      accommodations: state.accommodations || {},
                      audioTheme: state.audioTheme || 'chime',
                      iepGoal: state.iepGoal || null,
                      passagePrefs: state.passagePrefs || {}
                    };
                    var json = JSON.stringify(profile, null, 2);
                    try {
                      var blob = new Blob([json], { type: 'application/json' });
                      var url = URL.createObjectURL(blob);
                      var a = document.createElement('a');
                      a.href = url;
                      var stu = (state.studentName || 'student').replace(/[^a-z0-9_-]/gi, '_');
                      a.download = 'typing_profile_' + stu + '_' + new Date().toISOString().slice(0, 10) + '.json';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                      addToast('Profile exported.');
                    } catch (e) {
                      // Fallback: copy JSON to clipboard
                      copyTextToClipboard(json, addToast);
                    }
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '7px 12px' })
                }, '📤 Export profile'),

                h('button', {
                  onClick: function() {
                    // Use an invisible file input for the import
                    var inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = '.json,application/json';
                    inp.onchange = function(e) {
                      var file = e.target.files && e.target.files[0];
                      if (!file) return;
                      var reader = new FileReader();
                      reader.onload = function(ev) {
                        try {
                          var parsed = JSON.parse(ev.target.result);
                          if (parsed && parsed._format !== 'alloflow-typing-practice-profile') {
                            addToast('⚠️ Not a Typing Practice profile file.');
                            return;
                          }
                          if (typeof window !== 'undefined' && window.confirm &&
                              !window.confirm('Apply imported profile? Current accommodations, IEP goal, and audio theme will be replaced. Session history will NOT be affected.')) return;
                          var updates = {};
                          if (parsed.accommodations) updates.accommodations = Object.assign({}, DEFAULT_STATE.accommodations, parsed.accommodations);
                          if (parsed.audioTheme) updates.audioTheme = parsed.audioTheme;
                          if (parsed.iepGoal !== undefined) updates.iepGoal = parsed.iepGoal;
                          if (parsed.passagePrefs) updates.passagePrefs = Object.assign({}, DEFAULT_STATE.passagePrefs, parsed.passagePrefs);
                          if (typeof parsed.studentName === 'string') updates.studentName = parsed.studentName;
                          updMulti(updates);
                          addToast('✓ Profile imported.');
                        } catch (err) {
                          addToast('⚠️ Could not read profile: ' + (err.message || 'invalid JSON'));
                        }
                      };
                      reader.onerror = function() { addToast('⚠️ Could not read file.'); };
                      reader.readAsText(file);
                    };
                    inp.click();
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '7px 12px' })
                }, '📥 Import profile')
              ),

              // Full backup / restore — includes ALL data (sessions, bests,
              // aggregate errors, custom library, passage library, lifetime
              // totals). Distinct from profile which is just the settings.
              // Critical for localStorage disaster recovery and device moves.
              h('div', {
                style: {
                  marginTop: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid ' + palette.border
                }
              },
                h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '8px', fontStyle: 'italic', lineHeight: '1.5' } },
                  'Full backup includes sessions, personal best, mastery, error heatmap, and both libraries — the whole student record. Use this before clearing browser data or switching devices.'),
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  h('button', {
                    onClick: function() {
                      var backup = {
                        _format: 'alloflow-typing-practice-backup',
                        _version: 1,
                        _exported: new Date().toISOString(),
                        state: Object.assign({}, state)
                      };
                      try {
                        var json = JSON.stringify(backup, null, 2);
                        var blob = new Blob([json], { type: 'application/json' });
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        var stu = (state.studentName || 'student').replace(/[^a-z0-9_-]/gi, '_');
                        a.download = 'typing_backup_' + stu + '_' + new Date().toISOString().slice(0, 10) + '.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                        addToast('Full backup exported.');
                      } catch (e) {
                        addToast('⚠️ Backup failed: ' + (e.message || 'unknown error'));
                      }
                    },
                    style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '7px 12px' })
                  }, '💾 Full backup'),

                  h('button', {
                    onClick: function() {
                      var inp = document.createElement('input');
                      inp.type = 'file';
                      inp.accept = '.json,application/json';
                      inp.onchange = function(e) {
                        var file = e.target.files && e.target.files[0];
                        if (!file) return;
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                          try {
                            var parsed = JSON.parse(ev.target.result);
                            if (parsed && parsed._format !== 'alloflow-typing-practice-backup') {
                              addToast('⚠️ Not a Typing Practice backup file.');
                              return;
                            }
                            if (!parsed.state) { addToast('⚠️ Backup is empty or corrupted.'); return; }
                            var n = (parsed.state.sessions || []).length;
                            if (typeof window !== 'undefined' && window.confirm &&
                                !window.confirm('Restore backup? This will REPLACE the current student\'s data with the backup (' + n + ' sessions). You cannot undo this.')) return;
                            // Apply each key individually via updMulti so React state updates batch cleanly.
                            var safeKeys = Object.keys(DEFAULT_STATE);
                            var updates = {};
                            safeKeys.forEach(function(k) {
                              if (parsed.state.hasOwnProperty(k)) updates[k] = parsed.state[k];
                            });
                            // Reset the view to menu so student lands somewhere coherent
                            updates.view = 'menu';
                            updMulti(updates);
                            addToast('✓ Backup restored · ' + n + ' sessions loaded.');
                          } catch (err) {
                            addToast('⚠️ Could not read backup: ' + (err.message || 'invalid JSON'));
                          }
                        };
                        reader.onerror = function() { addToast('⚠️ Could not read file.'); };
                        reader.readAsText(file);
                      };
                      inp.click();
                    },
                    style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '7px 12px' })
                  }, '♻ Restore backup'),

                  // Clear all — last option, guarded.
                  h('button', {
                    onClick: function() {
                      if (typeof window !== 'undefined' && window.confirm) {
                        if (!window.confirm('Clear ALL typing practice data for this student? This erases sessions, personal best, mastery, error heatmap, both libraries, IEP goal, and motivation — everything. This cannot be undone. Export a backup first if you may want the data back.')) return;
                        if (!window.confirm('Are you absolutely sure? Last chance.')) return;
                      }
                      var wiped = Object.assign({}, DEFAULT_STATE);
                      wiped.view = 'menu';
                      updMulti(wiped);
                      addToast('All data cleared.');
                    },
                    style: Object.assign({}, secondaryBtnStyle(palette), {
                      fontSize: '11px', padding: '7px 12px',
                      borderColor: palette.danger, color: palette.danger
                    })
                  }, '🗑 Clear all data')
                )
              )
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
                  var tm = state.theme || 'default';

                  // Theme-flavored tier node styling. Same structural layout
                  // (flex column: icon, name, status, best, goal) but the
                  // decoration — border, shadow, shape, status-emoji — shifts
                  // per theme. Cleared/current nodes get the brightest look
                  // so the progression narrative reads at a glance.
                  var nodeStyle = {
                    flex: '1 1 110px',
                    minWidth: '110px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid ' + nodeColor,
                    background: cleared || current ? palette.bg : 'transparent',
                    opacity: locked ? 0.55 : 1,
                    position: 'relative',
                    transition: 'box-shadow 160ms ease'
                  };
                  var statusText = cleared ? '✓ cleared' : (current ? 'in progress' : (locked ? 'locked' : 'available'));

                  if (tm === 'cyberpunk') {
                    // Chip-like: sharp corners, neon glow when cleared
                    nodeStyle.borderRadius = '2px';
                    if (cleared) nodeStyle.boxShadow = '0 0 12px rgba(255,0,168,0.35), inset 0 0 8px rgba(255,0,168,0.15)';
                    if (current) nodeStyle.boxShadow = '0 0 8px rgba(255,0,168,0.25)';
                    statusText = cleared ? '[✓] COMPLETE'
                               : current ? '[>] ACTIVE'
                               : locked  ? '[x] LOCKED'
                               :           '[ ] AVAILABLE';
                  } else if (tm === 'steampunk') {
                    // Double-border like a brass plate; inset highlight
                    nodeStyle.boxShadow = cleared
                      ? 'inset 0 1px 0 rgba(255,220,150,0.25), 0 2px 6px rgba(60,30,10,0.4)'
                      : 'inset 0 1px 0 rgba(255,220,150,0.1)';
                    nodeStyle.borderStyle = cleared ? 'double' : 'solid';
                    nodeStyle.borderRadius = '6px';
                    statusText = cleared ? '⚙ forged'
                               : current ? '⚙ crafting'
                               : locked  ? '🔒 sealed'
                               :           '◯ ready';
                  } else if (tm === 'kawaii') {
                    // Very rounded like a sticker; soft pink glow
                    nodeStyle.borderRadius = '18px';
                    if (cleared) nodeStyle.boxShadow = '0 4px 12px rgba(232,90,138,0.25)';
                    if (current) nodeStyle.boxShadow = '0 3px 8px rgba(232,90,138,0.18)';
                    statusText = cleared ? '💕 done!'
                               : current ? '🌸 working'
                               : locked  ? '🔒 soon'
                               :           '✨ open';
                  } else if (tm === 'neutral') {
                    // Minimal — thin border, no shadow, square-ish
                    nodeStyle.borderRadius = '4px';
                    nodeStyle.border = '1px solid ' + nodeColor;
                    statusText = cleared ? 'cleared'
                               : current ? 'current'
                               : locked  ? 'locked'
                               :           'available';
                  }

                  return h('div', { key: 'tier-node-' + drillId, style: nodeStyle },
                    h('div', { style: { fontSize: '18px', marginBottom: '4px' } }, drill.icon),
                    h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.text, marginBottom: '2px' } }, drill.name),
                    h('div', { style: { fontSize: '10px', color: palette.textMute } }, statusText),
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
            state.baseline ? (function() {
              // Week-over-week trend: compare this-7-days avg to prior-7-days avg
              var now = Date.now();
              var d7 = 7 * 24 * 60 * 60 * 1000;
              var thisWk = allSessions.filter(function(s) { return now - new Date(s.date).getTime() < d7; });
              var prevWk = allSessions.filter(function(s) {
                var age = now - new Date(s.date).getTime();
                return age >= d7 && age < 2 * d7;
              });
              var avg = function(arr, k) {
                if (!arr || arr.length === 0) return null;
                return arr.reduce(function(a, s) { return a + (s[k] || 0); }, 0) / arr.length;
              };
              var wpmNow = avg(thisWk, 'wpm');
              var wpmPrev = avg(prevWk, 'wpm');
              var accNow = avg(thisWk, 'accuracy');
              var accPrev = avg(prevWk, 'accuracy');
              var wpmDelta = (wpmNow !== null && wpmPrev !== null) ? Math.round(wpmNow - wpmPrev) : null;
              var accDelta = (accNow !== null && accPrev !== null) ? Math.round(accNow - accPrev) : null;

              var renderDelta = function(delta, unit) {
                if (delta === null) return h('span', { style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', marginLeft: '6px' } }, 'no prior week');
                var arrow = delta > 1 ? '↑' : (delta < -1 ? '↓' : '→');
                var color = delta > 1 ? palette.success : (delta < -1 ? palette.warn : palette.textMute);
                var sign = delta > 0 ? '+' : '';
                return h('span', {
                  style: { fontSize: '10px', color: color, fontWeight: 700, marginLeft: '6px', fontVariantNumeric: 'tabular-nums' },
                  title: 'vs prior 7 days'
                }, arrow + ' ' + sign + delta + unit);
              };

              return h('div', {
                style: {
                  marginBottom: '24px',
                  padding: '16px',
                  background: palette.surface,
                  borderRadius: '12px',
                  border: '1px solid ' + palette.border
                }
              },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 700 } }, 'Baseline → current · all-time'),
                h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: thisWk.length > 0 ? '12px' : 0 } },
                  renderMetric('Baseline WPM', state.baseline.wpm, palette, state.theme),
                  renderMetric('Best WPM', getBestWpm(state), palette, state.theme),
                  renderMetric('Recent avg', getRecentAvg(allSessions, 'wpm'), palette, state.theme),
                  renderMetric('Recent acc', getRecentAvg(allSessions, 'accuracy') + '%', palette, state.theme)
                ),
                // Week-over-week trend strip — only renders when there's
                // this-week activity to compare against.
                thisWk.length > 0 ? h('div', {
                  style: {
                    fontSize: '11px',
                    color: palette.textDim,
                    paddingTop: '12px',
                    borderTop: '1px solid ' + palette.border,
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }
                },
                  h('span', { style: { color: palette.textMute, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.06em', fontWeight: 700 } }, 'Week vs prior week'),
                  h('span', null,
                    'WPM ', h('strong', { style: { color: palette.text, fontVariantNumeric: 'tabular-nums' } }, Math.round(wpmNow)),
                    renderDelta(wpmDelta, ' WPM')
                  ),
                  h('span', null,
                    'Accuracy ', h('strong', { style: { color: palette.text, fontVariantNumeric: 'tabular-nums' } }, Math.round(accNow) + '%'),
                    renderDelta(accDelta, '%')
                  ),
                  h('span', { style: { color: palette.textMute, fontSize: '10px' } },
                    thisWk.length + ' this week · ' + prevWk.length + ' last week')
                ) : null
              );
            })() : null,

            // IEP-goal hit-rate sparkline — one dot per session (up to 20),
            // green when the session met the goal, neutral when not. Gives a
            // clinician an instant read of "has the student been hitting the
            // goal consistently?" that's more defensible than a single
            // aggregate number.
            (state.iepGoal && state.iepGoal.targetWpm && allSessions.length > 0) ? (function() {
              var recent = allSessions.slice(-20);
              var metCount = recent.filter(function(s) { return s.goalMet; }).length;
              var rate = Math.round((metCount / recent.length) * 100);
              return h('div', {
                style: {
                  marginBottom: '24px',
                  padding: '16px',
                  background: palette.surface,
                  borderRadius: '12px',
                  border: '1px solid ' + palette.border
                }
              },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' } },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 } },
                    '🎯 IEP goal hit rate · last ' + recent.length + ' sessions'),
                  h('div', { style: { fontSize: '14px', color: palette.text, fontVariantNumeric: 'tabular-nums' } },
                    h('strong', { style: { color: rate >= 60 ? palette.success : (rate >= 30 ? palette.warn : palette.textDim) } },
                      metCount + '/' + recent.length),
                    ' · ',
                    h('strong', { style: { color: rate >= 60 ? palette.success : (rate >= 30 ? palette.warn : palette.textDim) } },
                      rate + '%')
                  )
                ),
                h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                  'Target: ' + state.iepGoal.targetWpm + ' WPM @ ' + state.iepGoal.targetAccuracy + '% · green dot = met, gray = not met. Oldest on the left.'),
                h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                  recent.map(function(s, i) {
                    return h('div', {
                      key: 'ghr-' + i,
                      title: new Date(s.date).toLocaleDateString() + ': ' + s.wpm + ' WPM / ' + s.accuracy + '% — ' + (s.goalMet ? 'met' : 'not met'),
                      'aria-label': 'Session ' + (i + 1) + ': ' + (s.goalMet ? 'goal met' : 'goal not met'),
                      style: {
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: s.goalMet ? palette.success : palette.surface2,
                        border: '1px solid ' + (s.goalMet ? palette.success : palette.border)
                      }
                    });
                  })
                )
              );
            })() : null,

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

              // Quick-date preset chips — one-click ranges for common IEP windows
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
                [
                  { id: 'all',   label: 'All', compute: function() { return { s: '', e: '' }; } },
                  { id: 'today', label: 'Today', compute: function() {
                      var t = new Date(); var iso = t.toISOString().slice(0, 10);
                      return { s: iso, e: iso };
                  }},
                  { id: 'week',  label: 'This week', compute: function() {
                      var t = new Date(); var day = t.getDay(); // 0 = Sunday
                      var start = new Date(t); start.setDate(t.getDate() - day);
                      return { s: start.toISOString().slice(0, 10), e: t.toISOString().slice(0, 10) };
                  }},
                  { id: 'month', label: 'This month', compute: function() {
                      var t = new Date();
                      var start = new Date(t.getFullYear(), t.getMonth(), 1);
                      return { s: start.toISOString().slice(0, 10), e: t.toISOString().slice(0, 10) };
                  }},
                  { id: 'last30',label: 'Last 30 days', compute: function() {
                      var t = new Date(); var start = new Date(t.getTime() - 30*24*60*60*1000);
                      return { s: start.toISOString().slice(0, 10), e: t.toISOString().slice(0, 10) };
                  }},
                  { id: 'last90',label: 'Last 90 days', compute: function() {
                      var t = new Date(); var start = new Date(t.getTime() - 90*24*60*60*1000);
                      return { s: start.toISOString().slice(0, 10), e: t.toISOString().slice(0, 10) };
                  }}
                ].map(function(preset) {
                  // Detect if this preset is currently active by comparing computed vs filter state
                  var r = preset.compute();
                  var isActive = filterStart === r.s && filterEnd === r.e;
                  return h('button', {
                    key: 'fpreset-' + preset.id,
                    onClick: function() {
                      setFilterStart(r.s);
                      setFilterEnd(r.e);
                      setSelectedDetailIdx(null);
                    },
                    style: {
                      padding: '5px 10px',
                      borderRadius: '999px',
                      border: '1px solid ' + (isActive ? palette.accent : palette.border),
                      background: isActive ? palette.accent : 'transparent',
                      color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, preset.label);
                })
              ),

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
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' } },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 } },
                  (function() {
                    var tm = state.theme || 'default';
                    var tail = compareMode ? ' · tap 2 bars to compare' : ' · tap a bar for details';
                    if (tm === 'steampunk') return 'Workshop ledger — last ' + trend.length + tail;
                    if (tm === 'cyberpunk') return '[RECENT RUNS · ' + trend.length + ']' + tail;
                    if (tm === 'kawaii')    return '🌸 Recent sessions · last ' + trend.length + tail;
                    if (tm === 'neutral')   return 'Last ' + trend.length + ' sessions' + tail;
                    return 'Recent sessions — last ' + trend.length + tail;
                  })()),
                h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
                  compareMode && compareSelections.length > 0 ? h('span', {
                    style: { fontSize: '10px', color: palette.textMute }
                  }, compareSelections.length + ' / 2 picked') : null,
                  h('button', {
                    onClick: function() {
                      if (compareMode) {
                        // Exiting compare mode — clear selection
                        setCompareMode(false);
                        setCompareSelections([]);
                      } else {
                        setCompareMode(true);
                        setSelectedDetailIdx(null); // avoid two modes at once
                      }
                    },
                    style: {
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid ' + (compareMode ? palette.accent : palette.border),
                      background: compareMode ? palette.accent : 'transparent',
                      color: compareMode ? (palette.onAccent || '#0f172a') : palette.textDim,
                      fontSize: '10px',
                      fontWeight: compareMode ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }
                  }, compareMode ? '✕ Exit compare' : '⇆ Compare')
                )
              ),
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
                  var isComparePick = compareMode && compareSelections.indexOf(s.date) !== -1;
                  return h('button', {
                    key: 'bar-' + i,
                    onClick: function() {
                      if (compareMode) {
                        // Toggle this session in the comparison selection (max 2)
                        var already = compareSelections.indexOf(s.date);
                        if (already !== -1) {
                          setCompareSelections(compareSelections.filter(function(d) { return d !== s.date; }));
                        } else if (compareSelections.length < 2) {
                          setCompareSelections(compareSelections.concat([s.date]));
                        } else {
                          // Replace oldest pick
                          setCompareSelections([compareSelections[1], s.date]);
                        }
                        return;
                      }
                      setSelectedDetailIdx(isSelected ? null : i);
                    },
                    'aria-label': 'Session ' + (i + 1) + ': ' + s.drillName + ', ' + s.wpm + ' WPM, ' + s.accuracy + ' percent accuracy' +
                      (isSelected ? ' (selected)' : '') + (isComparePick ? ' (chosen for comparison)' : ''),
                    title: s.drillName + ': ' + s.wpm + ' WPM / ' + s.accuracy + '%',
                    style: {
                      flex: 1,
                      minWidth: '8px',
                      height: h_ + 'px',
                      background: isComparePick ? palette.success : (isSelected ? palette.warn : palette.accent),
                      border: 'none',
                      borderRadius: '3px 3px 0 0',
                      opacity: (isSelected || isComparePick) ? 1 : (0.6 + (i / Math.max(trend.length - 1, 1)) * 0.4),
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
                        fontFamily: 'inherit'
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
                  d.goalMet ? h('div', { style: { color: palette.success, fontSize: '11px', fontWeight: 600 } }, '🎯 IEP goal met' + (d.firstGoalMet ? ' (first time)' : '')) : null,

                  // Retrospective editing — a clinician or student can edit
                  // note / tag / reflection after the session ends. Useful when
                  // reviewing a session later and wanting to add context
                  // ("student was fighting a headache" etc.).
                  h('div', {
                    style: {
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid ' + palette.border
                    }
                  },
                    h('div', { style: { fontSize: '10px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 } },
                      'Edit session'),

                    // Tag row
                    h('div', { style: { marginBottom: '8px' } },
                      h('div', { style: { fontSize: '10px', color: palette.textMute, marginBottom: '4px' } }, 'Clinician tag'),
                      h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                        [
                          { id: null,             label: 'None' },
                          { id: 'baseline',       label: '📍 Baseline' },
                          { id: 'progress-check', label: '📈 Progress' },
                          { id: 'assessment',     label: '📊 Assessment' },
                          { id: 'practice',       label: '✏️ Practice' }
                        ].map(function(opt) {
                          var isActive = (d.tag || null) === opt.id;
                          return h('button', {
                            key: 'retag-' + (opt.id || 'none'),
                            onClick: function() { updateSessionField(d.date, 'tag', opt.id); },
                            style: {
                              padding: '3px 8px',
                              borderRadius: '999px',
                              border: '1px solid ' + (isActive ? palette.accent : palette.border),
                              background: isActive ? palette.accent : 'transparent',
                              color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                              fontSize: '10px',
                              fontWeight: isActive ? 700 : 500,
                              cursor: 'pointer',
                              fontFamily: 'inherit'
                            }
                          }, opt.label);
                        })
                      )
                    ),

                    // Reflection row
                    h('div', { style: { marginBottom: '8px' } },
                      h('div', { style: { fontSize: '10px', color: palette.textMute, marginBottom: '4px' } }, 'How it felt'),
                      h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                        [
                          { id: null,         label: 'No tag' },
                          { id: 'too-easy',   label: '🌱 Too easy' },
                          { id: 'just-right', label: '😌 Just right' },
                          { id: 'hard',       label: '💪 Hard' }
                        ].map(function(opt) {
                          var isActive = (d.reflection || null) === opt.id;
                          return h('button', {
                            key: 'rerefl-' + (opt.id || 'none'),
                            onClick: function() { updateSessionField(d.date, 'reflection', opt.id); },
                            style: {
                              padding: '3px 8px',
                              borderRadius: '999px',
                              border: '1px solid ' + (isActive ? palette.accent : palette.border),
                              background: isActive ? palette.accent : 'transparent',
                              color: isActive ? (palette.onAccent || '#0f172a') : palette.textDim,
                              fontSize: '10px',
                              fontWeight: isActive ? 700 : 500,
                              cursor: 'pointer',
                              fontFamily: 'inherit'
                            }
                          }, opt.label);
                        })
                      )
                    ),

                    // Note — editable inline; saves on blur or Ctrl+Enter
                    h('div', null,
                      h('div', { style: { fontSize: '10px', color: palette.textMute, marginBottom: '4px' } }, 'Session note'),
                      h('textarea', {
                        defaultValue: d.note || '',
                        placeholder: 'Add or edit a note. Saves on blur or Ctrl+Enter.',
                        maxLength: 400,
                        rows: 2,
                        onBlur: function(e) {
                          var v = (e.target.value || '').trim();
                          if (v !== (d.note || '')) updateSessionField(d.date, 'note', v || null);
                        },
                        onKeyDown: function(e) {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.target.blur();
                          }
                        },
                        style: {
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: palette.surface,
                          border: '1px solid ' + palette.border,
                          color: palette.text,
                          fontSize: '11px',
                          fontFamily: fontFamily,
                          lineHeight: '1.5',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }
                      })
                    )
                  )
                );
              })() : null,

              // Session A vs B comparison panel — appears when 2 sessions are
              // selected in compare mode. Shows stats side-by-side with delta
              // column so a clinician can paste "went from X to Y" numbers
              // straight into a progress note.
              (compareMode && compareSelections.length === 2) ? (function() {
                var dateA = compareSelections[0], dateB = compareSelections[1];
                var a = (state.sessions || []).filter(function(s) { return s.date === dateA; })[0];
                var b = (state.sessions || []).filter(function(s) { return s.date === dateB; })[0];
                if (!a || !b) return null;
                // Order: older on left, newer on right (conventional "before → after")
                if (new Date(a.date) > new Date(b.date)) { var t = a; a = b; b = t; }

                var row = function(label, valueA, valueB, delta, isPercent, higherIsBetter) {
                  var deltaColor = palette.textMute;
                  if (delta !== null) {
                    if (higherIsBetter === true) deltaColor = delta > 0 ? palette.success : (delta < 0 ? palette.danger : palette.textMute);
                    else if (higherIsBetter === false) deltaColor = delta > 0 ? palette.danger : (delta < 0 ? palette.success : palette.textMute);
                  }
                  var deltaStr = delta === null ? '—' : (delta > 0 ? '+' : '') + delta + (isPercent ? '%' : '');
                  return h('tr', { key: 'cmp-' + label },
                    h('td', { style: { padding: '4px 8px', color: palette.textMute, fontSize: '11px' } }, label),
                    h('td', { style: { padding: '4px 8px', color: palette.text, fontVariantNumeric: 'tabular-nums', textAlign: 'right' } }, valueA),
                    h('td', { style: { padding: '4px 8px', color: palette.text, fontVariantNumeric: 'tabular-nums', textAlign: 'right' } }, valueB),
                    h('td', { style: { padding: '4px 8px', color: deltaColor, fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 700 } }, deltaStr)
                  );
                };

                return h('div', {
                  style: {
                    marginTop: '12px',
                    padding: '14px',
                    background: palette.bg,
                    border: '1px solid ' + palette.success,
                    borderRadius: '10px'
                  }
                },
                  h('div', { style: { fontSize: '11px', color: palette.success, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 700 } },
                    '⇆ Session comparison (older → newer)'),
                  h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } },
                    h('thead', null,
                      h('tr', null,
                        h('th', { style: { padding: '4px 8px', textAlign: 'left', fontSize: '10px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Metric'),
                        h('th', { style: { padding: '4px 8px', textAlign: 'right', fontSize: '10px', color: palette.textMute } },
                          new Date(a.date).toLocaleDateString() + (a.tag ? ' · ' + a.tag : '')),
                        h('th', { style: { padding: '4px 8px', textAlign: 'right', fontSize: '10px', color: palette.textMute } },
                          new Date(b.date).toLocaleDateString() + (b.tag ? ' · ' + b.tag : '')),
                        h('th', { style: { padding: '4px 8px', textAlign: 'right', fontSize: '10px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Δ')
                      )
                    ),
                    h('tbody', null,
                      row('Drill', (DRILLS[a.drillId] ? DRILLS[a.drillId].name : a.drillId), (DRILLS[b.drillId] ? DRILLS[b.drillId].name : b.drillId), null, false, null),
                      row('WPM', a.wpm, b.wpm, b.wpm - a.wpm, false, true),
                      row('Accuracy', a.accuracy + '%', b.accuracy + '%', b.accuracy - a.accuracy, true, true),
                      row('Duration (s)', a.durationSec, b.durationSec, b.durationSec - a.durationSec, false, null),
                      row('Errors', a.errors || 0, b.errors || 0, (b.errors || 0) - (a.errors || 0), false, false),
                      row('Paused (s)', a.pausedSec || 0, b.pausedSec || 0, (b.pausedSec || 0) - (a.pausedSec || 0), false, null),
                      row('Accommodations', (a.accommodationsUsed || []).length, (b.accommodationsUsed || []).length, ((b.accommodationsUsed || []).length) - ((a.accommodationsUsed || []).length), false, null)
                    )
                  ),
                  (a.note || b.note) ? h('div', {
                    style: { marginTop: '10px', paddingTop: '8px', borderTop: '1px solid ' + palette.border, fontSize: '11px', color: palette.textDim }
                  },
                    a.note ? h('div', { style: { marginBottom: '4px' } },
                      h('span', { style: { color: palette.textMute, fontWeight: 600 } }, 'A note: '),
                      h('em', null, '"' + a.note + '"')
                    ) : null,
                    b.note ? h('div', null,
                      h('span', { style: { color: palette.textMute, fontWeight: 600 } }, 'B note: '),
                      h('em', null, '"' + b.note + '"')
                    ) : null
                  ) : null,
                  h('div', {
                    style: { fontSize: '10px', color: palette.textMute, marginTop: '8px', fontStyle: 'italic' }
                  }, 'Green Δ = improvement · red = regression · gray = no judgment applied (duration, accommodations count).')
                );
              })() : null
            ) : null,

            // Per-key error heatmap + finger-group breakdown + coaching
            (function() {
              var agg = state.aggregateErrors || {};
              var keys = Object.keys(agg);
              if (keys.length === 0) return null;
              var maxErr = keys.reduce(function(m, k) { return Math.max(m, agg[k] || 0); }, 1);
              var analysis = analyzeErrorPatterns(agg);
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
                  (function() {
                    var tm = state.theme || 'default';
                    if (tm === 'steampunk') return '⚙ Grand gear-snag atlas · all-time · ' + analysis.totalErrors + ' total';
                    if (tm === 'cyberpunk') return '[ERROR HEATMAP · ALL-TIME · ' + analysis.totalErrors + ']';
                    if (tm === 'kawaii')    return '🌸 Tricky-key map · all-time · ' + analysis.totalErrors + ' total 💕';
                    if (tm === 'neutral')   return 'Error heatmap · all-time · ' + analysis.totalErrors;
                    return 'Error heatmap · all-time · ' + analysis.totalErrors + ' total errors';
                  })()),
                h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                  (function() {
                    var tm = state.theme || 'default';
                    if (tm === 'steampunk') return 'Deeper shades mark the snags. This is no reproach — it is the workshop map that shows where effort earns its return.';
                    if (tm === 'cyberpunk') return '[LEGEND] deeper shade :: higher error density :: targeted practice → delta ↓';
                    if (tm === 'kawaii')    return 'Darker = more practice needed — and that\'s okay! 💕 This map just shows where you\'ll grow the fastest. ✨';
                    if (tm === 'neutral')   return 'Darker = higher error rate. Targeted practice yields compounding gains.';
                    return 'Darker red = more errors on that key. This isn\'t shame data — it\'s the map that shows where practice pays off.';
                  })()),
                renderErrorHeatmap(agg, maxErr, palette),

                // Finger-group stacked bar: shows which finger owns the errors
                analysis.totalErrors > 0 ? h('div', {
                  style: { marginTop: '16px' }
                },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '6px', fontWeight: 600 } }, (function() {
                    var tm = state.theme || 'default';
                    if (tm === 'steampunk') return 'Snags by finger';
                    if (tm === 'cyberpunk') return '[ERR-BY-FINGER]';
                    if (tm === 'kawaii')    return '🌸 Errors by finger';
                    if (tm === 'neutral')   return 'Errors by finger';
                    return 'Errors by finger';
                  })()),
                  renderFingerErrorBar(analysis.fingerCounts, analysis.totalErrors, palette)
                ) : null,

                // Coaching hints — specific, actionable, non-judgmental
                analysis.hints.length > 0 ? h('div', {
                  style: {
                    marginTop: '16px',
                    padding: '12px 14px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    borderLeft: '3px solid ' + palette.accent,
                    borderRadius: '8px'
                  }
                },
                  h('div', { style: { fontSize: '11px', color: palette.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } }, '🧭 Coaching'),
                  h('ul', { style: { margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: palette.textDim, lineHeight: '1.6' } },
                    analysis.hints.map(function(hint, idx) {
                      return h('li', { key: 'hint-' + idx, style: { marginBottom: '4px' } }, hint);
                    })
                  ),
                  // Recommended drill — closes diagnosis → intervention loop
                  analysis.recommendedDrill && DRILLS[analysis.recommendedDrill.id] ? h('div', {
                    style: {
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid ' + palette.border,
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }
                  },
                    h('div', { style: { fontSize: '11px', color: palette.textDim, flex: '1 1 200px' } },
                      h('strong', { style: { color: palette.text } }, '🎯 Recommended drill: '),
                      DRILLS[analysis.recommendedDrill.id].name + ' — ' + analysis.recommendedDrill.reason
                    ),
                    // Only enable the button if the recommended drill is unlocked
                    (function() {
                      var recDrill = DRILLS[analysis.recommendedDrill.id];
                      var recUnlocked = !recDrill.locked || state.masteryLevel >= recDrill.tier;
                      return h('button', {
                        disabled: !recUnlocked,
                        onClick: function() { if (recUnlocked) startDrill(analysis.recommendedDrill.id); },
                        style: Object.assign({}, primaryBtnStyle(palette), {
                          fontSize: '11px', padding: '6px 12px',
                          opacity: recUnlocked ? 1 : 0.5,
                          cursor: recUnlocked ? 'pointer' : 'not-allowed'
                        }),
                        title: recUnlocked ? 'Start this drill now' : 'Unlock it by clearing earlier tiers first'
                      }, recUnlocked ? 'Try it' : '🔒 Locked');
                    })()
                  ) : null
                ) : null
              );
            })(),

            // Practice calendar — 30-day grid colored by session intensity.
            // Uses ALL sessions (not filtered) because "when did I practice"
            // is inherently calendar-scoped, not filter-scoped.
            allSessions.length > 0 ? h('div', {
              style: {
                marginBottom: '24px',
                padding: '16px',
                background: palette.surface,
                borderRadius: '12px',
                border: '1px solid ' + palette.border
              }
            },
              h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 } },
                'Practice calendar · last 30 days'),
              renderPracticeCalendar(allSessions, palette)
            ) : null,

            // Scrollable drill history — every filtered session, newest first.
            // Shows drill name, WPM/acc, duration, reflection emoji, and the
            // first ~60 chars of any note. Clinical audit trail in one place.
            sessions.length > 0 ? (function() {
              // Apply note-query filter on top of the main filter set.
              var q = (noteQuery || '').trim().toLowerCase();
              var historySessions = q
                ? sessions.filter(function(s) {
                    return (s.note || '').toLowerCase().indexOf(q) !== -1;
                  })
                : sessions;
              return h('div', {
                style: {
                  marginBottom: '24px',
                  padding: '16px',
                  background: palette.surface,
                  borderRadius: '12px',
                  border: '1px solid ' + palette.border
                }
              },
              h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' } },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 } },
                  'Drill history · ' + historySessions.length + (q ? ' matching' : (filterActive ? ' filtered' : ' sessions'))),
                h('input', {
                  type: 'search',
                  value: noteQuery,
                  onChange: function(e) { setNoteQuery(e.target.value); },
                  placeholder: '🔎 Search notes…',
                  style: {
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: palette.bg,
                    border: '1px solid ' + palette.border,
                    color: palette.text,
                    fontSize: '11px',
                    fontFamily: fontFamily,
                    minWidth: '160px',
                    flex: '0 1 auto'
                  }
                }),
                q && historySessions.length === 0 ? h('span', { style: { fontSize: '10px', color: palette.warn, fontStyle: 'italic' } }, 'No matches') : null
              ),
              h('div', {
                role: 'list',
                style: {
                  maxHeight: '320px',
                  overflowY: 'auto',
                  border: '1px solid ' + palette.border,
                  borderRadius: '8px',
                  background: palette.bg
                }
              },
                historySessions.slice().reverse().map(function(s, idx) {
                  var reflectionEmoji = s.reflection === 'hard' ? '💪'
                                      : s.reflection === 'just-right' ? '😌'
                                      : s.reflection === 'too-easy' ? '🌱'
                                      : '';
                  var badges = [];
                  if (s.tag === 'baseline')       badges.push('📍 baseline tag');
                  if (s.tag === 'progress-check') badges.push('📈 progress');
                  if (s.tag === 'assessment')     badges.push('📊 assessment');
                  if (s.tag === 'practice')       badges.push('✏️ practice');
                  if (s.isBaseline) badges.push('📍 baseline');
                  if (s.goalMet) badges.push(s.firstGoalMet ? '🎯 1st goal met' : '🎯 goal met');
                  if (s.isNewBest) badges.push('⭐ PB');
                  if (s.masteryAdvanced) badges.push('🌟 tier ↑');
                  return h('div', {
                    key: 'hist-' + idx,
                    role: 'listitem',
                    style: {
                      padding: '10px 12px',
                      borderBottom: idx === historySessions.length - 1 ? 'none' : '1px solid ' + palette.border,
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      fontSize: '12px'
                    }
                  },
                    // Left: drill + date
                    h('div', { style: { flex: '0 0 140px', color: palette.textDim } },
                      h('div', { style: { fontWeight: 600, color: palette.text, lineHeight: '1.4' } },
                        (DRILLS[s.drillId] ? DRILLS[s.drillId].icon + ' ' : '') + (s.drillName || s.drillId)),
                      h('div', { style: { fontSize: '10px', color: palette.textMute } },
                        new Date(s.date).toLocaleDateString() + ' · ' + new Date(s.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
                    ),
                    // Middle: metrics
                    h('div', {
                      style: {
                        flex: '0 0 130px',
                        fontVariantNumeric: 'tabular-nums',
                        color: palette.textDim
                      }
                    },
                      h('div', null,
                        h('span', { style: { fontWeight: 700, color: palette.text } }, s.wpm + ' WPM'),
                        ' · ', s.accuracy + '%'
                      ),
                      h('div', { style: { fontSize: '10px', color: palette.textMute } },
                        formatDuration(s.durationSec) +
                        (s.pausedSec ? ' · paused ' + formatDuration(s.pausedSec) : '') +
                        (s.errors ? ' · ' + s.errors + ' err' : '')
                      )
                    ),
                    // Right: badges + reflection + note preview
                    h('div', { style: { flex: 1, color: palette.textDim, lineHeight: '1.5' } },
                      badges.length > 0 ? h('div', { style: { fontSize: '10px', color: palette.success, marginBottom: '2px' } }, badges.join(' · ')) : null,
                      reflectionEmoji ? h('span', { style: { marginRight: '4px' }, title: 'felt: ' + s.reflection }, reflectionEmoji) : null,
                      s.note ? h('span', { style: { fontStyle: 'italic', color: palette.textMute } },
                        '"' + (s.note.length > 70 ? s.note.slice(0, 70) + '…' : s.note) + '"') : null,
                      (!badges.length && !reflectionEmoji && !s.note) ? h('span', { style: { color: palette.textMute, fontStyle: 'italic' } }, '—') : null
                    )
                  );
                })
              )
              );
            })() : null,

            // Per-drill error breakdown — splits the global heatmap by drill
            // so clinicians see which keys miss on which drill specifically.
            // Only shows drills with ≥3 sessions (avoids single-session noise).
            (function() {
              var perDrill = computePerDrillErrors(allSessions);
              var drillIds = Object.keys(perDrill).sort(function(a, b) {
                return perDrill[b].total - perDrill[a].total;
              });
              if (drillIds.length < 2) return null; // skip if only 1 drill has data
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
                  'Top error keys by drill · all-time'),
                h('p', { style: { fontSize: '11px', color: palette.textMute, margin: '0 0 10px 0', lineHeight: '1.5' } },
                  'Different drills surface different weaknesses. Use this to pick drills that target specific problem keys.'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                  drillIds.map(function(drillId) {
                    var drill = DRILLS[drillId];
                    var rec = perDrill[drillId];
                    var topKeys = Object.keys(rec.chars)
                      .filter(function(k) { return rec.chars[k] > 0; })
                      .sort(function(a, b) { return rec.chars[b] - rec.chars[a]; })
                      .slice(0, 5);
                    return h('div', {
                      key: 'pderr-' + drillId,
                      style: {
                        padding: '10px 12px',
                        background: palette.bg,
                        border: '1px solid ' + palette.border,
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                      }
                    },
                      h('div', { style: { fontSize: '12px', fontWeight: 600, color: palette.text, flex: '0 0 160px' } },
                        (drill ? drill.icon + '  ' + drill.name : drillId) + ' ',
                        h('span', { style: { fontSize: '10px', color: palette.textMute, fontWeight: 400 } },
                          '· ' + rec.sessionCount + 'x · ' + rec.total + ' errors')
                      ),
                      h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                        topKeys.map(function(k) {
                          return h('span', {
                            key: 'pdk-' + drillId + '-' + k,
                            style: {
                              padding: '3px 7px',
                              borderRadius: '4px',
                              background: palette.surface,
                              border: '1px solid ' + palette.border,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontSize: '11px',
                              color: palette.text
                            }
                          },
                            h('strong', { style: { textTransform: 'uppercase' } }, k),
                            h('span', { style: { color: palette.textMute, marginLeft: '4px', fontSize: '10px' } },
                              rec.chars[k])
                          );
                        })
                      )
                    );
                  })
                )
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
                      color: palette.onAccent,
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
                  onClick: function() {
                    var report = buildIEPReport(state, filterOpts);
                    printIEPReport(report, state.studentName || '');
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    fontSize: '11px',
                    padding: '7px 12px'
                  })
                }, '🖨 Print report'),
                h('button', {
                  onClick: function() { downloadSessionsCSV(state, filterOpts); },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    fontSize: '11px',
                    padding: '7px 12px'
                  })
                }, '📥 Download CSV'),
                h('button', {
                  onClick: function() {
                    var summary = buildParentSummary(state);
                    copyTextToClipboard(summary, addToast);
                  },
                  style: Object.assign({}, secondaryBtnStyle(palette), {
                    fontSize: '11px',
                    padding: '7px 12px'
                  }),
                  title: 'Copy a 2-4 sentence plain-language summary for a parent email'
                }, '📧 Parent summary')
              )
            ) : null,

            // Empty states: no sessions at all vs. sessions exist but filter excludes them all
            (sessions.length === 0 && allSessions.length === 0) ? h('div', {
              style: {
                background: palette.surface,
                border: '1px dashed ' + palette.border,
                borderRadius: '10px',
                padding: '20px',
                color: palette.textMute,
                fontSize: '13px',
                textAlign: 'center'
              }
            }, 'Complete your first drill to see your baseline, trend, and IEP report here.') : null,

            (sessions.length === 0 && allSessions.length > 0) ? h('div', {
              style: {
                background: palette.surface,
                border: '1px dashed ' + palette.border,
                borderRadius: '10px',
                padding: '20px',
                color: palette.textMute,
                fontSize: '13px',
                textAlign: 'center',
                lineHeight: '1.5'
              }
            },
              h('div', { style: { marginBottom: '10px' } }, '🔎 No sessions match the current filter.'),
              h('div', { style: { fontSize: '12px' } }, 'All ' + allSessions.length + ' sessions are outside this date range or drill filter.'),
              h('button', {
                onClick: function() { setFilterStart(''); setFilterEnd(''); setFilterDrill(''); setSelectedDetailIdx(null); },
                style: Object.assign({}, secondaryBtnStyle(palette), { marginTop: '10px', fontSize: '11px', padding: '6px 12px' })
              }, '✕ Clear filters')
            ) : null
          );
        }

        // ═════════════════════════════════════════════════════
        // VIEW: SHORTCUTS — keyboard-navigation reference card.
        // ═════════════════════════════════════════════════════
        // ═════════════════════════════════════════════════════
        // VIEW: ACHIEVEMENTS — scrollable log of earned lifetime milestones
        // with dates where available. Read-only; purely celebratory.
        // ═════════════════════════════════════════════════════
        function renderAchievements() {
          var earned = normalizeMilestonesEarned(state.milestonesEarned);
          // Sort newest-first when dates exist; legacy (no date) entries go last.
          earned.sort(function(a, b) {
            if (a.date && b.date) return b.date.localeCompare(a.date);
            if (a.date) return -1;
            if (b.date) return 1;
            return 0;
          });
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
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, (function() {
              var tm = state.theme || 'default';
              if (tm === 'steampunk') return '⚙  Workshop Honours';
              if (tm === 'cyberpunk') return '[ACHIEVEMENTS]';
              if (tm === 'kawaii')    return '🏅✨ Achievements';
              if (tm === 'neutral')   return 'Achievements';
              return '🏅  Achievements';
            })()),
            h('p', { style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' } },
              (function() {
                var tm = state.theme || 'default';
                if (earned.length > 0) {
                  if (tm === 'steampunk') return 'You\'ve been inscribed in the ledger for ' + earned.length + ' milestone' + (earned.length === 1 ? '' : 's') + '. Once entered, never struck.';
                  if (tm === 'cyberpunk') return '[EARNED] ' + earned.length + ' milestone' + (earned.length === 1 ? '' : 's') + ' :: write-once :: no rollback';
                  if (tm === 'kawaii')    return 'You\'ve earned ' + earned.length + ' milestone' + (earned.length === 1 ? '' : 's') + '! 💕 Once earned, always yours. ✨';
                  if (tm === 'neutral')   return earned.length + ' milestone' + (earned.length === 1 ? '' : 's') + ' earned. Additive; not revoked.';
                  return 'You\'ve earned ' + earned.length + ' milestone' + (earned.length === 1 ? '' : 's') + '. Additive only — achievements are never taken away.';
                }
                if (tm === 'steampunk') return 'The ledger stands blank — your first session shall inscribe the opening entry. Steady hands compound.';
                if (tm === 'cyberpunk') return '[EMPTY] :: first session unlocks first node :: cadence > speed';
                if (tm === 'kawaii')    return '🌸 No milestones yet — your first session will unlock one! Small steps, big hearts. 💕';
                if (tm === 'neutral')   return 'No milestones yet. First session unlocks one.';
                return 'No milestones earned yet — your first session will unlock one. Consistent practice compounds.';
              })()
            ),

            earned.length > 0 ? h('div', {
              role: 'list',
              style: { display: 'flex', flexDirection: 'column', gap: '8px' }
            },
              earned.map(function(entry) {
                var ms = MILESTONES.filter(function(x) { return x.id === entry.id; })[0];
                if (!ms) return null;
                var tm = state.theme || 'default';
                var rowStyle = {
                  padding: '12px 14px',
                  background: palette.surface,
                  border: '1px solid ' + palette.success,
                  borderLeft: '3px solid ' + palette.success,
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                };
                if (tm === 'steampunk') {
                  rowStyle.background = 'linear-gradient(90deg, ' + palette.surface + ' 0%, ' + palette.surface2 + ' 100%)';
                  rowStyle.borderLeftWidth = '4px';
                  rowStyle.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
                } else if (tm === 'cyberpunk') {
                  rowStyle.background = palette.bg;
                  rowStyle.border = '1px solid ' + palette.accent;
                  rowStyle.borderLeft = '3px solid ' + palette.success;
                  rowStyle.borderRadius = '2px';
                } else if (tm === 'kawaii') {
                  rowStyle.borderRadius = '18px';
                  rowStyle.border = '1px solid ' + palette.success;
                  rowStyle.borderLeft = '1px solid ' + palette.success;
                  rowStyle.boxShadow = '0 2px 10px rgba(0,0,0,0.04)';
                } else if (tm === 'neutral') {
                  rowStyle.borderRadius = '6px';
                }
                return h('div', {
                  key: 'ach-' + entry.id,
                  role: 'listitem',
                  style: rowStyle
                },
                  h('div', { style: { fontSize: '14px', color: palette.text, fontWeight: 600 } }, ms.label),
                  h('div', { style: { fontSize: '11px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
                    entry.date ? new Date(entry.date).toLocaleDateString() : 'earned'
                  )
                );
              })
            ) : null,

            // Not-yet-earned preview — positive-framed ("coming up") so students
            // see what's achievable without it being a guilt-based checklist.
            (function() {
              var earnedIds = earned.map(function(e) { return e.id; });
              var remaining = MILESTONES.filter(function(m) { return earnedIds.indexOf(m.id) === -1; });
              if (remaining.length === 0) return null;
              var tm = state.theme || 'default';
              var headerText;
              if (tm === 'steampunk') headerText = 'On the horizon · ' + remaining.length + ' honour' + (remaining.length === 1 ? '' : 's') + ' awaiting';
              else if (tm === 'cyberpunk') headerText = '[QUEUED] ' + remaining.length + ' node' + (remaining.length === 1 ? '' : 's') + ' :: pending unlock';
              else if (tm === 'kawaii') headerText = '✨ Coming up · ' + remaining.length + ' milestone' + (remaining.length === 1 ? '' : 's') + ' waiting to be yours 💕';
              else if (tm === 'neutral') headerText = 'Pending: ' + remaining.length + ' milestone' + (remaining.length === 1 ? '' : 's');
              else headerText = 'Coming up · ' + remaining.length + ' milestone' + (remaining.length === 1 ? '' : 's') + ' ahead';

              var footerText;
              if (tm === 'steampunk') footerText = 'No hourglass, no tolls. Each honour is inscribed when the figures warrant it.';
              else if (tm === 'cyberpunk') footerText = '[NO-CLOCK] :: [NO-STREAK] :: nodes trigger on threshold match';
              else if (tm === 'kawaii') footerText = '🌸 No deadlines, no streaks — just you being you. They unlock when they unlock! 💕';
              else if (tm === 'neutral') footerText = 'Threshold-triggered. No time pressure.';
              else footerText = 'No deadlines. No streak required. They unlock whenever the numbers add up.';

              var chipBase = {
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'transparent',
                border: '1px dashed ' + palette.border,
                color: palette.textMute,
                fontSize: '11px'
              };
              if (tm === 'cyberpunk') { chipBase.borderRadius = '2px'; chipBase.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'; }
              else if (tm === 'kawaii') { chipBase.borderStyle = 'solid'; chipBase.borderRadius = '999px'; }
              else if (tm === 'steampunk') { chipBase.borderStyle = 'solid'; chipBase.borderColor = palette.accentDim || palette.border; }

              return h('div', {
                style: {
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid ' + palette.border
                }
              },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 } },
                  headerText),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                  remaining.map(function(m) {
                    return h('span', {
                      key: 'up-' + m.id,
                      style: chipBase
                    }, m.label);
                  })
                ),
                h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '10px', fontStyle: 'italic' } },
                  footerText)
              );
            })()
          );
        }

        function renderShortcuts() {
          var rows = [
            { heading: 'On the menu', items: [
              { keys: ['Tab', 'Shift+Tab'], desc: 'Move between drill cards and nav buttons' },
              { keys: ['Enter', 'Space'],   desc: 'Activate the focused drill card' }
            ]},
            { heading: 'On the drill intro screen', items: [
              { keys: ['Space', 'Enter'], desc: 'Start the drill' },
              { keys: ['Esc'],            desc: 'Back to menu' }
            ]},
            { heading: 'While drilling', items: [
              { keys: ['Any letter/number/symbol'], desc: 'Types the next character' },
              { keys: ['Backspace'],               desc: 'Undo last character' },
              { keys: ['Esc'],                     desc: 'Abandon drill (progress won\'t save)' }
            ]},
            { heading: 'On any screen with a form', items: [
              { keys: ['Tab'],   desc: 'Move to next field / button' },
              { keys: ['Enter'], desc: 'Activate focused button (context-dependent)' }
            ]}
          ];
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
            h('h3', { style: { margin: '16px 0 4px 0', color: palette.text } }, '⌨️  Keyboard shortcuts'),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '12px', color: palette.textMute, lineHeight: '1.5' }
            }, 'Everything in Typing Practice can be reached with the keyboard — that\'s by design for screen-reader users and motor-planning accommodations.'),

            rows.map(function(section, sidx) {
              return h('div', {
                key: 'sh-' + sidx,
                style: {
                  marginBottom: '18px',
                  padding: '14px',
                  background: palette.surface,
                  borderRadius: '10px',
                  border: '1px solid ' + palette.border
                }
              },
                h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 700 } },
                  section.heading),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                  section.items.map(function(item, i) {
                    return h('div', {
                      key: 'sh-' + sidx + '-' + i,
                      style: { display: 'flex', gap: '10px', fontSize: '12px', alignItems: 'flex-start' }
                    },
                      h('div', { style: { flex: '0 0 180px', display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                        item.keys.map(function(k, ki) {
                          return h('kbd', {
                            key: 'k-' + ki,
                            style: {
                              padding: '2px 8px',
                              background: palette.bg,
                              border: '1px solid ' + palette.border,
                              borderRadius: '4px',
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: '11px',
                              color: palette.text
                            }
                          }, k);
                        })
                      ),
                      h('div', { style: { flex: 1, color: palette.textDim, lineHeight: '1.5' } }, item.desc)
                    );
                  })
                )
              );
            }),

            h('p', {
              style: { fontSize: '11px', color: palette.textMute, lineHeight: '1.5', marginTop: '20px', fontStyle: 'italic' }
            }, 'Accommodation toggles on the drill-intro screen are fully keyboard-reachable via Tab — no mouse required for any part of this tool.')
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
          case 'custom-setup':   viewContent = renderCustomSetup(); break;
          case 'shortcuts':      viewContent = renderShortcuts(); break;
          case 'achievements':   viewContent = renderAchievements(); break;
          case 'menu':
          default:               viewContent = renderMenu();
        }
        // Single .tp-root wrapper so CSS focus-ring targeting hits every
        // interactive descendant without per-element annotation. Also hosts
        // a visually-hidden aria-live region for milestone announcements.
        // Derive lang for the tool root from the active AI-passage language,
        // or default to 'en'. Matters for screen-reader pronunciation.
        var rootLang = (state.aiPassage && state.aiPassage.language) || 'en';
        return h('div', {
          className: 'tp-root tp-theme-' + (state.theme || 'default'),
          lang: rootLang,
          style: {
            background: rootBackground,
            minHeight: '100%',
            color: palette.text,
            fontFamily: fontFamily
          }
        },
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

  // Stat card style — accepts optional themeName so menu stat cards can pick
  // up theme personality (squared + border-y for cyberpunk, rounded with
  // soft shadow for kawaii, brass-plate for steampunk, etc.). Default and
  // neutral keep the existing minimal look.
  function statCardStyle(palette, themeName) {
    var base = {
      flex: '1 1 120px',
      background: palette.surface,
      border: '1px solid ' + palette.border,
      borderRadius: '10px',
      padding: '12px 16px',
      position: 'relative'
    };
    if (themeName === 'steampunk') {
      // brass plate — double-style border + inset warm highlight
      base.borderStyle = 'double';
      base.borderWidth = '3px';
      base.boxShadow = 'inset 0 1px 0 rgba(255,220,150,0.12)';
      base.borderRadius = '6px';
    } else if (themeName === 'cyberpunk') {
      // chip / terminal readout — sharper corners + accent side-bar
      base.borderRadius = '2px';
      base.borderLeft = '3px solid ' + palette.accent;
    } else if (themeName === 'kawaii') {
      // sticker card — extra rounded + soft colored shadow
      base.borderRadius = '18px';
      base.boxShadow = '0 3px 10px rgba(232,90,138,0.12)';
    } else if (themeName === 'neutral') {
      // minimal — thinner border, less padding
      base.borderRadius = '4px';
      base.padding = '10px 12px';
    }
    return base;
  }

  function formatDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderMetric(label, value, palette, themeName) {
    var React = window.React;
    var h = React.createElement;
    var tm = themeName || 'default';
    // Theme-flavored visual vocabulary for the summary stat cards. Mirrors
    // the menu stats-strip treatment (cf17f9a) so the tool feels consistent
    // across screens. Clinical numbers unchanged; only chrome varies.
    var cardStyle = {
      background: palette.bg,
      border: '1px solid ' + palette.border,
      borderRadius: '10px',
      padding: '14px 10px',
      position: 'relative'
    };
    var labelStyle = {
      fontSize: '10px',
      color: palette.textMute,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '4px'
    };
    var valueStyle = {
      fontSize: '22px',
      fontWeight: 700,
      color: palette.text,
      fontVariantNumeric: 'tabular-nums'
    };
    if (tm === 'steampunk') {
      cardStyle.background = 'linear-gradient(180deg, ' + palette.surface + ' 0%, ' + palette.bg + ' 100%)';
      cardStyle.borderColor = palette.accentDim || palette.border;
      cardStyle.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06)';
      labelStyle.letterSpacing = '0.12em';
    } else if (tm === 'cyberpunk') {
      cardStyle.background = palette.bg;
      cardStyle.borderLeft = '3px solid ' + palette.accent;
      cardStyle.borderRadius = '2px';
      valueStyle.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      labelStyle.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      labelStyle.color = palette.accent;
    } else if (tm === 'kawaii') {
      cardStyle.borderRadius = '16px';
      cardStyle.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      labelStyle.textTransform = 'none';
      labelStyle.letterSpacing = '0.02em';
      labelStyle.fontWeight = 600;
    } else if (tm === 'neutral') {
      cardStyle.borderRadius = '6px';
    }
    return h('div', { style: cardStyle },
      h('div', { style: labelStyle }, label),
      h('div', { style: valueStyle }, value)
    );
  }

  function primaryBtnStyle(palette) {
    return {
      background: palette.accent,
      color: palette.onAccent,
      border: 'none',
      borderRadius: '8px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit'
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
      fontFamily: 'inherit'
    };
  }

  // ─────────────────────────────────────────────────────────
  // On-screen keyboard — finger-color coded, next-key highlighted.
  // Rendered below the drill target when large-keys accommodation is on.
  // Teaches motor planning through consistent finger-key color mapping.
  // ─────────────────────────────────────────────────────────
  function renderOnScreenKeyboard(nextKeyMeta, palette, focusMode) {
    var React = window.React;
    var h = React.createElement;
    var highlightKey = nextKeyMeta ? nextKeyMeta.k : null;
    var highlightFinger = nextKeyMeta ? nextKeyMeta.f : null;

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
            // Focus-mode dims non-target keys aggressively. Same-finger keys
            // stay a bit more visible (they're "primed" for the finger that's
            // about to act) — that's a light motor-planning hint.
            var dimOpacity = 1;
            if (focusMode && !isNext) {
              dimOpacity = (finger === highlightFinger) ? 0.55 : 0.2;
            }
            return h('div', {
              key: 'k-' + keyObj.k,
              style: {
                width: keyObj.wide ? ((keyObj.wide * 32) + (keyObj.wide - 1) * 4) + 'px' : '32px',
                height: '32px',
                borderRadius: '6px',
                background: isNext ? fingerColor : palette.bg,
                border: '1.5px solid ' + (isNext ? '#ffffff' : palette.border),
                color: isNext ? (palette.onAccent || '#0f172a') : palette.textDim,
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
                opacity: dimOpacity,
                transition: 'background 120ms ease, box-shadow 120ms ease, opacity 120ms ease'
              }
            }, keyObj.label ? keyObj.label : keyObj.k);
          })
        );
      })
    );
  }

  // Analyze per-key error aggregates to produce finger-level counts and
  // rule-based coaching hints. Hints deliberately use plain, non-judgmental
  // language ("Both keys are left-index — check your wrist angle") rather than
  // "you keep messing up." The coaching is a mechanical observation, not a
  // commentary on effort.
  // Aggregate per-drill error counts from the session array. Unlike the global
  // aggregateErrors (which sums across all drills), this splits errors by
  // drillId so clinicians can see "on home-row you miss F most, on top-row
  // you miss Y most." Returns { drillId: { charKey: count, ... }, ... }
  // Only includes drills with at least 3 sessions so single-session noise
  // doesn't look like a pattern.
  function computePerDrillErrors(sessions) {
    if (!sessions || sessions.length === 0) return {};
    var byDrill = {};
    sessions.forEach(function(s) {
      if (!s.errorChars) return;
      var id = s.drillId;
      if (!byDrill[id]) byDrill[id] = { total: 0, sessionCount: 0, chars: {} };
      byDrill[id].sessionCount++;
      Object.keys(s.errorChars).forEach(function(k) {
        byDrill[id].chars[k] = (byDrill[id].chars[k] || 0) + (s.errorChars[k] || 0);
        byDrill[id].total += (s.errorChars[k] || 0);
      });
    });
    // Filter: require ≥3 sessions and ≥1 error to emit a row
    var out = {};
    Object.keys(byDrill).forEach(function(id) {
      if (byDrill[id].sessionCount >= 3 && byDrill[id].total > 0) out[id] = byDrill[id];
    });
    return out;
  }

  function analyzeErrorPatterns(aggregateErrors) {
    var out = { fingerCounts: {}, hints: [], topKeys: [], totalErrors: 0 };
    if (!aggregateErrors) return out;
    var keys = Object.keys(aggregateErrors);
    if (keys.length === 0) return out;

    // Group errors by finger
    keys.forEach(function(k) {
      var err = aggregateErrors[k] || 0;
      out.totalErrors += err;
      var meta = findKeyMeta(k);
      var f = meta ? meta.f : 'UN';
      out.fingerCounts[f] = (out.fingerCounts[f] || 0) + err;
    });
    if (out.totalErrors === 0) return out;

    // Top error keys (sorted desc)
    out.topKeys = keys
      .filter(function(k) { return aggregateErrors[k] > 0; })
      .sort(function(a, b) { return aggregateErrors[b] - aggregateErrors[a]; })
      .slice(0, 6);

    // Identify dominant finger(s) — any finger holding > 25% of errors
    var fingerTotal = 0;
    Object.keys(out.fingerCounts).forEach(function(f) { fingerTotal += out.fingerCounts[f]; });
    var dominantFingers = Object.keys(out.fingerCounts).filter(function(f) {
      return fingerTotal > 0 && (out.fingerCounts[f] / fingerTotal) >= 0.25;
    });

    // Rule-based coaching hints. Keep them SPECIFIC and ACTIONABLE.
    // Each rule checks for a pattern and pushes a hint.
    var topSet = {};
    out.topKeys.forEach(function(k) { topSet[k] = true; });

    // Pinky pattern — weakest finger, typically slows first
    if (dominantFingers.indexOf('LP') !== -1 || dominantFingers.indexOf('RP') !== -1) {
      out.hints.push('Your pinky fingers are your weakest — they miss more than others. That\'s normal. Slow down on q, a, z (left) and p, ;, / (right). Precision first, speed follows.');
    }

    // Left-index vs right-index confusion: b/v, n/m cluster
    if ((topSet['b'] && topSet['v']) || (topSet['n'] && topSet['m'])) {
      out.hints.push('b and v are both left-index; n and m are both right-index. If both in a pair are missing, check which finger is reaching past its home.');
    }

    // Top-row reach errors — students often don\'t return to home row
    var topRowErrors = ['q','w','e','r','t','y','u','i','o','p'].reduce(function(a, k) {
      return a + (aggregateErrors[k] || 0);
    }, 0);
    if (topRowErrors > 0 && (topRowErrors / out.totalErrors) >= 0.35) {
      out.hints.push('A lot of your errors are on the top row (q-p). After reaching up, let your fingers come back to home row (asdf jkl;) before the next keystroke. Anchoring helps accuracy.');
    }

    // Bottom-row stretches — hardest reach for most students
    var bottomRowErrors = ['z','x','c','v','b','n','m'].reduce(function(a, k) {
      return a + (aggregateErrors[k] || 0);
    }, 0);
    if (bottomRowErrors > 0 && (bottomRowErrors / out.totalErrors) >= 0.35) {
      out.hints.push('Bottom row (z-m) is a stretch for everyone. The fix is counter-intuitive: ANCHOR the other hand on home row while the reaching hand moves. Stability on one side makes the other side accurate.');
    }

    // Home row dominance means keyboard basics are off — rare but real
    var homeRowErrors = ['a','s','d','f','g','h','j','k','l',';'].reduce(function(a, k) {
      return a + (aggregateErrors[k] || 0);
    }, 0);
    if (homeRowErrors > 0 && (homeRowErrors / out.totalErrors) >= 0.4) {
      out.hints.push('Most of your errors are on the home row itself — check your starting position. Left fingers on a-s-d-f, right fingers on j-k-l-; with the small bumps on F and J as guides.');
    }

    // Fallback general advice when no specific pattern dominates
    if (out.hints.length === 0 && out.topKeys.length > 0) {
      out.hints.push('Your errors are spread across the keyboard with no single pattern dominating — that usually means general practice volume, not a specific weakness. Keep going.');
    }

    // Recommended drill — closes the loop between diagnosis and practice.
    // Map the dominant error pattern to the drill that targets it.
    if (topRowErrors > 0 && (topRowErrors / out.totalErrors) >= 0.35) {
      out.recommendedDrill = { id: 'top-row', reason: 'Top-row errors dominate — drill q-p reach stability.' };
    } else if (bottomRowErrors > 0 && (bottomRowErrors / out.totalErrors) >= 0.35) {
      out.recommendedDrill = { id: 'bottom-row', reason: 'Bottom-row stretches are where you miss — drill z-m specifically.' };
    } else if (homeRowErrors > 0 && (homeRowErrors / out.totalErrors) >= 0.4) {
      out.recommendedDrill = { id: 'home-row', reason: 'Home-row positioning looks off — reset fundamentals.' };
    } else {
      // Check shift-key errors via capitalization drill relevance
      var capsErrors = 0;
      keys.forEach(function(k) {
        if (/[A-Z]/.test(k)) capsErrors += aggregateErrors[k] || 0;
      });
      if (capsErrors > 0 && (capsErrors / out.totalErrors) >= 0.2) {
        out.recommendedDrill = { id: 'capitalization', reason: 'Shift-key timing needs work — capitalization drill targets this.' };
      }
    }

    return out;
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

  // Render a 30-day practice calendar (GitHub-contribution-style). Each cell
  // is one day; color intensity scales with session count. No pressure to fill
  // every day — days with 0 sessions stay neutral, not red.
  function renderPracticeCalendar(sessions, palette) {
    var React = window.React;
    var h = React.createElement;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var DAYS = 30;
    // Build a map of local-date-key → session summary for that day
    var bucket = {};
    sessions.forEach(function(s) {
      var d = new Date(s.date);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      if (!bucket[key]) bucket[key] = { count: 0, best: 0, totalChars: 0 };
      bucket[key].count++;
      bucket[key].best = Math.max(bucket[key].best, s.wpm || 0);
      bucket[key].totalChars += (s.charCount || 0);
    });
    // Build the ordered list of the last 30 days (oldest first)
    var days = [];
    for (var i = DAYS - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      days.push({
        date: d,
        key: key,
        count: bucket[key] ? bucket[key].count : 0,
        best: bucket[key] ? bucket[key].best : 0,
        totalChars: bucket[key] ? bucket[key].totalChars : 0
      });
    }
    // Intensity → color: 0 = bg/dim, 1 = light, 2-3 = medium, 4+ = full
    var intensity = function(count) {
      if (count === 0) return 0;
      if (count === 1) return 0.35;
      if (count <= 3) return 0.65;
      return 1;
    };

    return h('div', null,
      h('div', {
        role: 'img',
        'aria-label': 'Last 30 days of practice calendar',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)',
          gap: '3px'
        }
      },
        // Group into 2 rows of 15 days each — simpler than a week-grid and
        // keeps it compact horizontally.
        days.map(function(day, idx) {
          var op = intensity(day.count);
          var bg = op === 0 ? palette.bg : mixColor(palette.surface, palette.accent, op);
          var dateLabel = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return h('div', {
            key: 'cal-' + idx,
            title: dateLabel + ' · ' + day.count + ' session' + (day.count === 1 ? '' : 's') +
                   (day.best > 0 ? ' · best ' + day.best + ' WPM' : ''),
            style: {
              aspectRatio: '1',
              borderRadius: '3px',
              background: bg,
              border: '1px solid ' + (day.count > 0 ? palette.border : 'transparent'),
              minHeight: '18px'
            }
          });
        })
      ),
      h('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          fontSize: '10px',
          color: palette.textMute
        }
      },
        h('span', null, days[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
          h('span', null, 'Less'),
          [0, 0.35, 0.65, 1].map(function(op, i) {
            return h('div', {
              key: 'legend-' + i,
              style: {
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: op === 0 ? palette.bg : mixColor(palette.surface, palette.accent, op),
                border: '1px solid ' + palette.border
              }
            });
          }),
          h('span', null, 'More')
        ),
        h('span', null, 'Today')
      )
    );
  }

  // Horizontal stacked bar showing what fraction of errors belong to each finger.
  // Reuses FINGER_COLOR so the finger colors match the on-screen-keyboard
  // accommodation — visual consistency helps students connect the two.
  function renderFingerErrorBar(fingerCounts, total, palette) {
    var React = window.React;
    var h = React.createElement;
    if (!total || total === 0) return null;

    // Order fingers left-to-right as they appear on the keyboard
    var order = ['LP', 'LR', 'LM', 'LI', 'T', 'RI', 'RM', 'RR', 'RP'];
    var segments = order
      .filter(function(f) { return (fingerCounts[f] || 0) > 0; })
      .map(function(f) {
        var pct = (fingerCounts[f] / total) * 100;
        return { finger: f, count: fingerCounts[f], pct: pct };
      });

    return h('div', null,
      h('div', {
        role: 'img',
        'aria-label': 'Errors by finger: ' + segments.map(function(s) { return fingerLabel(s.finger) + ' ' + Math.round(s.pct) + ' percent'; }).join(', '),
        style: {
          display: 'flex',
          height: '18px',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid ' + palette.border
        }
      },
        segments.map(function(seg) {
          return h('div', {
            key: 'seg-' + seg.finger,
            title: fingerLabel(seg.finger) + ': ' + seg.count + ' error' + (seg.count === 1 ? '' : 's') + ' (' + Math.round(seg.pct) + '%)',
            style: {
              flexBasis: seg.pct + '%',
              background: FINGER_COLOR[seg.finger] || palette.textMute
            }
          });
        })
      ),
      // Legend
      h('div', {
        style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px', fontSize: '10px', color: palette.textMute }
      },
        segments.map(function(seg) {
          return h('span', {
            key: 'leg-' + seg.finger,
            style: { display: 'inline-flex', alignItems: 'center', gap: '4px' }
          },
            h('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: FINGER_COLOR[seg.finger] || palette.textMute } }),
            fingerLabel(seg.finger) + ' ' + Math.round(seg.pct) + '%'
          );
        })
      )
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

  // Open a print-friendly window with the IEP report and invoke the browser
  // print dialog. Uses a minimal standalone HTML so page breaks, margins, and
  // font stay clinical-looking. The opened window closes after print.
  function printIEPReport(reportText, studentName) {
    try {
      var w = window.open('', '_blank', 'width=720,height=900');
      if (!w) {
        alert('Please allow popups to print the report, or use Copy and paste into a document.');
        return;
      }
      var title = 'Typing Practice — Progress Summary' + (studentName ? ' — ' + studentName : '');
      // Minimal print-friendly CSS: monospace so alignment of the line-based
      // report is preserved.
      var html = [
        '<!doctype html><html><head><meta charset="utf-8"><title>' +
          title.replace(/[<>&]/g, function(c) { return ({'<':'&lt;','>':'&gt;','&':'&amp;'})[c]; }) +
          '</title>',
        '<style>',
        '  body { font: 11pt/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;',
        '         color: #111; background: #fff; margin: 0.75in; }',
        '  h1 { font-size: 14pt; margin: 0 0 0.2in 0; border-bottom: 1px solid #333; padding-bottom: 4pt; }',
        '  pre { white-space: pre-wrap; font: inherit; margin: 0; }',
        '  .meta { font-size: 9pt; color: #555; margin-bottom: 0.3in; }',
        '  @media print {',
        '    body { margin: 0.5in; }',
        '    button { display: none; }',
        '  }',
        '  button { position: fixed; top: 8pt; right: 8pt; padding: 6pt 12pt; font: 10pt sans-serif; cursor: pointer; }',
        '</style>',
        '</head><body>',
        '<button onclick="window.print()">🖨 Print now</button>',
        '<h1>' + title.replace(/[<>&]/g, function(c) { return ({'<':'&lt;','>':'&gt;','&':'&amp;'})[c]; }) + '</h1>',
        '<div class="meta">Generated by AlloFlow Typing Practice · ' + new Date().toLocaleString() + '</div>',
        '<pre>' + reportText.replace(/[<>&]/g, function(c) { return ({'<':'&lt;','>':'&gt;','&':'&amp;'})[c]; }) + '</pre>',
        '<script>setTimeout(function(){ try { window.print(); } catch(e){} }, 300);</script>',
        '</body></html>'
      ].join('\n');
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      console.warn('[TypingPractice] print failed:', e);
      alert('Print failed. Use Copy and paste into your preferred document.');
    }
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
    var headers = ['date', 'drill_id', 'drill_name', 'wpm', 'accuracy_pct', 'duration_sec', 'paused_sec', 'errors', 'chars_typed', 'accommodations_used', 'tag', 'is_new_best', 'is_baseline', 'mastery_advanced', 'new_mastery_level', 'reflection', 'error_chars', 'note'];
    var rows = sessions.map(function(s) {
      // Serialize per-char errors as "a:2|d:1|k:3" for compact CSV consumption
      var errorChars = s.errorChars ? Object.keys(s.errorChars).map(function(k) {
        return k + ':' + s.errorChars[k];
      }).join('|') : '';
      return [
        s.date, s.drillId, s.drillName, s.wpm, s.accuracy,
        s.durationSec, (s.pausedSec || 0), s.errors, s.charCount,
        (s.accommodationsUsed || []).join('|'),
        s.tag || '',
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

  // Group sessions into rough parts of the day based on local hour, and
  // return an array of buckets with session counts + average WPM/accuracy.
  // Returns null if there's not enough data to be interesting (< 5 sessions).
  function computeTimeOfDayPerformance(sessions) {
    if (!sessions || sessions.length < 5) return null;
    var buckets = [
      { id: 'early',     label: 'Early morning (5–8am)',  match: function(h) { return h >= 5 && h < 8; },  count: 0, wpmSum: 0, accSum: 0 },
      { id: 'morning',   label: 'Morning (8am–12pm)',     match: function(h) { return h >= 8 && h < 12; }, count: 0, wpmSum: 0, accSum: 0 },
      { id: 'afternoon', label: 'Afternoon (12–4pm)',     match: function(h) { return h >= 12 && h < 16; },count: 0, wpmSum: 0, accSum: 0 },
      { id: 'evening',   label: 'Evening (4–8pm)',        match: function(h) { return h >= 16 && h < 20; },count: 0, wpmSum: 0, accSum: 0 },
      { id: 'night',     label: 'Night (8pm–5am)',        match: function(h) { return h >= 20 || h < 5; }, count: 0, wpmSum: 0, accSum: 0 }
    ];
    sessions.forEach(function(s) {
      var hr = new Date(s.date).getHours();
      for (var i = 0; i < buckets.length; i++) {
        if (buckets[i].match(hr)) {
          buckets[i].count++;
          buckets[i].wpmSum += (s.wpm || 0);
          buckets[i].accSum += (s.accuracy || 0);
          break;
        }
      }
    });
    var result = buckets
      .filter(function(b) { return b.count > 0; })
      .map(function(b) {
        return {
          label: b.label,
          count: b.count,
          avgWpm: Math.round(b.wpmSum / b.count),
          avgAcc: Math.round(b.accSum / b.count)
        };
      });
    // Only emit if there's meaningful spread — at least 2 non-empty buckets
    if (result.length < 2) return null;
    return result;
  }

  // Per-drill efficacy: same as aggregate but grouped by drill, so drill
  // difficulty is held constant. Produces a matrix of { drillId, drillName,
  // rows: [{ key, label, sessionsWith, sessionsWithout, wpmDelta, accDelta }] }.
  // Only emits rows where the student has 2+ sessions BOTH with AND without
  // that accommodation on that specific drill — anything less is noise.
  function computePerDrillEfficacy(sessions) {
    if (!sessions || sessions.length < 4) return [];
    var KEYS = [
      { key: 'dyslexiaFont',   label: 'dyslexia font' },
      { key: 'largeKeys',      label: 'on-screen keyboard' },
      { key: 'highContrast',   label: 'high contrast' },
      { key: 'audioCues',      label: 'audio cues' },
      { key: 'errorTolerant',  label: 'error-tolerant' },
      { key: 'paceTargetWpm',  label: 'pace target' },
      { key: 'predictiveAssist', label: 'predictive assist' }
    ];
    var avg = function(arr, k) {
      if (arr.length === 0) return 0;
      return arr.reduce(function(a, s) { return a + (s[k] || 0); }, 0) / arr.length;
    };

    // Group sessions by drillId
    var byDrill = {};
    sessions.forEach(function(s) {
      if (!byDrill[s.drillId]) byDrill[s.drillId] = [];
      byDrill[s.drillId].push(s);
    });

    var out = [];
    Object.keys(byDrill).forEach(function(drillId) {
      var drillSessions = byDrill[drillId];
      if (drillSessions.length < 4) return; // too few to split meaningfully
      var drillName = drillSessions[0].drillName ||
                      (DRILLS[drillId] ? DRILLS[drillId].name : drillId);
      var rows = [];
      KEYS.forEach(function(k) {
        var withIt = drillSessions.filter(function(s) {
          return (s.accommodationsUsed || []).indexOf(k.key) !== -1;
        });
        var withoutIt = drillSessions.filter(function(s) {
          return (s.accommodationsUsed || []).indexOf(k.key) === -1;
        });
        if (withIt.length < 2 || withoutIt.length < 2) return;
        rows.push({
          key: k.key,
          label: k.label,
          sessionsWith: withIt.length,
          sessionsWithout: withoutIt.length,
          wpmDelta: Math.round(avg(withIt, 'wpm') - avg(withoutIt, 'wpm')),
          accDelta: Math.round(avg(withIt, 'accuracy') - avg(withoutIt, 'accuracy'))
        });
      });
      if (rows.length > 0) {
        out.push({ drillId: drillId, drillName: drillName, rows: rows });
      }
    });
    return out;
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
  // Parent-friendly plain-language summary. 2–4 sentences, positive framing,
  // concrete numbers where helpful, no jargon ("mastery tier" → "first
  // skill level"). Designed to be pasted into a parent email without
  // editing. Not a replacement for the IEP report — it's for the weekly
  // "how's your kid doing" message home.
  // Normalize the milestonesEarned array to a consistent shape. Supports both:
  //   old format: ['first', 'ten', 'days7']            — strings (no dates)
  //   new format: [{id: 'first', date: '2026-...'}]    — objects with dates
  // Returns [{id, date|null}]. Legacy entries get date:null so the UI can
  // render them as "earned" without a timestamp.
  function normalizeMilestonesEarned(raw) {
    if (!raw || !raw.length) return [];
    return raw.map(function(entry) {
      if (typeof entry === 'string') return { id: entry, date: null };
      if (entry && typeof entry === 'object' && entry.id) return { id: entry.id, date: entry.date || null };
      return null;
    }).filter(Boolean);
  }

  function buildParentSummary(state) {
    var tm = state.theme || 'default';
    var sessions = state.sessions || [];
    var name = state.studentName ? state.studentName.split(' ')[0] : 'Your student';

    // Empty-state — theme-voiced so parents get the same personality
    if (sessions.length === 0) {
      if (tm === 'steampunk') {
        return name + ' has not yet begun their apprenticeship at the typing bench. The Home Row drill stands ready whenever they wish to take up the keys.';
      }
      if (tm === 'cyberpunk') {
        return '[STATUS] ' + name.toUpperCase() + ' :: 0 sessions logged :: awaiting first run — Home Row drill available on boot.';
      }
      if (tm === 'kawaii') {
        return '🌸 ' + name + ' hasn\'t tried a typing practice session yet — but that\'s totally okay! ✨ The Home Row drill is waiting whenever they feel like saying hi. 💕';
      }
      if (tm === 'neutral') {
        return name + ' has not completed a typing-practice session. The Home Row drill is available at any time.';
      }
      return 'Your student has not yet completed a typing-practice session in the tool. They can start any time from the Home Row drill.';
    }

    var now = Date.now();
    var sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    var thisWeek = sessions.filter(function(s) { return new Date(s.date).getTime() >= sevenDaysAgo; });
    var bestWpm = sessions.reduce(function(m, s) { return Math.max(m, s.wpm || 0); }, 0);
    var bestWpmThisWeek = thisWeek.reduce(function(m, s) { return Math.max(m, s.wpm || 0); }, 0);
    var uniqueDays = {};
    thisWeek.forEach(function(s) { uniqueDays[new Date(s.date).toLocaleDateString()] = true; });
    var daysThisWeek = Object.keys(uniqueDays).length;

    var parts = [];

    // Opener — effort + cadence (per-theme voice)
    if (thisWeek.length > 0) {
      if (tm === 'steampunk') {
        parts.push(name + ' logged ' + thisWeek.length + ' practice session' + (thisWeek.length === 1 ? '' : 's') +
          ' in the workshop this week, across ' + daysThisWeek + ' distinct day' + (daysThisWeek === 1 ? '' : 's') + '.');
      } else if (tm === 'cyberpunk') {
        parts.push('[WEEK] ' + thisWeek.length + ' run' + (thisWeek.length === 1 ? '' : 's') + ' :: ' + daysThisWeek + ' day' + (daysThisWeek === 1 ? '' : 's') + ' online.');
      } else if (tm === 'kawaii') {
        parts.push('💕 ' + name + ' showed up for ' + thisWeek.length + ' practice session' + (thisWeek.length === 1 ? '' : 's') +
          ' this week across ' + daysThisWeek + ' day' + (daysThisWeek === 1 ? '' : 's') + ' — so proud of them! ✨');
      } else if (tm === 'neutral') {
        parts.push(name + ': ' + thisWeek.length + ' session' + (thisWeek.length === 1 ? '' : 's') + ' across ' + daysThisWeek + ' day' + (daysThisWeek === 1 ? '' : 's') + ' this week.');
      } else {
        parts.push(name + ' practiced typing ' + thisWeek.length + ' time' + (thisWeek.length === 1 ? '' : 's') +
          ' this week (across ' + daysThisWeek + ' day' + (daysThisWeek === 1 ? '' : 's') + ').');
      }
    } else {
      if (tm === 'steampunk') {
        parts.push(name + ' has ' + sessions.length + ' session' + (sessions.length === 1 ? '' : 's') + ' on the ledger, though the workshop has been quiet this past week.');
      } else if (tm === 'cyberpunk') {
        parts.push('[TOTAL] ' + sessions.length + ' session' + (sessions.length === 1 ? '' : 's') + ' :: [7D] no activity.');
      } else if (tm === 'kawaii') {
        parts.push('🌸 ' + name + ' has ' + sessions.length + ' practice session' + (sessions.length === 1 ? '' : 's') + ' recorded — they haven\'t stopped by in the last 7 days, and that\'s okay! 💕');
      } else if (tm === 'neutral') {
        parts.push(name + ': ' + sessions.length + ' total session' + (sessions.length === 1 ? '' : 's') + '; no practice in the last 7 days.');
      } else {
        parts.push(name + ' has ' + sessions.length + ' typing-practice session' + (sessions.length === 1 ? '' : 's') + ' recorded, with no practice in the last 7 days.');
      }
    }

    // Personal best (per-theme voice)
    if (bestWpmThisWeek > 0 && bestWpmThisWeek >= bestWpm - 2) {
      var isPB = (bestWpm === bestWpmThisWeek);
      if (tm === 'steampunk') {
        parts.push('Their finest velocity this week was ' + bestWpmThisWeek + ' WPM' + (isPB ? ' — a new entry in the record book.' : '.'));
      } else if (tm === 'cyberpunk') {
        parts.push('[PEAK 7D] ' + bestWpmThisWeek + ' WPM' + (isPB ? ' :: NEW RECORD' : '') + '.');
      } else if (tm === 'kawaii') {
        parts.push('✨ Their best speed this week was ' + bestWpmThisWeek + ' WPM' + (isPB ? ' — a brand-new personal best! 🎉💕' : '.'));
      } else if (tm === 'neutral') {
        parts.push('Best WPM this week: ' + bestWpmThisWeek + (isPB ? ' (personal best).' : '.'));
      } else {
        parts.push('Their best speed this week was ' + bestWpmThisWeek + ' WPM' + (isPB ? ' — a personal best.' : '.'));
      }
    } else if (bestWpm > 0) {
      if (tm === 'steampunk') {
        parts.push('Their all-time peak stands at ' + bestWpm + ' WPM.');
      } else if (tm === 'cyberpunk') {
        parts.push('[ALL-TIME PEAK] ' + bestWpm + ' WPM.');
      } else if (tm === 'kawaii') {
        parts.push('🌟 All-time best: ' + bestWpm + ' WPM — that\'s amazing! 💖');
      } else if (tm === 'neutral') {
        parts.push('All-time best WPM: ' + bestWpm + '.');
      } else {
        parts.push('Their all-time best is ' + bestWpm + ' WPM.');
      }
    }

    // IEP goal progress (per-theme voice)
    if (state.iepGoal && state.iepGoal.targetWpm) {
      var lastN = Math.min(10, sessions.length);
      var lastSlice = sessions.slice(-lastN);
      var metCount = lastSlice.filter(function(s) { return s.goalMet; }).length;
      if (metCount > 0) {
        if (tm === 'steampunk') {
          parts.push('Their appointed goal is ' + state.iepGoal.targetWpm + ' WPM at ' + state.iepGoal.targetAccuracy + '% accuracy, met in ' + metCount + ' of the last ' + lastN + ' attempt' + (lastN === 1 ? '' : 's') + '.');
        } else if (tm === 'cyberpunk') {
          parts.push('[GOAL] ' + state.iepGoal.targetWpm + ' WPM @ ' + state.iepGoal.targetAccuracy + '% :: hit ' + metCount + '/' + lastN + ' recent runs.');
        } else if (tm === 'kawaii') {
          parts.push('🎯 They\'re working toward ' + state.iepGoal.targetWpm + ' WPM at ' + state.iepGoal.targetAccuracy + '% and reached it in ' + metCount + ' of the last ' + lastN + ' session' + (lastN === 1 ? '' : 's') + ' — go go go! 💪✨');
        } else if (tm === 'neutral') {
          parts.push('IEP goal: ' + state.iepGoal.targetWpm + ' WPM / ' + state.iepGoal.targetAccuracy + '%. Met ' + metCount + '/' + lastN + ' recent sessions.');
        } else {
          parts.push('Working toward their goal of ' + state.iepGoal.targetWpm + ' WPM at ' +
            state.iepGoal.targetAccuracy + '%, they met it on ' + metCount +
            ' of the last ' + lastN + ' session' + (lastN === 1 ? '' : 's') + '.');
        }
      } else if (sessions.length >= 3) {
        var currentAvg = getRecentAvg(sessions, 'wpm');
        if (tm === 'steampunk') {
          parts.push('The goal of ' + state.iepGoal.targetWpm + ' WPM stands ahead — they average ' + currentAvg + ' WPM at present, and steady practice shall close the distance.');
        } else if (tm === 'cyberpunk') {
          parts.push('[GOAL] ' + state.iepGoal.targetWpm + ' WPM :: [CURRENT AVG] ' + currentAvg + ' WPM :: delta closing with session volume.');
        } else if (tm === 'kawaii') {
          parts.push('🌱 Goal: ' + state.iepGoal.targetWpm + ' WPM. Right now they\'re averaging ' + currentAvg + ' — every session gets them closer! 💕');
        } else if (tm === 'neutral') {
          parts.push('IEP goal: ' + state.iepGoal.targetWpm + ' WPM. Current avg: ' + currentAvg + ' WPM.');
        } else {
          parts.push('They are working toward a goal of ' + state.iepGoal.targetWpm + ' WPM and currently averaging ' + currentAvg + ' WPM — steady practice will close that gap.');
        }
      }
    }

    // Mastery or drill-variety note (per-theme voice)
    if (state.masteryLevel > 0) {
      var clearedName = (DRILLS[TIER_ORDER[state.masteryLevel - 1]] || {}).name;
      if (clearedName) {
        if (tm === 'steampunk') {
          parts.push('They have earned passage beyond the ' + clearedName + ' tier of the mastery ladder.');
        } else if (tm === 'cyberpunk') {
          parts.push('[TIER CLEARED] ' + clearedName.toUpperCase() + '.');
        } else if (tm === 'kawaii') {
          parts.push('🏆 They cleared the ' + clearedName + ' tier — so cool! ✨');
        } else if (tm === 'neutral') {
          parts.push('Cleared tier: ' + clearedName + '.');
        } else {
          parts.push('They have cleared the ' + clearedName + ' tier in the structured drill progression.');
        }
      }
    }

    // Student motivation (self-authored) — lovely if available
    if (state.motivationStatement) {
      if (tm === 'steampunk') {
        parts.push('In their own hand: "' + state.motivationStatement + '"');
      } else if (tm === 'cyberpunk') {
        parts.push('[PILOT LOG] "' + state.motivationStatement + '"');
      } else if (tm === 'kawaii') {
        parts.push('💬 In their own words: "' + state.motivationStatement + '" 💕');
      } else if (tm === 'neutral') {
        parts.push('Student note: "' + state.motivationStatement + '"');
      } else {
        parts.push('In their own words: "' + state.motivationStatement + '"');
      }
    }

    return parts.join(' ');
  }

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

    // Top error-prone keys + coaching hints — concrete target for the clinician
    var agg = state.aggregateErrors || {};
    var sortedErrorKeys = Object.keys(agg).sort(function(a, b) { return agg[b] - agg[a]; }).slice(0, 5);
    if (sortedErrorKeys.length > 0 && agg[sortedErrorKeys[0]] > 0) {
      lines.push('TOP ERROR-PRONE KEYS (all-time)');
      sortedErrorKeys.forEach(function(k) {
        if (agg[k] > 0) lines.push('  ' + k.toUpperCase() + ': ' + agg[k] + ' error' + (agg[k] === 1 ? '' : 's'));
      });
      // Finger breakdown
      var analysis = analyzeErrorPatterns(agg);
      if (analysis.totalErrors > 0) {
        var fingerSummary = Object.keys(analysis.fingerCounts)
          .sort(function(a, b) { return analysis.fingerCounts[b] - analysis.fingerCounts[a]; })
          .slice(0, 4)
          .map(function(f) {
            var pct = Math.round((analysis.fingerCounts[f] / analysis.totalErrors) * 100);
            return fingerLabel(f) + ' ' + pct + '%';
          })
          .join(', ');
        lines.push('  Finger breakdown: ' + fingerSummary);
      }
      // Coaching hints
      if (analysis.hints && analysis.hints.length > 0) {
        lines.push('');
        lines.push('COACHING HINTS (based on error pattern)');
        analysis.hints.forEach(function(hint) {
          lines.push('  - ' + hint);
        });
      }
      if (analysis.recommendedDrill && DRILLS[analysis.recommendedDrill.id]) {
        lines.push('  Recommended practice: ' + DRILLS[analysis.recommendedDrill.id].name + ' — ' + analysis.recommendedDrill.reason);
      }
      lines.push('');
    }

    // Time-of-day performance — groups sessions into rough parts of the day
    // and computes average WPM per part. Reveals whether the student performs
    // best in the morning, afternoon, etc. Useful for scheduling decisions.
    var todReport = computeTimeOfDayPerformance(sessions);
    if (todReport) {
      lines.push('TIME-OF-DAY PERFORMANCE');
      todReport.forEach(function(b) {
        lines.push('  ' + b.label + ' (' + b.count + ' session' + (b.count === 1 ? '' : 's') + '): avg ' + b.avgWpm + ' WPM · ' + b.avgAcc + '% acc');
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
      // Completion rate — completed sessions vs abandoned starts. Useful signal
      // for whether drill difficulty is calibrated right; a low rate suggests
      // the student is getting stuck and bailing.
      var ab = state.lifetime.abandonments || 0;
      var totalStarts = state.lifetime.totalSessions + ab;
      if (totalStarts > 0) {
        var rate = Math.round((state.lifetime.totalSessions / totalStarts) * 100);
        lines.push('  Drill completion rate: ' + rate + '% (' + state.lifetime.totalSessions + ' completed, ' + ab + ' abandoned)');
      }
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
      lines.push('ACCOMMODATION EFFICACY — AGGREGATE (data-only, no clinical interpretation)');
      lines.push('  Format: with-vs-without sessions; WPM delta; accuracy delta');
      efficacy.forEach(function(row) {
        lines.push('  ' + row.label + ': ' +
          row.sessionsWith + ' with / ' + row.sessionsWithout + ' without · ' +
          (row.wpmDelta >= 0 ? '+' : '') + row.wpmDelta + ' WPM · ' +
          (row.accDelta >= 0 ? '+' : '') + row.accDelta + '% acc');
      });
      lines.push('  Caveat: aggregate across drill types. Drill mix may confound.');
      lines.push('');

      // Per-drill efficacy matrix — same analysis but within each drill type.
      // Less confounding because drill difficulty is held constant per row.
      // Only emit rows where at least one accommodation has comparable data.
      var perDrillMatrix = computePerDrillEfficacy(sessions);
      if (perDrillMatrix.length > 0) {
        lines.push('ACCOMMODATION EFFICACY — PER DRILL (less confounded than aggregate)');
        lines.push('  Only drill+accommodation pairs with 2+ sessions both with and without appear.');
        perDrillMatrix.forEach(function(drillRow) {
          lines.push('  ' + drillRow.drillName + ':');
          drillRow.rows.forEach(function(r) {
            lines.push('    - ' + r.label + ': ' +
              r.sessionsWith + '/' + r.sessionsWithout + ' · ' +
              (r.wpmDelta >= 0 ? '+' : '') + r.wpmDelta + ' WPM · ' +
              (r.accDelta >= 0 ? '+' : '') + r.accDelta + '% acc');
          });
        });
        lines.push('');
      }
    }

    if (state.iepGoal) {
      lines.push('IEP GOAL');
      lines.push('  Target: ' + state.iepGoal.targetWpm + ' WPM at ' + state.iepGoal.targetAccuracy + '% accuracy');
      if (state.iepGoal.notes) lines.push('  Notes: ' + state.iepGoal.notes);
      // Goal-met aggregation — defensible stat for IEP progress notes.
      var goalMetTotal = sessions.filter(function(s) { return s.goalMet; }).length;
      if (goalMetTotal > 0) {
        var last10 = sessions.slice(-10);
        var goalMetLast10 = last10.filter(function(s) { return s.goalMet; }).length;
        var firstMet = sessions.filter(function(s) { return s.firstGoalMet; })[0];
        lines.push('  Goal met: ' + goalMetTotal + ' of ' + sessions.length + ' sessions' +
          (sessions.length >= 10 ? ' · ' + goalMetLast10 + ' of last 10' : ''));
        if (firstMet) lines.push('  First met: ' + new Date(firstMet.date).toLocaleDateString());
      } else if (sessions.length > 0) {
        lines.push('  Goal met: not yet (' + sessions.length + ' sessions tracked)');
      }
      lines.push('');
    }

    if (state.motivationStatement) {
      lines.push('STUDENT MOTIVATION (self-authored)');
      lines.push('  "' + state.motivationStatement + '"');
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

    // Clinician session-tag roll-up — counts of each tag type in the window
    var withTags = sessions.filter(function(s) { return s.tag; });
    if (withTags.length > 0) {
      var tagCounts = {};
      withTags.forEach(function(s) { tagCounts[s.tag] = (tagCounts[s.tag] || 0) + 1; });
      lines.push('SESSION TAG BREAKDOWN (clinician-assigned)');
      Object.keys(tagCounts).sort().forEach(function(t) {
        lines.push('  ' + t + ': ' + tagCounts[t]);
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

  function renderDrillCard(drill, unlocked, palette, startDrill, unlockHint, stats, preview, isFavorite, toggleFavorite) {
    var React = window.React;
    var h = React.createElement;
    // Wrap the entire card in a relative-positioned div so the ★ pinning
    // control can overlay on top without being nested inside the <button>
    // (which would be invalid HTML — buttons can't contain buttons).
    return h('div', {
      key: drill.id,
      style: { position: 'relative' }
    },
      h('button', {
      onClick: unlocked ? function() { startDrill(drill.id); } : null,
      disabled: !unlocked,
      'aria-label': drill.name + (unlocked ? '' : ' (locked: ' + (unlockHint || 'reach required mastery tier') + ')') + (isFavorite ? ' (favorite)' : ''),
      style: {
        width: '100%',
        textAlign: 'left',
        background: unlocked ? palette.surface : palette.bg,
        border: '1px solid ' + (unlocked ? (isFavorite ? palette.accent : palette.border) : palette.surface2),
        borderRadius: '12px',
        padding: '16px',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.6,
        color: palette.text,
        fontFamily: 'inherit',
        transition: 'border-color 120ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minHeight: '120px'
      },
      onMouseOver: function(e) { if (unlocked) e.currentTarget.style.borderColor = palette.accent; },
      onMouseOut: function(e) { if (unlocked) e.currentTarget.style.borderColor = isFavorite ? palette.accent : palette.border; }
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
            letterSpacing: '0.05em',
            marginRight: '20px'  // leave space for overlaid ★ button
          }
        }, unlocked ? (drill.tier !== null && drill.tier !== undefined ? 'Tier ' + drill.tier : 'Open') : '🔒 Locked')
      ),
      h('div', { style: { fontSize: '15px', fontWeight: 600, color: palette.text } }, drill.name),
      h('div', { style: { fontSize: '12px', color: palette.textMute, lineHeight: '1.4' } }, drill.description),
      // Preview snippet — first ~40 chars of the sample the student would
      // see next if they tap this card. Monospace, dim, so it reads as
      // quoted text rather than navigation UI.
      (unlocked && preview) ? h('div', {
        style: {
          fontSize: '11px',
          color: palette.textMute,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          padding: '4px 8px',
          background: palette.bg,
          borderRadius: '4px',
          border: '1px dashed ' + palette.border,
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        },
        title: preview
      }, '"' + preview + '"') : null,
      // Inline stats on unlocked cards that have session history
      (unlocked && stats) ? h('div', {
        style: { fontSize: '11px', color: palette.textDim, marginTop: 'auto', fontVariantNumeric: 'tabular-nums' }
      },
        stats.bestWpm !== null ? h('span', null,
          h('span', { style: { color: palette.success, fontWeight: 700 } }, stats.bestWpm + ' WPM'),
          ' best · ', stats.sessionCount, ' session', stats.sessionCount === 1 ? '' : 's'
        ) : h('span', { style: { color: palette.textMute } }, stats.sessionCount + ' session' + (stats.sessionCount === 1 ? '' : 's'))
      ) : null,
      // On locked cards: surface the specific threshold needed to unlock.
      (!unlocked && unlockHint) ? h('div', {
        style: { fontSize: '11px', color: palette.warn, marginTop: 'auto', fontStyle: 'italic' }
      }, '→ ' + unlockHint) : null
      ), // close the inner <button>
      // ★ Favorite toggle — overlaid in the top-right of the card, outside
      // the <button> so it doesn't nest buttons (invalid HTML).
      toggleFavorite ? h('span', {
        role: 'button',
        tabIndex: 0,
        'aria-label': (isFavorite ? 'Unpin' : 'Pin') + ' ' + drill.name + ' as favorite',
        'aria-pressed': isFavorite ? 'true' : 'false',
        onClick: toggleFavorite,
        onKeyDown: function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFavorite(e); }
        },
        title: isFavorite ? 'Unpin from favorites' : 'Pin as favorite',
        style: {
          position: 'absolute',
          top: '6px',
          right: '8px',
          minWidth: '28px',
          minHeight: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: isFavorite ? palette.warn : palette.textMute,
          cursor: 'pointer',
          userSelect: 'none',
          lineHeight: 1,
          borderRadius: '4px'
        }
      }, isFavorite ? '★' : '☆') : null
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
        fontFamily: 'inherit'
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
