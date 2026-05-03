(function () {
  if (window.AlloModules && window.AlloModules.AlloHaven) {
    console.log("[CDN] AlloHaven already loaded, skipping duplicate");
    return;
  }

  // ═══════════════════════════════════════════
  // allohaven_module.js — AlloHaven cozy-room meta-experience.
  //
  // Top-level module (sibling to symbol_studio_module.js, word_sounds_module.js).
  // Self-contained v1 (no cross-tool integration). Students earn 🪙 tokens by
  // completing Pomodoro focus sessions or writing reflection journal entries,
  // then spend tokens on AI-generated decorations placed on a wall+floor grid.
  // Decorations are template-constrained (6 categories × 3 slots × theme-aware
  // art styles) so AI generation stays safety-bounded and educationally
  // meaningful. No leaderboards, no streak punishment, no peer comparison.
  //
  // Phase 1 ships layers 1-4 (cozy game + trophy case + portfolio +
  // reflection journal). Phase 2+ adds memory-palace, cross-tool
  // integration, social peer-visiting, unified-save architecture.
  //
  // Persistence: state stored in localStorage key 'alloflow_allohaven_v1'.
  // Theme inherited from active AlloFlow theme via the shared StemLab
  // persistence key ('alloflow_stemlab_v2' → typingPractice.theme).
  // ═══════════════════════════════════════════

  // ── Reduced motion CSS (WCAG 2.3.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    if (document.head) document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-allohaven')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-allohaven';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ─────────────────────────────────────────────────────────
  // SECTION 1: PERSISTENCE
  // ─────────────────────────────────────────────────────────
  // localStorage-based state, matching the SymbolStudio pattern.
  // Single key, JSON-serialized state object. Read once on mount,
  // write on every state change.
  var STORAGE_KEY = 'alloflow_allohaven_v1';
  // STEM Lab's shared persistence key — used to read inherited theme from
  // Typing Practice (or any other tool that stamps state.theme there).
  var STEMLAB_STORAGE_KEY = 'alloflow_stemlab_v2';

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      console.warn('[AlloHaven] failed to load state:', e);
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[AlloHaven] failed to save state:', e);
    }
  }

  // Read the active AlloFlow theme from the shared STEM Lab data.
  // Typing Practice writes state.theme there via StemLab's `update` hook.
  // If unavailable, falls back to 'default'.
  function getInheritedTheme() {
    try {
      var raw = localStorage.getItem(STEMLAB_STORAGE_KEY);
      if (!raw) return { theme: 'default', highContrast: false };
      var parsed = JSON.parse(raw);
      var tp = (parsed && parsed.typingPractice) || {};
      return {
        theme: tp.theme || 'default',
        highContrast: !!(tp.accommodations && tp.accommodations.highContrast)
      };
    } catch (e) {
      return { theme: 'default', highContrast: false };
    }
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 2: DEFAULT STATE SHAPE
  // ─────────────────────────────────────────────────────────
  // Designed so v2+ cross-tool integrations don't require a refactor.
  // Object-shaped fields like `decorations[]` carry extension slots
  // (`linkedContent`, `sourceTool`, `aiRationale`) that are null in v1
  // but meaningful in v2+. Same for `earnings[]` — `source` is just
  // 'pomodoro' or 'reflection' in v1; future sources slot in additively.
  var DEFAULT_STATE = {
    // ── Onboarding ──
    onboardingSeen: false,
    toastsSeen: {
      firstPomodoro: false,
      firstReflection: false,
      firstZeroTokenClick: false
    },

    // ── Token economy ──
    tokens: 0,
    earnings: [
      // { source: 'pomodoro' | 'reflection' | 'cycle-bonus' | 'milestone',
      //   tokens, date: ISO, metadata }
    ],

    // ── Daily reset state ──
    // Resets at calendar-day rollover. Tracks per-day caps + the 3 prompts
    // shown today so they stay stable until midnight.
    dailyState: {
      date: null,                    // 'YYYY-MM-DD' — null = uninitialized
      pomodorosCompleted: 0,
      reflectionsSubmitted: 0,
      promptsForToday: [],           // array of 3 prompt ids selected at first visit of day
      quizTokensEarnedToday: 0       // memory-palace quiz tokens (capped at 2/day)
    },

    // ── Pomodoro ──
    pomodoroState: {
      active: false,
      phase: 'focus',                // 'focus' | 'short-break' | 'long-break'
      startedAt: null,
      durationMinutes: 25,
      cycleProgress: 0               // 0-3; advances after each focus completion
    },
    pomodoroPreferences: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15
    },

    // ── Room + decorations ──
    rooms: [
      { id: 'main', label: 'My Room', wallSlots: 8, floorSlots: 12 }
    ],
    decorations: [
      // {
      //   id, template, slots, artStyle,
      //   imageBase64,            // null for starter; populated after AI gen
      //   isStarter: bool,
      //   placement: { roomId, surface: 'wall'|'floor', cellIndex },
      //   rotation,               // ±3° randomized once
      //   earnedAt, tokensSpent,
      //   studentReflection,      // optional per-item text
      //   linkedContent: null,    // v2+ memory palace pointer
      //   sourceTool: null,       // v2+ cross-tool integration
      //   aiRationale: null       // v2+ AI summary of how earned
      // }
    ],

    // ── Journal ──
    journalEntries: [
      // { id, date: ISO, prompt: string|null, text, topics: [], tokensEarned: 1 }
    ],

    // ── Active modal (within AlloHaven; NOT the outer Open/Close state) ──
    activeModal: null,               // 'generate' | 'reflection' | 'journal' | 'settings' | null
    generateContext: null            // { surface, cellIndex } when generate modal open
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 3: THEME BASES
  // ─────────────────────────────────────────────────────────
  // Each theme's wallpaper + floor texture. AlloHaven inherits the active
  // theme from the shared STEM Lab localStorage. Decorations stay theme-
  // neutral; only the room base swaps. Switching themes feels like
  // changing paint, not destroying the student's stuff.
  var THEME_BASES = {
    'default': {
      wallpaper: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      floor: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
      accent: '#60a5fa', accentDim: '#3b82f6', text: '#e2e8f0', textDim: '#cbd5e1',
      textMute: '#a3a3a3', surface: '#1e293b', border: '#334155', success: '#34d399',
      warn: '#fbbf24', onAccent: '#0f172a', bg: '#0f172a'
    },
    'steampunk': {
      wallpaper: 'repeating-linear-gradient(0deg, #2d1f12 0px, #2d1f12 24px, #3d2d1c 24px, #3d2d1c 25px), linear-gradient(180deg, #2d1f12 0%, #1a1108 100%)',
      floor: 'repeating-linear-gradient(90deg, #3d2d1c 0px, #3d2d1c 32px, #2d1f12 32px, #2d1f12 33px), linear-gradient(180deg, #3d2d1c 0%, #2d1f12 100%)',
      accent: '#d4884c', accentDim: '#a66a35', text: '#f0e0c0', textDim: '#d4bc8a',
      textMute: '#a08868', surface: '#2d1f12', border: '#5a4528', success: '#88a850',
      warn: '#e8a040', onAccent: '#1a1108', bg: '#1a1108'
    },
    'cyberpunk': {
      wallpaper: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,0,168,0.04) 3px, rgba(255,0,168,0.04) 4px), linear-gradient(180deg, #1a0f2a 0%, #0a0514 100%)',
      floor: 'linear-gradient(180deg, #2a1f3a 0%, #1a0f2a 100%)',
      accent: '#ff00a8', accentDim: '#c00080', text: '#e0d8ff', textDim: '#c0b0e8',
      textMute: '#8070a0', surface: '#1a0f2a', border: '#3d2a5a', success: '#00ffc8',
      warn: '#ffd700', onAccent: '#0a0514', bg: '#0a0514'
    },
    'kawaii': {
      wallpaper: 'radial-gradient(circle at 20% 30%, rgba(232,90,138,0.08) 8px, transparent 9px), radial-gradient(circle at 70% 60%, rgba(232,90,138,0.06) 6px, transparent 7px), linear-gradient(180deg, #ffe8f2 0%, #fff5fa 100%)',
      floor: 'linear-gradient(180deg, #ffd6e5 0%, #ffe8f2 100%)',
      accent: '#e85a8a', accentDim: '#c03868', text: '#4a2838', textDim: '#6a4858',
      textMute: '#8a7080', surface: '#ffe8f2', border: '#f5c2d7', success: '#4a9a6a',
      warn: '#d4740a', onAccent: '#ffffff', bg: '#fff5fa'
    },
    'neutral': {
      wallpaper: 'linear-gradient(180deg, #262626 0%, #1a1a1a 100%)',
      floor: 'linear-gradient(180deg, #363636 0%, #262626 100%)',
      accent: '#b8a080', accentDim: '#8a7860', text: '#e8e8e8', textDim: '#c8c8c8',
      textMute: '#989898', surface: '#262626', border: '#444444', success: '#8aa078',
      warn: '#c89860', onAccent: '#1a1a1a', bg: '#1a1a1a'
    }
  };

  var HIGH_CONTRAST_BASE = {
    wallpaper: '#000000', floor: '#000000', accent: '#ffff00', accentDim: '#ffee00',
    text: '#ffffff', textDim: '#ffffff', textMute: '#ffff00', surface: '#111111',
    border: '#ffffff', success: '#00ff00', warn: '#ffaa00', onAccent: '#000000',
    bg: '#000000'
  };

  function getThemeBase(themeName, highContrast) {
    if (highContrast) return HIGH_CONTRAST_BASE;
    return THEME_BASES[themeName] || THEME_BASES['default'];
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3.5: REFLECTION PROMPTS
  // ─────────────────────────────────────────────────────────
  // ~30 prompts across 7 thematic categories. The reflection modal
  // shows 3 (stable for the day, picked at first visit). Categories
  // are roughly balanced; mood / body and learning are slightly
  // overweighted because they're the most common "what would help"
  // prompts in clinical reflection-journaling research.
  var PROMPT_BANK = [
    // Learning
    { id: 'l1', cat: 'learning', text: "What's something you learned recently?" },
    { id: 'l2', cat: 'learning', text: "What's a question you've been thinking about?" },
    { id: 'l3', cat: 'learning', text: "What's something that surprised you this week?" },
    { id: 'l4', cat: 'learning', text: "Was there a moment today when something clicked for you?" },
    { id: 'l5', cat: 'learning', text: "What's a topic you'd like to explore more?" },
    // Gratitude
    { id: 'g1', cat: 'gratitude', text: "Something small that went well today?" },
    { id: 'g2', cat: 'gratitude', text: "Who or what helped you this week?" },
    { id: 'g3', cat: 'gratitude', text: "What's one thing you appreciate right now?" },
    // Mood / body
    { id: 'm1', cat: 'mood', text: "How are you feeling right now?" },
    { id: 'm2', cat: 'mood', text: "What's the weather like inside your head?" },
    { id: 'm3', cat: 'mood', text: "How does your body feel?" },
    { id: 'm4', cat: 'mood', text: "If today was a color, what color would it be?" },
    { id: 'm5', cat: 'mood', text: "What's your energy level like today, on a scale that makes sense to you?" },
    // Future
    { id: 'f1', cat: 'future', text: "What's something you're looking forward to?" },
    { id: 'f2', cat: 'future', text: "What's one tiny thing you want to do tomorrow?" },
    { id: 'f3', cat: 'future', text: "If you had an extra hour today, how would you spend it?" },
    // Achievement
    { id: 'a1', cat: 'achievement', text: "What's something you're proud of?" },
    { id: 'a2', cat: 'achievement', text: "What's something you did this week that took effort?" },
    { id: 'a3', cat: 'achievement', text: "What's a small win from today?" },
    { id: 'a4', cat: 'achievement', text: "What did you handle better than you expected?" },
    // Curiosity
    { id: 'c1', cat: 'curiosity', text: "What's a question you wish you could ask anyone?" },
    { id: 'c2', cat: 'curiosity', text: "What's something you noticed today?" },
    { id: 'c3', cat: 'curiosity', text: "What's something you'd like to be better at?" },
    { id: 'c4', cat: 'curiosity', text: "What's something that doesn't make sense to you yet?" },
    // Free
    { id: 'fr1', cat: 'free', text: "What's on your mind?" },
    { id: 'fr2', cat: 'free', text: "Write whatever you want." },
    { id: 'fr3', cat: 'free', text: "Tell future-you something." },
    // Sensory / body-aware (helps regulate; clinically supported)
    { id: 's1', cat: 'mood', text: "Name 3 things you can see, hear, or feel right now." },
    { id: 's2', cat: 'mood', text: "Where is your attention right now? On something inside or outside your head?" },
    // Connection
    { id: 'cn1', cat: 'gratitude', text: "Was there a moment you felt connected to someone today?" }
  ];

  function pickRandomPrompts(n) {
    // Fisher-Yates partial shuffle — picks n unique prompts from PROMPT_BANK
    var pool = PROMPT_BANK.slice();
    var picked = [];
    for (var i = 0; i < n && pool.length > 0; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx].id);
      pool.splice(idx, 1);
    }
    return picked;
  }

  function getPromptText(promptId) {
    for (var i = 0; i < PROMPT_BANK.length; i++) {
      if (PROMPT_BANK[i].id === promptId) return PROMPT_BANK[i].text;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3.6: DECORATION TEMPLATES
  // ─────────────────────────────────────────────────────────
  // 6 categories, each with 3 curated slots and a base prompt that gets
  // filled at generation time. Companions + Window views use a
  // hierarchical category→specific picker (slot 0 = category, slot 1 =
  // specific). All other templates are flat 3-slot pickers.
  //
  // Surface determines which grid cells the template can appear in:
  // 'wall', 'floor', or 'both' (lamps + lighting variants).
  //
  // Prompt suffixes 'no text' and 'single object' are critical safety/
  // quality constraints. AI image gen tends to hallucinate text on
  // educational-looking content; explicit 'no text' reduces that.
  var TEMPLATES = [
    {
      id: 'plants',
      label: 'Plants',
      icon: '🪴',
      surface: 'floor',
      basePrompt: 'A {potColor} {potStyle} pot holding a {plantType} plant, {artStyle}, friendly cozy children\'s aesthetic, single object on white background, no text',
      slots: [
        { id: 'plantType', label: 'Plant', options: ['fern', 'cactus', 'leafy houseplant', 'succulent', 'flower', 'trailing vine'] },
        { id: 'potColor',  label: 'Pot color', options: ['terracotta', 'blue', 'cream', 'sage', 'pink', 'white'] },
        { id: 'potStyle',  label: 'Pot style', options: ['ceramic', 'clay', 'wicker', 'glass', 'hanging planter'] }
      ]
    },
    {
      id: 'posters',
      label: 'Posters & wall art',
      icon: '🖼',
      surface: 'wall',
      basePrompt: 'A {posterType} poster about {subject}, {colorPalette} palette, {artStyle}, framed cleanly, no readable text, friendly age-appropriate aesthetic',
      slots: [
        { id: 'posterType',   label: 'Type', options: ['educational diagram', 'illustrated map', 'aspirational scene', 'abstract pattern', 'subject portrait', 'scientific cross-section'] },
        { id: 'subject',      label: 'Subject', tileGrid: true, options: ['animals', 'space & planets', 'oceans', 'weather', 'plants & nature', 'machines & inventions', 'vehicles', 'history', 'cultures & celebrations', 'math concepts', 'science', 'music & instruments', 'sports', 'dinosaurs'] },
        { id: 'colorPalette', label: 'Color palette', options: ['warm earth', 'cool blue', 'vibrant rainbow', 'pastel', 'monochrome', 'sunset'] }
      ]
    },
    {
      id: 'companions',
      label: 'Companions',
      icon: '🐾',
      surface: 'floor',
      basePrompt: 'A {color} {specific}, {pose}, {artStyle}, friendly cozy children\'s aesthetic, single subject, no text',
      hierarchical: true,
      slots: [
        { id: 'category', label: 'Category', options: ['Real animal', 'Imaginary creature', 'Stuffed companion'] },
        { id: 'specific', label: 'Pick one', dependsOn: 'category', optionsByCategory: {
          'Real animal':       ['cat', 'dog', 'rabbit', 'bird', 'fish', 'hamster', 'hedgehog'],
          'Imaginary creature':['dragon', 'unicorn', 'robot', 'alien', 'phoenix', 'fairy', 'friendly monster'],
          'Stuffed companion': ['teddy bear', 'plush bunny', 'plush elephant', 'plush cat', 'plush dragon', 'plush whale']
        }},
        { id: 'color', label: 'Color', options: ['warm brown', 'soft gray', 'cream', 'vibrant red', 'pastel pink', 'gold'] },
        { id: 'pose',  label: 'Pose',  options: ['sitting', 'sleeping', 'curled up', 'looking up', 'playful', 'stretching'] }
      ]
    },
    {
      id: 'lamps',
      label: 'Lamps & lighting',
      icon: '💡',
      surface: 'both',
      basePrompt: 'A {style} {lampType} with a {shadeColor} shade, glowing softly, {artStyle}, single object, friendly cozy aesthetic, no text',
      slots: [
        { id: 'lampType',   label: 'Lamp type', options: ['floor lamp', 'desk lamp', 'string lights', 'paper lantern', 'wall sconce', 'candle in glass', 'pendant light'] },
        { id: 'shadeColor', label: 'Shade color', options: ['warm white', 'soft yellow', 'sage green', 'cream', 'dusty pink', 'sky blue'] },
        { id: 'style',      label: 'Style', options: ['vintage', 'modern', 'whimsical', 'classic', 'simple'] }
      ]
    },
    {
      id: 'books',
      label: 'Books & collections',
      icon: '📚',
      surface: 'floor',
      basePrompt: 'A {arrangement} {collectionType}, {colorTheme} palette, {artStyle}, single arrangement on white background, no text',
      slots: [
        { id: 'collectionType', label: 'Collection', options: ['book stack', 'open book on stand', 'sheet music', 'sports trophies', 'natural collection', 'stamps & cards', 'model collection', 'art & craft supplies'] },
        { id: 'colorTheme',     label: 'Colors', options: ['warm browns', 'jewel tones', 'pastels', 'monochrome', 'earth tones', 'vibrant'] },
        { id: 'arrangement',    label: 'Arrangement', options: ['tidy', 'slightly scattered', 'stacked tall', 'grouped by size'] }
      ]
    },
    {
      id: 'windows',
      label: 'Window views',
      icon: '🪟',
      surface: 'wall',
      basePrompt: 'A {specific} viewed through a wooden window frame at {timeOfDay}, {weather} weather, {artStyle}, friendly cozy aesthetic, no text',
      hierarchical: true,
      slots: [
        { id: 'category', label: 'Scene', options: ['Nature', 'Urban', 'Cultural', 'Fantasy'] },
        { id: 'specific', label: 'Pick one', dependsOn: 'category', optionsByCategory: {
          'Nature':   ['forest', 'ocean', 'mountains', 'garden', 'countryside', 'waterfall'],
          'Urban':    ['city skyline', 'stadium', 'concert hall', 'street market', 'city park'],
          'Cultural': ['cultural landmark', 'festival scene', 'bustling marketplace'],
          'Fantasy':  ['starry sky', 'floating islands', 'enchanted forest', 'underwater realm']
        }},
        { id: 'timeOfDay', label: 'Time of day', options: ['dawn', 'midday', 'golden hour', 'sunset', 'twilight', 'night'] },
        { id: 'weather',   label: 'Weather/mood', options: ['clear', 'gentle rain', 'snow', 'misty', 'cherry blossoms', 'autumn leaves'] }
      ]
    }
  ];

  // ART_STYLES — 6 styles, each has a sub-prompt fragment that gets
  // appended to the {artStyle} slot in the template's basePrompt.
  // Each theme has a default style; the picker pre-selects it but
  // students can override per-decoration.
  var ART_STYLES = [
    { id: 'watercolor',     label: 'Soft watercolor',           prompt: 'soft watercolor illustration, gentle pastel washes, organic edges' },
    { id: 'pastel',         label: 'Pastel illustration',        prompt: 'soft pastel illustration, kawaii cute children\'s book aesthetic, gentle outlines' },
    { id: 'neon',           label: 'Neon line art',              prompt: 'neon-bright line art on dark background, vibrant cyberpunk register, glowing edges' },
    { id: 'sepia',          label: 'Vintage etching',            prompt: 'sepia-toned vintage etching, fine line work, weathered paper texture, victorian register' },
    { id: 'minimalist',     label: 'Minimalist line',            prompt: 'minimalist black-and-white line art, clean simple geometric shapes, no shading' },
    { id: 'children-book',  label: 'Children\'s book',           prompt: 'warm children\'s book illustration, soft outlines, gentle color shading, picture-book style' }
  ];

  // Theme → default art style ID. Used when the modal first opens.
  var THEME_DEFAULT_STYLE = {
    'default':   'watercolor',
    'kawaii':    'pastel',
    'cyberpunk': 'neon',
    'steampunk': 'sepia',
    'neutral':   'minimalist'
  };

  function getTemplate(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return null;
  }

  function getArtStyle(id) {
    for (var i = 0; i < ART_STYLES.length; i++) {
      if (ART_STYLES[i].id === id) return ART_STYLES[i];
    }
    return ART_STYLES[0];
  }

  function getThemeDefaultStyleId(themeName) {
    return THEME_DEFAULT_STYLE[themeName] || THEME_DEFAULT_STYLE['default'];
  }

  // Pick a random option from a list (Surprise me + helper utility)
  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Surprise me — returns a fully populated slots object for the given
  // template, randomized. For hierarchical templates, also resolves the
  // dependent slot consistently.
  function surpriseSlotsFor(template) {
    var result = {};
    template.slots.forEach(function(slot) {
      if (slot.dependsOn) {
        // Hierarchical: pick parent first then dependent
        var parentVal = result[slot.dependsOn];
        var pool = (slot.optionsByCategory || {})[parentVal] || [];
        result[slot.id] = pickRandom(pool);
      } else {
        result[slot.id] = pickRandom(slot.options);
      }
    });
    return result;
  }

  // Build the final AI prompt by interpolating slots + art-style suffix
  // into the template's basePrompt. Replaces {slotId} tokens.
  function buildAIPrompt(template, slots, artStyleId) {
    var artStyle = getArtStyle(artStyleId);
    var prompt = template.basePrompt;
    Object.keys(slots).forEach(function(key) {
      prompt = prompt.replace(new RegExp('\\{' + key + '\\}', 'g'), slots[key] || '');
    });
    prompt = prompt.replace(/\{artStyle\}/g, artStyle.prompt);
    return prompt;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 4: STARTER FERN — hardcoded SVG so Day 1 has a friendly
  // placed item without requiring AI image generation.
  // ─────────────────────────────────────────────────────────
  var STARTER_FERN_SVG = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">',
    '<path d="M28 60 L32 92 L68 92 L72 60 Z" fill="#c87850" stroke="#8a4a2a" stroke-width="1.5"/>',
    '<rect x="26" y="56" width="48" height="8" fill="#a66238" stroke="#8a4a2a" stroke-width="1.5"/>',
    '<path d="M50 56 Q50 30 35 18 Q42 28 40 50 M50 56 Q50 30 65 18 Q58 28 60 50" fill="none" stroke="#4a8a4a" stroke-width="3" stroke-linecap="round"/>',
    '<path d="M50 56 Q50 36 28 28 Q36 38 38 54 M50 56 Q50 36 72 28 Q64 38 62 54" fill="none" stroke="#5aa050" stroke-width="2.5" stroke-linecap="round"/>',
    '<path d="M50 56 Q50 42 22 42 Q32 48 38 56 M50 56 Q50 42 78 42 Q68 48 62 56" fill="none" stroke="#5aa050" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M50 56 L50 22" stroke="#3a7a3a" stroke-width="2.5" stroke-linecap="round"/>',
    '<ellipse cx="36" cy="64" rx="3" ry="6" fill="rgba(255,255,255,0.18)"/>',
    '</svg>'
  ].join('');

  function getStarterFernDataUri() {
    return 'data:image/svg+xml;base64,' + (typeof btoa !== 'undefined' ? btoa(STARTER_FERN_SVG) : '');
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 5: STYLE INJECTION
  // ─────────────────────────────────────────────────────────
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allohaven-styles')) return;
    var style = document.createElement('style');
    style.id = 'allohaven-styles';
    style.textContent = [
      '.ah-root button:focus-visible,',
      '.ah-root [tabindex]:focus-visible,',
      '.ah-root [role="button"]:focus-visible,',
      '.ah-root input:focus-visible,',
      '.ah-root textarea:focus-visible {',
      '  outline: 3px solid #fbbf24;',
      '  outline-offset: 2px;',
      '  border-radius: 8px;',
      '}',
      '@keyframes ah-token-tick { 0% { opacity: 0.55; transform: scale(0.92); } 40% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }',
      '.ah-root .ah-token-tick { display: inline-block; animation: ah-token-tick 220ms ease-out 1; }',
      '.ah-root .ah-decoration { transition: transform 160ms ease, filter 200ms ease; cursor: pointer; }',
      '.ah-root .ah-decoration:hover, .ah-root .ah-decoration:focus-visible { transform: translateY(-2px); filter: brightness(1.06); }',
      '.ah-root .ah-empty-cell { transition: background 140ms ease, border-color 140ms ease; cursor: pointer; }',
      '.ah-root .ah-empty-cell:hover, .ah-root .ah-empty-cell:focus-visible { background: rgba(255,255,255,0.06); }',
      // Decoration delete (✕) button — fades in on hover/focus only.
      // Two-tap deletion via the confirm modal below ensures students
      // can\'t accidentally remove items.
      '.ah-root .ah-decoration:hover .ah-decoration-delete,',
      '.ah-root .ah-decoration:focus-within .ah-decoration-delete,',
      '.ah-root .ah-decoration-delete:focus-visible { opacity: 1 !important; }',
      // Image-error fallback — when an <img> fails (truncated base64,
      // storage corruption), the parent gets data-img-failed=1 and we
      // overlay a friendly question-mark. Doesn\'t block; cell still
      // clickable for delete.
      '.ah-root .ah-decoration[data-img-failed="1"]::after { content: "?"; color: rgba(255,255,255,0.55); font-size: 32px; font-weight: 700; }',
      '@keyframes ah-fade-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }',
      '.ah-root .ah-welcome { animation: ah-fade-in 320ms ease-out 1; }',
      // Warm-light overlay — soft yellow radial from the upper-right corner
      // of the room frame. Suppressed when high-contrast mode is on (an
      // accessibility accommodation overrides the cozy aesthetic).
      // Opacity is low enough that it doesn\'t fight decoration colors.
      '.ah-root .ah-room-frame { position: relative; }',
      '.ah-root .ah-room-frame::before {',
      '  content: "";',
      '  position: absolute;',
      '  inset: 0;',
      '  pointer-events: none;',
      '  background: radial-gradient(ellipse at 85% 0%, rgba(255,220,140,0.08), transparent 60%);',
      '  border-radius: inherit;',
      '  z-index: 1;',
      '}',
      // Decorations + cells need to render ABOVE the warm-light overlay.
      '.ah-root .ah-room-frame > * { position: relative; z-index: 2; }',
      // Mobile/responsive — narrow viewports collapse the grids to fewer
      // columns so cells stay tap-target sized. Below 480px: wall = 2
      // cols, floor = 3 cols. The grid auto-rows expand so the same
      // total cell count still fits, just on more rows.
      '@media (max-width: 480px) {',
      '  .ah-root .ah-wall-grid { grid-template-columns: repeat(2, 1fr) !important; }',
      '  .ah-root .ah-floor-grid { grid-template-columns: repeat(3, 1fr) !important; }',
      '}',
      // Voice-recording pulse — visual signal that the mic is hot. Slow + soft
      // so it doesn’t become alarm-like for sensory-sensitive students.
      '@keyframes ah-record-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(230,57,70,0.6); } 50% { box-shadow: 0 0 0 8px rgba(230,57,70,0); } }',
      // Loading-slide bar — used during AI image generation (~5-15s).
      // Indeterminate progress: a 40% bar slides left↔right.
      '@keyframes ah-loading-slide { 0% { left: -40%; } 100% { left: 100%; } }',
      // Memory-content "due for review" pulse — soft yellow halo on the
      // 📖 indicator when a decoration\'s linkedContent hasn\'t been
      // reviewed in 5+ days. Subtle so it doesn\'t demand attention,
      // just signals "this knowledge is fading". Suppressed under
      // reduced-motion (the brighter background still serves as a
      // non-animated cue).
      '@keyframes ah-memory-due-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,220,140,0.6); } 50% { box-shadow: 0 0 0 4px rgba(255,220,140,0); } }',
      '.ah-root .ah-memory-indicator.ah-memory-due { animation: ah-memory-due-pulse 2400ms ease-in-out infinite; }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .ah-root .ah-token-tick,',
      '  .ah-root .ah-welcome,',
      '  .ah-root .ah-memory-indicator.ah-memory-due { animation: none !important; }',
      '  .ah-root .ah-decoration:hover,',
      '  .ah-root .ah-decoration:focus-visible { transform: none !important; }',
      '  button { animation: none !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  })();

  // ─────────────────────────────────────────────────────────
  // SECTION 6: STYLE HELPERS
  // ─────────────────────────────────────────────────────────
  function primaryBtnStyle(palette) {
    return {
      background: palette.accent, color: palette.onAccent, border: 'none',
      borderRadius: '8px', padding: '10px 18px', fontSize: '13px',
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'filter 120ms ease'
    };
  }
  function secondaryBtnStyle(palette) {
    return {
      background: 'transparent', color: palette.textDim,
      border: '1px solid ' + palette.border, borderRadius: '8px',
      padding: '8px 14px', fontSize: '12px', fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'background 120ms ease, color 120ms ease'
    };
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6.5: SUB-COMPONENTS
  // ─────────────────────────────────────────────────────────
  // ReflectionModalInner — renders the prompt-pick + text area + voice
  // button + character counter. Local React state for the draft so the
  // outer component doesn't re-render on every keystroke.
  function ReflectionModalInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;

    var draftTuple = useState('');
    var draft = draftTuple[0];
    var setDraft = draftTuple[1];

    var pickedTuple = useState(p.promptIds && p.promptIds.length ? p.promptIds[0] : null);
    var pickedPromptId = pickedTuple[0];
    var setPickedPromptId = pickedTuple[1];

    var palette = p.palette;
    var minChars = 20;
    var charCount = draft.trim().length;
    var canSubmit = charCount >= minChars;

    // When voice transcribes, append to draft
    function onTranscript(text) {
      setDraft(function(prev) { return (prev ? prev + ' ' : '') + text; });
    }

    function handleVoiceClick() {
      if (p.isRecording) {
        p.stopVoice();
      } else {
        p.startVoice(onTranscript);
      }
    }

    function handleSubmit() {
      if (!canSubmit) return;
      p.stopVoice();
      p.onSubmit(draft, pickedPromptId);
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Write a reflection',
      onClick: function(e) {
        if (e.target === e.currentTarget) p.onClose();
      },
      style: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 175,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg,
          border: '1px solid ' + palette.border,
          borderRadius: '14px',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }
        },
          h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } }, '📝 Reflection'),
          h('button', {
            onClick: p.onClose,
            'aria-label': 'Close reflection',
            style: {
              background: 'transparent',
              border: '1px solid ' + palette.border,
              color: palette.textDim,
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, '✕')
        ),
        // Prompt picker
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          "Today's prompts · pick one or write your own"),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' } },
          (p.promptIds || []).map(function(pid) {
            var text = getPromptText(pid);
            if (!text) return null;
            var active = pid === pickedPromptId;
            return h('button', {
              key: 'pp-' + pid,
              onClick: function() { setPickedPromptId(pid); },
              'aria-pressed': active ? 'true' : 'false',
              style: {
                background: active ? palette.surface : 'transparent',
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                color: palette.text,
                textAlign: 'left',
                lineHeight: '1.4'
              }
            }, text);
          })
        ),
        // Text area + voice button
        h('div', { style: { position: 'relative', marginBottom: '8px' } },
          h('textarea', {
            value: draft,
            onChange: function(e) { setDraft(e.target.value); },
            placeholder: 'Take your time. Anything goes.',
            'aria-label': 'Reflection text',
            rows: 6,
            style: {
              width: '100%',
              padding: '10px 12px',
              paddingRight: p.speechSupported ? '48px' : '12px',
              background: palette.surface,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              color: palette.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              resize: 'vertical',
              boxSizing: 'border-box'
            }
          }),
          // Voice mic button
          p.speechSupported ? h('button', {
            onClick: handleVoiceClick,
            'aria-label': p.isRecording ? 'Stop voice recording' : 'Start voice recording',
            'aria-pressed': p.isRecording ? 'true' : 'false',
            title: p.isRecording ? 'Recording — click to stop' : 'Click to dictate (voice-to-text)',
            style: {
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: p.isRecording ? palette.danger || '#e63946' : palette.surface,
              color: p.isRecording ? '#fff' : palette.text,
              border: '1px solid ' + (p.isRecording ? (palette.danger || '#e63946') : palette.border),
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: p.isRecording ? 'ah-record-pulse 1.6s ease-in-out infinite' : 'none'
            }
          }, p.isRecording ? '⏺' : '🎤') : null
        ),
        // Character counter
        h('div', {
          style: {
            fontSize: '11px',
            color: charCount >= minChars ? palette.success : palette.textMute,
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between'
          }
        },
          h('span', null, charCount + ' character' + (charCount === 1 ? '' : 's')),
          h('span', { style: { fontStyle: 'italic' } },
            charCount >= minChars
              ? (p.alreadyEarnedToday ? '✓ ready to save (no extra token today)' : '✓ ready to earn 🪙 +1')
              : minChars + ' characters to save')
        ),
        // Submit + cancel
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' } },
          h('button', {
            onClick: p.onClose,
            style: {
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Cancel'),
          h('button', {
            onClick: handleSubmit,
            disabled: !canSubmit,
            style: {
              background: canSubmit ? palette.accent : palette.surface,
              color: canSubmit ? palette.onAccent : palette.textMute,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              opacity: canSubmit ? 1 : 0.6
            }
          }, p.alreadyEarnedToday ? 'Save' : 'Save & earn 🪙')
        )
      )
    );
  }

  // JournalEntryRow — single entry display with edit + delete.
  // Inline-edit mode toggles between read-only display and a textarea.
  function JournalEntryRow(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;

    var entry = p.entry;
    var palette = p.palette;
    var editingTuple = useState(false);
    var editing = editingTuple[0];
    var setEditing = editingTuple[1];
    var draftTuple = useState(entry.text || '');
    var draft = draftTuple[0];
    var setDraft = draftTuple[1];

    var date = new Date(entry.date);
    var dateStr = date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    function handleSave() {
      var trimmed = (draft || '').trim();
      if (!trimmed) return;
      p.onEdit(trimmed);
      setEditing(false);
    }

    return h('div', {
      role: 'article',
      'aria-label': 'Journal entry from ' + dateStr,
      style: {
        background: palette.surface,
        border: '1px solid ' + palette.border,
        borderRadius: '10px',
        padding: '12px 14px'
      }
    },
      h('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }
      },
        h('span', {
          style: { fontSize: '11px', color: palette.textMute, fontWeight: 600, letterSpacing: '0.02em' }
        }, dateStr + (entry.editedAt ? ' · edited' : '')),
        h('span', {
          style: { fontSize: '11px', color: entry.tokensEarned > 0 ? palette.accent : palette.textMute, fontWeight: 700 }
        }, entry.tokensEarned > 0 ? '🪙 +' + entry.tokensEarned : '·')
      ),
      entry.prompt ? h('div', {
        style: {
          fontSize: '11px',
          color: palette.textDim,
          fontStyle: 'italic',
          marginBottom: '6px',
          lineHeight: '1.4'
        }
      }, '"' + entry.prompt + '"') : null,
      editing ? h('textarea', {
        value: draft,
        onChange: function(e) { setDraft(e.target.value); },
        rows: 4,
        style: {
          width: '100%',
          padding: '8px 10px',
          background: palette.bg,
          border: '1px solid ' + palette.border,
          borderRadius: '6px',
          color: palette.text,
          fontSize: '13px',
          fontFamily: 'inherit',
          lineHeight: '1.5',
          boxSizing: 'border-box',
          marginBottom: '8px',
          resize: 'vertical'
        }
      }) : h('div', {
        style: {
          fontSize: '13px',
          color: palette.text,
          lineHeight: '1.55',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginBottom: '8px'
        }
      }, entry.text),
      h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
        editing ? [
          h('button', {
            key: 'cancel',
            onClick: function() { setDraft(entry.text || ''); setEditing(false); },
            style: {
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Cancel'),
          h('button', {
            key: 'save',
            onClick: handleSave,
            style: {
              background: palette.accent,
              color: palette.onAccent,
              border: 'none',
              borderRadius: '6px',
              padding: '4px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Save')
        ] : [
          h('button', {
            key: 'edit',
            onClick: function() { setEditing(true); setDraft(entry.text || ''); },
            'aria-label': 'Edit this entry',
            style: {
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Edit'),
          h('button', {
            key: 'delete',
            onClick: p.onDelete,
            'aria-label': 'Delete this entry',
            style: {
              background: 'transparent',
              color: palette.textMute,
              border: '1px solid ' + palette.border,
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, '🗑')
        ]
      )
    );
  }

  // GenerateModalInner — multi-step decoration creation flow.
  // Steps: 'pick-template' → 'configure' → 'generating' → 'review' → 'reflect'
  // Surprise-me skips configure and goes straight to generating.
  // 30s free-regenerate window after first generation; post-window
  // regen costs 1 token. Token cost (3) charged at FIRST generate;
  // refunded on AI failure (handled in generateDecoration).
  function GenerateModalInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;

    var palette = p.palette;
    var ctx = p.generateContext || { surface: 'floor', cellIndex: 0 };
    var inheritedStyleId = getThemeDefaultStyleId(p.themeName || 'default');

    // Filter templates by surface (wall vs floor; 'both' shows in either)
    var availableTemplates = TEMPLATES.filter(function(t) {
      return t.surface === ctx.surface || t.surface === 'both';
    });

    var stepTuple = useState('pick-template');
    var step = stepTuple[0];
    var setStep = stepTuple[1];

    var templateTuple = useState(null);
    var template = templateTuple[0];
    var setTemplate = templateTuple[1];

    var slotsTuple = useState({});
    var slots = slotsTuple[0];
    var setSlots = slotsTuple[1];

    var artStyleTuple = useState(inheritedStyleId);
    var artStyleId = artStyleTuple[0];
    var setArtStyleId = artStyleTuple[1];

    var imageTuple = useState(null);
    var imageBase64 = imageTuple[0];
    var setImageBase64 = imageTuple[1];

    var errorTuple = useState(null);
    var error = errorTuple[0];
    var setError = errorTuple[1];

    var hasGeneratedTuple = useState(false);
    var hasGenerated = hasGeneratedTuple[0];
    var setHasGenerated = hasGeneratedTuple[1];

    var freeUntilTuple = useState(0);  // timestamp ms
    var freeUntil = freeUntilTuple[0];
    var setFreeUntil = freeUntilTuple[1];

    var nowTuple = useState(Date.now());
    var now = nowTuple[0];
    var setNow = nowTuple[1];

    // Tick to keep the free-regenerate countdown visible
    useEffect(function() {
      if (step !== 'review') return;
      if (now >= freeUntil) return;
      var iv = setInterval(function() { setNow(Date.now()); }, 250);
      return function() { clearInterval(iv); };
      // eslint-disable-next-line
    }, [step, freeUntil]);

    var reflectionDraftTuple = useState('');
    var reflectionDraft = reflectionDraftTuple[0];
    var setReflectionDraft = reflectionDraftTuple[1];

    function handlePickTemplate(t) {
      setTemplate(t);
      // Pre-fill first option for each slot for hierarchical templates
      var initial = {};
      t.slots.forEach(function(slot) {
        if (!slot.dependsOn && slot.options && slot.options.length > 0) {
          initial[slot.id] = slot.options[0];
        }
      });
      setSlots(initial);
      setStep('configure');
    }

    function handleSurpriseMe(t) {
      var randomized = surpriseSlotsFor(t);
      setTemplate(t);
      setSlots(randomized);
      setArtStyleId(inheritedStyleId);
      doGenerate(t, randomized, inheritedStyleId, false, false);
    }

    function doGenerate(t, s, styleId, isRegenerate, isFreeRegenerate) {
      setStep('generating');
      setError(null);
      p.onGenerate(t, s, styleId, isRegenerate, isFreeRegenerate, function(result) {
        if (result.error) {
          if (result.error === 'insufficient') {
            setError('Need ' + (isRegenerate && !isFreeRegenerate ? 1 : 3) + ' tokens. Earn more by focusing or reflecting.');
          } else {
            setError(result.error);
          }
          // On error, return to configure step so user can adjust + retry
          setStep(template ? 'configure' : 'pick-template');
          return;
        }
        setImageBase64(result.imageBase64);
        setHasGenerated(true);
        setStep('review');
        if (!isRegenerate) {
          setFreeUntil(Date.now() + 30 * 1000);
        } else {
          // Reset 30s window? No — original window has elapsed. Just mark
          // freeUntil to past so the button always shows the paid label.
          setFreeUntil(0);
        }
      });
    }

    function handleAccept() {
      // Move to optional reflection step
      setStep('reflect');
    }

    function handleSkipReflection() {
      p.onPlace(template, slots, artStyleId, imageBase64, '');
    }

    function handleSubmitReflection() {
      p.onPlace(template, slots, artStyleId, imageBase64, reflectionDraft);
    }

    function handleClose() {
      p.onClose();
    }

    // Render a single slot configurator
    function renderSlotControl(slot) {
      var pool = slot.options;
      if (slot.dependsOn) {
        var parentVal = slots[slot.dependsOn];
        pool = (slot.optionsByCategory || {})[parentVal] || [];
      }
      if (slot.tileGrid) {
        return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' } },
          pool.map(function(opt) {
            var active = slots[slot.id] === opt;
            return h('button', {
              key: slot.id + '-' + opt,
              onClick: function() {
                var next = Object.assign({}, slots); next[slot.id] = opt; setSlots(next);
              },
              'aria-pressed': active ? 'true' : 'false',
              style: {
                background: active ? palette.surface : 'transparent',
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                color: palette.text,
                textAlign: 'left',
                lineHeight: '1.3'
              }
            }, opt);
          })
        );
      }
      // Default: chip row
      return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
        pool.map(function(opt) {
          var active = slots[slot.id] === opt;
          return h('button', {
            key: slot.id + '-' + opt,
            onClick: function() {
              var next = Object.assign({}, slots); next[slot.id] = opt;
              // If this is a parent in a hierarchical setup, reset dependent
              if (template) {
                template.slots.forEach(function(s) {
                  if (s.dependsOn === slot.id) {
                    var depPool = (s.optionsByCategory || {})[opt] || [];
                    next[s.id] = depPool[0] || '';
                  }
                });
              }
              setSlots(next);
            },
            'aria-pressed': active ? 'true' : 'false',
            style: {
              background: active ? palette.accent : 'transparent',
              color: active ? palette.onAccent : palette.text,
              border: '1.5px solid ' + (active ? palette.accent : palette.border),
              borderRadius: '999px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, opt);
        })
      );
    }

    // ── Steps ──
    var stepBody;

    if (step === 'pick-template') {
      stepBody = h('div', null,
        h('p', { style: { fontSize: '13px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' } },
          'Pick a category. Each cell on the ' + ctx.surface + ' supports specific kinds of decorations.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' } },
          availableTemplates.map(function(t) {
            return h('div', {
              key: 'tmpl-' + t.id,
              style: { display: 'flex', flexDirection: 'column', gap: '4px' }
            },
              h('button', {
                onClick: function() { handlePickTemplate(t); },
                style: {
                  background: palette.surface,
                  border: '1.5px solid ' + palette.border,
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  color: palette.text,
                  transition: 'border-color 140ms ease, transform 140ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'center'
                }
              },
                h('span', { style: { fontSize: '32px' } }, t.icon),
                h('span', { style: { fontSize: '13px', fontWeight: 700 } }, t.label)
              ),
              h('button', {
                onClick: function() { handleSurpriseMe(t); },
                disabled: p.tokens < DECORATION_COST,
                style: {
                  background: 'transparent',
                  color: p.tokens < DECORATION_COST ? palette.textMute : palette.accent,
                  border: '1px dashed ' + palette.border,
                  borderRadius: '6px',
                  padding: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: p.tokens < DECORATION_COST ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.02em'
                }
              }, '🎲 Surprise me')
            );
          })
        )
      );
    } else if (step === 'configure' && template) {
      var canGenerate = p.tokens >= DECORATION_COST;
      stepBody = h('div', null,
        h('button', {
          onClick: function() { setStep('pick-template'); setTemplate(null); setError(null); },
          style: {
            background: 'transparent',
            color: palette.textDim,
            border: 'none',
            padding: '4px 0',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '10px',
            fontFamily: 'inherit'
          }
        }, '← Back to categories'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' } },
          h('span', { style: { fontSize: '32px' } }, template.icon),
          h('h4', { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: palette.text } }, template.label)
        ),
        // Slots
        template.slots.map(function(slot) {
          if (slot.dependsOn && !slots[slot.dependsOn]) return null;
          return h('div', { key: 'slot-' + slot.id, style: { marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } }, slot.label),
            renderSlotControl(slot)
          );
        }),
        // Art style
        h('div', { style: { marginBottom: '12px', paddingTop: '8px', borderTop: '1px solid ' + palette.border } },
          h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } }, 'Art style'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
            ART_STYLES.map(function(s) {
              var active = artStyleId === s.id;
              return h('button', {
                key: 's-' + s.id,
                onClick: function() { setArtStyleId(s.id); },
                'aria-pressed': active ? 'true' : 'false',
                style: {
                  background: active ? palette.accent : 'transparent',
                  color: active ? palette.onAccent : palette.text,
                  border: '1.5px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, s.label);
            })
          )
        ),
        error ? h('div', {
          style: {
            padding: '8px 12px',
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fca5a5',
            marginBottom: '10px'
          }
        }, error) : null,
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' } },
          h('button', {
            onClick: handleClose,
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1px solid ' + palette.border, borderRadius: '8px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Cancel'),
          h('button', {
            onClick: function() { doGenerate(template, slots, artStyleId, false, false); },
            disabled: !canGenerate,
            style: {
              background: canGenerate ? palette.accent : palette.surface,
              color: canGenerate ? palette.onAccent : palette.textMute,
              border: 'none', borderRadius: '8px',
              padding: '8px 18px', fontSize: '13px', fontWeight: 700,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', opacity: canGenerate ? 1 : 0.6
            }
          }, canGenerate ? 'Generate (3 🪙)' : 'Need 3 🪙 tokens')
        )
      );
    } else if (step === 'generating') {
      stepBody = h('div', { style: { textAlign: 'center', padding: '40px 20px' } },
        h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '✨'),
        h('div', { style: { fontSize: '16px', fontWeight: 700, color: palette.text, marginBottom: '6px' } }, 'Generating your decoration...'),
        h('div', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.5' } }, 'AI is crafting a one-of-a-kind item for your room. Usually 5-15 seconds.'),
        h('div', {
          'aria-hidden': 'true',
          style: {
            marginTop: '20px',
            height: '4px',
            width: '100%',
            background: palette.surface,
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }
        },
          h('div', {
            style: {
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: '40%',
              background: palette.accent,
              animation: 'ah-loading-slide 1.4s ease-in-out infinite'
            }
          })
        )
      );
    } else if (step === 'review' && imageBase64) {
      var freeMs = Math.max(0, freeUntil - now);
      var freeSec = Math.ceil(freeMs / 1000);
      var freeRegen = freeMs > 0;
      var canPaidRegen = p.tokens >= 1;
      stepBody = h('div', { style: { textAlign: 'center' } },
        h('img', {
          src: imageBase64,
          alt: template.label + ' preview',
          style: {
            maxWidth: '100%',
            maxHeight: '320px',
            borderRadius: '12px',
            border: '1px solid ' + palette.border,
            background: palette.surface,
            margin: '0 auto 14px'
          }
        }),
        h('div', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' } },
          template.icon + ' ' + template.label + ' · ' + getArtStyle(artStyleId).label),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' } },
          h('button', {
            onClick: function() { doGenerate(template, slots, artStyleId, true, freeRegen); },
            disabled: !freeRegen && !canPaidRegen,
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1px solid ' + palette.border, borderRadius: '8px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 600,
              cursor: (!freeRegen && !canPaidRegen) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: (!freeRegen && !canPaidRegen) ? 0.5 : 1
            }
          }, freeRegen ? '↻ Regenerate (free · ' + freeSec + 's left)' : '↻ Regenerate (1 🪙)'),
          h('button', {
            onClick: handleAccept,
            style: {
              background: palette.accent, color: palette.onAccent,
              border: 'none', borderRadius: '8px',
              padding: '8px 20px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Place this here ✨')
        )
      );
    } else if (step === 'reflect') {
      stepBody = h('div', null,
        h('img', {
          src: imageBase64,
          alt: template.label,
          style: {
            maxWidth: '100%',
            maxHeight: '180px',
            borderRadius: '10px',
            border: '1px solid ' + palette.border,
            background: palette.surface,
            display: 'block',
            margin: '0 auto 14px'
          }
        }),
        h('div', { style: { fontSize: '12px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', textAlign: 'center' } },
          'Want to write something about this? (optional, no token)'),
        h('textarea', {
          value: reflectionDraft,
          onChange: function(e) { setReflectionDraft(e.target.value); },
          placeholder: 'What does this mean to you? Why this one?',
          'aria-label': 'Optional reflection on this decoration',
          rows: 3,
          style: {
            width: '100%',
            padding: '10px 12px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '13px',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            resize: 'vertical',
            boxSizing: 'border-box',
            marginBottom: '12px'
          }
        }),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' } },
          h('button', {
            onClick: handleSkipReflection,
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1px solid ' + palette.border, borderRadius: '8px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Skip & place'),
          h('button', {
            onClick: handleSubmitReflection,
            style: {
              background: palette.accent, color: palette.onAccent,
              border: 'none', borderRadius: '8px',
              padding: '8px 18px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Save reflection & place')
        )
      );
    } else {
      // Fallback
      stepBody = h('div', { style: { padding: '20px', color: palette.textMute } }, 'Loading…');
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Add a decoration',
      onClick: function(e) {
        if (e.target === e.currentTarget && step !== 'generating') handleClose();
      },
      style: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 175,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg,
          border: '1px solid ' + palette.border,
          borderRadius: '14px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }
        },
          h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
            '🌿 Add a decoration · ' + (ctx.surface === 'wall' ? 'wall' : 'floor')),
          step !== 'generating' ? h('button', {
            onClick: handleClose,
            'aria-label': 'Close',
            style: {
              background: 'transparent', border: '1px solid ' + palette.border,
              color: palette.textDim, borderRadius: '8px', padding: '4px 10px',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '✕') : null
        ),
        stepBody
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6.6: MEMORY MODAL (Phase 2a)
  // ─────────────────────────────────────────────────────────
  // Self-authored memory palace. Each placed decoration can hold one
  // of three content types: flashcards (Q/A), acronym (letters +
  // meanings), or free notes (open text). The decoration's spatial
  // location in the room provides the method-of-loci anchor.
  // Mnemonic devices supported: active recall (flashcards),
  // chunking (acronyms), and freeform (notes for rhymes / story
  // chains / mind maps the student invents).
  function MemoryModalInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;

    var palette = p.palette;
    var decoration = p.decoration;
    var existing = decoration && decoration.linkedContent;
    var hasContent = !!existing;

    // ── Modal mode ──
    // 'pick-type'   — empty state, choosing what kind of content to add
    // 'view'        — read-only display of existing content
    // 'edit'        — editing existing content
    // 'quiz'        — interactive review (flashcards or acronym only)
    var initialMode = hasContent ? 'view' : 'pick-type';
    var modeTuple = useState(initialMode);
    var mode = modeTuple[0];
    var setMode = modeTuple[1];

    // Draft content state — copied from existing on mount; saved back via p.onSave
    var draftTuple = useState(function() {
      if (existing) {
        return JSON.parse(JSON.stringify(existing)); // deep copy
      }
      return null;
    });
    var draft = draftTuple[0];
    var setDraft = draftTuple[1];

    // Quiz session state (held outside content so it doesn't pollute saved data)
    var quizTuple = useState(null);
    var quiz = quizTuple[0];
    var setQuiz = quizTuple[1];

    // Confirm-remove flag
    var confirmRemoveTuple = useState(false);
    var confirmRemove = confirmRemoveTuple[0];
    var setConfirmRemove = confirmRemoveTuple[1];

    if (!decoration) {
      return null;
    }

    var label = decoration.templateLabel || decoration.template || 'this decoration';

    // Auto-start quiz on mount when caller requested it (used by the
    // Memory overview modal's "Review" buttons). Only fires once,
    // and only if quiz is actually available (notes have no quiz).
    var autoQuizFiredTuple = useState(false);
    var autoQuizFired = autoQuizFiredTuple[0];
    var setAutoQuizFired = autoQuizFiredTuple[1];
    useEffect(function() {
      if (!p.autoStartQuiz) return;
      if (autoQuizFired) return;
      if (!hasContent) return;
      if (!existing || existing.type === 'notes') return;
      setAutoQuizFired(true);
      // Defer one tick so the modal has rendered before quiz state initializes
      setTimeout(function() { startQuiz(); }, 30);
      // eslint-disable-next-line
    }, []);

    // ── Helpers ──
    function startEditEmpty(type) {
      var initialDraft;
      if (type === 'flashcards') {
        initialDraft = {
          type: 'flashcards',
          data: { cards: [
            { id: 'c-' + Date.now(), front: '', back: '', correctCount: 0, missCount: 0 }
          ]}
        };
      } else if (type === 'acronym') {
        initialDraft = {
          type: 'acronym',
          data: { letters: '', meanings: [], context: '' }
        };
      } else if (type === 'notes') {
        initialDraft = { type: 'notes', data: { text: '' } };
      }
      setDraft(initialDraft);
      setMode('edit');
    }

    function commitDraft() {
      if (!draft) return;
      // Type-specific validation
      if (draft.type === 'flashcards') {
        // Drop empty cards
        var nonEmpty = (draft.data.cards || []).filter(function(c) {
          return (c.front || '').trim() && (c.back || '').trim();
        });
        if (nonEmpty.length === 0) {
          alert('Add at least one card with both a front and back.');
          return;
        }
        var cleaned = Object.assign({}, draft, { data: { cards: nonEmpty } });
        p.onSave(cleaned);
      } else if (draft.type === 'acronym') {
        var letters = (draft.data.letters || '').trim();
        if (!letters) {
          alert('Type a word or letter sequence first.');
          return;
        }
        var paddedMeanings = letters.split('').map(function(_, i) {
          return (draft.data.meanings && draft.data.meanings[i]) || '';
        });
        var cleaned2 = Object.assign({}, draft, { data: { letters: letters, meanings: paddedMeanings, context: draft.data.context || '' } });
        p.onSave(cleaned2);
      } else if (draft.type === 'notes') {
        var text = (draft.data.text || '').trim();
        if (!text) {
          alert('Write something first.');
          return;
        }
        p.onSave(Object.assign({}, draft, { data: { text: text } }));
      }
      setMode('view');
    }

    function startQuiz() {
      if (!existing || !existing.data) return;
      if (existing.type === 'flashcards') {
        var cards = (existing.data.cards || []).slice();
        // Fisher-Yates shuffle
        for (var i = cards.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
        }
        setQuiz({
          type: 'flashcards',
          cards: cards,
          currentIdx: 0,
          flipped: false,
          correct: 0,
          missed: 0,
          done: false
        });
        setMode('quiz');
      } else if (existing.type === 'acronym') {
        var letters = (existing.data.letters || '').toUpperCase();
        var meanings = existing.data.meanings || [];
        setQuiz({
          type: 'acronym',
          letters: letters,
          truthMeanings: meanings,
          currentIdx: 0,
          guesses: meanings.map(function() { return ''; }),
          done: false
        });
        setMode('quiz');
      }
    }

    function finishQuiz(correctCount, totalCount) {
      var pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      p.onQuizComplete(pct);
      setQuiz({
        finished: true,
        scorePct: pct,
        correctCount: correctCount,
        totalCount: totalCount
      });
    }

    // ── Tab navigation header (for non-empty states) ──
    function renderTabs() {
      if (!hasContent || mode === 'pick-type') return null;
      var tabs = [
        { id: 'view',  label: 'View' },
        { id: 'edit',  label: 'Edit' }
      ];
      if (existing.type !== 'notes') tabs.push({ id: 'quiz', label: 'Quiz' });
      return h('div', {
        role: 'tablist',
        style: {
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid ' + palette.border,
          marginBottom: '14px',
          paddingBottom: '0'
        }
      },
        tabs.map(function(t) {
          var active = mode === t.id;
          return h('button', {
            key: 't-' + t.id,
            role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() {
              if (t.id === 'quiz' && mode !== 'quiz') {
                startQuiz();
              } else {
                setMode(t.id);
                setQuiz(null);
                if (t.id === 'edit' && existing) {
                  setDraft(JSON.parse(JSON.stringify(existing)));
                }
              }
            },
            style: {
              background: active ? palette.surface : 'transparent',
              border: 'none',
              borderBottom: '3px solid ' + (active ? palette.accent : 'transparent'),
              color: active ? palette.accent : palette.textDim,
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: active ? 700 : 500,
              padding: '8px 14px',
              cursor: 'pointer'
            }
          }, t.label);
        })
      );
    }

    // ── Step bodies ──
    var body;

    if (mode === 'pick-type') {
      body = renderPickType();
    } else if (mode === 'view') {
      body = renderViewTab();
    } else if (mode === 'edit') {
      body = renderEditTab();
    } else if (mode === 'quiz') {
      body = renderQuizMode();
    }

    function renderPickType() {
      var pickerCards = [
        { type: 'flashcards', icon: '📚', title: 'Flashcards', desc: 'Q&A pairs you study with. Best for vocab, definitions, formulas, key concepts.', mnemonic: 'active recall' },
        { type: 'acronym',    icon: '🔤', title: 'Acronym / list', desc: 'A word where each letter stands for something. Like "ROY G BIV" for rainbow colors.', mnemonic: 'chunking' },
        { type: 'notes',      icon: '📝', title: 'Free notes', desc: 'Plain text — for rhymes, story chains, mind maps, or anything that doesn\'t fit the others.', mnemonic: 'open expression' }
      ];
      return h('div', null,
        h('p', { style: { fontSize: '13px', color: palette.textDim, lineHeight: '1.55', marginBottom: '14px' } },
          'Attach memory content to your ' + label.toLowerCase() + '. Where you place this decoration in your room becomes a spatial anchor for what you\'re learning — that\'s the method of loci, a 2,400-year-old memory technique.'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          pickerCards.map(function(card) {
            return h('button', {
              key: 'pt-' + card.type,
              onClick: function() { startEditEmpty(card.type); },
              style: {
                background: palette.surface,
                border: '1.5px solid ' + palette.border,
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                color: palette.text,
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                transition: 'border-color 140ms ease'
              }
            },
              h('span', { style: { fontSize: '28px', flexShrink: 0 } }, card.icon),
              h('div', { style: { flex: 1 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' } },
                  h('span', { style: { fontSize: '14px', fontWeight: 700 } }, card.title),
                  h('span', { style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic' } }, card.mnemonic)
                ),
                h('div', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.5' } }, card.desc)
              )
            );
          })
        ),
        h('p', {
          style: { marginTop: '16px', fontSize: '11px', color: palette.textMute, fontStyle: 'italic', lineHeight: '1.5', textAlign: 'center' }
        }, 'Adding memory content earns +1 token (one-time per decoration).')
      );
    }

    function renderViewTab() {
      var lc = existing;
      if (!lc) return null;
      if (lc.type === 'flashcards') {
        var cards = (lc.data && lc.data.cards) || [];
        return h('div', null,
          h('div', { style: { fontSize: '12px', color: palette.textMute, marginBottom: '10px' } },
            '📚 ' + cards.length + ' card' + (cards.length === 1 ? '' : 's')),
          h('ol', { style: { paddingLeft: '20px', margin: 0, color: palette.text, fontSize: '13px', lineHeight: '1.6' } },
            cards.map(function(card) {
              return h('li', { key: card.id, style: { marginBottom: '8px' } },
                h('div', { style: { fontWeight: 600 } }, card.front),
                h('div', { style: { color: palette.textDim, fontStyle: 'italic', fontSize: '12px' } }, card.back)
              );
            })
          )
        );
      }
      if (lc.type === 'acronym') {
        var letters = (lc.data && lc.data.letters) || '';
        var meanings = (lc.data && lc.data.meanings) || [];
        return h('div', null,
          lc.data && lc.data.context ? h('p', {
            style: { fontSize: '12px', color: palette.textDim, marginBottom: '10px', fontStyle: 'italic' }
          }, lc.data.context) : null,
          h('div', { style: { fontSize: '24px', fontWeight: 800, color: palette.accent, letterSpacing: '0.16em', marginBottom: '14px' } }, letters.toUpperCase()),
          h('ul', { style: { listStyle: 'none', padding: 0, margin: 0 } },
            letters.split('').map(function(letter, i) {
              return h('li', { key: 'al-' + i, style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' } },
                h('span', {
                  style: {
                    fontSize: '18px',
                    fontWeight: 800,
                    color: palette.accent,
                    width: '28px',
                    flexShrink: 0,
                    textAlign: 'center'
                  }
                }, letter.toUpperCase()),
                h('span', { style: { color: palette.text, fontSize: '13px' } }, meanings[i] || '—')
              );
            })
          )
        );
      }
      if (lc.type === 'notes') {
        var text = (lc.data && lc.data.text) || '';
        return h('div', {
          style: {
            color: palette.text,
            fontSize: '13px',
            lineHeight: '1.65',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }
        }, text);
      }
      return null;
    }

    function renderEditTab() {
      if (!draft) return null;
      var saveBar = h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '14px' } },
        h('button', {
          onClick: function() { setConfirmRemove(true); },
          style: {
            background: 'transparent',
            color: palette.textMute,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }
        }, '🗑 Remove memory'),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('button', {
            onClick: function() {
              if (hasContent) {
                setMode('view');
                setDraft(JSON.parse(JSON.stringify(existing)));
              } else {
                setMode('pick-type');
                setDraft(null);
              }
            },
            style: {
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, hasContent ? 'Cancel' : 'Back'),
          h('button', {
            onClick: commitDraft,
            style: {
              background: palette.accent,
              color: palette.onAccent,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Save')
        )
      );
      // Hide remove button for never-saved drafts
      if (!hasContent) {
        saveBar = h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' } },
          h('button', {
            onClick: function() { setMode('pick-type'); setDraft(null); },
            style: {
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Back'),
          h('button', {
            onClick: commitDraft,
            style: {
              background: palette.accent,
              color: palette.onAccent,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Save')
        );
      }
      // Confirm-remove inline panel
      var removePanel = confirmRemove ? h('div', {
        style: {
          marginTop: '14px',
          padding: '12px 14px',
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: '8px'
        }
      },
        h('p', { style: { margin: 0, fontSize: '13px', color: palette.text, marginBottom: '10px' } },
          'Remove all memory content from this decoration? Tokens already earned won\'t be refunded.'),
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
          h('button', {
            onClick: function() { setConfirmRemove(false); },
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1px solid ' + palette.border, borderRadius: '6px',
              padding: '4px 12px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Keep it'),
          h('button', {
            onClick: function() {
              p.onRemove();
              setConfirmRemove(false);
            },
            style: {
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '4px 12px',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Remove')
        )
      ) : null;

      if (draft.type === 'flashcards') return h('div', null, renderFlashcardEditor(), removePanel, saveBar);
      if (draft.type === 'acronym')    return h('div', null, renderAcronymEditor(),  removePanel, saveBar);
      if (draft.type === 'notes')      return h('div', null, renderNotesEditor(),    removePanel, saveBar);
      return null;
    }

    function renderFlashcardEditor() {
      var cards = (draft.data.cards) || [];
      function updateCard(id, field, val) {
        var newCards = cards.map(function(c) {
          if (c.id !== id) return c;
          var u = {}; u[field] = val;
          return Object.assign({}, c, u);
        });
        setDraft(Object.assign({}, draft, { data: { cards: newCards } }));
      }
      function addCard() {
        var newCards = cards.concat([{
          id: 'c-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          front: '', back: '', correctCount: 0, missCount: 0
        }]);
        setDraft(Object.assign({}, draft, { data: { cards: newCards } }));
      }
      function deleteCard(id) {
        var newCards = cards.filter(function(c) { return c.id !== id; });
        setDraft(Object.assign({}, draft, { data: { cards: newCards } }));
      }
      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          '📚 Flashcard deck · ' + cards.length + ' card' + (cards.length === 1 ? '' : 's')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          cards.map(function(card, idx) {
            return h('div', {
              key: card.id,
              style: {
                padding: '10px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '8px'
              }
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700 } }, 'Card ' + (idx + 1)),
                cards.length > 1 ? h('button', {
                  onClick: function() { deleteCard(card.id); },
                  'aria-label': 'Delete card ' + (idx + 1),
                  style: {
                    background: 'transparent',
                    color: palette.textMute,
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }
                }, '✕') : null
              ),
              h('input', {
                type: 'text',
                value: card.front,
                onChange: function(e) { updateCard(card.id, 'front', e.target.value); },
                placeholder: 'Front (question or term)',
                'aria-label': 'Card ' + (idx + 1) + ' front',
                style: {
                  width: '100%',
                  padding: '6px 8px',
                  marginBottom: '6px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '6px',
                  color: palette.text,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }
              }),
              h('input', {
                type: 'text',
                value: card.back,
                onChange: function(e) { updateCard(card.id, 'back', e.target.value); },
                placeholder: 'Back (answer or definition)',
                'aria-label': 'Card ' + (idx + 1) + ' back',
                style: {
                  width: '100%',
                  padding: '6px 8px',
                  background: palette.bg,
                  border: '1px solid ' + palette.border,
                  borderRadius: '6px',
                  color: palette.text,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }
              })
            );
          })
        ),
        h('button', {
          onClick: addCard,
          style: {
            marginTop: '10px',
            width: '100%',
            background: 'transparent',
            color: palette.accent,
            border: '1px dashed ' + palette.accent,
            borderRadius: '8px',
            padding: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }
        }, '+ Add card')
      );
    }

    function renderAcronymEditor() {
      var letters = (draft.data.letters || '');
      var meanings = (draft.data.meanings || []);
      var ctx = (draft.data.context || '');
      function updateLetters(val) {
        var clean = val.replace(/\s+/g, '').toUpperCase();
        // Resize meanings array to match
        var newMeanings = [];
        for (var i = 0; i < clean.length; i++) {
          newMeanings.push(meanings[i] || '');
        }
        setDraft(Object.assign({}, draft, { data: { letters: clean, meanings: newMeanings, context: ctx } }));
      }
      function updateMeaning(i, val) {
        var newMeanings = meanings.slice();
        newMeanings[i] = val;
        setDraft(Object.assign({}, draft, { data: { letters: letters, meanings: newMeanings, context: ctx } }));
      }
      function updateContext(val) {
        setDraft(Object.assign({}, draft, { data: { letters: letters, meanings: meanings, context: val } }));
      }
      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          '🔤 Acronym / list'),
        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'The word or letters'),
        h('input', {
          type: 'text',
          value: letters,
          onChange: function(e) { updateLetters(e.target.value); },
          placeholder: 'e.g. PEMDAS or ROY G BIV',
          'aria-label': 'Acronym letters',
          style: {
            width: '100%',
            padding: '8px 10px',
            marginBottom: '12px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '18px',
            letterSpacing: '0.12em',
            fontWeight: 700,
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }
        }),
        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'What it stands for (optional context)'),
        h('input', {
          type: 'text',
          value: ctx,
          onChange: function(e) { updateContext(e.target.value); },
          placeholder: 'e.g. order of operations',
          'aria-label': 'Acronym context',
          style: {
            width: '100%',
            padding: '6px 10px',
            marginBottom: '14px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '13px',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }
        }),
        letters.length > 0 ? h('div', null,
          h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '8px', fontWeight: 600 } }, 'Letter meanings'),
          h('ul', { style: { listStyle: 'none', padding: 0, margin: 0 } },
            letters.split('').map(function(letter, i) {
              return h('li', { key: 'lt-' + i, style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' } },
                h('span', {
                  style: {
                    fontSize: '18px',
                    fontWeight: 800,
                    color: palette.accent,
                    width: '28px',
                    flexShrink: 0,
                    textAlign: 'center'
                  }
                }, letter),
                h('input', {
                  type: 'text',
                  value: meanings[i] || '',
                  onChange: function(e) { updateMeaning(i, e.target.value); },
                  placeholder: 'meaning of ' + letter,
                  'aria-label': 'Meaning of ' + letter,
                  style: {
                    flex: 1,
                    padding: '6px 10px',
                    background: palette.surface,
                    border: '1px solid ' + palette.border,
                    borderRadius: '6px',
                    color: palette.text,
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }
                })
              );
            })
          )
        ) : h('p', {
          style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic', lineHeight: '1.5', textAlign: 'center', padding: '12px' }
        }, 'Type a word above to start filling in meanings.')
      );
    }

    function renderNotesEditor() {
      var text = (draft.data.text || '');
      function updateText(val) {
        setDraft(Object.assign({}, draft, { data: { text: val } }));
      }
      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          '📝 Free notes'),
        h('p', {
          style: { fontSize: '12px', color: palette.textDim, marginBottom: '10px', lineHeight: '1.5' }
        }, 'Whatever helps you remember. A rhyme. A story chain. A diagram in text. Lyrics. Whatever.'),
        h('textarea', {
          value: text,
          onChange: function(e) { updateText(e.target.value); },
          placeholder: 'Write your notes here...',
          'aria-label': 'Free notes',
          rows: 10,
          style: {
            width: '100%',
            padding: '10px 12px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            resize: 'vertical',
            boxSizing: 'border-box'
          }
        }),
        h('div', {
          style: { fontSize: '11px', color: palette.textMute, marginTop: '4px', textAlign: 'right' }
        }, text.length + ' character' + (text.length === 1 ? '' : 's'))
      );
    }

    function renderQuizMode() {
      if (!quiz) return null;
      if (quiz.finished) {
        return renderQuizResult();
      }
      if (quiz.type === 'flashcards') return renderQuizFlashcards();
      if (quiz.type === 'acronym')    return renderQuizAcronym();
      return null;
    }

    function renderQuizFlashcards() {
      var cards = quiz.cards;
      if (!cards || cards.length === 0) {
        return h('p', { style: { color: palette.textMute, padding: '12px', textAlign: 'center' } }, 'No cards to quiz on.');
      }
      var card = cards[quiz.currentIdx];
      var progress = (quiz.currentIdx + 1) + ' / ' + cards.length;

      function flip() { setQuiz(Object.assign({}, quiz, { flipped: true })); }
      function gradeAndAdvance(gotIt) {
        var nextIdx = quiz.currentIdx + 1;
        var newCorrect = quiz.correct + (gotIt ? 1 : 0);
        var newMissed = quiz.missed + (gotIt ? 0 : 1);
        if (nextIdx >= cards.length) {
          finishQuiz(newCorrect, cards.length);
        } else {
          setQuiz(Object.assign({}, quiz, { currentIdx: nextIdx, flipped: false, correct: newCorrect, missed: newMissed }));
        }
      }

      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textAlign: 'center' } },
          'Card ' + progress),
        h('div', {
          'aria-live': 'polite',
          style: {
            background: palette.surface,
            border: '2px solid ' + palette.accent,
            borderRadius: '12px',
            padding: '32px 20px',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            marginBottom: '14px'
          }
        },
          h('div', null,
            h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 } },
              quiz.flipped ? 'Back' : 'Front'),
            h('div', { style: { fontSize: '17px', fontWeight: 700, color: palette.text, lineHeight: '1.4' } },
              quiz.flipped ? card.back : card.front)
          )
        ),
        !quiz.flipped ? h('button', {
          onClick: flip,
          autoFocus: true,
          style: {
            width: '100%',
            background: palette.accent,
            color: palette.onAccent,
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }
        }, 'Flip card') : h('div', { style: { display: 'flex', gap: '10px' } },
          h('button', {
            onClick: function() { gradeAndAdvance(false); },
            style: {
              flex: 1,
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Try again'),
          h('button', {
            onClick: function() { gradeAndAdvance(true); },
            style: {
              flex: 1,
              background: palette.accent,
              color: palette.onAccent,
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Got it')
        )
      );
    }

    function renderQuizAcronym() {
      var idx = quiz.currentIdx;
      var letter = quiz.letters[idx] || '';
      var truth = (quiz.truthMeanings[idx] || '').trim().toLowerCase();
      var guesses = quiz.guesses;
      var currentGuess = guesses[idx] || '';

      function updateGuess(val) {
        var newGuesses = guesses.slice();
        newGuesses[idx] = val;
        setQuiz(Object.assign({}, quiz, { guesses: newGuesses }));
      }
      function checkAndAdvance() {
        var nextIdx = idx + 1;
        if (nextIdx >= quiz.letters.length) {
          // Compute correct count
          var correctCount = 0;
          for (var i = 0; i < quiz.letters.length; i++) {
            var truthI = (quiz.truthMeanings[i] || '').trim().toLowerCase();
            var guessI = (guesses[i] || '').trim().toLowerCase();
            if (truthI && guessI && (truthI === guessI || truthI.indexOf(guessI) === 0 || guessI.indexOf(truthI) === 0)) {
              correctCount++;
            }
          }
          finishQuiz(correctCount, quiz.letters.length);
        } else {
          setQuiz(Object.assign({}, quiz, { currentIdx: nextIdx }));
        }
      }
      function skip() {
        var newGuesses = guesses.slice();
        newGuesses[idx] = '';
        setQuiz(Object.assign({}, quiz, { guesses: newGuesses }));
        checkAndAdvance();
      }

      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textAlign: 'center' } },
          'Letter ' + (idx + 1) + ' / ' + quiz.letters.length),
        h('div', { style: { fontSize: '64px', fontWeight: 800, color: palette.accent, textAlign: 'center', marginBottom: '14px', letterSpacing: '0.04em' } },
          letter),
        h('input', {
          type: 'text',
          value: currentGuess,
          onChange: function(e) { updateGuess(e.target.value); },
          placeholder: 'What does ' + letter + ' stand for?',
          'aria-label': 'Meaning of ' + letter,
          autoFocus: true,
          onKeyDown: function(e) {
            if (e.key === 'Enter') { e.preventDefault(); checkAndAdvance(); }
          },
          style: {
            width: '100%',
            padding: '10px 12px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '15px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            marginBottom: '14px'
          }
        }),
        h('div', { style: { display: 'flex', gap: '10px' } },
          h('button', {
            onClick: skip,
            style: {
              flex: 1,
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Skip'),
          h('button', {
            onClick: checkAndAdvance,
            style: {
              flex: 1,
              background: palette.accent,
              color: palette.onAccent,
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, idx + 1 >= quiz.letters.length ? 'Finish' : 'Next')
        )
      );
    }

    function renderQuizResult() {
      var pct = quiz.scorePct;
      var emoji = pct >= 90 ? '🌟' : pct >= 80 ? '✨' : pct >= 50 ? '🌱' : '💪';
      var msg = pct >= 80
        ? 'Strong recall — you know this material.'
        : pct >= 50
        ? 'Solid effort. Try again later to lock it in.'
        : 'A start. Coming back tomorrow is how memory works.';
      return h('div', { style: { textAlign: 'center', padding: '20px 0' } },
        h('div', { style: { fontSize: '56px', marginBottom: '10px' } }, emoji),
        h('div', { style: { fontSize: '32px', fontWeight: 800, color: palette.accent, fontVariantNumeric: 'tabular-nums' } },
          pct + '%'),
        h('div', { style: { fontSize: '13px', color: palette.textDim, marginTop: '6px' } },
          quiz.correctCount + ' of ' + quiz.totalCount + ' correct'),
        h('p', { style: { fontSize: '13px', color: palette.textDim, marginTop: '14px', lineHeight: '1.55' } }, msg),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '18px' } },
          h('button', {
            onClick: function() { setMode('view'); setQuiz(null); },
            style: {
              background: 'transparent',
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Done'),
          h('button', {
            onClick: startQuiz,
            style: {
              background: palette.accent,
              color: palette.onAccent,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, 'Quiz again')
        )
      );
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Memory content for ' + label,
      onClick: function(e) {
        if (e.target === e.currentTarget) p.onClose();
      },
      style: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 175,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg,
          border: '1px solid ' + palette.border,
          borderRadius: '14px',
          padding: '24px',
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        // Header — decoration preview + close button
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            decoration.imageBase64 ? h('img', {
              src: decoration.imageBase64,
              alt: '',
              'aria-hidden': 'true',
              style: { width: '44px', height: '44px', borderRadius: '6px', objectFit: 'contain', background: palette.surface, border: '1px solid ' + palette.border }
            }) : null,
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '17px', fontWeight: 700 } },
              hasContent ? 'Memory · ' + label : 'Add memory · ' + label)
          ),
          h('button', {
            onClick: p.onClose,
            'aria-label': 'Close memory modal',
            style: {
              background: 'transparent',
              border: '1px solid ' + palette.border,
              color: palette.textDim,
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, '✕')
        ),
        renderTabs(),
        body
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 7: REACT COMPONENT
  // ─────────────────────────────────────────────────────────
  // Receives callback-only props from App.jsx (matches Symbol Studio pattern).
  // State is managed internally via React useState + localStorage persistence
  // — no toolData / ctx threading from the host.
  //
  // Props:
  //   isOpen           : bool — modal open/closed (host controls)
  //   onClose          : () => void — host close callback
  //   callImagen       : (prompt) => Promise<base64>  — for decoration generation
  //   callGemini       : optional, for v2+ subject extraction
  //   callTTS          : optional, for voice-to-text setup later
  //   addToast         : (msg, type?) => void
  //   selectedVoice    : optional, for TTS voice
  //   disableAnimations: bool — accommodation propagation
  function AlloHaven(props) {
    var React = window.React;
    if (!React) {
      console.error('[AlloHaven] window.React not available');
      return null;
    }
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;

    var addToast = props.addToast || function(msg) { console.log('[AlloHaven]', msg); };

    // ── State plumbing ──
    // Single useState holding the whole state object. setStateField helper
    // updates one key + writes localStorage. setStateMulti updates many.
    var stateTuple = useState(function() {
      var loaded = loadState();
      // Deep-merge defaults so missing fields don't crash
      var merged = Object.assign({}, DEFAULT_STATE, loaded);
      merged.toastsSeen          = Object.assign({}, DEFAULT_STATE.toastsSeen, loaded.toastsSeen || {});
      merged.dailyState          = Object.assign({}, DEFAULT_STATE.dailyState, loaded.dailyState || {});
      merged.pomodoroState       = Object.assign({}, DEFAULT_STATE.pomodoroState, loaded.pomodoroState || {});
      merged.pomodoroPreferences = Object.assign({}, DEFAULT_STATE.pomodoroPreferences, loaded.pomodoroPreferences || {});
      if (!merged.rooms || !merged.rooms.length) merged.rooms = DEFAULT_STATE.rooms.slice();
      if (!Array.isArray(merged.decorations))    merged.decorations    = [];
      if (!Array.isArray(merged.journalEntries)) merged.journalEntries = [];
      if (!Array.isArray(merged.earnings))       merged.earnings       = [];
      return merged;
    });
    var state = stateTuple[0];
    var setState = stateTuple[1];

    // Persist to localStorage on every state change
    useEffect(function() {
      saveState(state);
    }, [state]);

    var setStateField = function(key, value) {
      setState(function(prev) {
        var next = Object.assign({}, prev);
        next[key] = value;
        return next;
      });
    };
    var setStateMulti = function(obj) {
      setState(function(prev) { return Object.assign({}, prev, obj); });
    };

    // ── Pomodoro tick state ──
    // Forces a re-render every ~250ms while the timer is active, so the
    // mm:ss display stays current. Date.now() arithmetic is the truth —
    // the tick is purely a re-render trigger, browser-throttle resilient.
    var nowTickTuple = useState(0);
    var nowTick = nowTickTuple[0];
    var setNowTick = nowTickTuple[1];

    // Single-fire guard so completion logic doesn't re-trigger on every
    // render once a Pomodoro has crossed its duration. Reset when a new
    // Pomodoro starts (active flips false → true).
    var completionFiredRef = useRef(false);

    // ── Theme inherited from active AlloFlow theme ──
    // Read at every render so theme changes elsewhere reflect immediately
    // when the user reopens or interacts with AlloHaven.
    var inherited = getInheritedTheme();
    var palette = getThemeBase(inherited.theme, inherited.highContrast);

    // ── Place starter decoration on first ever load ──
    useEffect(function() {
      if (state.onboardingSeen) return;
      if (state.decorations && state.decorations.length > 0) return;
      var starter = {
        id: 'starter-fern-' + Date.now(),
        template: 'plant',
        slots: { plantType: 'fern', potColor: 'terracotta', potStyle: 'ceramic' },
        artStyle: 'children-book',
        imageBase64: getStarterFernDataUri(),
        isStarter: true,
        placement: { roomId: 'main', surface: 'floor', cellIndex: 5 },
        rotation: 0,
        earnedAt: new Date().toISOString(),
        tokensSpent: 0,
        studentReflection: '',
        linkedContent: null,
        sourceTool: null,
        aiRationale: null
      };
      setStateField('decorations', [starter]);
      // eslint-disable-next-line
    }, []);

    // ── Daily-state rollover ──
    useEffect(function() {
      var todayStr = new Date().toISOString().slice(0, 10);
      if (state.dailyState.date !== todayStr) {
        setStateField('dailyState', {
          date: todayStr,
          pomodorosCompleted: 0,
          reflectionsSubmitted: 0,
          promptsForToday: [],
          quizTokensEarnedToday: 0
        });
      }
      // eslint-disable-next-line
    }, [state.dailyState.date]);

    // ── Esc to close ──
    useEffect(function() {
      if (!props.isOpen) return;
      var handler = function(e) {
        if (e.key === 'Escape' && !state.activeModal && !(!state.onboardingSeen)) {
          if (props.onClose) props.onClose();
        }
      };
      window.addEventListener('keydown', handler);
      return function() { window.removeEventListener('keydown', handler); };
    }, [props.isOpen, state.activeModal, state.onboardingSeen]);

    // ── Pomodoro tick interval (250ms) ──
    // Only runs while the timer is active. Re-renders the mm:ss display.
    // Cheap; doesn't affect perceived smoothness at 4Hz.
    useEffect(function() {
      if (!state.pomodoroState.active) return;
      var iv = setInterval(function() { setNowTick(Date.now()); }, 250);
      return function() { clearInterval(iv); };
      // eslint-disable-next-line
    }, [state.pomodoroState.active]);

    // ── Completion detection ──
    // Fires once per Pomodoro when elapsed crosses duration. Date.now()-based
    // so it's robust against browser tab throttling: even if the student
    // backgrounds the tab and comes back 25min later, this useEffect runs on
    // re-mount and immediately detects the completion (or fires on the next
    // tick if still active). Single-fire guarded by completionFiredRef.
    useEffect(function() {
      // Reset guard when Pomodoro becomes inactive (between sessions)
      if (!state.pomodoroState.active) {
        completionFiredRef.current = false;
        return;
      }
      if (completionFiredRef.current) return;
      var startedAt = state.pomodoroState.startedAt;
      if (!startedAt) return;
      var totalMs = state.pomodoroState.durationMinutes * 60 * 1000;
      var elapsed = Date.now() - startedAt;
      if (elapsed < totalMs) return;
      // Completion!
      completionFiredRef.current = true;
      handlePomodoroCompletion();
      // eslint-disable-next-line
    }, [state.pomodoroState.active, nowTick]);

    // ── Pomodoro phase progression + token earn logic ──
    // Called once per timer expiration. Awards tokens for focus phases
    // (clean rule: full duration earns +2, +2 cycle bonus on every 4th
    // focus session of the daily cycle), advances to the next phase
    // (focus → short-break → focus → ... every 4th → long-break),
    // increments dailyState.pomodorosCompleted, and applies the soft
    // 4/day cap (5th+ Pomodoros run the timer but earn 0 tokens).
    function handlePomodoroCompletion() {
      var phase = state.pomodoroState.phase;
      var prefs = state.pomodoroPreferences;
      var cycleProgress = state.pomodoroState.cycleProgress || 0;
      var todayCompleted = state.dailyState.pomodorosCompleted || 0;

      if (phase === 'focus') {
        // Token award (cap-respecting)
        var newCount = todayCompleted + 1;
        var underCap = newCount <= 4;
        var isFourthInCycle = (cycleProgress + 1) >= 4;
        var earned = 0;
        if (underCap) {
          earned = 2;
          if (isFourthInCycle) earned += 2; // cycle bonus → 4 total this completion
        }

        // Phase advancement: focus → break (long if 4th, else short)
        var nextPhase = isFourthInCycle ? 'long-break' : 'short-break';
        var nextDuration = isFourthInCycle ? prefs.longBreakMinutes : prefs.shortBreakMinutes;
        var nextCycleProgress = isFourthInCycle ? 0 : (cycleProgress + 1);

        // Apply state changes
        var earningsEntry = {
          source: isFourthInCycle ? 'cycle-bonus' : 'pomodoro',
          tokens: earned,
          date: new Date().toISOString(),
          metadata: { duration: state.pomodoroState.durationMinutes, capped: !underCap }
        };
        var newDailyState = Object.assign({}, state.dailyState, {
          pomodorosCompleted: newCount
        });
        var newPomodoroState = {
          active: true,
          phase: nextPhase,
          startedAt: Date.now(),
          durationMinutes: nextDuration,
          cycleProgress: nextCycleProgress
        };
        var updates = {
          tokens: state.tokens + earned,
          earnings: state.earnings.concat([earningsEntry]),
          dailyState: newDailyState,
          pomodoroState: newPomodoroState
        };

        // First-Pomodoro toast (one-time)
        if (!state.toastsSeen.firstPomodoro) {
          updates.toastsSeen = Object.assign({}, state.toastsSeen, { firstPomodoro: true });
          setTimeout(function() {
            addToast('🪙 +' + earned + ' tokens earned! Click any dotted cell to spend on a decoration.');
          }, 50);
        } else if (earned > 0) {
          setTimeout(function() {
            var msg = isFourthInCycle
              ? '🎉 Cycle complete! +' + earned + ' tokens (focus + cycle bonus). Long break time.'
              : '🪙 +' + earned + ' tokens. Time for a ' + (nextPhase === 'long-break' ? 'long' : 'short') + ' break.';
            addToast(msg);
          }, 50);
        } else {
          // Above daily cap: friendly soft-cap message
          setTimeout(function() {
            addToast("You've focused well today — take a break! (No tokens for additional sessions today.)");
          }, 50);
        }

        setStateMulti(updates);
        // Allow next completion to fire (we just reset the timer for the
        // break phase; completionFiredRef will gate the next phase ending)
        completionFiredRef.current = false;
        return;
      }

      // Break phase complete — return to focus, no tokens involved
      var nextFocusState = {
        active: true,
        phase: 'focus',
        startedAt: Date.now(),
        durationMinutes: prefs.focusMinutes,
        cycleProgress: state.pomodoroState.cycleProgress  // already advanced when focus completed
      };
      setStateField('pomodoroState', nextFocusState);
      completionFiredRef.current = false;
      setTimeout(function() {
        addToast('Break over. Ready for the next focus session?');
      }, 50);
    }

    // Start a new Pomodoro from a stopped state. Used by the Start button.
    function startPomodoro() {
      var prefs = state.pomodoroPreferences;
      setStateField('pomodoroState', {
        active: true,
        phase: 'focus',
        startedAt: Date.now(),
        durationMinutes: prefs.focusMinutes,
        cycleProgress: state.pomodoroState.cycleProgress || 0
      });
      completionFiredRef.current = false;
    }

    // Cancel the active Pomodoro. Clean rule: 0 tokens, no penalty,
    // brief mercy toast acknowledging the choice.
    function cancelPomodoro() {
      setStateField('pomodoroState', Object.assign({}, state.pomodoroState, { active: false, startedAt: null }));
      completionFiredRef.current = false;
      addToast("It's okay to stop. No tokens earned this time.");
    }

    // ── Reflection / journal handlers ──
    // Open the reflection modal — also lazily populates today's 3 prompts
    // if they haven't been picked yet this calendar day.
    function openReflectionModal() {
      var today = state.dailyState.date;
      var prompts = state.dailyState.promptsForToday;
      if (!prompts || prompts.length !== 3) {
        var picks = pickRandomPrompts(3);
        var newDailyState = Object.assign({}, state.dailyState, { date: today, promptsForToday: picks });
        setStateMulti({ dailyState: newDailyState, activeModal: 'reflection' });
      } else {
        setStateField('activeModal', 'reflection');
      }
    }

    // Submit a reflection. Awards 1 token if dailyState.reflectionsSubmitted
    // is currently 0; otherwise saves the entry but earns 0 (1/day cap).
    // Length gate is enforced at the UI level (button disabled <20 chars);
    // this handler trusts the input.
    function submitReflection(text, promptId) {
      var trimmed = (text || '').trim();
      if (!trimmed) return;
      var alreadyEarned = (state.dailyState.reflectionsSubmitted || 0) >= 1;
      var tokensEarned = alreadyEarned ? 0 : 1;
      var entry = {
        id: 'j-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        date: new Date().toISOString(),
        prompt: promptId ? getPromptText(promptId) : null,
        promptId: promptId || null,
        text: trimmed,
        topics: [], // v1: empty; v2+ keyword extraction
        tokensEarned: tokensEarned
      };
      var newJournal = state.journalEntries.concat([entry]);
      var newDailyState = Object.assign({}, state.dailyState, {
        reflectionsSubmitted: (state.dailyState.reflectionsSubmitted || 0) + 1
      });
      var updates = {
        journalEntries: newJournal,
        dailyState: newDailyState,
        tokens: state.tokens + tokensEarned,
        activeModal: null
      };
      if (tokensEarned > 0) {
        updates.earnings = state.earnings.concat([{
          source: 'reflection',
          tokens: tokensEarned,
          date: entry.date,
          metadata: { length: trimmed.length, promptId: promptId || null }
        }]);
      }
      // First-Reflection toast (one-time)
      if (!state.toastsSeen.firstReflection) {
        updates.toastsSeen = Object.assign({}, state.toastsSeen, { firstReflection: true });
        setTimeout(function() {
          addToast('🪙 +1 token. You can write one reflection per day.');
        }, 50);
      } else if (tokensEarned > 0) {
        setTimeout(function() {
          addToast('🪙 +1 token. Saved to your journal.');
        }, 50);
      } else {
        setTimeout(function() {
          addToast('Saved to your journal. (Daily reflection token already earned.)');
        }, 50);
      }
      setStateMulti(updates);
    }

    // Edit a journal entry's text. Token state unchanged.
    function editJournalEntry(id, newText) {
      var trimmed = (newText || '').trim();
      if (!trimmed) return;
      var newJournal = state.journalEntries.map(function(e) {
        if (e.id !== id) return e;
        return Object.assign({}, e, { text: trimmed, editedAt: new Date().toISOString() });
      });
      setStateField('journalEntries', newJournal);
    }

    // Delete a journal entry. Token NOT refunded (matches decoration-delete
    // logic from the concept doc — prevents grinding by add-and-delete).
    function deleteJournalEntry(id) {
      var newJournal = state.journalEntries.filter(function(e) { return e.id !== id; });
      setStateField('journalEntries', newJournal);
    }

    // ── Web Speech API hook for voice-to-text ──
    // Feature-detected once at component setup. Not a React hook; just a
    // ref-based controller so each modal-instance can start/stop a
    // recognition session without re-instantiating SpeechRecognition.
    var speechRecRef = useRef(null);
    var isRecordingTuple = useState(false);
    var isRecording = isRecordingTuple[0];
    var setIsRecording = isRecordingTuple[1];
    var speechSupported = (typeof window !== 'undefined') &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    function startVoiceCapture(onTranscript) {
      if (!speechSupported) return;
      try {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        var rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = function(event) {
          var transcript = '';
          for (var i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript && typeof onTranscript === 'function') onTranscript(transcript);
        };
        rec.onerror = function(e) {
          console.warn('[AlloHaven] speech recognition error:', e);
          setIsRecording(false);
        };
        rec.onend = function() {
          setIsRecording(false);
        };
        speechRecRef.current = rec;
        rec.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('[AlloHaven] could not start speech recognition:', err);
        setIsRecording(false);
      }
    }

    function stopVoiceCapture() {
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (e) { /* ignore */ }
        speechRecRef.current = null;
      }
      setIsRecording(false);
    }

    // ── Memory palace handlers ──
    // Open the memory modal scoped to a specific decoration. The
    // generateContext field doubles as the carrier (already used for
    // empty-cell + delete confirmations); decorationId tells the modal
    // which decoration's linkedContent to read/write.
    // Optional autoStartQuiz=true jumps directly to the quiz tab — used
    // by the Memory overview modal's "Review" buttons for one-click
    // study sessions.
    function openMemoryModal(decorationId, autoStartQuiz) {
      setStateMulti({
        activeModal: 'memory',
        generateContext: { decorationId: decorationId, autoStartQuiz: !!autoStartQuiz }
      });
    }

    // Save memory content (linkedContent) onto a decoration. Awards a
    // first-time token if the decoration didn't already have content.
    function saveMemoryContent(decorationId, contentObj) {
      var decoration = state.decorations.filter(function(d) { return d.id === decorationId; })[0];
      if (!decoration) return;
      var hadContentBefore = !!decoration.linkedContent;
      var nowIso = new Date().toISOString();
      var newContent = Object.assign({}, decoration.linkedContent || {}, contentObj, {
        updatedAt: nowIso,
        createdAt: (decoration.linkedContent && decoration.linkedContent.createdAt) || nowIso
      });
      // Default review fields when first added
      if (!hadContentBefore) {
        newContent.lastReviewedAt = null;
        newContent.reviewCount = 0;
        newContent.bestQuizScore = 0;
      }
      var newDecorations = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        return Object.assign({}, d, { linkedContent: newContent });
      });
      var updates = { decorations: newDecorations };
      if (!hadContentBefore) {
        updates.tokens = state.tokens + 1;
        updates.earnings = state.earnings.concat([{
          source: 'memory-content-added',
          tokens: 1,
          date: nowIso,
          metadata: { decorationId: decorationId, type: contentObj.type }
        }]);
        setTimeout(function() {
          addToast('🪙 +1 token. Your decoration now holds a study aid.');
        }, 50);
      }
      setStateMulti(updates);
    }

    // Remove memory content from a decoration entirely. Token NOT refunded
    // (matches add-and-delete logic from existing decoration deletion).
    function removeMemoryContent(decorationId) {
      var newDecorations = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        return Object.assign({}, d, { linkedContent: null });
      });
      setStateField('decorations', newDecorations);
      addToast('Memory content removed.');
    }

    // Award token for a quiz session if score ≥80% AND daily cap not hit.
    // Updates lastReviewedAt + reviewCount + bestQuizScore on the linkedContent.
    function recordQuizSession(decorationId, scorePct) {
      var decoration = state.decorations.filter(function(d) { return d.id === decorationId; })[0];
      if (!decoration || !decoration.linkedContent) return;
      var nowIso = new Date().toISOString();
      var capHit = (state.dailyState.quizTokensEarnedToday || 0) >= 2;
      var qualifies = scorePct >= 80;
      var earned = (qualifies && !capHit) ? 1 : 0;

      var newContent = Object.assign({}, decoration.linkedContent, {
        lastReviewedAt: nowIso,
        reviewCount: (decoration.linkedContent.reviewCount || 0) + 1,
        bestQuizScore: Math.max(decoration.linkedContent.bestQuizScore || 0, scorePct)
      });
      var newDecorations = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        return Object.assign({}, d, { linkedContent: newContent });
      });

      var updates = { decorations: newDecorations };
      if (earned > 0) {
        updates.tokens = state.tokens + earned;
        updates.earnings = state.earnings.concat([{
          source: 'memory-quiz',
          tokens: earned,
          date: nowIso,
          metadata: { decorationId: decorationId, scorePct: scorePct }
        }]);
        updates.dailyState = Object.assign({}, state.dailyState, {
          quizTokensEarnedToday: (state.dailyState.quizTokensEarnedToday || 0) + earned
        });
        setTimeout(function() {
          addToast('🪙 +1 token. ' + Math.round(scorePct) + '% on review.');
        }, 50);
      } else if (qualifies && capHit) {
        setTimeout(function() {
          addToast(Math.round(scorePct) + '% — great work! (Daily quiz tokens already earned.)');
        }, 50);
      } else {
        setTimeout(function() {
          addToast(Math.round(scorePct) + '%. No tokens this round; review again whenever you want.');
        }, 50);
      }
      setStateMulti(updates);
    }

    // Helper: is a decoration's memory content "due for review"?
    // True if it has linkedContent AND (never reviewed OR ≥5 days since last review).
    function isMemoryDue(decoration) {
      var lc = decoration.linkedContent;
      if (!lc) return false;
      if (!lc.lastReviewedAt) return true;
      var lastMs = new Date(lc.lastReviewedAt).getTime();
      var ageMs = Date.now() - lastMs;
      return ageMs >= 5 * 24 * 60 * 60 * 1000;
    }

    // ── Decoration deletion handler ──
    // Per concept doc: token NOT refunded on delete (prevents grinding
    // by add-and-delete). Confirmation modal prevents accidents.
    function deleteDecoration(decorationId) {
      var newDecorations = state.decorations.filter(function(d) { return d.id !== decorationId; });
      setStateMulti({
        decorations: newDecorations,
        activeModal: null,
        generateContext: null
      });
      addToast('Decoration removed.');
    }

    // ── Room expansion ──
    // When 90% of the current room slots are filled, advancing to the
    // next milestone unlocks 1 wall row + 1 floor row + 5 token bonus.
    // Triggered by useEffect watching decorations.length so it fires
    // exactly when the threshold is crossed.
    var roomExpandedRef = useRef(false);
    useEffect(function() {
      var room = state.rooms[0];
      if (!room) return;
      var totalSlots = room.wallSlots + room.floorSlots;
      var placedCount = state.decorations.length;
      var thresholdHit = placedCount >= Math.floor(totalSlots * 0.9);
      // Cap expansion at 50 total slots (concept-doc decision; v2+ adds new rooms)
      if (!thresholdHit) {
        roomExpandedRef.current = false;
        return;
      }
      if (totalSlots >= 50) return;
      if (roomExpandedRef.current) return;
      roomExpandedRef.current = true;

      // Add 1 wall row (4 slots) + 1 floor row (6 slots) = 10 new slots
      var expandedRoom = Object.assign({}, room, {
        wallSlots: room.wallSlots + 4,
        floorSlots: room.floorSlots + 6
      });
      var newRooms = state.rooms.slice();
      newRooms[0] = expandedRoom;

      var bonus = 5;
      var earningsEntry = {
        source: 'milestone',
        tokens: bonus,
        date: new Date().toISOString(),
        metadata: { milestone: 'room-expansion', newSize: expandedRoom.wallSlots + expandedRoom.floorSlots }
      };

      setStateMulti({
        rooms: newRooms,
        tokens: state.tokens + bonus,
        earnings: state.earnings.concat([earningsEntry])
      });
      setTimeout(function() {
        addToast('🌱 Your room is growing! +' + bonus + ' bonus tokens. Two new rows unlocked.');
      }, 50);
      // eslint-disable-next-line
    }, [state.decorations.length, state.rooms]);

    // ── Decoration generation handlers ──
    var DECORATION_COST = 3;

    // Empty cell clicked — opens generate modal scoped to that cell.
    // Insufficient-tokens path: shows the first-time toast (one-time)
    // and opens the modal anyway so students can SEE the templates
    // they could pick from once they have tokens.
    function handleEmptyCellClick(surface, cellIndex) {
      var hasEnough = state.tokens >= DECORATION_COST;
      if (!hasEnough && !state.toastsSeen.firstZeroTokenClick) {
        var newToasts = Object.assign({}, state.toastsSeen, { firstZeroTokenClick: true });
        setStateField('toastsSeen', newToasts);
        addToast("You'll need " + DECORATION_COST + " 🪙 tokens to add a decoration here. Earn some by focusing or writing!");
      } else if (!hasEnough) {
        addToast('Need ' + DECORATION_COST + ' 🪙 tokens. Currently you have ' + state.tokens + '.');
      }
      // Open modal regardless — students can browse + plan even with 0 tokens.
      setStateMulti({
        activeModal: 'generate',
        generateContext: { surface: surface, cellIndex: cellIndex }
      });
    }

    // Place a decoration. Called from the generate modal when user
    // commits to the AI-generated image. Token already deducted at
    // generate time; this just records the placement + closes modal.
    // Optional reflection text attaches to the decoration's metadata.
    function placeDecoration(template, slots, artStyleId, imageBase64, reflectionText) {
      var ctx = state.generateContext || { surface: 'floor', cellIndex: 0 };
      // Slight ±3° rotation, randomized once per item — "lived-in wobble"
      var rotation = (Math.random() * 6) - 3;
      var entry = {
        id: 'd-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        template: template.id,
        templateLabel: template.label,
        slots: slots,
        artStyle: artStyleId,
        imageBase64: imageBase64,
        isStarter: false,
        placement: { roomId: 'main', surface: ctx.surface, cellIndex: ctx.cellIndex },
        rotation: rotation,
        earnedAt: new Date().toISOString(),
        tokensSpent: DECORATION_COST,
        studentReflection: (reflectionText || '').trim(),
        linkedContent: null,    // v2+ memory palace
        sourceTool: null,       // v2+ cross-tool integration
        aiRationale: null       // v2+ AI summary of how earned
      };
      setStateMulti({
        decorations: state.decorations.concat([entry]),
        activeModal: null,
        generateContext: null
      });
      addToast('🌿 ' + template.label.toLowerCase() + ' placed in your room.');
    }

    // AI generation — calls props.callImagen with the constructed prompt.
    // Token deduction happens HERE (3 tokens), before the call. If the
    // generation fails, the token IS refunded (separate path from
    // delete-decoration which keeps the token cost).
    function generateDecoration(template, slots, artStyleId, isRegenerate, isFreeRegenerate, onResult) {
      // Charge tokens
      var cost = 0;
      if (!isRegenerate) cost = DECORATION_COST;
      else if (!isFreeRegenerate) cost = 1;
      if (cost > 0 && state.tokens < cost) {
        if (typeof onResult === 'function') onResult({ error: 'insufficient' });
        return;
      }
      if (cost > 0) {
        var earningsEntry = {
          source: isRegenerate ? 'regenerate' : 'decoration',
          tokens: -cost,
          date: new Date().toISOString(),
          metadata: { template: template.id, isRegenerate: !!isRegenerate }
        };
        setStateMulti({
          tokens: state.tokens - cost,
          earnings: state.earnings.concat([earningsEntry])
        });
      }

      var prompt = buildAIPrompt(template, slots, artStyleId);

      if (!props.callImagen) {
        // Refund (this path is only hit if the host didn't wire callImagen)
        if (cost > 0) {
          setStateMulti({ tokens: state.tokens, earnings: state.earnings });
        }
        if (typeof onResult === 'function') onResult({ error: 'callImagen unavailable. Image generation requires the host\'s AI plumbing.' });
        return;
      }

      try {
        var imagenPromise = props.callImagen(prompt);
        if (!imagenPromise || typeof imagenPromise.then !== 'function') {
          throw new Error('callImagen did not return a promise');
        }
        imagenPromise.then(function(result) {
          // callImagen may return a base64 string OR a data URL OR a more
          // complex shape. Normalize to a data URL.
          var b64 = result;
          if (result && typeof result === 'object') {
            b64 = result.base64 || result.image || result.data || '';
          }
          if (!b64) {
            // Refund on empty result
            setStateMulti({
              tokens: state.tokens + cost,
              earnings: state.earnings.concat([{ source: 'refund', tokens: cost, date: new Date().toISOString(), metadata: { reason: 'empty result' } }])
            });
            if (typeof onResult === 'function') onResult({ error: 'AI returned an empty image. Tokens refunded.' });
            return;
          }
          var dataUrl = (typeof b64 === 'string' && b64.indexOf('data:') === 0)
            ? b64
            : ('data:image/png;base64,' + b64);
          if (typeof onResult === 'function') onResult({ imageBase64: dataUrl });
        }).catch(function(err) {
          // Refund on failure
          setStateMulti({
            tokens: state.tokens + cost,
            earnings: state.earnings.concat([{ source: 'refund', tokens: cost, date: new Date().toISOString(), metadata: { reason: 'callImagen error' } }])
          });
          if (typeof onResult === 'function') onResult({ error: 'AI generation failed. Tokens refunded. (' + (err && err.message ? err.message : 'unknown error') + ')' });
        });
      } catch (err) {
        if (cost > 0) {
          setStateMulti({ tokens: state.tokens + cost });
        }
        if (typeof onResult === 'function') onResult({ error: 'Could not start AI generation: ' + (err.message || err) });
      }
    }

    if (!props.isOpen) return null;

    // ─────────────────────────────────────────────────
    // VIEW: ROOM (wall + floor grids, header, action buttons)
    // ─────────────────────────────────────────────────
    function renderRoom() {
      var room = state.rooms[0];
      var wallByCell = {};
      var floorByCell = {};
      state.decorations.forEach(function(d) {
        if (!d.placement) return;
        if (d.placement.surface === 'wall')  wallByCell[d.placement.cellIndex] = d;
        if (d.placement.surface === 'floor') floorByCell[d.placement.cellIndex] = d;
      });

      var wallCells = [];
      for (var w = 0; w < room.wallSlots; w++) {
        wallCells.push(renderCell(w, 'wall', wallByCell[w] || null, palette));
      }
      var floorCells = [];
      for (var f = 0; f < room.floorSlots; f++) {
        floorCells.push(renderCell(f, 'floor', floorByCell[f] || null, palette));
      }

      var wallCount = Object.keys(wallByCell).length;
      var floorCount = Object.keys(floorByCell).length;

      return h('div', {
        style: {
          padding: '20px',
          maxWidth: '960px',
          margin: '0 auto',
          color: palette.text,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: palette.bg,
          minHeight: '60vh'
        }
      },
        renderHeader(palette, state.tokens, props.onClose),
        // Compute responsive row count based on slot count + columns
        // Wall stays 4 cols (2 cols on narrow); floor stays 6 cols (3 cols on narrow)
        // Grid auto-rows handles overflow; we don't pin a row count
        // anymore so expansion past 8/12 slots renders correctly.
        // Wall surface (with warm-light overlay)
        h('div', {
          role: 'region',
          'aria-label': 'Wall — ' + wallCount + ' of ' + room.wallSlots + ' slots filled',
          className: !inherited.highContrast ? 'ah-room-frame' : '',
          style: {
            position: 'relative',
            padding: '14px',
            background: palette.wallpaper,
            borderRadius: '12px 12px 0 0',
            marginTop: '16px',
            border: '1px solid ' + palette.border,
            borderBottom: 'none',
            boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.18)'
          }
        },
          h('div', {
            className: 'ah-wall-grid',
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridAutoRows: '80px',
              gap: '12px'
            }
          }, wallCells)
        ),
        // Floor surface (with warm-light overlay)
        h('div', {
          role: 'region',
          'aria-label': 'Floor — ' + floorCount + ' of ' + room.floorSlots + ' slots filled',
          className: !inherited.highContrast ? 'ah-room-frame' : '',
          style: {
            padding: '14px',
            background: palette.floor,
            borderRadius: '0 0 12px 12px',
            border: '1px solid ' + palette.border,
            borderTop: 'none',
            boxShadow: 'inset 0 8px 20px rgba(0,0,0,0.22)'
          }
        },
          h('div', {
            className: 'ah-floor-grid',
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gridAutoRows: '90px',
              gap: '10px'
            }
          }, floorCells)
        ),
        // Action buttons (Phase 1a placeholders — Phase 1b/c/d wire these up)
        h('div', {
          style: {
            marginTop: '20px',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }
        },
          h('button', {
            onClick: startPomodoro,
            disabled: state.pomodoroState.active,
            style: Object.assign({}, primaryBtnStyle(palette),
              state.pomodoroState.active ? { opacity: 0.5, cursor: 'not-allowed' } : {})
          }, state.pomodoroState.active ? '🍅 Pomodoro running' : '🍅 Start Pomodoro'),
          h('button', {
            onClick: openReflectionModal,
            style: secondaryBtnStyle(palette)
          }, '📝 Write reflection'),
          h('button', {
            onClick: function() { setStateField('activeModal', 'journal'); },
            style: secondaryBtnStyle(palette)
          }, '📓 Journal' + (state.journalEntries.length > 0 ? ' · ' + state.journalEntries.length : '')),
          (function() {
            var deckCount = state.decorations.filter(function(d) { return !!d.linkedContent; }).length;
            var dueCount = state.decorations.filter(function(d) { return !!d.linkedContent && isMemoryDue(d); }).length;
            var labelText = '📖 Memory' + (deckCount > 0 ? ' · ' + deckCount : '');
            return h('button', {
              onClick: function() { setStateField('activeModal', 'memory-overview'); },
              'aria-label': 'Memory palace overview' + (deckCount > 0 ? ', ' + deckCount + ' decks' : '') + (dueCount > 0 ? ', ' + dueCount + ' due' : ''),
              style: Object.assign({}, secondaryBtnStyle(palette),
                dueCount > 0 ? {
                  borderColor: palette.warn || palette.accent,
                  color: palette.warn || palette.accent
                } : {})
            },
              labelText,
              dueCount > 0 ? h('span', {
                'aria-hidden': 'true',
                style: {
                  marginLeft: '6px',
                  padding: '0 6px',
                  borderRadius: '999px',
                  background: palette.warn || palette.accent,
                  color: palette.onAccent || '#000',
                  fontSize: '10px',
                  fontWeight: 800
                }
              }, dueCount + ' due') : null
            );
          })(),
          h('button', {
            onClick: function() { setStateField('activeModal', 'settings'); },
            style: secondaryBtnStyle(palette)
          }, '⚙️ Settings')
        ),
        // Footer info
        h('div', {
          style: {
            marginTop: '20px',
            padding: '12px',
            background: palette.surface,
            border: '1px dashed ' + palette.border,
            borderRadius: '8px',
            fontSize: '11px',
            color: palette.textMute,
            textAlign: 'center',
            lineHeight: '1.5',
            fontStyle: 'italic'
          }
        }, 'AlloHaven v1 (Phase 1a · skeleton). Pomodoro, reflection, and decoration generation coming next. Theme inherited from active AlloFlow theme.')
      );
    }

    // Render a single grid cell — empty slot or placed decoration
    function renderCell(index, surface, decoration, palette) {
      if (decoration) {
        var rot = decoration.rotation || 0;
        var label = decoration.templateLabel || decoration.template || 'item';
        var hasMemoryContent = !!decoration.linkedContent;
        var memoryDue = isMemoryDue(decoration);
        var memoryDescription = '';
        if (hasMemoryContent) {
          var lc = decoration.linkedContent;
          if (lc.type === 'flashcards' && lc.data && Array.isArray(lc.data.cards)) {
            memoryDescription = 'flashcards · ' + lc.data.cards.length + ' card' + (lc.data.cards.length === 1 ? '' : 's');
          } else if (lc.type === 'acronym') {
            memoryDescription = 'acronym · ' + ((lc.data && lc.data.letters) || '');
          } else if (lc.type === 'notes') {
            memoryDescription = 'notes';
          } else {
            memoryDescription = 'memory content';
          }
        }
        var hoverTitle = decoration.studentReflection
          ? '"' + decoration.studentReflection + '" · ' + label
          : label;
        if (hasMemoryContent) hoverTitle += ' · ' + memoryDescription + (memoryDue ? ' (due for review)' : '');
        return h('div', {
          key: surface + '-cell-' + index,
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Decoration: ' + label
            + (decoration.studentReflection ? ' (with reflection)' : '')
            + (hasMemoryContent ? ' (with ' + memoryDescription + (memoryDue ? ', due for review' : '') + ')' : '')
            + ' — click to add or review memory content',
          className: 'ah-decoration',
          title: hoverTitle,
          onClick: function() { openMemoryModal(decoration.id); },
          onKeyDown: function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openMemoryModal(decoration.id);
            }
          },
          style: {
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: surface === 'wall' ? '4px' : '8px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transform: 'rotate(' + rot + 'deg)',
            cursor: 'pointer',
            boxShadow: surface === 'floor' ? '0 3px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.2)'
          }
        },
          decoration.imageBase64 ? h('img', {
            src: decoration.imageBase64,
            alt: label,
            // Image-error fallback: if base64 fails to render (corrupted /
            // truncated by storage limits), swap to a visible placeholder
            // so the cell isn't broken-icon-empty.
            onError: function(e) {
              try {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.setAttribute('data-img-failed', '1');
              } catch (err) { /* ignore */ }
            },
            style: { width: '100%', height: '100%', objectFit: 'contain' }
          }) : h('span', { style: { fontSize: '24px', color: palette.textMute } }, '?'),
          decoration.isStarter ? h('span', {
            'aria-hidden': 'true',
            style: {
              position: 'absolute',
              bottom: '2px',
              right: '4px',
              fontSize: '8px',
              color: palette.textMute,
              background: 'rgba(0,0,0,0.4)',
              padding: '1px 4px',
              borderRadius: '3px',
              letterSpacing: '0.04em'
            }
          }, 'starter') : null,
          // Memory-content indicator — small 📖 in bottom-left (away
          // from the starter badge which lives bottom-right). Brighter
          // when due for review (yellow halo); dim when recently reviewed.
          hasMemoryContent ? h('span', {
            'aria-hidden': 'true',
            className: 'ah-memory-indicator' + (memoryDue ? ' ah-memory-due' : ''),
            style: {
              position: 'absolute',
              bottom: '2px',
              left: '4px',
              fontSize: '11px',
              padding: '1px 4px',
              borderRadius: '3px',
              background: memoryDue ? 'rgba(255,220,140,0.9)' : 'rgba(0,0,0,0.45)',
              color: memoryDue ? '#1a1108' : '#fff',
              opacity: memoryDue ? 1 : 0.7,
              lineHeight: 1
            }
          }, '📖') : null,
          // Hover-revealed ✕ delete button (top-right corner). Suppressed
          // on the starter decoration — students shouldn't accidentally
          // delete the welcome gift; v2+ could allow it via Settings.
          !decoration.isStarter ? h('button', {
            onClick: function(e) {
              e.stopPropagation();
              setStateMulti({ activeModal: 'delete-decoration', generateContext: { decorationId: decoration.id } });
            },
            'aria-label': 'Delete this ' + label,
            className: 'ah-decoration-delete',
            title: 'Remove this decoration',
            style: {
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '22px',
              height: '22px',
              padding: 0,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 140ms ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }
          }, '✕') : null
        );
      }
      return h('div', {
        key: surface + '-cell-' + index,
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Empty ' + surface + ' slot ' + (index + 1) + ' — click to add a decoration',
        className: 'ah-empty-cell',
        onClick: function() { handleEmptyCellClick(surface, index); },
        onKeyDown: function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEmptyCellClick(surface, index);
          }
        },
        style: {
          border: '1px dotted ' + palette.textMute,
          borderRadius: surface === 'wall' ? '4px' : '8px',
          opacity: 0.55,
          minHeight: surface === 'wall' ? '76px' : '86px'
        }
      });
    }

    // Header — token counter + close button
    function renderHeader(palette, tokens, onCloseCb) {
      return h('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          flexWrap: 'wrap',
          gap: '12px'
        }
      },
        h('h2', {
          style: {
            margin: 0,
            fontSize: '22px',
            fontWeight: 700,
            color: palette.text,
            letterSpacing: '-0.01em'
          }
        },
          h('span', { 'aria-hidden': 'true', style: { marginRight: '6px' } }, '🌿'),
          'AlloHaven'
        ),
        h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
          h('div', {
            role: 'status',
            'aria-label': 'You have ' + tokens + ' tokens',
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: palette.surface,
              border: '1px solid ' + palette.accent,
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 700,
              color: palette.accent,
              fontVariantNumeric: 'tabular-nums'
            }
          },
            h('span', { 'aria-hidden': 'true' }, '🪙'),
            h('span', { key: 'token-' + tokens, className: 'ah-token-tick' }, tokens)
          ),
          onCloseCb ? h('button', {
            onClick: onCloseCb,
            'aria-label': 'Close AlloHaven',
            style: {
              background: 'transparent',
              border: '1px solid ' + palette.border,
              color: palette.textDim,
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }
          }, '✕') : null
        )
      );
    }

    // Welcome card — first-ever-visit only
    function renderWelcomeCard() {
      if (state.onboardingSeen) return null;
      return h('div', {
        role: 'dialog',
        'aria-label': 'Welcome to AlloHaven',
        'aria-modal': 'true',
        className: 'ah-welcome',
        style: {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '460px',
          width: 'calc(100vw - 40px)',
          padding: '24px',
          background: palette.surface,
          border: '2px solid ' + palette.accent,
          borderRadius: '14px',
          zIndex: 200,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          color: palette.text,
          lineHeight: '1.6'
        }
      },
        h('div', { style: { fontSize: '32px', marginBottom: '8px', textAlign: 'center' } }, '🌱'),
        h('h3', {
          style: {
            margin: '0 0 12px 0',
            fontSize: '20px',
            fontWeight: 700,
            color: palette.text,
            textAlign: 'center'
          }
        }, 'Welcome to your AlloHaven'),
        h('p', { style: { margin: '0 0 12px 0', fontSize: '14px', color: palette.textDim, lineHeight: '1.6' } },
          'This is your space. The plant is a starter gift.'),
        h('p', { style: { margin: '0 0 12px 0', fontSize: '14px', color: palette.textDim, lineHeight: '1.6' } },
          'Earn ',
          h('strong', { style: { color: palette.accent } }, '🪙 tokens'),
          ' by ',
          h('strong', null, 'focusing'),
          ' with the Pomodoro timer or ',
          h('strong', null, 'writing'),
          ' a reflection. Spend tokens on decorations to make the room yours.'
        ),
        h('p', {
          style: { margin: '0 0 20px 0', fontSize: '13px', color: palette.textDim, lineHeight: '1.55', padding: '8px 12px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px' }
        },
          h('strong', null, '📖 New: '),
          'Click any decoration to attach study aids — flashcards, acronyms, or notes. Where you place a decoration in your room becomes a spatial anchor for what you\'re learning. ',
          h('em', null, 'method of loci, since 477 BC.')
        ),
        h('div', { style: { textAlign: 'center' } },
          h('button', {
            onClick: function() { setStateField('onboardingSeen', true); },
            autoFocus: true,
            style: Object.assign({}, primaryBtnStyle(palette), { padding: '10px 28px', fontSize: '14px' })
          }, 'Got it')
        )
      );
    }

    function renderWelcomeBackdrop() {
      if (state.onboardingSeen) return null;
      return h('div', {
        'aria-hidden': 'true',
        onClick: function() { setStateField('onboardingSeen', true); },
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 199
        }
      });
    }

    // ─────────────────────────────────────────────────
    // POMODORO OVERLAY — full-screen-ish display while timer is active.
    // Shows mm:ss countdown, phase label, cycle progress dots, cancel.
    // Sits on top of the room so the student sees their decorations
    // peripherally while focusing.
    // ─────────────────────────────────────────────────
    function renderPomodoroOverlay() {
      if (!state.pomodoroState.active) return null;
      var startedAt = state.pomodoroState.startedAt || Date.now();
      var totalMs = state.pomodoroState.durationMinutes * 60 * 1000;
      var elapsedMs = Math.max(0, Date.now() - startedAt);
      var remainingMs = Math.max(0, totalMs - elapsedMs);
      var remainingSec = Math.ceil(remainingMs / 1000);
      var mm = Math.floor(remainingSec / 60);
      var ss = remainingSec % 60;
      var timeStr = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;

      var phase = state.pomodoroState.phase;
      var phaseLabel = phase === 'focus' ? 'Focus' :
                       phase === 'short-break' ? 'Short break' :
                       phase === 'long-break' ? 'Long break' : phase;
      var phaseEmoji = phase === 'focus' ? '🍅' : phase === 'long-break' ? '🌙' : '☕';

      // Progress percentage for the ring
      var progressPct = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;

      // Cycle dots: 4 small markers showing how many focus sessions
      // toward long break. Dim once-completed; the current one is
      // highlighted only during focus phase.
      var cycleProgress = state.pomodoroState.cycleProgress || 0;
      var dotsRow = h('div', {
        style: { display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '14px' }
      },
        [0, 1, 2, 3].map(function(i) {
          var done = i < cycleProgress;
          var current = i === cycleProgress && phase === 'focus';
          return h('span', {
            key: 'cd-' + i,
            'aria-label': 'Cycle position ' + (i + 1) + ' of 4 ' + (done ? '(complete)' : current ? '(current)' : ''),
            style: {
              width: current ? '12px' : '8px',
              height: current ? '12px' : '8px',
              borderRadius: '50%',
              background: done ? palette.accent : (current ? palette.accent : palette.surface),
              border: '1px solid ' + palette.accent,
              opacity: done ? 0.5 : 1,
              transition: 'width 200ms, height 200ms'
            }
          });
        })
      );

      return h('div', {
        role: 'dialog',
        'aria-label': phaseLabel + ' timer · ' + timeStr + ' remaining',
        'aria-live': 'off',
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg,
            border: '2px solid ' + palette.accent,
            borderRadius: '20px',
            padding: '40px 32px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 30px 70px rgba(0,0,0,0.5)'
          }
        },
          h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, phaseEmoji),
          h('div', {
            style: {
              fontSize: '13px',
              color: palette.textMute,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 700,
              marginBottom: '6px'
            }
          }, phaseLabel),
          h('div', {
            style: {
              fontSize: '64px',
              fontWeight: 800,
              color: palette.accent,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: '1.1',
              letterSpacing: '0.02em'
            }
          }, timeStr),
          // Progress bar
          h('div', {
            'aria-hidden': 'true',
            style: {
              marginTop: '18px',
              marginBottom: '6px',
              height: '6px',
              background: palette.surface,
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid ' + palette.border
            }
          },
            h('div', {
              style: {
                width: progressPct + '%',
                height: '100%',
                background: palette.accent,
                transition: 'width 250ms linear'
              }
            })
          ),
          dotsRow,
          h('div', {
            style: { marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }
          },
            h('button', {
              onClick: cancelPomodoro,
              style: Object.assign({}, secondaryBtnStyle(palette), {
                borderColor: palette.textMute,
                color: palette.textMute
              }),
              'aria-label': 'Cancel Pomodoro and return to room'
            }, 'Cancel')
          ),
          h('div', {
            style: { marginTop: '14px', fontSize: '11px', color: palette.textMute, fontStyle: 'italic' }
          }, phase === 'focus'
            ? 'Focus on whatever you want. Tokens will be waiting when the timer dings.'
            : 'Take a real break. Stand up, stretch, drink water.')
        )
      );
    }

    // ─────────────────────────────────────────────────
    // MEMORY OVERVIEW — list all decorations with linkedContent.
    // Sorted due-first (lastReviewedAt > 5 days OR never reviewed),
    // then by last-reviewed desc within each section. Click a row to
    // open that decoration's memory modal at the view tab; click the
    // Review button to jump straight into its quiz. Replaces the
    // "click each decoration to remember what's where" UX gap.
    // ─────────────────────────────────────────────────
    function renderMemoryOverviewModal() {
      if (state.activeModal !== 'memory-overview') return null;
      var withContent = state.decorations.filter(function(d) { return !!d.linkedContent; });
      // Partition into due / not-due, then sort within each
      var due = [];
      var fresh = [];
      withContent.forEach(function(d) {
        if (isMemoryDue(d)) due.push(d); else fresh.push(d);
      });
      var byLastReviewedDesc = function(a, b) {
        var aIso = (a.linkedContent && a.linkedContent.lastReviewedAt) || '';
        var bIso = (b.linkedContent && b.linkedContent.lastReviewedAt) || '';
        return bIso.localeCompare(aIso);
      };
      due.sort(byLastReviewedDesc);
      fresh.sort(byLastReviewedDesc);

      // Stats
      var totalDecks = withContent.length;
      var totalCards = withContent.reduce(function(sum, d) {
        var lc = d.linkedContent;
        if (lc && lc.type === 'flashcards' && lc.data && Array.isArray(lc.data.cards)) {
          return sum + lc.data.cards.length;
        }
        return sum;
      }, 0);
      var weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      var reviewedThisWeek = withContent.filter(function(d) {
        var lc = d.linkedContent;
        if (!lc || !lc.lastReviewedAt) return false;
        return new Date(lc.lastReviewedAt).getTime() >= weekAgoMs;
      }).length;
      var pctWeek = totalDecks > 0 ? Math.round((reviewedThisWeek / totalDecks) * 100) : 0;

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Memory palace overview',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 175,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg,
            border: '1px solid ' + palette.border,
            borderRadius: '14px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '88vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }
          },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '📖 Memory palace · ' + totalDecks + ' deck' + (totalDecks === 1 ? '' : 's')),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close memory overview',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5', fontStyle: 'italic' }
          }, 'Each decoration in your room can hold study aids — flashcards, acronyms, or notes. The room itself is a method-of-loci anchor: where you place a deck shapes how you remember it.'),

          // Empty-state
          totalDecks === 0 ? h('div', {
            style: {
              padding: '32px 20px',
              background: palette.surface,
              border: '1px dashed ' + palette.border,
              borderRadius: '10px',
              textAlign: 'center'
            }
          },
            h('div', { style: { fontSize: '40px', marginBottom: '10px' } }, '📖'),
            h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55', margin: 0 } },
              'No memory content yet. Click any decoration in your room to attach flashcards, an acronym, or notes — your decorations become the anchors for what you\'re learning.')
          ) : null,

          // Stats row (only when there's content)
          totalDecks > 0 ? h('div', {
            style: {
              display: 'flex',
              gap: '8px',
              marginBottom: '14px',
              flexWrap: 'wrap'
            }
          },
            renderOverviewStat('Decks', totalDecks, palette),
            totalCards > 0 ? renderOverviewStat('Flashcards', totalCards, palette) : null,
            renderOverviewStat('Reviewed this week', pctWeek + '%', palette),
            due.length > 0 ? renderOverviewStat('Due for review', due.length, palette, true) : null
          ) : null,

          // Due section
          due.length > 0 ? h('div', { style: { marginBottom: '14px' } },
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.warn || palette.accent,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }
            }, '⚡ Due for review · ' + due.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              due.map(function(d) { return renderOverviewRow(d, palette, true); })
            )
          ) : null,

          // Fresh section
          fresh.length > 0 ? h('div', null,
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textMute,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }
            }, due.length > 0 ? 'Recently reviewed · ' + fresh.length : 'Your decks · ' + fresh.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              fresh.map(function(d) { return renderOverviewRow(d, palette, false); })
            )
          ) : null
        )
      );
    }

    // Single overview row — decoration thumbnail + content summary +
    // Review button. Click anywhere on the row (except the button) opens
    // the memory modal at view-tab; click Review jumps to quiz mode.
    function renderOverviewRow(decoration, palette, isDue) {
      var lc = decoration.linkedContent;
      var label = decoration.templateLabel || decoration.template || 'item';
      var typeIcon = lc.type === 'flashcards' ? '📚' : lc.type === 'acronym' ? '🔤' : '📝';
      var summary = '';
      if (lc.type === 'flashcards') {
        var cardCount = (lc.data && lc.data.cards) ? lc.data.cards.length : 0;
        summary = cardCount + ' card' + (cardCount === 1 ? '' : 's');
      } else if (lc.type === 'acronym') {
        summary = ((lc.data && lc.data.letters) || '').toUpperCase();
      } else if (lc.type === 'notes') {
        var text = (lc.data && lc.data.text) || '';
        summary = text.length + ' character' + (text.length === 1 ? '' : 's');
      }
      var quizAvailable = lc.type !== 'notes';

      var reviewedLabel;
      if (!lc.lastReviewedAt) {
        reviewedLabel = 'Never reviewed';
      } else {
        var daysAgo = Math.floor((Date.now() - new Date(lc.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo === 0) reviewedLabel = 'Reviewed today';
        else if (daysAgo === 1) reviewedLabel = 'Reviewed yesterday';
        else reviewedLabel = 'Reviewed ' + daysAgo + ' days ago';
      }

      return h('div', {
        key: 'mr-' + decoration.id,
        role: 'group',
        'aria-label': label + ', ' + lc.type + ', ' + summary + ', ' + reviewedLabel,
        style: {
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          padding: '10px 12px',
          background: palette.surface,
          border: '1px solid ' + (isDue ? (palette.warn || palette.accent) : palette.border),
          borderLeft: isDue ? ('3px solid ' + (palette.warn || palette.accent)) : ('1px solid ' + palette.border),
          borderRadius: '8px'
        }
      },
        // Thumbnail
        decoration.imageBase64 ? h('img', {
          src: decoration.imageBase64,
          alt: '',
          'aria-hidden': 'true',
          style: {
            width: '48px',
            height: '48px',
            borderRadius: '6px',
            objectFit: 'contain',
            background: palette.bg,
            border: '1px solid ' + palette.border,
            flexShrink: 0
          }
        }) : null,
        // Center: content summary
        h('button', {
          onClick: function() { openMemoryModal(decoration.id, false); },
          style: {
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: palette.text,
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
            minWidth: 0
          }
        },
          h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
            typeIcon + ' ' + label),
          h('div', { style: { fontSize: '11px', color: palette.textDim, marginBottom: '2px' } },
            summary),
          h('div', {
            style: {
              fontSize: '10px',
              color: isDue ? (palette.warn || palette.accent) : palette.textMute,
              fontWeight: isDue ? 700 : 400
            }
          }, reviewedLabel)
        ),
        // Review action button (only for quizzable types)
        quizAvailable ? h('button', {
          onClick: function() { openMemoryModal(decoration.id, true); },
          style: {
            background: isDue ? (palette.warn || palette.accent) : palette.accent,
            color: palette.onAccent,
            border: 'none',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0
          }
        }, '↻ Review') : h('button', {
          onClick: function() { openMemoryModal(decoration.id, false); },
          style: {
            background: 'transparent',
            color: palette.textDim,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0
          }
        }, 'View')
      );
    }

    function renderOverviewStat(label, value, palette, highlight) {
      return h('div', {
        style: {
          flex: '1 1 100px',
          padding: '8px 12px',
          background: highlight ? 'rgba(255,220,140,0.08)' : palette.surface,
          border: '1px solid ' + (highlight ? (palette.warn || palette.accent) : palette.border),
          borderRadius: '8px',
          textAlign: 'center'
        }
      },
        h('div', {
          style: {
            fontSize: '20px',
            fontWeight: 800,
            color: highlight ? (palette.warn || palette.accent) : palette.accent,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1
          }
        }, value),
        h('div', {
          style: {
            fontSize: '10px',
            color: palette.textMute,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700,
            marginTop: '4px'
          }
        }, label)
      );
    }

    // ─────────────────────────────────────────────────
    // MEMORY MODAL — Phase 2a self-authored memory palace.
    // Each placed decoration can hold one of three content types
    // (flashcards / acronym / free notes). Spatial location in the
    // room provides the method-of-loci anchor.
    // ─────────────────────────────────────────────────
    function renderMemoryModal() {
      if (state.activeModal !== 'memory') return null;
      var ctx = state.generateContext || {};
      var decorationId = ctx.decorationId;
      var decoration = state.decorations.filter(function(d) { return d.id === decorationId; })[0];
      if (!decoration) {
        // Decoration vanished — close silently
        setTimeout(function() { setStateMulti({ activeModal: null, generateContext: null }); }, 0);
        return null;
      }
      return h(MemoryModalInner, {
        decoration: decoration,
        palette: palette,
        autoStartQuiz: !!ctx.autoStartQuiz,
        onClose: function() {
          setStateMulti({ activeModal: null, generateContext: null });
        },
        onSave: function(contentObj) {
          saveMemoryContent(decorationId, contentObj);
        },
        onRemove: function() {
          removeMemoryContent(decorationId);
          setStateMulti({ activeModal: null, generateContext: null });
        },
        onQuizComplete: function(scorePct) {
          recordQuizSession(decorationId, scorePct);
        }
      });
    }

    // ─────────────────────────────────────────────────
    // GENERATE MODAL — multi-step decoration creation.
    // Delegates to GenerateModalInner so its local state doesn't pollute
    // the outer component on close.
    // ─────────────────────────────────────────────────
    function renderGenerateModal() {
      if (state.activeModal !== 'generate') return null;
      return h(GenerateModalInner, {
        palette: palette,
        themeName: inherited.theme,
        tokens: state.tokens,
        generateContext: state.generateContext,
        onGenerate: function(template, slots, artStyleId, isRegenerate, isFreeRegenerate, callback) {
          generateDecoration(template, slots, artStyleId, isRegenerate, isFreeRegenerate, callback);
        },
        onPlace: function(template, slots, artStyleId, imageBase64, reflectionText) {
          placeDecoration(template, slots, artStyleId, imageBase64, reflectionText);
        },
        onClose: function() {
          setStateMulti({ activeModal: null, generateContext: null });
        }
      });
    }

    // ─────────────────────────────────────────────────
    // REFLECTION MODAL — 3 daily prompts + text area + voice + counter.
    // 20-character soft floor before token earns; positive counter
    // never blocks. Voice-to-text via Web Speech API when supported.
    // ─────────────────────────────────────────────────
    function renderReflectionModal() {
      if (state.activeModal !== 'reflection') return null;

      var promptIds = state.dailyState.promptsForToday || [];
      // Local component state for the modal — kept here as React state
      // hooks via closures. Since modals open/close mounting differently,
      // we manage drafts via a stable inner component.
      return h(ReflectionModalInner, {
        promptIds: promptIds,
        palette: palette,
        speechSupported: speechSupported,
        startVoice: startVoiceCapture,
        stopVoice: stopVoiceCapture,
        isRecording: isRecording,
        onSubmit: function(text, promptId) { submitReflection(text, promptId); },
        onClose: function() {
          stopVoiceCapture();
          setStateField('activeModal', null);
        },
        alreadyEarnedToday: (state.dailyState.reflectionsSubmitted || 0) >= 1
      });
    }

    // ─────────────────────────────────────────────────
    // JOURNAL MODAL — chronological list of past entries (newest first).
    // Each entry is editable and deletable. Token state never changes
    // on edit or delete.
    // ─────────────────────────────────────────────────
    function renderJournalModal() {
      if (state.activeModal !== 'journal') return null;
      // Sort newest-first
      var entries = state.journalEntries.slice().sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Your journal',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 175,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg,
            border: '1px solid ' + palette.border,
            borderRadius: '14px',
            padding: '24px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }
          },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '📓 Your journal · ' + entries.length),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close journal',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          entries.length === 0 ? h('p', {
            style: { color: palette.textDim, textAlign: 'center', padding: '24px 12px', fontStyle: 'italic' }
          }, "No journal entries yet. Write your first reflection — your past words will live here.") : null,
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
            entries.map(function(entry) {
              return h(JournalEntryRow, {
                key: entry.id,
                entry: entry,
                palette: palette,
                onEdit: function(newText) { editJournalEntry(entry.id, newText); },
                onDelete: function() {
                  if (window.confirm && !window.confirm('Delete this entry? Tokens already earned will not be refunded.')) return;
                  deleteJournalEntry(entry.id);
                }
              });
            })
          ),
          h('div', {
            style: {
              fontSize: '11px',
              color: palette.textMute,
              fontStyle: 'italic',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid ' + palette.border,
              lineHeight: '1.5'
            }
          }, 'Your journal is private. Only you see this.')
        )
      );
    }

    // ─────────────────────────────────────────────────
    // DELETE-DECORATION CONFIRMATION MODAL
    // Two-tap deletion (per concept doc) — prevents accidental loss.
    // Token NOT refunded; explicit messaging so students know.
    // ─────────────────────────────────────────────────
    function renderDeleteDecorationModal() {
      if (state.activeModal !== 'delete-decoration') return null;
      var decorationId = (state.generateContext || {}).decorationId;
      var dec = state.decorations.filter(function(d) { return d.id === decorationId; })[0];
      if (!dec) {
        // Decoration vanished somehow — close the modal silently
        setTimeout(function() { setStateMulti({ activeModal: null, generateContext: null }); }, 0);
        return null;
      }
      var label = dec.templateLabel || dec.template || 'this decoration';
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Confirm delete',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateMulti({ activeModal: null, generateContext: null });
        },
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg,
            border: '1px solid ' + palette.border,
            borderRadius: '14px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            textAlign: 'center'
          }
        },
          dec.imageBase64 ? h('img', {
            src: dec.imageBase64,
            alt: label,
            style: {
              maxWidth: '120px',
              maxHeight: '120px',
              borderRadius: '8px',
              margin: '0 auto 14px',
              display: 'block',
              opacity: 0.9
            }
          }) : null,
          h('h3', { style: { margin: '0 0 8px 0', color: palette.text, fontSize: '17px', fontWeight: 700 } },
            'Remove ' + label.toLowerCase() + '?'),
          h('p', {
            style: { margin: '0 0 18px 0', fontSize: '13px', color: palette.textDim, lineHeight: '1.55' }
          }, 'Tokens already spent on this decoration won\'t be refunded.'),
          h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
            h('button', {
              onClick: function() { setStateMulti({ activeModal: null, generateContext: null }); },
              autoFocus: true,
              style: {
                background: 'transparent', color: palette.textDim,
                border: '1px solid ' + palette.border, borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }
            }, 'Keep it'),
            h('button', {
              onClick: function() { deleteDecoration(decorationId); },
              style: {
                background: palette.warn || '#dc2626',
                color: palette.onAccent || '#fff',
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit'
              }
            }, 'Remove')
          )
        )
      );
    }

    // ─────────────────────────────────────────────────
    // SETTINGS MODAL — Pomodoro duration presets + custom.
    // ─────────────────────────────────────────────────
    function renderSettingsModal() {
      if (state.activeModal !== 'settings') return null;
      var prefs = state.pomodoroPreferences;

      var presets = [
        { id: 'short',   label: 'Short attention', focus: 15, short: 3,  long: 10, desc: 'Best for highly distractible focus or first-time Pomodoro users' },
        { id: 'default', label: 'Classic',         focus: 25, short: 5,  long: 15, desc: 'The original Pomodoro timing — most common' },
        { id: 'deep',    label: 'Deep focus',      focus: 45, short: 10, long: 20, desc: 'Longer sessions for sustained-focus work' }
      ];

      function applyPreset(p) {
        setStateField('pomodoroPreferences', { focusMinutes: p.focus, shortBreakMinutes: p.short, longBreakMinutes: p.long });
      }

      function activePreset() {
        for (var i = 0; i < presets.length; i++) {
          var p = presets[i];
          if (prefs.focusMinutes === p.focus && prefs.shortBreakMinutes === p.short && prefs.longBreakMinutes === p.long) {
            return p.id;
          }
        }
        return 'custom';
      }
      var current = activePreset();

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Settings',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 175,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg,
            border: '1px solid ' + palette.border,
            borderRadius: '14px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }
          },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } }, '⚙️ Settings'),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close settings',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('div', {
            style: { fontSize: '13px', color: palette.textDim, marginBottom: '6px', fontWeight: 600 }
          }, 'Pomodoro durations'),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: 0, marginBottom: '14px', lineHeight: '1.5' }
          }, 'All durations earn equal tokens by completion — pick what fits your attention. A 15-min Pomodoro earns the same as a 25-min one when finished.'),
          // Preset list
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' } },
            presets.map(function(p) {
              var active = current === p.id;
              return h('button', {
                key: 'preset-' + p.id,
                onClick: function() { applyPreset(p); },
                'aria-pressed': active ? 'true' : 'false',
                style: {
                  background: active ? palette.surface : 'transparent',
                  border: '2px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  color: palette.text,
                  transition: 'border-color 140ms ease, background 140ms ease'
                }
              },
                h('div', {
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }
                },
                  h('span', { style: { fontSize: '14px', fontWeight: 700 } }, p.label),
                  h('span', { style: { fontSize: '11px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
                    p.focus + '/' + p.short + '/' + p.long + ' min')
                ),
                h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.4' } }, p.desc)
              );
            })
          ),
          // Custom indicator (read-only for v1; full custom sliders are
          // possible v2 — for now if pref doesn't match a preset we show this)
          current === 'custom' ? h('div', {
            style: {
              padding: '10px 12px',
              border: '1px dashed ' + palette.accent,
              borderRadius: '8px',
              fontSize: '12px',
              color: palette.textDim,
              fontStyle: 'italic',
              marginBottom: '12px'
            }
          }, 'Custom durations · ' + prefs.focusMinutes + '/' + prefs.shortBreakMinutes + '/' + prefs.longBreakMinutes + ' min. Pick a preset above to switch.') : null,
          h('div', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: '14px', paddingTop: '12px', borderTop: '1px solid ' + palette.border, lineHeight: '1.5' }
          }, 'Today: ' + (state.dailyState.pomodorosCompleted || 0) + ' Pomodoros completed · soft cap at 4/day (above which sessions still run but earn 0 tokens).')
        )
      );
    }

    // ── aria-live announcement for token deltas ──
    // Tracks token changes since last render and pushes them to a hidden
    // live region. Screen reader users hear "+2 tokens earned" etc.
    // without needing visual focus on the counter chip.
    var prevTokensRef = useRef(state.tokens);
    var lastAnnouncementTuple = useState('');
    var lastAnnouncement = lastAnnouncementTuple[0];
    var setLastAnnouncement = lastAnnouncementTuple[1];
    useEffect(function() {
      var prev = prevTokensRef.current;
      if (prev !== state.tokens) {
        var delta = state.tokens - prev;
        var msg;
        if (delta > 0) msg = 'Earned ' + delta + ' token' + (delta === 1 ? '' : 's') + '. Total ' + state.tokens + '.';
        else if (delta < 0) msg = 'Spent ' + Math.abs(delta) + ' token' + (Math.abs(delta) === 1 ? '' : 's') + '. Total ' + state.tokens + '.';
        if (msg) setLastAnnouncement(msg);
        prevTokensRef.current = state.tokens;
      }
    }, [state.tokens]);

    // ── Render ──
    // Outer modal-style fixed overlay covering the viewport (matches Symbol
    // Studio pattern). Inner ah-root scopes all CSS animations.
    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'AlloHaven',
      className: 'ah-root',
      style: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: palette.bg,
        zIndex: 60,
        overflowY: 'auto',
        color: palette.text
      }
    },
      // Visually-hidden aria-live region for token-delta announcements
      h('div', {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        style: {
          position: 'absolute',
          width: '1px', height: '1px', padding: 0, margin: '-1px',
          overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0
        }
      }, lastAnnouncement),
      renderRoom(),
      renderPomodoroOverlay(),
      renderGenerateModal(),
      renderMemoryModal(),
      renderMemoryOverviewModal(),
      renderReflectionModal(),
      renderJournalModal(),
      renderDeleteDecorationModal(),
      renderSettingsModal(),
      renderWelcomeBackdrop(),
      renderWelcomeCard()
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 8: EXPORT
  // ─────────────────────────────────────────────────────────
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloHaven = AlloHaven;
  console.log('[CDN] AlloHaven loaded');

})();
