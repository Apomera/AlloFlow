// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_allohaven.js — AlloHaven: cozy-room meta-experience.
//
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
// Sibling to AlloBot Sage — different student personalities (combat-RPG
// vs sanctuary). Both eventually read shared `ctx.toolData` cross-tool data.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('alloHaven'))) {

(function() {
  'use strict';
  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
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
  // SECTION 1: DEFAULT STATE SHAPE
  // ─────────────────────────────────────────────────────────
  // The state model is designed so v2+ cross-tool integrations don't require
  // a refactor. Object-shaped fields like `decorations[]` carry extension
  // slots (`linkedContent`, `sourceTool`, `aiRationale`) that are null in v1
  // but meaningful in v2+. Same for `earnings[]` — `source` is just
  // 'pomodoro' or 'reflection' in v1; future sources slot in additively.
  var DEFAULT_STATE = {
    view: 'room',

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
      promptsForToday: []            // array of 3 prompt ids selected at first visit of day
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

    // ── Active modal ──
    activeModal: null,               // 'generate' | 'reflection' | 'journal' | 'settings' | null
    generateContext: null            // { surface, cellIndex } when generate modal open
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: THEME BASES
  // ─────────────────────────────────────────────────────────
  // Each theme's wallpaper + floor texture. AlloHaven inherits the active
  // theme from ctx.toolData (set by Typing Practice's quick-switcher or
  // any other tool's theme picker). Decorations stay theme-neutral; only
  // the room base swaps. Switching themes feels like changing paint, not
  // destroying the student's stuff.
  var THEME_BASES = {
    'default': {
      wallpaper: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      floor: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
      accent: '#60a5fa',
      accentDim: '#3b82f6',
      text: '#e2e8f0',
      textDim: '#cbd5e1',
      textMute: '#a3a3a3',
      surface: '#1e293b',
      border: '#334155',
      success: '#34d399',
      warn: '#fbbf24',
      onAccent: '#0f172a',
      bg: '#0f172a'
    },
    'steampunk': {
      wallpaper: 'repeating-linear-gradient(0deg, #2d1f12 0px, #2d1f12 24px, #3d2d1c 24px, #3d2d1c 25px), linear-gradient(180deg, #2d1f12 0%, #1a1108 100%)',
      floor: 'repeating-linear-gradient(90deg, #3d2d1c 0px, #3d2d1c 32px, #2d1f12 32px, #2d1f12 33px), linear-gradient(180deg, #3d2d1c 0%, #2d1f12 100%)',
      accent: '#d4884c',
      accentDim: '#a66a35',
      text: '#f0e0c0',
      textDim: '#d4bc8a',
      textMute: '#a08868',
      surface: '#2d1f12',
      border: '#5a4528',
      success: '#88a850',
      warn: '#e8a040',
      onAccent: '#1a1108',
      bg: '#1a1108'
    },
    'cyberpunk': {
      wallpaper: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,0,168,0.04) 3px, rgba(255,0,168,0.04) 4px), linear-gradient(180deg, #1a0f2a 0%, #0a0514 100%)',
      floor: 'linear-gradient(180deg, #2a1f3a 0%, #1a0f2a 100%)',
      accent: '#ff00a8',
      accentDim: '#c00080',
      text: '#e0d8ff',
      textDim: '#c0b0e8',
      textMute: '#8070a0',
      surface: '#1a0f2a',
      border: '#3d2a5a',
      success: '#00ffc8',
      warn: '#ffd700',
      onAccent: '#0a0514',
      bg: '#0a0514'
    },
    'kawaii': {
      wallpaper: 'radial-gradient(circle at 20% 30%, rgba(232,90,138,0.08) 8px, transparent 9px), radial-gradient(circle at 70% 60%, rgba(232,90,138,0.06) 6px, transparent 7px), linear-gradient(180deg, #ffe8f2 0%, #fff5fa 100%)',
      floor: 'linear-gradient(180deg, #ffd6e5 0%, #ffe8f2 100%)',
      accent: '#e85a8a',
      accentDim: '#c03868',
      text: '#4a2838',
      textDim: '#6a4858',
      textMute: '#8a7080',
      surface: '#ffe8f2',
      border: '#f5c2d7',
      success: '#4a9a6a',
      warn: '#d4740a',
      onAccent: '#ffffff',
      bg: '#fff5fa'
    },
    'neutral': {
      wallpaper: 'linear-gradient(180deg, #262626 0%, #1a1a1a 100%)',
      floor: 'linear-gradient(180deg, #363636 0%, #262626 100%)',
      accent: '#b8a080',
      accentDim: '#8a7860',
      text: '#e8e8e8',
      textDim: '#c8c8c8',
      textMute: '#989898',
      surface: '#262626',
      border: '#444444',
      success: '#8aa078',
      warn: '#c89860',
      onAccent: '#1a1a1a',
      bg: '#1a1a1a'
    }
  };

  // High-contrast mode trumps any theme. WCAG-AA + accessibility-first.
  var HIGH_CONTRAST_BASE = {
    wallpaper: '#000000',
    floor: '#000000',
    accent: '#ffff00',
    accentDim: '#ffee00',
    text: '#ffffff',
    textDim: '#ffffff',
    textMute: '#ffff00',
    surface: '#111111',
    border: '#ffffff',
    success: '#00ff00',
    warn: '#ffaa00',
    onAccent: '#000000',
    bg: '#000000'
  };

  function getThemeBase(themeName, highContrast) {
    if (highContrast) return HIGH_CONTRAST_BASE;
    return THEME_BASES[themeName] || THEME_BASES['default'];
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3: STARTER FERN — hardcoded SVG so Day 1 has a
  // friendly placed item without requiring AI image generation.
  // The fern is treated as a real decoration record but with
  // imageBase64 set to a data URI of an inline SVG.
  // ─────────────────────────────────────────────────────────
  var STARTER_FERN_SVG = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">',
    // Pot — terracotta
    '<path d="M28 60 L32 92 L68 92 L72 60 Z" fill="#c87850" stroke="#8a4a2a" stroke-width="1.5"/>',
    '<rect x="26" y="56" width="48" height="8" fill="#a66238" stroke="#8a4a2a" stroke-width="1.5"/>',
    // Fern fronds — green stylized leaves
    '<path d="M50 56 Q50 30 35 18 Q42 28 40 50 M50 56 Q50 30 65 18 Q58 28 60 50" fill="none" stroke="#4a8a4a" stroke-width="3" stroke-linecap="round"/>',
    '<path d="M50 56 Q50 36 28 28 Q36 38 38 54 M50 56 Q50 36 72 28 Q64 38 62 54" fill="none" stroke="#5aa050" stroke-width="2.5" stroke-linecap="round"/>',
    '<path d="M50 56 Q50 42 22 42 Q32 48 38 56 M50 56 Q50 42 78 42 Q68 48 62 56" fill="none" stroke="#5aa050" stroke-width="2" stroke-linecap="round"/>',
    // Center stem
    '<path d="M50 56 L50 22" stroke="#3a7a3a" stroke-width="2.5" stroke-linecap="round"/>',
    // Highlight on pot
    '<ellipse cx="36" cy="64" rx="3" ry="6" fill="rgba(255,255,255,0.18)"/>',
    '</svg>'
  ].join('');

  function getStarterFernDataUri() {
    return 'data:image/svg+xml;base64,' + (typeof btoa !== 'undefined' ? btoa(STARTER_FERN_SVG) : '');
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 4: STYLE INJECTION — animations + theme hooks
  // Single style tag, scoped to .ah-root so it doesn't bleed.
  // ─────────────────────────────────────────────────────────
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allohaven-styles')) return;
    var style = document.createElement('style');
    style.id = 'allohaven-styles';
    style.textContent = [
      // Focus ring (WCAG-AA)
      '.ah-root button:focus-visible,',
      '.ah-root [tabindex]:focus-visible,',
      '.ah-root [role="button"]:focus-visible,',
      '.ah-root input:focus-visible,',
      '.ah-root textarea:focus-visible {',
      '  outline: 3px solid #fbbf24;',
      '  outline-offset: 2px;',
      '  border-radius: 8px;',
      '}',
      // Token tick animation — pulse on earn/spend
      '@keyframes ah-token-tick { 0% { opacity: 0.55; transform: scale(0.92); } 40% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }',
      '.ah-root .ah-token-tick { display: inline-block; animation: ah-token-tick 220ms ease-out 1; }',
      // Decoration hover lift
      '.ah-root .ah-decoration { transition: transform 160ms ease, filter 200ms ease; cursor: pointer; }',
      '.ah-root .ah-decoration:hover, .ah-root .ah-decoration:focus-visible { transform: translateY(-2px); filter: brightness(1.06); }',
      // Empty cell
      '.ah-root .ah-empty-cell { transition: background 140ms ease, border-color 140ms ease; cursor: pointer; }',
      '.ah-root .ah-empty-cell:hover, .ah-root .ah-empty-cell:focus-visible { background: rgba(255,255,255,0.06); }',
      // Welcome card fade-in
      '@keyframes ah-fade-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }',
      '.ah-root .ah-welcome { animation: ah-fade-in 320ms ease-out 1; }',
      // Reduced motion suppression
      '@media (prefers-reduced-motion: reduce) {',
      '  .ah-root .ah-token-tick,',
      '  .ah-root .ah-welcome { animation: none !important; }',
      '  .ah-root .ah-decoration:hover,',
      '  .ah-root .ah-decoration:focus-visible { transform: none !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  })();

  // ─────────────────────────────────────────────────────────
  // SECTION 5: REGISTER TOOL
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('alloHaven', {
    name: 'AlloHaven',
    icon: '🌿',
    category: 'life-skills',
    description: 'A cozy room you build by focusing and reflecting. Earn tokens, generate decorations with AI, and make a space that\'s yours.',
    tags: ['cozy', 'creative', 'reflection', 'pomodoro', 'mindfulness', 'self-regulation'],

    render: function(ctx) {
      try {
        var React = ctx.React;
        var h = React.createElement;
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useRef = React.useRef;

        // ── State plumbing ──
        // toolData persists across reloads via the host (ctx.toolData / ctx.update).
        // DEFAULT_STATE merge ensures new fields work for users who saved before this build.
        var rawState = ctx.toolData || {};
        var state = Object.assign({}, DEFAULT_STATE, rawState);
        // Deep-default object-shaped fields so partial saves don't crash
        state.toastsSeen      = Object.assign({}, DEFAULT_STATE.toastsSeen, state.toastsSeen || {});
        state.dailyState      = Object.assign({}, DEFAULT_STATE.dailyState, state.dailyState || {});
        state.pomodoroState   = Object.assign({}, DEFAULT_STATE.pomodoroState, state.pomodoroState || {});
        state.pomodoroPreferences = Object.assign({}, DEFAULT_STATE.pomodoroPreferences, state.pomodoroPreferences || {});
        if (!state.rooms || !state.rooms.length) state.rooms = DEFAULT_STATE.rooms.slice();
        if (!Array.isArray(state.decorations))    state.decorations    = [];
        if (!Array.isArray(state.journalEntries)) state.journalEntries = [];
        if (!Array.isArray(state.earnings))       state.earnings       = [];

        var upd      = function(key, value) { ctx.update && ctx.update(key, value); };
        var updMulti = function(obj) { ctx.updateMulti ? ctx.updateMulti(obj) : Object.keys(obj).forEach(function(k) { upd(k, obj[k]); }); };
        var addToast = ctx.addToast || function(msg) { console.log('[AlloHaven]', msg); };

        // ── Theme inherited from siblings ──
        // Read the theme set by Typing Practice (or any other tool's theme picker)
        // from the shared toolData root. AlloHaven follows whatever's active so
        // students don't manage a separate theme per tool.
        var globalToolData = (typeof ctx.getAllToolData === 'function')
          ? (ctx.getAllToolData() || {})
          : (ctx.allToolData || {});
        var typingPracticeData = globalToolData.typingPractice || {};
        var inheritedTheme = typingPracticeData.theme || 'default';
        var inheritedHighContrast = !!(typingPracticeData.accommodations && typingPracticeData.accommodations.highContrast);
        var palette = getThemeBase(inheritedTheme, inheritedHighContrast);

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
          upd('decorations', [starter]);
          // eslint-disable-next-line
        }, []);

        // ── Daily-state rollover ──
        // On each render, check if dailyState.date is today's date string.
        // If not, reset the per-day counters so caps refresh cleanly.
        useEffect(function() {
          var todayStr = new Date().toISOString().slice(0, 10);
          if (state.dailyState.date !== todayStr) {
            upd('dailyState', {
              date: todayStr,
              pomodorosCompleted: 0,
              reflectionsSubmitted: 0,
              promptsForToday: []
            });
          }
          // eslint-disable-next-line
        }, [state.dailyState.date]);

        // ─────────────────────────────────────────────────
        // VIEW: ROOM (the only view; modals layer on top)
        // ─────────────────────────────────────────────────
        function renderRoom() {
          var room = state.rooms[0]; // v1: single room
          var wallDecorations = state.decorations.filter(function(d) {
            return d.placement && d.placement.surface === 'wall' && d.placement.roomId === room.id;
          });
          var floorDecorations = state.decorations.filter(function(d) {
            return d.placement && d.placement.surface === 'floor' && d.placement.roomId === room.id;
          });
          // Map by cellIndex for quick lookup during grid render
          var wallByCell = {}; wallDecorations.forEach(function(d) { wallByCell[d.placement.cellIndex] = d; });
          var floorByCell = {}; floorDecorations.forEach(function(d) { floorByCell[d.placement.cellIndex] = d; });

          // Wall grid: 4 cols × 2 rows (8 slots)
          var wallCells = [];
          for (var w = 0; w < room.wallSlots; w++) {
            wallCells.push(renderCell(w, 'wall', wallByCell[w] || null, palette));
          }
          // Floor grid: 6 cols × 2 rows (12 slots)
          var floorCells = [];
          for (var f = 0; f < room.floorSlots; f++) {
            floorCells.push(renderCell(f, 'floor', floorByCell[f] || null, palette));
          }

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
            renderHeader(palette, state.tokens),
            // Wall surface
            h('div', {
              role: 'region',
              'aria-label': 'Wall — ' + wallDecorations.length + ' of ' + room.wallSlots + ' slots filled',
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
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gridTemplateRows: 'repeat(2, 80px)',
                  gap: '12px'
                }
              }, wallCells)
            ),
            // Floor surface
            h('div', {
              role: 'region',
              'aria-label': 'Floor — ' + floorDecorations.length + ' of ' + room.floorSlots + ' slots filled',
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
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gridTemplateRows: 'repeat(2, 90px)',
                  gap: '10px'
                }
              }, floorCells)
            ),
            // Phase 1a placeholder buttons — Phase 1b/1c/1d wire these up
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
                onClick: function() { upd('activeModal', 'pomodoro'); addToast('Pomodoro coming in Phase 1b'); },
                style: primaryBtnStyle(palette)
              }, '🍅 Start Pomodoro'),
              h('button', {
                onClick: function() { upd('activeModal', 'reflection'); addToast('Reflection coming in Phase 1c'); },
                style: secondaryBtnStyle(palette)
              }, '📝 Write reflection'),
              h('button', {
                onClick: function() { upd('activeModal', 'journal'); addToast('Journal log coming in Phase 1c'); },
                style: secondaryBtnStyle(palette)
              }, '📓 Journal'),
              h('button', {
                onClick: function() { upd('activeModal', 'settings'); addToast('Settings coming in Phase 1b'); },
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

        // Render a single grid cell — either an empty slot or a placed decoration.
        function renderCell(index, surface, decoration, palette) {
          if (decoration) {
            var rot = decoration.rotation || 0;
            return h('div', {
              key: surface + '-cell-' + index,
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Decoration: ' + (decoration.template || 'item'),
              className: 'ah-decoration',
              title: decoration.studentReflection || decoration.template,
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
                boxShadow: surface === 'floor' ? '0 3px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.2)'
              }
            },
              decoration.imageBase64 ? h('img', {
                src: decoration.imageBase64,
                alt: decoration.template || 'decoration',
                style: { width: '100%', height: '100%', objectFit: 'contain' }
              }) : h('span', { style: { fontSize: '24px', color: palette.textMute } }, '?'),
              // Starter badge (subtle)
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
              }, 'starter') : null
            );
          }
          // Empty cell
          return h('div', {
            key: surface + '-cell-' + index,
            role: 'button',
            tabIndex: 0,
            'aria-label': 'Empty ' + surface + ' slot ' + (index + 1) + ' — click to add a decoration',
            className: 'ah-empty-cell',
            onClick: function() {
              addToast('Decoration generation coming in Phase 1d (cell ' + index + ' on ' + surface + ')');
              // Phase 1d: updMulti({ activeModal: 'generate', generateContext: { surface: surface, cellIndex: index } });
            },
            onKeyDown: function(e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addToast('Decoration generation coming in Phase 1d (cell ' + index + ' on ' + surface + ')');
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

        // ─────────────────────────────────────────────────
        // HEADER — token counter + room title
        // ─────────────────────────────────────────────────
        function renderHeader(palette, tokens) {
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
            )
          );
        }

        // ─────────────────────────────────────────────────
        // WELCOME CARD — first-ever-visit only, dismissible
        // ─────────────────────────────────────────────────
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
              zIndex: 100,
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
            h('p', {
              style: { margin: '0 0 12px 0', fontSize: '14px', color: palette.textDim, lineHeight: '1.6' }
            }, 'This is your space. The plant is a starter gift.'),
            h('p', {
              style: { margin: '0 0 20px 0', fontSize: '14px', color: palette.textDim, lineHeight: '1.6' }
            },
              'Earn ',
              h('strong', { style: { color: palette.accent } }, '🪙 tokens'),
              ' by ',
              h('strong', null, 'focusing'),
              ' with the Pomodoro timer or ',
              h('strong', null, 'writing'),
              ' a reflection. Spend tokens on decorations to make the room yours.'
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', {
                onClick: function() { upd('onboardingSeen', true); },
                autoFocus: true,
                style: Object.assign({}, primaryBtnStyle(palette), { padding: '10px 28px', fontSize: '14px' })
              }, 'Got it')
            )
          );
        }

        // Welcome card backdrop — dims the room behind the dialog
        function renderWelcomeBackdrop() {
          if (state.onboardingSeen) return null;
          return h('div', {
            'aria-hidden': 'true',
            onClick: function() { upd('onboardingSeen', true); },
            style: {
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 99
            }
          });
        }

        // ─────────────────────────────────────────────────
        // RENDER — root
        // ─────────────────────────────────────────────────
        return h('div', {
          className: 'ah-root',
          style: {
            background: palette.bg,
            minHeight: '100%',
            color: palette.text
          }
        },
          renderRoom(),
          renderWelcomeBackdrop(),
          renderWelcomeCard()
        );
      } catch (err) {
        console.error('[AlloHaven] render error:', err);
        return ctx.React.createElement('div', {
          style: { padding: '20px', color: '#f87171', fontFamily: 'monospace' }
        }, 'AlloHaven crashed: ' + (err.message || 'unknown error') + '. Check console.');
      }
    }
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 6: STYLE HELPERS — primary + secondary buttons
  // ─────────────────────────────────────────────────────────
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
      fontFamily: 'inherit',
      transition: 'filter 120ms ease'
    };
  }
  function secondaryBtnStyle(palette) {
    return {
      background: 'transparent',
      color: palette.textDim,
      border: '1px solid ' + palette.border,
      borderRadius: '8px',
      padding: '8px 14px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'background 120ms ease, color 120ms ease'
    };
  }

})(); // end IIFE

} // end isRegistered guard
