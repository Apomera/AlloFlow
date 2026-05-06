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

  // ── AlloHavenArcade plugin registry (Phase 3a) ──
  // Mirrors the window.StemLab.registerTool pattern (stem_lab_module.js:23-54)
  // so arcade modes are pure plugins. Each mode lives in its own
  // arcade_mode_<name>.js file and self-registers at load time.
  // The arcade hub (rendered inside AlloHaven) iterates getRegisteredModes()
  // and renders a card per mode. Adding a new game = a new file + one
  // load-list entry; no host changes required.
  //
  // Plugin contract — config shape passed to registerMode:
  //   { id, label, icon, blurb, timeCost (minutes per launch),
  //     partnerRequired (bool), render(ctx), ready (bool, default true) }
  //
  // ctx provided to render():
  //   {
  //     React, palette, tokens, minutesPerToken,
  //     onLaunch(minutes)       — deduct tokens + start session timer
  //     onClose()               — close the arcade hub
  //     callImagen, callGemini, callTTS,  — AI plumbing pass-through
  //     addToast,
  //     toolData               — cross-tool state aggregator (read-only)
  //     setStemLabTool(id)     — for modes that deep-link into STEM Lab
  //   }
  if (!window.AlloHavenArcade) {
    window.AlloHavenArcade = {
      _registry: {},
      _order: [],
      registerMode: function(id, config) {
        if (!id || typeof config !== 'object') return;
        config.id = id;
        config.ready = config.ready !== false;
        this._registry[id] = config;
        if (this._order.indexOf(id) === -1) this._order.push(id);
        if (typeof console !== 'undefined') {
          console.log('[AlloHavenArcade] Registered mode: ' + id);
        }
      },
      getRegisteredModes: function() {
        var self = this;
        return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
      },
      isRegistered: function(id) { return !!this._registry[id]; },
      renderMode: function(id, ctx) {
        var mode = this._registry[id];
        if (!mode || typeof mode.render !== 'function') return null;
        try { return mode.render(ctx); }
        catch (e) {
          if (typeof console !== 'undefined') console.error('[AlloHavenArcade] Error rendering ' + id, e);
          return null;
        }
      }
    };
  }

  // ── Print stylesheet (Phase 2h) ──
  // Memory-palace export: when student/parent triggers window.print(),
  // hide everything except .ah-print-packet so the packet prints clean.
  // Class-based display:none default, @media print rule reveals.
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('ah-print-css')) return;
    var st = document.createElement('style');
    st.id = 'ah-print-css';
    st.textContent = [
      '.ah-print-packet { display: none; }',
      '@media print {',
      '  body * { visibility: hidden !important; }',
      '  .ah-print-packet, .ah-print-packet * { visibility: visible !important; }',
      '  .ah-print-packet {',
      '    display: block !important;',
      '    position: absolute !important;',
      '    top: 0 !important; left: 0 !important;',
      '    width: 100% !important;',
      '    padding: 0.5in !important;',
      '    background: white !important;',
      '    color: black !important;',
      '    font-family: Georgia, "Times New Roman", serif !important;',
      '    line-height: 1.55 !important;',
      '  }',
      '  .ah-print-packet h1, .ah-print-packet h2, .ah-print-packet h3 { color: black !important; }',
      '  .ah-print-section { page-break-inside: avoid !important; margin-bottom: 18px; }',
      '  .ah-print-page-break { page-break-before: always !important; }',
      '  @page { margin: 0.5in; }',
      '}'
    ].join('\n');
    if (document.head) document.head.appendChild(st);
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
      quizTokensEarnedToday: 0,      // memory-palace quiz tokens (capped at 2/day)
      storyWalkTokensEarnedToday: 0, // story-method walk tokens (capped at 1/day)
      // ── Daily quests (Phase 2g) ──
      // Three soft quests rotated daily. Completion is auto-detected
      // from the other dailyState counters; the bonus is a single
      // "trifecta" reward (+5 tokens) when all three are done. No
      // streaks, no pressure to complete daily — just an additional
      // gentle nudge that fits the no-guilt design language.
      questIds: [],                  // 3 quest ids chosen for today
      questsClaimed: false           // user clicked the trifecta-claim button
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
    // Multi-room (Phase 2p.12 + 2p.13).
    //   main:    always unlocked (the original bedroom)
    //   garden:  10 non-starter decorations placed
    //   library: 30 flashcards quizzed (memory-focused unlock)
    //   studio:  5 stories created OR 15 decorations placed (creative unlock)
    rooms: [
      { id: 'main',    label: 'My Room', icon: '🏠', kind: 'bedroom', wallSlots: 8, floorSlots: 12, unlocked: true },
      { id: 'garden',  label: 'Garden',  icon: '🌳', kind: 'garden',  wallSlots: 6, floorSlots: 9,  unlocked: false, unlockCriteria: 'ten-decorations' },
      { id: 'library', label: 'Library', icon: '📚', kind: 'library', wallSlots: 8, floorSlots: 8,  unlocked: false, unlockCriteria: 'thirty-cards' },
      { id: 'studio',  label: 'Studio',  icon: '🎨', kind: 'studio',  wallSlots: 12, floorSlots: 12, unlocked: false, unlockCriteria: 'fifteen-decs-or-five-stories' }
    ],
    activeRoomId: 'main',
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

    // ── Goals (Phase 2n — IEP-style targets) ──
    // Time-boxed targets with measurable metrics. Designed for the
    // student/clinician IEP review loop: set a target ("review 10 cards
    // by Friday"), watch the progress bar fill, capture completion in
    // the print packet for parent/team review.
    goals: [
      // {
      //   id, title (free text),
      //   metric: 'pomodoros' | 'reflections' | 'quizzes-passed' |
      //           'walks' | 'tokens-earned' | 'decorations-placed',
      //   targetCount: number,
      //   startDate: ISO, endDate: ISO,
      //   completedAt: ISO | null,
      //   notes: string
      // }
    ],

    // ── Stories (method-of-loci chain mnemonic) ──
    // Each story is an ordered sequence of decorations + per-step narrative
    // text. Walking a completed story (≥3 steps) is a retrieval exercise:
    // the student sees one step at a time, recalling how it connects to the
    // next item. Stories are top-level artifacts, not per-decoration content.
    stories: [
      // {
      //   id, title,
      //   steps: [{ decorationId, narrative }],
      //   createdAt, updatedAt,
      //   lastReviewedAt: null|ISO,
      //   reviewCount: 0
      // }
    ],

    // ── Visit log (Phase 2p.11) ──
    // Array of YYYY-MM-DD strings. Auto-stamped on every AlloHaven open.
    // Used for gentle streak celebration only — never punitive.
    visits: [],

    // ── Tour (Phase 2p.6) ──
    // First-visit guided walkthrough. tourSeen flips true when student
    // dismisses or completes the tour. Replayable from settings.
    tourSeen: false,

    // ── Achievements (Phase 2p.5) ──
    // Map of achievement-id → { unlockedAt: ISO }. Once unlocked, stays
    // unlocked. Computed transparently from existing state by the
    // detection useEffect — no new tracked counters anywhere.
    achievements: {},

    // ── Room mode (Phase 2p.3) ──
    // 'build' = default editing mode: empty cells show dotted outlines,
    // hover-✕ delete buttons appear, click-empty-to-add active.
    // 'live'  = rest mode: placement UI hidden, subtle darkening,
    // companion enters sleep pose. Sims-style mode distinction.
    roomMode: 'build',

    // ── Companion (Phase 2p — Sims-y critter buddy) ──
    // null until student creates one through the setup wizard. Once set,
    // a small SVG figure lives in the bottom-right of the floor surface
    // and emits state-aware thought bubbles. skillCelebrations[skillId]
    // remembers the highest level we already congratulated for, so the
    // confetti only fires on actual NEW level-ups (not on every re-render).
    companion: null,
    // {
    //   species, colorVariant, name,
    //   createdAt, lastBubbleAt, lastBubbleText,
    //   skillCelebrations: { focus, memory, reflection, storytelling }
    // }

    // ── Active modal (within AlloHaven; NOT the outer Open/Close state) ──
    activeModal: null,               // 'generate' | 'reflection' | 'journal' | 'settings' | 'memory' | 'memory-overview' | 'stories' | 'story-builder' | 'story-walk' | 'insights' | 'companion-setup' | null
    generateContext: null,           // { surface, cellIndex } when generate modal open
    // Phase 2p.17 — print scope. null = full packet via existing print
    // button; { type: 'card', decorationId } = single-decoration card.
    printScope: null,
    // Phase 2p.18 — cached companion letters keyed by ISO week start
    // (YYYY-MM-DD of the most recent Sunday). One letter per week,
    // regeneratable via the Refresh button. Saves Gemini quota.
    companionLetters: {},

    // Phase 2p.20 — gentle Pomodoro completion chime preference.
    // Web Audio sine-wave bell when a focus session ends. Default on
    // for new students; toggle in settings.
    pomodoroChimeEnabled: true,

    // ── Reflection insights cache ──
    // Holds the last AI-generated summary of journal entries. Cleared on
    // demand by clicking "Refresh" in the insights modal. Not persisted
    // across reloads — purely an in-session cache so the user can flip
    // between modals without re-billing the Gemini call.
    insightsState: {
      loading: false,                // true while a Gemini call is in flight
      summary: null,                 // { moodSummary, themes:[], wordCount, entriesAnalyzed }
      error: null,                   // user-friendly error string if analysis fails
      generatedAt: null              // ISO timestamp of the cached summary
    },

    // ── Ambient soundscape (Phase 2g) ──
    // Procedural Web Audio noise looped during Pomodoro focus phases.
    // 'off' | 'rain' | 'fireplace' | 'wind'. No external audio assets —
    // each is generated in real time from a noise buffer through a low-
    // pass filter chain. Persisted so the student's preference survives
    // reloads. Volume is held quiet (~15% gain) by design — this is
    // background, not foreground.
    soundscape: 'off',

    // ── Ambient weather (Phase 2p.27) ──
    // CSS-only particle overlay on the room. 'clear' (default, no
    // particles) | 'rain' | 'snow' | 'sparkles' (whimsical floating
    // dust). Suppressed under prefers-reduced-motion. Independent
    // from `soundscape` since some students want falling snow in
    // silence (or rain sound without rain visuals).
    atmosphere: { weather: 'clear' },

    // ── Print packet section toggles (Phase 2p.34) ──
    // Per-section booleans the print options modal flips so the user
    // can produce focused packets (e.g. just achievements for an IEP
    // meeting, just reflections for a therapy session). Defaults all
    // true — previous Print Packet behavior preserved when nobody
    // touches the options.
    printOptions: {
      companion:    true,
      achievements: true,
      goals:        true,
      memoryDecks:  true,
      stories:      true,
      journals:     true
    },

    // ── Arcade (Phase 3a) ──
    // The arcade is a plugin-based hub for token-time-gated games that
    // live alongside AlloHaven. Each game (Sage launcher, Concept Cards,
    // Runway, etc.) is registered via window.AlloHavenArcade.registerMode
    // from its own arcade_mode_<name>.js file. Tokens earned in AlloFlow
    // tools convert to play time at a teacher-configurable rate.
    // session is null when no game is active; otherwise tracks the
    // current launch (which mode, when started, how many minutes budgeted,
    // when it ends).
    arcade: {
      minutesPerToken: 5,         // teacher-configurable conversion rate
      session: null               // { modeId, startedAt, minutes, endsAt }
    }
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
  // SECTION 3.4: DAILY QUEST POOL
  // ─────────────────────────────────────────────────────────
  // Three quests are picked at random on day rollover. Completion is
  // auto-detected from dailyState counters; finishing all three unlocks
  // a single "trifecta" bonus (+5 tokens) the user claims with one tap.
  // No streaks, no daily pressure — just a gentle alternative path to a
  // few extra tokens for students who already use multiple features.
  var QUEST_POOL = [
    { id: 'pomo1',     label: 'Complete a Pomodoro session',         icon: '⏱️', check: function(d, s) { return (d.pomodorosCompleted || 0) >= 1; } },
    { id: 'pomo2',     label: 'Complete 2 Pomodoro sessions',         icon: '⏱️', check: function(d, s) { return (d.pomodorosCompleted || 0) >= 2; } },
    { id: 'reflect',   label: 'Write a journal reflection',           icon: '📓', check: function(d, s) { return (d.reflectionsSubmitted || 0) >= 1; } },
    { id: 'storyWalk', label: 'Walk through a memory story',          icon: '📖', check: function(d, s) { return (d.storyWalkTokensEarnedToday || 0) >= 1; } },
    { id: 'quiz',      label: 'Review a memory-palace flashcard',     icon: '🧠', check: function(d, s) { return (d.quizTokensEarnedToday || 0) >= 1; } },
    { id: 'decor3',    label: 'Have at least 3 decorations',          icon: '🎨', check: function(d, s) { return (s.decorations || []).filter(function(x){return !x.isStarter;}).length >= 3; } },
    { id: 'tokens5',   label: 'Earn at least 5 tokens today',         icon: '🪙', check: function(d, s) {
        if (!s.earnings) return false;
        var todayStr = d.date;
        var sum = 0;
        for (var i = 0; i < s.earnings.length; i++) {
            var e = s.earnings[i];
            if (e && e.date && e.date.slice(0, 10) === todayStr && e.tokens > 0) sum += e.tokens;
        }
        return sum >= 5;
    } }
  ];
  // Pick N random non-overlapping quest ids from the pool. Seeded by date
  // so the quests are stable for that day (same set if the user reloads).
  function pickQuestsForDate(dateStr, count) {
    if (!dateStr) return [];
    // Tiny seeded shuffle from the date string so the same day always
    // picks the same quests (don't want them to change mid-day).
    var seed = 0;
    for (var i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) | 0;
    var pool = QUEST_POOL.slice();
    var picked = [];
    var remaining = Math.min(count, pool.length);
    while (remaining > 0 && pool.length > 0) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      var idx = seed % pool.length;
      picked.push(pool[idx].id);
      pool.splice(idx, 1);
      remaining--;
    }
    return picked;
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

  // Adaptive reflection prompts (Phase 2p.17) — returns ONE context-aware
  // prompt object based on what\'s happened in the student\'s last day or
  // two. Picks first applicable trigger. Returns null when no clear
  // contextual hook exists; the modal then just shows the static 3.
  // Triggers (priority order):
  //   1. Story walk in last 4h         → "what part will you remember?"
  //   2. New decoration in last 24h    → "what does the {label} mean?"
  //   3. Quiz passed (≥80%) in last 4h → "what do you finally know?"
  //   4. Struggle moods ≥50% last 7d   → "what\'s been tough — what helped?"
  //   5. Streak ≥5 days                → "what brings you back?"
  //   6. First Pomodoro of today done  → "what do you want to focus on?"
  //   7. No reflection in 5+ days      → "where has your attention been?"
  function computeAdaptivePrompt(state) {
    var now = Date.now();
    var fourHr = 4 * 60 * 60 * 1000;
    var oneDay = 24 * 60 * 60 * 1000;

    // 1. Recent story walk
    var recentWalk = (state.earnings || []).filter(function(e) {
      return e.source === 'story-walk' && e.date && (now - new Date(e.date).getTime()) < fourHr;
    }).pop();
    if (recentWalk && recentWalk.metadata && recentWalk.metadata.storyId) {
      var storyMatch = (state.stories || []).filter(function(s) { return s.id === recentWalk.metadata.storyId; })[0];
      if (storyMatch && storyMatch.title) {
        return {
          id: 'adaptive',
          text: 'You just walked "' + storyMatch.title + '" — what part will you remember?',
          hint: 'sparked by your recent story walk'
        };
      }
    }

    // 2. New decoration in last 24h
    var newDec = (state.decorations || []).filter(function(d) {
      return !d.isStarter && d.earnedAt && (now - new Date(d.earnedAt).getTime()) < oneDay;
    }).pop();
    if (newDec) {
      var dLabel = newDec.templateLabel || newDec.template || 'new decoration';
      return {
        id: 'adaptive',
        text: 'What does the ' + dLabel + ' mean to you right now?',
        hint: 'sparked by your new decoration'
      };
    }

    // 3. Recent quiz pass
    var recentQuiz = (state.earnings || []).filter(function(e) {
      var ok = e.source === 'memory-quiz' || e.source === 'reflection-cloze-quiz';
      return ok && e.date && (now - new Date(e.date).getTime()) < fourHr;
    }).pop();
    if (recentQuiz && recentQuiz.metadata && recentQuiz.metadata.decorationId) {
      var quizDec = (state.decorations || []).filter(function(d) { return d.id === recentQuiz.metadata.decorationId; })[0];
      if (quizDec) {
        var qLabel = quizDec.templateLabel || quizDec.template || 'that deck';
        return {
          id: 'adaptive',
          text: "What's something you finally know about " + qLabel + '?',
          hint: 'sparked by your recent quiz pass'
        };
      }
    }

    // 4. Struggle moods clustered in last 7d
    var weekAgo = now - 7 * oneDay;
    var recentMoods = (state.decorations || []).filter(function(d) {
      return d.mood && d.earnedAt && new Date(d.earnedAt).getTime() >= weekAgo;
    });
    if (recentMoods.length >= 3) {
      var struggleN = recentMoods.filter(function(d) { return d.mood === 'struggle'; }).length;
      if (struggleN / recentMoods.length >= 0.5) {
        return {
          id: 'adaptive',
          text: "What's been tough this week — and what's helped, even a little?",
          hint: 'sparked by your recent moods'
        };
      }
    }

    // 5. Streak ≥5
    var streak = computeStreak(state.visits || []);
    if (streak.current >= 5) {
      return {
        id: 'adaptive',
        text: "You've been here " + streak.current + ' days running. What brings you back?',
        hint: 'sparked by your visit streak'
      };
    }

    // 6. First Pomodoro of today
    var todayStr = new Date().toISOString().slice(0, 10);
    var todayPoms = (state.earnings || []).filter(function(e) {
      return (e.source === 'pomodoro' || e.source === 'cycle-bonus') && e.date && e.date.slice(0, 10) === todayStr;
    });
    if (todayPoms.length === 1) {
      return {
        id: 'adaptive',
        text: "You just finished a focus session. What's one thing you want to focus on next?",
        hint: 'sparked by your first Pomodoro today'
      };
    }

    // 7. No reflection in 5+ days
    var entries = (state.journalEntries || []);
    if (entries.length === 0) {
      return null; // Don\'t prompt re-engagement on the very first reflection
    }
    var lastEntry = entries[entries.length - 1];
    if (lastEntry && lastEntry.date) {
      var daysSince = (now - new Date(lastEntry.date).getTime()) / oneDay;
      if (daysSince >= 5) {
        return {
          id: 'adaptive',
          text: 'Where has your attention been lately?',
          hint: 'gentle re-entry — your last reflection was a while ago'
        };
      }
    }

    return null;
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
    },
    // ── Additive template expansion (Phase 2g content batch) ──
    // Each new template follows the same data shape as the originals so
    // the existing template-picker and slot-driven prompt builder pick
    // them up automatically without code changes elsewhere. Placement
    // surfaces (wall/floor/both) chosen so the room layout stays balanced
    // — no single surface gets all the new options.
    {
      id: 'instruments',
      label: 'Musical instruments',
      icon: '🎸',
      surface: 'both',
      basePrompt: 'A {style} {instrument} in {color}, {pose}, {artStyle}, single object on white background, friendly cozy aesthetic, no text',
      hierarchical: true,
      slots: [
        { id: 'category', label: 'Family', options: ['String', 'Wind', 'Percussion', 'Keys'] },
        { id: 'instrument', label: 'Instrument', dependsOn: 'category', optionsByCategory: {
          'String':     ['acoustic guitar', 'electric guitar', 'violin', 'cello', 'ukulele', 'harp', 'banjo'],
          'Wind':       ['flute', 'clarinet', 'saxophone', 'trumpet', 'french horn', 'recorder'],
          'Percussion': ['snare drum', 'djembe', 'tambourine', 'xylophone', 'congas', 'cymbals'],
          'Keys':       ['upright piano', 'grand piano', 'electric keyboard', 'accordion', 'organ']
        }},
        { id: 'color', label: 'Color', options: ['warm wood', 'cherry red', 'navy blue', 'gold accents', 'matte black', 'pastel mint'] },
        { id: 'style', label: 'Style', options: ['vintage', 'modern', 'classical', 'whimsical', 'concert-ready'] },
        { id: 'pose', label: 'Pose', options: ['displayed on a stand', 'leaning against a wall', 'resting on a velvet case', 'mounted decoratively'] }
      ]
    },
    {
      id: 'food',
      label: 'Food & recipes',
      icon: '🍰',
      surface: 'both',
      basePrompt: 'A {presentation} of {dish}, {garnish}, {artStyle}, single subject on white background, friendly cozy aesthetic, food photography from above, no text, no readable labels',
      hierarchical: true,
      slots: [
        { id: 'category', label: 'Course', options: ['Baked goods', 'Drinks & sips', 'Comfort food', 'World cuisines', 'Fresh & fruity'] },
        { id: 'dish', label: 'Dish', dependsOn: 'category', optionsByCategory: {
          'Baked goods':      ['layered cake', 'frosted cupcakes', 'fresh croissants', 'chocolate-chip cookies', 'fruit tart', 'cinnamon rolls', 'crusty bread loaf'],
          'Drinks & sips':    ['hot cocoa with whipped cream', 'iced matcha latte', 'fruit smoothie', 'herbal tea in a teapot', 'lemonade pitcher', 'milkshake'],
          'Comfort food':     ['steaming bowl of ramen', 'mac and cheese', 'tomato soup with grilled cheese', 'chicken pot pie', 'spaghetti and meatballs'],
          'World cuisines':   ['sushi platter', 'taco trio', 'spread of dim sum', 'paella pan', 'biryani plate', 'pho bowl'],
          'Fresh & fruity':   ['fruit bowl', 'berry parfait', 'sliced watermelon', 'farmers-market basket', 'caprese salad']
        }},
        { id: 'presentation', label: 'Presentation', options: ['rustic plate', 'fine china', 'wooden board', 'glass jar', 'ceramic bowl', 'cast iron skillet'] },
        { id: 'garnish', label: 'Garnish', options: ['fresh herbs', 'edible flowers', 'powdered sugar dusting', 'sliced citrus', 'colorful sprinkles', 'minimal — just the dish'] }
      ]
    },
    {
      id: 'weather',
      label: 'Weather scenes',
      icon: '🌦',
      surface: 'wall',
      basePrompt: 'A {weather} scene over a {landscape}, {timeOfDay} light, {mood} mood, {artStyle}, framed cleanly, friendly cozy children\'s aesthetic, no text',
      slots: [
        { id: 'weather', label: 'Weather', options: ['gentle snowfall', 'thunderstorm with lightning', 'rainy day with puddles', 'foggy morning', 'rainbow after rain', 'starry clear night', 'cherry-blossom drift', 'autumn wind with leaves'] },
        { id: 'landscape', label: 'Landscape', options: ['rolling hills', 'forest clearing', 'small town rooftops', 'lake shoreline', 'open meadow', 'snowy mountain range', 'desert dunes'] },
        { id: 'timeOfDay', label: 'Time of day', options: ['dawn', 'midday', 'golden hour', 'sunset', 'twilight', 'deep night'] },
        { id: 'mood', label: 'Mood', options: ['peaceful', 'dramatic', 'cheerful', 'mysterious', 'cozy and warm', 'crisp and fresh'] }
      ]
    },
    {
      id: 'sports',
      label: 'Sports & gear',
      icon: '⚾',
      surface: 'both',
      basePrompt: 'A {color} {item} for {sport}, {style}, {artStyle}, single object on white background, friendly cozy aesthetic, no readable text or logos',
      hierarchical: true,
      slots: [
        { id: 'sport', label: 'Sport', options: ['baseball', 'basketball', 'soccer', 'tennis', 'skateboarding', 'climbing', 'swimming', 'cycling', 'martial arts', 'dance'] },
        { id: 'item', label: 'Item', dependsOn: 'sport', optionsByCategory: {
          'baseball':       ['glove and ball', 'wooden bat', 'team jersey on a hanger', 'cap on a peg'],
          'basketball':     ['leather basketball', 'jersey on a hanger', 'sneakers on the floor', 'mini hoop'],
          'soccer':         ['black and white soccer ball', 'pair of cleats', 'jersey', 'shin guards'],
          'tennis':         ['racquet and ball', 'gym bag', 'tennis shoes', 'visor'],
          'skateboarding':  ['skateboard with custom deck', 'helmet and pads', 'sneakers'],
          'climbing':       ['climbing shoes', 'chalk bag', 'rope coil', 'carabiner set'],
          'swimming':       ['goggles and cap', 'kickboard', 'medal on a ribbon', 'swimsuit on a hook'],
          'cycling':        ['helmet on a peg', 'water bottle', 'cycling jersey', 'pair of cycling shoes'],
          'martial arts':   ['neatly folded gi', 'belt collection on a rack', 'training mitts', 'wooden practice sword'],
          'dance':          ['ballet slippers', 'pointe shoes', 'tap shoes', 'dance ribbon']
        }},
        { id: 'color', label: 'Color', options: ['team red', 'royal blue', 'forest green', 'sunshine yellow', 'classic white', 'matte black'] },
        { id: 'style', label: 'Style', options: ['well-loved and broken in', 'brand new and crisp', 'vintage classic', 'modern minimalist'] }
      ]
    },
    {
      id: 'pets',
      label: 'Pet portraits',
      icon: '🐶',
      surface: 'wall',
      basePrompt: 'A framed portrait of {petType} with {fur} fur and {expression} expression, {pose}, {artStyle}, oval frame, friendly cozy aesthetic, no text',
      hierarchical: true,
      slots: [
        { id: 'category', label: 'Category', options: ['Furry friends', 'Feathered friends', 'Aquatic friends', 'Tiny friends'] },
        { id: 'petType', label: 'Pet', dependsOn: 'category', optionsByCategory: {
          'Furry friends':    ['golden retriever', 'tabby cat', 'rabbit', 'guinea pig', 'small mixed-breed dog', 'long-haired cat', 'fluffy puppy'],
          'Feathered friends':['parakeet', 'cockatiel', 'parrot', 'finch', 'pet chicken'],
          'Aquatic friends':  ['betta fish', 'goldfish in a bowl', 'pet turtle', 'small aquarium scene'],
          'Tiny friends':     ['hamster', 'gerbil', 'leopard gecko', 'corn snake', 'hermit crab', 'butterfly in a jar']
        }},
        { id: 'fur', label: 'Coat / appearance', options: ['short-haired', 'long-haired', 'curly', 'spotted', 'striped', 'solid color', 'patchy'] },
        { id: 'expression', label: 'Expression', options: ['curious', 'sleepy', 'playful', 'noble and dignified', 'happy with tongue out', 'wise and watchful'] },
        { id: 'pose', label: 'Pose', options: ['head and shoulders', 'sitting full-body', 'in profile', 'looking up softly', 'resting comfortably'] }
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

  // ── Cloze-deletion helpers (Phase 2c) ──
  // Notes can include {curly-braced} words/phrases. Those get hidden
  // during the cloze quiz and the student types them in. Forgiving
  // substring match like the acronym quiz.
  // Example:
  //   "The mitochondria is the {powerhouse} of the {cell}."
  // → quiz shows "The mitochondria is the ___ of the ___."
  // → student fills 2 blanks, gets graded
  var CLOZE_REGEX = /\{([^{}]+)\}/g;

  function hasClozeMarkers(linkedContent) {
    if (!linkedContent || linkedContent.type !== 'notes') return false;
    var text = (linkedContent.data && linkedContent.data.text) || '';
    return CLOZE_REGEX.test(text);
  }

  // Extract the cloze answers (in document order) from a notes string
  function extractClozeAnswers(text) {
    var answers = [];
    var match;
    var re = new RegExp(CLOZE_REGEX.source, 'g'); // fresh regex (lastIndex)
    while ((match = re.exec(text)) !== null) {
      answers.push(match[1].trim());
    }
    return answers;
  }

  // Replace {answer} markers with a placeholder so the rendered text
  // can show ___ where the blanks are. Returns segments + indices for
  // typed-input mapping.
  function buildClozeSegments(text) {
    var segments = [];
    var lastIdx = 0;
    var blankIdx = 0;
    var match;
    var re = new RegExp(CLOZE_REGEX.source, 'g');
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ kind: 'text', value: text.slice(lastIdx, match.index) });
      }
      segments.push({ kind: 'blank', answer: match[1].trim(), blankIdx: blankIdx });
      blankIdx++;
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      segments.push({ kind: 'text', value: text.slice(lastIdx) });
    }
    return segments;
  }

  // Forgiving substring match — same logic as acronym quiz so behavior
  // is consistent.
  function clozeAnswerCorrect(truth, guess) {
    var t = (truth || '').trim().toLowerCase();
    var g = (guess || '').trim().toLowerCase();
    if (!t || !g) return false;
    return t === g || t.indexOf(g) === 0 || g.indexOf(t) === 0;
  }

  // ── Goal metrics (Phase 2n) ──
  // Each metric = how to measure progress toward a goal. The COUNTING
  // function takes (state, startMs, endMs) and returns the count of
  // qualifying events in that window. Designed to read the same state
  // surfaces the rest of the tool already writes — no new tracking
  // infrastructure needed.
  var GOAL_METRICS = [
    {
      id: 'pomodoros', emoji: '🍅', label: 'Pomodoros completed',
      hint: 'Each finished focus session counts as one.',
      count: function(st, startMs, endMs) {
        return (st.earnings || []).filter(function(e) {
          if (!e.date) return false;
          var t = new Date(e.date).getTime();
          if (t < startMs || t > endMs) return false;
          return e.source === 'pomodoro' || e.source === 'cycle-bonus';
        }).length;
      }
    },
    {
      id: 'reflections', emoji: '📝', label: 'Reflections written',
      hint: 'Journal entries that earned a token.',
      count: function(st, startMs, endMs) {
        return (st.journalEntries || []).filter(function(e) {
          if (!e.date) return false;
          var t = new Date(e.date).getTime();
          return t >= startMs && t <= endMs;
        }).length;
      }
    },
    {
      id: 'quizzes-passed', emoji: '✓', label: 'Memory quizzes passed',
      hint: 'Counts quiz sessions where you scored ≥80%.',
      count: function(st, startMs, endMs) {
        return (st.earnings || []).filter(function(e) {
          if (!e.date) return false;
          var t = new Date(e.date).getTime();
          if (t < startMs || t > endMs) return false;
          return e.source === 'memory-quiz' || e.source === 'reflection-cloze-quiz';
        }).length;
      }
    },
    {
      id: 'walks', emoji: '📜', label: 'Story walks',
      hint: 'Each completed story walk counts.',
      count: function(st, startMs, endMs) {
        return (st.earnings || []).filter(function(e) {
          if (!e.date) return false;
          var t = new Date(e.date).getTime();
          if (t < startMs || t > endMs) return false;
          return e.source === 'story-walk';
        }).length;
      }
    },
    {
      id: 'decorations-placed', emoji: '🌿', label: 'Decorations placed',
      hint: 'New decorations added to the room.',
      count: function(st, startMs, endMs) {
        return (st.decorations || []).filter(function(d) {
          if (d.isStarter) return false;
          if (!d.earnedAt) return false;
          var t = new Date(d.earnedAt).getTime();
          return t >= startMs && t <= endMs;
        }).length;
      }
    },
    {
      id: 'tokens-earned', emoji: '🪙', label: 'Tokens earned',
      hint: 'All token-earning events combined.',
      count: function(st, startMs, endMs) {
        return (st.earnings || []).reduce(function(sum, e) {
          if (!e.date) return sum;
          var t = new Date(e.date).getTime();
          if (t < startMs || t > endMs) return sum;
          return sum + (e.tokens || 0);
        }, 0);
      }
    }
  ];
  // Goal templates (Phase 2p.36) — pre-built, ready-to-launch goals.
  // Lower friction for students (or clinicians scaffolding a student)
  // who want to start a goal without choosing metric + target + dates
  // from scratch. Each template clones into a real goal record on
  // selection; students can still rename + tweak in the goal builder
  // before it locks in.
  var GOAL_TEMPLATES = [
    {
      id: 'focus-week',  emoji: '🍅',
      title: 'Focus this week',
      hint: '5 finished Pomodoros in 7 days',
      metric: 'pomodoros', targetCount: 5, days: 7
    },
    {
      id: 'reflect-daily', emoji: '📝',
      title: 'Reflection week',
      hint: '5 journal entries in 7 days',
      metric: 'reflections', targetCount: 5, days: 7
    },
    {
      id: 'memory-week', emoji: '✓',
      title: 'Memory work',
      hint: '4 quizzes passed in 14 days',
      metric: 'quizzes-passed', targetCount: 4, days: 14
    },
    {
      id: 'build-corner', emoji: '🌿',
      title: 'Build a corner',
      hint: '5 decorations in 14 days',
      metric: 'decorations-placed', targetCount: 5, days: 14
    },
    {
      id: 'story-walker', emoji: '📜',
      title: 'Story walker',
      hint: '3 story walks in 7 days',
      metric: 'walks', targetCount: 3, days: 7
    },
    {
      id: 'token-saver', emoji: '🪙',
      title: 'Token saver',
      hint: 'Earn 30 tokens in 14 days',
      metric: 'tokens-earned', targetCount: 30, days: 14
    },
    {
      id: 'focus-deep', emoji: '🍅',
      title: 'Deep focus month',
      hint: '12 Pomodoros in 30 days',
      metric: 'pomodoros', targetCount: 12, days: 30
    },
    {
      id: 'mastery-month', emoji: '🧠',
      title: 'Solid mastery',
      hint: '10 quizzes passed in 30 days',
      metric: 'quizzes-passed', targetCount: 10, days: 30
    }
  ];

  function getGoalMetric(id) {
    for (var i = 0; i < GOAL_METRICS.length; i++) {
      if (GOAL_METRICS[i].id === id) return GOAL_METRICS[i];
    }
    return null;
  }
  // Compute progress for a goal — returns { current, target, pct, isDone }
  function computeGoalProgress(goal, state) {
    var metric = getGoalMetric(goal.metric);
    if (!metric) return { current: 0, target: goal.targetCount || 1, pct: 0, isDone: false };
    var startMs = goal.startDate ? new Date(goal.startDate).getTime() : 0;
    var endMs = goal.endDate ? new Date(goal.endDate).getTime() : Date.now();
    var current = metric.count(state, startMs, endMs);
    var target = goal.targetCount || 1;
    var pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    var isDone = current >= target;
    return { current: current, target: target, pct: pct, isDone: isDone };
  }
  // Default 7-day window starting today at midnight
  function defaultGoalDateRange() {
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  // ── Subject tags (Phase 2p.6) ──
  // Multi-select academic-domain tags. Sister to mood tags but where
  // mood is single-select affective, subjects are multi-select cognitive
  // (a single decoration can be both math AND science, for example).
  // Maps directly to IEP goal areas so the print packet groups by
  // subject for parent / IEP-team review.
  var SUBJECT_TAGS = [
    { id: 'math',        emoji: '🔢', label: 'Math',         hint: 'Numbers, shapes, logic, problem-solving' },
    { id: 'reading',     emoji: '📚', label: 'Reading',      hint: 'Words, comprehension, vocabulary, literature' },
    { id: 'writing',     emoji: '✍️', label: 'Writing',      hint: 'Composition, spelling, grammar' },
    { id: 'science',     emoji: '🔬', label: 'Science',      hint: 'Biology, chemistry, physics, scientific thinking' },
    { id: 'social',      emoji: '🌍', label: 'Social',       hint: 'History, geography, cultures, civics' },
    { id: 'art',         emoji: '🎨', label: 'Art',          hint: 'Drawing, design, visual creativity' },
    { id: 'music',       emoji: '🎵', label: 'Music',        hint: 'Notes, rhythm, instruments, songs' },
    { id: 'life-skills', emoji: '🌱', label: 'Life skills',  hint: 'Self-care, social-emotional, life management' }
  ];
  function getSubjectTag(id) {
    for (var i = 0; i < SUBJECT_TAGS.length; i++) {
      if (SUBJECT_TAGS[i].id === id) return SUBJECT_TAGS[i];
    }
    return null;
  }

  // ── Mood tags (Phase 2m) ──
  // Optional affective-domain tag students can attach to a decoration
  // when they place it (or edit later). Surfaces in the print packet
  // and clinical-review packet as a mood distribution chip — gives
  // parents/clinicians a window into how the student felt while
  // earning each item, without forcing them to journal it.
  var MOOD_OPTIONS = [
    { id: 'joy',       emoji: '🌟', label: 'Joy',       hint: 'felt great earning this' },
    { id: 'pride',     emoji: '⚡', label: 'Pride',     hint: 'worked hard for this one' },
    { id: 'curiosity', emoji: '🤔', label: 'Curiosity', hint: 'sparked something to explore' },
    { id: 'calm',      emoji: '🦋', label: 'Calm',      hint: 'felt peaceful and steady' },
    { id: 'struggle',  emoji: '💪', label: 'Struggle',  hint: 'pushed through something hard' }
  ];
  function getMoodOption(id) {
    for (var i = 0; i < MOOD_OPTIONS.length; i++) {
      if (MOOD_OPTIONS[i].id === id) return MOOD_OPTIONS[i];
    }
    return null;
  }

  // ── Time-of-day room lighting (Phase 2p.3) ──
  // Reads system clock and returns a subtle wallpaper tint matching the
  // hour. Returns null at midday (no overlay), so daytime sessions read
  // neutral and the tint only appears morning/evening/night. Strong
  // enough to signal time-of-day, soft enough not to compete with
  // decoration colors. Suppressed in high-contrast mode by the caller.
  function getTimeOfDayTint() {
    var hour = new Date().getHours();
    if (hour >= 5 && hour < 9)   return { color: 'rgba(255,180,170,0.10)', label: 'dawn' };
    if (hour >= 17 && hour < 20) return { color: 'rgba(255,150,80,0.13)',  label: 'dusk' };
    if (hour >= 20 || hour < 5)  return { color: 'rgba(60,80,140,0.18)',   label: 'night' };
    return null;
  }

  // ── Mood-driven room tint (Phase 2p.2) ──
  // Maps the dominant mood across recent decorations to a subtle radial
  // gradient overlay color. Returns null when there's no signal (under
  // 3 mood-tagged decorations in the last 30 days, or no clear winner).
  // The overlay is layered on the floor surface at low opacity so the
  // room "feels" like the student's recent affective state without
  // hijacking the existing warm-light gradient.
  // ── Visit streaks (Phase 2p.11) ──
  // Computes current consecutive-days-visited streak ending today, plus
  // longest streak of all time. Designed for celebration only — never
  // surfaces a broken streak, never punishes missing days.
  function computeStreak(visits) {
    if (!visits || visits.length === 0) return { current: 0, longest: 0 };
    var unique = {};
    visits.forEach(function(v) { if (v) unique[v] = true; });
    var dates = Object.keys(unique).sort();
    var msPerDay = 24 * 60 * 60 * 1000;
    var todayStr = new Date().toISOString().slice(0, 10);
    var current = 0;
    if (unique[todayStr]) {
      current = 1;
      for (var i = 1; i < 365; i++) {
        var prev = new Date(Date.now() - i * msPerDay).toISOString().slice(0, 10);
        if (unique[prev]) current++;
        else break;
      }
    }
    var longest = 0, streak = 0;
    for (var j = 0; j < dates.length; j++) {
      if (j === 0) { streak = 1; }
      else {
        var prevD = new Date(dates[j - 1]).getTime();
        var thisD = new Date(dates[j]).getTime();
        if (Math.round((thisD - prevD) / msPerDay) === 1) streak++;
        else streak = 1;
      }
      if (streak > longest) longest = streak;
    }
    if (current > longest) longest = current;
    return { current: current, longest: longest };
  }

  // ── Companion letter (Phase 2p.18) ──
  // Generates a personalized "letter from your buddy" — short prose
  // summarizing the week, in the active species\'s voice. Two paths:
  //   AI path: callGemini(prompt) → returns letter text
  //   Fallback: template-based letter from same data, no AI required
  // Both paths use the SAME aggregation, so behavior is consistent
  // when AI is unavailable (quota / network / browser config).

  function getWeekKey() {
    // Most recent Sunday in YYYY-MM-DD format. One letter per week.
    var now = new Date();
    var dow = now.getDay();
    var sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    return sunday.toISOString().slice(0, 10);
  }

  function aggregateWeekData(state) {
    var nowMs = Date.now();
    var weekAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
    var earnings = (state.earnings || []).filter(function(e) {
      return e.date && new Date(e.date).getTime() >= weekAgo;
    });
    var poms = earnings.filter(function(e) { return e.source === 'pomodoro' || e.source === 'cycle-bonus'; }).length;
    var quizzes = earnings.filter(function(e) { return e.source === 'memory-quiz' || e.source === 'reflection-cloze-quiz'; }).length;
    var walks = earnings.filter(function(e) { return e.source === 'story-walk'; }).length;
    var refls = (state.journalEntries || []).filter(function(e) {
      return e.date && new Date(e.date).getTime() >= weekAgo;
    });
    var newDecs = (state.decorations || []).filter(function(d) {
      return !d.isStarter && d.earnedAt && new Date(d.earnedAt).getTime() >= weekAgo;
    });
    // Days active this week (deduped)
    var dayMap = {};
    earnings.forEach(function(e) { if (e.date) dayMap[e.date.slice(0, 10)] = true; });
    refls.forEach(function(e) { if (e.date) dayMap[e.date.slice(0, 10)] = true; });
    var daysActive = Object.keys(dayMap).length;
    // Mood + subject patterns
    var moodCounts = {}, subjCounts = {};
    newDecs.forEach(function(d) {
      if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
      (d.subjects || []).forEach(function(s) { subjCounts[s] = (subjCounts[s] || 0) + 1; });
    });
    function topKey(c) {
      var top = null, n = 0;
      Object.keys(c).forEach(function(k) { if (c[k] > n) { n = c[k]; top = k; } });
      return top;
    }
    // Top reflection (most recent if any)
    var lastRefl = refls.length > 0 ? refls[refls.length - 1] : null;
    // Decoration name list (shorter list for AI prompts)
    var decLabels = newDecs.map(function(d) { return d.templateLabel || d.template || 'item'; });
    return {
      daysActive: daysActive,
      poms: poms, quizzes: quizzes, walks: walks,
      reflections: refls.length,
      newDecorations: newDecs.length,
      decLabels: decLabels,
      topMood: topKey(moodCounts),
      topSubject: topKey(subjCounts),
      lastReflectionText: lastRefl ? lastRefl.text : null
    };
  }

  function composeFallbackLetter(state, agg, species, name) {
    var sp = getCompanionSpecies(species);
    var greetings = {
      cat:    'Hey friend,',
      fox:    'Hi you,',
      owl:    'Dear student,',
      turtle: 'Hello,',
      dragon: 'HEY!! Best friend!!'
    };
    var signoffs = {
      cat:    '— curled up in the room,\n  ' + (name || 'your buddy'),
      fox:    '— sneakily proud,\n  ' + (name || 'your buddy'),
      owl:    '— with quiet appreciation,\n  ' + (name || 'your buddy'),
      turtle: '— slowly and surely,\n  ' + (name || 'your buddy'),
      dragon: '— roaring with you,\n  ' + (name || 'your buddy')
    };
    var lines = [];
    lines.push(greetings[species] || 'Hey,');
    lines.push('');
    if (agg.daysActive >= 5) lines.push('You showed up ' + agg.daysActive + ' days this week. That\'s a lot.');
    else if (agg.daysActive >= 1) lines.push('You came by ' + agg.daysActive + ' day' + (agg.daysActive === 1 ? '' : 's') + ' this week.');
    if (agg.poms > 0) lines.push('We focused ' + agg.poms + ' time' + (agg.poms === 1 ? '' : 's') + ' together.');
    if (agg.quizzes > 0) lines.push('You passed ' + agg.quizzes + ' memory quiz' + (agg.quizzes === 1 ? '' : 'zes') + '. Real reps.');
    if (agg.walks > 0) lines.push('We walked ' + agg.walks + ' stor' + (agg.walks === 1 ? 'y' : 'ies') + '. I liked them.');
    if (agg.newDecorations > 0) {
      var listed = agg.decLabels.slice(0, 3).join(', ');
      lines.push('You added ' + agg.newDecorations + ' new decoration' + (agg.newDecorations === 1 ? '' : 's') + (listed ? ' (' + listed + ')' : '') + '.');
    }
    if (agg.topMood) {
      var mo = getMoodOption(agg.topMood);
      if (mo) lines.push('The mood that showed up most was ' + mo.label.toLowerCase() + '.');
    }
    if (agg.topSubject) {
      for (var si = 0; si < SUBJECT_TAGS.length; si++) {
        if (SUBJECT_TAGS[si].id === agg.topSubject) {
          lines.push('We spent extra time on ' + SUBJECT_TAGS[si].label.toLowerCase() + '.');
          break;
        }
      }
    }
    if (agg.daysActive === 0) lines.push('Quiet week. That\'s OK too. I\'ll be here.');
    lines.push('');
    var closingLines = {
      cat:    'Quietly proud of you. Keep it gentle.',
      fox:    'You\'re cleverer than you let on. Onward.',
      owl:    'Steady work makes deep memory. I see it.',
      turtle: 'Step by step. Always works.',
      dragon: 'YOU. ARE. AMAZING. Let\'s do another week!'
    };
    lines.push(closingLines[species] || 'Proud of you.');
    lines.push('');
    lines.push(signoffs[species] || '— your buddy');
    return lines.join('\n');
  }

  function buildLetterPrompt(agg, species, name) {
    var sp = getCompanionSpecies(species);
    var voiceHints = {
      cat:    'Calm, observant, dry. Short sentences. "Hmm." okay.',
      fox:    'Curious, clever, slightly sly. Suggests with "what if".',
      owl:    'Wise, deliberate, slow-paced. Considered observations.',
      turtle: 'Patient, gentle, steady. "Step by step" fits.',
      dragon: 'Enthusiastic, big-energy, playful. Some exclamation points.'
    };
    var voice = voiceHints[species] || 'Friendly, gentle, observational.';
    var stats = [];
    stats.push('Days active this week: ' + agg.daysActive);
    if (agg.poms > 0) stats.push('Pomodoros: ' + agg.poms);
    if (agg.quizzes > 0) stats.push('Quizzes passed: ' + agg.quizzes);
    if (agg.walks > 0) stats.push('Story walks: ' + agg.walks);
    if (agg.reflections > 0) stats.push('Reflections written: ' + agg.reflections);
    if (agg.newDecorations > 0) stats.push('New decorations placed: ' + agg.newDecorations + (agg.decLabels.length > 0 ? ' (e.g., ' + agg.decLabels.slice(0, 3).join(', ') + ')' : ''));
    if (agg.topMood) stats.push('Most-tagged mood: ' + agg.topMood);
    if (agg.topSubject) stats.push('Most-tagged subject: ' + agg.topSubject);
    return [
      'You are ' + (name || sp.label) + ', a ' + sp.label.toLowerCase() + ' companion who lives in a student\'s cozy learning room (AlloHaven).',
      'Voice: ' + voice,
      'Write a short personal letter (90-160 words) from you to the student, summarizing this past week. Be specific about what they did. Be warm but not gushing. NEVER guilt-trip about missed days. NEVER use streak punishment language. Use plain text — no markdown.',
      '',
      'This week\'s data:',
      stats.join('\n'),
      agg.lastReflectionText ? '\nA recent reflection they wrote: "' + agg.lastReflectionText.slice(0, 200) + '"' : '',
      '',
      'Open with a greeting in your voice. Sign off with your name. Keep it under 160 words. Return ONLY the letter text — no preamble, no JSON, no quotes around it.'
    ].join('\n');
  }

  // ── Seasonal context (Phase 2p.11) ──
  // Returns the active "season label" for today, or null if it\'s an
  // ordinary day. Used by the companion bubble pool to surface seasonal
  // observations without changing visuals (intentional minimal-touch).
  function getSeasonalContext() {
    var now = new Date();
    var month = now.getMonth(); // 0-11
    var day = now.getDate();
    // Specific days first (more specific wins)
    if (month === 1 && day >= 11 && day <= 14) return { id: 'valentine', label: 'around Valentine\'s' };
    if (month === 9 && day >= 24) return { id: 'spooky', label: 'spooky season' };
    if (month === 11 || (month === 0 && day <= 6)) return { id: 'winter', label: 'winter holidays' };
    // Generic seasons (Northern Hemisphere)
    if (month >= 2 && month <= 4) return { id: 'spring', label: 'spring' };
    if (month >= 5 && month <= 7) return { id: 'summer', label: 'summer' };
    if (month >= 8 && month <= 10) return { id: 'fall', label: 'fall' };
    return null;
  }

  function getDominantMoodTint(state) {
    var thirtyAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    var recent = (state.decorations || []).filter(function(d) {
      return d.mood && d.earnedAt && new Date(d.earnedAt).getTime() >= thirtyAgoMs;
    });
    if (recent.length < 3) return null;
    var counts = {};
    recent.forEach(function(d) {
      counts[d.mood] = (counts[d.mood] || 0) + 1;
    });
    var top = null, topN = 0, runnerN = 0;
    Object.keys(counts).forEach(function(k) {
      if (counts[k] > topN) { runnerN = topN; topN = counts[k]; top = k; }
      else if (counts[k] > runnerN) { runnerN = counts[k]; }
    });
    // Only return a tint if dominance is clear (top > 1.5x runner-up)
    if (!top || topN < runnerN * 1.5) return null;
    // Mood → tint color mapping (subtle, low-opacity radial)
    var tints = {
      joy:       'rgba(255,200,90,0.10)',   // warm yellow-orange
      pride:     'rgba(255,170,80,0.10)',   // warm orange
      curiosity: 'rgba(180,140,220,0.09)',  // soft purple
      calm:      'rgba(120,180,200,0.09)',  // cool teal
      struggle:  'rgba(200,150,170,0.08)'   // soft pink (gentle, not alarming)
    };
    return { mood: top, color: tints[top] || null, count: topN, total: recent.length };
  }

  // ── Accessory catalog (Phase 2p.22 / 2p.23) ──
  // Each accessory has an unlock keyed to an achievement id. The
  // achievement-detection useEffect grants the accessory the moment
  // its unlock fires (if companion has none). Ordered earliest-game
  // unlock first so the wizard\'s picker reads naturally.
  var ACCESSORY_DEFS = [
    { id: 'bow',    label: 'Bow',    emoji: '🎀', unlockAchievement: 'first-favorite',
      hint: 'Earned by marking your first favorite decoration.' },
    { id: 'flower', label: 'Flower', emoji: '🌸', unlockAchievement: 'first-reflection',
      hint: 'Earned by writing your first reflection.' },
    { id: 'scarf',  label: 'Scarf',  emoji: '🧣', unlockAchievement: 'streak-30',
      hint: 'Earned by reaching a 30-day streak.' },
    { id: 'crown',  label: 'Crown',  emoji: '👑', unlockAchievement: 'memory-palace-builder',
      hint: 'Earned by building 5 memory decks across your decorations.' }
  ];
  function isAccessoryUnlocked(state, accessoryId) {
    var def = null;
    for (var i = 0; i < ACCESSORY_DEFS.length; i++) {
      if (ACCESSORY_DEFS[i].id === accessoryId) { def = ACCESSORY_DEFS[i]; break; }
    }
    if (!def) return false;
    return !!((state.achievements || {})[def.unlockAchievement]);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 4.5: COMPANION CRITTERS + SKILL LEVELS (Phase 2p)
  // ─────────────────────────────────────────────────────────
  // A personalizable critter (cat / fox / owl / turtle / dragon) with
  // four color variants per species, free-text name, idle animations,
  // click-to-react, and state-aware thought bubbles. Plus four
  // skill-level tracks (Focus / Memory / Reflection / Storytelling)
  // derived from the existing earnings ledger — no new counters.
  //
  // Design rules:
  //   • Hand-built inline SVGs (not AI). Consistency, zero render cost.
  //   • Bubbles are observational, never guilt-inducing. No "I'm sad".
  //   • Skill levels are status, not currency: NO token bonus on level-up.
  //   • Reduced-motion already wraps via the existing @media block —
  //     all new keyframes auto-suppress.

  // Threshold ladder for skill levels — logarithmic-ish so lower levels
  // feel achievable, higher levels represent meaningful sustained
  // engagement. Level N requires THRESHOLDS[N] total events.
  var SKILL_THRESHOLDS = [0, 3, 8, 15, 25, 40, 60, 90, 130, 180];

  // Skill definitions. Each one says how to count from state.earnings.
  var SKILL_DEFS = [
    {
      id: 'focus',         emoji: '🍅',
      label: 'Focus',
      hint: 'Earn from completing Pomodoro sessions.',
      sources: ['pomodoro', 'cycle-bonus']
    },
    {
      id: 'memory',        emoji: '🧠',
      label: 'Memory',
      hint: 'Earn from quiz sessions you pass.',
      sources: ['memory-quiz', 'reflection-cloze-quiz']
    },
    {
      id: 'reflection',    emoji: '📝',
      label: 'Reflection',
      hint: 'Earn from journal entries.',
      sources: ['reflection']
    },
    {
      id: 'storytelling',  emoji: '📜',
      label: 'Storytelling',
      hint: 'Earn from creating + walking stories.',
      sources: ['story-walk', 'story-created']
    }
  ];

  function countSkillEvents(state, skillId) {
    var def = null;
    for (var i = 0; i < SKILL_DEFS.length; i++) {
      if (SKILL_DEFS[i].id === skillId) { def = SKILL_DEFS[i]; break; }
    }
    if (!def) return 0;
    var sources = def.sources;
    return (state.earnings || []).filter(function(e) {
      return sources.indexOf(e.source) !== -1;
    }).length;
  }

  // Tenure recap stats (Phase 2p.29) — pure aggregator over existing
  // state, returning everything the recap modal needs in one pass.
  // No side effects; safe to call any time. Returns null only if the
  // state is so empty that a recap would be meaningless.
  function computeTenureStats(state) {
    var earnings = state.earnings || [];
    var decorations = state.decorations || [];
    var journals = state.journalEntries || [];
    var stories = state.stories || [];
    var visits = state.visits || [];
    var achievements = state.achievements || {};
    var goals = state.goals || [];
    var companion = state.companion || null;

    if (earnings.length === 0 && decorations.length === 0 && journals.length === 0) {
      return null;
    }

    // Tenure span — earliest date across all timestamped data
    function ts(d) { return d ? new Date(d).getTime() : null; }
    var earliestMs = Infinity;
    earnings.forEach(function(e) { var t = ts(e.date); if (t && t < earliestMs) earliestMs = t; });
    decorations.forEach(function(d) { var t = ts(d.earnedAt); if (t && t < earliestMs) earliestMs = t; });
    journals.forEach(function(j) { var t = ts(j.date); if (t && t < earliestMs) earliestMs = t; });
    if (companion && companion.createdAt) {
      var ct = ts(companion.createdAt);
      if (ct && ct < earliestMs) earliestMs = ct;
    }
    if (earliestMs === Infinity) earliestMs = Date.now();
    var daysSince = Math.max(1, Math.ceil((Date.now() - earliestMs) / (24 * 60 * 60 * 1000)));

    // Tokens earned + spent (positives + negatives separately)
    var tokensEarned = 0, tokensSpent = 0;
    earnings.forEach(function(e) {
      var n = +e.tokens || 0;
      if (n > 0) tokensEarned += n;
      else tokensSpent += -n;
    });

    // Decoration breakdown
    var nonStarter = decorations.filter(function(d) { return !d.isStarter; });
    var customCount = nonStarter.filter(function(d) { return !!(d.isCustomUpload || d.isCustomDrawing); }).length;
    var favoriteCount = nonStarter.filter(function(d) { return !!d.isFavorite; }).length;
    var withReflection = nonStarter.filter(function(d) { return (d.studentReflection || '').trim().length > 0; }).length;
    var withMemoryContent = nonStarter.filter(function(d) { return !!(d.linkedContent && d.linkedContent.type); }).length;
    var withVoiceNote = nonStarter.filter(function(d) { return !!(d.voiceNote && d.voiceNote.base64); }).length;

    // Top moods
    var moodCounts = {};
    nonStarter.forEach(function(d) { if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1; });
    var moodList = Object.keys(moodCounts).map(function(k) {
      return { id: k, count: moodCounts[k], option: getMoodOption(k) };
    }).sort(function(a, b) { return b.count - a.count; });

    // Top subjects
    var subjectCounts = {};
    nonStarter.forEach(function(d) {
      (d.subjects || []).forEach(function(s) { subjectCounts[s] = (subjectCounts[s] || 0) + 1; });
    });
    var subjectList = Object.keys(subjectCounts).map(function(k) {
      return { id: k, count: subjectCounts[k], tag: getSubjectTag(k) };
    }).sort(function(a, b) { return b.count - a.count; });

    // Skill levels
    var skills = SKILL_DEFS.map(function(def) {
      var count = countSkillEvents(state, def.id);
      var lvl = computeSkillLevel(count);
      return { def: def, count: count, level: lvl.level, atMax: lvl.atMax };
    });

    // Achievement count
    var unlockedCount = Object.keys(achievements).length;
    var totalAchievements = (typeof ACHIEVEMENT_CATALOG !== 'undefined') ? ACHIEVEMENT_CATALOG.length : unlockedCount;

    // Streak
    var streak = computeStreak(visits);

    // Words written across journal entries
    var totalWords = 0;
    journals.forEach(function(j) {
      var t = (j.text || '').trim();
      if (t.length > 0) totalWords += t.split(/\s+/).length;
    });

    // Story walks completed
    var storiesWalked = 0;
    stories.forEach(function(s) { storiesWalked += (s.walkCount || 0); });

    // Goals completed
    var goalsDone = goals.filter(function(g) { return !!g.completedAt; }).length;

    return {
      daysSince: daysSince,
      earliestMs: earliestMs,
      tokensEarned: tokensEarned,
      tokensSpent: tokensSpent,
      decorationCount: nonStarter.length,
      customCount: customCount,
      favoriteCount: favoriteCount,
      withReflection: withReflection,
      withMemoryContent: withMemoryContent,
      withVoiceNote: withVoiceNote,
      topMoods: moodList,
      topSubjects: subjectList,
      skills: skills,
      unlockedAchievements: unlockedCount,
      totalAchievements: totalAchievements,
      streakLongest: streak.longest,
      streakCurrent: streak.current,
      visitDays: visits.length > 0 ? Object.keys(visits.reduce(function(acc, v) { if (v) acc[v] = 1; return acc; }, {})).length : 0,
      journalCount: journals.length,
      totalWords: totalWords,
      storyCount: stories.length,
      storiesWalked: storiesWalked,
      goalsDone: goalsDone,
      goalsTotal: goals.length,
      companion: companion
    };
  }

  // Returns { level, current, nextThreshold, pct, atMax }.
  // pct is progress toward the NEXT level (0–100).
  function computeSkillLevel(count) {
    var lvl = 0;
    for (var i = 0; i < SKILL_THRESHOLDS.length; i++) {
      if (count >= SKILL_THRESHOLDS[i]) lvl = i;
    }
    var atMax = lvl >= SKILL_THRESHOLDS.length - 1;
    var floor = SKILL_THRESHOLDS[lvl];
    var ceil = atMax ? floor : SKILL_THRESHOLDS[lvl + 1];
    var span = atMax ? 1 : (ceil - floor);
    var into = count - floor;
    var pct = atMax ? 100 : Math.min(100, Math.round((into / span) * 100));
    return {
      level: lvl, current: count,
      nextThreshold: atMax ? null : ceil,
      pct: pct,
      atMax: atMax
    };
  }

  // Companion species metadata. Each species has a distinct voice prefix
  // pattern that flavors the same observation.
  var COMPANION_SPECIES = [
    {
      id: 'cat',     emoji: '🐱', label: 'Cat',
      blurb: 'Calm and observant. Notices things others miss.',
      voicePrefix: 'Hmm. ',
      affirm: 'You did well.'
    },
    {
      id: 'fox',     emoji: '🦊', label: 'Fox',
      blurb: 'Curious and clever. Always asking what if.',
      voicePrefix: 'What if you ',
      affirm: 'Clever, very clever.'
    },
    {
      id: 'owl',     emoji: '🦉', label: 'Owl',
      blurb: 'Wise and deliberate. Likes steady study.',
      voicePrefix: 'Considering... ',
      affirm: 'Thoughtful work.'
    },
    {
      id: 'turtle',  emoji: '🐢', label: 'Turtle',
      blurb: 'Patient and gentle. Step by step is the way.',
      voicePrefix: 'Step by step — ',
      affirm: 'Slow is steady.'
    },
    {
      id: 'dragon',  emoji: '🐉', label: 'Baby dragon',
      blurb: 'Enthusiastic and imaginative. Adventures await.',
      voicePrefix: 'Whoa! ',
      affirm: 'Epic move!'
    }
  ];
  function getCompanionSpecies(id) {
    for (var i = 0; i < COMPANION_SPECIES.length; i++) {
      if (COMPANION_SPECIES[i].id === id) return COMPANION_SPECIES[i];
    }
    return null;
  }

  // 4 color variants × 5 species = 20 hand-tuned trios. Each trio is
  // { primary, secondary, accent } — primary = main body, secondary =
  // belly/inner ear/wing, accent = stripes/eyes/tail-tip.
  // Tuned to look acceptable across all 5 AlloHaven theme bases.
  var COMPANION_PALETTES = {
    cat: {
      warm:   { primary: '#a86a3d', secondary: '#f4d4b0', accent: '#3d2418' },
      cool:   { primary: '#6a8a9a', secondary: '#cfdde6', accent: '#2a3a4a' },
      pastel: { primary: '#f4cdd6', secondary: '#fff0f4', accent: '#a36876' },
      dark:   { primary: '#2a2a2a', secondary: '#5a5a5a', accent: '#fbbf24' }
    },
    fox: {
      warm:   { primary: '#d4732a', secondary: '#fff5e6', accent: '#3d2418' },
      cool:   { primary: '#7a9aaa', secondary: '#dfe9f0', accent: '#1a2a3a' },
      pastel: { primary: '#f0a888', secondary: '#fff0e8', accent: '#8a4838' },
      dark:   { primary: '#3a2418', secondary: '#7a5a3a', accent: '#f4d4b0' }
    },
    owl: {
      warm:   { primary: '#8a5a3a', secondary: '#d4a878', accent: '#fbbf24' },
      cool:   { primary: '#5a6a7a', secondary: '#a0b0c0', accent: '#e8c878' },
      pastel: { primary: '#c8a098', secondary: '#f0d8d0', accent: '#f4b04a' },
      dark:   { primary: '#1a1a2a', secondary: '#4a4a6a', accent: '#fbbf24' }
    },
    turtle: {
      warm:   { primary: '#6a8a3a', secondary: '#a4c068', accent: '#8a5a2a' },
      cool:   { primary: '#3a7a8a', secondary: '#7aa8b8', accent: '#1a4858' },
      pastel: { primary: '#a8d4a8', secondary: '#d8eed8', accent: '#5a8a5a' },
      dark:   { primary: '#1a3a2a', secondary: '#3a5a4a', accent: '#88c878' }
    },
    dragon: {
      warm:   { primary: '#d4583a', secondary: '#f8c0a8', accent: '#3a1818' },
      cool:   { primary: '#5a7aaa', secondary: '#a0c0e0', accent: '#1a2a4a' },
      pastel: { primary: '#d8b8e8', secondary: '#f0e0f8', accent: '#7a4a8a' },
      dark:   { primary: '#2a1a3a', secondary: '#5a3a6a', accent: '#fbbf24' }
    }
  };
  function getCompanionPalette(speciesId, variantId) {
    var sp = COMPANION_PALETTES[speciesId];
    if (!sp) return { primary: '#888', secondary: '#ccc', accent: '#444' };
    return sp[variantId] || sp.warm;
  }
  var COMPANION_VARIANTS = [
    { id: 'warm',   label: 'Warm' },
    { id: 'cool',   label: 'Cool' },
    { id: 'pastel', label: 'Pastel' },
    { id: 'dark',   label: 'Dark' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 4.6: ACHIEVEMENT MILESTONES (Phase 2p.5)
  // ─────────────────────────────────────────────────────────
  // Gentle progression markers — no streaks, no daily punishment, no
  // comparisons. Unlocked transparently as students do the actions
  // they were already doing. Each `check(state)` returns true when the
  // achievement is currently earned. Once unlocked, persists in
  // state.achievements[id] = { unlockedAt: ISO } and never re-locks.
  var ACHIEVEMENT_CATALOG = [
    // First-time markers (fire fast, encourage exploration)
    { id: 'first-decoration', emoji: '🌱', label: 'First decoration',
      desc: 'Placed your first decoration in the room.',
      check: function(s) { return (s.decorations || []).some(function(d) { return !d.isStarter; }); } },
    { id: 'first-reflection', emoji: '📝', label: 'First reflection',
      desc: 'Wrote your first journal entry.',
      check: function(s) { return (s.journalEntries || []).length >= 1; } },
    { id: 'first-pomodoro', emoji: '🍅', label: 'First Pomodoro',
      desc: 'Completed your first focus session.',
      check: function(s) { return (s.earnings || []).some(function(e) { return e.source === 'pomodoro' || e.source === 'cycle-bonus'; }); } },
    { id: 'first-quiz-passed', emoji: '✓', label: 'First quiz passed',
      desc: 'Scored ≥80% on a memory deck.',
      check: function(s) { return (s.earnings || []).some(function(e) { return e.source === 'memory-quiz' || e.source === 'reflection-cloze-quiz'; }); } },
    { id: 'first-story', emoji: '📜', label: 'First story',
      desc: 'Created a story with at least 3 steps.',
      check: function(s) {
        return (s.stories || []).some(function(st) {
          var v = (st.steps || []).filter(function(stp) { return stp.decorationId && (stp.narrative || '').trim().length > 0; });
          return v.length >= 3 && (st.title || '').trim().length > 0;
        });
      } },
    { id: 'first-walk', emoji: '🚶', label: 'First story walk',
      desc: 'Walked through a complete story.',
      check: function(s) { return (s.earnings || []).some(function(e) { return e.source === 'story-walk'; }); } },
    { id: 'first-image-link', emoji: '🔗', label: 'First image link',
      desc: 'Linked two decorations with a personal association.',
      check: function(s) { return (s.decorations || []).some(function(d) { return d.linkedContent && d.linkedContent.type === 'image-link'; }); } },
    { id: 'first-goal-completed', emoji: '🎯', label: 'First goal completed',
      desc: 'Hit a target you set for yourself.',
      check: function(s) { return (s.goals || []).some(function(g) { return !!g.completedAt; }); } },
    { id: 'first-companion', emoji: '🌿', label: 'Met your buddy',
      desc: 'Created your AlloHaven companion.',
      check: function(s) { return s.companion && s.companion.species; } },
    { id: 'first-mood-tag', emoji: '🎭', label: 'First mood tag',
      desc: 'Tagged a decoration with how you felt.',
      check: function(s) { return (s.decorations || []).some(function(d) { return !!d.mood; }); } },

    // Volume markers (slower-burn, signal sustained engagement)
    { id: 'ten-decorations', emoji: '🌷', label: '10 decorations',
      desc: 'Filled out a substantial part of your room.',
      check: function(s) { return (s.decorations || []).filter(function(d) { return !d.isStarter; }).length >= 10; } },
    { id: 'thirty-cards-quizzed', emoji: '🧠', label: '30 cards quizzed',
      desc: 'Real retrieval reps add up.',
      check: function(s) {
        var total = 0;
        (s.decorations || []).forEach(function(d) {
          if (!d.linkedContent || d.linkedContent.type !== 'flashcards') return;
          var cards = (d.linkedContent.data && d.linkedContent.data.cards) || [];
          cards.forEach(function(c) {
            total += (c.correctCount || 0) + (c.missCount || 0);
          });
        });
        return total >= 30;
      } },
    { id: 'hundred-cards-quizzed', emoji: '🦉', label: '100 cards quizzed',
      desc: 'Triple-digit retrieval. Memory shapes itself this way.',
      check: function(s) {
        var total = 0;
        (s.decorations || []).forEach(function(d) {
          if (!d.linkedContent || d.linkedContent.type !== 'flashcards') return;
          var cards = (d.linkedContent.data && d.linkedContent.data.cards) || [];
          cards.forEach(function(c) {
            total += (c.correctCount || 0) + (c.missCount || 0);
          });
        });
        return total >= 100;
      } },
    { id: 'five-walks', emoji: '👣', label: '5 story walks',
      desc: 'Method of loci, repeated. The room is your mind.',
      check: function(s) {
        return (s.earnings || []).filter(function(e) { return e.source === 'story-walk'; }).length >= 5;
      } },
    { id: 'ten-reflections', emoji: '📓', label: '10 reflections',
      desc: 'A real journal grows here.',
      check: function(s) { return (s.journalEntries || []).length >= 10; } },
    { id: 'pomodoro-cycle', emoji: '🍅', label: 'Full Pomodoro cycle',
      desc: 'Completed all 4 focus sessions in a single cycle.',
      check: function(s) { return (s.earnings || []).some(function(e) { return e.source === 'cycle-bonus'; }); } },

    // Diversity markers (encourage exploring all parts of the tool)
    { id: 'all-memory-types', emoji: '🌈', label: 'All memory types',
      desc: 'Used flashcards, acronym, notes, AND image-link at least once.',
      check: function(s) {
        var types = {};
        (s.decorations || []).forEach(function(d) {
          if (d.linkedContent) types[d.linkedContent.type] = true;
        });
        return types.flashcards && types.acronym && types.notes && types['image-link'];
      } },
    { id: 'all-mood-tags', emoji: '🎨', label: 'All five moods',
      desc: 'Tagged decorations with each of the 5 moods.',
      check: function(s) {
        var moods = {};
        (s.decorations || []).forEach(function(d) {
          if (d.mood) moods[d.mood] = true;
        });
        return Object.keys(moods).length >= 5;
      } },
    { id: 'cloze-author', emoji: '✏️', label: 'Cloze author',
      desc: 'Created a fill-in-blank in notes, reflection, or story.',
      check: function(s) {
        var inNotes = (s.decorations || []).some(function(d) {
          return d.linkedContent && d.linkedContent.type === 'notes' && hasClozeMarkers(d.linkedContent);
        });
        if (inNotes) return true;
        var inJournal = (s.journalEntries || []).some(function(e) {
          return extractClozeAnswers(e.text || '').length > 0;
        });
        if (inJournal) return true;
        return (s.stories || []).some(function(st) {
          return (st.steps || []).some(function(stp) {
            return extractClozeAnswers(stp.narrative || '').length > 0;
          });
        });
      } },
    { id: 'memory-palace-builder', emoji: '🏛️', label: 'Memory palace builder',
      desc: 'Attached memory content to 5 different decorations.',
      check: function(s) {
        return (s.decorations || []).filter(function(d) { return !!d.linkedContent; }).length >= 5;
      } },

    // Time-based markers (gentle, no streak punishment)
    { id: 'companion-week', emoji: '🗓️', label: 'A week with your buddy',
      desc: 'Your companion has been with you 7+ days.',
      check: function(s) {
        if (!s.companion || !s.companion.createdAt) return false;
        var days = (Date.now() - new Date(s.companion.createdAt).getTime()) / (24 * 60 * 60 * 1000);
        return days >= 7;
      } },
    { id: 'companion-month', emoji: '🌙', label: 'A month with your buddy',
      desc: 'Your companion has been with you 30+ days.',
      check: function(s) {
        if (!s.companion || !s.companion.createdAt) return false;
        var days = (Date.now() - new Date(s.companion.createdAt).getTime()) / (24 * 60 * 60 * 1000);
        return days >= 30;
      } },

    // Skill-tier markers
    { id: 'focus-l3', emoji: '🍅', label: 'Focus level 3',
      desc: 'Built up real focus practice.',
      check: function(s) { return computeSkillLevel(countSkillEvents(s, 'focus')).level >= 3; } },
    { id: 'memory-l3', emoji: '🧠', label: 'Memory level 3',
      desc: 'Real retrieval reps logged.',
      check: function(s) { return computeSkillLevel(countSkillEvents(s, 'memory')).level >= 3; } },

    // Streak markers — current OR longest based on the achievement\'s
    // intent. "First N-day streak" achievements use longest so they
    // remain unlocked once earned, never re-locking if a day is missed.
    { id: 'streak-3', emoji: '🌿', label: '3 days in a row',
      desc: 'Showed up three days running.',
      check: function(s) { return computeStreak(s.visits || []).longest >= 3; } },
    { id: 'streak-7', emoji: '🌳', label: 'A week in a row',
      desc: 'Seven straight days. Habits build like this.',
      check: function(s) { return computeStreak(s.visits || []).longest >= 7; } },
    { id: 'streak-30', emoji: '🌲', label: 'Thirty days in a row',
      desc: 'A month-long stretch. Rare and quietly remarkable.',
      check: function(s) { return computeStreak(s.visits || []).longest >= 30; } },

    { id: 'first-favorite', emoji: '⭐', label: 'First favorite',
      desc: 'Marked a decoration as a favorite — claimed your taste.',
      check: function(s) { return (s.decorations || []).some(function(d) { return !!d.isFavorite; }); } },
    { id: 'first-voice-note', emoji: '🎤', label: 'First voice note',
      desc: 'Recorded a voice note on a decoration — your words, your voice.',
      check: function(s) { return (s.decorations || []).some(function(d) { return !!(d.voiceNote && d.voiceNote.base64); }); } },
    { id: 'first-treat', emoji: '🍪', label: 'First treat',
      desc: 'Gave your buddy a treat. Daily care goes a long way.',
      check: function(s) { return !!(s.companion && s.companion.lastTreatAt); } },
    { id: 'first-custom-upload', emoji: '📎', label: 'First custom upload',
      desc: 'Uploaded your own image — your work, your room.',
      check: function(s) { return (s.decorations || []).some(function(d) { return !!d.isCustomUpload; }); } },
    { id: 'first-drawing', emoji: '🎨', label: 'First drawing',
      desc: 'Drew your own decoration on the canvas — pure you.',
      check: function(s) { return (s.decorations || []).some(function(d) { return !!d.isCustomDrawing; }); } },
    { id: 'first-phrase', emoji: '🗣️', label: 'First taught phrase',
      desc: 'Taught your companion a personal phrase — your voice through theirs.',
      check: function(s) { return !!(s.companion && Array.isArray(s.companion.customPhrases) && s.companion.customPhrases.length > 0); } },

    // Room-unlock achievements (Phase 2p.13)
    { id: 'garden-unlocked', emoji: '🌳', label: 'Garden unlocked',
      desc: 'A quiet outdoor corner of your room.',
      check: function(s) {
        var g = (s.rooms || []).filter(function(r) { return r.id === 'garden'; })[0];
        return !!(g && g.unlocked);
      } },
    { id: 'library-unlocked', emoji: '📚', label: 'Library unlocked',
      desc: 'A focused study room — earned by quizzing yourself.',
      check: function(s) {
        var l = (s.rooms || []).filter(function(r) { return r.id === 'library'; })[0];
        return !!(l && l.unlocked);
      } },
    { id: 'studio-unlocked', emoji: '🎨', label: 'Studio unlocked',
      desc: 'A wide creative space — earned by making things.',
      check: function(s) {
        var st = (s.rooms || []).filter(function(r) { return r.id === 'studio'; })[0];
        return !!(st && st.unlocked);
      } }
  ];

  function getAchievement(id) {
    for (var i = 0; i < ACHIEVEMENT_CATALOG.length; i++) {
      if (ACHIEVEMENT_CATALOG[i].id === id) return ACHIEVEMENT_CATALOG[i];
    }
    return null;
  }

  // ── Per-card mastery (Phase 2d) ──
  // Smart shuffle: weights cards by weakness so struggling ones come
  // up first in the deck order, while still maintaining randomness.
  // Cards never quizzed get the average weight (so new cards mix
  // naturally). Pure-random shuffle for fresh decks.
  //
  // Weakness score per card:
  //   no attempts: 1.0 (treated as average — neither prioritized nor demoted)
  //   has attempts: missCount / (correctCount + missCount), in [0, 1]
  //
  // Then we do a weighted Fisher-Yates: each draw picks proportional
  // to (weakness + 0.3) — the +0.3 floor ensures every card gets a
  // shot, even mastered ones, so re-quizzing a deck cleanly stays
  // possible (no cards stuck behind weakness=0).
  function cardWeaknessScore(card) {
    var c = card.correctCount || 0;
    var m = card.missCount || 0;
    var total = c + m;
    if (total === 0) return 1.0; // unseen cards = average
    return m / total;
  }

  function smartShuffleCards(cards) {
    if (!cards || cards.length <= 1) return cards.slice();
    var pool = cards.slice();
    var result = [];
    while (pool.length > 0) {
      // Compute weights with the +0.3 floor
      var weights = pool.map(function(c) { return cardWeaknessScore(c) + 0.3; });
      var totalWeight = weights.reduce(function(s, w) { return s + w; }, 0);
      var roll = Math.random() * totalWeight;
      var pickIdx = 0;
      var cumulative = 0;
      for (var i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (roll <= cumulative) { pickIdx = i; break; }
      }
      result.push(pool[pickIdx]);
      pool.splice(pickIdx, 1);
    }
    return result;
  }

  // Mastery bucket (display label + emoji) for a card based on its
  // accumulated stats. Three buckets matching the broader system's
  // mental model:
  //   green:  ≥80% correct AND ≥3 attempts (locked in)
  //   yellow: any data with <80% correct, OR <3 attempts (still developing)
  //   red:    ≥3 attempts and <40% correct (struggling)
  //   gray:   no attempts yet (unknown — neutral)
  function cardMasteryBucket(card) {
    var c = card.correctCount || 0;
    var m = card.missCount || 0;
    var total = c + m;
    if (total === 0) return { id: 'gray', label: 'unseen', emoji: '⚪' };
    var pct = c / total;
    if (total >= 3 && pct < 0.4) return { id: 'red', label: 'needs work', emoji: '🔴' };
    if (total >= 3 && pct >= 0.8) return { id: 'green', label: 'mastered', emoji: '🟢' };
    return { id: 'yellow', label: 'wobbly', emoji: '🟡' };
  }

  // Days remaining until a decoration's content becomes due. Used
  // for the "due-soon" warm-color indicator (1-2 days before due).
  // Returns null if not quizzable / never-reviewed paths handled by
  // isMemoryDue() instead.
  function daysUntilDue(decoration) {
    var lc = decoration.linkedContent;
    if (!lc) return null;
    if (lc.type === 'notes' && !hasClozeMarkers(lc)) return null;
    if (!lc.lastReviewedAt) return null; // already due (handled separately)
    var lastMs = new Date(lc.lastReviewedAt).getTime();
    var ageMs = Date.now() - lastMs;
    var bestScore = lc.bestQuizScore || 0;
    var thresholdDays;
    if (bestScore < 60)      thresholdDays = 2;
    else if (bestScore < 90) thresholdDays = 5;
    else                     thresholdDays = 10;
    var thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    if (ageMs >= thresholdMs) return 0; // already due
    return Math.ceil((thresholdMs - ageMs) / (24 * 60 * 60 * 1000));
  }

  function isMemoryDueSoon(decoration) {
    var days = daysUntilDue(decoration);
    return days !== null && days > 0 && days <= 2;
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

  // ── Pomodoro completion chime (Phase 2p.20) ──
  // Synthesizes a gentle 3-tone bell via Web Audio. No external assets.
  // Each tone is a sine wave with exponential decay. Tones overlap
  // slightly for a soft chord. Total duration ~2.4s.
  function playPomodoroChime() {
    if (typeof window === 'undefined') return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      var actx = new Ctx();
      // C5, E5, G5 (C major triad). Pleasant, calming, anchored.
      var freqs = [523.25, 659.25, 783.99];
      var startDelay = 0;
      freqs.forEach(function(f, i) {
        var osc = actx.createOscillator();
        var gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        var t0 = actx.currentTime + startDelay;
        // Soft attack + long exponential decay
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.18, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(t0);
        osc.stop(t0 + 1.7);
        startDelay += 0.18; // small stagger between tones
      });
      // Close context after the longest tone finishes (cleanup)
      setTimeout(function() {
        try { actx.close(); } catch (e) { /* ignore */ }
      }, 2500);
    } catch (e) { /* silent — Web Audio sometimes blocked, no harm */ }
  }

  // ── Smart deck import (Phase 2p.21) ──
  // Parses pasted text into { front, back } pairs. Auto-detects the
  // separator: prefers ": " or "—" (em dash), falls back to tab, then
  // comma, then a single space pivot. Skips blank/comment lines.
  // Returns { pairs, format } where format is the detected separator.
  function parseDeckText(raw) {
    if (!raw || typeof raw !== 'string') return { pairs: [], format: null };
    var lines = raw.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(l) {
      return l.length > 0 && l.charAt(0) !== '#'; // ignore comment lines starting with #
    });
    if (lines.length === 0) return { pairs: [], format: null };
    // Score each candidate separator by how many lines split into 2 parts
    var candidates = [
      { sep: ' — ', label: 'em-dash' },
      { sep: ' - ', label: 'hyphen-spaced' },
      { sep: ': ',  label: 'colon-space' },
      { sep: '\t',  label: 'tab' },
      { sep: ' = ', label: 'equals-spaced' },
      { sep: ',',   label: 'comma' },
      { sep: ':',   label: 'colon' }
    ];
    var best = null, bestScore = -1;
    candidates.forEach(function(c) {
      var split = lines.map(function(l) { return l.split(c.sep); });
      var score = split.filter(function(s) { return s.length === 2 && s[0].trim() && s[1].trim(); }).length;
      // Prefer separators that work for MOST lines, with a small bonus
      // for explicit separators over comma (which often appears within
      // a definition).
      var weighted = score - (c.sep === ',' ? 0.3 * lines.length : 0);
      if (weighted > bestScore) { bestScore = weighted; best = c; }
    });
    if (!best || bestScore < lines.length * 0.5) {
      // Fall back to first-space pivot (single-word terms)
      var pairs = lines.map(function(l) {
        var firstSpace = l.indexOf(' ');
        if (firstSpace === -1) return null;
        return { front: l.slice(0, firstSpace).trim(), back: l.slice(firstSpace + 1).trim() };
      }).filter(function(p) { return p && p.front && p.back; });
      return { pairs: pairs, format: 'first-space' };
    }
    var sep = best.sep;
    var resultPairs = lines.map(function(l) {
      var idx = l.indexOf(sep);
      if (idx === -1) return null;
      var front = l.slice(0, idx).trim();
      var back = l.slice(idx + sep.length).trim();
      if (!front || !back) return null;
      return { front: front, back: back };
    }).filter(function(p) { return !!p; });
    return { pairs: resultPairs, format: best.label };
  }

  // ── Custom upload compression (Phase 2p.19) ──
  // Reads a File via FileReader, downscales to a max edge of 256px on
  // a canvas, returns a JPEG data URI ~50-80KB. Keeps localStorage
  // budget reasonable across many uploads. Returns a Promise.
  function compressUploadedImage(file, maxEdge, qualityArg) {
    var maxE = maxEdge || 256;
    var quality = qualityArg || 0.82;
    return new Promise(function(resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        return reject(new Error('Not an image file'));
      }
      var reader = new FileReader();
      reader.onerror = function() { reject(new Error('Could not read file')); };
      reader.onload = function() {
        var img = new Image();
        img.onerror = function() { reject(new Error('Could not decode image')); };
        img.onload = function() {
          try {
            var w = img.naturalWidth, hh = img.naturalHeight;
            if (!w || !hh) return reject(new Error('Invalid image dimensions'));
            // Scale to max edge, preserving aspect ratio
            var scale = Math.min(1, maxE / Math.max(w, hh));
            var dw = Math.round(w * scale);
            var dh = Math.round(hh * scale);
            var canvas = document.createElement('canvas');
            canvas.width = dw;
            canvas.height = dh;
            var ctx = canvas.getContext('2d');
            // White background helps JPEG compression on transparent PNGs
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, dw, dh);
            ctx.drawImage(img, 0, 0, dw, dh);
            var dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({
              base64: dataUrl,
              width: dw, height: dh,
              originalWidth: w, originalHeight: hh
            });
          } catch (e) { reject(e); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function getStarterFernDataUri() {
    return 'data:image/svg+xml;base64,' + (typeof btoa !== 'undefined' ? btoa(STARTER_FERN_SVG) : '');
  }

  // ── Companion SVG generators (Phase 2p) ──
  // Each species returns a React element tree (NOT a data URI string)
  // because we need DOM-targetable groups for animation:
  //   .ah-companion-body   → breathes (gentle scale)
  //   .ah-companion-eyelid → blinks  (random 4-7s)
  //   .ah-companion-tail   → flicks (species-varied 4-9s)
  //   .ah-companion-root   → bobs   (gentle 5.5s y-translate)
  //   .ah-companion-react  → applied on click for 600ms (excited bounce)
  //
  // ViewBox 0 0 100 100. Built from <ellipse> / <circle> / <path>
  // primitives so each part is independently fillable + groupable.
  // Color palette via direct fill props so a theme switch is just a
  // re-render (no CSS-variable indirection needed).
  function getCompanionSvg(speciesId, palette, animState) {
    var React = window.React;
    var h = React.createElement;
    var p = palette || { primary: '#888', secondary: '#ccc', accent: '#444' };
    var blinking = animState && animState.blinking;
    var sleeping = animState && animState.sleeping;
    // Pupil offset (cursor tracking) — clamped to ±2 viewBox units so
    // pupils move within the eye sclera. Caller passes { x: -1..1, y: -1..1 }
    // representing normalized cursor offset from companion center.
    // When sleeping, pupil tracking is forced to zero (eyes are closed).
    var pupilOffset = (animState && animState.pupilOffset) || { x: 0, y: 0 };
    var px = sleeping ? 0 : Math.max(-2, Math.min(2, (pupilOffset.x || 0) * 2));
    var py = sleeping ? 0 : Math.max(-2, Math.min(2, (pupilOffset.y || 0) * 2));
    // Eyelid is shut continuously when sleeping; otherwise toggled by blink.
    var eyelidOpacity = (sleeping || blinking) ? 1 : 0;
    var commonRoot = {
      viewBox: '0 0 100 100',
      width: '100%', height: '100%',
      style: { display: 'block', overflow: 'visible' },
      'aria-hidden': 'true'
    };
    // Pupil-tracking transform applied to a wrapping <g> around eye details
    var pupilTransform = 'translate(' + px.toFixed(2) + ' ' + py.toFixed(2) + ')';
    var pupilStyle = { transform: pupilTransform, transition: 'transform 220ms cubic-bezier(0.34, 1.4, 0.64, 1)' };

    // Accessory rendering (Phase 2p.22, extended 2p.23) — bow / flower /
    // scarf with per-species positioning. All use palette.accent so they
    // pop against the body color.
    var accessory = animState && animState.accessory;
    function bowAt(cx, cy, scale) {
      // Two triangle "wings" + center knot. cx,cy is the center of the knot.
      var s = scale || 1;
      var w = 6 * s, h2 = 4 * s;
      return h('g', {
        className: 'ah-companion-accessory',
        style: { transformOrigin: cx + 'px ' + cy + 'px' }
      },
        // Left wing
        h('path', {
          d: 'M ' + cx + ' ' + cy + ' L ' + (cx - w) + ' ' + (cy - h2) + ' L ' + (cx - w) + ' ' + (cy + h2) + ' Z',
          fill: p.accent
        }),
        // Right wing
        h('path', {
          d: 'M ' + cx + ' ' + cy + ' L ' + (cx + w) + ' ' + (cy - h2) + ' L ' + (cx + w) + ' ' + (cy + h2) + ' Z',
          fill: p.accent
        }),
        // Center knot
        h('ellipse', { cx: cx, cy: cy, rx: 1.6 * s, ry: 2.2 * s, fill: p.primary }),
        // Tiny highlight on the wings for dimension
        h('ellipse', { cx: cx - w * 0.55, cy: cy - h2 * 0.3, rx: 0.8 * s, ry: 1.2 * s, fill: p.secondary, opacity: 0.5 }),
        h('ellipse', { cx: cx + w * 0.55, cy: cy - h2 * 0.3, rx: 0.8 * s, ry: 1.2 * s, fill: p.secondary, opacity: 0.5 })
      );
    }
    function flowerAt(cx, cy, scale) {
      // 5-petal rosette: 5 ellipses arranged at 72° increments + center disc
      var s = scale || 1;
      var r = 3 * s;             // petal radius (long)
      var rd = 1.6 * s;          // petal radius (short)
      var dist = 3.2 * s;        // distance from center to petal center
      var petals = [];
      for (var i = 0; i < 5; i++) {
        var theta = (i / 5) * Math.PI * 2 - Math.PI / 2;
        var px2 = cx + Math.cos(theta) * dist;
        var py2 = cy + Math.sin(theta) * dist;
        var rotDeg = (theta * 180 / Math.PI) + 90; // align petal long axis radially
        petals.push(h('ellipse', {
          key: 'petal-' + i,
          cx: px2, cy: py2, rx: rd, ry: r,
          fill: p.accent,
          transform: 'rotate(' + rotDeg.toFixed(2) + ' ' + px2.toFixed(2) + ' ' + py2.toFixed(2) + ')'
        }));
      }
      return h('g', {
        className: 'ah-companion-accessory',
        style: { transformOrigin: cx + 'px ' + cy + 'px' }
      },
        petals,
        // Center disc (warm tone, picks up secondary palette)
        h('circle', { cx: cx, cy: cy, r: 1.4 * s, fill: p.secondary }),
        h('circle', { cx: cx, cy: cy, r: 0.7 * s, fill: p.primary, opacity: 0.6 })
      );
    }
    function crownAt(cx, cy, scale) {
      // A simple 5-point gold crown with a banded base + soft jewels.
      // Sits on top of the head; cx,cy is the centerpoint of the band.
      var s = scale || 1;
      var w = 14 * s;
      var bandH = 3 * s;
      var pointH = 7 * s;
      var bandTop = cy - bandH / 2;
      var pointBaseY = bandTop;
      // 5 triangular points across the top
      var points = [];
      for (var i = 0; i <= 4; i++) {
        var px = cx - w + (i * w / 2);
        if (i % 2 === 0) {
          // tall point
          points.push(px + ',' + (pointBaseY - pointH));
        } else {
          // valley between points (slight dip)
          points.push(px + ',' + (pointBaseY - 1.5 * s));
        }
      }
      var polyPoints = (cx - w) + ',' + bandTop + ' '
        + points.join(' ') + ' '
        + (cx + w) + ',' + bandTop;
      return h('g', {
        className: 'ah-companion-accessory',
        style: { transformOrigin: cx + 'px ' + cy + 'px' }
      },
        // Crown body (points + band)
        h('polygon', {
          points: polyPoints,
          fill: '#f6c84a', stroke: '#b88a1c', strokeWidth: 0.8 * s
        }),
        // Band base
        h('rect', {
          x: cx - w, y: bandTop, width: 2 * w, height: bandH,
          fill: '#e0a91e', stroke: '#b88a1c', strokeWidth: 0.6 * s
        }),
        // Three small jewel circles on the band
        h('circle', { cx: cx - w * 0.5, cy: cy, r: 1.4 * s, fill: '#dc2626' }),
        h('circle', { cx: cx,           cy: cy, r: 1.6 * s, fill: '#3b82f6' }),
        h('circle', { cx: cx + w * 0.5, cy: cy, r: 1.4 * s, fill: '#16a34a' }),
        // Highlight on the center point (shine)
        h('polygon', {
          points: cx + ',' + (pointBaseY - pointH) + ' '
                + (cx - 1 * s) + ',' + (pointBaseY - 1.5 * s) + ' '
                + (cx + 1 * s) + ',' + (pointBaseY - 1.5 * s),
          fill: '#fff7d6', opacity: 0.6
        })
      );
    }

    function scarfAt(cx, cy, width, scale) {
      // A horizontal arc-band wrapping near the neck/body. width is the
      // half-width of the band; cx,cy is its center point.
      var s = scale || 1;
      var w = width * s;
      var hh = 4 * s;
      var hangX = cx + w * 0.7;
      var hangY = cy + hh * 0.6;
      return h('g', {
        className: 'ah-companion-accessory',
        style: { transformOrigin: cx + 'px ' + cy + 'px' }
      },
        // Main wrap — slightly curved bar
        h('path', {
          d: 'M ' + (cx - w) + ' ' + cy
            + ' Q ' + cx + ' ' + (cy + hh * 0.6) + ' '
            + (cx + w) + ' ' + cy
            + ' L ' + (cx + w) + ' ' + (cy - hh)
            + ' Q ' + cx + ' ' + (cy - hh * 0.4) + ' '
            + (cx - w) + ' ' + (cy - hh) + ' Z',
          fill: p.accent
        }),
        // Tassel hanging on one side
        h('rect', {
          x: hangX - 1.2 * s, y: hangY,
          width: 2.4 * s, height: 5 * s,
          fill: p.accent
        }),
        h('rect', {
          x: hangX - 1.2 * s, y: hangY + 5 * s,
          width: 2.4 * s, height: 1.2 * s,
          fill: p.secondary, opacity: 0.6
        }),
        // Lighter stripe along the wrap for dimension
        h('path', {
          d: 'M ' + (cx - w * 0.85) + ' ' + (cy - hh * 0.3)
            + ' Q ' + cx + ' ' + (cy + hh * 0.05) + ' '
            + (cx + w * 0.85) + ' ' + (cy - hh * 0.3),
          stroke: p.secondary, strokeWidth: 0.8 * s, fill: 'none', opacity: 0.5
        })
      );
    }

    // Per-species accessory positions. Each species has a different
    // anchor point that suits its silhouette.
    var ACC_POS = {
      bow: {
        cat:    [38, 22, 0.85], // off-center, between left ear and head
        fox:    [50, 18, 0.9],  // between the tall triangle ears
        owl:    [50, 22, 1.0],  // top of head, between tufted ears
        turtle: [18, 50, 0.8],  // small, on top of the green head (left-side)
        dragon: [50, 22, 0.9]   // between horns
      },
      flower: {
        cat:    [60, 24, 0.9],  // mirror side of bow position
        fox:    [38, 22, 0.85], // off to the side of the ears
        owl:    [38, 30, 0.9],  // tucked beside the eye-disc
        turtle: [22, 54, 0.7],  // beside the head
        dragon: [38, 26, 0.85]  // beside one horn
      },
      scarf: {
        cat:    [50, 56, 18, 1.0], // around the body where head meets body
        fox:    [50, 56, 16, 1.0],
        owl:    [50, 50, 20, 0.9], // around the head/body transition
        turtle: [20, 60, 9, 0.9],  // small around the turtle\'s neck
        dragon: [50, 54, 18, 1.0]  // wraps the dragon\'s neck
      },
      crown: {
        cat:    [50, 16, 0.85], // sits between the ears
        fox:    [50, 14, 0.8],  // between the tall triangle ears
        owl:    [50, 16, 0.95], // top of head, between ear tufts
        turtle: [18, 46, 0.65], // smaller, on the green head
        dragon: [50, 16, 0.95]  // between the horns
      }
    };
    function renderAccessory() {
      if (!accessory) return null;
      if (accessory === 'bow') {
        var b = ACC_POS.bow[speciesId] || ACC_POS.bow.cat;
        return bowAt(b[0], b[1], b[2] || 1.0);
      }
      if (accessory === 'flower') {
        var f = ACC_POS.flower[speciesId] || ACC_POS.flower.cat;
        return flowerAt(f[0], f[1], f[2] || 1.0);
      }
      if (accessory === 'scarf') {
        var s = ACC_POS.scarf[speciesId] || ACC_POS.scarf.cat;
        return scarfAt(s[0], s[1], s[2] || 16, s[3] || 1.0);
      }
      if (accessory === 'crown') {
        var cr = ACC_POS.crown[speciesId] || ACC_POS.crown.cat;
        return crownAt(cr[0], cr[1], cr[2] || 1.0);
      }
      return null;
    }

    if (speciesId === 'cat') {
      return h('svg', commonRoot,
        // Tail (sitting curl) — pivots at base; transform-origin in CSS
        h('g', { className: 'ah-companion-tail', style: { transformOrigin: '74px 70px' } },
          h('path', { d: 'M74 70 Q92 64 90 50 Q88 42 82 44', stroke: p.primary, strokeWidth: 9, fill: 'none', strokeLinecap: 'round' }),
          h('circle', { cx: 82, cy: 44, r: 4, fill: p.accent })
        ),
        // Body (sitting cat oval)
        h('g', { className: 'ah-companion-body', style: { transformOrigin: '50px 60px' } },
          h('ellipse', { cx: 50, cy: 70, rx: 22, ry: 24, fill: p.primary }),
          h('ellipse', { cx: 50, cy: 76, rx: 14, ry: 16, fill: p.secondary }),
          // Head
          h('ellipse', { cx: 50, cy: 38, rx: 18, ry: 17, fill: p.primary }),
          // Inner ears
          h('path', { d: 'M36 26 L33 14 L44 22 Z', fill: p.primary }),
          h('path', { d: 'M64 26 L67 14 L56 22 Z', fill: p.primary }),
          h('path', { d: 'M37 24 L36 18 L42 22 Z', fill: p.secondary }),
          h('path', { d: 'M63 24 L64 18 L58 22 Z', fill: p.secondary }),
          // Cheeks (subtle)
          h('ellipse', { cx: 40, cy: 44, rx: 4, ry: 2.5, fill: p.secondary, opacity: 0.5 }),
          h('ellipse', { cx: 60, cy: 44, rx: 4, ry: 2.5, fill: p.secondary, opacity: 0.5 }),
          // Eyes (pupils track cursor on hover via pupilStyle wrapper)
          h('g', { style: pupilStyle },
            h('ellipse', { cx: 42, cy: 38, rx: 2.5, ry: 3.5, fill: p.accent }),
            h('ellipse', { cx: 58, cy: 38, rx: 2.5, ry: 3.5, fill: p.accent }),
            h('circle', { cx: 43, cy: 37, r: 0.8, fill: '#fff' }),
            h('circle', { cx: 59, cy: 37, r: 0.8, fill: '#fff' })
          ),
          // Nose
          h('path', { d: 'M48 44 L52 44 L50 47 Z', fill: p.accent }),
          // Mouth (subtle smile)
          h('path', { d: 'M50 47 Q47 50 45 49 M50 47 Q53 50 55 49', stroke: p.accent, strokeWidth: 1, fill: 'none', strokeLinecap: 'round' }),
          // Whiskers
          h('path', { d: 'M30 44 L40 44 M30 47 L40 46 M70 44 L60 44 M70 47 L60 46', stroke: p.accent, strokeWidth: 0.6, opacity: 0.5 })
        ),
        // Eyelids (overlay when blinking)
        h('g', { className: 'ah-companion-eyelid', style: { opacity: eyelidOpacity, transition: 'opacity 80ms ease' } },
          h('ellipse', { cx: 42, cy: 38, rx: 3, ry: 3.5, fill: p.primary }),
          h('ellipse', { cx: 58, cy: 38, rx: 3, ry: 3.5, fill: p.primary })
        ),
        renderAccessory()
      );
    }

    if (speciesId === 'fox') {
      return h('svg', commonRoot,
        // Tail (big fluffy)
        h('g', { className: 'ah-companion-tail', style: { transformOrigin: '74px 72px' } },
          h('path', { d: 'M72 72 Q92 70 90 50 Q86 40 78 50', fill: p.primary }),
          h('path', { d: 'M84 50 Q92 48 88 38', stroke: p.secondary, strokeWidth: 6, fill: 'none', strokeLinecap: 'round' })
        ),
        h('g', { className: 'ah-companion-body', style: { transformOrigin: '50px 60px' } },
          // Body
          h('ellipse', { cx: 50, cy: 72, rx: 20, ry: 22, fill: p.primary }),
          h('ellipse', { cx: 50, cy: 76, rx: 12, ry: 14, fill: p.secondary }),
          // Head — pointier than cat
          h('path', { d: 'M28 38 Q30 24 50 22 Q70 24 72 38 Q70 52 50 54 Q30 52 28 38 Z', fill: p.primary }),
          // Snout
          h('path', { d: 'M44 44 Q50 56 56 44 Q53 50 47 50 Z', fill: p.secondary }),
          // Ears (tall triangles)
          h('path', { d: 'M32 28 L28 12 L44 22 Z', fill: p.primary }),
          h('path', { d: 'M68 28 L72 12 L56 22 Z', fill: p.primary }),
          h('path', { d: 'M34 24 L32 16 L40 22 Z', fill: p.accent }),
          h('path', { d: 'M66 24 L68 16 L60 22 Z', fill: p.accent }),
          // Eyes (sly half-moon, pupils track cursor)
          h('g', { style: pupilStyle },
            h('ellipse', { cx: 41, cy: 36, rx: 2.5, ry: 3, fill: p.accent }),
            h('ellipse', { cx: 59, cy: 36, rx: 2.5, ry: 3, fill: p.accent }),
            h('circle', { cx: 42, cy: 35, r: 0.7, fill: '#fff' }),
            h('circle', { cx: 60, cy: 35, r: 0.7, fill: '#fff' })
          ),
          // Nose at the tip
          h('ellipse', { cx: 50, cy: 48, rx: 2, ry: 1.5, fill: p.accent }),
          // Tail-tip white
          h('circle', { cx: 90, cy: 42, r: 4, fill: p.secondary })
        ),
        h('g', { className: 'ah-companion-eyelid', style: { opacity: eyelidOpacity, transition: 'opacity 80ms ease' } },
          h('ellipse', { cx: 41, cy: 36, rx: 3, ry: 3, fill: p.primary }),
          h('ellipse', { cx: 59, cy: 36, rx: 3, ry: 3, fill: p.primary })
        ),
        renderAccessory()
      );
    }

    if (speciesId === 'owl') {
      return h('svg', commonRoot,
        // Branch perch (tiny)
        h('rect', { x: 28, cy: 84, y: 84, width: 44, height: 4, rx: 2, fill: p.accent, opacity: 0.6 }),
        // Tail feathers (folded)
        h('g', { className: 'ah-companion-tail', style: { transformOrigin: '50px 80px' } },
          h('path', { d: 'M44 76 L40 88 L48 84 L50 88 L52 84 L60 88 L56 76 Z', fill: p.accent })
        ),
        h('g', { className: 'ah-companion-body', style: { transformOrigin: '50px 60px' } },
          // Body (round teardrop)
          h('ellipse', { cx: 50, cy: 60, rx: 26, ry: 30, fill: p.primary }),
          // Belly
          h('ellipse', { cx: 50, cy: 64, rx: 16, ry: 20, fill: p.secondary }),
          // Belly speckles
          h('circle', { cx: 44, cy: 56, r: 1.5, fill: p.primary, opacity: 0.4 }),
          h('circle', { cx: 56, cy: 60, r: 1.5, fill: p.primary, opacity: 0.4 }),
          h('circle', { cx: 50, cy: 70, r: 1.5, fill: p.primary, opacity: 0.4 }),
          // Wing tips
          h('path', { d: 'M24 60 Q22 76 30 80 Q32 70 28 62 Z', fill: p.primary }),
          h('path', { d: 'M76 60 Q78 76 70 80 Q68 70 72 62 Z', fill: p.primary }),
          // Tufted ears
          h('path', { d: 'M30 38 L26 28 L36 34 Z', fill: p.primary }),
          h('path', { d: 'M70 38 L74 28 L64 34 Z', fill: p.primary }),
          // Big round eye discs (face plates)
          h('circle', { cx: 40, cy: 42, r: 9, fill: p.secondary }),
          h('circle', { cx: 60, cy: 42, r: 9, fill: p.secondary }),
          // Eyes (big yellow sclera — fixed position, pupils slide within)
          h('circle', { cx: 40, cy: 42, r: 5.5, fill: p.accent }),
          h('circle', { cx: 60, cy: 42, r: 5.5, fill: p.accent }),
          // Pupils + highlights (track cursor)
          h('g', { style: pupilStyle },
            h('circle', { cx: 40, cy: 43, r: 2.5, fill: '#1a1a1a' }),
            h('circle', { cx: 60, cy: 43, r: 2.5, fill: '#1a1a1a' }),
            h('circle', { cx: 41, cy: 41, r: 0.9, fill: '#fff' }),
            h('circle', { cx: 61, cy: 41, r: 0.9, fill: '#fff' })
          ),
          // Beak
          h('path', { d: 'M48 50 L52 50 L50 56 Z', fill: p.accent })
        ),
        h('g', { className: 'ah-companion-eyelid', style: { opacity: eyelidOpacity, transition: 'opacity 80ms ease' } },
          h('circle', { cx: 40, cy: 42, r: 6, fill: p.primary }),
          h('circle', { cx: 60, cy: 42, r: 6, fill: p.primary })
        ),
        renderAccessory()
      );
    }

    if (speciesId === 'turtle') {
      return h('svg', commonRoot,
        // Tail (small triangle behind shell, animates)
        h('g', { className: 'ah-companion-tail', style: { transformOrigin: '88px 64px' } },
          h('path', { d: 'M86 60 L94 62 L86 68 Z', fill: p.primary })
        ),
        h('g', { className: 'ah-companion-body', style: { transformOrigin: '50px 60px' } },
          // Back legs
          h('ellipse', { cx: 24, cy: 76, rx: 6, ry: 5, fill: p.primary }),
          h('ellipse', { cx: 76, cy: 76, rx: 6, ry: 5, fill: p.primary }),
          // Front legs
          h('ellipse', { cx: 32, cy: 70, rx: 5, ry: 4, fill: p.primary }),
          h('ellipse', { cx: 68, cy: 70, rx: 5, ry: 4, fill: p.primary }),
          // Shell base
          h('ellipse', { cx: 50, cy: 60, rx: 30, ry: 22, fill: p.accent }),
          // Shell pattern (hexagons-ish)
          h('path', { d: 'M50 44 L60 50 L60 64 L50 70 L40 64 L40 50 Z', fill: p.primary, stroke: p.accent, strokeWidth: 1 }),
          h('path', { d: 'M30 52 L40 50 L40 64 L30 66 Z', fill: p.primary, stroke: p.accent, strokeWidth: 1, opacity: 0.85 }),
          h('path', { d: 'M70 52 L60 50 L60 64 L70 66 Z', fill: p.primary, stroke: p.accent, strokeWidth: 1, opacity: 0.85 }),
          h('path', { d: 'M44 44 L40 50 L50 44 L60 50 L56 44 Z', fill: p.primary, stroke: p.accent, strokeWidth: 1, opacity: 0.7 }),
          h('path', { d: 'M44 76 L40 70 L50 74 L60 70 L56 76 Z', fill: p.primary, stroke: p.accent, strokeWidth: 1, opacity: 0.7 }),
          // Head
          h('ellipse', { cx: 18, cy: 60, rx: 10, ry: 8, fill: p.primary }),
          // Eyes (single eye visible from this angle, pupils track)
          h('g', { style: pupilStyle },
            h('circle', { cx: 14, cy: 58, r: 1.5, fill: p.accent }),
            h('circle', { cx: 14, cy: 58, r: 0.5, fill: '#fff' })
          ),
          // Cheek dot
          h('circle', { cx: 17, cy: 64, r: 1.2, fill: p.secondary, opacity: 0.6 }),
          // Smile
          h('path', { d: 'M10 62 Q14 65 18 62', stroke: p.accent, strokeWidth: 1, fill: 'none', strokeLinecap: 'round' })
        ),
        h('g', { className: 'ah-companion-eyelid', style: { opacity: eyelidOpacity, transition: 'opacity 80ms ease' } },
          h('circle', { cx: 14, cy: 58, r: 1.8, fill: p.primary })
        ),
        renderAccessory()
      );
    }

    if (speciesId === 'dragon') {
      return h('svg', commonRoot,
        // Tail (curly with spiked tip)
        h('g', { className: 'ah-companion-tail', style: { transformOrigin: '74px 76px' } },
          h('path', { d: 'M74 76 Q92 74 88 58 Q82 50 78 58', stroke: p.primary, strokeWidth: 8, fill: 'none', strokeLinecap: 'round' }),
          h('path', { d: 'M78 58 L74 50 L82 52 Z', fill: p.accent })
        ),
        h('g', { className: 'ah-companion-body', style: { transformOrigin: '50px 60px' } },
          // Body (chubby)
          h('ellipse', { cx: 50, cy: 70, rx: 22, ry: 22, fill: p.primary }),
          // Belly
          h('ellipse', { cx: 50, cy: 76, rx: 13, ry: 14, fill: p.secondary }),
          // Belly scales
          h('path', { d: 'M40 70 Q44 74 48 70 Q52 74 56 70 Q60 74 60 70 M40 78 Q44 82 48 78 Q52 82 56 78', stroke: p.accent, strokeWidth: 0.7, fill: 'none', opacity: 0.5 }),
          // Wings (animated as a group — flap independent of body breathe)
          h('g', { className: 'ah-companion-wings', style: { transformOrigin: '50px 52px' } },
            h('path', { d: 'M28 50 Q14 40 18 60 Q24 58 32 56 Z', fill: p.accent, opacity: 0.85 }),
            h('path', { d: 'M72 50 Q86 40 82 60 Q76 58 68 56 Z', fill: p.accent, opacity: 0.85 }),
            h('path', { d: 'M28 50 L20 56 M28 50 L24 60', stroke: p.primary, strokeWidth: 0.6, opacity: 0.6 }),
            h('path', { d: 'M72 50 L80 56 M72 50 L76 60', stroke: p.primary, strokeWidth: 0.6, opacity: 0.6 })
          ),
          // Head (rounder than fox, with snout)
          h('ellipse', { cx: 50, cy: 38, rx: 18, ry: 16, fill: p.primary }),
          // Snout
          h('ellipse', { cx: 50, cy: 46, rx: 10, ry: 6, fill: p.secondary }),
          // Horns
          h('path', { d: 'M40 24 L36 14 L44 22 Z', fill: p.accent }),
          h('path', { d: 'M60 24 L64 14 L56 22 Z', fill: p.accent }),
          // Spikes along the back
          h('path', { d: 'M48 22 L50 16 L52 22 Z', fill: p.accent }),
          h('path', { d: 'M44 50 L46 44 L48 50 Z M52 50 L54 44 L56 50 Z M60 50 L62 44 L64 50 Z', fill: p.accent, opacity: 0.7 }),
          // Eyes (big anime style, pupils track cursor)
          h('g', { style: pupilStyle },
            h('ellipse', { cx: 42, cy: 38, rx: 3, ry: 4, fill: '#1a1a1a' }),
            h('ellipse', { cx: 58, cy: 38, rx: 3, ry: 4, fill: '#1a1a1a' }),
            h('circle', { cx: 43, cy: 37, r: 1, fill: '#fff' }),
            h('circle', { cx: 59, cy: 37, r: 1, fill: '#fff' })
          ),
          // Nostrils
          h('circle', { cx: 47, cy: 46, r: 0.8, fill: p.accent }),
          h('circle', { cx: 53, cy: 46, r: 0.8, fill: p.accent }),
          // Smile
          h('path', { d: 'M44 50 Q50 53 56 50', stroke: p.accent, strokeWidth: 1, fill: 'none', strokeLinecap: 'round' }),
          // Tiny tooth
          h('path', { d: 'M52 50 L52 52 L53 50 Z', fill: '#fff' })
        ),
        h('g', { className: 'ah-companion-eyelid', style: { opacity: eyelidOpacity, transition: 'opacity 80ms ease' } },
          h('ellipse', { cx: 42, cy: 38, rx: 3.5, ry: 4, fill: p.primary }),
          h('ellipse', { cx: 58, cy: 38, rx: 3.5, ry: 4, fill: p.primary })
        ),
        renderAccessory()
      );
    }

    // Fallback: simple round critter
    return h('svg', commonRoot,
      h('circle', { cx: 50, cy: 60, r: 26, fill: p.primary }),
      h('circle', { cx: 42, cy: 56, r: 2, fill: p.accent }),
      h('circle', { cx: 58, cy: 56, r: 2, fill: p.accent })
    );
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
      // Companion idle animations (Phase 2p) — gentle, sub-conscious
      // signals of life. All scoped to .ah-companion-* so they don\'t
      // bleed onto other room elements. Reduced-motion handler at bottom
      // suppresses them all for sensory-sensitive students.
      '@keyframes ah-companion-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }',
      '@keyframes ah-companion-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }',
      '@keyframes ah-companion-tail-cat { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-6deg); } }',
      '@keyframes ah-companion-tail-fox { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-4deg); } }',
      '@keyframes ah-companion-tail-owl { 0%, 100% { transform: rotate(-1deg); } 50% { transform: rotate(2deg); } }',
      '@keyframes ah-companion-tail-turtle { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(2px); } }',
      '@keyframes ah-companion-tail-dragon { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }',
      '@keyframes ah-companion-react { 0% { transform: scale(1); } 30% { transform: scale(1.15); } 60% { transform: scale(0.92); } 100% { transform: scale(1); } }',
      '@keyframes ah-companion-confetti { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-30px) scale(0.6); opacity: 0; } }',
      '@keyframes ah-companion-bubble-in { 0% { opacity: 0; transform: translateY(8px) scale(0.92); } 100% { opacity: 1; transform: translateY(0) scale(1); } }',
      '@keyframes ah-companion-wing-flap { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }',
      '.ah-root .ah-companion-wings { animation: ah-companion-wing-flap 1800ms ease-in-out infinite; }',
      '.ah-root .ah-companion-root { animation: ah-companion-bob 5500ms ease-in-out infinite; transition: transform 200ms ease; cursor: pointer; }',
      '.ah-root .ah-companion-root.ah-companion-react { animation: ah-companion-react 600ms ease-out 1; }',
      // transform-origin set inline per-species in viewBox coordinates;
      // SVG default transform-box (view-box) interprets that correctly.
      // Don\'t set transform-box: fill-box here — that would re-anchor
      // the origin to each group\'s bounding box, mis-locating the pivot.
      '.ah-root .ah-companion-body { animation: ah-companion-breathe 3500ms ease-in-out infinite; }',
      '.ah-root [data-species="cat"] .ah-companion-tail { animation: ah-companion-tail-cat 6000ms ease-in-out infinite; }',
      '.ah-root [data-species="fox"] .ah-companion-tail { animation: ah-companion-tail-fox 4500ms ease-in-out infinite; }',
      '.ah-root [data-species="owl"] .ah-companion-tail { animation: ah-companion-tail-owl 7000ms ease-in-out infinite; }',
      '.ah-root [data-species="turtle"] .ah-companion-tail { animation: ah-companion-tail-turtle 8000ms ease-in-out infinite; }',
      '.ah-root [data-species="dragon"] .ah-companion-tail { animation: ah-companion-tail-dragon 4000ms ease-in-out infinite; }',
      '.ah-root .ah-companion-root:hover { transform: scale(1.05) translateY(-2px); }',
      '.ah-root .ah-companion-bubble { animation: ah-companion-bubble-in 280ms cubic-bezier(0.34, 1.6, 0.64, 1) 1; transform-origin: bottom right; }',
      // Decoration micro-animations (Phase 2p.16) — gentle ambient
      // motion applied to the <img> inside a placed decoration cell,
      // keyed by template kind. The cell\'s base ±3° rotation stays
      // intact (it\'s on the outer div); these animate the inner image.
      // All suppressed by the existing prefers-reduced-motion block.
      '@keyframes ah-deco-sway   { 0%, 100% { transform: rotate(-1.4deg); } 50% { transform: rotate(1.4deg); } }',
      '@keyframes ah-deco-bob    { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }',
      '@keyframes ah-deco-pulse  { 0%, 100% { opacity: 0.92; } 50% { opacity: 1; } }',
      '@keyframes ah-deco-shimmer { 0%, 100% { filter: brightness(0.96); } 50% { filter: brightness(1.04); } }',
      '.ah-root .ah-deco-sway    img { animation: ah-deco-sway 6500ms ease-in-out infinite; transform-origin: 50% 90%; }',
      '.ah-root .ah-deco-bob     img { animation: ah-deco-bob 5500ms ease-in-out infinite; }',
      '.ah-root .ah-deco-pulse   img { animation: ah-deco-pulse 3800ms ease-in-out infinite; }',
      '.ah-root .ah-deco-shimmer img { animation: ah-deco-shimmer 7200ms ease-in-out infinite; }',
      // Sleeping companion (Live mode) — slow the breathe, stop the bob,
      // freeze the tail. Eyelids are shut via the SVG eyelid group.
      '.ah-root .ah-companion-root.ah-companion-sleeping { animation: none; transform: translateY(0); cursor: pointer; }',
      '.ah-root .ah-companion-sleeping .ah-companion-body { animation: ah-companion-breathe 6500ms ease-in-out infinite; }',
      '.ah-root .ah-companion-sleeping .ah-companion-tail { animation: none !important; }',
      '.ah-root .ah-companion-sleeping .ah-companion-wings { animation: none !important; }',
      '@keyframes ah-companion-z { 0% { opacity: 0; transform: translate(0, 0) scale(0.6); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(8px, -16px) scale(1.1); } }',
      '.ah-root .ah-companion-z { animation: ah-companion-z 2400ms ease-in-out infinite; }',
      '.ah-root .ah-companion-confetti-piece { animation: ah-companion-confetti 800ms ease-out 1 forwards; }',
      // Ambient weather (Phase 2p.27) — CSS-only particle overlay on top
      // of the wall and floor surfaces. All particles are pure CSS divs;
      // no canvas, no JS animation loop. The container is pointer-
      // events: none so it never interferes with cell clicks. Suppressed
      // under prefers-reduced-motion via the global block above.
      '.ah-root .ah-weather-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: inherit; z-index: 3; }',
      // Rain — thin diagonal streaks falling fast.
      '@keyframes ah-rain-fall { 0% { transform: translate3d(0, -10%, 0); opacity: 0; } 8% { opacity: 0.55; } 92% { opacity: 0.55; } 100% { transform: translate3d(-6px, 110%, 0); opacity: 0; } }',
      '.ah-root .ah-rain-drop { position: absolute; top: -10px; width: 1.5px; height: 14px; background: linear-gradient(180deg, transparent, rgba(180,210,235,0.55)); border-radius: 1px; transform: translate3d(0, -10%, 0); animation: ah-rain-fall linear infinite; }',
      // Snow — soft round flakes drifting slowly with gentle horizontal sway.
      '@keyframes ah-snow-fall { 0% { transform: translate3d(0, -10%, 0); opacity: 0; } 8% { opacity: 0.85; } 50% { transform: translate3d(8px, 50%, 0); } 92% { opacity: 0.85; } 100% { transform: translate3d(-6px, 110%, 0); opacity: 0; } }',
      '.ah-root .ah-snow-flake { position: absolute; top: -10px; width: 5px; height: 5px; background: rgba(255,255,255,0.85); border-radius: 50%; box-shadow: 0 0 4px rgba(255,255,255,0.5); transform: translate3d(0, -10%, 0); animation: ah-snow-fall linear infinite; }',
      // Sparkles — tiny twinkles that fade in/out at random spots without falling.
      '@keyframes ah-sparkle-twinkle { 0%, 100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 0.85; transform: scale(1.1); } }',
      '.ah-root .ah-sparkle { position: absolute; width: 6px; height: 6px; background: radial-gradient(circle at center, #fff, transparent 70%); border-radius: 50%; opacity: 0; animation: ah-sparkle-twinkle ease-in-out infinite; }',
      // Breathing pacer (Phase 2p.28) — gentle box-breathing circle.
      // The .ah-breathe-orb element gets a state class (-in, -hold-in,
      // -out, -hold-out) toggled from React; the keyframes drive the
      // scale + glow per phase. Reduced motion swaps to a static cue.
      '.ah-root .ah-breathe-orb { width: 160px; height: 160px; border-radius: 50%; transition: transform 4000ms ease-in-out, box-shadow 4000ms ease-in-out, opacity 600ms ease; will-change: transform, box-shadow; }',
      '.ah-root .ah-breathe-orb-in { transform: scale(1); box-shadow: 0 0 36px 8px rgba(255,220,140,0.55); }',
      '.ah-root .ah-breathe-orb-out { transform: scale(0.55); box-shadow: 0 0 14px 2px rgba(255,220,140,0.25); }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .ah-root .ah-token-tick,',
      '  .ah-root .ah-welcome,',
      '  .ah-root .ah-memory-indicator.ah-memory-due,',
      '  .ah-root .ah-companion-root,',
      '  .ah-root .ah-companion-body,',
      '  .ah-root .ah-companion-tail,',
      '  .ah-root .ah-companion-bubble,',
      '  .ah-root .ah-companion-wings,',
      '  .ah-root .ah-companion-z,',
      '  .ah-root .ah-deco-sway img,',
      '  .ah-root .ah-deco-bob img,',
      '  .ah-root .ah-deco-pulse img,',
      '  .ah-root .ah-deco-shimmer img,',
      '  .ah-root .ah-companion-confetti-piece { animation: none !important; }',
      '  .ah-root .ah-decoration:hover,',
      '  .ah-root .ah-decoration:focus-visible,',
      '  .ah-root .ah-companion-root:hover { transform: none !important; }',
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

    // Mood quick-tap (Phase 2g) — optional. Tags the journal entry with
    // a single emoji + label so insights can group entries by mood without
    // requiring text analysis. Tap-to-toggle: tap again to clear.
    var moodTuple = useState(null);
    var pickedMood = moodTuple[0];
    var setPickedMood = moodTuple[1];

    var palette = p.palette;
    var minChars = 20;
    var charCount = draft.trim().length;
    var canSubmit = charCount >= minChars;
    // ✨ Polish state — when set, the button shows a spinner and the
    // textarea is disabled. polishError holds a one-line message if
    // Gemini didn't return clean text; cleared on next attempt.
    var polishingTuple = useState(false);
    var isPolishing = polishingTuple[0];
    var setIsPolishing = polishingTuple[1];

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

    // ✨ Polish: send the raw draft (typically voice-dictated, no
    // capitalization or punctuation) to Gemini for cleanup and replace
    // the draft with the polished version. Voice-to-text via Web Speech
    // API returns a single lowercase run-on stream — this gives the
    // student a one-tap way to make it readable without retyping. Falls
    // back silently to the original draft if Gemini isn't wired or the
    // call errors.
    function handlePolishClick() {
      if (isPolishing) return;
      var raw = (draft || '').trim();
      if (!raw) return;
      var callGemini = p.callGemini;
      if (typeof callGemini !== 'function') {
        // No Gemini available — do a local-only minimal polish so the
        // button still feels responsive. Capitalize sentences after ./?/!
        // and Title-case the very first character.
        var localPolish = raw
          .replace(/\s+/g, ' ')
          .replace(/(^|[.!?]\s+)([a-z])/g, function(_, sep, ch) { return sep + ch.toUpperCase(); });
        if (localPolish && localPolish !== raw) setDraft(localPolish);
        return;
      }
      setIsPolishing(true);
      var polishPrompt =
        'You are cleaning up a student\'s voice-dictated journal entry. ' +
        'Add appropriate capitalization (sentence starts, "I", proper nouns) and ' +
        'punctuation (periods, commas, question marks, apostrophes). ' +
        'PRESERVE every word and the original meaning exactly. Do NOT add new content, ' +
        'do NOT change vocabulary, do NOT correct grammar (this is the student\'s voice). ' +
        'Return ONLY the cleaned text — no preamble, no quotes, no explanation.\n\n' +
        'Raw text:\n"' + raw.replace(/"/g, '\\"') + '"';
      Promise.resolve()
        .then(function() { return callGemini(polishPrompt); })
        .then(function(out) {
          var polished = (typeof out === 'string' ? out : (out && out.text) || '').trim();
          // Strip surrounding quotes if Gemini wrapped the response.
          if ((polished.startsWith('"') && polished.endsWith('"')) || (polished.startsWith('“') && polished.endsWith('”'))) {
            polished = polished.slice(1, -1).trim();
          }
          // Sanity: refuse to replace if the polish dropped >25% of words
          // (signals Gemini summarized or refused). Better to keep raw.
          var rawWords = raw.split(/\s+/).filter(Boolean).length;
          var polWords = polished.split(/\s+/).filter(Boolean).length;
          if (polished && polWords >= rawWords * 0.75) {
            setDraft(polished);
          }
        })
        .catch(function() { /* silent — student keeps raw text */ })
        .then(function() { setIsPolishing(false); });
    }

    function handleSubmit() {
      if (!canSubmit) return;
      p.stopVoice();
      var override = (pickedPromptId === 'adaptive' && p.adaptivePrompt) ? p.adaptivePrompt.text : null;
      p.onSubmit(draft, pickedPromptId, pickedMood, override);
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
        // Mood quick-tap (optional). Tap an emoji to tag this entry; tap
        // again to clear. Saved with the journal entry for later grouping.
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          'How are you · optional'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' } },
          [
            { id: 'good',    emoji: '😊', label: 'Good' },
            { id: 'meh',     emoji: '😐', label: 'Meh' },
            { id: 'down',    emoji: '😔', label: 'Down' },
            { id: 'tired',   emoji: '😴', label: 'Tired' },
            { id: 'frust',   emoji: '😤', label: 'Frustrated' },
            { id: 'great',   emoji: '✨', label: 'Great' }
          ].map(function(m) {
            var active = pickedMood === m.id;
            return h('button', {
              key: 'mood-' + m.id,
              onClick: function() { setPickedMood(active ? null : m.id); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': m.label + (active ? ' (selected)' : ''),
              title: m.label,
              style: {
                background: active ? palette.surface : 'transparent',
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '18px',
                lineHeight: '1',
                color: palette.text,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }
            },
              h('span', { 'aria-hidden': 'true' }, m.emoji),
              h('span', { style: { fontSize: '11px', fontWeight: active ? 700 : 500, color: palette.textDim } }, m.label)
            );
          })
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
          }),
          // Adaptive prompt (Phase 2p.17) — context-aware, only shown
          // when current state offers a meaningful hook. Distinguished
          // visually with an accent border + ✨ "just for today" hint.
          p.adaptivePrompt ? (function() {
            var ap = p.adaptivePrompt;
            var active = pickedPromptId === 'adaptive';
            return h('button', {
              key: 'pp-adaptive',
              onClick: function() { setPickedPromptId('adaptive'); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': 'Adaptive prompt — ' + ap.text + '. ' + ap.hint,
              style: {
                background: active ? palette.surface : 'transparent',
                border: '1.5px solid ' + palette.accent,
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                color: palette.text,
                textAlign: 'left',
                lineHeight: '1.4',
                position: 'relative'
              }
            },
              h('span', {
                'aria-hidden': 'true',
                style: { fontSize: '10px', color: palette.accent, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }
              }, '✨ Just for today'),
              h('span', { style: { display: 'block' } }, ap.text),
              h('span', { style: { display: 'block', fontSize: '11px', color: palette.textMute, fontStyle: 'italic', marginTop: '4px' } }, ap.hint)
            );
          })() : null
        ),
        // Text area + voice button
        h('div', { style: { position: 'relative', marginBottom: '8px' } },
          h('textarea', {
            value: draft,
            onChange: function(e) { setDraft(e.target.value); },
            placeholder: 'Take your time. Anything goes. Tip: wrap a {word} in braces to make it a fill-in-the-blank for self-quiz later.',
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
          }, p.isRecording ? '⏺' : '🎤') : null,
          // ✨ Polish button — left of the mic. Sends the current draft
          // to Gemini for capitalization + punctuation cleanup. Only
          // shown when there's enough text to be worth polishing AND the
          // user isn't currently recording (the mic button takes that
          // visual slot). Uses position:absolute relative to the same
          // textarea wrapper as the mic.
          (charCount >= 8 && !p.isRecording) ? h('button', {
            onClick: handlePolishClick,
            disabled: isPolishing,
            'aria-label': isPolishing ? 'Polishing text…' : 'Polish capitalization and punctuation',
            title: isPolishing ? 'Polishing…' : 'Add capitalization and punctuation (helpful after voice dictation). Original wording preserved.',
            style: {
              position: 'absolute',
              top: '8px',
              right: p.speechSupported ? '52px' : '8px',
              height: '36px',
              padding: '0 10px',
              borderRadius: '18px',
              background: isPolishing ? palette.surface : palette.surface,
              color: palette.text,
              border: '1px solid ' + palette.border,
              fontSize: '12px',
              fontWeight: 700,
              cursor: isPolishing ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: isPolishing ? 0.7 : 1
            }
          }, isPolishing ? '…' : '✨ Polish') : null
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

    // Cloze quiz state (Phase 2i) — when cloze markers exist in the entry,
    // students can quiz themselves on their own writing. Active recall on
    // your own words is a surprisingly strong consolidation move.
    var clozeAnswers = extractClozeAnswers(entry.text || '');
    var hasCloze = clozeAnswers.length > 0;
    var quizTuple = useState(null); // null | { guesses, submitted, correctCount }
    var quiz = quizTuple[0];
    var setQuiz = quizTuple[1];

    var date = new Date(entry.date);
    var dateStr = date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    function handleSave() {
      var trimmed = (draft || '').trim();
      if (!trimmed) return;
      p.onEdit(trimmed);
      setEditing(false);
    }

    function startQuiz() {
      setQuiz({
        guesses: clozeAnswers.map(function() { return ''; }),
        submitted: false,
        correctCount: 0
      });
    }
    function updateGuess(blankIdx, val) {
      var newGuesses = quiz.guesses.slice();
      newGuesses[blankIdx] = val;
      setQuiz(Object.assign({}, quiz, { guesses: newGuesses }));
    }
    function submitQuiz() {
      var cc = 0;
      for (var i = 0; i < clozeAnswers.length; i++) {
        if (clozeAnswerCorrect(clozeAnswers[i], quiz.guesses[i])) cc++;
      }
      var pct = clozeAnswers.length > 0 ? Math.round((cc / clozeAnswers.length) * 100) : 0;
      setQuiz(Object.assign({}, quiz, { submitted: true, correctCount: cc, scorePct: pct }));
      // Token award via parent — same daily quiz cap as memory quiz
      if (typeof p.onQuizComplete === 'function') {
        p.onQuizComplete(entry.id, pct);
      }
    }
    function exitQuiz() { setQuiz(null); }

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
        },
          (function() {
            var moodMap = { good: '😊', meh: '😐', down: '😔', tired: '😴', frust: '😤', great: '✨' };
            var moodEmoji = entry.mood && moodMap[entry.mood] ? moodMap[entry.mood] + ' ' : '';
            return moodEmoji + dateStr + (entry.editedAt ? ' · edited' : '');
          })()
        ),
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
        placeholder: 'Tip: wrap a {word} in curly braces to make it a fill-in-blank for self-quiz.',
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
      }) : (
        // Quiz mode for cloze-bearing entries
        quiz ? (function() {
          var segments = buildClozeSegments(entry.text || '');
          if (quiz.submitted) {
            return h('div', { style: { marginBottom: '8px' } },
              h('div', {
                style: {
                  fontSize: '13px',
                  color: palette.text,
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginBottom: '10px'
                }
              },
                segments.map(function(seg, i) {
                  if (seg.kind === 'text') return h('span', { key: 'js-' + i }, seg.value);
                  var guess = quiz.guesses[seg.blankIdx] || '';
                  var correct = clozeAnswerCorrect(seg.answer, guess);
                  return h('span', {
                    key: 'js-' + i,
                    style: {
                      background: correct ? 'rgba(52,211,153,0.18)' : 'rgba(251,191,36,0.18)',
                      color: palette.text,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      borderBottom: '2px solid ' + (correct ? (palette.success || palette.accent) : (palette.warn || palette.accent))
                    }
                  }, seg.answer + (correct ? '' : ' (you: "' + (guess || '—') + '")'));
                })
              ),
              h('div', {
                style: {
                  fontSize: '12px',
                  color: palette.textDim,
                  marginBottom: '8px',
                  textAlign: 'center',
                  fontWeight: 600
                }
              },
                quiz.correctCount + ' / ' + clozeAnswers.length + ' correct · ' + quiz.scorePct + '%')
            );
          }
          return h('div', { style: { marginBottom: '8px' } },
            h('div', {
              style: {
                fontSize: '14px',
                color: palette.text,
                lineHeight: '2.0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: '10px'
              }
            },
              segments.map(function(seg, i) {
                if (seg.kind === 'text') return h('span', { key: 'jq-' + i }, seg.value);
                return h('input', {
                  key: 'jq-' + i,
                  type: 'text',
                  value: quiz.guesses[seg.blankIdx] || '',
                  onChange: function(e) { updateGuess(seg.blankIdx, e.target.value); },
                  'aria-label': 'Blank ' + (seg.blankIdx + 1),
                  placeholder: '___',
                  style: {
                    background: palette.surface,
                    border: '1px solid ' + palette.border,
                    borderRadius: '4px',
                    color: palette.text,
                    padding: '2px 8px',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    margin: '0 2px',
                    minWidth: '70px'
                  }
                });
              })
            )
          );
        })() : h('div', {
          style: {
            fontSize: '13px',
            color: palette.text,
            lineHeight: hasCloze ? '1.85' : '1.55',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '8px'
          }
        },
          // Render cloze answers visually-highlighted (answer-key view)
          // when the entry has them, plain text otherwise
          hasCloze ? (function() {
            var segments = buildClozeSegments(entry.text || '');
            return segments.map(function(seg, i) {
              if (seg.kind === 'text') return h('span', { key: 'js-v-' + i }, seg.value);
              return h('span', {
                key: 'js-v-' + i,
                style: {
                  background: palette.accent,
                  color: palette.onAccent,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 700
                }
              }, seg.answer);
            });
          })() : entry.text
        )
      ),
      h('div', { style: { display: 'flex', gap: '8px', justifyContent: quiz ? 'space-between' : 'flex-end', alignItems: 'center' } },
        // Quiz state UI dominates when active
        quiz ? (quiz.submitted ? [
          h('button', {
            key: 'qtagain',
            onClick: function() {
              setQuiz({
                guesses: clozeAnswers.map(function() { return ''; }),
                submitted: false,
                correctCount: 0
              });
            },
            style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
          }, 'Quiz again'),
          h('button', {
            key: 'qdone',
            onClick: exitQuiz,
            style: { background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '6px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
          }, 'Done')
        ] : [
          h('button', {
            key: 'qcancel',
            onClick: exitQuiz,
            style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
          }, 'Cancel'),
          h('button', {
            key: 'qcheck',
            onClick: submitQuiz,
            style: { background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '6px', padding: '4px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
          }, 'Check answers')
        ]) : (editing ? [
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
          hasCloze ? h('button', {
            key: 'quiz',
            onClick: startQuiz,
            'aria-label': 'Quiz yourself on this entry · ' + clozeAnswers.length + ' blanks',
            title: 'Fill in the {braced} words from memory',
            style: {
              background: 'transparent',
              color: palette.accent,
              border: '1px solid ' + palette.accent,
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginRight: 'auto'
            }
          }, '📝 Quiz me · ' + clozeAnswers.length) : null,
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
        ])
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

    // "Make similar" pre-fill (Phase 2p.14): if generateContext carries
    // a preTemplate / preSlots / preArtStyle, jump straight to the
    // configure step with those values seeded. Lets students iterate
    // on a design they liked without rebuilding from scratch.
    var preTemplate = ctx.preTemplate ? getTemplate(ctx.preTemplate) : null;

    var stepTuple = useState(preTemplate ? 'configure' : 'pick-template');
    var step = stepTuple[0];
    var setStep = stepTuple[1];

    var templateTuple = useState(preTemplate || null);
    var template = templateTuple[0];
    var setTemplate = templateTuple[1];

    var slotsTuple = useState(ctx.preSlots ? Object.assign({}, ctx.preSlots) : {});
    var slots = slotsTuple[0];
    var setSlots = slotsTuple[1];

    var artStyleTuple = useState(ctx.preArtStyle || inheritedStyleId);
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

    // Initialize the drawing canvas when entering the 'draw' step. Runs
    // once per entry so re-entering after a back-out clears any prior stroke.
    useEffect(function() {
      if (step !== 'draw') return;
      // Defer one tick so the canvas DOM node is mounted.
      var raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : function(cb) { return setTimeout(cb, 16); };
      var caf = (typeof cancelAnimationFrame === 'function') ? cancelAnimationFrame : clearTimeout;
      var id = raf(function() { initDrawCanvas(); });
      return function() { caf(id); };
      // eslint-disable-next-line
    }, [step]);

    var reflectionDraftTuple = useState('');
    var reflectionDraft = reflectionDraftTuple[0];
    var setReflectionDraft = reflectionDraftTuple[1];

    // Mood tag (Phase 2m) — optional affective-domain marker for the
    // decoration. Captured in the reflection step.
    var moodTagTuple = useState(null);
    var moodTag = moodTagTuple[0];
    var setMoodTag = moodTagTuple[1];

    // Subject tags (Phase 2p.6) — multi-select. Empty array by default.
    var subjectTagsTuple = useState([]);
    var subjectTags = subjectTagsTuple[0];
    var setSubjectTags = subjectTagsTuple[1];
    function toggleSubject(id) {
      var idx = subjectTags.indexOf(id);
      if (idx === -1) setSubjectTags(subjectTags.concat([id]));
      else setSubjectTags(subjectTags.filter(function(s) { return s !== id; }));
    }

    // Custom upload (Phase 2p.19) — student-uploaded image as alternative
    // to AI generation. Stored locally until placed; charged 3 tokens
    // on confirmation; goes through the same reflect-step flow.
    var uploadDataTuple = useState(null); // { base64, width, height }
    var uploadData = uploadDataTuple[0];
    var setUploadData = uploadDataTuple[1];
    var uploadErrorTuple = useState(null);
    var uploadError = uploadErrorTuple[0];
    var setUploadError = uploadErrorTuple[1];
    var uploadingTuple = useState(false);
    var uploading = uploadingTuple[0];
    var setUploading = uploadingTuple[1];
    var isCustomUploadFlowTuple = useState(false);
    var isCustomUploadFlow = isCustomUploadFlowTuple[0];
    var setIsCustomUploadFlow = isCustomUploadFlowTuple[1];

    // Drawing canvas (Phase 2p.26) — student draws their own decoration
    // directly on a canvas. Reuses the custom-upload pathway, with a
    // distinct isCustomDrawing flag so the badge differs (✏️ vs 📎).
    var useRef = React.useRef;
    var drawCanvasRef = useRef(null);
    var drawCtxRef = useRef(null);
    var drawIsDownRef = useRef(false);
    var drawLastPointRef = useRef(null);
    var drawHistoryRef = useRef([]);  // ImageData snapshots for undo
    var drawColorTuple = useState('#222222');
    var drawColor = drawColorTuple[0];
    var setDrawColor = drawColorTuple[1];
    var drawSizeTuple = useState(4);
    var drawSize = drawSizeTuple[0];
    var setDrawSize = drawSizeTuple[1];
    var drawToolTuple = useState('brush'); // 'brush' | 'eraser'
    var drawTool = drawToolTuple[0];
    var setDrawTool = drawToolTuple[1];
    var isCustomDrawingFlowTuple = useState(false);
    var isCustomDrawingFlow = isCustomDrawingFlowTuple[0];
    var setIsCustomDrawingFlow = isCustomDrawingFlowTuple[1];
    var drawDirtyTuple = useState(false); // whether anything has been drawn yet
    var drawDirty = drawDirtyTuple[0];
    var setDrawDirty = drawDirtyTuple[1];

    function handleFileChosen(file) {
      setUploadError(null);
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('That file is bigger than 5MB. Try a smaller image.');
        return;
      }
      setUploading(true);
      compressUploadedImage(file, 256, 0.82).then(function(result) {
        setUploadData(result);
        setUploading(false);
      }).catch(function(err) {
        setUploadError((err && err.message) || 'Could not load that image.');
        setUploading(false);
      });
    }

    // Drawing canvas helpers (Phase 2p.26) — initializes the 2D context,
    // pushes/pops history snapshots for undo, and converts the canvas to
    // a base64 PNG when the student is done.
    var DRAW_W = 400;
    var DRAW_H = 300;
    var DRAW_PALETTE = [
      '#222222', '#ffffff', '#dc2626', '#f59e0b',
      '#fbbf24', '#16a34a', '#06b6d4', '#3b82f6',
      '#7c3aed', '#db2777', '#92400e', '#94a3b8'
    ];
    function initDrawCanvas() {
      var canvas = drawCanvasRef.current;
      if (!canvas) return;
      // Honor device pixel ratio for crisp lines on hi-dpi screens.
      var ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      canvas.width = DRAW_W * ratio;
      canvas.height = DRAW_H * ratio;
      canvas.style.width = DRAW_W + 'px';
      canvas.style.height = DRAW_H + 'px';
      var c = canvas.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.scale(ratio, ratio);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, DRAW_W, DRAW_H);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      drawCtxRef.current = c;
      drawHistoryRef.current = [];
      pushDrawHistory();
      setDrawDirty(false);
    }
    function pushDrawHistory() {
      var canvas = drawCanvasRef.current;
      var c = drawCtxRef.current;
      if (!canvas || !c) return;
      try {
        var snap = c.getImageData(0, 0, canvas.width, canvas.height);
        drawHistoryRef.current.push(snap);
        // Keep at most 20 snapshots to bound memory.
        if (drawHistoryRef.current.length > 20) drawHistoryRef.current.shift();
      } catch (err) { /* ignore — taint or memory pressure */ }
    }
    function undoDraw() {
      var hist = drawHistoryRef.current;
      var canvas = drawCanvasRef.current;
      var c = drawCtxRef.current;
      if (!canvas || !c || hist.length < 2) return;
      hist.pop();
      var prev = hist[hist.length - 1];
      try { c.putImageData(prev, 0, 0); } catch (err) {}
      // If we're back to the initial blank, clear dirty flag.
      if (hist.length <= 1) setDrawDirty(false);
    }
    function clearDraw() {
      var c = drawCtxRef.current;
      if (!c) return;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, DRAW_W, DRAW_H);
      drawHistoryRef.current = [];
      pushDrawHistory();
      setDrawDirty(false);
    }
    function drawPointerPos(evt) {
      var canvas = drawCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      var rect = canvas.getBoundingClientRect();
      var clientX = evt.clientX != null ? evt.clientX : (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
      var clientY = evt.clientY != null ? evt.clientY : (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);
      return {
        x: (clientX - rect.left) * (DRAW_W / rect.width),
        y: (clientY - rect.top) * (DRAW_H / rect.height)
      };
    }
    function drawStroke(from, to) {
      var c = drawCtxRef.current;
      if (!c) return;
      c.strokeStyle = drawTool === 'eraser' ? '#ffffff' : drawColor;
      c.lineWidth = drawTool === 'eraser' ? Math.max(drawSize * 2, 8) : drawSize;
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.lineTo(to.x, to.y);
      c.stroke();
    }
    function handleDrawDown(evt) {
      evt.preventDefault();
      var canvas = drawCanvasRef.current;
      if (canvas && canvas.setPointerCapture && evt.pointerId != null) {
        try { canvas.setPointerCapture(evt.pointerId); } catch (err) {}
      }
      drawIsDownRef.current = true;
      var p1 = drawPointerPos(evt);
      drawLastPointRef.current = p1;
      // Single dot for tap-and-release.
      drawStroke(p1, { x: p1.x + 0.01, y: p1.y + 0.01 });
      setDrawDirty(true);
    }
    function handleDrawMove(evt) {
      if (!drawIsDownRef.current) return;
      evt.preventDefault();
      var p = drawPointerPos(evt);
      var last = drawLastPointRef.current;
      if (last) drawStroke(last, p);
      drawLastPointRef.current = p;
    }
    function handleDrawUp(evt) {
      if (!drawIsDownRef.current) return;
      drawIsDownRef.current = false;
      drawLastPointRef.current = null;
      pushDrawHistory();
    }
    function exportDrawAsBase64() {
      var canvas = drawCanvasRef.current;
      if (!canvas) return null;
      try { return canvas.toDataURL('image/png'); } catch (err) { return null; }
    }

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
      // Phase 2p.19 — custom-upload flow places via dedicated handler so
      // template synthesis happens in the parent rather than passing a
      // synthetic template through the same path.
      // Phase 2p.26 — custom-drawing flow shares the same dedicated handler;
      // the isCustomDrawingFlow flag is forwarded so the badge differs.
      if ((isCustomUploadFlow || isCustomDrawingFlow) && typeof p.onPlaceCustomUpload === 'function') {
        p.onPlaceCustomUpload(imageBase64, '', moodTag, subjectTags, !!isCustomDrawingFlow);
        return;
      }
      p.onPlace(template, slots, artStyleId, imageBase64, '', moodTag, subjectTags);
    }

    function handleSubmitReflection() {
      if ((isCustomUploadFlow || isCustomDrawingFlow) && typeof p.onPlaceCustomUpload === 'function') {
        p.onPlaceCustomUpload(imageBase64, reflectionDraft, moodTag, subjectTags, !!isCustomDrawingFlow);
        return;
      }
      p.onPlace(template, slots, artStyleId, imageBase64, reflectionDraft, moodTag, subjectTags);
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
        // Upload your own (Phase 2p.19) — alternative to AI generation
        typeof p.onPlaceCustomUpload === 'function' ? h('div', { style: { display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
          h('button', {
            onClick: function() {
              setIsCustomUploadFlow(true);
              setIsCustomDrawingFlow(false);
              setUploadData(null);
              setUploadError(null);
              setStep('upload');
            },
            style: {
              flex: '1 1 220px',
              display: 'flex', gap: '12px', alignItems: 'center',
              padding: '12px 14px',
              background: 'transparent',
              border: '1.5px dashed ' + palette.accent,
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: palette.text,
              textAlign: 'left'
            }
          },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '24px' } }, '📎'),
            h('span', { style: { flex: 1 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700 } }, 'Upload your own image'),
              h('div', { style: { fontSize: '11px', color: palette.textDim, marginTop: '2px' } },
                'A drawing, photo, or diagram. ' + DECORATION_COST + ' 🪙')
            )
          ),
          // Draw your own (Phase 2p.26) — canvas drawing alternative
          h('button', {
            onClick: function() {
              setIsCustomDrawingFlow(true);
              setIsCustomUploadFlow(false);
              setStep('draw');
            },
            style: {
              flex: '1 1 220px',
              display: 'flex', gap: '12px', alignItems: 'center',
              padding: '12px 14px',
              background: 'transparent',
              border: '1.5px dashed ' + palette.accent,
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: palette.text,
              textAlign: 'left'
            }
          },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '24px' } }, '✏️'),
            h('span', { style: { flex: 1 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700 } }, 'Draw your own'),
              h('div', { style: { fontSize: '11px', color: palette.textDim, marginTop: '2px' } },
                'Sketch a decoration right here. ' + DECORATION_COST + ' 🪙')
            )
          )
        ) : null,
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
    } else if (step === 'draw') {
      // Drawing canvas step (Phase 2p.26) — student draws on a 400×300
      // canvas. Brush + eraser + 12 colors + 3 sizes + undo/clear. On
      // confirm, the canvas is exported to PNG, charged 3 tokens, and
      // routed through the same reflect step (mood / subject / words).
      stepBody = h('div', null,
        h('button', {
          onClick: function() { setStep('pick-template'); setIsCustomDrawingFlow(false); },
          style: {
            background: 'transparent', color: palette.textDim, border: 'none',
            padding: '4px 0', fontSize: '12px', cursor: 'pointer',
            marginBottom: '10px', fontFamily: 'inherit'
          }
        }, '← Back to categories'),
        h('h4', { style: { margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700, color: palette.text } },
          '✏️ Draw your own'),
        h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '12px', lineHeight: '1.5' } },
          'Sketch anything — a plant, a creature, a logo, a feeling. Costs ' + DECORATION_COST + ' 🪙 tokens like generation.'),
        // Canvas
        h('div', {
          style: {
            display: 'flex', justifyContent: 'center',
            background: palette.surface, borderRadius: '10px',
            border: '1px solid ' + palette.border, padding: '8px',
            marginBottom: '10px'
          }
        },
          h('canvas', {
            ref: drawCanvasRef,
            'aria-label': 'Drawing canvas. Use a mouse, finger, or stylus to draw.',
            role: 'img',
            onPointerDown: handleDrawDown,
            onPointerMove: handleDrawMove,
            onPointerUp: handleDrawUp,
            onPointerCancel: handleDrawUp,
            onPointerLeave: handleDrawUp,
            style: {
              cursor: drawTool === 'eraser' ? 'cell' : 'crosshair',
              touchAction: 'none',
              borderRadius: '6px',
              maxWidth: '100%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }
          })
        ),
        // Tool row: brush / eraser
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px', flexWrap: 'wrap' } },
          h('button', {
            onClick: function() { setDrawTool('brush'); },
            'aria-pressed': drawTool === 'brush' ? 'true' : 'false',
            style: {
              background: drawTool === 'brush' ? palette.accent : 'transparent',
              color: drawTool === 'brush' ? palette.onAccent : palette.text,
              border: '1.5px solid ' + (drawTool === 'brush' ? palette.accent : palette.border),
              borderRadius: '999px', padding: '5px 14px',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '✏️ Brush'),
          h('button', {
            onClick: function() { setDrawTool('eraser'); },
            'aria-pressed': drawTool === 'eraser' ? 'true' : 'false',
            style: {
              background: drawTool === 'eraser' ? palette.accent : 'transparent',
              color: drawTool === 'eraser' ? palette.onAccent : palette.text,
              border: '1.5px solid ' + (drawTool === 'eraser' ? palette.accent : palette.border),
              borderRadius: '999px', padding: '5px 14px',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '🩹 Eraser'),
          h('button', {
            onClick: undoDraw,
            disabled: drawHistoryRef.current.length < 2,
            style: {
              background: 'transparent', color: palette.text,
              border: '1.5px solid ' + palette.border,
              borderRadius: '999px', padding: '5px 14px',
              fontSize: '12px', fontWeight: 600,
              cursor: drawHistoryRef.current.length < 2 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: drawHistoryRef.current.length < 2 ? 0.5 : 1
            }
          }, '↶ Undo'),
          h('button', {
            onClick: clearDraw,
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1.5px solid ' + palette.border,
              borderRadius: '999px', padding: '5px 14px',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '✕ Clear')
        ),
        // Brush-size row
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' } },
          h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '4px' } }, 'Size'),
          [2, 4, 8, 14].map(function(sz) {
            var active = drawSize === sz;
            return h('button', {
              key: 'sz-' + sz,
              onClick: function() { setDrawSize(sz); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': 'Brush size ' + sz,
              style: {
                width: '34px', height: '34px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: active ? palette.surface : 'transparent',
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '8px',
                cursor: 'pointer', fontFamily: 'inherit'
              }
            },
              h('span', {
                'aria-hidden': 'true',
                style: {
                  display: 'inline-block',
                  width: Math.min(sz * 1.6, 22) + 'px',
                  height: Math.min(sz * 1.6, 22) + 'px',
                  borderRadius: '50%',
                  background: drawTool === 'eraser' ? palette.textMute : drawColor
                }
              })
            );
          })
        ),
        // Color palette
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' } },
          h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '4px' } }, 'Color'),
          DRAW_PALETTE.map(function(c) {
            var active = drawColor === c && drawTool === 'brush';
            return h('button', {
              key: 'col-' + c,
              onClick: function() { setDrawColor(c); setDrawTool('brush'); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': 'Color ' + c,
              title: c,
              style: {
                width: '24px', height: '24px',
                background: c,
                border: active ? '2.5px solid ' + palette.accent : '1.5px solid ' + palette.border,
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                boxShadow: active ? '0 0 0 2px ' + palette.bg + ' inset' : 'none'
              }
            });
          })
        ),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' } },
          h('button', {
            onClick: function() { setStep('pick-template'); setIsCustomDrawingFlow(false); },
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1px solid ' + palette.border, borderRadius: '8px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Cancel'),
          h('button', {
            onClick: function() {
              if (!drawDirty) return;
              if (typeof p.onChargeForUpload !== 'function') return;
              if (!p.onChargeForUpload()) return;
              var dataUrl = exportDrawAsBase64();
              if (!dataUrl) return;
              setImageBase64(dataUrl);
              setHasGenerated(true);
              setStep('reflect');
            },
            disabled: !drawDirty || p.tokens < DECORATION_COST,
            style: {
              background: (drawDirty && p.tokens >= DECORATION_COST) ? palette.accent : palette.surface,
              color: (drawDirty && p.tokens >= DECORATION_COST) ? palette.onAccent : palette.textMute,
              border: 'none', borderRadius: '8px',
              padding: '8px 18px', fontSize: '13px', fontWeight: 700,
              cursor: (drawDirty && p.tokens >= DECORATION_COST) ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              opacity: (drawDirty && p.tokens >= DECORATION_COST) ? 1 : 0.6
            }
          }, p.tokens < DECORATION_COST ? 'Need ' + DECORATION_COST + ' 🪙' : (drawDirty ? 'Use this drawing · ' + DECORATION_COST + ' 🪙' : 'Draw something first'))
        )
      );
    } else if (step === 'upload') {
      // Custom upload step (Phase 2p.19) — file picker, preview, "use this image"
      // proceeds to the same reflect step the AI flow uses (mood + subject + reflection text).
      stepBody = h('div', null,
        h('button', {
          onClick: function() { setStep('pick-template'); setUploadData(null); setUploadError(null); setIsCustomUploadFlow(false); },
          style: {
            background: 'transparent', color: palette.textDim, border: 'none',
            padding: '4px 0', fontSize: '12px', cursor: 'pointer',
            marginBottom: '10px', fontFamily: 'inherit'
          }
        }, '← Back to categories'),
        h('h4', { style: { margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700, color: palette.text } },
          '📎 Upload your own image'),
        h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' } },
          'Pick an image from your device — JPEG, PNG, or WebP, under 5MB. It\'ll be resized to fit the room. Costs ' + DECORATION_COST + ' 🪙 tokens like AI generation.'),
        // File input (label-wrapped for keyboard accessibility)
        !uploadData ? h('label', {
          style: {
            display: 'flex', gap: '12px', alignItems: 'center',
            padding: '20px', background: palette.surface,
            border: '1.5px dashed ' + palette.accent, borderRadius: '10px',
            cursor: uploading ? 'wait' : 'pointer',
            color: palette.text,
            fontFamily: 'inherit'
          }
        },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '32px' } }, uploading ? '⏳' : '📂'),
          h('span', { style: { flex: 1 } },
            h('div', { style: { fontSize: '13px', fontWeight: 700, marginBottom: '2px' } },
              uploading ? 'Resizing your image…' : 'Click to choose an image'),
            h('div', { style: { fontSize: '11px', color: palette.textDim } },
              'Drawings, photos, diagrams — your choice')
          ),
          h('input', {
            type: 'file',
            accept: 'image/jpeg,image/png,image/webp',
            disabled: uploading,
            onChange: function(e) {
              var f = e.target.files && e.target.files[0];
              if (f) handleFileChosen(f);
            },
            style: { display: 'none' },
            'aria-label': 'Choose an image to upload'
          })
        ) : null,
        // Preview when data ready
        uploadData ? h('div', null,
          h('div', { style: { padding: '14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '10px', textAlign: 'center', marginBottom: '14px' } },
            h('img', {
              src: uploadData.base64,
              alt: 'Uploaded image preview',
              style: { maxWidth: '100%', maxHeight: '240px', borderRadius: '6px' }
            }),
            h('div', { style: { fontSize: '11px', color: palette.textMute, marginTop: '8px' } },
              uploadData.width + ' × ' + uploadData.height + ' (resized from ' + uploadData.originalWidth + ' × ' + uploadData.originalHeight + ')')
          ),
          h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' } },
            h('button', {
              onClick: function() { setUploadData(null); setUploadError(null); },
              style: {
                background: 'transparent', color: palette.textDim,
                border: '1px solid ' + palette.border, borderRadius: '8px',
                padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }
            }, 'Pick a different image'),
            h('button', {
              onClick: function() {
                if (typeof p.onChargeForUpload !== 'function') return;
                if (!p.onChargeForUpload()) return; // insufficient tokens
                // Set imageBase64 to the upload, jump to the reflect step
                setImageBase64(uploadData.base64);
                setHasGenerated(true);
                setStep('reflect');
              },
              style: {
                background: palette.accent, color: palette.onAccent,
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit'
              }
            }, 'Use this image · ' + DECORATION_COST + ' 🪙')
          )
        ) : null,
        uploadError ? h('p', {
          role: 'alert',
          style: { fontSize: '12px', color: '#dc2626', fontStyle: 'italic', marginTop: '12px' }
        }, uploadError) : null
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
        // Mood picker (Phase 2m) — optional affective-domain tag
        h('div', { style: { fontSize: '12px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', textAlign: 'center' } },
          'How did you feel earning this? (optional)'),
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '14px' } },
          MOOD_OPTIONS.map(function(m) {
            var active = moodTag === m.id;
            return h('button', {
              key: 'mood-' + m.id,
              onClick: function() { setMoodTag(active ? null : m.id); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': m.label + (active ? ' (selected, click to deselect)' : ''),
              title: m.hint,
              style: {
                background: active ? palette.accent : 'transparent',
                color: active ? palette.onAccent : palette.text,
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 140ms ease, background 140ms ease'
              }
            }, m.emoji + ' ' + m.label);
          })
        ),
        // Subject tags (Phase 2p.6) — multi-select. Maps to IEP areas.
        h('div', { style: { fontSize: '12px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', textAlign: 'center' } },
          'Subject? (multi-select, optional)'),
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '14px' } },
          SUBJECT_TAGS.map(function(s) {
            var active = subjectTags.indexOf(s.id) !== -1;
            return h('button', {
              key: 'subj-gen-' + s.id,
              onClick: function() { toggleSubject(s.id); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': s.label + (active ? ' (selected, click to deselect)' : ''),
              title: s.hint,
              style: {
                background: active ? palette.accent : 'transparent',
                color: active ? palette.onAccent : palette.text,
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 140ms ease, background 140ms ease'
              }
            }, s.emoji + ' ' + s.label);
          })
        ),
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
    var useRef = React.useRef;

    var palette = p.palette;
    var decoration = p.decoration;
    var existing = decoration && decoration.linkedContent;
    var hasContent = !!existing;

    // Voice note state (Phase 2p.15) — local-only; saved values come
    // from decoration.voiceNote, in-progress recording lives here.
    var voiceModeTuple = useState('idle'); // 'idle' | 'recording' | 'preview'
    var voiceMode = voiceModeTuple[0];
    var setVoiceMode = voiceModeTuple[1];
    var recordedTuple = useState(null); // { base64, durationMs }
    var recorded = recordedTuple[0];
    var setRecorded = recordedTuple[1];
    var recordSecondsTuple = useState(0);
    var recordSeconds = recordSecondsTuple[0];
    var setRecordSeconds = recordSecondsTuple[1];
    var voiceErrorTuple = useState(null);
    var voiceError = voiceErrorTuple[0];
    var setVoiceError = voiceErrorTuple[1];
    var mediaRecorderRef = useRef(null);
    var recordedChunksRef = useRef([]);
    var recordTimerRef = useRef(null);
    var recordStartedAtRef = useRef(0);
    var voicePanelOpenTuple = useState(false);
    var voicePanelOpen = voicePanelOpenTuple[0];
    var setVoicePanelOpen = voicePanelOpenTuple[1];

    // Smart deck import (Phase 2p.21) — lifted to MemoryModalInner top
    // so the hook order stays stable across edit/view/quiz mode toggles.
    var importPanelOpenTuple = useState(false);
    var importPanelOpen = importPanelOpenTuple[0];
    var setImportPanelOpen = importPanelOpenTuple[1];
    var importTextTuple = useState('');
    var importText = importTextTuple[0];
    var setImportText = importTextTuple[1];

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
      if (!existing) return;
      // Notes are only quizzable if they contain {cloze} markers
      if (existing.type === 'notes' && !hasClozeMarkers(existing)) return;
      setAutoQuizFired(true);
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
      } else if (type === 'image-link') {
        initialDraft = {
          type: 'image-link',
          data: { targetDecorationId: null, association: '', correctCount: 0, missCount: 0 }
        };
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
      } else if (draft.type === 'image-link') {
        var targetId = (draft.data && draft.data.targetDecorationId) || null;
        var assoc = (draft.data && draft.data.association || '').trim();
        if (!targetId) {
          alert('Pick a decoration to link to first.');
          return;
        }
        if (!assoc) {
          alert('Write a short association — what does this remind you of?');
          return;
        }
        var preserved = (existing && existing.type === 'image-link' && existing.data) || {};
        var cleaned3 = Object.assign({}, draft, { data: {
          targetDecorationId: targetId,
          association: assoc,
          correctCount: preserved.correctCount || 0,
          missCount:    preserved.missCount    || 0
        }});
        p.onSave(cleaned3);
      }
      setMode('view');
    }

    function startQuiz() {
      if (!existing || !existing.data) return;
      if (existing.type === 'flashcards') {
        var cards = (existing.data.cards || []).slice();
        // Smart shuffle: cards with the highest miss rate surface first.
        // Computes a "weakness score" per card, weighted random pick
        // each step (Fisher-Yates with score-bias). Falls back to pure
        // random for cards never quizzed before. Brand-new decks behave
        // identically to a vanilla shuffle.
        cards = smartShuffleCards(cards);
        // Reverse mode persists per-deck (saved on linkedContent.data.reverseMode)
        var reverseMode = !!(existing.data && existing.data.reverseMode);
        setQuiz({
          type: 'flashcards',
          cards: cards,
          currentIdx: 0,
          flipped: false,
          correct: 0,
          missed: 0,
          done: false,
          reverseMode: reverseMode,
          gradeLog: []
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
      } else if (existing.type === 'notes' && hasClozeMarkers(existing)) {
        var noteText = (existing.data && existing.data.text) || '';
        var answers = extractClozeAnswers(noteText);
        setQuiz({
          type: 'cloze',
          text: noteText,
          truthAnswers: answers,
          guesses: answers.map(function() { return ''; }),
          submitted: false,
          done: false
        });
        setMode('quiz');
      } else if (existing.type === 'image-link') {
        // Single-card retrieval. Student wrote the association themselves;
        // quiz is "do you remember what you connected this to?"
        setQuiz({
          type: 'image-link',
          truth: (existing.data && existing.data.association) || '',
          guess: '',
          revealed: false,
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
      // Notes get a Quiz tab only when they contain {cloze} markers.
      // Flashcards / acronyms / image-links always get one.
      var notesQuizzable = existing.type === 'notes' && hasClozeMarkers(existing);
      if (existing.type !== 'notes' || notesQuizzable) tabs.push({ id: 'quiz', label: 'Quiz' });
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
      // Image-link is only offered when at least one OTHER decoration exists
      // — there's no point linking to nothing.
      var otherDecorations = (p.allDecorations || []).filter(function(d) {
        return d.id !== decoration.id;
      });
      var canImageLink = otherDecorations.length > 0;
      var pickerCards = [
        { type: 'flashcards', icon: '📚', title: 'Flashcards', desc: 'Q&A pairs you study with. Best for vocab, definitions, formulas, key concepts.', mnemonic: 'active recall' },
        { type: 'acronym',    icon: '🔤', title: 'Acronym / list', desc: 'A word where each letter stands for something. Like "ROY G BIV" for rainbow colors.', mnemonic: 'chunking' },
        { type: 'notes',      icon: '📝', title: 'Free notes', desc: 'Plain text — for rhymes, story chains, mind maps, or anything that doesn\'t fit the others.', mnemonic: 'open expression' }
      ];
      if (canImageLink) {
        pickerCards.push({
          type: 'image-link', icon: '🔗',
          title: 'Image link',
          desc: 'Connect this decoration to another one with a personal association. Like "this dragon = mitosis" — pictures stick better than words.',
          mnemonic: 'visual association'
        });
      }
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
        // Mastery distribution summary — quick "how am I doing on this deck"
        var buckets = { green: 0, yellow: 0, red: 0, gray: 0 };
        cards.forEach(function(card) { buckets[cardMasteryBucket(card).id] += 1; });
        var hasAnyAttempts = cards.some(function(c) { return (c.correctCount || 0) + (c.missCount || 0) > 0; });
        return h('div', null,
          h('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }
          },
            h('span', { style: { fontSize: '12px', color: palette.textMute } },
              '📚 ' + cards.length + ' card' + (cards.length === 1 ? '' : 's')),
            // Mastery distribution chips — only if any cards have been quizzed
            hasAnyAttempts ? h('span', { style: { fontSize: '11px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
              buckets.green > 0 ? '🟢 ' + buckets.green + ' ' : '',
              buckets.yellow > 0 ? '🟡 ' + buckets.yellow + ' ' : '',
              buckets.red > 0 ? '🔴 ' + buckets.red + ' ' : '',
              buckets.gray > 0 ? '⚪ ' + buckets.gray : ''
            ) : null
          ),
          h('ol', { style: { paddingLeft: '20px', margin: 0, color: palette.text, fontSize: '13px', lineHeight: '1.6' } },
            cards.map(function(card) {
              var mastery = cardMasteryBucket(card);
              var attempts = (card.correctCount || 0) + (card.missCount || 0);
              return h('li', { key: card.id, style: { marginBottom: '10px' } },
                h('div', {
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }
                },
                  h('div', { style: { fontWeight: 600, flex: 1 } }, card.front),
                  // Per-card mastery indicator with attempt count
                  attempts > 0 ? h('span', {
                    'aria-label': mastery.label + ', ' + (card.correctCount || 0) + ' correct out of ' + attempts,
                    title: mastery.label + ' · ' + (card.correctCount || 0) + ' / ' + attempts + ' correct',
                    style: {
                      fontSize: '10px',
                      flexShrink: 0,
                      color: palette.textMute,
                      fontVariantNumeric: 'tabular-nums'
                    }
                  }, mastery.emoji + ' ' + (card.correctCount || 0) + '/' + attempts) : null
                ),
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
      if (lc.type === 'image-link') {
        var allDecs = p.allDecorations || [];
        var targetId = (lc.data && lc.data.targetDecorationId) || null;
        var target = allDecs.filter(function(d) { return d.id === targetId; })[0] || null;
        var assoc = (lc.data && lc.data.association) || '';
        var attempts = ((lc.data && lc.data.correctCount) || 0) + ((lc.data && lc.data.missCount) || 0);
        var pctCorrect = attempts > 0 ? Math.round(((lc.data.correctCount || 0) / attempts) * 100) : null;
        return h('div', null,
          h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
            '🔗 Image link'),
          // Side-by-side decoration preview with arrow between
          h('div', {
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '12px', marginBottom: '14px',
              padding: '14px', background: palette.surface,
              border: '1px solid ' + palette.border, borderRadius: '10px'
            }
          },
            h('div', { style: { textAlign: 'center', flex: '0 0 90px' } },
              decoration.imageBase64 ? h('img', {
                src: decoration.imageBase64, alt: '',
                style: { width: '90px', height: '90px', objectFit: 'contain', background: palette.bg, border: '1px solid ' + palette.border, borderRadius: '8px' }
              }) : null,
              h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '4px' } },
                decoration.templateLabel || decoration.template || 'this')
            ),
            h('div', { 'aria-hidden': 'true', style: { fontSize: '20px', color: palette.accent, fontWeight: 800 } }, '→'),
            h('div', { style: { textAlign: 'center', flex: '0 0 90px' } },
              target ? h('img', {
                src: target.imageBase64, alt: '',
                style: { width: '90px', height: '90px', objectFit: 'contain', background: palette.bg, border: '1px solid ' + palette.border, borderRadius: '8px' }
              }) : h('div', {
                style: { width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: palette.bg, border: '1px dashed ' + palette.border, borderRadius: '8px', color: palette.textMute, fontSize: '24px' }
              }, '?'),
              h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '4px' } },
                target ? (target.templateLabel || target.template || 'linked item') : '(removed)')
            )
          ),
          h('div', {
            style: {
              padding: '12px 14px',
              background: palette.surface,
              borderLeft: '3px solid ' + palette.accent,
              borderRadius: '0 8px 8px 0',
              fontSize: '13px',
              lineHeight: '1.6',
              color: palette.text,
              fontStyle: 'italic'
            }
          }, '"' + assoc + '"'),
          attempts > 0 ? h('div', {
            style: { marginTop: '10px', fontSize: '11px', color: palette.textMute, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }
          }, 'Recalled correctly ' + (lc.data.correctCount || 0) + ' / ' + attempts + ' times' + (pctCorrect !== null ? ' · ' + pctCorrect + '%' : '')) : null
        );
      }
      if (lc.type === 'notes') {
        var text = (lc.data && lc.data.text) || '';
        var clozeCount = extractClozeAnswers(text).length;
        // If cloze markers exist, render with the answers visually
        // highlighted so the View tab serves as the "answer key" while
        // the Quiz tab tests recall.
        if (clozeCount > 0) {
          var segments = buildClozeSegments(text);
          return h('div', null,
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textMute,
                marginBottom: '8px',
                fontStyle: 'italic'
              }
            }, '📝 ' + clozeCount + ' fill-in answer' + (clozeCount === 1 ? '' : 's') + ' below (highlighted)'),
            h('div', {
              style: {
                color: palette.text,
                fontSize: '13px',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }
            },
              segments.map(function(seg, i) {
                if (seg.kind === 'text') return h('span', { key: 'vs-' + i }, seg.value);
                return h('span', {
                  key: 'vs-' + i,
                  style: {
                    background: palette.accent,
                    color: palette.onAccent,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }
                }, seg.answer);
              })
            )
          );
        }
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
      if (draft.type === 'image-link') return h('div', null, renderImageLinkEditor(), removePanel, saveBar);
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
      // Drag-to-reorder (Phase 2p.24) — native HTML5 DnD between card rows.
      // Lets students sequence cards from foundational → advanced.
      function moveCard(fromIdx, toIdx) {
        if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
        if (fromIdx >= cards.length || toIdx >= cards.length) return;
        var newCards = cards.slice();
        var moved = newCards.splice(fromIdx, 1)[0];
        newCards.splice(toIdx, 0, moved);
        setDraft(Object.assign({}, draft, { data: { cards: newCards } }));
      }
      function clearAllCards() {
        if (window.confirm && !window.confirm('Remove all ' + cards.length + ' cards from this deck? Mastery stats are lost.')) return;
        setDraft(Object.assign({}, draft, { data: { cards: [
          { id: 'c-' + Date.now(), front: '', back: '', correctCount: 0, missCount: 0 }
        ] } }));
      }
      // Smart deck import (Phase 2p.21)
      var importParse = importText ? parseDeckText(importText) : null;
      function importAppend() {
        if (!importParse || importParse.pairs.length === 0) return;
        // Drop any existing fully-empty card before appending parsed pairs
        var keepers = cards.filter(function(c) { return (c.front || '').trim() || (c.back || '').trim(); });
        var newCards = keepers.concat(importParse.pairs.map(function(p, i) {
          return {
            id: 'c-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 1000),
            front: p.front, back: p.back,
            correctCount: 0, missCount: 0
          };
        }));
        setDraft(Object.assign({}, draft, { data: { cards: newCards } }));
        setImportText('');
        setImportPanelOpen(false);
      }
      function importReplace() {
        if (!importParse || importParse.pairs.length === 0) return;
        if (cards.length > 1 && window.confirm && !window.confirm('Replace all existing cards with the imported ones?')) return;
        var newCards = importParse.pairs.map(function(p, i) {
          return {
            id: 'c-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 1000),
            front: p.front, back: p.back,
            correctCount: 0, missCount: 0
          };
        });
        setDraft(Object.assign({}, draft, { data: { cards: newCards } }));
        setImportText('');
        setImportPanelOpen(false);
      }
      return h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
          h('div', { style: { fontSize: '11px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
            '📚 Flashcard deck · ' + cards.length + ' card' + (cards.length === 1 ? '' : 's')),
          h('div', { style: { display: 'flex', gap: '6px' } },
            h('button', {
              onClick: function() { setImportPanelOpen(!importPanelOpen); },
              'aria-pressed': importPanelOpen ? 'true' : 'false',
              'aria-label': importPanelOpen ? 'Close bulk import panel' : 'Bulk import from text',
              title: 'Paste a list of term-definition pairs to import many cards at once',
              style: {
                background: importPanelOpen ? palette.accent : 'transparent',
                color: importPanelOpen ? palette.onAccent : palette.textDim,
                border: '1px solid ' + (importPanelOpen ? palette.accent : palette.border),
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '📥 Import'),
            cards.length > 1 ? h('button', {
              onClick: clearAllCards,
              'aria-label': 'Remove all cards',
              title: 'Clear all cards (mastery stats are lost)',
              style: {
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '🗑 Clear all') : null
          )
        ),
        // Import panel
        importPanelOpen ? h('div', {
          role: 'region',
          'aria-label': 'Bulk import flashcards',
          style: { padding: '12px 14px', background: palette.surface, border: '1px dashed ' + palette.accent, borderRadius: '8px', marginBottom: '12px' }
        },
          h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '8px', lineHeight: '1.5' } },
            'Paste a list of term-definition pairs. Auto-detects formats:'),
          h('ul', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', paddingLeft: '18px', lineHeight: '1.5' } },
            h('li', null, h('code', { style: { background: palette.bg, padding: '0 4px', borderRadius: '3px' } }, 'term: definition'), ' (one per line)'),
            h('li', null, h('code', { style: { background: palette.bg, padding: '0 4px', borderRadius: '3px' } }, 'term — definition'), ' (em-dash)'),
            h('li', null, h('code', { style: { background: palette.bg, padding: '0 4px', borderRadius: '3px' } }, 'term \\t definition'), ' (tab-separated, e.g. spreadsheet paste)'),
            h('li', null, 'Lines starting with # are skipped (use for comments)')
          ),
          h('textarea', {
            value: importText,
            onChange: function(e) { setImportText(e.target.value); },
            placeholder: 'mitochondria: powerhouse of the cell\nphotosynthesis: how plants make energy from sunlight\n# you can comment lines like this',
            'aria-label': 'Bulk import text',
            rows: 6,
            style: {
              width: '100%',
              padding: '8px 10px',
              background: palette.bg,
              border: '1px solid ' + palette.border,
              borderRadius: '6px',
              color: palette.text,
              fontSize: '12px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              lineHeight: '1.5',
              resize: 'vertical'
            }
          }),
          // Preview
          importParse ? h('div', { style: { marginTop: '10px', fontSize: '11px', color: palette.textDim } },
            importParse.pairs.length > 0
              ? h('span', null,
                  h('span', { style: { color: palette.accent, fontWeight: 700 } }, '✓ ' + importParse.pairs.length + ' card' + (importParse.pairs.length === 1 ? '' : 's') + ' detected'),
                  ' (format: ' + importParse.format + ')'
                )
              : h('span', { style: { color: palette.textMute, fontStyle: 'italic' } }, 'No card pairs detected yet — keep typing or check the format.')
          ) : null,
          // Action buttons
          importParse && importParse.pairs.length > 0 ? h('div', {
            style: { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }
          },
            h('button', {
              onClick: function() { setImportText(''); setImportPanelOpen(false); },
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Cancel'),
            h('button', {
              onClick: importAppend,
              style: { background: 'transparent', color: palette.accent, border: '1px solid ' + palette.accent, borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
            }, '+ Append'),
            h('button', {
              onClick: importReplace,
              style: { background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Replace all')
          ) : null
        ) : null,
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          cards.map(function(card, idx) {
            return h('div', {
              key: card.id,
              // Phase 2p.24 — drag-to-reorder. Drop anywhere on a row
              // moves the dragged card to that position.
              draggable: cards.length > 1 ? true : false,
              onDragStart: function(e) {
                if (cards.length <= 1) { e.preventDefault(); return; }
                try {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(idx));
                } catch (err) { /* IE quirks */ }
              },
              onDragOver: function(e) {
                if (cards.length <= 1) return;
                e.preventDefault();
                try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
              },
              onDrop: function(e) {
                if (cards.length <= 1) return;
                e.preventDefault();
                var fromIdx;
                try { fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10); } catch (err) { return; }
                if (isNaN(fromIdx) || fromIdx === idx) return;
                moveCard(fromIdx, idx);
              },
              style: {
                padding: '10px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '8px',
                cursor: cards.length > 1 ? 'grab' : 'default'
              }
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700 } },
                  // Phase 2p.24 — drag handle visual hint when reorder is possible
                  cards.length > 1 ? '⋮⋮ Card ' + (idx + 1) : 'Card ' + (idx + 1)),
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
      var clozeCount = extractClozeAnswers(text).length;
      function updateText(val) {
        setDraft(Object.assign({}, draft, { data: { text: val } }));
      }
      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          '📝 Free notes'),
        h('p', {
          style: { fontSize: '12px', color: palette.textDim, marginBottom: '8px', lineHeight: '1.5' }
        }, 'Whatever helps you remember. A rhyme. A story chain. A diagram in text. Lyrics. Whatever.'),
        // Cloze-syntax hint card — teaches the {braces} mechanic in the
        // editor itself. Subtle so it doesn\'t feel like a tutorial,
        // but visible enough that students notice the feature exists.
        h('div', {
          style: {
            fontSize: '11px',
            color: palette.textDim,
            background: palette.surface,
            border: '1px dashed ' + palette.border,
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '10px',
            lineHeight: '1.5'
          }
        },
          h('strong', { style: { color: palette.accent } }, '✨ Tip: '),
          'Wrap any word in ',
          h('code', { style: { background: palette.bg, padding: '0 4px', borderRadius: '3px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }, '{curly braces}'),
          ' to turn it into a fill-in-the-blank. e.g. ',
          h('em', null, '"The mitochondria is the {powerhouse} of the {cell}."'),
          ' adds a Quiz tab.'
        ),
        h('textarea', {
          value: text,
          onChange: function(e) { updateText(e.target.value); },
          placeholder: 'Write your notes here. Use {braces} for fill-in-the-blank quiz mode.',
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
          style: {
            fontSize: '11px',
            color: palette.textMute,
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between'
          }
        },
          h('span', null,
            clozeCount > 0
              ? h('span', { style: { color: palette.accent, fontWeight: 700 } },
                  '✓ ' + clozeCount + ' blank' + (clozeCount === 1 ? '' : 's') + ' detected — Quiz tab will appear after save')
              : 'No {braces} yet — Notes tab only, no quiz'
          ),
          h('span', null, text.length + ' character' + (text.length === 1 ? '' : 's'))
        )
      );
    }

    // Image-link editor — pick a target decoration via thumbnail grid, then
    // type the personal association. Decorations grid excludes self
    // (can\'t link to itself) and starter fern is fair game (good visual
    // hook — most students see it every day).
    function renderImageLinkEditor() {
      var allDecs = (p.allDecorations || []).filter(function(d) { return d.id !== decoration.id; });
      var data = (draft && draft.data) || {};
      var targetId = data.targetDecorationId || null;
      var assoc = data.association || '';

      function pickTarget(id) {
        setDraft(Object.assign({}, draft, { data: Object.assign({}, draft.data, { targetDecorationId: id }) }));
      }
      function updateAssoc(val) {
        setDraft(Object.assign({}, draft, { data: Object.assign({}, draft.data, { association: val }) }));
      }

      if (allDecs.length === 0) {
        return h('div', null,
          h('p', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.55', textAlign: 'center', padding: '20px' } },
            'You only have one decoration so far. Add another decoration to your room — then come back and link them.')
        );
      }
      var selected = allDecs.filter(function(d) { return d.id === targetId; })[0] || null;

      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } },
          '🔗 Image link'),
        h('p', {
          style: { fontSize: '12px', color: palette.textDim, marginBottom: '10px', lineHeight: '1.5' }
        }, 'Pictures stick better than words. Connect this decoration to another one with a personal association — the weirder, the better. "This dragon = mitosis because both split apart." That\'s how visual mnemonics work.'),
        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '6px', fontWeight: 600 } },
          '1. Pick a decoration to link to'),
        h('div', {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            marginBottom: '14px',
            maxHeight: '180px',
            overflowY: 'auto'
          }
        },
          allDecs.map(function(d) {
            var isSel = d.id === targetId;
            var dLabel = d.templateLabel || d.template || 'item';
            return h('button', {
              key: 'tgt-' + d.id,
              type: 'button',
              onClick: function() { pickTarget(d.id); },
              'aria-pressed': isSel,
              'aria-label': 'Link to ' + dLabel + (isSel ? ' (selected)' : ''),
              title: dLabel,
              style: {
                width: '64px',
                height: '64px',
                padding: 0,
                background: palette.bg,
                border: isSel ? ('2.5px solid ' + palette.accent) : ('1.5px solid ' + palette.border),
                borderRadius: '8px',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                fontFamily: 'inherit'
              }
            },
              d.imageBase64 ? h('img', {
                src: d.imageBase64, alt: '',
                style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' }
              }) : h('span', { style: { fontSize: '20px', color: palette.textMute } }, '?'),
              isSel ? h('span', {
                'aria-hidden': 'true',
                style: {
                  position: 'absolute', top: 0, right: 0,
                  background: palette.accent, color: palette.onAccent,
                  fontSize: '10px', fontWeight: 800,
                  padding: '1px 5px', borderRadius: '0 6px 0 6px',
                  lineHeight: 1.2
                }
              }, '✓') : null
            );
          })
        ),
        // Live preview of the association once a target is selected
        selected ? h('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', marginBottom: '12px',
            padding: '10px', background: palette.surface,
            border: '1px dashed ' + palette.border, borderRadius: '8px'
          }
        },
          h('div', { style: { textAlign: 'center', flex: '0 0 64px' } },
            decoration.imageBase64 ? h('img', {
              src: decoration.imageBase64, alt: '',
              style: { width: '64px', height: '64px', objectFit: 'contain', borderRadius: '6px', background: palette.bg }
            }) : null
          ),
          h('span', { 'aria-hidden': 'true', style: { fontSize: '18px', color: palette.accent } }, '→'),
          h('div', { style: { textAlign: 'center', flex: '0 0 64px' } },
            selected.imageBase64 ? h('img', {
              src: selected.imageBase64, alt: '',
              style: { width: '64px', height: '64px', objectFit: 'contain', borderRadius: '6px', background: palette.bg }
            }) : null
          )
        ) : null,
        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '6px', fontWeight: 600 } },
          '2. Write the association — what does this remind you of?'),
        h('textarea', {
          value: assoc,
          onChange: function(e) { updateAssoc(e.target.value); },
          placeholder: 'e.g. "the dragon = mitosis (both split apart and grow stronger)"',
          'aria-label': 'Image-link association',
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
            boxSizing: 'border-box',
            resize: 'vertical',
            lineHeight: '1.5'
          }
        }),
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginTop: '6px', fontStyle: 'italic' } },
          'Quiz mode shows the first decoration and asks you to recall the association. Forgiving substring matching, like flashcards.')
      );
    }

    function renderQuizMode() {
      if (!quiz) return null;
      if (quiz.finished) {
        return renderQuizResult();
      }
      if (quiz.type === 'flashcards') return renderQuizFlashcards();
      if (quiz.type === 'acronym')    return renderQuizAcronym();
      if (quiz.type === 'cloze')      return renderQuizCloze();
      if (quiz.type === 'image-link') return renderQuizImageLink();
      return null;
    }

    // Cloze quiz — fill in the {braced} blanks from notes. All blanks
    // shown at once with the surrounding context visible — students see
    // the sentence shape, type the missing word(s), submit once for
    // graded feedback. Forgiving substring match like the acronym quiz.
    function renderQuizCloze() {
      var segments = buildClozeSegments(quiz.text);
      var totalBlanks = quiz.truthAnswers.length;
      if (totalBlanks === 0) {
        return h('p', { style: { color: palette.textMute, padding: '12px', textAlign: 'center' } },
          'No {braced} answers found in this note. Add some {curly braces} around words to make a cloze quiz.');
      }
      function updateGuess(blankIdx, val) {
        var newGuesses = quiz.guesses.slice();
        newGuesses[blankIdx] = val;
        setQuiz(Object.assign({}, quiz, { guesses: newGuesses }));
      }
      function submit() {
        var correctCount = 0;
        for (var i = 0; i < totalBlanks; i++) {
          if (clozeAnswerCorrect(quiz.truthAnswers[i], quiz.guesses[i])) correctCount++;
        }
        finishQuiz(correctCount, totalBlanks);
      }

      // Inline input style — matches the surrounding text size
      var inputStyle = {
        background: palette.surface,
        border: '1px solid ' + palette.border,
        borderRadius: '4px',
        color: palette.text,
        padding: '2px 8px',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        margin: '0 2px',
        minWidth: '70px'
      };

      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textAlign: 'center' } },
          'Fill in the blanks · ' + totalBlanks + ' answer' + (totalBlanks === 1 ? '' : 's')),
        h('div', {
          style: {
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '10px',
            padding: '16px 18px',
            fontSize: '15px',
            lineHeight: '2.0',
            color: palette.text,
            marginBottom: '14px',
            wordBreak: 'break-word'
          }
        },
          segments.map(function(seg, i) {
            if (seg.kind === 'text') {
              return h('span', { key: 'cs-' + i, style: { whiteSpace: 'pre-wrap' } }, seg.value);
            }
            // blank
            return h('input', {
              key: 'cs-' + i,
              type: 'text',
              value: quiz.guesses[seg.blankIdx] || '',
              onChange: function(e) { updateGuess(seg.blankIdx, e.target.value); },
              'aria-label': 'Blank ' + (seg.blankIdx + 1) + ' of ' + totalBlanks,
              placeholder: '___',
              style: inputStyle
            });
          })
        ),
        h('div', { style: { display: 'flex', gap: '10px' } },
          h('button', {
            onClick: function() { setMode('view'); setQuiz(null); },
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
          }, 'Cancel'),
          h('button', {
            onClick: submit,
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
          }, 'Check answers')
        )
      );
    }

    function renderQuizFlashcards() {
      var cards = quiz.cards;
      if (!cards || cards.length === 0) {
        return h('p', { style: { color: palette.textMute, padding: '12px', textAlign: 'center' } }, 'No cards to quiz on.');
      }
      var card = cards[quiz.currentIdx];
      var progress = (quiz.currentIdx + 1) + ' / ' + cards.length;

      // Reverse mode swaps which side shows first. Bidirectional drilling
      // is a known retention boost — students who only see Front→Back
      // often can't go in the other direction.
      var rev = !!quiz.reverseMode;
      var firstSide  = rev ? card.back : card.front;
      var secondSide = rev ? card.front : card.back;
      var firstLabel  = rev ? 'Back (now shown first)' : 'Front';
      var secondLabel = rev ? 'Front' : 'Back';

      function flip() { setQuiz(Object.assign({}, quiz, { flipped: true })); }
      function toggleReverse() {
        // Persist per-deck: writes through to linkedContent.data.reverseMode
        // so it sticks across sessions. Resets the in-progress quiz.
        var newMode = !rev;
        var newData = Object.assign({}, existing.data, { reverseMode: newMode });
        p.onSave({ type: 'flashcards', data: newData });
        // Restart quiz with the new direction (don't lose card list, just
        // flip side semantics)
        setQuiz(Object.assign({}, quiz, {
          reverseMode: newMode,
          flipped: false,
          currentIdx: 0,
          correct: 0,
          missed: 0,
          gradeLog: []
        }));
      }
      function gradeAndAdvance(gotIt) {
        var nextIdx = quiz.currentIdx + 1;
        var newCorrect = quiz.correct + (gotIt ? 1 : 0);
        var newMissed = quiz.missed + (gotIt ? 0 : 1);
        // Track which card got which grade so we can persist stats at
        // quiz finish. Quiz state holds the live shuffle; the persistent
        // record (decoration.linkedContent.data.cards) gets updated once
        // at the end so we don't write to localStorage every keystroke.
        var newGradeLog = (quiz.gradeLog || []).concat([{ cardId: card.id, gotIt: gotIt }]);
        if (nextIdx >= cards.length) {
          // Persist per-card stats before scoring
          persistCardStats(newGradeLog);
          finishQuiz(newCorrect, cards.length);
        } else {
          setQuiz(Object.assign({}, quiz, {
            currentIdx: nextIdx,
            flipped: false,
            correct: newCorrect,
            missed: newMissed,
            gradeLog: newGradeLog
          }));
        }
      }

      // Update correctCount / missCount on each card in the persistent
      // deck. Aggregates the quiz-session grade log + writes through
      // to linkedContent.data.cards. Preserves card order; doesn't
      // touch reverseMode or other deck-level fields.
      function persistCardStats(gradeLog) {
        var existingCards = (existing.data && existing.data.cards) || [];
        var statsById = {};
        gradeLog.forEach(function(entry) {
          if (!statsById[entry.cardId]) statsById[entry.cardId] = { c: 0, m: 0 };
          if (entry.gotIt) statsById[entry.cardId].c += 1;
          else             statsById[entry.cardId].m += 1;
        });
        var updatedCards = existingCards.map(function(c) {
          var delta = statsById[c.id];
          if (!delta) return c;
          return Object.assign({}, c, {
            correctCount: (c.correctCount || 0) + delta.c,
            missCount:    (c.missCount    || 0) + delta.m
          });
        });
        var newData = Object.assign({}, existing.data, { cards: updatedCards });
        p.onSave({ type: 'flashcards', data: newData });
      }

      return h('div', null,
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }
        },
          h('span', { style: { fontSize: '11px', color: palette.textMute } },
            'Card ' + progress),
          // Reverse-mode toggle — small chip; clearly labels current
          // direction. Click to flip + restart the quiz from the start.
          h('button', {
            onClick: toggleReverse,
            'aria-pressed': rev ? 'true' : 'false',
            'aria-label': 'Toggle quiz direction · currently ' + (rev ? 'back to front' : 'front to back'),
            title: 'Switch direction (Front↔Back)',
            style: {
              background: rev ? palette.accent : 'transparent',
              color: rev ? palette.onAccent : palette.textDim,
              border: '1px solid ' + (rev ? palette.accent : palette.border),
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em'
            }
          }, rev ? '↺ Back → Front' : '↻ Reverse direction')
        ),
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
              quiz.flipped ? secondLabel : firstLabel),
            h('div', { style: { fontSize: '17px', fontWeight: 700, color: palette.text, lineHeight: '1.4' } },
              quiz.flipped ? secondSide : firstSide)
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

      // Voice input (Phase 2p.20) — speech-to-text fills the current
      // guess, replacing whatever was typed. Hidden when Web Speech
      // unavailable. Already-recording state shown with red mic.
      function handleVoiceForAcronym() {
        if (!p.startVoice) return;
        if (p.isRecording) { p.stopVoice && p.stopVoice(); return; }
        p.startVoice(function(transcript) {
          updateGuess((transcript || '').trim());
        });
      }
      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '10px', textAlign: 'center' } },
          'Letter ' + (idx + 1) + ' / ' + quiz.letters.length),
        h('div', { style: { fontSize: '64px', fontWeight: 800, color: palette.accent, textAlign: 'center', marginBottom: '14px', letterSpacing: '0.04em' } },
          letter),
        h('div', { style: { position: 'relative', marginBottom: '14px' } },
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
              paddingRight: p.speechSupported ? '46px' : '12px',
              background: palette.surface,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              color: palette.text,
              fontSize: '15px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }
          }),
          // Voice button — only shown when Web Speech is supported
          p.speechSupported ? h('button', {
            onClick: handleVoiceForAcronym,
            'aria-pressed': p.isRecording ? 'true' : 'false',
            'aria-label': p.isRecording ? 'Stop voice recording' : 'Speak your answer',
            title: p.isRecording ? 'Recording — click to stop' : 'Speak your answer (voice-to-text)',
            style: {
              position: 'absolute',
              top: '6px', right: '6px',
              width: '32px', height: '32px',
              borderRadius: '50%',
              background: p.isRecording ? '#dc2626' : 'transparent',
              border: '1px solid ' + (p.isRecording ? '#dc2626' : palette.border),
              color: p.isRecording ? '#fff' : palette.textDim,
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            },
            className: p.isRecording ? 'ah-record-pulse' : ''
          }, '🎤') : null
        ),
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

    // Image-link quiz — show this decoration big, ask student to recall
    // the association they wrote. Single-card retrieval. Reveal-and-grade
    // pattern (no auto-grading by string match — the association is the
    // student\'s own personal phrasing; substring match is informational
    // only, the student self-grades like flashcards).
    function renderQuizImageLink() {
      var allDecs = p.allDecorations || [];
      var lc = existing;
      var data = (lc && lc.data) || {};
      var target = allDecs.filter(function(d) { return d.id === data.targetDecorationId; })[0] || null;
      var truth = quiz.truth || '';
      var guess = quiz.guess || '';
      var revealed = !!quiz.revealed;

      function updateGuess(val) { setQuiz(Object.assign({}, quiz, { guess: val })); }
      function reveal() { setQuiz(Object.assign({}, quiz, { revealed: true })); }
      function grade(gotIt) {
        // Persist correctCount/missCount on the linkedContent.data so the
        // image-link tracks its own per-decoration accuracy.
        var newCorrect = (data.correctCount || 0) + (gotIt ? 1 : 0);
        var newMiss    = (data.missCount    || 0) + (gotIt ? 0 : 1);
        var newData = Object.assign({}, data, { correctCount: newCorrect, missCount: newMiss });
        p.onSave({ type: 'image-link', data: newData });
        finishQuiz(gotIt ? 1 : 0, 1);
      }

      // Auto-substring hint (informational only — student self-grades)
      var looksRight = guess.trim().length > 0 && clozeAnswerCorrect(truth, guess);

      return h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '14px', textAlign: 'center' } },
          'What did you connect this decoration to?'),
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', marginBottom: '14px'
          }
        },
          h('div', { style: { textAlign: 'center', flex: '0 0 110px' } },
            decoration.imageBase64 ? h('img', {
              src: decoration.imageBase64, alt: '',
              style: { width: '110px', height: '110px', objectFit: 'contain', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '10px' }
            }) : null
          ),
          h('div', { 'aria-hidden': 'true', style: { fontSize: '24px', color: palette.accent, fontWeight: 800 } }, '→'),
          h('div', { style: { textAlign: 'center', flex: '0 0 110px' } },
            revealed && target && target.imageBase64 ? h('img', {
              src: target.imageBase64, alt: '',
              style: { width: '110px', height: '110px', objectFit: 'contain', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '10px' }
            }) : h('div', {
              style: {
                width: '110px', height: '110px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: palette.surface, border: '1px dashed ' + palette.border,
                borderRadius: '10px', color: palette.textMute, fontSize: '36px'
              }
            }, '?')
          )
        ),
        !revealed ? h('div', null,
          h('div', { style: { position: 'relative', marginBottom: '10px' } },
            h('input', {
              type: 'text',
              value: guess,
              onChange: function(e) { updateGuess(e.target.value); },
              placeholder: 'Type what this reminds you of…',
              'aria-label': 'Your recall of the association',
              autoFocus: true,
              onKeyDown: function(e) {
                if (e.key === 'Enter') { e.preventDefault(); reveal(); }
              },
              style: {
                width: '100%',
                padding: '10px 12px',
                paddingRight: p.speechSupported ? '46px' : '12px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '8px',
                color: palette.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }
            }),
            // Voice button (Phase 2p.20)
            p.speechSupported ? h('button', {
              onClick: function() {
                if (!p.startVoice) return;
                if (p.isRecording) { p.stopVoice && p.stopVoice(); return; }
                p.startVoice(function(transcript) {
                  updateGuess((transcript || '').trim());
                });
              },
              'aria-pressed': p.isRecording ? 'true' : 'false',
              'aria-label': p.isRecording ? 'Stop voice recording' : 'Speak your answer',
              title: p.isRecording ? 'Recording — click to stop' : 'Speak your answer (voice-to-text)',
              style: {
                position: 'absolute',
                top: '6px', right: '6px',
                width: '32px', height: '32px',
                borderRadius: '50%',
                background: p.isRecording ? '#dc2626' : 'transparent',
                border: '1px solid ' + (p.isRecording ? '#dc2626' : palette.border),
                color: p.isRecording ? '#fff' : palette.textDim,
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              },
              className: p.isRecording ? 'ah-record-pulse' : ''
            }, '🎤') : null
          ),
          h('div', { style: { display: 'flex', gap: '10px' } },
            h('button', {
              onClick: function() { setMode('view'); setQuiz(null); },
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
            }, 'Cancel'),
            h('button', {
              onClick: reveal,
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
            }, 'Reveal answer')
          )
        ) : h('div', null,
          h('div', {
            style: {
              padding: '12px 14px',
              background: palette.surface,
              borderLeft: '3px solid ' + palette.accent,
              borderRadius: '0 8px 8px 0',
              fontSize: '13px',
              lineHeight: '1.6',
              color: palette.text,
              fontStyle: 'italic',
              marginBottom: '8px'
            }
          }, '"' + truth + '"'),
          guess.trim().length > 0 ? h('div', {
            style: {
              fontSize: '11px',
              color: looksRight ? (palette.success || palette.accent) : palette.textMute,
              marginBottom: '14px',
              textAlign: 'center',
              fontStyle: 'italic'
            }
          }, 'Your guess: "' + guess + '"' + (looksRight ? ' · close match!' : '')) : h('div', {
            style: { fontSize: '11px', color: palette.textMute, marginBottom: '14px', textAlign: 'center', fontStyle: 'italic' }
          }, '(no guess typed)'),
          h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '8px', textAlign: 'center' } },
            'Did you remember it?'),
          h('div', { style: { display: 'flex', gap: '10px' } },
            h('button', {
              onClick: function() { grade(false); },
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
            }, '✗ Not quite'),
            h('button', {
              onClick: function() { grade(true); },
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
            }, '✓ Got it')
          )
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
      // Phase 2p.9 — when this quiz is part of a review queue, swap the
      // bottom buttons for "Next deck" / "Stop queue" so the student
      // moves through the queue naturally instead of returning to view.
      var inQueue = !!(p.queueInfo && typeof p.onAdvanceQueue === 'function');
      var queueLabel = inQueue
        ? 'Deck ' + p.queueInfo.current + ' of ' + p.queueInfo.total + ' done'
        : null;
      return h('div', { style: { textAlign: 'center', padding: '20px 0' } },
        inQueue ? h('div', {
          style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }
        }, queueLabel) : null,
        h('div', { 'aria-hidden': 'true', style: { fontSize: '56px', marginBottom: '10px' } }, emoji),
        h('div', { style: { fontSize: '32px', fontWeight: 800, color: palette.accent, fontVariantNumeric: 'tabular-nums' } },
          pct + '%'),
        h('div', { style: { fontSize: '13px', color: palette.textDim, marginTop: '6px' } },
          quiz.correctCount + ' of ' + quiz.totalCount + ' correct'),
        h('p', { style: { fontSize: '13px', color: palette.textDim, marginTop: '14px', lineHeight: '1.55' } }, msg),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '18px' } },
          inQueue ? [
            h('button', {
              key: 'q-stop',
              onClick: p.onClose,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Stop queue'),
            h('button', {
              key: 'q-next',
              onClick: function() { p.onAdvanceQueue(pct); },
              style: { background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
            }, p.queueInfo.current >= p.queueInfo.total ? '✓ Finish queue' : 'Next deck ▶')
          ] : [
            h('button', {
              key: 'done',
              onClick: function() { setMode('view'); setQuiz(null); },
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Done'),
            h('button', {
              key: 'again',
              onClick: startQuiz,
              style: { background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Quiz again')
          ]
        )
      );
    }

    // ── Voice note recording (Phase 2p.15) ──
    function blobToBase64(blob) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function() {
          // result is "data:audio/webm;base64,XXXX" — keep the full data URI
          // so playback can use it directly as <audio src>
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    function startRecording() {
      setVoiceError(null);
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError('Voice recording isn\'t supported on this browser.');
        return;
      }
      if (typeof window.MediaRecorder === 'undefined') {
        setVoiceError('Voice recording isn\'t supported on this browser.');
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        recordedChunksRef.current = [];
        // Prefer webm/opus; fall back to default if unsupported
        var mimeType = '';
        try {
          if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          }
        } catch (e) { /* ignore */ }
        var rec;
        try {
          rec = mimeType ? new window.MediaRecorder(stream, { mimeType: mimeType }) : new window.MediaRecorder(stream);
        } catch (e) {
          rec = new window.MediaRecorder(stream);
        }
        mediaRecorderRef.current = rec;
        rec.ondataavailable = function(e) {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        rec.onstop = function() {
          // Stop all tracks to release the mic
          try { stream.getTracks().forEach(function(t) { t.stop(); }); } catch (e) {}
          var blob = new Blob(recordedChunksRef.current, { type: rec.mimeType || 'audio/webm' });
          var elapsed = Date.now() - recordStartedAtRef.current;
          blobToBase64(blob).then(function(base64) {
            setRecorded({ base64: base64, durationMs: elapsed });
            setVoiceMode('preview');
          }).catch(function() {
            setVoiceError('Could not save the recording. Try again.');
            setVoiceMode('idle');
          });
        };
        recordStartedAtRef.current = Date.now();
        setRecordSeconds(0);
        rec.start();
        setVoiceMode('recording');
        // Tick every 250ms; auto-stop at 30 seconds
        recordTimerRef.current = setInterval(function() {
          var sec = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
          setRecordSeconds(sec);
          if (sec >= 30) stopRecording();
        }, 250);
      }).catch(function() {
        setVoiceError('Microphone access denied. You can enable it in browser settings.');
      });
    }
    function stopRecording() {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      var rec = mediaRecorderRef.current;
      if (rec && rec.state === 'recording') {
        try { rec.stop(); } catch (e) {}
      }
    }
    function discardRecording() {
      setRecorded(null);
      setVoiceMode('idle');
      setRecordSeconds(0);
    }
    function saveRecording() {
      if (!recorded || typeof p.onSaveVoiceNote !== 'function') return;
      p.onSaveVoiceNote(recorded.base64, recorded.durationMs);
      setRecorded(null);
      setVoiceMode('idle');
      setRecordSeconds(0);
      setVoicePanelOpen(false);
    }
    // Cleanup on unmount: stop any in-progress recording
    useEffect(function() {
      return function() {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        var rec = mediaRecorderRef.current;
        if (rec && rec.state === 'recording') {
          try { rec.stop(); } catch (e) {}
        }
      };
    }, []);

    function renderVoiceNotePanel() {
      var savedNote = decoration.voiceNote;
      var hasNote = !!(savedNote && savedNote.base64);
      // If panel collapsed, just show the toggle button
      if (!voicePanelOpen) return null;
      return h('div', {
        role: 'region',
        'aria-label': 'Voice note',
        style: {
          marginTop: '12px',
          marginBottom: '12px',
          padding: '12px 14px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '10px'
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' } },
          h('span', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' } },
            '🎤 Voice note'),
          h('button', {
            onClick: function() { setVoicePanelOpen(false); },
            'aria-label': 'Close voice note panel',
            style: { background: 'transparent', border: 'none', color: palette.textMute, fontSize: '11px', cursor: 'pointer' }
          }, '✕')
        ),
        // Existing saved note — show playback + replace + delete
        hasNote && voiceMode === 'idle' ? h('div', null,
          h('audio', {
            src: savedNote.base64,
            controls: true,
            style: { width: '100%', marginBottom: '8px' }
          }),
          h('div', { style: { fontSize: '10px', color: palette.textMute, marginBottom: '8px', fontStyle: 'italic' } },
            'Recorded ' + new Date(savedNote.recordedAt).toLocaleString()
            + ' · ' + Math.round((savedNote.durationMs || 0) / 1000) + 's'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
              onClick: startRecording,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
            }, '🎤 Replace'),
            h('button', {
              onClick: function() {
                if (window.confirm && !window.confirm('Delete this voice note?')) return;
                if (typeof p.onClearVoiceNote === 'function') p.onClearVoiceNote();
              },
              style: { background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
            }, '🗑 Delete')
          )
        ) : null,
        // Idle, no saved note — show record button
        !hasNote && voiceMode === 'idle' ? h('div', null,
          h('p', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.5', margin: '0 0 10px 0' } },
            'Up to 30 seconds. Talk about what this decoration means to you, or quiz yourself out loud.'),
          h('button', {
            onClick: startRecording,
            style: Object.assign({}, primaryBtnStyle(palette), { padding: '8px 18px', fontSize: '13px' })
          }, '🎤 Start recording')
        ) : null,
        // Recording — show timer + stop
        voiceMode === 'recording' ? h('div', { style: { textAlign: 'center', padding: '6px 0' } },
          h('div', {
            'aria-live': 'polite', 'aria-atomic': 'true',
            style: { fontSize: '32px', fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }
          }, '● ' + recordSeconds + 's'),
          h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '12px' } }, 'Recording — auto-stops at 30s'),
          h('button', {
            onClick: stopRecording,
            style: Object.assign({}, primaryBtnStyle(palette), { padding: '8px 22px', fontSize: '13px' })
          }, '⏹ Stop')
        ) : null,
        // Preview — playback + save / discard
        voiceMode === 'preview' && recorded ? h('div', null,
          h('audio', {
            src: recorded.base64,
            controls: true,
            style: { width: '100%', marginBottom: '8px' }
          }),
          h('div', { style: { fontSize: '10px', color: palette.textMute, marginBottom: '8px' } },
            Math.round(recorded.durationMs / 1000) + ' second' + (Math.round(recorded.durationMs / 1000) === 1 ? '' : 's')),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
              onClick: discardRecording,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
            }, '✕ Discard'),
            h('button', {
              onClick: saveRecording,
              style: Object.assign({}, primaryBtnStyle(palette), { padding: '6px 18px', fontSize: '12px' })
            }, '✓ Save')
          )
        ) : null,
        voiceError ? h('div', {
          role: 'alert',
          style: { fontSize: '11px', color: '#dc2626', marginTop: '8px', fontStyle: 'italic' }
        }, voiceError) : null
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
              p.queueInfo
                ? 'Review queue · deck ' + p.queueInfo.current + ' of ' + p.queueInfo.total + ' · ' + label
                : (hasContent ? 'Memory · ' + label : 'Add memory · ' + label))
          ),
          h('div', { style: { display: 'flex', gap: '6px' } },
            // Star (Phase 2p.14) — favorite toggle, hidden on starter
            typeof p.onToggleFavorite === 'function' && !decoration.isStarter ? h('button', {
              onClick: p.onToggleFavorite,
              'aria-pressed': decoration.isFavorite ? 'true' : 'false',
              'aria-label': decoration.isFavorite ? 'Remove from favorites' : 'Mark as favorite',
              title: decoration.isFavorite ? 'Favorite — click to unmark' : 'Mark as favorite',
              style: {
                background: decoration.isFavorite ? palette.accent : 'transparent',
                border: '1px solid ' + (decoration.isFavorite ? palette.accent : palette.border),
                color: decoration.isFavorite ? palette.onAccent : palette.textDim,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, decoration.isFavorite ? '⭐' : '☆') : null,
            // Make similar (Phase 2p.14) — re-roll with same template+slots
            typeof p.onMakeSimilar === 'function' && !decoration.isStarter ? h('button', {
              onClick: p.onMakeSimilar,
              'aria-label': 'Make a similar decoration with the same template',
              title: 'Generate a new decoration with the same template + slots (3 tokens)',
              style: {
                background: 'transparent',
                border: '1px solid ' + palette.border,
                color: palette.textDim,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '🔄 Similar') : null,
            // Print this card (Phase 2p.17) — single-decoration printable
            typeof p.onPrintCard === 'function' && !decoration.isStarter ? h('button', {
              onClick: p.onPrintCard,
              'aria-label': 'Print this decoration as a single-page card',
              title: 'Print one-page card with image + reflection + memory content',
              style: {
                background: 'transparent',
                border: '1px solid ' + palette.border,
                color: palette.textDim,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '🖨 Print') : null,
            // Save as image (Phase 2p.33) — downloads PNG share card
            typeof p.onExportCard === 'function' && !decoration.isStarter && decoration.imageBase64 ? h('button', {
              onClick: p.onExportCard,
              'aria-label': 'Save this decoration as a PNG image',
              title: 'Save as a PNG share card (image + reflection + mood)',
              style: {
                background: 'transparent',
                border: '1px solid ' + palette.border,
                color: palette.textDim,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '💾 Save image') : null,
            // Export deck (Phase 2p.35) — flashcards → Anki CSV,
            // others → plain text. Only shown when linkedContent exists.
            typeof p.onExportDeck === 'function' && decoration.linkedContent ? h('button', {
              onClick: p.onExportDeck,
              'aria-label': 'Export this deck as a file',
              title: decoration.linkedContent.type === 'flashcards'
                ? 'Export as Anki-compatible CSV (also imports into Quizlet, Sheets, etc.)'
                : 'Export as plain text — printable, shareable, paste anywhere',
              style: {
                background: 'transparent',
                border: '1px solid ' + palette.border,
                color: palette.textDim,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '📤 Export deck') : null,
            // Voice note (Phase 2p.15)
            typeof p.onSaveVoiceNote === 'function' ? h('button', {
              onClick: function() { setVoicePanelOpen(!voicePanelOpen); },
              'aria-pressed': voicePanelOpen ? 'true' : 'false',
              'aria-label': decoration.voiceNote ? 'Open voice note panel' : 'Record a voice note',
              title: decoration.voiceNote ? 'Voice note attached — open to play or replace' : 'Record up to 30 seconds of audio',
              style: {
                background: decoration.voiceNote ? palette.accent : 'transparent',
                border: '1px solid ' + (decoration.voiceNote ? palette.accent : palette.border),
                color: decoration.voiceNote ? palette.onAccent : palette.textDim,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, '🎤' + (decoration.voiceNote ? ' ▶' : '')) : null,
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
          )
        ),
        // Mood pill (Phase 2m) — clickable, cycles through MOOD_OPTIONS
        // and back to null. Displayed under the header so it's discoverable
        // for students who want to retroactively tag a decoration's mood.
        typeof p.onSetMood === 'function' && !decoration.isStarter ? h('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }
        },
          h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 600 } }, 'Mood:'),
          MOOD_OPTIONS.map(function(m) {
            var active = decoration.mood === m.id;
            return h('button', {
              key: 'mm-' + m.id,
              onClick: function() { p.onSetMood(active ? null : m.id); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': m.label + (active ? ' (currently selected, click to clear)' : ''),
              title: m.hint,
              style: {
                background: active ? palette.accent : 'transparent',
                color: active ? palette.onAccent : palette.text,
                border: '1px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, m.emoji + ' ' + m.label);
          })
        ) : null,
        // Subject pills (Phase 2p.6) — multi-select tags for academic
        // domain. Click to toggle. Displayed below mood for symmetry.
        typeof p.onSetSubjects === 'function' && !decoration.isStarter ? h('div', {
          style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }
        },
          h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 600 } }, 'Subjects:'),
          SUBJECT_TAGS.map(function(s) {
            var current = Array.isArray(decoration.subjects) ? decoration.subjects : [];
            var active = current.indexOf(s.id) !== -1;
            return h('button', {
              key: 'ms-' + s.id,
              onClick: function() {
                var next = active
                  ? current.filter(function(x) { return x !== s.id; })
                  : current.concat([s.id]);
                p.onSetSubjects(next);
              },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': s.label + (active ? ' (currently selected, click to clear)' : ''),
              title: s.hint,
              style: {
                background: active ? palette.accent : 'transparent',
                color: active ? palette.onAccent : palette.text,
                border: '1px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, s.emoji + ' ' + s.label);
          })
        ) : null,
        renderVoiceNotePanel(),
        renderTabs(),
        body
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6.5: STORY BUILDER + WALK SUB-COMPONENTS (Phase 2e)
  // ─────────────────────────────────────────────────────────
  // Story-method mnemonic: chain ≥3 decorations into a narrative
  // sequence. Each step has a decoration + a sentence connecting it to
  // the next item. Walking the story is retrieval practice — students
  // recall not just facts but how facts hang together.

  function StoryBuilderInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var palette = p.palette;
    var allDecs = p.allDecorations || [];

    // Local draft so abrupt close doesn\'t auto-persist half-typed work.
    // Save button writes through to parent.
    var draftTuple = useState(function() {
      return {
        title: (p.story && p.story.title) || '',
        steps: ((p.story && p.story.steps) || []).slice()
      };
    });
    var draft = draftTuple[0];
    var setDraft = draftTuple[1];

    // Picker open-state for "add step" — when an index is set we show
    // the decoration grid for that step.
    var pickerForTuple = useState(null); // null | step index (number, or 'append')
    var pickerFor = pickerForTuple[0];
    var setPickerFor = pickerForTuple[1];

    function setTitle(val) { setDraft(Object.assign({}, draft, { title: val })); }

    function setStepNarrative(idx, val) {
      var newSteps = draft.steps.slice();
      newSteps[idx] = Object.assign({}, newSteps[idx], { narrative: val });
      setDraft(Object.assign({}, draft, { steps: newSteps }));
    }
    function setStepDecoration(idx, decorationId) {
      var newSteps = draft.steps.slice();
      if (idx === draft.steps.length || idx === 'append') {
        newSteps.push({ decorationId: decorationId, narrative: '' });
      } else {
        newSteps[idx] = Object.assign({}, newSteps[idx], { decorationId: decorationId });
      }
      setDraft(Object.assign({}, draft, { steps: newSteps }));
      setPickerFor(null);
    }
    function removeStep(idx) {
      var newSteps = draft.steps.slice();
      newSteps.splice(idx, 1);
      setDraft(Object.assign({}, draft, { steps: newSteps }));
    }
    function moveStep(idx, dir) {
      var newSteps = draft.steps.slice();
      var swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= newSteps.length) return;
      var tmp = newSteps[idx];
      newSteps[idx] = newSteps[swapWith];
      newSteps[swapWith] = tmp;
      setDraft(Object.assign({}, draft, { steps: newSteps }));
    }

    function findDecoration(id) {
      return allDecs.filter(function(d) { return d.id === id; })[0] || null;
    }

    function handleSave() {
      var cleanedSteps = draft.steps.filter(function(st) { return !!st.decorationId; });
      p.onSave({
        title: (draft.title || '').trim(),
        steps: cleanedSteps
      });
    }

    var validSteps = draft.steps.filter(function(st) {
      return st.decorationId && (st.narrative || '').trim().length > 0;
    });
    var titleOk = (draft.title || '').trim().length > 0;
    var canSave = titleOk && validSteps.length >= 1; // save partial; only ≥3 unlocks walk
    var canWalk = titleOk && validSteps.length >= 3;

    // Decoration picker (modal-within-modal)
    function renderPicker() {
      if (pickerFor === null) return null;
      // Suggest decorations not already in the story (still allowed —
      // dim them to discourage repeats in the chain mnemonic).
      var usedIds = {};
      draft.steps.forEach(function(st) { if (st.decorationId) usedIds[st.decorationId] = true; });
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Pick a decoration for this step',
        onClick: function(e) {
          if (e.target === e.currentTarget) setPickerFor(null);
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '12px', padding: '20px',
            maxWidth: '500px', width: '100%', maxHeight: '70vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
            h('h4', { style: { margin: 0, color: palette.text, fontSize: '15px', fontWeight: 700 } },
              'Pick a decoration · step ' + (typeof pickerFor === 'number' ? pickerFor + 1 : draft.steps.length + 1)),
            h('button', {
              onClick: function() { setPickerFor(null); },
              'aria-label': 'Cancel decoration picker',
              style: { background: 'transparent', border: '1px solid ' + palette.border, color: palette.textDim, borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }
            }, '✕')
          ),
          allDecs.length === 0 ? h('p', {
            style: { color: palette.textDim, fontSize: '13px', textAlign: 'center', padding: '20px', lineHeight: '1.55' }
          }, 'You don\'t have any decorations yet. Add some to your room first, then come back to build a story.') : h('div', {
            style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }
          },
            allDecs.map(function(d) {
              var inUse = !!usedIds[d.id];
              var dLabel = d.templateLabel || d.template || 'item';
              return h('button', {
                key: 'pk-' + d.id,
                onClick: function() { setStepDecoration(pickerFor, d.id); },
                'aria-label': dLabel + (inUse ? ' (already in this story)' : ''),
                title: dLabel + (inUse ? ' (already used)' : ''),
                style: {
                  width: '72px', height: '72px', padding: 0,
                  background: palette.bg,
                  border: '1.5px solid ' + palette.border,
                  borderRadius: '8px', cursor: 'pointer',
                  overflow: 'hidden', position: 'relative',
                  opacity: inUse ? 0.45 : 1, fontFamily: 'inherit'
                }
              },
                d.imageBase64 ? h('img', {
                  src: d.imageBase64, alt: '',
                  style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' }
                }) : null,
                inUse ? h('span', {
                  'aria-hidden': 'true',
                  style: {
                    position: 'absolute', top: 0, right: 0,
                    background: palette.textMute, color: palette.bg,
                    fontSize: '9px', fontWeight: 700, padding: '1px 4px',
                    borderRadius: '0 6px 0 6px'
                  }
                }, 'used') : null
              );
            })
          )
        )
      );
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': p.story && p.story.title ? 'Edit story · ' + p.story.title : 'Build a new story',
      onClick: function(e) {
        if (e.target === e.currentTarget) p.onCancel();
      },
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)', zIndex: 175,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg, border: '1px solid ' + palette.border,
          borderRadius: '14px', padding: '24px',
          maxWidth: '620px', width: '100%', maxHeight: '88vh',
          overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
          h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
            '📜 ' + (p.story && p.story.title ? 'Edit story' : 'Build a story')),
          h('button', {
            onClick: p.onCancel, 'aria-label': 'Close story builder',
            style: { background: 'transparent', border: '1px solid ' + palette.border, color: palette.textDim, borderRadius: '8px', padding: '4px 10px', fontSize: '13px', cursor: 'pointer' }
          }, '✕')
        ),
        h('p', {
          style: { fontSize: '12px', color: palette.textDim, marginBottom: '12px', lineHeight: '1.5' }
        }, 'Chain ≥3 decorations into a narrative. Each step links to the next: "the dragon → the fern → the lamp". The story walk becomes retrieval practice for whatever you wove into it.'),
        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'Title'),
        h('input', {
          type: 'text', value: draft.title,
          onChange: function(e) { setTitle(e.target.value); },
          placeholder: 'e.g. "The water cycle journey"',
          'aria-label': 'Story title',
          style: {
            width: '100%', padding: '8px 10px',
            background: palette.surface, border: '1px solid ' + palette.border,
            borderRadius: '8px', color: palette.text,
            fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
            marginBottom: '14px'
          }
        }),
        h('div', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '8px', fontWeight: 600 } },
          'Steps · ' + draft.steps.length + (canWalk ? ' ✓ ready to walk' : ' (need ≥3 with narrative)')),
        // Step list
        draft.steps.length === 0 ? h('p', {
          style: { fontSize: '12px', color: palette.textMute, fontStyle: 'italic', textAlign: 'center', padding: '20px', background: palette.surface, border: '1px dashed ' + palette.border, borderRadius: '8px', marginBottom: '10px' }
        }, 'No steps yet. Click "+ Add step" below to pick a decoration and start your chain.') : h('div', {
          style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }
        },
          draft.steps.map(function(step, idx) {
            var dec = findDecoration(step.decorationId);
            return h('div', {
              key: 'step-' + idx,
              style: {
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '10px', background: palette.surface,
                border: '1px solid ' + palette.border, borderRadius: '8px'
              }
            },
              // Step number + reorder buttons
              h('div', { style: { flex: '0 0 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' } },
                h('button', {
                  onClick: function() { moveStep(idx, -1); },
                  disabled: idx === 0,
                  'aria-label': 'Move step ' + (idx + 1) + ' up',
                  style: { background: 'transparent', border: 'none', color: idx === 0 ? palette.textMute : palette.textDim, cursor: idx === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '2px', opacity: idx === 0 ? 0.4 : 1 }
                }, '▲'),
                h('span', { style: { fontSize: '14px', fontWeight: 800, color: palette.accent } }, idx + 1),
                h('button', {
                  onClick: function() { moveStep(idx, 1); },
                  disabled: idx === draft.steps.length - 1,
                  'aria-label': 'Move step ' + (idx + 1) + ' down',
                  style: { background: 'transparent', border: 'none', color: idx === draft.steps.length - 1 ? palette.textMute : palette.textDim, cursor: idx === draft.steps.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '2px', opacity: idx === draft.steps.length - 1 ? 0.4 : 1 }
                }, '▼')
              ),
              // Decoration thumbnail
              h('button', {
                onClick: function() { setPickerFor(idx); },
                'aria-label': dec ? 'Change decoration for step ' + (idx + 1) : 'Pick decoration for step ' + (idx + 1),
                title: dec ? 'Click to change decoration' : 'Pick a decoration',
                style: {
                  width: '64px', height: '64px', flexShrink: 0,
                  padding: 0, background: palette.bg,
                  border: dec ? ('1.5px solid ' + palette.border) : ('1.5px dashed ' + palette.textMute),
                  borderRadius: '8px', cursor: 'pointer', overflow: 'hidden',
                  fontFamily: 'inherit'
                }
              },
                dec && dec.imageBase64 ? h('img', {
                  src: dec.imageBase64, alt: '',
                  style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' }
                }) : h('span', { style: { fontSize: '20px', color: palette.textMute } }, '+')
              ),
              // Narrative textarea + delete
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('textarea', {
                  value: step.narrative || '',
                  onChange: function(e) { setStepNarrative(idx, e.target.value); },
                  placeholder: (idx === 0
                    ? 'How does the story start with this item? '
                    : 'How does the previous item lead to this one? ')
                    + 'Wrap a {word} in braces to fill it in during walk.',
                  'aria-label': 'Narrative for step ' + (idx + 1),
                  rows: 2,
                  style: {
                    width: '100%', padding: '6px 8px',
                    background: palette.bg, border: '1px solid ' + palette.border,
                    borderRadius: '6px', color: palette.text, fontSize: '12px',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                    resize: 'vertical', lineHeight: '1.45'
                  }
                }),
                h('button', {
                  onClick: function() { removeStep(idx); },
                  style: { marginTop: '4px', background: 'transparent', border: 'none', color: palette.textMute, fontSize: '10px', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline' }
                }, 'Remove step')
              )
            );
          })
        ),
        h('button', {
          onClick: function() { setPickerFor('append'); },
          style: {
            display: 'block', width: '100%', padding: '10px',
            background: 'transparent', color: palette.accent,
            border: '1px dashed ' + palette.accent, borderRadius: '8px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: '14px'
          }
        }, '+ Add step'),
        // Save / cancel
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid ' + palette.border } },
          h('button', {
            onClick: function() {
              if (window.confirm && !window.confirm('Delete this story? This can\'t be undone.')) return;
              if (p.onDelete) p.onDelete();
            },
            style: { background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
          }, '🗑 Delete story'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
              onClick: p.onCancel,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Cancel'),
            h('button', {
              onClick: handleSave,
              disabled: !canSave,
              style: {
                background: canSave ? palette.accent : palette.surface,
                color: canSave ? palette.onAccent : palette.textMute,
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', opacity: canSave ? 1 : 0.6
              }
            }, 'Save')
          )
        ),
        renderPicker()
      )
    );
  }

  // Walk inner — full-screen-ish step-through viewer for a completed story.
  // Esc / Close exits without recording. Reaching the final step + clicking
  // "Finish walk" calls onFinish which writes lastReviewedAt + tokens.
  function StoryWalkInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var palette = p.palette;
    var story = p.story;
    var steps = (story.steps || []);
    var allDecs = p.allDecorations || [];

    var idxTuple = useState(0);
    var idx = idxTuple[0];
    var setIdx = idxTuple[1];

    // Per-step cloze state (Phase 2j) — { stepIdx: { guesses, revealed } }.
    // Cloze in step narratives turns walk-mode into active retrieval at
    // each anchor, not just passive recall. Score isn\'t persisted (the
    // walk completion award is the primary feedback); reveal is per-step.
    var clozeStateTuple = useState({});
    var clozeState = clozeStateTuple[0];
    var setClozeState = clozeStateTuple[1];

    function findDecoration(id) {
      return allDecs.filter(function(d) { return d.id === id; })[0] || null;
    }
    var step = steps[idx] || null;
    var dec = step ? findDecoration(step.decorationId) : null;
    var atEnd = idx >= steps.length - 1;
    var stepClozeAnswers = step ? extractClozeAnswers(step.narrative || '') : [];
    var stepHasCloze = stepClozeAnswers.length > 0;
    var stepClozeState = clozeState[idx] || { guesses: stepClozeAnswers.map(function() { return ''; }), revealed: false };

    function updateStepGuess(blankIdx, val) {
      var newGuesses = stepClozeState.guesses.slice();
      newGuesses[blankIdx] = val;
      var nextStepState = Object.assign({}, stepClozeState, { guesses: newGuesses });
      var nextClozeState = Object.assign({}, clozeState);
      nextClozeState[idx] = nextStepState;
      setClozeState(nextClozeState);
    }
    function revealStep() {
      var nextStepState = Object.assign({}, stepClozeState, { revealed: true });
      var nextClozeState = Object.assign({}, clozeState);
      nextClozeState[idx] = nextStepState;
      setClozeState(nextClozeState);
    }

    // Esc closes (without recording)
    useEffect(function() {
      var handler = function(e) {
        if (e.key === 'Escape') p.onClose();
        if (e.key === 'ArrowRight' && idx < steps.length - 1) setIdx(idx + 1);
        if (e.key === 'ArrowLeft' && idx > 0) setIdx(idx - 1);
      };
      window.addEventListener('keydown', handler);
      return function() { window.removeEventListener('keydown', handler); };
    }, [idx]);

    if (!step || !dec) {
      return h('div', {
        role: 'dialog',
        style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 175, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }
      },
        h('div', { style: { background: palette.bg, padding: '28px', borderRadius: '14px', textAlign: 'center', maxWidth: '420px' } },
          h('h3', { style: { color: palette.text, marginBottom: '10px' } }, 'Story can\'t be walked'),
          h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55' } },
            'A decoration in this story is missing — it may have been removed from the room. Edit the story to fix or replace it.'),
          h('button', {
            onClick: p.onClose,
            style: { marginTop: '14px', background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
          }, 'Close')
        )
      );
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Walking story · ' + (story.title || 'untitled'),
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 180,
        display: 'flex', flexDirection: 'column',
        padding: '24px 16px', boxSizing: 'border-box',
        color: palette.text
      }
    },
      // Header — title + close
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '720px', width: '100%', margin: '0 auto', marginBottom: '14px' } },
        h('h3', { style: { margin: 0, fontSize: '17px', color: palette.text, fontWeight: 700 } },
          '📜 ' + (story.title || 'Untitled story')),
        h('button', {
          onClick: p.onClose, 'aria-label': 'Close story walk',
          style: { background: 'transparent', border: '1px solid ' + palette.border, color: palette.textDim, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
        }, '✕')
      ),
      // Decoration big
      h('div', {
        style: {
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          maxWidth: '720px', width: '100%', margin: '0 auto'
        }
      },
        h('div', {
          style: {
            background: palette.surface,
            border: '2px solid ' + palette.accent,
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '480px',
            marginBottom: '20px'
          }
        },
          dec.imageBase64 ? h('img', {
            src: dec.imageBase64, alt: dec.templateLabel || dec.template || 'step ' + (idx + 1),
            style: { maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '8px' }
          }) : null
        ),
        h('div', {
          style: {
            fontSize: '11px', color: palette.textMute, marginBottom: '10px',
            letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700
          }
        }, 'Step ' + (idx + 1) + ' of ' + steps.length
           + (stepHasCloze ? ' · ' + stepClozeAnswers.length + ' fill-in' + (stepClozeAnswers.length === 1 ? '' : 's') : '')),
        // Narrative — cloze-bearing steps render as inline inputs; plain
        // steps render as italic prose
        stepHasCloze ? (function() {
          var segments = buildClozeSegments(step.narrative || '');
          return h('div', {
            style: {
              fontSize: '17px', color: palette.text, lineHeight: '2.2',
              textAlign: 'center', maxWidth: '560px', margin: '0 0 14px 0'
            }
          },
            segments.map(function(seg, i) {
              if (seg.kind === 'text') return h('span', { key: 'wn-' + i }, seg.value);
              if (stepClozeState.revealed) {
                var guess = stepClozeState.guesses[seg.blankIdx] || '';
                var correct = clozeAnswerCorrect(seg.answer, guess);
                return h('span', {
                  key: 'wn-' + i,
                  style: {
                    background: correct ? 'rgba(52,211,153,0.20)' : 'rgba(251,191,36,0.20)',
                    color: palette.text,
                    padding: '2px 8px', borderRadius: '4px',
                    fontWeight: 700,
                    borderBottom: '2px solid ' + (correct ? (palette.success || palette.accent) : (palette.warn || palette.accent))
                  }
                }, seg.answer);
              }
              return h('input', {
                key: 'wn-' + i,
                type: 'text',
                value: stepClozeState.guesses[seg.blankIdx] || '',
                onChange: function(e) { updateStepGuess(seg.blankIdx, e.target.value); },
                'aria-label': 'Step ' + (idx + 1) + ' blank ' + (seg.blankIdx + 1),
                placeholder: '___',
                style: {
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderRadius: '6px', color: palette.text,
                  padding: '4px 10px', fontSize: 'inherit', fontFamily: 'inherit',
                  margin: '0 4px', minWidth: '90px', textAlign: 'center'
                }
              });
            })
          );
        })() : h('p', {
          style: {
            fontSize: '17px', color: palette.text, lineHeight: '1.6',
            textAlign: 'center', maxWidth: '560px', margin: '0 0 24px 0',
            fontStyle: 'italic'
          }
        }, '"' + (step.narrative || '') + '"'),
        // Reveal button for cloze-bearing steps (when not yet revealed)
        stepHasCloze && !stepClozeState.revealed ? h('button', {
          onClick: revealStep,
          style: {
            background: 'transparent', color: palette.accent,
            border: '1px solid ' + palette.accent, borderRadius: '8px',
            padding: '6px 16px', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: '14px'
          }
        }, '👁 Reveal answers') : null,
        stepHasCloze && stepClozeState.revealed ? (function() {
          var cc = 0;
          for (var i = 0; i < stepClozeAnswers.length; i++) {
            if (clozeAnswerCorrect(stepClozeAnswers[i], stepClozeState.guesses[i])) cc++;
          }
          var pct = stepClozeAnswers.length > 0 ? Math.round((cc / stepClozeAnswers.length) * 100) : 0;
          return h('div', {
            style: {
              fontSize: '12px', color: palette.textDim, marginBottom: '14px',
              fontWeight: 600, letterSpacing: '0.03em'
            }
          }, cc + ' / ' + stepClozeAnswers.length + ' · ' + pct + '%');
        })() : null
      ),
      // Footer — nav buttons
      h('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          maxWidth: '720px', width: '100%', margin: '0 auto', gap: '10px'
        }
      },
        h('button', {
          onClick: function() { if (idx > 0) setIdx(idx - 1); },
          disabled: idx === 0,
          'aria-label': 'Previous step',
          style: {
            background: 'transparent', color: idx === 0 ? palette.textMute : palette.textDim,
            border: '1px solid ' + palette.border, borderRadius: '8px',
            padding: '10px 18px', fontSize: '13px', fontWeight: 600,
            cursor: idx === 0 ? 'default' : 'pointer',
            opacity: idx === 0 ? 0.4 : 1, fontFamily: 'inherit'
          }
        }, '◀ Previous'),
        // Progress dots
        h('div', { style: { display: 'flex', gap: '4px' } },
          steps.map(function(_, i) {
            return h('span', {
              key: 'wd-' + i,
              'aria-hidden': 'true',
              style: {
                width: i === idx ? '14px' : '6px',
                height: '6px', borderRadius: '999px',
                background: i <= idx ? palette.accent : palette.surface,
                border: '1px solid ' + (i <= idx ? palette.accent : palette.border),
                transition: 'width 200ms'
              }
            });
          })
        ),
        atEnd ? h('button', {
          onClick: function() { p.onFinish(); },
          'aria-label': 'Finish story walk',
          style: {
            background: palette.accent, color: palette.onAccent,
            border: 'none', borderRadius: '8px',
            padding: '10px 22px', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit'
          }
        }, '✓ Finish walk') : h('button', {
          onClick: function() { setIdx(idx + 1); },
          'aria-label': 'Next step',
          style: {
            background: palette.accent, color: palette.onAccent,
            border: 'none', borderRadius: '8px',
            padding: '10px 22px', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit'
          }
        }, 'Next ▶')
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6.55: COMPANION SETUP WIZARD (Phase 2p)
  // ─────────────────────────────────────────────────────────
  // Three-step flow: pick species → pick color variant → name your buddy.
  // Live SVG previews refresh as student selects. No token cost — this
  // is identity-curation, should feel free.
  // ─────────────────────────────────────────────────────────
  // SECTION 6.7: ONBOARDING TOUR (Phase 2p.6)
  // ─────────────────────────────────────────────────────────
  // 6-step modal walkthrough introducing the major features.
  // Skippable, replayable from settings. Tour fires once on first
  // visit AFTER the welcome card is dismissed (via state.tourSeen).
  // ─────────────────────────────────────────────────────────
  // SECTION 6.8: SEARCH MODAL (Phase 2p.10)
  // ─────────────────────────────────────────────────────────
  // Text-based search across decoration labels, deck content
  // (flashcards, acronym meanings, notes, image-link associations),
  // story titles and step narratives, and journal entries. Case-
  // insensitive substring match. Click a result to jump to the
  // appropriate modal at the right spot.
  function SearchModalInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var palette = p.palette;

    var queryTuple = useState('');
    var query = queryTuple[0];
    var setQuery = queryTuple[1];

    var q = (query || '').trim().toLowerCase();
    var minLen = 2;
    var results = q.length < minLen ? null : (function() {
      var out = { decorations: [], stories: [], journals: [] };
      // Decoration labels + deck content
      (p.decorations || []).forEach(function(d) {
        var label = (d.templateLabel || d.template || '').toLowerCase();
        var labelHit = label.indexOf(q) !== -1;
        var refl = (d.studentReflection || '').toLowerCase();
        var reflHit = refl.indexOf(q) !== -1;
        var contentHits = []; // matching content snippets
        var lc = d.linkedContent;
        if (lc && lc.data) {
          if (lc.type === 'flashcards' && Array.isArray(lc.data.cards)) {
            lc.data.cards.forEach(function(c) {
              var f = (c.front || '').toLowerCase();
              var b = (c.back || '').toLowerCase();
              if (f.indexOf(q) !== -1 || b.indexOf(q) !== -1) {
                contentHits.push((c.front || '') + ' — ' + (c.back || ''));
              }
            });
          } else if (lc.type === 'acronym') {
            var letters = (lc.data.letters || '').toLowerCase();
            var meanings = (lc.data.meanings || []).join(' ').toLowerCase();
            var ctx = (lc.data.context || '').toLowerCase();
            if (letters.indexOf(q) !== -1 || meanings.indexOf(q) !== -1 || ctx.indexOf(q) !== -1) {
              contentHits.push((lc.data.letters || '').toUpperCase() + ' — ' + (lc.data.context || ''));
            }
          } else if (lc.type === 'notes') {
            var text = (lc.data.text || '').toLowerCase();
            if (text.indexOf(q) !== -1) {
              // Snippet around match
              var idx = text.indexOf(q);
              var rawText = lc.data.text || '';
              var start = Math.max(0, idx - 30);
              var end = Math.min(rawText.length, idx + q.length + 30);
              contentHits.push((start > 0 ? '…' : '') + rawText.slice(start, end) + (end < rawText.length ? '…' : ''));
            }
          } else if (lc.type === 'image-link') {
            var assoc = (lc.data.association || '').toLowerCase();
            if (assoc.indexOf(q) !== -1) {
              contentHits.push(lc.data.association || '');
            }
          }
        }
        if (labelHit || reflHit || contentHits.length > 0) {
          out.decorations.push({
            decoration: d,
            labelHit: labelHit,
            reflHit: reflHit,
            contentHits: contentHits.slice(0, 3) // cap snippets
          });
        }
      });
      // Stories: title + step narratives
      (p.stories || []).forEach(function(s) {
        var titleHit = (s.title || '').toLowerCase().indexOf(q) !== -1;
        var narrativeHits = (s.steps || []).filter(function(stp) {
          return (stp.narrative || '').toLowerCase().indexOf(q) !== -1;
        });
        if (titleHit || narrativeHits.length > 0) {
          out.stories.push({ story: s, titleHit: titleHit, narrativeHits: narrativeHits.slice(0, 2) });
        }
      });
      // Journal entries
      (p.journalEntries || []).forEach(function(e) {
        var text = (e.text || '').toLowerCase();
        if (text.indexOf(q) === -1) return;
        var idx = text.indexOf(q);
        var rawText = e.text || '';
        var start = Math.max(0, idx - 30);
        var end = Math.min(rawText.length, idx + q.length + 30);
        out.journals.push({
          entry: e,
          snippet: (start > 0 ? '…' : '') + rawText.slice(start, end) + (end < rawText.length ? '…' : '')
        });
      });
      return out;
    })();

    var totalCount = results
      ? (results.decorations.length + results.stories.length + results.journals.length)
      : 0;

    function highlightSnippet(text, queryStr) {
      // Simple highlight via splitting on lowercased index
      if (!text || !queryStr) return text;
      var lower = text.toLowerCase();
      var qi = lower.indexOf(queryStr.toLowerCase());
      if (qi === -1) return text;
      var before = text.slice(0, qi);
      var match = text.slice(qi, qi + queryStr.length);
      var after = text.slice(qi + queryStr.length);
      return [
        h('span', null, before),
        h('mark', { style: { background: palette.accent, color: palette.onAccent, padding: '0 2px', borderRadius: '2px' } }, match),
        h('span', null, after)
      ];
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Search across your decks, stories, and reflections',
      onClick: function(e) {
        if (e.target === e.currentTarget) p.onClose();
      },
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)', zIndex: 175,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 20px 20px 20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg, border: '1px solid ' + palette.border,
          borderRadius: '14px', padding: '20px',
          maxWidth: '600px', width: '100%', maxHeight: '85vh',
          overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
          h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
            '🔍 Search'),
          h('button', {
            onClick: p.onClose,
            'aria-label': 'Close search',
            style: { background: 'transparent', border: '1px solid ' + palette.border, color: palette.textDim, borderRadius: '8px', padding: '4px 10px', fontSize: '13px', cursor: 'pointer' }
          }, '✕')
        ),
        h('input', {
          type: 'search',
          value: query,
          onChange: function(e) { setQuery(e.target.value); },
          placeholder: 'Search decks, stories, reflections…',
          'aria-label': 'Search query',
          autoFocus: true,
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
        // Empty / hint state
        q.length < minLen ? h('p', {
          style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', textAlign: 'center', padding: '20px', lineHeight: '1.5' }
        }, q.length === 0
          ? 'Type at least 2 characters to search across your decks, stories, and reflections.'
          : 'Keep typing…'
        ) : (totalCount === 0 ? h('div', {
          role: 'status', 'aria-live': 'polite',
          style: { padding: '24px 16px', background: palette.surface, border: '1px dashed ' + palette.border, borderRadius: '8px', textAlign: 'center' }
        },
          h('div', { 'aria-hidden': 'true', style: { fontSize: '28px', marginBottom: '6px' } }, '🤷'),
          h('p', { style: { color: palette.textDim, fontSize: '13px', margin: 0 } },
            'No matches for "' + query.trim() + '"')
        ) : h('div', {
          role: 'region', 'aria-label': totalCount + ' result' + (totalCount === 1 ? '' : 's'),
          style: { display: 'flex', flexDirection: 'column', gap: '10px' }
        },
          h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } },
            totalCount + ' result' + (totalCount === 1 ? '' : 's')),
          // Decorations
          results.decorations.length > 0 ? h('div', null,
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 600, marginBottom: '6px' } },
              '🌿 Decorations · ' + results.decorations.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              results.decorations.map(function(r) {
                var d = r.decoration;
                var dLabel = d.templateLabel || d.template || 'item';
                return h('button', {
                  key: 'sr-d-' + d.id,
                  onClick: function() { p.onClickDecoration(d.id); },
                  'aria-label': 'Open ' + dLabel,
                  style: {
                    display: 'flex', gap: '10px', alignItems: 'center',
                    padding: '8px 10px',
                    background: palette.surface,
                    border: '1px solid ' + palette.border,
                    borderRadius: '8px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left', color: palette.text
                  }
                },
                  d.imageBase64 ? h('img', { src: d.imageBase64, alt: '', 'aria-hidden': 'true', style: { width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 } }) : null,
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: '13px', fontWeight: 700 } }, highlightSnippet(dLabel, query)),
                    r.contentHits.length > 0 ? h('div', {
                      style: { fontSize: '11px', color: palette.textDim, marginTop: '2px', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis' }
                    }, highlightSnippet(r.contentHits[0], query)) : (
                      r.reflHit ? h('div', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic', marginTop: '2px' } },
                        '"' + (d.studentReflection || '').slice(0, 100) + (d.studentReflection.length > 100 ? '…' : '') + '"') : null
                    )
                  )
                );
              })
            )
          ) : null,
          // Stories
          results.stories.length > 0 ? h('div', null,
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 600, marginBottom: '6px' } },
              '📜 Stories · ' + results.stories.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              results.stories.map(function(r) {
                return h('button', {
                  key: 'sr-s-' + r.story.id,
                  onClick: function() { p.onClickStory(r.story.id); },
                  'aria-label': 'Open story ' + (r.story.title || 'untitled'),
                  style: {
                    display: 'block', width: '100%', padding: '8px 10px',
                    background: palette.surface, border: '1px solid ' + palette.border,
                    borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left', color: palette.text
                  }
                },
                  h('div', { style: { fontSize: '13px', fontWeight: 700 } },
                    '📜 ' + (r.story.title ? '' : '') + ' ',
                    highlightSnippet(r.story.title || '(untitled)', query)),
                  r.narrativeHits.length > 0 ? h('div', {
                    style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic', marginTop: '3px', lineHeight: '1.4' }
                  }, highlightSnippet('"' + r.narrativeHits[0].narrative + '"', query)) : null
                );
              })
            )
          ) : null,
          // Journal entries
          results.journals.length > 0 ? h('div', null,
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 600, marginBottom: '6px' } },
              '📝 Reflections · ' + results.journals.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              results.journals.map(function(r) {
                var dateStr = r.entry.date ? new Date(r.entry.date).toLocaleDateString() : '';
                return h('button', {
                  key: 'sr-j-' + r.entry.id,
                  onClick: function() { p.onClickJournal(r.entry.id); },
                  'aria-label': 'Open journal entry from ' + dateStr,
                  style: {
                    display: 'block', width: '100%', padding: '8px 10px',
                    background: palette.surface, border: '1px solid ' + palette.border,
                    borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left', color: palette.text
                  }
                },
                  h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '3px' } }, dateStr),
                  h('div', { style: { fontSize: '12px', color: palette.text, lineHeight: '1.4', fontStyle: 'italic' } },
                    highlightSnippet('"' + r.snippet + '"', query))
                );
              })
            )
          ) : null
        ))
      )
    );
  }

  function TourModalInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var palette = p.palette;

    var stepTuple = useState(0);
    var step = stepTuple[0];
    var setStep = stepTuple[1];

    var steps = [
      {
        emoji: '🌿',
        title: 'Welcome to AlloHaven',
        body: 'This is a cozy room you build by focusing and reflecting. The plant you see is a starter gift. Everything else is yours to grow.'
      },
      {
        emoji: '🪙',
        title: 'Earn tokens by being you',
        body: 'Complete a Pomodoro focus session for 2 tokens, write a reflection for 1, pass a memory quiz for 1 (capped 2/day). Tokens spend on AI-generated decorations — 3 per item.'
      },
      {
        emoji: '🌱',
        title: 'Click any cell to add a decoration',
        body: 'Empty wall + floor cells have dotted outlines in Build mode. Pick a template, customize the slots, and the AI generates a one-of-a-kind item for your room.'
      },
      {
        emoji: '📖',
        title: 'Click a decoration → memory palace',
        body: 'Attach flashcards, an acronym, free notes (with {cloze} blanks!), or an image-link to ANY decoration. Where you place a deck shapes how you remember it. Method of loci, since 477 BC.'
      },
      {
        emoji: '🐱',
        title: 'Meet your buddy',
        body: 'Pick a critter — cat, fox, owl, turtle, or baby dragon. Four color palettes, your name. They notice your activity, celebrate your wins, and gently prompt review when a deck is due.'
      },
      {
        emoji: '🎯',
        title: 'Set goals + track progress',
        body: 'Time-boxed targets (5 Pomodoros this week, 2 quizzes passed, etc.) earn +3 tokens on completion. Goals + skill levels + achievements show up in the print packet for parents and IEP teams.'
      },
      {
        emoji: '🛠 ↔ 🛋',
        title: 'Build vs Live mode',
        body: 'Build mode = editing. Live mode = the room rests, your buddy sleeps, lights soften. The toggle in the header swaps you between them whenever you want.'
      }
    ];

    var current = steps[step];
    var isLast = step === steps.length - 1;
    function next() { if (isLast) p.onFinish(); else setStep(step + 1); }
    function back() { if (step > 0) setStep(step - 1); }
    function skip() { p.onFinish(); }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'AlloHaven tour, step ' + (step + 1) + ' of ' + steps.length,
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.65)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg, border: '2px solid ' + palette.accent,
          borderRadius: '16px', padding: '28px',
          maxWidth: '480px', width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          color: palette.text, textAlign: 'center'
        }
      },
        h('div', { 'aria-hidden': 'true', style: { fontSize: '48px', marginBottom: '10px' } }, current.emoji),
        h('h3', { style: { margin: '0 0 12px 0', color: palette.text, fontSize: '20px', fontWeight: 700 } },
          current.title),
        h('p', { style: { margin: '0 0 20px 0', fontSize: '14px', color: palette.textDim, lineHeight: '1.6' } },
          current.body),
        // Progress dots
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '20px' } },
          steps.map(function(_, i) {
            return h('span', {
              key: 'td-' + i,
              'aria-hidden': 'true',
              style: {
                width: i === step ? '20px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: i <= step ? palette.accent : palette.surface,
                border: '1px solid ' + (i <= step ? palette.accent : palette.border),
                transition: 'width 200ms'
              }
            });
          })
        ),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' } },
          h('button', {
            onClick: skip,
            'aria-label': 'Skip the tour',
            style: { background: 'transparent', color: palette.textMute, border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }
          }, 'Skip'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            step > 0 ? h('button', {
              onClick: back,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, '◀ Back') : null,
            h('button', {
              onClick: next,
              style: {
                background: palette.accent, color: palette.onAccent,
                border: 'none', borderRadius: '8px', padding: '8px 22px',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, isLast ? '✨ Got it' : 'Next ▶')
          )
        )
      )
    );
  }

  function CompanionSetupInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var palette = p.palette;
    var existing = p.existing || null; // edit mode if non-null

    // Three steps. If editing existing, jump to step 1 anyway (full flow).
    var stepTuple = useState(1);
    var step = stepTuple[0];
    var setStep = stepTuple[1];

    var draftTuple = useState(function() {
      return {
        species: existing ? existing.species : null,
        colorVariant: existing ? existing.colorVariant : 'warm',
        name: existing ? existing.name : '',
        // Phase 2p.22 — accessory carries through across the wizard
        accessory: existing ? (existing.accessory || null) : null
      };
    });
    var draft = draftTuple[0];
    var setDraft = draftTuple[1];

    function setField(field, val) {
      var next = Object.assign({}, draft);
      next[field] = val;
      setDraft(next);
    }

    function handleSave() {
      p.onSave({
        species: draft.species,
        colorVariant: draft.colorVariant,
        name: (draft.name || '').trim() || (getCompanionSpecies(draft.species) || {}).label || 'Buddy',
        // Phase 2p.22 — only include accessory if unlocked, otherwise leave existing untouched
        accessory: p.bowUnlocked ? (draft.accessory || null) : (existing && existing.accessory) || null
      });
    }

    var canAdvanceFrom1 = !!draft.species;
    var canAdvanceFrom2 = !!draft.colorVariant;
    var canSave = !!draft.species && !!draft.colorVariant;

    function renderSpeciesPicker() {
      return h('div', null,
        h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' } },
          'Pick a critter to live in your room. They\'ll watch you focus, notice when you\'ve been studying, and offer the occasional thought. Friendly only — they never guilt-trip.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' } },
          COMPANION_SPECIES.map(function(sp) {
            var active = draft.species === sp.id;
            var swatch = getCompanionPalette(sp.id, draft.colorVariant || 'warm');
            return h('button', {
              key: 'sp-' + sp.id,
              onClick: function() { setField('species', sp.id); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': sp.label + ': ' + sp.blurb,
              style: {
                background: active ? palette.accent : palette.surface,
                color: active ? palette.onAccent : palette.text,
                border: '2px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '12px',
                padding: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }
            },
              h('div', {
                style: { width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
              },
                getCompanionSvg(sp.id, swatch, { blinking: false })
              ),
              h('div', { style: { fontWeight: 700, fontSize: '13px' } }, sp.emoji + ' ' + sp.label),
              h('div', { style: { fontSize: '10px', opacity: 0.85, lineHeight: '1.35' } }, sp.blurb)
            );
          })
        )
      );
    }

    function renderColorPicker() {
      var sp = getCompanionSpecies(draft.species) || COMPANION_SPECIES[0];
      return h('div', null,
        h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' } },
          'Pick a color palette for your ' + sp.label.toLowerCase() + '.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' } },
          COMPANION_VARIANTS.map(function(v) {
            var active = draft.colorVariant === v.id;
            var swatch = getCompanionPalette(draft.species, v.id);
            return h('button', {
              key: 'cv-' + v.id,
              onClick: function() { setField('colorVariant', v.id); },
              'aria-pressed': active ? 'true' : 'false',
              'aria-label': v.label + ' palette',
              style: {
                background: active ? palette.accent : palette.surface,
                color: active ? palette.onAccent : palette.text,
                border: '2px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '12px',
                padding: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }
            },
              h('div', { style: { width: '60px', height: '60px' } },
                getCompanionSvg(draft.species, swatch, { blinking: false, accessory: draft.accessory })
              ),
              h('div', { style: { fontWeight: 700, fontSize: '12px' } }, v.label),
              // Color trio swatch
              h('div', { style: { display: 'flex', gap: '3px', marginTop: '2px' } },
                h('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: swatch.primary, border: '1px solid rgba(0,0,0,0.2)' } }),
                h('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: swatch.secondary, border: '1px solid rgba(0,0,0,0.2)' } }),
                h('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: swatch.accent, border: '1px solid rgba(0,0,0,0.2)' } })
              )
            );
          })
        )
      );
    }

    function renderNamePicker() {
      var sp = getCompanionSpecies(draft.species) || COMPANION_SPECIES[0];
      var swatch = getCompanionPalette(draft.species, draft.colorVariant);
      var nameSuggestions = ['Mochi', 'Echo', 'Sage', 'Pip', 'Juniper', 'Atlas', 'Willow', 'Pebble', 'Clover'];
      return h('div', null,
        h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' } },
          'Give your ' + sp.label.toLowerCase() + ' a name. (Or leave it blank — they\'ll just be "' + sp.label + '".)'),
        h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' } },
          h('div', {
            style: { width: '90px', height: '90px', flexShrink: 0, padding: '6px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '12px' }
          },
            // Phase 2p.22 — preview reflects the accessory toggle
            getCompanionSvg(draft.species, swatch, { blinking: false, accessory: draft.accessory })
          ),
          h('div', { style: { flex: 1 } },
            h('input', {
              type: 'text',
              value: draft.name,
              onChange: function(e) { setField('name', e.target.value); },
              placeholder: 'Type a name…',
              maxLength: 24,
              'aria-label': 'Companion name',
              style: {
                width: '100%',
                padding: '10px 12px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '8px',
                color: palette.text,
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }
            }),
            h('div', { style: { display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' } },
              nameSuggestions.map(function(n) {
                return h('button', {
                  key: 'nm-' + n,
                  onClick: function() { setField('name', n); },
                  style: {
                    background: 'transparent', color: palette.textMute,
                    border: '1px solid ' + palette.border, borderRadius: '999px',
                    padding: '2px 8px', fontSize: '10px',
                    cursor: 'pointer', fontFamily: 'inherit'
                  }
                }, n);
              })
            )
          )
        ),
        // Phase 2p.22/2p.23 — accessory picker. Shows all UNLOCKED
        // accessories as a row of pills + a "None" tile. Single-pick.
        // Locked accessories show a 🔒 with their unlock hint so
        // students can see what they\'re working toward.
        (function() {
          var unlocked = (p.unlockedAccessories && p.unlockedAccessories.length > 0)
            ? p.unlockedAccessories : (p.bowUnlocked ? ['bow'] : []);
          // Always render the section if at least one is unlocked OR if
          // there are locked teasers worth showing
          var hasAny = unlocked.length > 0;
          if (!hasAny && !p.showLockedTeasers) return null;
          return h('div', {
            role: 'region',
            'aria-label': 'Accessory picker',
            style: { padding: '12px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px' }
          },
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: palette.text, marginBottom: '8px' } },
              '🎀 Accessory'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              // None
              h('button', {
                onClick: function() { setField('accessory', null); },
                'aria-pressed': !draft.accessory ? 'true' : 'false',
                'aria-label': 'No accessory',
                style: {
                  background: !draft.accessory ? palette.accent : palette.bg,
                  color: !draft.accessory ? palette.onAccent : palette.textDim,
                  border: '1px solid ' + (!draft.accessory ? palette.accent : palette.border),
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, 'None'),
              // Each accessory — unlocked clickable, locked dimmed with 🔒
              ACCESSORY_DEFS.map(function(def) {
                var isUnlocked = unlocked.indexOf(def.id) !== -1;
                var active = draft.accessory === def.id;
                return h('button', {
                  key: 'acc-' + def.id,
                  onClick: function() { if (isUnlocked) setField('accessory', def.id); },
                  disabled: !isUnlocked,
                  'aria-pressed': active ? 'true' : 'false',
                  'aria-label': def.label + (isUnlocked ? '' : ' (locked: ' + def.hint + ')'),
                  title: isUnlocked ? def.hint : '🔒 ' + def.hint,
                  style: {
                    background: active ? palette.accent : palette.bg,
                    color: active ? palette.onAccent : (isUnlocked ? palette.text : palette.textMute),
                    border: '1px solid ' + (active ? palette.accent : palette.border),
                    borderRadius: '999px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    opacity: isUnlocked ? 1 : 0.55
                  }
                }, isUnlocked ? (def.emoji + ' ' + def.label) : ('🔒 ' + def.label));
              })
            )
          );
        })()
      );
    }

    var stepBody = step === 1 ? renderSpeciesPicker()
                 : step === 2 ? renderColorPicker()
                 : renderNamePicker();

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': existing ? 'Edit companion' : 'Build a companion',
      onClick: function(e) {
        if (e.target === e.currentTarget) p.onCancel();
      },
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)', zIndex: 175,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg, border: '1px solid ' + palette.border,
          borderRadius: '14px', padding: '24px',
          maxWidth: '640px', width: '100%', maxHeight: '88vh',
          overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
          h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
            (existing ? 'Edit companion' : 'New companion') + ' · step ' + step + ' of 3'),
          h('button', {
            onClick: p.onCancel, 'aria-label': 'Close companion setup',
            style: { background: 'transparent', border: '1px solid ' + palette.border, color: palette.textDim, borderRadius: '8px', padding: '4px 10px', fontSize: '13px', cursor: 'pointer' }
          }, '✕')
        ),
        // Progress dots
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' } },
          [1, 2, 3].map(function(s) {
            return h('span', {
              key: 'sd-' + s,
              'aria-hidden': 'true',
              style: {
                width: s === step ? '20px' : '8px',
                height: '8px', borderRadius: '999px',
                background: s <= step ? palette.accent : palette.surface,
                border: '1px solid ' + (s <= step ? palette.accent : palette.border),
                transition: 'width 200ms'
              }
            });
          })
        ),
        stepBody,
        // Nav buttons
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid ' + palette.border } },
          existing ? h('button', {
            onClick: function() {
              if (window.confirm && !window.confirm('Remove your companion?')) return;
              if (p.onDelete) p.onDelete();
            },
            style: { background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
          }, '🗑 Remove') : h('span'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            step > 1 ? h('button', {
              onClick: function() { setStep(step - 1); },
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, '◀ Back') : h('button', {
              onClick: p.onCancel,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Cancel'),
            step < 3 ? h('button', {
              onClick: function() { setStep(step + 1); },
              disabled: step === 1 ? !canAdvanceFrom1 : !canAdvanceFrom2,
              style: {
                background: ((step === 1 ? canAdvanceFrom1 : canAdvanceFrom2)) ? palette.accent : palette.surface,
                color: ((step === 1 ? canAdvanceFrom1 : canAdvanceFrom2)) ? palette.onAccent : palette.textMute,
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: ((step === 1 ? canAdvanceFrom1 : canAdvanceFrom2)) ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                opacity: ((step === 1 ? canAdvanceFrom1 : canAdvanceFrom2)) ? 1 : 0.6
              }
            }, 'Next ▶') : h('button', {
              onClick: handleSave,
              disabled: !canSave,
              style: {
                background: canSave ? palette.accent : palette.surface,
                color: canSave ? palette.onAccent : palette.textMute,
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', opacity: canSave ? 1 : 0.6
              }
            }, existing ? 'Save changes' : '✨ Create companion')
          )
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6.6: GOAL BUILDER SUB-COMPONENT (Phase 2n)
  // ─────────────────────────────────────────────────────────
  function GoalBuilderInner(p) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var palette = p.palette;

    var draftTuple = useState(function() {
      return {
        title: (p.goal && p.goal.title) || '',
        metric: (p.goal && p.goal.metric) || 'pomodoros',
        targetCount: (p.goal && p.goal.targetCount) || 5,
        startDate: (p.goal && p.goal.startDate) || defaultGoalDateRange().startDate,
        endDate: (p.goal && p.goal.endDate) || defaultGoalDateRange().endDate,
        notes: (p.goal && p.goal.notes) || ''
      };
    });
    var draft = draftTuple[0];
    var setDraft = draftTuple[1];

    function setField(field, val) {
      var next = Object.assign({}, draft);
      next[field] = val;
      setDraft(next);
    }

    function isoToDateInput(iso) {
      if (!iso) return '';
      try {
        var d = new Date(iso);
        var yyyy = d.getFullYear();
        var mm = ('0' + (d.getMonth() + 1)).slice(-2);
        var dd = ('0' + d.getDate()).slice(-2);
        return yyyy + '-' + mm + '-' + dd;
      } catch (e) { return ''; }
    }
    function dateInputToIso(s, isEnd) {
      if (!s) return null;
      var d = new Date(s + (isEnd ? 'T23:59:59' : 'T00:00:00'));
      return d.toISOString();
    }

    var titleOk = (draft.title || '').trim().length > 0;
    var targetOk = draft.targetCount > 0;
    var dateOk = draft.startDate && draft.endDate
      && new Date(draft.startDate).getTime() < new Date(draft.endDate).getTime();
    var canSave = titleOk && targetOk && dateOk;

    function handleSave() {
      p.onSave({
        title: (draft.title || '').trim(),
        metric: draft.metric,
        targetCount: parseInt(draft.targetCount, 10) || 1,
        startDate: draft.startDate,
        endDate: draft.endDate,
        notes: (draft.notes || '').trim()
      });
    }

    var metric = getGoalMetric(draft.metric) || GOAL_METRICS[0];

    function applyPreset(preset) {
      setDraft(Object.assign({}, draft, preset));
    }
    var presets = [
      { label: '5 Pomodoros this week', metric: 'pomodoros', targetCount: 5, title: '5 Pomodoros this week' },
      { label: '3 reflections this week', metric: 'reflections', targetCount: 3, title: '3 reflections this week' },
      { label: '2 quizzes passed', metric: 'quizzes-passed', targetCount: 2, title: '2 quizzes passed' },
      { label: '1 story walk', metric: 'walks', targetCount: 1, title: '1 story walk' }
    ];

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': p.goal && p.goal.title ? 'Edit goal' : 'Build a new goal',
      onClick: function(e) {
        if (e.target === e.currentTarget) p.onCancel();
      },
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)', zIndex: 175,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }
    },
      h('div', {
        style: {
          background: palette.bg, border: '1px solid ' + palette.border,
          borderRadius: '14px', padding: '24px',
          maxWidth: '540px', width: '100%', maxHeight: '88vh',
          overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
          h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
            '🎯 ' + (p.goal && p.goal.title ? 'Edit goal' : 'Set a goal')),
          h('button', {
            onClick: p.onCancel, 'aria-label': 'Close goal builder',
            style: { background: 'transparent', border: '1px solid ' + palette.border, color: palette.textDim, borderRadius: '8px', padding: '4px 10px', fontSize: '13px', cursor: 'pointer' }
          }, '✕')
        ),
        h('p', {
          style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5' }
        }, 'Pick something measurable for a defined window of time. Goals appear in your memory overview, the print packet, and earn +3 bonus tokens on completion.'),

        h('div', { style: { fontSize: '11px', color: palette.textMute, marginBottom: '6px', fontWeight: 600 } }, 'Quick start:'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' } },
          presets.map(function(pr, i) {
            return h('button', {
              key: 'gp-' + i,
              onClick: function() { applyPreset(pr); },
              style: {
                background: 'transparent', color: palette.textDim,
                border: '1px solid ' + palette.border, borderRadius: '999px',
                padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }
            }, pr.label);
          })
        ),

        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'Goal title'),
        h('input', {
          type: 'text', value: draft.title,
          onChange: function(e) { setField('title', e.target.value); },
          placeholder: 'e.g. "5 Pomodoros this week" or "Master the spelling deck"',
          'aria-label': 'Goal title',
          style: {
            width: '100%', padding: '8px 10px',
            background: palette.surface, border: '1px solid ' + palette.border,
            borderRadius: '8px', color: palette.text,
            fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
            marginBottom: '12px'
          }
        }),

        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'What to count'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' } },
          GOAL_METRICS.map(function(m) {
            var active = draft.metric === m.id;
            return h('button', {
              key: 'gm-' + m.id,
              onClick: function() { setField('metric', m.id); },
              'aria-pressed': active ? 'true' : 'false',
              style: {
                background: active ? palette.accent : palette.surface,
                color: active ? palette.onAccent : palette.text,
                border: '1.5px solid ' + (active ? palette.accent : palette.border),
                borderRadius: '8px', padding: '8px 12px',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left'
              }
            },
              h('div', { style: { fontWeight: 700 } }, m.emoji + ' ' + m.label),
              h('div', { style: { fontSize: '11px', opacity: 0.8, marginTop: '2px' } }, m.hint)
            );
          })
        ),

        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'Target count · ' + metric.label),
        h('input', {
          type: 'number',
          min: 1, max: 999,
          value: draft.targetCount,
          onChange: function(e) { setField('targetCount', parseInt(e.target.value, 10) || 1); },
          'aria-label': 'Target count',
          style: {
            width: '100%', padding: '8px 10px',
            background: palette.surface, border: '1px solid ' + palette.border,
            borderRadius: '8px', color: palette.text,
            fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
            marginBottom: '12px'
          }
        }),

        h('div', { style: { display: 'flex', gap: '10px', marginBottom: '12px' } },
          h('div', { style: { flex: 1 } },
            h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'Start'),
            h('input', {
              type: 'date',
              value: isoToDateInput(draft.startDate),
              onChange: function(e) { setField('startDate', dateInputToIso(e.target.value, false)); },
              'aria-label': 'Start date',
              style: {
                width: '100%', padding: '8px 10px',
                background: palette.surface, border: '1px solid ' + palette.border,
                borderRadius: '8px', color: palette.text,
                fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box'
              }
            })
          ),
          h('div', { style: { flex: 1 } },
            h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'End'),
            h('input', {
              type: 'date',
              value: isoToDateInput(draft.endDate),
              onChange: function(e) { setField('endDate', dateInputToIso(e.target.value, true)); },
              'aria-label': 'End date',
              style: {
                width: '100%', padding: '8px 10px',
                background: palette.surface, border: '1px solid ' + palette.border,
                borderRadius: '8px', color: palette.text,
                fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box'
              }
            })
          )
        ),

        h('label', { style: { display: 'block', fontSize: '12px', color: palette.textDim, marginBottom: '4px', fontWeight: 600 } }, 'Notes (optional)'),
        h('textarea', {
          value: draft.notes,
          onChange: function(e) { setField('notes', e.target.value); },
          placeholder: 'Why this goal? Anything to remember about it?',
          'aria-label': 'Goal notes',
          rows: 2,
          style: {
            width: '100%', padding: '8px 10px',
            background: palette.surface, border: '1px solid ' + palette.border,
            borderRadius: '8px', color: palette.text,
            fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box',
            marginBottom: '14px', resize: 'vertical', lineHeight: '1.45'
          }
        }),

        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid ' + palette.border } },
          p.goal ? h('button', {
            onClick: function() {
              if (window.confirm && !window.confirm('Delete this goal?')) return;
              if (p.onDelete) p.onDelete();
            },
            style: { background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
          }, '🗑 Delete') : h('span'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
              onClick: p.onCancel,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Cancel'),
            h('button', {
              onClick: handleSave,
              disabled: !canSave,
              style: {
                background: canSave ? palette.accent : palette.surface,
                color: canSave ? palette.onAccent : palette.textMute,
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', opacity: canSave ? 1 : 0.6
              }
            }, 'Save goal')
          )
        )
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
    // Optional Gemini hook — used by the ✨ Polish button on voice-dictated
    // reflections and (future) the reflection-insights sidebar. Routes
    // through props so the host controls API quotas and rate limiting.
    var callGemini = props.callGemini;

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
      // Phase 2p.12/2p.13 — backfill any new rooms added after the
      // student\'s saved state was written. Preserves existing rooms\'
      // unlocked-state and slot counts.
      ['garden', 'library', 'studio'].forEach(function(roomId) {
        if (!merged.rooms.some(function(r) { return r.id === roomId; })) {
          var defaultRoom = DEFAULT_STATE.rooms.filter(function(r) { return r.id === roomId; })[0];
          if (defaultRoom) merged.rooms = merged.rooms.concat([defaultRoom]);
        }
      });
      // Default activeRoomId
      if (!merged.activeRoomId) merged.activeRoomId = 'main';
      // Ensure activeRoomId points to a room that exists; fall back to main
      if (!merged.rooms.some(function(r) { return r.id === merged.activeRoomId; })) {
        merged.activeRoomId = 'main';
      }
      if (!Array.isArray(merged.decorations))    merged.decorations    = [];
      if (!Array.isArray(merged.journalEntries)) merged.journalEntries = [];
      if (!Array.isArray(merged.earnings))       merged.earnings       = [];
      if (!Array.isArray(merged.stories))        merged.stories        = [];
      if (!Array.isArray(merged.goals))          merged.goals          = [];
      if (!Array.isArray(merged.visits))         merged.visits         = [];
      if (!merged.achievements || typeof merged.achievements !== 'object') merged.achievements = {};
      // Phase 2p.7 defensive normalization: backfill new fields onto
      // older saved state so post-update loads don\'t crash on undefined
      // access. These hits run once per session.
      merged.decorations = merged.decorations.map(function(d) {
        if (!d) return d;
        var patched = Object.assign({}, d);
        if (!Array.isArray(patched.subjects)) patched.subjects = [];  // Phase 2p.6
        if (typeof patched.mood === 'undefined') patched.mood = null; // Phase 2m
        // Phase 2p.12 — ensure placement.roomId is set so multi-room
        // filtering doesn\'t drop pre-existing decorations
        if (patched.placement && !patched.placement.roomId) {
          patched.placement = Object.assign({}, patched.placement, { roomId: 'main' });
        }
        return patched;
      });
      // Companion: ensure skillCelebrations object + createdAt sane
      if (merged.companion && typeof merged.companion === 'object') {
        merged.companion = Object.assign({
          skillCelebrations: { focus: 0, memory: 0, reflection: 0, storytelling: 0 },
          lastBubbleAt: null,
          lastBubbleText: null,
          lastQuizPromptDeckId: null,
          lastQuizPromptDismissedAt: null,
          happiness: 0,             // Phase 2p.8 — petting builds this
          lastPettedAt: null
        }, merged.companion);
        // Normalize skillCelebrations even if present-but-incomplete
        merged.companion.skillCelebrations = Object.assign(
          { focus: 0, memory: 0, reflection: 0, storytelling: 0 },
          merged.companion.skillCelebrations || {}
        );
        // Repair createdAt if missing/invalid (treat as just-created)
        if (!merged.companion.createdAt
            || isNaN(new Date(merged.companion.createdAt).getTime())) {
          merged.companion.createdAt = new Date().toISOString();
        }
        // Phase 2p.32 — custom phrases array (forward-compat default).
        if (!Array.isArray(merged.companion.customPhrases)) {
          merged.companion.customPhrases = [];
        }
      }
      // Phase 2p.6 tour
      if (typeof merged.tourSeen !== 'boolean') merged.tourSeen = false;
      // Phase 2p.3 room mode
      if (merged.roomMode !== 'live' && merged.roomMode !== 'build') {
        merged.roomMode = 'build';
      }
      // Phase 2p.34 — print section toggles. Backfill any missing keys
      // with true so older saves get the full packet by default.
      var printDefaults = {
        companion: true, achievements: true, goals: true,
        memoryDecks: true, stories: true, journals: true
      };
      if (!merged.printOptions || typeof merged.printOptions !== 'object') {
        merged.printOptions = Object.assign({}, printDefaults);
      } else {
        merged.printOptions = Object.assign({}, printDefaults, merged.printOptions);
      }
      // Phase 3a — arcade state. Defaults are safe for any save that
      // predates arcade mode; session always starts null on load even
      // if a previous session was mid-flight when the tab closed
      // (timer runs in-memory only, mid-session restart is not honored).
      if (!merged.arcade || typeof merged.arcade !== 'object') {
        merged.arcade = { minutesPerToken: 5, session: null };
      } else {
        if (typeof merged.arcade.minutesPerToken !== 'number'
            || merged.arcade.minutesPerToken < 1
            || merged.arcade.minutesPerToken > 60) {
          merged.arcade.minutesPerToken = 5;
        }
        // Always clear session on load — a stale session from a closed
        // tab shouldn't hold the user hostage to a non-existent timer.
        merged.arcade.session = null;
      }
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

    // ── Visit log (Phase 2p.11) ──
    // Stamp today\'s date once per session if not already there. The
    // streak helpers compute current/longest from this list.
    useEffect(function() {
      var todayStr = new Date().toISOString().slice(0, 10);
      if (!Array.isArray(state.visits)) {
        setStateField('visits', [todayStr]);
      } else if (state.visits.indexOf(todayStr) === -1) {
        setStateField('visits', state.visits.concat([todayStr]));
      }
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
          quizTokensEarnedToday: 0,
          storyWalkTokensEarnedToday: 0,
          // Pick 3 quests for the new day, deterministic by date so the
          // student sees the same trio if they reload mid-day.
          questIds: pickQuestsForDate(todayStr, 3),
          questsClaimed: false
        });
      } else if (!Array.isArray(state.dailyState.questIds) || state.dailyState.questIds.length === 0) {
        // Backfill — first session after the quest system shipped won't
        // have questIds yet; populate them without resetting the rest of
        // the day's progress.
        setStateField('dailyState', Object.assign({}, state.dailyState, {
          questIds: pickQuestsForDate(todayStr, 3),
          questsClaimed: false
        }));
      }
      // eslint-disable-next-line
    }, [state.dailyState.date]);

    // ── Reflection insights analysis ──
    // Sends the last 14 journal entries' text to Gemini for summarization
    // of mood themes + recurring topics + a 1-sentence reflection. Result
    // is cached in state.insightsState so flipping between modals doesn't
    // re-bill the call. Refresh button bypasses cache. Falls back to a
    // local word-count + prompt-frequency view if Gemini errors or isn't
    // wired (still useful: tells the student how much they've written).
    function runInsightsAnalysis() {
      var entries = (state.journalEntries || []).slice().sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      }).slice(0, 14);
      if (entries.length === 0) return;
      // Compute local stats first — these always work, no AI required.
      var totalWords = 0;
      var promptCounts = {};
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var words = (e.text || '').trim().split(/\s+/).filter(Boolean).length;
        totalWords += words;
        var pid = e.prompt || '(free write)';
        promptCounts[pid] = (promptCounts[pid] || 0) + 1;
      }
      // Most-frequent prompt id → its full text (for display).
      var topPromptId = null, topPromptCount = 0;
      Object.keys(promptCounts).forEach(function(id) {
        if (promptCounts[id] > topPromptCount) { topPromptId = id; topPromptCount = promptCounts[id]; }
      });
      var topPromptText = (PROMPT_BANK.find(function(p) { return p.id === topPromptId; }) || {}).text || topPromptId;
      var localStats = {
        entriesAnalyzed: entries.length,
        wordCount: totalWords,
        topPromptText: topPromptText,
        topPromptCount: topPromptCount,
        firstEntryDate: entries[entries.length - 1].date,
        lastEntryDate: entries[0].date
      };
      if (typeof callGemini !== 'function') {
        // No AI — show local stats only, no narrative summary.
        setStateField('insightsState', {
          loading: false,
          summary: Object.assign({}, localStats, { moodSummary: null, themes: [] }),
          error: null,
          generatedAt: new Date().toISOString()
        });
        return;
      }
      setStateField('insightsState', { loading: true, summary: null, error: null, generatedAt: null });
      // Build the prompt. Send entries newest-first so the model weights
      // recency. Each entry: date + prompt + text. Cap each entry at 600
      // chars to keep total prompt size manageable.
      var entriesPayload = entries.map(function(e) {
        var d = (e.date || '').slice(0, 10);
        var promptText = e.prompt ? (PROMPT_BANK.find(function(p) { return p.id === e.prompt; }) || {}).text || '' : '';
        var text = (e.text || '').slice(0, 600);
        return '— ' + d + (promptText ? ' (' + promptText + ')' : '') + ': ' + text;
      }).join('\n');
      var insightsPrompt =
        'You are reading a student\'s journal entries from the last 2 weeks (newest first). ' +
        'Summarize gently and respectfully — this is private reflection, not data to evaluate. ' +
        'Return STRICT JSON with these fields:\n' +
        '  "moodSummary": one short sentence describing the overall emotional tone (e.g. "Mostly hopeful with a hard week mid-period"). Use first-person where natural ("you sound..."). NEVER diagnose.\n' +
        '  "themes": array of 3-6 short noun phrases capturing recurring topics (e.g. "school pressure", "best friend", "sleep").\n' +
        '  "encouragement": one short sentence of warm, non-prescriptive encouragement specific to what you read.\n' +
        'Do NOT include any other fields. Do NOT add markdown fencing. Do NOT speculate beyond the text. If the entries are too short or sparse to summarize, return moodSummary as "Not enough yet" and themes:[].\n\n' +
        'Entries:\n' + entriesPayload;
      Promise.resolve()
        .then(function() { return callGemini(insightsPrompt); })
        .then(function(out) {
          var raw = (typeof out === 'string' ? out : (out && out.text) || '').trim();
          // Strip code fences if Gemini wrapped them.
          raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          var parsed = null;
          try { parsed = JSON.parse(raw); } catch (e) { /* fall through */ }
          if (!parsed) throw new Error('Could not parse insights response');
          setStateField('insightsState', {
            loading: false,
            summary: Object.assign({}, localStats, {
              moodSummary: typeof parsed.moodSummary === 'string' ? parsed.moodSummary : null,
              themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 6) : [],
              encouragement: typeof parsed.encouragement === 'string' ? parsed.encouragement : null
            }),
            error: null,
            generatedAt: new Date().toISOString()
          });
        })
        .catch(function(err) {
          // Show local stats + error message — partial value beats nothing.
          setStateField('insightsState', {
            loading: false,
            summary: Object.assign({}, localStats, { moodSummary: null, themes: [] }),
            error: 'AI summary unavailable. Local stats shown below.',
            generatedAt: new Date().toISOString()
          });
        });
    }

    // ── Quest claim ──
    // Triggered when the user clicks the trifecta-claim button. Verifies
    // all 3 quests are actually complete before granting the bonus, and
    // marks dailyState.questsClaimed so it can't be claimed twice.
    function claimQuestTrifecta() {
      var ds = state.dailyState;
      if (!ds || ds.questsClaimed) return;
      var quests = (ds.questIds || []).map(function(id) {
        return QUEST_POOL.find(function(q) { return q.id === id; });
      }).filter(Boolean);
      if (quests.length < 3) return;
      var allDone = quests.every(function(q) { return q.check(ds, state); });
      if (!allDone) return;
      var bonus = 5;
      setStateMulti({
        tokens: state.tokens + bonus,
        dailyState: Object.assign({}, ds, { questsClaimed: true }),
        earnings: state.earnings.concat([{ source: 'quest-trifecta', tokens: bonus, date: new Date().toISOString() }])
      });
      addToast('🎉 Daily trifecta! +' + bonus + ' bonus tokens', 'success');
    }

    // ── Esc to close (Phase 2p.7 quality pass — WCAG 2.1.1 keyboard) ──
    // Universal Escape handler: closes the active modal if one is open,
    // otherwise closes AlloHaven itself. Active Pomodoro takes precedence
    // — Esc during a focus session is too easy to hit accidentally; users
    // must explicitly use the Cancel button.
    useEffect(function() {
      if (!props.isOpen) return;
      var handler = function(e) {
        if (e.key !== 'Escape') return;
        // Ignore Esc during active Pomodoro (accidental cancel guard)
        if (state.pomodoroState && state.pomodoroState.active) return;
        // Ignore until welcome card dismissed
        if (!state.onboardingSeen) return;
        if (state.activeModal) {
          // Close the active modal. Some modals (memory/story-walk/goal-
          // builder/etc.) clear generateContext too; do it universally.
          setStateMulti({ activeModal: null, generateContext: null });
          return;
        }
        if (props.onClose) props.onClose();
      };
      window.addEventListener('keydown', handler);
      return function() { window.removeEventListener('keydown', handler); };
    }, [props.isOpen, state.activeModal, state.onboardingSeen, state.pomodoroState.active]);

    // ── Pomodoro tick interval (250ms) ──
    // Only runs while the timer is active. Re-renders the mm:ss display.
    // Cheap; doesn't affect perceived smoothness at 4Hz.
    useEffect(function() {
      // Tick while Pomodoro OR breathing pacer OR arcade session is
      // active so any mm:ss / elapsed displays smoothly refresh.
      var pomActive = !!(state.pomodoroState && state.pomodoroState.active);
      var breatheActive = state.activeModal === 'breathe';
      var arcadeActive = !!(state.arcade && state.arcade.session);
      if (!pomActive && !breatheActive && !arcadeActive) return;
      var iv = setInterval(function() { setNowTick(Date.now()); }, 250);
      return function() { clearInterval(iv); };
      // eslint-disable-next-line
    }, [state.pomodoroState.active, state.activeModal, state.arcade && state.arcade.session]);

    // Phase 3a — auto-end the arcade session when the timer expires.
    // Lives outside the tick effect so it fires once per session
    // boundary instead of every 250ms.
    useEffect(function() {
      if (!state.arcade || !state.arcade.session) return;
      var endsMs = new Date(state.arcade.session.endsAt).getTime();
      if (isNaN(endsMs)) return;
      var msLeft = endsMs - Date.now();
      if (msLeft <= 0) { endArcadeSession('expired'); return; }
      var t = setTimeout(function() { endArcadeSession('expired'); }, msLeft + 50);
      return function() { clearTimeout(t); };
      // eslint-disable-next-line
    }, [state.arcade && state.arcade.session && state.arcade.session.endsAt]);

    // ── Ambient soundscape (Phase 2g) ──
    // Procedural Web Audio noise — no external assets. A 5-second buffer
    // of white noise is generated once and looped through a low-pass
    // filter chain whose params define the timbre:
    //   rain      : pink-ish low-pass at 1200 Hz with subtle tremolo
    //   fireplace : brown noise (heavier low-pass at 400 Hz) + crackles
    //   wind      : narrow band-pass at 600 Hz with slow LFO modulation
    // Quiet by design (peak gain 0.15) — this is background, not music.
    // Auto-fades in during focus phase, fades out on break / stop.
    var audioRef = useRef(null);
    useEffect(function() {
      // Tear-down on every change so each sound (or 'off') gets a clean
      // graph. The new graph is built only if we should currently be
      // playing.
      var ar = audioRef.current;
      if (ar && ar.gainNode && ar.ctx) {
        try {
          ar.gainNode.gain.cancelScheduledValues(ar.ctx.currentTime);
          ar.gainNode.gain.setTargetAtTime(0, ar.ctx.currentTime, 0.4);
        } catch (e) {}
        try {
          setTimeout(function() {
            try {
              if (ar.source && typeof ar.source.stop === 'function') ar.source.stop();
              if (ar.crackleTimer) clearInterval(ar.crackleTimer);
              if (ar.lfoSource && typeof ar.lfoSource.stop === 'function') ar.lfoSource.stop();
              if (ar.ctx && typeof ar.ctx.close === 'function') ar.ctx.close();
            } catch (e2) {}
          }, 600);
        } catch (e) {}
        audioRef.current = null;
      }
      var soundscape = state.soundscape || 'off';
      var pomActive = state.pomodoroState && state.pomodoroState.active;
      var phase = state.pomodoroState && state.pomodoroState.phase;
      // Play during the focus phase only — not breaks. (Most users find
      // ambient sound during a break unwelcome — they want quiet between
      // focus blocks.)
      if (soundscape === 'off' || !pomActive || phase !== 'focus') return;
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        var ctx = new Ctx();
        // Generate 5s of white noise — looped, this is enough to mask
        // any seam clicking while keeping memory tiny (~2MB at 48 kHz).
        var bufferSize = ctx.sampleRate * 5;
        var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        if (soundscape === 'fireplace') {
          // Brown noise — integrate white over time. Heavy bass for that
          // crackling-fireplace warmth. We then layer crackles on top.
          var lastOut = 0;
          for (var i = 0; i < bufferSize; i++) {
            var w = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * w)) / 1.02;
            data[i] = lastOut * 3.5;
          }
        } else {
          // Pink-ish noise — Voss-McCartney approximation. Plenty close
          // for ambient use; a true Voss would loop multiple octave
          // generators which isn't worth the complexity here.
          var b0 = 0, b1 = 0, b2 = 0;
          for (var j = 0; j < bufferSize; j++) {
            var w2 = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + w2 * 0.0555179;
            b1 = 0.99332 * b1 + w2 * 0.0750759;
            b2 = 0.96900 * b2 + w2 * 0.1538520;
            data[j] = (b0 + b1 + b2 + w2 * 0.1848) * 0.11;
          }
        }
        var src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        var lp = ctx.createBiquadFilter();
        lp.type = (soundscape === 'wind') ? 'bandpass' : 'lowpass';
        lp.frequency.value = soundscape === 'rain' ? 1200 : soundscape === 'fireplace' ? 400 : soundscape === 'wind' ? 600 : 1200;
        lp.Q.value = soundscape === 'wind' ? 1.5 : 0.7;
        var gain = ctx.createGain();
        gain.gain.value = 0; // start silent and fade in
        src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
        src.start();
        // Smooth fade-in over 1.5 seconds.
        var peak = 0.15;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(peak, ctx.currentTime, 0.6);
        // Fireplace crackles — random short pops layered over the brown
        // noise. Each crackle is a tiny burst of high-frequency noise
        // that quickly decays, evoking wood snapping.
        var crackleTimer = null;
        if (soundscape === 'fireplace') {
          var spawnCrackle = function() {
            try {
              var dur = 0.05 + Math.random() * 0.08;
              var crackleBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
              var cd = crackleBuf.getChannelData(0);
              for (var k = 0; k < cd.length; k++) {
                cd[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / cd.length, 2.4);
              }
              var cs = ctx.createBufferSource();
              cs.buffer = crackleBuf;
              var cg = ctx.createGain();
              cg.gain.value = 0.04 + Math.random() * 0.06;
              cs.connect(cg); cg.connect(ctx.destination);
              cs.start();
            } catch (eC) {}
          };
          crackleTimer = setInterval(function() {
            if (Math.random() < 0.7) spawnCrackle();
          }, 400 + Math.floor(Math.random() * 600));
        }
        // Wind LFO — slow gain modulation so the bandpass swells in/out.
        var lfoSource = null;
        if (soundscape === 'wind') {
          lfoSource = ctx.createOscillator();
          lfoSource.frequency.value = 0.15;
          var lfoGain = ctx.createGain();
          lfoGain.gain.value = 0.08;
          lfoSource.connect(lfoGain);
          lfoGain.connect(gain.gain);
          lfoSource.start();
        }
        audioRef.current = { ctx: ctx, source: src, gainNode: gain, crackleTimer: crackleTimer, lfoSource: lfoSource };
      } catch (audioErr) {
        // Audio unavailable / autoplay-blocked — silent fail. The setting
        // stays as-is and will retry next time the focus phase starts
        // after a user gesture.
      }
      // eslint-disable-next-line
    }, [state.soundscape, state.pomodoroState.active, state.pomodoroState.phase]);
    // Hard-stop on unmount to release the AudioContext.
    useEffect(function() {
      return function() {
        var ar = audioRef.current;
        if (!ar) return;
        try { if (ar.source && typeof ar.source.stop === 'function') ar.source.stop(); } catch (e) {}
        try { if (ar.crackleTimer) clearInterval(ar.crackleTimer); } catch (e) {}
        try { if (ar.lfoSource && typeof ar.lfoSource.stop === 'function') ar.lfoSource.stop(); } catch (e) {}
        try { if (ar.ctx && typeof ar.ctx.close === 'function') ar.ctx.close(); } catch (e) {}
        audioRef.current = null;
      };
    }, []);

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

        // Post-Pomodoro warm offer (Phase 2p.4) — clear the companion\'s
        // quiz-prompt cooldown so a due deck can re-surface "while
        // you\'re warm". The student just trained their focus muscle;
        // retrieval practice is most effective on a recently-engaged
        // brain. Sims-y "want to do this together while we\'re here?".
        if (state.companion && state.companion.species) {
          updates.companion = Object.assign({}, state.companion, {
            lastQuizPromptDismissedAt: null
          });
        }

        // Phase 2p.20 — gentle 3-tone bell when focus completes.
        // Suppressed for cycle-bonus completion since the cycle-bonus
        // toast already celebrates. Skipped if user disabled in settings.
        if (state.pomodoroChimeEnabled !== false && !isFourthInCycle) {
          try { playPomodoroChime(); } catch (e) { /* fail silent */ }
        } else if (state.pomodoroChimeEnabled !== false && isFourthInCycle) {
          // Cycle-bonus gets the chime too — students who completed 4
          // straight Pomodoros deserve more of a celebration, not less
          try { playPomodoroChime(); } catch (e) { /* fail silent */ }
        }

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
    function submitReflection(text, promptId, mood, promptTextOverride) {
      var trimmed = (text || '').trim();
      if (!trimmed) return;
      var alreadyEarned = (state.dailyState.reflectionsSubmitted || 0) >= 1;
      var tokensEarned = alreadyEarned ? 0 : 1;
      // Phase 2p.17 — adaptive prompts pass their text directly via
      // promptTextOverride (since the text is computed from current state
      // and isn\'t in the static PROMPT_BANK).
      var promptText = promptTextOverride || (promptId ? getPromptText(promptId) : null);
      var entry = {
        id: 'j-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        date: new Date().toISOString(),
        prompt: promptText,
        promptId: promptId || null,
        text: trimmed,
        mood: mood || null,
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

    // ── Review queue (Phase 2p.9) ──
    // Sequential auto-advance through all currently due decks. Queue
    // is stored on state.generateContext.reviewQueue when an active
    // memory modal is part of a queue traversal. advanceReviewQueue()
    // either opens the next deck or shows the summary modal.

    function startReviewQueue() {
      var dueDecks = (state.decorations || []).filter(function(d) {
        return d.linkedContent && isMemoryDue(d);
      });
      if (dueDecks.length === 0) {
        addToast('No decks due for review right now.');
        return;
      }
      // Sort due decks oldest-reviewed-first (same priority as companion picker)
      dueDecks.sort(function(a, b) {
        var aR = (a.linkedContent && a.linkedContent.lastReviewedAt) || '';
        var bR = (b.linkedContent && b.linkedContent.lastReviewedAt) || '';
        if (!aR && bR) return -1;
        if (aR && !bR) return 1;
        return aR.localeCompare(bR);
      });
      var queue = dueDecks.map(function(d) { return d.id; });
      // Open first deck with queue context attached
      setStateMulti({
        activeModal: 'memory',
        generateContext: {
          decorationId: queue[0],
          autoStartQuiz: true,
          reviewQueue: { decks: queue, currentIdx: 0, results: [] }
        }
      });
    }

    // Called by MemoryModalInner via onAdvanceQueue prop after a deck\'s
    // quiz finishes. Records the score in the queue results, then either
    // opens the next deck or shows the summary.
    function advanceReviewQueue(scorePct) {
      var ctx = state.generateContext || {};
      var q = ctx.reviewQueue;
      if (!q) {
        // No queue active — fall through to default (close memory modal)
        setStateMulti({ activeModal: null, generateContext: null });
        return;
      }
      var newResults = (q.results || []).concat([{
        decorationId: q.decks[q.currentIdx],
        scorePct: scorePct
      }]);
      var nextIdx = q.currentIdx + 1;
      if (nextIdx >= q.decks.length) {
        // Queue complete — show summary
        setStateMulti({
          activeModal: 'review-queue-summary',
          generateContext: { reviewQueue: Object.assign({}, q, { results: newResults }) }
        });
      } else {
        // Advance to next deck
        setStateMulti({
          activeModal: 'memory',
          generateContext: {
            decorationId: q.decks[nextIdx],
            autoStartQuiz: true,
            reviewQueue: Object.assign({}, q, { currentIdx: nextIdx, results: newResults })
          }
        });
      }
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

    // ── Goals (Phase 2n) ──
    // Time-boxed targets with completion celebration. Designed for the
    // student/clinician progress-monitoring loop. Token bonus on
    // completion (+3) is meaningful but not large enough to motivate
    // gaming the system.

    function createGoal() {
      var range = defaultGoalDateRange();
      var newGoal = {
        id: 'g-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: '',
        metric: 'pomodoros',
        targetCount: 5,
        startDate: range.startDate,
        endDate: range.endDate,
        completedAt: null,
        notes: ''
      };
      setStateMulti({
        goals: state.goals.concat([newGoal]),
        activeModal: 'goal-builder',
        generateContext: { goalId: newGoal.id }
      });
    }

    // Create a goal pre-populated from a template (Phase 2p.36). Drops
    // the student into the goal-builder modal so they can rename it /
    // adjust dates if needed before committing. The goal record is
    // already in state by then so a closed builder leaves it active.
    function createGoalFromTemplate(template) {
      if (!template) return;
      var startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      var endDate = new Date(startDate.getTime() + (template.days || 7) * 24 * 60 * 60 * 1000);
      var newGoal = {
        id: 'g-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: template.title,
        metric: template.metric,
        targetCount: template.targetCount,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        completedAt: null,
        notes: '',
        templateId: template.id
      };
      setStateMulti({
        goals: state.goals.concat([newGoal]),
        activeModal: 'goal-builder',
        generateContext: { goalId: newGoal.id, fromTemplate: true }
      });
      addToast('🎯 Started: ' + template.title);
    }

    function updateGoal(goalId, updates) {
      var newGoals = state.goals.map(function(g) {
        if (g.id !== goalId) return g;
        return Object.assign({}, g, updates);
      });
      setStateField('goals', newGoals);
    }

    function deleteGoal(goalId) {
      setStateField('goals', state.goals.filter(function(g) { return g.id !== goalId; }));
      addToast('Goal removed.');
    }

    // Mark a goal completed manually OR auto-detect on every state
    // change. Auto-detect runs in a useEffect below; this manual
    // version is for "I did this on paper" style edge cases.
    function markGoalCompleted(goalId) {
      var nowIso = new Date().toISOString();
      var goal = state.goals.filter(function(g) { return g.id === goalId; })[0];
      if (!goal || goal.completedAt) return;
      var bonus = 3;
      var newGoals = state.goals.map(function(g) {
        if (g.id !== goalId) return g;
        return Object.assign({}, g, { completedAt: nowIso });
      });
      setStateMulti({
        goals: newGoals,
        tokens: state.tokens + bonus,
        earnings: state.earnings.concat([{
          source: 'goal-completed',
          tokens: bonus,
          date: nowIso,
          metadata: { goalId: goalId, metric: goal.metric, target: goal.targetCount }
        }])
      });
      setTimeout(function() {
        addToast('🎯 Goal complete! +' + bonus + ' bonus tokens.');
      }, 50);
    }

    // Auto-detect goal completion: any open goal that's now ≥ target
    // gets completedAt stamped + bonus awarded once.
    useEffect(function() {
      var open = (state.goals || []).filter(function(g) { return !g.completedAt; });
      if (open.length === 0) return;
      var newlyComplete = [];
      open.forEach(function(g) {
        var prog = computeGoalProgress(g, state);
        if (prog.isDone) newlyComplete.push(g);
      });
      if (newlyComplete.length === 0) return;
      var nowIso = new Date().toISOString();
      var bonus = 3;
      var newGoals = state.goals.map(function(g) {
        if (newlyComplete.indexOf(g) === -1) return g;
        return Object.assign({}, g, { completedAt: nowIso });
      });
      var newEarnings = state.earnings.concat(newlyComplete.map(function(g) {
        return {
          source: 'goal-completed',
          tokens: bonus,
          date: nowIso,
          metadata: { goalId: g.id, metric: g.metric, target: g.targetCount }
        };
      }));
      setStateMulti({
        goals: newGoals,
        tokens: state.tokens + bonus * newlyComplete.length,
        earnings: newEarnings
      });
      setTimeout(function() {
        if (newlyComplete.length === 1) {
          addToast('🎯 Goal complete! +' + bonus + ' bonus tokens.');
        } else {
          addToast('🎯 ' + newlyComplete.length + ' goals complete! +' + (bonus * newlyComplete.length) + ' bonus tokens.');
        }
      }, 50);
      // eslint-disable-next-line
    }, [
      state.tokens, state.decorations.length, state.journalEntries.length,
      (state.dailyState || {}).pomodorosCompleted,
      (state.stories || []).length, state.goals.length
    ]);

    // ── Reflection cloze quiz (Phase 2i) ──
    // Awards a token (capped 1/day, shared with the memory-quiz cap) when
    // a student scores ≥80% quizzing themselves on cloze blanks in their
    // own journal entry. Active recall on your own writing is a strong
    // memory move and gentle metacognitive prompt.
    function recordReflectionQuiz(entryId, scorePct) {
      var nowIso = new Date().toISOString();
      var capHit = (state.dailyState.quizTokensEarnedToday || 0) >= 2;
      var qualifies = scorePct >= 80;
      var earned = (qualifies && !capHit) ? 1 : 0;

      var updates = {};
      if (earned > 0) {
        updates.tokens = state.tokens + earned;
        updates.earnings = state.earnings.concat([{
          source: 'reflection-cloze-quiz',
          tokens: earned,
          date: nowIso,
          metadata: { entryId: entryId, scorePct: scorePct }
        }]);
        updates.dailyState = Object.assign({}, state.dailyState, {
          quizTokensEarnedToday: (state.dailyState.quizTokensEarnedToday || 0) + earned
        });
        setTimeout(function() {
          addToast('🪙 +1 token. ' + Math.round(scorePct) + '% on your own words.');
        }, 50);
        setStateMulti(updates);
      } else if (qualifies && capHit) {
        addToast(Math.round(scorePct) + '% — daily quiz tokens already earned.');
      } else {
        addToast(Math.round(scorePct) + '% on cloze recall.');
      }
    }

    // ── Companion + skill levels (Phase 2p) ──
    // Setup wizard creates state.companion. Once set, the overlay renders
    // bottom-right of the floor surface. Click the companion to: (a) get a
    // fresh thought bubble, (b) excited-bounce reaction. Settings access
    // (re-pick species/color/rename) via the "edit" button on the companion
    // tooltip menu — opens the same setup wizard.

    function saveCompanion(updates) {
      // Merge patch onto existing companion (or initialize from null)
      var current = state.companion || {
        species: null, colorVariant: 'warm', name: '',
        createdAt: null, lastBubbleAt: null, lastBubbleText: null,
        skillCelebrations: { focus: 0, memory: 0, reflection: 0, storytelling: 0 }
      };
      var next = Object.assign({}, current, updates);
      if (!next.createdAt) next.createdAt = new Date().toISOString();
      // Normalize skillCelebrations always present
      next.skillCelebrations = Object.assign({ focus: 0, memory: 0, reflection: 0, storytelling: 0 }, next.skillCelebrations || {});
      setStateField('companion', next);
    }

    // Companion letter generation (Phase 2p.18)
    // Idempotent per ISO week — calling multiple times in a week
    // returns the cached letter unless `force` is true. Uses Gemini
    // when available, otherwise falls back to the template builder.
    function generateCompanionLetter(force, onDone) {
      var c = state.companion;
      if (!c || !c.species) {
        if (onDone) onDone({ error: 'no-companion' });
        return;
      }
      var weekKey = getWeekKey();
      var cached = (state.companionLetters || {})[weekKey];
      if (cached && cached.text && !force) {
        if (onDone) onDone({ text: cached.text, fromCache: true });
        return;
      }
      var agg = aggregateWeekData(state);
      var name = c.name || (getCompanionSpecies(c.species) || {}).label || 'Buddy';
      var fallback = composeFallbackLetter(state, agg, c.species, name);
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== 'function') {
        // No AI available — use fallback directly
        var fbLetter = { text: fallback, generatedAt: new Date().toISOString(), source: 'template' };
        var newLetters = Object.assign({}, state.companionLetters || {});
        newLetters[weekKey] = fbLetter;
        setStateField('companionLetters', newLetters);
        if (onDone) onDone({ text: fallback, source: 'template' });
        return;
      }
      var prompt = buildLetterPrompt(agg, c.species, name);
      Promise.resolve()
        .then(function() { return callGeminiFn(prompt); })
        .then(function(out) {
          var text = (typeof out === 'string' ? out : (out && out.text) || '').trim();
          // Strip surrounding quotes if Gemini wrapped the response
          if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
            text = text.slice(1, -1).trim();
          }
          // Sanity check — reject too-short or empty AI responses
          if (!text || text.length < 30) {
            text = fallback;
          }
          var letter = { text: text, generatedAt: new Date().toISOString(), source: 'ai' };
          var newLetters = Object.assign({}, state.companionLetters || {});
          newLetters[weekKey] = letter;
          setStateField('companionLetters', newLetters);
          if (onDone) onDone({ text: text, source: 'ai' });
        })
        .catch(function() {
          // AI failed — fall back to template
          var fbLetter = { text: fallback, generatedAt: new Date().toISOString(), source: 'template-fallback' };
          var newLetters = Object.assign({}, state.companionLetters || {});
          newLetters[weekKey] = fbLetter;
          setStateField('companionLetters', newLetters);
          if (onDone) onDone({ text: fallback, source: 'template-fallback' });
        });
    }

    // Daily treat (Phase 2p.16) — once per calendar day, students can
    // give the companion a treat. Bumps happiness by 2 (capped at 10),
    // fires excited bounce + species-flavored gratitude bubble. Sims-y
    // care interaction without manipulative needs spirals — the
    // companion never demands a treat or signals hunger.
    function canGiveTreatToday() {
      var c = state.companion;
      if (!c || !c.species) return false;
      if (state.roomMode === 'live') return false;
      var todayStr = new Date().toISOString().slice(0, 10);
      var lastStr = c.lastTreatAt ? c.lastTreatAt.slice(0, 10) : null;
      return lastStr !== todayStr;
    }
    function giveCompanionTreat() {
      if (!canGiveTreatToday()) return;
      var c = state.companion;
      var sp = getCompanionSpecies(c.species);
      var nowIso = new Date().toISOString();
      var nextHappiness = Math.min(10, (c.happiness || 0) + 2);
      var thanks = {
        cat:    'Hmm. Crunchy. Pleasant.',
        fox:    'Oh — thanks!',
        owl:    'Most appreciated. Quietly.',
        turtle: 'Slowly nibbling. So good.',
        dragon: 'Whoa! Best treat ever!'
      };
      saveCompanion({
        happiness: nextHappiness,
        lastTreatAt: nowIso,
        lastBubbleAt: nowIso,
        lastBubbleText: (thanks[c.species] || thanks.cat) + ' (+♥)'
      });
      // Fire the same excited-bounce reaction the click handler uses.
      // The state.companion update propagates; the companion overlay
      // re-renders with the new happiness and bubble.
      addToast('🍪 ' + (c.name || sp.label) + ' got a treat!');
    }

    // Generate a state-aware thought bubble — observational only, never
    // guilt-inducing. Picks the first applicable observation, falling
    // back to a species-flavored idle line. Voice prefix is NOT prepended
    // to observations (would produce broken grammar like "What if you I
    // like the new plant"); voice character lives in the idle filler
    // pool and the species-specific opener tags below.
    // Pick the single most-due deck for companion prompting (Phase 2p.4).
    // Prefers never-reviewed first, then oldest-reviewed. Skips the deck
    // the companion just prompted about (so we don\'t re-prompt the same
    // one twice in a row). Returns null if nothing's due.
    function pickDueDeckForCompanion() {
      var allDue = (state.decorations || []).filter(function(d) {
        return d.linkedContent && isMemoryDue(d);
      });
      if (allDue.length === 0) return null;
      // De-prioritize the last-prompted deck so subsequent visits rotate
      var lastPromptedId = state.companion && state.companion.lastQuizPromptDeckId;
      var rotated = allDue.filter(function(d) { return d.id !== lastPromptedId; });
      var pool = rotated.length > 0 ? rotated : allDue;
      // Sort: never-reviewed first, then oldest-reviewed
      pool.sort(function(a, b) {
        var aR = (a.linkedContent && a.linkedContent.lastReviewedAt) || '';
        var bR = (b.linkedContent && b.linkedContent.lastReviewedAt) || '';
        if (!aR && bR) return -1;
        if (aR && !bR) return 1;
        return aR.localeCompare(bR);
      });
      return pool[0];
    }

    // Should the companion offer a quiz on this visit?
    // Rules:
    //   • A due deck must exist
    //   • Student hasn\'t dismissed a prompt in the last 6 hours (cooldown)
    //   • Live mode is OFF (don\'t pester during rest)
    //   • Daily quiz cap not yet hit
    function shouldOfferQuizPrompt() {
      if (state.roomMode === 'live') return false;
      if (!state.companion || !state.companion.species) return false;
      var capHit = (state.dailyState && state.dailyState.quizTokensEarnedToday) >= 2;
      if (capHit) return false;
      var lastDismissAt = state.companion.lastQuizPromptDismissedAt;
      if (lastDismissAt) {
        var ageMs = Date.now() - new Date(lastDismissAt).getTime();
        if (ageMs < 6 * 60 * 60 * 1000) return false;
      }
      return !!pickDueDeckForCompanion();
    }

    function dismissQuizPrompt() {
      saveCompanion({
        lastQuizPromptDismissedAt: new Date().toISOString()
      });
    }
    function acceptQuizPrompt(decoration) {
      // Stamp this deck as the last-prompted so rotation works
      saveCompanion({
        lastQuizPromptDeckId: decoration.id,
        lastQuizPromptDismissedAt: new Date().toISOString()
      });
      // Open the memory modal in quiz auto-start mode
      openMemoryModal(decoration.id, true);
    }

    function generateBubbleText(state, species) {
      var sp = getCompanionSpecies(species);
      var lastBubble = (state.companion && state.companion.lastBubbleText) || '';
      // A short species-specific opener that reads as the critter's voice
      // without grammatical agreement issues. Empty-string-safe.
      var openers = {
        cat:    ['Hmm. ', 'Quietly noticed: ', 'I see... '],
        fox:    ['Sneakily clever: ', 'Spotted: ', 'Aha — '],
        owl:    ['Observed: ', 'Worth noting: ', 'Hooo — '],
        turtle: ['Slowly noticed: ', 'Quietly: ', 'Step by step: '],
        dragon: ['Whoa! ', 'Big news: ', 'Yesss — ']
      };
      function pickOpener() {
        var pool = openers[species] || openers.cat;
        return pool[Math.floor(Math.random() * pool.length)];
      }
      var candidates = [];

      // Custom phrases (Phase 2p.32) — student-taught lines mix in at
      // ~25% probability when present. They join the candidate pool, so
      // the existing dedupe-against-lastBubble logic still applies.
      var customPhrases = (state.companion && Array.isArray(state.companion.customPhrases))
        ? state.companion.customPhrases : [];
      if (customPhrases.length > 0 && Math.random() < 0.25) {
        var phrasePick = customPhrases[Math.floor(Math.random() * customPhrases.length)];
        if ((phrasePick || '').trim().length > 0) {
          candidates.push(phrasePick.trim());
        }
      }

      // Recent decoration (last 24h)
      var newDecs = (state.decorations || []).filter(function(d) {
        if (d.isStarter || !d.earnedAt) return false;
        return (Date.now() - new Date(d.earnedAt).getTime()) < 24 * 60 * 60 * 1000;
      });
      if (newDecs.length > 0) {
        var deco = newDecs[newDecs.length - 1];
        var dLabel = deco.templateLabel || deco.template || 'decoration';
        candidates.push(pickOpener() + 'the new ' + dLabel + ' looks nice.');
      }

      // Pomodoro completed today
      var pomToday = (state.dailyState && state.dailyState.pomodorosCompleted) || 0;
      if (pomToday > 0) {
        candidates.push(pickOpener() + 'you\'ve focused ' + pomToday + ' time' + (pomToday === 1 ? '' : 's') + ' today.');
      }

      // Quiz cap hit
      var quizToday = (state.dailyState && state.dailyState.quizTokensEarnedToday) || 0;
      if (quizToday >= 2) {
        candidates.push(pickOpener() + 'you really studied today.' + (sp ? ' ' + sp.affirm : ''));
      }

      // Reflection streak — count consecutive days with at least one entry
      var entries = (state.journalEntries || []).slice();
      if (entries.length >= 2) {
        var byDay = {};
        entries.forEach(function(e) {
          if (!e.date) return;
          byDay[e.date.slice(0, 10)] = true;
        });
        var streakDays = 0;
        for (var i = 0; i < 14; i++) {
          var dayStr = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          if (byDay[dayStr]) streakDays++; else break;
        }
        if (streakDays >= 3) {
          candidates.push(pickOpener() + 'you\'ve been reflecting ' + streakDays + ' days in a row.');
        }
      }

      // Goal nearing deadline
      var goals = state.goals || [];
      goals.forEach(function(g) {
        if (g.completedAt) return;
        if (!g.endDate) return;
        var endMs = new Date(g.endDate).getTime();
        var msLeft = endMs - Date.now();
        if (msLeft < 0 || msLeft > 2 * 24 * 60 * 60 * 1000) return;
        var prog = computeGoalProgress(g, state);
        candidates.push(pickOpener() + 'your goal "' + g.title + '" ends soon — you\'re at ' + prog.current + '/' + prog.target + '.');
      });

      // Stale memory (5+ days no quiz on any deck)
      var staleDecks = (state.decorations || []).filter(function(d) {
        if (!d.linkedContent) return false;
        var lc = d.linkedContent;
        if (lc.type === 'notes' && !hasClozeMarkers(lc)) return false;
        if (!lc.lastReviewedAt) return true;
        return (Date.now() - new Date(lc.lastReviewedAt).getTime()) >= 5 * 24 * 60 * 60 * 1000;
      });
      if (staleDecks.length > 0) {
        candidates.push(pickOpener() + staleDecks.length + ' deck' + (staleDecks.length === 1 ? '' : 's') + ' haven\'t been visited lately.');
      }

      // Mood-cluster (last 7 days, struggle dominant)
      var weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      var recentDecs = (state.decorations || []).filter(function(d) {
        return d.mood && d.earnedAt && new Date(d.earnedAt).getTime() >= weekAgoMs;
      });
      if (recentDecs.length >= 3) {
        var struggleCount = recentDecs.filter(function(d) { return d.mood === 'struggle'; }).length;
        if (struggleCount / recentDecs.length >= 0.5) {
          candidates.push(pickOpener() + 'a tough week — proud of you for showing up.');
        }
      }

      // Story walked recently
      var recentWalk = (state.earnings || []).some(function(e) {
        if (e.source !== 'story-walk') return false;
        return (Date.now() - new Date(e.date).getTime()) < 24 * 60 * 60 * 1000;
      });
      if (recentWalk) {
        candidates.push(pickOpener() + 'loved that story walk.');
      }

      // ── Companion-remembers history facts (Phase 2p.5) ──
      // Bubble lines that reference cumulative history. Triggers at
      // round-number thresholds so the buddy "remembers" milestones
      // without being annoyingly chatty about smaller numbers.

      // Total Pomodoros this week
      var weekAgoMs2 = Date.now() - 7 * 24 * 60 * 60 * 1000;
      var pomThisWeek = (state.earnings || []).filter(function(e) {
        return (e.source === 'pomodoro' || e.source === 'cycle-bonus')
          && e.date && new Date(e.date).getTime() >= weekAgoMs2;
      }).length;
      if (pomThisWeek >= 3) {
        candidates.push(pickOpener() + 'that\'s ' + pomThisWeek + ' Pomodoros this week. Real focus practice.');
      }

      // Total cards quizzed (lifetime)
      var totalCards = 0;
      (state.decorations || []).forEach(function(d) {
        if (!d.linkedContent || d.linkedContent.type !== 'flashcards') return;
        var cards = (d.linkedContent.data && d.linkedContent.data.cards) || [];
        cards.forEach(function(c) {
          totalCards += (c.correctCount || 0) + (c.missCount || 0);
        });
      });
      // Round-number threshold: only mention at 25, 50, 100, 200, 500
      var roundThresholds = [25, 50, 100, 200, 500];
      if (roundThresholds.indexOf(totalCards) !== -1) {
        candidates.push(pickOpener() + 'that\'s ' + totalCards + ' cards quizzed total. Memory shapes itself this way.');
      }

      // Story walks lifetime
      var totalWalks = (state.earnings || []).filter(function(e) {
        return e.source === 'story-walk';
      }).length;
      if (totalWalks >= 3 && [3, 5, 10, 25].indexOf(totalWalks) !== -1) {
        candidates.push(pickOpener() + 'we\'ve walked ' + totalWalks + ' stories together now.');
      }

      // Companion days-old milestones
      if (state.companion && state.companion.createdAt) {
        var daysWith = Math.floor((Date.now() - new Date(state.companion.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if ([7, 14, 30, 60, 100].indexOf(daysWith) !== -1) {
          candidates.push(pickOpener() + 'we\'ve been together ' + daysWith + ' days now.');
        }
      }

      // Total decorations lifetime (excluding starter)
      var totalDecs = (state.decorations || []).filter(function(d) { return !d.isStarter; }).length;
      if ([5, 10, 20, 50].indexOf(totalDecs) !== -1) {
        candidates.push(pickOpener() + 'your room has ' + totalDecs + ' decorations now. It really feels like yours.');
      }

      // Achievement count milestones
      var achCount = Object.keys(state.achievements || {}).length;
      if ([5, 10, 15, 20].indexOf(achCount) !== -1) {
        candidates.push(pickOpener() + 'you have ' + achCount + ' achievements unlocked. Quietly proud.');
      }

      // "On this day" memory (Phase 2p.13) — companion surfaces a
      // decoration earned exactly 1, 3, or 6 months ago today. Built-
      // in spaced re-encounter: students bump into past artifacts
      // they\'d otherwise scroll past. Only fires when an exact match
      // exists at one of the milestones.
      (function() {
        var now = new Date();
        var milestones = [
          { months: 1, label: 'a month ago' },
          { months: 3, label: 'three months ago' },
          { months: 6, label: 'six months ago' },
          { months: 12, label: 'a year ago' }
        ];
        milestones.forEach(function(m) {
          var target = new Date(now.getFullYear(), now.getMonth() - m.months, now.getDate());
          var targetIso = target.toISOString().slice(0, 10);
          var match = (state.decorations || []).filter(function(d) {
            if (d.isStarter || !d.earnedAt) return false;
            return d.earnedAt.slice(0, 10) === targetIso;
          })[0];
          if (match) {
            var ml = match.templateLabel || match.template || 'decoration';
            candidates.push(pickOpener() + 'on this day ' + m.label + ', you earned the ' + ml + '.');
          }
        });
      })();

      // Seasonal context (Phase 2p.11) — date-aware lines surfaced
      // before idle filler so they take priority on the right days
      // without dominating every visit.
      var season = getSeasonalContext();
      if (season) {
        var seasonLines = {
          winter:    [pickOpener() + 'cozy in here, with the winter outside.', pickOpener() + 'something about winter that makes a quiet room feel right.'],
          spring:    [pickOpener() + 'spring is stirring.', pickOpener() + 'the air is changing — spring.'],
          summer:    [pickOpener() + 'long days now. Summer.', pickOpener() + 'summer light suits the room.'],
          fall:      [pickOpener() + 'leaves are turning.', pickOpener() + 'fall — quietly my favorite season.'],
          spooky:    [pickOpener() + 'something spooky in the air. Boo. (Just kidding.)', pickOpener() + 'spooky season — extra cozy.'],
          valentine: [pickOpener() + 'I\'m glad we hang out.', pickOpener() + 'we make a good team, you and I.']
        };
        (seasonLines[season.id] || []).forEach(function(l) { candidates.push(l); });
      }

      // Streak celebration — fires on milestone visits (3, 7, 14, 30 day)
      var streak = computeStreak(state.visits || []);
      if ([3, 7, 14, 30, 60, 100].indexOf(streak.current) !== -1) {
        candidates.push(pickOpener() + 'that\'s ' + streak.current + ' days in a row. Quietly proud.');
      }

      // Idle filler — fully species-flavored standalone lines (no
      // synthetic concatenation) so grammar reads naturally for each.
      var fillers = {
        cat:    ['Hmm. A quiet moment.', 'The room looks nice today.', 'I\'ll just sit here a while.', 'Cozy.'],
        fox:    ['What if you started a Pomodoro?', 'What if you wrote a reflection?', 'What about a new decoration?', 'A clever move would be a quiz session.'],
        owl:    ['Considering... a quiet day is fine too.', 'Considering... what to study next.', 'The room is restful.', 'A pause is also a kind of progress.'],
        turtle: ['Slow and steady today.', 'I\'m here when you\'re ready.', 'No rush — small steps work.', 'Patience.'],
        dragon: ['Whoa! Ready when you are!', 'Whoa! What\'s next?', 'Adventure awaits!', 'Let\'s do something epic!']
      };
      (fillers[species] || fillers.cat).forEach(function(f) { candidates.push(f); });

      // Pick first candidate that isn't the same as last (or first overall if all same)
      for (var k = 0; k < candidates.length; k++) {
        if (candidates[k] !== lastBubble) return candidates[k];
      }
      return candidates[0] || 'Hi.';
    }

    // Triggered on click OR auto-fired once on first render-with-companion
    function refreshCompanionBubble() {
      if (!state.companion || !state.companion.species) return;
      var text = generateBubbleText(state, state.companion.species);
      saveCompanion({
        lastBubbleAt: new Date().toISOString(),
        lastBubbleText: text
      });
    }

    // Companion dreams (Phase 2p.18) — when the companion is sleeping
    // (Live mode), rotate through dream-fragment bubbles every ~10s.
    // References recent decorations so dreams feel personal. Cycles
    // suspended outside Live mode so it doesn\'t pollute Build-mode bubbles.
    function pickDreamFragment() {
      var c = state.companion;
      if (!c || !c.species) return null;
      var sp = getCompanionSpecies(c.species);
      var pool = [];
      // Recent decoration mentions (most personal)
      var recentDecs = (state.decorations || []).filter(function(d) {
        return !d.isStarter && d.earnedAt;
      }).slice(-5);
      recentDecs.forEach(function(d) {
        var dl = d.templateLabel || d.template || 'something';
        pool.push('💭 dreaming of the ' + dl + '...');
      });
      // Story walks
      var walkable = (state.stories || []).filter(function(s) {
        var v = (s.steps || []).filter(function(stp) { return stp.decorationId && (stp.narrative || '').trim().length > 0; });
        return v.length >= 3 && (s.title || '').trim().length > 0;
      });
      if (walkable.length > 0) {
        var s = walkable[Math.floor(Math.random() * walkable.length)];
        pool.push('💭 walking through "' + s.title + '" in a dream...');
      }
      // Generic dreams
      var generic = {
        cat:    ['💭 dreaming of warm spots and quiet hours...', '💭 a soft snore...', '💭 dreaming of the room from above...'],
        fox:    ['💭 dreaming of clever things...', '💭 chasing a thought through tall grass...', '💭 a quick foxy snore...'],
        owl:    ['💭 dreaming of moonlight on books...', '💭 a long quiet hoot in sleep...', '💭 dreaming of stars...'],
        turtle: ['💭 dreaming of slow rivers...', '💭 a contented sigh...', '💭 dreaming of warm rocks...'],
        dragon: ['💭 dreaming of GIANT adventures!', '💭 a tiny puff of dream-smoke...', '💭 dreaming of treasure (stories count as treasure)...']
      };
      (generic[c.species] || generic.cat).forEach(function(g) { pool.push(g); });
      if (pool.length === 0) return null;
      // Avoid repeating the immediately-previous bubble
      var prev = c.lastBubbleText || '';
      for (var i = 0; i < pool.length; i++) {
        var pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick !== prev) return pick;
      }
      return pool[0];
    }

    // Tick interval — only active while sleeping, rotates the bubble
    // every 10 seconds so the buddy feels dream-like rather than frozen.
    useEffect(function() {
      if (!state.companion || !state.companion.species) return;
      if (state.roomMode !== 'live') return;
      // Set a first dream now if no recent bubble
      var nowMs = Date.now();
      var lastMs = state.companion.lastBubbleAt
        ? new Date(state.companion.lastBubbleAt).getTime() : 0;
      if (nowMs - lastMs > 6000) {
        var first = pickDreamFragment();
        if (first) {
          saveCompanion({
            lastBubbleAt: new Date().toISOString(),
            lastBubbleText: first
          });
        }
      }
      var iv = setInterval(function() {
        var next = pickDreamFragment();
        if (next) {
          saveCompanion({
            lastBubbleAt: new Date().toISOString(),
            lastBubbleText: next
          });
        }
      }, 10000);
      return function() { clearInterval(iv); };
      // eslint-disable-next-line
    }, [state.roomMode, state.companion ? state.companion.species : null]);

    // ── Story method (Phase 2e) ──
    // Stories are top-level artifacts: an ordered chain of ≥3 decorations
    // with per-step narrative text. Walking a completed story is retrieval
    // practice — the spatial mnemonic of the room compounds with the
    // narrative chaining technique. Tokens: +1 one-time on first save of
    // a ≥3-step story; +1 per walk completion (capped 1/day total across
    // all stories — gentle, anti-grind).

    function createStory() {
      var newStory = {
        id: 'story-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: '',
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastReviewedAt: null,
        reviewCount: 0,
        firstSaveAwarded: false
      };
      setStateMulti({
        stories: state.stories.concat([newStory]),
        activeModal: 'story-builder',
        generateContext: { storyId: newStory.id }
      });
    }

    function updateStory(storyId, updates) {
      // updates is { title?, steps? } — patch shape onto existing story.
      // First-save token: when a story crosses ≥3 valid steps for the
      // first time AND has a title, award +1.
      var current = state.stories.filter(function(s) { return s.id === storyId; })[0];
      if (!current) return;
      var nowIso = new Date().toISOString();
      var nextStory = Object.assign({}, current, updates, { updatedAt: nowIso });
      var validSteps = (nextStory.steps || []).filter(function(st) {
        return st.decorationId && (st.narrative || '').trim().length > 0;
      });
      var qualifies = validSteps.length >= 3 && (nextStory.title || '').trim().length > 0;
      var awarded = false;
      if (qualifies && !current.firstSaveAwarded) {
        nextStory.firstSaveAwarded = true;
        awarded = true;
      }
      var newStories = state.stories.map(function(s) {
        return s.id === storyId ? nextStory : s;
      });
      var stateUpdates = { stories: newStories };
      if (awarded) {
        stateUpdates.tokens = state.tokens + 1;
        stateUpdates.earnings = state.earnings.concat([{
          source: 'story-created',
          tokens: 1,
          date: nowIso,
          metadata: { storyId: storyId, stepCount: validSteps.length }
        }]);
        setTimeout(function() {
          addToast('🪙 +1 token. Your story is ready to walk through.');
        }, 50);
      }
      setStateMulti(stateUpdates);
    }

    function deleteStory(storyId) {
      setStateField('stories', state.stories.filter(function(s) { return s.id !== storyId; }));
      addToast('Story removed.');
    }

    // Award a token for completing a story walk (≥3 steps, walked through
    // every step). Capped at 1/day across all stories.
    function recordStoryWalk(storyId) {
      var story = state.stories.filter(function(s) { return s.id === storyId; })[0];
      if (!story) return;
      var nowIso = new Date().toISOString();
      var capHit = (state.dailyState.storyWalkTokensEarnedToday || 0) >= 1;
      var earned = capHit ? 0 : 1;

      var nextStory = Object.assign({}, story, {
        lastReviewedAt: nowIso,
        reviewCount: (story.reviewCount || 0) + 1
      });
      var newStories = state.stories.map(function(s) {
        return s.id === storyId ? nextStory : s;
      });
      var updates = { stories: newStories };
      if (earned > 0) {
        updates.tokens = state.tokens + earned;
        updates.earnings = state.earnings.concat([{
          source: 'story-walk',
          tokens: earned,
          date: nowIso,
          metadata: { storyId: storyId, stepCount: (story.steps || []).length }
        }]);
        updates.dailyState = Object.assign({}, state.dailyState, {
          storyWalkTokensEarnedToday: (state.dailyState.storyWalkTokensEarnedToday || 0) + earned
        });
        setTimeout(function() {
          addToast('🪙 +1 token. Story walked. Memory compounds.');
        }, 50);
      } else {
        setTimeout(function() {
          addToast('Walk recorded. (Daily story token already earned today — that\'s fine.)');
        }, 50);
      }
      setStateMulti(updates);
    }

    // Helper: is a decoration's memory content "due for review"?
    // Adaptive thresholds based on bestQuizScore — struggling decks
    // resurface faster than mastered ones. (Lightweight Leitner-inspired:
    // Anki uses an exponential ease curve; v2c uses 3 buckets for
    // simplicity. v2d could refine.)
    //
    //   Score < 60%  →  due after 2 days  (still wobbly, drill it)
    //   Score 60-89% →  due after 5 days  (default)
    //   Score ≥ 90%  →  due after 10 days (locked in, low priority)
    //
    //   Never reviewed → always due (encourages first-pass review)
    //   No quiz primitive (notes without cloze) → never auto-due
    function isMemoryDue(decoration) {
      var lc = decoration.linkedContent;
      if (!lc) return false;
      // Notes with no cloze markers can't be quizzed → don't auto-mark due
      if (lc.type === 'notes' && !hasClozeMarkers(lc)) return false;
      if (!lc.lastReviewedAt) return true;
      var lastMs = new Date(lc.lastReviewedAt).getTime();
      var ageMs = Date.now() - lastMs;
      var bestScore = lc.bestQuizScore || 0;
      var thresholdDays;
      if (bestScore < 60)      thresholdDays = 2;
      else if (bestScore < 90) thresholdDays = 5;
      else                     thresholdDays = 10;
      return ageMs >= thresholdDays * 24 * 60 * 60 * 1000;
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

    // ── Companion ephemeral state (Phase 2p) ──
    // blink state ticks every few seconds, click-react flag clears after
    // 600ms, confetti list holds active level-up celebrations
    var blinkTuple = useState(false);
    var blinking = blinkTuple[0];
    var setBlinking = blinkTuple[1];
    // Phase 2p.18 — letter generation loading state, lifted here so the
    // weekly-summary modal can reflect it without breaking React\'s
    // rules-of-hooks (hooks can\'t live inside conditionally-rendered
    // modal renderers).
    var letterLoadingTuple = useState(false);
    var letterLoading = letterLoadingTuple[0];
    var setLetterLoading = letterLoadingTuple[1];

    // Phase 2p.32 — companion-phrases draft, lifted for rules-of-hooks.
    var phraseDraftTuple = useState('');
    var phraseDraft = phraseDraftTuple[0];
    var setPhraseDraft = phraseDraftTuple[1];
    // Reset draft each time the phrases modal opens.
    useEffect(function() {
      if (state.activeModal !== 'companion-phrases') return;
      setPhraseDraft('');
      // eslint-disable-next-line
    }, [state.activeModal]);

    // Phase 2p.31 — sensory grounding (5-4-3-2-1) state, lifted here
    // per the established rules-of-hooks pattern. Steps cycle 0→1→2→3→4
    // (see → feel → hear → smell → taste). Per-step typed-thing notes
    // are optional; the act of looking/listening counts.
    var groundingStepTuple = useState(0);
    var groundingStep = groundingStepTuple[0];
    var setGroundingStep = groundingStepTuple[1];
    var groundingNotesTuple = useState(['', '', '', '', '']);
    var groundingNotes = groundingNotesTuple[0];
    var setGroundingNotes = groundingNotesTuple[1];
    // Reset grounding state each time the modal opens.
    useEffect(function() {
      if (state.activeModal !== 'grounding') return;
      setGroundingStep(0);
      setGroundingNotes(['', '', '', '', '']);
      // eslint-disable-next-line
    }, [state.activeModal]);

    // Phase 2p.28 — breathing pacer state, lifted here for the same
    // rules-of-hooks reason. The phase advance interval ONLY runs when
    // state.activeModal === 'breathe'.
    var breathePhaseTuple = useState('inhale');
    var breathePhase = breathePhaseTuple[0];
    var setBreathePhase = breathePhaseTuple[1];
    var breatheCyclesTuple = useState(0);
    var breatheCycles = breatheCyclesTuple[0];
    var setBreatheCycles = breatheCyclesTuple[1];
    var breatheVoiceOnTuple = useState(true);
    var breatheVoiceOn = breatheVoiceOnTuple[0];
    var setBreatheVoiceOn = breatheVoiceOnTuple[1];
    var breatheStartedAtTuple = useState(0);
    var breatheStartedAt = breatheStartedAtTuple[0];
    var setBreatheStartedAt = breatheStartedAtTuple[1];

    // Breathing pacer driver (Phase 2p.28). Resets on open and ticks
    // the phase machine ('inhale' → 'hold-in' → 'exhale' → 'hold-out')
    // every 4 seconds while the modal is open. The hook always runs;
    // the body short-circuits when the modal is closed so no work
    // happens unless the student opened the pacer.
    useEffect(function() {
      if (state.activeModal !== 'breathe') return;
      // Reset on each open so the orb starts at 'inhale' every time.
      setBreathePhase('inhale');
      setBreatheCycles(0);
      setBreatheStartedAt(Date.now());
      // First voice cue
      if (breatheVoiceOn && props.callTTS) {
        try { props.callTTS('Breathe in', { voice: props.selectedVoice, rate: 0.85 }); } catch (e) {}
      }
      var iv = setInterval(function() {
        setBreathePhase(function(prev) {
          var idx = ['inhale', 'hold-in', 'exhale', 'hold-out'].indexOf(prev);
          var next = ['inhale', 'hold-in', 'exhale', 'hold-out'][(idx + 1) % 4];
          if (next === 'inhale') {
            setBreatheCycles(function(c) { return c + 1; });
          }
          if (breatheVoiceOn && props.callTTS) {
            var label = next === 'inhale' ? 'Breathe in'
                       : next === 'hold-in' ? 'Hold'
                       : next === 'exhale' ? 'Breathe out'
                       : 'Rest';
            try { props.callTTS(label, { voice: props.selectedVoice, rate: 0.85 }); } catch (e) {}
          }
          return next;
        });
      }, 4000);
      return function() { clearInterval(iv); };
      // eslint-disable-next-line
    }, [state.activeModal, breatheVoiceOn]);
    var reactingTuple = useState(false);
    var reacting = reactingTuple[0];
    var setReacting = reactingTuple[1];
    var confettiTuple = useState([]); // [{ id, kind: 'skillUp', label, ts }]
    var confetti = confettiTuple[0];
    var setConfetti = confettiTuple[1];
    // Pupil tracking — cursor position relative to companion center,
    // normalized to [-1, 1]. (0, 0) when not hovered.
    var pupilOffsetTuple = useState({ x: 0, y: 0 });
    var pupilOffset = pupilOffsetTuple[0];
    var setPupilOffset = pupilOffsetTuple[1];
    // Petting (Phase 2p.8) — mousedown timer + a "just fired" guard so the
    // mouseup that follows a long-hold doesn\'t also fire a click bounce
    var pettingTimerRef = useRef(null);
    var pettingJustFiredRef = useRef(false);

    // Random-cadence blink (4-7s between blinks, 120ms blink duration)
    useEffect(function() {
      if (!state.companion) return;
      var nextBlink;
      function scheduleBlink() {
        var delay = 4000 + Math.random() * 3000;
        nextBlink = setTimeout(function() {
          setBlinking(true);
          setTimeout(function() { setBlinking(false); }, 120);
          scheduleBlink();
        }, delay);
      }
      scheduleBlink();
      return function() { if (nextBlink) clearTimeout(nextBlink); };
      // eslint-disable-next-line
    }, [state.companion ? state.companion.species : null]);

    // Happiness decay (Phase 2p.8) — companion happiness slowly fades
    // over time so petting feels meaningful. Once-per-mount: compute
    // days since lastPettedAt and decrement happiness accordingly. No
    // daily punishment vibe — happiness can only drop to 0, never below.
    useEffect(function() {
      var c = state.companion;
      if (!c || !c.species) return;
      if (!c.lastPettedAt || !(c.happiness > 0)) return;
      var daysSince = Math.floor((Date.now() - new Date(c.lastPettedAt).getTime()) / (24 * 60 * 60 * 1000));
      if (daysSince <= 0) return;
      var decayed = Math.max(0, (c.happiness || 0) - daysSince);
      if (decayed === c.happiness) return;
      saveCompanion({ happiness: decayed });
      // eslint-disable-next-line
    }, []);

    // First-visit bubble — fire once when companion exists + no recent bubble
    useEffect(function() {
      if (!state.companion || !state.companion.species) return;
      var lastBubbleMs = state.companion.lastBubbleAt
        ? new Date(state.companion.lastBubbleAt).getTime() : 0;
      // Refresh if last bubble is >6 hours old
      if (Date.now() - lastBubbleMs > 6 * 60 * 60 * 1000) {
        // Defer one tick so initial state hydration completes first
        setTimeout(function() { refreshCompanionBubble(); }, 100);
      }
      // eslint-disable-next-line
    }, [state.companion ? state.companion.species : null]);

    // Decoration-arrival reaction (Phase 2p.2) — when a new decoration
    // (non-starter) is placed, the companion does a happy bounce + emits
    // a species-specific celebration bubble. Watches decorations.length
    // and skips the initial mount via decorationCountRef.
    var decorationCountRef = useRef(state.decorations.length);
    useEffect(function() {
      if (!state.companion || !state.companion.species) {
        decorationCountRef.current = state.decorations.length;
        return;
      }
      var prev = decorationCountRef.current;
      var now = state.decorations.length;
      if (now > prev) {
        // Newest decoration is the one just added (sorted by earnedAt desc)
        var newest = state.decorations[state.decorations.length - 1];
        if (newest && !newest.isStarter) {
          var sp = state.companion.species;
          var dLabel = newest.templateLabel || newest.template || 'item';
          var celebs = {
            cat:    'Hmm — the new ' + dLabel + ' suits the room.',
            fox:    'Aha — a new ' + dLabel + '! Clever pick.',
            owl:    'Observed: a new ' + dLabel + '. Well chosen.',
            turtle: 'Slowly noticed: a beautiful ' + dLabel + '.',
            dragon: 'Whoa! A new ' + dLabel + '! Let\'s see it!'
          };
          // Trigger the excited bounce + persist the bubble
          setReacting(true);
          setTimeout(function() { setReacting(false); }, 600);
          saveCompanion({
            lastBubbleAt: new Date().toISOString(),
            lastBubbleText: celebs[sp] || celebs.cat
          });
        }
      }
      decorationCountRef.current = now;
      // eslint-disable-next-line
    }, [state.decorations.length]);

    // First-visit tour auto-fire (Phase 2p.6) — once the welcome card
    // is dismissed AND no other modal is up, kick off the tour. Only
    // fires when state.tourSeen is false (one-shot per student).
    useEffect(function() {
      if (state.tourSeen) return;
      if (!state.onboardingSeen) return; // wait for welcome card first
      if (state.activeModal) return;     // wait for other modals to close
      // Defer slightly so the welcome card animation completes
      var t = setTimeout(function() {
        if (!state.tourSeen && !state.activeModal && state.onboardingSeen) {
          setStateField('activeModal', 'tour');
        }
      }, 400);
      return function() { clearTimeout(t); };
      // eslint-disable-next-line
    }, [state.onboardingSeen, state.tourSeen, state.activeModal]);

    // Room unlock detection (Phase 2p.12/2p.13) — Garden, Library, and
    // Studio each unlock at distinct pedagogical milestones. Companion
    // celebrates each unlock with a species-flavored bubble; rooms
    // never re-lock once unlocked.
    useEffect(function() {
      var rooms = state.rooms || [];
      var newlyUnlocked = [];

      var placedCount = (state.decorations || []).filter(function(d) { return !d.isStarter; }).length;
      // Total flashcard quiz attempts across all decks
      var cardsQuizzed = (state.decorations || []).reduce(function(sum, d) {
        if (!d.linkedContent || d.linkedContent.type !== 'flashcards') return sum;
        var cards = (d.linkedContent.data && d.linkedContent.data.cards) || [];
        return sum + cards.reduce(function(s, c) { return s + (c.correctCount || 0) + (c.missCount || 0); }, 0);
      }, 0);
      var storyCount = (state.stories || []).filter(function(s) {
        var v = (s.steps || []).filter(function(stp) {
          return stp.decorationId && (stp.narrative || '').trim().length > 0;
        });
        return v.length >= 3 && (s.title || '').trim().length > 0;
      }).length;

      var checks = [
        { id: 'garden',  label: 'Garden',  icon: '🌳', condition: placedCount >= 10, hint: 'a quiet outdoor corner' },
        { id: 'library', label: 'Library', icon: '📚', condition: cardsQuizzed >= 30, hint: 'a focused study room' },
        { id: 'studio',  label: 'Studio',  icon: '🎨', condition: placedCount >= 15 || storyCount >= 5, hint: 'a wide creative space' }
      ];

      checks.forEach(function(c) {
        var room = rooms.filter(function(r) { return r.id === c.id; })[0];
        if (!room || room.unlocked) return;
        if (!c.condition) return;
        newlyUnlocked.push(c);
      });

      if (newlyUnlocked.length === 0) return;

      var newRooms = rooms.map(function(r) {
        var match = newlyUnlocked.filter(function(c) { return c.id === r.id; })[0];
        if (!match) return r;
        return Object.assign({}, r, { unlocked: true });
      });
      var updates = { rooms: newRooms };
      // Companion announcement — name only the FIRST newly-unlocked
      // (don\'t spam if multiple unlock simultaneously on a fresh load)
      if (state.companion && state.companion.species) {
        var openers = {
          cat:    'Hmm. ', fox: 'Aha — ', owl: 'Observed: ',
          turtle: 'Quietly: ', dragon: 'Whoa! '
        };
        var prefix = openers[state.companion.species] || 'Hmm. ';
        var first = newlyUnlocked[0];
        updates.companion = Object.assign({}, state.companion, {
          lastBubbleAt: new Date().toISOString(),
          lastBubbleText: prefix + 'the ' + first.label + ' just opened up — ' + first.hint + '. Try the ' + first.icon + ' tab.'
        });
      }
      setStateMulti(updates);
      setTimeout(function() {
        if (newlyUnlocked.length === 1) {
          var n = newlyUnlocked[0];
          addToast(n.icon + ' The ' + n.label + ' is now unlocked!');
        } else {
          addToast('🎉 ' + newlyUnlocked.length + ' new rooms unlocked!');
        }
      }, 60);
      // eslint-disable-next-line
    }, [state.decorations.length, state.stories.length]);

    // Achievement unlock detection (Phase 2p.5) — runs the catalog\'s
    // check() functions against current state. Newly-passing achievements
    // get an unlockedAt timestamp persisted + a companion celebration
    // bubble (if companion exists) + a non-blocking toast. Existing
    // unlocks are never re-fired, even if state regresses.
    useEffect(function() {
      var existing = state.achievements || {};
      var newly = [];
      ACHIEVEMENT_CATALOG.forEach(function(ach) {
        if (existing[ach.id]) return;
        try {
          if (ach.check(state)) newly.push(ach);
        } catch (err) { /* check failed silently — skip */ }
      });
      if (newly.length === 0) return;
      var nowIso = new Date().toISOString();
      var nextAchievements = Object.assign({}, existing);
      newly.forEach(function(ach) {
        nextAchievements[ach.id] = { unlockedAt: nowIso };
      });
      var stateUpdates = { achievements: nextAchievements };
      // Companion celebration on the FIRST newly-unlocked (one bubble per
      // batch — don\'t spam if many fire at once on a fresh-state import)
      if (state.companion && state.companion.species) {
        var first = newly[0];
        var companionPatch = {
          lastBubbleAt: nowIso,
          lastBubbleText: first.emoji + ' ' + first.label + '! ' + first.desc
        };
        // Phase 2p.22/2p.23 — auto-grant accessories when their
        // unlock-achievement fires, if companion has none. Bow takes
        // priority since it\'s the earliest-game unlock; flower next;
        // scarf the long-term reward.
        if (!state.companion.accessory) {
          var grantMap = { 'first-favorite': 'bow', 'first-reflection': 'flower', 'streak-30': 'scarf' };
          var grantBubble = {
            'first-favorite':   '🎀 Found a bow in the room — wearing it for you!',
            'first-reflection': '🌸 Tucked a little flower behind my ear. Thanks for writing.',
            'streak-30':        '🧣 You\'ve been here 30 days running. Made you a scarf — putting it on.'
          };
          // Pick the FIRST newly-unlocked accessory grant (highest priority by order)
          for (var gi = 0; gi < newly.length; gi++) {
            var grantId = grantMap[newly[gi].id];
            if (grantId) {
              companionPatch.accessory = grantId;
              companionPatch.lastBubbleText = grantBubble[newly[gi].id];
              break;
            }
          }
        }
        stateUpdates.companion = Object.assign({}, state.companion, companionPatch);
      }
      setStateMulti(stateUpdates);
      setTimeout(function() {
        if (newly.length === 1) {
          addToast(newly[0].emoji + ' Achievement: ' + newly[0].label);
        } else {
          addToast('🏆 ' + newly.length + ' achievements unlocked!');
        }
      }, 60);
      // eslint-disable-next-line
    }, [
      state.decorations.length,
      state.journalEntries.length,
      state.earnings.length,
      (state.stories || []).length,
      (state.goals || []).length,
      state.companion ? state.companion.species : null
    ]);

    // Skill level-up detection — compare current level vs cached
    // skillCelebrations[skillId] for each skill. If higher, fire confetti
    // + bubble + persist new high-watermark.
    useEffect(function() {
      if (!state.companion || !state.companion.species) return;
      var cele = (state.companion.skillCelebrations) || { focus: 0, memory: 0, reflection: 0, storytelling: 0 };
      var newCele = Object.assign({}, cele);
      var newConfetti = [];
      var leveledUp = [];
      SKILL_DEFS.forEach(function(def) {
        var count = countSkillEvents(state, def.id);
        var prog = computeSkillLevel(count);
        var lastLevel = cele[def.id] || 0;
        if (prog.level > lastLevel) {
          leveledUp.push({ def: def, level: prog.level });
          newCele[def.id] = prog.level;
          for (var k = 0; k < 6; k++) {
            newConfetti.push({
              id: def.id + '-' + Date.now() + '-' + k,
              kind: 'skillUp',
              label: def.emoji,
              left: 30 + Math.random() * 40, // %
              delay: k * 50 // ms stagger
            });
          }
        }
      });
      if (leveledUp.length > 0) {
        // Persist + show
        saveCompanion({
          skillCelebrations: newCele,
          lastBubbleAt: new Date().toISOString(),
          lastBubbleText: leveledUp[0].def.emoji + ' ' + leveledUp[0].def.label + ' level ' + leveledUp[0].level + '! ' + (getCompanionSpecies(state.companion.species) || {}).affirm
        });
        setConfetti(newConfetti);
        setTimeout(function() { setConfetti([]); }, 1200);
      }
      // eslint-disable-next-line
    }, [state.earnings.length, state.companion ? state.companion.species : null]);

    // ── Room expansion ──
    // When 90% of the current room slots are filled, advancing to the
    // next milestone unlocks 1 wall row + 1 floor row + 5 token bonus.
    // Triggered by useEffect watching decorations.length so it fires
    // exactly when the threshold is crossed.
    var roomExpandedRef = useRef(false);
    useEffect(function() {
      var room = state.rooms[0]; // expansion targets main bedroom only
      if (!room) return;
      var totalSlots = room.wallSlots + room.floorSlots;
      // Phase 2p.12: count only MAIN-room decorations toward expansion
      // threshold so garden decorations don\'t prematurely trigger
      // bedroom expansion.
      var placedCount = state.decorations.filter(function(d) {
        return d.placement && (d.placement.roomId || 'main') === 'main';
      }).length;
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
    // Move a decoration to a new cell (Phase 2p.10) — drag-to-rearrange.
    // If the target cell is empty, simply moves the decoration.
    // If target cell has another decoration, swaps placements.
    // Cross-surface swaps (wall ↔ floor) are allowed — the SVG/image
    // renders fine on either, and it gives students full freedom to
    // rearrange. No-op for self-drop or if source is the starter (which
    // students shouldn\'t inadvertently shuffle around without warning).
    function moveDecorationToCell(decorationId, targetSurface, targetCellIndex) {
      if (state.roomMode === 'live') return; // build mode only
      var activeId = state.activeRoomId || 'main';
      var decs = state.decorations || [];
      var srcIdx = -1, tgtIdx = -1;
      // Phase 2p.12 — target decoration must be in the SAME active room.
      // Otherwise a drop on cell N of the garden could "swap" with a
      // decoration in cell N of the bedroom (matching cellIndex but
      // different room).
      for (var i = 0; i < decs.length; i++) {
        if (decs[i].id === decorationId) srcIdx = i;
        if (decs[i].placement
            && (decs[i].placement.roomId || 'main') === activeId
            && decs[i].placement.surface === targetSurface
            && decs[i].placement.cellIndex === targetCellIndex) tgtIdx = i;
      }
      if (srcIdx === -1) return;
      if (srcIdx === tgtIdx) return; // self-drop = no-op

      // Validate the target cell is within ACTIVE room bounds for the surface
      var room = (state.rooms || []).filter(function(r) { return r.id === activeId; })[0]
              || state.rooms[0] || { wallSlots: 8, floorSlots: 12 };
      var maxIdx = targetSurface === 'wall' ? room.wallSlots : room.floorSlots;
      if (targetCellIndex < 0 || targetCellIndex >= maxIdx) return;

      var src = decs[srcIdx];
      var newDecs = decs.slice();
      if (tgtIdx !== -1) {
        // Swap: target decoration takes source\'s old placement
        newDecs[tgtIdx] = Object.assign({}, decs[tgtIdx], {
          placement: Object.assign({}, src.placement)
        });
      }
      newDecs[srcIdx] = Object.assign({}, src, {
        placement: { roomId: state.activeRoomId || 'main', surface: targetSurface, cellIndex: targetCellIndex }
      });
      setStateField('decorations', newDecs);
    }

    function placeDecoration(template, slots, artStyleId, imageBase64, reflectionText, moodTag, subjectTags) {
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
        placement: { roomId: state.activeRoomId || 'main', surface: ctx.surface, cellIndex: ctx.cellIndex },
        rotation: rotation,
        earnedAt: new Date().toISOString(),
        tokensSpent: DECORATION_COST,
        studentReflection: (reflectionText || '').trim(),
        mood: moodTag || null,                         // Phase 2m — affective tag
        subjects: Array.isArray(subjectTags) ? subjectTags : [],  // Phase 2p.6 — academic tags
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

    // Update mood on an existing decoration (Phase 2m)
    function setDecorationMood(decorationId, moodId) {
      var newDecs = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        return Object.assign({}, d, { mood: moodId || null });
      });
      setStateField('decorations', newDecs);
    }

    // Update subject tags on an existing decoration (Phase 2p.6).
    // Pass an array of subject ids; pass [] to clear all.
    function setDecorationSubjects(decorationId, subjectIds) {
      var clean = Array.isArray(subjectIds) ? subjectIds : [];
      var newDecs = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        return Object.assign({}, d, { subjects: clean });
      });
      setStateField('decorations', newDecs);
    }

    // Toggle favorite on a decoration (Phase 2p.14). Pure preference,
    // no token cost. Surfaces favorites first in memory overview + cell
    // overlay badge.
    function toggleDecorationFavorite(decorationId) {
      var newDecs = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        return Object.assign({}, d, { isFavorite: !d.isFavorite });
      });
      setStateField('decorations', newDecs);
    }

    // Voice notes (Phase 2p.15) — students record up to 30 seconds of
    // audio per decoration. Stored as base64 webm/opus in localStorage.
    // No token cost — voice is pure expression, not currency.
    function setDecorationVoiceNote(decorationId, base64, durationMs) {
      var hadBefore = false;
      var newDecs = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        hadBefore = !!(d.voiceNote && d.voiceNote.base64);
        return Object.assign({}, d, {
          voiceNote: {
            base64: base64,
            durationMs: durationMs,
            recordedAt: new Date().toISOString()
          }
        });
      });
      setStateField('decorations', newDecs);
      // Companion responds to the recording — small relational beat
      if (!hadBefore && state.companion && state.companion.species) {
        var openers = {
          cat: 'Hmm. ', fox: 'Aha — ', owl: 'Observed: ',
          turtle: 'Quietly: ', dragon: 'Whoa! '
        };
        var prefix = openers[state.companion.species] || 'Hmm. ';
        setTimeout(function() {
          saveCompanion({
            lastBubbleAt: new Date().toISOString(),
            lastBubbleText: prefix + 'I hear you. Saved.'
          });
        }, 80);
      }
    }
    function clearDecorationVoiceNote(decorationId) {
      var newDecs = state.decorations.map(function(d) {
        if (d.id !== decorationId) return d;
        var copy = Object.assign({}, d);
        delete copy.voiceNote;
        return copy;
      });
      setStateField('decorations', newDecs);
    }

    // "Make similar" — opens the generate modal with the same template +
    // slots pre-loaded, so students can iterate on a design they liked
    // (try a different color, different art style) without rebuilding
    // the whole config from scratch. Re-uses the standard generate
    // flow; charges the regular DECORATION_COST per item.
    function makeSimilarTo(decorationId) {
      var src = state.decorations.filter(function(d) { return d.id === decorationId; })[0];
      if (!src) return;
      // Find an empty cell in the active room to drop the new item into
      var activeId = state.activeRoomId || 'main';
      var room = (state.rooms || []).filter(function(r) { return r.id === activeId; })[0]
              || state.rooms[0];
      var occupied = {};
      state.decorations.forEach(function(d) {
        if (!d.placement) return;
        if ((d.placement.roomId || 'main') !== activeId) return;
        occupied[d.placement.surface + '-' + d.placement.cellIndex] = true;
      });
      var surface = src.placement && src.placement.surface || 'floor';
      var max = surface === 'wall' ? room.wallSlots : room.floorSlots;
      var found = -1;
      for (var i = 0; i < max; i++) {
        if (!occupied[surface + '-' + i]) { found = i; break; }
      }
      if (found === -1) {
        // No room on preferred surface — try the other
        var altSurface = surface === 'wall' ? 'floor' : 'wall';
        var altMax = altSurface === 'wall' ? room.wallSlots : room.floorSlots;
        for (var j = 0; j < altMax; j++) {
          if (!occupied[altSurface + '-' + j]) { surface = altSurface; found = j; break; }
        }
      }
      if (found === -1) {
        addToast('No empty cells in this room to place a similar one. Try removing or moving something first.');
        return;
      }
      // Pre-fill generate modal context with the source template + slots
      setStateMulti({
        activeModal: 'generate',
        generateContext: {
          surface: surface,
          cellIndex: found,
          preTemplate: src.template,
          preSlots: src.slots ? Object.assign({}, src.slots) : null,
          preArtStyle: src.artStyle || null
        }
      });
    }

    // Custom upload (Phase 2p.19) — student-uploaded image becomes a
    // decoration. Charges DECORATION_COST tokens up front (matches AI
    // path); on success returns true, otherwise false. Placement is
    // separate so the student can still see + confirm the upload before
    // it commits to the room.
    function chargeForCustomUpload() {
      if (state.tokens < DECORATION_COST) {
        addToast('Need ' + DECORATION_COST + ' 🪙 tokens. Currently you have ' + state.tokens + '.');
        return false;
      }
      setStateField('tokens', state.tokens - DECORATION_COST);
      return true;
    }

    // Place a custom-upload decoration. Reuses the existing decoration
    // shape; template = 'custom-upload' (or 'custom-drawing' for canvas).
    // Phase 2p.26: isDrawing flag distinguishes student-drawn from
    // student-uploaded so the badge + achievement differ.
    function placeCustomUpload(imageBase64, reflectionText, moodTag, subjectTags, isDrawing) {
      var ctx = state.generateContext || { surface: 'floor', cellIndex: 0 };
      var rotation = (Math.random() * 6) - 3;
      var entry = {
        id: 'd-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        template: isDrawing ? 'custom-drawing' : 'custom-upload',
        templateLabel: isDrawing ? 'Custom drawing' : 'Custom upload',
        slots: {},
        artStyle: 'custom',
        imageBase64: imageBase64,
        isStarter: false,
        isCustomUpload: !isDrawing, // legacy badge
        isCustomDrawing: !!isDrawing, // distinguishes drawn from uploaded
        placement: { roomId: state.activeRoomId || 'main', surface: ctx.surface, cellIndex: ctx.cellIndex },
        rotation: rotation,
        earnedAt: new Date().toISOString(),
        tokensSpent: DECORATION_COST,
        studentReflection: (reflectionText || '').trim(),
        mood: moodTag || null,
        subjects: Array.isArray(subjectTags) ? subjectTags : [],
        linkedContent: null,
        sourceTool: null,
        aiRationale: null
      };
      setStateMulti({
        decorations: state.decorations.concat([entry]),
        activeModal: null,
        generateContext: null
      });
      addToast(isDrawing ? '🎨 Your drawing is in the room.' : '🌿 Your image is in the room.');
    }

    // Export a decoration as a PNG share card (Phase 2p.33). Composes
    // the decoration's image + name + date + mood + subjects + truncated
    // reflection on a clean canvas, then triggers a download. Useful
    // for IEP packets, parent meetings, scrapbooks, sharing with peers.
    function exportDecorationAsImage(decorationId) {
      var d = (state.decorations || []).filter(function(x) { return x.id === decorationId; })[0];
      if (!d || !d.imageBase64) {
        addToast('No image to save.');
        return;
      }
      // Pre-load the decoration image so we can draw it.
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        try {
          var W = 1080, H = 1080;
          var canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          var ctx = canvas.getContext('2d');

          // Background — soft gradient based on active palette
          var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
          bgGrad.addColorStop(0, palette.bg);
          bgGrad.addColorStop(1, palette.surface);
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);

          // Thin border
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 4;
          ctx.strokeRect(20, 20, W - 40, H - 40);

          // Top label
          ctx.fillStyle = palette.textMute;
          ctx.font = '600 22px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('FROM ALLOHAVEN', 60, 70);

          // Decoration label (top right)
          var label = (d.templateLabel || d.template || 'decoration').toString();
          if (label.length > 26) label = label.slice(0, 24) + '…';
          ctx.fillStyle = palette.text;
          ctx.font = '700 24px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(label, W - 60, 70);

          // Decoration image — fit centered into a 700x700 box
          var BOX = 720, BX = (W - BOX) / 2, BY = 110;
          // Image background card
          ctx.fillStyle = palette.surface;
          ctx.strokeStyle = palette.border;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(BX, BY, BOX, BOX, 24);
          } else {
            ctx.rect(BX, BY, BOX, BOX);
          }
          ctx.fill();
          ctx.stroke();
          // Aspect-fit the decoration image
          var ar = img.naturalWidth / img.naturalHeight;
          var iw, ih;
          if (ar >= 1) { iw = BOX - 40; ih = (BOX - 40) / ar; }
          else         { ih = BOX - 40; iw = (BOX - 40) * ar; }
          var ix = BX + (BOX - iw) / 2;
          var iy = BY + (BOX - ih) / 2;
          ctx.drawImage(img, ix, iy, iw, ih);

          // Mood + subjects pill row
          var pillY = BY + BOX + 28;
          var pills = [];
          if (d.mood) {
            var mo = getMoodOption(d.mood);
            if (mo) pills.push(mo.emoji + '  ' + mo.label);
          }
          (d.subjects || []).slice(0, 3).forEach(function(sid) {
            var t = getSubjectTag(sid);
            if (t) pills.push(t.emoji + '  ' + t.label);
          });
          ctx.font = '600 18px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          var px = 60;
          pills.forEach(function(text) {
            var pw = ctx.measureText(text).width + 24;
            ctx.fillStyle = palette.surface;
            ctx.strokeStyle = palette.border;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, pillY, pw, 32, 16);
            else ctx.rect(px, pillY, pw, 32);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = palette.text;
            ctx.fillText(text, px + 12, pillY + 22);
            px += pw + 8;
            if (px > W - 200) return;
          });

          // Reflection text — wrapped, truncated
          var refl = (d.studentReflection || '').trim();
          if (refl.length > 0) {
            ctx.font = 'italic 22px Georgia, serif';
            ctx.fillStyle = palette.text;
            ctx.textAlign = 'left';
            var maxW = W - 120;
            var words = refl.split(/\s+/);
            var lines = [];
            var current = '';
            for (var i = 0; i < words.length; i++) {
              var test = current ? current + ' ' + words[i] : words[i];
              if (ctx.measureText(test).width <= maxW) current = test;
              else { lines.push(current); current = words[i]; if (lines.length >= 4) break; }
            }
            if (current && lines.length < 5) lines.push(current);
            if (words.length > lines.join(' ').split(/\s+/).length) {
              var last = lines[lines.length - 1] || '';
              lines[lines.length - 1] = (last + '…').slice(0, 80);
            }
            var ty = pillY + 60;
            lines.slice(0, 5).forEach(function(ln, i) {
              ctx.fillText(ln, 60, ty + i * 30);
            });
          }

          // Footer — date + companion + AlloHaven mark
          var earnedStr = d.earnedAt ? new Date(d.earnedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
          var companion = state.companion;
          var companionLabel = (companion && companion.name) ? ('with ' + companion.name) : '';
          ctx.font = '600 18px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = palette.textMute;
          ctx.textAlign = 'left';
          ctx.fillText('🌿 AlloHaven' + (companionLabel ? '  ·  ' + companionLabel : ''), 60, H - 50);
          ctx.textAlign = 'right';
          if (earnedStr) ctx.fillText(earnedStr, W - 60, H - 50);

          // Trigger download
          var dataUrl = canvas.toDataURL('image/png');
          var a = document.createElement('a');
          var safeLabel = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 30) || 'decoration';
          a.href = dataUrl;
          a.download = 'allohaven-' + safeLabel + '-' + (d.earnedAt ? d.earnedAt.slice(0, 10) : 'card') + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          addToast('💾 Saved as image.');
        } catch (err) {
          addToast('Could not export image. Try Print instead.');
        }
      };
      img.onerror = function() {
        addToast('Image unavailable. Try again later.');
      };
      img.src = d.imageBase64;
    }

    // Export a decoration's memory deck (Phase 2p.35). Format is chosen
    // by content type:
    //   - flashcards → CSV with Front/Back/Tags columns (Anki-compatible,
    //     also imports cleanly into Quizlet, Google Sheets, etc.)
    //   - acronym / notes / image-link → plain-text Q&A or readable form
    // Triggers a download. No state mutation — pure read + download.
    function exportDeckAs(decorationId) {
      var d = (state.decorations || []).filter(function(x) { return x.id === decorationId; })[0];
      if (!d || !d.linkedContent) {
        addToast('Nothing to export.');
        return;
      }
      var lc = d.linkedContent;
      var label = (d.templateLabel || d.template || 'deck').toString();
      var subjectLabels = (d.subjects || []).map(function(sid) {
        var t = getSubjectTag(sid);
        return t ? t.label.replace(/\s+/g, '_') : sid;
      });
      // CSV-quote helper (RFC4180 — wrap in quotes, escape internal quotes)
      function csvField(s) {
        var t = (s == null ? '' : String(s));
        if (/[",\r\n]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
        return t;
      }
      var content = '';
      var ext = 'txt';
      var mime = 'text/plain;charset=utf-8';

      if (lc.type === 'flashcards' && lc.data && Array.isArray(lc.data.cards)) {
        // Anki-compatible CSV: Front,Back,Tags
        ext = 'csv';
        mime = 'text/csv;charset=utf-8';
        var tagBase = ['allohaven', label.replace(/\s+/g, '_')]
          .concat(subjectLabels)
          .filter(function(t) { return t && t.length > 0; })
          .join(' ');
        content = 'Front,Back,Tags\n';
        lc.data.cards.forEach(function(card) {
          content += csvField(card.front || '') + ','
                  +  csvField(card.back || '') + ','
                  +  csvField(tagBase) + '\n';
        });
      } else if (lc.type === 'acronym' && lc.data) {
        var letters = (lc.data.letters || '').toUpperCase();
        var meanings = lc.data.meanings || [];
        content = 'Acronym: ' + letters + '\n';
        if (lc.data.context) content += 'Context: ' + lc.data.context + '\n';
        content += '\n';
        letters.split('').forEach(function(letter, i) {
          content += letter + ' — ' + (meanings[i] || '____________') + '\n';
        });
      } else if (lc.type === 'notes' && lc.data) {
        content = 'Notes for: ' + label + '\n\n';
        content += (lc.data.text || '');
        // If cloze blanks exist, list answers at the bottom for printing
        var clozeAnswers = extractClozeAnswers(lc.data.text || '');
        if (clozeAnswers.length > 0) {
          content += '\n\n--- Cloze answers ---\n';
          clozeAnswers.forEach(function(a, i) {
            content += (i + 1) + '. ' + a + '\n';
          });
        }
      } else if (lc.type === 'image-link' && lc.data) {
        var tgt = state.decorations.filter(function(dec) { return dec.id === lc.data.targetDecorationId; })[0];
        var tgtLabel = tgt ? (tgt.templateLabel || tgt.template || 'item') : '(removed item)';
        content = 'Image link: ' + label + ' → ' + tgtLabel + '\n';
        if (lc.data.association) content += '\n"' + lc.data.association + '"\n';
      } else {
        addToast('This deck type can\'t be exported yet.');
        return;
      }

      try {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var safeLabel = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 30) || 'deck';
        var stamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = 'allohaven-' + safeLabel + '-' + stamp + '.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
        addToast('📤 Deck exported as ' + ext.toUpperCase() + '.');
      } catch (err) {
        addToast('Export failed. Try a different browser.');
      }
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
      // Multi-room (Phase 2p.12) — pick the active room based on
      // state.activeRoomId, fallback to main if missing/unlocked-only.
      var activeId = state.activeRoomId || 'main';
      var room = (state.rooms || []).filter(function(r) { return r.id === activeId; })[0];
      // Fallback: if active room locked or missing, snap back to main
      if (!room || !room.unlocked) {
        room = (state.rooms || []).filter(function(r) { return r.id === 'main'; })[0]
            || { id: 'main', wallSlots: 8, floorSlots: 12, unlocked: true };
      }
      var roomKind = room.kind || 'bedroom';

      var wallByCell = {};
      var floorByCell = {};
      // Filter decorations by active room
      state.decorations.forEach(function(d) {
        if (!d.placement) return;
        var dRoomId = d.placement.roomId || 'main';
        if (dRoomId !== room.id) return;
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

      // Per-room visual tints (Phase 2p.12/2p.13). Each non-bedroom
      // room gets a subtle gradient overlay layered on top of the
      // base palette wallpaper/floor — distinct vibe per space.
      var roomWallTint = '';
      var roomFloorTint = '';
      if (roomKind === 'garden') {
        // Sky blue overhead + grass green underfoot
        roomWallTint = 'linear-gradient(180deg, rgba(135,206,235,0.18) 0%, rgba(135,206,235,0.08) 100%), ';
        roomFloorTint = 'linear-gradient(180deg, rgba(80,150,80,0.20) 0%, rgba(80,150,80,0.10) 100%), ';
      } else if (roomKind === 'library') {
        // Warm sepia / wood — focused study vibe
        roomWallTint = 'linear-gradient(180deg, rgba(180,130,80,0.16) 0%, rgba(140,90,50,0.10) 100%), ';
        roomFloorTint = 'linear-gradient(180deg, rgba(120,80,40,0.18) 0%, rgba(80,55,30,0.10) 100%), ';
      } else if (roomKind === 'studio') {
        // Bright pastel mix — creative open space
        roomWallTint = 'linear-gradient(135deg, rgba(255,200,100,0.12) 0%, rgba(180,130,255,0.10) 50%, rgba(120,210,200,0.10) 100%), ';
        roomFloorTint = 'linear-gradient(180deg, rgba(255,235,200,0.12) 0%, rgba(220,210,255,0.08) 100%), ';
      }
      // Backwards-compat alias for existing template literals below
      var gardenWallTint = roomWallTint;
      var gardenFloorTint = roomFloorTint;

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
        // Room tabs (Phase 2p.12) — only render when ≥1 room beyond main
        // is unlocked. Single-room state shows nothing here, keeping the
        // pre-multi-room UX clean for new students.
        (function() {
          var unlockedRooms = (state.rooms || []).filter(function(r) { return r.unlocked; });
          if (unlockedRooms.length < 2) return null;
          return h('div', {
            role: 'tablist',
            'aria-label': 'Rooms',
            style: { display: 'flex', gap: '6px', marginTop: '6px', marginBottom: '8px', flexWrap: 'wrap' }
          },
            unlockedRooms.map(function(r) {
              var active = r.id === room.id;
              return h('button', {
                key: 'rt-' + r.id,
                role: 'tab',
                'aria-selected': active ? 'true' : 'false',
                'aria-label': r.label + (active ? ' (currently viewing)' : ''),
                onClick: function() { setStateField('activeRoomId', r.id); },
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: active ? palette.accent : palette.surface,
                  color: active ? palette.onAccent : palette.textDim,
                  border: '1px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, (r.icon || '🏠') + ' ' + r.label);
            })
          );
        })(),
        renderQuestPanel(),
        renderTodayCard(),
        // Compute responsive row count based on slot count + columns
        // Wall stays 4 cols (2 cols on narrow); floor stays 6 cols (3 cols on narrow)
        // Grid auto-rows handles overflow; we don't pin a row count
        // anymore so expansion past 8/12 slots renders correctly.
        // Wall surface (with warm-light overlay + time-of-day tint).
        // Time-of-day (Phase 2p.3) — system-clock-driven gentle wash:
        // dawn pink, dusk warm orange, night cool blue. Suppressed in
        // high-contrast mode and at midday (no overlay).
        h('div', {
          role: 'region',
          'aria-label': (function() {
            var tod = !inherited.highContrast ? getTimeOfDayTint() : null;
            return 'Wall — ' + wallCount + ' of ' + room.wallSlots + ' slots filled'
              + (tod ? ', time-of-day: ' + tod.label : '');
          })(),
          className: !inherited.highContrast ? 'ah-room-frame' : '',
          style: {
            position: 'relative',
            padding: '14px',
            background: (function() {
              var tod = !inherited.highContrast ? getTimeOfDayTint() : null;
              var base = palette.wallpaper;
              if (tod && tod.color) {
                base = 'linear-gradient(180deg, ' + tod.color + ', transparent 70%), ' + base;
              }
              // Garden room: layer a sky-blue tint on the wall (Phase 2p.12)
              if (gardenWallTint) base = gardenWallTint + base;
              return base;
            })(),
            borderRadius: '12px 12px 0 0',
            marginTop: '16px',
            border: '1px solid ' + palette.border,
            borderBottom: 'none',
            boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.18)',
            transition: 'background 600ms ease'
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
          }, wallCells),
          renderWeatherLayer('wall')
        ),
        // Floor surface (with warm-light overlay + mood tint + companion).
        // Mood-driven tint (Phase 2p.2) — subtle radial overlay reflecting
        // the dominant mood across recent decorations. Suppressed in high-
        // contrast mode and when there's no clear signal.
        h('div', {
          role: 'region',
          'aria-label': (function() {
            var tint = !inherited.highContrast ? getDominantMoodTint(state) : null;
            return 'Floor — ' + floorCount + ' of ' + room.floorSlots + ' slots filled'
              + (tint ? ', mood: ' + tint.mood : '');
          })(),
          className: !inherited.highContrast ? 'ah-room-frame' : '',
          style: {
            padding: '14px',
            background: (function() {
              var tint = !inherited.highContrast ? getDominantMoodTint(state) : null;
              var base = palette.floor;
              if (tint && tint.color) {
                base = 'radial-gradient(ellipse at 50% 30%, ' + tint.color + ', transparent 70%), ' + base;
              }
              // Garden room: layer a grass-green tint on the floor
              if (gardenFloorTint) base = gardenFloorTint + base;
              return base;
            })(),
            borderRadius: '0 0 12px 12px',
            border: '1px solid ' + palette.border,
            borderTop: 'none',
            boxShadow: 'inset 0 8px 20px rgba(0,0,0,0.22)',
            position: 'relative',
            transition: 'background 600ms ease'
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
          }, floorCells),
          renderWeatherLayer('floor'),
          renderCompanionOverlay()
        ),
        // Skills panel — only renders when companion exists + has activity
        renderSkillsPanel(),
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
          // Breathe (Phase 2p.28) — on-demand box-breathing pacer.
          // No tokens, no streak, no judgment. Always available.
          h('button', {
            onClick: function() { setStateField('activeModal', 'breathe'); },
            'aria-label': 'Open breathing pacer for self-care',
            style: secondaryBtnStyle(palette)
          }, '🫁 Breathe'),
          // Grounding (Phase 2p.31) — sibling self-care affordance.
          // 5-4-3-2-1 sensory anchoring. Same opt-in posture.
          h('button', {
            onClick: function() { setStateField('activeModal', 'grounding'); },
            'aria-label': 'Open 5-4-3-2-1 sensory grounding exercise',
            style: secondaryBtnStyle(palette)
          }, '🧷 Grounding'),
          // Arcade hub (Phase 3a) — token-time-gated launcher for plugin
          // arcade modes (Sage launcher, Concept Cards, Runway, etc.).
          h('button', {
            onClick: function() { setStateField('activeModal', 'arcade'); },
            'aria-label': 'Open arcade — spend tokens on game time',
            title: 'Token-time gated games (Sage, future TCG, etc.)',
            style: secondaryBtnStyle(palette)
          }, '🎮 Arcade'),
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
          (function() {
            var storyCount = (state.stories || []).length;
            var validStoryCount = (state.stories || []).filter(function(s) {
              var validSteps = (s.steps || []).filter(function(st) {
                return st.decorationId && (st.narrative || '').trim().length > 0;
              });
              return validSteps.length >= 3 && (s.title || '').trim().length > 0;
            }).length;
            return h('button', {
              onClick: function() { setStateField('activeModal', 'stories'); },
              'aria-label': 'Stories' + (storyCount > 0 ? ', ' + storyCount + ' total' + (validStoryCount > 0 ? ', ' + validStoryCount + ' walkable' : '') : ''),
              style: secondaryBtnStyle(palette)
            }, '📜 Stories' + (storyCount > 0 ? ' · ' + storyCount : ''));
          })(),
          (function() {
            var goals = state.goals || [];
            var nowMs = Date.now();
            var activeCount = goals.filter(function(g) {
              if (g.completedAt) return false;
              var endMs = g.endDate ? new Date(g.endDate).getTime() : Infinity;
              return endMs >= nowMs;
            }).length;
            return h('button', {
              onClick: function() { setStateField('activeModal', 'goals'); },
              'aria-label': 'Goals' + (activeCount > 0 ? ', ' + activeCount + ' active' : ''),
              style: secondaryBtnStyle(palette)
            }, '🎯 Goals' + (activeCount > 0 ? ' · ' + activeCount : ''));
          })(),
          (function() {
            var unlocked = Object.keys(state.achievements || {}).length;
            return h('button', {
              onClick: function() { setStateField('activeModal', 'achievements'); },
              'aria-label': 'Achievements' + (unlocked > 0 ? ', ' + unlocked + ' of ' + ACHIEVEMENT_CATALOG.length + ' unlocked' : ''),
              style: secondaryBtnStyle(palette)
            }, '🏆 Achievements' + (unlocked > 0 ? ' · ' + unlocked + '/' + ACHIEVEMENT_CATALOG.length : ''));
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
        var memoryDueSoon = !memoryDue && isMemoryDueSoon(decoration);
        var memoryDescription = '';
        if (hasMemoryContent) {
          var lc = decoration.linkedContent;
          if (lc.type === 'flashcards' && lc.data && Array.isArray(lc.data.cards)) {
            memoryDescription = 'flashcards · ' + lc.data.cards.length + ' card' + (lc.data.cards.length === 1 ? '' : 's');
          } else if (lc.type === 'acronym') {
            memoryDescription = 'acronym · ' + ((lc.data && lc.data.letters) || '');
          } else if (lc.type === 'notes') {
            var t = (lc.data && lc.data.text) || '';
            var cn = extractClozeAnswers(t).length;
            memoryDescription = cn > 0 ? ('notes · ' + cn + ' blank' + (cn === 1 ? '' : 's')) : 'notes';
          } else if (lc.type === 'image-link') {
            var tgtId = (lc.data && lc.data.targetDecorationId) || null;
            var tgtDec = tgtId ? state.decorations.filter(function(d) { return d.id === tgtId; })[0] : null;
            var tgtLabel = tgtDec ? (tgtDec.templateLabel || tgtDec.template || 'item') : 'removed item';
            memoryDescription = 'image link → ' + tgtLabel;
          } else {
            memoryDescription = 'memory content';
          }
        }
        var hoverTitle = decoration.studentReflection
          ? '"' + decoration.studentReflection + '" · ' + label
          : label;
        if (hasMemoryContent) hoverTitle += ' · ' + memoryDescription
          + (memoryDue ? ' (due for review)' : (memoryDueSoon ? ' (due soon)' : ''));
        return h('div', {
          key: surface + '-cell-' + index,
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Decoration: ' + label
            + (decoration.studentReflection ? ' (with reflection)' : '')
            + (hasMemoryContent
                ? ' (with ' + memoryDescription
                  + (memoryDue ? ', due for review' : (memoryDueSoon ? ', due soon' : ''))
                  + ')'
                : '')
            + ' — click to add or review memory content',
          className: 'ah-decoration' + (function() {
            // Phase 2p.16 — template-specific micro-animation class on the
            // <img> child. Plants sway, companions bob, lamps + weather +
            // food gently pulse, window views shimmer. Posters, books,
            // instruments, sports stay still (these are art / objects
            // that look weird in motion).
            switch (decoration.template) {
              case 'plants':      return ' ah-deco-sway';
              case 'companions':  return ' ah-deco-bob';
              case 'food':        return ' ah-deco-bob';
              case 'lamps':       return ' ah-deco-pulse';
              case 'weather':     return ' ah-deco-pulse';
              case 'windows':     return ' ah-deco-shimmer';
              default:            return '';
            }
          })(),
          title: hoverTitle,
          // Drag-to-rearrange (Phase 2p.10) — only enabled in Build mode.
          // Sets a drag image hint via dataTransfer; on drop in another
          // cell, moveDecorationToCell handles the swap.
          draggable: state.roomMode !== 'live',
          onDragStart: function(e) {
            if (state.roomMode === 'live') { e.preventDefault(); return; }
            try {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', decoration.id);
            } catch (err) { /* IE/Safari quirks — fail silent */ }
          },
          onDragOver: function(e) {
            if (state.roomMode === 'live') return;
            // Allow drop onto another decoration (will swap placements)
            e.preventDefault();
            try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
          },
          onDrop: function(e) {
            if (state.roomMode === 'live') return;
            e.preventDefault();
            var draggedId;
            try { draggedId = e.dataTransfer.getData('text/plain'); } catch (err) { return; }
            if (!draggedId || draggedId === decoration.id) return;
            moveDecorationToCell(draggedId, surface, index);
          },
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
            cursor: state.roomMode === 'live' ? 'pointer' : 'grab',
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
          // Custom-upload badge (Phase 2p.19) — distinguishes student-
          // uploaded images from AI-generated ones. Bottom-center, soft.
          decoration.isCustomUpload ? h('span', {
            'aria-label': 'Custom uploaded image',
            title: 'Your image',
            style: {
              position: 'absolute',
              bottom: '2px',
              right: decoration.isStarter ? '38px' : '4px',
              fontSize: '8px',
              color: palette.textMute,
              background: 'rgba(0,0,0,0.4)',
              padding: '1px 4px',
              borderRadius: '3px',
              letterSpacing: '0.04em'
            }
          }, '📎') : null,
          // Custom-drawing badge (Phase 2p.26) — distinguishes student-
          // drawn-on-canvas decorations from AI/upload.
          decoration.isCustomDrawing ? h('span', {
            'aria-label': 'Hand-drawn',
            title: 'Your drawing',
            style: {
              position: 'absolute',
              bottom: '2px',
              right: decoration.isStarter ? '38px' : '4px',
              fontSize: '8px',
              color: palette.textMute,
              background: 'rgba(0,0,0,0.4)',
              padding: '1px 4px',
              borderRadius: '3px',
              letterSpacing: '0.04em'
            }
          }, '✏️') : null,
          // Favorite ⭐ overlay (Phase 2p.14) — small star top-right
          // (above the hover-revealed delete ✕). Stays visible always.
          decoration.isFavorite ? h('span', {
            'aria-label': 'Favorite',
            title: 'Favorite',
            style: {
              position: 'absolute',
              top: '2px',
              right: '4px',
              fontSize: '11px',
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(0,0,0,0.45)',
              lineHeight: 1,
              pointerEvents: 'none',
              zIndex: 1
            }
          }, '⭐') : null,
          // Voice note 🎤 overlay (Phase 2p.15) — small mic top-left
          // adjacent to mood emoji. Indicates audio is attached.
          decoration.voiceNote ? h('span', {
            'aria-label': 'Voice note attached',
            title: 'Voice note attached · click decoration to play',
            style: {
              position: 'absolute',
              top: '2px',
              left: decoration.mood && getMoodOption(decoration.mood) ? '24px' : '4px',
              fontSize: '11px',
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(0,0,0,0.45)',
              lineHeight: 1,
              pointerEvents: 'none',
              zIndex: 1
            }
          }, '🎤') : null,
          // Mood tag overlay (Phase 2m) — small emoji top-left, away from
          // delete ✕ (top-right) and memory 📖 (bottom-left)
          decoration.mood && getMoodOption(decoration.mood) ? h('span', {
            'aria-label': 'Mood: ' + getMoodOption(decoration.mood).label,
            title: getMoodOption(decoration.mood).label + ' — ' + getMoodOption(decoration.mood).hint,
            style: {
              position: 'absolute',
              top: '2px',
              left: '4px',
              fontSize: '11px',
              padding: '1px 3px',
              borderRadius: '3px',
              background: 'rgba(0,0,0,0.45)',
              lineHeight: 1
            }
          }, getMoodOption(decoration.mood).emoji) : null,
          // Memory-content indicator — small 📖 in bottom-left (away
          // from the starter badge which lives bottom-right). Three
          // visual tiers:
          //   recently reviewed: dim, dark background (just visible)
          //   due soon (1-2d):   warm orange (gentle "hey, soon")
          //   due now:           bright yellow + pulse halo (fading
          //                      knowledge needs attention)
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
              background: memoryDue
                ? 'rgba(255,220,140,0.9)'
                : memoryDueSoon
                  ? 'rgba(255,170,80,0.85)'
                  : 'rgba(0,0,0,0.45)',
              color: (memoryDue || memoryDueSoon) ? '#1a1108' : '#fff',
              opacity: memoryDue ? 1 : (memoryDueSoon ? 0.95 : 0.7),
              lineHeight: 1
            }
          }, '📖') : null,
          // Hover-revealed ✕ delete button (top-right corner). Suppressed
          // on the starter decoration — students shouldn't accidentally
          // delete the welcome gift; v2+ could allow it via Settings.
          !decoration.isStarter && state.roomMode !== 'live' ? h('button', {
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
      // Live mode (Phase 2p.3): empty cells render as fully transparent
      // non-interactive divs — no dotted outline, no click affordance.
      // Build mode keeps the original interactive empty cell.
      var liveMode = state.roomMode === 'live';
      if (liveMode) {
        return h('div', {
          key: surface + '-cell-' + index,
          'aria-hidden': 'true',
          style: {
            minHeight: surface === 'wall' ? '76px' : '86px',
            pointerEvents: 'none'
          }
        });
      }
      return h('div', {
        key: surface + '-cell-' + index,
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Empty ' + surface + ' slot ' + (index + 1) + ' — click to add a decoration, or drop a decoration here to move it',
        className: 'ah-empty-cell',
        onClick: function() { handleEmptyCellClick(surface, index); },
        onKeyDown: function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEmptyCellClick(surface, index);
          }
        },
        // Drop target for drag-to-rearrange (Phase 2p.10)
        onDragOver: function(e) {
          e.preventDefault();
          try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
        },
        onDrop: function(e) {
          e.preventDefault();
          var draggedId;
          try { draggedId = e.dataTransfer.getData('text/plain'); } catch (err) { return; }
          if (!draggedId) return;
          moveDecorationToCell(draggedId, surface, index);
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
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          // Search (Phase 2p.10) — quick text search across decks,
          // stories, decorations, reflections. Compact icon-only button.
          h('button', {
            onClick: function() { setStateField('activeModal', 'search'); },
            'aria-label': 'Search',
            title: 'Search across decks, stories, and reflections',
            style: {
              display: 'inline-flex', alignItems: 'center',
              padding: '6px 10px',
              background: palette.surface,
              color: palette.textDim,
              border: '1px solid ' + palette.border,
              borderRadius: '999px',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }
          }, '🔍'),
          // Build / Live toggle (Phase 2p.3) — Sims-y mode distinction.
          // Build mode is editing; Live mode is rest. Persists in state.
          (function() {
            var liveMode = state.roomMode === 'live';
            return h('button', {
              onClick: function() {
                setStateField('roomMode', liveMode ? 'build' : 'live');
              },
              'aria-pressed': liveMode ? 'true' : 'false',
              'aria-label': liveMode ? 'Switch to build mode (placement UI visible)' : 'Switch to live mode (room rests)',
              title: liveMode ? 'Currently in Live mode · click for Build' : 'Currently in Build mode · click for Live',
              style: {
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px',
                background: liveMode ? palette.accent : palette.surface,
                color: liveMode ? palette.onAccent : palette.textDim,
                border: '1px solid ' + (liveMode ? palette.accent : palette.border),
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 200ms ease, color 200ms ease'
              }
            }, liveMode ? '🛋 Live' : '🛠 Build');
          })(),
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

    // Weather particle overlay (Phase 2p.27) — renders a CSS-only layer
    // of falling drops, snowflakes, or twinkling sparkles based on
    // state.atmosphere.weather. Suppressed in high-contrast mode (the
    // accommodation wins over decorative ambient motion). Particle
    // count is capped low (~24) so reflows stay cheap on lo-fi devices.
    // Each particle gets a stable seeded position/delay/duration via
    // its index so React re-renders don't shuffle them.
    function renderWeatherLayer(surface) {
      var weather = (state.atmosphere && state.atmosphere.weather) || 'clear';
      if (weather === 'clear') return null;
      if (inherited.highContrast) return null;
      // Different particle counts per surface (wall is shorter, floor taller)
      var COUNT = surface === 'wall' ? 14 : 20;
      var particles = [];
      for (var i = 0; i < COUNT; i++) {
        // Pseudo-random but stable: derived from index, so re-renders don't reshuffle
        var leftPct = ((i * 47) % 97) + ((i % 5) * 0.7);
        if (leftPct > 96) leftPct = 96;
        if (weather === 'rain') {
          var rDur = 0.85 + ((i * 13) % 7) * 0.08; // 0.85–1.4s
          var rDelay = ((i * 31) % 100) / 100 * 1.2; // 0–1.2s
          particles.push(h('span', {
            key: 'p-' + i,
            'aria-hidden': 'true',
            className: 'ah-rain-drop',
            style: {
              left: leftPct + '%',
              animationDuration: rDur.toFixed(2) + 's',
              animationDelay: rDelay.toFixed(2) + 's'
            }
          }));
        } else if (weather === 'snow') {
          var sDur = 7 + ((i * 11) % 6); // 7–12s
          var sDelay = ((i * 23) % 100) / 100 * 5; // 0–5s
          var sSize = 3 + ((i * 17) % 5); // 3–7px
          particles.push(h('span', {
            key: 'p-' + i,
            'aria-hidden': 'true',
            className: 'ah-snow-flake',
            style: {
              left: leftPct + '%',
              width: sSize + 'px',
              height: sSize + 'px',
              animationDuration: sDur + 's',
              animationDelay: sDelay.toFixed(2) + 's'
            }
          }));
        } else if (weather === 'sparkles') {
          var topPct = ((i * 41) % 90) + 5; // 5–95
          var kDur = 2.4 + ((i * 7) % 5) * 0.4; // 2.4–4.0s
          var kDelay = ((i * 19) % 100) / 100 * 3; // 0–3s
          particles.push(h('span', {
            key: 'p-' + i,
            'aria-hidden': 'true',
            className: 'ah-sparkle',
            style: {
              left: leftPct + '%',
              top: topPct + '%',
              animationDuration: kDur.toFixed(2) + 's',
              animationDelay: kDelay.toFixed(2) + 's'
            }
          }));
        }
      }
      return h('div', {
        className: 'ah-weather-layer',
        'aria-hidden': 'true'
      }, particles);
    }

    // Companion overlay (Phase 2p) — bottom-right floating critter.
    // Renders ONE of two states: empty-state ("+ Add a buddy") or
    // active companion (SVG figure + bubble + skills panel).
    // Always anchored to the floor surface region so placement of
    // decorations doesn\'t shift its position.
    function renderCompanionOverlay() {
      var companion = state.companion;
      // Empty-state: small button to open setup wizard
      if (!companion || !companion.species) {
        return h('button', {
          onClick: function() { setStateField('activeModal', 'companion-setup'); },
          'aria-label': 'Add a study buddy companion',
          title: 'Pick a critter that lives in your room',
          style: {
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            padding: '8px 14px',
            background: palette.bg + 'cc',
            color: palette.accent,
            border: '1.5px dashed ' + palette.accent,
            borderRadius: '999px',
            fontSize: '12px', fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            zIndex: 5
          }
        }, '+ Add a buddy');
      }

      var sp = getCompanionSpecies(companion.species);
      var paletteColors = getCompanionPalette(companion.species, companion.colorVariant || 'warm');
      var displayName = (companion.name || (sp ? sp.label : 'buddy')).trim();

      // Bubble fade timing — show if lastBubbleAt within 8s OR no
      // explicit close (we keep until next bubble auto-replaces)
      var bubbleText = companion.lastBubbleText || '';
      var bubbleAge = companion.lastBubbleAt
        ? (Date.now() - new Date(companion.lastBubbleAt).getTime())
        : Infinity;
      var showBubble = bubbleText && bubbleAge < 12000;

      function handleClick() {
        // Suppressed if a long-hold petting just fired (set by handlePetEnd)
        if (pettingJustFiredRef && pettingJustFiredRef.current) {
          pettingJustFiredRef.current = false;
          return;
        }
        setReacting(true);
        setTimeout(function() { setReacting(false); }, 600);
        refreshCompanionBubble();
      }
      function handleKey(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }
      // Petting (Phase 2p.8) — mousedown for ≥1.5s fires a happy reaction
      // distinct from click-bounce. Bumps companion.happiness (max 10);
      // happiness slowly decays (in saveCompanion / scheduled tick).
      function handlePetStart() {
        if (pettingTimerRef.current) clearTimeout(pettingTimerRef.current);
        pettingTimerRef.current = setTimeout(function() {
          // Fire happy reaction
          var c = state.companion || {};
          var sp2 = getCompanionSpecies(c.species);
          var nextHappiness = Math.min(10, (c.happiness || 0) + 1);
          var happyLines = {
            cat:    'Hmm. Pleasant.',
            fox:    'Heh. That\'s nice.',
            owl:    'Quietly content.',
            turtle: 'Cozy.',
            dragon: 'Whoa! That tickles!'
          };
          saveCompanion({
            happiness: nextHappiness,
            lastPettedAt: new Date().toISOString(),
            lastBubbleAt: new Date().toISOString(),
            lastBubbleText: (happyLines[c.species] || happyLines.cat) + ' (♥)'
          });
          setReacting(true);
          setTimeout(function() { setReacting(false); }, 800);
          pettingJustFiredRef.current = true;
          pettingTimerRef.current = null;
        }, 1500);
      }
      function handlePetEnd() {
        if (pettingTimerRef.current) {
          clearTimeout(pettingTimerRef.current);
          pettingTimerRef.current = null;
        }
      }
      function handleMove(e) {
        // Compute cursor offset from companion center, normalized to [-1, 1].
        // We use clientX/Y vs the bounding rect so layout shifts don\'t
        // break the math.
        var rect = e.currentTarget.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        // The "track radius" is roughly twice the companion size — so
        // pupils max out when cursor is ~150px away
        var trackRadius = 150;
        var dx = (e.clientX - cx) / trackRadius;
        var dy = (e.clientY - cy) / trackRadius;
        setPupilOffset({
          x: Math.max(-1, Math.min(1, dx)),
          y: Math.max(-1, Math.min(1, dy))
        });
      }
      function handleLeave() {
        setPupilOffset({ x: 0, y: 0 });
      }

      return h('div', {
        'data-species': companion.species,
        style: {
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '6px',
          zIndex: 5,
          pointerEvents: 'none' // children re-enable
        }
      },
        // Confetti pieces (level-up)
        confetti.length > 0 ? h('div', {
          'aria-hidden': 'true',
          style: {
            position: 'absolute', bottom: '40px', right: '20px',
            width: '80px', height: '60px', pointerEvents: 'none'
          }
        },
          confetti.map(function(c) {
            return h('span', {
              key: c.id,
              className: 'ah-companion-confetti-piece',
              style: {
                position: 'absolute',
                left: c.left + '%',
                bottom: '0',
                fontSize: '18px',
                animationDelay: c.delay + 'ms',
                pointerEvents: 'none'
              }
            }, c.label);
          })
        ) : null,
        // Quiz prompt (Phase 2p.4) — replaces the regular thought bubble
        // when a due deck exists + cooldown allows. The buddy literally
        // asks the student if they want to review. Yes opens the deck\'s
        // quiz; Later sets a 6h dismissal cooldown.
        (function() {
          if (!shouldOfferQuizPrompt()) return null;
          var dueDec = pickDueDeckForCompanion();
          if (!dueDec) return null;
          var dLabel = dueDec.templateLabel || dueDec.template || 'deck';
          var lc = dueDec.linkedContent;
          var contentNoun = lc.type === 'flashcards' ? 'flashcards'
                          : lc.type === 'acronym'    ? 'acronym'
                          : lc.type === 'image-link' ? 'image link'
                                                       : 'notes';
          var promptText = (companion.name || (sp ? sp.label : 'I'))
            + ': "Want to review the ' + dLabel + ' ' + contentNoun + '?"';
          return h('div', {
            className: 'ah-companion-bubble',
            role: 'group',
            'aria-label': 'Companion is offering a quiz on the ' + dLabel + ' ' + contentNoun,
            style: {
              maxWidth: '240px',
              padding: '10px 12px',
              background: palette.surface,
              border: '1.5px solid ' + palette.accent,
              borderRadius: '12px',
              borderBottomRightRadius: '4px',
              fontSize: '11.5px',
              color: palette.text,
              lineHeight: '1.45',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'auto'
            }
          },
            h('div', { style: { fontStyle: 'italic', marginBottom: '8px' } }, promptText),
            h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end' } },
              h('button', {
                onClick: function() { dismissQuizPrompt(); },
                'aria-label': 'Skip the quiz offer for now',
                style: {
                  background: 'transparent', color: palette.textMute,
                  border: '1px solid ' + palette.border, borderRadius: '6px',
                  padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }
              }, 'Later'),
              h('button', {
                onClick: function() { acceptQuizPrompt(dueDec); },
                'aria-label': 'Start the quiz now',
                style: {
                  background: palette.accent, color: palette.onAccent,
                  border: 'none', borderRadius: '6px',
                  padding: '3px 12px', fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit'
                }
              }, '✓ Quiz me')
            )
          );
        })(),
        // Thought bubble (regular state-aware observation, only when NOT
        // showing the quiz prompt above)
        (showBubble && !shouldOfferQuizPrompt()) ? h('div', {
          className: 'ah-companion-bubble',
          role: 'status',
          'aria-live': 'polite',
          style: {
            maxWidth: '220px',
            padding: '8px 12px',
            background: palette.surface,
            border: '1px solid ' + palette.border,
            borderRadius: '12px',
            borderBottomRightRadius: '4px',
            fontSize: '11.5px',
            color: palette.text,
            lineHeight: '1.45',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            pointerEvents: 'auto'
          }
        }, bubbleText) : null,
        // The companion itself — sleep pose in Live mode
        (function() {
          var sleeping = state.roomMode === 'live';
          return h('div', {
            className: 'ah-companion-root'
              + (reacting ? ' ah-companion-react' : '')
              + (sleeping ? ' ah-companion-sleeping' : ''),
            role: 'button',
            tabIndex: 0,
            'aria-label': displayName + ' (' + (sp ? sp.label : 'companion') + ')'
              + (sleeping ? ' is resting in live mode' : '. Click to chat.')
              + (bubbleText && !sleeping ? ' Says: ' + bubbleText : ''),
            title: sleeping
              ? displayName + ' is resting'
              : displayName + ' · click for a thought',
            onClick: function() { if (!sleeping) handleClick(); },
            onKeyDown: function(e) { if (!sleeping) handleKey(e); },
            onMouseMove: function(e) { if (!sleeping) handleMove(e); },
            onMouseLeave: function(e) { if (!sleeping) { handleLeave(e); handlePetEnd(); } },
            onMouseDown: function() { if (!sleeping) handlePetStart(); },
            onMouseUp: function() { if (!sleeping) handlePetEnd(); },
            onTouchStart: function() { if (!sleeping) handlePetStart(); },
            onTouchEnd: function() { if (!sleeping) handlePetEnd(); },
            style: {
              position: 'relative',
              width: '76px',
              height: '76px',
              background: palette.surface + 'aa',
              border: '1px solid ' + palette.border,
              borderRadius: '14px',
              padding: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'auto'
            }
          },
            getCompanionSvg(companion.species, paletteColors,
              { blinking: blinking, pupilOffset: pupilOffset, sleeping: sleeping, accessory: companion.accessory }),
            // Floating "Z" when sleeping — gentle visual signal, not "needs sleep" coded
            sleeping ? h('span', {
              className: 'ah-companion-z',
              'aria-hidden': 'true',
              style: {
                position: 'absolute',
                top: '6px',
                right: '6px',
                fontSize: '14px',
                fontWeight: 800,
                color: palette.accent,
                opacity: 0.8,
                pointerEvents: 'none'
              }
            }, 'z') : null,
            // Due-deck indicator (Phase 2p.4) — small ❓ badge tells the
            // student "my buddy has a question" before they even click.
            // Only when NOT sleeping (Live mode) AND a due deck exists
            // AND the prompt cooldown hasn\'t locked us out.
            (!sleeping && shouldOfferQuizPrompt()) ? h('span', {
              'aria-label': 'A deck is due for review',
              title: 'Your buddy has a question for you',
              style: {
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                fontSize: '11px',
                fontWeight: 800,
                color: palette.onAccent || '#000',
                background: palette.accent,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid ' + palette.bg,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }
            }, '?') : null,
            // Happiness ❤ indicator (Phase 2p.8) — tiny pink heart in
            // the corner when companion has been petted recently. Fades
            // in/out as happiness rises/falls. Suppressed in sleep pose.
            (!sleeping && (companion.happiness || 0) >= 5) ? h('span', {
              'aria-label': 'Companion happiness: ' + companion.happiness + ' of 10',
              title: 'Happy buddy (long-press to pet again)',
              style: {
                position: 'absolute',
                bottom: '-4px',
                left: '-4px',
                fontSize: '11px',
                color: '#ff6b9d',
                background: palette.bg,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid ' + palette.bg,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }
            }, '❤') : null
          );
        })(),
        // Tiny name + edit affordance
        h('div', {
          style: {
            display: 'flex', gap: '6px', alignItems: 'center',
            background: palette.surface + 'cc',
            padding: '2px 8px',
            borderRadius: '999px',
            border: '1px solid ' + palette.border,
            pointerEvents: 'auto'
          }
        },
          h('span', { style: { fontSize: '10px', fontWeight: 700, color: palette.text } }, displayName),
          // Daily treat (Phase 2p.16) — once per day, students can give
          // the companion a treat. Visible only when available; hidden
          // after use until the calendar rolls over.
          canGiveTreatToday() ? h('button', {
            onClick: giveCompanionTreat,
            'aria-label': 'Give ' + displayName + ' a treat (once per day)',
            title: 'Daily treat for ' + displayName,
            style: {
              background: 'transparent', border: 'none',
              color: palette.accent, fontSize: '12px',
              cursor: 'pointer', padding: '0 2px',
              fontFamily: 'inherit'
            }
          }, '🍪') : null,
          h('button', {
            onClick: function() { setStateField('activeModal', 'companion-phrases'); },
            'aria-label': 'Teach ' + displayName + ' a phrase',
            title: 'Teach ' + displayName + ' to say something',
            style: {
              background: 'transparent', border: 'none',
              color: palette.textMute, fontSize: '12px',
              cursor: 'pointer', padding: '0 2px',
              fontFamily: 'inherit'
            }
          }, '💬'),
          h('button', {
            onClick: function() { setStateField('activeModal', 'companion-setup'); },
            'aria-label': 'Edit ' + displayName,
            title: 'Change species, color, or name',
            style: {
              background: 'transparent', border: 'none',
              color: palette.textMute, fontSize: '10px',
              cursor: 'pointer', padding: '0 2px',
              fontFamily: 'inherit'
            }
          }, '✎')
        )
      );
    }

    // Skill levels panel (Phase 2p) — 4 mini progress bars below the room
    // when a companion exists. Computed from earnings; status not currency.
    function renderSkillsPanel() {
      if (!state.companion || !state.companion.species) return null;
      var skills = SKILL_DEFS.map(function(def) {
        var count = countSkillEvents(state, def.id);
        var prog = computeSkillLevel(count);
        return { def: def, prog: prog, count: count };
      });
      var hasAny = skills.some(function(s) { return s.count > 0; });
      if (!hasAny) return null;
      return h('div', {
        role: 'region',
        'aria-label': 'Skill levels',
        style: {
          marginTop: '14px',
          padding: '12px 14px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px 14px'
        }
      },
        skills.map(function(s) {
          var label = s.def.emoji + ' ' + s.def.label;
          var aria = s.def.label + ' level ' + s.prog.level
            + (s.prog.atMax ? ' (max)' : ', ' + s.prog.current + ' of ' + s.prog.nextThreshold);
          return h('div', {
            key: 'sp-' + s.def.id,
            'aria-label': aria,
            title: s.def.hint
              + (s.prog.atMax ? ' · level ' + s.prog.level + ' (max)' : ' · ' + s.prog.current + ' / ' + s.prog.nextThreshold + ' to next'),
            style: { fontSize: '11px', color: palette.textDim }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontVariantNumeric: 'tabular-nums' } },
              h('span', { style: { fontWeight: 700, color: palette.text } }, label),
              h('span', { style: { fontSize: '10px' } }, 'L' + s.prog.level + (s.prog.atMax ? ' max' : ''))
            ),
            h('div', {
              'aria-hidden': 'true',
              style: { height: '4px', background: palette.bg, borderRadius: '2px', overflow: 'hidden' }
            },
              h('div', {
                style: {
                  width: s.prog.pct + '%', height: '100%',
                  background: palette.accent,
                  transition: 'width 320ms ease'
                }
              })
            )
          );
        })
      );
    }

    // Today summary card (Phase 2o) — daily-arc complement to the
    // quest panel. Quests = "what to try today"; today card = "what
    // you've done + how close to your daily caps". Keeps daily-arc
    // visibility without forcing students to compute it themselves.
    // Hidden on first visit of a fresh day (no activity yet) so it
    // doesn't add visual noise to a clean slate.
    function renderTodayCard() {
      var ds = state.dailyState || {};
      var todayStr = new Date().toISOString().slice(0, 10);
      var tokensToday = (state.earnings || []).reduce(function(sum, e) {
        if (!e.date) return sum;
        if (e.date.slice(0, 10) !== todayStr) return sum;
        return sum + (e.tokens || 0);
      }, 0);
      var decorationsToday = (state.decorations || []).filter(function(d) {
        if (d.isStarter) return false;
        if (!d.earnedAt) return false;
        return d.earnedAt.slice(0, 10) === todayStr;
      }).length;

      var pomodoros = ds.pomodorosCompleted || 0;
      var reflections = ds.reflectionsSubmitted || 0;
      var quizTokens = ds.quizTokensEarnedToday || 0;
      var walkTokens = ds.storyWalkTokensEarnedToday || 0;

      var anyActivity = tokensToday > 0 || pomodoros > 0 || reflections > 0
        || quizTokens > 0 || walkTokens > 0 || decorationsToday > 0;
      if (!anyActivity) return null;

      function chip(emoji, label, current, cap, color) {
        var capLabel = cap ? (current + '/' + cap) : current;
        var atCap = cap && current >= cap;
        return h('span', {
          'aria-label': label + ': ' + current + (cap ? ' of ' + cap : '') + (atCap ? ' (cap reached)' : ''),
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: palette.surface,
            border: '1px solid ' + (atCap ? (color || palette.success || palette.accent) : palette.border),
            borderRadius: '999px',
            fontSize: '11px',
            color: atCap ? (color || palette.success || palette.accent) : palette.textDim,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums'
          }
        },
          h('span', { 'aria-hidden': 'true' }, emoji),
          h('span', null, capLabel)
        );
      }

      var activeGoals = (state.goals || []).filter(function(g) {
        if (g.completedAt) return false;
        var endMs = g.endDate ? new Date(g.endDate).getTime() : Infinity;
        return endMs >= Date.now();
      });
      var topGoal = null;
      if (activeGoals.length > 0) {
        activeGoals.sort(function(a, b) {
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        });
        topGoal = activeGoals[0];
      }

      return h('div', {
        role: 'region',
        'aria-label': 'Today summary',
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 10px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '10px',
          marginTop: '6px',
          marginBottom: '8px'
        }
      },
        h('span', { style: { fontSize: '11px', fontWeight: 700, color: palette.textDim, letterSpacing: '0.02em', textTransform: 'uppercase', marginRight: '4px' } },
          'Today'),
        tokensToday > 0 ? h('span', {
          'aria-label': 'Tokens earned today: ' + tokensToday,
          style: {
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px',
            background: palette.surface,
            border: '1px solid ' + palette.accent,
            borderRadius: '999px',
            fontSize: '11px', color: palette.accent, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums'
          }
        }, h('span', { 'aria-hidden': 'true' }, '🪙'), '+' + tokensToday) : null,
        pomodoros > 0 ? chip('🍅', 'Pomodoros', pomodoros, 4) : null,
        reflections > 0 ? chip('📝', 'Reflections', reflections, 1) : null,
        quizTokens > 0 ? chip('✓', 'Quizzes passed', quizTokens, 2) : null,
        walkTokens > 0 ? chip('📜', 'Walks', walkTokens, 1) : null,
        decorationsToday > 0 ? chip('🌿', 'Decorations placed', decorationsToday) : null,
        // Visit streak (Phase 2p.11) — only shown when ≥3 days. No
        // counter when below threshold, no broken-streak shame.
        (function() {
          var streak = computeStreak(state.visits);
          if (streak.current < 3) return null;
          return h('span', {
            'aria-label': 'Visit streak: ' + streak.current + ' days in a row',
            title: 'Quietly proud of you for showing up.',
            style: {
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px',
              background: palette.surface,
              border: '1px solid ' + (palette.success || palette.accent),
              borderRadius: '999px',
              fontSize: '11px',
              color: palette.success || palette.accent,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums'
            }
          }, h('span', { 'aria-hidden': 'true' }, '🔥'), streak.current + '-day streak');
        })(),
        topGoal ? (function() {
          var prog = computeGoalProgress(topGoal, state);
          var endDate = topGoal.endDate ? new Date(topGoal.endDate) : null;
          var daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
          return h('button', {
            onClick: function() { setStateField('activeModal', 'goals'); },
            'aria-label': 'Active goal: ' + topGoal.title + ', ' + prog.current + ' of ' + prog.target + ', ' + daysLeft + ' days left',
            title: topGoal.title + ' · ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left',
            style: {
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid ' + palette.border,
              borderRadius: '999px',
              fontSize: '11px', color: palette.textDim, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          },
            h('span', { 'aria-hidden': 'true' }, '🎯'),
            h('span', { style: { fontWeight: 700, color: palette.text } }, prog.current + '/' + prog.target),
            h('span', null, '· ' + (daysLeft === 0 ? 'today' : daysLeft + 'd'))
          );
        })() : null
      );
    }

    // ── Daily-quests panel ──
    // A compact 3-pill row showing today's randomly-picked quests with
    // green checkmarks when complete. When all 3 are complete, a single
    // "Claim trifecta · +5 🪙" button appears. Skipped after claim, and
    // skipped quietly if questIds isn't populated yet (first session,
    // backfill happens in the daily-rollover effect).
    function renderQuestPanel() {
      var ds = state.dailyState || {};
      var ids = Array.isArray(ds.questIds) ? ds.questIds : [];
      if (ids.length === 0) return null;
      var quests = ids.map(function(id) {
        return QUEST_POOL.find(function(q) { return q.id === id; });
      }).filter(Boolean);
      if (quests.length === 0) return null;
      var completedCount = 0;
      var questViews = quests.map(function(q) {
        var done = q.check(ds, state);
        if (done) completedCount++;
        return h('div', {
          key: q.id,
          'aria-label': q.label + (done ? ' (complete)' : ' (in progress)'),
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            background: done ? (palette.successSoft || palette.surface) : palette.surface,
            border: '1px solid ' + (done ? palette.success : palette.border),
            borderRadius: '999px',
            fontSize: '12px',
            color: done ? palette.success : palette.textDim,
            fontWeight: 600,
            opacity: done ? 1 : 0.85
          }
        },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '13px' } }, done ? '✓' : (q.icon || '○')),
          h('span', null, q.label)
        );
      });
      var allDone = completedCount === quests.length;
      var canClaim = allDone && !ds.questsClaimed;
      return h('div', {
        role: 'region',
        'aria-label': 'Today\'s gentle quests — optional bonus',
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '10px',
          marginTop: '8px',
          marginBottom: '8px'
        }
      },
        h('span', { style: { fontSize: '11px', fontWeight: 700, color: palette.textDim, letterSpacing: '0.02em', textTransform: 'uppercase', marginRight: '4px' } },
          'Today · ' + completedCount + '/' + quests.length),
        questViews,
        canClaim ? h('button', {
          onClick: claimQuestTrifecta,
          'aria-label': 'Claim daily trifecta bonus of 5 tokens',
          style: {
            marginLeft: 'auto',
            padding: '6px 14px',
            background: palette.accent,
            color: palette.onAccent || '#fff',
            border: 'none',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }
        }, '🎉 Claim +5 🪙') : (ds.questsClaimed ? h('span', {
          style: { marginLeft: 'auto', fontSize: '11px', color: palette.success, fontWeight: 700 }
        }, '✓ Trifecta claimed') : null)
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
            // Breathe + Grounding (Phase 2p.28 / 2p.31) — break-phase
            // self-care affordances. Both opt-in.
            (phase === 'short-break' || phase === 'long-break') ? h('button', {
              onClick: function() { setStateField('activeModal', 'breathe'); },
              style: Object.assign({}, secondaryBtnStyle(palette), { borderColor: palette.accent, color: palette.accent }),
              'aria-label': 'Open breathing pacer'
            }, '🫁 Breathe') : null,
            (phase === 'short-break' || phase === 'long-break') ? h('button', {
              onClick: function() { setStateField('activeModal', 'grounding'); },
              style: Object.assign({}, secondaryBtnStyle(palette), { borderColor: palette.accent, color: palette.accent }),
              'aria-label': 'Open grounding exercise'
            }, '🧷 Grounding') : null,
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
            : 'Take a real break. Stand up, stretch, drink water.'),
          // Companion accompanies the Pomodoro (Phase 2p.2) — appears
          // next to the timer with a phase-aware bubble so focus sessions
          // feel less lonely. Blink + bob still active.
          (function() {
            var c = state.companion;
            if (!c || !c.species) return null;
            var sp = getCompanionSpecies(c.species);
            var swatch = getCompanionPalette(c.species, c.colorVariant || 'warm');
            var bubbleByPhase = {
              focus: {
                cat:    'I\'ll keep watch. You focus.',
                fox:    'Locked in! I\'ll be quiet.',
                owl:    'Steady focus. I approve.',
                turtle: 'Slow and steady — I\'m right here.',
                dragon: 'Focus mode! I\'ve got your back!'
              },
              'short-break': {
                cat:    'A pause — that\'s good too.',
                fox:    'Stretch! You earned it.',
                owl:    'Rest the eyes for a bit.',
                turtle: 'Slow breaths. I like this part.',
                dragon: 'Quick breather! Then onward!'
              },
              'long-break': {
                cat:    'A real rest. Cozy.',
                fox:    'Long break — drink water!',
                owl:    'Replenish. The mind needs it.',
                turtle: 'A good long pause. Lovely.',
                dragon: 'Big break — go celebrate!'
              }
            };
            var bubble = (bubbleByPhase[phase] && bubbleByPhase[phase][c.species])
                       || (bubbleByPhase[phase] && bubbleByPhase[phase].cat)
                       || '';
            return h('div', {
              style: { marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }
            },
              h('div', {
                'data-species': c.species,
                style: {
                  width: '72px', height: '72px', flexShrink: 0,
                  padding: '4px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderRadius: '14px'
                }
              },
                h('div', { className: 'ah-companion-root' },
                  h('div', null,
                    getCompanionSvg(c.species, swatch, { blinking: blinking, pupilOffset: { x: 0, y: 0 } })
                  )
                )
              ),
              h('div', {
                style: {
                  maxWidth: '220px',
                  padding: '8px 12px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderRadius: '12px',
                  borderBottomLeftRadius: '4px',
                  fontSize: '11.5px',
                  color: palette.text,
                  lineHeight: '1.45',
                  fontStyle: 'italic',
                  textAlign: 'left'
                }
              }, '"' + (c.name || (sp ? sp.label : 'buddy')) + ': ' + bubble + '"')
            );
          })()
        )
      );
    }

    // ─────────────────────────────────────────────────
    // BREATHING PACER (Phase 2p.28) — box-breathing 4-4-4-4 with the
    // companion bobbing alongside. Available on-demand via the room
    // toolbar, and surfaced as an opt-in button during Pomodoro
    // breaks. No tokens, no streak, no judgment — pure self-care.
    // Closeable any time. Voice cue is on by default but mute-able.
    // ─────────────────────────────────────────────────
    // Constants for the box-breathing pacer (Phase 2p.28). Module-scope
    // would also work but inline keeps them close to their consumers.
    var BREATHE_PHASE_MS = 4000;
    var BREATHE_ORDER = ['inhale', 'hold-in', 'exhale', 'hold-out'];
    var BREATHE_LABELS = {
      'inhale':   'Breathe in',
      'hold-in':  'Hold',
      'exhale':   'Breathe out',
      'hold-out': 'Rest'
    };
    var BREATHE_HINTS = {
      'inhale':   'Through the nose. Soft, slow.',
      'hold-in':  'Hold gently. No strain.',
      'exhale':   'Through the mouth. Let it go.',
      'hold-out': 'Empty. Pause. You\'re here.'
    };
    function renderBreathingModal() {
      if (state.activeModal !== 'breathe') return null;
      var phase = breathePhase;
      var cycles = breatheCycles;
      var voiceOn = breatheVoiceOn;
      var startedAt = breatheStartedAt;

      var elapsedSec = startedAt > 0 ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      var elapsedMin = Math.floor(elapsedSec / 60);
      var elapsedRemSec = elapsedSec % 60;
      var elapsedStr = elapsedMin + ':' + (elapsedRemSec < 10 ? '0' : '') + elapsedRemSec;

      // Companion accompaniment
      var c = state.companion;
      var sp = c && c.species ? getCompanionSpecies(c.species) : null;
      var swatch = c && c.species ? getCompanionPalette(c.species, c.colorVariant || 'warm') : null;

      var orbClass = (phase === 'inhale' || phase === 'hold-in') ? 'ah-breathe-orb ah-breathe-orb-in' : 'ah-breathe-orb ah-breathe-orb-out';

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Breathing pacer',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.78)',
          zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg,
            border: '2px solid ' + palette.accent,
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 30px 70px rgba(0,0,0,0.55)'
          }
        },
          h('div', {
            style: {
              fontSize: '12px',
              color: palette.textMute,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontWeight: 700,
              marginBottom: '4px'
            }
          }, '🫁 Box breathing'),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic', margin: '0 0 18px 0' }
          }, 'Match your breath to the orb. Stop any time.'),
          // Breathing orb
          h('div', {
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '180px', marginBottom: '14px'
            }
          },
            h('div', {
              className: orbClass,
              'aria-hidden': 'true',
              style: {
                background: 'radial-gradient(circle at 35% 30%, ' + palette.accent + ', ' + palette.accentDim + ')'
              }
            })
          ),
          // Phase label
          h('div', {
            'aria-live': 'polite',
            style: {
              fontSize: '22px', fontWeight: 800, color: palette.text,
              marginBottom: '4px', letterSpacing: '0.02em'
            }
          }, BREATHE_LABELS[phase]),
          h('div', {
            style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', marginBottom: '14px', minHeight: '16px' }
          }, BREATHE_HINTS[phase]),
          // Cycle + time stats
          h('div', {
            style: {
              display: 'flex', justifyContent: 'center', gap: '20px',
              fontSize: '11px', color: palette.textMute,
              fontVariantNumeric: 'tabular-nums', marginBottom: '14px'
            }
          },
            h('div', null, 'Cycles · ' + cycles),
            h('div', null, 'Time · ' + elapsedStr)
          ),
          // Optional companion accompaniment
          (c && sp) ? h('div', {
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', marginBottom: '14px'
            }
          },
            h('div', {
              'data-species': c.species,
              style: {
                width: '48px', height: '48px',
                padding: '4px',
                background: palette.surface,
                border: '1px solid ' + palette.border,
                borderRadius: '12px'
              }
            },
              h('div', { className: 'ah-companion-root' },
                getCompanionSvg(c.species, swatch, { blinking: blinking, pupilOffset: { x: 0, y: 0 } })
              )
            ),
            h('div', {
              style: {
                fontSize: '11px', fontStyle: 'italic',
                color: palette.textDim, lineHeight: '1.4'
              }
            }, c.name + ' is here.')
          ) : null,
          // Action row
          h('div', {
            style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }
          },
            h('button', {
              onClick: function() { setBreatheVoiceOn(!voiceOn); },
              'aria-pressed': voiceOn ? 'true' : 'false',
              'aria-label': voiceOn ? 'Mute voice cues' : 'Unmute voice cues',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '8px 14px', fontSize: '12px' })
            }, voiceOn ? '🔊 Voice' : '🔇 Voice'),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close breathing pacer',
              style: Object.assign({}, primaryBtnStyle(palette), { padding: '8px 18px', fontSize: '13px' })
            }, 'Done')
          )
        )
      );
    }

    // ─────────────────────────────────────────────────
    // PRINT OPTIONS (Phase 2p.34) — pick which sections to include in
    // the printed packet. Surfaced before window.print() fires so the
    // user can produce focused packets (just achievements for IEP,
    // just reflections for a therapy session, etc.).
    // ─────────────────────────────────────────────────
    var PRINT_SECTION_DEFS = [
      { id: 'companion',    emoji: '🌿', label: 'Companion + skills',    hint: 'Critter, name, skill levels, longest streak.' },
      { id: 'achievements', emoji: '🏆', label: 'Achievements',          hint: 'Recent unlocks + total progress.' },
      { id: 'goals',        emoji: '🎯', label: 'Goals',                 hint: 'Active and completed goals with metric progress.' },
      { id: 'memoryDecks',  emoji: '📖', label: 'Memory decks',          hint: 'Flashcards, acronyms, notes attached to decorations.' },
      { id: 'stories',      emoji: '📜', label: 'Stories',               hint: 'Walkable story chains across decorations.' },
      { id: 'journals',     emoji: '📝', label: 'Recent reflections',    hint: 'The last several journal entries.' }
    ];
    // ─────────────────────────────────────────────────
    // ARCADE HUB (Phase 3a) — token-time-gated launcher for modes
    // registered via window.AlloHavenArcade. Each mode is its own
    // arcade_mode_*.js file. The hub iterates getRegisteredModes()
    // so adding a new game = adding a new file + one load entry.
    //
    // Time-budget economy: tokens earned in AlloFlow tools spend at
    // state.arcade.minutesPerToken per token (default 5). When a mode
    // is launched, the hub deducts the requested tokens, computes
    // session.endsAt = now + minutes, and hands control to the mode's
    // render(ctx). Modes that deep-link to other tools (Sage launcher)
    // close the AlloHaven modal and rely on the host's persistent
    // session to remember the timer.
    // ─────────────────────────────────────────────────
    function launchArcadeMode(modeId, minutes) {
      // Look up the mode + sanity-check the minutes vs. token balance.
      var mode = window.AlloHavenArcade && window.AlloHavenArcade._registry && window.AlloHavenArcade._registry[modeId];
      if (!mode) {
        addToast('That game isn\'t registered.');
        return false;
      }
      var mpt = (state.arcade && state.arcade.minutesPerToken) || 5;
      var minutesAsked = Math.max(1, Math.floor(minutes || mode.timeCost || mpt));
      var tokensNeeded = Math.ceil(minutesAsked / mpt);
      if (state.tokens < tokensNeeded) {
        addToast('Need ' + tokensNeeded + ' 🪙 tokens for ' + minutesAsked + ' min. You have ' + state.tokens + '.');
        return false;
      }
      var nowMs = Date.now();
      var endsAt = nowMs + minutesAsked * 60 * 1000;
      var earningsEntry = {
        source: 'arcade-launch',
        tokens: -tokensNeeded,
        date: new Date(nowMs).toISOString(),
        metadata: { modeId: modeId, minutes: minutesAsked }
      };
      setStateMulti({
        tokens: state.tokens - tokensNeeded,
        earnings: state.earnings.concat([earningsEntry]),
        arcade: Object.assign({}, state.arcade, {
          session: {
            modeId: modeId,
            startedAt: new Date(nowMs).toISOString(),
            minutes: minutesAsked,
            endsAt: new Date(endsAt).toISOString()
          }
        })
      });
      addToast('🎮 ' + (mode.label || modeId) + ' · ' + minutesAsked + ' min · -' + tokensNeeded + ' 🪙');
      return true;
    }

    function endArcadeSession(reason) {
      // reason: 'expired' | 'closed' | 'forfeit'
      if (!state.arcade || !state.arcade.session) return;
      var modeId = state.arcade.session.modeId;
      setStateField('arcade', Object.assign({}, state.arcade, { session: null }));
      var mode = window.AlloHavenArcade && window.AlloHavenArcade._registry && window.AlloHavenArcade._registry[modeId];
      var label = mode ? (mode.label || modeId) : modeId;
      var msg = reason === 'expired' ? '⏰ Time\'s up — ' + label + ' session ended.'
              : reason === 'closed'  ? 'Closed ' + label + '.'
              :                        'Left ' + label + ' early.';
      addToast(msg);
    }

    function renderArcadeHubModal() {
      if (state.activeModal !== 'arcade') return null;
      var modes = (window.AlloHavenArcade && window.AlloHavenArcade.getRegisteredModes())
                  ? window.AlloHavenArcade.getRegisteredModes()
                  : [];
      var mpt = (state.arcade && state.arcade.minutesPerToken) || 5;
      var session = state.arcade && state.arcade.session;
      // Ms remaining if a session is active
      var remainingMs = 0;
      if (session && session.endsAt) {
        remainingMs = Math.max(0, new Date(session.endsAt).getTime() - Date.now());
      }
      var remainingMin = Math.ceil(remainingMs / 60000);

      function close() { setStateField('activeModal', null); }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'AlloHaven arcade',
        onClick: function(e) { if (e.target === e.currentTarget) close(); },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '560px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '🎮 Arcade'),
            h('button', {
              onClick: close,
              'aria-label': 'Close arcade',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', margin: '0 0 14px 0', lineHeight: '1.5' }
          }, 'Tokens you\'ve earned can be spent on time in arcade games. Right now: 1 🪙 = ' + mpt + ' minutes.'),

          // Active session banner
          session ? h('div', {
            role: 'status',
            'aria-live': 'polite',
            style: {
              padding: '10px 14px',
              background: palette.surface,
              border: '1.5px solid ' + palette.accent,
              borderRadius: '10px',
              marginBottom: '14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }
          },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
                '⏱ Active session · ' + remainingMin + ' min left'),
              h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.4' } },
                'You\'re currently playing ' + ((window.AlloHavenArcade._registry[session.modeId] && window.AlloHavenArcade._registry[session.modeId].label) || session.modeId) + '.')
            ),
            h('button', {
              onClick: function() { endArcadeSession('forfeit'); },
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '6px 12px', fontSize: '12px' })
            }, 'End early')
          ) : null,

          // Token balance row
          h('div', {
            style: {
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px',
              background: palette.surface,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '12px'
            }
          },
            h('span', { style: { color: palette.textDim } }, 'Your wallet'),
            h('span', { style: { color: palette.text, fontWeight: 700 } },
              state.tokens + ' 🪙  ·  up to ' + (state.tokens * mpt) + ' minutes')
          ),

          // Modes list
          modes.length === 0 ? h('div', {
            style: {
              padding: '32px 20px', background: palette.surface,
              border: '1px dashed ' + palette.border, borderRadius: '10px', textAlign: 'center'
            }
          },
            h('div', { style: { fontSize: '40px', marginBottom: '10px' } }, '🕹'),
            h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55', margin: 0 } },
              'No arcade games installed yet. Each game ships as its own arcade_mode_*.js plugin file.')
          ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
            modes.map(function(mode) {
              var ctx = {
                React: window.React,
                palette: palette,
                tokens: state.tokens,
                minutesPerToken: mpt,
                session: session,
                onLaunch: function(minutes) { return launchArcadeMode(mode.id, minutes); },
                onClose: close,
                callImagen: props.callImagen,
                callGemini: props.callGemini,
                callTTS: props.callTTS,
                addToast: addToast,
                toolData: props.toolData || {},
                setStemLabTool: props.setStemLabTool || null
              };
              // Default card if mode doesn't supply its own render. If it
              // does, the mode owns the entire card UI.
              if (typeof mode.render === 'function') {
                try { return h('div', { key: 'arcade-' + mode.id }, window.AlloHavenArcade.renderMode(mode.id, ctx)); }
                catch (err) {
                  return h('div', { key: 'arcade-err-' + mode.id, style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic', padding: '8px' } },
                    'Error loading ' + mode.id);
                }
              }
              // Generic fallback card (if mode declared no render)
              var defaultMin = mode.timeCost || mpt;
              var defaultTokens = Math.ceil(defaultMin / mpt);
              var canAfford = state.tokens >= defaultTokens;
              return h('div', {
                key: 'arcade-default-' + mode.id,
                style: {
                  padding: '12px 14px',
                  background: palette.surface,
                  border: '1px solid ' + palette.border,
                  borderRadius: '10px'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: mode.blurb ? '6px' : 0 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: '28px' } }, mode.icon || '🎲'),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: '14px', fontWeight: 700, color: palette.text } }, mode.label || mode.id),
                    mode.blurb ? h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.4', marginTop: '2px' } }, mode.blurb) : null
                  ),
                  h('button', {
                    onClick: function() { ctx.onLaunch(defaultMin); },
                    disabled: !canAfford || !!session,
                    style: Object.assign({}, primaryBtnStyle(palette), {
                      padding: '6px 14px', fontSize: '12px',
                      opacity: (!canAfford || !!session) ? 0.5 : 1,
                      cursor: (!canAfford || !!session) ? 'not-allowed' : 'pointer'
                    })
                  }, defaultMin + ' min · ' + defaultTokens + ' 🪙')
                )
              );
            })
          )
        )
      );
    }

    function renderPrintOptionsModal() {
      if (state.activeModal !== 'print-options') return null;
      var opts = state.printOptions || {};
      var ctx = state.generateContext || {};
      // Where to bounce back when Cancel is hit. Defaults to memory-overview
      // (the original button location).
      var returnTo = ctx.returnTo || 'memory-overview';

      function toggle(id) {
        var next = Object.assign({}, opts);
        next[id] = !next[id];
        setStateField('printOptions', next);
      }
      function selectedCount() {
        return PRINT_SECTION_DEFS.filter(function(s) { return !!opts[s.id]; }).length;
      }
      function setAll(val) {
        var next = Object.assign({}, opts);
        PRINT_SECTION_DEFS.forEach(function(s) { next[s.id] = val; });
        setStateField('printOptions', next);
      }
      function doPrint() {
        if (selectedCount() === 0) {
          addToast('Pick at least one section to print.');
          return;
        }
        // Close the options modal then bounce to print AFTER the
        // packet's filters re-render in the next tick.
        setStateMulti({ activeModal: returnTo, generateContext: null });
        setTimeout(function() {
          try { window.print(); }
          catch (e) { addToast('Print not available in this browser.'); }
        }, 80);
      }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Print options',
        onClick: function(e) {
          if (e.target === e.currentTarget) {
            setStateMulti({ activeModal: returnTo, generateContext: null });
          }
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '480px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
              '🖨 Print options'),
            h('button', {
              onClick: function() { setStateMulti({ activeModal: returnTo, generateContext: null }); },
              'aria-label': 'Cancel',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', margin: '0 0 14px 0', lineHeight: '1.5' }
          }, 'Pick which sections go into the printed packet. Useful when sharing focused content with a parent, teacher, or clinician.'),

          // Quick all/none controls
          h('div', { style: { display: 'flex', gap: '6px', marginBottom: '14px' } },
            h('button', {
              onClick: function() { setAll(true); },
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px', fontSize: '11px' })
            }, '✓ All'),
            h('button', {
              onClick: function() { setAll(false); },
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px', fontSize: '11px' })
            }, '○ None')
          ),

          // Section checkboxes
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            PRINT_SECTION_DEFS.map(function(sec) {
              var on = !!opts[sec.id];
              return h('label', {
                key: 'po-' + sec.id,
                style: {
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '10px 12px',
                  background: on ? palette.surface : 'transparent',
                  border: '1.5px solid ' + (on ? palette.accent : palette.border),
                  borderRadius: '8px',
                  cursor: 'pointer'
                }
              },
                h('input', {
                  type: 'checkbox',
                  checked: on,
                  onChange: function() { toggle(sec.id); },
                  'aria-label': 'Include ' + sec.label,
                  style: { marginTop: '3px', cursor: 'pointer', width: '18px', height: '18px', accentColor: palette.accent }
                }),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text } },
                    sec.emoji + ' ' + sec.label),
                  h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.45', marginTop: '2px' } }, sec.hint)
                )
              );
            })
          ),

          // Action row
          h('div', {
            style: { display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap' }
          },
            h('div', { style: { fontSize: '11px', color: palette.textMute } },
              selectedCount() + ' / ' + PRINT_SECTION_DEFS.length + ' sections'),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('button', {
                onClick: function() { setStateMulti({ activeModal: returnTo, generateContext: null }); },
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '8px 14px', fontSize: '12px' })
              }, 'Cancel'),
              h('button', {
                onClick: doPrint,
                disabled: selectedCount() === 0,
                style: Object.assign({}, primaryBtnStyle(palette), {
                  padding: '8px 18px', fontSize: '13px',
                  opacity: selectedCount() === 0 ? 0.5 : 1,
                  cursor: selectedCount() === 0 ? 'not-allowed' : 'pointer'
                })
              }, '🖨 Print these')
            )
          )
        )
      );
    }

    // ─────────────────────────────────────────────────
    // COMPANION PHRASES (Phase 2p.32) — students teach the companion
    // 1-5 personal phrases that mix into the bubble pool at ~25%
    // chance. Tiny, delightful, deeply personal. Phrases are stored
    // on the companion record so they survive species/color changes.
    // ─────────────────────────────────────────────────
    var COMPANION_PHRASE_MAX = 5;
    var COMPANION_PHRASE_LIMIT = 80;
    function renderCompanionPhrasesModal() {
      if (state.activeModal !== 'companion-phrases') return null;
      var c = state.companion;
      if (!c || !c.species) {
        // No companion — bounce to setup.
        setTimeout(function() { setStateField('activeModal', 'companion-setup'); }, 0);
        return null;
      }
      var sp = getCompanionSpecies(c.species);
      var phrases = Array.isArray(c.customPhrases) ? c.customPhrases : [];
      var canAdd = phrases.length < COMPANION_PHRASE_MAX;
      var trimmed = (phraseDraft || '').trim();
      var validDraft = trimmed.length > 0 && trimmed.length <= COMPANION_PHRASE_LIMIT;

      function close() { setStateField('activeModal', null); }
      function teachPhrase() {
        if (!canAdd || !validDraft) return;
        // Clamp + dedupe (case-insensitive)
        var lc = trimmed.toLowerCase();
        if (phrases.some(function(p) { return p.toLowerCase() === lc; })) {
          addToast(c.name + ' already knows that one.');
          return;
        }
        var next = phrases.concat([trimmed]);
        saveCompanion({ customPhrases: next });
        setPhraseDraft('');
        addToast('💬 ' + c.name + ' learned a new phrase.');
      }
      function forgetPhrase(idx) {
        var next = phrases.slice(); next.splice(idx, 1);
        saveCompanion({ customPhrases: next });
      }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Teach ' + c.name + ' a phrase',
        onClick: function(e) { if (e.target === e.currentTarget) close(); },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '460px', width: '100%', maxHeight: '85vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
              '💬 Teach ' + c.name + ' a phrase'),
            h('button', {
              onClick: close,
              'aria-label': 'Close',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', { style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', margin: '0 0 14px 0', lineHeight: '1.5' } },
            'Anything you write here ' + c.name + ' will say sometimes when you click them. Up to ' + COMPANION_PHRASE_MAX + ' phrases. Forget any, any time.'),

          // Existing phrases
          phrases.length > 0 ? h('div', { style: { marginBottom: '14px' } },
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
              (sp ? sp.label : 'Buddy') + ' knows · ' + phrases.length + '/' + COMPANION_PHRASE_MAX),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              phrases.map(function(p, i) {
                return h('div', {
                  key: 'phrase-' + i,
                  style: {
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px',
                    background: palette.surface, border: '1px solid ' + palette.border,
                    borderRadius: '8px'
                  }
                },
                  h('div', { style: { flex: 1, fontSize: '13px', color: palette.text, lineHeight: '1.4' } },
                    h('span', { 'aria-hidden': 'true', style: { color: palette.accent, marginRight: '6px' } }, '"'),
                    p,
                    h('span', { 'aria-hidden': 'true', style: { color: palette.accent, marginLeft: '4px' } }, '"')
                  ),
                  h('button', {
                    onClick: function() { forgetPhrase(i); },
                    'aria-label': 'Forget this phrase',
                    title: 'Forget',
                    style: {
                      background: 'transparent', border: 'none', color: palette.textMute,
                      fontSize: '14px', cursor: 'pointer', padding: '0 4px', fontFamily: 'inherit'
                    }
                  }, '✕')
                );
              })
            )
          ) : h('p', { style: { fontSize: '12px', color: palette.textMute, fontStyle: 'italic', textAlign: 'center', padding: '14px 0', marginBottom: '14px' } },
            (sp ? sp.label : 'Your buddy') + ' hasn\'t learned anything yet.'),

          // Teach new phrase
          canAdd ? h('div', null,
            h('label', {
              htmlFor: 'ah-phrase-input',
              style: { display: 'block', fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }
            }, 'Teach a new phrase'),
            h('textarea', {
              id: 'ah-phrase-input',
              value: phraseDraft,
              onChange: function(e) { setPhraseDraft(e.target.value.slice(0, COMPANION_PHRASE_LIMIT)); },
              placeholder: 'Anything you want — an inside joke, a reminder, a little wisdom...',
              maxLength: COMPANION_PHRASE_LIMIT,
              rows: 2,
              'aria-label': 'New phrase to teach your buddy',
              style: {
                width: '100%', padding: '10px 12px',
                background: palette.surface, border: '1px solid ' + palette.border,
                borderRadius: '8px', color: palette.text,
                fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.5',
                resize: 'vertical', boxSizing: 'border-box'
              }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
              h('span', null, trimmed.length + '/' + COMPANION_PHRASE_LIMIT + ' characters'),
              h('button', {
                onClick: teachPhrase,
                disabled: !validDraft,
                style: Object.assign({}, primaryBtnStyle(palette), {
                  padding: '6px 14px', fontSize: '12px',
                  opacity: validDraft ? 1 : 0.5,
                  cursor: validDraft ? 'pointer' : 'not-allowed'
                })
              }, '+ Teach phrase')
            )
          ) : h('p', { style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', textAlign: 'center' } },
            c.name + ' has learned the maximum (' + COMPANION_PHRASE_MAX + '). Forget one to teach another.')
        )
      );
    }

    // ─────────────────────────────────────────────────
    // GROUNDING (Phase 2p.31) — 5-4-3-2-1 sensory anchoring exercise.
    // Sibling to the breathing pacer. Common in clinical practice for
    // anxiety, dissociation, autistic self-regulation. Same opt-in
    // positioning: room toolbar + Pomodoro break overlay. No tokens,
    // no streak. Skip-friendly at every step.
    // ─────────────────────────────────────────────────
    var GROUNDING_STEPS = [
      { sense: 'see',   emoji: '👀', count: 5, label: 'see',   verb: 'look around for', hint: 'Anything in the room. The light, a corner, your hands, your decorations.' },
      { sense: 'feel',  emoji: '🤲', count: 4, label: 'feel',  verb: 'notice you can feel', hint: 'Your feet on the floor. The chair under you. Fabric on your skin.' },
      { sense: 'hear',  emoji: '👂', count: 3, label: 'hear',  verb: 'listen for',         hint: 'Distant sounds, close sounds, the quiet ones underneath.' },
      { sense: 'smell', emoji: '👃', count: 2, label: 'smell', verb: 'try to smell',       hint: 'Your space. Your hair. The air. (Hard to find? Just notice the trying.)' },
      { sense: 'taste', emoji: '👅', count: 1, label: 'taste', verb: 'notice the taste of', hint: 'Anything in your mouth right now — even just the taste of breath or your tongue.' }
    ];
    function renderGroundingModal() {
      if (state.activeModal !== 'grounding') return null;
      var idx = Math.max(0, Math.min(groundingStep, GROUNDING_STEPS.length));
      var done = idx >= GROUNDING_STEPS.length;
      var stepDef = !done ? GROUNDING_STEPS[idx] : null;
      var note = !done ? (groundingNotes[idx] || '') : '';

      function setNote(text) {
        var next = groundingNotes.slice();
        next[idx] = text;
        setGroundingNotes(next);
      }
      function advance() {
        setGroundingStep(idx + 1);
      }
      function goBack() {
        if (idx > 0) setGroundingStep(idx - 1);
      }
      function close() {
        setStateField('activeModal', null);
      }

      // Companion accompaniment
      var c = state.companion;
      var sp = (c && c.species) ? getCompanionSpecies(c.species) : null;
      var swatch = (c && c.species) ? getCompanionPalette(c.species, c.colorVariant || 'warm') : null;

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Sensory grounding exercise',
        onClick: function(e) { if (e.target === e.currentTarget) close(); },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.78)',
          zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '2px solid ' + palette.accent,
            borderRadius: '20px', padding: '28px',
            maxWidth: '420px', width: '100%',
            boxShadow: '0 30px 70px rgba(0,0,0,0.55)'
          }
        },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
            h('div', {
              style: {
                fontSize: '12px', color: palette.textMute,
                textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700
              }
            }, '🧷 Grounding · 5·4·3·2·1'),
            h('button', {
              onClick: close,
              'aria-label': 'Close grounding exercise',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic', margin: '0 0 16px 0' }
          }, 'Find what\'s here, one sense at a time. Skip any step you want.'),

          // Progress dots
          h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' } },
            GROUNDING_STEPS.map(function(s, i) {
              var current = i === idx && !done;
              var past = i < idx || done;
              return h('span', {
                key: 'gd-' + i,
                'aria-label': 'Step ' + (i + 1) + ' of ' + GROUNDING_STEPS.length + (current ? ' (current)' : past ? ' (done)' : ''),
                style: {
                  width: current ? '14px' : '10px',
                  height: current ? '14px' : '10px',
                  borderRadius: '50%',
                  background: past ? palette.accent : (current ? palette.accent : 'transparent'),
                  border: '1.5px solid ' + palette.accent,
                  opacity: past && !current ? 0.5 : 1,
                  transition: 'width 200ms, height 200ms'
                }
              });
            })
          ),

          // Step body OR completion
          !done ? h('div', null,
            h('div', { style: { textAlign: 'center', marginBottom: '6px' } },
              h('div', { 'aria-hidden': 'true', style: { fontSize: '52px', lineHeight: 1 } }, stepDef.emoji),
              h('div', {
                style: {
                  fontSize: '22px', fontWeight: 800, color: palette.text,
                  marginTop: '6px', letterSpacing: '0.02em'
                }
              }, stepDef.count + ' things you can ' + stepDef.label),
              h('div', {
                style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic', marginTop: '4px', lineHeight: '1.4' }
              }, stepDef.hint)
            ),
            // Optional notes input
            h('label', {
              htmlFor: 'ah-grounding-notes',
              style: { display: 'block', fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '14px', marginBottom: '6px' }
            }, 'Note them down (optional)'),
            h('textarea', {
              id: 'ah-grounding-notes',
              value: note,
              onChange: function(e) { setNote(e.target.value); },
              placeholder: stepDef.count === 1 ? 'whatever you notice...' : 'one per line, or just type...',
              rows: 3,
              'aria-label': 'Notes for grounding step ' + (idx + 1) + ' (optional)',
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
                boxSizing: 'border-box'
              }
            })
          ) : h('div', { style: { textAlign: 'center', padding: '12px 0' } },
            h('div', { 'aria-hidden': 'true', style: { fontSize: '56px', marginBottom: '8px' } }, '🌿'),
            h('div', {
              style: { fontSize: '20px', fontWeight: 800, color: palette.text, marginBottom: '6px' }
            }, 'You\'re grounded.'),
            h('div', {
              style: { fontSize: '13px', color: palette.textDim, fontStyle: 'italic', lineHeight: '1.5', maxWidth: '320px', margin: '0 auto' }
            }, 'You\'re here. Right now. The room is real, and so are you.')
          ),

          // Optional companion accompaniment row
          (c && sp) ? h('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '16px' }
          },
            h('div', {
              'data-species': c.species,
              style: { width: '48px', height: '48px', padding: '4px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '12px' }
            },
              h('div', { className: 'ah-companion-root' },
                getCompanionSvg(c.species, swatch, { blinking: blinking, pupilOffset: { x: 0, y: 0 } })
              )
            ),
            h('div', {
              style: { fontSize: '11px', fontStyle: 'italic', color: palette.textDim, lineHeight: '1.4' }
            }, c.name + ' is right here.')
          ) : null,

          // Action row
          h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '20px', flexWrap: 'wrap' } },
            !done ? h('button', {
              onClick: goBack,
              disabled: idx === 0,
              'aria-label': 'Go back one step',
              style: Object.assign({}, secondaryBtnStyle(palette), {
                padding: '8px 14px', fontSize: '12px',
                opacity: idx === 0 ? 0.4 : 1,
                cursor: idx === 0 ? 'not-allowed' : 'pointer'
              })
            }, '← Back') : h('span', null),
            h('div', { style: { display: 'flex', gap: '8px' } },
              !done ? h('button', {
                onClick: advance,
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '8px 14px', fontSize: '12px' })
              }, 'Skip') : null,
              !done ? h('button', {
                onClick: advance,
                style: Object.assign({}, primaryBtnStyle(palette), { padding: '8px 18px', fontSize: '13px' })
              }, idx === GROUNDING_STEPS.length - 1 ? 'Finish' : 'Next →') : h('button', {
                onClick: close,
                style: Object.assign({}, primaryBtnStyle(palette), { padding: '8px 18px', fontSize: '13px' })
              }, 'Done')
            )
          )
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

    // ── Activity heatmap (Phase 2p.8) ──
    // 90-day calendar grid showing activity intensity per day. Colors
    // scale from neutral (no activity) through accent shades (more
    // activity). NO red / negative coloring on idle days — this is
    // visibility, not punishment. Engagement evidence for IEP teams +
    // visual reward for students. Renders only with ≥1 earning event.
    function renderActivityHeatmap() {
      var earnings = state.earnings || [];
      var decorations = state.decorations || [];
      var journals = state.journalEntries || [];
      if (earnings.length === 0 && journals.length === 0 && decorations.length === 0) return null;

      var DAYS = 91; // 13 weeks × 7 days
      var msPerDay = 24 * 60 * 60 * 1000;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var todayMs = today.getTime();
      // Align grid so the LAST column is the current week (Sunday-start)
      // Find the most recent Saturday (end of current week)
      var dowToday = today.getDay(); // 0=Sun..6=Sat
      var daysToSatEnd = (6 - dowToday); // days from today to upcoming Saturday
      var endDay = new Date(todayMs + daysToSatEnd * msPerDay);
      var startMs = endDay.getTime() - (DAYS - 1) * msPerDay;

      // Per-day activity buckets: tokens earned + journals written + decorations placed
      var perDay = {};
      function bucketFor(dateLike) {
        if (!dateLike) return null;
        var t = new Date(dateLike).getTime();
        if (isNaN(t)) return null;
        if (t < startMs || t > endDay.getTime() + msPerDay) return null;
        var dayKey = new Date(t); dayKey.setHours(0, 0, 0, 0);
        var iso = dayKey.toISOString().slice(0, 10);
        if (!perDay[iso]) perDay[iso] = { tokens: 0, pomodoros: 0, reflections: 0, decorations: 0, quizzes: 0 };
        return perDay[iso];
      }
      earnings.forEach(function(e) {
        var b = bucketFor(e.date);
        if (!b) return;
        b.tokens += e.tokens || 0;
        if (e.source === 'pomodoro' || e.source === 'cycle-bonus') b.pomodoros += 1;
        if (e.source === 'reflection') b.reflections += 1;
        if (e.source === 'memory-quiz' || e.source === 'reflection-cloze-quiz') b.quizzes += 1;
      });
      decorations.forEach(function(d) {
        if (d.isStarter) return;
        var b = bucketFor(d.earnedAt);
        if (b) b.decorations += 1;
      });
      journals.forEach(function(j) {
        var b = bucketFor(j.date);
        // Reflections already counted via earnings, but a journal edit may
        // not earn — count any journal entry as activity even if no token
        if (b && j.tokensEarned === 0) b.reflections += 1;
      });

      // Find max activity intensity for color scaling
      var maxIntensity = 0;
      Object.keys(perDay).forEach(function(k) {
        var b = perDay[k];
        var score = b.tokens + b.decorations * 2; // weight decorations a bit higher
        if (score > maxIntensity) maxIntensity = score;
      });
      if (maxIntensity === 0) maxIntensity = 1;

      function dayCellColor(b) {
        if (!b) return palette.surface;
        var score = b.tokens + b.decorations * 2;
        if (score === 0) return palette.surface;
        var intensity = Math.min(1, score / maxIntensity);
        // Blend palette.surface → palette.accent based on intensity
        // Use rgba with the accent at variable opacity over a base bg.
        // 4 buckets for clear visual distinction (matches GitHub style).
        if (intensity < 0.25) return 'rgba(96,165,250,0.18)';   // very light
        if (intensity < 0.50) return 'rgba(96,165,250,0.40)';
        if (intensity < 0.75) return 'rgba(96,165,250,0.65)';
        return 'rgba(96,165,250,0.92)';
      }
      // ^ uses fixed accent rgba — for theme-correctness, prefer
      // palette.accent. But CSS rgba() needs hex parsing. Cheaper:
      // use opacity layered on a transparent background.
      function dayCellStyle(b, dayOfWeek, isFuture) {
        if (isFuture) {
          return { background: 'transparent', opacity: 0.3 };
        }
        if (!b || (b.tokens + b.decorations * 2) === 0) {
          return { background: palette.surface, opacity: 0.7 };
        }
        var score = b.tokens + b.decorations * 2;
        var intensity = Math.min(1, score / maxIntensity);
        var bucket = intensity < 0.25 ? 0.22 : intensity < 0.5 ? 0.45 : intensity < 0.75 ? 0.7 : 1;
        return { background: palette.accent, opacity: bucket };
      }

      // Build the grid: 7 rows (days of week, Sun first), 13 columns (weeks)
      var rows = [];
      for (var dow = 0; dow < 7; dow++) {
        var cells = [];
        for (var col = 0; col < 13; col++) {
          var dayMs = startMs + (col * 7 + dow) * msPerDay;
          var cellDate = new Date(dayMs);
          var iso = cellDate.toISOString().slice(0, 10);
          var b = perDay[iso] || null;
          var isFuture = dayMs > todayMs;
          var label = cellDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          var summary = '';
          if (b) {
            var parts = [];
            if (b.tokens) parts.push(b.tokens + ' token' + (b.tokens === 1 ? '' : 's'));
            if (b.pomodoros) parts.push(b.pomodoros + ' Pomodoro' + (b.pomodoros === 1 ? '' : 's'));
            if (b.reflections) parts.push(b.reflections + ' reflection' + (b.reflections === 1 ? '' : 's'));
            if (b.quizzes) parts.push(b.quizzes + ' quiz' + (b.quizzes === 1 ? '' : 'zes'));
            if (b.decorations) parts.push(b.decorations + ' decoration' + (b.decorations === 1 ? '' : 's'));
            summary = parts.join(', ');
          }
          var cellTitle = label + (summary ? ' — ' + summary : isFuture ? ' (upcoming)' : ' (no activity)');
          cells.push(h('div', {
            key: 'hm-' + dow + '-' + col,
            'aria-label': cellTitle,
            title: cellTitle,
            style: Object.assign({
              width: '14px', height: '14px',
              borderRadius: '3px',
              border: '1px solid ' + palette.border,
              flexShrink: 0
            }, dayCellStyle(b, dow, isFuture))
          }));
        }
        rows.push(h('div', {
          key: 'hm-row-' + dow,
          style: { display: 'flex', gap: '3px' }
        }, cells));
      }

      // Stats summary
      var totalDays = Object.keys(perDay).length;
      var totalTokens = Object.values(perDay).reduce(function(s, b) { return s + b.tokens; }, 0);

      return h('div', {
        role: 'figure',
        'aria-label': 'Activity heatmap, last 90 days. ' + totalDays + ' active days, ' + totalTokens + ' tokens earned.',
        style: {
          padding: '12px 14px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '8px',
          marginBottom: '14px'
        }
      },
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }
        },
          h('span', {
            style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }
          }, '📅 Last 90 days'),
          h('span', {
            style: { fontSize: '11px', color: palette.textDim, fontVariantNumeric: 'tabular-nums' }
          },
            h('span', { style: { color: palette.text, fontWeight: 700 } }, totalDays),
            ' active day' + (totalDays === 1 ? '' : 's') + ' · ',
            h('span', { style: { color: palette.accent, fontWeight: 700 } }, totalTokens),
            ' tokens'
          )
        ),
        h('div', {
          'aria-hidden': 'true',
          style: { display: 'flex', flexDirection: 'column', gap: '3px', overflowX: 'auto' }
        }, rows),
        h('div', {
          style: { display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '8px', fontSize: '10px', color: palette.textMute }
        },
          h('span', null, 'Less'),
          [0.7, 0.22, 0.45, 0.7, 1].map(function(op, i) {
            return h('span', {
              key: 'lg-' + i,
              'aria-hidden': 'true',
              style: {
                width: '12px', height: '12px',
                borderRadius: '3px',
                border: '1px solid ' + palette.border,
                background: i === 0 ? palette.surface : palette.accent,
                opacity: op
              }
            });
          }),
          h('span', null, 'More')
        )
      );
    }

    // ── Token trends (Phase 2l) ──
    // Compact 30-day SVG chart of cumulative earning vs spending. Renders
    // only when there's at least one earning event — silent when the
    // student is brand-new. Two stacked bars per day: green for earned,
    // dim for spent. A single horizontal balance line traces the running
    // total across the period. Read aloud well: aria-label summarizes
    // total earned + spent + current balance.
    // ── Mood timeline (Phase 2p.25) ──
    // Stacked bar chart showing mood-tagged decoration distribution by
    // week over the last 13 weeks. Pairs with trends + heatmap to give
    // three different time-scoped views: 30-day flow / 13-week mood /
    // 90-day daily activity. Clinical-grade visualization for tracking
    // affective trajectory across an intervention period.
    function renderMoodTimeline() {
      var decorations = state.decorations || [];
      var taggedDecs = decorations.filter(function(d) {
        return d.mood && d.earnedAt && !d.isStarter;
      });
      if (taggedDecs.length < 3) return null;
      var WEEKS = 13;
      var msPerWeek = 7 * 24 * 60 * 60 * 1000;
      var now = Date.now();
      // Align to end-of-week (Saturday) so the rightmost bar is the
      // current week and prior bars are full weeks back
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var dowToday = today.getDay();
      var endOfWeekTs = today.getTime() + (6 - dowToday) * 24 * 60 * 60 * 1000;
      var startMs = endOfWeekTs - (WEEKS * msPerWeek - 1);
      // Build per-week mood counts
      var perWeek = [];
      for (var w = 0; w < WEEKS; w++) {
        perWeek.push({ joy: 0, pride: 0, curiosity: 0, calm: 0, struggle: 0, total: 0 });
      }
      taggedDecs.forEach(function(d) {
        var t = new Date(d.earnedAt).getTime();
        if (t < startMs || t > endOfWeekTs) return;
        var idx = Math.floor((t - startMs) / msPerWeek);
        if (idx < 0 || idx >= WEEKS) return;
        if (perWeek[idx][d.mood] !== undefined) {
          perWeek[idx][d.mood]++;
          perWeek[idx].total++;
        }
      });
      var maxTotal = 1;
      perWeek.forEach(function(w) { if (w.total > maxTotal) maxTotal = w.total; });

      // SVG dimensions
      var W = 320, H = 100;
      var padL = 4, padR = 4, padT = 6, padB = 16;
      var plotW = W - padL - padR;
      var plotH = H - padT - padB;
      var barW = plotW / WEEKS;
      var maxBarH = plotH;
      // Mood color mapping (matches mood-tag tints established in 2p.2)
      var moodColors = {
        joy:       '#ffc85a',  // warm yellow
        pride:     '#ffaa50',  // warm orange
        curiosity: '#b48cdc',  // soft purple
        calm:      '#78b4c8',  // cool teal
        struggle:  '#c896aa'   // soft pink
      };
      var moodOrder = ['joy', 'pride', 'curiosity', 'calm', 'struggle'];

      // Build stacked bars
      var bars = [];
      for (var i = 0; i < WEEKS; i++) {
        var weekBucket = perWeek[i];
        var x = padL + i * barW;
        var stackedH = 0;
        if (weekBucket.total === 0) continue;
        moodOrder.forEach(function(mid) {
          var n = weekBucket[mid] || 0;
          if (n === 0) return;
          var segH = (n / maxTotal) * maxBarH;
          var y = padT + maxBarH - stackedH - segH;
          bars.push(h('rect', {
            key: 'mw-' + i + '-' + mid,
            x: x + barW * 0.15, y: y,
            width: Math.max(2, barW * 0.7), height: segH,
            fill: moodColors[mid],
            opacity: 0.92
          }));
          stackedH += segH;
        });
      }

      // X-axis date labels (start, mid, end)
      function fmt(d) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      var startLabelDate = new Date(startMs);
      var midLabelDate = new Date(startMs + (WEEKS / 2) * msPerWeek);

      // Aria summary
      var totalCount = taggedDecs.length;
      var moodCounts = { joy: 0, pride: 0, curiosity: 0, calm: 0, struggle: 0 };
      taggedDecs.forEach(function(d) { if (moodCounts[d.mood] !== undefined) moodCounts[d.mood]++; });
      var ariaSummary = 'Mood timeline, last ' + WEEKS + ' weeks. ' + totalCount + ' tagged decorations. '
        + moodOrder.map(function(m) {
          return moodCounts[m] + ' ' + m;
        }).join(', ') + '.';

      return h('div', {
        role: 'figure',
        'aria-label': ariaSummary,
        style: {
          padding: '12px 14px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '8px',
          marginBottom: '14px'
        }
      },
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }
        },
          h('span', {
            style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }
          }, '🎭 Mood timeline · 13 weeks'),
          h('span', {
            style: { fontSize: '11px', color: palette.textDim, fontVariantNumeric: 'tabular-nums' }
          },
            h('span', { style: { color: palette.text, fontWeight: 700 } }, totalCount),
            ' tagged decoration' + (totalCount === 1 ? '' : 's')
          )
        ),
        h('svg', {
          viewBox: '0 0 ' + W + ' ' + H,
          width: '100%',
          height: H,
          'aria-hidden': 'true',
          style: { display: 'block' }
        },
          // Baseline
          h('line', {
            x1: padL, x2: W - padR,
            y1: padT + maxBarH, y2: padT + maxBarH,
            stroke: palette.border, strokeWidth: 0.5
          }),
          bars,
          // X-axis labels
          h('text', {
            x: padL, y: H - 2, fontSize: '9', fill: palette.textMute, textAnchor: 'start'
          }, fmt(startLabelDate)),
          h('text', {
            x: padL + plotW / 2, y: H - 2, fontSize: '9', fill: palette.textMute, textAnchor: 'middle'
          }, fmt(midLabelDate)),
          h('text', {
            x: W - padR, y: H - 2, fontSize: '9', fill: palette.textMute, textAnchor: 'end'
          }, 'This week')
        ),
        // Legend
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px', fontSize: '10px', color: palette.textMute } },
          MOOD_OPTIONS.map(function(m) {
            if (!moodCounts[m.id]) return null;
            return h('span', {
              key: 'leg-' + m.id,
              style: { display: 'inline-flex', alignItems: 'center', gap: '4px' }
            },
              h('span', {
                'aria-hidden': 'true',
                style: { width: '10px', height: '10px', background: moodColors[m.id], borderRadius: '2px', display: 'inline-block' }
              }),
              h('span', null, m.emoji + ' ' + m.label + ' · ' + moodCounts[m.id])
            );
          })
        )
      );
    }

    function renderTrendsChart() {
      var earnings = state.earnings || [];
      var decorations = state.decorations || [];
      if (earnings.length === 0 && decorations.length === 0) return null;

      var DAYS = 30;
      var msPerDay = 24 * 60 * 60 * 1000;
      var now = Date.now();
      // Day-bucket start (midnight, today): floor to nearest day in local time
      var today = new Date(); today.setHours(0,0,0,0);
      var todayMs = today.getTime();
      var startMs = todayMs - (DAYS - 1) * msPerDay;

      // Initialize per-day buckets [0..29]
      var earnedPerDay = new Array(DAYS).fill(0);
      var spentPerDay  = new Array(DAYS).fill(0);

      // Aggregate earnings into day buckets
      earnings.forEach(function(e) {
        if (!e.date || !e.tokens) return;
        var t = new Date(e.date).getTime();
        if (t < startMs || t > todayMs + msPerDay) return;
        var idx = Math.floor((t - startMs) / msPerDay);
        if (idx >= 0 && idx < DAYS) earnedPerDay[idx] += e.tokens;
      });
      // Aggregate decoration spending (tokensSpent at earnedAt date)
      decorations.forEach(function(d) {
        if (!d.tokensSpent || !d.earnedAt) return;
        var t = new Date(d.earnedAt).getTime();
        if (t < startMs || t > todayMs + msPerDay) return;
        var idx = Math.floor((t - startMs) / msPerDay);
        if (idx >= 0 && idx < DAYS) spentPerDay[idx] += d.tokensSpent;
      });

      var totalEarned = earnedPerDay.reduce(function(s, v) { return s + v; }, 0);
      var totalSpent  = spentPerDay.reduce(function(s, v) { return s + v; }, 0);

      if (totalEarned === 0 && totalSpent === 0) return null;

      // Compute running balance per day (starts at state.tokens - totalNet for the period)
      // Actually simpler: balance = earned-up-to-day - spent-up-to-day. We don't know
      // pre-period balance from state alone, so we just track NET delta over the 30
      // days. End-of-period delta = totalEarned - totalSpent.
      var balanceLine = [];
      var cumNet = 0;
      for (var i = 0; i < DAYS; i++) {
        cumNet += earnedPerDay[i] - spentPerDay[i];
        balanceLine.push(cumNet);
      }
      var maxBar = Math.max(1, Math.max.apply(null, earnedPerDay), Math.max.apply(null, spentPerDay));
      var minBalance = Math.min.apply(null, balanceLine);
      var maxBalance = Math.max.apply(null, balanceLine);

      // SVG dimensions
      var W = 320; var H = 90;
      var padL = 28, padR = 8, padT = 6, padB = 16;
      var plotW = W - padL - padR;
      var plotH = H - padT - padB;
      var barW = plotW / DAYS;
      var maxBarH = plotH * 0.7;

      // Render bars + balance line
      var bars = [];
      var dots = [];
      for (var j = 0; j < DAYS; j++) {
        var earnedH = (earnedPerDay[j] / maxBar) * maxBarH;
        var spentH = (spentPerDay[j] / maxBar) * maxBarH;
        var x = padL + j * barW;
        // Earned (green-ish) — bar grows up from middle
        var midY = padT + plotH * 0.6;
        if (earnedPerDay[j] > 0) {
          bars.push(h('rect', {
            key: 'be-' + j,
            x: x + barW * 0.15, y: midY - earnedH,
            width: Math.max(2, barW * 0.7), height: earnedH,
            fill: palette.success || palette.accent,
            opacity: 0.85
          }));
        }
        if (spentPerDay[j] > 0) {
          bars.push(h('rect', {
            key: 'bs-' + j,
            x: x + barW * 0.15, y: midY,
            width: Math.max(2, barW * 0.7), height: spentH,
            fill: palette.warn || palette.accentDim || palette.textMute,
            opacity: 0.85
          }));
        }
      }

      // Balance line (running NET delta, scaled relative to balance range)
      var balRange = Math.max(1, maxBalance - Math.min(0, minBalance));
      var balanceY = function(v) {
        // Higher value → smaller y. Bottom of plot = min(0, minBalance), top = maxBalance
        var rangeMin = Math.min(0, minBalance);
        var t = (v - rangeMin) / (maxBalance - rangeMin || 1);
        return padT + plotH - t * plotH * 0.3 - plotH * 0.05;
      };
      var balancePath = balanceLine.map(function(v, i) {
        var x = padL + i * barW + barW / 2;
        var y = balanceY(v);
        return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      // Final balance dot
      var lastX = padL + (DAYS - 1) * barW + barW / 2;
      var lastY = balanceY(balanceLine[DAYS - 1]);
      dots.push(h('circle', {
        key: 'bd-last',
        cx: lastX, cy: lastY, r: 3.5,
        fill: palette.accent,
        stroke: palette.bg,
        strokeWidth: 1.5
      }));

      // X-axis labels (only show endpoints + middle for compactness)
      var startDate = new Date(startMs);
      var fmt = function(d) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      };
      var midDate = new Date(startMs + 14 * msPerDay);

      var ariaLabel = 'Token trends, last 30 days. ' + totalEarned + ' tokens earned, ' + totalSpent + ' spent. Net change: ' + (cumNet >= 0 ? '+' : '') + cumNet + '.';

      return h('div', {
        role: 'figure',
        'aria-label': ariaLabel,
        style: {
          padding: '12px 14px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '8px',
          marginBottom: '14px'
        }
      },
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }
        },
          h('span', {
            style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }
          }, '📊 Last 30 days'),
          h('span', {
            style: { fontSize: '11px', color: palette.textDim, fontVariantNumeric: 'tabular-nums' }
          },
            h('span', { style: { color: palette.success || palette.accent, fontWeight: 700 } }, '+' + totalEarned),
            ' earned · ',
            h('span', { style: { color: palette.warn || palette.textMute, fontWeight: 700 } }, '−' + totalSpent),
            ' spent · net ',
            h('span', { style: { color: cumNet >= 0 ? (palette.success || palette.accent) : (palette.warn || palette.accent), fontWeight: 700 } },
              (cumNet >= 0 ? '+' : '') + cumNet)
          )
        ),
        h('svg', {
          viewBox: '0 0 ' + W + ' ' + H,
          width: '100%',
          height: H,
          'aria-hidden': 'true',
          style: { display: 'block' }
        },
          // Center divider line
          h('line', {
            x1: padL, x2: W - padR,
            y1: padT + plotH * 0.6, y2: padT + plotH * 0.6,
            stroke: palette.border, strokeWidth: 0.5,
            strokeDasharray: '2,3'
          }),
          bars,
          // Balance line
          h('path', {
            d: balancePath,
            fill: 'none',
            stroke: palette.accent,
            strokeWidth: 1.5,
            opacity: 0.9
          }),
          dots,
          // X-axis labels
          h('text', {
            x: padL, y: H - 2, fontSize: '9', fill: palette.textMute, textAnchor: 'start'
          }, fmt(startDate)),
          h('text', {
            x: padL + plotW / 2, y: H - 2, fontSize: '9', fill: palette.textMute, textAnchor: 'middle'
          }, fmt(midDate)),
          h('text', {
            x: W - padR, y: H - 2, fontSize: '9', fill: palette.textMute, textAnchor: 'end'
          }, 'Today'),
          // Y-axis legend
          h('text', {
            x: 4, y: padT + maxBarH * 0.5, fontSize: '8', fill: palette.success || palette.accent,
            textAnchor: 'start'
          }, '+' + maxBar),
          h('text', {
            x: 4, y: padT + plotH * 0.6 + maxBarH * 0.5, fontSize: '8', fill: palette.warn || palette.textMute,
            textAnchor: 'start'
          }, '−' + maxBar)
        )
      );
    }

    function renderMemoryOverviewModal() {
      if (state.activeModal !== 'memory-overview') return null;
      // Subject filter (Phase 2p.6) — student-selected subject narrows
      // the visible decks. activeSubjectFilter lives in generateContext
      // since it's modal-scoped and shouldn't persist beyond close.
      var activeFilter = (state.generateContext && state.generateContext.subjectFilter) || null;
      var activeMoodFilter = (state.generateContext && state.generateContext.moodFilter) || null;
      var allWithContent = state.decorations.filter(function(d) { return !!d.linkedContent; });
      var withContent = allWithContent.filter(function(d) {
        if (activeFilter) {
          if (!Array.isArray(d.subjects) || d.subjects.indexOf(activeFilter) === -1) return false;
        }
        if (activeMoodFilter) {
          if (d.mood !== activeMoodFilter) return false;
        }
        return true;
      });
      // Compute which subjects + moods are actually present (for filter rows)
      var subjectsPresent = {};
      var moodsPresent = {};
      allWithContent.forEach(function(d) {
        (d.subjects || []).forEach(function(s) { subjectsPresent[s] = (subjectsPresent[s] || 0) + 1; });
        if (d.mood) moodsPresent[d.mood] = (moodsPresent[d.mood] || 0) + 1;
      });
      function setSubjectFilter(id) {
        var nextCtx = Object.assign({}, state.generateContext || {}, {
          subjectFilter: (activeFilter === id) ? null : id
        });
        setStateField('generateContext', nextCtx);
      }
      function setMoodFilter(id) {
        var nextCtx = Object.assign({}, state.generateContext || {}, {
          moodFilter: (activeMoodFilter === id) ? null : id
        });
        setStateField('generateContext', nextCtx);
      }
      // Partition into 3 buckets: due / due-soon / fresh
      var due = [];
      var dueSoon = [];
      var fresh = [];
      withContent.forEach(function(d) {
        if (isMemoryDue(d))          due.push(d);
        else if (isMemoryDueSoon(d)) dueSoon.push(d);
        else                          fresh.push(d);
      });
      // Sort priority (Phase 2p.14): favorites first within each bucket,
      // then by most-recently-reviewed. Keeps the queue actionable while
      // letting students see their cherished decks at the top.
      var byLastReviewedDesc = function(a, b) {
        var aFav = !!a.isFavorite;
        var bFav = !!b.isFavorite;
        if (aFav !== bFav) return aFav ? -1 : 1;
        var aIso = (a.linkedContent && a.linkedContent.lastReviewedAt) || '';
        var bIso = (b.linkedContent && b.linkedContent.lastReviewedAt) || '';
        return bIso.localeCompare(aIso);
      };
      due.sort(byLastReviewedDesc);
      dueSoon.sort(byLastReviewedDesc);
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

      // Stories partition (Phase 2g)
      var allStories = state.stories || [];
      var walkableStories = allStories.filter(function(s) {
        var validSteps = (s.steps || []).filter(function(st) {
          return st.decorationId && (st.narrative || '').trim().length > 0;
        });
        return validSteps.length >= 3 && (s.title || '').trim().length > 0;
      });
      var draftStories = allStories.filter(function(s) {
        return walkableStories.indexOf(s) === -1;
      });
      // Sort walkable stories: never-walked first (encourage first walk),
      // then oldest-walked first (rotation surfaces stale stories)
      walkableStories.sort(function(a, b) {
        var aR = a.lastReviewedAt || '';
        var bR = b.lastReviewedAt || '';
        if (!aR && bR) return -1;
        if (aR && !bR) return 1;
        return aR.localeCompare(bR); // oldest first
      });
      draftStories.sort(function(a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });

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
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }
          },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '📖 Memory palace · ' + totalDecks + ' deck' + (totalDecks === 1 ? '' : 's')),
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              h('button', {
                onClick: function() { setStateField('activeModal', 'weekly-summary'); },
                'aria-label': 'Show last 7 days summary',
                title: 'Quick 7-day snapshot — what you did, how you felt, what you unlocked',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '6px 12px', fontSize: '12px' })
              }, '🗓️ Last 7 days'),
              (totalDecks > 0 || allStories.length > 0) ? h('button', {
                onClick: function() { setStateField('activeModal', 'clinical-review'); },
                'aria-label': 'Review packet on screen',
                title: 'Show all decks, stories, and reflections in a single scrollable view (for review with a parent, teacher, or clinician)',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '6px 12px', fontSize: '12px' })
              }, '📋 Review packet') : null,
              (totalDecks > 0 || allStories.length > 0) ? h('button', {
                onClick: function() {
                  // Phase 2p.34 — go through the print options modal so
                  // the user can pick which sections to include before
                  // window.print() fires.
                  setStateMulti({
                    activeModal: 'print-options',
                    generateContext: { returnTo: 'memory-overview' }
                  });
                },
                'aria-label': 'Print study packet (pick sections)',
                title: 'Pick which sections to include, then print',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '6px 12px', fontSize: '12px' })
              }, '🖨 Print') : null,
              h('button', {
                onClick: function() { setStateField('activeModal', null); },
                'aria-label': 'Close memory overview',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
              }, '✕')
            )
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5', fontStyle: 'italic' }
          }, 'Each decoration in your room can hold study aids — flashcards, acronyms, or notes. The room itself is a method-of-loci anchor: where you place a deck shapes how you remember it.'),

          // Empty-state — distinguish "no content yet" vs "filter narrowed to zero"
          totalDecks === 0 ? (function() {
            var allCount = allWithContent.length;
            var filteredOut = (activeFilter || activeMoodFilter) && allCount > 0;
            if (filteredOut) {
              var filterLabel = (function() {
                var parts = [];
                if (activeFilter) {
                  for (var fi = 0; fi < SUBJECT_TAGS.length; fi++) {
                    if (SUBJECT_TAGS[fi].id === activeFilter) { parts.push(SUBJECT_TAGS[fi].label); break; }
                  }
                  if (parts.length === 0) parts.push(activeFilter);
                }
                if (activeMoodFilter) {
                  var mo = getMoodOption(activeMoodFilter);
                  parts.push(mo ? mo.label : activeMoodFilter);
                }
                return parts.join(' + ');
              })();
              return h('div', {
                role: 'status', 'aria-live': 'polite',
                style: { padding: '24px 20px', background: palette.surface, border: '1px dashed ' + palette.border, borderRadius: '10px', textAlign: 'center' }
              },
                h('div', { 'aria-hidden': 'true', style: { fontSize: '32px', marginBottom: '8px' } }, '🔍'),
                h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55', margin: '0 0 10px 0' } },
                  'No decks tagged "' + filterLabel + '" yet. Tag a deck via its memory modal, or:'),
                h('button', {
                  onClick: function() {
                    // Clear BOTH filters simultaneously
                    var nextCtx = Object.assign({}, state.generateContext || {}, {
                      subjectFilter: null,
                      moodFilter: null
                    });
                    setStateField('generateContext', nextCtx);
                  },
                  'aria-label': 'Clear all filters',
                  style: Object.assign({}, primaryBtnStyle(palette), { padding: '6px 14px', fontSize: '12px' })
                }, 'Show all decks')
              );
            }
            return h('div', {
              style: {
                padding: '32px 20px',
                background: palette.surface,
                border: '1px dashed ' + palette.border,
                borderRadius: '10px',
                textAlign: 'center'
              }
            },
              h('div', { 'aria-hidden': 'true', style: { fontSize: '40px', marginBottom: '10px' } }, '📖'),
              h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55', margin: 0 } },
                'No memory content yet. Click any decoration in your room to attach flashcards, an acronym, or notes — your decorations become the anchors for what you\'re learning.')
            );
          })() : null,

          // Stats row (only when there's content)
          (totalDecks > 0 || allStories.length > 0) ? h('div', {
            style: {
              display: 'flex',
              gap: '8px',
              marginBottom: '14px',
              flexWrap: 'wrap'
            }
          },
            totalDecks > 0 ? renderOverviewStat('Decks', totalDecks, palette) : null,
            totalCards > 0 ? renderOverviewStat('Flashcards', totalCards, palette) : null,
            walkableStories.length > 0 ? renderOverviewStat('Stories', walkableStories.length, palette) : null,
            totalDecks > 0 ? renderOverviewStat('Reviewed this week', pctWeek + '%', palette) : null,
            due.length > 0 ? renderOverviewStat('Due for review', due.length, palette, true) : null,
            due.length === 0 && dueSoon.length > 0 ? renderOverviewStat('Due soon', dueSoon.length, palette, false, '#d97706') : null
          ) : null,

          // 30-day token trend chart (Phase 2l) — only renders when there's data
          renderTrendsChart(),

          // 13-week mood timeline (Phase 2p.25) — affective trajectory
          // visualization complementing the trend chart\'s token flow
          renderMoodTimeline(),

          // 90-day activity heatmap (Phase 2p.8) — calendar-grid view
          // of cumulative engagement. Rendered below the trend chart so
          // students see daily-level granularity (heatmap) + flow shape
          // (trends) together.
          renderActivityHeatmap(),

          // Subject filter chips (Phase 2p.6) — appear when ≥1 deck has
          // any subject tagged. Click to filter; click selected to clear.
          Object.keys(subjectsPresent).length > 0 ? h('div', {
            role: 'region',
            'aria-label': 'Filter decks by subject',
            style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }
          },
            h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } },
              'Filter:'),
            SUBJECT_TAGS.filter(function(s) { return !!subjectsPresent[s.id]; }).map(function(s) {
              var active = activeFilter === s.id;
              return h('button', {
                key: 'sf-' + s.id,
                onClick: function() { setSubjectFilter(s.id); },
                'aria-pressed': active ? 'true' : 'false',
                style: {
                  background: active ? palette.accent : 'transparent',
                  color: active ? palette.onAccent : palette.text,
                  border: '1px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, s.emoji + ' ' + s.label + ' · ' + subjectsPresent[s.id]);
            }),
            activeFilter ? h('button', {
              onClick: function() { setSubjectFilter(activeFilter); }, // toggle clears
              'aria-label': 'Clear subject filter',
              style: {
                background: 'transparent',
                color: palette.textMute,
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
                marginLeft: '4px'
              }
            }, 'Clear') : null
          ) : null,

          // Mood filter chips (Phase 2p.24) — parallel to subject filter,
          // appears when ≥1 deck has any mood tagged. Lets clinicians
          // quickly view all "struggle"-tagged decks (or any other mood).
          Object.keys(moodsPresent).length > 0 ? h('div', {
            role: 'region',
            'aria-label': 'Filter decks by mood',
            style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }
          },
            h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } },
              'Mood:'),
            MOOD_OPTIONS.filter(function(m) { return !!moodsPresent[m.id]; }).map(function(m) {
              var active = activeMoodFilter === m.id;
              return h('button', {
                key: 'mf-' + m.id,
                onClick: function() { setMoodFilter(m.id); },
                'aria-pressed': active ? 'true' : 'false',
                style: {
                  background: active ? palette.accent : 'transparent',
                  color: active ? palette.onAccent : palette.text,
                  border: '1px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, m.emoji + ' ' + m.label + ' · ' + moodsPresent[m.id]);
            }),
            activeMoodFilter ? h('button', {
              onClick: function() { setMoodFilter(activeMoodFilter); },
              'aria-label': 'Clear mood filter',
              style: {
                background: 'transparent',
                color: palette.textMute,
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
                marginLeft: '4px'
              }
            }, 'Clear') : null
          ) : null,

          // Due section
          due.length > 0 ? h('div', { style: { marginBottom: '14px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' } },
              h('div', {
                style: {
                  fontSize: '11px',
                  color: palette.warn || palette.accent,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }
              }, '⚡ Due for review · ' + due.length),
              // Phase 2p.9 — sequential review-all queue
              due.length >= 2 ? h('button', {
                onClick: function() { startReviewQueue(); },
                'aria-label': 'Review all ' + due.length + ' due decks in sequence',
                title: 'Sequential quiz through every due deck. Stop any time.',
                style: {
                  background: palette.accent,
                  color: palette.onAccent,
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              }, '↻ Review all ' + due.length) : null
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              due.map(function(d) { return renderOverviewRow(d, palette, 'due'); })
            )
          ) : null,

          // Due-soon section — gentle 1-2-day-out warning
          dueSoon.length > 0 ? h('div', { style: { marginBottom: '14px' } },
            h('div', {
              style: {
                fontSize: '11px',
                color: '#d97706',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }
            }, '⏳ Due soon · ' + dueSoon.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              dueSoon.map(function(d) { return renderOverviewRow(d, palette, 'soon'); })
            )
          ) : null,

          // Fresh section
          fresh.length > 0 ? h('div', { style: { marginBottom: walkableStories.length > 0 || draftStories.length > 0 ? '16px' : 0 } },
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textMute,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }
            }, (due.length + dueSoon.length > 0) ? 'Recently reviewed · ' + fresh.length : 'Your decks · ' + fresh.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              fresh.map(function(d) { return renderOverviewRow(d, palette, 'fresh'); })
            )
          ) : null,

          // Stories section (Phase 2g) — inline within the memory overview
          // since stories ARE memory palace technique. Walkable first
          // (rotation surfaces stalest), drafts last.
          walkableStories.length > 0 ? h('div', { style: { marginBottom: draftStories.length > 0 ? '14px' : 0, paddingTop: fresh.length > 0 ? '14px' : 0, borderTop: fresh.length > 0 ? '1px solid ' + palette.border : 'none' } },
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textMute,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }
            }, '📜 Story walks · ' + walkableStories.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              walkableStories.map(function(s) { return renderStoryOverviewRow(s, palette); })
            )
          ) : null,

          draftStories.length > 0 ? h('div', { style: { paddingTop: (fresh.length > 0 || walkableStories.length > 0) ? '14px' : 0, borderTop: (fresh.length > 0 || walkableStories.length > 0) ? '1px solid ' + palette.border : 'none' } },
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textMute,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }
            }, '📜 Story drafts · ' + draftStories.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              draftStories.map(function(s) { return renderStoryOverviewRow(s, palette); })
            )
          ) : null
        )
      );
    }

    // Story overview row — mirror of renderOverviewRow but for stories.
    // Walkable: shows "↻ Walk" button. Draft: shows "Edit" button.
    function renderStoryOverviewRow(story, palette) {
      var validSteps = (story.steps || []).filter(function(st) {
        return st.decorationId && (st.narrative || '').trim().length > 0;
      });
      var walkable = validSteps.length >= 3 && (story.title || '').trim().length > 0;
      var stepCount = (story.steps || []).length;
      var firstStep = (story.steps && story.steps[0]) || null;
      var firstDec = firstStep ? state.decorations.filter(function(d) { return d.id === firstStep.decorationId; })[0] : null;
      var reviewedLabel;
      if (!story.lastReviewedAt) {
        reviewedLabel = walkable ? 'Never walked' : 'Draft · needs ≥3 steps';
      } else {
        var daysAgo = Math.floor((Date.now() - new Date(story.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo === 0) reviewedLabel = 'Walked today';
        else if (daysAgo === 1) reviewedLabel = 'Walked yesterday';
        else reviewedLabel = 'Walked ' + daysAgo + ' days ago';
      }
      return h('div', {
        key: 'sov-' + story.id,
        role: 'group',
        'aria-label': (story.title || 'untitled story') + ', ' + stepCount + ' steps, ' + reviewedLabel,
        style: {
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          padding: '10px 12px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '8px'
        }
      },
        // Mini thumbnail of first decoration (gives the story a face)
        firstDec && firstDec.imageBase64 ? h('img', {
          src: firstDec.imageBase64, alt: '', 'aria-hidden': 'true',
          style: { width: '48px', height: '48px', borderRadius: '6px', objectFit: 'contain', background: palette.bg, border: '1px solid ' + palette.border, flexShrink: 0 }
        }) : h('div', {
          'aria-hidden': 'true',
          style: { width: '48px', height: '48px', borderRadius: '6px', background: palette.bg, border: '1px dashed ' + palette.border, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.textMute, fontSize: '20px', flexShrink: 0 }
        }, '📜'),
        h('button', {
          onClick: function() {
            setStateMulti({ activeModal: 'story-builder', generateContext: { storyId: story.id } });
          },
          style: {
            flex: 1, background: 'transparent', border: 'none', padding: 0,
            color: palette.text, textAlign: 'left', cursor: 'pointer',
            fontFamily: 'inherit', minWidth: 0
          }
        },
          h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
            '📜 ' + (story.title || h('span', { style: { color: palette.textMute, fontStyle: 'italic' } }, '(untitled story)'))),
          h('div', { style: { fontSize: '11px', color: palette.textDim, marginBottom: '2px' } },
            stepCount + ' step' + (stepCount === 1 ? '' : 's')),
          h('div', { style: { fontSize: '10px', color: palette.textMute } }, reviewedLabel)
        ),
        walkable ? h('button', {
          onClick: function() {
            setStateMulti({ activeModal: 'story-walk', generateContext: { storyId: story.id } });
          },
          style: {
            background: palette.accent, color: palette.onAccent,
            border: 'none', borderRadius: '8px', padding: '7px 14px',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', flexShrink: 0
          }
        }, '↻ Walk') : h('button', {
          onClick: function() {
            setStateMulti({ activeModal: 'story-builder', generateContext: { storyId: story.id } });
          },
          style: {
            background: 'transparent', color: palette.textDim,
            border: '1px solid ' + palette.border, borderRadius: '8px',
            padding: '7px 14px', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
          }
        }, 'Edit')
      );
    }

    // Single overview row — decoration thumbnail + content summary +
    // Review button. Click anywhere on the row (except the button) opens
    // the memory modal at view-tab; click Review jumps to quiz mode.
    // tier: 'due' (warn-bordered) | 'soon' (orange-bordered) | 'fresh' (default border)
    function renderOverviewRow(decoration, palette, tier) {
      // Backward-compat: old callers may pass a boolean
      if (tier === true) tier = 'due';
      if (tier === false || tier == null) tier = 'fresh';
      var isDue = tier === 'due';
      var isSoon = tier === 'soon';
      var lc = decoration.linkedContent;
      var label = decoration.templateLabel || decoration.template || 'item';
      var typeIcon = lc.type === 'flashcards' ? '📚'
                   : lc.type === 'acronym'    ? '🔤'
                   : lc.type === 'image-link' ? '🔗'
                                                : '📝';
      var summary = '';
      if (lc.type === 'flashcards') {
        var cardCount = (lc.data && lc.data.cards) ? lc.data.cards.length : 0;
        summary = cardCount + ' card' + (cardCount === 1 ? '' : 's');
      } else if (lc.type === 'acronym') {
        summary = ((lc.data && lc.data.letters) || '').toUpperCase();
      } else if (lc.type === 'image-link') {
        var lTgtId = (lc.data && lc.data.targetDecorationId) || null;
        var lTgt = lTgtId ? state.decorations.filter(function(d) { return d.id === lTgtId; })[0] : null;
        summary = '→ ' + (lTgt ? (lTgt.templateLabel || lTgt.template || 'item') : '(removed item)');
      } else if (lc.type === 'notes') {
        var text = (lc.data && lc.data.text) || '';
        var clozeCount = extractClozeAnswers(text).length;
        if (clozeCount > 0) {
          summary = clozeCount + ' blank' + (clozeCount === 1 ? '' : 's') + ' to fill in';
        } else {
          summary = text.length + ' character' + (text.length === 1 ? '' : 's');
        }
      }
      // Notes are quizzable only when they contain {cloze} markers;
      // flashcards / acronyms / image-links always quizzable.
      var quizAvailable = lc.type !== 'notes' || hasClozeMarkers(lc);

      var reviewedLabel;
      if (!lc.lastReviewedAt) {
        reviewedLabel = 'Never reviewed';
      } else {
        var daysAgo = Math.floor((Date.now() - new Date(lc.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo === 0) reviewedLabel = 'Reviewed today';
        else if (daysAgo === 1) reviewedLabel = 'Reviewed yesterday';
        else reviewedLabel = 'Reviewed ' + daysAgo + ' days ago';
      }

      var borderColor = isDue
        ? (palette.warn || palette.accent)
        : (isSoon ? '#d97706' : palette.border);
      var leftBorder = (isDue || isSoon)
        ? ('3px solid ' + borderColor)
        : ('1px solid ' + palette.border);
      return h('div', {
        key: 'mr-' + decoration.id,
        role: 'group',
        'aria-label': label + ', ' + lc.type + ', ' + summary + ', ' + reviewedLabel
          + (isSoon ? ', due soon' : ''),
        style: {
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          padding: '10px 12px',
          background: palette.surface,
          border: '1px solid ' + borderColor,
          borderLeft: leftBorder,
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
              color: isDue
                ? (palette.warn || palette.accent)
                : (isSoon ? '#d97706' : palette.textMute),
              fontWeight: (isDue || isSoon) ? 700 : 400
            }
          },
            isSoon ? (reviewedLabel + ' · due soon') : reviewedLabel)
        ),
        // Review action button (only for quizzable types)
        quizAvailable ? h('button', {
          onClick: function() { openMemoryModal(decoration.id, true); },
          style: {
            background: isDue
              ? (palette.warn || palette.accent)
              : (isSoon ? '#d97706' : palette.accent),
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

    function renderOverviewStat(label, value, palette, highlight, overrideColor) {
      var accentColor = overrideColor || (highlight ? (palette.warn || palette.accent) : palette.accent);
      var borderColor = overrideColor || (highlight ? (palette.warn || palette.accent) : palette.border);
      var bgColor = (highlight || overrideColor) ? 'rgba(255,220,140,0.08)' : palette.surface;
      return h('div', {
        style: {
          flex: '1 1 100px',
          padding: '8px 12px',
          background: bgColor,
          border: '1px solid ' + borderColor,
          borderRadius: '8px',
          textAlign: 'center'
        }
      },
        h('div', {
          style: {
            fontSize: '20px',
            fontWeight: 800,
            color: accentColor,
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
      // Phase 2p.9 — queue info passed through when this modal is part
      // of a review-queue traversal. MemoryModalInner uses it to render
      // a "Next deck" button on the quiz result screen instead of "Done".
      var queueInfo = null;
      if (ctx.reviewQueue) {
        queueInfo = {
          current: ctx.reviewQueue.currentIdx + 1,
          total: ctx.reviewQueue.decks.length
        };
      }
      return h(MemoryModalInner, {
        decoration: decoration,
        allDecorations: state.decorations,
        palette: palette,
        autoStartQuiz: !!ctx.autoStartQuiz,
        queueInfo: queueInfo,
        // Voice input (Phase 2p.20) — let acronym + image-link quizzes
        // accept spoken answers via Web Speech API
        speechSupported: speechSupported,
        startVoice: startVoiceCapture,
        stopVoice: stopVoiceCapture,
        isRecording: isRecording,
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
        },
        onAdvanceQueue: ctx.reviewQueue ? function(scorePct) { advanceReviewQueue(scorePct); } : null,
        onSetMood: function(moodId) { setDecorationMood(decorationId, moodId); },
        onSetSubjects: function(subjectIds) { setDecorationSubjects(decorationId, subjectIds); },
        onToggleFavorite: function() { toggleDecorationFavorite(decorationId); },
        onMakeSimilar: function() { makeSimilarTo(decorationId); },
        onSaveVoiceNote: function(base64, durationMs) { setDecorationVoiceNote(decorationId, base64, durationMs); },
        onClearVoiceNote: function() { clearDecorationVoiceNote(decorationId); },
        onPrintCard: function() {
          // Phase 2p.17 — set printScope to the decoration, paint, fire
          // window.print(), then reset printScope after the dialog closes.
          setStateField('printScope', { type: 'card', decorationId: decorationId });
          setTimeout(function() {
            try { window.print(); } catch (e) { addToast('Print not available in this browser.'); }
            // Reset shortly after — the print dialog blocks until closed
            // (modern browsers); a tiny delay handles weird timing edge cases.
            setTimeout(function() { setStateField('printScope', null); }, 200);
          }, 60);
        },
        onExportCard: function() {
          // Phase 2p.33 — render decoration to a canvas + download as PNG.
          exportDecorationAsImage(decorationId);
        },
        onExportDeck: function() {
          // Phase 2p.35 — export the linkedContent as CSV (flashcards)
          // or plain text (other types).
          exportDeckAs(decorationId);
        }
      });
    }

    // ─────────────────────────────────────────────────
    // INSIGHTS MODAL — reflection summary (mood themes + topics).
    // Triggered from the journal modal's 📊 Insights button. Auto-fires
    // the analysis on first open (when summary is null and not loading).
    // Uses local stats as a fallback when callGemini isn't available
    // OR if the AI response isn't parseable.
    // ─────────────────────────────────────────────────
    function renderInsightsModal() {
      if (state.activeModal !== 'insights') return null;
      var ins = state.insightsState || {};
      // Auto-fire analysis on first open if there's no cached result.
      if (!ins.loading && !ins.summary && !ins.error) {
        // Defer one tick to avoid setState-during-render. setTimeout 0
        // is fine here — the modal already rendered with the loading
        // skeleton from the next render pass.
        setTimeout(function() { runInsightsAnalysis(); }, 0);
      }
      var s = ins.summary || {};
      var entries = state.journalEntries || [];
      var enoughText = !s.moodSummary || s.moodSummary === 'Not enough yet' ? false : true;
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Reflection insights',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', 'journal');
        },
        style: {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 180,
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
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            color: palette.text
          }
        },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '18px', fontWeight: 700 } },
              '📊 Reflection insights'),
            h('div', { style: { display: 'flex', gap: '6px' } },
              h('button', {
                onClick: function() { runInsightsAnalysis(); },
                'aria-label': 'Refresh insights',
                disabled: ins.loading,
                title: ins.loading ? 'Analyzing…' : 'Run a fresh analysis',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px', fontSize: '12px', opacity: ins.loading ? 0.6 : 1 })
              }, ins.loading ? '…' : '↻ Refresh'),
              h('button', {
                onClick: function() { setStateField('activeModal', 'journal'); },
                'aria-label': 'Back to journal',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
              }, '← Back')
            )
          ),
          // Loading state
          ins.loading ? h('p', { style: { color: palette.textDim, fontSize: '13px', fontStyle: 'italic', padding: '24px 8px', textAlign: 'center' } },
            'Reading your last ' + Math.min(entries.length, 14) + ' entries…') : null,
          // AI summary card (only when present)
          !ins.loading && s.moodSummary && enoughText ? h('div', {
            style: {
              background: palette.surface,
              border: '1px solid ' + palette.accent,
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '12px'
            }
          },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.accent, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' } }, 'Tone'),
            h('p', { style: { margin: '0 0 12px 0', color: palette.text, lineHeight: '1.6', fontSize: '14px' } }, s.moodSummary),
            (Array.isArray(s.themes) && s.themes.length > 0) ? h('div', null,
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.accent, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' } }, 'Themes'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' } },
                s.themes.map(function(t, i) {
                  return h('span', {
                    key: i,
                    style: {
                      padding: '3px 10px',
                      background: palette.bg,
                      border: '1px solid ' + palette.border,
                      borderRadius: '999px',
                      fontSize: '12px',
                      color: palette.textDim
                    }
                  }, t);
                })
              )
            ) : null,
            s.encouragement ? h('p', { style: { margin: '0', color: palette.textDim, lineHeight: '1.6', fontSize: '13px', fontStyle: 'italic' } }, s.encouragement) : null
          ) : null,
          // Not-enough message when AI says insufficient data
          !ins.loading && s.moodSummary === 'Not enough yet' ? h('p', {
            style: { color: palette.textDim, fontSize: '13px', padding: '12px 4px', lineHeight: '1.6' }
          }, 'Your entries so far are short or recent — keep journaling and a richer view will surface here.') : null,
          // AI error / fallback notice
          ins.error ? h('p', {
            style: { color: palette.warn || palette.textDim, fontSize: '12px', padding: '8px 12px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px', marginBottom: '12px', fontStyle: 'italic' }
          }, ins.error) : null,
          // Local stats card — always shown, even on AI failure
          !ins.loading && (s.entriesAnalyzed > 0) ? h('div', {
            style: {
              background: palette.surface,
              border: '1px solid ' + palette.border,
              borderRadius: '10px',
              padding: '14px 16px'
            }
          },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textDim, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' } }, 'Your stats'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
              h('div', null,
                h('div', { style: { fontSize: '24px', fontWeight: 800, color: palette.text } }, s.entriesAnalyzed),
                h('div', { style: { fontSize: '11px', color: palette.textDim } }, s.entriesAnalyzed === 1 ? 'entry analyzed' : 'entries analyzed')
              ),
              h('div', null,
                h('div', { style: { fontSize: '24px', fontWeight: 800, color: palette.text } }, s.wordCount),
                h('div', { style: { fontSize: '11px', color: palette.textDim } }, s.wordCount === 1 ? 'word written' : 'words written')
              )
            ),
            s.topPromptText && s.topPromptCount > 1 ? h('p', {
              style: { margin: '12px 0 0 0', fontSize: '12px', color: palette.textDim, lineHeight: '1.5' }
            },
              h('strong', null, 'Most-used prompt: '),
              '"', s.topPromptText, '" (',
              s.topPromptCount, ' time', s.topPromptCount === 1 ? '' : 's', ')'
            ) : null
          ) : null,
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid ' + palette.border, lineHeight: '1.5' }
          }, 'Insights are reflective, not diagnostic. Your entries stay private — analysis runs once and the result is held in this session only.')
        )
      );
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
        onPlace: function(template, slots, artStyleId, imageBase64, reflectionText, moodTag, subjectTags) {
          placeDecoration(template, slots, artStyleId, imageBase64, reflectionText, moodTag, subjectTags);
        },
        onChargeForUpload: function() { return chargeForCustomUpload(); },
        onPlaceCustomUpload: function(imageBase64, reflectionText, moodTag, subjectTags, isDrawing) {
          placeCustomUpload(imageBase64, reflectionText, moodTag, subjectTags, isDrawing);
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
        // Adaptive prompt (Phase 2p.17) — context-aware single prompt
        // based on student\'s recent activity. May be null when no
        // contextual hook applies; modal handles either case.
        adaptivePrompt: computeAdaptivePrompt(state),
        palette: palette,
        speechSupported: speechSupported,
        startVoice: startVoiceCapture,
        stopVoice: stopVoiceCapture,
        isRecording: isRecording,
        // Threaded so the ✨ Polish button can clean up voice-dictated
        // text. Falls back to a local capitalize-after-period heuristic
        // when callGemini isn't available.
        callGemini: callGemini,
        onSubmit: function(text, promptId, mood, promptTextOverride) {
          submitReflection(text, promptId, mood, promptTextOverride);
        },
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
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }
          },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '📓 Your journal · ' + entries.length),
            h('div', { style: { display: 'flex', gap: '6px' } },
              // 📊 Insights button — opens a Gemini-powered summary of
              // recent journal entries (mood themes, recurring topics,
              // word counts). Only renders when there's enough data to
              // be worth analyzing AND the host wired callGemini.
              entries.length >= 3 && typeof callGemini === 'function' ? h('button', {
                onClick: function() {
                  setStateMulti({ activeModal: 'insights', insightsState: { loading: false, summary: null, error: null, generatedAt: null } });
                },
                'aria-label': 'View reflection insights',
                title: 'Analyze recent entries for mood themes and recurring topics',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px', fontSize: '12px' })
              }, '📊 Insights') : null,
              h('button', {
                onClick: function() { setStateField('activeModal', null); },
                'aria-label': 'Close journal',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
              }, '✕')
            )
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
                },
                onQuizComplete: function(eid, pct) { recordReflectionQuiz(eid, pct); }
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
    // GOALS LIST MODAL (Phase 2n)
    // ─────────────────────────────────────────────────
    // Achievements modal (Phase 2p.5) — list every achievement with
    // unlock state. Unlocked first, then locked (silhouetted with desc
    // visible so students know what to aim for, but value-neutral —
    // these are markers, not requirements).
    function renderAchievementsModal() {
      if (state.activeModal !== 'achievements') return null;
      var unlocked = state.achievements || {};
      var unlockedItems = ACHIEVEMENT_CATALOG.filter(function(a) { return unlocked[a.id]; });
      var lockedItems   = ACHIEVEMENT_CATALOG.filter(function(a) { return !unlocked[a.id]; });
      // Unlocked sorted newest first
      unlockedItems.sort(function(a, b) {
        return (unlocked[b.id].unlockedAt || '').localeCompare(unlocked[a.id].unlockedAt || '');
      });
      function renderRow(ach, isUnlocked) {
        var stamp = isUnlocked && unlocked[ach.id]
          ? new Date(unlocked[ach.id].unlockedAt).toLocaleDateString()
          : null;
        return h('div', {
          key: 'ach-' + ach.id,
          role: 'group',
          'aria-label': ach.label + (isUnlocked ? ', unlocked ' + stamp : ', not yet unlocked')
            + ', ' + ach.desc,
          style: {
            display: 'flex', gap: '12px', alignItems: 'center',
            padding: '10px 12px',
            background: isUnlocked ? palette.surface : palette.bg,
            border: '1px solid ' + (isUnlocked ? palette.accent : palette.border),
            borderRadius: '8px'
            // Phase 2p.7: removed `opacity: 0.55` on locked rows — the
            // emoji greyscale is enough visual signal, and the opacity
            // pushed text contrast below WCAG AA. Text colors below now
            // use full-strength textMute / text for AA compliance.
          }
        },
          h('div', {
            'aria-hidden': 'true',
            style: {
              fontSize: '24px', flexShrink: 0,
              filter: isUnlocked ? 'none' : 'grayscale(0.85)',
              opacity: isUnlocked ? 1 : 0.6
            }
          }, ach.emoji),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', {
              style: {
                fontSize: '13px', fontWeight: 700,
                // Locked state uses text (full strength) not textMute —
                // textMute on bg is ~3:1 in some themes which fails AA.
                color: palette.text,
                marginBottom: '2px'
              }
            }, ach.label),
            h('div', {
              style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.45' }
            }, ach.desc)
          ),
          stamp ? h('div', {
            style: { fontSize: '10px', color: palette.textDim, fontStyle: 'italic', flexShrink: 0 }
          }, stamp) : null
        );
      }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Achievements',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '600px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '🏆 Achievements · ' + unlockedItems.length + '/' + ACHIEVEMENT_CATALOG.length),
            h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
              // Tenure recap entry (Phase 2p.29) — lives next to Close
              // so the modal stays the celebration surface.
              h('button', {
                onClick: function() { setStateField('activeModal', 'tenure-recap'); },
                'aria-label': 'See your AlloHaven journey recap',
                title: 'Your AlloHaven journey',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 12px', fontSize: '12px', borderColor: palette.accent, color: palette.accent })
              }, '🌱 Journey'),
              h('button', {
                onClick: function() { setStateField('activeModal', null); },
                'aria-label': 'Close achievements',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
              }, '✕')
            )
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5', fontStyle: 'italic' }
          }, 'Gentle markers, not requirements. They unlock as you do the things you were already doing — no streaks, no comparisons.'),

          unlockedItems.length > 0 ? h('div', { style: { marginBottom: '14px' } },
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
              '✓ Unlocked · ' + unlockedItems.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              unlockedItems.map(function(a) { return renderRow(a, true); })
            )
          ) : null,
          lockedItems.length > 0 ? h('div', { style: { paddingTop: unlockedItems.length > 0 ? '14px' : 0, borderTop: unlockedItems.length > 0 ? '1px solid ' + palette.border : 'none' } },
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
              '○ Still ahead · ' + lockedItems.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              lockedItems.map(function(a) { return renderRow(a, false); })
            )
          ) : null
        )
      );
    }

    // ─────────────────────────────────────────────────
    // TENURE RECAP MODAL (Phase 2p.29) — "Your AlloHaven journey"
    // Aggregates everything across the student's entire engagement
    // window into one celebratory retrospective. Heavy reuse of
    // computeTenureStats; renders nothing for genuinely-empty saves.
    // ─────────────────────────────────────────────────
    function renderTenureRecapModal() {
      if (state.activeModal !== 'tenure-recap') return null;
      var stats = computeTenureStats(state);
      if (!stats) {
        // Auto-close if there's truly nothing to show. A guard rather
        // than a dialog so the student doesn't see an empty modal.
        setTimeout(function() { setStateField('activeModal', null); }, 0);
        return null;
      }
      var startDate = new Date(stats.earliestMs);
      var startDateStr = startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

      // Companion species + recap line
      var c = stats.companion;
      var sp = (c && c.species) ? getCompanionSpecies(c.species) : null;
      var swatch = (c && c.species) ? getCompanionPalette(c.species, c.colorVariant || 'warm') : null;

      // Companion's recap message — entirely template-driven (no AI
      // call to keep this snappy). Uses top mood + skill peak + visit
      // streak to flavor the line.
      var topMood = stats.topMoods[0];
      var topSkill = null;
      stats.skills.forEach(function(sk) { if (!topSkill || sk.level > topSkill.level) topSkill = sk; });
      var recapByspecies = {
        cat:    'Hmm. ' + stats.daysSince + ' days. ' + stats.decorationCount + ' decorations. I\'ve been watching. You showed up.',
        fox:    'What a journey. ' + stats.daysSince + ' days, ' + stats.decorationCount + ' decorations, and a whole room that\'s yours. Onward.',
        owl:    'Considering... ' + stats.daysSince + ' days, ' + stats.unlockedAchievements + ' achievements. Thoughtful work, steadily done.',
        turtle: 'Step by step — ' + stats.daysSince + ' days, ' + stats.decorationCount + ' decorations, no rushing. This is the way.',
        dragon: 'Whoa! ' + stats.daysSince + ' days! ' + stats.tokensEarned + ' tokens earned! ' + stats.decorationCount + ' decorations placed! Epic!'
      };
      var recapLine = (c && c.species && recapByspecies[c.species]) || ('A journey of ' + stats.daysSince + ' days. Real progress.');

      var statBox = function(label, value, sub) {
        return h('div', {
          style: {
            background: palette.surface, border: '1px solid ' + palette.border,
            borderRadius: '10px', padding: '12px',
            textAlign: 'center', minWidth: 0
          }
        },
          h('div', {
            style: {
              fontSize: '22px', fontWeight: 800, color: palette.accent,
              fontVariantNumeric: 'tabular-nums', lineHeight: '1.1', marginBottom: '2px'
            }
          }, value),
          h('div', { style: { fontSize: '11px', color: palette.textDim, fontWeight: 600 } }, label),
          sub ? h('div', { style: { fontSize: '10px', color: palette.textMute, marginTop: '2px', fontStyle: 'italic' } }, sub) : null
        );
      };

      // Mood / subject mini-bar (top 3 each)
      var renderMiniBars = function(items, totalKey) {
        if (items.length === 0) return h('div', { style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic' } }, 'Not enough yet — just keep tagging.');
        var maxC = items[0].count || 1;
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          items.slice(0, 3).map(function(item, i) {
            var label = (item.option && (item.option.emoji + ' ' + item.option.label))
                      || (item.tag && (item.tag.emoji + ' ' + item.tag.label))
                      || item.id;
            return h('div', { key: totalKey + '-' + item.id, style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              h('div', { style: { fontSize: '12px', color: palette.text, minWidth: '120px' } }, label),
              h('div', {
                'aria-hidden': 'true',
                style: { flex: 1, height: '8px', background: palette.surface, borderRadius: '4px', overflow: 'hidden', border: '1px solid ' + palette.border }
              },
                h('div', {
                  style: {
                    width: Math.round((item.count / maxC) * 100) + '%',
                    height: '100%', background: palette.accent
                  }
                })
              ),
              h('div', { style: { fontSize: '11px', color: palette.textMute, fontVariantNumeric: 'tabular-nums', minWidth: '24px', textAlign: 'right' } }, item.count)
            );
          })
        );
      };

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Tenure recap — your AlloHaven journey',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', 'achievements');
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', zIndex: 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '2px solid ' + palette.accent,
            borderRadius: '16px', padding: '28px',
            maxWidth: '640px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 30px 70px rgba(0,0,0,0.5)'
          }
        },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '22px', fontWeight: 800 } },
              '🌱 Your AlloHaven journey'),
            h('button', {
              onClick: function() { setStateField('activeModal', 'achievements'); },
              'aria-label': 'Close recap',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', { style: { fontSize: '12px', color: palette.textDim, margin: '0 0 18px 0', fontStyle: 'italic' } },
            'Since ' + startDateStr + ' · ' + stats.daysSince + ' days'),

          // Companion + recap line
          (c && sp) ? h('div', {
            style: {
              display: 'flex', gap: '14px', alignItems: 'center',
              padding: '12px 14px', marginBottom: '18px',
              background: palette.surface, border: '1px solid ' + palette.accent,
              borderRadius: '12px'
            }
          },
            h('div', {
              'data-species': c.species,
              style: { width: '64px', height: '64px', flexShrink: 0, padding: '4px', background: palette.bg, border: '1px solid ' + palette.border, borderRadius: '12px' }
            },
              h('div', { className: 'ah-companion-root' },
                getCompanionSvg(c.species, swatch, { blinking: blinking, pupilOffset: { x: 0, y: 0 } })
              )
            ),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '4px' } }, (c.name || sp.label) + ' · ' + sp.label),
              h('div', { style: { fontSize: '12px', color: palette.textDim, lineHeight: '1.5', fontStyle: 'italic' } }, '"' + recapLine + '"')
            )
          ) : null,

          // Stats grid (4-up)
          h('div', {
            style: {
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px', marginBottom: '20px'
            }
          },
            statBox('Tokens earned', stats.tokensEarned, '🪙'),
            statBox('Decorations', stats.decorationCount, stats.customCount > 0 ? stats.customCount + ' your own' : null),
            statBox('Reflections', stats.journalCount, stats.totalWords > 0 ? stats.totalWords + ' words' : null),
            statBox('Achievements', stats.unlockedAchievements + '/' + stats.totalAchievements, '🏆')
          ),

          // Skills row
          h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
            'Skill levels'),
          h('div', {
            style: {
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px', marginBottom: '20px'
            }
          },
            stats.skills.map(function(sk) {
              return h('div', {
                key: 'sk-' + sk.def.id,
                style: {
                  background: palette.surface, border: '1px solid ' + palette.border,
                  borderRadius: '8px', padding: '10px', textAlign: 'center'
                }
              },
                h('div', { style: { fontSize: '20px', marginBottom: '2px' } }, sk.def.emoji),
                h('div', { style: { fontSize: '11px', color: palette.textDim, fontWeight: 600 } }, sk.def.label),
                h('div', { style: { fontSize: '16px', fontWeight: 800, color: palette.accent, fontVariantNumeric: 'tabular-nums' } },
                  'Lv ' + sk.level + (sk.atMax ? ' ★' : ''))
              );
            })
          ),

          // Top moods + subjects (side by side on wide screens)
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' } },
            h('div', null,
              h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
                'Top moods'),
              renderMiniBars(stats.topMoods, 'mood')
            ),
            h('div', null,
              h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
                'Top subjects'),
              renderMiniBars(stats.topSubjects, 'subj')
            )
          ),

          // Streak + extras row
          h('div', {
            style: {
              display: 'flex', flexWrap: 'wrap', gap: '10px',
              fontSize: '12px', color: palette.textDim,
              padding: '12px 14px', background: palette.surface,
              border: '1px solid ' + palette.border, borderRadius: '10px',
              marginBottom: '20px'
            }
          },
            h('div', { style: { flex: '1 1 140px' } },
              h('span', { style: { color: palette.text, fontWeight: 700 } }, stats.streakLongest + ' day'),
              ' longest streak'
            ),
            h('div', { style: { flex: '1 1 140px' } },
              h('span', { style: { color: palette.text, fontWeight: 700 } }, stats.visitDays),
              ' days visited'
            ),
            stats.storyCount > 0 ? h('div', { style: { flex: '1 1 140px' } },
              h('span', { style: { color: palette.text, fontWeight: 700 } }, stats.storyCount),
              ' ' + (stats.storyCount === 1 ? 'story' : 'stories') + ' (' + stats.storiesWalked + ' walks)'
            ) : null,
            stats.goalsTotal > 0 ? h('div', { style: { flex: '1 1 140px' } },
              h('span', { style: { color: palette.text, fontWeight: 700 } }, stats.goalsDone + '/' + stats.goalsTotal),
              ' goals reached'
            ) : null,
            stats.favoriteCount > 0 ? h('div', { style: { flex: '1 1 140px' } },
              h('span', { style: { color: palette.text, fontWeight: 700 } }, stats.favoriteCount),
              ' favorites ⭐'
            ) : null
          ),

          // Action row
          h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() {
                setStateField('printScope', { type: 'tenure' });
                setTimeout(function() {
                  try { window.print(); } catch (e) { addToast('Print not available in this browser.'); }
                  setTimeout(function() { setStateField('printScope', null); }, 1000);
                }, 50);
              },
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '8px 16px', fontSize: '13px' })
            }, '🖨 Print recap'),
            h('button', {
              onClick: function() { setStateField('activeModal', 'achievements'); },
              style: Object.assign({}, primaryBtnStyle(palette), { padding: '8px 18px', fontSize: '13px' })
            }, 'Done')
          )
        )
      );
    }

    function renderGoalsListModal() {
      if (state.activeModal !== 'goals') return null;
      var goals = (state.goals || []).slice();
      // Active first (incomplete + within window), then completed, then expired
      var nowMs = Date.now();
      function classify(g) {
        if (g.completedAt) return 'done';
        var endMs = g.endDate ? new Date(g.endDate).getTime() : Infinity;
        if (endMs < nowMs) return 'expired';
        return 'active';
      }
      var active = goals.filter(function(g) { return classify(g) === 'active'; });
      var done = goals.filter(function(g) { return classify(g) === 'done'; });
      var expired = goals.filter(function(g) { return classify(g) === 'expired'; });
      // Sort active by end-soonest
      active.sort(function(a, b) {
        return (new Date(a.endDate).getTime()) - (new Date(b.endDate).getTime());
      });
      done.sort(function(a, b) {
        return (b.completedAt || '').localeCompare(a.completedAt || '');
      });
      expired.sort(function(a, b) {
        return (new Date(b.endDate).getTime()) - (new Date(a.endDate).getTime());
      });

      function renderGoalRow(g, status) {
        var prog = computeGoalProgress(g, state);
        var metric = getGoalMetric(g.metric);
        var endDate = g.endDate ? new Date(g.endDate) : null;
        var dateLabel;
        if (status === 'done') {
          dateLabel = 'Completed ' + new Date(g.completedAt).toLocaleDateString();
        } else if (status === 'expired') {
          dateLabel = 'Ended ' + (endDate ? endDate.toLocaleDateString() : '?');
        } else {
          var daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - nowMs) / (24 * 60 * 60 * 1000))) : 0;
          dateLabel = daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : daysLeft + ' days left';
        }
        var barColor = status === 'done' ? (palette.success || palette.accent)
                     : status === 'expired' ? (palette.warn || palette.accent)
                     : palette.accent;
        return h('div', {
          key: 'gr-' + g.id,
          role: 'group',
          'aria-label': g.title + ', ' + prog.current + ' of ' + prog.target + ', ' + dateLabel,
          style: {
            padding: '12px 14px', background: palette.surface,
            border: '1px solid ' + palette.border,
            borderLeft: '3px solid ' + barColor,
            borderRadius: '8px'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '6px' } },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
                (status === 'done' ? '✓ ' : '🎯 ') + g.title),
              h('div', { style: { fontSize: '11px', color: palette.textDim } },
                (metric ? metric.emoji + ' ' + metric.label : g.metric) + ' · ' + dateLabel)
            ),
            h('span', {
              style: { fontSize: '13px', fontWeight: 800, color: barColor, fontVariantNumeric: 'tabular-nums' }
            }, prog.current + '/' + prog.target)
          ),
          // Progress bar
          h('div', {
            'aria-hidden': 'true',
            style: { height: '6px', background: palette.bg, borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }
          },
            h('div', {
              style: {
                width: prog.pct + '%', height: '100%',
                background: barColor, transition: 'width 300ms ease',
                borderRadius: '3px'
              }
            })
          ),
          g.notes ? h('div', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic', marginBottom: '6px' } },
            '"' + g.notes + '"') : null,
          h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end' } },
            status === 'active' && !prog.isDone ? h('button', {
              onClick: function() { markGoalCompleted(g.id); },
              'aria-label': 'Mark this goal complete manually',
              title: 'Mark complete (in case progress tracked outside the app)',
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Mark done') : null,
            h('button', {
              onClick: function() {
                setStateMulti({ activeModal: 'goal-builder', generateContext: { goalId: g.id } });
              },
              'aria-label': 'Edit goal: ' + g.title,
              style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Edit')
          )
        );
      }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Goals',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '600px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '🎯 Goals · ' + goals.length),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close goals list',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5', fontStyle: 'italic' }
          }, 'Time-boxed targets you can review with a parent, teacher, or clinician. Pomodoros, reflections, quizzes, walks, decorations, or tokens — pick one. Completing a goal earns +3 bonus tokens.'),

          // Template strip (Phase 2p.36) — pre-built ready-to-launch goals
          // for low-friction starting. Click → goal pre-filled + builder
          // opens for any final tweaks.
          h('div', { style: { marginBottom: '14px' } },
            h('div', {
              style: {
                fontSize: '11px', color: palette.textMute,
                fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: '8px'
              }
            }, '⚡ Quick start'),
            h('div', {
              role: 'list',
              'aria-label': 'Goal templates',
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '8px'
              }
            },
              GOAL_TEMPLATES.map(function(t) {
                return h('button', {
                  key: 'gt-' + t.id,
                  role: 'listitem',
                  onClick: function() { createGoalFromTemplate(t); },
                  'aria-label': t.title + ' — ' + t.hint,
                  title: t.hint,
                  style: {
                    background: palette.surface,
                    border: '1px solid ' + palette.border,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    color: palette.text,
                    transition: 'border-color 140ms ease, background 140ms ease'
                  }
                },
                  h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '2px' } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: '18px' } }, t.emoji),
                    h('span', { style: { fontSize: '13px', fontWeight: 700 } }, t.title)
                  ),
                  h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.4' } }, t.hint)
                );
              })
            )
          ),

          h('button', {
            onClick: createGoal,
            style: Object.assign({}, primaryBtnStyle(palette), { width: '100%', marginBottom: '14px', padding: '10px' })
          }, '+ New goal (from scratch)'),

          goals.length === 0 ? h('div', {
            style: {
              padding: '32px 20px', background: palette.surface,
              border: '1px dashed ' + palette.border, borderRadius: '10px', textAlign: 'center'
            }
          },
            h('div', { style: { fontSize: '40px', marginBottom: '10px' } }, '🎯'),
            h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55', margin: 0 } },
              'No goals yet. Goals turn AlloHaven into an IEP-friendly progress-monitoring tool — pick a measurable target with a deadline.')
          ) : null,

          active.length > 0 ? h('div', { style: { marginBottom: '14px' } },
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
              '⚡ Active · ' + active.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              active.map(function(g) { return renderGoalRow(g, 'active'); })
            )
          ) : null,
          done.length > 0 ? h('div', { style: { marginBottom: '14px', paddingTop: active.length > 0 ? '14px' : 0, borderTop: active.length > 0 ? '1px solid ' + palette.border : 'none' } },
            h('div', { style: { fontSize: '11px', color: palette.success || palette.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
              '✓ Completed · ' + done.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              done.map(function(g) { return renderGoalRow(g, 'done'); })
            )
          ) : null,
          expired.length > 0 ? h('div', { style: { paddingTop: (active.length > 0 || done.length > 0) ? '14px' : 0, borderTop: (active.length > 0 || done.length > 0) ? '1px solid ' + palette.border : 'none' } },
            h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } },
              '⏳ Expired · ' + expired.length),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              expired.map(function(g) { return renderGoalRow(g, 'expired'); })
            )
          ) : null
        )
      );
    }

    function renderSearchModal() {
      if (state.activeModal !== 'search') return null;
      return h(SearchModalInner, {
        palette: palette,
        decorations: state.decorations,
        stories: state.stories,
        journalEntries: state.journalEntries,
        onClose: function() { setStateField('activeModal', null); },
        onClickDecoration: function(id) {
          openMemoryModal(id, false);
        },
        onClickStory: function(id) {
          var story = (state.stories || []).filter(function(s) { return s.id === id; })[0];
          var validSteps = story && (story.steps || []).filter(function(stp) {
            return stp.decorationId && (stp.narrative || '').trim().length > 0;
          });
          var walkable = validSteps && validSteps.length >= 3 && (story.title || '').trim().length > 0;
          setStateMulti({
            activeModal: walkable ? 'story-walk' : 'story-builder',
            generateContext: { storyId: id }
          });
        },
        onClickJournal: function() {
          // Journal entries don\'t have individual modal route; open journal list
          setStateMulti({ activeModal: 'journal', generateContext: null });
        }
      });
    }

    function renderTourModal() {
      if (state.activeModal !== 'tour') return null;
      return h(TourModalInner, {
        palette: palette,
        onFinish: function() {
          setStateMulti({ tourSeen: true, activeModal: null });
        }
      });
    }

    function renderCompanionSetupModal() {
      if (state.activeModal !== 'companion-setup') return null;
      // Phase 2p.22/2p.23 — gate accessory picker behind unlock state
      var unlockedAccessories = ACCESSORY_DEFS
        .filter(function(def) { return isAccessoryUnlocked(state, def.id); })
        .map(function(def) { return def.id; });
      var bowUnlocked = unlockedAccessories.indexOf('bow') !== -1; // legacy
      return h(CompanionSetupInner, {
        existing: state.companion,
        palette: palette,
        bowUnlocked: bowUnlocked,
        unlockedAccessories: unlockedAccessories,
        // Show locked teasers when companion has at least 1 unlocked
        // (so students can see what\'s next without overwhelming new
        // companions who haven\'t earned anything yet)
        showLockedTeasers: unlockedAccessories.length > 0,
        onSave: function(updates) {
          // Preserve skillCelebrations + createdAt from existing if present
          var prev = state.companion || {};
          saveCompanion(Object.assign({
            skillCelebrations: prev.skillCelebrations,
            // Reset celebration baselines on first creation so existing
            // earnings don\'t fire confetti on companion creation
            // (companion exists FROM creation forward, not retroactively)
          }, updates));
          // Initialize celebration baselines if first creation
          if (!prev.species) {
            var baseline = {};
            SKILL_DEFS.forEach(function(def) {
              var count = countSkillEvents(state, def.id);
              var prog = computeSkillLevel(count);
              baseline[def.id] = prog.level;
            });
            // Schedule the baseline write after the create write settles
            setTimeout(function() {
              setState(function(prev2) {
                if (!prev2.companion) return prev2;
                return Object.assign({}, prev2, {
                  companion: Object.assign({}, prev2.companion, { skillCelebrations: baseline })
                });
              });
            }, 50);
          }
          setStateField('activeModal', null);
          setTimeout(function() { addToast('🌿 ' + (updates.name || 'your buddy') + ' joined your room.'); }, 50);
        },
        onCancel: function() { setStateField('activeModal', null); },
        onDelete: function() {
          setStateMulti({ companion: null, activeModal: null });
          addToast('Companion removed.');
        }
      });
    }

    function renderGoalBuilderModal() {
      if (state.activeModal !== 'goal-builder') return null;
      var ctx = state.generateContext || {};
      var goal = (state.goals || []).filter(function(g) { return g.id === ctx.goalId; })[0];
      if (!goal) {
        setTimeout(function() { setStateMulti({ activeModal: null, generateContext: null }); }, 0);
        return null;
      }
      return h(GoalBuilderInner, {
        goal: goal,
        palette: palette,
        onSave: function(updates) {
          updateGoal(goal.id, updates);
          setStateMulti({ activeModal: 'goals', generateContext: null });
        },
        onCancel: function() {
          setStateMulti({ activeModal: 'goals', generateContext: null });
        },
        onDelete: function() {
          deleteGoal(goal.id);
          setStateMulti({ activeModal: 'goals', generateContext: null });
        }
      });
    }

    // ─────────────────────────────────────────────────
    // STORIES LIST MODAL (Phase 2e) — index of all stories with
    // walk / edit / delete affordances per story.
    // ─────────────────────────────────────────────────
    function renderStoriesListModal() {
      if (state.activeModal !== 'stories') return null;
      var stories = state.stories || [];
      var sortedStories = stories.slice().sort(function(a, b) {
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      });

      function isWalkable(s) {
        var validSteps = (s.steps || []).filter(function(st) {
          return st.decorationId && (st.narrative || '').trim().length > 0;
        });
        return validSteps.length >= 3 && (s.title || '').trim().length > 0;
      }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Stories',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '600px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '📜 Stories · ' + stories.length),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close stories list',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          h('p', {
            style: { fontSize: '12px', color: palette.textDim, marginBottom: '14px', lineHeight: '1.5', fontStyle: 'italic' }
          }, 'The story method is the most powerful classical mnemonic — chain ≥3 decorations into a narrative sequence, then walk through it. Each step is a hook for what came before.'),
          h('button', {
            onClick: createStory,
            style: Object.assign({}, primaryBtnStyle(palette), { width: '100%', marginBottom: '14px', padding: '10px' })
          }, '+ New story'),

          // Empty state
          stories.length === 0 ? h('div', {
            style: {
              padding: '32px 20px', background: palette.surface,
              border: '1px dashed ' + palette.border, borderRadius: '10px', textAlign: 'center'
            }
          },
            h('div', { style: { fontSize: '40px', marginBottom: '10px' } }, '📜'),
            h('p', { style: { color: palette.textDim, fontSize: '13px', lineHeight: '1.55', margin: 0 } },
              'No stories yet. Click "+ New story" above to chain decorations into a narrative — the story method earns +1 token on first save and +1 per walk.')
          ) : null,

          // Stories list
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
            sortedStories.map(function(s) {
              var walkable = isWalkable(s);
              var stepCount = (s.steps || []).length;
              var validSteps = (s.steps || []).filter(function(st) {
                return st.decorationId && (st.narrative || '').trim().length > 0;
              }).length;
              var lastReviewedLabel;
              if (!s.lastReviewedAt) {
                lastReviewedLabel = walkable ? 'Never walked' : 'Draft';
              } else {
                var days = Math.floor((Date.now() - new Date(s.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000));
                if (days === 0) lastReviewedLabel = 'Walked today';
                else if (days === 1) lastReviewedLabel = 'Walked yesterday';
                else lastReviewedLabel = 'Walked ' + days + ' days ago';
              }
              return h('div', {
                key: 'story-row-' + s.id,
                style: {
                  display: 'flex', gap: '10px', alignItems: 'center',
                  padding: '12px', background: palette.surface,
                  border: '1px solid ' + palette.border, borderRadius: '8px'
                }
              },
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: '14px', fontWeight: 700, color: palette.text, marginBottom: '4px' } },
                    s.title || h('span', { style: { color: palette.textMute, fontStyle: 'italic' } }, '(untitled story)')),
                  h('div', { style: { fontSize: '11px', color: palette.textDim } },
                    stepCount + ' step' + (stepCount === 1 ? '' : 's')
                    + (validSteps !== stepCount ? ' · ' + validSteps + ' complete' : '')
                    + ' · ' + lastReviewedLabel)
                ),
                walkable ? h('button', {
                  onClick: function() {
                    setStateMulti({ activeModal: 'story-walk', generateContext: { storyId: s.id } });
                  },
                  'aria-label': 'Walk story: ' + (s.title || 'untitled'),
                  style: { background: palette.accent, color: palette.onAccent, border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
                }, '↻ Walk') : h('span', {
                  style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', flexShrink: 0 }
                }, 'needs ≥3 steps'),
                h('button', {
                  onClick: function() {
                    setStateMulti({ activeModal: 'story-builder', generateContext: { storyId: s.id } });
                  },
                  'aria-label': 'Edit story: ' + (s.title || 'untitled'),
                  style: { background: 'transparent', color: palette.textDim, border: '1px solid ' + palette.border, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
                }, 'Edit')
              );
            })
          )
        )
      );
    }

    function renderStoryBuilderModal() {
      if (state.activeModal !== 'story-builder') return null;
      var ctx = state.generateContext || {};
      var story = (state.stories || []).filter(function(s) { return s.id === ctx.storyId; })[0];
      if (!story) {
        setTimeout(function() { setStateMulti({ activeModal: null, generateContext: null }); }, 0);
        return null;
      }
      return h(StoryBuilderInner, {
        story: story,
        allDecorations: state.decorations,
        palette: palette,
        onSave: function(updates) {
          updateStory(story.id, updates);
          setStateMulti({ activeModal: 'stories', generateContext: null });
        },
        onCancel: function() {
          setStateMulti({ activeModal: 'stories', generateContext: null });
        },
        onDelete: function() {
          deleteStory(story.id);
          setStateMulti({ activeModal: 'stories', generateContext: null });
        }
      });
    }

    function renderStoryWalkModal() {
      if (state.activeModal !== 'story-walk') return null;
      var ctx = state.generateContext || {};
      var story = (state.stories || []).filter(function(s) { return s.id === ctx.storyId; })[0];
      if (!story) {
        setTimeout(function() { setStateMulti({ activeModal: null, generateContext: null }); }, 0);
        return null;
      }
      return h(StoryWalkInner, {
        story: story,
        allDecorations: state.decorations,
        palette: palette,
        onClose: function() {
          setStateMulti({ activeModal: 'stories', generateContext: null });
        },
        onFinish: function() {
          recordStoryWalk(story.id);
          setStateMulti({ activeModal: 'stories', generateContext: null });
        }
      });
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

          // ── Ambient soundscape picker (Phase 2g) ──
          // Procedural Web Audio noise that plays only during focus phases.
          // Off by default; persisted in state and torn down on phase change.
          h('div', {
            style: { fontSize: '13px', color: palette.textDim, marginTop: '18px', marginBottom: '6px', fontWeight: 600 }
          }, 'Ambient soundscape'),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }
          }, 'Optional background noise during focus phases. Stops on breaks. Generated on-device — no streaming.'),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' } },
            [
              { id: 'off',       label: 'Off',        emoji: '🔕' },
              { id: 'rain',      label: 'Rain',       emoji: '🌧' },
              { id: 'fireplace', label: 'Fireplace',  emoji: '🔥' },
              { id: 'wind',      label: 'Wind',       emoji: '🌬' }
            ].map(function(opt) {
              var active = (state.soundscape || 'off') === opt.id;
              return h('button', {
                key: 'snd-' + opt.id,
                onClick: function() { setStateField('soundscape', opt.id); },
                'aria-pressed': active ? 'true' : 'false',
                style: {
                  flex: '1 1 calc(50% - 4px)',
                  background: active ? palette.surface : 'transparent',
                  border: '1.5px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '8px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  color: palette.text,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'flex-start'
                }
              },
                h('span', { 'aria-hidden': 'true', style: { fontSize: '16px' } }, opt.emoji),
                h('span', null, opt.label)
              );
            })
          ),

          // ── Ambient weather (Phase 2p.27) ──
          // CSS-only particle overlay on the room. Independent from the
          // sound layer above so students can mix freely.
          h('div', {
            style: { fontSize: '13px', color: palette.textDim, marginTop: '18px', marginBottom: '6px', fontWeight: 600 }
          }, 'Ambient weather'),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }
          }, 'A gentle visual layer over your room. Suppressed automatically if your device prefers reduced motion.'),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            [
              { id: 'clear',    label: 'Clear',    emoji: '🌤' },
              { id: 'rain',     label: 'Rain',     emoji: '🌧' },
              { id: 'snow',     label: 'Snow',     emoji: '❄️' },
              { id: 'sparkles', label: 'Sparkles', emoji: '✨' }
            ].map(function(opt) {
              var current = (state.atmosphere && state.atmosphere.weather) || 'clear';
              var active = current === opt.id;
              return h('button', {
                key: 'wx-' + opt.id,
                onClick: function() {
                  setStateField('atmosphere', { weather: opt.id });
                },
                'aria-pressed': active ? 'true' : 'false',
                style: {
                  flex: '1 1 calc(50% - 4px)',
                  background: active ? palette.surface : 'transparent',
                  border: '1.5px solid ' + (active ? palette.accent : palette.border),
                  borderRadius: '8px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  color: palette.text,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'flex-start'
                }
              },
                h('span', { 'aria-hidden': 'true', style: { fontSize: '16px' } }, opt.emoji),
                h('span', null, opt.label)
              );
            })
          ),

          // ── Arcade time-budget (Phase 3a) ──
          // Tokens convert to play time at this rate. Teacher- (or
          // self-) configurable so a class can scale arcade access.
          h('div', {
            style: { fontSize: '13px', color: palette.textDim, marginTop: '18px', marginBottom: '6px', fontWeight: 600 }
          }, 'Arcade time'),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }
          }, '1 🪙 token = N minutes of arcade play. Lower = faster spend, higher = longer sessions per token.'),
          (function() {
            var mpt = (state.arcade && state.arcade.minutesPerToken) || 5;
            return h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
              h('input', {
                type: 'range',
                min: 1, max: 30, step: 1,
                value: mpt,
                'aria-label': 'Minutes per token',
                onChange: function(e) {
                  var n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) setStateField('arcade', Object.assign({}, state.arcade, { minutesPerToken: n }));
                },
                style: { flex: 1, accentColor: palette.accent }
              }),
              h('span', {
                style: {
                  fontSize: '13px', color: palette.text, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', minWidth: '54px', textAlign: 'right'
                }
              }, mpt + ' min')
            );
          })(),

          // ── Backup / Restore (Phase 2g) ──
          // Export full state as a JSON file, or restore from a prior export.
          // Restore prompts for confirmation since it overwrites everything.
          h('div', {
            style: { fontSize: '13px', color: palette.textDim, marginTop: '18px', marginBottom: '6px', fontWeight: 600 }
          }, 'Backup & restore'),
          h('p', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }
          }, 'Download your data as JSON, or restore from a prior backup. Useful when switching browsers or devices.'),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() {
                try {
                  var raw = JSON.stringify(state, null, 2);
                  var blob = new Blob([raw], { type: 'application/json' });
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement('a');
                  var stamp = new Date().toISOString().slice(0, 10);
                  a.href = url;
                  a.download = 'allohaven-backup-' + stamp + '.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
                  addToast('💾 Backup downloaded.');
                } catch (err) {
                  addToast('Backup failed. Try again.');
                }
              },
              style: Object.assign({}, secondaryBtnStyle(palette), {
                flex: '1 1 calc(50% - 4px)',
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              })
            }, '⬇️ Download backup'),
            h('button', {
              onClick: function() {
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json,.json';
                input.onchange = function(ev) {
                  var file = ev.target && ev.target.files && ev.target.files[0];
                  if (!file) return;
                  var reader = new FileReader();
                  reader.onload = function(e) {
                    try {
                      var parsed = JSON.parse(e.target.result);
                      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.decorations)) {
                        addToast('Not a valid AlloHaven backup file.');
                        return;
                      }
                      var ok = window.confirm('Restore from this backup? This replaces ALL current data — decorations, journal, tokens, stories, settings. Cannot be undone.');
                      if (!ok) return;
                      var merged = Object.assign({}, DEFAULT_STATE, parsed);
                      setStateMulti(merged);
                      addToast('✅ Backup restored.');
                    } catch (err) {
                      addToast('Could not read that file. Is it a JSON backup?');
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              },
              style: Object.assign({}, secondaryBtnStyle(palette), {
                flex: '1 1 calc(50% - 4px)',
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              })
            }, '⬆️ Restore from file')
          ),

          h('div', {
            style: { fontSize: '11px', color: palette.textMute, marginTop: '14px', paddingTop: '12px', borderTop: '1px solid ' + palette.border, lineHeight: '1.5' }
          }, 'Today: ' + (state.dailyState.pomodorosCompleted || 0) + ' Pomodoros completed · soft cap at 4/day (above which sessions still run but earn 0 tokens).'),
          // Replay tour button (Phase 2p.6)
          h('div', {
            style: { marginTop: '14px', paddingTop: '12px', borderTop: '1px solid ' + palette.border, textAlign: 'center' }
          },
            h('button', {
              onClick: function() { setStateMulti({ activeModal: 'tour' }); },
              'aria-label': 'Replay the welcome tour',
              style: Object.assign({}, secondaryBtnStyle(palette), { fontSize: '11px', padding: '6px 14px' })
            }, '🎬 Replay tour')
          ),
          // Phase 2p.20 — Pomodoro completion chime toggle
          h('div', {
            style: { marginTop: '14px', paddingTop: '12px', borderTop: '1px solid ' + palette.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }
          },
            h('div', null,
              h('div', { style: { fontSize: '12px', fontWeight: 600, color: palette.text } }, '🔔 Sound on Pomodoro complete'),
              h('div', { style: { fontSize: '11px', color: palette.textMute, marginTop: '2px' } },
                'Gentle 3-tone bell when a focus session ends')
            ),
            h('button', {
              onClick: function() {
                var next = state.pomodoroChimeEnabled === false ? true : false;
                setStateField('pomodoroChimeEnabled', next);
                if (next) {
                  // Preview the chime so students hear what they\'re enabling
                  try { playPomodoroChime(); } catch (e) {}
                }
              },
              'aria-pressed': state.pomodoroChimeEnabled !== false ? 'true' : 'false',
              'aria-label': 'Toggle Pomodoro completion chime',
              style: {
                background: state.pomodoroChimeEnabled !== false ? palette.accent : palette.surface,
                color: state.pomodoroChimeEnabled !== false ? palette.onAccent : palette.textDim,
                border: '1px solid ' + (state.pomodoroChimeEnabled !== false ? palette.accent : palette.border),
                borderRadius: '999px',
                padding: '4px 14px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, state.pomodoroChimeEnabled !== false ? 'On' : 'Off')
          )
        )
      );
    }

    // ─────────────────────────────────────────────────
    // CLINICAL REVIEW MODAL (Phase 2k) — same packet content as the
    // print version but rendered on-screen with palette colors. For
    // session-time review with a parent, teacher, or clinician
    // without printing. "Print this view" button at bottom triggers
    // the print packet flow.
    // ─────────────────────────────────────────────────
    // Weekly summary modal (Phase 2p.9) — digestible 7-day snapshot
    // with companion\'s reflection on the week. Different use case from
    // the print packet (the comprehensive portfolio); weekly summary
    // is the moment-in-time snapshot a parent / clinician would
    // glance at on a Friday.
    function renderWeeklySummaryModal() {
      if (state.activeModal !== 'weekly-summary') return null;
      var nowMs = Date.now();
      var weekAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
      // Aggregate
      var earningsThisWeek = (state.earnings || []).filter(function(e) {
        return e.date && new Date(e.date).getTime() >= weekAgo;
      });
      var pomThisWeek = earningsThisWeek.filter(function(e) {
        return e.source === 'pomodoro' || e.source === 'cycle-bonus';
      }).length;
      var reflThisWeek = (state.journalEntries || []).filter(function(e) {
        return e.date && new Date(e.date).getTime() >= weekAgo;
      }).length;
      var quizThisWeek = earningsThisWeek.filter(function(e) {
        return e.source === 'memory-quiz' || e.source === 'reflection-cloze-quiz';
      }).length;
      var walksThisWeek = earningsThisWeek.filter(function(e) {
        return e.source === 'story-walk';
      }).length;
      var newDecsThisWeek = (state.decorations || []).filter(function(d) {
        return !d.isStarter && d.earnedAt && new Date(d.earnedAt).getTime() >= weekAgo;
      });
      var tokensThisWeek = earningsThisWeek.reduce(function(s, e) { return s + (e.tokens || 0); }, 0);

      // Days active this week
      var daysActive = {};
      earningsThisWeek.forEach(function(e) {
        if (!e.date) return;
        daysActive[e.date.slice(0, 10)] = true;
      });
      (state.journalEntries || []).forEach(function(j) {
        if (!j.date) return;
        var t = new Date(j.date).getTime();
        if (t >= weekAgo) daysActive[j.date.slice(0, 10)] = true;
      });
      var daysActiveCount = Object.keys(daysActive).length;

      // Top mood + subject from this week\'s decorations
      var moodCounts = {}, subjCounts = {};
      newDecsThisWeek.forEach(function(d) {
        if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
        (d.subjects || []).forEach(function(s) { subjCounts[s] = (subjCounts[s] || 0) + 1; });
      });
      function topKey(counts) {
        var top = null, topN = 0;
        Object.keys(counts).forEach(function(k) {
          if (counts[k] > topN) { topN = counts[k]; top = k; }
        });
        return top;
      }
      var topMood = topKey(moodCounts);
      var topSubj = topKey(subjCounts);

      // Achievements unlocked this week
      var ach = state.achievements || {};
      var weeklyAchievements = ACHIEVEMENT_CATALOG.filter(function(a) {
        if (!ach[a.id]) return false;
        return new Date(ach[a.id].unlockedAt).getTime() >= weekAgo;
      });

      // Companion reflection — woven from facts available
      var companion = state.companion;
      var sp = companion && companion.species ? getCompanionSpecies(companion.species) : null;
      var compName = (companion && companion.name) || (sp ? sp.label : 'Your buddy');
      var reflectionLines = [];
      if (daysActiveCount === 7) reflectionLines.push('You showed up every day this week — quietly proud.');
      else if (daysActiveCount >= 4) reflectionLines.push('You showed up ' + daysActiveCount + ' days this week.');
      else if (daysActiveCount >= 1) reflectionLines.push('You showed up ' + daysActiveCount + ' day' + (daysActiveCount === 1 ? '' : 's') + ' this week — that counts.');
      else reflectionLines.push('A quiet week. Tomorrow is a fresh start.');
      if (pomThisWeek > 0) reflectionLines.push('Focused ' + pomThisWeek + ' time' + (pomThisWeek === 1 ? '' : 's') + '.');
      if (quizThisWeek > 0) reflectionLines.push('Passed ' + quizThisWeek + ' memory quiz' + (quizThisWeek === 1 ? '' : 'zes') + '.');
      if (walksThisWeek > 0) reflectionLines.push('Walked ' + walksThisWeek + ' stor' + (walksThisWeek === 1 ? 'y' : 'ies') + '.');
      if (newDecsThisWeek.length > 0) reflectionLines.push('Added ' + newDecsThisWeek.length + ' new decoration' + (newDecsThisWeek.length === 1 ? '' : 's') + ' to the room.');
      if (topMood) {
        var mo = getMoodOption(topMood);
        if (mo) reflectionLines.push('Mood that showed up most: ' + mo.emoji + ' ' + mo.label + '.');
      }
      if (topSubj) {
        for (var si = 0; si < SUBJECT_TAGS.length; si++) {
          if (SUBJECT_TAGS[si].id === topSubj) {
            reflectionLines.push('Subject that came up most: ' + SUBJECT_TAGS[si].emoji + ' ' + SUBJECT_TAGS[si].label + '.');
            break;
          }
        }
      }
      if (weeklyAchievements.length > 0) {
        reflectionLines.push(weeklyAchievements.length + ' achievement' + (weeklyAchievements.length === 1 ? '' : 's') + ' unlocked: '
          + weeklyAchievements.map(function(a) { return a.label; }).join(', ') + '.');
      }
      var reflectionText = reflectionLines.join(' ');

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Weekly summary',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', null);
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '560px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } },
              '🗓️ Last 7 days'),
            h('button', {
              onClick: function() { setStateField('activeModal', null); },
              'aria-label': 'Close weekly summary',
              style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
            }, '✕')
          ),
          // Stats grid
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' } },
            [
              { label: 'Days active', value: daysActiveCount, max: 7 },
              { label: 'Tokens earned', value: tokensThisWeek },
              { label: 'Pomodoros', value: pomThisWeek },
              { label: 'Reflections', value: reflThisWeek },
              { label: 'Quizzes passed', value: quizThisWeek },
              { label: 'Story walks', value: walksThisWeek },
              { label: 'New decorations', value: newDecsThisWeek.length },
              { label: 'Achievements', value: weeklyAchievements.length }
            ].map(function(s, i) {
              return h('div', {
                key: 'ws-' + i,
                style: { padding: '10px 12px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px', textAlign: 'center' }
              },
                h('div', { style: { fontSize: '20px', fontWeight: 800, color: palette.accent, fontVariantNumeric: 'tabular-nums', lineHeight: '1.0' } },
                  s.value + (typeof s.max !== 'undefined' ? '/' + s.max : '')),
                h('div', { style: { fontSize: '10px', color: palette.textMute, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' } }, s.label)
              );
            })
          ),
          // Companion reflection
          companion && companion.species ? h('div', {
            role: 'region',
            'aria-label': 'Companion reflection on the week',
            style: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: palette.surface, border: '1.5px solid ' + palette.accent, borderRadius: '10px', marginBottom: '14px' }
          },
            h('div', { style: { width: '50px', height: '50px', flexShrink: 0 } },
              getCompanionSvg(companion.species, getCompanionPalette(companion.species, companion.colorVariant), { blinking: false })
            ),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } },
                compName + ' reflects:'),
              h('p', { style: { fontSize: '13px', color: palette.text, lineHeight: '1.55', margin: 0, fontStyle: 'italic' } },
                '"' + reflectionText + '"')
            )
          ) : null,
          // AI letter from the buddy (Phase 2p.18) — generated once per
          // ISO week and cached in state.companionLetters[weekKey].
          // Falls back to a template-built letter when AI is unavailable.
          companion && companion.species ? (function() {
            var weekKey = getWeekKey();
            var letter = (state.companionLetters || {})[weekKey];
            var loading = letterLoading;
            function handleGenerate(force) {
              setLetterLoading(true);
              generateCompanionLetter(force, function() {
                setLetterLoading(false);
              });
            }
            return h('div', {
              role: 'region',
              'aria-label': 'Letter from your buddy',
              style: { padding: '12px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '10px', marginBottom: '14px' }
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' } },
                h('span', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                  '✨ Letter from ' + compName),
                letter ? h('button', {
                  onClick: function() { handleGenerate(true); },
                  disabled: loading,
                  'aria-label': 'Regenerate the letter',
                  title: 'Refresh — generates a new letter for this week',
                  style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px', fontSize: '11px', opacity: loading ? 0.6 : 1 })
                }, loading ? '…' : '↻ Refresh') : null
              ),
              !letter ? h('div', null,
                h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '8px', lineHeight: '1.5' } },
                  compName + ' can write you a personalized letter about your week — short, warm, in their voice.'),
                h('button', {
                  onClick: function() { handleGenerate(false); },
                  disabled: loading,
                  style: Object.assign({}, primaryBtnStyle(palette), { padding: '6px 14px', fontSize: '12px' })
                }, loading ? 'Writing…' : '✨ Write a letter')
              ) : h('div', null,
                h('p', { style: { fontSize: '13px', color: palette.text, lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, "Times New Roman", serif' } }, letter.text),
                h('p', { style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', margin: '8px 0 0 0' } },
                  letter.source === 'ai' ? 'Composed with AI · ' : 'Template-built · ',
                  'cached for this week — refresh anytime')
              )
            );
          })() : null,
          // Quick "new goal" CTA when no active goals exist
          (function() {
            var activeCount = (state.goals || []).filter(function(g) {
              if (g.completedAt) return false;
              var endMs = g.endDate ? new Date(g.endDate).getTime() : Infinity;
              return endMs >= nowMs;
            }).length;
            if (activeCount > 0) return null;
            return h('div', {
              style: { padding: '10px 12px', background: palette.surface, border: '1px dashed ' + palette.border, borderRadius: '8px', textAlign: 'center' }
            },
              h('p', { style: { fontSize: '12px', color: palette.textDim, margin: '0 0 8px 0', lineHeight: '1.5' } },
                'Want to set a goal for next week?'),
              h('button', {
                onClick: function() {
                  setStateField('activeModal', null);
                  setTimeout(createGoal, 80);
                },
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '6px 14px', fontSize: '12px' })
              }, '🎯 Set a goal')
            );
          })()
        )
      );
    }

    // Review queue summary (Phase 2p.9) — fires after the last deck
    // in the queue completes. Shows per-deck score breakdown + total
    // cards correct / overall pct + companion congratulation bubble.
    function renderReviewQueueSummaryModal() {
      if (state.activeModal !== 'review-queue-summary') return null;
      var ctx = state.generateContext || {};
      var q = ctx.reviewQueue;
      if (!q || !q.results) {
        setTimeout(function() { setStateMulti({ activeModal: null, generateContext: null }); }, 0);
        return null;
      }
      var totalDecks = q.results.length;
      var avgPct = totalDecks > 0
        ? Math.round(q.results.reduce(function(s, r) { return s + (r.scorePct || 0); }, 0) / totalDecks)
        : 0;
      var passedDecks = q.results.filter(function(r) { return (r.scorePct || 0) >= 80; }).length;
      var emoji = avgPct >= 90 ? '🌟' : avgPct >= 80 ? '✨' : avgPct >= 50 ? '🌱' : '💪';
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Review queue summary',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateMulti({ activeModal: null, generateContext: null });
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 175,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '2px solid ' + palette.accent,
            borderRadius: '14px', padding: '28px',
            maxWidth: '500px', width: '100%', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            textAlign: 'center'
          }
        },
          h('div', { 'aria-hidden': 'true', style: { fontSize: '56px', marginBottom: '8px' } }, emoji),
          h('h3', { style: { margin: '0 0 14px 0', color: palette.text, fontSize: '20px', fontWeight: 700 } },
            'Review queue complete'),
          h('div', {
            style: { fontSize: '40px', fontWeight: 800, color: palette.accent, fontVariantNumeric: 'tabular-nums', lineHeight: '1.0' }
          }, avgPct + '%'),
          h('div', { style: { fontSize: '13px', color: palette.textDim, marginTop: '6px', marginBottom: '20px' } },
            'Average across ' + totalDecks + ' deck' + (totalDecks === 1 ? '' : 's') + ' · ' + passedDecks + ' passed'),
          // Per-deck breakdown
          h('div', { style: { textAlign: 'left', marginBottom: '20px', padding: '12px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px' } },
            q.results.map(function(r, i) {
              var dec = state.decorations.filter(function(d) { return d.id === r.decorationId; })[0];
              var dLabel = dec ? (dec.templateLabel || dec.template || 'item') : '(removed)';
              var pct = r.scorePct || 0;
              var color = pct >= 80 ? (palette.success || palette.accent)
                        : pct >= 50 ? palette.accent
                        : (palette.warn || palette.textMute);
              return h('div', {
                key: 'qr-' + i,
                style: {
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: i < q.results.length - 1 ? '1px solid ' + palette.border : 'none'
                }
              },
                h('div', null,
                  dec && dec.imageBase64 ? h('img', {
                    src: dec.imageBase64, alt: '', 'aria-hidden': 'true',
                    style: { width: '24px', height: '24px', verticalAlign: 'middle', marginRight: '8px', borderRadius: '4px' }
                  }) : null,
                  h('span', { style: { fontSize: '13px', color: palette.text } }, dLabel)
                ),
                h('span', { style: { fontSize: '13px', fontWeight: 700, color: color, fontVariantNumeric: 'tabular-nums' } },
                  pct + '%')
              );
            })
          ),
          h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '18px', lineHeight: '1.5', fontStyle: 'italic' } },
            avgPct >= 80
              ? 'Strong session. Memory shapes itself this way.'
              : avgPct >= 50
              ? 'Solid effort. The decks that wobbled will surface again later.'
              : 'A start. Real retrieval reps add up — coming back is what matters.'),
          h('button', {
            onClick: function() { setStateMulti({ activeModal: null, generateContext: null }); },
            style: Object.assign({}, primaryBtnStyle(palette), { padding: '10px 28px' })
          }, '✓ Done')
        )
      );
    }

    function renderClinicalReviewModal() {
      if (state.activeModal !== 'clinical-review') return null;
      var withContent = state.decorations.filter(function(d) { return !!d.linkedContent; });
      var allStories = state.stories || [];
      var dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      var recentJournals = (state.journalEntries || []).slice().sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      }).slice(0, 5);

      var sectionStyle = { marginBottom: '24px' };
      var sectionTitleStyle = { fontSize: '13px', fontWeight: 700, marginBottom: '10px', borderBottom: '1.5px solid ' + palette.border, paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', color: palette.text };
      var subTitleStyle = { fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: palette.text, marginTop: '14px' };
      var bodyTextStyle = { fontSize: '12px', color: palette.text, lineHeight: 1.55, margin: 0 };
      var smallMetaStyle = { fontSize: '10px', color: palette.textMute, fontStyle: 'italic' };
      var thumbStyle = { width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', border: '1px solid ' + palette.border, verticalAlign: 'middle', background: palette.surface };

      function renderDeckBlock(decoration) {
        var lc = decoration.linkedContent;
        var label = decoration.templateLabel || decoration.template || 'item';
        var typeLabel = lc.type === 'flashcards' ? 'Flashcards'
                      : lc.type === 'acronym'    ? 'Acronym'
                      : lc.type === 'image-link' ? 'Image link'
                                                   : 'Notes';
        var reviewedLabel;
        if (!lc.lastReviewedAt) reviewedLabel = 'Never reviewed';
        else {
          var d2 = new Date(lc.lastReviewedAt);
          reviewedLabel = 'Last reviewed ' + d2.toLocaleDateString();
        }
        var meta = typeLabel
          + (lc.bestQuizScore ? ' · Best ' + lc.bestQuizScore + '%' : '')
          + ' · ' + (lc.reviewCount || 0) + ' review' + ((lc.reviewCount || 0) === 1 ? '' : 's')
          + ' · ' + reviewedLabel;

        var body = null;
        if (lc.type === 'flashcards' && lc.data && Array.isArray(lc.data.cards)) {
          body = h('ol', { style: { paddingLeft: '22px', margin: '4px 0' } },
            lc.data.cards.map(function(card) {
              var atts = (card.correctCount || 0) + (card.missCount || 0);
              return h('li', { key: 'cl-' + card.id, style: { marginBottom: '4px', fontSize: '12px', color: palette.text, lineHeight: 1.55 } },
                h('span', { style: { fontWeight: 700 } }, card.front || ''),
                h('span', { style: { color: palette.textDim } }, ' — ' + (card.back || '')),
                atts > 0 ? h('span', { style: smallMetaStyle }, ' (' + (card.correctCount || 0) + '/' + atts + ')') : null
              );
            })
          );
        } else if (lc.type === 'acronym' && lc.data) {
          var letters = (lc.data.letters || '').toUpperCase();
          var meanings = lc.data.meanings || [];
          body = h('div', null,
            lc.data.context ? h('p', { style: Object.assign({}, bodyTextStyle, { fontStyle: 'italic', marginBottom: '4px' }) }, lc.data.context) : null,
            h('div', { style: { fontSize: '16px', fontWeight: 800, letterSpacing: '0.1em', color: palette.accent, marginBottom: '4px' } }, letters),
            h('ul', { style: { listStyle: 'none', paddingLeft: 0, margin: '4px 0' } },
              letters.split('').map(function(letter, i) {
                return h('li', { key: 'cla-' + i, style: { fontSize: '12px', color: palette.text, marginBottom: '2px' } },
                  h('strong', null, letter), ' — ', meanings[i] || h('span', { style: { color: palette.textMute } }, '(blank)'));
              })
            )
          );
        } else if (lc.type === 'image-link' && lc.data) {
          var tgt = state.decorations.filter(function(dec) { return dec.id === lc.data.targetDecorationId; })[0];
          var tgtLabel = tgt ? (tgt.templateLabel || tgt.template || 'item') : '(removed item)';
          body = h('div', null,
            h('p', { style: bodyTextStyle },
              h('strong', null, label), ' → ', h('strong', null, tgtLabel)),
            h('p', { style: Object.assign({}, bodyTextStyle, { fontStyle: 'italic', marginTop: '4px', color: palette.textDim }) },
              '"' + (lc.data.association || '') + '"')
          );
        } else if (lc.type === 'notes' && lc.data) {
          var text = (lc.data.text || '');
          if (extractClozeAnswers(text).length > 0) {
            var segments = buildClozeSegments(text);
            body = h('div', { style: { fontSize: '12px', color: palette.text, lineHeight: 1.55, margin: '4px 0', whiteSpace: 'pre-wrap' } },
              segments.map(function(seg, i) {
                if (seg.kind === 'text') return h('span', { key: 'cls-' + i }, seg.value);
                return h('span', {
                  key: 'cls-' + i,
                  style: { background: palette.accent, color: palette.onAccent, padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }
                }, seg.answer);
              })
            );
          } else {
            body = h('p', { style: Object.assign({}, bodyTextStyle, { whiteSpace: 'pre-wrap', margin: '4px 0' }) }, text);
          }
        }

        var clMoodOpt = decoration.mood ? getMoodOption(decoration.mood) : null;
        return h('div', {
          key: 'cd-' + decoration.id,
          style: { padding: '12px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px', marginBottom: '10px' }
        },
          h('h3', { style: subTitleStyle },
            decoration.imageBase64 ? h('img', { src: decoration.imageBase64, alt: '', style: thumbStyle }) : null,
            h('span', { style: { marginLeft: '8px' } }, label),
            clMoodOpt ? h('span', { style: { fontSize: '12px', marginLeft: '8px', color: palette.textDim, fontWeight: 500 } },
              ' · ' + clMoodOpt.emoji + ' ' + clMoodOpt.label) : null
          ),
          h('p', { style: smallMetaStyle }, meta),
          body
        );
      }

      function renderStoryBlock(story) {
        var validSteps = (story.steps || []).filter(function(st) {
          return st.decorationId && (st.narrative || '').trim().length > 0;
        });
        var walkable = validSteps.length >= 3 && (story.title || '').trim().length > 0;
        var meta = (story.steps || []).length + ' step' + ((story.steps || []).length === 1 ? '' : 's')
          + (story.reviewCount ? ' · Walked ' + story.reviewCount + 'x' : '')
          + (walkable ? '' : ' · Draft');
        return h('div', {
          key: 'cs-' + story.id,
          style: { padding: '12px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px', marginBottom: '10px' }
        },
          h('h3', { style: subTitleStyle }, '📜 ' + (story.title || '(untitled story)')),
          h('p', { style: smallMetaStyle }, meta),
          h('ol', { style: { paddingLeft: '22px', margin: '6px 0' } },
            (story.steps || []).map(function(step, sIdx) {
              var dec = state.decorations.filter(function(d) { return d.id === step.decorationId; })[0];
              var dLabel = dec ? (dec.templateLabel || dec.template || 'item') : '(removed item)';
              return h('li', { key: 'cst-' + sIdx, style: { marginBottom: '8px', fontSize: '12px', color: palette.text, lineHeight: 1.55 } },
                dec && dec.imageBase64 ? h('img', { src: dec.imageBase64, alt: '', style: thumbStyle }) : null,
                h('span', { style: { marginLeft: '8px', fontWeight: 700 } }, dLabel),
                h('div', { style: { fontStyle: 'italic', color: palette.textDim, marginTop: '2px' } },
                  '"' + (step.narrative || '') + '"')
              );
            })
          )
        );
      }

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Clinical review packet',
        onClick: function(e) {
          if (e.target === e.currentTarget) setStateField('activeModal', 'memory-overview');
        },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 178,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }
      },
        h('div', {
          style: {
            background: palette.bg, border: '1px solid ' + palette.border,
            borderRadius: '14px', padding: '24px',
            maxWidth: '760px', width: '100%', maxHeight: '92vh',
            overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            color: palette.text
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px', flexWrap: 'wrap' } },
            h('h3', { style: { margin: 0, color: palette.text, fontSize: '20px', fontWeight: 700 } }, '📋 Review packet'),
            h('div', { style: { display: 'flex', gap: '6px' } },
              h('button', {
                onClick: function() {
                  // Phase 2p.34 — open the section picker before printing.
                  setStateMulti({
                    activeModal: 'print-options',
                    generateContext: { returnTo: 'clinical-review' }
                  });
                },
                'aria-label': 'Print this packet (pick sections)',
                title: 'Pick which sections to include, then print',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '6px 12px', fontSize: '12px' })
              }, '🖨 Print'),
              h('button', {
                onClick: function() { setStateField('activeModal', 'memory-overview'); },
                'aria-label': 'Back to overview',
                style: Object.assign({}, secondaryBtnStyle(palette), { padding: '4px 10px' })
              }, '✕')
            )
          ),
          h('p', { style: { margin: '8px 0 16px 0', fontSize: '11px', color: palette.textDim, fontStyle: 'italic', lineHeight: 1.5 } },
            'Generated ' + dateStr + '. This is the same content as Print Packet, on screen for review with a parent, teacher, or clinician without printing.'),
          // Stats banner
          h('div', { style: { padding: '10px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px', fontSize: '12px', color: palette.text, marginBottom: '20px', lineHeight: 1.55 } },
            h('strong', null, 'Activity summary: '),
            state.decorations.length + ' decoration' + (state.decorations.length === 1 ? '' : 's'),
            ' · ', withContent.length + ' deck' + (withContent.length === 1 ? '' : 's'),
            ' · ', allStories.length + ' stor' + (allStories.length === 1 ? 'y' : 'ies'),
            ' · ', (state.earnings || []).length + ' token-earning event' + ((state.earnings || []).length === 1 ? '' : 's'),
            ' · ', state.tokens, ' token' + (state.tokens === 1 ? '' : 's') + ' unspent',
            ' · ', (state.journalEntries || []).length + ' reflection' + ((state.journalEntries || []).length === 1 ? '' : 's')
          ),
          // Companion + Skills (Phase 2p)
          (function() {
            var companion = state.companion;
            if (!companion || !companion.species) return null;
            var sp = getCompanionSpecies(companion.species);
            var swatch = getCompanionPalette(companion.species, companion.colorVariant || 'warm');
            var daysAgo = companion.createdAt
              ? Math.floor((Date.now() - new Date(companion.createdAt).getTime()) / (24 * 60 * 60 * 1000))
              : 0;
            var skills = SKILL_DEFS.map(function(def) {
              var c = countSkillEvents(state, def.id);
              return { def: def, prog: computeSkillLevel(c), count: c };
            });
            var hasSkillData = skills.some(function(s) { return s.count > 0; });
            return h('div', { style: sectionStyle },
              h('h2', { style: sectionTitleStyle }, '🌿 Companion + Skills'),
              h('div', { style: { padding: '14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px' } },
                h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: hasSkillData ? '12px' : 0 } },
                  h('div', { style: { width: '64px', height: '64px', flexShrink: 0, padding: '4px', background: palette.bg, border: '1px solid ' + palette.border, borderRadius: '10px' } },
                    getCompanionSvg(companion.species, swatch, { blinking: false })
                  ),
                  h('div', null,
                    h('div', { style: { fontSize: '14px', fontWeight: 700, color: palette.text } },
                      (companion.name || sp.label) + ' · ' + sp.label),
                    h('div', { style: { fontSize: '11px', color: palette.textDim, marginTop: '2px' } },
                      daysAgo === 0 ? 'Joined today' : daysAgo === 1 ? 'Joined yesterday' : 'Joined ' + daysAgo + ' days ago')
                  )
                ),
                hasSkillData ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px 14px' } },
                  skills.map(function(s) {
                    return h('div', { key: 'cs-' + s.def.id, style: { fontSize: '11px', color: palette.textDim } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '3px' } },
                        h('span', { style: { fontWeight: 700, color: palette.text } }, s.def.emoji + ' ' + s.def.label),
                        h('span', { style: { fontSize: '10px' } }, 'L' + s.prog.level + (s.prog.atMax ? ' max' : ''))
                      ),
                      h('div', { style: { height: '4px', background: palette.bg, borderRadius: '2px', overflow: 'hidden' } },
                        h('div', { style: { width: s.prog.pct + '%', height: '100%', background: palette.accent } })
                      )
                    );
                  })
                ) : null
              )
            );
          })(),
          // Mood timeline (Phase 2p.25) — palette-aware version of the
          // memory-overview timeline, for parents/clinicians reviewing
          // the affective trajectory on screen.
          renderMoodTimeline(),
          // Recent achievements (Phase 2p.5) — same spirit as the print
          // packet section, palette-aware for on-screen review
          (function() {
            var ach = state.achievements || {};
            var nowMs = Date.now();
            var thirty = 30 * 24 * 60 * 60 * 1000;
            var recent = ACHIEVEMENT_CATALOG.filter(function(a) {
              if (!ach[a.id]) return false;
              var t = new Date(ach[a.id].unlockedAt).getTime();
              return (nowMs - t) <= thirty;
            });
            recent.sort(function(a, b) {
              return (ach[b.id].unlockedAt || '').localeCompare(ach[a.id].unlockedAt || '');
            });
            if (recent.length === 0) return null;
            var totalUnlocked = Object.keys(ach).length;
            return h('div', { style: sectionStyle },
              h('h2', { style: sectionTitleStyle }, '🏆 Recent Achievements · ' + recent.length + ' in last 30 days · ' + totalUnlocked + '/' + ACHIEVEMENT_CATALOG.length + ' total'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' } },
                recent.map(function(a) {
                  return h('div', {
                    key: 'cra-' + a.id,
                    style: { padding: '8px 12px', background: palette.surface, border: '1px solid ' + palette.border, borderLeft: '3px solid ' + palette.accent, borderRadius: '6px' }
                  },
                    h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
                      a.emoji + ' ' + a.label),
                    h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.45', marginBottom: '4px' } },
                      a.desc),
                    h('div', { style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic' } },
                      new Date(ach[a.id].unlockedAt).toLocaleDateString())
                  );
                })
              )
            );
          })(),
          // Goals (Phase 2n)
          (function() {
            var goals = state.goals || [];
            var nowMs = Date.now();
            var visible = goals.filter(function(g) {
              if (g.completedAt) {
                return new Date(g.completedAt).getTime() >= nowMs - 30 * 24 * 60 * 60 * 1000;
              }
              var endMs = g.endDate ? new Date(g.endDate).getTime() : Infinity;
              return endMs >= nowMs;
            });
            if (visible.length === 0) return null;
            return h('div', { style: sectionStyle },
              h('h2', { style: sectionTitleStyle }, '🎯 Goals · ' + visible.length),
              visible.map(function(g) {
                var prog = computeGoalProgress(g, state);
                var metric = getGoalMetric(g.metric);
                var endLabel = g.endDate ? new Date(g.endDate).toLocaleDateString() : '?';
                var barColor = g.completedAt ? (palette.success || palette.accent) : palette.accent;
                return h('div', {
                  key: 'cg-' + g.id,
                  style: { padding: '12px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderLeft: '3px solid ' + barColor, borderRadius: '8px', marginBottom: '10px' }
                },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
                    (g.completedAt ? '✓ ' : '🎯 ') + g.title),
                  h('div', { style: { fontSize: '11px', color: palette.textDim, marginBottom: '6px' } },
                    (metric ? metric.label : g.metric) + ' · target ' + g.targetCount
                    + ' · ' + (g.completedAt ? 'Completed ' + new Date(g.completedAt).toLocaleDateString() : 'Due ' + endLabel)),
                  h('div', { style: { height: '6px', background: palette.bg, borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' } },
                    h('div', { style: { width: prog.pct + '%', height: '100%', background: barColor } })
                  ),
                  h('div', { style: { fontSize: '11px', color: palette.textDim, fontVariantNumeric: 'tabular-nums' } },
                    prog.current + ' / ' + prog.target + ' · ' + prog.pct + '%'),
                  g.notes ? h('div', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic', marginTop: '4px' } }, '"' + g.notes + '"') : null
                );
              })
            );
          })(),
          // Decks
          withContent.length > 0 ? h('div', { style: sectionStyle },
            h('h2', { style: sectionTitleStyle }, '📖 Memory Decks · ' + withContent.length),
            withContent.map(function(d) { return renderDeckBlock(d); })
          ) : null,
          // Stories
          allStories.length > 0 ? h('div', { style: sectionStyle },
            h('h2', { style: sectionTitleStyle }, '📜 Stories · ' + allStories.length),
            allStories.map(function(s) { return renderStoryBlock(s); })
          ) : null,
          // Recent reflections
          recentJournals.length > 0 ? h('div', { style: sectionStyle },
            h('h2', { style: sectionTitleStyle }, '📝 Recent Reflections · last ' + recentJournals.length),
            recentJournals.map(function(j) {
              return h('div', {
                key: 'cj-' + j.id,
                style: { padding: '10px 14px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px', marginBottom: '8px' }
              },
                h('p', { style: smallMetaStyle },
                  (j.date ? new Date(j.date).toLocaleDateString() : 'Undated')
                  + (j.prompt ? ' · "' + j.prompt + '"' : '')),
                h('p', { style: Object.assign({}, bodyTextStyle, { whiteSpace: 'pre-wrap', margin: '4px 0' }) },
                  '"' + (j.text || '') + '"')
              );
            })
          ) : null
        )
      );
    }

    // ─────────────────────────────────────────────────
    // PRINT PACKET (Phase 2h) — exportable study artifact for
    // parents, IEP teams, and clinicians. Always rendered into the
    // DOM but display:none on screen; @media print CSS reveals it
    // and hides everything else, so window.print() outputs only
    // the packet. Class-based hide so the print rule overrides
    // without !important on the inline display attribute.
    // ─────────────────────────────────────────────────
    // Tenure recap print (Phase 2p.30) — paper-friendly one-page
    // version of the recap modal. Reuses computeTenureStats, renders
    // grayscale + high-contrast for printer fidelity.
    function renderPrintTenure() {
      var stats = computeTenureStats(state);
      if (!stats) return null;
      var startDate = new Date(stats.earliestMs);
      var startStr = startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      var nowStr = new Date().toLocaleDateString();
      var c = stats.companion;
      var sp = (c && c.species) ? getCompanionSpecies(c.species) : null;
      var statBox = function(label, value, sub) {
        return h('div', {
          style: { border: '1px solid #999', borderRadius: '4px', padding: '6px 8px', textAlign: 'center', flex: '1 1 80px', minWidth: 0 }
        },
          h('div', { style: { fontSize: '16px', fontWeight: 700, color: '#000' } }, value),
          h('div', { style: { fontSize: '9px', color: '#444' } }, label),
          sub ? h('div', { style: { fontSize: '8px', color: '#666', fontStyle: 'italic' } }, sub) : null
        );
      };
      return h('div', {
        className: 'ah-print-packet',
        role: 'document',
        'aria-label': 'Tenure recap — printable',
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          padding: '36px',
          background: '#fff', color: '#000',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'auto',
          zIndex: 250
        }
      },
        h('div', { style: { borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '14px' } },
          h('h1', { style: { margin: 0, fontSize: '20px' } }, '🌱 AlloHaven Journey Recap'),
          h('div', { style: { fontSize: '10px', color: '#666', marginTop: '4px' } },
            'Since ' + startStr + ' · ' + stats.daysSince + ' days · printed ' + nowStr)
        ),
        c && sp ? h('div', { style: { marginBottom: '16px', fontSize: '11px', color: '#222' } },
          h('strong', null, c.name || sp.label), ' · ', sp.label,
          c.createdAt ? ', companion since ' + new Date(c.createdAt).toLocaleDateString() : null
        ) : null,
        // Top stats row
        h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' } },
          statBox('Tokens earned', stats.tokensEarned),
          statBox('Decorations', stats.decorationCount, stats.customCount > 0 ? stats.customCount + ' your own' : null),
          statBox('Reflections', stats.journalCount, stats.totalWords > 0 ? stats.totalWords + ' words' : null),
          statBox('Achievements', stats.unlockedAchievements + '/' + stats.totalAchievements),
          statBox('Longest streak', stats.streakLongest + ' day' + (stats.streakLongest === 1 ? '' : 's')),
          statBox('Days visited', stats.visitDays)
        ),
        // Skills
        h('h2', { style: { margin: '14px 0 4px 0', fontSize: '13px', borderBottom: '1px solid #999', paddingBottom: '2px' } }, 'Skill levels'),
        h('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' } },
          stats.skills.map(function(sk) {
            return h('div', { key: 'psk-' + sk.def.id, style: { border: '1px solid #999', borderRadius: '4px', padding: '6px 10px', minWidth: 0, flex: '1 1 80px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700 } }, sk.def.label),
              h('div', { style: { fontSize: '14px', fontWeight: 700 } }, 'Level ' + sk.level + (sk.atMax ? ' ★' : '')),
              h('div', { style: { fontSize: '9px', color: '#666' } }, sk.count + ' events')
            );
          })
        ),
        // Top moods + subjects
        h('div', { style: { display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' } },
          h('div', { style: { flex: '1 1 200px', minWidth: 0 } },
            h('h2', { style: { margin: '0 0 4px 0', fontSize: '13px', borderBottom: '1px solid #999', paddingBottom: '2px' } }, 'Top moods'),
            stats.topMoods.length === 0 ? h('p', { style: { fontSize: '11px', color: '#666', fontStyle: 'italic' } }, '— ') :
            h('ul', { style: { paddingLeft: '20px', margin: '4px 0', fontSize: '11px' } },
              stats.topMoods.slice(0, 3).map(function(m) {
                return h('li', { key: 'pm-' + m.id }, (m.option ? m.option.label : m.id) + ' — ' + m.count);
              })
            )
          ),
          h('div', { style: { flex: '1 1 200px', minWidth: 0 } },
            h('h2', { style: { margin: '0 0 4px 0', fontSize: '13px', borderBottom: '1px solid #999', paddingBottom: '2px' } }, 'Top subjects'),
            stats.topSubjects.length === 0 ? h('p', { style: { fontSize: '11px', color: '#666', fontStyle: 'italic' } }, '— ') :
            h('ul', { style: { paddingLeft: '20px', margin: '4px 0', fontSize: '11px' } },
              stats.topSubjects.slice(0, 3).map(function(s) {
                return h('li', { key: 'ps-' + s.id }, (s.tag ? s.tag.label : s.id) + ' — ' + s.count);
              })
            )
          )
        ),
        // Footer note
        h('div', { style: { marginTop: '20px', fontSize: '10px', color: '#666', fontStyle: 'italic', borderTop: '1px solid #ccc', paddingTop: '8px' } },
          'AlloHaven · cozy room learning portfolio · this recap reflects activity stored locally on this device.')
      );
    }

    // Per-decoration print card (Phase 2p.17) — single decoration\'s
    // full info on one printable page. Rendered when state.printScope
    // points at a specific decoration id. Useful for IEP review packets,
    // parent meetings, "send home" scenarios.
    function renderPrintCard(decorationId) {
      var d = (state.decorations || []).filter(function(x) { return x.id === decorationId; })[0];
      if (!d) return null;
      var dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      var label = d.templateLabel || d.template || 'decoration';
      var earnedStr = d.earnedAt ? new Date(d.earnedAt).toLocaleDateString() : '?';
      var moodOpt = d.mood ? getMoodOption(d.mood) : null;
      var lc = d.linkedContent;
      var subjectLabels = (d.subjects || []).map(function(sid) {
        for (var i = 0; i < SUBJECT_TAGS.length; i++) {
          if (SUBJECT_TAGS[i].id === sid) return SUBJECT_TAGS[i].emoji + ' ' + SUBJECT_TAGS[i].label;
        }
        return sid;
      });
      // Memory content body
      var contentBody = null;
      if (lc && lc.data) {
        if (lc.type === 'flashcards' && Array.isArray(lc.data.cards)) {
          contentBody = h('div', null,
            h('p', { style: { fontSize: '11px', color: '#444', margin: '4px 0' } },
              '📚 Flashcards · ' + lc.data.cards.length + ' card' + (lc.data.cards.length === 1 ? '' : 's')),
            h('ol', { style: { paddingLeft: '24px', margin: '6px 0' } },
              lc.data.cards.map(function(c) {
                var atts = (c.correctCount || 0) + (c.missCount || 0);
                return h('li', { key: 'pcc-' + c.id, style: { marginBottom: '5px', fontSize: '12px', color: '#222', lineHeight: 1.5 } },
                  h('strong', null, c.front || ''),
                  h('span', null, ' — ' + (c.back || '')),
                  atts > 0 ? h('span', { style: { fontSize: '10px', color: '#666', fontStyle: 'italic' } },
                    ' (' + (c.correctCount || 0) + '/' + atts + ')') : null
                );
              })
            )
          );
        } else if (lc.type === 'acronym') {
          var letters = (lc.data.letters || '').toUpperCase();
          var meanings = lc.data.meanings || [];
          contentBody = h('div', null,
            h('p', { style: { fontSize: '11px', color: '#444', margin: '4px 0' } },
              '🔤 Acronym' + (lc.data.context ? ' · ' + lc.data.context : '')),
            h('div', { style: { fontSize: '20px', fontWeight: 800, letterSpacing: '0.12em', color: '#000', marginBottom: '6px' } }, letters),
            h('ul', { style: { listStyle: 'none', paddingLeft: 0, margin: '4px 0' } },
              letters.split('').map(function(letter, i) {
                return h('li', { key: 'pcl-' + i, style: { fontSize: '12px', color: '#222', marginBottom: '3px' } },
                  h('strong', null, letter), ' — ', meanings[i] || '(blank)');
              })
            )
          );
        } else if (lc.type === 'image-link') {
          var tgt = state.decorations.filter(function(x) { return x.id === lc.data.targetDecorationId; })[0];
          contentBody = h('div', null,
            h('p', { style: { fontSize: '11px', color: '#444', margin: '4px 0' } }, '🔗 Image link'),
            h('p', { style: { fontSize: '12px', color: '#222' } },
              h('strong', null, label), ' → ', h('strong', null, tgt ? (tgt.templateLabel || tgt.template) : '(removed item)')),
            h('p', { style: { fontSize: '12px', color: '#333', fontStyle: 'italic', marginTop: '4px' } },
              '"' + (lc.data.association || '') + '"')
          );
        } else if (lc.type === 'notes') {
          var text = (lc.data.text || '');
          var clozeCount = extractClozeAnswers(text).length;
          contentBody = h('div', null,
            h('p', { style: { fontSize: '11px', color: '#444', margin: '4px 0' } },
              '📝 Notes' + (clozeCount > 0 ? ' · ' + clozeCount + ' fill-in blank' + (clozeCount === 1 ? '' : 's') : '')),
            clozeCount > 0 ? (function() {
              var segments = buildClozeSegments(text);
              return h('div', { style: { fontSize: '12px', color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
                segments.map(function(seg, i) {
                  if (seg.kind === 'text') return h('span', { key: 'pn-' + i }, seg.value);
                  return h('span', {
                    key: 'pn-' + i,
                    style: { borderBottom: '1px solid #000', padding: '0 4px', minWidth: '60px', display: 'inline-block', textAlign: 'center', fontWeight: 700 }
                  }, seg.answer);
                })
              );
            })() : h('p', { style: { fontSize: '12px', color: '#222', whiteSpace: 'pre-wrap', lineHeight: 1.55, margin: '4px 0' } }, text)
          );
        }
      }
      return h('div', {
        className: 'ah-print-packet',
        'aria-hidden': 'true'
      },
        h('div', { style: { borderBottom: '3px double #000', paddingBottom: '12px', marginBottom: '20px' } },
          h('h1', { style: { fontSize: '22px', margin: 0, fontWeight: 800, color: '#000' } },
            '🌿 AlloHaven · ' + label),
          h('p', { style: { margin: '6px 0 0 0', fontSize: '11px', color: '#444' } },
            'Earned ' + earnedStr + ' · printed ' + dateStr)
        ),
        h('div', { style: { marginBottom: '16px', display: 'flex', gap: '14px' } },
          d.imageBase64 ? h('img', {
            src: d.imageBase64, alt: label,
            style: { width: '180px', height: '180px', objectFit: 'contain', border: '1px solid #999', borderRadius: '6px', flexShrink: 0 }
          }) : null,
          h('div', { style: { flex: 1, fontSize: '12px', color: '#222', lineHeight: 1.6 } },
            moodOpt ? h('p', { style: { margin: '0 0 6px 0' } },
              h('strong', null, 'Mood: '), moodOpt.emoji + ' ' + moodOpt.label) : null,
            subjectLabels.length > 0 ? h('p', { style: { margin: '0 0 6px 0' } },
              h('strong', null, 'Subject' + (subjectLabels.length === 1 ? '' : 's') + ': '),
              subjectLabels.join(' · ')) : null,
            d.studentReflection ? h('p', { style: { margin: '0 0 6px 0', fontStyle: 'italic' } },
              '"' + d.studentReflection + '"') : null,
            d.voiceNote ? h('p', { style: { margin: '0 0 6px 0', fontSize: '11px', color: '#666' } },
              '🎤 Voice note attached (' + Math.round((d.voiceNote.durationMs || 0) / 1000) + 's, audio not printable)') : null
          )
        ),
        contentBody ? h('div', { style: { padding: '12px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' } }, contentBody) : null,
        // Signature lines
        h('div', { style: { marginTop: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '11px' } },
            h('strong', null, 'Reviewed with: '), h('span', { style: { borderBottom: '1px solid #000', display: 'inline-block', minWidth: '180px', padding: '0 4px' } }, ' ')),
          h('div', { style: { fontSize: '11px' } },
            h('strong', null, 'Date: '), h('span', { style: { borderBottom: '1px solid #000', display: 'inline-block', minWidth: '120px', padding: '0 4px' } }, ' '))
        ),
        h('div', { style: { marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #999', fontSize: '9px', color: '#666', textAlign: 'center' } },
          'AlloHaven · single decoration card · printed ' + dateStr)
      );
    }

    function renderPrintPacket() {
      // Phase 2p.17 — when printScope is a card, render that instead
      if (state.printScope && state.printScope.type === 'card' && state.printScope.decorationId) {
        return renderPrintCard(state.printScope.decorationId);
      }
      // Phase 2p.30 — tenure recap print (one-page summary of the
      // student's full AlloHaven journey).
      if (state.printScope && state.printScope.type === 'tenure') {
        return renderPrintTenure();
      }
      var withContent = state.decorations.filter(function(d) { return !!d.linkedContent; });
      var allStories = state.stories || [];
      var dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      // All-print-friendly base styles. Inline so they apply to the
      // packet even before the print rule kicks in (lets us preview
      // the packet by temporarily flipping the class display).
      var sectionStyle = { marginBottom: '24px' };
      var sectionTitleStyle = { fontSize: '14px', fontWeight: 700, marginBottom: '8px', borderBottom: '1.5px solid #333', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000' };
      var subTitleStyle = { fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#000', marginTop: '14px' };
      var bodyTextStyle = { fontSize: '11px', color: '#333', lineHeight: 1.5, margin: 0 };
      var smallMetaStyle = { fontSize: '9px', color: '#666', fontStyle: 'italic' };
      var thumbStyle = { width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', border: '0.5px solid #999', verticalAlign: 'middle' };

      function renderDeckPrint(decoration) {
        var lc = decoration.linkedContent;
        var label = decoration.templateLabel || decoration.template || 'item';
        var typeLabel = lc.type === 'flashcards' ? 'Flashcards'
                      : lc.type === 'acronym'    ? 'Acronym'
                      : lc.type === 'image-link' ? 'Image link'
                                                   : 'Notes';
        var reviewedLabel;
        if (!lc.lastReviewedAt) reviewedLabel = 'Never reviewed';
        else {
          var d2 = new Date(lc.lastReviewedAt);
          reviewedLabel = 'Last reviewed ' + d2.toLocaleDateString();
        }
        var meta = typeLabel
          + (lc.bestQuizScore ? ' · Best score ' + lc.bestQuizScore + '%' : '')
          + ' · ' + (lc.reviewCount || 0) + ' review' + ((lc.reviewCount || 0) === 1 ? '' : 's')
          + ' · ' + reviewedLabel;

        var body = null;
        if (lc.type === 'flashcards' && lc.data && Array.isArray(lc.data.cards)) {
          body = h('ol', { style: { paddingLeft: '20px', margin: '4px 0' } },
            lc.data.cards.map(function(card) {
              var atts = (card.correctCount || 0) + (card.missCount || 0);
              return h('li', { key: 'pc-' + card.id, style: { marginBottom: '4px', fontSize: '11px', color: '#222', lineHeight: 1.45 } },
                h('span', { style: { fontWeight: 700 } }, card.front || ''),
                h('span', { style: { color: '#444' } }, ' — ' + (card.back || '')),
                atts > 0 ? h('span', { style: smallMetaStyle }, ' (' + (card.correctCount || 0) + '/' + atts + ')') : null
              );
            })
          );
        } else if (lc.type === 'acronym' && lc.data) {
          var letters = (lc.data.letters || '').toUpperCase();
          var meanings = lc.data.meanings || [];
          body = h('div', null,
            lc.data.context ? h('p', { style: Object.assign({}, bodyTextStyle, { fontStyle: 'italic', marginBottom: '4px' }) }, lc.data.context) : null,
            h('div', { style: { fontSize: '14px', fontWeight: 800, letterSpacing: '0.1em', color: '#000', marginBottom: '4px' } }, letters),
            h('ul', { style: { listStyle: 'none', paddingLeft: 0, margin: '4px 0' } },
              letters.split('').map(function(letter, i) {
                return h('li', { key: 'pa-' + i, style: { fontSize: '11px', color: '#222', marginBottom: '2px' } },
                  h('strong', null, letter), ' — ', meanings[i] || h('span', { style: { color: '#999' } }, '____________'));
              })
            )
          );
        } else if (lc.type === 'image-link' && lc.data) {
          var tgt = state.decorations.filter(function(dec) { return dec.id === lc.data.targetDecorationId; })[0];
          var tgtLabel = tgt ? (tgt.templateLabel || tgt.template || 'item') : '(removed item)';
          body = h('div', null,
            h('p', { style: bodyTextStyle },
              h('strong', null, label), ' → ', h('strong', null, tgtLabel)),
            h('p', { style: Object.assign({}, bodyTextStyle, { fontStyle: 'italic', marginTop: '4px' }) },
              '"' + (lc.data.association || '') + '"')
          );
        } else if (lc.type === 'notes' && lc.data) {
          var text = (lc.data.text || '');
          // Render cloze blanks as visible underlines
          if (extractClozeAnswers(text).length > 0) {
            var segments = buildClozeSegments(text);
            body = h('div', { style: { fontSize: '11px', color: '#222', lineHeight: 1.5, margin: '4px 0', whiteSpace: 'pre-wrap' } },
              segments.map(function(seg, i) {
                if (seg.kind === 'text') return h('span', { key: 'ps-' + i }, seg.value);
                return h('span', {
                  key: 'ps-' + i,
                  style: { borderBottom: '1px solid #000', padding: '0 2px', minWidth: '60px', display: 'inline-block', textAlign: 'center', fontWeight: 700 }
                }, seg.answer);
              })
            );
          } else {
            body = h('p', { style: Object.assign({}, bodyTextStyle, { whiteSpace: 'pre-wrap', margin: '4px 0' }) }, text);
          }
        }

        var moodOpt = decoration.mood ? getMoodOption(decoration.mood) : null;
        return h('div', {
          key: 'pd-' + decoration.id,
          className: 'ah-print-section'
        },
          h('h3', { style: subTitleStyle },
            decoration.imageBase64 ? h('img', { src: decoration.imageBase64, alt: '', style: thumbStyle }) : null,
            h('span', { style: { marginLeft: '8px' } }, label),
            moodOpt ? h('span', { style: { fontSize: '12px', marginLeft: '8px', color: '#444' } },
              ' · ' + moodOpt.emoji + ' ' + moodOpt.label) : null
          ),
          h('p', { style: smallMetaStyle }, meta),
          body
        );
      }

      function renderStoryPrint(story) {
        var validSteps = (story.steps || []).filter(function(st) {
          return st.decorationId && (st.narrative || '').trim().length > 0;
        });
        var walkable = validSteps.length >= 3 && (story.title || '').trim().length > 0;
        var meta = (story.steps || []).length + ' step' + ((story.steps || []).length === 1 ? '' : 's')
          + (story.reviewCount ? ' · Walked ' + story.reviewCount + ' time' + (story.reviewCount === 1 ? '' : 's') : '')
          + (walkable ? '' : ' · Draft');
        return h('div', {
          key: 'ps-' + story.id,
          className: 'ah-print-section'
        },
          h('h3', { style: subTitleStyle }, '📜 ' + (story.title || '(untitled story)')),
          h('p', { style: smallMetaStyle }, meta),
          h('ol', { style: { paddingLeft: '20px', margin: '6px 0' } },
            (story.steps || []).map(function(step, idx) {
              var dec = state.decorations.filter(function(d) { return d.id === step.decorationId; })[0];
              var dLabel = dec ? (dec.templateLabel || dec.template || 'item') : '(removed item)';
              return h('li', { key: 'pst-' + idx, style: { marginBottom: '8px', fontSize: '11px', color: '#222', lineHeight: 1.5 } },
                dec && dec.imageBase64 ? h('img', { src: dec.imageBase64, alt: '', style: thumbStyle }) : null,
                h('span', { style: { marginLeft: '6px', fontWeight: 700 } }, dLabel),
                h('div', { style: { fontStyle: 'italic', color: '#333', marginTop: '2px' } },
                  '"' + (step.narrative || '') + '"')
              );
            })
          )
        );
      }

      // Recent journal entries (up to 5, newest first)
      var recentJournals = (state.journalEntries || []).slice().sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      }).slice(0, 5);

      return h('div', {
        className: 'ah-print-packet',
        'aria-hidden': 'true'
      },
        // Cover header
        h('div', { style: { borderBottom: '3px double #000', paddingBottom: '12px', marginBottom: '20px' } },
          h('h1', { style: { fontSize: '22px', margin: 0, fontWeight: 800, color: '#000' } }, '🌿 AlloHaven Study Packet'),
          h('p', { style: { margin: '6px 0 0 0', fontSize: '11px', color: '#444' } },
            'Generated ' + dateStr + ' · ' + state.decorations.length + ' decoration' + (state.decorations.length === 1 ? '' : 's')
            + ' · ' + withContent.length + ' deck' + (withContent.length === 1 ? '' : 's')
            + ' · ' + allStories.length + ' stor' + (allStories.length === 1 ? 'y' : 'ies'))
        ),
        // Student name line
        h('div', { style: { marginBottom: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '11px' } },
            h('strong', null, 'Student: '), h('span', { style: { borderBottom: '1px solid #000', display: 'inline-block', minWidth: '180px', padding: '0 4px' } }, ' ')),
          h('div', { style: { fontSize: '11px' } },
            h('strong', null, 'Reviewed by: '), h('span', { style: { borderBottom: '1px solid #000', display: 'inline-block', minWidth: '180px', padding: '0 4px' } }, ' '))
        ),
        // Stats summary
        h('div', { style: { marginBottom: '20px', padding: '10px 14px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', fontSize: '11px', color: '#222' } },
          h('strong', null, 'Activity summary: '),
          (state.earnings || []).length + ' token-earning event' + ((state.earnings || []).length === 1 ? '' : 's'),
          ' · ', state.tokens, ' tokens earned and unspent',
          ' · ', (state.journalEntries || []).length, ' journal entr' + ((state.journalEntries || []).length === 1 ? 'y' : 'ies'),
          // Phase 2p.15 — flag voice-note count (audio itself doesn\'t print)
          (function() {
            var vCount = (state.decorations || []).filter(function(d) { return d.voiceNote && d.voiceNote.base64; }).length;
            return vCount > 0 ? (' · ' + vCount + ' voice note' + (vCount === 1 ? '' : 's') + ' (audio not printable — see screen view)') : null;
          })()
        ),
        // 90-day activity heatmap (Phase 2p.8) — paper-friendly grid
        // showing engagement consistency for IEP / parent review.
        (function() {
          var earnings = state.earnings || [];
          var decorations = state.decorations || [];
          var journals = state.journalEntries || [];
          if (earnings.length === 0 && journals.length === 0 && decorations.length === 0) return null;
          var DAYS = 91;
          var msPerDay = 24 * 60 * 60 * 1000;
          var nowToday = new Date(); nowToday.setHours(0, 0, 0, 0);
          var nowMs = nowToday.getTime();
          var dowToday = nowToday.getDay();
          var endDay = new Date(nowMs + (6 - dowToday) * msPerDay);
          var startMs = endDay.getTime() - (DAYS - 1) * msPerDay;
          var perDay = {};
          function dayKey(d) {
            var dk = new Date(d); dk.setHours(0, 0, 0, 0);
            return dk.toISOString().slice(0, 10);
          }
          earnings.forEach(function(e) {
            if (!e.date) return;
            var t = new Date(e.date).getTime();
            if (t < startMs || t > endDay.getTime()) return;
            var k = dayKey(t);
            if (!perDay[k]) perDay[k] = 0;
            perDay[k] += (e.tokens || 0);
          });
          decorations.forEach(function(d) {
            if (d.isStarter || !d.earnedAt) return;
            var t = new Date(d.earnedAt).getTime();
            if (t < startMs || t > endDay.getTime()) return;
            var k = dayKey(t); perDay[k] = (perDay[k] || 0) + 2;
          });
          var maxV = 1;
          Object.keys(perDay).forEach(function(k) { if (perDay[k] > maxV) maxV = perDay[k]; });
          var rows = [];
          for (var dow = 0; dow < 7; dow++) {
            var cells = [];
            for (var col = 0; col < 13; col++) {
              var dayMs = startMs + (col * 7 + dow) * msPerDay;
              var iso = new Date(dayMs).toISOString().slice(0, 10);
              var v = perDay[iso] || 0;
              var isFuture = dayMs > nowMs;
              var fill;
              if (isFuture) fill = '#fff';
              else if (v === 0) fill = '#e9e9e9';
              else {
                var intensity = Math.min(1, v / maxV);
                if (intensity < 0.25) fill = '#cfd8dc';
                else if (intensity < 0.5) fill = '#90a4ae';
                else if (intensity < 0.75) fill = '#546e7a';
                else fill = '#263238';
              }
              cells.push(h('div', {
                key: 'phm-' + dow + '-' + col,
                style: {
                  width: '10px', height: '10px',
                  background: fill,
                  border: '1px solid #999',
                  borderRadius: '2px',
                  display: 'inline-block',
                  marginRight: '2px'
                }
              }));
            }
            rows.push(h('div', { key: 'phm-row-' + dow, style: { display: 'flex', marginBottom: '2px' } }, cells));
          }
          var activeDays = Object.keys(perDay).length;
          return h('div', { style: { marginBottom: '20px', padding: '10px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px' } },
            h('div', { style: { fontWeight: 700, marginBottom: '6px', fontSize: '11px', color: '#000' } },
              '📅 Activity heatmap · last 90 days · ' + activeDays + ' active day' + (activeDays === 1 ? '' : 's')),
            h('div', null, rows),
            h('div', { style: { fontSize: '9px', color: '#666', marginTop: '4px', fontStyle: 'italic' } },
              'Each square = one day. Darker = more activity. Empty days are neutral, not negative.')
          );
        })(),
        // Mood timeline (Phase 2p.25) — paper-friendly stacked bars by week
        (function() {
          var taggedDecs = (state.decorations || []).filter(function(d) {
            return d.mood && d.earnedAt && !d.isStarter;
          });
          if (taggedDecs.length < 3) return null;
          var WEEKS = 13;
          var msPerWeek = 7 * 24 * 60 * 60 * 1000;
          var today = new Date(); today.setHours(0, 0, 0, 0);
          var dowToday = today.getDay();
          var endOfWeekTs = today.getTime() + (6 - dowToday) * 24 * 60 * 60 * 1000;
          var startMs = endOfWeekTs - (WEEKS * msPerWeek - 1);
          var perWeek = [];
          for (var w = 0; w < WEEKS; w++) {
            perWeek.push({ joy: 0, pride: 0, curiosity: 0, calm: 0, struggle: 0, total: 0 });
          }
          taggedDecs.forEach(function(d) {
            var t = new Date(d.earnedAt).getTime();
            if (t < startMs || t > endOfWeekTs) return;
            var idx = Math.floor((t - startMs) / msPerWeek);
            if (idx < 0 || idx >= WEEKS) return;
            if (perWeek[idx][d.mood] !== undefined) {
              perWeek[idx][d.mood]++;
              perWeek[idx].total++;
            }
          });
          var maxTotal = 1;
          perWeek.forEach(function(w) { if (w.total > maxTotal) maxTotal = w.total; });
          // Paper-friendly grayscale + dotted-pattern coding for moods
          var moodGray = {
            joy: '#cccccc', pride: '#999999', curiosity: '#666666',
            calm: '#aaaaaa', struggle: '#3a3a3a'
          };
          var moodOrder = ['joy', 'pride', 'curiosity', 'calm', 'struggle'];
          var bars = [];
          var maxBarH = 60;
          var W = 320, padL = 4, padR = 4, padT = 4, padB = 14;
          var plotW = W - padL - padR;
          var barW = plotW / WEEKS;
          for (var i = 0; i < WEEKS; i++) {
            var weekBucket = perWeek[i];
            if (weekBucket.total === 0) continue;
            var x = padL + i * barW;
            var stackedH = 0;
            moodOrder.forEach(function(mid) {
              var n = weekBucket[mid] || 0;
              if (n === 0) return;
              var segH = (n / maxTotal) * maxBarH;
              var y = padT + maxBarH - stackedH - segH;
              bars.push(h('rect', {
                key: 'pmt-' + i + '-' + mid,
                x: x + barW * 0.15, y: y,
                width: Math.max(2, barW * 0.7), height: segH,
                fill: moodGray[mid],
                stroke: '#000', strokeWidth: 0.3
              }));
              stackedH += segH;
            });
          }
          return h('div', { style: { marginBottom: '20px', padding: '10px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px' } },
            h('div', { style: { fontWeight: 700, marginBottom: '6px', fontSize: '11px', color: '#000' } },
              '🎭 Mood timeline · last 13 weeks · ' + taggedDecs.length + ' tagged decoration' + (taggedDecs.length === 1 ? '' : 's')),
            h('svg', { viewBox: '0 0 ' + W + ' ' + (padT + maxBarH + padB), width: '100%', height: padT + maxBarH + padB },
              h('line', { x1: padL, x2: W - padR, y1: padT + maxBarH, y2: padT + maxBarH, stroke: '#000', strokeWidth: 0.4 }),
              bars,
              h('text', { x: padL, y: padT + maxBarH + padB - 2, fontSize: '8', fill: '#444' }, '13w ago'),
              h('text', { x: padL + plotW / 2, y: padT + maxBarH + padB - 2, fontSize: '8', fill: '#444', textAnchor: 'middle' }, '6w ago'),
              h('text', { x: W - padR, y: padT + maxBarH + padB - 2, fontSize: '8', fill: '#444', textAnchor: 'end' }, 'now')
            ),
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', fontSize: '9px', color: '#444' } },
              MOOD_OPTIONS.map(function(m) {
                return h('span', { key: 'plg-' + m.id, style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } },
                  h('span', { style: { width: '8px', height: '8px', background: moodGray[m.id], border: '1px solid #000', display: 'inline-block' } }),
                  h('span', null, m.label)
                );
              })
            )
          );
        })(),
        // Mood distribution (Phase 2m) — affective-domain insight for
        // parents/clinicians: which moods does the student tag their
        // earnings with most? Shows only when ≥1 decoration has a mood.
        (function() {
          var moodCounts = {};
          state.decorations.forEach(function(d) {
            if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
          });
          var moodTagged = Object.keys(moodCounts).length;
          if (moodTagged === 0) return null;
          var totalTagged = state.decorations.filter(function(d) { return !!d.mood; }).length;
          return h('div', { style: { marginBottom: '20px', padding: '10px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', color: '#222' } },
            h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, '🎭 Mood distribution · ' + totalTagged + ' tagged decoration' + (totalTagged === 1 ? '' : 's')),
            h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
              MOOD_OPTIONS.map(function(m) {
                var n = moodCounts[m.id] || 0;
                if (n === 0) return null;
                return h('span', {
                  key: 'pmd-' + m.id,
                  style: { fontSize: '11px', color: '#222' }
                }, m.emoji + ' ' + m.label + ': ' + n);
              })
            )
          );
        })(),
        // Subject distribution (Phase 2p.6) — academic-domain coverage
        // for IEP review. Shows only when ≥1 decoration has a subject.
        (function() {
          var subjCounts = {};
          state.decorations.forEach(function(d) {
            (d.subjects || []).forEach(function(sid) {
              subjCounts[sid] = (subjCounts[sid] || 0) + 1;
            });
          });
          var subjTagged = Object.keys(subjCounts).length;
          if (subjTagged === 0) return null;
          var totalTaggedDecs = state.decorations.filter(function(d) {
            return Array.isArray(d.subjects) && d.subjects.length > 0;
          }).length;
          return h('div', { style: { marginBottom: '20px', padding: '10px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', color: '#222' } },
            h('div', { style: { fontWeight: 700, marginBottom: '6px' } },
              '📚 Subject coverage · ' + totalTaggedDecs + ' tagged decoration' + (totalTaggedDecs === 1 ? '' : 's')),
            h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
              SUBJECT_TAGS.map(function(s) {
                var n = subjCounts[s.id] || 0;
                if (n === 0) return null;
                return h('span', {
                  key: 'psd-' + s.id,
                  style: { fontSize: '11px', color: '#222' }
                }, s.emoji + ' ' + s.label + ': ' + n);
              })
            )
          );
        })(),
        // Companion + Skills (Phase 2p)
        (function() {
          if (state.printOptions && state.printOptions.companion === false) return null;
          var companion = state.companion;
          if (!companion || !companion.species) return null;
          var sp = getCompanionSpecies(companion.species);
          var swatch = getCompanionPalette(companion.species, companion.colorVariant || 'warm');
          var daysAgo = companion.createdAt
            ? Math.floor((Date.now() - new Date(companion.createdAt).getTime()) / (24 * 60 * 60 * 1000))
            : 0;
          var skills = SKILL_DEFS.map(function(def) {
            var c = countSkillEvents(state, def.id);
            return { def: def, prog: computeSkillLevel(c), count: c };
          });
          var hasSkillData = skills.some(function(s) { return s.count > 0; });
          return h('div', { style: { marginBottom: '20px', padding: '12px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', color: '#222' } },
            h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: hasSkillData ? '10px' : 0 } },
              h('div', { style: { width: '50px', height: '50px', flexShrink: 0 } },
                getCompanionSvg(companion.species, swatch, { blinking: false })
              ),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: '12px', color: '#000' } },
                  '🌿 ' + (companion.name || sp.label) + ' · ' + sp.label),
                h('div', { style: { fontSize: '10px', color: '#444' } },
                  daysAgo === 0 ? 'Joined today' : daysAgo === 1 ? 'Joined yesterday' : 'Joined ' + daysAgo + ' days ago')
              )
            ),
            hasSkillData ? h('div', null,
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#000', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Skill levels'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px 14px' } },
                skills.map(function(s) {
                  return h('div', { key: 'pps-' + s.def.id, style: { fontSize: '10px', color: '#222' } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '2px' } },
                      h('span', { style: { fontWeight: 700 } }, s.def.label),
                      h('span', null, 'L' + s.prog.level + (s.prog.atMax ? ' max' : ' · ' + s.prog.current + '/' + s.prog.nextThreshold))
                    ),
                    h('div', { style: { height: '3px', background: '#ddd', border: '1px solid #999', borderRadius: '2px', overflow: 'hidden' } },
                      h('div', { style: { width: s.prog.pct + '%', height: '100%', background: '#888' } })
                    )
                  );
                })
              )
            ) : null
          );
        })(),
        // Recent achievements (Phase 2p.5) — last 30 days, newest first
        (function() {
          if (state.printOptions && state.printOptions.achievements === false) return null;
          var ach = state.achievements || {};
          var nowMs = Date.now();
          var thirty = 30 * 24 * 60 * 60 * 1000;
          var recent = ACHIEVEMENT_CATALOG.filter(function(a) {
            if (!ach[a.id]) return false;
            var t = new Date(ach[a.id].unlockedAt).getTime();
            return (nowMs - t) <= thirty;
          });
          recent.sort(function(a, b) {
            return (ach[b.id].unlockedAt || '').localeCompare(ach[a.id].unlockedAt || '');
          });
          if (recent.length === 0) return null;
          var totalUnlocked = Object.keys(ach).length;
          return h('div', { style: { marginBottom: '20px', padding: '10px 14px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', color: '#222' } },
            h('div', { style: { fontWeight: 700, marginBottom: '6px', fontSize: '12px', color: '#000' } },
              '🏆 Recent achievements · ' + recent.length + ' in last 30 days · ' + totalUnlocked + '/' + ACHIEVEMENT_CATALOG.length + ' total'),
            h('ul', { style: { listStyle: 'none', padding: 0, margin: 0 } },
              recent.map(function(a) {
                return h('li', { key: 'pa-' + a.id, style: { fontSize: '11px', color: '#222', marginBottom: '3px' } },
                  a.emoji + ' ' + a.label,
                  h('span', { style: { color: '#666', fontStyle: 'italic', marginLeft: '6px' } },
                    '· ' + new Date(ach[a.id].unlockedAt).toLocaleDateString())
                );
              })
            )
          );
        })(),
        // Goals section (Phase 2n) — active + recently-completed
        (function() {
          if (state.printOptions && state.printOptions.goals === false) return null;
          var goals = state.goals || [];
          var nowMs = Date.now();
          var activeOrCompleted = goals.filter(function(g) {
            if (g.completedAt) {
              return new Date(g.completedAt).getTime() >= nowMs - 30 * 24 * 60 * 60 * 1000;
            }
            var endMs = g.endDate ? new Date(g.endDate).getTime() : Infinity;
            return endMs >= nowMs;
          });
          if (activeOrCompleted.length === 0) return null;
          return h('div', { style: sectionStyle, className: 'ah-print-section' },
            h('h2', { style: sectionTitleStyle }, '🎯 Goals · ' + activeOrCompleted.length),
            activeOrCompleted.map(function(g) {
              var prog = computeGoalProgress(g, state);
              var metric = getGoalMetric(g.metric);
              var endLabel = g.endDate ? new Date(g.endDate).toLocaleDateString() : '?';
              var doneLabel = g.completedAt ? '✓ Completed ' + new Date(g.completedAt).toLocaleDateString() : '';
              return h('div', { key: 'pg-' + g.id, style: { marginBottom: '12px', padding: '8px 10px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px' } },
                h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#000', marginBottom: '2px' } },
                  (g.completedAt ? '✓ ' : '🎯 ') + g.title),
                h('div', { style: { fontSize: '10px', color: '#444', marginBottom: '4px' } },
                  (metric ? metric.label : g.metric) + ' · target ' + g.targetCount
                  + ' · ' + (g.completedAt ? doneLabel : 'due ' + endLabel)),
                // Progress bar (paper-friendly)
                h('div', { style: { height: '6px', background: '#e5e5e5', border: '1px solid #999', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' } },
                  h('div', { style: { width: prog.pct + '%', height: '100%', background: g.completedAt ? '#16a34a' : '#888' } })
                ),
                h('div', { style: { fontSize: '10px', color: '#444', fontVariantNumeric: 'tabular-nums' } },
                  prog.current + ' / ' + prog.target + ' · ' + prog.pct + '%'),
                g.notes ? h('div', { style: { fontSize: '10px', color: '#444', fontStyle: 'italic', marginTop: '4px' } }, '"' + g.notes + '"') : null
              );
            })
          );
        })(),
        // Decks section
        (state.printOptions && state.printOptions.memoryDecks === false) ? null :
        withContent.length > 0 ? h('div', { style: sectionStyle },
          h('h2', { style: sectionTitleStyle }, '📖 Memory Decks'),
          withContent.map(function(d) { return renderDeckPrint(d); })
        ) : null,
        // Stories section
        (state.printOptions && state.printOptions.stories === false) ? null :
        allStories.length > 0 ? h('div', {
          style: sectionStyle,
          className: withContent.length > 5 ? 'ah-print-page-break' : ''
        },
          h('h2', { style: sectionTitleStyle }, '📜 Stories'),
          allStories.map(function(s) { return renderStoryPrint(s); })
        ) : null,
        // Recent reflections
        (state.printOptions && state.printOptions.journals === false) ? null :
        recentJournals.length > 0 ? h('div', { style: sectionStyle },
          h('h2', { style: sectionTitleStyle }, '📝 Recent Reflections (last ' + recentJournals.length + ')'),
          recentJournals.map(function(j) {
            return h('div', { key: 'pj-' + j.id, className: 'ah-print-section', style: { marginBottom: '10px' } },
              h('p', { style: smallMetaStyle },
                (j.date ? new Date(j.date).toLocaleDateString() : 'Undated')
                + (j.prompt ? ' · prompt: "' + j.prompt + '"' : '')),
              h('p', { style: Object.assign({}, bodyTextStyle, { whiteSpace: 'pre-wrap', margin: '2px 0' }) },
                '"' + (j.text || '') + '"')
            );
          })
        ) : null,
        // Footer
        h('div', { style: { marginTop: '24px', paddingTop: '10px', borderTop: '1px solid #999', fontSize: '9px', color: '#666', textAlign: 'center' } },
          'AlloHaven · cozy-room learning portfolio · printed ' + dateStr,
          h('br'),
          'Earn tokens by focusing or reflecting; spend on decorations; attach memory content to grow a method-of-loci anchor.'
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
      renderClinicalReviewModal(),
      renderStoriesListModal(),
      renderStoryBuilderModal(),
      renderStoryWalkModal(),
      renderGoalsListModal(),
      renderGoalBuilderModal(),
      renderAchievementsModal(),
      renderTenureRecapModal(),
      renderCompanionSetupModal(),
      renderTourModal(),
      renderReviewQueueSummaryModal(),
      renderWeeklySummaryModal(),
      renderSearchModal(),
      renderReflectionModal(),
      renderJournalModal(),
      renderInsightsModal(),
      renderDeleteDecorationModal(),
      renderSettingsModal(),
      renderBreathingModal(),
      renderGroundingModal(),
      renderCompanionPhrasesModal(),
      renderPrintOptionsModal(),
      renderArcadeHubModal(),
      renderWelcomeBackdrop(),
      renderWelcomeCard(),
      // Print packet — portaled to body so the @media print rule's
      // "hide everything but .ah-print-packet" works regardless of the
      // ah-root fixed overlay's positioning + overflow context.
      (function() {
        var ReactDOM = window.ReactDOM;
        if (ReactDOM && ReactDOM.createPortal && typeof document !== 'undefined' && document.body) {
          return ReactDOM.createPortal(renderPrintPacket(), document.body);
        }
        return renderPrintPacket();
      })()
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 8: EXPORT
  // ─────────────────────────────────────────────────────────
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloHaven = AlloHaven;
  console.log('[CDN] AlloHaven loaded');

})();
