// sel_hub_module.js — v1.0.0
// SEL Hub (Social-Emotional Learning) — plugin-only architecture
// All tools load as separate CDN-hashed files via window.SelHub.registerTool()
// Modeled after stem_lab_module.js but designed plugin-first (no inline tools).
(function () {
  if (window.AlloModules && window.AlloModules.SelHub) { console.log('[CDN] SelHub already loaded, skipping duplicate'); } else {
  // WCAG 2.4.3: Focus management for modal dialogs
  var _alloFocusTrigger = null;
  function alloSaveFocus() { _alloFocusTrigger = document.activeElement; }
  function alloRestoreFocus() { if (_alloFocusTrigger && typeof _alloFocusTrigger.focus === 'function') { try { _alloFocusTrigger.focus(); } catch(e) {} _alloFocusTrigger = null; } }


    // ── SelHub Plugin Registry ──
    // Initialize before plugins load so they can register immediately.
    // Plugins (sel_tool_*.js) call window.SelHub.registerTool(id, config)
    if (!window.SelHub) {
      window.SelHub = {
        _registry: {},
        _order: [],
        registerTool: function(id, config) {
          config.id = id;
          config.ready = config.ready !== false;
          // Normalize legacy field-name aliases + defaults (see stem_lab_module.js for rationale)
          if (!config.label) config.label = config.title || config.name || id;
          if (!config.desc) config.desc = config.description || '';
          if (!config.color) config.color = 'slate';
          if (!config.category) config.category = 'general';
          this._registry[id] = config;
          if (this._order.indexOf(id) === -1) this._order.push(id);
          console.log('[SelHub] Registered tool: ' + id);
        },
        getRegisteredTools: function() {
          var self = this;
          return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
        },
        isRegistered: function(id) { return !!this._registry[id]; },
        renderTool: function(id, ctx) {
          var tool = this._registry[id];
          if (!tool || !tool.render) return null;
          try { return tool.render(ctx); } catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; }
        }
      };
    }

    // ── WCAG 2.1 AA: Accessibility CSS ──
    if (!document.getElementById('sel-a11y-css')) {
      var selA11yStyle = document.createElement('style');
      selA11yStyle.id = 'sel-a11y-css';
      selA11yStyle.textContent = [
        '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
        '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 select:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #8b5cf6 !important; outline-offset: 2px !important; border-radius: 4px; }',
        '.fixed.inset-0 :focus:not(:focus-visible) { outline: none !important; }'
      ].join('\n');
      document.head.appendChild(selA11yStyle);
    }

    // ── CASEL 5 Competency Categories ──
    // Tools are organized by the CASEL framework competencies.
    // Each tool declares its category; the hub groups them under these headers.
    var SEL_CATEGORIES = [
      { id: 'self-awareness',             label: 'Self-Awareness',             icon: '\uD83E\uDDE0', desc: 'Recognizing emotions, strengths, and areas for growth' },
      { id: 'self-management',            label: 'Self-Management',            icon: '\uD83C\uDFAF', desc: 'Regulating emotions, setting goals, and self-discipline' },
      { id: 'social-awareness',           label: 'Social Awareness',           icon: '\uD83E\uDD1D', desc: 'Empathy, perspective-taking, and appreciating diversity' },
      { id: 'relationship-skills',        label: 'Relationship Skills',        icon: '\uD83D\uDCAC', desc: 'Communication, teamwork, and conflict resolution' },
      { id: 'responsible-decision-making', label: 'Responsible Decision-Making', icon: '\u2696\uFE0F', desc: 'Ethical choices, evaluating consequences, and problem-solving' }
    ];

    // ── SEL Pathways (Curated Learning Sequences — equivalent to STEM Lab Stations) ──
    // Teachers can use these presets or create custom ones.
    // Each pathway filters the tool grid to show only relevant tools.
    var SEL_PATHWAYS = [
      { id: 'morning_check', name: 'Morning Check-In', icon: '\uD83C\uDF05', desc: 'Start the day with a mood check, breathing, and goal setting', tools: ['zones', 'mindfulness', 'goals', 'journal'], casel: 'self-awareness' },
      { id: 'calm_down', name: 'Calm Down Corner', icon: '\uD83E\uDDD8', desc: 'Regulation strategies for when emotions run high', tools: ['zones', 'coping', 'mindfulness'], casel: 'self-management' },
      { id: 'conflict_unit', name: 'Conflict Resolution Unit', icon: '\u2696\uFE0F', desc: 'Practice resolving disagreements and building repair skills', tools: ['conflict', 'conflicttheater', 'perspective', 'social', 'restorativeCircle'], casel: 'relationship-skills' },
      { id: 'empathy_week', name: 'Empathy & Perspective Week', icon: '\uD83D\uDC53', desc: 'Build empathy through perspective-taking and cultural awareness', tools: ['perspective', 'emotions', 'community', 'cultureExplorer'], casel: 'social-awareness' },
      { id: 'decision_making', name: 'Decision-Making Deep Dive', icon: '\uD83E\uDD14', desc: 'Practice ethical reasoning and responsible choices', tools: ['decisions', 'ethicalReasoning', 'safety'], casel: 'responsible-decision-making' },
      { id: 'self_discovery', name: 'Self-Discovery Journey', icon: '\u2728', desc: 'Explore who you are — strengths, emotions, and growth mindset', tools: ['strengths', 'emotions', 'growthmindset', 'compassion', 'advocacy'], casel: 'self-awareness' },
      { id: 'friendship', name: 'Friendship & Social Skills', icon: '\uD83E\uDD1D', desc: 'Build healthy friendships and communication skills', tools: ['social', 'friendship', 'teamwork', 'peersupport'], casel: 'relationship-skills' },
      { id: 'transitions', name: 'Navigating Change', icon: '\uD83C\uDF31', desc: 'Support students through life transitions and new experiences', tools: ['transitions', 'coping', 'journal', 'goals'], casel: 'self-management' },
    ];

    // ── Grade-Level Complexity Helpers ──
    // Tools call these to adapt vocabulary, scenario depth, and abstraction.
    // gradeLevel comes from the parent app (e.g. "K", "3rd Grade", "6-8", "9-12").
    function gradeBand(gradeLevel) {
      if (!gradeLevel) return 'elementary';
      var g = String(gradeLevel).toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (/^[k012]|pre|kinder/.test(g)) return 'elementary';
      if (/^[345]/.test(g))             return 'elementary';
      if (/^[678]|middle|6-8/.test(g))  return 'middle';
      return 'high'; // 9-12, high, etc.
    }

    window.AlloModules = window.AlloModules || {};
    window.AlloModules.SelHub = function SelHubModal(props) {
      var React = (typeof window !== 'undefined' && window.React) || require('react');
      var h = React.createElement;

      // ── Props from parent app ──
      var showSelHub      = props.showSelHub;
      var setShowSelHub   = props.setShowSelHub;
      var selHubTab       = props.selHubTab || 'explore';
      var setSelHubTab    = props.setSelHubTab;
      var selHubTool      = props.selHubTool || null;
      var setSelHubTool   = props.setSelHubTool;
      var addToast        = props.addToast;
      var gradeLevel      = props.gradeLevel || '5th Grade';
      var callGemini      = props.callGemini;
      var callTTS         = props.callTTS;
      var callImagen      = props.callImagen;
      var callGeminiVision = props.callGeminiVision;
      var onSafetyFlag    = props.onSafetyFlag || null; // connects to main app's handleAiSafetyFlag
      var studentCodename = props.studentCodename || 'student';
      var t               = props.t || function(k) { return k; };

      // Lucide icons from parent
      var ArrowLeft    = props.ArrowLeft;
      var X            = props.X;
      var Sparkles     = props.Sparkles;
      var Heart        = props.Heart;
      var GripVertical = props.GripVertical;

      // ── Hub-Level State ──
      var _selToolData  = React.useState({});
      var selToolData   = _selToolData[0];
      var setSelToolData = _selToolData[1];

      var _selToolSearch  = React.useState('');
      var selToolSearch   = _selToolSearch[0];
      var setSelToolSearch = _selToolSearch[1];

      // Category filter (CASEL competencies)
      var _selCategoryFilter = React.useState(null); // null = show all
      var selCategoryFilter = _selCategoryFilter[0];
      var setSelCategoryFilter = _selCategoryFilter[1];

      // SEL Pathway state (teacher-configured curated sequences)
      var _selPathway = React.useState(null); // { name, tools[], objectives[] }
      var activePathway = _selPathway[0];
      var setActivePathway = _selPathway[1];
      var _selPathwayProgress = React.useState({});
      var pathwayProgress = _selPathwayProgress[0];
      var setPathwayProgress = _selPathwayProgress[1];

      // Tool snapshots (save/load)
      var _selSnapshots = React.useState([]);
      var selSnapshots  = _selSnapshots[0];
      var setSelSnapshots = _selSnapshots[1];

      // XP system
      var _selXp = React.useState(0);
      var selXp  = _selXp[0];
      var setSelXp = _selXp[1];

      function awardSelXP(amount) {
        var pts = amount || 5;
        setSelXp(function(prev) { return prev + pts; });
        if (typeof addToast === 'function') addToast('+' + pts + ' SEL XP!', 'success');
      }

      function getSelXP() { return selXp; }

      // ── SEL Stations (custom teacher-authored bundles, parallel to STEM Lab Stations) ──
      // Pulls from props.activeStation when parent passes one (e.g. clicked from sidebar).
      // Otherwise reads/writes localStorage 'alloflow_sel_stations'.
      var SEL_QUEST_TYPES = [
        { id: 'xpThreshold',    label: 'Earn SEL XP',     icon: '⭐', paramLabel: 'XP Target', defaultVal: 30, unit: 'XP' },
        { id: 'timeSpent',      label: 'Spend Time',      icon: '⏱', paramLabel: 'Minutes',   defaultVal: 5,  unit: 'min' },
        { id: 'freeResponse',   label: 'Reflection',      icon: '✍️', paramLabel: 'Min Characters', defaultVal: 30, unit: 'chars' },
        { id: 'manualComplete', label: 'Mark Complete',   icon: '✅', paramLabel: '',          defaultVal: '', unit: '' }
      ];

      var _savedStations = React.useState(function () {
        try { return JSON.parse(localStorage.getItem('alloflow_sel_stations') || '[]'); } catch (e) { return []; }
      });
      var savedStations = _savedStations[0]; var setSavedStations = _savedStations[1];

      // ── Engagement state: daily streak + per-tool usage counts ──
      // Persistence model:
      //   1. localStorage works in normal browsers AND within a single
      //      Canvas session — but Canvas wipes localStorage between sessions.
      //   2. The host's executeSaveFile / handleLoadProject pipeline picks up
      //      `window.__alloflowSelEngagement` and serializes it into the
      //      project JSON, which IS preserved across Canvas sessions.
      //   3. On mount we prefer the window slot (means a project was just
      //      loaded), then fall back to localStorage. We mirror every change
      //      back to both so the next save round-trip and the next session
      //      both work.
      function _selReadInitial() {
        try {
          if (typeof window !== 'undefined' && window.__alloflowSelEngagement) {
            return window.__alloflowSelEngagement;
          }
        } catch (e) {}
        var streak = { count: 0, longest: 0, lastDate: null };
        var toolUsage = {};
        try {
          var rawS = JSON.parse(localStorage.getItem('alloflow_sel_streak') || '{}');
          streak = { count: rawS.count || 0, longest: rawS.longest || 0, lastDate: rawS.lastDate || null };
        } catch (e) {}
        try {
          toolUsage = JSON.parse(localStorage.getItem('alloflow_sel_tool_usage') || '{}') || {};
        } catch (e) {}
        return { streak: streak, toolUsage: toolUsage };
      }
      var _selInitial = _selReadInitial();
      var _selStreak = React.useState(_selInitial.streak || { count: 0, longest: 0, lastDate: null });
      var selStreak = _selStreak[0]; var setSelStreak = _selStreak[1];

      var _selToolUsage = React.useState(_selInitial.toolUsage || {});
      var selToolUsage = _selToolUsage[0]; var setSelToolUsage = _selToolUsage[1];

      // Mirror state changes to the window slot so the host save flow can
      // serialize it into the project JSON. The _ts stamp lets the host
      // skip emitting a SEL block when nothing has changed.
      React.useEffect(function () {
        try {
          window.__alloflowSelEngagement = { streak: selStreak, toolUsage: selToolUsage, _ts: Date.now() };
        } catch (e) {}
      }, [selStreak, selToolUsage]);

      // Hot-reload from a project JSON load mid-session: misc_handlers
      // dispatches this event after writing window.__alloflowSelEngagement.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowSelEngagement || {};
            if (w.streak) setSelStreak(w.streak);
            if (w.toolUsage) setSelToolUsage(w.toolUsage);
          } catch (e) {}
        }
        window.addEventListener('alloflow-sel-engagement-restored', onRestore);
        return function () { window.removeEventListener('alloflow-sel-engagement-restored', onRestore); };
      }, []);

      var _activeStationId = React.useState(null);
      var activeStationId = _activeStationId[0]; var setActiveStationId = _activeStationId[1];
      var activeStation = (function () {
        if (!activeStationId) return null;
        return savedStations.find(function (s) { return s.id === activeStationId; }) || null;
      })();

      var _questProgress = React.useState(function () {
        try { return JSON.parse(localStorage.getItem('alloflow_sel_station_progress') || '{}'); } catch (e) { return {}; }
      });
      var questProgress = _questProgress[0]; var setQuestProgress = _questProgress[1];

      // Builder state — only used in teacher mode
      var _builderOpen = React.useState(false);
      var builderOpen = _builderOpen[0]; var setBuilderOpen = _builderOpen[1];
      var _builderName = React.useState('');
      var builderName = _builderName[0]; var setBuilderName = _builderName[1];
      var _builderNote = React.useState('');
      var builderNote = _builderNote[0]; var setBuilderNote = _builderNote[1];
      var _builderTools = React.useState({});
      var builderTools = _builderTools[0]; var setBuilderTools = _builderTools[1];
      var _builderQuests = React.useState([]);
      var builderQuests = _builderQuests[0]; var setBuilderQuests = _builderQuests[1];

      // Persist saved stations to localStorage whenever they change.
      React.useEffect(function () {
        try { localStorage.setItem('alloflow_sel_stations', JSON.stringify(savedStations)); } catch (e) {}
      }, [savedStations]);

      // Persist quest progress to localStorage whenever it changes.
      React.useEffect(function () {
        try { localStorage.setItem('alloflow_sel_station_progress', JSON.stringify(questProgress)); } catch (e) {}
      }, [questProgress]);

      // ── Daily streak tick ──
      // When the SEL Hub opens on a new calendar day, increment the streak
      // (or reset to 1 if the gap is > 1 day). Same-day re-opens are no-ops.
      React.useEffect(function () {
        if (!showSelHub) return;
        var today = new Date().toDateString();
        if (selStreak.lastDate === today) return;
        var newCount = 1;
        if (selStreak.lastDate) {
          var diffMs = new Date(today).getTime() - new Date(selStreak.lastDate).getTime();
          var diffDays = Math.round(diffMs / 86400000);
          if (diffDays === 1) newCount = (selStreak.count || 0) + 1;
        }
        var next = { count: newCount, longest: Math.max(newCount, selStreak.longest || 0), lastDate: today };
        setSelStreak(next);
        try { localStorage.setItem('alloflow_sel_streak', JSON.stringify(next)); } catch (e) {}
      }, [showSelHub]);

      // Helper: record a tool-open event so we can surface "Continue" and
      // "New" indicators. Called from the tool-card click handler.
      function trackToolOpen(toolId) {
        if (!toolId) return;
        setSelToolUsage(function (prev) {
          var prior = prev[toolId] || { count: 0 };
          var next = Object.assign({}, prev);
          next[toolId] = { count: (prior.count || 0) + 1, lastUsed: Date.now() };
          try { localStorage.setItem('alloflow_sel_tool_usage', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }

      // Sync activeStation prop from parent (e.g. resource-history click).
      React.useEffect(function () {
        if (props.activeStation && props.activeStation.id) {
          setActiveStationId(props.activeStation.id);
          // If parent passed a station we don't have in localStorage, persist it.
          var existing = savedStations.find(function (s) { return s.id === props.activeStation.id; });
          if (!existing) setSavedStations(savedStations.concat([props.activeStation]));
        }
      }, [props.activeStation && props.activeStation.id]);

      // Tick a "time spent" timer every 30s while a tool is active (for timeSpent quests).
      React.useEffect(function () {
        if (!activeStation || !selHubTool) return;
        var timeQuests = (activeStation.quests || []).filter(function (q) { return q.type === 'timeSpent' && q.toolId === selHubTool; });
        if (timeQuests.length === 0) return;
        var interval = setInterval(function () {
          setQuestProgress(function (prev) {
            var next = Object.assign({}, prev);
            var sp = Object.assign({}, next[activeStation.id] || {});
            timeQuests.forEach(function (q) {
              var qp = Object.assign({}, sp[q.qid] || {});
              qp.timeAccumMs = (qp.timeAccumMs || 0) + 30000;
              sp[q.qid] = qp;
            });
            next[activeStation.id] = sp;
            return next;
          });
        }, 30000);
        return function () { clearInterval(interval); };
        // activeStation is in deps so a teacher-edit to the quest list refreshes
        // the captured timeQuests instead of relying on a stale closure.
      }, [selHubTool, activeStationId, activeStation]);

      // Auto-evaluate xpThreshold + timeSpent quests on relevant changes.
      React.useEffect(function () {
        if (!activeStation || !activeStation.quests) return;
        setQuestProgress(function (prev) {
          var sp = Object.assign({}, prev[activeStation.id] || {});
          var changed = false;
          activeStation.quests.forEach(function (q) {
            var qp = Object.assign({}, sp[q.qid] || {});
            if (qp.complete) return;
            var done = false;
            if (q.type === 'xpThreshold') {
              done = selXp >= (q.params && q.params.threshold || 30);
            } else if (q.type === 'timeSpent') {
              done = (qp.timeAccumMs || 0) >= (q.params && q.params.minutes || 5) * 60000;
            } else if (q.type === 'freeResponse') {
              done = (qp.response || '').length >= (q.params && q.params.minLength || 30);
            } else if (q.type === 'manualComplete') {
              done = !!qp.markedComplete;
            }
            if (done && !qp.complete) {
              qp.complete = true;
              qp.completedAt = new Date().toISOString();
              sp[q.qid] = qp;
              changed = true;
            }
          });
          if (!changed) return prev;
          var next = Object.assign({}, prev);
          next[activeStation.id] = sp;
          return next;
        });
      }, [selXp, activeStationId, questProgress]);

      function _selQuestAutoLabel(type, toolId, params) {
        var toolName = 'this hub';
        if (toolId && window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]) {
          toolName = window.SelHub._registry[toolId].name || toolId;
        }
        switch (type) {
          case 'xpThreshold':    return 'Earn ' + ((params && params.threshold) || 30) + ' SEL XP overall';
          case 'timeSpent':      return 'Spend ' + ((params && params.minutes) || 5) + ' minutes in ' + toolName;
          case 'freeResponse':   return (params && params.prompt) || 'Write a reflection';
          case 'manualComplete': return 'Complete the activity in ' + toolName;
          default: return 'Complete a quest';
        }
      }

      // Re-entrancy guard: a fast double-click on Save would otherwise create
      // two stations with different Date.now() ids but identical content.
      var _savingStation = React.useRef(false);
      function _saveBuilderAsStation() {
        if (_savingStation.current) return;
        var selectedToolIds = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
        if (selectedToolIds.length === 0) {
          if (typeof addToast === 'function') addToast('Pick at least one tool first', 'info');
          return;
        }
        _savingStation.current = true;
        try {
          var station = {
            id: 'sel_station_' + Date.now(),
            name: (builderName.trim() || 'Custom SEL Station'),
            tools: selectedToolIds,
            teacherNote: builderNote,
            quests: builderQuests.map(function (q, i) {
              return Object.assign({}, q, { qid: q.qid || ('q_' + i + '_' + Date.now()) });
            }),
            createdAt: new Date().toISOString(),
            source: 'sel-hub-builder'
          };
          setSavedStations(savedStations.concat([station]));
          setActiveStationId(station.id);
          // Reset builder
          setBuilderName(''); setBuilderNote(''); setBuilderTools({}); setBuilderQuests([]);
          setBuilderOpen(false);
          if (typeof addToast === 'function') addToast('SEL Station saved!', 'success');
          announceToSR('Custom SEL Station saved and activated.');
          // Surface to parent so the resource sidebar can show it.
          if (typeof props.onSaveStation === 'function') props.onSaveStation(station);
        } finally {
          _savingStation.current = false;
        }
      }

      // ── Accessibility Helpers ──
      function announceToSR(msg) {
        var el = document.getElementById('sel-sr-announce');
        if (el) { el.textContent = msg; }
      }

      // Sound helper
      var _selAudioCtx = null;
      function selBeep(freq, dur, vol) {
        try {
          if (!_selAudioCtx) _selAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = _selAudioCtx.createOscillator();
          var gain = _selAudioCtx.createGain();
          osc.connect(gain); gain.connect(_selAudioCtx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          gain.gain.value = vol || 0.12;
          gain.gain.exponentialRampToValueAtTime(0.001, _selAudioCtx.currentTime + (dur || 0.15));
          osc.start(); osc.stop(_selAudioCtx.currentTime + (dur || 0.15));
        } catch (e) { }
      }
      function selCelebrate() {
        selBeep(523, 0.15, 0.14);
        setTimeout(function() { selBeep(659, 0.15, 0.14); }, 100);
        setTimeout(function() { selBeep(784, 0.25, 0.16); }, 200);
      }

      // ── Keyboard Navigation ──
      React.useEffect(function() {
        function handleKeyDown(e) {
          if (!showSelHub) return;
          if (e.key === 'Escape') {
            if (selHubTool) { setSelHubTool(null); announceToSR('Returned to tool grid'); }
            else { setShowSelHub(false); }
          }
          if (e.altKey) {
            if (e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); setSelHubTool(null); announceToSR('Returned to tool grid'); }
          }
        }
        document.addEventListener('keydown', handleKeyDown);
        return function() { document.removeEventListener('keydown', handleKeyDown); };
      });

      // ── Reduced motion preference ──
      var _reduceMotion = false;
      try { _reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}

      // ── Theme detection (reads parent app's CSS class) ──
      var isDark = false, isContrast = false;
      try {
        isDark = !!document.querySelector('.theme-dark');
        isContrast = !!document.querySelector('.theme-contrast');
      } catch(e) {}
      var _t = {
        bg:       isContrast ? '#000000' : isDark ? '#0f172a' : '#f8fafc',
        bgCard:   isContrast ? '#000000' : isDark ? '#1e293b' : '#ffffff',
        bgInput:  isContrast ? '#000000' : isDark ? '#1e293b' : '#ffffff',
        border:   isContrast ? '#ffff00' : isDark ? '#64748b' : '#94a3b8',
        text:     isContrast ? '#ffff00' : isDark ? '#f1f5f9' : '#0f172a',
        textMuted:isContrast ? '#ffff00' : isDark ? '#94a3b8' : '#64748b',
        headerBg: isContrast ? '#000000' : isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        headerText: isContrast ? '#ffff00' : '#f1f5f9',
        btnBg:    isContrast ? '#000000' : isDark ? '#334155' : '#e2e8f0',
        btnText:  isContrast ? '#00ff00' : isDark ? '#f1f5f9' : '#334155',
        btnBorder:isContrast ? '2px solid #00ff00' : isDark ? 'none' : 'none',
        accent:   '#7c3aed'
      };

      // ══════════════════════════════════════════════════════════════
      // ── Tool Catalog ──
      // All SEL tools are defined here for the grid display.
      // The actual rendering is handled by the plugin registry.
      // Category headers use { category: true } like STEM Lab.
      // ══════════════════════════════════════════════════════════════
      var _allSelTools = [
        // ── Self-Awareness ──
        { id: '_cat_SelfAwareness', icon: '\uD83E\uDDE0', label: 'Self-Awareness', desc: '', color: 'slate', category: true },
        { id: 'zones',       icon: '\uD83D\uDEA6', label: 'Emotion Zones', desc: 'Identify your zone (blue, green, yellow, red) and explore strategies to self-regulate.', color: 'emerald', recommendedRange: 'K-12' },
        { id: 'emotions',    icon: '\uD83D\uDE0A', label: 'Emotion Explorer',    desc: 'Build emotional vocabulary — identify, name, and rate the intensity of feelings.', color: 'blue', recommendedRange: 'K-8' },
        { id: 'strengths',   icon: '\u2B50',       label: 'Strengths Finder',    desc: 'Discover and reflect on personal strengths, talents, and growth areas.', color: 'amber', recommendedRange: 'K-12' },

        // ── Self-Management ──
        { id: '_cat_SelfManagement', icon: '\uD83C\uDFAF', label: 'Self-Management', desc: '', color: 'slate', category: true },
        { id: 'coping',      icon: '\uD83E\uDDE8', label: 'Coping Toolkit',      desc: 'Explore and practice coping strategies — breathing, grounding, movement, and more.', color: 'teal', recommendedRange: 'K-12' },
        { id: 'mindfulness', icon: '\uD83E\uDDD8', label: 'Mindfulness Corner',  desc: 'Guided breathing exercises, body scans, and mindfulness activities.', color: 'purple', recommendedRange: 'K-12' },
        { id: 'goals',       icon: '\uD83D\uDCCB', label: 'Goal Setter',         desc: 'Set SMART goals, track progress, and celebrate milestones.', color: 'indigo', recommendedRange: '3-12' },
        { id: 'howlTracker', icon: '\uD83E\uDDED', label: 'HOWL Tracker',        desc: 'Habits of Work and Learning self-assessment for Crew time. Weekly check-ins, quarterly goals, trend chart, Crew conversation prompts. Aligned with EL Education\'s HOWL framework.', color: 'indigo', recommendedRange: '3-12' },

        // ── Social Awareness ──
        { id: '_cat_SocialAwareness', icon: '\uD83E\uDD1D', label: 'Social Awareness', desc: '', color: 'slate', category: true },
        { id: 'perspective', icon: '\uD83D\uDC53', label: 'Perspective Lens',    desc: 'See situations from different viewpoints — practice empathy and perspective-taking.', color: 'rose', recommendedRange: '2-12' },
        { id: 'community',   icon: '\uD83C\uDF0D', label: 'Community & Culture', desc: 'Explore diversity, cultural awareness, and community belonging.', color: 'cyan', recommendedRange: 'K-12' },

        // ── Relationship Skills ──
        { id: '_cat_RelationshipSkills', icon: '\uD83D\uDCAC', label: 'Relationship Skills', desc: '', color: 'slate', category: true },
        { id: 'conflict',    icon: '\u2696\uFE0F', label: 'Conflict Resolution', desc: 'Practice resolving conflicts with role-play scenarios and I-statements.', color: 'orange', recommendedRange: '2-12' },
        { id: 'social',      icon: '\uD83D\uDDE3\uFE0F', label: 'Social Skills Lab',  desc: 'Practice conversation skills, active listening, body language, and cooperation.', color: 'sky', recommendedRange: 'K-8' },
        { id: 'teamwork',    icon: '\uD83E\uDD1C\uD83E\uDD1B', label: 'Teamwork Builder', desc: 'Collaborative challenges and team role exploration.', color: 'lime', recommendedRange: 'K-12' },

        // ── Responsible Decision-Making ──
        { id: '_cat_DecisionMaking', icon: '\u2696\uFE0F', label: 'Responsible Decision-Making', desc: '', color: 'slate', category: true },
        { id: 'decisions',   icon: '\uD83E\uDD14', label: 'Decision Lab',        desc: 'Work through real-life scenarios using stop-think-act frameworks.', color: 'violet', recommendedRange: '3-12' },
        { id: 'journal',     icon: '\uD83D\uDCD3', label: 'Feelings Journal',    desc: 'Daily check-in journal — log moods, triggers, and reflections over time.', color: 'pink', recommendedRange: 'K-12' },
        { id: 'safety',      icon: '\uD83D\uDEE1\uFE0F', label: 'Safety & Boundaries', desc: 'Learn about personal boundaries, trusted adults, and safe vs. unsafe situations.', color: 'red', recommendedRange: 'K-8' },
      ];
      // Append dynamically registered tools into the correct category positions
      var _dynamicTools = [
        { id: 'restorativeCircle', icon: '\uD83E\uDEB6', label: 'Restorative Circle', desc: 'Facilitate restorative and community-building circles. Explore talking pieces and Indigenous roots.', color: 'amber', recommendedRange: '3-12', _cat: 'relationship-skills' },
        { id: 'compassion', icon: '\uD83E\uDD7A', label: 'Compassion & Self-Talk', desc: 'Practice self-compassion, reframe inner critic, and build a kinder inner voice.', color: 'rose', recommendedRange: 'K-12', _cat: 'self-awareness' },
        { id: 'friendship', icon: '\uD83E\uDD1D', label: 'Friendship Builder', desc: 'Explore friendship styles, repair strategies, and healthy relationship patterns.', color: 'amber', recommendedRange: 'K-12', _cat: 'relationship-skills' },
        { id: 'transitions', icon: '\uD83C\uDF31', label: 'Life Transitions', desc: 'Navigate changes like moving, new schools, and growing up.', color: 'emerald', recommendedRange: 'K-12', _cat: 'self-management' },
        { id: 'upstander', icon: '\uD83E\uDDB8', label: 'Upstander Training', desc: 'Learn to stand up for others safely — bystander to upstander skills.', color: 'red', recommendedRange: '2-12', _cat: 'social-awareness' },
        { id: 'growthmindset', icon: '\uD83E\uDDE0', label: 'Growth Mindset', desc: 'Brain science, reframing challenges, and building resilience.', color: 'violet', recommendedRange: 'K-12', _cat: 'self-management' },
        { id: 'advocacy', icon: '\uD83D\uDCE2', label: 'Self-Advocacy', desc: 'Learn to speak up for your needs, rights, and goals.', color: 'blue', recommendedRange: '3-12', _cat: 'self-awareness' },
        { id: 'civicAction', icon: '\u270A', label: 'Civic Action & Hope', desc: 'Process hard feelings about injustice, build civic agency, and cultivate hope through action.', color: 'teal', recommendedRange: '3-12', _cat: 'responsible-decision-making' },
        { id: 'ethicalReasoning', icon: '\u2696\uFE0F', label: 'Ethical Reasoning Lab', desc: 'Explore contemporary ethical dilemmas through multiple frameworks and AI Socratic dialogue.', color: 'slate', recommendedRange: '5-12', _cat: 'responsible-decision-making' },
        { id: 'cultureExplorer', icon: '\uD83C\uDF0D', label: 'Culture Explorer', desc: 'Take AI-powered deep dives into world cultures with illustrations and audio.', color: 'cyan', recommendedRange: 'K-12', _cat: 'social-awareness' },
        { id: 'voicedetective', icon: '\uD83D\uDD0A', label: 'Voice Detective', desc: 'Listen to voices and identify emotions from tone.', color: 'purple', recommendedRange: 'K-12', _cat: 'social-awareness' },
        { id: 'sociallab', icon: '\uD83C\uDFAD', label: 'Social Skills Lab', desc: 'Practice social scenarios and AI peer roleplay.', color: 'indigo', recommendedRange: 'K-12', _cat: 'relationship-skills' },
        { id: 'peersupport', icon: '\uD83E\uDD1D', label: 'Peer Support Coach', desc: 'Learn OARS listening skills and when to get adult help.', color: 'emerald', recommendedRange: '3-12', _cat: 'relationship-skills' },
        { id: 'conflicttheater', icon: '\uD83C\uDFAD', label: 'Conflict Theater', desc: 'Mediate a real conflict with two AI characters who have personalities, moods, and reasons of their own. Practice restorative principles in an immersive scene.', color: 'amber', recommendedRange: '5-12', _cat: 'relationship-skills' },
        { id: 'digitalWellbeing', icon: '\uD83D\uDCF1', label: 'Digital Wellbeing Studio', desc: 'Self-check your relationship with social media and AI chatbots, build healthier phone habits, recover from cyberbullying, spot manipulation in the feed, navigate chatbot relationships safely, and find help when you need it.', color: 'cyan', recommendedRange: '5-12', _cat: 'self-management' },
      ];
      // Insert each dynamic tool after its category header
      var _catPositions = { 'self-awareness': '_cat_SelfAwareness', 'self-management': '_cat_SelfManagement', 'social-awareness': '_cat_SocialAwareness', 'relationship-skills': '_cat_RelationshipSkills', 'responsible-decision-making': '_cat_DecisionMaking' };
      _dynamicTools.forEach(function(dt) {
        // Only add if the tool is actually registered in SelHub
        if (!window.SelHub || !window.SelHub.isRegistered(dt.id)) return;
        // Don't duplicate if already in the static list
        if (_allSelTools.some(function(t) { return t.id === dt.id; })) return;
        var catHeaderId = _catPositions[dt._cat];
        if (catHeaderId) {
          // Find the last tool in this category section
          var catIdx = _allSelTools.findIndex(function(t) { return t.id === catHeaderId; });
          if (catIdx >= 0) {
            var insertIdx = catIdx + 1;
            while (insertIdx < _allSelTools.length && !_allSelTools[insertIdx].category) insertIdx++;
            _allSelTools.splice(insertIdx, 0, dt);
            return;
          }
        }
        // Fallback: append at end
        _allSelTools.push(dt);
      });

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      if (!showSelHub) return null;

      // ── Screen reader live region (fixed: removed bogus role=button) ──
      var srLive = h('div', {
        id: 'sel-sr-announce',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        role: 'status',
        style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0, padding: 0, margin: '-1px' }
      });

      // ── Header bar (fixed: removed bogus role=button from non-interactive containers) ──
      var header = h('div', {
        role: 'banner',
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid ' + _t.border, background: _t.headerBg }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          selHubTool && h('button', {
            onClick: function() { setSelHubTool(null); announceToSR('Returned to tool grid'); },
            'aria-label': 'Back to tools',
            style: { background: 'none', border: 'none', color: _t.headerText, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }
          }, ArrowLeft ? h(ArrowLeft, { size: 20 }) : '\u2190'),
          h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 800, color: _t.headerText } },
            '\u2764\uFE0F\u200D\uD83D\uDD25 SEL Hub'
          ),
          h('span', {
            style: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 8 }
          }, gradeBand(gradeLevel) === 'elementary' ? 'Elementary' : gradeBand(gradeLevel) === 'middle' ? 'Middle School' : 'High School')
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          // Theme toggle button
          h('button', {
            onClick: function() { if (typeof window.AlloToggleTheme === 'function') { window.AlloToggleTheme(); setTimeout(function() { setSelToolData(function(p) { return Object.assign({}, p); }); }, 50); } },
            'aria-label': 'Toggle theme (light / dark / high contrast)',
            title: isContrast ? 'High Contrast' : isDark ? 'Dark Mode' : 'Light Mode',
            style: { background: 'rgba(255,255,255,0.12)', border: 'none', color: _t.headerText, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }
          }, isContrast ? '\uD83D\uDC41' : isDark ? '\uD83C\uDF19' : '\u2600\uFE0F', h('span', { style: { fontSize: 10, fontWeight: 700 } }, isContrast ? 'Hi-Con' : isDark ? 'Dark' : 'Light')),
          // XP badge (fixed: removed bogus role=button from display-only element)
          h('div', {
            'aria-label': selXp + ' SEL experience points',
            style: { background: _t.accent, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }
          }, '\u2728 ' + selXp + ' XP'),
          // Close button
          h('button', {
            onClick: function() { setShowSelHub(false); },
            'aria-label': 'Close SEL Hub',
            style: { background: 'none', border: 'none', color: _t.headerText, cursor: 'pointer', padding: 4 }
          }, X ? h(X, { size: 20 }) : '\u2715')
        )
      );

      // ══════════════════════════════════════════════════════════════
      // ── Tool Grid (when no tool is selected) ──
      // ══════════════════════════════════════════════════════════════
      var toolGrid = null;
      if (!selHubTool) {
        // Search filter
        var _searchLower = selToolSearch.toLowerCase().trim();
        var _filteredTools = _searchLower ? _allSelTools.filter(function(tool) {
          if (tool.category) {
            // Keep category if any tool in its section matches
            var catIdx = _allSelTools.indexOf(tool);
            for (var j = catIdx + 1; j < _allSelTools.length; j++) {
              if (_allSelTools[j].category) break;
              if (_allSelTools[j].label.toLowerCase().indexOf(_searchLower) !== -1 ||
                  _allSelTools[j].desc.toLowerCase().indexOf(_searchLower) !== -1) return true;
            }
            return false;
          }
          return tool.label.toLowerCase().indexOf(_searchLower) !== -1 ||
                 tool.desc.toLowerCase().indexOf(_searchLower) !== -1;
        }) : _allSelTools;

        // Remove orphan category headers
        if (_searchLower) {
          _filteredTools = _filteredTools.filter(function(tool, i, arr) {
            if (!tool.category) return true;
            for (var j = i + 1; j < arr.length; j++) {
              if (arr[j].category) return false;
              return true;
            }
            return false;
          });
        }

        // Map tool ids to their CASEL category
        var _toolCategoryMap = {};
        var _currentCat = null;
        _allSelTools.forEach(function(t2) {
          if (t2.category) { _currentCat = t2.id; }
          else { _toolCategoryMap[t2.id] = _currentCat; }
        });

        // Apply category filter on top of search
        if (selCategoryFilter) {
          var catHeaderId = '_cat_' + selCategoryFilter.replace(/[-\s]/g, '');
          // Find the matching category header
          var matchHeader = _allSelTools.find(function(t2) {
            return t2.category && t2.id.toLowerCase().indexOf(selCategoryFilter.replace(/[-\s]/g, '').toLowerCase()) >= 0;
          });
          if (matchHeader) {
            _filteredTools = _filteredTools.filter(function(t2) {
              if (t2.category) return t2.id === matchHeader.id;
              return _toolCategoryMap[t2.id] === matchHeader.id;
            });
          }
        }

        // If a pathway is active, filter to pathway tools only
        if (activePathway && activePathway.tools && activePathway.tools.length > 0) {
          var _pathTools = activePathway.tools;
          _filteredTools = _filteredTools.filter(function(t2) {
            if (t2.category) return true;
            return _pathTools.indexOf(t2.id) >= 0;
          });
          // Remove empty category headers
          _filteredTools = _filteredTools.filter(function(t2, i, arr) {
            if (!t2.category) return true;
            for (var j = i + 1; j < arr.length; j++) {
              if (arr[j].category) return false;
              return true;
            }
            return false;
          });
        }

        // If a custom Station is active, filter to its tools only (parallel to pathway filtering)
        if (activeStation && activeStation.tools && activeStation.tools.length > 0) {
          var _stTools = activeStation.tools;
          _filteredTools = _filteredTools.filter(function (t2) {
            if (t2.category) return true;
            return _stTools.indexOf(t2.id) >= 0;
          });
          _filteredTools = _filteredTools.filter(function (t2, i, arr) {
            if (!t2.category) return true;
            for (var j = i + 1; j < arr.length; j++) {
              if (arr[j].category) return false;
              return true;
            }
            return false;
          });
        }

        toolGrid = h('div', { role: 'main', 'aria-label': 'SEL Hub tool selection', style: { padding: 20 } },
          // Active pathway banner
          activePathway && h('div', {
            style: { marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed15, #6366f115)', border: '1px solid #7c3aed33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
          },
            h('div', null,
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7c3aed' } }, '\uD83D\uDEE4\uFE0F ' + activePathway.name),
              h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 2 } }, activePathway.tools.length + ' tools \u2022 ' + Object.keys(pathwayProgress).filter(function(k) { return pathwayProgress[k]; }).length + '/' + activePathway.tools.length + ' completed')
            ),
            h('button', {
              onClick: function() { setActivePathway(null); setPathwayProgress({}); announceToSR('Pathway cleared'); },
              'aria-label': 'Exit pathway mode',
              style: { background: 'none', border: '1px solid #7c3aed44', borderRadius: 8, padding: '4px 10px', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
            }, '\u2715 Exit Pathway')
          ),
          // Active station banner (mutually exclusive with active pathway in practice)
          activeStation && (function () {
            var stationProg = questProgress[activeStation.id] || {};
            var totalQ = (activeStation.quests || []).length;
            var doneQ = (activeStation.quests || []).filter(function (q) { return (stationProg[q.qid] || {}).complete; }).length;
            return h('div', {
              role: 'region', 'aria-label': 'Active SEL Station: ' + activeStation.name,
              style: { marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #ec489915, #f43f5e15)', border: '1px solid #ec489933' }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                h('div', { style: { minWidth: 0, flex: 1 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#be185d' } }, '\ud83d\udccc ' + activeStation.name),
                  h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 2 } },
                    (activeStation.tools || []).length + ' tools' + (totalQ > 0 ? ' \u2022 ' + doneQ + '/' + totalQ + ' quests done' : '')
                  ),
                  activeStation.teacherNote && h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 6, fontStyle: 'italic', padding: '6px 8px', background: _t.bgCard, borderRadius: 6, borderLeft: '3px solid #ec4899' } }, '\ud83d\udcac ' + activeStation.teacherNote)
                ),
                h('button', {
                  onClick: function () { setActiveStationId(null); announceToSR('Station cleared'); },
                  'aria-label': 'Exit station mode',
                  style: { background: 'none', border: '1px solid #ec489944', borderRadius: 8, padding: '4px 10px', color: '#be185d', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                }, '\u2715 Exit Station')
              ),
              totalQ > 0 && h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
                (activeStation.quests || []).map(function (q) {
                  var qp = stationProg[q.qid] || {};
                  var done = !!qp.complete;
                  var qIcon = (SEL_QUEST_TYPES.find(function (qt) { return qt.id === q.type; }) || {}).icon || '\ud83c\udfaf';
                  return h('div', { key: q.qid, style: { background: done ? '#dcfce7' : _t.bgCard, border: '1px solid ' + (done ? '#86efac' : _t.border), borderRadius: 8, padding: '6px 10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, done ? '\u2705' : qIcon),
                      h('span', { style: { fontSize: 12, fontWeight: 600, color: done ? '#166534' : _t.text, flex: 1, textDecoration: done ? 'line-through' : 'none' } }, q.label),
                      !done && q.type === 'xpThreshold' && h('span', { style: { fontSize: 10, color: _t.textMuted } }, selXp + ' / ' + ((q.params && q.params.threshold) || 30)),
                      !done && q.type === 'timeSpent' && h('span', { style: { fontSize: 10, color: _t.textMuted } }, Math.floor(((qp.timeAccumMs || 0) / 60000)) + ' / ' + ((q.params && q.params.minutes) || 5) + ' min'),
                      !done && q.type === 'manualComplete' && h('button', {
                        onClick: function () {
                          setQuestProgress(function (prev) {
                            var next = Object.assign({}, prev);
                            var sp = Object.assign({}, next[activeStation.id] || {});
                            sp[q.qid] = Object.assign({}, sp[q.qid] || {}, { markedComplete: true });
                            next[activeStation.id] = sp;
                            return next;
                          });
                          announceToSR('Quest marked complete: ' + q.label);
                        },
                        'aria-label': 'Mark "' + q.label + '" as complete',
                        style: { fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: '1px solid #ec489966', background: '#fff', color: '#be185d', cursor: 'pointer' }
                      }, 'Mark complete')
                    ),
                    !done && q.type === 'freeResponse' && h('textarea', {
                      value: qp.response || '',
                      onChange: function (ev) {
                        var v = ev.target.value;
                        setQuestProgress(function (prev) {
                          var next = Object.assign({}, prev);
                          var sp = Object.assign({}, next[activeStation.id] || {});
                          sp[q.qid] = Object.assign({}, sp[q.qid] || {}, { response: v });
                          next[activeStation.id] = sp;
                          return next;
                        });
                      },
                      placeholder: (q.params && q.params.prompt) || 'Write a reflection...',
                      'aria-label': 'Reflection for ' + q.label,
                      rows: 2,
                      style: { width: '100%', marginTop: 6, padding: '6px 8px', borderRadius: 6, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 11, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
                    })
                  );
                })
              )
            );
          })(),
          // \u2500\u2500 Daily Streak + Continue Where You Left Off \u2500\u2500
          // Pulls from localStorage-backed selStreak / selToolUsage.
          // Streak chip surfaces only when count >= 2 (avoids "1-day streak"
          // noise on first visit). Continue card shows the most recently
          // opened tool if it was used within the last 7 days AND the user
          // isn't already in a pathway/station view.
          (function () {
            var showStreak = (selStreak.count || 0) >= 2;
            var continueTool = null;
            if (!activePathway && !activeStation) {
              var bestId = null; var bestTime = 0; var weekAgo = Date.now() - 7 * 86400000;
              Object.keys(selToolUsage).forEach(function (k) {
                var u = selToolUsage[k];
                if (u && u.lastUsed && u.lastUsed > bestTime && u.lastUsed > weekAgo) { bestTime = u.lastUsed; bestId = k; }
              });
              if (bestId) {
                continueTool = _allSelTools.find(function (t) { return t.id === bestId && !t.category; }) || null;
              }
            }
            if (!showStreak && !continueTool) return null;
            return h('div', {
              style: { marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b15, #ec489915)', border: '1px solid #f59e0b33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
                showStreak && h('div', {
                  role: 'status',
                  'aria-label': selStreak.count + '-day SEL streak. Longest: ' + (selStreak.longest || selStreak.count) + ' days.',
                  style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }
                },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, '\uD83D\uDD25'),
                  h('span', { style: { fontSize: 12, fontWeight: 800, color: '#c2410c' } }, selStreak.count + '-day streak'),
                  (selStreak.longest > selStreak.count) && h('span', { style: { fontSize: 10, color: '#9a3412', fontWeight: 600 } }, '\u00B7 best ' + selStreak.longest)
                ),
                continueTool && h('div', { style: { fontSize: 12, color: _t.textMuted } },
                  h('span', { style: { fontWeight: 700, color: _t.text } }, '\uD83D\uDC4B Welcome back. '),
                  'Continue with ',
                  h('span', { style: { fontWeight: 700, color: _t.text } }, continueTool.label),
                  '?'
                )
              ),
              continueTool && h('button', {
                onClick: function () {
                  trackToolOpen(continueTool.id);
                  setSelHubTool(continueTool.id);
                  announceToSR('Resumed ' + continueTool.label);
                },
                'aria-label': 'Continue with ' + continueTool.label,
                style: { padding: '6px 14px', borderRadius: 10, background: '#f59e0b', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
              },
                h('span', { 'aria-hidden': 'true' }, continueTool.icon),
                'Continue \u2192'
              )
            );
          })(),
          // Search bar
          h('div', { style: { marginBottom: 12 } },
            h('input', {
              type: 'text',
              placeholder: '\uD83D\uDD0D Search SEL tools...',
              value: selToolSearch,
              onChange: function(e) { setSelToolSearch(e.target.value); },
              'aria-label': 'Search SEL tools',
              style: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #8b5cf6'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }
            })
          ),
          // CASEL category filter chips
          h('div', { role: 'group', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            h('button', {
              onClick: function() { setSelCategoryFilter(null); announceToSR('Showing all categories'); },
              'aria-label': 'Show all categories',
              'aria-pressed': selCategoryFilter === null ? 'true' : 'false',
              style: { padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (selCategoryFilter === null ? '#7c3aed' : _t.border), background: selCategoryFilter === null ? '#7c3aed' : _t.bgCard, color: selCategoryFilter === null ? '#fff' : _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }
            }, 'All'),
            SEL_CATEGORIES.map(function(cat) {
              var isActive = selCategoryFilter === cat.id;
              return h('button', {
                key: cat.id,
                onClick: function() { setSelCategoryFilter(isActive ? null : cat.id); announceToSR(isActive ? 'Showing all categories' : 'Filtered to ' + cat.label); },
                'aria-label': 'Filter: ' + cat.label,
                'aria-pressed': isActive ? 'true' : 'false',
                style: { padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (isActive ? '#7c3aed' : _t.border), background: isActive ? '#7c3aed' : _t.bgCard, color: isActive ? '#fff' : _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }
              }, cat.icon + ' ' + cat.label);
            })
          ),
          // SEL Pathways — curated learning sequences (collapsed by default)
          !activePathway && h('details', {
            style: { marginBottom: 16, borderRadius: 12, border: '1px solid ' + _t.border, overflow: 'hidden' }
          },
            h('summary', {
              style: { padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: _t.textMuted, background: _t.bgCard, display: 'flex', alignItems: 'center', gap: 6 }
            }, '\uD83D\uDEE4\uFE0F SEL Pathways \u2014 Curated Learning Sequences'),
            h('div', { style: { padding: '8px 12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } },
              SEL_PATHWAYS.map(function(pw) {
                return h('button', {
                  key: pw.id,
                  onClick: function() {
                    setActivePathway(pw);
                    setPathwayProgress({});
                    setSelCategoryFilter(null);
                    setSelToolSearch('');
                    announceToSR('Started pathway: ' + pw.name);
                    if (typeof addToast === 'function') addToast('\uD83D\uDEE4\uFE0F ' + pw.name + ' pathway started!', 'success');
                  },
                  'aria-label': pw.name + ': ' + pw.desc,
                  style: { textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgCard, cursor: 'pointer', transition: 'all 0.15s' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                    h('span', { style: { fontSize: 16 } }, pw.icon),
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: _t.text } }, pw.name)
                  ),
                  h('div', { style: { fontSize: 10, color: _t.textMuted, lineHeight: 1.4 } }, pw.desc),
                  h('div', { style: { fontSize: 9, color: '#7c3aed', fontWeight: 600, marginTop: 4 } }, pw.tools.length + ' activities')
                );
              })
            )
          ),
          // Custom SEL Stations — teacher-authored bundles (parallel to STEM Lab Stations)
          !activeStation && !activePathway && h('details', {
            open: builderOpen || savedStations.length > 0,
            style: { marginBottom: 16, borderRadius: 12, border: '1px solid ' + _t.border, overflow: 'hidden' }
          },
            h('summary', {
              style: { padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: _t.textMuted, background: _t.bgCard, display: 'flex', alignItems: 'center', gap: 6 }
            }, '📌 Custom SEL Stations — teacher-authored bundles'),
            h('div', { style: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 } },
              // Saved stations list
              savedStations.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } },
                savedStations.map(function (st) {
                  return h('div', { key: st.id, style: { padding: '10px 12px', borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgCard, display: 'flex', flexDirection: 'column', gap: 4 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: _t.text, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '📌 ' + st.name),
                      h('button', {
                        onClick: function () {
                          var keep = savedStations.filter(function (s) { return s.id !== st.id; });
                          setSavedStations(keep);
                          if (activeStationId === st.id) setActiveStationId(null);
                          if (typeof addToast === 'function') addToast('Station removed', 'info');
                        },
                        'aria-label': 'Delete station ' + st.name,
                        style: { background: 'none', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }
                      }, '✕')
                    ),
                    h('div', { style: { fontSize: 10, color: _t.textMuted } }, (st.tools || []).length + ' tools' + ((st.quests || []).length > 0 ? ' • ' + st.quests.length + ' quests' : '')),
                    h('button', {
                      onClick: function () {
                        setActiveStationId(st.id);
                        setActivePathway(null); setPathwayProgress({});
                        setSelToolSearch(''); setSelCategoryFilter(null);
                        announceToSR('Activated SEL Station: ' + st.name);
                        if (typeof addToast === 'function') addToast('📌 ' + st.name + ' started!', 'success');
                      },
                      'aria-label': 'Activate station ' + st.name,
                      style: { marginTop: 4, padding: '4px 10px', borderRadius: 8, border: 'none', background: '#db2777', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                    }, 'Activate')
                  );
                })
              ),
              // Open builder button
              !builderOpen && h('button', {
                onClick: function () { setBuilderOpen(true); announceToSR('Station builder opened'); },
                'aria-label': 'Build a new custom SEL Station',
                style: { padding: '8px 14px', borderRadius: 10, border: '1px dashed #ec4899', background: 'rgba(236, 72, 153, 0.05)', color: '#be185d', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }
              }, '+ Build a Custom Station'),
              // Inline builder
              builderOpen && (function () {
                var registry = (window.SelHub && window.SelHub.getRegisteredTools) ? window.SelHub.getRegisteredTools() : [];
                var QUEST_PRESETS = [
                  { name: 'Daily Check-In', icon: '🌅', desc: 'Quick reflection + XP', build: function () {
                    var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                    return [
                      { type: 'xpThreshold', toolId: null, label: 'Earn 20 SEL XP today', params: { threshold: 20 } },
                      { type: 'freeResponse', toolId: null, label: 'How are you feeling right now?', params: { prompt: 'How are you feeling right now? What is one thing on your mind?', minLength: 30 } },
                      { type: 'manualComplete', toolId: picked[0] || null, label: 'Complete one SEL activity', params: {} }
                    ];
                  } },
                  { name: 'Reflection Deep Dive', icon: '🔍', desc: 'Time + reflection + XP', build: function () {
                    var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                    return [
                      { type: 'xpThreshold', toolId: null, label: 'Earn 60 SEL XP', params: { threshold: 60 } },
                      { type: 'timeSpent', toolId: picked[0] || null, label: 'Spend 8 minutes here', params: { minutes: 8 } },
                      { type: 'freeResponse', toolId: null, label: 'What did you learn about yourself?', params: { prompt: 'What did you learn about yourself today? What is one thing you might do differently next time?', minLength: 60 } }
                    ];
                  } },
                  { name: 'Repair Pack', icon: '🤝', desc: 'After-conflict repair', build: function () {
                    var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                    return [
                      { type: 'manualComplete', toolId: picked[0] || null, label: 'Use the first tool to plan a repair', params: {} },
                      { type: 'freeResponse', toolId: null, label: 'Write a repair statement', params: { prompt: 'Write what you would say to repair the relationship. Use "I" statements and name a specific action you can take.', minLength: 80 } },
                      { type: 'manualComplete', toolId: null, label: 'Talk it through with a trusted adult', params: {} }
                    ];
                  } }
                ];
                return h('div', { role: 'region', 'aria-label': 'Station Builder', style: { padding: '12px 14px', borderRadius: 10, border: '1px solid #ec489955', background: 'rgba(236, 72, 153, 0.04)', display: 'flex', flexDirection: 'column', gap: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#be185d' } }, '🧑‍🏫 Station Builder'),
                    h('button', {
                      onClick: function () { setBuilderOpen(false); setBuilderName(''); setBuilderNote(''); setBuilderTools({}); setBuilderQuests([]); },
                      'aria-label': 'Cancel station builder',
                      style: { fontSize: 11, fontWeight: 700, color: _t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }
                    }, '✕ Cancel')
                  ),
                  // Name
                  h('input', {
                    type: 'text', value: builderName,
                    onChange: function (ev) { setBuilderName(ev.target.value); },
                    placeholder: 'Station name (e.g. "Friday SEL Routine")',
                    'aria-label': 'Station name',
                    style: { padding: '7px 10px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }
                  }),
                  // Teacher note
                  h('textarea', {
                    value: builderNote,
                    onChange: function (ev) { setBuilderNote(ev.target.value); },
                    placeholder: 'Optional teacher note (instructions students see when they activate this station)',
                    'aria-label': 'Teacher note',
                    rows: 2,
                    style: { padding: '7px 10px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 11, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }
                  }),
                  // Tool picker
                  h('div', null,
                    h('div', { style: { fontSize: 11, fontWeight: 700, color: _t.text, marginBottom: 4 } }, 'Pick tools to include:'),
                    registry.length === 0
                      ? h('div', { style: { fontSize: 11, color: _t.textMuted, fontStyle: 'italic' } }, 'No SEL tools registered yet. Open the hub once so plugins load, then return here.')
                      : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, maxHeight: 180, overflowY: 'auto', padding: 4, border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgCard } },
                          registry.map(function (tool) {
                            var checked = !!builderTools[tool.id];
                            return h('label', { key: tool.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', background: checked ? '#fce7f3' : 'transparent', fontSize: 11, color: _t.text } },
                              h('input', {
                                type: 'checkbox', checked: checked,
                                onChange: function () {
                                  setBuilderTools(function (prev) { var n = Object.assign({}, prev); n[tool.id] = !checked; return n; });
                                },
                                'aria-label': 'Include ' + (tool.name || tool.id) + ' in this station'
                              }),
                              h('span', { 'aria-hidden': 'true' }, tool.icon || '🔧'),
                              h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tool.name || tool.id)
                            );
                          })
                        )
                  ),
                  // Quest presets + manual quest add
                  h('div', null,
                    h('div', { style: { fontSize: 11, fontWeight: 700, color: _t.text, marginBottom: 4 } }, 'Quests (optional):'),
                    builderQuests.length === 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 } },
                      QUEST_PRESETS.map(function (preset) {
                        return h('button', {
                          key: preset.name,
                          onClick: function () {
                            var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                            if (picked.length === 0) {
                              if (typeof addToast === 'function') addToast('Pick tools first, then add quests', 'info');
                              return;
                            }
                            setBuilderQuests(preset.build());
                            if (typeof addToast === 'function') addToast('Applied "' + preset.name + '" quest preset!', 'success');
                          },
                          'aria-label': 'Apply preset: ' + preset.name + '. ' + preset.desc,
                          style: { background: _t.bgCard, border: '1px solid ' + _t.border, borderRadius: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: _t.text, textAlign: 'center' }
                        },
                          h('div', { style: { fontSize: 16 } }, preset.icon),
                          h('div', { style: { fontWeight: 700 } }, preset.name),
                          h('div', { style: { fontSize: 9, color: _t.textMuted, marginTop: 2 } }, preset.desc)
                        );
                      })
                    ),
                    builderQuests.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                      builderQuests.map(function (q, qi) {
                        var qIcon = (SEL_QUEST_TYPES.find(function (qt) { return qt.id === q.type; }) || {}).icon || '🎯';
                        return h('div', { key: qi, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, background: _t.bgCard, border: '1px solid ' + _t.border, fontSize: 11, color: _t.text } },
                          h('span', { 'aria-hidden': 'true', style: { fontSize: 13 } }, qIcon),
                          h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, q.label),
                          h('button', {
                            onClick: function () { setBuilderQuests(function (prev) { return prev.filter(function (_, i) { return i !== qi; }); }); },
                            'aria-label': 'Remove quest "' + q.label + '"',
                            style: { background: 'none', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                          }, '✕')
                        );
                      }),
                      h('button', {
                        onClick: function () { setBuilderQuests([]); },
                        'aria-label': 'Clear all quests',
                        style: { fontSize: 10, color: _t.textMuted, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', textDecoration: 'underline' }
                      }, 'Clear all quests')
                    )
                  ),
                  // Save button
                  h('button', {
                    onClick: _saveBuilderAsStation,
                    'aria-label': 'Save this station',
                    style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#db2777', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }
                  }, '💾 Save Station')
                );
              })()
            )
          ),
          // Grid
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 } },
            _filteredTools.map(function(tool) {
              // Category header
              if (tool.category) {
                return h('div', {
                  key: tool.id,
                  style: { gridColumn: '1 / -1', marginTop: 12, marginBottom: 4 }
                },
                  h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: _t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, tool.icon), ' ', tool.label
                  )
                );
              }

              // Tool card
              var isRegistered = window.SelHub && window.SelHub.isRegistered(tool.id);
              var colorMap = {
                emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', teal: '#14b8a6',
                purple: '#8b5cf6', indigo: '#6366f1', rose: '#f43f5e', cyan: '#06b6d4',
                orange: '#f97316', sky: '#0ea5e9', lime: '#84cc16', violet: '#7c3aed',
                pink: '#ec4899', red: '#ef4444'
              };
              var cardColor = colorMap[tool.color] || '#3b82f6';

              return h('button', {
                key: tool.id,
                onClick: function() {
                  if (isRegistered) {
                    trackToolOpen(tool.id);
                    setSelHubTool(tool.id);
                    announceToSR('Opened ' + tool.label);
                    // Track pathway progress
                    if (activePathway && activePathway.tools.indexOf(tool.id) >= 0) {
                      setPathwayProgress(function(prev) { var n = Object.assign({}, prev); n[tool.id] = true; return n; });
                    }
                  } else {
                    if (typeof addToast === 'function') addToast(tool.label + ' is loading...', 'info');
                  }
                },
                'aria-label': tool.label + (tool.recommendedRange ? ' (Grades ' + tool.recommendedRange + ')' : ''),
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: 16, borderRadius: 14, border: '1px solid ' + _t.border,
                  background: _t.bgCard,
                  cursor: isRegistered ? 'pointer' : 'default',
                  opacity: isRegistered ? 1 : 0.5,
                  textAlign: 'left', transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative'
                },
                onMouseEnter: function(e) { if (isRegistered) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px ' + cardColor + '33'; } },
                onMouseLeave: function(e) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, tool.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 700, color: _t.text, flex: 1 } }, tool.label),
                  // Usage indicator: "New" pill on tools never opened, dot count on used.
                  // Hidden from SR (already in aria-label of the card if needed).
                  isRegistered && (function () {
                    var u = selToolUsage[tool.id];
                    if (!u || !u.count) {
                      return h('span', { 'aria-hidden': 'true', style: { fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 8, background: cardColor, color: '#fff', letterSpacing: '0.05em' } }, 'NEW');
                    }
                    if (u.count >= 5) {
                      return h('span', { 'aria-hidden': 'true', title: u.count + ' visits', style: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: cardColor + '22', color: cardColor } }, '★');
                    }
                    return h('span', { 'aria-hidden': 'true', title: u.count + (u.count === 1 ? ' visit' : ' visits'), style: { fontSize: 9, color: cardColor, letterSpacing: '1px' } }, '•'.repeat(Math.min(u.count, 4)));
                  })()
                ),
                h('p', { style: { margin: 0, fontSize: 11, color: _t.textMuted, lineHeight: 1.4 } }, tool.desc),
                tool.recommendedRange && h('span', {
                  style: { fontSize: 10, color: cardColor, fontWeight: 600, marginTop: 4 }
                }, 'Grades ' + tool.recommendedRange),
                // Left accent bar
                h('div', { style: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: cardColor } })
              );
            })
          ),
          // No results
          _searchLower && _filteredTools.length === 0 && h('div', { style: { textAlign: 'center', padding: '48px 0', color: _t.textMuted } },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83D\uDD0D'),
            h('p', { style: { fontSize: 14, fontWeight: 700, color: _t.text } }, 'No tools match "' + selToolSearch + '"'),
            h('p', { style: { fontSize: 12 } }, 'Try a different search term')
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // ── Plugin Fallback Renderer ──
      // Bridges hub state into the plugin's ctx object, then calls
      // window.SelHub.renderTool(toolId, ctx).
      // ══════════════════════════════════════════════════════════════
      var toolContent = null;
      if (selHubTool && window.SelHub && window.SelHub.isRegistered(selHubTool)) {
        var _ctx = {
          React: React,

          // ── State management ──
          toolData: selToolData,
          setToolData: setSelToolData,
          update: function(toolId, key, val) {
            setSelToolData(function(prev) {
              var toolState = Object.assign({}, (prev && prev[toolId]) || {});
              toolState[key] = val;
              var patch = {}; patch[toolId] = toolState;
              return Object.assign({}, prev, patch);
            });
          },
          updateMulti: function(toolId, obj) {
            setSelToolData(function(prev) {
              var toolState = Object.assign({}, (prev && prev[toolId]) || {}, obj);
              var patch = {}; patch[toolId] = toolState;
              return Object.assign({}, prev, patch);
            });
          },

          // ── Navigation ──
          setSelHubTool: setSelHubTool,
          setSelHubTab: setSelHubTab,
          selHubTab: selHubTab,
          selHubTool: selHubTool,

          // ── Utilities ──
          addToast: addToast,
          awardXP: awardSelXP,
          getXP: getSelXP,
          announceToSR: announceToSR,
          celebrate: selCelebrate,
          beep: selBeep,
          t: t,

          // ── AI integration ──
          callGemini: typeof callGemini === 'function' ? callGemini : null,
          callTTS: typeof callTTS === 'function' ? function selSpeakTTS(text, voice, speed) {
            return callTTS(text, voice, speed).then(function(url) {
              if (url) { var a = new Audio(url); a.play().catch(function() {}); }
              return url;
            }).catch(function(e) { console.warn('[SEL TTS]', e && e.message); return null; });
          } : null,
          callImagen: typeof callImagen === 'function' ? callImagen : null,
          callGeminiVision: typeof callGeminiVision === 'function' ? callGeminiVision : null,
          onSafetyFlag: onSafetyFlag,
          studentCodename: studentCodename,

          // ── Icons ──
          icons: {
            ArrowLeft: ArrowLeft,
            X: X,
            Sparkles: Sparkles,
            Heart: Heart,
            GripVertical: GripVertical
          },

          // ── Grade / complexity ──
          gradeLevel: gradeLevel,
          gradeBand: gradeBand(gradeLevel), // 'elementary', 'middle', or 'high'

          // ── Snapshots ──
          toolSnapshots: selSnapshots,
          setToolSnapshots: setSelSnapshots,
          saveSnapshot: function(toolId, label, data) {
            setSelSnapshots(function(prev) {
              return (prev || []).concat([{ id: toolId + '-' + Date.now(), tool: toolId, label: label, data: data, ts: Date.now() }]);
            });
          },

          // ── Accessibility helpers ──
          srOnly: function(text) { return h('span', { className: 'sr-only' }, text); },
          a11yClick: function(handler) {
            return {
              onClick: handler,
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } },
              role: 'button',
              tabIndex: 0
            };
          },

          // ── Theme ──
          isDark: isDark,
          isContrast: isContrast,
          theme: _t,

          // ── Full props passthrough ──
          props: props || {}
        };

        console.log('[SelHub] Rendering plugin: ' + selHubTool);
        try {
          // Wrap plugin render in a stable React component per tool so hooks are isolated.
          if (!window.__selPluginComponents) window.__selPluginComponents = {};
          if (!window.__selPluginComponents[selHubTool]) {
            window.__selPluginComponents[selHubTool] = function SelPluginBridge(props) {
              // On unmount (or toolId change), invoke the registered tool's
              // cleanup if it defined one. Opt-in: tools without `cleanup` are
              // unaffected. Used by tools with module-scope timers (e.g.
              // mindfulness breath pacer, coping PMR/movement) to clear
              // intervals so they don't keep firing after a tool switch.
              React.useEffect(function() {
                return function() {
                  var entry = window.SelHub && window.SelHub._registry && window.SelHub._registry[props._toolId];
                  if (entry && typeof entry.cleanup === 'function') {
                    try { entry.cleanup(); } catch (e) { console.warn('[SelHub] cleanup error for ' + props._toolId, e); }
                  }
                };
              }, [props._toolId]);
              return window.SelHub.renderTool(props._toolId, props._ctx);
            };
          }
          toolContent = React.createElement(window.__selPluginComponents[selHubTool], { key: 'sel-plugin-' + selHubTool, _toolId: selHubTool, _ctx: _ctx });
        } catch(e) {
          console.error('[SelHub] Plugin render error for ' + selHubTool, e);
          toolContent = h('div', { style: { padding: 40, textAlign: 'center', color: '#ef4444' } },
            h('p', { style: { fontSize: 32, marginBottom: 12 } }, '\u26A0\uFE0F'),
            h('p', { style: { fontWeight: 700, marginBottom: 8 } }, 'Error loading ' + selHubTool),
            h('p', { style: { fontSize: 12, color: _t.textMuted, marginBottom: 16 } }, e.message || 'Unknown error'),
            h('button', { 'aria-label': 'Back to Tools',
              onClick: function() { setSelHubTool(null); },
              style: { padding: '8px 20px', borderRadius: 8, background: _t.accent, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
            }, '\u2190 Back to Tools')
          );
        }
      }

      // ── Loading state (tool selected but plugin not yet loaded) ──
      if (selHubTool && !toolContent) {
        toolContent = h('div', { style: { padding: 60, textAlign: 'center', color: _t.textMuted } },
          h('div', { 'aria-hidden': 'true',
            style: {
              fontSize: 40, marginBottom: 16,
              animation: _reduceMotion ? 'none' : 'pulse 2s ease-in-out infinite'
            }
          }, '\u2764\uFE0F\u200D\uD83D\uDD25'),
          h('p', { style: { fontWeight: 700, fontSize: 16, marginBottom: 4, color: _t.text } }, 'Loading tool...'),
          h('p', { style: { fontSize: 12 } }, 'The plugin file is still being fetched.'),
          h('button', {
            onClick: function() { setSelHubTool(null); },
            style: { marginTop: 16, padding: '8px 20px', borderRadius: 8, background: _t.btnBg, color: _t.btnText, fontWeight: 600, border: _t.btnBorder, cursor: 'pointer' }
          }, '\u2190 Back to Tools')
        );
      }

      // ── Full-screen modal shell ──
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'SEL Hub',
        style: {
          position: 'fixed', inset: 0, zIndex: 9999,
          background: _t.bg, color: _t.text,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }
      },
        srLive,
        header,
        h('div', {
          style: { flex: 1, overflow: 'auto', position: 'relative' }
        },
          toolGrid,
          toolContent
        )
      );
    };
  }
})();
